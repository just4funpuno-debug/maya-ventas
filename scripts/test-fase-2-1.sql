-- ============================================================================
-- TEST FASE 2.1: VERIFICAR FUNCIONES SQL ATÓMICAS DE STOCK
-- ============================================================================

-- TEST 1: Verificar que las funciones existen
SELECT 
  'TEST 1: Funciones existen' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'descontar_stock_ciudad_atomico')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restaurar_stock_ciudad_atomico')
    THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado;

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
    RAISE NOTICE '✅ TEST 2 PASÓ: Stock descontado correctamente (de % a %, resultado: %)', 
      v_stock_inicial, v_stock_despues, v_resultado;
  ELSE
    RAISE EXCEPTION 'TEST 2 FALLÓ: Stock esperado %, obtenido %, resultado %', 
      v_stock_inicial - 3, v_stock_despues, v_resultado;
  END IF;
  
  -- Limpiar
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
    RAISE NOTICE '✅ TEST 3 PASÓ: Stock restaurado correctamente (de % a %, resultado: %)', 
      v_stock_inicial, v_stock_despues, v_resultado;
  ELSE
    RAISE EXCEPTION 'TEST 3 FALLÓ: Stock esperado %, obtenido %, resultado %', 
      v_stock_inicial + 4, v_stock_despues, v_resultado;
  END IF;
  
  -- Limpiar
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
    RAISE NOTICE '✅ TEST 4 PASÓ: Stock creado correctamente (cantidad: %, resultado: %)', 
      v_stock_despues, v_resultado;
  ELSE
    RAISE EXCEPTION 'TEST 4 FALLÓ: Stock esperado 7, obtenido %, resultado %', 
      v_stock_despues, v_resultado;
  END IF;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- TEST 5: Verificar que descontar_stock_ciudad_atomico no permite stock negativo
DO $$
DECLARE
  v_test_ciudad text := 'test_ciudad_' || extract(epoch from now());
  v_test_sku text := 'TEST_SKU_' || extract(epoch from now());
  v_stock_inicial integer := 2;
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
  DECLARE
    v_stock_final integer;
  BEGIN
    SELECT cantidad INTO v_stock_final
    FROM city_stock
    WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    
    IF v_stock_final = 0 THEN
      RAISE NOTICE '✅ TEST 5 PASÓ: Stock no puede ser negativo (resultado: 0)';
    ELSE
      RAISE EXCEPTION 'TEST 5 FALLÓ: Stock debería ser 0, obtenido %', v_stock_final;
    END IF;
  END;
  
  -- Limpiar
  DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
  DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- RESUMEN DE TESTS
SELECT 
  'FASE 2.1 - RESUMEN DE TESTS' as resumen,
  'Ejecuta los tests anteriores y verifica que todos pasen' as instrucciones,
  'Si algún test falla, revisa las funciones antes de continuar' as advertencia;


