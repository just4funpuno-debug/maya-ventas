# 🚀 Guía Paso a Paso: Desplegar Webhook de WhatsApp

Esta guía te llevará paso a paso para desplegar y configurar el webhook de WhatsApp.

---

## 📋 PASO 1: Ejecutar Migración SQL

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor** (menú lateral izquierdo)
3. Haz clic en **New Query**
4. Copia y pega el contenido de `supabase/migrations/004_whatsapp_webhook_functions.sql`
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)
6. Verifica que aparezca: `Success. No rows returned`

### Opción B: Desde Terminal (si tienes Supabase CLI)

```bash
# Si estás linkeado al proyecto
supabase db push

# O ejecutar migración específica
supabase migration up
```

---

## 📋 PASO 2: Instalar Supabase CLI (si no lo tienes)

### Windows (PowerShell)

**Opción 1: Con Scoop (Recomendado)**

```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Opción 2: Descargar binario directamente**

1. Ve a [Releases de Supabase CLI](https://github.com/supabase/cli/releases)
2. Descarga `supabase_windows_amd64.zip` (o la versión para tu arquitectura)
3. Extrae el archivo `supabase.exe`
4. Agrega la carpeta al PATH o muévelo a una carpeta que esté en el PATH

**Opción 3: Usar npx (sin instalar globalmente)**

```bash
npx supabase --version
```

### Verificar instalación

```bash
supabase --version
```

---

## 📋 PASO 3: Login en Supabase

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte. Sigue las instrucciones.

---

## 📋 PASO 4: Obtener Project Reference

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** > **General**
4. Copia el **Reference ID** (algo como `abcdefghijklmnop`)

**Guarda este ID**, lo necesitarás para:
- Linkear el proyecto
- La URL del webhook

---

## 📋 PASO 5: Linkear Proyecto

```bash
supabase link --project-ref TU_PROJECT_REF
```

Reemplaza `TU_PROJECT_REF` con el Reference ID que copiaste.

---

## 📋 PASO 6: Desplegar Edge Function

```bash
supabase functions deploy whatsapp-webhook
```

Esto puede tardar 1-2 minutos. Al finalizar, verás algo como:

```
Deploying whatsapp-webhook...
Function whatsapp-webhook deployed successfully!
```

---

## 📋 PASO 7: Obtener URL del Webhook

Después del despliegue, la URL será:

```
https://TU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
```

**Ejemplo:**
```
https://abcdefghijklmnop.supabase.co/functions/v1/whatsapp-webhook
```

**Guarda esta URL**, la necesitarás para configurar en Meta Developer Console.

---

## 📋 PASO 8: Obtener Verify Token

Necesitas el `verify_token` de una cuenta WhatsApp configurada:

1. Ve a tu app en el navegador
2. Ve a **WhatsApp** > **Administración** > **WhatsApp**
3. Si ya tienes una cuenta configurada, copia el **Verify Token**
4. Si no tienes cuenta, crea una primero (necesitarás los datos de Meta Developer Console)

**Guarda este token**, lo necesitarás para configurar en Meta Developer Console.

---

## 📋 PASO 9: Configurar Webhook en Meta Developer Console

### 9.1. Ir a Meta for Developers

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Inicia sesión con tu cuenta
3. Selecciona tu **App de WhatsApp Business**

### 9.2. Configurar Webhook

1. En el menú lateral, ve a **WhatsApp** > **Configuration**
2. En la sección **Webhook**, haz clic en **Edit**
3. Configura:
   - **Callback URL**: `https://TU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook`
     - Reemplaza `TU_PROJECT_REF` con tu Reference ID
   - **Verify Token**: (el mismo que configuraste en `whatsapp_accounts.verify_token`)
4. Haz clic en **Verify and Save**

### 9.3. Suscribirse a Eventos

Después de verificar, en la misma página:

1. Haz clic en **Manage** (junto a "Webhook fields")
2. Selecciona los eventos:
   - ✅ `messages` (mensajes entrantes y salientes)
   - ✅ `message_status` (estados: sent, delivered, read, failed)
3. Haz clic en **Save**

---

## 📋 PASO 10: Probar Webhook

### 10.1. Probar Verificación GET

Abre tu navegador o usa curl:

```bash
curl "https://TU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=12345"
```

**Debería retornar:** `12345`

Si retorna `Forbidden`, verifica:
- El `verify_token` es correcto
- La cuenta está activa en `whatsapp_accounts`

### 10.2. Enviar Mensaje de Prueba

1. Envía un mensaje desde WhatsApp al número de tu negocio
2. Ve a Supabase Dashboard > **Table Editor** > `whatsapp_messages`
3. Deberías ver el mensaje guardado
4. Ve a `whatsapp_contacts` y verifica que se creó/actualizó el contacto
5. Ve a `whatsapp_webhook_logs` para ver el log del webhook

---

## ✅ Checklist Final

- [ ] Migración SQL ejecutada (`increment_contact_counter` creada)
- [ ] Supabase CLI instalado
- [ ] Login en Supabase CLI
- [ ] Proyecto linkeado
- [ ] Edge Function desplegada
- [ ] URL del webhook obtenida
- [ ] Verify Token obtenido
- [ ] Webhook configurado en Meta Developer Console
- [ ] Eventos suscritos (`messages`, `message_status`)
- [ ] Verificación GET probada (retorna challenge)
- [ ] Mensaje de prueba enviado
- [ ] Mensaje guardado en BD
- [ ] Contacto creado/actualizado
- [ ] Log guardado en `whatsapp_webhook_logs`

---

## 🐛 Troubleshooting

### Error: "Function not found"
- Verifica que desplegaste la función: `supabase functions deploy whatsapp-webhook`
- Verifica que estás usando la URL correcta

### Error: "Forbidden" en verificación GET
- Verifica que el `verify_token` coincide con el de `whatsapp_accounts`
- Verifica que la cuenta está activa (`active = true`)

### No se reciben mensajes
- Verifica que suscribiste los eventos en Meta Developer Console
- Verifica los logs en `whatsapp_webhook_logs`
- Verifica los logs de la Edge Function en Supabase Dashboard

### Error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados"
- Las variables de entorno se configuran automáticamente en Supabase
- Si ves este error, verifica que la función está desplegada correctamente

---

## 📞 Siguiente Paso

Una vez que todo esté funcionando, puedes continuar con:
- **SUBFASE 1.6**: Integración en App Principal
- O probar enviar mensajes desde la app

---

**Última actualización:** 2025-01-30

