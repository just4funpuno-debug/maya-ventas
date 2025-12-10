-- ============================================================================
-- MIGRACIÓN 002: FUNCIONES SQL AUXILIARES PARA CRM WHATSAPP
-- Fecha: 2025-01-30
-- Descripción: Funciones SQL para gestionar ventana 24h, interacciones,
--               secuencias y decisión de método de envío
-- ============================================================================

-- ============================================================================
-- 1. CALCULAR VENTANA 24H
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_window_24h(p_contact_id UUID)
RETURNS TABLE (
  window_expires_at TIMESTAMPTZ,
  window_active BOOLEAN
) AS $$
DECLARE
  v_last_interaction TIMESTAMPTZ;
  v_window_expires TIMESTAMPTZ;
  v_window_active BOOLEAN;
BEGIN
  -- Obtener última interacción del contacto
  SELECT last_interaction_at INTO v_last_interaction
  FROM whatsapp_contacts
  WHERE id = p_contact_id;
  
  -- Si no hay última interacción, ventana cerrada
  IF v_last_interaction IS NULL THEN
    RETURN QUERY SELECT NULL::TIMESTAMPTZ, false;
    RETURN;
  END IF;
  
  -- Calcular expiración (última interacción + 24 horas)
  v_window_expires := v_last_interaction + INTERVAL '24 hours';
  
  -- Verificar si ventana está activa (ahora < expiración)
  v_window_active := NOW() < v_window_expires;
  
  RETURN QUERY SELECT v_window_expires, v_window_active;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_window_24h IS 'Calcula window_expires_at desde last_interaction_at y retorna si ventana 24h está activa';

-- ============================================================================
-- 2. ACTUALIZAR INTERACCIÓN DE CONTACTO
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contact_interaction(
  p_contact_id UUID,
  p_source VARCHAR(20),
  p_interaction_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  updated BOOLEAN,
  window_expires_at TIMESTAMPTZ,
  window_active BOOLEAN
) AS $$
DECLARE
  v_window_expires TIMESTAMPTZ;
  v_window_active BOOLEAN;
  v_contact_exists BOOLEAN;
BEGIN
  -- Validar source
  IF p_source NOT IN ('client', 'manual', 'cloud_api', 'puppeteer') THEN
    RAISE EXCEPTION 'Invalid source: %. Must be one of: client, manual, cloud_api, puppeteer', p_source;
  END IF;
  
  -- Verificar que contacto existe
  SELECT EXISTS(SELECT 1 FROM whatsapp_contacts WHERE id = p_contact_id) INTO v_contact_exists;
  IF NOT v_contact_exists THEN
    RAISE EXCEPTION 'Contact with id % does not exist', p_contact_id;
  END IF;
  
  -- Calcular window_expires_at (interacción + 24 horas)
  v_window_expires := p_interaction_time + INTERVAL '24 hours';
  v_window_active := NOW() < v_window_expires;
  
  -- Actualizar contacto
  UPDATE whatsapp_contacts
  SET 
    last_interaction_at = p_interaction_time,
    last_interaction_source = p_source,
    window_expires_at = v_window_expires,
    updated_at = NOW()
  WHERE id = p_contact_id;
  
  -- Actualizar contadores según source
  IF p_source = 'client' THEN
    UPDATE whatsapp_contacts
    SET 
      client_responses_count = client_responses_count + 1,
      responded_ever = true,
      updated_at = NOW()
    WHERE id = p_contact_id;
  ELSIF p_source = 'cloud_api' THEN
    UPDATE whatsapp_contacts
    SET 
      messages_sent_via_cloud_api = messages_sent_via_cloud_api + 1,
      total_messages_sent = total_messages_sent + 1,
      updated_at = NOW()
    WHERE id = p_contact_id;
  ELSIF p_source = 'puppeteer' THEN
    UPDATE whatsapp_contacts
    SET 
      messages_sent_via_puppeteer = messages_sent_via_puppeteer + 1,
      total_messages_sent = total_messages_sent + 1,
      updated_at = NOW()
    WHERE id = p_contact_id;
  ELSIF p_source = 'manual' THEN
    UPDATE whatsapp_contacts
    SET 
      messages_sent_via_manual = messages_sent_via_manual + 1,
      total_messages_sent = total_messages_sent + 1,
      updated_at = NOW()
    WHERE id = p_contact_id;
  END IF;
  
  RETURN QUERY SELECT true, v_window_expires, v_window_active;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_contact_interaction IS 'Actualiza last_interaction_at, last_interaction_source, window_expires_at y contadores según source';

