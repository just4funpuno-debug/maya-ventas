-- ============================================================================
-- MIGRACIÓN 025: Agregar template_id a sequence_messages
-- FASE 3 - SUBFASE 3.1: Integración con Templates de WhatsApp
-- 
-- Agrega el campo template_id a whatsapp_sequence_messages para permitir
-- que los pasos de mensaje puedan usar templates de WhatsApp Business API
-- ============================================================================

-- PASO 1: Agregar campo template_id como foreign key a whatsapp_templates
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL;

-- PASO 2: Agregar índice para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_sequence_messages_template_id 
  ON whatsapp_sequence_messages(template_id) 
  WHERE template_id IS NOT NULL;

-- PASO 3: Agregar comentario para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.template_id IS 
  'ID del template de WhatsApp Business API a usar para este paso (solo para step_type = message). 
   Si está configurado, se enviará usando el template en lugar de contenido personalizado. 
   NULL = usar contenido personalizado (content_text, media_url, etc.)';

-- PASO 4: Verificar que la migración se aplicó correctamente
DO $$
DECLARE
  total_count INTEGER;
  messages_with_template_count INTEGER;
BEGIN
  -- Contar total de registros
  SELECT COUNT(*) INTO total_count FROM whatsapp_sequence_messages;
  
  -- Contar mensajes con template_id (será 0 inicialmente)
  SELECT COUNT(*) INTO messages_with_template_count 
  FROM whatsapp_sequence_messages 
  WHERE template_id IS NOT NULL;
  
  -- Log para verificación
  RAISE NOTICE '✅ Migración 025 completada:';
  RAISE NOTICE '   - Total de registros: %', total_count;
  RAISE NOTICE '   - Mensajes con template_id: %', messages_with_template_count;
  RAISE NOTICE '   - Campo template_id agregado correctamente';
END $$;

