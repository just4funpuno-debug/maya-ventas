-- ================================================================
-- CREAR CIUDAD DE PRUEBA CON VENTAS DE EJEMPLO
-- ================================================================
-- Este script crea una ciudad "PRUEBA" con ventas de ejemplo
-- para poder probar "Generar Depósito" sin afectar datos reales
--
-- ⚠️ USO: Ejecutar en Supabase SQL Editor
-- ================================================================

-- Paso 1: Obtener algunos productos reales para las ventas de prueba
-- (Necesitamos SKUs válidos de almacen_central)
DO $$
DECLARE
  v_producto1 text;
  v_producto2 text;
  v_producto3 text;
  v_user_id uuid;
  v_ciudad_prueba text := 'prueba'; -- Normalizado (minúsculas con guión bajo)
  v_ciudad_display text := 'PRUEBA'; -- Para mostrar en UI
  v_fecha_hoy date := CURRENT_DATE;
  v_ventas_creadas int := 0;
BEGIN
  -- Obtener 3 productos reales (no sintéticos)
  SELECT sku INTO v_producto1 FROM almacen_central WHERE sintetico = false LIMIT 1;
  SELECT sku INTO v_producto2 FROM almacen_central WHERE sintetico = false AND sku != COALESCE(v_producto1, '') LIMIT 1;
  SELECT sku INTO v_producto3 FROM almacen_central WHERE sintetico = false AND sku NOT IN (COALESCE(v_producto1, ''), COALESCE(v_producto2, '')) LIMIT 1;

  -- Obtener un usuario admin o el primer usuario disponible
  SELECT id INTO v_user_id FROM users WHERE rol = 'admin' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users LIMIT 1;
  END IF;

  -- Verificar que tenemos productos
  IF v_producto1 IS NULL THEN
    RAISE EXCEPTION 'No se encontraron productos en almacen_central. Crea productos primero.';
  END IF;

  RAISE NOTICE '📦 Productos seleccionados: %, %, %', v_producto1, v_producto2, v_producto3;
  RAISE NOTICE '👤 Usuario seleccionado: %', v_user_id;
  RAISE NOTICE '🏙️ Ciudad de prueba: %', v_ciudad_display;

  -- ================================================================
  -- CREAR VENTAS DE PRUEBA
  -- ================================================================

  -- Venta 1: Confirmada normal (producto 1, cantidad 2)
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto1, 2, 150.00, 300.00,
    'Vendedora Prueba', v_user_id, '71234567', 'confirmado', 'pendiente',
    20.00, '10:00 AM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 2: Confirmada con producto extra (producto 1 + producto 2)
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, sku_extra, cantidad_extra, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto1, 1, v_producto2, 1, 200.00, 400.00,
    'Vendedora Prueba 2', v_user_id, '71234568', 'entregada', 'pendiente',
    25.00, '11:30 AM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 3: Confirmada simple (producto 2)
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto2, 3, 120.00, 360.00,
    'Vendedora Prueba 3', v_user_id, '71234569', 'confirmado', 'pendiente',
    15.00, '2:00 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 4: Cancelada CON costo (para probar canceladas con gasto)
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, gasto_cancelacion, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto3, 1, 100.00, 0.00,
    'Vendedora Prueba 4', v_user_id, '71234570', 'cancelado', 'pendiente',
    0.00, 30.00, -- gasto_cancelacion: costo de cancelación
    '3:00 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  -- Venta 5: Confirmada más reciente (producto 3)
  INSERT INTO ventas (
    fecha, ciudad, sku, cantidad, precio, total,
    vendedora, vendedora_id, celular, estado_entrega, estado_pago,
    gasto, hora_entrega, comprobante, codigo_unico
  ) VALUES (
    v_fecha_hoy, v_ciudad_prueba, v_producto3, 2, 180.00, 360.00,
    'Vendedora Prueba 5', v_user_id, '71234571', 'entregada', 'pendiente',
    20.00, '4:30 PM', NULL, gen_random_uuid()
  );
  v_ventas_creadas := v_ventas_creadas + 1;

  RAISE NOTICE '✅ Ventas de prueba creadas: %', v_ventas_creadas;
  RAISE NOTICE '';
  RAISE NOTICE '📋 RESUMEN:';
  RAISE NOTICE '   - Ciudad: %', v_ciudad_display;
  RAISE NOTICE '   - Ventas confirmadas: 4';
  RAISE NOTICE '   - Ventas canceladas con costo: 1';
  RAISE NOTICE '   - Total ventas: %', v_ventas_creadas;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ahora puedes:';
  RAISE NOTICE '   1. Ir al menú "Ventas"';
  RAISE NOTICE '   2. Seleccionar la ciudad "PRUEBA"';
  RAISE NOTICE '   3. Probar "Generar Depósito"';
  RAISE NOTICE '   4. Si quieres revertir, usa: scripts/revertir-deposito-prueba.sql';

END $$;

-- Paso 2: Verificar las ventas creadas
SELECT 
  id,
  fecha,
  ciudad,
  sku,
  cantidad,
  precio,
  total,
  estado_entrega,
  estado_pago,
  gasto,
  gasto_cancelacion,
  vendedora,
  created_at
FROM ventas
WHERE ciudad = 'prueba'
ORDER BY created_at DESC;

