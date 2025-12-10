# 🔍 Cómo Funciona Kommo (y CRMs similares) con WhatsApp API

## 🎯 Resumen Ejecutivo

Kommo y otros CRMs profesionales usan la **WhatsApp Business API** (Cloud API) con **coexistencia** para permitir que el usuario use su número de WhatsApp tanto desde el celular como desde el CRM automáticamente.

---

## 📊 Arquitectura de Kommo con WhatsApp

### **Flujo Completo:**

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO (Cliente)                        │
│  - Tiene WhatsApp Business en su celular                    │
│  - Quiere usar CRM (Kommo) para automatizar                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 1. Conecta cuenta vía OAuth
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   KOMMO (CRM)                               │
│  - Recibe autorización OAuth                                │
│  - Obtiene tokens de acceso                                 │
│  - Configura webhooks                                        │
│  - Gestiona secuencias, plantillas, etc.                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 2. Usa WhatsApp Cloud API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              META / WHATSAPP BUSINESS API                   │
│  - WhatsApp Cloud API (gratis en ventana 24h)              │
│  - Templates (fuera de ventana)                            │
│  - Webhooks para mensajes entrantes                        │
│  - Gestión de coexistencia                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 3. Envía/recibe mensajes
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NÚMERO DE WHATSAPP DEL USUARIO                 │
│  - Funciona desde celular (WhatsApp Business App)          │
│  - Funciona desde CRM (vía Cloud API)                      │
│  - Ambos simultáneamente (COEXISTENCIA)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 PASO 1: Conexión Inicial (OAuth)

### **Lo que hace el usuario:**

1. **En Kommo:**
   - Va a Configuración → WhatsApp → Conectar cuenta
   - Clic en "Conectar con WhatsApp"

2. **Kommo redirige a Meta:**
   - Abre popup/ventana de Meta OAuth
   - Usuario autoriza con su cuenta de Facebook/Meta Business
   - Meta muestra qué permisos se requieren:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `business_management`

3. **Meta devuelve a Kommo:**
   - `code` de autorización
   - Kommo intercambia `code` por `access_token`
   - Kommo obtiene datos de Graph API:
     - `phone_number_id`
     - `business_account_id`
     - `access_token` (temporal o permanente)

4. **Kommo guarda en su BD:**
   ```json
   {
     "user_id": "usuario_kommo_123",
     "phone_number_id": "123456789012345",
     "business_account_id": "987654321098765",
     "access_token": "EAAxxxxxxxxxxxxx",
     "phone_number": "+591 12345678",
     "display_name": "Mi Negocio"
   }
   ```

**✅ Usuario NO necesita:**
- Ir a Meta Developer Console
- Copiar/pegar datos manualmente
- Saber qué es Phone Number ID

**✅ Todo es automático vía OAuth.**

---

## 🔄 PASO 2: Configuración de Coexistencia

### **Kommo verifica/activa coexistencia:**

1. **Kommo llama a la API de Meta:**
   ```
   GET /v18.0/{phone-number-id}
   Headers: Authorization: Bearer {access_token}
   ```

2. **Meta responde:**
   ```json
   {
     "verified_name": "Mi Negocio",
     "code_verification_status": "VERIFIED",
     "is_official_business_account": true,
     "coexistence": {
       "status": "active", // ← Coexistencia activa
       "capabilities": ["cloud_api", "mobile_app"]
     }
   }
   ```

3. **Kommo muestra al usuario:**
   - ✅ "Coexistencia activa: Puedes usar tu número desde celular y CRM simultáneamente"
   - O muestra QR/token si necesita configurar coexistencia

**✅ El usuario puede seguir usando WhatsApp desde su celular normalmente.**

---

## 📤 PASO 3: Envío de Mensajes Automáticos

### **Kommo decide cómo enviar:**

#### **Caso A: Ventana 24h abierta (Cloud API - Gratis)**

1. **Kommo verifica ventana:**
   ```javascript
   // Último mensaje del sistema hace menos de 24h
   if (timeSinceLastMessage < 24h) {
     // ✅ Usar Cloud API (GRATIS)
   }
   ```

2. **Kommo envía vía Cloud API:**
   ```javascript
   POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
   Headers: {
     Authorization: Bearer {access_token}
   }
   Body: {
     "messaging_product": "whatsapp",
     "to": "59112345678",
     "type": "text",
     "text": { "body": "Mensaje automático" }
   }
   ```

3. **Meta entrega al cliente** directamente

**✅ Mensaje enviado gratis y automáticamente.**

---

#### **Caso B: Ventana 24h cerrada (Templates - Pagado)**

1. **Kommo verifica ventana:**
   ```javascript
   // Último mensaje del sistema hace más de 24h
   if (timeSinceLastMessage >= 24h) {
     // ❌ No puede usar Cloud API gratis
     // ✅ Debe usar Template (pago)
   }
   ```

2. **Kommo envía vía Template:**
   ```javascript
   POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
   Headers: {
     Authorization: Bearer {access_token}
   }
   Body: {
     "messaging_product": "whatsapp",
     "to": "59112345678",
     "type": "template",
     "template": {
       "name": "saludo_inicial",
       "language": { "code": "es" }
     }
   }
   ```

3. **Meta cobra al usuario** por el template (según tarifas)
4. **Meta entrega al cliente**

