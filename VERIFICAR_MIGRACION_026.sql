-- ============================================================================
-- VERIFICACIÓN MIGRACIÓN 026: Normalización de etapa "Leads Entrantes"
-- ============================================================================

-- 1. Verificar que todos los pipelines tengan "Leads Entrantes"
SELECT 
  'VERIFICACIÓN 1: Pipelines con "Leads Entrantes"' AS verificacion,
  p.id AS pipeline_id,
  p.name AS pipeline_name,
  p.product_id,
  COUNT(DISTINCT CASE WHEN stage->>'name' ILIKE '%entrantes%' THEN 1 END) AS tiene_entrantes,
  COUNT(DISTINCT stage->>'name') AS total_etapas
FROM whatsapp_pipelines p
CROSS JOIN jsonb_array_elements(p.stages) AS stage
WHERE p.is_default = true
GROUP BY p.id, p.name, p.product_id
ORDER BY tiene_entrantes DESC;

-- 2. Verificar nombres normalizados
SELECT 
  'VERIFICACIÓN 2: Nombres de etapa "entrantes"' AS verificacion,
  p.id AS pipeline_id,
  stage->>'name' AS nombre_etapa,
  stage->>'order' AS orden,
  CASE 
    WHEN stage->>'name' = 'Leads Entrantes' THEN '✅ Normalizado'
    WHEN stage->>'name' ILIKE '%entrantes%' THEN '⚠️ No normalizado'
    ELSE '❌ No encontrado'
  END AS estado
FROM whatsapp_pipelines p
CROSS JOIN jsonb_array_elements(p.stages) AS stage
WHERE p.is_default = true
  AND (stage->>'name' ILIKE '%entrantes%' OR stage->>'name' = 'Leads Entrantes')
ORDER BY p.id, (stage->>'order')::int;

-- 3. Resumen final
SELECT 
  'RESUMEN FINAL' AS verificacion,
  COUNT(DISTINCT p.id) AS total_pipelines,
  COUNT(DISTINCT CASE WHEN stage->>'name' ILIKE '%entrantes%' THEN p.id END) AS pipelines_con_entrantes,
  COUNT(DISTINCT CASE WHEN stage->>'name' = 'Leads Entrantes' THEN p.id END) AS pipelines_normalizados,
  CASE 
    WHEN COUNT(DISTINCT p.id) = COUNT(DISTINCT CASE WHEN stage->>'name' = 'Leads Entrantes' THEN p.id END) 
    THEN '✅ Todos los pipelines están normalizados'
    ELSE '⚠️ Algunos pipelines necesitan normalización'
  END AS estado
FROM whatsapp_pipelines p
LEFT JOIN jsonb_array_elements(p.stages) AS stage ON TRUE
WHERE p.is_default = true;


