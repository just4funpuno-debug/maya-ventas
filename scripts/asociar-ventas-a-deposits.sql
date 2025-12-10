-- Script para asociar ventas a depósitos basándose en fecha y ciudad
-- Esto es necesario si las ventas no tienen deposit_id pero deberían estar asociadas

-- 1. Verificar situación actual
SELECT 
  'Ventas sin deposit_id' as tipo,
  COUNT(*) as cantidad
FROM sales
WHERE estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  AND estado_pago = 'pendiente'
  AND deleted_from_pending_at IS NULL
  AND deposit_id IS NULL

UNION ALL

SELECT 
  'Ventas con deposit_id' as tipo,
  COUNT(*) as cantidad
FROM sales
WHERE deposit_id IS NOT NULL

UNION ALL

SELECT 
  'Depósitos sin ventas en nota' as tipo,
  COUNT(*) as cantidad
FROM deposits
WHERE nota IS NOT NULL
  AND (nota::jsonb->'ventas')::jsonb = '[]'::jsonb;

-- 2. Asociar ventas a depósitos por fecha y ciudad (solo si no tienen deposit_id)
-- Esto asume que las ventas de la misma fecha y ciudad pertenecen al mismo depósito
UPDATE sales s
SET deposit_id = d.id
FROM deposits d
WHERE s.deposit_id IS NULL
  AND s.estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  AND s.estado_pago = 'pendiente'
  AND s.deleted_from_pending_at IS NULL
  AND s.fecha = d.fecha
  AND LOWER(REPLACE(s.ciudad, ' ', '_')) = d.ciudad
  AND d.nota IS NOT NULL
  AND (d.nota::jsonb->'ventas')::jsonb = '[]'::jsonb;

-- 3. Verificar cuántas ventas se asociaron
SELECT 
  COUNT(*) as ventas_asociadas
FROM sales
WHERE deposit_id IS NOT NULL
  AND estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  AND estado_pago = 'pendiente'
  AND deleted_from_pending_at IS NULL;

-- 4. Ahora actualizar el campo nota de los depósitos con las ventas recién asociadas
DO $$
DECLARE
  deposit_record RECORD;
  ventas_array JSONB;
  resumen_obj JSONB;
  nota_final TEXT;
  total_ventas INTEGER;
  total_monto NUMERIC;
  total_delivery NUMERIC;
BEGIN
  -- Iterar sobre depósitos que tienen nota pero sin ventas
  FOR deposit_record IN 
    SELECT id, ciudad, fecha, monto_total, nota
    FROM deposits
    WHERE nota IS NOT NULL
      AND (nota::jsonb->'ventas')::jsonb = '[]'::jsonb
  LOOP
    -- Obtener todas las ventas asociadas a este depósito
    SELECT 
      COALESCE(jsonb_agg(
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
    WHERE s.deposit_id = deposit_record.id;
    
    -- Si hay ventas, actualizar el depósito
    IF jsonb_array_length(COALESCE(ventas_array, '[]'::jsonb)) > 0 THEN
      -- Calcular resumen
      SELECT 
        COUNT(*),
        COALESCE(SUM(s.total), 0),
        COALESCE(SUM(CASE WHEN s.metodo = 'Delivery' THEN 20 ELSE 0 END), 0)
      INTO total_ventas, total_monto, total_delivery
      FROM sales s
      WHERE s.deposit_id = deposit_record.id;
      
      -- Obtener resumen existente o crear uno nuevo
      IF deposit_record.nota::jsonb ? 'resumen' THEN
        resumen_obj := deposit_record.nota::jsonb->'resumen';
        -- Actualizar campos calculados
        resumen_obj := resumen_obj || jsonb_build_object(
          'ventasConfirmadas', total_ventas,
          'totalPedidos', total_ventas,
          'totalMonto', total_monto,
          'totalDelivery', total_delivery,
          'totalNeto', total_monto - total_delivery
        );
      ELSE
        resumen_obj := jsonb_build_object(
          'ventasConfirmadas', total_ventas,
          'ventasSinteticas', 0,
          'canceladasConCosto', 0,
          'totalPedidos', total_ventas,
          'totalMonto', total_monto,
          'totalDelivery', total_delivery,
          'totalNeto', total_monto - total_delivery,
          'productos', jsonb_build_object()
        );
      END IF;
      
      -- Construir nota final
      nota_final := jsonb_build_object(
        'resumen', resumen_obj,
        'ventas', COALESCE(ventas_array, '[]'::jsonb)
      )::text;
      
      -- Actualizar depósito
      UPDATE deposits
      SET nota = nota_final
      WHERE id = deposit_record.id;
      
      RAISE NOTICE 'Depósito % actualizado: % ventas agregadas', deposit_record.id, total_ventas;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Proceso completado';
END $$;

-- 5. Verificar resultados finales
SELECT 
  d.id,
  d.ciudad,
  d.fecha,
  d.monto_total,
  jsonb_array_length((d.nota::jsonb->'ventas')::jsonb) as cantidad_ventas,
  COUNT(s.id) as ventas_asociadas_en_sales
FROM deposits d
LEFT JOIN sales s ON s.deposit_id = d.id
WHERE d.nota IS NOT NULL
GROUP BY d.id, d.ciudad, d.fecha, d.monto_total, d.nota
ORDER BY d.fecha DESC
LIMIT 10;


