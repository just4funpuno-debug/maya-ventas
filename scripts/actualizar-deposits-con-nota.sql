-- Script para actualizar depósitos existentes con campo nota completo
-- Este script busca las ventas asociadas a cada depósito y construye el campo nota

-- 1. Primero, verificar cuántos depósitos tienen ventas asociadas
SELECT 
  d.id,
  d.ciudad,
  d.fecha,
  d.monto_total,
  COUNT(s.id) as ventas_asociadas
FROM deposits d
LEFT JOIN sales s ON s.deposit_id = d.id
WHERE d.nota IS NULL
GROUP BY d.id, d.ciudad, d.fecha, d.monto_total
ORDER BY d.fecha DESC;

-- 2. Función para construir el campo nota desde las ventas asociadas
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
  -- Iterar sobre cada depósito sin nota
  FOR deposit_record IN 
    SELECT id, ciudad, fecha, monto_total
    FROM deposits
    WHERE nota IS NULL
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
    
    -- Calcular resumen
    SELECT 
      COUNT(*),
      COALESCE(SUM(s.total), 0),
      COALESCE(SUM(CASE WHEN s.metodo = 'Delivery' THEN 20 ELSE 0 END), 0)
    INTO total_ventas, total_monto, total_delivery
    FROM sales s
    WHERE s.deposit_id = deposit_record.id;
    
    -- Construir objeto resumen
    resumen_obj := jsonb_build_object(
      'ventasConfirmadas', total_ventas,
      'ventasSinteticas', 0,
      'canceladasConCosto', 0,
      'totalPedidos', total_ventas,
      'totalMonto', total_monto,
      'totalDelivery', total_delivery,
      'totalNeto', total_monto - total_delivery,
      'productos', jsonb_build_object() -- Se puede calcular después si es necesario
    );
    
    -- Construir nota final
    nota_final := jsonb_build_object(
      'resumen', resumen_obj,
      'ventas', COALESCE(ventas_array, '[]'::jsonb)
    )::text;
    
    -- Actualizar depósito
    UPDATE deposits
    SET nota = nota_final
    WHERE id = deposit_record.id;
    
    RAISE NOTICE 'Depósito % actualizado: % ventas', deposit_record.id, total_ventas;
  END LOOP;
  
  RAISE NOTICE 'Proceso completado';
END $$;

-- 3. Verificar resultados
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  CASE 
    WHEN nota IS NULL THEN 'SIN_NOTA'
    WHEN nota::jsonb ? 'resumen' AND nota::jsonb ? 'ventas' THEN 'COMPLETO'
    ELSE 'INCOMPLETO'
  END as estado_nota,
  (nota::jsonb->'ventas')::jsonb->>0 as primera_venta_preview
FROM deposits
ORDER BY created_at DESC
LIMIT 10;

