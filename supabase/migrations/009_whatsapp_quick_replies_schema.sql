-- ============================================================================
-- MIGRACIÓN 009: RESPUESTAS RÁPIDAS PARA WHATSAPP
-- FASE 2: SUBFASE 2.1 - Schema y Base de Datos
-- Fecha: 2025-01-30
-- Descripción: Crea tabla y funciones para respuestas rápidas con comando "/"
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE RESPUESTAS RÁPIDAS
-- ============================================================================
-- Cada cuenta WhatsApp puede tener sus propias respuestas rápidas
-- Se activan escribiendo "/trigger" en el campo de mensaje

CREATE TABLE IF NOT EXISTS whatsapp_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  trigger TEXT NOT NULL, -- Comando trigger (ej: "/saludo", "/despedida")
  name TEXT NOT NULL, -- Nombre descriptivo (ej: "Saludo Inicial")
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'image_text', 'audio', 'audio_text')),
  content_text TEXT, -- Texto de la respuesta (si aplica)
  media_path TEXT, -- Ruta al archivo en Storage (si aplica)
  media_type TEXT CHECK (media_type IN ('image', 'audio')), -- Tipo de media (si aplica)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un trigger debe ser único por cuenta
  UNIQUE(account_id, trigger)
);

COMMENT ON TABLE whatsapp_quick_replies IS 'Respuestas rápidas para WhatsApp activadas con comando "/"';
COMMENT ON COLUMN whatsapp_quick_replies.account_id IS 'ID de la cuenta WhatsApp a la que pertenece la respuesta rápida';
COMMENT ON COLUMN whatsapp_quick_replies.trigger IS 'Comando trigger (ej: "/saludo") - debe empezar con "/"';
COMMENT ON COLUMN whatsapp_quick_replies.name IS 'Nombre descriptivo de la respuesta rápida';
COMMENT ON COLUMN whatsapp_quick_replies.type IS 'Tipo de respuesta: text, image, image_text, audio, audio_text';
COMMENT ON COLUMN whatsapp_quick_replies.content_text IS 'Texto de la respuesta (requerido para text, image_text, audio_text)';
COMMENT ON COLUMN whatsapp_quick_replies.media_path IS 'Ruta al archivo en Storage (requerido para image, image_text, audio, audio_text)';
COMMENT ON COLUMN whatsapp_quick_replies.media_type IS 'Tipo de media: image o audio (requerido si hay media_path)';

-- ============================================================================
-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================================================

-- Índice para búsquedas por cuenta
CREATE INDEX IF NOT EXISTS idx_quick_replies_account ON whatsapp_quick_replies(account_id);

-- Índice para búsquedas por trigger (búsqueda rápida cuando usuario escribe "/")
CREATE INDEX IF NOT EXISTS idx_quick_replies_trigger ON whatsapp_quick_replies(account_id, trigger);

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_quick_replies_created ON whatsapp_quick_replies(created_at DESC);

-- Índice compuesto para búsquedas frecuentes (cuenta + tipo)
CREATE INDEX IF NOT EXISTS idx_quick_replies_account_type ON whatsapp_quick_replies(account_id, type);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_quick_replies (permisivas por ahora)
CREATE POLICY "whatsapp_quick_replies_select_all" 
  ON whatsapp_quick_replies FOR SELECT 
  USING (true);

CREATE POLICY "whatsapp_quick_replies_insert_all" 
  ON whatsapp_quick_replies FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "whatsapp_quick_replies_update_all" 
  ON whatsapp_quick_replies FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "whatsapp_quick_replies_delete_all" 
  ON whatsapp_quick_replies FOR DELETE 
  USING (true);

-- ============================================================================
-- 4. FUNCIÓN HELPER: Obtener respuestas rápidas con búsqueda
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quick_replies(
  p_account_id UUID,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  account_id UUID,
  trigger TEXT,
  name TEXT,
  type TEXT,
  content_text TEXT,
  media_path TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qr.id,
    qr.account_id,
    qr.trigger,
    qr.name,
    qr.type,
    qr.content_text,
    qr.media_path,
    qr.media_type,
    qr.created_at,
    qr.updated_at
  FROM whatsapp_quick_replies qr
  WHERE qr.account_id = p_account_id
    AND (
      p_search_term IS NULL 
      OR p_search_term = ''
      OR qr.trigger ILIKE '%' || p_search_term || '%'
      OR qr.name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY qr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_quick_replies(UUID, TEXT) IS 'Obtiene respuestas rápidas de una cuenta, opcionalmente filtradas por término de búsqueda';

-- ============================================================================
-- 5. TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whatsapp_quick_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_quick_replies_updated_at
  BEFORE UPDATE ON whatsapp_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_quick_replies_updated_at();

-- ============================================================================
-- 6. VALIDACIONES ADICIONALES (CHECK CONSTRAINTS)
-- ============================================================================

-- Validar que trigger empiece con "/"
ALTER TABLE whatsapp_quick_replies
  ADD CONSTRAINT check_trigger_starts_with_slash
  CHECK (trigger LIKE '/%');

-- Validar que content_text esté presente cuando es requerido
ALTER TABLE whatsapp_quick_replies
  ADD CONSTRAINT check_content_text_required
  CHECK (
    (type IN ('text', 'image_text', 'audio_text') AND content_text IS NOT NULL)
    OR (type IN ('image', 'audio') AND content_text IS NULL)
  );

-- Validar que media_path esté presente cuando es requerido
ALTER TABLE whatsapp_quick_replies
  ADD CONSTRAINT check_media_path_required
  CHECK (
    (type IN ('image', 'image_text', 'audio', 'audio_text') AND media_path IS NOT NULL)
    OR (type = 'text' AND media_path IS NULL)
  );

-- Validar que media_type esté presente cuando hay media_path
ALTER TABLE whatsapp_quick_replies
  ADD CONSTRAINT check_media_type_required
  CHECK (
    (media_path IS NOT NULL AND media_type IS NOT NULL)
    OR (media_path IS NULL)
  );

-- ============================================================================
-- 7. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 009 completada: Respuestas Rápidas para WhatsApp';
  RAISE NOTICE '   - Tabla whatsapp_quick_replies creada';
  RAISE NOTICE '   - Índices creados';
  RAISE NOTICE '   - RLS habilitado';
  RAISE NOTICE '   - Función get_quick_replies creada';
  RAISE NOTICE '   - Trigger update_whatsapp_quick_replies_updated_at creado';
  RAISE NOTICE '   - Validaciones (CHECK constraints) agregadas';
END $$;

