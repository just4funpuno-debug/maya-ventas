-- Buscar la venta faltante en Supabase
-- Datos: 25/10/2025, 4:00 PM, SUCRE, Wendy, celular 60322315, total 580.00

-- 1. Buscar por fecha y ciudad
SELECT 
  id,
  fecha,
  ciudad,
  vendedora,
  celular,
  total,
  gasto,
  precio,
  cantidad,
  sku,
  estado_entrega,
  estado_pago,
  deposit_id,
  hora_entrega,
  created_at
FROM sales
WHERE fecha = '2025-10-25'
  AND LOWER(REPLACE(ciudad, ' ', '_')) = 'sucre'
ORDER BY created_at;

-- 2. Buscar por celular
SELECT 
  id,
  fecha,
  ciudad,
  vendedora,
  celular,
  total,
  gasto,
  precio,
  cantidad,
  sku,
  estado_entrega,
  estado_pago,
  deposit_id,
  hora_entrega,
  created_at
FROM sales
WHERE celular LIKE '%60322315%'
ORDER BY fecha DESC;

-- 3. Buscar por vendedora y fecha
SELECT 
  id,
  fecha,
  ciudad,
  vendedora,
  celular,
  total,
  gasto,
  precio,
  cantidad,
  sku,
  estado_entrega,
  estado_pago,
  deposit_id,
  hora_entrega,
  created_at
FROM sales
WHERE fecha = '2025-10-25'
  AND vendedora ILIKE '%wendy%'
ORDER BY created_at;

-- 4. Buscar por total aproximado (580.00)
SELECT 
  id,
  fecha,
  ciudad,
  vendedora,
  celular,
  total,
  gasto,
  precio,
  cantidad,
  sku,
  estado_entrega,
  estado_pago,
  deposit_id,
  hora_entrega,
  created_at
FROM sales
WHERE fecha = '2025-10-25'
  AND ABS(total - 580.00) < 1.00
ORDER BY created_at;

-- 5. Verificar depósito de esa fecha en SUCRE
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  estado,
  jsonb_array_length((nota::jsonb->'ventas')::jsonb) as cantidad_ventas,
  nota::jsonb->'ventas' as ventas_preview
FROM deposits
WHERE fecha = '2025-10-25'
  AND ciudad = 'sucre';

