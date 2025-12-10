# 🔧 FASE 2: Configurar OAuth en Meta Developer Console

## 📋 Objetivo

Configurar OAuth en Meta Developer Console para permitir conexión automática de cuentas WhatsApp.

**Tiempo estimado:** 30 minutos

---

## ✅ Checklist Pre-Configuración

Antes de comenzar, asegúrate de tener:
- [ ] Acceso a Meta Developer Console (https://developers.facebook.com/)
- [ ] Una App de WhatsApp Business creada
- [ ] Permisos de administrador en la App
- [ ] Acceso a Supabase Dashboard (para agregar variables de entorno)

---

## 🚀 PASO 1: Obtener App ID y App Secret

### 1.1 Ir a Settings de tu App

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** de WhatsApp Business
3. **En el menú lateral izquierdo:** Haz clic en **"Settings"** > **"Basic"**

### 1.2 Copiar App ID

1. **Busca la sección:** "App ID"
2. **Copia el App ID** (ejemplo: `1234567890123456`)
3. **Guárdalo** - Lo necesitarás después

### 1.3 Obtener App Secret

1. **En la misma página:** Busca la sección **"App Secret"**
2. **Haz clic en "Show"** (mostrar)
3. **Ingresa tu contraseña de Facebook** si te lo pide
4. **Copia el App Secret** (ejemplo: `abc123def456ghi789jkl012mno345pq`)
5. **⚠️ IMPORTANTE:** Guárdalo en un lugar seguro, no lo compartas

---

## 🔗 PASO 2: Configurar OAuth Redirect URI

### 2.1 Obtener tu Supabase Project Reference

1. **Ve a:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **Ve a:** Settings > API
4. **Busca:** "Project URL" o "Reference ID"
5. **Copia el Project Reference** (ejemplo: `abcdefghijklmnop`)

### 2.2 Construir Redirect URI

Tu Redirect URI será:
```
https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
```

**Ejemplo:**
```
https://abcdefghijklmnop.supabase.co/functions/v1/meta-oauth-callback
```

### 2.3 Agregar Redirect URI en Meta

1. **En Meta Developer Console:** Ve a **"Settings"** > **"Basic"**
2. **Desplázate hacia abajo:** Busca la sección **"Add Platform"** o **"Valid OAuth Redirect URIs"**
3. **Si no ves la sección:**
   - Ve a **"Products"** en el menú lateral
   - Haz clic en **"Facebook Login"** (si no está agregado, agrégalo)
   - Ve a **"Settings"** de Facebook Login
4. **En "Valid OAuth Redirect URIs":**
   - Haz clic en **"Add URI"** o **"+"**
   - Pega tu Redirect URI:
     ```
     https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
     ```
   - Haz clic en **"Save Changes"**

---

## 🔐 PASO 3: Configurar Permisos (Scopes)

### 3.1 Ir a App Review

1. **En Meta Developer Console:** Ve a **"App Review"** en el menú lateral
2. **O ve directamente a:** https://developers.facebook.com/apps/[TU-APP-ID]/app-review/

### 3.2 Verificar Permisos Necesarios

Necesitamos estos permisos:
- ✅ `whatsapp_business_management`
- ✅ `whatsapp_business_messaging`
- ✅ `business_management`

### 3.3 Solicitar Permisos (si no los tienes)

1. **En "App Review":** Busca cada permiso
2. **Si no está aprobado:**
   - Haz clic en **"Request"** o **"Add Permission"**
   - Completa el formulario de solicitud
   - **Nota:** Algunos permisos pueden requerir revisión de Meta

### 3.4 Verificar Permisos en OAuth

1. **Ve a:** **"Settings"** > **"Basic"**
2. **Desplázate hacia abajo:** Busca **"User Token Generator"** o **"Access Tokens"**
3. **Verifica que los permisos estén listados**

---

## 🔑 PASO 4: Agregar Variables de Entorno en Supabase

### 4.1 Ir a Supabase Dashboard

1. **Ve a:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **Ve a:** Settings > Edge Functions

### 4.2 Agregar Variables de Entorno

1. **Busca la sección:** "Secrets" o "Environment Variables"
2. **Haz clic en "Add new secret"** o **"+"**

#### Variable 1: META_APP_ID
- **Name:** `META_APP_ID`
- **Value:** [Tu App ID copiado en PASO 1.2]
- **Haz clic en "Save"**

#### Variable 2: META_APP_SECRET
- **Name:** `META_APP_SECRET`
- **Value:** [Tu App Secret copiado en PASO 1.3]
- **⚠️ IMPORTANTE:** Este es un secreto, no lo compartas
- **Haz clic en "Save"**

#### Variable 3: META_OAUTH_REDIRECT_URI
- **Name:** `META_OAUTH_REDIRECT_URI`
- **Value:** `https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback`
- **Reemplaza** `[TU-PROJECT-REF]` con tu Project Reference real
- **Haz clic en "Save"**

---

## ✅ Verificación Final

### Checklist de Verificación:

- [ ] App ID copiado y guardado
- [ ] App Secret copiado y guardado (en lugar seguro)
- [ ] Redirect URI agregado en Meta Developer Console
- [ ] Permisos verificados/solicitados:
  - [ ] `whatsapp_business_management`
  - [ ] `whatsapp_business_messaging`
  - [ ] `business_management`
- [ ] Variables de entorno agregadas en Supabase:
  - [ ] `META_APP_ID`
  - [ ] `META_APP_SECRET`
  - [ ] `META_OAUTH_REDIRECT_URI`

---

## 🐛 Troubleshooting

### Error: "Invalid Redirect URI"
- **Causa:** El Redirect URI no coincide exactamente
- **Solución:** Verifica que el URI sea exactamente igual en Meta y Supabase
- **Nota:** No debe terminar con `/` si no lo pusiste

### Error: "Permissions not granted"
- **Causa:** Los permisos no están aprobados
- **Solución:** 
  - Verifica en App Review que los permisos estén aprobados
  - Si están en revisión, espera la aprobación de Meta
  - Algunos permisos pueden requerir verificación de negocio

### Error: "App Secret incorrect"
- **Causa:** El App Secret está mal copiado
- **Solución:** 
  - Vuelve a copiar el App Secret desde Meta Developer Console
  - Asegúrate de no tener espacios extra
  - Verifica que esté correctamente guardado en Supabase

---

## 📝 Notas Importantes

1. **App Secret:** Nunca lo compartas ni lo commitees a Git
2. **Redirect URI:** Debe ser HTTPS (Supabase lo proporciona automáticamente)
3. **Permisos:** Algunos pueden requerir revisión de Meta (puede tardar días)
4. **Testing:** Puedes probar OAuth en modo desarrollo antes de solicitar permisos

---

## 🚀 Próximo Paso

Una vez completada la FASE 2, continuamos con:

**FASE 3: Edge Function para OAuth Callback**

---

## 📚 Referencias

- Meta Developer Console: https://developers.facebook.com/
- Supabase Dashboard: https://supabase.com/dashboard
- Documentación OAuth Meta: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow

---

**¿Tienes alguna duda durante la configuración? Avísame y te ayudo.**

