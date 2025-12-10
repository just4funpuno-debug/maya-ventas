# 🔐 Configurar Variables de Meta Manualmente

## 📋 Credenciales Obtenidas

- ✅ **META_APP_ID:** `1253651046588346`
- ✅ **META_APP_SECRET:** `6927430dc02034242b7235f1fa86818c`
- ✅ **META_OAUTH_REDIRECT_URI:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`

---

## ✅ PASO 1: Ir a Edge Functions Settings

1. **Ve a:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/functions
2. **O directamente:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions

---

## ✅ PASO 2: Buscar Sección de Secrets

1. **En la página de Edge Functions:** Busca la sección **"Secrets"** o **"Environment Variables"**
2. **O ve a:** Settings > Edge Functions > Secrets

---

## ✅ PASO 3: Agregar Variables

### Variable 1: META_APP_ID

1. **Haz clic en "Add new secret"** o **"Add variable"**
2. **Name:** `META_APP_ID`
3. **Value:** `1253651046588346`
4. **Haz clic en "Save"** o **"Add"**

### Variable 2: META_APP_SECRET

1. **Haz clic en "Add new secret"** o **"Add variable"**
2. **Name:** `META_APP_SECRET`
3. **Value:** `6927430dc02034242b7235f1fa86818c`
4. **Haz clic en "Save"** o **"Add"**

### Variable 3: META_OAUTH_REDIRECT_URI (Opcional)

1. **Haz clic en "Add new secret"** o **"Add variable"**
2. **Name:** `META_OAUTH_REDIRECT_URI`
3. **Value:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
4. **Haz clic en "Save"** o **"Add"**

---

## ✅ PASO 4: Verificar

Después de agregar las variables, deberías ver:

- ✅ `META_APP_ID` = `1253651046588346`
- ✅ `META_APP_SECRET` = `6927430dc02034242b7235f1fa86818c`
- ✅ `META_OAUTH_REDIRECT_URI` = `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`

---

## ✅ PASO 5: Redesplegar la Función

1. **Ve a:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. **Haz clic en la función:** `meta-oauth-callback`
3. **Ve a la pestaña "Code"**
4. **Abre:** `supabase/functions/meta-oauth-callback/index.ts` en tu editor
5. **Copia TODO el código** (Ctrl+A, Ctrl+C)
6. **Pega en el editor del Dashboard** (Ctrl+V)
7. **Haz clic en "Deploy"**

---

## ✅ PASO 6: Probar

Después de redesplegar, ejecuta:

```bash
npm run test:oauth-callback
```

**Nota:** El test puede fallar si el `code` de prueba no es válido (esperado). Una vez que uses un `code` real de Meta, debería funcionar.

---

## 🐛 Si No Encuentras la Sección de Secrets

Si no encuentras la sección de Secrets en el Dashboard:

1. **Ve a la función directamente:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/meta-oauth-callback
2. **Busca "Settings"** o **"Configuration"** en la función
3. **O busca "Environment Variables"** en la configuración de la función

**Alternativa:** Las variables de entorno también se pueden configurar en el código de la función usando `Deno.env.get()`, pero es mejor configurarlas como Secrets para seguridad.

---

**¿Ya configuraste las variables? Redespliega la función y avísame para probar.**

