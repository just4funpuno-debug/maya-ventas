-- ============================================================================
-- MIGRACIÓN 001: SCHEMA COMPLETO CRM WHATSAPP HÍBRIDO
-- Fecha: 2025-01-30
-- Descripción: Crea todas las tablas necesarias para el CRM WhatsApp
--               con soporte para Cloud API y Puppeteer
-- ============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CONFIGURACIÓN DE NÚMEROS WHATSAPP (MÚLTIPLES CUENTAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- TODO: Encriptar o usar Supabase Vault
  verify_token VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  product_id UUID, -- Referencia opcional a products (se agregará FK después si products existe)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar FOREIGN KEY solo si la tabla products existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    -- Verificar si products tiene columna 'id'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'id'
    ) THEN
      ALTER TABLE whatsapp_accounts 
      ADD CONSTRAINT whatsapp_accounts_product_id_fkey 
      FOREIGN KEY (product_id) 
      REFERENCES products(id) 
      ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Foreign key a products(id) agregada';
    ELSE
      RAISE NOTICE '⚠️ Tabla products existe pero no tiene columna id, referencia omitida';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Tabla products no existe, referencia omitida (se puede agregar después)';
  END IF;
END $$;

COMMENT ON TABLE whatsapp_accounts IS 'Configuración de números WhatsApp (múltiples cuentas)';
COMMENT ON COLUMN whatsapp_accounts.access_token IS 'Token de acceso de WhatsApp Cloud API (debe estar encriptado)';
COMMENT ON COLUMN whatsapp_accounts.product_id IS 'Referencia opcional a products (FK se agrega automáticamente si products existe)';

-- ============================================================================
-- 2. CONTACTOS DE WHATSAPP
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(200),
  profile_pic_url TEXT,
  
  -- Ventana 24h (CRÍTICO)
  last_interaction_at TIMESTAMPTZ,
  last_interaction_source VARCHAR(20) CHECK (last_interaction_source IN ('client', 'manual', 'cloud_api', 'puppeteer')),
  window_expires_at TIMESTAMPTZ,
  -- window_active se calcula dinámicamente con función o en queries (NOW() no es inmutable)
  
  -- Engagement
  total_messages_sent INT DEFAULT 0,
  total_messages_delivered INT DEFAULT 0,
  total_messages_read INT DEFAULT 0,
  client_responses_count INT DEFAULT 0,
  responded_ever BOOLEAN DEFAULT false,
  
  -- Detección bloqueos
  consecutive_undelivered INT DEFAULT 0,
  block_probability INT DEFAULT 0 CHECK (block_probability BETWEEN 0 AND 100),
  is_blocked BOOLEAN DEFAULT false,
  
  -- Secuencia
  sequence_active BOOLEAN DEFAULT false,
  sequence_id UUID, -- Referencia opcional a whatsapp_sequences (se agregará FK después)
  sequence_position INT DEFAULT 0,
  sequence_started_at TIMESTAMPTZ,
  sequence_phase VARCHAR(20) CHECK (sequence_phase IN ('cloud_api', 'puppeteer')) DEFAULT 'cloud_api',
  phase_switched_at TIMESTAMPTZ,
  messages_sent_via_cloud_api INT DEFAULT 0,
  messages_sent_via_puppeteer INT DEFAULT 0,
  messages_sent_via_manual INT DEFAULT 0,
  
  -- Meta
  labels TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, phone)
);

COMMENT ON TABLE whatsapp_contacts IS 'Contactos de WhatsApp con tracking de ventana 24h y secuencias';
COMMENT ON COLUMN whatsapp_contacts.window_expires_at IS 'Fecha/hora de expiración de ventana 24h (last_interaction_at + 24h). window_active se calcula dinámicamente en queries';
COMMENT ON COLUMN whatsapp_contacts.sequence_phase IS 'Fase actual de la secuencia: cloud_api o puppeteer';

-- ============================================================================
-- 3. MENSAJES
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  wa_message_id VARCHAR(100) UNIQUE,
  
  -- Contenido
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')) NOT NULL,
  text_content TEXT,
  media_url TEXT,
  media_filename VARCHAR(255),
  media_mime_type VARCHAR(100),
  media_caption TEXT,
  media_wa_id VARCHAR(100), -- Media ID de WhatsApp (para reutilizar)
  
  -- Origen y contexto
  is_from_me BOOLEAN DEFAULT false,
  sent_via VARCHAR(20) CHECK (sent_via IN ('cloud_api', 'puppeteer', 'manual', 'client')) NOT NULL,
  sequence_message_id INT, -- A qué mensaje de secuencia corresponde (1, 2, 3...)
  was_skipped BOOLEAN DEFAULT false, -- Si fue saltado por ventana cerrada
  
  -- Estado
  status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_messages IS 'Mensajes de WhatsApp (entrantes y salientes)';