-- ============================================================================
-- 3. VERIFICAR SIGUIENTE MENSAJE DE SECUENCIA
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sequence_next_message(p_contact_id UUID)
RETURNS TABLE (
  should_send BOOLEAN,
  message_number INT,
  message_type VARCHAR(20),
  content_text TEXT,
  media_url TEXT,
  media_filename VARCHAR(255),
  caption TEXT,
  delay_hours INT,
  sequence_message_id UUID
) AS $$
DECLARE
  v_contact RECORD;
  v_sequence RECORD;
  v_next_message RECORD;
  v_current_time TIMESTAMPTZ;
  v_time_since_start INTERVAL;
  v_time_since_last_message INTERVAL;
  v_next_message_time TIMESTAMPTZ;
  v_should_send BOOLEAN;
BEGIN
  v_current_time := NOW();
  
  -- Obtener información del contacto
  SELECT 
    sequence_active,
    sequence_id,
    sequence_position,
    sequence_started_at,
    account_id
  INTO v_contact
  FROM whatsapp_contacts
  WHERE id = p_contact_id;
  
  -- Si no tiene secuencia activa, no hay mensaje
  IF NOT v_contact.sequence_active OR v_contact.sequence_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::INT, NULL::VARCHAR, NULL::TEXT, NULL::TEXT, NULL::VARCHAR, NULL::TEXT, NULL::INT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Obtener siguiente mensaje (position + 1)
  SELECT 
    sm.id,
    sm.message_number,
    sm.message_type,
    sm.content_text,
    sm.media_url,
    sm.media_filename,
    sm.caption,
    sm.delay_hours_from_previous,
    sm.order_position
  INTO v_next_message
  FROM whatsapp_sequence_messages sm
  WHERE sm.sequence_id = v_contact.sequence_id
    AND sm.message_number = v_contact.sequence_position + 1
    AND sm.active = true
  ORDER BY sm.order_position
  LIMIT 1;
  
  -- Si no hay siguiente mensaje, secuencia completada
  IF v_next_message IS NULL THEN
    RETURN QUERY SELECT false, NULL::INT, NULL::VARCHAR, NULL::TEXT, NULL::TEXT, NULL::VARCHAR, NULL::TEXT, NULL::INT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calcular si es momento de enviar
  -- Si es el primer mensaje (position = 0), enviar inmediatamente
  IF v_contact.sequence_position = 0 THEN
    v_should_send := true;
  ELSE
    -- Calcular tiempo desde inicio de secuencia
    v_time_since_start := v_current_time - v_contact.sequence_started_at;
    
    -- Calcular tiempo acumulado hasta este mensaje
    SELECT COALESCE(SUM(sm.delay_hours_from_previous), 0) * INTERVAL '1 hour'
    INTO v_time_since_last_message
    FROM whatsapp_sequence_messages sm
    WHERE sm.sequence_id = v_contact.sequence_id
      AND sm.message_number <= v_next_message.message_number
      AND sm.active = true;
    
    -- Verificar si ya pasó el tiempo necesario
    v_should_send := v_time_since_start >= v_time_since_last_message;
  END IF;
  
  -- Retornar información del mensaje
  RETURN QUERY SELECT 
    v_should_send,
    v_next_message.message_number,
    v_next_message.message_type,
    v_next_message.content_text,
    v_next_message.media_url,
    v_next_message.media_filename,
    v_next_message.caption,
    v_next_message.delay_hours_from_previous,
    v_next_message.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_sequence_next_message IS 'Verifica si es momento de enviar siguiente mensaje de secuencia y retorna información del mensaje';

