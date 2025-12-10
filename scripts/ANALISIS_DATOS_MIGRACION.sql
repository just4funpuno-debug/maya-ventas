-- ================================================================
-- FASE 1 - SUBFASE 1.1: Análisis de Datos a Migrar
-- ================================================================
-- Objetivo: Identificar todos los registros con product_id = NULL
-- que necesitan ser migrados al producto "CARDIO PLUS" (SKU: CARDIO-P-HC3)
-- ================================================================

-- ================================================================
-- 1. OBTENER ID DEL PRODUCTO CARDIO PLUS (CARDIO-P-HC3)
-- ================================================================
-- Primero intentamos desde la tabla 'products', si no existe, desde 'almacen_central'
DO $$
DECLARE
  v_product_id UUID;
  v_product_name TEXT;
  v_product_sku TEXT;
BEGIN
  -- Intentar obtener desde 'products'
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    SELECT id, nombre, sku INTO v_product_id, v_product_name, v_product_sku
    FROM products
    WHERE sku = 'CARDIO-P-HC3'
    LIMIT 1;
  END IF;
  
  -- Si no se encontró, intentar desde 'almacen_central'
  IF v_product_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central') THEN
    SELECT id, nombre, sku INTO v_product_id, v_product_name, v_product_sku
    FROM almacen_central
    WHERE sku = 'CARDIO-P-HC3'
    LIMIT 1;
  END IF;
  
  -- Mostrar resultado
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE '✅ Producto encontrado:';
    RAISE NOTICE '   ID: %', v_product_id;
    RAISE NOTICE '   Nombre: %', v_product_name;
    RAISE NOTICE '   SKU: %', v_product_sku;
  ELSE
    RAISE WARNING '❌ Producto CARDIO-P-HC3 NO encontrado. Verifica que exista en products o almacen_central.';
  END IF;
END $$;

-- ================================================================
-- 2. ANÁLISIS DE whatsapp_accounts SIN PRODUCTO
-- ================================================================
SELECT 
  'whatsapp_accounts' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS registros_sin_producto,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) AS registros_con_producto,
  COUNT(*) FILTER (WHERE active = true AND product_id IS NULL) AS activos_sin_producto,
  COUNT(*) FILTER (WHERE active = false AND product_id IS NULL) AS inactivos_sin_producto
FROM whatsapp_accounts;

-- Detalle de cuentas sin producto
SELECT 
  id,
  display_name,
  phone_number,
  active,
  created_at
FROM whatsapp_accounts
WHERE product_id IS NULL
ORDER BY created_at DESC;

-- ================================================================
-- 3. ANÁLISIS DE whatsapp_leads SIN PRODUCTO
-- ================================================================
SELECT 
  'whatsapp_leads' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS registros_sin_producto,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) AS registros_con_producto,
  COUNT(*) FILTER (WHERE status = 'active' AND product_id IS NULL) AS activos_sin_producto,
  COUNT(*) FILTER (WHERE status IN ('won', 'lost') AND product_id IS NULL) AS cerrados_sin_producto
FROM whatsapp_leads;

-- Detalle de leads sin producto
SELECT 
  l.id,
  l.pipeline_stage,
  l.status,
  l.lead_score,
  l.estimated_value,
  c.name AS contact_name,
  c.phone AS contact_phone,
  wa.display_name AS account_name,
  l.created_at
FROM whatsapp_leads l
INNER JOIN whatsapp_contacts c ON l.contact_id = c.id
INNER JOIN whatsapp_accounts wa ON l.account_id = wa.id
WHERE l.product_id IS NULL
ORDER BY l.created_at DESC;

-- ================================================================
-- 4. ANÁLISIS DE whatsapp_pipelines SIN PRODUCTO
-- ================================================================
SELECT 
  'whatsapp_pipelines' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS registros_sin_producto,
  COUNT(*) FILTER (WHERE product_id IS NOT NULL) AS registros_con_producto,
  COUNT(*) FILTER (WHERE is_default = true AND product_id IS NULL) AS default_sin_producto
FROM whatsapp_pipelines;

-- Detalle de pipelines sin producto
SELECT 
  id,
  name,
  is_default,
  account_id,
  created_at
FROM whatsapp_pipelines
WHERE product_id IS NULL
ORDER BY created_at DESC;

-- ================================================================
-- 5. ANÁLISIS DE DATOS RELACIONADOS (para referencia)
-- ================================================================
-- Secuencias relacionadas a cuentas sin producto
SELECT 
  'whatsapp_sequences' AS tabla,
  COUNT(*) AS total_secuencias,
  COUNT(*) FILTER (WHERE wa.product_id IS NULL) AS secuencias_cuentas_sin_producto
FROM whatsapp_sequences ws
INNER JOIN whatsapp_accounts wa ON ws.account_id = wa.id;

-- Contactos relacionados a cuentas sin producto
SELECT 
  'whatsapp_contacts' AS tabla,
  COUNT(*) AS total_contactos,
  COUNT(*) FILTER (WHERE wa.product_id IS NULL) AS contactos_cuentas_sin_producto
FROM whatsapp_contacts wc
INNER JOIN whatsapp_accounts wa ON wc.account_id = wa.id;

-- Mensajes relacionados a cuentas sin producto
SELECT 
  'whatsapp_messages' AS tabla,
  COUNT(*) AS total_mensajes,
  COUNT(*) FILTER (WHERE wa.product_id IS NULL) AS mensajes_cuentas_sin_producto
FROM whatsapp_messages wm
INNER JOIN whatsapp_accounts wa ON wm.account_id = wa.id;

-- ================================================================
-- 6. RESUMEN GENERAL
-- ================================================================
SELECT 
  'RESUMEN GENERAL' AS seccion,
  (SELECT COUNT(*) FROM whatsapp_accounts WHERE product_id IS NULL) AS cuentas_sin_producto,
  (SELECT COUNT(*) FROM whatsapp_leads WHERE product_id IS NULL) AS leads_sin_producto,
  (SELECT COUNT(*) FROM whatsapp_pipelines WHERE product_id IS NULL) AS pipelines_sin_producto,
  (
    (SELECT COUNT(*) FROM whatsapp_accounts WHERE product_id IS NULL) +
    (SELECT COUNT(*) FROM whatsapp_leads WHERE product_id IS NULL) +
    (SELECT COUNT(*) FROM whatsapp_pipelines WHERE product_id IS NULL)
  ) AS total_registros_a_migrar;

-- ================================================================
-- 7. VERIFICACIÓN DE INTEGRIDAD
-- ================================================================
-- Verificar si hay leads sin producto pero con cuenta que tiene producto
SELECT 
  'VERIFICACIÓN INTEGRIDAD' AS tipo,
  COUNT(*) AS leads_sin_producto_con_cuenta_con_producto
FROM whatsapp_leads l
INNER JOIN whatsapp_accounts wa ON l.account_id = wa.id
WHERE l.product_id IS NULL 
  AND wa.product_id IS NOT NULL;

-- Verificar si hay pipelines sin producto pero con cuenta que tiene producto
SELECT 
  'VERIFICACIÓN INTEGRIDAD' AS tipo,
  COUNT(*) AS pipelines_sin_producto_con_cuenta_con_producto
FROM whatsapp_pipelines p
INNER JOIN whatsapp_accounts wa ON p.account_id = wa.id
WHERE p.product_id IS NULL 
  AND wa.product_id IS NOT NULL;

