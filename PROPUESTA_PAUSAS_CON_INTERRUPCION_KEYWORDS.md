# 📋 Propuesta: Pausas con Interrupción por Palabras Clave

## 🎯 Objetivo

Agregar a las **pausas con delay fijo** (`fixed_delay`) la capacidad de:
1. **Interrumpir la pausa** si el cliente envía un mensaje con palabras clave
2. **Delay opcional** después de recibir el mensaje que interrumpe

---

## 🔍 Análisis Actual

### Estado Actual de Pausas:

1. **Tipos de pausas existentes:**
   - `fixed_delay` - Espera X horas antes de continuar
   - `until_message` - Espera hasta recibir cualquier mensaje
   - `until_days_without_response` - Espera X días sin respuesta

2. **Funcionalidades existentes:**
   - ✅ Verificación de keywords en mensajes (`checkMessageKeywords`)
   - ✅ Normalización de texto (sin tildes, minúsculas)
   - ✅ Verificación de mensajes después del último envío
   - ✅ Sistema de condiciones con keywords

### Lo que falta:
- ❌ Interrupción de pausas `fixed_delay` por keywords
- ❌ Delay opcional después de interrupción

---

## 💡 Propuesta de Solución

### FASE 1: Extensión de Base de Datos

**Archivo:** `supabase/migrations/027_add_pause_interrupt_keywords.sql`

**Cambios:**
1. Agregar campo `pause_interrupt_keywords` (JSONB) a `whatsapp_sequence_messages`
   - Solo para pausas tipo `fixed_delay`
   - Estructura: `{"keywords": ["palabra1", "palabra2"], "match_type": "any"}`
   
2. Agregar campo `pause_delay_after_interrupt` (DECIMAL) 
   - Delay opcional en horas después de recibir el mensaje que interrumpe
   - Solo aplica si `pause_interrupt_keywords` está configurado

**Estructura:**
```sql
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_interrupt_keywords JSONB DEFAULT NULL;

ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_delay_after_interrupt DECIMAL(10,2) DEFAULT NULL;

-- Restricción: Solo válido para pausas fixed_delay
-- (No agregamos CHECK constraint para no romper migración, validamos en backend)
```

---

### FASE 2: Actualizar Backend (sequence-engine.js)

**Modificar función `shouldSendNextMessage()`:**

**Lógica actual (fixed_delay):**
```javascript
// Espera X horas desde el último mensaje
if (hoursSinceLastMessage >= delayRequired) {
  return { shouldSend: true, ... }
}
```

**Lógica nueva (fixed_delay con interrupción):**
```javascript
// 1. Verificar si tiene keywords de interrupción
if (nextMessage.pause_interrupt_keywords) {
  // 2. Buscar mensajes del cliente después del último mensaje enviado
  const hasInterruptMessage = await checkMessageKeywords(
    contactId, 
    nextMessage.pause_interrupt_keywords,
    lastMessageTime
  );
  
  // 3. Si llegó mensaje con keywords, interrumpir la pausa
  if (hasInterruptMessage) {
    // 4. Si hay delay después de interrupción, aplicarlo
    if (nextMessage.pause_delay_after_interrupt > 0) {
      // Verificar si ya pasó el delay después del mensaje que interrumpió
      const { data: interruptMessage } = await getLastClientMessageAfter(contactId, lastMessageTime);
      const interruptTime = new Date(interruptMessage.timestamp);
      const hoursSinceInterrupt = (now - interruptTime) / (1000 * 60 * 60);
      
      if (hoursSinceInterrupt >= nextMessage.pause_delay_after_interrupt) {
        return { shouldSend: true, reason: 'interrupted_and_delay_passed' };
      } else {
        return { 
          shouldSend: false, 
          timeUntilSend: (nextMessage.pause_delay_after_interrupt - hoursSinceInterrupt) * 60,
          reason: 'waiting_delay_after_interrupt'
        };
      }
    }
    
    // Si no hay delay, enviar inmediatamente
    return { shouldSend: true, reason: 'interrupted_by_keywords' };
  }
}

// 5. Si no hay interrupción, comportamiento normal (esperar delay completo)
if (hoursSinceLastMessage >= delayRequired) {
  return { shouldSend: true, ... }
}
```

