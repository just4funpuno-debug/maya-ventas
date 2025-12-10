-- ================================================================
-- MIGRACIÓN 015: Pipelines por Defecto para cada Producto
-- FASE 1 - SUBFASE 1.3: Crear Pipelines por Defecto
-- ================================================================
-- Objetivo: Crear un pipeline por defecto para cada producto no sintético
-- Etapas por defecto: "Leads Entrantes", "Seguimiento", "Venta", "Cliente"
-- ================================================================

-- Crear pipeline por defecto para cada producto no sintético
-- Usar DO block para manejar productos que ya tienen pipeline
DO $$
DECLARE
  v_product RECORD;
  v_pipeline_id UUID;
  v_stages JSONB;
BEGIN
  -- Definir etapas por defecto
  v_stages := '[
    {"name": "Leads Entrantes", "order": 1, "color": "#3b82f6"},
    {"name": "Seguimiento", "order": 2, "color": "#f59e0b"},
    {"name": "Venta", "order": 3, "color": "#10b981"},
    {"name": "Cliente", "order": 4, "color": "#8b5cf6"}
  ]'::jsonb;
  
  -- Iterar sobre todos los productos no sintéticos
  FOR v_product IN 
    SELECT id, sku, nombre
    FROM products
    WHERE (sintetico = false OR sintetico IS NULL)
  LOOP
    -- Verificar si ya existe un pipeline por defecto para este producto
    SELECT id INTO v_pipeline_id
    FROM whatsapp_pipelines
    WHERE product_id = v_product.id
      AND is_default = true
    LIMIT 1;
    
    -- Si no existe, crear uno nuevo
    IF v_pipeline_id IS NULL THEN
      INSERT INTO whatsapp_pipelines (
        account_id,
        product_id,
        name,
        stages,
        is_default
      ) VALUES (
        NULL, -- Pipeline global por producto (no específico de cuenta)
        v_product.id,
        'Pipeline por Defecto',
        v_stages,
        true
      )
      RETURNING id INTO v_pipeline_id;
      
      RAISE NOTICE 'Pipeline por defecto creado para producto: % (ID: %)', v_product.nombre, v_product.id;
    ELSE
      RAISE NOTICE 'Pipeline por defecto ya existe para producto: % (ID: %)', v_product.nombre, v_product.id;
    END IF;
  END LOOP;
  
  -- Si no hay tabla products, intentar con almacen_central como fallback
  IF NOT FOUND THEN
    RAISE NOTICE 'No se encontraron productos en tabla products, intentando almacen_central...';
    
    FOR v_product IN 
      SELECT id, sku, nombre
      FROM almacen_central
      WHERE (sintetico = false OR sintetico IS NULL)
    LOOP
      -- Verificar si ya existe pipeline
      SELECT id INTO v_pipeline_id
      FROM whatsapp_pipelines
      WHERE product_id = v_product.id
        AND is_default = true
      LIMIT 1;
      
      -- Si no existe, crear uno nuevo
      IF v_pipeline_id IS NULL THEN
        INSERT INTO whatsapp_pipelines (
          account_id,
          product_id,
          name,
          stages,
          is_default
        ) VALUES (
          NULL,
          v_product.id,
          'Pipeline por Defecto',
          v_stages,
          true
        )
        RETURNING id INTO v_pipeline_id;
        
        RAISE NOTICE 'Pipeline por defecto creado para producto (almacen_central): % (ID: %)', v_product.nombre, v_product.id;
      END IF;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Proceso de creación de pipelines por defecto completado';
END $$;

-- Verificar pipelines creados
SELECT 
  p.id AS pipeline_id,
  pr.sku AS product_sku,
  pr.nombre AS product_name,
  pp.name AS pipeline_name,
  pp.is_default,
  jsonb_array_length(pp.stages) AS num_stages,
  pp.created_at
FROM whatsapp_pipelines pp
LEFT JOIN products pr ON pp.product_id = pr.id
LEFT JOIN products p ON pp.product_id = p.id
WHERE pp.is_default = true
ORDER BY pr.nombre;

