-- ============================================================================
-- MIGRACIÓN 020: Flujos Flexibles con Tipos de Pasos
-- FASE 1: Extender Estructura de Base de Datos
-- 
-- Agrega soporte para diferentes tipos de pasos en los flujos:
-- - message: Mensajes (como antes)
-- - pause: Pausas independientes (nuevo)
-- - stage_change: Cambio automático de etapa (nuevo)
-- ============================================================================

-- PASO 1: Agregar campo step_type para diferenciar tipos de pasos
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS step_type VARCHAR(20) DEFAULT 'message'
  CHECK (step_type IN ('message', 'pause', 'stage_change'));

-- PASO 2: Agregar campo target_stage_name para cambios de etapa
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS target_stage_name TEXT DEFAULT NULL;

-- PASO 3: Actualizar todos los registros existentes para que tengan step_type = 'message'
UPDATE whatsapp_sequence_messages
SET step_type = 'message'
WHERE step_type IS NULL OR step_type = 'message';

-- PASO 4: Hacer que message_type pueda ser NULL (para pausas y cambios de etapa)
-- Primero eliminamos el constraint NOT NULL
ALTER TABLE whatsapp_sequence_messages
ALTER COLUMN message_type DROP NOT NULL;

-- PASO 5: Actualizar el CHECK constraint de message_type para permitir NULL
-- (Nota: El CHECK constraint actual ya permite los valores correctos,
--  solo necesitamos permitir NULL para pasos que no son mensajes)
-- PostgreSQL permite NULL en CHECK constraints por defecto si el campo es nullable

-- PASO 6: Crear índice para mejorar rendimiento en consultas por tipo de paso
CREATE INDEX IF NOT EXISTS idx_sequence_messages_step_type 
  ON whatsapp_sequence_messages(sequence_id, step_type)
  WHERE step_type IS NOT NULL;

-- PASO 7: Crear índice para cambios de etapa
CREATE INDEX IF NOT EXISTS idx_sequence_messages_target_stage 
  ON whatsapp_sequence_messages(sequence_id, target_stage_name)
  WHERE target_stage_name IS NOT NULL;

-- PASO 8: Agregar comentarios para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.step_type IS 
  'Tipo de paso: message (mensaje), pause (pausa independiente), stage_change (cambio automático de etapa)';
COMMENT ON COLUMN whatsapp_sequence_messages.target_stage_name IS 
  'Nombre de la etapa destino para cambios automáticos de etapa (solo para step_type = stage_change)';

-- PASO 9: Verificar que la migración se aplicó correctamente
DO $$
DECLARE
  total_count INTEGER;
  message_count INTEGER;
  pause_count INTEGER;
  stage_change_count INTEGER;
  null_step_type_count INTEGER;
BEGIN
  -- Contar total de registros
  SELECT COUNT(*) INTO total_count FROM whatsapp_sequence_messages;
  
  -- Contar por tipo de paso
  SELECT COUNT(*) INTO message_count 
  FROM whatsapp_sequence_messages 
  WHERE step_type = 'message';
  
  SELECT COUNT(*) INTO pause_count 
  FROM whatsapp_sequence_messages 
  WHERE step_type = 'pause';
  
  SELECT COUNT(*) INTO stage_change_count 
  FROM whatsapp_sequence_messages 
  WHERE step_type = 'stage_change';
  
  SELECT COUNT(*) INTO null_step_type_count 
  FROM whatsapp_sequence_messages 
  WHERE step_type IS NULL;
  
  -- Log para verificación
  IF total_count > 0 THEN
    RAISE NOTICE '✅ Migración 020 completada:';
    RAISE NOTICE '   - Total de registros: %', total_count;
    RAISE NOTICE '   - Pasos tipo "message": %', message_count;
    RAISE NOTICE '   - Pasos tipo "pause": %', pause_count;
    RAISE NOTICE '   - Pasos tipo "stage_change": %', stage_change_count;
    
    IF null_step_type_count > 0 THEN
      RAISE WARNING '   ⚠️ Hay % registros con step_type NULL (deben ser actualizados)', null_step_type_count;
    END IF;
    
    IF message_count = total_count THEN
      RAISE NOTICE '   ✅ Todos los registros existentes tienen step_type = "message" (correcto)';
    END IF;
  ELSE
    RAISE NOTICE '✅ Migración 020 completada: No hay registros existentes. Campos agregados correctamente.';
  END IF;
END $$;



