-- ============================================================================
-- TEST FASE 2.1: VERIFICAR RESULTADOS DE FORMA VISIBLE
-- ============================================================================
-- Este test muestra los resultados en formato tabla para verificar fácilmente
-- ============================================================================

-- Crear tabla temporal para resultados
CREATE TEMP TABLE IF NOT EXISTS test_results_fase_2_1 (
  test_num integer,
  test_name text,
  resultado text,
  detalles text
);

-- Limpiar resultados anteriores
TRUNCATE TABLE test_results_fase_2_1;

-- TEST 1: Verificar que las funciones existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'descontar_stock_ciudad_atomico')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restaurar_stock_ciudad_atomico') THEN
    INSERT INTO test_results_fase_2_1 VALUES (1, 'Funciones existen', '✅ PASÓ', 'Ambas funciones fueron creadas');
  ELSE
    INSERT INTO test_results_fase_2_1 VALUES (1, 'Funciones existen', '❌ FALLÓ', 'Una o ambas funciones no existen');
  END IF;
END $$;

-- TEST 2: Verificar que descontar_stock_ciudad_atomico funciona correctamente
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues integer;
  v_resultado integer;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  -- Descontar 3 unidades
  v_resultado := descontar_stock_ciudad_atomico(v_test_ciudad, v_test_sku, 3);
  
  -- Verificar stock
  SELECT cantidad INTO v_stock_despues
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_despues = v_stock_inicial - 3 AND v_resultado = v_stock_despues THEN
    INSERT INTO test_results_fase_2_1 VALUES (2, 'Descontar funciona', '✅ PASÓ', 
      'Stock: ' || v_stock_inicial || ' → ' || v_stock_despues || ', resultado: ' || v_resultado);
  ELSE
    INSERT INTO test_results_fase_2_1 VALUES (2, 'Descontar funciona', '❌ FALLÓ', 
      'Esperado: ' || (v_stock_inicial - 3) || ', obtenido: ' || v_stock_despues || ', resultado: ' || v_resultado);
  END IF;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_2_1 VALUES (2, 'Descontar funciona', '❌ FALLÓ', 'Error: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 3: Verificar que restaurar_stock_ciudad_atomico funciona correctamente
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 5;
  v_stock_despues integer;
  v_resultado integer;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  -- Restaurar 4 unidades
  v_resultado := restaurar_stock_ciudad_atomico(v_test_ciudad, v_test_sku, 4);
  
  -- Verificar stock
  SELECT cantidad INTO v_stock_despues
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_despues = v_stock_inicial + 4 AND v_resultado = v_stock_despues THEN
    INSERT INTO test_results_fase_2_1 VALUES (3, 'Restaurar funciona', '✅ PASÓ', 
      'Stock: ' || v_stock_inicial || ' → ' || v_stock_despues || ', resultado: ' || v_resultado);
  ELSE
    INSERT INTO test_results_fase_2_1 VALUES (3, 'Restaurar funciona', '❌ FALLÓ', 
      'Esperado: ' || (v_stock_inicial + 4) || ', obtenido: ' || v_stock_despues || ', resultado: ' || v_resultado);
  END IF;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_2_1 VALUES (3, 'Restaurar funciona', '❌ FALLÓ', 'Error: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 4: Verificar que restaurar_stock_ciudad_atomico crea registro si no existe
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_despues integer;
  v_resultado integer;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- NO crear stock inicial (debe crearse automáticamente)
  
  -- Restaurar 7 unidades (debe crear el registro con cantidad 7)
  v_resultado := restaurar_stock_ciudad_atomico(v_test_ciudad, v_test_sku, 7);
  
  -- Verificar stock
  SELECT cantidad INTO v_stock_despues
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_despues = 7 AND v_resultado = 7 THEN
    INSERT INTO test_results_fase_2_1 VALUES (4, 'Crear registro si no existe', '✅ PASÓ', 
      'Stock creado: ' || v_stock_despues || ', resultado: ' || v_resultado);
  ELSE
    INSERT INTO test_results_fase_2_1 VALUES (4, 'Crear registro si no existe', '❌ FALLÓ', 
      'Esperado: 7, obtenido: ' || v_stock_despues || ', resultado: ' || v_resultado);
  END IF;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_2_1 VALUES (4, 'Crear registro si no existe', '❌ FALLÓ', 'Error: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 5: Verificar que descontar_stock_ciudad_atomico no permite stock negativo
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 2;
  v_stock_final integer;
BEGIN
  -- Crear producto en almacen_central primero (requerido por foreign key)
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  -- Crear stock inicial
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  -- Intentar descontar más de lo disponible (debe resultar en 0, no negativo)
  PERFORM descontar_stock_ciudad_atomico(v_test_ciudad, v_test_sku, 5);
  
  -- Verificar que el stock es 0 (no negativo)
  SELECT cantidad INTO v_stock_final
  FROM city_stock
  WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  
  IF v_stock_final = 0 THEN
    INSERT INTO test_results_fase_2_1 VALUES (5, 'No permite stock negativo', '✅ PASÓ', 
      'Stock final: ' || v_stock_final || ' (correcto, no negativo)');
  ELSE
    INSERT INTO test_results_fase_2_1 VALUES (5, 'No permite stock negativo', '❌ FALLÓ', 
      'Stock debería ser 0, obtenido: ' || v_stock_final);
  END IF;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results_fase_2_1 VALUES (5, 'No permite stock negativo', '❌ FALLÓ', 'Error: ' || SQLERRM);
    -- Limpiar en caso de error
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- Mostrar resultados
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_2_1
ORDER BY test_num;

-- Resumen final
SELECT 
  COUNT(*) FILTER (WHERE resultado = '✅ PASÓ') as tests_pasados,
  COUNT(*) FILTER (WHERE resultado LIKE '❌%') as tests_fallidos,
  COUNT(*) as total_tests,
  CASE 
    WHEN COUNT(*) FILTER (WHERE resultado LIKE '❌%') = 0 THEN '✅ TODOS LOS TESTS PASARON'
    ELSE '❌ HAY TESTS FALLIDOS - REVISAR ANTES DE CONTINUAR'
  END as estado_final
FROM test_results_fase_2_1;

