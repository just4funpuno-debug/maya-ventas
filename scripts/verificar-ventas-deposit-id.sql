-- Verificar si las ventas tienen deposit_id asociado

-- 1. Contar ventas con y sin deposit_id
SELECT 
  COUNT(*) as total_ventas,
  COUNT(deposit_id) as ventas_con_deposit_id,
  COUNT(*) - COUNT(deposit_id) as ventas_sin_deposit_id
FROM sales
WHERE estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  AND estado_pago = 'pendiente'
  AND deleted_from_pending_at IS NULL;

-- 2. Ver depósitos y cuántas ventas tienen asociadas
SELECT 
  d.id as deposit_id,
  d.ciudad,
  d.fecha,
  d.monto_total,
  COUNT(s.id) as ventas_asociadas,
  CASE 
    WHEN d.nota IS NULL THEN 'SIN_NOTA'
    WHEN (d.nota::jsonb->'ventas')::jsonb = '[]'::jsonb THEN 'SIN_VENTAS_EN_NOTA'
    ELSE 'CON_VENTAS'
  END as estado_ventas
FROM deposits d
LEFT JOIN sales s ON s.deposit_id = d.id
GROUP BY d.id, d.ciudad, d.fecha, d.monto_total, d.nota
ORDER BY d.fecha DESC
LIMIT 20;

-- 3. Ver algunas ventas que deberían estar asociadas a depósitos
SELECT 
  s.id,
  s.fecha,
  s.ciudad,
  s.total,
  s.deposit_id,
  s.estado_pago,
  s.estado_entrega,
  s.deleted_from_pending_at
FROM sales s
WHERE s.estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  AND s.estado_pago = 'pendiente'
  AND s.deleted_from_pending_at IS NULL
ORDER BY s.fecha DESC
LIMIT 10;


