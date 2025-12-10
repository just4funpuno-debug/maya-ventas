# 🚀 Guía: Conectar Primer Producto vía OAuth

## ✅ Checklist Pre-Conexión

### **1. Verificar Configuración del App Maestra:**

- [ ] **App ID:** `1253651046588346` (o el tuyo)
- [ ] **App Secret:** Configurado en Supabase Secrets como `META_APP_SECRET`
- [ ] **Redirect URI:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
- [ ] **Redirect URI agregado en Facebook App Settings**

### **2. Verificar Frontend:**

- [ ] **Variable de entorno:** `VITE_META_APP_ID` configurada en `.env.local`
- [ ] **Servidor reiniciado** (si acabas de agregar la variable)

### **3. Verificar Edge Function:**

- [ ] **Edge Function desplegada:** `meta-oauth-callback`
- [ ] **Secrets configurados en Supabase:**
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_OAUTH_REDIRECT_URI`

---

## 📋 Pasos para Conectar

### **PASO 1: Ir a Configuración WhatsApp**

1. Abre tu CRM
2. Ve a: **Administración** → **WhatsApp**
3. O directamente: **WhatsApp** → **Administración**

---

### **PASO 2: Crear Nueva Cuenta**

1. Haz clic en **"Nueva Cuenta"** o **"Agregar Cuenta"**
2. Se abrirá el formulario `AccountForm`

---

### **PASO 3: Conectar con Meta**

1. En el formulario, busca el botón **"Conectar con Meta"**
2. Haz clic en el botón
3. Debería abrirse una ventana/popup de Facebook

---

### **PASO 4: Autorizar con Cuenta del Producto**

**⚠️ IMPORTANTE:** Inicia sesión con la cuenta de Facebook que corresponde al **Producto 1**.

1. **Si no estás logueado:**
   - Inicia sesión con la cuenta de Facebook del Producto 1
   - (La misma que usas para publicidad de ese producto)

2. **Si ya estás logueado con otra cuenta:**
   - Haz clic en **"No eres [otro nombre]?"**
   - O cierra sesión y vuelve a iniciar con la cuenta correcta

3. **Autoriza permisos:**
   - Verás los permisos que se solicitan:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `business_management`
   - Haz clic en **"Continuar"** o **"Autorizar"**

---

### **PASO 5: Esperar Procesamiento**

1. La ventana se cerrará automáticamente
2. El sistema procesará:
   - Intercambio de código por token
   - Obtención de datos de Graph API
   - Verificación de coexistencia
   - Creación de cuenta en BD

---

### **PASO 6: Verificar Formulario**

El formulario debería llenarse automáticamente con:
- ✅ **Phone Number ID**
- ✅ **Business Account ID**
- ✅ **Phone Number**
- ✅ **Display Name**

---

### **PASO 7: Configurar Coexistencia (Si es necesario)**

**Si aparece un modal con QR:**
1. Abre **WhatsApp Business** en tu celular
2. Ve a: **Configuración** → **Dispositivos vinculados**
3. Toca **"Conectar un dispositivo"**
4. Escanea el QR que muestra el modal
5. El sistema verificará automáticamente

**Si aparece un código:**
1. Revisa tu WhatsApp Business
2. Busca el mensaje de Meta con el código
3. Ingresa el código en el modal

---

### **PASO 8: Completar Formulario**

1. **Verify Token:**
   - Puedes dejar el que se generó automáticamente
   - O crear uno personalizado: `maya_whatsapp_producto1_2025`

2. **Producto Asociado:**
   - Selecciona el **Producto 1** del dropdown

3. **Cuenta Activa:**
   - Marca si quieres que esté activa inmediatamente

4. Haz clic en **"Crear Cuenta"** o **"Guardar"**

---

### **PASO 9: Verificar Conexión**

1. La cuenta debería aparecer en la lista
2. Estado debería ser **"Activa"** (si marcaste la opción)
3. Deberías ver:
   - ✅ Número de teléfono
   - ✅ Display Name
   - ✅ Producto asociado

---

## 🔧 Troubleshooting

### **Error: "META_APP_ID no configurado"**
**Solución:**
1. Verifica `.env.local` tiene `VITE_META_APP_ID`
2. Reinicia el servidor: `npm run dev`

---

### **Error: "Función no disponible" o popup no se abre**
**Solución:**
1. Verifica que `META_APP_ID` está en `.env.local`
2. Verifica que el Redirect URI está en Facebook App Settings
3. Verifica que el App está en modo "Live" o "Development"

---

### **Error: "Invalid redirect_uri"**
**Solución:**
1. Ve a Facebook App Settings
2. Agrega el Redirect URI exacto:
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. Guarda los cambios

---

### **El formulario no se llena automáticamente**
**Solución:**
1. Revisa la consola del navegador (F12)
2. Verifica que el Edge Function se ejecutó correctamente
3. Revisa los logs de Supabase Edge Functions
4. Puede ser que necesites completar manualmente algunos campos

---

### **No aparece opción de coexistencia o QR**
**Solución:**
- Puede que el número ya esté conectado con coexistencia
- O puede que el proceso se complete automáticamente
- Verifica en Meta Developer Console el estado del número

---

## ✅ Verificación Final

Después de conectar, verifica:

1. **En tu CRM:**
   - ✅ Cuenta aparece en la lista
   - ✅ Estado es "Activa"
   - ✅ Producto está asociado

2. **En Meta Developer Console:**
   - Ve a: WhatsApp > Phone Numbers
   - Verifica que tu número aparece como "Connected"
   - Verifica que coexistencia está activa

3. **Probar envío:**
   - Envía un mensaje de prueba desde el CRM
   - Verifica que aparece en tu WhatsApp Business (celular)

---

## 📝 Notas Importantes

1. **Cuenta de Facebook correcta:**
   - Asegúrate de iniciar sesión con la cuenta que corresponde al Producto 1
   - Esta debe ser la misma que usas para publicidad de ese producto

2. **Coexistencia:**
   - Si el número ya estaba conectado, puede que coexistenciase active automáticamente
   - Si no, seguirás el proceso de QR/código

3. **Tokens:**
   - Los tokens se guardan automáticamente en la BD
   - Están asociados al Producto 1

---

## 🚀 Siguiente Producto

Cuando conectes el **Producto 2:**
1. Repite los mismos pasos
2. **PERO** inicia sesión con la cuenta de Facebook del **Producto 2**
3. Selecciona **Producto 2** en el formulario
4. El sistema usará el mismo App Maestra, pero obtendrá tokens diferentes

---

**¡Adelante! Si encuentras algún problema, avísame y te ayudo a solucionarlo.** 🎯


