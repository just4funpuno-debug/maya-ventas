-- ============================================================================
-- MIGRACIÓN 004: FUNCIONES SQL AUXILIARES PARA WEBHOOK
-- Fecha: 2025-01-30
-- Descripción: Funciones SQL para procesamiento de webhooks
-- ============================================================================

-- ============================================================================
-- 1. INCREMENTAR CONTADOR DE CONTACTO
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_contact_counter(
  p_contact_id UUID,
  p_counter VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_counter = 'total_messages_delivered' THEN
    UPDATE whatsapp_contacts
    SET total_messages_delivered = total_messages_delivered + 1
    WHERE id = p_contact_id;
  ELSIF p_counter = 'total_messages_read' THEN
    UPDATE whatsapp_contacts
    SET total_messages_read = total_messages_read + 1
    WHERE id = p_contact_id;
  ELSIF p_counter = 'total_messages_sent' THEN
    UPDATE whatsapp_contacts
    SET total_messages_sent = total_messages_sent + 1
    WHERE id = p_contact_id;
  ELSE
    RAISE EXCEPTION 'Contador desconocido: %', p_counter;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_contact_counter IS 'Incrementa un contador específico del contacto (total_messages_delivered, total_messages_read, total_messages_sent)';

