# 🔐 Configurar Variables de Entorno para Meta OAuth

## 📋 Variables Necesarias

Para que SUBFASE 3.2 funcione, necesitas configurar estas variables en Supabase:

### Variables Requeridas:

1. **META_APP_ID** - ID de tu App de Meta
2. **META_APP_SECRET** - Secret de tu App de Meta
3. **META_OAUTH_REDIRECT_URI** - URI de redirección (opcional, se genera automáticamente)

---

## ✅ PASO 1: Obtener META_APP_ID y META_APP_SECRET

### 1.1 Ir a Meta Developer Console

1. Ve a: https://developers.facebook.com/
2. Selecciona tu App
3. Ve a **Settings** > **Basic**

### 1.2 Copiar App ID

- **App ID:** Copia este valor
- Ejemplo: `1234567890123456`

### 1.3 Copiar App Secret

- **App Secret:** Haz clic en "Show" y copia el valor
- ⚠️ **IMPORTANTE:** Guárdalo bien, solo se muestra una vez
- Ejemplo: `abc123def456ghi789jkl012mno345pqr`

---

## ✅ PASO 2: Configurar en Supabase

### 2.1 Ir a Edge Functions Settings

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/functions
2. O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions

### 2.2 Agregar Variables de Entorno

1. Busca la sección **"Environment Variables"** o **"Secrets"**
2. Haz clic en **"Add new secret"** o **"Add variable"**
3. Agrega cada variable:

**Variable 1:**
- **Name:** `META_APP_ID`
- **Value:** Tu App ID (ej: `1234567890123456`)
- **Haz clic en "Save"**

**Variable 2:**
- **Name:** `META_APP_SECRET`
- **Value:** Tu App Secret (ej: `abc123def456ghi789jkl012mno345pqr`)
- **Haz clic en "Save"**

**Variable 3 (Opcional):**
- **Name:** `META_OAUTH_REDIRECT_URI`
- **Value:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
- **Haz clic en "Save"**

---

## ✅ PASO 3: Verificar

Después de agregar las variables:

1. **Redespliega la función** (copia/pega el código actualizado)
2. **Ejecuta tests:** `npm run test:oauth-callback`
3. **Verifica logs** en Supabase Dashboard

---

## 📝 Notas Importantes

- ⚠️ **META_APP_SECRET es sensible:** No lo compartas ni lo subas a Git
- ✅ **META_OAUTH_REDIRECT_URI:** Si no lo configuras, se genera automáticamente
- ✅ **Las variables se aplican después de redesplegar** la función

---

## 🐛 Troubleshooting

### Error: "Missing Meta credentials"
- **Solución:** Verifica que agregaste `META_APP_ID` y `META_APP_SECRET` en Supabase

### Error: "Token exchange failed"
- **Solución:** 
  - Verifica que el `META_OAUTH_REDIRECT_URI` coincide con el configurado en Meta Developer Console
  - Verifica que el `code` no haya expirado (los codes expiran rápido)

### Error: "Invalid token response"
- **Solución:** Verifica que las credenciales de Meta sean correctas

---

**¿Ya configuraste las variables? Redespliega la función y ejecuta los tests.**

