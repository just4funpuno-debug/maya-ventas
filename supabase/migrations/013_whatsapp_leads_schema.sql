-- ================================================================
-- MIGRACIÓN 013: Schema de CRM de Leads
-- FASE 1 - SUBFASE 1.1: Tablas de Leads
-- ================================================================
-- Objetivo: Crear tablas principales para gestión de leads con vista Kanban
-- Compatible con sistema multi-producto
-- ================================================================

-- 1. Tabla principal de leads
CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Para filtrado multi-producto
  pipeline_stage TEXT NOT NULL DEFAULT 'entrantes', -- Etapa actual del lead
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
  metadata JSONB DEFAULT '{}'::jsonb, -- Para datos adicionales (duración de llamada, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de pipelines personalizados
CREATE TABLE IF NOT EXISTS whatsapp_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Pipeline por producto
  name TEXT NOT NULL,
  stages JSONB NOT NULL, -- [{name: string, order: number, color: string}]
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ÍNDICES para optimizar consultas
-- ================================================================

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

-- ================================================================
-- TRIGGERS para updated_at
-- ================================================================

-- Trigger para whatsapp_leads
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

-- Trigger para whatsapp_pipelines
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

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Habilitar RLS
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_pipelines ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_leads
DROP POLICY IF EXISTS "leads_select_all" ON whatsapp_leads;
CREATE POLICY "leads_select_all" ON whatsapp_leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "leads_insert_all" ON whatsapp_leads;
CREATE POLICY "leads_insert_all" ON whatsapp_leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "leads_update_all" ON whatsapp_leads;
CREATE POLICY "leads_update_all" ON whatsapp_leads FOR UPDATE USING (true);

DROP POLICY IF EXISTS "leads_delete_all" ON whatsapp_leads;
CREATE POLICY "leads_delete_all" ON whatsapp_leads FOR DELETE USING (true);

-- Policies para whatsapp_lead_activities
DROP POLICY IF EXISTS "activities_select_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_select_all" ON whatsapp_lead_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "activities_insert_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_insert_all" ON whatsapp_lead_activities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activities_update_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_update_all" ON whatsapp_lead_activities FOR UPDATE USING (true);

DROP POLICY IF EXISTS "activities_delete_all" ON whatsapp_lead_activities;
CREATE POLICY "activities_delete_all" ON whatsapp_lead_activities FOR DELETE USING (true);

-- Policies para whatsapp_pipelines
DROP POLICY IF EXISTS "pipelines_select_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_select_all" ON whatsapp_pipelines FOR SELECT USING (true);

DROP POLICY IF EXISTS "pipelines_insert_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_insert_all" ON whatsapp_pipelines FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "pipelines_update_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_update_all" ON whatsapp_pipelines FOR UPDATE USING (true);

DROP POLICY IF EXISTS "pipelines_delete_all" ON whatsapp_pipelines;
CREATE POLICY "pipelines_delete_all" ON whatsapp_pipelines FOR DELETE USING (true);

-- ================================================================
-- COMENTARIOS para documentación
-- ================================================================

COMMENT ON TABLE whatsapp_leads IS 'Leads principales del CRM con información de contacto, etapa y estado';
COMMENT ON TABLE whatsapp_lead_activities IS 'Actividades y eventos relacionados con cada lead (mensajes, notas, cambios de etapa)';
COMMENT ON TABLE whatsapp_pipelines IS 'Pipelines personalizados por producto con etapas configurables';

COMMENT ON COLUMN whatsapp_leads.pipeline_stage IS 'Etapa actual del lead en el pipeline (ej: entrantes, seguimiento, venta, cliente)';
COMMENT ON COLUMN whatsapp_leads.lead_score IS 'Puntuación del lead de 0 a 100 (para scoring futuro)';
COMMENT ON COLUMN whatsapp_leads.source IS 'Origen del lead: whatsapp, web, referido, manual';
COMMENT ON COLUMN whatsapp_leads.status IS 'Estado del lead: active, won, lost, archived';
COMMENT ON COLUMN whatsapp_pipelines.stages IS 'Array JSON con etapas: [{name, order, color}]';

