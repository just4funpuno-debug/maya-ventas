-- Script para verificar el estado de city_stock en Supabase
-- Compara con los datos esperados de Vercel (Firebase)

-- ================================================================
-- 1. VERIFICAR ESTRUCTURA DE city_stock
-- ================================================================

SELECT 
  'Estructura city_stock' as verificacion,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'city_stock'
ORDER BY ordinal_position;

-- ================================================================
-- 2. CONTAR REGISTROS POR CIUDAD
-- ================================================================

SELECT 
  'Conteo por ciudad' as verificacion,
  ciudad,
  COUNT(*) as total_registros,
  SUM(cantidad) as total_cantidad
FROM city_stock
GROUP BY ciudad
ORDER BY ciudad;

-- ================================================================
-- 3. VER TODOS LOS REGISTROS DE city_stock
-- ================================================================

SELECT 
  'Todos los registros' as verificacion,
  ciudad,
  sku,
  cantidad,
  id
FROM city_stock
ORDER BY ciudad, sku;

-- ================================================================
-- 4. VERIFICAR DESPACHOS CONFIRMADOS QUE DEBERÍAN HABER CREADO STOCK
-- ================================================================

SELECT 
  'Despachos confirmados' as verificacion,
  d.id,
  d.ciudad,
  d.fecha,
  d.status,
  d.items,
  d.confirmed_at
FROM dispatches d
WHERE d.status = 'confirmado'
ORDER BY d.fecha DESC, d.ciudad;

-- ================================================================
-- 5. COMPARAR: ¿Qué SKUs tienen stock en city_stock vs qué SKUs hay en almacen_central?
-- ================================================================

SELECT 
  'SKUs en almacen_central' as verificacion,
  COUNT(DISTINCT sku) as total_skus,
  string_agg(DISTINCT sku, ', ' ORDER BY sku) as lista_skus
FROM almacen_central
WHERE NOT sintetico;

SELECT 
  'SKUs en city_stock' as verificacion,
  COUNT(DISTINCT sku) as total_skus,
  string_agg(DISTINCT sku, ', ' ORDER BY sku) as lista_skus
FROM city_stock;

-- ================================================================
-- 6. VERIFICAR CIUDADES ESPERADAS
-- ================================================================

-- Ciudades esperadas (normalizadas)
WITH ciudades_esperadas AS (
  SELECT unnest(ARRAY['el_alto', 'la_paz', 'oruro', 'sucre', 'potosi', 'tarija', 'cochabamba', 'santa_cruz']) as ciudad
)
SELECT 
  'Ciudades con stock' as verificacion,
  ce.ciudad as ciudad_esperada,
  CASE 
    WHEN cs.ciudad IS NOT NULL THEN '✅ Tiene registros'
    ELSE '❌ Sin registros'
  END as estado,
  COALESCE(cs.total_registros, 0) as total_registros,
  COALESCE(cs.total_cantidad, 0) as total_cantidad
FROM ciudades_esperadas ce
LEFT JOIN (
  SELECT ciudad, COUNT(*) as total_registros, SUM(cantidad) as total_cantidad
  FROM city_stock
  GROUP BY ciudad
) cs ON ce.ciudad = cs.ciudad
ORDER BY ce.ciudad;

-- ================================================================
-- 7. RESUMEN FINAL
-- ================================================================

SELECT 
  'RESUMEN FINAL' as verificacion,
  (SELECT COUNT(*) FROM city_stock) as total_registros_city_stock,
  (SELECT COUNT(DISTINCT ciudad) FROM city_stock) as ciudades_con_stock,
  (SELECT COUNT(DISTINCT sku) FROM city_stock) as skus_con_stock,
  (SELECT SUM(cantidad) FROM city_stock) as total_cantidad_global,
  (SELECT COUNT(*) FROM dispatches WHERE status = 'confirmado') as despachos_confirmados,
  CASE 
    WHEN (SELECT COUNT(*) FROM city_stock) = 0 
    THEN '⚠️ NO HAY DATOS EN city_stock - Necesita migración o confirmar despachos'
    ELSE '✅ Hay datos en city_stock'
  END as estado_general;

