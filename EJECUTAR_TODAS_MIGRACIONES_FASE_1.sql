-- ================================================================
-- EJECUTAR TODAS LAS MIGRACIONES DE FASE 1 - CRM DE LEADS
-- ================================================================
-- INSTRUCCIONES:
-- 1. Copia TODO este archivo
-- 2. Pégalo en el SQL Editor de Supabase
-- 3. Ejecuta todo de una vez (Ctrl+Enter)
-- 4. Verifica que no haya errores
-- ================================================================

-- ================================================================
-- MIGRACIÓN 013: Schema de CRM de Leads
-- ================================================================

-- 1. Tabla principal de leads
CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID, -- Referencia a products o almacen_central (sin FK para flexibilidad)
  pipeline_stage TEXT NOT NULL DEFAULT 'entrantes',
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  source TEXT DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'referido', 'manual')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'archived')),
  estimated_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de actividades del lead
CREATE TABLE IF NOT EXISTS whatsapp_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES whatsapp_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'call', 'note', 'task', 'meeting', 'stage_change')),
  content TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de pipelines personalizados
CREATE TABLE IF NOT EXISTS whatsapp_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID, -- Referencia a products o almacen_central (sin FK para flexibilidad)
  name TEXT NOT NULL,
  stages JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para whatsapp_leads
CREATE INDEX IF NOT EXISTS idx_leads_contact ON whatsapp_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_account ON whatsapp_leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_product ON whatsapp_leads(product_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON whatsapp_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_status ON whatsapp_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON whatsapp_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_activity ON whatsapp_leads(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_leads_product_stage ON whatsapp_leads(product_id, pipeline_stage) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_leads_created ON whatsapp_leads(created_at DESC);

-- Índices para whatsapp_lead_activities
CREATE INDEX IF NOT EXISTS idx_activities_lead ON whatsapp_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON whatsapp_lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created ON whatsapp_lead_activities(created_at DESC);

-- Índices para whatsapp_pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_product ON whatsapp_pipelines(product_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_account ON whatsapp_pipelines(account_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_default ON whatsapp_pipelines(product_id, is_default) WHERE is_default = true;

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_whatsapp_leads_updated_at ON whatsapp_leads;
CREATE TRIGGER trigger_update_whatsapp_leads_updated_at
  BEFORE UPDATE ON whatsapp_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_leads_updated_at();

CREATE OR REPLACE FUNCTION update_whatsapp_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_whatsapp_pipelines_updated_at ON whatsapp_pipelines;
CREATE TRIGGER trigger_update_whatsapp_pipelines_updated_at
  BEFORE UPDATE ON whatsapp_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_pipelines_updated_at();

-- RLS Policies
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_all" ON whatsapp_leads;
CREATE POLICY "leads_select_all" ON whatsapp_leads FOR SELECT USING (true);
DROP POLICY IF EXISTS "leads_insert_all" ON whatsapp_leads;
CREATE POLICY "leads_insert_all" ON whatsapp_leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "leads_update_all" ON whatsapp_leads;
CREATE POLICY "leads_update_all" ON whatsapp_leads FOR UPDATE USING (true);
DROP POLICY IF EXISTS "leads_delete_all" ON whatsapp_leads;
CREATE POLICY "leads_delete_all" ON whatsapp_leads FOR DELETE USING (true);

DROP POLICY IF EXISTS "activities_select_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_select_all" ON whatsapp_lead_activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "activities_insert_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_insert_all" ON whatsapp_lead_activities FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "activities_update_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_update_all" ON whatsapp_lead_activities FOR UPDATE USING (true);
DROP POLICY IF EXISTS "activities_delete_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_delete_all" ON whatsapp_lead_activities FOR DELETE USING (true);

DROP POLICY IF EXISTS "pipelines_select_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_select_all" ON whatsapp_pipelines FOR SELECT USING (true);
DROP POLICY IF EXISTS "pipelines_insert_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_insert_all" ON whatsapp_pipelines FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "pipelines_update_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_update_all" ON whatsapp_pipelines FOR UPDATE USING (true);
DROP POLICY IF EXISTS "pipelines_delete_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_delete_all" ON whatsapp_pipelines FOR DELETE USING (true);

-- ================================================================
-- MIGRACIÓN 014: Funciones SQL Helper
-- ================================================================

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
        SELECT 1 
        FROM (
          SELECT id, sku, sintetico FROM products
          UNION ALL
          SELECT id, sku, sintetico FROM almacen_central
          WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.id = almacen_central.id)
        ) p
        WHERE p.id = l.product_id
          AND p.sku = ANY(p_user_skus)
          AND (p.sintetico = false OR p.sintetico IS NULL)
      )
    )
  ORDER BY l.last_activity_at DESC NULLS LAST, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

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
          SELECT id, sku, sintetico FROM products
          UNION ALL
          SELECT id, sku, sintetico FROM almacen_central
          WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.id = almacen_central.id)
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
          SELECT id, sku, sintetico FROM products
          UNION ALL
          SELECT id, sku, sintetico FROM almacen_central
          WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.id = almacen_central.id)
        ) p
        WHERE p.id = l.product_id
          AND p.sku = ANY(p_user_skus)
          AND (p.sintetico = false OR p.sintetico IS NULL)
      )
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- MIGRACIÓN 015: Pipelines por Defecto
-- ================================================================

