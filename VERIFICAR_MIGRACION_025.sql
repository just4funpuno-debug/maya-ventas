-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: Migración 025 - template_id en sequence_messages
-- FASE 3 - SUBFASE 3.1
-- 
-- Ejecutar después de aplicar la migración 025 para verificar que todo está correcto
-- ============================================================================

-- VERIFICACIÓN 1: Verificar que la columna template_id existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_sequence_messages'
  AND column_name = 'template_id';

-- VERIFICACIÓN 2: Verificar el Foreign Key constraint
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'whatsapp_sequence_messages'
  AND kcu.column_name = 'template_id';

-- VERIFICACIÓN 3: Verificar que el índice existe
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_sequence_messages'
  AND indexname = 'idx_sequence_messages_template_id';

-- VERIFICACIÓN 4: Contar mensajes con y sin template_id
SELECT 
  CASE 
    WHEN template_id IS NULL THEN 'Sin template'
    ELSE 'Con template'
  END AS tipo,
  COUNT(*) as cantidad
FROM whatsapp_sequence_messages
GROUP BY 
  CASE 
    WHEN template_id IS NULL THEN 'Sin template'
    ELSE 'Con template'
  END;

-- VERIFICACIÓN 5: Verificar que los templates referenciados existen
SELECT 
  sm.id as sequence_message_id,
  sm.sequence_id,
  sm.message_number,
  sm.template_id,
  t.name as template_name,
  t.wa_status as template_status
FROM whatsapp_sequence_messages sm
LEFT JOIN whatsapp_templates t ON sm.template_id = t.id
WHERE sm.template_id IS NOT NULL;

-- VERIFICACIÓN 6: Verificar integridad referencial (no debe haber orphaned references)
SELECT 
  sm.id as sequence_message_id,
  sm.template_id,
  'Template no existe' as problema
FROM whatsapp_sequence_messages sm
WHERE sm.template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM whatsapp_templates t 
    WHERE t.id = sm.template_id
  );

-- RESUMEN FINAL
SELECT 
  'VERIFICACIÓN FINAL' as verificacion,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE template_id IS NOT NULL) as mensajes_con_template,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages WHERE template_id IS NULL) as mensajes_sin_template,
  (SELECT COUNT(*) FROM whatsapp_sequence_messages) as total_mensajes,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_sequence_messages'
        AND column_name = 'template_id'
    ) THEN '✅ Columna template_id existe'
    ELSE '❌ Columna template_id NO existe'
  END as estado_columna,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'whatsapp_sequence_messages'
        AND indexname = 'idx_sequence_messages_template_id'
    ) THEN '✅ Índice existe'
    ELSE '❌ Índice NO existe'
  END as estado_indice;


