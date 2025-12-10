-- ============================================================================
-- VERIFICAR: Ventas de "PRUEBA" del 30/11/2025 (después de eliminación)
-- ============================================================================
-- Propósito: Verificar si las ventas realmente fueron eliminadas
-- ============================================================================

-- CONSULTA 1: Verificar si quedan ventas de PRUEBA del 30/11/2025
SELECT 
  COUNT(*) as ventas_restantes,
  COUNT(CASE WHEN estado_entrega = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN estado_entrega IN ('confirmado', 'entregada') THEN 1 END) as confirmadas,
  COUNT(CASE WHEN estado_entrega = 'cancelado' THEN 1 END) as canceladas
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  );

-- CONSULTA 2: Si hay ventas restantes, listarlas
SELECT 
  id,
  fecha,
  ciudad,
  estado_entrega,
  estado_pago,
  total,
  created_at
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  )
ORDER BY created_at DESC;

-- CONSULTA 3: Verificar formato exacto de ciudad en la BD
-- (puede que la ciudad esté guardada con formato diferente)
SELECT DISTINCT 
  ciudad,
  LOWER(REPLACE(ciudad, ' ', '_')) as ciudad_normalizada
FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    ciudad ILIKE '%prueba%'
    OR LOWER(ciudad) LIKE '%prueba%'
  );

-- ============================================================================
-- INTERPRETACIÓN:
-- ============================================================================
-- - Si COUNT(*) = 0: Las ventas fueron eliminadas correctamente
-- - Si COUNT(*) > 0: Aún quedan ventas (puede ser formato de ciudad diferente)
-- ============================================================================

