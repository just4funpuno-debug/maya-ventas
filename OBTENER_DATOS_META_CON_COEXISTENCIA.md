# 📱 Obtener Datos de Meta Developer Console (Con Coexistencia)

Guía actualizada que incluye el proceso de coexistencia.

---

## 🎯 Proceso Completo

### 1️⃣ Completar Registro en Meta (Ya lo estás haciendo)
- Selecciona tu rol
- Completa el registro

### 2️⃣ Crear App de WhatsApp Business
- Tipo: **Business**
- Nombre: `Maya Life WhatsApp`

### 3️⃣ Configurar Coexistencia (NUEVO - Importante)

**Esto conecta tu número de celular con Cloud API:**

**IMPORTANTE:** Coexistencia permite usar el mismo número en:
- ✅ WhatsApp Business App (celular)
- ✅ Cloud API (automático)
- ✅ Puppeteer (automático)

**Proceso de Conexión:**

1. **Ve a:** WhatsApp > **Phone Numbers**
2. **Haz clic en:** "Add phone number" o "Agregar número"
3. **Selecciona:** "Use existing number" (usar número existente)
4. **Ingresa tu número** de WhatsApp Business
5. **Meta enviará un código** a tu WhatsApp Business (mensaje o notificación)
6. **Opciones de verificación:**
   - **Opción A:** Ingresa el código que recibes
   - **Opción B:** Escanea un QR code (si te lo muestra)
7. **Sigue las instrucciones** en pantalla
8. **✅ Listo** - Coexistencia activada automáticamente

**Nota sobre QR:**
- Algunas veces Meta muestra un QR code para escanear desde WhatsApp Business
- Otras veces solo pide un código numérico
- Ambos métodos funcionan igual

### 4️⃣ Obtener Datos

Una vez conectado el número:

1. **Ve a:** WhatsApp > **API Setup**
2. **Copia estos datos:**

   **Phone Number ID:**
   ```
   123456789012345
   ```

   **Business Account ID:**
   ```
   987654321098765
   ```

   **Access Token:**
   - Temporal: "Temporary access token" (expira en 1h)
   - Permanente: "System User Access Token" (recomendado)

   **Verify Token:**
   - Tú lo generas: `maya_whatsapp_verify_2025`

   **Phone Number:**
   ```
   +591 12345678
   ```

---

## ⚠️ Importante sobre Coexistencia

### ¿Qué es Coexistencia?

Permite usar el **mismo número** para:
- ✅ Enviar desde **celular** (WhatsApp Business App)
- ✅ Enviar desde **Cloud API** (automático)
- ✅ Enviar desde **Puppeteer** (automático)

**Todo funciona simultáneamente.**

### ¿Necesito QR Code?

**NO necesitas escanear QR** para coexistencia con Cloud API.

El proceso es:
1. Conectar número existente
2. Verificar con código SMS/WhatsApp
3. Listo

**QR Code es solo para:**
- Puppeteer (WhatsApp Web) - Se hace después
- WhatsApp Web normal (no necesario para Cloud API)

---

## 📋 Orden Correcto de Pasos

1. ✅ **Completar registro** en Meta (estás aquí)
2. ✅ **Crear App** de tipo Business
3. ✅ **Agregar WhatsApp** como producto
4. ✅ **Conectar número** (coexistencia) ← **IMPORTANTE**
5. ✅ **Obtener datos** de API Setup
6. ✅ **Configurar cuenta** en tu app
7. ✅ **Configurar webhook** en Meta
8. ✅ **Probar** enviando mensajes

---

## 🔑 Generar Verify Token

Mientras tanto, genera tu Verify Token:

```javascript
// En consola del navegador (F12)
'maya_whatsapp_verify_' + Date.now().toString(36)
```

O usa uno simple:
```
maya_whatsapp_verify_2025
```

---

## ✅ Checklist Completo

- [ ] Registro en Meta completado
- [ ] App de WhatsApp Business creada
- [ ] WhatsApp agregado como producto
- [ ] **Número conectado con coexistencia** ⭐
- [ ] Phone Number ID obtenido
- [ ] Business Account ID obtenido
- [ ] Access Token obtenido
- [ ] Verify Token generado
- [ ] Phone Number copiado
- [ ] Cuenta configurada en tu app
- [ ] Webhook configurado

---

## 🚀 Siguiente Paso

Después de completar el registro:
1. Crea la App
2. **Conecta tu número** (coexistencia)
3. Obtén los datos
4. Configura en tu app

---

**Última actualización:** 2025-12-02

