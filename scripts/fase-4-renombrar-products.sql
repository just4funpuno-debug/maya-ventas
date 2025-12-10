-- FASE 4: Limpieza final
-- ⚠️ IMPORTANTE: Ejecutar SOLO después de confirmar que FASE 1, 2 y 3 funcionan correctamente
-- Esta fase es opcional y puede omitirse si prefieres mantener la vista products para compatibilidad

-- ================================================================
-- 1. VERIFICAR QUE NO HAY REFERENCIAS A PRODUCTS (VISTA)
-- ================================================================
-- Antes de eliminar la vista, verificamos que no se esté usando

-- Verificar si hay políticas RLS en la vista products (no debería tener)
SELECT 
  'Políticas RLS en vista products' as verificacion,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename = 'products';

-- Verificar si hay triggers en la vista products (no debería tener)
SELECT 
  'Triggers en vista products' as verificacion,
  COUNT(*) as total_triggers
FROM pg_trigger
WHERE tgrelid = 'products'::regclass;

-- ================================================================
-- 2. ELIMINAR VISTA PRODUCTS (OPCIONAL)
-- ================================================================
-- ⚠️ ADVERTENCIA: Solo eliminar si estás seguro de que no se necesita
-- La vista puede mantenerse para compatibilidad con código legacy

-- Opción A: Mantener la vista (RECOMENDADO para compatibilidad)
-- No hacer nada, la vista products puede mantenerse

-- Opción B: Eliminar la vista (solo si estás seguro)
-- Descomentar las siguientes líneas si quieres eliminar la vista:
/*
DROP VIEW IF EXISTS products;
*/

-- ================================================================
-- 3. VERIFICAR INTEGRIDAD FINAL
-- ================================================================
-- Verificar que almacen_central es la tabla principal
SELECT 
  'Verificación Final' as verificacion,
  (SELECT COUNT(*) FROM almacen_central) as productos_almacen_central,
  (SELECT COUNT(*) FROM products_backup) as productos_backup,
  (SELECT COUNT(*) FROM products) as productos_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM almacen_central) = (SELECT COUNT(*) FROM products)
    THEN '✅ Vista products sincronizada con almacen_central'
    ELSE '⚠️ Verificar sincronización'
  END as estado_vista;

-- Verificar foreign keys
SELECT 
  'Foreign Keys' as verificacion,
  COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey');

-- ================================================================
-- 4. RESUMEN FINAL
-- ================================================================
SELECT 
  'MIGRACIÓN COMPLETA' as resumen,
  'products → almacen_central' as migracion,
  (SELECT COUNT(*) FROM almacen_central) as total_productos,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) as foreign_keys_actualizadas,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN 'Vista products mantenida (compatibilidad)'
    ELSE 'Vista products eliminada'
  END as estado_vista;

