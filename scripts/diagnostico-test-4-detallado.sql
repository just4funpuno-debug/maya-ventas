-- ============================================================================
-- DIAGNÓSTICO TEST 4 DETALLADO: Ver valores paso a paso
-- ============================================================================

DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues_crear integer;
  v_stock_despues_editar integer;
  v_venta_id uuid;
  v_cantidad_venta integer;
BEGIN
  RAISE NOTICE '=== DIAGNÓSTICO TEST 4 DETALLADO ===';
  RAISE NOTICE 'Ciudad: %', v_test_ciudad;
  RAISE NOTICE 'SKU: %', v_test_sku;
  RAISE NOTICE 'Stock inicial: %', v_stock_inicial;
  
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  RAISE NOTICE '--- PASO 1: Crear venta de 2 unidades ---';
  
  -- Crear una venta pendiente de 2 unidades
  v_venta_id := registrar_venta_pendiente_atomica(
    CURRENT_DATE::date,
    v_test_ciudad::text,
    v_test_sku::text,
    2::integer,
    100.00::numeric
  );
  
  RAISE NOTICE 'Venta creada con ID: %', v_venta_id;
  
  -- Verificar stock después de crear venta
  SELECT cantidad INTO v_stock_despues_crear
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de crear venta: % (esperado: %)', 
    v_stock_despues_crear, v_stock_inicial - 2;
  
  IF v_stock_despues_crear != v_stock_inicial - 2 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de crear venta. Esperado: %, Obtenido: %', 
      v_stock_inicial - 2, v_stock_despues_crear;
  END IF;
  
  RAISE NOTICE '--- PASO 2: Editar venta (cantidad 2 → 3) ---';
  RAISE NOTICE 'Parámetros de edición:';
  RAISE NOTICE '  - venta_id: %', v_venta_id;
  RAISE NOTICE '  - ciudad_anterior: %', v_test_ciudad;
  RAISE NOTICE '  - sku_anterior: %', v_test_sku;
  RAISE NOTICE '  - cantidad_anterior: 2';
  RAISE NOTICE '  - ciudad_nueva: %', v_test_ciudad;
  RAISE NOTICE '  - sku_nueva: %', v_test_sku;
  RAISE NOTICE '  - cantidad_nueva: 3';
  RAISE NOTICE '  - Stock actual antes de editar: %', v_stock_despues_crear;
  RAISE NOTICE '  - Diferencia esperada: 3 - 2 = 1';
  RAISE NOTICE '  - Stock esperado después: % - 1 = %', v_stock_despues_crear, v_stock_despues_crear - 1;
  
  -- Editar la venta usando la función atómica
  PERFORM editar_venta_pendiente_atomica(
    v_venta_id,
    v_test_ciudad::text,
    v_test_sku::text,
    2::integer, -- cantidad anterior
    CURRENT_DATE::date,
    v_test_ciudad::text,
    v_test_sku::text,
    3::integer -- cantidad nueva
  );
  
  RAISE NOTICE 'Edición completada sin errores';
  
  RAISE NOTICE '--- PASO 3: Verificar resultados ---';
  
  -- Verificar stock después de editar
  SELECT cantidad INTO v_stock_despues_editar
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de editar: % (esperado: 7)', v_stock_despues_editar;
  
  IF v_stock_despues_editar != 7 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de editar. Esperado: 7, Obtenido: %', 
      v_stock_despues_editar;
  END IF;
  
  -- Verificar que la venta fue actualizada
  SELECT cantidad INTO v_cantidad_venta
  FROM ventas
  WHERE id = v_venta_id;
  
  RAISE NOTICE 'Cantidad en venta después de editar: % (esperado: 3)', v_cantidad_venta;
  
  IF v_cantidad_venta != 3 THEN
    RAISE EXCEPTION 'ERROR: La venta no fue actualizada correctamente. Esperado: 3, Obtenido: %', 
      v_cantidad_venta;
  END IF;
  
  RAISE NOTICE '✅ DIAGNÓSTICO COMPLETO: Todo funcionó correctamente';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE '  - Stock inicial: %', v_stock_inicial;
  RAISE NOTICE '  - Stock después de crear venta (2 unidades): %', v_stock_despues_crear;
  RAISE NOTICE '  - Stock después de editar (aumentar a 3 unidades): %', v_stock_despues_editar;
  RAISE NOTICE '  - Venta cantidad: %', v_cantidad_venta;
  
  -- Limpiar
  DELETE FROM ventas WHERE id = v_venta_id;
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR EN DIAGNÓSTICO: %', SQLERRM;
    RAISE NOTICE 'Stack trace: %', SQLSTATE;
    -- Limpiar en caso de error
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
    RAISE;
END $$;

