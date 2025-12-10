# Plan de Ajuste de Tests - SUBFASE 4.2

## Análisis de Implementación Real

### sequence-engine.js
- `evaluateContactSequence`: Verifica respuesta del cliente ANTES de obtener secuencia (líneas 100-118)
- `shouldSendNextMessage`: Busca último mensaje con `sequence_message_id === contact.sequence_position` (línea 229)
- `getNextSequenceMessage`: Siempre retorna `{ message, position, error }`, nunca null directamente

### sequence-decision.js
- `processSequenceMessage`: Obtiene contacto con `select('*, account_id, whatsapp_accounts(*)')` (línea 35)
- Llama a `sendTextMessage(accountId, contactId, content_text || '')` (línea 99)
- `updateContactAfterSend`: Obtiene contacto con `select('messages_sent_via_cloud_api, messages_sent_via_puppeteer, sequence_position, account_id')` (línea 245)

### sequence-pauser.js
- `checkClientResponse`: Retorna `{ hasResponded, shouldPause, lastResponseTime, error }` (línea 76)
- `pauseSequence`: Llama a `checkClientResponse` primero (línea 102)
- `resumeSequence`: También llama a `checkClientResponse` primero (línea 144)

## Correcciones Necesarias

1. **sequence-engine.test.js**:
   - El test de "debe pausar si el cliente respondió" está correcto, pero el código podría no estar detectando correctamente
   - `shouldSendNextMessage` necesita mocks correctos para `limit()` y `single()`
   - `calculateNextMessageTime` necesita que `evaluateContactSequence` retorne `nextMessage` correctamente
   - `getNextSequenceMessage` siempre retorna objeto, nunca null

2. **sequence-decision.test.js**:
   - `processSequenceMessage` obtiene contacto con join a `whatsapp_accounts`, necesita mock correcto
   - `sendTextMessage` se llama con `(accountId, contactId, content_text || '')`

3. **sequence-pauser.test.js**:
   - `checkClientResponse` retorna objeto con `shouldPause`, no directamente boolean
   - `pauseSequence` y `resumeSequence` llaman a `checkClientResponse` primero


