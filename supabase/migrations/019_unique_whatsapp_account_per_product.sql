-- ================================================================
-- MIGRACIÓN 019: Índice Único para WhatsApp Account por Producto
-- FASE 1: SUBFASE 1.1 - Validaciones de Independencia
-- ================================================================
-- Objetivo: Asegurar que cada producto solo tenga UN WhatsApp Account
-- ================================================================

-- PASO 1: Limpiar duplicados si existen (mantener solo el más reciente)
DO $$
DECLARE
  v_duplicate_count INT;
  v_cleaned_count INT := 0;
BEGIN
  -- Verificar si hay productos con múltiples cuentas
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT product_id, COUNT(*) as cuenta
    FROM whatsapp_accounts
    WHERE product_id IS NOT NULL
    GROUP BY product_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE WARNING '⚠️ Se encontraron % productos con múltiples WhatsApp Accounts. Limpiando...', v_duplicate_count;
    
    -- Para cada producto con múltiples cuentas, mantener solo la más reciente
    -- y marcar las otras como sin producto (product_id = NULL)
    WITH ranked_accounts AS (
      SELECT 
        id,
        product_id,
        ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at DESC) as rn
      FROM whatsapp_accounts
      WHERE product_id IS NOT NULL
    )
    UPDATE whatsapp_accounts wa
    SET product_id = NULL,
        updated_at = NOW()
    FROM ranked_accounts ra
    WHERE wa.id = ra.id
      AND ra.rn > 1; -- Mantener solo el primero (más reciente)
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    RAISE NOTICE '✅ Se limpiaron % cuentas duplicadas (ahora sin product_id)', v_cleaned_count;
  ELSE
    RAISE NOTICE 'ℹ️ No hay duplicados. Todos los productos tienen máximo 1 cuenta.';
  END IF;
END $$;

-- PASO 2: Verificar si ya existe un índice único
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_accounts'
      AND indexname = 'idx_accounts_product_unique'
  ) THEN
    RAISE NOTICE 'ℹ️ El índice único idx_accounts_product_unique ya existe';
  ELSE
    RAISE NOTICE '📝 Creando índice único...';
  END IF;
END $$;

-- PASO 3: Crear índice único (solo donde product_id no es NULL)
-- NOTA: No podemos usar UNIQUE constraint porque product_id puede ser NULL
-- Pero podemos usar un índice único parcial que excluya NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_product_unique 
ON whatsapp_accounts(product_id) 
WHERE product_id IS NOT NULL;

-- PASO 4: Verificar que el índice se creó correctamente
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_accounts'
      AND indexname = 'idx_accounts_product_unique'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✅ Índice único idx_accounts_product_unique creado correctamente';
  ELSE
    RAISE WARNING '⚠️ Error: El índice único NO se pudo crear';
  END IF;
END $$;

-- ================================================================
-- VERIFICACIÓN FINAL
-- ================================================================

-- Verificar que no hay duplicados después de la migración
DO $$
DECLARE
  v_remaining_duplicates INT;
BEGIN
  SELECT COUNT(*) INTO v_remaining_duplicates
  FROM (
    SELECT product_id
    FROM whatsapp_accounts
    WHERE product_id IS NOT NULL
    GROUP BY product_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_remaining_duplicates > 0 THEN
    RAISE WARNING '⚠️ ADVERTENCIA: Aún quedan % productos con múltiples cuentas', v_remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ Verificación: Todos los productos tienen máximo 1 cuenta';
  END IF;
END $$;

-- ================================================================
-- FIN DE MIGRACIÓN
-- ================================================================

