-- ============================================================================
-- TEST FASE 3.1: VERIFICAR FUNCIÓN SQL TRANSACCIONAL DE EDICIÓN
-- ============================================================================

-- TEST 1: Verificar que la función existe
SELECT 
  'TEST 1: Función existe' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'editar_venta_pendiente_atomica')
    THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado;

-- TEST 2: Verificar que rechaza venta no encontrada
DO $$
DECLARE
  v_test_uuid uuid := gen_random_uuid();
BEGIN
  BEGIN
    PERFORM editar_venta_pendiente_atomica(
      v_test_uuid, -- ID que no existe
      'el_alto'::text,
      'CARDIO'::text,
      1::integer,
      CURRENT_DATE::date,
      'el_alto'::text,
      'CARDIO'::text,
      2::integer
    );
    RAISE EXCEPTION 'TEST 2 FALLÓ: Debería rechazar venta no encontrada';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%no encontrada%' OR SQLERRM LIKE '%no es pendiente%' THEN
        RAISE NOTICE '✅ TEST 2 PASÓ: Rechazó correctamente venta no encontrada';
      ELSE
        RAISE EXCEPTION 'TEST 2 FALLÓ: Error inesperado: %', SQLERRM;
      END IF;
  END;
END $$;

-- TEST 3: Verificar que rechaza stock insuficiente
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_venta_id uuid;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock con cantidad 0
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, 0)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = 0;
  
  -- Crear una venta pendiente
  v_venta_id := registrar_venta_pendiente_atomica(
    CURRENT_DATE::date,
    v_test_ciudad::text,
    v_test_sku::text,
    1::integer,
    100.00::numeric
  );
  
  -- Intentar editar la venta para aumentar cantidad a 5 (pero solo hay 0 en stock)
  BEGIN
    PERFORM editar_venta_pendiente_atomica(
      v_venta_id,
      v_test_ciudad::text,
      v_test_sku::text,
      1::integer,
      CURRENT_DATE::date,
      v_test_ciudad::text,
      v_test_sku::text,
      5::integer -- Intentar aumentar a 5 cuando solo hay 0
    );
    RAISE EXCEPTION 'TEST 3 FALLÓ: Debería rechazar stock insuficiente';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Stock insuficiente%' THEN
        RAISE NOTICE '✅ TEST 3 PASÓ: Rechazó correctamente stock insuficiente';
      ELSE
        RAISE EXCEPTION 'TEST 3 FALLÓ: Error inesperado: %', SQLERRM;
      END IF;
  END;
  
  -- Limpiar
  DELETE FROM ventas WHERE id = v_venta_id;
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 4: Verificar transacción atómica (edición exitosa)
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues integer;
  v_venta_id uuid;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  -- Crear una venta pendiente de 2 unidades
  v_venta_id := registrar_venta_pendiente_atomica(
    CURRENT_DATE::date,
    v_test_ciudad::text,
    v_test_sku::text,
    2::integer,
    100.00::numeric
  );
  
  -- Verificar stock después de crear venta (debería ser 8)
  SELECT cantidad INTO v_stock_despues
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_despues != v_stock_inicial - 2 THEN
    RAISE EXCEPTION 'TEST 4 FALLÓ: Stock incorrecto después de crear venta. Esperado: %, Obtenido: %', 
      v_stock_inicial - 2, v_stock_despues;
  END IF;
  
  -- Editar la venta para aumentar cantidad a 3 unidades
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
  
  -- Verificar stock después de editar (debería ser 7: 10 - 2 + 2 - 3 = 7)
  SELECT cantidad INTO v_stock_despues
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_despues != 7 THEN
    RAISE EXCEPTION 'TEST 4 FALLÓ: Stock incorrecto después de editar. Esperado: 7, Obtenido: %', 
      v_stock_despues;
  END IF;
  
  -- Verificar que la venta fue actualizada
  IF NOT EXISTS (
    SELECT 1 FROM ventas 
    WHERE id = v_venta_id 
    AND cantidad = 3
  ) THEN
    RAISE EXCEPTION 'TEST 4 FALLÓ: La venta no fue actualizada correctamente';
  END IF;
  
  RAISE NOTICE '✅ TEST 4 PASÓ: Edición atómica funcionó correctamente (stock: 10 → 8 → 7)';
  
  -- Limpiar
  DELETE FROM ventas WHERE id = v_venta_id;
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- RESUMEN DE TESTS
SELECT 
  'FASE 3.1 - RESUMEN DE TESTS' as resumen,
  'Ejecuta los tests anteriores y verifica que todos pasen' as instrucciones,
  'Si algún test falla, revisa la función antes de continuar' as advertencia;

