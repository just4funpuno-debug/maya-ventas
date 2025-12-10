-- ================================================================
-- PRUEBA COMPLETA DEL FLUJO EN CIUDAD "PRUEBA"
-- ================================================================
-- Este script crea un flujo completo de prueba:
-- 1. Stock en city_stock para la ciudad "prueba"
-- 2. Ventas de prueba que cubren todos los casos:
--    - Ventas normales con productos reales (ganancia)
--    - Ventas con productos sintéticos
--    - Ventas canceladas con costo (pérdida)
--    - Ventas con producto extra
--    - Ventas entregadas
--    - Ventas confirmadas
-- ================================================================

DO $$
DECLARE
  v_producto1 text;
  v_producto2 text;
  v_producto3 text;
  v_producto_sintetico text;
  v_user_id uuid;
  v_ciudad_prueba text := 'prueba';
  v_fecha_hoy date := CURRENT_DATE;
  v_ventas_creadas int := 0;
  v_stock_creado int := 0;
BEGIN
  -- Obtener productos reales (no sintéticos)
  SELECT sku INTO v_producto1 FROM almacen_central WHERE sintetico = false LIMIT 1;
  SELECT sku INTO v_producto2 FROM almacen_central WHERE sintetico = false AND sku != COALESCE(v_producto1, '') LIMIT 1;
  SELECT sku INTO v_producto3 FROM almacen_central WHERE sintetico = false AND sku NOT IN (COALESCE(v_producto1, ''), COALESCE(v_producto2, '')) LIMIT 1;
  
  -- Obtener un producto sintético
  SELECT sku INTO v_producto_sintetico FROM almacen_central WHERE sintetico = true LIMIT 1;

  -- Obtener un usuario admin o el primer usuario disponible
  SELECT id INTO v_user_id FROM users WHERE rol = 'admin' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users LIMIT 1;
  END IF;

  -- Verificar que tenemos productos
  IF v_producto1 IS NULL THEN
    RAISE EXCEPTION 'No se encontraron productos en almacen_central. Crea productos primero.';
  END IF;

  RAISE NOTICE '📦 Productos seleccionados:';
  RAISE NOTICE '   - Producto 1 (real): %', v_producto1;
  RAISE NOTICE '   - Producto 2 (real): %', v_producto2;
  RAISE NOTICE '   - Producto 3 (real): %', v_producto3;
  RAISE NOTICE '   - Producto sintético: %', COALESCE(v_producto_sintetico, 'No encontrado');
  RAISE NOTICE '👤 Usuario seleccionado: %', v_user_id;
  RAISE NOTICE '🏙️ Ciudad de prueba: PRUEBA';
  RAISE NOTICE '';

  -- ================================================================
  -- PASO 1: CREAR STOCK EN CITY_STOCK
  -- ================================================================
  RAISE NOTICE '📦 Creando stock en city_stock...';
  
  -- Stock para producto 1: 50 unidades
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_ciudad_prueba, v_producto1, 50)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = city_stock.cantidad + 50;
  v_stock_creado := v_stock_creado + 1;
  
  -- Stock para producto 2: 30 unidades
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_ciudad_prueba, v_producto2, 30)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = city_stock.cantidad + 30;
  v_stock_creado := v_stock_creado + 1;
  
  -- Stock para producto 3: 20 unidades
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_ciudad_prueba, v_producto3, 20)
  ON CONFLICT (ciudad, sku) DO UPDATE SET cantidad = city_stock.cantidad + 20;
  v_stock_creado := v_stock_creado + 1;
  
  RAISE NOTICE '✅ Stock creado: % productos', v_stock_creado;
  RAISE NOTICE '';

  -- ================================================================
  -- PASO 2: CREAR VENTAS DE PRUEBA
  -- ================================================================
  RAISE NOTICE '💰 Creando ventas de prueba...';

  -- Venta 1: Normal con producto real (ganancia) - CONFIRMADA
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto1, 2, 150.00, 130.00, -- total = precio - gasto = 150 - 20 = 130
    'Vendedora Prueba 1', v_user_id, '71234567', 'confirmado', 'pendiente',
    20.00, '10:00 AM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 2: Normal con producto real + producto extra (ganancia) - ENTREGADA
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, sku_extra, cantidad_extra, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto1, 1, v_producto2, 1, 200.00, 175.00, -- total = precio - gasto = 200 - 25 = 175
    'Vendedora Prueba 2', v_user_id, '71234568', 'entregada', 'pendiente',
    25.00, '11:30 AM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 3: Con producto sintético (si existe) - CONFIRMADA
  IF v_producto_sintetico IS NOT NULL THEN
    INSERT INTO ventas (
      fecha, ciudad, sku, cantidad, precio, total,
      vendedora, vendedora_id, celular, estado_entrega, estado_pago,
      gasto, hora_entrega, comprobante, codigo_unico
    ) VALUES (
      v_fecha_hoy, v_ciudad_prueba, v_producto_sintetico, 1, 0.00, -15.00, -- producto sintético: total negativo = -gasto
      'Vendedora Prueba 3', v_user_id, '71234569', 'confirmado', 'pendiente',
      15.00, '2:00 PM', NULL, gen_random_uuid()
    );
    v_ventas_creadas := v_ventas_creadas + 1;
  END IF;

  -- Venta 4: Cancelada CON costo (pérdida pura) - CANCELADA
  -- No tiene precio porque no se vendió, solo tiene gasto de cancelación
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, gasto_cancelacion, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto3, 1, 0.00, 0.00, -- precio = 0, total = 0 (el negativo viene del gasto_cancelacion)
    'Vendedora Prueba 4', v_user_id, '71234570', 'cancelado', 'pendiente',
    0.00, 30.00, -- gasto_cancelacion: costo de cancelación (pérdida pura)
    '3:00 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 5: Normal con ganancia alta - ENTREGADA
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto2, 3, 120.00, 105.00, -- total = precio - gasto = 120 - 15 = 105
    'Vendedora Prueba 5', v_user_id, '71234571', 'entregada', 'pendiente',
    15.00, '4:30 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 6: Normal con producto 3 - CONFIRMADA
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto3, 2, 180.00, 160.00, -- total = precio - gasto = 180 - 20 = 160
    'Vendedora Prueba 6', v_user_id, '71234572', 'confirmado', 'pendiente',
    20.00, '5:00 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 7: Cancelada CON costo mayor (pérdida pura mayor) - CANCELADA
  -- No tiene precio porque no se vendió, solo tiene gasto de cancelación
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, gasto_cancelacion, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto1, 2, 0.00, 0.00, -- precio = 0, total = 0 (el negativo viene del gasto_cancelacion)
    'Vendedora Prueba 7', v_user_id, '71234573', 'cancelado', 'pendiente',
    0.00, 50.00, -- gasto_cancelacion: costo de cancelación mayor (pérdida pura)
    '6:00 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  RAISE NOTICE '✅ Ventas creadas: %', v_ventas_creadas;
  RAISE NOTICE '';
  RAISE NOTICE '📋 RESUMEN DE VENTAS:';
  RAISE NOTICE '   - Ventas normales (ganancia): 4';
  RAISE NOTICE '   - Ventas con producto sintético: %', CASE WHEN v_producto_sintetico IS NOT NULL THEN '1' ELSE '0' END;
  RAISE NOTICE '   - Ventas canceladas con costo (pérdida): 2';
  RAISE NOTICE '   - Total ventas: %', v_ventas_creadas;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FLUJO DE PRUEBA:';
  RAISE NOTICE '   1. ✅ Stock creado en city_stock para ciudad "prueba"';
  RAISE NOTICE '   2. ✅ Ventas creadas con diferentes estados y tipos';
  RAISE NOTICE '   3. ➡️  Ve al menú "Ventas" → Selecciona "PRUEBA"';
  RAISE NOTICE '   4. ➡️  Verifica que todas las ventas aparecen correctamente';
  RAISE NOTICE '   5. ➡️  Haz clic en "Generar Depósito"';
  RAISE NOTICE '   6. ➡️  Verifica que el total neto es correcto (debe incluir pérdidas negativas)';
  RAISE NOTICE '   7. ➡️  Confirma y ve al menú "Generar Depósito"';
  RAISE NOTICE '   8. ➡️  Verifica que todas las ventas aparecen con totales correctos';
  RAISE NOTICE '   9. ➡️  Verifica que la venta cancelada muestra total negativo (rojo)';

END $$;

-- Verificar el stock creado
SELECT 
  'Stock en city_stock' as tipo,
  ciudad,
  sku,
  cantidad
FROM city_stock
WHERE ciudad = 'prueba'
ORDER BY sku;

-- Verificar las ventas creadas
SELECT 
  'Ventas creadas' as tipo,
  id,
  fecha,
  ciudad,
  sku,
  cantidad,
  precio,
  total,
  gasto,
  gasto_cancelacion,
  estado_entrega,
  estado_pago,
  vendedora,
  hora_entrega,
  CASE 
    WHEN estado_entrega = 'cancelado' AND gasto_cancelacion > 0 THEN 'Cancelada con costo (pérdida)'
    WHEN sintetica_cancelada THEN 'Sintética cancelada'
    ELSE 'Venta normal (ganancia)'
  END as tipo_venta
FROM ventas
WHERE ciudad = 'prueba'
ORDER BY created_at DESC;

