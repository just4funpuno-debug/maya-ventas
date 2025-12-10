-- ============================================================================
-- Script de Verificación: Migración 021 - Pausas Existentes
-- 
-- Ejecuta este script DESPUÉS de ejecutar la migración 021
-- para verificar que las pausas se migraron correctamente.
-- ============================================================================

-- VERIFICACIÓN 1: Identificar pausas antiguas sin migrar
SELECT 
  'VERIFICACIÓN 1: Pausas antiguas sin migrar' as verificacion,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No hay pausas antiguas sin migrar'
    ELSE '⚠️ ERROR: Hay ' || COUNT(*) || ' pausas antiguas sin migrar'
  END as estado
FROM whatsapp_sequence_messages
WHERE (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
  AND (step_type IS NULL OR step_type = 'message');

-- VERIFICACIÓN 2: Verificar pausas migradas correctamente
SELECT 
  'VERIFICACIÓN 2: Pausas migradas correctamente' as verificacion,
  COUNT(*) as cantidad_pausas,
  COUNT(CASE WHEN message_type IS NULL THEN 1 END) as con_message_type_null,
  COUNT(CASE WHEN content_text IS NULL THEN 1 END) as con_content_text_null,
  COUNT(CASE WHEN pause_type IS NOT NULL THEN 1 END) as con_pause_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ℹ️ No hay pausas migradas (normal si no había pausas antiguas)'
    WHEN COUNT(*) > 0 AND COUNT(CASE WHEN message_type IS NULL THEN 1 END) = COUNT(*) 
         AND COUNT(CASE WHEN content_text IS NULL THEN 1 END) = COUNT(*)
         AND COUNT(CASE WHEN pause_type IS NOT NULL THEN 1 END) = COUNT(*)
      THEN '✅ Todas las pausas migradas están correctamente configuradas'
    ELSE '⚠️ ERROR: Algunas pausas migradas tienen campos incorrectos'
  END as estado
FROM whatsapp_sequence_messages
WHERE step_type = 'pause';

-- VERIFICACIÓN 3: Verificar que no hay pausas con campos de mensaje
SELECT 
  'VERIFICACIÓN 3: Pausas con campos de mensaje' as verificacion,
  COUNT(*) as cantidad_problemas,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No hay pausas con campos de mensaje'
    ELSE '⚠️ ERROR: Hay ' || COUNT(*) || ' pausas con campos de mensaje (deberían ser NULL)'
  END as estado
FROM whatsapp_sequence_messages
WHERE step_type = 'pause'
  AND (
    message_type IS NOT NULL 
    OR content_text IS NOT NULL
    OR media_url IS NOT NULL
  );

-- VERIFICACIÓN 4: Distribución de tipos de pasos
SELECT 
  'VERIFICACIÓN 4: Distribución de tipos de pasos' as verificacion,
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

-- VERIFICACIÓN 5: Detalle de pausas migradas (muestra ejemplos)
SELECT 
  'VERIFICACIÓN 5: Ejemplos de pausas migradas' as verificacion,
  id,
  sequence_id,
  order_position,
  step_type,
  message_type,
  content_text,
  delay_hours_from_previous,
  pause_type,
  days_without_response,
  CASE 
    WHEN message_type IS NULL AND content_text IS NULL AND pause_type IS NOT NULL 
      THEN '✅ Correcto'
    ELSE '⚠️ Revisar'
  END as estado_migracion
FROM whatsapp_sequence_messages
WHERE step_type = 'pause'
ORDER BY sequence_id, order_position
LIMIT 10;

-- VERIFICACIÓN 6: Verificar delays preservados
SELECT 
  'VERIFICACIÓN 6: Delays preservados en pausas' as verificacion,
  COUNT(*) as total_pausas,
  COUNT(CASE WHEN delay_hours_from_previous > 0 THEN 1 END) as con_delay,
  COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END) as tipo_fixed_delay,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ℹ️ No hay pausas para verificar'
    WHEN COUNT(CASE WHEN pause_type = 'fixed_delay' AND delay_hours_from_previous > 0 THEN 1 END) = 
         COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END)
      THEN '✅ Todos los delays fueron preservados correctamente'
    ELSE '⚠️ Algunas pausas fixed_delay no tienen delay_hours_from_previous'
  END as estado
FROM whatsapp_sequence_messages
WHERE step_type = 'pause'
  AND pause_type = 'fixed_delay';

-- RESUMEN FINAL
SELECT 
  'RESUMEN FINAL' as seccion,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'pause') as pausas_migradas,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages 
   WHERE (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
     AND (step_type IS NULL OR step_type = 'message')) as pausas_antiguas_restantes,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages 
   WHERE step_type = 'pause' 
     AND message_type IS NULL 
     AND content_text IS NULL 
     AND pause_type IS NOT NULL) as pausas_correctamente_migradas,
  CASE 
    WHEN (SELECT COUNT(*) FROM whatsapp_sequence_messages 
          WHERE (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
            AND (step_type IS NULL OR step_type = 'message')) = 0
         AND (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'pause') > 0
         AND (SELECT COUNT(*) FROM whatsapp_sequence_messages 
              WHERE step_type = 'pause' 
                AND message_type IS NULL 
                AND content_text IS NULL) = 
            (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'pause')
      THEN '✅ MIGRACIÓN EXITOSA'
    WHEN (SELECT COUNT(*) FROM whatsapp_sequence_messages 
          WHERE (content_text = '⏸️ Pausa' OR content_text LIKE '⏸️%Pausa%')
            AND (step_type IS NULL OR step_type = 'message')) = 0
         AND (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'pause') = 0
      THEN '✅ No había pausas antiguas para migrar (normal)'
    ELSE '⚠️ REVISAR: Hay inconsistencias en la migración'
  END as estado_migracion;

