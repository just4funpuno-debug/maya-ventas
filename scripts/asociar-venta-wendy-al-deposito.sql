-- Asociar la venta de Wendy al depósito del 25/10/2025 en SUCRE

-- 1. Verificar la venta
SELECT 
  id,
  fecha,
  ciudad,
  vendedora,
  celular,
  total,
  deposit_id,
  estado_entrega,
  estado_pago
FROM sales
WHERE id = 'b7ffca4c-4eb5-4e8c-8998-e68ebf195d7b';

-- 2. Verificar el depósito
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  jsonb_array_length((nota::jsonb->'ventas')::jsonb) as cantidad_ventas_actuales
FROM deposits
WHERE fecha = '2025-10-25'
  AND ciudad = 'sucre';

-- 3. Asociar la venta al depósito
UPDATE sales
SET deposit_id = (
  SELECT id FROM deposits 
  WHERE fecha = '2025-10-25' 
    AND ciudad = 'sucre' 
  LIMIT 1
)
WHERE id = 'b7ffca4c-4eb5-4e8c-8998-e68ebf195d7b'
  AND deposit_id IS NULL;

-- 4. Actualizar el campo nota del depósito para incluir esta venta
DO $$
DECLARE
  deposit_id_var UUID;
  venta_data JSONB;
  nota_actual JSONB;
  ventas_array JSONB;
  resumen_obj JSONB;
  nota_final TEXT;
BEGIN
  -- Obtener ID del depósito
  SELECT id INTO deposit_id_var
  FROM deposits
  WHERE fecha = '2025-10-25' AND ciudad = 'sucre'
  LIMIT 1;
  
  IF deposit_id_var IS NULL THEN
    RAISE EXCEPTION 'Depósito no encontrado';
  END IF;
  
  -- Obtener datos de la venta
  SELECT jsonb_build_object(
    'id', id,
    'codigo_unico', codigo_unico,
    'total', total,
    'gasto', gasto,
    'precio', precio,
    'fecha', fecha,
    'sku', sku,
    'cantidad', cantidad,
    'sku_extra', sku_extra,
    'cantidad_extra', cantidad_extra,
    'estado_entrega', estado_entrega,
    'sintetica_cancelada', COALESCE(sintetica_cancelada, false),
    'hora_entrega', hora_entrega,
    'vendedora', vendedora,
    'celular', celular,
    'metodo', metodo,
    'destino_encomienda', destino_encomienda,
    'comprobante', comprobante,
    'motivo', motivo
  )
  INTO venta_data
  FROM sales
  WHERE id = 'b7ffca4c-4eb5-4e8c-8998-e68ebf195d7b';
  
  -- Obtener nota actual del depósito
  SELECT nota::jsonb INTO nota_actual
  FROM deposits
  WHERE id = deposit_id_var;
  
  -- Obtener todas las ventas del depósito (incluyendo la nueva)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'codigo_unico', s.codigo_unico,
      'total', s.total,
      'gasto', s.gasto,
      'precio', s.precio,
      'fecha', s.fecha,
      'sku', s.sku,
      'cantidad', s.cantidad,
      'sku_extra', s.sku_extra,
      'cantidad_extra', s.cantidad_extra,
      'estado_entrega', s.estado_entrega,
      'sintetica_cancelada', COALESCE(s.sintetica_cancelada, false),
      'hora_entrega', s.hora_entrega,
      'vendedora', s.vendedora,
      'celular', s.celular,
      'metodo', s.metodo,
      'destino_encomienda', s.destino_encomienda,
      'comprobante', s.comprobante,
      'motivo', s.motivo
    ) ORDER BY s.fecha, s.created_at
  ), '[]'::jsonb)
  INTO ventas_array
  FROM sales s
  WHERE s.deposit_id = deposit_id_var;
  
  -- Construir resumen
  resumen_obj := jsonb_build_object(
    'ventasConfirmadas', (SELECT COUNT(*) FROM sales WHERE deposit_id = deposit_id_var),
    'ventasSinteticas', (SELECT COUNT(*) FROM sales WHERE deposit_id = deposit_id_var AND sintetica_cancelada = true),
    'canceladasConCosto', 0,
    'totalPedidos', (SELECT COUNT(*) FROM sales WHERE deposit_id = deposit_id_var),
    'totalMonto', (SELECT COALESCE(SUM(total), 0) FROM sales WHERE deposit_id = deposit_id_var),
    'totalDelivery', (SELECT COALESCE(SUM(CASE WHEN metodo = 'Delivery' THEN 20 ELSE 0 END), 0) FROM sales WHERE deposit_id = deposit_id_var),
    'totalNeto', (SELECT COALESCE(SUM(total), 0) - COALESCE(SUM(CASE WHEN metodo = 'Delivery' THEN 20 ELSE 0 END), 0) FROM sales WHERE deposit_id = deposit_id_var),
    'productos', jsonb_build_object()
  );
  
  -- Construir nota final
  nota_final := jsonb_build_object(
    'resumen', resumen_obj,
    'ventas', COALESCE(ventas_array, '[]'::jsonb)
  )::text;
  
  -- Actualizar depósito
  UPDATE deposits
  SET nota = nota_final
  WHERE id = deposit_id_var;
  
  RAISE NOTICE 'Depósito % actualizado con % ventas', deposit_id_var, jsonb_array_length(COALESCE(ventas_array, '[]'::jsonb));
END $$;

-- 5. Verificar resultado
SELECT 
  d.id,
  d.ciudad,
  d.fecha,
  d.monto_total,
  jsonb_array_length((d.nota::jsonb->'ventas')::jsonb) as cantidad_ventas,
  jsonb_pretty(d.nota::jsonb->'ventas') as ventas_detalle
FROM deposits d
WHERE d.fecha = '2025-10-25'
  AND d.ciudad = 'sucre';

