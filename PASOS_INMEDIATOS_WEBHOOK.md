# 🎯 Pasos Inmediatos para Configurar Webhook

Sigue estos pasos en orden. Cada paso tiene instrucciones detalladas.

---

## ✅ PASO 1: Ejecutar Migración SQL (5 minutos)

**Archivo:** `scripts/ejecutar-migracion-webhook.md`

1. Ve a Supabase Dashboard > SQL Editor
2. Copia y pega el SQL de `supabase/migrations/004_whatsapp_webhook_functions.sql`
3. Ejecuta (Run)
4. Verifica que dice "Success"

**✅ Checklist:**
- [ ] Función `increment_contact_counter` creada

---

## ✅ PASO 2: Desplegar Edge Function (10 minutos)

**Archivo:** `scripts/desplegar-webhook-supabase-dashboard.md`

### Opción A: Desde Dashboard (Más Fácil)

1. Ve a Supabase Dashboard > Edge Functions
2. Crea nueva función: `whatsapp-webhook`
3. Copia el contenido de `supabase/functions/whatsapp-webhook/index.ts`
4. Pega y despliega

### Opción B: Con CLI (si lo instalaste)

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy whatsapp-webhook
```

**✅ Checklist:**
- [ ] Función desplegada
- [ ] URL obtenida: `https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook`

---

## ✅ PASO 3: Obtener Verify Token (2 minutos)

1. Abre tu app en el navegador
2. Ve a **WhatsApp** > **Administración** > **WhatsApp**
3. Si ya tienes una cuenta configurada:
   - Copia el **Verify Token**
4. Si NO tienes cuenta:
   - Necesitas crear una primero con los datos de Meta Developer Console

**✅ Checklist:**
- [ ] Verify Token obtenido

---

## ✅ PASO 4: Configurar en Meta Developer Console (10 minutos)

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu App de WhatsApp Business
3. Ve a **WhatsApp** > **Configuration**
4. En **Webhook**, haz clic en **Edit**
5. Configura:
   - **Callback URL**: `https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: (el que copiaste en PASO 3)
6. Haz clic en **Verify and Save**
7. Suscríbete a eventos:
   - ✅ `messages`
   - ✅ `message_status`

**✅ Checklist:**
- [ ] Webhook configurado
- [ ] Verificación exitosa (debería decir "Verified")
- [ ] Eventos suscritos

---

## ✅ PASO 5: Probar Webhook (5 minutos)

### 5.1. Probar Verificación GET

Abre en tu navegador:

```
https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345
```

**Debería retornar:** `12345`

Si retorna `Forbidden`:
- Verifica que el `verify_token` es correcto
- Verifica que la cuenta está activa

### 5.2. Enviar Mensaje de Prueba

1. Envía un mensaje desde WhatsApp al número de tu negocio
2. Ve a Supabase Dashboard > **Table Editor**
3. Verifica:
   - `whatsapp_messages` → Debería tener el mensaje
   - `whatsapp_contacts` → Debería tener/actualizar el contacto
   - `whatsapp_webhook_logs` → Debería tener el log

**✅ Checklist:**
- [ ] Verificación GET funciona
- [ ] Mensaje de prueba enviado
- [ ] Mensaje guardado en BD
- [ ] Contacto creado/actualizado
- [ ] Log guardado

---

## 🎉 ¡Listo!

Si todos los pasos están completados, el webhook está funcionando correctamente.

**Próximo paso:** Continuar con SUBFASE 1.6 o probar enviar más mensajes.

---

## 🐛 Si algo falla

1. **Verifica los logs:**
   - Supabase Dashboard > Edge Functions > whatsapp-webhook > Logs
   - Supabase Dashboard > Table Editor > whatsapp_webhook_logs

2. **Revisa la guía completa:**
   - `GUIA_DESPLIEGUE_WEBHOOK.md`

3. **Verifica que:**
   - La migración SQL se ejecutó correctamente
   - La función está desplegada
   - El verify_token coincide
   - Los eventos están suscritos en Meta

---

**Última actualización:** 2025-01-30

