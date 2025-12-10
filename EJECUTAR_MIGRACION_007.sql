-- ============================================================================
-- EJECUTAR MIGRACIÓN 007: MEJORAS DE UI PARA WHATSAPP
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Copia todo este contenido
-- 2. Ve a Supabase Dashboard > SQL Editor
-- 3. Pega este SQL y ejecuta
-- ============================================================================

-- Agregar columnas a whatsapp_contacts
ALTER TABLE whatsapp_contacts 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Agregar columnas a whatsapp_messages
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_contacts_pinned 
  ON whatsapp_contacts(is_pinned) 
  WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_contacts_archived 
  ON whatsapp_contacts(is_archived) 
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_reply 
  ON whatsapp_messages(reply_to_message_id) 
  WHERE reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted 
  ON whatsapp_messages(is_deleted) 
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_contacts_online 
  ON whatsapp_contacts(is_online) 
  WHERE is_online = TRUE;

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_contacts' 
  AND column_name IN ('is_online', 'last_seen_at', 'is_pinned', 'is_archived')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_messages' 
  AND column_name IN ('reply_to_message_id', 'is_deleted', 'deleted_at')
ORDER BY column_name;


