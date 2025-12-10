-- ============================================================================
-- TEST FASE 1.3: VERIFICACIÓN DE CONSISTENCIA EN SUPABASE
-- ============================================================================
-- Este script verifica que no hay inconsistencias después de los tests
-- ============================================================================

-- TEST 1: Verificar que no hay stock negativo
SELECT 
  'TEST 1: Stock negativo' as test_name,
  COUNT(*) as errores,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado
FROM city_stock
WHERE cantidad < 0;

-- TEST 2: Verificar que no hay ventas pendientes sin stock suficiente
SELECT 
  'TEST 2: Ventas pendientes vs stock' as test_name,
  COUNT(*) as inconsistencias,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado
FROM (
  SELECT 
    v.ciudad,
    v.sku,
    v.cantidad as cantidad_venta,
    COALESCE(cs.cantidad, 0) as stock_disponible,
    (COALESCE(cs.cantidad, 0) - v.cantidad) as stock_restante
  FROM ventas v
  LEFT JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku
  WHERE v.estado_entrega = 'pendiente'
    AND v.deleted_from_pending_at IS NULL
    AND v.sku IS NOT NULL
    AND NOT v.sku = ANY(SELECT sku FROM almacen_central WHERE sintetico = true)
) subquery
WHERE stock_restante < 0;

-- TEST 3: Verificar que no hay ventas pendientes con producto adicional sin stock
SELECT 
  'TEST 3: Producto adicional sin stock' as test_name,
  COUNT(*) as inconsistencias,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado
FROM (
  SELECT 
    v.ciudad,
    v.sku_extra,
    v.cantidad_extra,
    COALESCE(cs.cantidad, 0) as stock_disponible,
    (COALESCE(cs.cantidad, 0) - v.cantidad_extra) as stock_restante
  FROM ventas v
  LEFT JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku_extra
  WHERE v.estado_entrega = 'pendiente'
    AND v.deleted_from_pending_at IS NULL
    AND v.sku_extra IS NOT NULL
    AND v.cantidad_extra > 0
    AND NOT v.sku_extra = ANY(SELECT sku FROM almacen_central WHERE sintetico = true)
) subquery
WHERE stock_restante < 0;

-- TEST 4: Verificar que todas las ventas pendientes tienen ciudad y sku válidos
SELECT 
  'TEST 4: Ventas con datos inválidos' as test_name,
  COUNT(*) as errores,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado
FROM ventas
WHERE estado_entrega = 'pendiente'
  AND deleted_from_pending_at IS NULL
  AND (ciudad IS NULL OR ciudad = '' OR sku IS NULL OR sku = '');

-- TEST 5: Verificar que no hay ventas duplicadas (mismo código único)
SELECT 
  'TEST 5: Ventas duplicadas' as test_name,
  COUNT(*) as duplicados,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado
FROM (
  SELECT codigo_unico, COUNT(*) as cnt
  FROM ventas
  WHERE codigo_unico IS NOT NULL
  GROUP BY codigo_unico
  HAVING COUNT(*) > 1
) duplicados;

-- TEST 6: Verificar que la función SQL transaccional existe y funciona
SELECT 
  'TEST 6: Función SQL transaccional' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'registrar_venta_pendiente_atomica'
    ) THEN 0
    ELSE 1
  END as errores,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'registrar_venta_pendiente_atomica'
    ) THEN '✅ PASÓ'
    ELSE '❌ FALLÓ'
  END as resultado;

-- RESUMEN FINAL
SELECT 
  'RESUMEN FINAL' as resumen,
  COUNT(*) FILTER (WHERE resultado = '✅ PASÓ') as tests_pasados,
  COUNT(*) FILTER (WHERE resultado LIKE '❌%') as tests_fallidos,
  COUNT(*) as total_tests,
  CASE 
    WHEN COUNT(*) FILTER (WHERE resultado LIKE '❌%') = 0 THEN '✅ TODOS LOS TESTS PASARON'
    ELSE '❌ HAY TESTS FALLIDOS - REVISAR ANTES DE CONTINUAR'
  END as estado_final
FROM (
  SELECT 'TEST 1' as test, 
    CASE WHEN (SELECT COUNT(*) FROM city_stock WHERE cantidad < 0) = 0 THEN '✅ PASÓ' ELSE '❌ FALLÓ' END as resultado
  UNION ALL
  SELECT 'TEST 2' as test,
    CASE WHEN (
      SELECT COUNT(*) FROM (
        SELECT v.ciudad, v.sku, v.cantidad, COALESCE(cs.cantidad, 0) as stock
        FROM ventas v
        LEFT JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku
        WHERE v.estado_entrega = 'pendiente' AND v.deleted_from_pending_at IS NULL
          AND v.sku IS NOT NULL
          AND NOT v.sku = ANY(SELECT sku FROM almacen_central WHERE sintetico = true)
      ) s WHERE (s.stock - s.cantidad) < 0
    ) = 0 THEN '✅ PASÓ' ELSE '❌ FALLÓ' END
  UNION ALL
  SELECT 'TEST 3' as test,
    CASE WHEN (
      SELECT COUNT(*) FROM (
        SELECT v.ciudad, v.sku_extra, v.cantidad_extra, COALESCE(cs.cantidad, 0) as stock
        FROM ventas v
        LEFT JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku_extra
        WHERE v.estado_entrega = 'pendiente' AND v.deleted_from_pending_at IS NULL
          AND v.sku_extra IS NOT NULL AND v.cantidad_extra > 0
          AND NOT v.sku_extra = ANY(SELECT sku FROM almacen_central WHERE sintetico = true)
      ) s WHERE (s.stock - s.cantidad_extra) < 0
    ) = 0 THEN '✅ PASÓ' ELSE '❌ FALLÓ' END
  UNION ALL
  SELECT 'TEST 4' as test,
    CASE WHEN (
      SELECT COUNT(*) FROM ventas
      WHERE estado_entrega = 'pendiente' AND deleted_from_pending_at IS NULL
        AND (ciudad IS NULL OR ciudad = '' OR sku IS NULL OR sku = '')
    ) = 0 THEN '✅ PASÓ' ELSE '❌ FALLÓ' END
  UNION ALL
  SELECT 'TEST 5' as test,
    CASE WHEN (
      SELECT COUNT(*) FROM (
        SELECT codigo_unico, COUNT(*) as cnt
        FROM ventas WHERE codigo_unico IS NOT NULL
        GROUP BY codigo_unico HAVING COUNT(*) > 1
      ) d
    ) = 0 THEN '✅ PASÓ' ELSE '❌ FALLÓ' END
  UNION ALL
  SELECT 'TEST 6' as test,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'registrar_venta_pendiente_atomica'
    ) THEN '✅ PASÓ' ELSE '❌ FALLÓ' END
) todos_tests;

