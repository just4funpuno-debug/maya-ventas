-- ================================================================
-- TESTING: Validaciones de Independencia de Productos
-- FASE 1: Tests de Base de Datos
-- ================================================================
-- Objetivo: Verificar que las validaciones funcionan correctamente
-- ================================================================

-- ================================================================
-- TEST 1: Verificar que el índice único existe
-- ================================================================
SELECT 
  'TEST 1: Verificar índice único' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'whatsapp_accounts'
        AND indexname = 'idx_accounts_product_unique'
    ) THEN '✅ PASS: Índice único existe'
    ELSE '❌ FAIL: Índice único NO existe'
  END AS result;

-- ================================================================
-- TEST 2: Verificar que no hay productos con múltiples cuentas
-- ================================================================
SELECT 
  'TEST 2: Verificar duplicados' AS test_name,
  CASE 
    WHEN (
      SELECT COUNT(*)
      FROM (
        SELECT product_id, COUNT(*) as cuenta
        FROM whatsapp_accounts
        WHERE product_id IS NOT NULL
        GROUP BY product_id
        HAVING COUNT(*) > 1
      ) duplicates
    ) = 0 THEN '✅ PASS: No hay productos con múltiples cuentas'
    ELSE '❌ FAIL: Hay productos con múltiples cuentas'
  END AS result;

-- ================================================================
-- TEST 3: Intentar crear cuenta duplicada (debe fallar)
-- ================================================================
-- Este test debe ejecutarse manualmente ya que requiere datos existentes
-- 
-- PASOS:
-- 1. Crear una cuenta con product_id = 'test-product-123'
-- 2. Intentar crear otra cuenta con el mismo product_id
-- 3. Debe fallar con error de índice único

-- Ejemplo de prueba manual:
/*
INSERT INTO whatsapp_accounts (
  phone_number_id,
  business_account_id,
  access_token,
  verify_token,
  phone_number,
  product_id
) VALUES (
  'test-phone-1',
  'test-business-1',
  'test-token-1',
  'test-verify-1',
  '+1234567890',
  'test-product-123'
);

-- Ahora intentar crear otra cuenta con el mismo product_id (debe fallar):
INSERT INTO whatsapp_accounts (
  phone_number_id,
  business_account_id,
  access_token,
  verify_token,
  phone_number,
  product_id
) VALUES (
  'test-phone-2',
  'test-business-2',
  'test-token-2',
  'test-verify-2',
  '+1234567891',
  'test-product-123'  -- Mismo product_id - DEBE FALLAR
);
-- Error esperado: duplicate key value violates unique constraint
*/

-- ================================================================
-- TEST 4: Verificar estructura de índices
-- ================================================================
SELECT 
  'TEST 4: Índices de whatsapp_accounts' AS test_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_accounts'
  AND indexname LIKE '%product%'
ORDER BY indexname;

-- ================================================================
-- TEST 5: Verificar estructura de tablas relacionadas
-- ================================================================
SELECT 
  'TEST 5: Verificar estructura de tablas' AS test_name,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('whatsapp_accounts', 'whatsapp_leads', 'products')
  AND column_name IN ('product_id', 'account_id', 'contact_id')
ORDER BY table_name, column_name;

-- ================================================================
-- TEST 6: Contar cuentas por producto
-- ================================================================
SELECT 
  'TEST 6: Cuentas por producto' AS test_name,
  product_id,
  COUNT(*) as cuenta_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '❌ DUPLICADO'
    WHEN COUNT(*) = 1 THEN '✅ OK'
    ELSE 'ℹ️ Sin cuenta'
  END AS status
FROM whatsapp_accounts
WHERE product_id IS NOT NULL
GROUP BY product_id
ORDER BY cuenta_count DESC;

-- ================================================================
-- TEST 7: Verificar foreign keys
-- ================================================================
SELECT 
  'TEST 7: Foreign Keys' AS test_name,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('whatsapp_accounts', 'whatsapp_leads')
ORDER BY tc.table_name, tc.constraint_name;

-- ================================================================
-- RESUMEN DE TESTS
-- ================================================================
SELECT 
  'RESUMEN' AS test_name,
  'Ejecuta todos los tests anteriores y verifica los resultados' AS result;



