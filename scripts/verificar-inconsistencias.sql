-- ============================================================================
-- SCRIPT DE VERIFICACIÓN DE INCONSISTENCIAS
-- Ejecutar en Supabase SQL Editor para detectar problemas
-- ============================================================================

-- 1. VERIFICAR STOCK DESCONTADO SIN VENTA REGISTRADA
-- (Error 1: Falta de transacciones atómicas)
SELECT 
  'Error 1: Stock descontado sin venta' as tipo_error,
  cs.ciudad,
  cs.sku,
  cs.cantidad as stock_actual,
  COUNT(v.id) as ventas_pendientes,
  COALESCE(SUM(v.cantidad), 0) as total_vendido_pendiente
FROM city_stock cs
LEFT JOIN ventas v ON v.ciudad = cs.ciudad 
  AND v.sku = cs.sku 
  AND v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
GROUP BY cs.ciudad, cs.sku, cs.cantidad
HAVING cs.cantidad < 0  -- Stock negativo
   OR (cs.cantidad + COALESCE(SUM(v.cantidad), 0)) < 0; -- Más vendido que stock disponible

-- 2. VERIFICAR RACE CONDITIONS (Stock inconsistente)
-- (Error 2: Race condition en operaciones de stock)
SELECT 
  'Error 2: Posible race condition' as tipo_error,
  cs.ciudad,
  cs.sku,
  cs.cantidad as stock_actual,
  COALESCE(SUM(v.cantidad), 0) as total_vendido_pendiente,
  (cs.cantidad + COALESCE(SUM(v.cantidad), 0)) as stock_esperado,
  ABS(cs.cantidad - (cs.cantidad + COALESCE(SUM(v.cantidad), 0))) as diferencia
FROM city_stock cs
LEFT JOIN ventas v ON v.ciudad = cs.ciudad 
  AND v.sku = cs.sku 
  AND v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
GROUP BY cs.ciudad, cs.sku, cs.cantidad
HAVING cs.cantidad < 0; -- Stock negativo indica problema

-- 3. VERIFICAR REGISTROS DUPLICADOS EN CITY_STOCK
-- (Error 5: Manejo de .single() sin validación)
SELECT 
  'Error 5: Registros duplicados' as tipo_error,
  ciudad,
  sku,
  COUNT(*) as duplicados,
  array_agg(id) as ids_duplicados
FROM city_stock
GROUP BY ciudad, sku
HAVING COUNT(*) > 1;

-- 4. VERIFICAR VENTAS SIN STOCK CORRESPONDIENTE
-- (Error 5: Registros faltantes)
SELECT 
  'Error 5: Ventas sin stock' as tipo_error,
  v.ciudad,
  v.sku,
  COUNT(*) as ventas_pendientes,
  SUM(v.cantidad) as total_cantidad
FROM ventas v
WHERE v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM city_stock cs 
    WHERE cs.ciudad = v.ciudad AND cs.sku = v.sku
  )
GROUP BY v.ciudad, v.sku;

-- 5. VERIFICAR INCONSISTENCIAS EN EDICIÓN DE VENTAS
-- (Error 4: Falta de rollback)
SELECT 
  'Error 4: Inconsistencia en edición' as tipo_error,
  v.id,
  v.ciudad,
  v.sku,
  v.cantidad as cantidad_venta,
  cs.cantidad as stock_actual,
  (SELECT SUM(cantidad) FROM ventas v2 
   WHERE v2.ciudad = v.ciudad 
   AND v2.sku = v.sku 
   AND v2.estado_entrega = 'pendiente'
   AND v2.deleted_from_pending_at IS NULL
   AND v2.id != v.id) as otras_ventas,
  (cs.cantidad + (SELECT SUM(cantidad) FROM ventas v2 
                  WHERE v2.ciudad = v.ciudad 
                  AND v2.sku = v.sku 
                  AND v2.estado_entrega = 'pendiente'
                  AND v2.deleted_from_pending_at IS NULL
                  AND v2.id != v.id)) as stock_esperado_con_esta_venta
FROM ventas v
JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku
WHERE v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
  AND cs.cantidad < 0; -- Stock negativo indica problema

-- 6. VERIFICAR STOCK CENTRAL VS DESPACHOS
-- (Error 7: Operaciones no atómicas)
SELECT 
  'Error 7: Inconsistencia despachos' as tipo_error,
  ac.sku,
  ac.stock as stock_actual,
  (SELECT COALESCE(SUM((item->>'cantidad')::integer), 0)
   FROM dispatches d,
   LATERAL jsonb_array_elements(d.items) item
   WHERE d.status = 'confirmado'
   AND item->>'sku' = ac.sku) as total_despachado,
  (SELECT COALESCE(SUM((item->>'cantidad')::integer), 0)
   FROM dispatches d,
   LATERAL jsonb_array_elements(d.items) item
   WHERE d.status = 'pendiente'
   AND item->>'sku' = ac.sku) as total_pendiente
FROM almacen_central ac
WHERE ac.stock < 0; -- Stock negativo

-- 7. RESUMEN GENERAL DE PROBLEMAS
SELECT 
  'RESUMEN' as tipo,
  COUNT(DISTINCT CASE WHEN cs.cantidad < 0 THEN cs.sku END) as productos_stock_negativo,
  COUNT(DISTINCT CASE WHEN COUNT(*) > 1 THEN cs.sku END) as productos_duplicados,
  COUNT(DISTINCT CASE WHEN NOT EXISTS (
    SELECT 1 FROM city_stock cs2 
    WHERE cs2.ciudad = v.ciudad AND cs2.sku = v.sku
  ) THEN v.sku END) as ventas_sin_stock
FROM city_stock cs
FULL OUTER JOIN ventas v ON v.ciudad = cs.ciudad AND v.sku = cs.sku
WHERE v.estado_entrega = 'pendiente' OR cs.cantidad IS NOT NULL
GROUP BY cs.ciudad, cs.sku;

-- 8. VERIFICAR VENTAS CON CANTIDADES INCONSISTENTES
SELECT 
  'Inconsistencia en cantidades' as tipo_error,
  v.id,
  v.ciudad,
  v.sku,
  v.cantidad,
  v.cantidad_extra,
  cs.cantidad as stock_disponible,
  CASE 
    WHEN v.cantidad > cs.cantidad THEN 'Cantidad principal excede stock'
    WHEN v.cantidad_extra > 0 AND NOT EXISTS (
      SELECT 1 FROM city_stock cs2 
      WHERE cs2.ciudad = v.ciudad AND cs2.sku = v.sku_extra
    ) THEN 'Producto extra sin stock'
    ELSE 'OK'
  END as estado
FROM ventas v
LEFT JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku
WHERE v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
  AND (
    v.cantidad > COALESCE(cs.cantidad, 0)
    OR (v.cantidad_extra > 0 AND NOT EXISTS (
      SELECT 1 FROM city_stock cs2 
      WHERE cs2.ciudad = v.ciudad AND cs2.sku = v.sku_extra
    ))
  );


