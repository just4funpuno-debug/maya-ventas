# 📋 Plan Detallado: Automatizaciones Mejoradas (Opción A)

## 🎯 Objetivo

Mejorar el sistema de secuencias actual agregando:
- Pausas inteligentes
- Condiciones básicas
- Ramificaciones simples

**Sin romper funcionalidad existente** y **permitiendo migración futura a Opción B**.

---

## ✅ Confirmación de Viabilidad

### ✅ Es Posible Porque:

1. **Compatibilidad hacia atrás:**
   - Los nuevos campos tienen valores por defecto
   - Las secuencias existentes seguirán funcionando igual
   - No se rompe nada actual

2. **Modularidad:**
   - Cada subfase es independiente
   - Se puede probar después de cada subfase
   - Si algo falla, solo afecta esa subfase

3. **Migración Futura:**
   - La estructura de datos prepara el terreno para Opción B
   - Los campos nuevos se pueden usar en el builder visual
   - No hay conflictos

---

## 📊 Estructura por Fases y Subfases

### **FASE 1: Base de Datos y Schema** (1 día)
- SUBFASE 1.1: Migración de base de datos
- SUBFASE 1.2: Testing de schema
- SUBFASE 1.3: Verificación de compatibilidad

### **FASE 2: Pausas Inteligentes** (1 día)
- SUBFASE 2.1: Backend - Lógica de pausas
- SUBFASE 2.2: Frontend - UI para configurar pausas
- SUBFASE 2.3: Testing - Verificar pausas funcionan

### **FASE 3: Condiciones Básicas** (1 día)
- SUBFASE 3.1: Backend - Lógica de condiciones
- SUBFASE 3.2: Frontend - UI para configurar condiciones
- SUBFASE 3.3: Testing - Verificar condiciones funcionan

### **FASE 4: Ramificaciones** (1 día)
- SUBFASE 4.1: Backend - Lógica de ramificaciones
- SUBFASE 4.2: Frontend - UI para configurar ramificaciones
- SUBFASE 4.3: Testing - Verificar ramificaciones funcionan

### **FASE 5: Testing y Ajustes Finales** (0.5 días)
- SUBFASE 5.1: Testing de integración completo
- SUBFASE 5.2: Ajustes de UI/UX
- SUBFASE 5.3: Documentación

---

## 🔧 FASE 1: Base de Datos y Schema

### SUBFASE 1.1: Migración de Base de Datos

**Objetivo:** Agregar campos nuevos a `whatsapp_sequence_messages` sin romper funcionalidad existente.

**Archivos a crear:**
- `supabase/migrations/016_automation_improvements.sql`
- `EJECUTAR_MIGRACION_016.sql`

**Cambios SQL:**
```sql
-- Agregar campos nuevos con valores por defecto
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_type TEXT DEFAULT 'fixed_delay' 
  CHECK (pause_type IN ('fixed_delay', 'until_message', 'until_days_without_response')),
ADD COLUMN IF NOT EXISTS condition_type TEXT DEFAULT 'none'
  CHECK (condition_type IN ('none', 'if_responded', 'if_not_responded')),
ADD COLUMN IF NOT EXISTS next_message_if_true UUID REFERENCES whatsapp_sequence_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_message_if_false UUID REFERENCES whatsapp_sequence_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS days_without_response INTEGER DEFAULT NULL;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sequence_messages_pause_type 
  ON whatsapp_sequence_messages(sequence_id, pause_type);
CREATE INDEX IF NOT EXISTS idx_sequence_messages_condition_type 
  ON whatsapp_sequence_messages(sequence_id, condition_type);
```

**Testing:**
- ✅ Verificar que las secuencias existentes siguen funcionando
- ✅ Verificar que los valores por defecto se aplican correctamente
- ✅ Verificar que los CHECK constraints funcionan

---

### SUBFASE 1.2: Testing de Schema

**Objetivo:** Verificar que el schema funciona correctamente.

**Scripts de testing:**
- `scripts/test-automation-schema.sql`

**Verificaciones:**
- ✅ Insertar mensaje con valores por defecto
- ✅ Insertar mensaje con `pause_type = 'until_message'`
- ✅ Insertar mensaje con `condition_type = 'if_responded'`
- ✅ Insertar mensaje con ramificaciones (`next_message_if_true`, `next_message_if_false`)
- ✅ Verificar que las foreign keys funcionan

