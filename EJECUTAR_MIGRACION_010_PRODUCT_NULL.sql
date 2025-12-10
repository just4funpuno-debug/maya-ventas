-- ============================================================================
-- EJECUTAR MIGRACIÓN 010: Modificar product_id en whatsapp_accounts
-- FASE 1: SUBFASE 1.1
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Copia y pega este script completo en el SQL Editor de Supabase
-- 2. Ejecuta el script
-- 3. Verifica que no haya errores
-- ============================================================================

-- Verificar y asegurar que product_id puede ser NULL
DO $$
BEGIN
  -- Verificar si product_id tiene constraint NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_accounts' 
      AND column_name = 'product_id'
      AND is_nullable = 'NO'
  ) THEN
    -- Remover constraint NOT NULL si existe
    ALTER TABLE whatsapp_accounts 
      ALTER COLUMN product_id DROP NOT NULL;
    
    RAISE NOTICE '✅ Constraint NOT NULL removido de product_id';
  ELSE
    RAISE NOTICE 'ℹ️ product_id ya permite NULL';
  END IF;
END $$;

-- Índice para búsquedas por producto (solo donde product_id no es NULL)
CREATE INDEX IF NOT EXISTS idx_accounts_product 
  ON whatsapp_accounts(product_id) 
  WHERE product_id IS NOT NULL;

-- Índice para cuentas sin producto (para filtrado rápido)
CREATE INDEX IF NOT EXISTS idx_accounts_no_product 
  ON whatsapp_accounts(active) 
  WHERE product_id IS NULL;

-- Índice compuesto para búsquedas comunes (product_id + active)
CREATE INDEX IF NOT EXISTS idx_accounts_product_active 
  ON whatsapp_accounts(product_id, active) 
  WHERE product_id IS NOT NULL AND active = true;

-- Verificar índices creados
DO $$
DECLARE
  index_count INT;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'whatsapp_accounts'
    AND indexname LIKE 'idx_accounts%product%';
  
  IF index_count >= 3 THEN
    RAISE NOTICE '✅ Índices creados correctamente (%)', index_count;
  ELSE
    RAISE WARNING '⚠️ Solo se crearon % índices (esperado: 3)', index_count;
  END IF;
END $$;

-- Verificar que product_id permite NULL
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_accounts'
  AND column_name = 'product_id';

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'whatsapp_accounts'
  AND indexname LIKE 'idx_accounts%product%'
ORDER BY indexname;

