-- ================================================================
-- FASE 1 - SUBFASE 1.3: Migrar datos existentes - whatsapp_tags
-- ================================================================
-- Objetivo: Asignar product_id a etiquetas existentes basándose en account_id
-- ================================================================

DO $$
DECLARE
  v_count_before INT;
  v_count_after INT;
  v_count_updated INT;
  v_count_without_product INT;
BEGIN
  -- Contar etiquetas sin product_id antes de la migración
  SELECT COUNT(*) INTO v_count_before
  FROM whatsapp_tags
  WHERE product_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN DE whatsapp_tags';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Etiquetas sin product_id (antes): %', v_count_before;
  
  -- Actualizar etiquetas con product_id desde whatsapp_accounts
  UPDATE whatsapp_tags t
  SET product_id = wa.product_id
  FROM whatsapp_accounts wa
  WHERE t.account_id = wa.id
    AND t.product_id IS NULL
    AND wa.product_id IS NOT NULL;
  
  GET DIAGNOSTICS v_count_updated = ROW_COUNT;
  
  -- Contar etiquetas sin product_id después de la migración
  SELECT COUNT(*) INTO v_count_after
  FROM whatsapp_tags
  WHERE product_id IS NULL;
  
  -- Contar etiquetas con cuentas que no tienen product_id
  SELECT COUNT(*) INTO v_count_without_product
  FROM whatsapp_tags t
  INNER JOIN whatsapp_accounts wa ON t.account_id = wa.id
  WHERE t.product_id IS NULL
    AND wa.product_id IS NULL;
  
  RAISE NOTICE 'Etiquetas actualizadas: %', v_count_updated;
  RAISE NOTICE 'Etiquetas sin product_id (después): %', v_count_after;
  RAISE NOTICE 'Etiquetas con cuentas sin product_id: %', v_count_without_product;
  RAISE NOTICE '========================================';
  
  IF v_count_after > 0 THEN
    IF v_count_without_product > 0 THEN
      RAISE WARNING '⚠️ Aún quedan % etiquetas sin product_id (sus cuentas no tienen product_id asignado)', v_count_without_product;
    ELSE
      RAISE WARNING '⚠️ Aún quedan % etiquetas sin product_id (verificar datos)', v_count_after;
    END IF;
  ELSE
    RAISE NOTICE '✅ Todas las etiquetas ahora tienen product_id asignado';
  END IF;
END $$;

-- Verificar resultado
SELECT 
  'whatsapp_tags' AS tabla,
  COUNT(*) AS total_etiquetas,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS sin_producto,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) AS con_producto,
  COUNT(DISTINCT product_id) AS productos_distintos
FROM whatsapp_tags;

-- Mostrar etiquetas sin product_id (si las hay)
SELECT 
  t.id,
  t.name,
  t.account_id,
  wa.display_name AS account_name,
  wa.product_id AS account_product_id
FROM whatsapp_tags t
LEFT JOIN whatsapp_accounts wa ON t.account_id = wa.id
WHERE t.product_id IS NULL
LIMIT 10;

