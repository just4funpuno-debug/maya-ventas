# 🚀 Pasos para Conectar con Meta - Guía Rápida

## ✅ Lo que ya está configurado:
- ✅ Variables de entorno (`VITE_META_APP_ID`, `VITE_SUPABASE_URL`)
- ✅ Código de OAuth funcionando
- ✅ Archivos necesarios presentes

---

## 📋 PASOS PARA CONECTAR

### PASO 1: Verificar Edge Function desplegada

**La Edge Function debe estar desplegada en Supabase.**

```bash
# Verificar que la función existe
supabase functions list

# Si no está desplegada, desplegarla:
supabase functions deploy meta-oauth-callback
```

**⚠️ IMPORTANTE:** Necesitas configurar los secrets en Supabase:

```bash
# Configurar secrets en Supabase
supabase secrets set META_APP_ID=1253651046588346
supabase secrets set META_APP_SECRET=6927430dc02034242b7235f1fa86818c
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
```

---

### PASO 2: Verificar Redirect URI en Meta Developer Console

**Debe estar configurado exactamente así:**

1. Ve a: https://developers.facebook.com/
2. Selecciona tu App (ID: 1253651046588346)
3. Ve a: **Settings** > **Basic**
4. Busca: **"Valid OAuth Redirect URIs"**
5. Agrega esta URL (si no está):

```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**⚠️ IMPORTANTE:** Debe ser EXACTAMENTE esa URL, sin `/` al final.

---

### PASO 3: Verificar Permisos en Meta Developer Console

1. Ve a: **App Review** > **Permissions and Features**
2. Verifica que estos permisos están solicitados:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
   - ✅ `business_management`

3. Si no están, agrégalos:
   - Ve a **Products** > **WhatsApp** > **Configuration**
   - Solicita los permisos necesarios

---

### PASO 4: Probar la Conexión

1. **Abre la consola del navegador** (F12)
2. Ve a: **WhatsApp > Configuración > Gestión de Cuentas**
3. Haz click en **"Nueva Cuenta"**
4. Haz click en **"Conectar con Meta"**
5. **Observa la consola** para ver errores

---

## 🐛 Troubleshooting Rápido

### Problema: "META_APP_ID no configurado"
**Solución:**
- Verifica que `.env.local` existe y tiene `VITE_META_APP_ID`
- Reinicia el servidor de desarrollo (`npm run dev`)

### Problema: Popup se cierra inmediatamente
**Solución:**
- Verifica que el Redirect URI está configurado en Meta
- Verifica que la Edge Function está desplegada
- Revisa la consola del navegador para errores

### Problema: "Error al iniciar conexión con Meta"
**Solución:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Intenta conectar de nuevo
4. Busca la llamada a `meta-oauth-callback`
5. Revisa el error en la respuesta

### Problema: Edge Function retorna error
**Solución:**
```bash
# Ver logs de la Edge Function
supabase functions logs meta-oauth-callback --tail
```

### Problema: "No se pudo abrir la ventana de OAuth"
**Solución:**
- Verifica que el navegador permite popups
- Prueba en otro navegador
- Prueba en modo incógnito

---

## 🔍 Verificar que Todo Funciona

### 1. Verificar URL de OAuth generada

En la consola del navegador, antes de hacer click en "Conectar con Meta", ejecuta:

```javascript
// Esto debería mostrar la URL de OAuth
const state = 'test';
const metaAppId = import.meta.env.VITE_META_APP_ID;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
console.log('Meta App ID:', metaAppId);
console.log('Supabase URL:', supabaseUrl);
```

### 2. Verificar que el popup se abre

Cuando hagas click en "Conectar con Meta", debería:
1. Abrirse un popup de Facebook
2. Pedirte iniciar sesión (si no estás logueado)
3. Mostrar permisos solicitados
4. Pedirte autorizar

### 3. Verificar callback

Después de autorizar, el popup debería:
1. Redirigir a la Edge Function
2. La Edge Function procesa y redirige a `oauth-callback.html`
3. `oauth-callback.html` envía mensaje al parent window
4. El formulario se llena automáticamente

---

## 📝 Checklist Final

Antes de intentar conectar, verifica:

- [ ] Edge Function `meta-oauth-callback` está desplegada
- [ ] Secrets configurados en Supabase:
  - [ ] `META_APP_ID`
  - [ ] `META_APP_SECRET`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Redirect URI configurado en Meta Developer Console
- [ ] Permisos solicitados en Meta Developer Console
- [ ] Variables de entorno en `.env.local`:
  - [ ] `VITE_META_APP_ID`
  - [ ] `VITE_SUPABASE_URL`
- [ ] Servidor de desarrollo corriendo (`npm run dev`)
- [ ] Consola del navegador abierta (F12) para ver errores

---

## 🆘 Si Nada Funciona

1. **Abre la consola del navegador** (F12)
2. **Intenta conectar**
3. **Copia todos los errores** que aparezcan
4. **Comparte los errores** para diagnóstico

**Información útil para compartir:**
- Errores en la consola
- Errores en la pestaña Network (requests a `meta-oauth-callback`)
- Logs de la Edge Function (si tienes acceso)

---

**¿Qué error específico estás viendo?**  
Por favor, comparte:
1. ¿Qué pasa cuando haces click en "Conectar con Meta"?
2. ¿Se abre el popup?
3. ¿Qué error aparece en la consola del navegador?


