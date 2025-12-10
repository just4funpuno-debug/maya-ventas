-- =====================================================
-- TEST FASE 3: Verificar Foreign Keys
-- =====================================================

-- 1. Verificar foreign key existe y apunta a generar_deposito
SELECT 
  'Foreign key sales.deposit_id → generar_deposito.id' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'sales'
        AND kcu.column_name = 'deposit_id'
        AND ccu.table_name = 'generar_deposito'
    ) THEN '✅ CORRECTO'
    ELSE '❌ NO EXISTE O APUNTA A TABLA INCORRECTA'
  END as resultado;

-- 2. Verificar integridad referencial
SELECT 
  'Ventas con deposit_id inválido' as test,
  COUNT(*) as total_problemas
FROM sales s
WHERE s.deposit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM generar_deposito g WHERE g.id = s.deposit_id
  );

-- 3. Estadísticas de deposit_id
SELECT 
  'Estadísticas deposit_id' as tipo,
  COUNT(*) as total_ventas,
  COUNT(deposit_id) as ventas_con_deposit_id,
  COUNT(*) - COUNT(deposit_id) as ventas_sin_deposit_id
FROM sales;

-- 4. Verificar que no hay referencias a deposits_backup
SELECT 
  'Referencias a deposits_backup' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'deposits_backup'
    ) THEN '⚠️ EXISTEN REFERENCIAS A BACKUP'
    ELSE '✅ NO HAY REFERENCIAS A BACKUP'
  END as resultado;