---

### SUBFASE 1.3: Verificación de Compatibilidad

**Objetivo:** Asegurar que las secuencias existentes siguen funcionando.

**Verificaciones:**
- ✅ Consultar todas las secuencias existentes
- ✅ Verificar que tienen `pause_type = 'fixed_delay'` (por defecto)
- ✅ Verificar que tienen `condition_type = 'none'` (por defecto)
- ✅ Verificar que `next_message_if_true` y `next_message_if_false` son NULL

---

## 🔧 FASE 2: Pausas Inteligentes

### SUBFASE 2.1: Backend - Lógica de Pausas

**Objetivo:** Modificar el motor de secuencias para soportar pausas inteligentes.

**Archivos a modificar:**
- `src/services/whatsapp/sequence-engine.js`
  - Modificar `shouldSendNextMessage()` para evaluar `pause_type`
  - Agregar lógica para `until_message`
  - Agregar lógica para `until_days_without_response`

**Lógica a implementar:**

```javascript
// En shouldSendNextMessage()
if (nextMessage.pause_type === 'until_message') {
  // Verificar si el cliente ha respondido después del último mensaje
  const hasResponded = await checkIfClientResponded(contactId, lastMessageTime);
  if (!hasResponded) {
    return { shouldSend: false, reason: 'waiting_for_message' };
  }
}

if (nextMessage.pause_type === 'until_days_without_response') {
  // Verificar si han pasado X días sin respuesta
  const daysSinceLastResponse = await getDaysSinceLastResponse(contactId);
  if (daysSinceLastResponse < nextMessage.days_without_response) {
    return { shouldSend: false, reason: 'waiting_days_without_response' };
  }
}
```

**Testing:**
- ✅ Test unitario: `pause_type = 'fixed_delay'` (comportamiento actual)
- ✅ Test unitario: `pause_type = 'until_message'` (esperar respuesta)
- ✅ Test unitario: `pause_type = 'until_days_without_response'` (esperar días)

---

### SUBFASE 2.2: Frontend - UI para Configurar Pausas

**Objetivo:** Agregar opciones en el editor de mensajes para configurar pausas.

**Archivos a modificar:**
- `src/components/whatsapp/SequenceMessageEditor.jsx`
  - Agregar selector de `pause_type`
  - Agregar campo `days_without_response` (si aplica)
  - Mostrar/ocultar campos según selección

**UI a agregar:**
```jsx
<select value={pauseType} onChange={handlePauseTypeChange}>
  <option value="fixed_delay">Delay fijo (horas desde mensaje anterior)</option>
  <option value="until_message">Pausar hasta recibir mensaje del cliente</option>
  <option value="until_days_without_response">Pausar hasta X días sin respuesta</option>
</select>

{pauseType === 'until_days_without_response' && (
  <input 
    type="number" 
    value={daysWithoutResponse} 
    onChange={handleDaysChange}
    placeholder="Días sin respuesta"
  />
)}
```

**Testing:**
- ✅ Verificar que el selector funciona
- ✅ Verificar que los campos se muestran/ocultan correctamente
- ✅ Verificar que se guarda correctamente en BD

---

### SUBFASE 2.3: Testing - Verificar Pausas Funcionan

**Objetivo:** Testing completo de pausas inteligentes.

**Tests a realizar:**
1. **Test Manual:**
   - Crear secuencia con `pause_type = 'until_message'`
   - Enviar primer mensaje
   - Verificar que NO se envía el segundo hasta que el cliente responda
   - Responder como cliente
   - Verificar que SÍ se envía el segundo mensaje

2. **Test Manual:**
   - Crear secuencia con `pause_type = 'until_days_without_response'` (2 días)
   - Enviar primer mensaje
   - Verificar que NO se envía el segundo hasta que pasen 2 días sin respuesta
   - Esperar 2 días (o simular)
   - Verificar que SÍ se envía el segundo mensaje

3. **Test de Compatibilidad:**
   - Verificar que secuencias existentes (con `pause_type = 'fixed_delay'`) siguen funcionando igual

---

## 🔧 FASE 3: Condiciones Básicas

### SUBFASE 3.1: Backend - Lógica de Condiciones

