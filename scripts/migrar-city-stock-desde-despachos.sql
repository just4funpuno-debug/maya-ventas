-- Script para migrar/actualizar city_stock desde despachos confirmados
-- Este script suma el stock de todos los despachos confirmados a city_stock

-- ================================================================
-- 1. VERIFICAR DESPACHOS CONFIRMADOS
-- ================================================================

SELECT 
  'Despachos confirmados a procesar' as verificacion,
  COUNT(*) as total_despachos_confirmados
FROM dispatches
WHERE status = 'confirmado';

-- ================================================================
-- 2. PROCESAR CADA DESPACHO CONFIRMADO Y SUMAR A city_stock
-- ================================================================

DO $$
DECLARE
  dispatch_record RECORD;
  item_record RECORD;
  ciudad_normalizada TEXT;
  sku_item TEXT;
  cantidad_item INTEGER;
BEGIN
  -- Iterar sobre todos los despachos confirmados
  FOR dispatch_record IN 
    SELECT id, ciudad, items, fecha
    FROM dispatches
    WHERE status = 'confirmado'
  LOOP
    -- Normalizar ciudad
    ciudad_normalizada := LOWER(TRIM(dispatch_record.ciudad));
    ciudad_normalizada := REPLACE(ciudad_normalizada, ' ', '_');
    
    -- Procesar cada item del despacho
    FOR item_record IN 
      SELECT * FROM jsonb_array_elements(dispatch_record.items)
    LOOP
      sku_item := item_record->>'sku';
      cantidad_item := (item_record->>'cantidad')::INTEGER;
      
      -- Solo procesar si hay SKU y cantidad válida
      IF sku_item IS NOT NULL AND cantidad_item > 0 THEN
        -- Insertar o actualizar city_stock
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (ciudad_normalizada, sku_item, cantidad_item)
        ON CONFLICT (ciudad, sku) 
        DO UPDATE SET cantidad = city_stock.cantidad + cantidad_item;
        
        RAISE NOTICE 'Procesado: % - % - cantidad: %', ciudad_normalizada, sku_item, cantidad_item;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Migración de city_stock desde despachos completada';
END $$;

-- ================================================================
-- 3. VERIFICAR RESULTADO
-- ================================================================

SELECT 
  'Resultado de migración' as verificacion,
  ciudad,
  COUNT(*) as total_registros,
  SUM(cantidad) as total_cantidad
FROM city_stock
GROUP BY ciudad
ORDER BY ciudad;

-- ================================================================
-- 4. RESUMEN FINAL
-- ================================================================

SELECT 
  'RESUMEN FINAL' as verificacion,
  (SELECT COUNT(*) FROM city_stock) as total_registros_city_stock,
  (SELECT COUNT(DISTINCT ciudad) FROM city_stock) as ciudades_con_stock,
  (SELECT COUNT(DISTINCT sku) FROM city_stock) as skus_con_stock,
  (SELECT SUM(cantidad) FROM city_stock) as total_cantidad_global,
  CASE 
    WHEN (SELECT COUNT(*) FROM city_stock) > 0 
    THEN '✅ city_stock actualizado correctamente'
    ELSE '⚠️ No se encontraron despachos confirmados para migrar'
  END as estado;


