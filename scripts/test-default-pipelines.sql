-- ================================================================
-- TEST: Verificación de Pipelines por Defecto
-- FASE 1 - SUBFASE 1.3: Testing de Pipelines
-- ================================================================
-- Ejecutar después de la migración 015 para verificar que los pipelines se crearon correctamente
-- ================================================================

-- 1. Verificar que hay pipelines por defecto creados
SELECT 
  COUNT(*) AS total_pipelines_default
FROM whatsapp_pipelines
WHERE is_default = true;

-- 2. Verificar pipelines por producto
SELECT 
  pr.sku AS product_sku,
  pr.nombre AS product_name,
  pp.name AS pipeline_name,
  pp.is_default,
  jsonb_array_length(pp.stages) AS num_stages,
  pp.stages AS stages_json
FROM whatsapp_pipelines pp
LEFT JOIN products pr ON pp.product_id = pr.id
WHERE pp.is_default = true
ORDER BY pr.nombre;

-- 3. Verificar que cada producto no sintético tiene pipeline
SELECT 
  pr.id AS product_id,
  pr.sku,
  pr.nombre,
  CASE 
    WHEN pp.id IS NOT NULL THEN '✅ Tiene pipeline'
    ELSE '❌ Sin pipeline'
  END AS pipeline_status
FROM products pr
LEFT JOIN whatsapp_pipelines pp ON pr.id = pp.product_id AND pp.is_default = true
WHERE (pr.sintetico = false OR pr.sintetico IS NULL)
ORDER BY pr.nombre;

-- 4. Verificar estructura de etapas
SELECT 
  pr.nombre AS product_name,
  pp.stages AS stages_json,
  jsonb_array_elements(pp.stages) AS stage_detail
FROM whatsapp_pipelines pp
LEFT JOIN products pr ON pp.product_id = pr.id
WHERE pp.is_default = true
ORDER BY pr.nombre, (jsonb_array_elements(pp.stages)->>'order')::INT;

-- 5. Verificar que las etapas tienen la estructura correcta
SELECT 
  pr.nombre AS product_name,
  stage->>'name' AS stage_name,
  stage->>'order' AS stage_order,
  stage->>'color' AS stage_color
FROM whatsapp_pipelines pp
LEFT JOIN products pr ON pp.product_id = pr.id,
LATERAL jsonb_array_elements(pp.stages) AS stage
WHERE pp.is_default = true
ORDER BY pr.nombre, (stage->>'order')::INT;

-- 6. Verificar que no hay productos sintéticos con pipeline
SELECT 
  pr.id,
  pr.sku,
  pr.nombre,
  pr.sintetico,
  pp.id AS pipeline_id
FROM products pr
INNER JOIN whatsapp_pipelines pp ON pr.id = pp.product_id
WHERE pr.sintetico = true
  AND pp.is_default = true;

-- Debe retornar 0 filas (no debería haber pipelines para productos sintéticos)

-- 7. Contar pipelines por tipo
SELECT 
  CASE 
    WHEN account_id IS NULL AND product_id IS NOT NULL THEN 'Por Producto'
    WHEN account_id IS NOT NULL AND product_id IS NULL THEN 'Por Cuenta'
    WHEN account_id IS NOT NULL AND product_id IS NOT NULL THEN 'Por Cuenta y Producto'
    ELSE 'Global'
  END AS pipeline_type,
  COUNT(*) AS count
FROM whatsapp_pipelines
GROUP BY 
  CASE 
    WHEN account_id IS NULL AND product_id IS NOT NULL THEN 'Por Producto'
    WHEN account_id IS NOT NULL AND product_id IS NULL THEN 'Por Cuenta'
    WHEN account_id IS NOT NULL AND product_id IS NOT NULL THEN 'Por Cuenta y Producto'
    ELSE 'Global'
  END;

