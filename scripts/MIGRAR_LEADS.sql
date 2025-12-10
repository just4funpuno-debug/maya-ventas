-- ================================================================
-- FASE 2 - SUBFASE 2.2: Migrar whatsapp_leads sin producto
-- ================================================================
-- Objetivo: Asignar todos los leads sin product_id al producto "CARDIO PLUS"
-- Producto: CARDIO-P-HC3 (ID: 63db4ffc-9655-4d07-b478-09b099b2bf06)
-- ================================================================

-- ID del producto CARDIO PLUS (hardcodeado para seguridad)
DO $$
DECLARE
  v_product_id UUID := '63db4ffc-9655-4d07-b478-09b099b2bf06';
  v_count_before INT;
  v_count_after INT;
  v_count_updated INT;
BEGIN
  -- Contar leads sin producto antes de la migración
  SELECT COUNT(*) INTO v_count_before
  FROM whatsapp_leads
  WHERE product_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN DE whatsapp_leads';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Leads sin producto (antes): %', v_count_before;
  
  -- Verificar que el producto existe
  IF NOT EXISTS (SELECT 1 FROM almacen_central WHERE id = v_product_id) THEN
    RAISE EXCEPTION '❌ ERROR: Producto con ID % no existe en almacen_central', v_product_id;
  END IF;
  
  -- Actualizar leads sin producto
  UPDATE whatsapp_leads
  SET product_id = v_product_id
  WHERE product_id IS NULL;
  
  GET DIAGNOSTICS v_count_updated = ROW_COUNT;
  
  -- Contar leads sin producto después de la migración
  SELECT COUNT(*) INTO v_count_after
  FROM whatsapp_leads
  WHERE product_id IS NULL;
  
  RAISE NOTICE 'Leads actualizados: %', v_count_updated;
  RAISE NOTICE 'Leads sin producto (después): %', v_count_after;
  RAISE NOTICE '========================================';
  
  IF v_count_after > 0 THEN
    RAISE WARNING '⚠️ Aún quedan % leads sin producto', v_count_after;
  ELSE
    RAISE NOTICE '✅ Todos los leads ahora tienen producto asignado';
  END IF;
END $$;

-- Verificar resultado
SELECT 
  'whatsapp_leads' AS tabla,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS sin_producto,
  COUNT(*) FILTER (WHERE product_id = '63db4ffc-9655-4d07-b478-09b099b2bf06') AS asignados_cardio_plus
FROM whatsapp_leads;

