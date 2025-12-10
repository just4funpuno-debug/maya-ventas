-- ============================================================================
-- EJECUTAR MIGRACIÓN 010: Agregar Foreign Key entre whatsapp_accounts y products
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script completo en el SQL Editor de Supabase
-- 2. Ejecuta el script
-- 3. Verifica que no haya errores
-- ============================================================================

-- Verificar si la foreign key ya existe
DO $$
BEGIN
  -- Verificar si la tabla products existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    -- Verificar si products tiene columna 'id'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'id'
    ) THEN
      -- Verificar si la constraint ya existe
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'whatsapp_accounts'
        AND constraint_name = 'whatsapp_accounts_product_id_fkey'
      ) THEN
        -- Agregar foreign key
        ALTER TABLE whatsapp_accounts 
        ADD CONSTRAINT whatsapp_accounts_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Foreign key whatsapp_accounts_product_id_fkey agregada';
      ELSE
        RAISE NOTICE 'ℹ️ Foreign key whatsapp_accounts_product_id_fkey ya existe';
      END IF;
    ELSE
      RAISE WARNING '⚠️ Tabla products existe pero no tiene columna id';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Tabla products no existe, no se puede agregar foreign key';
  END IF;
END $$;

-- Verificar que la foreign key se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND table_name = 'whatsapp_accounts'
    AND constraint_name = 'whatsapp_accounts_product_id_fkey'
  ) THEN
    RAISE NOTICE '✅ Verificación: Foreign key existe correctamente';
  ELSE
    RAISE WARNING '⚠️ Verificación: Foreign key NO existe';
  END IF;
END $$;

-- Verificar la relación
SELECT 
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
  AND tc.table_name = 'whatsapp_accounts'
  AND kcu.column_name = 'product_id';

