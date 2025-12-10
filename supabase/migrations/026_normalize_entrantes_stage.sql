-- ============================================================================
-- MIGRACIÓN 026: Normalizar etapa "Leads Entrantes" y asegurar que existe
-- FASE 3: Protección y normalización de etapa protegida
-- ============================================================================

-- 1. Normalizar nombre de etapa "entrantes" a "Leads Entrantes" en pipelines
UPDATE whatsapp_pipelines
SET stages = (
  SELECT jsonb_agg(
    CASE 
      WHEN stage->>'name' ILIKE '%entrantes%' THEN
        jsonb_set(stage, '{name}', '"Leads Entrantes"')
      ELSE stage
    END
  )
  FROM jsonb_array_elements(stages) AS stage
)
WHERE stages IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(stages) AS stage
    WHERE stage->>'name' ILIKE '%entrantes%'
      AND stage->>'name' != 'Leads Entrantes'
  );

-- 2. Asegurar que todos los pipelines por defecto tengan "Leads Entrantes"
DO $$
DECLARE
  pipeline_record RECORD;
  has_entrantes BOOLEAN;
  min_order_val INTEGER;
BEGIN
  FOR pipeline_record IN 
    SELECT id, stages, product_id
    FROM whatsapp_pipelines
    WHERE is_default = true
  LOOP
    -- Verificar si tiene etapa "entrantes"
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(pipeline_record.stages) AS stage
      WHERE stage->>'name' ILIKE '%entrantes%'
    ) INTO has_entrantes;
    
    -- Si no tiene, agregarla
    IF NOT has_entrantes THEN
      -- Obtener el mínimo order existente
      SELECT COALESCE(MIN((stage->>'order')::int), 0) - 1
      INTO min_order_val
      FROM jsonb_array_elements(pipeline_record.stages) AS stage;
      
      -- Agregar "Leads Entrantes" al inicio y actualizar orders
      UPDATE whatsapp_pipelines
      SET stages = (
        SELECT jsonb_agg(
          CASE 
            WHEN stage->>'name' = 'Leads Entrantes' THEN
              jsonb_build_object(
                'name', 'Leads Entrantes',
                'order', min_order_val,
                'color', COALESCE(stage->>'color', '#3b82f6'),
                'sequence_id', CASE WHEN stage->>'sequence_id' = 'null' THEN NULL ELSE stage->>'sequence_id' END
              )
            ELSE
              jsonb_set(
                stage,
                '{order}',
                to_jsonb((stage->>'order')::int + 1)
              )
          END
          ORDER BY 
            CASE WHEN stage->>'name' = 'Leads Entrantes' THEN 0 ELSE 1 END,
            (stage->>'order')::int
        )
        FROM (
          -- Agregar "Leads Entrantes" si no existe
          SELECT jsonb_build_object(
            'name', 'Leads Entrantes',
            'order', min_order_val,
            'color', '#3b82f6',
            'sequence_id', NULL
          ) AS stage
          UNION ALL
          -- Mantener etapas existentes
          SELECT stage
          FROM jsonb_array_elements(pipeline_record.stages) AS stage
        ) AS all_stages
      )
      WHERE id = pipeline_record.id;
      
      RAISE NOTICE 'Agregada etapa "Leads Entrantes" al pipeline %', pipeline_record.id;
    END IF;
  END LOOP;
END $$;

-- 3. Verificar resultados
DO $$
DECLARE
  pipelines_count INTEGER;
  entrantes_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT id)
  INTO pipelines_count
  FROM whatsapp_pipelines
  WHERE is_default = true;
  
  SELECT COUNT(DISTINCT p.id)
  INTO entrantes_count
  FROM whatsapp_pipelines p
  CROSS JOIN jsonb_array_elements(p.stages) AS stage
  WHERE p.is_default = true
    AND stage->>'name' ILIKE '%entrantes%';
  
  RAISE NOTICE 'Pipelines por defecto: %', pipelines_count;
  RAISE NOTICE 'Pipelines con "Leads Entrantes": %', entrantes_count;
  
  IF pipelines_count = entrantes_count THEN
    RAISE NOTICE '✅ Todos los pipelines tienen la etapa "Leads Entrantes"';
  ELSE
    RAISE WARNING '⚠️ Algunos pipelines no tienen la etapa "Leads Entrantes"';
  END IF;
END $$;

