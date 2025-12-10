-- ============================================================================
-- MIGRACIÓN 005: CAMPOS OAUTH PARA CONEXIÓN AUTOMÁTICA
-- Fecha: 2025-12-02
-- Descripción: Agrega campos necesarios para OAuth de Meta
--               Permite conexión automática sin copiar/pegar datos
-- ============================================================================

-- Agregar campos para OAuth
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS meta_app_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS meta_user_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_method VARCHAR(20) 
    CHECK (connection_method IN ('manual', 'oauth')) 
    DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS coexistence_status VARCHAR(20)
    CHECK (coexistence_status IN ('pending', 'connected', 'failed'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS coexistence_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS coexistence_verified_at TIMESTAMPTZ;

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_app_id 
  ON whatsapp_accounts(meta_app_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_connection_method 
  ON whatsapp_accounts(connection_method);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_coexistence_status 
  ON whatsapp_accounts(coexistence_status);

-- Comentarios
COMMENT ON COLUMN whatsapp_accounts.meta_app_id IS 'ID de la App de Meta (para OAuth)';
COMMENT ON COLUMN whatsapp_accounts.meta_user_id IS 'ID del usuario de Meta que autorizó la conexión';
COMMENT ON COLUMN whatsapp_accounts.oauth_access_token IS 'Token de acceso OAuth (temporal, para obtener datos)';
COMMENT ON COLUMN whatsapp_accounts.oauth_refresh_token IS 'Token para renovar OAuth cuando expire';
COMMENT ON COLUMN whatsapp_accounts.oauth_expires_at IS 'Fecha/hora de expiración del token OAuth';
COMMENT ON COLUMN whatsapp_accounts.connection_method IS 'Método de conexión: manual (formulario) o oauth (automático)';
COMMENT ON COLUMN whatsapp_accounts.coexistence_status IS 'Estado de coexistencia: pending (esperando QR), connected (conectado), failed (falló)';
COMMENT ON COLUMN whatsapp_accounts.coexistence_qr_url IS 'URL del QR code si necesita escanearse para coexistencia';
COMMENT ON COLUMN whatsapp_accounts.coexistence_verified_at IS 'Fecha/hora cuando se verificó coexistencia';

-- Actualizar connection_method de cuentas existentes (si no tienen valor)
UPDATE whatsapp_accounts 
SET connection_method = 'manual' 
WHERE connection_method IS NULL;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 005 completada: Campos OAuth agregados a whatsapp_accounts';
END $$;

