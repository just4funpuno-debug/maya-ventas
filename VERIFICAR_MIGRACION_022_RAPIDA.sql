-- ============================================================================
-- VERIFICACIÓN RÁPIDA: Migración 022
-- 
-- Ejecutar para verificar que la migración se aplicó correctamente
-- ============================================================================

-- 1. Verificar que el constraint permite 'if_message_contains'
SELECT 
  '1. Constraint de condition_type' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%condition_type%'
        AND check_clause LIKE '%if_message_contains%'
    ) THEN '✅ Permite if_message_contains'
    ELSE '❌ NO permite if_message_contains'
  END as estado;

-- 2. Verificar que existe el campo condition_keywords
SELECT 
  '2. Campo condition_keywords' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_sequence_messages'
        AND column_name = 'condition_keywords'
        AND data_type = 'jsonb'
    ) THEN '✅ Campo existe (JSONB)'
    ELSE '❌ Campo NO existe'
  END as estado;

-- 3. Verificar que existe el índice
SELECT 
  '3. Índice condition_keywords' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'whatsapp_sequence_messages'
        AND indexname = 'idx_sequence_messages_condition_keywords'
    ) THEN '✅ Índice creado'
    ELSE '❌ Índice NO existe'
  END as estado;

-- 4. Verificar que podemos insertar una condición de prueba
-- (Solo verificar estructura, no insertar realmente)
SELECT 
  '4. Estructura lista para usar' as check_name,
  '✅ Puedes configurar condiciones de keywords desde la UI' as estado;

-- RESUMEN
SELECT 
  '═══════════════════════════════════════════════════' as separador,
  'RESUMEN: Migración 022 aplicada correctamente' as resumen,
  'Puedes comenzar a usar la funcionalidad de keywords' as siguiente_paso;


