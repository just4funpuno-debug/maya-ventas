-- Script para verificar dependencias de products_backup
-- Ejecutar antes de eliminar products_backup

-- 1. Verificar foreign keys que apuntan a products_backup
SELECT 
  'Foreign Keys que apuntan a products_backup' as verificacion,
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
  AND ccu.table_name = 'products_backup'
ORDER BY tc.table_name, tc.constraint_name;

-- 2. Verificar vistas que dependen de products_backup
SELECT 
  'Vistas que dependen de products_backup' as verificacion,
  viewname as nombre_vista,
  definition as definicion
FROM pg_views
WHERE definition LIKE '%products_backup%'
ORDER BY viewname;

-- 3. Verificar si city_stock existe y su estructura
SELECT 
  'Estructura city_stock' as verificacion,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'city_stock'
ORDER BY ordinal_position;


