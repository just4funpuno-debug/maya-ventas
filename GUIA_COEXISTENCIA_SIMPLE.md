# 🔗 Guía Simple: Coexistencia Sin OAuth

## 🎯 Objetivo

Conectar tu número de WhatsApp Business con Cloud API usando coexistencia, **sin necesidad de OAuth**.

---

## 📋 Pasos Simples

### PASO 1: Conectar Número (Coexistencia)

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** de WhatsApp Business
3. **Ve a:** WhatsApp > **Phone Numbers**
4. **Haz clic en:** "Add phone number" o "Agregar número"
5. **Selecciona:** "Use existing number" (usar número existente)
6. **Ingresa tu número** de WhatsApp Business
7. **Meta enviará un código** a tu WhatsApp Business
   - O puede mostrar un **QR code** para escanear
8. **Verifica:**
   - Si es código: ingrésalo
   - Si es QR: escanéalo desde WhatsApp Business > Configuración > Dispositivos vinculados
9. **✅ Coexistencia conectada**

---

### PASO 2: Obtener Datos

1. **Ve a:** WhatsApp > **API Setup**
2. **Copia estos datos:**
   - **Phone Number ID:** `123456789012345`
   - **Business Account ID:** `987654321098765`
   - **Access Token:** `EAAxxxxxxxxxxxxx`
3. **Genera Verify Token:**
   - Puede ser cualquier string: `maya_whatsapp_verify_2025`

---

### PASO 3: Configurar en tu App

1. **Abre tu app** → WhatsApp > Administración
2. **Haz clic en "Nueva Cuenta"**
3. **Llena el formulario:**
   - Phone Number ID: [pegar]
   - Business Account ID: [pegar]
   - Access Token: [pegar]
   - Verify Token: [el que generaste]
   - Phone Number: [tu número]
   - Display Name: [nombre que quieras]
4. **Guarda**

---

## ✅ Listo

Ya tienes tu cuenta conectada con coexistencia, **sin necesidad de OAuth**.

---

## 🔄 ¿Cuándo Usar OAuth?

OAuth es útil si:
- Vas a conectar **múltiples cuentas** frecuentemente
- Quieres **automatización completa**
- Prefieres **mejor UX**

Pero **NO es necesario** para coexistencia básica.

---

## 💡 Recomendación

**Para empezar:** Usa solo coexistencia (esta guía)

**Para después:** Si conectas muchas cuentas, implementa OAuth

---

**¿Quieres que te guíe paso a paso con la coexistencia?**

