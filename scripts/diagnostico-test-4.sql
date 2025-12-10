-- ============================================================================
-- DIAGNÓSTICO TEST 4: Identificar el problema exacto
-- ============================================================================

DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues_crear integer;
  v_stock_despues_editar integer;
  v_venta_id uuid;
  v_diferencia integer;
BEGIN
  RAISE NOTICE '=== DIAGNÓSTICO TEST 4 ===';
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
  
  RAISE NOTICE '--- PASO 2: Calcular diferencia ---';
  v_diferencia := 3 - 2; -- cantidad_nueva - cantidad_anterior
  RAISE NOTICE 'Diferencia calculada: % (cantidad nueva: 3, cantidad anterior: 2)', v_diferencia;
  
  RAISE NOTICE '--- PASO 3: Editar venta usando función atómica ---';
  RAISE NOTICE 'Parámetros:';
  RAISE NOTICE '  - venta_id: %', v_venta_id;
  RAISE NOTICE '  - ciudad_anterior: %', v_test_ciudad;
  RAISE NOTICE '  - sku_anterior: %', v_test_sku;
  RAISE NOTICE '  - cantidad_anterior: 2';
  RAISE NOTICE '  - ciudad_nueva: %', v_test_ciudad;
  RAISE NOTICE '  - sku_nueva: %', v_test_sku;
  RAISE NOTICE '  - cantidad_nueva: 3';
  RAISE NOTICE '  - Stock actual antes de editar: %', v_stock_despues_crear;
  
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
  
  RAISE NOTICE '--- PASO 4: Verificar stock después de editar ---';
  
  -- Verificar stock después de editar
  SELECT cantidad INTO v_stock_despues_editar
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de editar: % (esperado: %)', 
    v_stock_despues_editar, 7;
  RAISE NOTICE 'Cálculo esperado: % - % = %', 
    v_stock_despues_crear, v_diferencia, v_stock_despues_crear - v_diferencia;
  
  IF v_stock_despues_editar != 7 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de editar. Esperado: 7, Obtenido: %', 
      v_stock_despues_editar;
  END IF;
  
  -- Verificar que la venta fue actualizada
  IF NOT EXISTS (
    SELECT 1 FROM ventas 
    WHERE id = v_venta_id 
    AND cantidad = 3
  ) THEN
    RAISE EXCEPTION 'ERROR: La venta no fue actualizada correctamente';
  END IF;
  
  RAISE NOTICE '✅ DIAGNÓSTICO COMPLETO: Todo funcionó correctamente';
  
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

