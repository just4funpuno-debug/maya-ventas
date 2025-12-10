-- ============================================================================
-- TEST 4 DEBUG: Mostrar valores exactos en cada paso
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
  v_diferencia integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4 DEBUG - Valores exactos';
  RAISE NOTICE '========================================';
  
  -- Setup
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  RAISE NOTICE 'Stock inicial: %', v_stock_inicial;
  
  -- PASO 1: Crear venta de 2 unidades
  v_venta_id := registrar_venta_pendiente_atomica(
    CURRENT_DATE::date,
    v_test_ciudad::text,
    v_test_sku::text,
    2::integer,
    100.00::numeric
  );
  
  SELECT cantidad INTO v_stock_despues_crear
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  RAISE NOTICE 'Después de crear venta (2 unidades):';
  RAISE NOTICE '  - Stock esperado: %', v_stock_inicial - 2;
  RAISE NOTICE '  - Stock obtenido: %', v_stock_despues_crear;
  RAISE NOTICE '  - Venta ID: %', v_venta_id;
  
  IF v_stock_despues_crear != v_stock_inicial - 2 THEN
    RAISE EXCEPTION 'ERROR: Stock incorrecto después de crear venta';
  END IF;
  
  -- PASO 2: Calcular diferencia
  v_diferencia := 3 - 2; -- cantidad_nueva - cantidad_anterior
  RAISE NOTICE '';
  RAISE NOTICE 'Antes de editar:';
  RAISE NOTICE '  - Cantidad anterior: 2';
  RAISE NOTICE '  - Cantidad nueva: 3';
  RAISE NOTICE '  - Diferencia: %', v_diferencia;
  RAISE NOTICE '  - Stock actual: %', v_stock_despues_crear;
  RAISE NOTICE '  - Stock esperado después: % - % = %', v_stock_despues_crear, v_diferencia, v_stock_despues_crear - v_diferencia;
  
  -- PASO 3: Editar venta
  BEGIN
    PERFORM editar_venta_pendiente_atomica(
      v_venta_id,
      v_test_ciudad::text,
      v_test_sku::text,
      2::integer,
      CURRENT_DATE::date,
      v_test_ciudad::text,
      v_test_sku::text,
      3::integer
    );
    
    RAISE NOTICE '';
    RAISE NOTICE 'Función editar ejecutada sin errores';
    
    -- Verificar stock
    SELECT cantidad INTO v_stock_despues_editar
    FROM city_stock
    WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Después de editar:';
    RAISE NOTICE '  - Stock esperado: 7';
    RAISE NOTICE '  - Stock obtenido: %', v_stock_despues_editar;
    
    IF v_stock_despues_editar != 7 THEN
      RAISE EXCEPTION 'ERROR: Stock incorrecto. Esperado: 7, Obtenido: %', v_stock_despues_editar;
    END IF;
    
    -- Verificar cantidad de venta
    SELECT cantidad INTO v_cantidad_venta
    FROM ventas
    WHERE id = v_venta_id;
    
    RAISE NOTICE '  - Cantidad venta esperada: 3';
    RAISE NOTICE '  - Cantidad venta obtenida: %', COALESCE(v_cantidad_venta::text, 'NULL');
    
    IF v_cantidad_venta != 3 THEN
      RAISE EXCEPTION 'ERROR: Cantidad de venta incorrecta. Esperado: 3, Obtenido: %', COALESCE(v_cantidad_venta::text, 'NULL');
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST PASÓ: Todo correcto';
    RAISE NOTICE '========================================';
    
    -- Limpiar
    DELETE FROM ventas WHERE id = v_venta_id;
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '';
      RAISE NOTICE '❌ ERROR AL EDITAR: %', SQLERRM;
      RAISE NOTICE '========================================';
      DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
      DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
      DELETE FROM almacen_central WHERE sku = v_test_sku;
      RAISE;
  END;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR EN SETUP: %', SQLERRM;
    RAISE NOTICE '========================================';
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
    RAISE;
END $$;

