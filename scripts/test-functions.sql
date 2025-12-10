-- ============================================================================
-- SCRIPT DE TESTING PARA FUNCIONES SQL AUXILIARES
-- Ejecutar después de la migración 002 para verificar que todas las funciones funcionan
-- ============================================================================

-- ============================================================================
-- PREPARACIÓN: Crear datos de prueba
-- ============================================================================

-- Limpiar datos de prueba anteriores (opcional, comentar si quieres mantener datos)
-- DELETE FROM puppeteer_queue WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone LIKE 'TEST%');
-- DELETE FROM whatsapp_messages WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone LIKE 'TEST%');
-- DELETE FROM whatsapp_contacts WHERE phone LIKE 'TEST%';
-- DELETE FROM whatsapp_sequences WHERE name LIKE 'TEST%';
-- DELETE FROM whatsapp_accounts WHERE phone_number LIKE 'TEST%';

-- Crear cuenta de prueba
INSERT INTO whatsapp_accounts (
  phone_number_id,
  business_account_id,
  access_token,
  verify_token,
  phone_number,
  display_name,
  active
) VALUES (
  'TEST_PHONE_NUMBER_ID',
  'TEST_BUSINESS_ACCOUNT_ID',
  'TEST_ACCESS_TOKEN',
  'TEST_VERIFY_TOKEN',
  'TEST_123456789',
  'Cuenta de Prueba',
  true
) ON CONFLICT (phone_number_id) DO NOTHING
RETURNING id AS test_account_id;

-- Guardar account_id para usar en pruebas
DO $$
DECLARE
  v_account_id UUID;
  v_sequence_id UUID;
  v_contact_id_1 UUID;
  v_contact_id_2 UUID;
  v_contact_id_3 UUID;
