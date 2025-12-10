-- ============================================================================
-- VERIFICACIÓN COMPLETA DE MIGRACIÓN 009
-- Ejecuta estas consultas para verificar que todo está correcto
-- ============================================================================

-- 1. Verificar que la tabla existe y tiene todas las columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_quick_replies'
ORDER BY ordinal_position;

-- 2. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_quick_replies'
ORDER BY indexname;

-- 3. Verificar función
SELECT 
  proname,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as returns
FROM pg_proc
WHERE proname = 'get_quick_replies';

-- 4. Verificar RLS habilitado
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'whatsapp_quick_replies';

-- 5. Verificar políticas RLS
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'whatsapp_quick_replies'
ORDER BY policyname;

-- 6. Verificar CHECK constraints
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%quick_replies%'
ORDER BY constraint_name;

-- 7. Verificar trigger
SELECT 
  tgname as trigger_name,
  tgtype::text as trigger_type
FROM pg_trigger
WHERE tgname = 'whatsapp_quick_replies_updated_at';

-- 8. Test rápido: Probar función (necesita una cuenta)
DO $$
DECLARE
  test_account_id UUID;
BEGIN
  -- Buscar una cuenta de prueba
  SELECT id INTO test_account_id
  FROM whatsapp_accounts
  LIMIT 1;
  
  IF test_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay cuentas WhatsApp para probar la función';
  ELSE
    -- Probar función
    PERFORM * FROM get_quick_replies(test_account_id, NULL);
    RAISE NOTICE '✅ Función get_quick_replies funciona correctamente';
    RAISE NOTICE '   Account ID usado: %', test_account_id;
  END IF;
END $$;

