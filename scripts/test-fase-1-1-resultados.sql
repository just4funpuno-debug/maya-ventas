-- ============================================================================
-- TEST FASE 1.1: VERIFICAR RESULTADOS DE FORMA VISIBLE
-- ============================================================================
-- Este test muestra los resultados en formato tabla para verificar fácilmente
-- ============================================================================

-- Crear tabla temporal para resultados
CREATE TEMP TABLE IF NOT EXISTS test_results (
  test_num integer,
  test_name text,
  resultado text,
  detalles text
);

-- Limpiar resultados anteriores
TRUNCATE TABLE test_results;

-- TEST 1: Verificar que la función existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'registrar_venta_pendiente_atomica') THEN
    INSERT INTO test_results VALUES (1, 'Función existe', '✅ PASÓ', 'La función registrar_venta_pendiente_atomica existe');
  ELSE
    INSERT INTO test_results VALUES (1, 'Función existe', '❌ FALLÓ', 'La función NO existe');
  END IF;
END $$;

-- TEST 2: Verificar normalización
DO $$
BEGIN
  IF normalize_city('EL ALTO') = 'el_alto' THEN
    INSERT INTO test_results VALUES (2, 'Normalización ciudades', '✅ PASÓ', 'EL ALTO → el_alto');
  ELSE
    INSERT INTO test_results VALUES (2, 'Normalización ciudades', '❌ FALLÓ', 'Normalización incorrecta');
  END IF;
END $$;

-- TEST 3: Verificar rechazo de parámetros inválidos
DO $$
BEGIN
  BEGIN
    PERFORM registrar_venta_pendiente_atomica(
      CURRENT_DATE::date,
      NULL::text,
      'CARDIO'::text,
      1::integer,
      100.00::numeric
    );
    INSERT INTO test_results VALUES (3, 'Rechaza parámetros inválidos', '❌ FALLÓ', 'No rechazó ciudad NULL');
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Parámetros requeridos%' OR SQLERRM LIKE '%faltantes%' THEN
        INSERT INTO test_results VALUES (3, 'Rechaza parámetros inválidos', '✅ PASÓ', 'Rechazó correctamente: ' || SQLERRM);
      ELSE
        INSERT INTO test_results VALUES (3, 'Rechaza parámetros inválidos', '⚠️ PARCIAL', 'Error: ' || SQLERRM);
      END IF;
  END;
END $$;

-- TEST 4: Verificar rechazo de stock insuficiente
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
BEGIN
  -- Crear producto y stock
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, 0)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = 0;
  
  BEGIN
    PERFORM registrar_venta_pendiente_atomica(
      CURRENT_DATE::date,
      v_test_ciudad::text,
      v_test_sku::text,
      5::integer,
      100.00::numeric
    );
    INSERT INTO test_results VALUES (4, 'Rechaza stock insuficiente', '❌ FALLÓ', 'No rechazó stock insuficiente');
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Stock insuficiente%' THEN
        INSERT INTO test_results VALUES (4, 'Rechaza stock insuficiente', '✅ PASÓ', 'Rechazó correctamente');
      ELSE
        INSERT INTO test_results VALUES (4, 'Rechaza stock insuficiente', '❌ FALLÓ', 'Error inesperado: ' || SQLERRM);
      END IF;
  END;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 5: Verificar transacción atómica (registro exitoso)
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 10;
  v_stock_despues integer;
  v_venta_id uuid;
BEGIN
  -- Crear producto y stock
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  BEGIN
    v_venta_id := registrar_venta_pendiente_atomica(
      CURRENT_DATE::date,
      v_test_ciudad::text,
      v_test_sku::text,
      2::integer,
      100.00::numeric
    );
    
    -- Verificar stock
    SELECT cantidad INTO v_stock_despues
    FROM city_stock
    WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    
    IF v_stock_despues = v_stock_inicial - 2 AND EXISTS (SELECT 1 FROM ventas WHERE id = v_venta_id) THEN
      INSERT INTO test_results VALUES (5, 'Transacción atómica', '✅ PASÓ', 
        'Stock: ' || v_stock_inicial || ' → ' || v_stock_despues || ', Venta registrada: ' || v_venta_id);
    ELSE
      INSERT INTO test_results VALUES (5, 'Transacción atómica', '❌ FALLÓ', 
        'Stock esperado: ' || (v_stock_inicial - 2) || ', obtenido: ' || v_stock_despues);
    END IF;
    
    -- Limpiar
    DELETE FROM ventas WHERE id = v_venta_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO test_results VALUES (5, 'Transacción atómica', '❌ FALLÓ', 'Error: ' || SQLERRM);
  END;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- Mostrar resultados
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results
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
FROM test_results;

