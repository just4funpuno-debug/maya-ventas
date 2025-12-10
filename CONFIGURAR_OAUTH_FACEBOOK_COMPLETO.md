# 🔧 Configurar OAuth de Facebook para Conexión Automática

## 🎯 Objetivo
Habilitar OAuth en tu app de Facebook para que el botón "Conectar con Meta" funcione automáticamente.

---

## 📋 PASO 1: Configurar la App en Meta Developer Console

### 1.1. Acceder a la App

1. Ve a: **https://developers.facebook.com/**
2. Inicia sesión con tu cuenta de Facebook/Meta
3. Ve a **"My Apps"** → Selecciona tu **App de WhatsApp Business**
   - Si no tienes una, créala: **"Create App"** → **"Business"** → **"WhatsApp"**

### 1.2. Obtener App ID y App Secret

1. En el menú lateral, ve a **Settings** → **Basic**
2. **Copia estos datos:**
   ```
   App ID:         [número largo, ej: 1253651046588346]
   App Secret:     [string largo, haz clic en "Show" para verlo]
   ```
   ⚠️ **Importante:** Guarda el App Secret, lo necesitarás después

### 1.3. Configurar OAuth Redirect URI

1. En el menú lateral, ve a **Settings** → **Basic**
2. Desplázate hasta la sección **"Facebook Login"** o **"OAuth Settings"**
3. Si no está habilitado, haz clic en **"Set up"** o **"Add Product"** → **"Facebook Login"**

4. En **"Valid OAuth Redirect URIs"**, agrega:
   ```
   https://[tu-proyecto].supabase.co/functions/v1/meta-oauth-callback
   ```
   
   **Ejemplo:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
   
   ⚠️ **Reemplaza** `[tu-proyecto]` con el nombre de tu proyecto de Supabase
   - Lo encuentras en: Supabase Dashboard → Settings → API → Project URL

5. Haz clic en **"Save Changes"**

### 1.4. Configurar Permisos (Scopes)

1. Ve a **App Review** → **Permissions and Features**
2. Solicita estos permisos (si no los tienes):
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
   - ✅ `business_management`

3. Si están en modo "Development", puedes usarlos sin revisión
4. Si están en modo "Live", necesitarás solicitar revisión de Meta

### 1.5. Configurar App Domains (Opcional pero recomendado)

1. En **Settings** → **Basic**
2. En **"App Domains"**, agrega:
   ```
   supabase.co
   ```
3. Haz clic en **"Save Changes"**

---

## 📋 PASO 2: Configurar Variables de Entorno

### 2.1. En Supabase Edge Functions

1. Ve a tu **Supabase Dashboard**
2. Ve a **Edge Functions** → **Settings** → **Secrets**
3. Agrega estos secrets:

   **META_APP_ID:**
   ```
   [El App ID que copiaste, ej: 1253651046588346]
   ```

   **META_APP_SECRET:**
   ```
   [El App Secret que copiaste]
   ```

   **META_OAUTH_REDIRECT_URI:** (Opcional, se genera automáticamente)
   ```
   https://[tu-proyecto].supabase.co/functions/v1/meta-oauth-callback
   ```

### 2.2. En el Frontend (.env)

1. En la raíz de tu proyecto, crea o edita el archivo `.env` o `.env.local`
2. Agrega:

   ```env
   VITE_META_APP_ID=1253651046588346
   VITE_SUPABASE_URL=https://[tu-proyecto].supabase.co
   ```

   **Ejemplo:**
   ```env
   VITE_META_APP_ID=1253651046588346
   VITE_SUPABASE_URL=https://alwxhiombhfyjyyziyxz.supabase.co
   ```

3. **Reinicia el servidor de desarrollo** para que tome las nuevas variables

---

## 📋 PASO 3: Verificar Configuración

### 3.1. Verificar Edge Function

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Verifica que `meta-oauth-callback` esté desplegada
3. Haz clic en la función para ver los logs

### 3.2. Probar OAuth

1. En tu CRM, ve a **⚙️ Configuración WhatsApp**
2. Haz clic en **"Nueva Cuenta"**
3. Haz clic en **"Conectar con Meta"**
4. Debería abrirse una ventana de Facebook para autorizar
5. Si funciona, el formulario se llenará automáticamente

---

## ❓ Problemas Comunes

### Error: "El inicio de sesión con Facebook no está disponible actualmente para esta app"

**Causas posibles:**
1. ❌ Facebook Login no está habilitado en la app
2. ❌ El Redirect URI no está configurado correctamente
3. ❌ La app está en modo "Development" y no tiene permisos
4. ❌ El App ID no coincide con el configurado

**Soluciones:**
1. ✅ Ve a Settings → Basic → Agrega "Facebook Login" como producto
2. ✅ Verifica que el Redirect URI sea exactamente igual en ambos lugares
3. ✅ Asegúrate de que los permisos estén habilitados en App Review
4. ✅ Verifica que `VITE_META_APP_ID` coincida con el App ID de tu app

### Error: "META_APP_ID no configurado"

**Solución:**
- Verifica que `VITE_META_APP_ID` esté en tu archivo `.env`
- Reinicia el servidor de desarrollo
- Verifica que el archivo `.env` esté en la raíz del proyecto

### Error: "Invalid redirect_uri"

**Solución:**
- Verifica que el Redirect URI en Meta Developer Console sea exactamente igual al que está en el código
- Debe ser: `https://[tu-proyecto].supabase.co/functions/v1/meta-oauth-callback`
- No debe tener trailing slash (`/`) al final

### Error: "OAuth cancelado por el usuario"

**Solución:**
- Esto es normal si el usuario cierra la ventana
- Intenta de nuevo y completa la autorización

---

## 🔍 Verificar Estado de la App

### En Meta Developer Console:

1. Ve a **App Review** → **Permissions and Features**
2. Verifica que estos permisos estén **habilitados**:
   - `whatsapp_business_management` ✅
   - `whatsapp_business_messaging` ✅
   - `business_management` ✅

3. Si están en modo "Development", aparecerán con un badge amarillo
4. Si están en modo "Live", aparecerán con un badge verde

---

## 📝 Checklist de Configuración

- [ ] App ID copiado de Meta Developer Console
- [ ] App Secret copiado de Meta Developer Console
- [ ] Facebook Login agregado como producto en la app
- [ ] Redirect URI configurado en Meta Developer Console
- [ ] Permisos habilitados (whatsapp_business_management, etc.)
- [ ] `META_APP_ID` configurado en Supabase Edge Functions Secrets
- [ ] `META_APP_SECRET` configurado en Supabase Edge Functions Secrets
- [ ] `VITE_META_APP_ID` configurado en `.env` del frontend
- [ ] `VITE_SUPABASE_URL` configurado en `.env` del frontend
- [ ] Edge Function `meta-oauth-callback` desplegada
- [ ] Servidor de desarrollo reiniciado

---

## 🎉 Una vez configurado

El botón **"Conectar con Meta"** debería:
1. ✅ Abrir ventana de autorización de Facebook
2. ✅ Permitir autorizar la app
3. ✅ Llenar automáticamente el formulario con:
   - Phone Number ID
   - Business Account ID
   - Phone Number
   - Display Name
4. ✅ Si requiere coexistencia, mostrar QR para escanear

---

**¿Necesitas ayuda con algún paso específico?** 🚀


