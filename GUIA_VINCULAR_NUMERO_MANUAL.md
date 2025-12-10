# 📱 Guía Paso a Paso: Vincular Número WhatsApp (Método Manual)

## 🎯 Situación Actual
El OAuth no está disponible, así que usaremos el método **manual** (es igual de efectivo, solo requiere copiar/pegar datos).

---

## 📋 PASO 1: Obtener Datos de Meta Developer Console

### 1.1. Acceder a Meta Developer Console

1. Ve a: **https://developers.facebook.com/**
2. **Inicia sesión** con tu cuenta de Facebook/Meta
3. En el menú superior, haz clic en **"My Apps"**
4. Selecciona tu **App de WhatsApp Business**
   - Si no tienes una, créala primero: **"Create App"** → **"Business"** → **"WhatsApp"**

### 1.2. Conectar tu Número (Coexistencia)

**Si ya tienes el número conectado, salta al paso 1.3**

1. En el menú lateral izquierdo, ve a **WhatsApp** → **Phone Numbers**
2. Haz clic en **"Add phone number"** o **"Agregar número"**
3. Selecciona **"Use existing number"** (usar número existente)
4. Ingresa tu número completo con código de país:
   ```
   Ejemplo: +59112345678
   ```
5. Meta enviará un **código de verificación** a tu WhatsApp Business:
   - Revisa tu WhatsApp Business en el celular
   - Ingresa el código que recibas
   - O escanea el QR code si te lo muestra
6. ✅ **Listo** - Tu número está conectado con coexistencia

### 1.3. Obtener los Datos Necesarios

1. En el menú lateral, ve a **WhatsApp** → **API Setup**

2. **Copia estos datos uno por uno:**

   **📱 Phone Number ID:**
   - Busca el campo **"Phone number ID"**
   - Es un número largo (ej: `123456789012345`)
   - Cópialo completo

   **🏢 Business Account ID:**
   - Busca el campo **"Business account ID"** o **"WABA ID"**
   - Es un número largo (ej: `987654321098765`)
   - Cópialo completo

   **🔑 Access Token:**
   - Busca **"Temporary access token"** o **"Access token"**
   - Si ves un botón **"Generate Token"**, haz clic
   - Es un string largo que empieza con `EAA...`
   - ⚠️ **Importante:** Si es temporal (expira en 1 hora), después tendrás que generar uno permanente
   - Para uno permanente: Ve a **Settings** → **System Users** → Crea un System User y genera su token

   **📞 Phone Number:**
   - Tu número completo con código de país
   - Ejemplo: `+59112345678`

   **🎫 Verify Token:**
   - **Tú lo generas** (puede ser cualquier string único)
   - Ejemplo: `maya_whatsapp_verify_2025`
   - ⚠️ **Guárdalo**, lo necesitarás después para el webhook

---

## 📝 PASO 2: Llenar el Formulario en el CRM

1. En tu CRM, ve a **⚙️ Configuración WhatsApp**
2. Haz clic en **"Nueva Cuenta"**
3. **Ignora el botón "Conectar con Meta"** (no funciona)
4. Llena el formulario manualmente:

   **Phone Number ID:**
   ```
   [Pega el Phone Number ID que copiaste]
   Ejemplo: 123456789012345
   ```

   **Business Account ID:**
   ```
   [Pega el Business Account ID que copiaste]
   Ejemplo: 987654321098765
   ```

   **Access Token:**
   ```
   [Pega el Access Token que copiaste]
   Ejemplo: EAAxxxxxxxxxxxxx
   ```

   **Verify Token:**
   ```
   [El token que generaste]
   Ejemplo: maya_whatsapp_verify_2025
   ```

   **Phone Number:**
   ```
   [Tu número completo con +]
   Ejemplo: +59112345678
   ```

   **Display Name:**
   ```
   [Nombre que quieres mostrar]
   Ejemplo: Maya Life Beauty
   ```

   **Producto Asociado:** (Opcional)
   ```
   [Selecciona un producto si aplica]
   ```

5. Marca **"Cuenta activa"** ✅
6. Haz clic en **"Crear Cuenta"** o **"Guardar"**

---

## ✅ PASO 3: Verificar Conexión

1. La cuenta debería aparecer en la lista de **"Cuentas Configuradas"**
2. Verifica que el **toggle esté en verde** (Activa)
3. Ve a **"💬 Chat WhatsApp"** para probar

---

## 🔧 PASO 4: Configurar Webhook (Para recibir mensajes)

### 4.1. Obtener URL del Webhook

1. Ve a tu **Supabase Dashboard**
2. Ve a **Edge Functions**
3. Encuentra la función **`whatsapp-webhook`**
4. Copia la **URL** (debería ser algo como):
   ```
   https://[tu-proyecto].supabase.co/functions/v1/whatsapp-webhook
   ```

### 4.2. Configurar en Meta Developer Console

1. Ve a **WhatsApp** → **Configuration**
2. En la sección **"Webhook"**, haz clic en **"Edit"**
3. Ingresa:
   - **Callback URL:** `[La URL de tu webhook de Supabase]`
   - **Verify Token:** `[El mismo Verify Token que usaste en el formulario]`
     ```
     Ejemplo: maya_whatsapp_verify_2025
     ```
4. Haz clic en **"Verify and Save"**
5. Meta verificará la conexión (debería decir "Verified" ✅)
6. En **"Webhook fields"**, marca estos campos:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_delivery`

---

## 🎉 ¡Listo!

Ya tienes tu número vinculado. Ahora puedes:

- ✅ **Recibir mensajes** de clientes
- ✅ **Enviar mensajes** desde el CRM
- ✅ **Crear secuencias** automáticas
- ✅ **Gestionar leads** y conversaciones

---

## ❓ Problemas Comunes

### Error: "Access Token inválido"
**Solución:**
- Genera un nuevo Access Token en Meta Developer Console
- Ve a: WhatsApp → API Setup → **"Generate Token"**
- O crea un System User permanente: Settings → System Users

### No recibo mensajes del cliente
**Verifica:**
1. ✅ El webhook está configurado y verificado
2. ✅ El Verify Token coincide exactamente en ambos lugares
3. ✅ La cuenta está marcada como "Activa" (toggle verde)
4. ✅ Los "Webhook fields" están marcados (messages, message_status, message_delivery)

### Error de coexistencia
**Solución:**
- Asegúrate de haber conectado el número correctamente
- Ve a: WhatsApp → Phone Numbers → Verifica que aparezca como "Connected"

---

## 💡 Consejo

Si el **Access Token** es temporal (expira en 1 hora), te recomiendo crear uno permanente:

1. Ve a **Settings** → **System Users**
2. Crea un nuevo **System User**
3. Genera un **Access Token** para ese System User
4. Ese token no expirará

---

**¿Necesitas ayuda con algún paso específico?** 🚀


