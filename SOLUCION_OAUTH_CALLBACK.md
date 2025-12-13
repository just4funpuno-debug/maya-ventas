# 🔧 Solución: OAuth Callback No Funciona

## 🐛 Problema Actual

- Popup se cierra inmediatamente
- Aparece "OAuth cancelado por el usuario"
- No se rellenan Access Token y Verify Token

## ✅ Solución Paso a Paso

### PASO 1: Verificar Edge Function está Desplegada

**⚠️ CRÍTICO:** La Edge Function DEBE estar desplegada en Supabase.

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. Busca `meta-oauth-callback` en la lista
3. **Si NO existe:**
   - Haz clic en "Create a new function"
   - Nombre: `meta-oauth-callback`
   - Copia TODO el contenido de `supabase/functions/meta-oauth-callback/index.ts`
   - Pégalo en el editor del Dashboard
   - Haz clic en "Deploy"

4. **Si existe:**
   - Haz clic en ella
   - Verifica que el código esté actualizado
   - Si no, actualiza y haz "Deploy" de nuevo

---

### PASO 2: Verificar Variables de Entorno en Supabase

La Edge Function necesita estos secrets:

1. Ve a: Settings > Edge Functions > Secrets
2. Verifica que existan:
   - `META_APP_ID` = `1253651046588346`
   - `META_APP_SECRET` = `6927430dc02034242b7235f1fa86818c`
   - `SUPABASE_SERVICE_ROLE_KEY` = (tu service role key)

3. Si faltan, agrégalas y redesplegar la función

---

### PASO 3: Verificar Redirect URI en Meta

1. Ve a: https://developers.facebook.com/apps/1253651046588346/settings/basic/
2. Busca "Valid OAuth Redirect URIs"
3. Verifica que esté:
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
4. Si no está, agrégalo y guarda

---

### PASO 4: Probar con Logs

1. **Abre la consola del navegador** (F12)
2. **Intenta conectar con Meta**
3. **Observa los logs:**
   - Deberías ver: `[OAuth Callback] Iniciando procesamiento...`
   - Deberías ver: `[OAuth Callback] Hash contiene oauth-callback`
   - Deberías ver: `[OAuth Callback] Mensaje enviado exitosamente`

4. **Si NO ves estos logs:**
   - La Edge Function no está funcionando
   - O el redirect URL no está configurado correctamente

---

### PASO 5: Verificar Logs de Edge Function

1. Ve a: Supabase Dashboard > Edge Functions > `meta-oauth-callback`
2. Ve a la pestaña "Logs"
3. Intenta conectar con Meta de nuevo
4. **Busca errores en los logs**

---

## 🔍 Diagnóstico por Síntomas

### Síntoma: Popup se cierra inmediatamente

**Causa probable:** Edge Function no está desplegada o tiene error

**Solución:**
1. Verificar que la función existe en Supabase Dashboard
2. Verificar logs de la función
3. Redesplegar si es necesario

---

### Síntoma: "OAuth cancelado por el usuario" aparece

**Causa probable:** El popup se cierra antes de que llegue el mensaje

**Solución:**
1. Ya aumentamos el tiempo de espera a 2 segundos
2. Verificar logs en la consola del navegador
3. Verificar que `oauth-callback.html` está accesible en `http://localhost:5173/oauth-callback.html`

---

### Síntoma: No se rellenan Access Token y Verify Token

**Causa probable:** El mensaje no está llegando al parent window

**Solución:**
1. Verificar logs en la consola
2. Verificar que `window.opener` existe cuando se envía el mensaje
3. Verificar que el origen del mensaje es correcto

---

## 🧪 Test Manual

Para probar si `oauth-callback.html` funciona:

1. Abre en el navegador:
   ```
   http://localhost:5173/oauth-callback.html#oauth-callback=eyJ0eXBlIjoid2hhdHNhcHBfb2F1dGhfY2FsbGJhY2siLCJzdWNjZXNzIjp0cnVlLCJkYXRhIjp7InRlc3QiOiJkYXRhIn19
   ```

2. Deberías ver en la consola:
   ```
   [OAuth Callback] Iniciando procesamiento...
   [OAuth Callback] Hash contiene oauth-callback
   ```

3. Si abres esta URL en un popup (window.open), debería enviar el mensaje al parent

---

## 📝 Checklist Completo

- [ ] Edge Function `meta-oauth-callback` está desplegada
- [ ] Variables de entorno configuradas en Supabase Secrets
- [ ] Redirect URI configurado en Meta Developer Console
- [ ] Consola del navegador abierta (F12)
- [ ] Logs aparecen cuando intentas conectar
- [ ] `oauth-callback.html` es accesible en `/oauth-callback.html`

---

**¿Qué logs ves en la consola cuando intentas conectar?**


