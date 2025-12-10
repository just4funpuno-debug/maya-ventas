# 🚀 FASE 2: Configurar OAuth - Paso a Paso

## ✅ Empezamos

Vamos a configurar OAuth en Meta Developer Console paso a paso.

---

## 📋 PASO 1: Obtener App ID y App Secret

### 1.1 Ir a Meta Developer Console

1. **Abre tu navegador**
2. **Ve a:** https://developers.facebook.com/
3. **Inicia sesión** con tu cuenta de Facebook (la que tiene la App de WhatsApp Business)

### 1.2 Seleccionar tu App

1. **En la página principal:** Verás una lista de tus Apps
2. **Haz clic en tu App** de WhatsApp Business
   - Si no la ves, busca en "My Apps" o crea una nueva

### 1.3 Ir a Settings

1. **En el menú lateral izquierdo:** Busca **"Settings"**
2. **Haz clic en "Settings"** > **"Basic"**
3. **O ve directamente a:** Settings > Basic

### 1.4 Copiar App ID

1. **Busca la sección "App ID"**
2. **Verás un número largo** (ejemplo: `1234567890123456`)
3. **Copia el App ID**
4. **Guárdalo temporalmente** (lo necesitaremos después)

**¿Ya copiaste el App ID?** ✅

### 1.5 Obtener App Secret

1. **En la misma página:** Busca la sección **"App Secret"**
2. **Haz clic en "Show"** (mostrar)
3. **Si te pide contraseña:** Ingresa tu contraseña de Facebook
4. **Copia el App Secret** (ejemplo: `abc123def456ghi789jkl012mno345pq`)
5. **⚠️ IMPORTANTE:** Guárdalo en un lugar seguro, no lo compartas

**¿Ya copiaste el App Secret?** ✅

---

## 📋 PASO 2: Obtener tu Project Reference de Supabase

### 2.1 Ir a Supabase Dashboard

1. **Abre otra pestaña** en tu navegador
2. **Ve a:** https://supabase.com/dashboard
3. **Inicia sesión** si es necesario

### 2.2 Seleccionar tu Proyecto

1. **Selecciona tu proyecto** de Supabase
2. **Si tienes varios proyectos:** Elige el correcto

### 2.3 Obtener Project Reference

1. **Ve a:** Settings (configuración) en el menú lateral
2. **Haz clic en "API"** o busca "Project URL"
3. **Busca "Reference ID"** o "Project Reference"
   - Puede estar en la URL también: `https://[REF].supabase.co`
4. **Copia el Project Reference** (ejemplo: `abcdefghijklmnop`)

**¿Ya copiaste tu Project Reference?** ✅

---

## 📋 PASO 3: Construir Redirect URI

Tu Redirect URI será:
```
https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
```

**Ejemplo:**
Si tu Project Reference es `abcdefghijklmnop`, tu Redirect URI será:
```
https://abcdefghijklmnop.supabase.co/functions/v1/meta-oauth-callback
```

**Copia este URI completo** (reemplazando `[TU-PROJECT-REF]` con tu Project Reference real)

**¿Ya tienes tu Redirect URI completo?** ✅

---

## 📋 PASO 4: Agregar Redirect URI en Meta

### 4.1 Volver a Meta Developer Console

1. **Vuelve a la pestaña** de Meta Developer Console
2. **Asegúrate de estar en:** Settings > Basic

### 4.2 Buscar Valid OAuth Redirect URIs

1. **Desplázate hacia abajo** en la página
2. **Busca la sección "Valid OAuth Redirect URIs"**
   - Si no la ves, sigue al paso 4.3

### 4.3 Si no ves la sección (Agregar Facebook Login)

1. **Ve a "Products"** en el menú lateral izquierdo
2. **Busca "Facebook Login"**
3. **Si no está agregado:**
   - Haz clic en **"+"** o **"Add Product"**
   - Busca **"Facebook Login"**
   - Haz clic en **"Set Up"**
4. **Ve a "Settings"** de Facebook Login
5. **Ahora deberías ver "Valid OAuth Redirect URIs"**

### 4.4 Agregar Redirect URI

1. **En "Valid OAuth Redirect URIs":**
   - Haz clic en **"Add URI"** o **"+"**
   - Pega tu Redirect URI completo:
     ```
     https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
     ```
   - Haz clic en **"Save Changes"** o **"Save"**

**¿Ya agregaste el Redirect URI?** ✅

