# 📋 Plan para Completar Tests - FASE 4.2

## Estado Actual

### Tests Pasando ✅
- `sequence-decision.test.js`: 5/5 ✅ (100%)
- `sequences.test.js`: 14/14 ✅ (100%)

### Tests Pendientes ❌
- `sequence-engine.test.js`: 5/12 (7 fallando)
- `sequence-pauser.test.js`: 0/9 (9 fallando)

## Tests Fallando

### sequence-engine.test.js (7 fallando):
1. `debe pausar si el cliente respondió después de iniciar la secuencia`
2. `debe retornar shouldSend: true si el delay ya pasó`
3. `debe retornar shouldSend: false si el delay no ha pasado`
4. `debe calcular el tiempo hasta el siguiente mensaje`
5. (y 3 más)

### sequence-pauser.test.js (9 fallando):
1. `debe detectar que el cliente respondió después de iniciar la secuencia`
2. `debe pausar secuencia cuando el cliente respondió`
3. `debe retornar success: true si no es necesario pausar`
4. `debe manejar errores correctamente`
5. (y 5 más)

## Plan de Acción

### Paso 1: Revisar Tests Fallidos
- Ejecutar tests con verbose para ver errores específicos
- Identificar qué mocks están incorrectos
- Identificar qué lógica necesita ajuste

### Paso 2: Corregir sequence-engine.test.js
- Ajustar mocks de `supabase.single`
- Ajustar mocks de `getSequenceWithMessages`
- Corregir lógica de `evaluateContactSequence`
- Corregir lógica de `shouldSendNextMessage`
- Corregir lógica de `calculateNextMessageTime`

### Paso 3: Corregir sequence-pauser.test.js
- Ajustar mocks de `supabase.single`
- Ajustar mocks de `supabase.update`
- Corregir lógica de `checkClientResponse`
- Corregir lógica de `pauseSequence`
- Corregir lógica de `resumeSequence`

### Paso 4: Verificar Todos los Tests
- Ejecutar todos los tests de FASE 4.2
- Asegurar 100% de cobertura
- Documentar resultados

## Objetivo

✅ **100% de tests pasando en FASE 4.2**
- sequence-engine.test.js: 12/12 ✅
- sequence-pauser.test.js: 9/9 ✅
- sequence-decision.test.js: 5/5 ✅ (ya está)
- sequences.test.js: 14/14 ✅ (ya está)

---

**¿Empezamos con sequence-engine.test.js primero?**


