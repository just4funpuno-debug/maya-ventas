-- ================================================================
-- FASE 2 - SUBFASE 2.4: Verificación Post-Migración
-- ================================================================
-- Objetivo: Verificar que todos los datos fueron migrados correctamente
-- Producto: CARDIO PLUS (ID: 63db4ffc-9655-4d07-b478-09b099b2bf06)
-- ================================================================

-- ID del producto CARDIO PLUS
DO $$
DECLARE
  v_product_id UUID := '63db4ffc-9655-4d07-b478-09b099b2bf06';
  v_accounts_sin_producto INT;
  v_leads_sin_producto INT;
  v_pipelines_sin_producto INT;
  v_total_sin_producto INT;
BEGIN
  -- Contar registros sin producto
  SELECT COUNT(*) INTO v_accounts_sin_producto
  FROM whatsapp_accounts
  WHERE product_id IS NULL;
  
  SELECT COUNT(*) INTO v_leads_sin_producto
  FROM whatsapp_leads
  WHERE product_id IS NULL;
  
  SELECT COUNT(*) INTO v_pipelines_sin_producto
  FROM whatsapp_pipelines
  WHERE product_id IS NULL;
  
  v_total_sin_producto := v_accounts_sin_producto + v_leads_sin_producto + v_pipelines_sin_producto;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN POST-MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cuentas sin producto: %', v_accounts_sin_producto;
  RAISE NOTICE 'Leads sin producto: %', v_leads_sin_producto;
  RAISE NOTICE 'Pipelines sin producto: %', v_pipelines_sin_producto;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'TOTAL sin producto: %', v_total_sin_producto;
  RAISE NOTICE '========================================';
  
  IF v_total_sin_producto = 0 THEN
    RAISE NOTICE '✅ ÉXITO: Todos los registros tienen producto asignado';
  ELSE
    RAISE WARNING '⚠️ ADVERTENCIA: Aún quedan % registros sin producto', v_total_sin_producto;
  END IF;
END $$;

-- Resumen detallado por tabla
SELECT 
  'RESUMEN GENERAL' AS tipo,
  (SELECT COUNT(*) FROM whatsapp_accounts WHERE product_id IS NULL) AS cuentas_sin_producto,
  (SELECT COUNT(*) FROM whatsapp_leads WHERE product_id IS NULL) AS leads_sin_producto,
  (SELECT COUNT(*) FROM whatsapp_pipelines WHERE product_id IS NULL) AS pipelines_sin_producto,
  (
    (SELECT COUNT(*) FROM whatsapp_accounts WHERE product_id IS NULL) +
    (SELECT COUNT(*) FROM whatsapp_leads WHERE product_id IS NULL) +
    (SELECT COUNT(*) FROM whatsapp_pipelines WHERE product_id IS NULL)
  ) AS total_sin_producto,
  (SELECT COUNT(*) FROM whatsapp_accounts WHERE product_id = '63db4ffc-9655-4d07-b478-09b099b2bf06') AS cuentas_cardio_plus,
  (SELECT COUNT(*) FROM whatsapp_leads WHERE product_id = '63db4ffc-9655-4d07-b478-09b099b2bf06') AS leads_cardio_plus,
  (SELECT COUNT(*) FROM whatsapp_pipelines WHERE product_id = '63db4ffc-9655-4d07-b478-09b099b2bf06') AS pipelines_cardio_plus;

-- Verificar integridad: leads sin producto pero con cuenta que tiene producto
SELECT 
  'VERIFICACIÓN INTEGRIDAD' AS tipo,
  COUNT(*) AS leads_sin_producto_con_cuenta_con_producto
FROM whatsapp_leads l
INNER JOIN whatsapp_accounts wa ON l.account_id = wa.id
WHERE l.product_id IS NULL 
  AND wa.product_id IS NOT NULL;

-- Verificar integridad: pipelines sin producto pero con cuenta que tiene producto
SELECT 
  'VERIFICACIÓN INTEGRIDAD' AS tipo,
  COUNT(*) AS pipelines_sin_producto_con_cuenta_con_producto
FROM whatsapp_pipelines p
INNER JOIN whatsapp_accounts wa ON p.account_id = wa.id
WHERE p.product_id IS NULL 
  AND wa.product_id IS NOT NULL;

