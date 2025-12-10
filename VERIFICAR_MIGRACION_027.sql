-- ============================================================================
-- VERIFICACIÓN MIGRACIÓN 027: Interrupción de Pausas por Palabras Clave
-- ============================================================================

-- 1. Verificar que los campos existen
SELECT 
  'VERIFICACIÓN 1: Campos agregados' AS verificacion,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_sequence_messages'
  AND column_name IN ('pause_interrupt_keywords', 'pause_delay_after_interrupt')
ORDER BY column_name;

-- 2. Verificar índice creado
SELECT 
  'VERIFICACIÓN 2: Índice creado' AS verificacion,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_sequence_messages'
  AND indexname = 'idx_sequence_messages_pause_interrupt';

-- 3. Verificar pausas fixed_delay existentes
SELECT 
  'VERIFICACIÓN 3: Pausas fixed_delay' AS verificacion,
  COUNT(*) AS total_pausas_fixed_delay,
  COUNT(pause_interrupt_keywords) AS pausas_con_interrupcion,
  COUNT(pause_delay_after_interrupt) AS pausas_con_delay_despues
FROM whatsapp_sequence_messages
WHERE step_type = 'pause' 
  AND pause_type = 'fixed_delay';

-- 4. Ejemplo de estructura de pause_interrupt_keywords (si hay datos)
SELECT 
  'VERIFICACIÓN 4: Estructura de pause_interrupt_keywords' AS verificacion,
  id,
  pause_interrupt_keywords,
  pause_delay_after_interrupt,
  CASE 
    WHEN pause_interrupt_keywords IS NULL THEN 'Sin interrupción'
    WHEN pause_interrupt_keywords->>'keywords' IS NULL THEN '⚠️ Keywords faltantes'
    WHEN jsonb_array_length(pause_interrupt_keywords->'keywords') = 0 THEN '⚠️ Array vacío'
    ELSE '✅ Configuración válida'
  END AS estado
FROM whatsapp_sequence_messages
WHERE step_type = 'pause' 
  AND pause_type = 'fixed_delay'
  AND pause_interrupt_keywords IS NOT NULL
LIMIT 5;

-- 5. Resumen final
SELECT 
  'RESUMEN FINAL' AS verificacion,
  COUNT(*) FILTER (WHERE step_type = 'pause' AND pause_type = 'fixed_delay') AS total_pausas_fixed_delay,
  COUNT(*) FILTER (WHERE step_type = 'pause' 
                     AND pause_type = 'fixed_delay' 
                     AND pause_interrupt_keywords IS NOT NULL) AS pausas_con_interrupcion,
  COUNT(*) FILTER (WHERE step_type = 'pause' 
                     AND pause_type = 'fixed_delay' 
                     AND pause_delay_after_interrupt IS NOT NULL 
                     AND pause_delay_after_interrupt > 0) AS pausas_con_delay_despues,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'whatsapp_sequence_messages' 
          AND column_name = 'pause_interrupt_keywords') = 1 
         AND (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = 'whatsapp_sequence_messages' 
              AND column_name = 'pause_delay_after_interrupt') = 1
    THEN '✅ Migración completa - Todos los campos agregados'
    ELSE '❌ Campos faltantes'
  END AS estado_migracion
FROM whatsapp_sequence_messages;


