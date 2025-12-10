-- =====================================================
-- Verificar políticas RLS en generar_deposito
-- =====================================================

-- 1. Verificar que RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito';

-- 2. Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
ORDER BY policyname;

-- 3. Verificar si hay políticas que bloqueen INSERT/DELETE
SELECT 
  'Políticas que permiten SELECT' as tipo,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
AND cmd = 'SELECT'
UNION ALL
SELECT 
  'Políticas que permiten INSERT' as tipo,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
AND cmd = 'INSERT'
UNION ALL
SELECT 
  'Políticas que permiten UPDATE' as tipo,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
AND cmd = 'UPDATE'
UNION ALL
SELECT 
  'Políticas que permiten DELETE' as tipo,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
AND cmd = 'DELETE'
UNION ALL
SELECT 
  'Políticas ALL (todas las operaciones)' as tipo,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
AND cmd = 'ALL';

