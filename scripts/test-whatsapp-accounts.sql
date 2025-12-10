-- ============================================================================
-- SCRIPT DE TESTING: Cuentas WhatsApp
-- SUBFASE 1.4: Verificar que las cuentas se guardan correctamente en BD
-- ============================================================================
-- 
-- Este script verifica:
-- 1. Estructura de la tabla whatsapp_accounts
-- 2. Datos de prueba insertados correctamente
-- 3. Constraints y validaciones funcionando
-- 4. Relaciones con products (si existe)
--
-- Ejecutar desde Supabase SQL Editor o psql
-- ============================================================================

-- 1. Verificar estructura de tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_accounts'
ORDER BY ordinal_position;

-- 2. Verificar constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_accounts';

-- 3. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_accounts';

-- 4. Insertar cuenta de prueba (si no existe)
INSERT INTO whatsapp_accounts (
  phone_number_id,
  business_account_id,
  access_token,
  verify_token,
  phone_number,
  display_name,
  active
) VALUES (
  'TEST_PHONE_ID_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'TEST_BUSINESS_ID_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'TEST_ACCESS_TOKEN_' || REPEAT('a', 50),
  'TEST_VERIFY_TOKEN_1234567890',
  '+591 12345678',
  'Cuenta de Prueba - Testing',
  true
)
ON CONFLICT (phone_number_id) DO NOTHING
RETURNING id, phone_number_id, display_name, created_at;

-- 5. Verificar que se insertó correctamente
SELECT 
  id,
  phone_number_id,
  business_account_id,
  phone_number,
  display_name,
  active,
  created_at,
  updated_at
FROM whatsapp_accounts
WHERE phone_number_id LIKE 'TEST_%'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Probar actualización
UPDATE whatsapp_accounts
SET 
  display_name = 'Cuenta Actualizada - ' || NOW()::TEXT,
  active = false,
  updated_at = NOW()
WHERE phone_number_id LIKE 'TEST_%'
RETURNING id, display_name, active, updated_at;

-- 7. Verificar que updated_at se actualizó
SELECT 
  id,
  display_name,
  active,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_diff
FROM whatsapp_accounts
WHERE phone_number_id LIKE 'TEST_%'
ORDER BY updated_at DESC
LIMIT 1;

-- 8. Verificar constraint de phone_number_id único
-- Esto debería fallar si intentamos insertar un duplicado
DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_accounts (
      phone_number_id,
      business_account_id,
      access_token,
      verify_token,
      phone_number
    ) VALUES (
      'DUPLICATE_TEST',
      'BUSINESS_1',
      'TOKEN_1',
      'VERIFY_1',
      '+591 11111111'
    );
    
    INSERT INTO whatsapp_accounts (
      phone_number_id,
      business_account_id,
      access_token,
      verify_token,
      phone_number
    ) VALUES (
      'DUPLICATE_TEST', -- Duplicado
      'BUSINESS_2',
      'TOKEN_2',
      'VERIFY_2',
      '+591 22222222'
    );
    
    RAISE EXCEPTION 'ERROR: El constraint de unicidad no funcionó';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ Constraint de unicidad funcionando correctamente';
  END;
END $$;

-- 9. Verificar relación con products (si existe)
SELECT 
  wa.id,
  wa.phone_number_id,
  wa.display_name,
  wa.product_id,
  p.name as product_name,
  p.sku as product_sku
FROM whatsapp_accounts wa
LEFT JOIN products p ON wa.product_id = p.id
WHERE wa.product_id IS NOT NULL
LIMIT 10;

-- 10. Estadísticas de cuentas
SELECT 
  COUNT(*) as total_cuentas,
  COUNT(*) FILTER (WHERE active = true) as cuentas_activas,
  COUNT(*) FILTER (WHERE active = false) as cuentas_inactivas,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) as cuentas_con_producto,
  MIN(created_at) as primera_cuenta,
  MAX(created_at) as ultima_cuenta
FROM whatsapp_accounts;

-- 11. Limpiar datos de prueba (OPCIONAL - descomentar para ejecutar)
-- DELETE FROM whatsapp_accounts WHERE phone_number_id LIKE 'TEST_%';
-- DELETE FROM whatsapp_accounts WHERE phone_number_id = 'DUPLICATE_TEST';

-- ============================================================================
-- RESULTADOS ESPERADOS:
-- ============================================================================
-- 1. Tabla debe tener todas las columnas definidas en el schema
-- 2. Constraints deben estar presentes (PRIMARY KEY, UNIQUE en phone_number_id)
-- 3. Índices deben existir
-- 4. Inserción debe funcionar sin errores
-- 5. Actualización debe modificar updated_at
-- 6. Constraint de unicidad debe prevenir duplicados
-- 7. LEFT JOIN con products debe funcionar (si products existe)
-- 8. Estadísticas deben mostrar datos correctos
-- ============================================================================

