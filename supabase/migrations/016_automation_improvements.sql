-- ============================================================================
-- MIGRACIÓN 016: Mejoras de Automatizaciones (Opción A)
-- FASE 1: SUBFASE 1.1 - Base de Datos y Schema
-- 
-- Agrega campos para pausas inteligentes, condiciones y ramificaciones
-- a la tabla whatsapp_sequence_messages sin romper funcionalidad existente.
-- ============================================================================

-- Agregar campos nuevos con valores por defecto para compatibilidad hacia atrás
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_type TEXT DEFAULT 'fixed_delay' 
  CHECK (pause_type IN ('fixed_delay', 'until_message', 'until_days_without_response')),
ADD COLUMN IF NOT EXISTS condition_type TEXT DEFAULT 'none'
  CHECK (condition_type IN ('none', 'if_responded', 'if_not_responded')),
ADD COLUMN IF NOT EXISTS next_message_if_true UUID REFERENCES whatsapp_sequence_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_message_if_false UUID REFERENCES whatsapp_sequence_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS days_without_response INTEGER DEFAULT NULL;

-- Índices para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_sequence_messages_pause_type 
  ON whatsapp_sequence_messages(sequence_id, pause_type);
CREATE INDEX IF NOT EXISTS idx_sequence_messages_condition_type 
  ON whatsapp_sequence_messages(sequence_id, condition_type);
CREATE INDEX IF NOT EXISTS idx_sequence_messages_next_if_true 
  ON whatsapp_sequence_messages(next_message_if_true) 
  WHERE next_message_if_true IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_messages_next_if_false 
  ON whatsapp_sequence_messages(next_message_if_false) 
  WHERE next_message_if_false IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.pause_type IS 
  'Tipo de pausa: fixed_delay (delay fijo), until_message (esperar mensaje), until_days_without_response (esperar días sin respuesta)';
COMMENT ON COLUMN whatsapp_sequence_messages.condition_type IS 
  'Tipo de condición: none (sin condición), if_responded (solo si respondió), if_not_responded (solo si NO respondió)';
COMMENT ON COLUMN whatsapp_sequence_messages.next_message_if_true IS 
  'ID del mensaje siguiente si la condición es verdadera (ramificación)';
COMMENT ON COLUMN whatsapp_sequence_messages.next_message_if_false IS 
  'ID del mensaje siguiente si la condición es falsa (ramificación)';
COMMENT ON COLUMN whatsapp_sequence_messages.days_without_response IS 
  'Número de días sin respuesta requeridos para pause_type = until_days_without_response';

-- Verificar que los valores por defecto se aplicaron correctamente a registros existentes
-- (Esto es solo para verificación, no modifica datos)
DO $$
DECLARE
  existing_count INTEGER;
  default_pause_count INTEGER;
  default_condition_count INTEGER;
BEGIN
  -- Contar registros existentes
  SELECT COUNT(*) INTO existing_count FROM whatsapp_sequence_messages;
  
  -- Contar registros con valores por defecto
  SELECT COUNT(*) INTO default_pause_count 
  FROM whatsapp_sequence_messages 
  WHERE pause_type = 'fixed_delay';
  
  SELECT COUNT(*) INTO default_condition_count 
  FROM whatsapp_sequence_messages 
  WHERE condition_type = 'none';
  
  -- Log para verificación (solo si hay registros)
  IF existing_count > 0 THEN
    RAISE NOTICE 'Migración 016: % registros existentes. % con pause_type=fixed_delay, % con condition_type=none', 
      existing_count, default_pause_count, default_condition_count;
  ELSE
    RAISE NOTICE 'Migración 016: No hay registros existentes. Campos agregados correctamente.';
  END IF;
END $$;

