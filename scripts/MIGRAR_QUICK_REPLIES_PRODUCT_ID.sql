-- ================================================================
-- FASE 1 - SUBFASE 1.3: Migrar datos existentes - whatsapp_quick_replies
-- ================================================================
-- Objetivo: Asignar product_id a respuestas rápidas existentes basándose en account_id
-- ================================================================

DO $$
DECLARE
  v_count_before INT;
  v_count_after INT;
  v_count_updated INT;
  v_count_without_product INT;
BEGIN
  -- Contar respuestas rápidas sin product_id antes de la migración
  SELECT COUNT(*) INTO v_count_before
  FROM whatsapp_quick_replies
  WHERE product_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN DE whatsapp_quick_replies';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Respuestas rápidas sin product_id (antes): %', v_count_before;
  
  -- Actualizar respuestas rápidas con product_id desde whatsapp_accounts
  UPDATE whatsapp_quick_replies qr
  SET product_id = wa.product_id
  FROM whatsapp_accounts wa
  WHERE qr.account_id = wa.id
    AND qr.product_id IS NULL
    AND wa.product_id IS NOT NULL;
  
  GET DIAGNOSTICS v_count_updated = ROW_COUNT;
  
  -- Contar respuestas rápidas sin product_id después de la migración
  SELECT COUNT(*) INTO v_count_after
  FROM whatsapp_quick_replies
  WHERE product_id IS NULL;
  
  -- Contar respuestas rápidas con cuentas que no tienen product_id
  SELECT COUNT(*) INTO v_count_without_product
  FROM whatsapp_quick_replies qr
  INNER JOIN whatsapp_accounts wa ON qr.account_id = wa.id
  WHERE qr.product_id IS NULL
    AND wa.product_id IS NULL;
  
  RAISE NOTICE 'Respuestas rápidas actualizadas: %', v_count_updated;
  RAISE NOTICE 'Respuestas rápidas sin product_id (después): %', v_count_after;
  RAISE NOTICE 'Respuestas rápidas con cuentas sin product_id: %', v_count_without_product;
  RAISE NOTICE '========================================';
  
  IF v_count_after > 0 THEN
    IF v_count_without_product > 0 THEN
      RAISE WARNING '⚠️ Aún quedan % respuestas rápidas sin product_id (sus cuentas no tienen product_id asignado)', v_count_without_product;
    ELSE
      RAISE WARNING '⚠️ Aún quedan % respuestas rápidas sin product_id (verificar datos)', v_count_after;
    END IF;
  ELSE
    RAISE NOTICE '✅ Todas las respuestas rápidas ahora tienen product_id asignado';
  END IF;
END $$;

-- Verificar resultado
SELECT 
  'whatsapp_quick_replies' AS tabla,
  COUNT(*) AS total_respuestas_rapidas,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS sin_producto,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) AS con_producto,
  COUNT(DISTINCT product_id) AS productos_distintos
FROM whatsapp_quick_replies;

-- Mostrar respuestas rápidas sin product_id (si las hay)
SELECT 
  qr.id,
  qr.trigger,
  qr.name,
  qr.account_id,
  wa.display_name AS account_name,
  wa.product_id AS account_product_id
FROM whatsapp_quick_replies qr
LEFT JOIN whatsapp_accounts wa ON qr.account_id = wa.id
WHERE qr.product_id IS NULL
LIMIT 10;

