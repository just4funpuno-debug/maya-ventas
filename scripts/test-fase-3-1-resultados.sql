-- ============================================================================
-- TEST FASE 3.1: VERIFICAR RESULTADOS DE FORMA VISIBLE
-- ============================================================================
-- Este test muestra los resultados en formato tabla para verificar fácilmente
-- ============================================================================

-- Crear tabla temporal para resultados
CREATE TEMP TABLE IF NOT EXISTS test_results_fase_3_1 (
  test_num integer,
  test_name text,
  resultado text,
  detalles text
);

-- Limpiar resultados anteriores
TRUNCATE TABLE test_results_fase_3_1;

-- TEST 1: Verificar que la función existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'editar_venta_pendiente_atomica') THEN
    INSERT INTO test_results_fase_3_1 VALUES (1, 'Función existe', '✅ PASÓ', 'La función editar_venta_pendiente_atomica existe');
  ELSE
    INSERT INTO test_results_fase_3_1 VALUES (1, 'Función existe', '❌ FALLÓ', 'La función NO existe');
  END IF;
END $$;

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
    INSERT INTO test_results_fase_3_1 VALUES (2, 'Rechaza venta no encontrada', '❌ FALLÓ', 'No rechazó venta no encontrada');
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%no encontrada%' OR SQLERRM LIKE '%no es pendiente%' THEN
        INSERT INTO test_results_fase_3_1 VALUES (2, 'Rechaza venta no encontrada', '✅ PASÓ', 'Rechazó correctamente: ' || SQLERRM);
      ELSE
        INSERT INTO test_results_fase_3_1 VALUES (2, 'Rechaza venta no encontrada', '⚠️ PARCIAL', 'Error: ' || SQLERRM);
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
    INSERT INTO test_results_fase_3_1 VALUES (3, 'Rechaza stock insuficiente', '❌ FALLÓ', 'No rechazó stock insuficiente');
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Stock insuficiente%' THEN
        INSERT INTO test_results_fase_3_1 VALUES (3, 'Rechaza stock insuficiente', '✅ PASÓ', 'Rechazó correctamente');
      ELSE
        INSERT INTO test_results_fase_3_1 VALUES (3, 'Rechaza stock insuficiente', '❌ FALLÓ', 'Error inesperado: ' || SQLERRM);
      END IF;
  END;
  
  -- Limpiar
  DELETE FROM ventas WHERE id = v_venta_id;
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_3_1 VALUES (3, 'Rechaza stock insuficiente', '❌ FALLÓ', 'Error en setup: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
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
    INSERT INTO test_results_fase_3_1 VALUES (4, 'Transacción atómica', '❌ FALLÓ', 
      'Stock incorrecto después de crear venta. Esperado: ' || (v_stock_inicial - 2) || ', Obtenido: ' || v_stock_despues);
    -- Limpiar
    DELETE FROM ventas WHERE id = v_venta_id;
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
  ELSE
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
      INSERT INTO test_results_fase_3_1 VALUES (4, 'Transacción atómica', '❌ FALLÓ', 
        'Stock incorrecto después de editar. Esperado: 7, Obtenido: ' || v_stock_despues);
    ELSE
      -- Verificar que la venta fue actualizada
      IF NOT EXISTS (
        SELECT 1 FROM ventas 
        WHERE id = v_venta_id 
        AND cantidad = 3
      ) THEN
        INSERT INTO test_results_fase_3_1 VALUES (4, 'Transacción atómica', '❌ FALLÓ', 
          'La venta no fue actualizada correctamente');
      ELSE
        INSERT INTO test_results_fase_3_1 VALUES (4, 'Transacción atómica', '✅ PASÓ', 
          'Edición atómica funcionó correctamente (stock: 10 → 8 → 7, venta: cantidad 2 → 3)');
      END IF;
    END IF;
    
    -- Limpiar
    DELETE FROM ventas WHERE id = v_venta_id;
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_3_1 VALUES (4, 'Transacción atómica', '❌ FALLÓ', 'Error: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- Mostrar resultados completos (IMPORTANTE: Ver esta tabla para identificar qué test falló)
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
ORDER BY test_num;

-- Mostrar solo los tests que fallaron (si hay alguno)
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
WHERE resultado LIKE '❌%'
ORDER BY test_num;

-- Resumen final
SELECT 
  COUNT(*) FILTER (WHERE resultado = '✅ PASÓ') as tests_pasados,
  COUNT(*) FILTER (WHERE resultado LIKE '❌%') as tests_fallidos,
  COUNT(*) FILTER (WHERE resultado LIKE '⚠️%') as tests_parciales,
  COUNT(*) as total_tests,
  CASE 
    WHEN COUNT(*) FILTER (WHERE resultado LIKE '❌%') = 0 THEN '✅ TODOS LOS TESTS PASARON'
    ELSE '❌ HAY TESTS FALLIDOS - REVISAR ANTES DE CONTINUAR'
  END as estado_final
FROM test_results_fase_3_1;

