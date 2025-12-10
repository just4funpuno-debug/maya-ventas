# 🔧 Corrección: Redirect URI

## ❌ URI Incorrecto (con errores)

```
https://https://alwxhiombhfyjyyziyxz.supabase.co .supabase.co/functions/v1/meta-oauth-callback
```

**Problemas:**
- ❌ `https://` duplicado
- ❌ `.supabase.co` duplicado
- ❌ Espacio antes del segundo `.supabase.co`

---

## ✅ URI Correcto

```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Tu Project Reference es:** `alwxhiombhfyjyyziyxz`

---

## 📋 Usar Este URI

**Copia este URI exacto:**

```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

---

## ✅ Pasos para Corregir

### En Meta Developer Console:

1. **Ve a:** Settings > Basic
2. **O:** Products > Facebook Login > Settings
3. **Busca:** "Valid OAuth Redirect URIs"
4. **Si ya agregaste el incorrecto:**
   - Elimínalo
   - Agrega el correcto
5. **Si no lo has agregado:**
   - Agrega este URI exacto:
     ```
     https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
     ```
6. **Haz clic en "Save Changes"**

### En Supabase (Variables de Entorno):

1. **Ve a:** Settings > Edge Functions > Secrets
2. **Si ya agregaste `META_OAUTH_REDIRECT_URI`:**
   - Edítalo
   - Cambia el valor a:
     ```
     https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
     ```
3. **Si no lo has agregado:**
   - Agrega nuevo secret:
     - **Name:** `META_OAUTH_REDIRECT_URI`
     - **Value:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
4. **Haz clic en "Save"**

---

## ✅ Verificación

El URI debe ser **exactamente igual** en:
- ✅ Meta Developer Console (Valid OAuth Redirect URIs)
- ✅ Supabase (META_OAUTH_REDIRECT_URI)

**URI correcto:**
```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

---

**¿Ya corregiste el URI en ambos lugares?** ✅

