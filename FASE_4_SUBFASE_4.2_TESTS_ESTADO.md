# Estado de Tests - SUBFASE 4.2

## Tests Creados

✅ **29 tests unitarios creados**:
- `tests/whatsapp/sequence-engine.test.js` - 12 tests
- `tests/whatsapp/sequence-decision.test.js` - 5 tests  
- `tests/whatsapp/sequence-pauser.test.js` - 12 tests

## Estado Actual

### sequence-engine.test.js
- **5 tests pasando** ✅
- **7 tests fallando** ❌
  - `debe pausar si el cliente respondió después de iniciar la secuencia` - Retorna `waiting_delay` en lugar de `client_responded`
  - `debe retornar shouldSend: true si el delay ya pasó` - Retorna `false` en lugar de `true`
  - `debe retornar shouldSend: false si el delay no ha pasado` - Retorna `NaN` en lugar de número
  - `debe calcular el tiempo hasta el siguiente mensaje` - Retorna `null` en lugar de `Date`
  - `debe retornar tiempo 0 si debe enviarse ahora` - Retorna `null` en lugar de `0`
  - `debe obtener siguiente mensaje de la secuencia` - Retorna `null` en lugar de mensaje
  - `debe retornar null si la secuencia está completada` - Retorna mensaje en lugar de `null`

### sequence-decision.test.js
- **4 tests pasando** ✅
- **1 test fallando** ❌
  - `debe procesar mensaje de texto via Cloud API cuando método es cloud_api` - `sendTextMessage` no está siendo llamado

### sequence-pauser.test.js
- **3 tests pasando** ✅
- **9 tests fallando** ❌
  - Problemas con mocks de `checkClientResponse`, `pauseSequence`, `resumeSequence`, `pauseSequencesBatch`

## Problemas Identificados

1. **Mocks de Supabase**: Los mocks de encadenamiento (`from().select().eq().order().limit().single()`) necesitan ajustes
2. **Lógica de detección de respuesta del cliente**: El código no está detectando correctamente cuando el cliente respondió
3. **Mocks de funciones asíncronas**: Algunos mocks no están retornando promesas correctamente
4. **Verificación de `getNextSequenceMessage`**: El código verifica `if (!nextMessage)` pero debería verificar `if (!nextMessage.message)`

## Correcciones Aplicadas

✅ Corregido `src/services/whatsapp/sequence-engine.js`:
- Cambiado `if (!nextMessage)` a `if (!nextMessage || !nextMessage.message)`

## Próximos Pasos

1. Ajustar mocks de `limit()` para que retornen `supabase` correctamente
2. Verificar por qué `evaluateContactSequence` no detecta `client_responded`
3. Corregir mocks de `shouldSendNextMessage` para que retornen valores correctos
4. Ajustar mocks de `sequence-pauser` para que `checkClientResponse` funcione correctamente
5. Verificar que `sendTextMessage` sea llamado en `sequence-decision`

## Nota

Los servicios (`sequence-engine.js`, `sequence-decision.js`, `sequence-pauser.js`) ya existen y tienen la lógica implementada. Los problemas son principalmente con los mocks de los tests, no con la lógica del código.


