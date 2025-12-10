# 🔧 Configurar Webhook en Meta Developer Console

## 📋 Información Necesaria

**URL del Webhook:**
```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/whatsapp-webhook
```

**Verify Token:**
- Obtén el `verify_token` de tu cuenta WhatsApp configurada en la app
- O configúralo en `whatsapp_accounts` si aún no lo tienes

---

## 🚀 Pasos Detallados

### 1. Ir a Meta Developer Console

1. Ve a: https://developers.facebook.com/
2. Inicia sesión con tu cuenta
3. Selecciona tu **App de WhatsApp Business**

### 2. Configurar Webhook

1. En el menú lateral izquierdo, ve a **WhatsApp** > **Configuration**
2. En la sección **Webhook**, haz clic en **Edit** (o **Configure**)
3. Configura los siguientes campos:

   **Callback URL:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/whatsapp-webhook
   ```

   **Verify Token:**
   ```
   [TU_VERIFY_TOKEN]
   ```
   - Este debe ser el mismo que configuraste en `whatsapp_accounts.verify_token`
   - Si no tienes uno, créalo en tu app primero

4. Haz clic en **Verify and Save**

### 3. Suscribirse a Eventos

Después de verificar exitosamente:

1. En la misma página, busca la sección **Webhook fields**
2. Haz clic en **Manage** (o el botón de configuración)
3. Selecciona los siguientes eventos:
   - ✅ **messages** (mensajes entrantes y salientes)
   - ✅ **message_status** (estados: sent, delivered, read, failed)
4. Haz clic en **Save**

---

## ✅ Verificación

### Probar Verificación GET

Abre en tu navegador:

```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345
```

**Debería retornar:** `12345`

Si retorna `Forbidden`:
- Verifica que el `verify_token` es correcto
- Verifica que la cuenta está activa en `whatsapp_accounts`

### Probar con Mensaje Real

1. Envía un mensaje desde WhatsApp al número de tu negocio
2. Ve a Supabase Dashboard > **Table Editor**
3. Verifica:
   - `whatsapp_messages` → Debería tener el mensaje
   - `whatsapp_contacts` → Debería tener/actualizar el contacto
   - `whatsapp_webhook_logs` → Debería tener el log del webhook

---

## 🐛 Troubleshooting

### Error: "Verification failed"
- Verifica que la URL es correcta
- Verifica que el `verify_token` coincide exactamente
- Verifica que la función está desplegada

### No se reciben mensajes
- Verifica que suscribiste los eventos (`messages`, `message_status`)
- Verifica los logs en Supabase Dashboard > Edge Functions > whatsapp-webhook > Logs
- Verifica `whatsapp_webhook_logs` en Table Editor

### Error en logs: "Account no encontrada"
- Verifica que tienes una cuenta activa en `whatsapp_accounts`
- Verifica que el `phone_number_id` coincide con el de Meta

---

**Última actualización:** 2025-12-02

