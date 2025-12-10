-- ================================================================
-- TEST FASE 1: Verificar migración sales → ventas
-- ================================================================
-- Ejecutar después de fase-1-renombrar-sales.sql
-- ================================================================

-- 1. Verificar que las tablas existen
SELECT 
  'Verificación de tablas' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas' AND table_type = 'BASE TABLE')
    THEN '✅ Tabla ventas existe'
    ELSE '❌ Tabla ventas NO existe'
  END as resultado;

SELECT 
  'Verificación de tablas' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_backup' AND table_type = 'BASE TABLE')
    THEN '✅ Tabla sales_backup existe'
    ELSE '❌ Tabla sales_backup NO existe'
  END as resultado;

SELECT 
  'Verificación de vistas' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales')
    THEN '✅ Vista sales existe'
    ELSE '❌ Vista sales NO existe'
  END as resultado;

-- 2. Verificar conteos
SELECT 
  'Conteo de registros' as test,
  (SELECT COUNT(*) FROM sales_backup) as total_backup,
  (SELECT COUNT(*) FROM ventas) as total_ventas,
  (SELECT COUNT(*) FROM sales) as total_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM sales_backup) = (SELECT COUNT(*) FROM ventas)
     AND (SELECT COUNT(*) FROM ventas) = (SELECT COUNT(*) FROM sales)
    THEN '✅ Conteos coinciden'
    ELSE '❌ Conteos NO coinciden'
  END as resultado;

-- 3. Verificar estructura de columnas
SELECT 
  'Estructura de columnas' as test,
  COUNT(*) as columnas_ventas
FROM information_schema.columns 
WHERE table_name = 'ventas' AND table_schema = 'public';

SELECT 
  'Estructura de columnas' as test,
  COUNT(*) as columnas_backup
FROM information_schema.columns 
WHERE table_name = 'sales_backup' AND table_schema = 'public';

-- 4. Verificar foreign keys
SELECT 
  'Foreign Keys' as test,
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
  AND tc.table_name = 'ventas'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Verificar índices
SELECT 
  'Índices' as test,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ventas'
ORDER BY indexname;

-- 6. Verificar RLS
SELECT 
  'RLS' as test,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'ventas';

-- 7. Verificar políticas RLS
SELECT 
  'Políticas RLS' as test,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'ventas';

-- 8. Verificar triggers
SELECT 
  'Triggers' as test,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ventas'
ORDER BY trigger_name;

-- 9. Verificar integridad de datos (muestra de registros)
SELECT 
  'Integridad de datos' as test,
  'Muestra de 5 registros de ventas' as descripcion
UNION ALL
SELECT 
  'ID: ' || id::text || ', Fecha: ' || fecha::text || ', Ciudad: ' || ciudad,
  'Total: ' || COALESCE(total::text, 'NULL')
FROM ventas
LIMIT 5;

-- 10. Verificar que la vista funciona
SELECT 
  'Vista sales' as test,
  COUNT(*) as registros_en_vista
FROM sales;

-- RESUMEN FINAL
SELECT 
  'RESUMEN FINAL FASE 1' as resumen,
  (SELECT COUNT(*) FROM sales_backup) as total_backup,
  (SELECT COUNT(*) FROM ventas) as total_ventas,
  (SELECT COUNT(*) FROM sales) as total_vista,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'ventas') as columnas_ventas,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ventas') as indices_ventas,
  CASE 
    WHEN (SELECT COUNT(*) FROM sales_backup) = (SELECT COUNT(*) FROM ventas)
     AND (SELECT COUNT(*) FROM ventas) = (SELECT COUNT(*) FROM sales)
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas')
     AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales')
    THEN '✅ FASE 1 COMPLETADA CORRECTAMENTE'
    ELSE '❌ ERROR: Revisar resultados anteriores'
  END as estado_final;


