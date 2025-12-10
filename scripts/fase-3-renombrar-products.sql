-- FASE 3: Actualizar base de datos (Foreign Keys, Triggers, etc.)
-- ⚠️ IMPORTANTE: Esta fase es crítica. Asegúrate de tener un backup antes de continuar.
-- ⚠️ Ejecutar SOLO después de confirmar que FASE 1 y FASE 2 funcionan correctamente

-- ================================================================
-- 1. ACTUALIZAR FOREIGN KEYS
-- ================================================================

-- 1.1. Eliminar foreign keys existentes que apuntan a products
DO $$
BEGIN
  -- Eliminar foreign key de sales.sku
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_sku_fkey' 
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_sku_fkey;
    RAISE NOTICE '✅ Foreign key sales_sku_fkey eliminada';
  END IF;

  -- Eliminar foreign key de sales.sku_extra
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_sku_extra_fkey' 
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_sku_extra_fkey;
    RAISE NOTICE '✅ Foreign key sales_sku_extra_fkey eliminada';
  END IF;

  -- Eliminar foreign key de mis_numeros.sku
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'numbers_sku_fkey' 
    AND table_name = 'mis_numeros'
  ) THEN
    ALTER TABLE mis_numeros DROP CONSTRAINT numbers_sku_fkey;
    RAISE NOTICE '✅ Foreign key numbers_sku_fkey eliminada';
  END IF;
END $$;

-- 1.2. Crear nuevas foreign keys apuntando a almacen_central
-- Foreign key de sales.sku
ALTER TABLE sales 
  ADD CONSTRAINT sales_sku_fkey 
  FOREIGN KEY (sku) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign key de sales.sku_extra
ALTER TABLE sales 
  ADD CONSTRAINT sales_sku_extra_fkey 
  FOREIGN KEY (sku_extra) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign key de mis_numeros.sku
ALTER TABLE mis_numeros 
  ADD CONSTRAINT numbers_sku_fkey 
  FOREIGN KEY (sku) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ================================================================
-- 2. VERIFICAR TRIGGERS (ya creados en FASE 1)
-- ================================================================
-- Los triggers ya están creados en FASE 1, solo verificamos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'almacen_central_updated'
  ) THEN
    RAISE NOTICE '✅ Trigger almacen_central_updated existe';
  ELSE
    RAISE WARNING '⚠️ Trigger almacen_central_updated NO existe';
  END IF;
END $$;

-- ================================================================
-- 3. VERIFICAR ÍNDICES (ya creados en FASE 1)
-- ================================================================
-- Los índices ya están creados en FASE 1, solo verificamos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'almacen_central' 
    AND indexname = 'idx_almacen_central_sku'
  ) THEN
    RAISE NOTICE '✅ Índice idx_almacen_central_sku existe';
  ELSE
    RAISE WARNING '⚠️ Índice idx_almacen_central_sku NO existe';
  END IF;
END $$;

-- ================================================================
-- 4. VERIFICAR POLÍTICAS RLS (ya creadas en FASE 1)
-- ================================================================
-- Las políticas RLS ya están creadas en FASE 1, solo verificamos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'almacen_central' 
    AND policyname = 'almacen_central_select_all'
  ) THEN
    RAISE NOTICE '✅ Política RLS almacen_central_select_all existe';
  ELSE
    RAISE WARNING '⚠️ Política RLS almacen_central_select_all NO existe';
  END IF;
END $$;

-- ================================================================
-- 5. VERIFICACIÓN FINAL
-- ================================================================
-- Verificar que las foreign keys apuntan correctamente
SELECT 
  'Verificación Foreign Keys' as verificacion,
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
  AND ccu.table_name = 'almacen_central'
ORDER BY tc.table_name, tc.constraint_name;

-- Resumen final
SELECT 
  'FASE 3 COMPLETADA' as resumen,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND constraint_name LIKE '%_fkey'
   AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) as foreign_keys_actualizadas,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND constraint_name IN ('sales_sku_fkey', 'sales_sku_extra_fkey', 'numbers_sku_fkey')) = 3
    THEN '✅ Todas las foreign keys actualizadas correctamente'
    ELSE '⚠️ Verificar foreign keys'
  END as estado;