**Nueva función helper:**
```javascript
async function getLastClientMessageAfter(contactId, afterTime) {
  // Obtener último mensaje del cliente después de afterTime
  // Retornar mensaje o null
}
```

---

### FASE 3: Actualizar Frontend (PauseStepForm.jsx)

**Agregar sección opcional en el formulario:**

```jsx
{/* Interrupción por Keywords (Opcional) */}
{pauseType === 'fixed_delay' && (
  <div className="border-t border-neutral-800 pt-4">
    <div className="flex items-center justify-between mb-3">
      <label className="block text-sm font-medium text-neutral-300">
        Interrumpir pausa si llega mensaje con palabras clave
      </label>
      <input
        type="checkbox"
        checked={enableInterrupt}
        onChange={(e) => setEnableInterrupt(e.target.checked)}
      />
    </div>
    
    {enableInterrupt && (
      <div className="space-y-4 bg-neutral-800/50 rounded-lg p-4">
        {/* Campo de keywords */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Palabras clave (separadas por comas)
          </label>
          <input
            type="text"
            value={interruptKeywords.join(', ')}
            onChange={(e) => {
              const keywords = e.target.value
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
              setInterruptKeywords(keywords);
            }}
            placeholder="ej: si, acepto, perfecto, de acuerdo"
            className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Si el cliente envía un mensaje con alguna de estas palabras, la pausa se interrumpirá
          </p>
        </div>
        
        {/* Delay opcional después de interrupción */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Delay después de interrupción (HH:MM) - Opcional
          </label>
          <input
            type="text"
            value={delayAfterInterrupt}
            onChange={(e) => setDelayAfterInterrupt(e.target.value)}
            placeholder="00:00 (opcional)"
            className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Si se especifica, esperará este tiempo después de recibir el mensaje que interrumpe
          </p>
        </div>
      </div>
    )}
  </div>
)}
```

---

## 📊 Flujo Completo

### Escenario 1: Pausa con interrupción (sin delay después)

```
1. Pausa configurada: 24 horas + keywords: ["si", "acepto"]
2. Cliente envía mensaje con "si" después de 2 horas
3. ✅ Pausa se interrumpe inmediatamente
4. ✅ Se pasa al siguiente paso de la secuencia
```

### Escenario 2: Pausa con interrupción + delay después

```
1. Pausa configurada: 24 horas + keywords: ["si"] + delay después: 1 hora
2. Cliente envía mensaje con "si" después de 2 horas
3. ✅ Pausa se interrumpe (ya no espera las 24 horas)
4. ⏳ Espera 1 hora desde el mensaje que interrumpió
5. ✅ Después de 1 hora, pasa al siguiente paso
```

### Escenario 3: Sin interrupción (comportamiento normal)

```
1. Pausa configurada: 24 horas (sin keywords de interrupción)
2. Cliente envía mensaje después de 2 horas (pero no tiene keywords)
3. ⏳ Pausa continúa esperando las 24 horas completas
4. ✅ Después de 24 horas, pasa al siguiente paso
```

---

## 🗄️ Estructura de Datos

### Tabla: `whatsapp_sequence_messages`

**Nuevos campos:**
- `pause_interrupt_keywords` (JSONB, NULL)
  ```json
  {
    "keywords": ["si", "acepto", "perfecto"],
    "match_type": "any"  // "any" (OR) por defecto
  }
  ```
  
- `pause_delay_after_interrupt` (DECIMAL(10,2), NULL)
  - Ejemplo: `1.5` = 1 hora 30 minutos

**Validaciones:**
- Solo válido para `step_type = 'pause'` y `pause_type = 'fixed_delay'`
- Si `pause_interrupt_keywords` está presente, debe tener al menos 1 keyword
- `pause_delay_after_interrupt` debe ser >= 0 si está presente

---

## 🎨 UI/UX Propuesta

### Formulario de Pausa (PauseStepForm.jsx)

**Sección nueva:** "Interrupción por Palabras Clave" (colapsable/opcional)