DO $$
DECLARE
  v_product RECORD;
  v_pipeline_id UUID;
  v_stages JSONB;
BEGIN
  v_stages := '[
    {"name": "Leads Entrantes", "order": 1, "color": "#3b82f6"},
    {"name": "Seguimiento", "order": 2, "color": "#f59e0b"},
    {"name": "Venta", "order": 3, "color": "#10b981"},
    {"name": "Cliente", "order": 4, "color": "#8b5cf6"}
  ]'::jsonb;
  
  FOR v_product IN 
    SELECT id, sku, nombre
    FROM products
    WHERE (sintetico = false OR sintetico IS NULL)
  LOOP
    SELECT id INTO v_pipeline_id
    FROM whatsapp_pipelines
    WHERE product_id = v_product.id
      AND is_default = true
    LIMIT 1;
    
    IF v_pipeline_id IS NULL THEN
      INSERT INTO whatsapp_pipelines (
        account_id,
        product_id,
        name,
        stages,
        is_default
      ) VALUES (
        NULL,
        v_product.id,
        'Pipeline por Defecto',
        v_stages,
        true
      )
      RETURNING id INTO v_pipeline_id;
      
      RAISE NOTICE 'Pipeline por defecto creado para producto: % (ID: %)', v_product.nombre, v_product.id;
    END IF;
  END LOOP;
  
  IF NOT FOUND THEN
    FOR v_product IN 
      SELECT id, sku, nombre
      FROM almacen_central
      WHERE (sintetico = false OR sintetico IS NULL)
    LOOP
      SELECT id INTO v_pipeline_id
      FROM whatsapp_pipelines
      WHERE product_id = v_product.id
        AND is_default = true
      LIMIT 1;
      
      IF v_pipeline_id IS NULL THEN
        INSERT INTO whatsapp_pipelines (
          account_id,
          product_id,
          name,
          stages,
          is_default
        ) VALUES (
          NULL,
          v_product.id,
          'Pipeline por Defecto',
          v_stages,
          true
        );
      END IF;
    END LOOP;
  END IF;
END $$;

-- ================================================================
-- VERIFICACIÓN FINAL
-- ================================================================

-- Verificar tablas creadas
SELECT 
  'Tablas creadas' AS verificacion,
  COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines');

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

-- Verificar pipelines creados
SELECT 
  'Pipelines creados' AS verificacion,
  COUNT(*) AS total
FROM whatsapp_pipelines
WHERE is_default = true;

