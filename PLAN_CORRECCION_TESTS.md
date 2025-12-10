# 🔧 Plan de Corrección de Tests

**Fecha:** 2025-02-01  
**Tests fallando:** 12 de 24 (sequence-engine + sequence-pauser)

---

## 📋 Problemas Identificados

### sequence-engine.test.js

1. **"debe pausar si el cliente respondió después de iniciar la secuencia"**
   - **Problema:** Retorna 'waiting_delay' en lugar de 'client_responded'
   - **Causa:** El código continúa después de verificar respuesta del cliente
   - **Solución:** Asegurar que el mock no interfiera, verificar que el código retorne correctamente

2. **"debe calcular el tiempo hasta el siguiente mensaje"**
   - **Problema:** `nextSendTime` es `null` en lugar de `Date`
   - **Causa:** `nextMessage` es `null` en `calculateNextMessageTime`
   - **Solución:** Configurar mocks correctamente para que `nextMessage` no sea null

3. **Otros tests de `shouldSendNextMessage` y `getNextSequenceMessage`**
   - **Problema:** Mocks de Supabase no configurados correctamente
   - **Solución:** Configurar cadena completa de mocks (from → select → eq → order → limit → single)

### sequence-pauser.test.js

1. **"debe detectar que el cliente respondió después de iniciar la secuencia"**
   - **Problema:** `shouldPause` es `false` en lugar de `true`
   - **Causa:** Mock no configurado correctamente o lógica de comparación

2. **"debe pausar secuencia cuando el cliente respondió"**
   - **Problema:** `success` es `false` en lugar de `true`
   - **Causa:** Mock de `update` no configurado correctamente

3. **Otros tests de `pauseSequence`, `resumeSequence`, `pauseSequencesBatch`**
   - **Problema:** Mocks de Supabase no configurados correctamente
   - **Solución:** Configurar cadena completa de mocks

---

## ✅ Estrategia de Corrección

1. **Corregir mocks de Supabase** para que retornen correctamente en cadena
2. **Asegurar que los mocks no interfieran** entre tests
3. **Verificar que las expectativas coincidan** con las implementaciones reales
4. **Ejecutar tests después de cada corrección** para verificar progreso

---

**Estado:** En progreso


