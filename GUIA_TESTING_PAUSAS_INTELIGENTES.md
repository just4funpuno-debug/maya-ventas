# 📋 Guía de Testing: Pausas Inteligentes

## 🎯 Objetivo

Verificar que las pausas inteligentes funcionan correctamente en las secuencias de mensajes.

---

## ✅ Checklist de Testing

### TEST 1: Pausa Tipo "Delay Fijo" (Comportamiento Original)

**Objetivo:** Verificar que el comportamiento original sigue funcionando.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola, ¿cómo estás?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
3. Agregar mensaje 2: "Espero tu respuesta"
   - Tipo de pausa: "Delay fijo"
   - Delay: 2 horas
4. Asignar secuencia a un contacto
5. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ Mensaje 2 se envía después de 2 horas (o simular tiempo)

**Resultado Esperado:**
- ✅ Comportamiento igual al sistema anterior
- ✅ No se rompe funcionalidad existente

---

### TEST 2: Pausa Tipo "Hasta Recibir Mensaje"

**Objetivo:** Verificar que el mensaje se envía solo cuando el cliente responde.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola, ¿cómo estás?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
3. Agregar mensaje 2: "Gracias por responder"
   - Tipo de pausa: "Pausar hasta recibir mensaje del cliente"
4. Asignar secuencia a un contacto
5. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ Mensaje 2 NO se envía (esperando respuesta)
   - ✅ Responder como cliente desde WhatsApp
   - ✅ Mensaje 2 SÍ se envía después de la respuesta

**Resultado Esperado:**
- ✅ El mensaje 2 espera hasta que el cliente responda
- ✅ Una vez que el cliente responde, el mensaje 2 se envía

---

### TEST 3: Pausa Tipo "Hasta X Días Sin Respuesta"

**Objetivo:** Verificar que el mensaje se envía solo si han pasado X días sin respuesta.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola, ¿cómo estás?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
3. Agregar mensaje 2: "Recordatorio: ¿Aún estás interesado?"
   - Tipo de pausa: "Pausar hasta X días sin respuesta"
   - Días sin respuesta: 2 días
4. Asignar secuencia a un contacto
5. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ Mensaje 2 NO se envía inmediatamente
   - ✅ Esperar 2 días (o simular tiempo)
   - ✅ Mensaje 2 SÍ se envía después de 2 días sin respuesta

**Variación:**
- Si el cliente responde antes de 2 días:
  - ✅ Mensaje 2 NO se envía (cliente respondió)

**Resultado Esperado:**
- ✅ El mensaje 2 solo se envía si han pasado 2 días sin respuesta
- ✅ Si el cliente responde antes, el mensaje 2 no se envía

---

### TEST 4: Combinación de Tipos de Pausa

**Objetivo:** Verificar que se pueden combinar diferentes tipos de pausa.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
3. Agregar mensaje 2: "¿Estás ahí?"
   - Tipo de pausa: "Pausar hasta recibir mensaje del cliente"
4. Agregar mensaje 3: "Recordatorio"
   - Tipo de pausa: "Pausar hasta X días sin respuesta"
   - Días sin respuesta: 3 días
5. Asignar secuencia a un contacto
6. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ Mensaje 2 espera respuesta
   - ✅ Si el cliente responde, mensaje 2 se envía
   - ✅ Mensaje 3 espera 3 días sin respuesta

**Resultado Esperado:**
- ✅ Cada mensaje usa su propio tipo de pausa correctamente
- ✅ No hay conflictos entre diferentes tipos

---

### TEST 5: Compatibilidad con Secuencias Existentes

**Objetivo:** Verificar que las secuencias existentes siguen funcionando.

**Pasos:**
1. Abrir una secuencia existente (creada antes de esta actualización)
2. Verificar que:
   - ✅ Los mensajes se muestran correctamente
   - ✅ Al editar un mensaje, tiene `pause_type = 'fixed_delay'` por defecto
   - ✅ La secuencia funciona igual que antes

**Resultado Esperado:**
- ✅ Las secuencias existentes no se rompen
- ✅ Mantienen comportamiento original

---

### TEST 6: UI - Selector de Tipo de Pausa

**Objetivo:** Verificar que la UI funciona correctamente.

**Pasos:**
1. Crear/editar un mensaje de secuencia
2. Verificar que:
   - ✅ Aparece selector "Tipo de Pausa"
   - ✅ Tiene 3 opciones disponibles
   - ✅ Al seleccionar "Delay fijo", aparece campo "Delay desde mensaje anterior"
   - ✅ Al seleccionar "Pausar hasta recibir mensaje", NO aparece campo de delay
   - ✅ Al seleccionar "Pausar hasta X días sin respuesta", aparece campo "Días sin respuesta"
   - ✅ El campo "Días sin respuesta" requiere mínimo 1 día

**Resultado Esperado:**
- ✅ UI intuitiva y clara
- ✅ Campos se muestran/ocultan correctamente
- ✅ Validaciones funcionan

---

### TEST 7: UI - Indicadores Visuales

**Objetivo:** Verificar que los indicadores visuales se muestran correctamente.

**Pasos:**
1. Crear secuencia con diferentes tipos de pausa
2. Verificar que en la lista de mensajes:
   - ✅ Mensaje con `fixed_delay` muestra "+Xh" (si delay > 0)
   - ✅ Mensaje con `until_message` muestra badge azul "Esperar respuesta"
   - ✅ Mensaje con `until_days_without_response` muestra badge naranja "X días sin respuesta"

**Resultado Esperado:**
- ✅ Indicadores visuales claros y distintivos
- ✅ Fácil identificar el tipo de pausa de cada mensaje

---

## 🐛 Errores Comunes a Verificar

- [ ] **Error:** Mensaje con `until_message` se envía sin esperar respuesta
  - **Causa:** Lógica de verificación no funciona
  - **Solución:** Verificar `checkIfClientRespondedAfterMessage()`

- [ ] **Error:** Mensaje con `until_days_without_response` no se envía después de X días
  - **Causa:** Cálculo de días incorrecto
  - **Solución:** Verificar `getDaysSinceLastResponse()`

- [ ] **Error:** Campo "Días sin respuesta" no aparece
  - **Causa:** Condición de visibilidad incorrecta
  - **Solución:** Verificar `pauseType === 'until_days_without_response'`

---

## ✅ Criterios de Aprobación

- ✅ Todos los tipos de pausa funcionan correctamente
- ✅ UI es intuitiva y clara
- ✅ Las secuencias existentes siguen funcionando
- ✅ No hay errores en consola
- ✅ Validaciones funcionan correctamente

---

**Fecha:** 2025-01-30

