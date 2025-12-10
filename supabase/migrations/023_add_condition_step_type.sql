-- ============================================================================
-- MIGRACIÓN 023: Paso Tipo "Condición" Independiente
-- 
-- Agrega soporte para pasos de tipo 'condition' que funcionan como
-- filtros/disparadores independientes antes de cualquier acción.
-- Permite usar keywords para disparar cambios de etapa u otras acciones.
-- ============================================================================

-- PASO 1: Extender constraint de step_type para incluir 'condition'
ALTER TABLE whatsapp_sequence_messages
DROP CONSTRAINT IF EXISTS whatsapp_sequence_messages_step_type_check;

ALTER TABLE whatsapp_sequence_messages
ADD CONSTRAINT whatsapp_sequence_messages_step_type_check
CHECK (step_type IN ('message', 'pause', 'stage_change', 'condition'));

-- PASO 2: Agregar comentarios para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.step_type IS 
  'Tipo de paso en la secuencia. 
   - message: Enviar un mensaje (texto, imagen, video, etc.)
   - pause: Agregar una pausa con delay configurable
   - stage_change: Cambiar automáticamente el lead a otra etapa
   - condition: Evaluar condición (keywords, respuesta) y ramificar el flujo';

-- PASO 3: Verificar que la migración se aplicó correctamente
DO $$
DECLARE
  total_count INTEGER;
  condition_steps_count INTEGER;
BEGIN
  -- Contar total de registros
  SELECT COUNT(*) INTO total_count FROM whatsapp_sequence_messages;
  
  -- Contar pasos de condición (será 0 inicialmente)
  SELECT COUNT(*) INTO condition_steps_count 
  FROM whatsapp_sequence_messages 
  WHERE step_type = 'condition';
  
  -- Log para verificación
  RAISE NOTICE '✅ Migración 023 completada:';
  RAISE NOTICE '   - Total de registros: %', total_count;
  RAISE NOTICE '   - Pasos de condición: %', condition_steps_count;
  RAISE NOTICE '   - step_type ahora permite: message, pause, stage_change, condition';
END $$;


