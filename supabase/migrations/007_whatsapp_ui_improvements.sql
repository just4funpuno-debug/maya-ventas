-- ============================================================================
-- MIGRACIÓN 007: MEJORAS DE UI PARA WHATSAPP
-- Fecha: 2025-01-30
-- Descripción: Agrega columnas para funcionalidades de estado y UI mejorada
--               FASE 2: Funcionalidades de Estado
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNAS A whatsapp_contacts
-- ============================================================================

-- Nota: profile_pic_url ya existe en la tabla (verificado en migración 001)
-- Solo agregamos las columnas faltantes

ALTER TABLE whatsapp_contacts 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN whatsapp_contacts.is_online IS 'Indica si el contacto está en línea';
COMMENT ON COLUMN whatsapp_contacts.last_seen_at IS 'Última vez que el contacto fue visto';
COMMENT ON COLUMN whatsapp_contacts.is_pinned IS 'Indica si la conversación está fijada';
COMMENT ON COLUMN whatsapp_contacts.is_archived IS 'Indica si la conversación está archivada';

-- ============================================================================
-- 2. AGREGAR COLUMNAS A whatsapp_messages
-- ============================================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN whatsapp_messages.reply_to_message_id IS 'ID del mensaje al que se está respondiendo';
COMMENT ON COLUMN whatsapp_messages.is_deleted IS 'Indica si el mensaje fue eliminado (soft delete)';
COMMENT ON COLUMN whatsapp_messages.deleted_at IS 'Fecha en que el mensaje fue eliminado';

-- ============================================================================
-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice para conversaciones fijadas (filtrado rápido)
CREATE INDEX IF NOT EXISTS idx_contacts_pinned 
  ON whatsapp_contacts(is_pinned) 
  WHERE is_pinned = TRUE;

-- Índice para conversaciones archivadas (filtrado rápido)
CREATE INDEX IF NOT EXISTS idx_contacts_archived 
  ON whatsapp_contacts(is_archived) 
  WHERE is_archived = FALSE;

-- Índice para mensajes con respuesta (para mostrar mensajes citados)
CREATE INDEX IF NOT EXISTS idx_messages_reply 
  ON whatsapp_messages(reply_to_message_id) 
  WHERE reply_to_message_id IS NOT NULL;

-- Índice para mensajes eliminados (filtrado rápido)
CREATE INDEX IF NOT EXISTS idx_messages_deleted 
  ON whatsapp_messages(is_deleted) 
  WHERE is_deleted = FALSE;

-- Índice para estado online (búsqueda rápida de contactos en línea)
CREATE INDEX IF NOT EXISTS idx_contacts_online 
  ON whatsapp_contacts(is_online) 
  WHERE is_online = TRUE;

-- ============================================================================
-- 4. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  -- Verificar que las columnas se agregaron correctamente
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_contacts' 
    AND column_name = 'is_online'
  ) THEN
    RAISE NOTICE '✅ Columnas agregadas a whatsapp_contacts correctamente';
  ELSE
    RAISE WARNING '⚠️ Error al agregar columnas a whatsapp_contacts';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_messages' 
    AND column_name = 'reply_to_message_id'
  ) THEN
    RAISE NOTICE '✅ Columnas agregadas a whatsapp_messages correctamente';
  ELSE
    RAISE WARNING '⚠️ Error al agregar columnas a whatsapp_messages';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