-- ============================================================================
-- 4. DECIDIR MÉTODO DE ENVÍO (CLOUD API vs PUPPETEER) ⭐
-- ============================================================================

CREATE OR REPLACE FUNCTION decide_send_method(p_contact_id UUID)
RETURNS TABLE (
  method VARCHAR(20),
  reason TEXT,
  is_free_entry_point BOOLEAN,
  window_active BOOLEAN,
  hours_since_creation INT
) AS $$
DECLARE
  v_contact RECORD;
  v_window_expires TIMESTAMPTZ;
  v_window_active BOOLEAN;
  v_hours_since_creation INT;
  v_is_free_entry_point BOOLEAN;
  v_recommended_method VARCHAR(20);
  v_reason TEXT;
BEGIN
  -- Obtener información del contacto
  SELECT 
    created_at,
    window_expires_at,
    account_id
  INTO v_contact
  FROM whatsapp_contacts
  WHERE id = p_contact_id;
  
  -- Si contacto no existe
  IF v_contact IS NULL THEN
    RAISE EXCEPTION 'Contact with id % does not exist', p_contact_id;
  END IF;
  
  -- Calcular horas desde creación
  v_hours_since_creation := EXTRACT(EPOCH FROM (NOW() - v_contact.created_at)) / 3600;
  
  -- Verificar Free Entry Point (72 horas desde creación)
  v_is_free_entry_point := v_hours_since_creation < 72;
  
  -- Calcular ventana 24h activa
  IF v_contact.window_expires_at IS NOT NULL THEN
    v_window_active := NOW() < v_contact.window_expires_at;
  ELSE
    v_window_active := false;
  END IF;
  
  -- LÓGICA DE DECISIÓN:
  -- PASO 1: Si contacto < 72h → Cloud API (Free Entry Point)
  IF v_is_free_entry_point THEN
    v_recommended_method := 'cloud_api';
    v_reason := format('Free Entry Point activo (%s horas desde creación)', ROUND(v_hours_since_creation, 1)::TEXT);
  -- PASO 2: Si ventana 24h activa → Cloud API (gratis)
  ELSIF v_window_active THEN
    v_recommended_method := 'cloud_api';
    v_reason := format('Ventana 24h activa (expira en %s)', v_contact.window_expires_at);
  -- PASO 3: Si ventana cerrada → Puppeteer (gratis)
  ELSE
    v_recommended_method := 'puppeteer';
    v_reason := format('Ventana 24h cerrada (%s horas desde creación, última interacción hace más de 24h)', ROUND(v_hours_since_creation, 1)::TEXT);
  END IF;
  
  RETURN QUERY SELECT 
    v_recommended_method,
    v_reason,
    v_is_free_entry_point,
    v_window_active,
    v_hours_since_creation::INT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decide_send_method IS 'Decide método de envío (cloud_api o puppeteer) según Free Entry Point 72h y ventana 24h';

-- ============================================================================
-- 5. AGREGAR MENSAJE A COLA PUPPETEER ⭐
-- ============================================================================

