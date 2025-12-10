-- =====================================================
-- TEST FASE 1: Verificar migración deposits → generar_deposito
-- =====================================================
-- Ejecutar después de fase-1-renombrar-deposits.sql
-- =====================================================

-- 1. Verificar que deposits_backup existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits_backup'
      AND table_type = 'BASE TABLE'
    ) THEN '✅ deposits_backup existe'
    ELSE '❌ deposits_backup NO existe'
  END as estado_backup;

-- 2. Verificar que generar_deposito existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'generar_deposito'
      AND table_type = 'BASE TABLE'
    ) THEN '✅ generar_deposito existe'
    ELSE '❌ generar_deposito NO existe'
  END as estado_nuevo;

-- 3. Verificar que deposits es una vista
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits'
    ) THEN '✅ deposits es una vista'
    ELSE '❌ deposits NO es una vista'
  END as estado_vista;

-- 4. Comparar conteos
SELECT 
  'deposits_backup' as origen,
  COUNT(*) as total
FROM deposits_backup
UNION ALL
SELECT 
  'generar_deposito' as origen,
  COUNT(*) as total
FROM generar_deposito
UNION ALL
SELECT 
  'deposits (vista)' as origen,
  COUNT(*) as total
FROM deposits;

-- 5. Verificar integridad de datos (comparar registros)
SELECT 
  'Registros únicos en backup' as tipo,
  COUNT(DISTINCT id) as total
FROM deposits_backup
UNION ALL
SELECT 
  'Registros únicos en nuevo' as tipo,
  COUNT(DISTINCT id) as total
FROM generar_deposito
UNION ALL
SELECT 
  'IDs que están en backup pero NO en nuevo' as tipo,
  COUNT(*) as total
FROM deposits_backup b
WHERE NOT EXISTS (
  SELECT 1 FROM generar_deposito g WHERE g.id = b.id
)
UNION ALL
SELECT 
  'IDs que están en nuevo pero NO en backup' as tipo,
  COUNT(*) as total
FROM generar_deposito g
WHERE NOT EXISTS (
  SELECT 1 FROM deposits_backup b WHERE b.id = g.id
);

-- 6. Verificar RLS en generar_deposito
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito';

-- 7. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito';

-- 8. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
ORDER BY indexname;

-- 9. Verificar trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'generar_deposito';

-- 10. Verificar Realtime
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'generar_deposito'
    ) THEN '✅ Realtime habilitado para generar_deposito'
    ELSE '❌ Realtime NO habilitado para generar_deposito'
  END as estado_realtime;

-- 11. Test de lectura desde vista deposits
SELECT 
  'Test lectura vista' as test,
  COUNT(*) as registros_leidos
FROM deposits
WHERE estado = 'pendiente';

-- 12. Resumen final
SELECT 
  'RESUMEN FASE 1' as resumen,
  (SELECT COUNT(*) FROM deposits_backup) as total_backup,
  (SELECT COUNT(*) FROM generar_deposito) as total_nuevo,
  (SELECT COUNT(*) FROM deposits) as total_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM deposits_backup) = (SELECT COUNT(*) FROM generar_deposito)
      AND (SELECT COUNT(*) FROM generar_deposito) = (SELECT COUNT(*) FROM deposits)
    THEN '✅ TODO CORRECTO'
    ELSE '⚠️ VERIFICAR DISCREPANCIAS'
  END as estado_final;


