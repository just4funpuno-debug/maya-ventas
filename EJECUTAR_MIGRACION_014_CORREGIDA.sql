-- ================================================================
-- MIGRACIÓN 014 CORREGIDA: Funciones SQL Helper para CRM de Leads
-- CORRECCIÓN: Fallback de products a almacen_central
-- ================================================================
-- Objetivo: Corregir funciones para usar fallback cuando products no existe
-- ================================================================

-- 1. Corregir get_leads_by_product_id
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
      -- Si no hay filtro de userSkus, retornar todos
      p_user_skus IS NULL 
      OR p_user_skus = ARRAY[]::TEXT[]
      -- Si hay filtro, verificar que el producto esté en los SKUs del usuario
      -- Usar fallback: products primero, luego almacen_central
      OR (
        -- Intentar con products primero
        (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
         AND EXISTS (
           SELECT 1 
           FROM products p
           WHERE p.id = l.product_id
             AND p.sku = ANY(p_user_skus)
             AND (p.sintetico = false OR p.sintetico IS NULL)
         ))
        -- Fallback a almacen_central
        OR (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND EXISTS (
              SELECT 1 
              FROM almacen_central ac
              WHERE ac.id = l.product_id
                AND ac.sku = ANY(p_user_skus)
                AND (ac.sintetico = false OR ac.sintetico IS NULL)
            ))
      )
    )
  ORDER BY l.last_activity_at DESC NULLS LAST, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Corregir count_leads_by_stage
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
      -- Usar fallback: products primero, luego almacen_central
      OR (
        -- Intentar con products primero
        (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
         AND EXISTS (
           SELECT 1 
           FROM products p
           WHERE p.id = l.product_id
             AND p.sku = ANY(p_user_skus)
             AND (p.sintetico = false OR p.sintetico IS NULL)
         ))
        -- Fallback a almacen_central
        OR (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND EXISTS (
              SELECT 1 
              FROM almacen_central ac
              WHERE ac.id = l.product_id
                AND ac.sku = ANY(p_user_skus)
                AND (ac.sintetico = false OR ac.sintetico IS NULL)
            ))
      )
    )
  GROUP BY l.pipeline_stage
  ORDER BY l.pipeline_stage;
END;
$$ LANGUAGE plpgsql;

-- 7. Corregir get_lead_stats_by_product
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
      -- Usar fallback: products primero, luego almacen_central
      OR (
        -- Intentar con products primero
        (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
         AND EXISTS (
           SELECT 1 
           FROM products p
           WHERE p.id = l.product_id
             AND p.sku = ANY(p_user_skus)
             AND (p.sintetico = false OR p.sintetico IS NULL)
         ))
        -- Fallback a almacen_central
        OR (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central')
            AND EXISTS (
              SELECT 1 
              FROM almacen_central ac
              WHERE ac.id = l.product_id
                AND ac.sku = ANY(p_user_skus)
                AND (ac.sintetico = false OR ac.sintetico IS NULL)
            ))
      )
    );
END;
$$ LANGUAGE plpgsql;

