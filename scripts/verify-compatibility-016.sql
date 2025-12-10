-- ============================================================================
-- VERIFICACIÓN DE COMPATIBILIDAD: Migración 016
-- FASE 1: SUBFASE 1.3 - Verificación de Compatibilidad
-- 
-- Este script verifica que las secuencias existentes siguen funcionando
-- correctamente después de la migración.
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Contar secuencias y mensajes existentes
-- ============================================================================
SELECT 
  'VERIFICACIÓN 1: Conteo de registros' AS verification,
  (SELECT COUNT(*) FROM whatsapp_sequences) AS total_sequences,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages) AS total_messages;

-- ============================================================================
-- VERIFICACIÓN 2: Verificar valores por defecto en mensajes existentes
-- ============================================================================
SELECT 
  'VERIFICACIÓN 2: Valores por defecto' AS verification,
  COUNT(*) AS total_messages,
  COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END) AS fixed_delay_count,
  COUNT(CASE WHEN condition_type = 'none' THEN 1 END) AS none_condition_count,
  COUNT(CASE WHEN next_message_if_true IS NULL THEN 1 END) AS null_next_true_count,
  COUNT(CASE WHEN next_message_if_false IS NULL THEN 1 END) AS null_next_false_count,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END)
         AND COUNT(*) = COUNT(CASE WHEN condition_type = 'none' THEN 1 END)
         AND COUNT(*) = COUNT(CASE WHEN next_message_if_true IS NULL THEN 1 END)
         AND COUNT(*) = COUNT(CASE WHEN next_message_if_false IS NULL THEN 1 END)
    THEN '✅ PASS: Todos los mensajes tienen valores por defecto correctos'
    ELSE '❌ FAIL: Algunos mensajes no tienen valores por defecto'
  END AS result
FROM whatsapp_sequence_messages;

-- ============================================================================
-- VERIFICACIÓN 3: Verificar que las secuencias existentes siguen siendo válidas
-- ============================================================================
SELECT 
  'VERIFICACIÓN 3: Secuencias válidas' AS verification,
  s.id AS sequence_id,
  s.name AS sequence_name,
  s.active AS sequence_active,
  COUNT(sm.id) AS message_count,
  COUNT(CASE WHEN sm.pause_type = 'fixed_delay' THEN 1 END) AS fixed_delay_messages,
  COUNT(CASE WHEN sm.condition_type = 'none' THEN 1 END) AS none_condition_messages
FROM whatsapp_sequences s
LEFT JOIN whatsapp_sequence_messages sm ON sm.sequence_id = s.id
GROUP BY s.id, s.name, s.active
ORDER BY s.created_at DESC
LIMIT 10;

-- ============================================================================
-- VERIFICACIÓN 4: Verificar que no hay mensajes con valores inválidos
-- ============================================================================
SELECT 
  'VERIFICACIÓN 4: Valores inválidos' AS verification,
  COUNT(CASE WHEN pause_type NOT IN ('fixed_delay', 'until_message', 'until_days_without_response') THEN 1 END) AS invalid_pause_type,
  COUNT(CASE WHEN condition_type NOT IN ('none', 'if_responded', 'if_not_responded') THEN 1 END) AS invalid_condition_type,
  CASE 
    WHEN COUNT(CASE WHEN pause_type NOT IN ('fixed_delay', 'until_message', 'until_days_without_response') THEN 1 END) = 0
         AND COUNT(CASE WHEN condition_type NOT IN ('none', 'if_responded', 'if_not_responded') THEN 1 END) = 0
    THEN '✅ PASS: No hay valores inválidos'
    ELSE '❌ FAIL: Hay valores inválidos'
  END AS result
FROM whatsapp_sequence_messages;

-- ============================================================================
-- VERIFICACIÓN 5: Verificar foreign keys de ramificaciones
-- ============================================================================
SELECT 
  'VERIFICACIÓN 5: Foreign keys de ramificaciones' AS verification,
  COUNT(CASE WHEN next_message_if_true IS NOT NULL THEN 1 END) AS messages_with_next_true,
  COUNT(CASE WHEN next_message_if_false IS NOT NULL THEN 1 END) AS messages_with_next_false,
  COUNT(CASE WHEN next_message_if_true IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM whatsapp_sequence_messages sm2 
               WHERE sm2.id = sm.next_message_if_true
             ) THEN 1 END) AS invalid_next_true,
  COUNT(CASE WHEN next_message_if_false IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM whatsapp_sequence_messages sm2 
               WHERE sm2.id = sm.next_message_if_false
             ) THEN 1 END) AS invalid_next_false,
  CASE 
    WHEN COUNT(CASE WHEN next_message_if_true IS NOT NULL 
                    AND NOT EXISTS (
                      SELECT 1 FROM whatsapp_sequence_messages sm2 
                      WHERE sm2.id = sm.next_message_if_true
                    ) THEN 1 END) = 0
         AND COUNT(CASE WHEN next_message_if_false IS NOT NULL 
                        AND NOT EXISTS (
                          SELECT 1 FROM whatsapp_sequence_messages sm2 
                          WHERE sm2.id = sm.next_message_if_false
                        ) THEN 1 END) = 0
    THEN '✅ PASS: Todas las foreign keys son válidas'
    ELSE '❌ FAIL: Hay foreign keys inválidas'
  END AS result
FROM whatsapp_sequence_messages sm;

-- ============================================================================
-- VERIFICACIÓN 6: Verificar que los índices existen
-- ============================================================================
SELECT 
  'VERIFICACIÓN 6: Índices' AS verification,
  COUNT(*) AS total_indexes,
  array_agg(indexname ORDER BY indexname) AS index_names,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS: Índices creados correctamente'
    ELSE '❌ FAIL: Faltan índices'
  END AS result
FROM pg_indexes
WHERE tablename = 'whatsapp_sequence_messages'
  AND indexname LIKE 'idx_sequence_messages%';

-- ============================================================================
-- VERIFICACIÓN 7: Verificar estructura de columnas
-- ============================================================================
SELECT 
  'VERIFICACIÓN 7: Estructura de columnas' AS verification,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_sequence_messages'
  AND column_name IN ('pause_type', 'condition_type', 'next_message_if_true', 'next_message_if_false', 'days_without_response')
ORDER BY column_name;

-- ============================================================================
-- RESUMEN FINAL DE COMPATIBILIDAD
-- ============================================================================
SELECT 
  'RESUMEN FINAL' AS summary,
  (SELECT COUNT(*) FROM whatsapp_sequences) AS total_sequences,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages) AS total_messages,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE pause_type = 'fixed_delay') AS messages_with_fixed_delay,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE condition_type = 'none') AS messages_with_no_condition,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE next_message_if_true IS NOT NULL) AS messages_with_ramification_true,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE next_message_if_false IS NOT NULL) AS messages_with_ramification_false,
  CASE 
    WHEN (SELECT COUNT(*) FROM whatsapp_sequence_messages) = 
         (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE pause_type = 'fixed_delay')
         AND (SELECT COUNT(*) FROM whatsapp_sequence_messages) = 
         (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE condition_type = 'none')
    THEN '✅ COMPATIBILIDAD GARANTIZADA: Todas las secuencias existentes tienen valores por defecto'
    ELSE '⚠️ ADVERTENCIA: Algunas secuencias pueden tener valores no por defecto'
  END AS compatibility_status;