```
┌─────────────────────────────────────────┐
│ Tipo de Pausa: Delay fijo               │
│ Tiempo de Pausa: 24:00                  │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ ☑ Interrumpir pausa si llega mensaje   │
│   con palabras clave                    │
│                                         │
│   Palabras clave:                       │
│   [si, acepto, perfecto        ]        │
│   ℹ️ Si el cliente envía un mensaje    │
│      con alguna de estas palabras,      │
│      la pausa se interrumpirá           │
│                                         │
│   Delay después de interrupción:        │
│   [01:00                      ]         │
│   ℹ️ Tiempo opcional a esperar después │
│      de recibir el mensaje que          │
│      interrumpe                          │
└─────────────────────────────────────────┘
```

---

## ✅ Ventajas de esta Solución

1. **No rompe funcionalidad existente**
   - Las pausas actuales siguen funcionando igual
   - Campos opcionales (NULL por defecto)

2. **Reutiliza código existente**
   - Usa `checkMessageKeywords()` que ya existe
   - Usa `normalizeText()` para búsqueda sin tildes
   - Mismo sistema de keywords que condiciones

3. **Flexible y potente**
   - Interrupción opcional (checkbox)
   - Delay después opcional
   - Compatible con múltiples keywords

4. **Consistente con el sistema**
   - Mismo formato JSONB que `condition_keywords`
   - Misma lógica de matching que condiciones

---

## 📋 Plan de Implementación

### FASE 1: Base de Datos
- [ ] Crear migración SQL
- [ ] Agregar campos a tabla
- [ ] Verificar migración

### FASE 2: Backend
- [ ] Agregar función `getLastClientMessageAfter()`
- [ ] Modificar `shouldSendNextMessage()` para verificar interrupción
- [ ] Agregar validaciones en `sequences.js`

### FASE 3: Frontend
- [ ] Agregar campos al formulario `PauseStepForm.jsx`
- [ ] Agregar estados para keywords y delay
- [ ] Actualizar `handleSubmit()` para enviar nuevos campos

### FASE 4: Testing
- [ ] Test: Pausa se interrumpe con keywords
- [ ] Test: Pausa con delay después de interrupción
- [ ] Test: Pausa sin interrupción funciona normal
- [ ] Test: Múltiples keywords (OR logic)

---

## ❓ Preguntas para Aclarar

1. **Alcance temporal de búsqueda:**
   - ¿Buscar solo mensajes después del último mensaje enviado? ✅ (igual que condiciones)
   - ¿O buscar desde el inicio de la pausa?

2. **Operador por defecto:**
   - ¿OR (any) o AND (all)? → Propongo **OR (any)** por defecto ✅

3. **Case sensitivity:**
   - ¿Ignorar mayúsculas y tildes? → Ya está implementado ✅

4. **Mensaje que interrumpe:**
   - ¿Solo el último mensaje o todos? → Propongo **solo el último** ✅

5. **Delay después de interrupción:**
   - ¿Es opcional o siempre requerido? → Propongo **opcional** ✅

6. **Visualización en UI:**
   - ¿Mostrar que la pausa fue interrumpida en logs? → Sí, útil para debugging

---

## 🔄 Comparación con Kommo

**Kommo tiene:**
- ✅ Pausas con múltiples condiciones (timer + mensaje)
- ✅ Interrupción por mensajes
- ✅ Temporizadores configurables

**Nuestra propuesta:**
- ✅ Pausa con delay fijo
- ✅ Interrupción opcional por keywords
- ✅ Delay opcional después de interrupción
- ✅ Reutiliza sistema de keywords existente

**Diferencia principal:**
- Kommo permite múltiples condiciones simultáneas (timer Y mensaje)
- Nuestra propuesta: Timer principal + interrupción opcional (más simple, más fácil de entender)

---

## ✅ Recomendación Final

**Implementar en 3 fases:**

1. **FASE 1:** Interrupción básica (sin delay después)
   - Más simple
   - Cubre caso de uso principal
   - Menos código

2. **FASE 2:** Agregar delay después de interrupción
   - Extensión natural
   - Más flexible

3. **FASE 3:** Refinamientos y testing
   - Mejorar UI/UX
   - Logs y visualización
   - Testing completo

---

¿Te parece bien esta propuesta? ¿Algún ajuste antes de implementar? 🚀


