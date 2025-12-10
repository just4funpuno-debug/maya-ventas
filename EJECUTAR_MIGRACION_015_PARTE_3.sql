-- ================================================================
-- MIGRACIÓN 015 - PARTE 3: Pipelines por Defecto
-- ================================================================
-- EJECUTAR ESTA TERCERA PARTE (después de las Partes 1 y 2)
-- ================================================================

DO $$
DECLARE
  v_product RECORD;
  v_pipeline_id UUID;
  v_stages JSONB;
  v_has_products BOOLEAN;
  v_has_almacen BOOLEAN;
BEGIN
  v_stages := '[
    {"name": "Leads Entrantes", "order": 1, "color": "#3b82f6"},
    {"name": "Seguimiento", "order": 2, "color": "#f59e0b"},
    {"name": "Venta", "order": 3, "color": "#10b981"},
    {"name": "Cliente", "order": 4, "color": "#8b5cf6"}
  ]'::jsonb;
  
  -- Verificar qué tablas existen
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'products'
  ) INTO v_has_products;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'almacen_central'
  ) INTO v_has_almacen;
  
  -- Intentar con products primero
  IF v_has_products THEN
    FOR v_product IN 
      SELECT id, sku, nombre
      FROM products
      WHERE (sintetico = false OR sintetico IS NULL)
    LOOP
      SELECT id INTO v_pipeline_id
      FROM whatsapp_pipelines
      WHERE product_id = v_product.id
        AND is_default = true
      LIMIT 1;
      
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
        
        RAISE NOTICE 'Pipeline por defecto creado para producto: % (ID: %)', v_product.nombre, v_product.id;
      END IF;
    END LOOP;
  END IF;
  
  -- Si no hay products o no se encontraron, intentar con almacen_central
  IF NOT v_has_products OR NOT FOUND THEN
    IF v_has_almacen THEN
      RAISE NOTICE 'Usando almacen_central para crear pipelines...';
      
      FOR v_product IN 
        SELECT id, sku, nombre
        FROM almacen_central
        WHERE (sintetico = false OR sintetico IS NULL)
      LOOP
        SELECT id INTO v_pipeline_id
        FROM whatsapp_pipelines
        WHERE product_id = v_product.id
          AND is_default = true
        LIMIT 1;
        
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
    ELSE
      RAISE NOTICE 'No se encontraron tablas de productos (products ni almacen_central)';
    END IF;
  END IF;
  
  RAISE NOTICE 'Proceso de creación de pipelines por defecto completado';
END $$;

-- Verificar pipelines creados
SELECT 
  'Pipelines creados' AS verificacion,
  COUNT(*) AS total
FROM whatsapp_pipelines
WHERE is_default = true;

-- Mostrar pipelines creados
SELECT 
  pp.id AS pipeline_id,
  pp.name AS pipeline_name,
  pp.is_default,
  jsonb_array_length(pp.stages) AS num_stages,
  pp.created_at
FROM whatsapp_pipelines pp
WHERE pp.is_default = true
ORDER BY pp.created_at;

