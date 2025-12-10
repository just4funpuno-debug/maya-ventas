-- ============================================================================
-- MIGRACIÓN 010: Agregar Foreign Key entre whatsapp_accounts y products
-- Fecha: 2025-01-30
-- Descripción: Crea la relación entre whatsapp_accounts.product_id y products.id
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