BEGIN
  -- Obtener account_id
  SELECT id INTO v_account_id FROM whatsapp_accounts WHERE phone_number_id = 'TEST_PHONE_NUMBER_ID';
  
  IF v_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No se pudo crear cuenta de prueba';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Cuenta de prueba creada: %', v_account_id;
  
  -- Crear secuencia de prueba
  INSERT INTO whatsapp_sequences (
    account_id,
    name,
    description,
    active
  ) VALUES (
    v_account_id,
    'TEST Secuencia Básica',
    'Secuencia de prueba con 3 mensajes',
    true
  ) ON CONFLICT DO NOTHING
  RETURNING id INTO v_sequence_id;
  
  -- Si no se creó, obtener existente
  IF v_sequence_id IS NULL THEN
    SELECT id INTO v_sequence_id FROM whatsapp_sequences WHERE name = 'TEST Secuencia Básica';
  END IF;
  
  RAISE NOTICE '✅ Secuencia de prueba creada: %', v_sequence_id;
  
  -- Crear mensajes de secuencia
  INSERT INTO whatsapp_sequence_messages (
    sequence_id,
    message_number,
    message_type,
    content_text,
    delay_hours_from_previous,
    order_position,
    active
  ) VALUES
    (v_sequence_id, 1, 'text', 'Mensaje 1 de prueba', 0, 1, true),
    (v_sequence_id, 2, 'text', 'Mensaje 2 de prueba', 2, 2, true),
    (v_sequence_id, 3, 'text', 'Mensaje 3 de prueba', 4, 3, true)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Mensajes de secuencia creados';
  
  -- Crear contactos de prueba
  -- Contacto 1: Recién creado (< 72h, Free Entry Point activo)
  INSERT INTO whatsapp_contacts (
    account_id,
    phone,
    name,
    sequence_id,
    sequence_active,
    sequence_position,
    sequence_started_at,
    created_at
  ) VALUES (
    v_account_id,
    'TEST_CONTACT_1',
    'Contacto Prueba 1',
    v_sequence_id,
    true,
    0,
    NOW(),
    NOW() - INTERVAL '1 hour' -- Creado hace 1 hora
  ) ON CONFLICT (account_id, phone) DO UPDATE
  SET sequence_id = EXCLUDED.sequence_id,
      sequence_active = EXCLUDED.sequence_active,
      sequence_position = EXCLUDED.sequence_position,
      sequence_started_at = EXCLUDED.sequence_started_at
  RETURNING id INTO v_contact_id_1;
  
  -- Contacto 2: Con ventana 24h activa
  INSERT INTO whatsapp_contacts (
    account_id,
    phone,
    name,
    sequence_id,
    sequence_active,
    sequence_position,
    sequence_started_at,
    last_interaction_at,
    last_interaction_source,
    window_expires_at,
    created_at
  ) VALUES (
    v_account_id,
    'TEST_CONTACT_2',
    'Contacto Prueba 2',
    v_sequence_id,
    true,
    1,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 hours', -- Última interacción hace 2 horas
    'client',
    NOW() + INTERVAL '22 hours', -- Ventana expira en 22 horas
    NOW() - INTERVAL '5 days' -- Creado hace 5 días
  ) ON CONFLICT (account_id, phone) DO UPDATE
  SET sequence_id = EXCLUDED.sequence_id,
      sequence_active = EXCLUDED.sequence_active,
      sequence_position = EXCLUDED.sequence_position,
      sequence_started_at = EXCLUDED.sequence_started_at,
      last_interaction_at = EXCLUDED.last_interaction_at,
      window_expires_at = EXCLUDED.window_expires_at
  RETURNING id INTO v_contact_id_2;
  
  -- Contacto 3: Sin ventana 24h (cerrada)
  INSERT INTO whatsapp_contacts (
    account_id,
    phone,
    name,
    sequence_id,
    sequence_active,
    sequence_position,
    sequence_started_at,
    last_interaction_at,
    last_interaction_source,
    window_expires_at,
    created_at
  ) VALUES (
    v_account_id,
    'TEST_CONTACT_3',
    'Contacto Prueba 3',
    v_sequence_id,
    true,
    0,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '25 hours', -- Última interacción hace 25 horas (ventana cerrada)
    'client',
    NOW() - INTERVAL '1 hour', -- Ventana expiró hace 1 hora
    NOW() - INTERVAL '5 days' -- Creado hace 5 días
  ) ON CONFLICT (account_id, phone) DO UPDATE
  SET sequence_id = EXCLUDED.sequence_id,
      sequence_active = EXCLUDED.sequence_active,
      sequence_position = EXCLUDED.sequence_position,
      sequence_started_at = EXCLUDED.sequence_started_at,
      last_interaction_at = EXCLUDED.last_interaction_at,
      window_expires_at = EXCLUDED.window_expires_at
  RETURNING id INTO v_contact_id_3;
  
  RAISE NOTICE '✅ Contactos de prueba creados:';
  RAISE NOTICE '   - Contacto 1 (Free Entry Point): %', v_contact_id_1;
  RAISE NOTICE '   - Contacto 2 (Ventana activa): %', v_contact_id_2;
  RAISE NOTICE '   - Contacto 3 (Ventana cerrada): %', v_contact_id_3;
END $$;

-- ============================================================================
-- TEST 1: calculate_window_24h
-- ============================================================================

SELECT 'TEST 1: calculate_window_24h' as test_name;

-- Test 1.1: Contacto con última interacción reciente
SELECT 
  'Test 1.1: Ventana activa' as scenario,
  c.name,
  c.last_interaction_at,
  w.window_expires_at,
  w.window_active
FROM whatsapp_contacts c
CROSS JOIN LATERAL calculate_window_24h(c.id) w
WHERE c.phone = 'TEST_CONTACT_2';

-- Test 1.2: Contacto sin interacciones
SELECT 
  'Test 1.2: Sin interacciones' as scenario,
  c.name,
  c.last_interaction_at,
  w.window_expires_at,
  w.window_active
FROM whatsapp_contacts c
CROSS JOIN LATERAL calculate_window_24h(c.id) w
WHERE c.phone = 'TEST_CONTACT_1';

-- ============================================================================
-- TEST 2: update_contact_interaction
-- ============================================================================

SELECT 'TEST 2: update_contact_interaction' as test_name;

-- Test 2.1: Actualizar con source 'client'
SELECT 
  'Test 2.1: Actualizar con client' as scenario,
  u.updated,
  u.window_expires_at,
  u.window_active
