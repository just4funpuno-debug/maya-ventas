-- ============================================================================
-- TEST 4 SIMPLIFICADO: Ver exactamente qué está pasando
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS test_results (
  paso text,
  valor_esperado text,
  valor_obtenido text,
  resultado text
);

TRUNCATE TABLE test_results;

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
  -- Setup
  INSERT INTO almacen_central (sku, nombre, stock, precio)
  VALUES (v_test_sku, 'Producto Test', 0, 100.00)
  ON CONFLICT (sku) DO UPDATE SET nombre = 'Producto Test';
  
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_test_ciudad, v_test_sku, v_stock_inicial)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = v_stock_inicial;
  
  INSERT INTO test_results VALUES ('Setup', 'Stock inicial: 10', 'Stock inicial: ' || v_stock_inicial, '✅');
  
  -- PASO 1: Crear venta
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
  
  INSERT INTO test_results VALUES (
    'PASO 1: Crear venta (2 unidades)',
    'Stock: 8',
    'Stock: ' || v_stock_despues_crear,
    CASE WHEN v_stock_despues_crear = 8 THEN '✅' ELSE '❌' END
  );
  
  -- PASO 2: Editar venta
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
    
    INSERT INTO test_results VALUES ('PASO 2: Llamar función editar', 'Sin errores', 'Sin errores', '✅');
    
    -- Verificar stock
    SELECT cantidad INTO v_stock_despues_editar
    FROM city_stock
    WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    
    INSERT INTO test_results VALUES (
      'PASO 3: Verificar stock después de editar',
      'Stock: 7',
      'Stock: ' || v_stock_despues_editar,
      CASE WHEN v_stock_despues_editar = 7 THEN '✅' ELSE '❌' END
    );
    
    -- Verificar cantidad de venta
    SELECT cantidad INTO v_cantidad_venta
    FROM ventas
    WHERE id = v_venta_id;
    
    INSERT INTO test_results VALUES (
      'PASO 4: Verificar cantidad de venta',
      'Cantidad: 3',
      'Cantidad: ' || COALESCE(v_cantidad_venta::text, 'NULL'),
      CASE WHEN v_cantidad_venta = 3 THEN '✅' ELSE '❌' END
    );
    
    -- Limpiar
    DELETE FROM ventas WHERE id = v_venta_id;
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
    
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO test_results VALUES ('PASO 2: Error al editar', 'Sin errores', 'Error: ' || SQLERRM, '❌');
      DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
      DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
      DELETE FROM almacen_central WHERE sku = v_test_sku;
  END;
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('Error en setup', 'Sin errores', 'Error: ' || SQLERRM, '❌');
    DELETE FROM ventas WHERE id = COALESCE(v_venta_id, gen_random_uuid());
    DELETE FROM city_stock WHERE ciudad = v_test_ciudad AND sku = v_test_sku;
    DELETE FROM almacen_central WHERE sku = v_test_sku;
END $$;

-- Mostrar resultados
SELECT 
  paso as "Paso",
  valor_esperado as "Valor Esperado",
  valor_obtenido as "Valor Obtenido",
  resultado as "Resultado"
FROM test_results
ORDER BY paso;