---

## 📋 PASO 5: Verificar Permisos

### 5.1 Ir a App Review

1. **En Meta Developer Console:** Ve a **"App Review"** en el menú lateral
2. **O ve directamente a:** https://developers.facebook.com/apps/[TU-APP-ID]/app-review/

### 5.2 Verificar Permisos Necesarios

Necesitamos estos permisos:
- ✅ `whatsapp_business_management`
- ✅ `whatsapp_business_messaging`
- ✅ `business_management`

### 5.3 Verificar Estado

1. **Busca cada permiso** en la lista
2. **Verifica el estado:**
   - ✅ **Approved** (Aprobado) - Listo para usar
   - ⏳ **In Review** (En revisión) - Esperando aprobación
   - ❌ **Not Requested** (No solicitado) - Necesitas solicitarlo

### 5.4 Si Necesitas Solicitar Permisos

1. **Haz clic en "Request"** o **"Add Permission"**
2. **Completa el formulario** de solicitud
3. **Nota:** Algunos permisos pueden requerir revisión de Meta (puede tardar días)

**¿Ya verificaste los permisos?** ✅

---

## 📋 PASO 6: Agregar Variables de Entorno en Supabase

### 6.1 Ir a Supabase Dashboard

1. **Vuelve a la pestaña** de Supabase Dashboard
2. **Asegúrate de estar en tu proyecto**

### 6.2 Ir a Edge Functions Settings

1. **Ve a:** Settings (configuración)
2. **Haz clic en "Edge Functions"** o busca "Secrets"
3. **O ve directamente a:** Settings > Edge Functions

### 6.3 Agregar Secret 1: META_APP_ID

1. **Busca la sección "Secrets"** o "Environment Variables"
2. **Haz clic en "Add new secret"** o **"+"**
3. **Name:** `META_APP_ID`
4. **Value:** [Pega el App ID que copiaste en PASO 1.4]
5. **Haz clic en "Save"** o **"Add"**

**¿Ya agregaste META_APP_ID?** ✅

### 6.4 Agregar Secret 2: META_APP_SECRET

1. **Haz clic en "Add new secret"** nuevamente
2. **Name:** `META_APP_SECRET`
3. **Value:** [Pega el App Secret que copiaste en PASO 1.5]
4. **⚠️ IMPORTANTE:** Este es un secreto, no lo compartas
5. **Haz clic en "Save"**

**¿Ya agregaste META_APP_SECRET?** ✅

### 6.5 Agregar Secret 3: META_OAUTH_REDIRECT_URI

1. **Haz clic en "Add new secret"** nuevamente
2. **Name:** `META_OAUTH_REDIRECT_URI`
3. **Value:** [Pega el Redirect URI completo que construiste en PASO 3]
   ```
   https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
   ```
4. **Haz clic en "Save"**

**¿Ya agregaste META_OAUTH_REDIRECT_URI?** ✅

---

## ✅ Verificación Final

### Checklist:

- [ ] App ID copiado y guardado
- [ ] App Secret copiado y guardado (en lugar seguro)
- [ ] Project Reference de Supabase copiado
- [ ] Redirect URI construido correctamente
- [ ] Redirect URI agregado en Meta Developer Console
- [ ] Permisos verificados (o solicitados):
  - [ ] `whatsapp_business_management`
  - [ ] `whatsapp_business_messaging`
  - [ ] `business_management`
- [ ] Variables de entorno agregadas en Supabase:
  - [ ] `META_APP_ID`
  - [ ] `META_APP_SECRET`
  - [ ] `META_OAUTH_REDIRECT_URI`

---

## 🎉 ¡FASE 2 Completada!

Si completaste todos los pasos, **FASE 2 está lista**.

**Próximo paso:** FASE 3 - Edge Function para OAuth Callback

---

## 🐛 Si Tienes Problemas

**Error: "Invalid Redirect URI"**
- Verifica que el URI sea exactamente igual en Meta y Supabase
- No debe terminar con `/` si no lo pusiste

**Error: "Permissions not granted"**
- Algunos permisos pueden requerir revisión de Meta
- Puedes continuar con FASE 3 y probar después

**Error: "App Secret incorrect"**
- Vuelve a copiar el App Secret desde Meta Developer Console
- Asegúrate de no tener espacios extra

---

**¿Tienes alguna duda durante la configuración? Avísame y te ayudo.**

**¿Ya completaste todos los pasos?** ✅

