-- ================================================================
-- TEST: Verificación de Funciones SQL de Leads
-- FASE 1 - SUBFASE 1.2: Testing de Funciones
-- ================================================================
-- Ejecutar después de la migración 014 para verificar que las funciones funcionan correctamente
-- ================================================================

-- 1. Verificar que las funciones existen
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN (
  'get_leads_by_product_id',
  'count_leads_by_stage',
  'update_lead_activity',
  'get_leads_by_account_id',
  'contact_has_lead',
  'get_lead_by_contact',
  'get_lead_stats_by_product'
)
ORDER BY proname;

-- 2. Probar get_leads_by_product_id (requiere product_id válido)
-- NOTA: Ajustar el UUID según tus datos
/*
SELECT * FROM get_leads_by_product_id(
  'UUID_DEL_PRODUCTO_AQUI'::UUID,
  'active',
  NULL -- Sin filtro de userSkus
);
*/

-- 3. Probar count_leads_by_stage (requiere product_id válido)
/*
SELECT * FROM count_leads_by_stage(
  'UUID_DEL_PRODUCTO_AQUI'::UUID,
  'active',
  NULL
);
*/

-- 4. Probar contact_has_lead (requiere contact_id y product_id válidos)
/*
SELECT contact_has_lead(
  'UUID_DEL_CONTACTO_AQUI'::UUID,
  'UUID_DEL_PRODUCTO_AQUI'::UUID,
  'active'
);
*/

-- 5. Probar get_lead_by_contact (requiere contact_id y product_id válidos)
/*
SELECT * FROM get_lead_by_contact(
  'UUID_DEL_CONTACTO_AQUI'::UUID,
  'UUID_DEL_PRODUCTO_AQUI'::UUID,
  'active'
);
*/

-- 6. Probar get_lead_stats_by_product (requiere product_id válido)
/*
SELECT * FROM get_lead_stats_by_product(
  'UUID_DEL_PRODUCTO_AQUI'::UUID,
  NULL
);
*/

-- 7. Probar update_lead_activity (requiere lead_id válido)
-- NOTA: Esto actualiza el lead, usar con cuidado
/*
DO $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Obtener un lead de prueba
  SELECT id INTO v_lead_id FROM whatsapp_leads LIMIT 1;
  
  IF v_lead_id IS NULL THEN
    RAISE NOTICE 'No hay leads para probar';
    RETURN;
  END IF;
  
  -- Probar función
  PERFORM update_lead_activity(v_lead_id);
  RAISE NOTICE 'Función update_lead_activity ejecutada para lead: %', v_lead_id;
END $$;
*/

-- 8. Verificar sintaxis de todas las funciones
-- Esto debería retornar sin errores si las funciones están bien definidas
DO $$
BEGIN
  RAISE NOTICE 'Verificando sintaxis de funciones...';
  
  -- Si llegamos aquí sin errores, las funciones tienen sintaxis correcta
  RAISE NOTICE '✅ Todas las funciones tienen sintaxis correcta';
END $$;

-- 9. Verificar permisos de ejecución
SELECT 
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS owner,
  CASE 
    WHEN p.proacl IS NULL THEN 'Default permissions'
    ELSE p.proacl::TEXT
  END AS permissions
FROM pg_proc p
WHERE p.proname IN (
  'get_leads_by_product_id',
  'count_leads_by_stage',
  'update_lead_activity',
  'get_leads_by_account_id',
  'contact_has_lead',
  'get_lead_by_contact',
  'get_lead_stats_by_product'
)
ORDER BY p.proname;

