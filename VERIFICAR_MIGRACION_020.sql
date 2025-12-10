-- ============================================================================
-- Script de Verificación: Migración 020 - Flujos Flexibles
-- 
-- Ejecuta este script DESPUÉS de ejecutar la migración 020
-- para verificar que todo se aplicó correctamente.
-- ============================================================================

-- VERIFICACIÓN 1: Verificar que los campos fueron agregados
SELECT 
  'VERIFICACIÓN 1: Campos agregados' as verificacion,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_sequence_messages'
  AND column_name IN ('step_type', 'target_stage_name', 'message_type')
ORDER BY column_name;

-- VERIFICACIÓN 2: Verificar registros existentes por tipo de paso
SELECT 
  'VERIFICACIÓN 2: Distribución por step_type' as verificacion,
  step_type,
  COUNT(*) as cantidad,
  CASE 
    WHEN step_type IS NULL THEN '⚠️ ERROR: Hay registros sin step_type'
    WHEN step_type = 'message' THEN '✅ Correcto'
    ELSE '✅ Correcto (tipo nuevo)'
  END as estado
FROM whatsapp_sequence_messages
GROUP BY step_type
ORDER BY step_type;

-- VERIFICACIÓN 3: Verificar que no hay registros con step_type NULL
SELECT 
  'VERIFICACIÓN 3: Registros con step_type NULL' as verificacion,
  COUNT(*) as cantidad_null,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Correcto: No hay registros NULL'
    ELSE '⚠️ ERROR: Hay ' || COUNT(*) || ' registros con step_type NULL'
  END as estado
FROM whatsapp_sequence_messages
WHERE step_type IS NULL;

-- VERIFICACIÓN 4: Verificar que message_type puede ser NULL
SELECT 
  'VERIFICACIÓN 4: message_type permite NULL' as verificacion,
  is_nullable,
  CASE 
    WHEN is_nullable = 'YES' THEN '✅ Correcto: message_type permite NULL'
    ELSE '⚠️ ERROR: message_type no permite NULL'
  END as estado
FROM information_schema.columns
WHERE table_name = 'whatsapp_sequence_messages'
  AND column_name = 'message_type';

-- VERIFICACIÓN 5: Verificar índices creados
SELECT 
  'VERIFICACIÓN 5: Índices creados' as verificacion,
  indexname as nombre_indice,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'whatsapp_sequence_messages'
  AND indexname IN ('idx_sequence_messages_step_type', 'idx_sequence_messages_target_stage')
ORDER BY indexname;

-- VERIFICACIÓN 6: Verificar constraint de step_type
SELECT 
  'VERIFICACIÓN 6: Constraint de step_type' as verificacion,
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'whatsapp_sequence_messages'::regclass
  AND conname LIKE '%step_type%';

-- RESUMEN FINAL
SELECT 
  'RESUMEN FINAL' as seccion,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages) as total_registros,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'message') as pasos_mensaje,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'pause') as pasos_pausa,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type = 'stage_change') as pasos_cambio_etapa,
  CASE 
    WHEN (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE step_type IS NULL) = 0 
      THEN '✅ MIGRACIÓN EXITOSA'
    ELSE '⚠️ REVISAR: Hay registros con step_type NULL'
  END as estado_migracion;

