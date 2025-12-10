-- ================================================================
-- FASE 1 - SUBFASE 1.2: Obtener ID del Producto Cardio Vascular Plus
-- ================================================================
-- Objetivo: Obtener el UUID del producto con SKU 'CARDIO-P-HC3' (Cardio Plus)
-- ================================================================

-- Intentar obtener desde 'products' primero
DO $$
DECLARE
  v_product_id UUID;
  v_product_name TEXT;
  v_product_sku TEXT;
  v_table_source TEXT;
BEGIN
  -- Intentar desde 'products'
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    SELECT id, nombre, sku INTO v_product_id, v_product_name, v_product_sku
    FROM products
    WHERE sku = 'CARDIO-P-HC3'
    LIMIT 1;
    
    IF v_product_id IS NOT NULL THEN
      v_table_source := 'products';
    END IF;
  END IF;
  
  -- Si no se encontró, intentar desde 'almacen_central'
  IF v_product_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central') THEN
    SELECT id, nombre, sku INTO v_product_id, v_product_name, v_product_sku
    FROM almacen_central
    WHERE sku = 'CARDIO-P-HC3'
    LIMIT 1;
    
    IF v_product_id IS NOT NULL THEN
      v_table_source := 'almacen_central';
    END IF;
  END IF;
  
  -- Mostrar resultado
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PRODUCTO ENCONTRADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ID: %', v_product_id;
    RAISE NOTICE 'Nombre: %', v_product_name;
    RAISE NOTICE 'SKU: %', v_product_sku;
    RAISE NOTICE 'Tabla: %', v_table_source;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Usa este ID para la migración:';
    RAISE NOTICE '   %', v_product_id;
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '========================================';
    RAISE WARNING '❌ PRODUCTO NO ENCONTRADO';
    RAISE WARNING '========================================';
    RAISE WARNING 'El producto con SKU "CARDIO-P-HC3" no existe.';
    RAISE WARNING 'Verifica que:';
    RAISE WARNING '  1. El SKU sea exactamente "CARDIO-P-HC3"';
    RAISE WARNING '  2. El producto exista en "products" o "almacen_central"';
    RAISE WARNING '========================================';
  END IF;
END $$;

-- También retornar el ID como resultado de consulta
-- Consultamos directamente desde almacen_central (tabla que sabemos que existe)
SELECT 
  id AS producto_id,
  nombre AS producto_nombre,
  sku AS producto_sku
FROM almacen_central
WHERE sku = 'CARDIO-P-HC3'
LIMIT 1;

