# WhatsApp Webhook Edge Function

Edge Function para recibir webhooks de WhatsApp Cloud API.

## 📋 Descripción

Esta función maneja:
- **GET**: Verificación del webhook durante el setup en Meta Developer Console
- **POST**: Procesamiento de eventos (mensajes entrantes, status de mensajes)

## 🚀 Despliegue

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

### 2. Login en Supabase

```bash
supabase login
```

### 3. Linkear proyecto

```bash
supabase link --project-ref tu-project-ref
```

### 4. Desplegar función

```bash
supabase functions deploy whatsapp-webhook
```

### 5. Obtener URL de la función

```bash
supabase functions list
```

La URL será: `https://[project-ref].supabase.co/functions/v1/whatsapp-webhook`

## ⚙️ Configuración en Meta Developer Console

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu app de WhatsApp Business
3. Ve a **WhatsApp > Configuration**
4. En **Webhook**, haz clic en **Edit**
5. Configura:
   - **Callback URL**: `https://[project-ref].supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: (el mismo que configuraste en `whatsapp_accounts.verify_token`)
6. Haz clic en **Verify and Save**
7. Suscríbete a los eventos:
   - ✅ `messages`
   - ✅ `message_status`

## 🔐 Variables de Entorno

La función usa estas variables de entorno (configuradas automáticamente en Supabase):

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (para acceso completo a BD)

## 📝 Flujo de Procesamiento

### GET (Verificación)
1. Meta envía: `?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY`
2. La función busca cuenta con ese `verify_token`
3. Si encuentra, retorna el `challenge`
4. Meta verifica y activa el webhook

### POST (Eventos)
1. Meta envía payload con eventos
2. La función extrae `phone_number_id` del metadata
3. Busca cuenta activa con ese `phone_number_id`
4. Procesa mensajes:
   - Crea/actualiza contacto
   - Guarda mensaje en BD
   - Actualiza `last_interaction_at` si es del cliente
5. Procesa statuses:
   - Actualiza status del mensaje
   - Incrementa contadores (delivered, read)

## 🧪 Testing

### 1. Verificación GET

```bash
curl "https://[project-ref].supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"
```

Debería retornar: `12345`

### 2. POST de prueba

Usa el script `scripts/test-webhook.sh` o envía un payload de prueba:

```bash
curl -X POST "https://[project-ref].supabase.co/functions/v1/whatsapp-webhook" \
  -H "Content-Type: application/json" \
  -d @scripts/test-webhook-payload.json
```

## 📊 Logs

Todos los webhooks se guardan en `whatsapp_webhook_logs` para debugging:
- `event_type`: Tipo de evento
- `payload`: Payload completo (JSONB)
- `processed`: Si se procesó correctamente
- `error_message`: Error si hubo

## 🔍 Debugging

1. Ver logs en Supabase Dashboard > Edge Functions > whatsapp-webhook
2. Ver registros en tabla `whatsapp_webhook_logs`
3. Verificar que los mensajes se guardan en `whatsapp_messages`
4. Verificar que los contactos se crean/actualizan en `whatsapp_contacts`

## ⚠️ Notas Importantes

- El `verify_token` debe ser único por cuenta (o al menos único en tu sistema)
- Los mensajes enviados manualmente desde el celular aparecen como mensajes entrantes
- La detección de envíos manuales se refinará en fases posteriores
- WhatsApp espera siempre un `200 OK`, incluso si hay errores internos

