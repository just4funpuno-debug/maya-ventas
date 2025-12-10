-- ============================================================================
-- EJECUTAR MIGRACIÓN 012: Excluir Productos Sintéticos
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Copia todo el contenido de este archivo
-- 2. Ve a Supabase Dashboard > SQL Editor
-- 3. Pega el contenido y ejecuta
-- 4. Verifica que no haya errores
--
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN 012: Excluir Productos Sintéticos de Funciones Helper
-- FASE 3: Exclusión de Productos Sintéticos
-- Fecha: 2025-01-30
-- Descripción: Modifica funciones SQL para excluir productos sintéticos
-- ============================================================================

-- ============================================================================
-- 1. ACTUALIZAR: get_product_ids_from_skus
-- ============================================================================
-- Excluir productos sintéticos al convertir SKUs a product_ids
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_ids_from_skus(p_skus TEXT[])
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  -- Intentar con products primero
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    -- Verificar si existe la columna sintetico
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'sintetico'
    ) THEN
      -- Filtrar productos sintéticos
      SELECT ARRAY_AGG(id) INTO result
      FROM products
      WHERE sku = ANY(p_skus)
        AND (sintetico = false OR sintetico IS NULL);
    ELSE
      -- Si no existe la columna, continuar sin filtro
      SELECT ARRAY_AGG(id) INTO result
      FROM products
      WHERE sku = ANY(p_skus);
    END IF;
  -- Fallback a almacen_central
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central') THEN
    -- Verificar si existe la columna sintetico
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'almacen_central' 
      AND column_name = 'sintetico'
    ) THEN
      -- Filtrar productos sintéticos
      SELECT ARRAY_AGG(id) INTO result
      FROM almacen_central
      WHERE sku = ANY(p_skus)
        AND (sintetico = false OR sintetico IS NULL);
    ELSE
      -- Si no existe la columna, continuar sin filtro
      SELECT ARRAY_AGG(id) INTO result
      FROM almacen_central
      WHERE sku = ANY(p_skus);
    END IF;
  ELSE
    result := ARRAY[]::UUID[];
  END IF;
  
  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_ids_from_skus IS 'Convierte array de SKUs a array de product_ids (UUIDs), excluyendo productos sintéticos';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_product_ids_from_skus'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Función get_product_ids_from_skus actualizada correctamente';
  ELSE
    RAISE WARNING '⚠️ Función get_product_ids_from_skus no encontrada';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

