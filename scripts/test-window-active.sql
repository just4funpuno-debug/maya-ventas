-- ============================================================================
-- TEST: Verificar función is_window_active
-- ============================================================================

-- Test 1: Ventana activa (expira en el futuro)
SELECT 
  is_window_active(NOW() + INTERVAL '12 hours') as test1_activa,
  CASE 
    WHEN is_window_active(NOW() + INTERVAL '12 hours') = true THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as resultado1;

-- Test 2: Ventana cerrada (expiró hace 1 hora)
SELECT 
  is_window_active(NOW() - INTERVAL '1 hour') as test2_cerrada,
  CASE 
    WHEN is_window_active(NOW() - INTERVAL '1 hour') = false THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as resultado2;

-- Test 3: Ventana NULL (sin interacción)
SELECT 
  is_window_active(NULL) as test3_null,
  CASE 
    WHEN is_window_active(NULL) = false THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as resultado3;

-- Test 4: Usar en query real
SELECT 
  id,
  phone,
  name,
  window_expires_at,
  is_window_active(window_expires_at) as window_active,
  CASE 
    WHEN is_window_active(window_expires_at) THEN '✅ Activa'
    ELSE '❌ Cerrada'
  END as estado
FROM whatsapp_contacts
LIMIT 5;

