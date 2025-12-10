-- ================================================================
-- MIGRACIÓN 014 - PARTE 2: Funciones SQL Helper
-- ================================================================
-- EJECUTAR ESTA SEGUNDA PARTE (después de la Parte 1)
-- ================================================================

-- Función helper para obtener productos (products o almacen_central)
CREATE OR REPLACE FUNCTION get_product_table()
RETURNS TEXT AS $$
BEGIN
  -- Intentar usar products primero
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    RETURN 'products';
  ELSE
    RETURN 'almacen_central';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. Obtener leads por producto (con fallback a almacen_central)
CREATE OR REPLACE FUNCTION get_leads_by_product_id(
  p_product_id UUID,
  p_status TEXT DEFAULT 'active',
  p_user_skus TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  account_id UUID,
  product_id UUID,
  pipeline_stage TEXT,
  lead_score INTEGER,
  assigned_to UUID,
  estimated_value NUMERIC(12,2),
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  contact_name TEXT,
  contact_phone TEXT,
  account_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.contact_id,
    l.account_id,
    l.product_id,
    l.pipeline_stage,
    l.lead_score,
    l.assigned_to,
    l.estimated_value,
    l.last_activity_at,
    l.created_at,
    c.name AS contact_name,
    c.phone AS contact_phone,
    wa.display_name AS account_name
  FROM whatsapp_leads l
  INNER JOIN whatsapp_contacts c ON l.contact_id = c.id
  INNER JOIN whatsapp_accounts wa ON l.account_id = wa.id
  WHERE l.product_id = p_product_id
    AND l.status = p_status
    AND (
      p_user_skus IS NULL 
      OR p_user_skus = ARRAY[]::TEXT[]
      OR EXISTS (
        -- Intentar products primero, luego almacen_central
        SELECT 1 
        FROM (
          SELECT id, sku, sintetico 
          FROM products
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
          UNION ALL
          SELECT id, sku, COALESCE(sintetico, false) as sintetico
          FROM almacen_central
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
        ) p
        WHERE p.id = l.product_id
          AND p.sku = ANY(p_user_skus)
          AND (p.sintetico = false OR p.sintetico IS NULL)
      )
    )
  ORDER BY l.last_activity_at DESC NULLS LAST, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Contar leads por etapa
CREATE OR REPLACE FUNCTION count_leads_by_stage(
  p_product_id UUID,
  p_status TEXT DEFAULT 'active',
  p_user_skus TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.pipeline_stage AS stage,
    COUNT(*)::BIGINT AS count
  FROM whatsapp_leads l
  WHERE l.product_id = p_product_id
    AND l.status = p_status
    AND (
      p_user_skus IS NULL 
      OR p_user_skus = ARRAY[]::TEXT[]
      OR EXISTS (
        SELECT 1 
        FROM (
          SELECT id, sku, sintetico 
          FROM products
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
          UNION ALL
          SELECT id, sku, COALESCE(sintetico, false) as sintetico
          FROM almacen_central
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
        ) p
        WHERE p.id = l.product_id
          AND p.sku = ANY(p_user_skus)
          AND (p.sintetico = false OR p.sintetico IS NULL)
      )
    )
  GROUP BY l.pipeline_stage
  ORDER BY l.pipeline_stage;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar última actividad
CREATE OR REPLACE FUNCTION update_lead_activity(
  p_lead_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_leads
  SET last_activity_at = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Obtener leads por cuenta
CREATE OR REPLACE FUNCTION get_leads_by_account_id(
  p_account_id UUID,
  p_status TEXT DEFAULT 'active',
  p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  account_id UUID,
  product_id UUID,
  pipeline_stage TEXT,
  lead_score INTEGER,
  assigned_to UUID,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.contact_id,
    l.account_id,
    l.product_id,
    l.pipeline_stage,
    l.lead_score,
    l.assigned_to,
    l.last_activity_at,
    l.created_at
  FROM whatsapp_leads l
  WHERE l.account_id = p_account_id
    AND l.status = p_status
    AND (p_product_id IS NULL OR l.product_id = p_product_id)
  ORDER BY l.last_activity_at DESC NULLS LAST, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar si contacto tiene lead
CREATE OR REPLACE FUNCTION contact_has_lead(
  p_contact_id UUID,
  p_product_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM whatsapp_leads
  WHERE contact_id = p_contact_id
    AND product_id = p_product_id
    AND status = p_status;
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 6. Obtener lead de un contacto
CREATE OR REPLACE FUNCTION get_lead_by_contact(
  p_contact_id UUID,
  p_product_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  account_id UUID,
  product_id UUID,
  pipeline_stage TEXT,
  lead_score INTEGER,
  assigned_to UUID,
  status TEXT,
  estimated_value NUMERIC(12,2),
  notes TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.contact_id,
    l.account_id,
    l.product_id,
    l.pipeline_stage,
    l.lead_score,
    l.assigned_to,
    l.status,
    l.estimated_value,
    l.notes,
    l.last_activity_at,
    l.created_at
  FROM whatsapp_leads l
  WHERE l.contact_id = p_contact_id
    AND l.product_id = p_product_id
    AND l.status = p_status
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Estadísticas de leads por producto
CREATE OR REPLACE FUNCTION get_lead_stats_by_product(
  p_product_id UUID,
  p_user_skus TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_leads BIGINT,
  active_leads BIGINT,
  won_leads BIGINT,
  lost_leads BIGINT,
  total_value NUMERIC(12,2),
  avg_lead_score NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_leads,
    COUNT(*) FILTER (WHERE l.status = 'active')::BIGINT AS active_leads,
    COUNT(*) FILTER (WHERE l.status = 'won')::BIGINT AS won_leads,
    COUNT(*) FILTER (WHERE l.status = 'lost')::BIGINT AS lost_leads,
    COALESCE(SUM(l.estimated_value), 0) AS total_value,
    COALESCE(AVG(l.lead_score), 0) AS avg_lead_score
  FROM whatsapp_leads l
  WHERE l.product_id = p_product_id
    AND (
      p_user_skus IS NULL 
      OR p_user_skus = ARRAY[]::TEXT[]
      OR EXISTS (
        SELECT 1 
        FROM (
          SELECT id, sku, sintetico 
          FROM products
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
          UNION ALL
          SELECT id, sku, COALESCE(sintetico, false) as sintetico
          FROM almacen_central
          WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
        ) p
        WHERE p.id = l.product_id
          AND p.sku = ANY(p_user_skus)
          AND (p.sintetico = false OR p.sintetico IS NULL)
      )
    );
END;
$$ LANGUAGE plpgsql;

-- Verificar funciones creadas
SELECT 
  'Funciones creadas' AS verificacion,
  COUNT(*) AS total
FROM pg_proc
WHERE proname IN (
  'get_leads_by_product_id',
  'count_leads_by_stage',
  'update_lead_activity',
  'get_leads_by_account_id',
  'contact_has_lead',
  'get_lead_by_contact',
  'get_lead_stats_by_product'
);

