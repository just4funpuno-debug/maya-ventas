# 📱 Obtener Datos de Meta Developer Console

Guía paso a paso para obtener todos los datos necesarios para configurar tu cuenta WhatsApp.

---

## 🎯 Datos que Necesitas

1. ✅ **Phone Number ID** (ID del número de teléfono)
2. ✅ **Business Account ID** (ID de la cuenta de negocio)
3. ✅ **Access Token** (Token de acceso temporal o permanente)
4. ✅ **Verify Token** (Lo generas tú, no viene de Meta)

---

## 📋 PASO 1: Acceder a Meta Developer Console

1. **Ve a:** https://developers.facebook.com/
2. **Inicia sesión** con tu cuenta de Facebook/Meta
3. **Si no tienes cuenta Developer:**
   - Haz clic en **"Get Started"** o **"Registrarse"**
   - Completa el registro (es gratis)

---

## 📋 PASO 2: Crear o Seleccionar App de WhatsApp Business

### Si NO tienes una App:

1. En el Dashboard, haz clic en **"Create App"** o **"Crear App"**
2. Selecciona **"Business"** como tipo de app
3. Completa:
   - **App Name**: Ej: `Maya Life WhatsApp`
   - **App Contact Email**: Tu email
   - **Business Account**: Selecciona o crea uno
4. Haz clic en **"Create App"**

### Si YA tienes una App:

1. En el Dashboard, busca tu app de WhatsApp Business
2. Haz clic en ella para abrirla

---

## 📋 PASO 3: Configurar WhatsApp Business API

1. En el menú lateral izquierdo, busca **"WhatsApp"**
2. Si no lo ves, haz clic en **"Add Product"** y selecciona **"WhatsApp"**
3. Haz clic en **"Set up"** o **"Configurar"**

---

## 📋 PASO 3.5: Configurar Coexistencia (IMPORTANTE) ⭐

**Coexistencia** permite usar el mismo número en:
- ✅ WhatsApp Business App (celular)
- ✅ Cloud API (automático)
- ✅ Puppeteer (automático)

### Proceso:

1. **Ve a:** WhatsApp > **Phone Numbers**
2. **Haz clic en:** "Add phone number" o "Agregar número"
3. **Selecciona:** "Use existing number" (usar número existente)
4. **Ingresa tu número** de WhatsApp Business
5. **Meta enviará un código** a tu WhatsApp Business
   - O puede mostrar un **QR code** para escanear
6. **Verifica:**
   - Si es código: ingrésalo
   - Si es QR: escanéalo desde WhatsApp Business > Configuración > Dispositivos vinculados
7. **✅ Coexistencia activada automáticamente**

**Ver guía completa:** `COEXISTENCIA_PASO_A_PASO.md`

---

## 📋 PASO 4: Obtener Phone Number ID

1. En el menú lateral, ve a **WhatsApp** > **API Setup**
2. O directamente: https://developers.facebook.com/apps/[TU_APP_ID]/whatsapp-business/wa-dev-console/

3. **Busca la sección "Phone number ID"**
   - Debería mostrar algo como: `123456789012345`
   - O puede estar en formato: `Phone number ID: 123456789012345`

4. **Copia este número** - Este es tu **Phone Number ID**

**Ejemplo:**
```
Phone number ID: 123456789012345
```

---

## 📋 PASO 5: Obtener Business Account ID

1. En la misma página (**WhatsApp** > **API Setup**)

2. **Busca la sección "Business account ID"** o **"WhatsApp Business Account ID"**
   - Debería mostrar algo como: `987654321098765`
   - O puede estar en formato: `Business account ID: 987654321098765`

3. **Copia este número** - Este es tu **Business Account ID**

**Ejemplo:**
```
Business account ID: 987654321098765
```

---

## 📋 PASO 6: Obtener Access Token

### Opción A: Token Temporal (Para pruebas)

1. En la misma página (**WhatsApp** > **API Setup**)

2. **Busca la sección "Temporary access token"**
   - Debería mostrar un token largo
   - Ejemplo: `EAABwzLixZC...` (muy largo, ~200 caracteres)

3. **⚠️ IMPORTANTE:** Este token expira en 1 hora
   - Solo sirve para pruebas rápidas
   - Para producción, necesitas un token permanente

4. **Copia el token completo**

### Opción B: Token Permanente (Recomendado)

1. En el menú lateral, ve a **WhatsApp** > **API Setup**

2. **Busca la sección "Access tokens"** o **"System User Access Token"**

3. **Si no tienes System User:**
   - Ve a **Business Settings** > **Users** > **System Users**
   - Crea un System User o usa uno existente
   - Asigna permisos de WhatsApp

4. **Genera un token permanente:**
   - Haz clic en **"Generate Token"** o **"Generar Token"**
   - Selecciona permisos: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Copia el token (solo se muestra una vez)

5. **Guarda el token en un lugar seguro**

---

## 📋 PASO 7: Generar Verify Token (TÚ lo creas)

El **Verify Token** NO viene de Meta, **tú lo generas**.

### Opción 1: Token Simple
```
maya_whatsapp_verify_2025
```

### Opción 2: Token con Fecha
```
maya_webhook_20251202
```

### Opción 3: Token Aleatorio
Abre la consola del navegador (F12) y ejecuta:
```javascript
Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
```

### Opción 4: UUID
```javascript
crypto.randomUUID().replace(/-/g, '')
```

**⚠️ IMPORTANTE:** 
- Guarda este token
- Lo usarás en 2 lugares:
  1. En tu app (campo "Verify Token")
  2. En Meta Developer Console (al configurar el webhook)

---

## 📋 PASO 8: Obtener Número de Teléfono

1. En **WhatsApp** > **API Setup**

2. **Busca la sección "Phone number"** o **"To"**
   - Debería mostrar tu número de WhatsApp Business
   - Ejemplo: `+591 12345678` o `59112345678`

3. **Copia el número** (con o sin el +)

---

## ✅ Resumen de Datos Obtenidos

Después de seguir estos pasos, deberías tener:

- [ ] **Phone Number ID**: `123456789012345`
- [ ] **Business Account ID**: `987654321098765`
- [ ] **Access Token**: `EAABwzLixZC...` (token largo)
- [ ] **Verify Token**: `maya_whatsapp_verify_2025` (lo generaste tú)
- [ ] **Phone Number**: `+591 12345678`

---

## 🚀 Siguiente Paso

Una vez que tengas todos los datos:

1. **Abre tu app** → Sidebar > **Administración** > **WhatsApp**
2. **Haz clic en "Nueva Cuenta"**
3. **Pega todos los datos** en el formulario
4. **Guarda la cuenta**

---

## 🐛 Troubleshooting

### No veo "WhatsApp" en el menú
- Asegúrate de que tu app es de tipo "Business"
- Ve a **Add Product** y agrega WhatsApp

### No tengo Phone Number ID
- Necesitas tener un número de WhatsApp Business configurado
- Ve a **WhatsApp** > **Phone Numbers** y configura uno

### El Access Token expiró
- Los tokens temporales expiran en 1 hora
- Genera uno permanente siguiendo **Opción B** arriba

### No puedo generar token permanente
- Necesitas tener permisos de administrador en la cuenta de negocio
- O contacta al administrador de la cuenta

---

## 📞 Recursos Adicionales

- **Documentación oficial:** https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- **Dashboard:** https://developers.facebook.com/apps/
- **WhatsApp Business API:** https://business.facebook.com/

---

**Última actualización:** 2025-12-02

