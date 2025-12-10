-- ============================================================================
-- CONSULTA: Ventas de "PRUEBA" del 30/11/2025
-- ============================================================================
-- Propósito: Consultar ventas antes de eliminarlas
-- IMPORTANTE: Este script SOLO CONSULTA, NO ELIMINA
-- ============================================================================

-- PASO 1: Verificar formato de ciudad en la base de datos
-- La ciudad "PRUEBA" puede estar normalizada como "prueba" (minúsculas)
SELECT DISTINCT 
  ciudad,
  LOWER(REPLACE(ciudad, ' ', '_')) as ciudad_normalizada,
  COUNT(*) as cantidad
FROM ventas
WHERE LOWER(REPLACE(ciudad, ' ', '_')) LIKE '%prueba%'
   OR ciudad ILIKE '%prueba%'
GROUP BY ciudad
ORDER BY cantidad DESC;

-- PASO 2: Consultar ventas de "PRUEBA" en la fecha 30/11/2025
-- Nota: Fecha en formato YYYY-MM-DD (2025-11-30)
-- Búsqueda flexible por ciudad (case-insensitive)

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
  vendedora,
  cliente,
  celular,
  metodo,
  gasto,
  deposit_id,
  settled_at,
  created_at,
  updated_at
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  )
ORDER BY created_at DESC;

-- PASO 3: Contar ventas por estado
SELECT 
  estado_entrega,
  estado_pago,
  COUNT(*) as cantidad,
  SUM(total) as total_monto
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  )
GROUP BY estado_entrega, estado_pago
ORDER BY cantidad DESC;

-- PASO 4: Verificar dependencias (depósitos)
SELECT 
  v.id as venta_id,
  v.fecha,
  v.ciudad,
  v.total,
  v.estado_entrega,
  v.deposit_id,
  d.id as deposito_id,
  d.ciudad as deposito_ciudad,
  d.fecha as deposito_fecha,
  d.estado as deposito_estado
FROM ventas v
LEFT JOIN generar_deposito d ON v.deposit_id = d.id
WHERE v.fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(v.ciudad, ' ', '_')) = 'prueba'
    OR v.ciudad ILIKE '%PRUEBA%'
    OR v.ciudad = 'PRUEBA'
  )
ORDER BY v.created_at DESC;

-- PASO 5: Resumen general
SELECT 
  COUNT(*) as total_ventas,
  COUNT(CASE WHEN estado_entrega = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN estado_entrega IN ('confirmado', 'entregada') THEN 1 END) as confirmadas,
  COUNT(CASE WHEN estado_entrega = 'cancelado' THEN 1 END) as canceladas,
  COUNT(CASE WHEN deposit_id IS NOT NULL THEN 1 END) as en_depositos,
  SUM(total) as monto_total
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  );

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Revisar los resultados
-- 3. Confirmar que son las ventas correctas antes de eliminar
-- ============================================================================