**✅ Mensaje enviado, pero con costo.**

---

#### **Caso C: Ventana 72h (Templates con descuento)**

- Similar a Caso B, pero dentro de ventana de 72h
- Templates más baratos que fuera de ventana

---

## 📥 PASO 4: Recepción de Mensajes (Webhooks)

### **Kommo configura webhooks:**

1. **Kommo registra webhook en Meta:**
   ```javascript
   POST https://graph.facebook.com/v18.0/{phone-number-id}/subscribed_apps
   Body: {
     "subscribed_fields": ["messages", "message_status"]
   }
   ```

2. **Meta envía webhooks a Kommo:**
   ```
   POST https://kommo.com/webhooks/whatsapp
   Body: {
     "object": "whatsapp_business_account",
     "entry": [{
       "changes": [{
         "value": {
           "messages": [{
             "from": "59112345678",
             "id": "wamid.xxx",
             "text": { "body": "Hola!" },
             "timestamp": "1234567890"
           }]
         }
       }]
     }]
   }
   ```

3. **Kommo procesa:**
   - Guarda mensaje en BD
   - Notifica al usuario
   - Ejecuta secuencias automáticas si aplica
   - Actualiza ventana 24h

**✅ Mensaje recibido y procesado automáticamente.**

---

## 🤖 PASO 5: Automatización (Secuencias)

### **Kommo ejecuta secuencias:**

1. **Usuario configura secuencia:**
   - Mensaje 1: "Hola, bienvenido"
   - Pausa: 2 horas
   - Mensaje 2: "¿Cómo puedo ayudarte?"
   - Condición: Si responde con "precio" → Mensaje 3
   - Mensaje 3: "Aquí está nuestro precio..."

2. **Kommo programa envíos:**
   ```javascript
   // Worker/Job queue
   scheduleMessage({
     contactId: "contact_123",
     sequenceId: "seq_456",
     messageIndex: 0,
     sendAt: new Date() // Inmediato
   });
   
   scheduleMessage({
     contactId: "contact_123",
     sequenceId: "seq_456",
     messageIndex: 1,
     sendAt: new Date() + 2hours // En 2 horas
   });
   ```

3. **Kommo verifica condiciones:**
   ```javascript
   // Si el contacto responde "precio"
   if (lastMessage.includes("precio")) {
     // ✅ Saltar a mensaje 3
     jumpToSequenceStep(contactId, sequenceId, 2);
   }
   ```

**✅ Secuencias ejecutándose automáticamente.**

---

## 💰 Modelo de Negocio

### **Kommo cobra:**

1. **Suscripción mensual** al CRM
2. **Costo de templates** (pasado a cliente o incluido)
3. **Funciones premium** (secuencias avanzadas, etc.)

### **Meta cobra (a Kommo o al usuario):**

1. **Templates** fuera de ventana 24h
2. **Templates** en ventana 72h (más baratos)
3. **Mensajes** dentro de ventana 24h → **GRATIS** ✅

---

## 🔒 Seguridad y Privacidad

### **Kommo maneja:**

1. **Tokens de acceso:**
   - Almacenados encriptados
   - Refresh tokens para renovar automáticamente
   - Tokens temporales vs permanentes

2. **Datos de mensajes:**
   - Encriptados en tránsito (HTTPS)
   - Encriptados en reposo (BD)
   - Cumplimiento GDPR/privacidad

3. **Permisos:**
   - OAuth con scopes mínimos necesarios
   - Usuario puede revocar acceso en cualquier momento

---

## 📋 Diferencias con tu Implementación Actual

### **✅ Lo que YA tienes igual que Kommo:**

1. ✅ **OAuth** para conexión automática
2. ✅ **Coexistencia** configurada
3. ✅ **Webhooks** para mensajes entrantes
4. ✅ **Cloud API** para envíos en ventana 24h
5. ✅ **Templates** para fuera de ventana
6. ✅ **Secuencias automáticas**
7. ✅ **Sistema híbrido** (Cloud API + Puppeteer como fallback)

### **🔧 Lo que puedes mejorar:**

1. **Refresh Tokens Automáticos:**
   - Kommo renueva tokens automáticamente
   - Tu sistema puede implementar esto

2. **Gestión de Múltiples Apps:**
   - Kommo maneja múltiples cuentas/números
   - Ya lo tienes, pero puedes optimizar

3. **UI/UX:**
   - Kommo tiene flujo OAuth más pulido
   - Puedes mejorar la experiencia de conexión

---

## 🎯 Conclusión

**Kommo funciona así:**

1. **OAuth** → Usuario autoriza, Kommo obtiene tokens automáticamente
2. **Coexistencia** → Usuario sigue usando WhatsApp en celular
3. **Cloud API** → Kommo envía automáticamente (gratis en ventana 24h)
4. **Templates** → Kommo envía cuando ventana está cerrada (pago)
5. **Webhooks** → Kommo recibe mensajes entrantes
6. **Secuencias** → Kommo automatiza conversaciones

**✅ Tu sistema ya tiene todo esto implementado.**

**La diferencia principal es:**
- **Kommo:** Servicio SaaS completo, todo gestionado por ellos
- **Tu sistema:** Tienes control total, personalizable, y ya funciona similar

**¿Quieres que mejoremos algún aspecto específico basado en cómo funciona Kommo?** 🚀


