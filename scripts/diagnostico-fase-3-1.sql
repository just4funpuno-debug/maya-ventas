-- ============================================================================
-- DIAGNÓSTICO FASE 3.1: Identificar el problema exacto
-- ============================================================================

DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues_crear integer;
  v_stock_despues_restaurar integer;
  v_stock_despues_descontar integer;
  v_venta_id uuid;
BEGIN
  RAISE NOTICE '=== DIAGNÓSTICO FASE 3.1 ===';
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
  
  RAISE NOTICE '--- PASO 2: Restaurar stock anterior (2 unidades) ---';
  
  -- Restaurar stock anterior
  PERFORM restaurar_stock_ciudad_atomico(
    v_test_ciudad::text,
    v_test_sku::text,
    2::integer
  );
  
  -- Verificar stock después de restaurar
  SELECT cantidad INTO v_stock_despues_restaurar
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de restaurar: % (esperado: %)', 
    v_stock_despues_restaurar, v_stock_despues_crear + 2;
  
  IF v_stock_despues_restaurar != v_stock_despues_crear + 2 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de restaurar. Esperado: %, Obtenido: %', 
      v_stock_despues_crear + 2, v_stock_despues_restaurar;
  END IF;
  
  RAISE NOTICE '--- PASO 3: Descontar stock nuevo (3 unidades) ---';
  
  -- Descontar stock nuevo
  PERFORM descontar_stock_ciudad_atomico(
    v_test_ciudad::text,
    v_test_sku::text,
    3::integer
  );
  
  -- Verificar stock después de descontar
  SELECT cantidad INTO v_stock_despues_descontar
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de descontar: % (esperado: %)', 
    v_stock_despues_descontar, v_stock_despues_restaurar - 3;
  
  IF v_stock_despues_descontar != v_stock_despues_restaurar - 3 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de descontar. Esperado: %, Obtenido: %', 
      v_stock_despues_restaurar - 3, v_stock_despues_descontar;
  END IF;
  
  RAISE NOTICE '--- PASO 4: Editar venta usando función atómica ---';
  
  -- Limpiar primero
  DELETE FROM ventas WHERE id = v_venta_id;
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  -- Recrear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  -- Recrear venta
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
  
  RAISE NOTICE 'Stock después de recrear venta: %', v_stock_despues_crear;
  
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
  
  -- Verificar stock después de editar
  SELECT cantidad INTO v_stock_despues_descontar
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Stock después de editar venta: % (esperado: %)', 
    v_stock_despues_descontar, 7;
  
  IF v_stock_despues_descontar != 7 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de editar venta. Esperado: 7, Obtenido: %', 
      v_stock_despues_descontar;
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
    -- Limpiar en caso de error
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
    RAISE;
END $$;

