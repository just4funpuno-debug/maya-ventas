-- Script combinado: Verifica y migra city_stock automáticamente
-- Este script verifica el estado actual y migra desde despachos confirmados si es necesario

-- ================================================================
-- PARTE 1: VERIFICACIÓN INICIAL
-- ================================================================

DO $$
DECLARE
  total_despachos INTEGER;
  total_city_stock INTEGER;
BEGIN
  -- Contar despachos confirmados
  SELECT COUNT(*) INTO total_despachos
  FROM dispatches
  WHERE status = 'confirmado';
  
  -- Contar registros en city_stock
  SELECT COUNT(*) INTO total_city_stock
  FROM city_stock;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN INICIAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Despachos confirmados: %', total_despachos;
  RAISE NOTICE 'Registros en city_stock: %', total_city_stock;
  RAISE NOTICE '========================================';
END $$;

-- Mostrar despachos confirmados
SELECT 
  'Despachos confirmados' as tipo,
  id,
  ciudad,
  fecha,
  status,
  items
FROM dispatches
WHERE status = 'confirmado'
ORDER BY fecha DESC, ciudad;

-- Mostrar city_stock actual
SELECT 
  'Stock actual por ciudad' as tipo,
  ciudad,
  COUNT(*) as total_registros,
  SUM(cantidad) as total_cantidad
FROM city_stock
GROUP BY ciudad
ORDER BY ciudad;

-- ================================================================
-- PARTE 2: MIGRACIÓN AUTOMÁTICA
-- ================================================================

DO $$
DECLARE
  dispatch_record RECORD;
  item_record RECORD;
  ciudad_normalizada TEXT;
  sku_item TEXT;
  cantidad_item INTEGER;
  total_procesados INTEGER := 0;
  total_items_procesados INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO MIGRACIÓN';
  RAISE NOTICE '========================================';
  
  -- Iterar sobre todos los despachos confirmados
  FOR dispatch_record IN 
    SELECT id, ciudad, items, fecha
    FROM dispatches
    WHERE status = 'confirmado'
    ORDER BY fecha DESC
  LOOP
    -- Normalizar ciudad
    ciudad_normalizada := LOWER(TRIM(dispatch_record.ciudad));
    ciudad_normalizada := REPLACE(ciudad_normalizada, ' ', '_');
    
    RAISE NOTICE 'Procesando despacho: % - Ciudad: % (normalizada: %)', 
      dispatch_record.id, dispatch_record.ciudad, ciudad_normalizada;
    
    -- Procesar cada item del despacho
    FOR item_record IN 
      SELECT 
        (value->>'sku')::TEXT as sku,
        (value->>'cantidad')::INTEGER as cantidad
      FROM jsonb_array_elements(dispatch_record.items)
    LOOP
      sku_item := item_record.sku;
      cantidad_item := item_record.cantidad;
      
      -- Solo procesar si hay SKU y cantidad válida
      IF sku_item IS NOT NULL AND cantidad_item > 0 THEN
        -- Insertar o actualizar city_stock
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (ciudad_normalizada, sku_item, cantidad_item)
        ON CONFLICT (ciudad, sku) 
        DO UPDATE SET cantidad = city_stock.cantidad + cantidad_item;
        
        total_items_procesados := total_items_procesados + 1;
        RAISE NOTICE '  ✓ SKU: % - Cantidad: %', sku_item, cantidad_item;
      END IF;
    END LOOP;
    
    total_procesados := total_procesados + 1;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Despachos procesados: %', total_procesados;
  RAISE NOTICE 'Items procesados: %', total_items_procesados;
  RAISE NOTICE '========================================';
END $$;

-- ================================================================
-- PARTE 3: VERIFICACIÓN FINAL
-- ================================================================

-- Resumen por ciudad
SELECT 
  'RESUMEN FINAL POR CIUDAD' as verificacion,
  ciudad,
  COUNT(*) as total_registros,
  SUM(cantidad) as total_cantidad,
  string_agg(sku || ':' || cantidad::text, ', ' ORDER BY sku) as detalle
FROM city_stock
GROUP BY ciudad
ORDER BY ciudad;

-- Resumen global
SELECT 
  'RESUMEN GLOBAL' as verificacion,
  (SELECT COUNT(*) FROM city_stock) as total_registros,
  (SELECT COUNT(DISTINCT ciudad) FROM city_stock) as ciudades_con_stock,
  (SELECT COUNT(DISTINCT sku) FROM city_stock) as skus_con_stock,
  (SELECT SUM(cantidad) FROM city_stock) as total_cantidad_global,
  CASE 
    WHEN (SELECT COUNT(*) FROM city_stock) > 0 
    THEN '✅ city_stock actualizado correctamente'
    ELSE '⚠️ No hay datos en city_stock - Confirma algunos despachos primero'
  END as estado;

-- Verificar ciudades esperadas
WITH ciudades_esperadas AS (
  SELECT unnest(ARRAY['el_alto', 'la_paz', 'oruro', 'sucre', 'potosi', 'tarija', 'cochabamba', 'santa_cruz']) as ciudad
)
SELECT 
  'CIUDADES ESPERADAS' as verificacion,
  ce.ciudad as ciudad_esperada,
  CASE 
    WHEN cs.ciudad IS NOT NULL THEN '✅ Tiene stock'
    ELSE '❌ Sin stock'
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