CREATE OR REPLACE FUNCTION add_to_puppeteer_queue(
  p_contact_id UUID,
  p_message_number INT,
  p_message_type VARCHAR(20),
  p_content_text TEXT DEFAULT NULL,
  p_media_path TEXT DEFAULT NULL,
  p_media_size_kb INT DEFAULT NULL,
  p_caption TEXT DEFAULT NULL,
  p_priority VARCHAR(10) DEFAULT 'MEDIUM',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  queue_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_contact RECORD;
  v_queue_id UUID;
  v_validation_error TEXT;
BEGIN
  -- Validar parámetros
  IF p_message_type NOT IN ('text', 'image', 'video', 'audio', 'document') THEN
    RETURN QUERY SELECT NULL::UUID, false, format('Invalid message_type: %. Must be: text, image, video, audio, document', p_message_type);
    RETURN;
  END IF;
  
  IF p_priority NOT IN ('HIGH', 'MEDIUM', 'LOW') THEN
    RETURN QUERY SELECT NULL::UUID, false, format('Invalid priority: %. Must be: HIGH, MEDIUM, LOW', p_priority);
    RETURN;
  END IF;
  
  -- Validar que contacto existe
  SELECT id, account_id INTO v_contact
  FROM whatsapp_contacts
  WHERE id = p_contact_id;
  
  IF v_contact IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, false, format('Contact with id % does not exist', p_contact_id);
    RETURN;
  END IF;
  
  -- Validar contenido según tipo
  IF p_message_type = 'text' AND (p_content_text IS NULL OR p_content_text = '') THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Text message requires content_text';
    RETURN;
  END IF;
  
  IF p_message_type IN ('image', 'video', 'audio', 'document') AND (p_media_path IS NULL OR p_media_path = '') THEN
    RETURN QUERY SELECT NULL::UUID, false, format('%s message requires media_path', p_message_type);
    RETURN;
  END IF;
  
  -- Validar tamaños máximos
  IF p_message_type = 'image' AND p_media_size_kb IS NOT NULL AND p_media_size_kb > 300 THEN
    RETURN QUERY SELECT NULL::UUID, false, format('Image size (%s KB) exceeds maximum (300 KB)', p_media_size_kb::TEXT);
    RETURN;
  END IF;
  
  IF p_message_type = 'video' AND p_media_size_kb IS NOT NULL AND p_media_size_kb > 10240 THEN
    RETURN QUERY SELECT NULL::UUID, false, format('Video size (%s KB) exceeds maximum (10240 KB = 10 MB)', p_media_size_kb::TEXT);
    RETURN;
  END IF;
  
  -- Insertar en cola
  INSERT INTO puppeteer_queue (
    contact_id,
    account_id,
    message_number,
    message_type,
    content_text,
    media_path,
    media_size_kb,
    caption,
    priority,
    scheduled_for,
    status
  ) VALUES (
    p_contact_id,
    v_contact.account_id,
    p_message_number,
    p_message_type,
    p_content_text,
    p_media_path,
    p_media_size_kb,
    p_caption,
    p_priority,
    p_scheduled_for,
    'pending'
  )
  RETURNING id INTO v_queue_id;
  
  RETURN QUERY SELECT v_queue_id, true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_to_puppeteer_queue IS 'Agrega mensaje a puppeteer_queue con validación de datos y retorna ID del mensaje en cola';

-- ============================================================================
-- 6. FUNCIÓN AUXILIAR: OBTENER INFORMACIÓN DE CONTACTO CON VENTANA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contact_with_window(p_contact_id UUID)
RETURNS TABLE (
  contact_id UUID,
  phone VARCHAR(20),
  name VARCHAR(200),
  last_interaction_at TIMESTAMPTZ,
  last_interaction_source VARCHAR(20),
  window_expires_at TIMESTAMPTZ,
  window_active BOOLEAN,
  hours_since_creation NUMERIC,
  is_free_entry_point BOOLEAN,
  sequence_active BOOLEAN,
  sequence_position INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.phone,
    c.name,
    c.last_interaction_at,
    c.last_interaction_source,
    c.window_expires_at,
    is_window_active(c.window_expires_at) as window_active,
    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 as hours_since_creation,
    (EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600) < 72 as is_free_entry_point,
    c.sequence_active,
    c.sequence_position
  FROM whatsapp_contacts c
  WHERE c.id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contact_with_window IS 'Obtiene información completa de contacto incluyendo estado de ventana 24h y Free Entry Point';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

