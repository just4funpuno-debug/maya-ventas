# 📋 Guía de Testing: Ramificaciones

## 🎯 Objetivo

Verificar que las ramificaciones funcionan correctamente en las secuencias de mensajes.

---

## ✅ Checklist de Testing

### TEST 1: Ramificación con "Si Respondió"

**Objetivo:** Verificar que salta al mensaje correcto cuando la condición es verdadera.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola, ¿cómo estás?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
   - Condición: "Siempre enviar"
3. Agregar mensaje 2: "¿Estás ahí?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 1 hora
   - Condición: "Solo si el cliente respondió"
   - Si condición es verdadera: Mensaje 4
   - Si condición es falsa: Mensaje 3
4. Agregar mensaje 3: "No respondiste, ¿aún estás interesado?"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
   - Condición: "Siempre enviar"
5. Agregar mensaje 4: "Gracias por responder"
   - Tipo de pausa: "Delay fijo"
   - Delay: 0 horas
   - Condición: "Siempre enviar"
6. Asignar secuencia a un contacto
7. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ Responder como cliente desde WhatsApp
   - ✅ Mensaje 2 se evalúa
   - ✅ Como el cliente respondió, salta a Mensaje 4 (NO a Mensaje 3)
   - ✅ Mensaje 3 NO se envía

**Resultado Esperado:**
- ✅ El flujo salta correctamente según la condición
- ✅ Mensaje 4 se envía en lugar de Mensaje 3

---

### TEST 2: Ramificación con "Si NO Respondió"

**Objetivo:** Verificar que salta al mensaje correcto cuando la condición es falsa.

**Pasos:**
1. Usar la misma secuencia del TEST 1
2. Asignar secuencia a otro contacto (nuevo)
3. Verificar que:
   - ✅ Mensaje 1 se envía inmediatamente
   - ✅ NO responder como cliente
   - ✅ Esperar 1 hora (o simular)
   - ✅ Mensaje 2 se evalúa
   - ✅ Como el cliente NO respondió, salta a Mensaje 3 (NO a Mensaje 4)
   - ✅ Mensaje 4 NO se envía

**Resultado Esperado:**
- ✅ El flujo salta correctamente cuando la condición es falsa
- ✅ Mensaje 3 se envía en lugar de Mensaje 4

---

### TEST 3: Ramificación sin Configurar

**Objetivo:** Verificar que sin ramificaciones, el comportamiento es normal.

**Pasos:**
1. Crear una nueva secuencia
2. Agregar mensaje 1: "Hola"
   - Condición: "Solo si el cliente respondió"
   - Si condición es verdadera: (vacío - continuar normal)
   - Si condición es falsa: (vacío - continuar normal)
3. Agregar mensaje 2: "Siguiente mensaje"
4. Asignar secuencia a un contacto
5. Verificar que:
   - ✅ Si el cliente responde → Mensaje 2 se envía (comportamiento normal)
   - ✅ Si el cliente NO responde → Mensaje 2 NO se envía (se salta)

**Resultado Esperado:**
- ✅ Sin ramificaciones, el comportamiento es el mismo que antes de FASE 4
- ✅ Se salta el mensaje si la condición no se cumple

---

### TEST 4: Combinación Completa

**Objetivo:** Verificar que pausas + condiciones + ramificaciones funcionan juntas.

**Pasos:**
1. Crear secuencia compleja:
   - Mensaje 1: "Hola" (fixed_delay, 0h, none)
   - Mensaje 2: "¿Respondiste?" (until_message, if_responded, true→M4, false→M3)
   - Mensaje 3: "No respondiste" (fixed_delay, 0h, none)
   - Mensaje 4: "Gracias" (fixed_delay, 0h, none)
2. Asignar a contacto
3. Verificar que:
   - ✅ Mensaje 1 se envía
   - ✅ Mensaje 2 espera respuesta
   - ✅ Si responde → Va a Mensaje 4
   - ✅ Si no responde → Va a Mensaje 3

**Resultado Esperado:**
- ✅ Todas las funcionalidades trabajan juntas correctamente

---

## ✅ Criterios de Aprobación

- ✅ Las ramificaciones funcionan correctamente
- ✅ El flujo salta a los mensajes correctos
- ✅ Sin ramificaciones, comportamiento normal
- ✅ Combinación con pausas y condiciones funciona

---

**Fecha:** 2025-01-30