**Objetivo:** Modificar el motor de secuencias para evaluar condiciones.

**Archivos a modificar:**
- `src/services/whatsapp/sequence-engine.js`
  - Modificar `getNextSequenceMessage()` para evaluar `condition_type`
  - Agregar función `evaluateCondition()`

**Lógica a implementar:**

```javascript
// En getNextSequenceMessage()
if (nextMessage.condition_type === 'if_responded') {
  const hasResponded = await checkIfClientResponded(contactId);
  if (!hasResponded) {
    // Saltar este mensaje, buscar siguiente
    return getNextSequenceMessage(contactId, sequence, currentPosition + 1);
  }
}

if (nextMessage.condition_type === 'if_not_responded') {
  const hasResponded = await checkIfClientResponded(contactId);
  if (hasResponded) {
    // Saltar este mensaje, buscar siguiente
    return getNextSequenceMessage(contactId, sequence, currentPosition + 1);
  }
}
```

**Testing:**
- ✅ Test unitario: `condition_type = 'none'` (siempre enviar)
- ✅ Test unitario: `condition_type = 'if_responded'` (solo si respondió)
- ✅ Test unitario: `condition_type = 'if_not_responded'` (solo si NO respondió)

---

### SUBFASE 3.2: Frontend - UI para Configurar Condiciones

**Objetivo:** Agregar opciones en el editor de mensajes para configurar condiciones.

**Archivos a modificar:**
- `src/components/whatsapp/SequenceMessageEditor.jsx`
  - Agregar selector de `condition_type`
  - Mostrar información sobre qué hace cada condición

**UI a agregar:**
```jsx
<select value={conditionType} onChange={handleConditionTypeChange}>
  <option value="none">Siempre enviar (sin condición)</option>
  <option value="if_responded">Solo si el cliente respondió</option>
  <option value="if_not_responded">Solo si el cliente NO respondió</option>
</select>
```

**Testing:**
- ✅ Verificar que el selector funciona
- ✅ Verificar que se guarda correctamente en BD

---

### SUBFASE 3.3: Testing - Verificar Condiciones Funcionan

**Objetivo:** Testing completo de condiciones.

**Tests a realizar:**
1. **Test Manual:**
   - Crear secuencia con mensaje 2 con `condition_type = 'if_responded'`
   - Enviar mensaje 1
   - Verificar que mensaje 2 NO se envía (cliente no ha respondido)
   - Responder como cliente
   - Verificar que mensaje 2 SÍ se envía

2. **Test Manual:**
   - Crear secuencia con mensaje 2 con `condition_type = 'if_not_responded'`
   - Enviar mensaje 1
   - Verificar que mensaje 2 SÍ se envía (cliente no ha respondido)
   - Responder como cliente
   - Verificar que mensaje 2 NO se envía (cliente ya respondió)

---

## 🔧 FASE 4: Ramificaciones

### SUBFASE 4.1: Backend - Lógica de Ramificaciones

**Objetivo:** Modificar el motor de secuencias para soportar ramificaciones.

**Archivos a modificar:**
- `src/services/whatsapp/sequence-engine.js`
  - Modificar `getNextSequenceMessage()` para usar `next_message_if_true` y `next_message_if_false`
  - Agregar función `getNextMessageByCondition()`

**Lógica a implementar:**

```javascript
// En getNextSequenceMessage()
if (nextMessage.condition_type !== 'none') {
  const conditionResult = await evaluateCondition(contactId, nextMessage.condition_type);
  
  if (conditionResult && nextMessage.next_message_if_true) {
    // Ir al mensaje si condición es verdadera
    return getMessageById(sequence, nextMessage.next_message_if_true);
  } else if (!conditionResult && nextMessage.next_message_if_false) {
    // Ir al mensaje si condición es falsa
    return getMessageById(sequence, nextMessage.next_message_if_false);
  }
}
```

**Testing:**
- ✅ Test unitario: Ramificación con `if_responded` → `next_message_if_true`
- ✅ Test unitario: Ramificación con `if_not_responded` → `next_message_if_false`
- ✅ Test unitario: Sin ramificación (comportamiento actual)

---

### SUBFASE 4.2: Frontend - UI para Configurar Ramificaciones

**Objetivo:** Agregar selector de mensajes para ramificaciones.

