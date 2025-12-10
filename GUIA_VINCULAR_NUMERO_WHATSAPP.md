# 📱 Guía Rápida: Vincular Número de WhatsApp al CRM

## 🎯 Objetivo
Conectar tu número de WhatsApp Business al CRM para poder recibir y enviar mensajes.

---

## 🚀 PASO 1: Acceder al Gestor de Cuentas

1. **Inicia sesión** en tu CRM
2. Ve al menú **"⚙️ Configuración WhatsApp"** o **"WhatsApp"** → **"Administración"**
3. Haz clic en **"Nueva Cuenta"** o **"Agregar Cuenta"**

---

## 🔌 PASO 2: Obtener Datos de Meta Developer Console

### 2.1. Acceder a Meta Developer Console

1. Ve a: **https://developers.facebook.com/**
2. **Inicia sesión** con tu cuenta de Facebook/Meta
3. Selecciona tu **App de WhatsApp Business** (si no tienes una, créala primero)

### 2.2. Conectar tu Número (Coexistencia)

1. En el menú lateral, ve a **WhatsApp** → **Phone Numbers**
2. Haz clic en **"Add phone number"** o **"Agregar número"**
3. Selecciona **"Use existing number"** (usar número existente)
4. Ingresa tu número de WhatsApp Business (ej: +59112345678)
5. Meta enviará un código a tu WhatsApp Business:
   - Ingresa el código que recibes
   - O escanea el QR code si te lo muestra
6. ✅ **Coexistencia conectada** - Ahora puedes usar el mismo número en:
   - WhatsApp Business App (celular)
   - Cloud API (automático desde CRM)
   - Puppeteer (backup automático)

### 2.3. Obtener los Datos Necesarios

1. Ve a **WhatsApp** → **API Setup**
2. **Copia estos datos:**

   ```
   Phone Number ID:    123456789012345
   Business Account ID: 987654321098765
   Access Token:       EAAxxxxxxxxxxxxx
   ```

3. **Genera un Verify Token** (tú lo creas):
   ```
   Ejemplo: maya_whatsapp_verify_2025
   ```
   ⚠️ **Guárdalo**, lo necesitarás más tarde para configurar el webhook

---

## 📝 PASO 3: Llenar el Formulario en el CRM

### Opción A: Método Automático (OAuth) ⚡

1. En el formulario de "Nueva Cuenta", haz clic en **"Conectar con Meta"**
2. Se abrirá una ventana de Meta
3. **Autoriza** la aplicación
4. El formulario se llenará **automáticamente** con:
   - Phone Number ID
   - Business Account ID
   - Número de teléfono
   - Nombre para mostrar
5. Si requiere coexistencia, aparecerá un modal con QR para escanear
6. Completa los campos restantes y haz clic en **"Crear Cuenta"**

### Opción B: Método Manual

1. Llena el formulario manualmente:

   **Phone Number ID:**
   ```
   [Pega el Phone Number ID que copiaste]
   ```

   **Business Account ID:**
   ```
   [Pega el Business Account ID que copiaste]
   ```

   **Access Token:**
   ```
   [Pega el Access Token que copiaste]
   ```

   **Verify Token:**
   ```
   [El token que generaste, ej: maya_whatsapp_verify_2025]
   ```

   **Phone Number:**
   ```
   [Tu número completo, ej: +59112345678]
   ```

   **Display Name:**
   ```
   [Nombre que quieres mostrar, ej: Maya Life Beauty]
   ```

   **Producto Asociado:** (Opcional)
   ```
   [Selecciona un producto si aplica]
   ```

2. Marca **"Cuenta activa"** si quieres que esté activa inmediatamente
3. Haz clic en **"Crear Cuenta"** o **"Guardar"**

---

## ✅ PASO 4: Verificar Conexión

Después de crear la cuenta:

1. La cuenta debería aparecer en la lista de **"Cuentas Configuradas"**
2. Verifica que el estado sea **"Activa"** (toggle verde)
3. Ve a **"💬 Chat WhatsApp"** y verifica que puedas ver conversaciones

---

## 🔧 PASO 5: Configurar Webhook (Para recibir mensajes)

Para que el CRM **reciba mensajes** del cliente, necesitas configurar el webhook:

### 5.1. Obtener URL del Webhook

1. Ve a tu dashboard de Supabase
2. Busca las **Edge Functions**
3. Encuentra la función **`whatsapp-webhook`**
4. Copia la URL (debería ser algo como):
   ```
   https://[tu-proyecto].supabase.co/functions/v1/whatsapp-webhook
   ```

### 5.2. Configurar en Meta Developer Console

1. Ve a **WhatsApp** → **Configuration**
2. En **"Webhook"**, haz clic en **"Edit"**
3. Ingresa:
   - **Callback URL:** `[La URL de tu webhook]`
   - **Verify Token:** `[El mismo Verify Token que usaste en el formulario]`
4. Haz clic en **"Verify and Save"**
5. En **"Webhook fields"**, marca:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_delivery`

---

## 🎉 ¡Listo!

Ya tienes tu número vinculado al CRM. Ahora puedes:

- ✅ **Recibir mensajes** de clientes
- ✅ **Enviar mensajes** desde el CRM
- ✅ **Crear secuencias** automáticas
- ✅ **Gestionar leads** y conversaciones

---

## ❓ Problemas Comunes

### Error: "Access Token inválido"
- **Solución:** Genera un nuevo Access Token en Meta Developer Console
- Ve a: WhatsApp → API Setup → System User Access Token

### No recibo mensajes
- **Verifica:** El webhook está configurado correctamente
- **Verifica:** El Verify Token coincide en ambos lugares
- **Verifica:** La cuenta está marcada como "Activa"

### Error de coexistencia
- **Solución:** Asegúrate de haber escaneado el QR o ingresado el código correctamente
- **Solución:** Intenta reconectar el número desde Meta Developer Console

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas, revisa:
1. Que todos los datos estén copiados correctamente
2. Que el Verify Token sea el mismo en ambos lugares
3. Que el webhook esté configurado y verificado

---

**Última actualización:** 2025-01-XX