COMMENT ON COLUMN whatsapp_messages.sent_via IS 'Método de envío: cloud_api, puppeteer, manual, o client';

-- ============================================================================
-- 4. SECUENCIAS CONFIGURABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_messages INT DEFAULT 0, -- Calculado automáticamente
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_sequences IS 'Secuencias de mensajes configurables (flexibles, no fijas)';

-- Agregar FOREIGN KEY de whatsapp_contacts.sequence_id después de crear whatsapp_sequences
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_sequences'
  ) THEN
    -- Verificar si la constraint ya existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public'
      AND table_name = 'whatsapp_contacts'
      AND constraint_name = 'whatsapp_contacts_sequence_id_fkey'
    ) THEN
      ALTER TABLE whatsapp_contacts 
      ADD CONSTRAINT whatsapp_contacts_sequence_id_fkey 
      FOREIGN KEY (sequence_id) 
      REFERENCES whatsapp_sequences(id) 
      ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Foreign key whatsapp_contacts.sequence_id agregada';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Tabla whatsapp_sequences no existe aún, FK se agregará después';
  END IF;
END $$;

-- ============================================================================
-- 5. MENSAJES DE SECUENCIA (CONFIGURACIÓN FLEXIBLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_sequence_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES whatsapp_sequences(id) ON DELETE CASCADE NOT NULL,
  message_number INT NOT NULL, -- 1, 2, 3... hasta N (identificador único)
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')) NOT NULL,
  
  -- Contenido
  content_text TEXT,
  media_url TEXT, -- URL en Supabase Storage
  media_filename VARCHAR(255),
  media_size_kb INT, -- Para validación Puppeteer
  
  caption TEXT, -- Para imágenes/videos
  
  -- Timing
  delay_hours_from_previous INT DEFAULT 0, -- Horas desde mensaje anterior
  
  -- Orden
  order_position INT NOT NULL, -- Para reordenar (drag & drop)
  
  -- Estado
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, message_number)
);

COMMENT ON TABLE whatsapp_sequence_messages IS 'Mensajes individuales de una secuencia (configuración flexible)';
COMMENT ON COLUMN whatsapp_sequence_messages.media_size_kb IS 'Tamaño en KB para validación antes de agregar a puppeteer_queue';

-- ============================================================================
-- 6. COLA PUPPETEER ⭐ NUEVA TABLA CRÍTICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS puppeteer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  message_number INT NOT NULL, -- Qué mensaje de secuencia
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')) NOT NULL,
  
  -- Contenido
  content_text TEXT,
  media_path TEXT, -- Ruta LOCAL en VPS (no Supabase)
  media_size_kb INT,
  caption TEXT, -- Para imagen/video
  
  -- Prioridad y timing
  priority VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
  scheduled_for TIMESTAMPTZ,
  
  -- Estado
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  error_message TEXT,
  
  -- Timestamps
  added_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE puppeteer_queue IS 'Cola de mensajes para envío via Puppeteer Bot';
COMMENT ON COLUMN puppeteer_queue.media_path IS 'Ruta local en VPS donde está el archivo (no URL de Supabase)';

-- ============================================================================
-- 7. CONFIGURACIÓN PUPPETEER ⭐ NUEVA TABLA
-- ============================================================================

CREATE TABLE IF NOT EXISTS puppeteer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Velocidad de escritura
  typing_speed_min_ms INT DEFAULT 80,
  typing_speed_max_ms INT DEFAULT 150,
  
  -- Delays entre mensajes
  delay_between_messages_min_sec INT DEFAULT 45,
  delay_between_messages_max_sec INT DEFAULT 90,
  
  -- Horario laboral
  working_hours_start INT DEFAULT 9 CHECK (working_hours_start BETWEEN 0 AND 23),
  working_hours_end INT DEFAULT 19 CHECK (working_hours_end BETWEEN 0 AND 23),
  skip_sundays BOOLEAN DEFAULT true,
  
  -- Configuración técnica
  headless BOOLEAN DEFAULT false,
  max_retries INT DEFAULT 3,
  session_path TEXT DEFAULT '/home/user/.wwebjs_auth/session/',
  
  -- Estado
  bot_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id)
);

