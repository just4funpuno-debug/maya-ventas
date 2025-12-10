# 🔧 Solucionar Error 401 Sin Logs

## ❌ Problema

- Error 401 "Missing authorization header"
- **No hay logs** en la Edge Function (No results found)
- Esto significa que **la función NO se está ejecutando**

---

## 🔍 Causa Probable

El error 401 está ocurriendo **ANTES** de que la solicitud llegue a la función. Esto sugiere que:

1. **Supabase está rechazando el request** a nivel de infraestructura
2. **La función requiere autenticación** y Facebook no la está enviando
3. **Falta configuración de permisos públicos** para la función

---

## ✅ Soluciones

### **SOLUCIÓN 1: Verificar que la Función Esté Desplegada**

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback`
2. **Pestaña "Overview":**
   - Verifica que la función esté **"Deployed"** o **"Active"**
   - Verifica la **última fecha de deployment**

3. **Si NO está desplegada:**
   - Ve a la pestaña **"Code"**
   - Verifica que el código esté presente
   - Haz clic en **"Deploy"** o **"Save"**

---

### **SOLUCIÓN 2: Verificar Variables de Entorno**

1. **Ve a:** Edge Functions → `meta-oauth-callback` → **"Details"** o **"Settings"**
2. **Verifica que estas variables estén configuradas:**
   ```
   META_APP_ID=1253651046588346
   META_APP_SECRET=[tu secret]
   SUPABASE_URL=[tu url]
   SUPABASE_SERVICE_ROLE_KEY=[tu service role key]
   FRONTEND_URL=https://tu-dominio.com (opcional)
   ```

3. **Si faltan variables:**
   - Agrégalas en "Settings" o "Environment Variables"
   - Guarda los cambios

---

### **SOLUCIÓN 3: Verificar URL del Callback en Facebook**

El error puede estar en cómo Facebook está llamando a la función:

1. **Ve a:** Facebook Developer Console → Tu App → Productos → Facebook Login → Configuración
2. **Verifica "URI de redireccionamiento de OAuth válidos":**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. **Debe ser EXACTAMENTE así** (sin trailing slash, sin parámetros adicionales)

---

### **SOLUCIÓN 4: Probar la Función Manualmente**

1. **Ve a:** Edge Functions → `meta-oauth-callback` → **"Test"**
2. **Intenta hacer un test simple:**
   - Método: GET
   - URL: `/functions/v1/meta-oauth-callback?code=test&state=test`
3. **Esto debería generar logs** (aunque falle)
4. **Si tampoco genera logs**, hay un problema con el deployment

---

### **SOLUCIÓN 5: Verificar Invocations**

1. **Ve a:** Edge Functions → `meta-oauth-callback` → **"Invocations"**
2. **Busca intentos recientes** de invocación
3. **Si ves intentos con error 401**, confirma que es un problema de autenticación

---

## 🔍 Verificar URL Completa del Error

Cuando recibiste el error 401, ¿en qué URL apareció?

- ¿Fue directamente en: `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?code=...`?
- ¿O fue en otra URL?

Esto nos dirá si el problema es:
- La función misma (si es la URL de la función)
- Algún proxy o middleware (si es otra URL)

---

## 📋 Checklist Rápido

- [ ] Función está desplegada (pestaña "Overview")
- [ ] Variables de entorno configuradas (pestaña "Details" o "Settings")
- [ ] URL del callback correcta en Facebook
- [ ] Función probada manualmente (pestaña "Test")
- [ ] Invocations revisadas (pestaña "Invocations")

---

## 🚀 Próximos Pasos

1. **Verifica primero** que la función esté desplegada
2. **Revisa las variables de entorno**
3. **Prueba la función manualmente** desde el Dashboard
4. **Si genera logs al probar**, el problema es con el request de Facebook
5. **Si no genera logs**, el problema es con el deployment

---

**¿Puedes verificar en la pestaña "Overview" si la función está desplegada?** 🚀


