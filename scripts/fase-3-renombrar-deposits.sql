-- =====================================================
-- FASE 3: Verificar y Actualizar Foreign Keys
-- =====================================================
-- Objetivo: Verificar si sales.deposit_id tiene foreign key y actualizarla si es necesario
-- =====================================================

-- PASO 1: Verificar si existe foreign key de sales.deposit_id a deposits
SELECT 
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
  AND tc.table_schema = 'public'
  AND tc.table_name = 'sales'
  AND kcu.column_name = 'deposit_id';

-- PASO 2: Verificar si la columna deposit_id existe en sales
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name = 'deposit_id';

-- PASO 3: Si existe foreign key, eliminarla y recrearla apuntando a generar_deposito
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Buscar el nombre de la constraint
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'sales'
    AND kcu.column_name = 'deposit_id'
  LIMIT 1;
  
  -- Si existe, eliminarla
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE sales DROP CONSTRAINT IF EXISTS %I', fk_name);
    RAISE NOTICE 'Foreign key % eliminada', fk_name;
    
    -- Crear nueva foreign key apuntando a generar_deposito
    ALTER TABLE sales
    ADD CONSTRAINT sales_deposit_id_fkey
    FOREIGN KEY (deposit_id)
    REFERENCES generar_deposito(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key recreada apuntando a generar_deposito';
  ELSE
    RAISE NOTICE 'No existe foreign key en sales.deposit_id. Creando nueva...';
    
    -- Crear foreign key si no existe
    ALTER TABLE sales
    ADD CONSTRAINT sales_deposit_id_fkey
    FOREIGN KEY (deposit_id)
    REFERENCES generar_deposito(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key creada apuntando a generar_deposito';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key ya existe, omitiendo creación';
  WHEN OTHERS THEN
    RAISE WARNING 'Error al manejar foreign key: %', SQLERRM;
END $$;

-- PASO 4: Verificar integridad referencial
SELECT 
  'Ventas con deposit_id que NO existe en generar_deposito' as tipo,
  COUNT(*) as total
FROM sales s
WHERE s.deposit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM generar_deposito g WHERE g.id = s.deposit_id
  );

-- PASO 5: Verificar que la foreign key fue creada correctamente
SELECT 
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
  AND tc.table_schema = 'public'
  AND tc.table_name = 'sales'
  AND kcu.column_name = 'deposit_id'
  AND ccu.table_name = 'generar_deposito';

-- PASO 6: Resumen final
SELECT 
  'RESUMEN FASE 3' as resumen,
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
    ) THEN '✅ Foreign key actualizada correctamente'
    ELSE '⚠️ Verificar foreign key manualmente'
  END as estado_fk,
  (SELECT COUNT(*) FROM sales WHERE deposit_id IS NOT NULL) as ventas_con_deposit_id,
  (SELECT COUNT(*) FROM sales s 
   WHERE s.deposit_id IS NOT NULL 
   AND EXISTS (SELECT 1 FROM generar_deposito g WHERE g.id = s.deposit_id)
  ) as ventas_con_deposit_id_valido;


