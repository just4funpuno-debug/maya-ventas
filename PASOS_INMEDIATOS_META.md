# 🚀 Pasos Inmediatos: Configurar Variables de Meta

## ✅ Estado Actual

- ✅ Credenciales obtenidas y guardadas en `.env.local`
- ⏳ Pendiente: Configurar en Supabase Dashboard

---

## 📋 PASO 1: Ir a Edge Functions Settings (2 minutos)

1. **Abre este enlace:**
   ```
   https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/functions
   ```

2. **O navega manualmente:**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto
   - Ve a **Settings** > **Edge Functions**

---

## 📋 PASO 2: Buscar Sección "Secrets"

En la página de Settings de Edge Functions, busca:
- **"Secrets"** o
- **"Environment Variables"** o
- **"Function Secrets"**

---

## 📋 PASO 3: Agregar las 3 Variables

### Variable 1: META_APP_ID

1. Haz clic en **"Add new secret"** o **"Add variable"**
2. **Name:** `META_APP_ID`
3. **Value:** `1253651046588346`
4. Haz clic en **"Save"** o **"Add"**

### Variable 2: META_APP_SECRET

1. Haz clic en **"Add new secret"** o **"Add variable"**
2. **Name:** `META_APP_SECRET`
3. **Value:** `6927430dc02034242b7235f1fa86818c`
4. Haz clic en **"Save"** o **"Add"**

### Variable 3: META_OAUTH_REDIRECT_URI (Opcional)

1. Haz clic en **"Add new secret"** o **"Add variable"**
2. **Name:** `META_OAUTH_REDIRECT_URI`
3. **Value:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
4. Haz clic en **"Save"** o **"Add"**

---

## 📋 PASO 4: Redesplegar la Función

1. **Ve a:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. **Haz clic en:** `meta-oauth-callback`
3. **Ve a la pestaña "Code"**
4. **Abre:** `supabase/functions/meta-oauth-callback/index.ts` en tu editor
5. **Copia TODO** (Ctrl+A, Ctrl+C)
6. **Pega en el Dashboard** (Ctrl+V)
7. **Haz clic en "Deploy"**

---

## 📋 PASO 5: Probar

Después de redesplegar, ejecuta:

```bash
npm run test:oauth-callback
```

---

## 🐛 Si No Encuentras "Secrets"

Si no encuentras la sección de Secrets:

1. **Ve directamente a la función:**
   ```
   https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/meta-oauth-callback
   ```

2. **Busca "Settings" o "Configuration"** en la función

3. **O busca en:** Settings > API > Environment Variables

---

## ✅ Checklist

- [ ] Variables agregadas en Supabase Dashboard
- [ ] Función redesplegada
- [ ] Tests ejecutados

---

**¿Ya configuraste las variables? Avísame y probamos la función.**

