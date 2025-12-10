-- ============================================================================
-- MIGRACIÓN 021: Migración de Pausas Existentes
-- FASE 9: Convertir pausas antiguas (mensajes especiales) a pasos tipo 'pause'
-- 
-- Este script identifica y convierte mensajes con contenido "⏸️ Pausa" 
-- a pasos independientes tipo 'pause' con step_type = 'pause'
-- ============================================================================

-- PASO 1: Identificar pausas existentes (mensajes con contenido "⏸️ Pausa")
-- Estas pausas antiguas tienen:
-- - step_type = 'message' (o NULL, que se trata como 'message')
-- - message_type = 'text'
-- - content_text = '⏸️ Pausa' (o variaciones)
-- - delay_hours_from_previous > 0
-- - Posiblemente pause_type ya definido

-- PASO 2: Eliminar vista temporal si existe (para evitar conflictos)
DROP VIEW IF EXISTS temp_pauses_to_migrate;

-- PASO 2.1: Crear vista temporal para identificar pausas
CREATE VIEW temp_pauses_to_migrate AS
SELECT 
  id,
  sequence_id,
  message_number,
  order_position,
  delay_hours_from_previous,
  pause_type,
  days_without_response,
  created_at,
  updated_at
FROM whatsapp_sequence_messages
WHERE (
  -- Pausas identificadas por contenido especial
  (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
  OR
  -- Pausas con message_type = 'text' pero sin contenido válido y delay > 0
  (message_type = 'text' 
   AND (content_text IS NULL OR content_text = '' OR content_text LIKE '⏸️%')
   AND delay_hours_from_previous > 0)
)
AND (step_type IS NULL OR step_type = 'message') -- Solo migrar si aún no son tipo 'pause'
ORDER BY sequence_id, order_position;

-- PASO 3: Verificación previa - Contar pausas a migrar
DO $$
DECLARE
  v_pause_count INTEGER;
  v_sequence_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pause_count FROM temp_pauses_to_migrate;
  SELECT COUNT(DISTINCT sequence_id) INTO v_sequence_count FROM temp_pauses_to_migrate;
  
  IF v_pause_count > 0 THEN
    RAISE NOTICE '📊 Pausas identificadas para migrar:';
    RAISE NOTICE '   - Total de pausas: %', v_pause_count;
    RAISE NOTICE '   - Secuencias afectadas: %', v_sequence_count;
  ELSE
    RAISE NOTICE '✅ No hay pausas antiguas para migrar.';
    RAISE NOTICE '   Todos los registros ya están usando step_type = ''pause'' o no son pausas.';
  END IF;
END $$;

-- PASO 4: Migrar pausas existentes
-- Actualizar registros para que sean pasos tipo 'pause'
UPDATE whatsapp_sequence_messages
SET 
  step_type = 'pause',
  message_type = NULL, -- Las pausas no tienen message_type
  content_text = NULL, -- Las pausas no tienen contenido de texto
  media_url = NULL,    -- Las pausas no tienen media
  media_filename = NULL,
  media_size_kb = NULL,
  caption = NULL,
  -- Mantener pause_type si existe, sino establecer 'fixed_delay' como predeterminado
  pause_type = COALESCE(pause_type, 'fixed_delay'),
  -- Mantener days_without_response si existe
  days_without_response = days_without_response,
  updated_at = NOW()
WHERE id IN (SELECT id FROM temp_pauses_to_migrate);

-- PASO 5: Verificación posterior
DO $$
DECLARE
  v_updated_count INTEGER;
  v_remaining_pauses INTEGER;
  v_message_pauses INTEGER;
  v_correct_pauses INTEGER;
BEGIN
  -- Contar cuántas se actualizaron
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Verificar que no quedan pausas antiguas sin migrar
  SELECT COUNT(*) INTO v_remaining_pauses
  FROM whatsapp_sequence_messages
  WHERE (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
    AND (step_type IS NULL OR step_type = 'message');
  
  -- Contar pausas que aún tienen message_type (no debería haber ninguna)
  SELECT COUNT(*) INTO v_message_pauses
  FROM whatsapp_sequence_messages
  WHERE step_type = 'pause'
    AND message_type IS NOT NULL;
  
  -- Contar pausas correctamente migradas
  SELECT COUNT(*) INTO v_correct_pauses
  FROM whatsapp_sequence_messages
  WHERE step_type = 'pause'
    AND message_type IS NULL
    AND content_text IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración 021 completada:';
  RAISE NOTICE '   - Pausas migradas: %', v_updated_count;
  RAISE NOTICE '   - Pausas correctamente configuradas: %', v_correct_pauses;
  
  IF v_remaining_pauses > 0 THEN
    RAISE WARNING '   ⚠️ Quedaron % pausas antiguas sin migrar', v_remaining_pauses;
  END IF;
  
  IF v_message_pauses > 0 THEN
    RAISE WARNING '   ⚠️ Hay % pausas con message_type no NULL (debería ser NULL)', v_message_pauses;
  END IF;
  
  IF v_updated_count > 0 AND v_correct_pauses >= v_updated_count THEN
    RAISE NOTICE '   ✅ Todas las pausas fueron migradas correctamente';
  END IF;
END $$;

-- PASO 6: Limpiar vista temporal
DROP VIEW IF EXISTS temp_pauses_to_migrate;

-- PASO 7: Verificación final - Resumen de tipos de pasos
SELECT 
  'VERIFICACIÓN FINAL' as verificacion,
  step_type,
  COUNT(*) as cantidad,
  CASE 
    WHEN step_type = 'message' THEN '✅ Mensajes normales'
    WHEN step_type = 'pause' THEN '✅ Pausas migradas/creadas'
    WHEN step_type = 'stage_change' THEN '✅ Cambios de etapa'
    WHEN step_type IS NULL THEN '⚠️ Sin step_type (deben ser actualizados)'
    ELSE '❓ Tipo desconocido'
  END as estado
FROM whatsapp_sequence_messages
GROUP BY step_type
ORDER BY step_type;