FROM whatsapp_contacts c
CROSS JOIN LATERAL update_contact_interaction(c.id, 'client', NOW()) u
WHERE c.phone = 'TEST_CONTACT_1'
LIMIT 1;

-- Verificar que se actualizó
SELECT 
  'Verificación: Contador client_responses_count' as check_name,
  name,
  client_responses_count,
  responded_ever,
  last_interaction_source
FROM whatsapp_contacts
WHERE phone = 'TEST_CONTACT_1';

-- Test 2.2: Actualizar con source 'cloud_api'
SELECT 
  'Test 2.2: Actualizar con cloud_api' as scenario,
  u.updated,
  u.window_expires_at,
  u.window_active
FROM whatsapp_contacts c
CROSS JOIN LATERAL update_contact_interaction(c.id, 'cloud_api', NOW()) u
WHERE c.phone = 'TEST_CONTACT_2'
LIMIT 1;

-- Verificar contador
SELECT 
  'Verificación: Contador messages_sent_via_cloud_api' as check_name,
  name,
  messages_sent_via_cloud_api,
  total_messages_sent
FROM whatsapp_contacts
WHERE phone = 'TEST_CONTACT_2';

-- ============================================================================
-- TEST 3: check_sequence_next_message
-- ============================================================================

SELECT 'TEST 3: check_sequence_next_message' as test_name;

-- Test 3.1: Contacto en posición 0 (debe enviar mensaje 1)
SELECT 
  'Test 3.1: Contacto en posición 0' as scenario,
  c.name,
  c.sequence_position,
  n.should_send,
  n.message_number,
  n.message_type,
  n.content_text
FROM whatsapp_contacts c
CROSS JOIN LATERAL check_sequence_next_message(c.id) n
WHERE c.phone = 'TEST_CONTACT_1';

-- Test 3.2: Contacto en posición 1 (debe verificar delay)
SELECT 
  'Test 3.2: Contacto en posición 1' as scenario,
  c.name,
  c.sequence_position,
  n.should_send,
  n.message_number,
  n.delay_hours,
  n.content_text
FROM whatsapp_contacts c
CROSS JOIN LATERAL check_sequence_next_message(c.id) n
WHERE c.phone = 'TEST_CONTACT_2';

-- ============================================================================
-- TEST 4: decide_send_method ⭐
-- ============================================================================

SELECT 'TEST 4: decide_send_method' as test_name;

-- Test 4.1: Contacto < 72h (Free Entry Point) → cloud_api
SELECT 
  'Test 4.1: Free Entry Point activo' as scenario,
  c.name,
  d.method,
  d.reason,
  d.is_free_entry_point,
  d.window_active,
  d.hours_since_creation
FROM whatsapp_contacts c
CROSS JOIN LATERAL decide_send_method(c.id) d
WHERE c.phone = 'TEST_CONTACT_1';

-- Test 4.2: Contacto > 72h pero ventana activa → cloud_api
SELECT 
  'Test 4.2: Ventana 24h activa' as scenario,
  c.name,
  d.method,
  d.reason,
  d.is_free_entry_point,
  d.window_active,
  d.hours_since_creation
FROM whatsapp_contacts c
CROSS JOIN LATERAL decide_send_method(c.id) d
WHERE c.phone = 'TEST_CONTACT_2';

-- Test 4.3: Contacto > 72h y ventana cerrada → puppeteer
SELECT 
  'Test 4.3: Ventana cerrada → Puppeteer' as scenario,
  c.name,
  d.method,
  d.reason,
  d.is_free_entry_point,
  d.window_active,
  d.hours_since_creation
FROM whatsapp_contacts c
CROSS JOIN LATERAL decide_send_method(c.id) d
WHERE c.phone = 'TEST_CONTACT_3';

-- ============================================================================
-- TEST 5: add_to_puppeteer_queue ⭐
-- ============================================================================

SELECT 'TEST 5: add_to_puppeteer_queue' as test_name;

-- Test 5.1: Agregar mensaje de texto
SELECT 
  'Test 5.1: Mensaje de texto' as scenario,
  q.queue_id,
  q.success,
  q.error_message