COMMENT ON TABLE puppeteer_config IS 'Configuración del bot Puppeteer por cuenta';
COMMENT ON COLUMN puppeteer_config.last_heartbeat IS 'Última vez que el bot reportó estar activo';

-- ============================================================================
-- 8. PROBLEMAS DE ENTREGA / BLOQUEOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  
  -- Detección
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_type VARCHAR(20) CHECK (issue_type IN ('undelivered', 'probable_block', 'confirmed_block')) NOT NULL,
  message_source VARCHAR(20) CHECK (message_source IN ('cloud_api', 'puppeteer', 'manual')) NOT NULL,
  
  -- Métricas
  days_undelivered INT DEFAULT 0,
  consecutive_count INT DEFAULT 0,
  
  -- Acción
  action_taken VARCHAR(20) CHECK (action_taken IN ('none', 'paused', 'stopped')) DEFAULT 'none',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

COMMENT ON TABLE whatsapp_delivery_issues IS 'Registro de problemas de entrega y bloqueos detectados';

-- ============================================================================
-- 9. WEBHOOKS RECIBIDOS (LOG PARA DEBUGGING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  event_type VARCHAR(50),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_webhook_logs IS 'Log de todos los webhooks recibidos para debugging';

-- ============================================================================
-- ÍNDICES CRÍTICOS
-- ============================================================================

-- Contactos
CREATE INDEX IF NOT EXISTS idx_contacts_account_phone ON whatsapp_contacts(account_id, phone);
CREATE INDEX IF NOT EXISTS idx_contacts_window_expires ON whatsapp_contacts(window_expires_at) WHERE window_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_sequence_active ON whatsapp_contacts(sequence_active, sequence_position);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON whatsapp_contacts(phone);

-- Mensajes
CREATE INDEX IF NOT EXISTS idx_messages_contact_timestamp ON whatsapp_messages(contact_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON whatsapp_messages(status, status_updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_wa_id ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_via ON whatsapp_messages(sent_via);
CREATE INDEX IF NOT EXISTS idx_messages_account ON whatsapp_messages(account_id);

-- Puppeteer Queue
CREATE INDEX IF NOT EXISTS idx_puppeteer_queue_status_scheduled ON puppeteer_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_puppeteer_queue_contact ON puppeteer_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_puppeteer_queue_account ON puppeteer_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_puppeteer_queue_priority ON puppeteer_queue(priority, added_at);

-- Secuencias
CREATE INDEX IF NOT EXISTS idx_sequence_messages_order ON whatsapp_sequence_messages(sequence_id, order_position);
CREATE INDEX IF NOT EXISTS idx_sequences_account ON whatsapp_sequences(account_id);

-- Delivery Issues
CREATE INDEX IF NOT EXISTS idx_delivery_issues_contact ON whatsapp_delivery_issues(contact_id, resolved);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_account ON whatsapp_delivery_issues(account_id);

-- Webhook Logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_account ON whatsapp_webhook_logs(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON whatsapp_webhook_logs(processed, created_at);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER whatsapp_accounts_updated 
  BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER whatsapp_contacts_updated 
  BEFORE UPDATE ON whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER whatsapp_messages_updated 
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER whatsapp_sequences_updated 
  BEFORE UPDATE ON whatsapp_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER whatsapp_sequence_messages_updated 
  BEFORE UPDATE ON whatsapp_sequence_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER puppeteer_config_updated 
  BEFORE UPDATE ON puppeteer_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- FUNCIÓN PARA CALCULAR WINDOW_ACTIVE (ventana 24h)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_window_active(window_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  IF window_expires_at IS NULL THEN
    RETURN false;
  END IF;
  RETURN NOW() < window_expires_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_window_active IS 'Calcula si la ventana 24h está activa (NOW() < window_expires_at)';

-- ============================================================================
-- FUNCIÓN PARA ACTUALIZAR TOTAL_MESSAGES EN SECUENCIAS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sequence_total_messages()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whatsapp_sequences
  SET total_messages = (
    SELECT COUNT(*) 
    FROM whatsapp_sequence_messages
    WHERE sequence_id = COALESCE(NEW.sequence_id, OLD.sequence_id)
      AND active = true
  )
  WHERE id = COALESCE(NEW.sequence_id, OLD.sequence_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sequence_messages_count 
  AFTER INSERT OR UPDATE OR DELETE ON whatsapp_sequence_messages
  FOR EACH ROW EXECUTE FUNCTION update_sequence_total_messages();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sequence_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE puppeteer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE puppeteer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_delivery_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir todo por ahora, ajustar después con auth)
-- TODO: Reemplazar con políticas basadas en auth.uid() cuando se implemente autenticación

CREATE POLICY "whatsapp_accounts_select_all" ON whatsapp_accounts
  FOR SELECT USING (true);

CREATE POLICY "whatsapp_accounts_insert_all" ON whatsapp_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "whatsapp_accounts_update_all" ON whatsapp_accounts
  FOR UPDATE USING (true);

CREATE POLICY "whatsapp_accounts_delete_all" ON whatsapp_accounts
  FOR DELETE USING (true);

-- Aplicar mismas políticas a otras tablas (temporal, ajustar después)
CREATE POLICY "whatsapp_contacts_select_all" ON whatsapp_contacts FOR SELECT USING (true);
CREATE POLICY "whatsapp_contacts_insert_all" ON whatsapp_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_contacts_update_all" ON whatsapp_contacts FOR UPDATE USING (true);
CREATE POLICY "whatsapp_contacts_delete_all" ON whatsapp_contacts FOR DELETE USING (true);

CREATE POLICY "whatsapp_messages_select_all" ON whatsapp_messages FOR SELECT USING (true);
CREATE POLICY "whatsapp_messages_insert_all" ON whatsapp_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_messages_update_all" ON whatsapp_messages FOR UPDATE USING (true);
CREATE POLICY "whatsapp_messages_delete_all" ON whatsapp_messages FOR DELETE USING (true);

CREATE POLICY "whatsapp_sequences_select_all" ON whatsapp_sequences FOR SELECT USING (true);
CREATE POLICY "whatsapp_sequences_insert_all" ON whatsapp_sequences FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_sequences_update_all" ON whatsapp_sequences FOR UPDATE USING (true);
CREATE POLICY "whatsapp_sequences_delete_all" ON whatsapp_sequences FOR DELETE USING (true);

CREATE POLICY "whatsapp_sequence_messages_select_all" ON whatsapp_sequence_messages FOR SELECT USING (true);
CREATE POLICY "whatsapp_sequence_messages_insert_all" ON whatsapp_sequence_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_sequence_messages_update_all" ON whatsapp_sequence_messages FOR UPDATE USING (true);
CREATE POLICY "whatsapp_sequence_messages_delete_all" ON whatsapp_sequence_messages FOR DELETE USING (true);

CREATE POLICY "puppeteer_queue_select_all" ON puppeteer_queue FOR SELECT USING (true);
CREATE POLICY "puppeteer_queue_insert_all" ON puppeteer_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "puppeteer_queue_update_all" ON puppeteer_queue FOR UPDATE USING (true);
CREATE POLICY "puppeteer_queue_delete_all" ON puppeteer_queue FOR DELETE USING (true);

CREATE POLICY "puppeteer_config_select_all" ON puppeteer_config FOR SELECT USING (true);
CREATE POLICY "puppeteer_config_insert_all" ON puppeteer_config FOR INSERT WITH CHECK (true);
CREATE POLICY "puppeteer_config_update_all" ON puppeteer_config FOR UPDATE USING (true);
CREATE POLICY "puppeteer_config_delete_all" ON puppeteer_config FOR DELETE USING (true);

CREATE POLICY "whatsapp_delivery_issues_select_all" ON whatsapp_delivery_issues FOR SELECT USING (true);
CREATE POLICY "whatsapp_delivery_issues_insert_all" ON whatsapp_delivery_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_delivery_issues_update_all" ON whatsapp_delivery_issues FOR UPDATE USING (true);
CREATE POLICY "whatsapp_delivery_issues_delete_all" ON whatsapp_delivery_issues FOR DELETE USING (true);

CREATE POLICY "whatsapp_webhook_logs_select_all" ON whatsapp_webhook_logs FOR SELECT USING (true);
CREATE POLICY "whatsapp_webhook_logs_insert_all" ON whatsapp_webhook_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todas las tablas se crearon
DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'whatsapp_accounts',
      'whatsapp_contacts',
      'whatsapp_messages',
      'whatsapp_sequences',
      'whatsapp_sequence_messages',
      'puppeteer_queue',
      'puppeteer_config',
      'whatsapp_delivery_issues',
      'whatsapp_webhook_logs'
    );
  
  IF table_count = 9 THEN
    RAISE NOTICE '✅ Todas las tablas creadas correctamente (9/9)';
  ELSE
    RAISE WARNING '⚠️ Solo se crearon %/9 tablas', table_count;
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

