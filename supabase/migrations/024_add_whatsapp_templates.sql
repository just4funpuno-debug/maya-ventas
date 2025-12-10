-- ============================================================================
-- MIGRACIÓN 024: Templates de WhatsApp
-- FASE 1 - SUBFASE 1.1: Estructura de Base de Datos
-- 
-- Crea tabla para gestionar templates de WhatsApp Business API
-- Permite crear, almacenar y sincronizar templates con WhatsApp
-- ============================================================================

-- PASO 1: Crear tabla de templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID, -- Opcional: para filtrar por producto
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language VARCHAR(10) DEFAULT 'es' NOT NULL,
  
  -- Componentes del template (según WhatsApp Business API)
  header_type VARCHAR(20) DEFAULT 'NONE' CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE')),
  header_text TEXT, -- Si header_type = TEXT (máx 60 caracteres)
  header_media_url TEXT, -- Si header_type = IMAGE/VIDEO/DOCUMENT
  
  body_text TEXT NOT NULL, -- Cuerpo con variables {{1}}, {{2}}, etc. (máx 1024 caracteres)
  
  footer_text TEXT, -- Opcional, máx 60 caracteres
  
  -- Botones (JSONB para flexibilidad)
  -- Estructura: [{"type": "QUICK_REPLY", "text": "Sí"}, {"type": "CALL_TO_ACTION", "text": "Visitar", "url": "https://..."}]
  buttons JSONB DEFAULT '[]'::jsonb,
  
  -- Estado con WhatsApp
  wa_template_name VARCHAR(255), -- Nombre único en WhatsApp (auto-generado: nombre_lowercase_timestamp)
  wa_status VARCHAR(20) DEFAULT 'draft' CHECK (wa_status IN ('draft', 'pending', 'approved', 'rejected', 'paused')),
  wa_template_id VARCHAR(255), -- ID de WhatsApp una vez aprobado
  wa_rejection_reason TEXT, -- Razón si fue rechazado
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ, -- Última vez que se sincronizó con WhatsApp
  
  -- Constraints
  UNIQUE(account_id, wa_template_name)
);

-- PASO 2: Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_account_id 
  ON whatsapp_templates(account_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_product_id 
  ON whatsapp_templates(product_id) 
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_wa_status 
  ON whatsapp_templates(wa_status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category 
  ON whatsapp_templates(category);

-- PASO 3: Agregar comentarios para documentación
COMMENT ON TABLE whatsapp_templates IS 
  'Templates de mensajes de WhatsApp Business API. Permiten enviar mensajes fuera de la ventana 24h.';

COMMENT ON COLUMN whatsapp_templates.category IS 
  'Categoría del template: MARKETING (promocional), UTILITY (transaccional), AUTHENTICATION (códigos OTP)';

COMMENT ON COLUMN whatsapp_templates.header_type IS 
  'Tipo de encabezado: TEXT, IMAGE, VIDEO, DOCUMENT, o NONE (sin encabezado)';

COMMENT ON COLUMN whatsapp_templates.body_text IS 
  'Cuerpo del mensaje. Puede contener variables {{1}}, {{2}}, etc. para personalización. Máx 1024 caracteres.';

COMMENT ON COLUMN whatsapp_templates.buttons IS 
  'Array JSON de botones. Tipos: QUICK_REPLY (texto) o CALL_TO_ACTION (URL). Máx 3 botones, 1 CTA si hay.';

COMMENT ON COLUMN whatsapp_templates.wa_template_name IS 
  'Nombre único del template en WhatsApp (formato: nombre_lowercase_timestamp). Se genera automáticamente.';

COMMENT ON COLUMN whatsapp_templates.wa_status IS 
  'Estado del template en WhatsApp: draft (borrador), pending (en revisión), approved (aprobado), rejected (rechazado), paused (pausado)';

-- PASO 4: Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_templates_updated_at();

-- PASO 5: Validar que la migración se aplicó correctamente
DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'whatsapp_templates'
  ) INTO table_exists;

  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'whatsapp_templates';

  IF table_exists THEN
    RAISE NOTICE '✅ Migración 024 completada:';
    RAISE NOTICE '   - Tabla whatsapp_templates creada';
    RAISE NOTICE '   - Índices creados: %', index_count;
    RAISE NOTICE '   - Constraint de categorías: MARKETING, UTILITY, AUTHENTICATION';
    RAISE NOTICE '   - Trigger para updated_at configurado';
  ELSE
    RAISE WARNING '❌ Migración 024: Tabla whatsapp_templates NO fue creada';
  END IF;
END $$;