FROM whatsapp_contacts c
CROSS JOIN LATERAL add_to_puppeteer_queue(
  c.id,
  2,
  'text',
  'Mensaje de prueba para Puppeteer',
  NULL,
  NULL,
  NULL,
  'HIGH'
) q
WHERE c.phone = 'TEST_CONTACT_3';

-- Verificar que se agregó
SELECT 
  'Verificación: Mensaje en cola' as check_name,
  contact_id,
  message_number,
  message_type,
  content_text,
  priority,
  status
FROM puppeteer_queue
WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone = 'TEST_CONTACT_3')
ORDER BY added_at DESC
LIMIT 1;

-- Test 5.2: Agregar imagen (validación de tamaño)
SELECT 
  'Test 5.2: Imagen válida (200KB)' as scenario,
  q.queue_id,
  q.success,
  q.error_message
FROM whatsapp_contacts c
CROSS JOIN LATERAL add_to_puppeteer_queue(
  c.id,
  3,
  'image',
  NULL,
  '/var/whatsapp/media/images/test.jpg',
  200,
  'Caption de prueba',
  'MEDIUM'
) q
WHERE c.phone = 'TEST_CONTACT_3';

-- Test 5.3: Intentar agregar imagen muy grande (debe fallar)
SELECT 
  'Test 5.3: Imagen muy grande (debe fallar)' as scenario,
  q.queue_id,
  q.success,
  q.error_message
FROM whatsapp_contacts c
CROSS JOIN LATERAL add_to_puppeteer_queue(
  c.id,
  4,
  'image',
  NULL,
  '/var/whatsapp/media/images/large.jpg',
  500, -- 500KB > 300KB máximo
  NULL,
  'LOW'
) q
WHERE c.phone = 'TEST_CONTACT_3';

-- Test 5.4: Intentar agregar texto sin contenido (debe fallar)
SELECT 
  'Test 5.4: Texto sin contenido (debe fallar)' as scenario,
  q.queue_id,
  q.success,
  q.error_message
FROM whatsapp_contacts c
CROSS JOIN LATERAL add_to_puppeteer_queue(
  c.id,
  5,
  'text',
  NULL, -- Sin contenido
  NULL,
  NULL,
  NULL,
  'MEDIUM'
) q
WHERE c.phone = 'TEST_CONTACT_3';

-- ============================================================================
-- TEST 6: get_contact_with_window
-- ============================================================================

SELECT 'TEST 6: get_contact_with_window' as test_name;

-- Test 6.1: Obtener información completa de contacto
SELECT 
  'Test 6.1: Información completa' as scenario,
  g.*
FROM whatsapp_contacts c
CROSS JOIN LATERAL get_contact_with_window(c.id) g
WHERE c.phone = 'TEST_CONTACT_2';

-- ============================================================================
-- RESUMEN DE TESTS
-- ============================================================================

SELECT 
  'RESUMEN DE TESTS' as summary,
  (SELECT COUNT(*) FROM whatsapp_contacts WHERE phone LIKE 'TEST%') as contactos_creados,
  (SELECT COUNT(*) FROM whatsapp_sequences WHERE name LIKE 'TEST%') as secuencias_creadas,
  (SELECT COUNT(*) FROM puppeteer_queue WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone LIKE 'TEST%')) as mensajes_en_cola;

-- ============================================================================
-- LIMPIEZA (OPCIONAL - Descomentar para limpiar datos de prueba)
-- ============================================================================

-- DELETE FROM puppeteer_queue WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone LIKE 'TEST%');
-- DELETE FROM whatsapp_messages WHERE contact_id IN (SELECT id FROM whatsapp_contacts WHERE phone LIKE 'TEST%');
-- DELETE FROM whatsapp_contacts WHERE phone LIKE 'TEST%';
-- DELETE FROM whatsapp_sequence_messages WHERE sequence_id IN (SELECT id FROM whatsapp_sequences WHERE name LIKE 'TEST%');
-- DELETE FROM whatsapp_sequences WHERE name LIKE 'TEST%';
-- DELETE FROM whatsapp_accounts WHERE phone_number_id = 'TEST_PHONE_NUMBER_ID';

