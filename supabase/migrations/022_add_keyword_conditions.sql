-- ============================================================================
-- MIGRACIÓN 022: Detección de Palabras Clave en Mensajes
-- FASE 1: Extensión de Sistema de Condiciones
-- 
-- Agrega soporte para condiciones basadas en palabras clave:
-- - condition_type: 'if_message_contains' (nuevo)
-- - condition_keywords: JSONB con palabras clave y opciones
-- ============================================================================

-- PASO 1: Extender constraint de condition_type para incluir 'if_message_contains'
ALTER TABLE whatsapp_sequence_messages
DROP CONSTRAINT IF EXISTS whatsapp_sequence_messages_condition_type_check;

ALTER TABLE whatsapp_sequence_messages
ADD CONSTRAINT whatsapp_sequence_messages_condition_type_check
CHECK (condition_type IN ('none', 'if_responded', 'if_not_responded', 'if_message_contains'));

-- PASO 2: Agregar campo para almacenar palabras clave y configuración
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS condition_keywords JSONB DEFAULT NULL;

-- PASO 3: Crear índice para mejorar rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS idx_sequence_messages_condition_keywords
ON whatsapp_sequence_messages(sequence_id)
WHERE condition_type = 'if_message_contains' AND condition_keywords IS NOT NULL;

-- PASO 4: Agregar comentarios para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.condition_keywords IS 
  'Configuración de palabras clave para condiciones tipo if_message_contains. 
   Estructura: {"keywords": ["palabra1", "palabra2"], "match_type": "any|all", "case_sensitive": false}
   - keywords: Array de palabras a buscar
   - match_type: "any" (OR) o "all" (AND) - por defecto "any"
   - case_sensitive: boolean - por defecto false';

-- PASO 5: Verificar que la migración se aplicó correctamente
DO $$
DECLARE
  total_count INTEGER;
  keyword_condition_count INTEGER;
BEGIN
  -- Contar total de registros
  SELECT COUNT(*) INTO total_count FROM whatsapp_sequence_messages;
  
  -- Contar condiciones con keywords
  SELECT COUNT(*) INTO keyword_condition_count 
  FROM whatsapp_sequence_messages 
  WHERE condition_type = 'if_message_contains';
  
  -- Log para verificación
  RAISE NOTICE '✅ Migración 022 completada:';
  RAISE NOTICE '   - Total de registros: %', total_count;
  RAISE NOTICE '   - Condiciones con keywords: %', keyword_condition_count;
  RAISE NOTICE '   - Campo condition_keywords agregado correctamente';
  RAISE NOTICE '   - Índice creado para optimizar búsquedas';
END $$;