**Archivos a modificar:**
- `src/components/whatsapp/SequenceMessageEditor.jsx`
  - Agregar selectores para `next_message_if_true` y `next_message_if_false`
  - Mostrar lista de mensajes disponibles en la secuencia

**UI a agregar:**
```jsx
{conditionType !== 'none' && (
  <>
    <label>Si condición es verdadera, ir a:</label>
    <select value={nextMessageIfTrue} onChange={handleNextMessageIfTrueChange}>
      <option value="">Continuar secuencia normal</option>
      {availableMessages.map(msg => (
        <option key={msg.id} value={msg.id}>
          Mensaje {msg.message_number}
        </option>
      ))}
    </select>
    
    <label>Si condición es falsa, ir a:</label>
    <select value={nextMessageIfFalse} onChange={handleNextMessageIfFalseChange}>
      <option value="">Continuar secuencia normal</option>
      {availableMessages.map(msg => (
        <option key={msg.id} value={msg.id}>
          Mensaje {msg.message_number}
        </option>
      ))}
    </select>
  </>
)}
```

**Testing:**
- ✅ Verificar que los selectores se muestran solo cuando hay condición
- ✅ Verificar que se guarda correctamente en BD

---

### SUBFASE 4.3: Testing - Verificar Ramificaciones Funcionan

**Objetivo:** Testing completo de ramificaciones.

**Tests a realizar:**
1. **Test Manual:**
   - Crear secuencia:
     - Mensaje 1: "Hola"
     - Mensaje 2: `condition_type = 'if_responded'`, `next_message_if_true = Mensaje 4`, `next_message_if_false = Mensaje 3`
     - Mensaje 3: "No respondiste"
     - Mensaje 4: "Gracias por responder"
   - Enviar mensaje 1
   - Responder como cliente
   - Verificar que se salta mensaje 3 y va directo a mensaje 4

2. **Test Manual:**
   - Misma secuencia
   - Enviar mensaje 1
   - NO responder como cliente
   - Verificar que va a mensaje 3 (no a mensaje 4)

---

## 🔧 FASE 5: Testing y Ajustes Finales

### SUBFASE 5.1: Testing de Integración Completo

**Objetivo:** Verificar que todas las funcionalidades trabajan juntas.

**Tests a realizar:**
1. **Test Completo:**
   - Secuencia con pausas inteligentes + condiciones + ramificaciones
   - Verificar que todo funciona correctamente

2. **Test de Compatibilidad:**
   - Verificar que secuencias existentes siguen funcionando
   - Verificar que no se rompe nada

---

### SUBFASE 5.2: Ajustes de UI/UX

**Objetivo:** Mejorar la experiencia de usuario.

**Mejoras:**
- Tooltips explicativos
- Validaciones en formularios
- Mensajes de error claros
- Indicadores visuales de pausas/condiciones

---

### SUBFASE 5.3: Documentación

**Objetivo:** Documentar las nuevas funcionalidades.

**Archivos a crear:**
- `GUIA_USO_AUTOMATIZACIONES.md`
- `GUIA_TECNICA_AUTOMATIZACIONES.md`

---

## ✅ Criterios de Éxito

### Por Subfase:
- ✅ Código funciona sin errores
- ✅ Tests pasan
- ✅ No se rompe funcionalidad existente
- ✅ UI es intuitiva

### Por Fase:
- ✅ Todas las subfases completadas
- ✅ Testing de integración pasa
- ✅ Documentación actualizada

---

## 🚀 Orden de Ejecución

1. **FASE 1** → Testing → ✅ Aprobación
2. **FASE 2** → Testing → ✅ Aprobación
3. **FASE 3** → Testing → ✅ Aprobación
4. **FASE 4** → Testing → ✅ Aprobación
5. **FASE 5** → Testing → ✅ Aprobación Final

---

## 📝 Notas Importantes

1. **Compatibilidad hacia atrás:**
   - Todos los campos nuevos tienen valores por defecto
   - Las secuencias existentes seguirán funcionando igual

2. **Migración futura a Opción B:**
   - Los campos nuevos se pueden usar directamente en el builder visual
   - No hay conflictos

3. **Testing después de cada subfase:**
   - Garantiza que no se rompe nada
   - Permite detectar problemas temprano

---

**Fecha:** 2025-01-30

