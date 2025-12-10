-- ============================================================================
-- MIGRACIÓN 008: ETIQUETAS PARA CHATS WHATSAPP
-- FASE 1: SUBFASE 1.1 - Schema y Base de Datos
-- Fecha: 2025-01-30
-- Descripción: Crea tablas y relaciones para etiquetas de contactos WhatsApp
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE ETIQUETAS
-- ============================================================================
-- Cada cuenta WhatsApp puede tener sus propias etiquetas personalizadas

CREATE TABLE IF NOT EXISTS whatsapp_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#e7922b', -- Color hex (ej: #e7922b)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un nombre de etiqueta debe ser único por cuenta
  UNIQUE(account_id, name)
);

COMMENT ON TABLE whatsapp_tags IS 'Etiquetas personalizadas para categorizar contactos WhatsApp';
COMMENT ON COLUMN whatsapp_tags.account_id IS 'ID de la cuenta WhatsApp a la que pertenece la etiqueta';
COMMENT ON COLUMN whatsapp_tags.name IS 'Nombre de la etiqueta (único por cuenta)';
COMMENT ON COLUMN whatsapp_tags.color IS 'Color hexadecimal de la etiqueta (ej: #e7922b)';

-- ============================================================================
-- 2. TABLA DE RELACIÓN MUCHOS-A-MUCHOS
-- ============================================================================
-- Un contacto puede tener múltiples etiquetas
-- Una etiqueta puede estar asignada a múltiples contactos

CREATE TABLE IF NOT EXISTS whatsapp_contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES whatsapp_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados (un contacto no puede tener la misma etiqueta dos veces)
  UNIQUE(contact_id, tag_id)
);

COMMENT ON TABLE whatsapp_contact_tags IS 'Relación muchos-a-muchos entre contactos y etiquetas';
COMMENT ON COLUMN whatsapp_contact_tags.contact_id IS 'ID del contacto de WhatsApp';
COMMENT ON COLUMN whatsapp_contact_tags.tag_id IS 'ID de la etiqueta';

-- ============================================================================
-- 3. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================================================

-- Índices para whatsapp_tags
CREATE INDEX IF NOT EXISTS idx_tags_account ON whatsapp_tags(account_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON whatsapp_tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_created ON whatsapp_tags(created_at DESC);

-- Índices para whatsapp_contact_tags
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON whatsapp_contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON whatsapp_contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_created ON whatsapp_contact_tags(created_at DESC);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_tag ON whatsapp_contact_tags(contact_id, tag_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE whatsapp_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contact_tags ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_tags (permisivas por ahora)
CREATE POLICY "whatsapp_tags_select_all" 
  ON whatsapp_tags FOR SELECT 
  USING (true);

CREATE POLICY "whatsapp_tags_insert_all" 
  ON whatsapp_tags FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "whatsapp_tags_update_all" 
  ON whatsapp_tags FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "whatsapp_tags_delete_all" 
  ON whatsapp_tags FOR DELETE 
  USING (true);

-- Políticas para whatsapp_contact_tags (permisivas por ahora)
CREATE POLICY "whatsapp_contact_tags_select_all" 
  ON whatsapp_contact_tags FOR SELECT 
  USING (true);

CREATE POLICY "whatsapp_contact_tags_insert_all" 
  ON whatsapp_contact_tags FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "whatsapp_contact_tags_update_all" 
  ON whatsapp_contact_tags FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "whatsapp_contact_tags_delete_all" 
  ON whatsapp_contact_tags FOR DELETE 
  USING (true);

-- ============================================================================
-- 5. FUNCIÓN HELPER: Obtener etiquetas de un contacto
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contact_tags(p_contact_id UUID)
RETURNS TABLE (
  tag_id UUID,
  tag_name VARCHAR,
  tag_color VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tag_id,
    t.name AS tag_name,
    t.color AS tag_color,
    ct.created_at
  FROM whatsapp_contact_tags ct
  INNER JOIN whatsapp_tags t ON t.id = ct.tag_id
  WHERE ct.contact_id = p_contact_id
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_contact_tags(UUID) IS 'Obtiene todas las etiquetas asignadas a un contacto WhatsApp';

-- ============================================================================
-- 6. TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_tags_updated_at
  BEFORE UPDATE ON whatsapp_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_tags_updated_at();

-- ============================================================================
-- 7. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 008 completada: Etiquetas para Chats WhatsApp';
  RAISE NOTICE '   - Tabla whatsapp_tags creada';
  RAISE NOTICE '   - Tabla whatsapp_contact_tags creada';
  RAISE NOTICE '   - Índices creados';
  RAISE NOTICE '   - RLS habilitado';
  RAISE NOTICE '   - Función get_contact_tags creada';
END $$;

