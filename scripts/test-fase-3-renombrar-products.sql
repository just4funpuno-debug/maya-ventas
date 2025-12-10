-- Script de testing para FASE 3: Actualizar foreign keys
-- Ejecutar después de ejecutar fase-3-renombrar-products.sql

-- 1. Verificar foreign keys apuntan a almacen_central
SELECT 
  'Foreign Keys' as verificacion,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  CASE 
    WHEN ccu.table_name = 'almacen_central' THEN '✅ Apunta a almacen_central'
    ELSE '❌ NO apunta a almacen_central'
  END as estado
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'sales' OR tc.table_name = 'mis_numeros')
  AND kcu.column_name IN ('sku', 'sku_extra')
ORDER BY tc.table_name, tc.constraint_name;

-- 2. Verificar que las foreign keys funcionan (test de integridad)
-- Verificar que no hay SKUs en sales que no existan en almacen_central
SELECT 
  'Integridad sales.sku' as verificacion,
  COUNT(*) as ventas_con_sku_invalido
FROM sales s
WHERE s.sku IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM almacen_central a WHERE a.sku = s.sku
  );

-- Verificar que no hay SKUs en sales.sku_extra que no existan en almacen_central
SELECT 
  'Integridad sales.sku_extra' as verificacion,
  COUNT(*) as ventas_con_sku_extra_invalido
FROM sales s
WHERE s.sku_extra IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM almacen_central a WHERE a.sku = s.sku_extra
  );

-- Verificar que no hay SKUs en mis_numeros que no existan en almacen_central
SELECT 
  'Integridad mis_numeros.sku' as verificacion,
  COUNT(*) as numeros_con_sku_invalido
FROM mis_numeros n
WHERE n.sku IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM almacen_central a WHERE a.sku = n.sku
  );

-- 3. Test de INSERT con foreign key (debe funcionar)
-- Este test crea un registro temporal que se eliminará después
DO $$
DECLARE
  test_sku text := 'TEST-FASE-3-' || extract(epoch from now())::text;
  test_id uuid;
BEGIN
  -- Crear producto de prueba en almacen_central
  INSERT INTO almacen_central (sku, nombre, precio, costo, stock)
  VALUES (test_sku, 'Producto Test FASE 3', 100, 50, 10)
  RETURNING id INTO test_id;
  
  -- Intentar crear una venta con ese SKU (debe funcionar)
  INSERT INTO sales (fecha, ciudad, sku, cantidad, precio)
  VALUES (CURRENT_DATE, 'la_paz', test_sku, 1, 100);
  
  RAISE NOTICE '✅ Test INSERT: Foreign key funciona correctamente';
  
  -- Limpiar: eliminar venta de prueba
  DELETE FROM sales WHERE sku = test_sku;
  
  -- Eliminar producto de prueba
  DELETE FROM almacen_central WHERE sku = test_sku;
  
  RAISE NOTICE '✅ Test completado y limpiado';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Test INSERT falló: %', SQLERRM;
    -- Limpiar en caso de error
    DELETE FROM sales WHERE sku = test_sku;
    DELETE FROM almacen_central WHERE sku = test_sku;
END $$;

-- 4. Resumen final
SELECT 
  'RESUMEN FASE 3' as resumen,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) as foreign_keys_actualizadas,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) = 3
    THEN '✅ TODO CORRECTO'
    ELSE '❌ HAY PROBLEMAS'
  END as estado_final;


