# ✅ Checklist: Configuración OAuth

## 📋 Estado Actual

### ✅ Ya tienes configurado (Frontend):
- [x] `VITE_META_APP_ID=1253651046588346`
- [x] `VITE_SUPABASE_URL=https://alwxhiombhfyjyyziyxz.supabase.co`
- [x] `META_APP_SECRET` (en .env.local)

---

## 🔧 PASO 1: Configurar Redirect URI en Facebook (5 minutos)

### Tu Redirect URI será:
```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

### Pasos:

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** (App ID: 1253651046588346)
3. **Ve a:** Products → **Facebook Login** → **Settings**
   - O Settings → Basic → Busca sección "Facebook Login"

4. **En "Valid OAuth Redirect URIs":**
   - Haz clic en **"Add URI"** o **"+"**
   - Agrega esta URL exacta:
     ```
     https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
     ```
   - **Sin** trailing slash al final

5. **Haz clic en "Guardar cambios"** (botón azul abajo)

6. **Verifica:** Usa el validador si quieres comprobar que la URI es válida

---

## 🔧 PASO 2: Configurar Secrets en Supabase (5 minutos)

### 2.1. Ir a Supabase Dashboard

**Link directo:**
```
https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/functions
```

O navega manualmente:
- Ve a: https://supabase.com/dashboard
- Selecciona tu proyecto
- Ve a **Settings** → **Edge Functions**

### 2.2. Agregar Secrets

Busca la sección **"Secrets"** o **"Environment Variables"**

**Agrega estos 2 secrets:**

**Secret 1:**
- **Name:** `META_APP_ID`
- **Value:** `1253651046588346`
- Haz clic en **"Save"**

**Secret 2:**
- **Name:** `META_APP_SECRET`  
- **Value:** `6927430dc02034242b7235f1fa86818c` (el que tienes en .env.local)
- Haz clic en **"Save"**

---

## 🔧 PASO 3: Verificar Edge Function (2 minutos)

### 3.1. Verificar que existe

1. **Ve a:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. **Verifica que existe:** `meta-oauth-callback`
3. Si existe → ✅ Listo
4. Si NO existe → Necesitamos desplegarlo

---

## ✅ PASO 4: Probar OAuth (1 minuto)

1. **Reinicia tu servidor de desarrollo** (si está corriendo):
   - Ctrl+C para detenerlo
   - `npm run dev` para iniciarlo de nuevo

2. **Ve a tu CRM:**
   - Menu → **⚙️ Configuración WhatsApp**
   - Haz clic en **"Nueva Cuenta"**
   - Haz clic en **"Conectar con Meta"**

3. **Debería:**
   - ✅ Abrir ventana de Facebook
   - ✅ Pedirte autorizar
   - ✅ Llenar automáticamente el formulario

---

## ❓ Problemas Comunes

### Error: "Invalid redirect_uri"
- **Solución:** Verifica que la URI en Facebook sea EXACTAMENTE igual
- Debe ser: `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
- Sin `/` al final

### Error: "META_APP_ID no configurado"
- **Solución:** Reinicia el servidor de desarrollo

### Error: "OAuth cancelado por el usuario"
- **Normal:** Si cerraste la ventana, inténtalo de nuevo

---

## 📝 Resumen de URLs

**Tu Redirect URI:**
```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Link directo a Secrets de Supabase:**
```
https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/functions
```

**Link directo a Edge Functions:**
```
https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
```

---

**¿En qué paso estás? ¿Ya agregaste el Redirect URI en Facebook?** 🚀


