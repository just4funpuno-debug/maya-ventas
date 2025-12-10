-- =====================================================
-- Corregir políticas RLS en generar_deposito
-- =====================================================
-- Este script asegura que las políticas RLS permitan todas las operaciones
-- =====================================================

-- 1. Eliminar políticas existentes (si hay problemas)
DROP POLICY IF EXISTS "open_select_deposits" ON generar_deposito;
DROP POLICY IF EXISTS "open_modify_deposits" ON generar_deposito;
DROP POLICY IF EXISTS "open_insert_deposits" ON generar_deposito;
DROP POLICY IF EXISTS "open_update_deposits" ON generar_deposito;
DROP POLICY IF EXISTS "open_delete_deposits" ON generar_deposito;

-- 2. Crear políticas completas para todas las operaciones
-- SELECT
CREATE POLICY "open_select_deposits" 
ON generar_deposito 
FOR SELECT 
USING (true);

-- INSERT
CREATE POLICY "open_insert_deposits" 
ON generar_deposito 
FOR INSERT 
WITH CHECK (true);

-- UPDATE
CREATE POLICY "open_update_deposits" 
ON generar_deposito 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- DELETE
CREATE POLICY "open_delete_deposits" 
ON generar_deposito 
FOR DELETE 
USING (true);

-- 3. Verificar que las políticas fueron creadas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ SELECT permitido'
    WHEN cmd = 'INSERT' THEN '✅ INSERT permitido'
    WHEN cmd = 'UPDATE' THEN '✅ UPDATE permitido'
    WHEN cmd = 'DELETE' THEN '✅ DELETE permitido'
    ELSE '✅ ' || cmd || ' permitido'
  END as estado
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito'
ORDER BY cmd;

-- 4. Resumen
SELECT 
  'Políticas RLS en generar_deposito' as resumen,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Todas las operaciones permitidas'
    ELSE '⚠️ Faltan políticas'
  END as estado
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'generar_deposito';


