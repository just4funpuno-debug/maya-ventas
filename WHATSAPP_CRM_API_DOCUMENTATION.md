# 📚 WhatsApp CRM - Documentación de API

**Versión:** 1.0.0  
**Fecha:** 2025-02-01

---

## 📋 Índice

1. [Servicios de Cuentas](#servicios-de-cuentas)
2. [Servicios de Conversaciones](#servicios-de-conversaciones)
3. [Servicios de Envío](#servicios-de-envío)
4. [Servicios de Secuencias](#servicios-de-secuencias)
5. [Servicios de Integración con Ventas](#servicios-de-integración-con-ventas)
6. [Servicios de Puppeteer](#servicios-de-puppeteer)
7. [Servicios de Detección de Bloqueos](#servicios-de-detección-de-bloqueos)
8. [Utilidades](#utilidades)

---

## 🔐 Servicios de Cuentas

### `getAllAccounts()`

Obtiene todas las cuentas WhatsApp configuradas.

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    phone_number_id: string,
    business_account_id: string,
    phone_number: string,
    display_name: string,
    active: boolean,
    connection_method: 'manual' | 'oauth',
    coexistence_status: 'pending' | 'connected' | 'failed',
    created_at: string,
    updated_at: string
  }>,
  error: null | { message: string, code?: string }
}
```

**Ejemplo:**
```javascript
import { getAllAccounts } from './services/whatsapp/accounts';

const { data, error } = await getAllAccounts();
if (error) {
  console.error('Error:', error);
} else {
  console.log('Cuentas:', data);
}
```

---

### `getAccountById(id)`

Obtiene una cuenta por su ID.

**Parámetros:**
- `id` (string): ID de la cuenta

**Retorna:**
```javascript
{
  data: Account | null,
  error: null | { message: string }
}
```

---

### `createAccount(data)`

Crea una nueva cuenta WhatsApp.

**Parámetros:**
```javascript
{
  phone_number_id: string,
  business_account_id: string,
  access_token: string,
  verify_token: string,
  phone_number: string,
  display_name?: string,
  active?: boolean
}
```

**Retorna:**
```javascript
{
  data: Account | null,
  error: null | { message: string }
}
```

---

## 💬 Servicios de Conversaciones

### `getConversations(options)`

Obtiene lista de conversaciones (contactos con mensajes).

**Parámetros:**
```javascript
{
  search?: string,      // Búsqueda por nombre o teléfono
  limit?: number,       // Default: 50
  offset?: number       // Default: 0
}
```

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    name: string,
    phone: string,
    window_expires_at: string | null,
    last_interaction_at: string | null,
    last_interaction_source: 'client' | 'manual' | 'cloud_api' | 'puppeteer',
    lastMessage: {
      id: string,
      text_content: string,
      message_type: string,
      timestamp: string
    } | null
  }>,
  error: null | { message: string }
}
```

---

### `getContactMessages(contactId, options)`

Obtiene mensajes de un contacto.

**Parámetros:**
- `contactId` (string): ID del contacto
- `options` (object):
  - `limit?: number` (default: 50)
  - `offset?: number` (default: 0)

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    contact_id: string,
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document',
    text_content: string | null,
    media_url: string | null,
    is_from_me: boolean,
    sent_via: 'cloud_api' | 'puppeteer' | 'manual',
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending',
    timestamp: string
  }>,
  error: null | { message: string }
}
```

---

## 📤 Servicios de Envío

### `sendTextMessage(accountId, contactId, phone, text)`

Envía un mensaje de texto.

**Parámetros:**
- `accountId` (string): ID de la cuenta
- `contactId` (string): ID del contacto
- `phone` (string): Número de teléfono
- `text` (string): Texto del mensaje

**Retorna:**
```javascript
{
  success: boolean,
  messageId: string | null,
  timestamp: string | null,
  error: null | { message: string, code?: string }
}
```

**Ejemplo:**
```javascript
import { sendTextMessage } from './services/whatsapp/cloud-api-sender';

const result = await sendTextMessage(
  'account_123',
  'contact_123',
  '+59112345678',
  'Hola, este es un mensaje de prueba'
);

if (result.success) {
  console.log('Mensaje enviado:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

---

### `sendImageMessage(accountId, contactId, phone, imageUrl, caption?)`

Envía una imagen.

**Parámetros:**
- `accountId` (string): ID de la cuenta
- `contactId` (string): ID del contacto
- `phone` (string): Número de teléfono
- `imageUrl` (string): URL de la imagen
- `caption` (string, opcional): Caption del mensaje

**Retorna:**
```javascript
{
  success: boolean,
  messageId: string | null,
  timestamp: string | null,
  error: null | { message: string }
}
```

---

### `decideSendMethod(contactId)`

Decide automáticamente el método de envío (Cloud API o Puppeteer).

**Parámetros:**
- `contactId` (string): ID del contacto

**Retorna:**
```javascript
{
  method: 'cloud_api' | 'puppeteer' | null,
  reason: string,
  cost: number,
  error: null | { message: string }
}
```

**Ejemplo:**
```javascript
import { decideSendMethod } from './services/whatsapp/send-decision';

const decision = await decideSendMethod('contact_123');
console.log('Método:', decision.method); // 'cloud_api' o 'puppeteer'
console.log('Razón:', decision.reason); // 'window_24h_active', 'window_72h_active', 'window_closed'
```

---

## 📋 Servicios de Secuencias

### `createSequence(data)`

Crea una nueva secuencia de mensajes.

**Parámetros:**
```javascript
{
  account_id: string,
  name: string,
  description?: string,
  active?: boolean
}
```

**Retorna:**
```javascript
{
  data: {
    id: string,
    account_id: string,
    name: string,
    description: string | null,
    active: boolean,
    total_messages: number,
    created_at: string
  } | null,
  error: null | { message: string }
}
```

---

### `addSequenceMessage(sequenceId, messageData)`

Agrega un mensaje a una secuencia.

**Parámetros:**
- `sequenceId` (string): ID de la secuencia
- `messageData` (object):
  ```javascript
  {
    message_type: 'text' | 'image' | 'video' | 'audio' | 'document',
    content_text?: string,              // Para mensajes de texto
    media_url?: string,                 // Para mensajes multimedia
    media_filename?: string,            // Para documentos
    media_size_kb?: number,             // Tamaño en KB
    caption?: string,                   // Caption para media
    delay_hours_from_previous: number,   // Horas desde mensaje anterior
    order_position?: number             // Posición en orden (auto si no se especifica)
  }
  ```

**Retorna:**
```javascript
{
  data: {
    id: string,
    sequence_id: string,
    message_number: number,
    message_type: string,
    content_text: string | null,
    media_url: string | null,
    delay_hours_from_previous: number,
    order_position: number,
    active: boolean
  } | null,
  error: null | { message: string }
}
```

---

### `getSequenceWithMessages(sequenceId)`

Obtiene una secuencia con todos sus mensajes.

**Parámetros:**
- `sequenceId` (string): ID de la secuencia

**Retorna:**
```javascript
{
  data: {
    id: string,
    name: string,
    description: string | null,
    active: boolean,
    messages: Array<SequenceMessage>
  } | null,
  error: null | { message: string }
}
```

---

## 🛒 Servicios de Integración con Ventas

### `createContactFromSale(saleId, accountId)`

Crea un contacto de WhatsApp desde una venta, o asocia la venta con un contacto existente.

**Parámetros:**
- `saleId` (string): ID de la venta
- `accountId` (string): ID de la cuenta WhatsApp

**Retorna:**
```javascript
{
  data: Contact | null,
  error: null | { message: string },
  wasExisting?: boolean  // true si el contacto ya existía
}
```

---

### `getContactSales(contactId)`

Obtiene todas las ventas asociadas a un contacto.

**Parámetros:**
- `contactId` (string): ID del contacto

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    fecha: string,
    ciudad: string,
    sku: string,
    cantidad: number,
    precio: number,
    total: number,
    estado_entrega: string,
    // ... otros campos de venta
  }>,
  error: null | { message: string }
}
```

---

## 🤖 Servicios de Puppeteer

### `getQueueMessages(options)`

Obtiene mensajes de la cola de Puppeteer.

**Parámetros:**
```javascript
{
  status?: 'pending' | 'processing' | 'sent' | 'failed',
  priority?: 'HIGH' | 'MEDIUM' | 'LOW',
  messageType?: string,
  search?: string,
  limit?: number,
  offset?: number
}
```

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    contact_id: string,
    message_type: string,
    content_text: string | null,
    media_path: string | null,
    status: string,
    priority: string,
    scheduled_for: string | null,
    attempts: number,
    error_message: string | null,
    whatsapp_contacts: {
      name: string,
      phone: string
    }
  }>,
  error: null | { message: string }
}
```

---

### `pauseBot(accountId)`

Pausa el bot Puppeteer (emergencia).

**Parámetros:**
- `accountId` (string): ID de la cuenta

**Retorna:**
```javascript
{
  success: boolean,
  error: null | { message: string }
}
```

---

## 🚫 Servicios de Detección de Bloqueos

### `detectBlockedContacts(accountId)`

Detecta contactos potencialmente bloqueados.

**Parámetros:**
- `accountId` (string): ID de la cuenta

**Retorna:**
```javascript
{
  detected: number,
  errors: number,
  details: Array<{
    contactId: string,
    blockProbability: number,
    reason: string
  }>,
  error: null | { message: string }
}
```

---

### `getPotentialBlocks(accountId)`

Obtiene lista de contactos potencialmente bloqueados.

**Parámetros:**
- `accountId` (string): ID de la cuenta

**Retorna:**
```javascript
{
  data: Array<{
    id: string,
    name: string,
    phone: string,
    block_probability: number,
    consecutive_undelivered: number,
    is_blocked: boolean
  }>,
  error: null | { message: string }
}
```

---

## 🛠️ Utilidades

### `normalizePhone(phone)`

Normaliza un número de teléfono.

**Parámetros:**
- `phone` (string): Número de teléfono

**Retorna:**
```javascript
string  // Número normalizado (ej: "+59112345678")
```

---

### `validatePhone(phone)`

Valida un número de teléfono.

**Parámetros:**
- `phone` (string): Número de teléfono

**Retorna:**
```javascript
{
  valid: boolean,
  error: null | string
}
```

---

**Última actualización:** 2025-02-01


