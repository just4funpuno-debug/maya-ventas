-- Script para eliminar la vista products
-- ⚠️ IMPORTANTE: Solo ejecutar si estás seguro de que no se necesita
-- ✅ El código ya no usa esta vista, todo apunta a almacen_central

-- Verificar que la vista existe antes de eliminar
SELECT 
  'Verificación Pre-Eliminación' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products existe, se puede eliminar'
    ELSE '⚠️ Vista products NO existe, no hay nada que eliminar'
  END as estado;

-- Eliminar la vista products
DROP VIEW IF EXISTS products;

-- Verificar que se eliminó correctamente
SELECT 
  'Verificación Post-Eliminación' as verificacion,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products')
    THEN '✅ Vista products eliminada correctamente'
    ELSE '❌ ERROR: Vista products aún existe'
  END as estado;

-- Resumen final
SELECT 
  'Limpieza Completada' as resumen,
  'Vista products eliminada' as accion,
  'almacen_central es ahora la única referencia' as resultado;


