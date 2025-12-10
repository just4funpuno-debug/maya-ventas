# 📋 Resumen Ejecutivo: Configurar Webhook de WhatsApp

## 🎯 Objetivo

Configurar el webhook de WhatsApp para recibir mensajes y actualizaciones de estado automáticamente.

---

## ✅ Pasos Rápidos (15-20 minutos)

### 1️⃣ Ejecutar SQL (2 min)
- Ve a: Supabase Dashboard > SQL Editor
- Copia SQL de abajo
- Pega y ejecuta

### 2️⃣ Desplegar Función (5 min)
- Ve a: Supabase Dashboard > Edge Functions
- Crea función: `whatsapp-webhook`
- Copia código de `supabase/functions/whatsapp-webhook/index.ts`
- Despliega

### 3️⃣ Configurar en Meta (5 min)
- Ve a: Meta Developer Console
- WhatsApp > Configuration > Webhook
- URL: `https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook`
- Verify Token: (de tu cuenta WhatsApp)
- Suscribe: `messages`, `message_status`

### 4️⃣ Probar (3 min)
- Envía mensaje desde WhatsApp
- Verifica en Supabase: `whatsapp_messages`, `whatsapp_contacts`

---

## 📝 SQL para Copiar y Pegar

```sql
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
```

---

## 📚 Guías Detalladas

- **Guía completa:** `GUIA_DESPLIEGUE_WEBHOOK.md`
- **Pasos inmediatos:** `PASOS_INMEDIATOS_WEBHOOK.md`
- **Ejecutar SQL:** `scripts/ejecutar-migracion-webhook.md`
- **Desplegar función:** `scripts/desplegar-webhook-supabase-dashboard.md`

---

## ✅ Checklist Final

- [ ] SQL ejecutado
- [ ] Función desplegada
- [ ] URL obtenida
- [ ] Verify Token obtenido
- [ ] Webhook configurado en Meta
- [ ] Eventos suscritos
- [ ] Verificación GET probada
- [ ] Mensaje de prueba enviado
- [ ] Datos guardados en BD

---

**¿Necesitas ayuda?** Revisa las guías detalladas o los logs en Supabase Dashboard.

