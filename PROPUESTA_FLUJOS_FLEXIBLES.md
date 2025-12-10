# 💡 Propuesta: Flujos Flexibles con Tipos de Pasos

## 🎯 Problema Actual

Actualmente, los flujos solo permiten crear **mensajes** con pausas integradas. Las pausas se crean como "mensajes especiales" con el texto "⏸️ Pausa", lo cual no es intuitivo y limita la flexibilidad.

---

## ✅ Objetivos del Usuario

1. ✅ Poder elegir el tipo de elemento al crear (Mensaje o Pausa)
2. ✅ Poder crear múltiples pausas consecutivas si se desea
3. ✅ Poder crear múltiples mensajes consecutivos si se desea
4. ✅ Poder agregar "Cambio de Etapa" como acción automática
5. ✅ Más control sobre la organización del flujo

---

## 🏗️ Propuesta: Sistema de "Pasos" en lugar de solo "Mensajes"

### **Concepto:**
En lugar de solo "mensajes", los flujos tendrán **"pasos"** que pueden ser de diferentes tipos:

#### **Tipos de Pasos Propuestos:**

1. **📨 Mensaje**
   - Texto
   - Imagen
   - Video
   - Audio
   - Documento
   - (Igual que ahora)

2. **⏸️ Pausa** (NUEVO - como elemento independiente)
   - Delay fijo (HH:MM)
   - Pausar hasta recibir mensaje
   - Pausar hasta X días sin respuesta
   - (Actualmente son "mensajes especiales")

3. **🔄 Cambiar Etapa** (NUEVO)
   - Seleccionar etapa destino
   - Ejecutar automáticamente cuando se llegue a este paso

---

## 📊 Estructura Propuesta

### **Opción 1: Extender Tabla Actual (RECOMENDADO)**

Mantener `whatsapp_sequence_messages` pero agregar campo `step_type`:

```sql
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN step_type VARCHAR(20) 
  CHECK (step_type IN ('message', 'pause', 'stage_change')) 
  DEFAULT 'message';
  
-- Para cambios de etapa
ADD COLUMN target_stage_name TEXT; -- Nombre de la etapa destino

-- Para pausas, ya tenemos:
-- delay_hours_from_previous
-- pause_type
-- days_without_response
```

**Ventajas:**
- ✅ No rompe estructura existente
- ✅ Compatible con código actual
- ✅ Migración simple

**Desventajas:**
- ⚠️ Algunos campos no aplican a todos los tipos

---

### **Opción 2: Tabla de Pasos Separada (Más limpio)**

Crear nueva tabla `whatsapp_sequence_steps`:

```sql
CREATE TABLE whatsapp_sequence_steps (
  id UUID PRIMARY KEY,
  sequence_id UUID REFERENCES whatsapp_sequences(id),
  step_type VARCHAR(20) CHECK (step_type IN ('message', 'pause', 'stage_change')),
  order_position INT NOT NULL,
  
  -- Para mensajes: referencia a mensaje existente o campos inline
  message_id UUID REFERENCES whatsapp_sequence_messages(id) NULL,
  
  -- Para pausas
  pause_delay_hours DECIMAL(10,2),
  pause_type VARCHAR(50),
  
  -- Para cambios de etapa
  target_stage_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ventajas:**
- ✅ Más limpio conceptualmente
- ✅ Cada tipo tiene solo sus campos

**Desventajas:**
- ⚠️ Requiere migración más compleja
- ⚠️ Más cambios en el código

---

## 🎨 Interfaz Propuesta

### **Al Crear/Editar Flujo:**

**Botón Principal:**
```
[+ Agregar Paso]
```

Al hacer clic, mostrar selector:
```
┌─────────────────────────┐
│  ¿Qué tipo de paso?     │
├─────────────────────────┤
│  📨 Mensaje             │
│  ⏸️ Pausa               │
│  🔄 Cambiar Etapa       │
└─────────────────────────┘
```

### **Vista del Flujo:**

```
┌─────────────────────────────────────┐
│  Flujo: Bienvenida Nuevos Leads     │
├─────────────────────────────────────┤
│                                     │
│  1. 📨 Mensaje: "Hola..."          │
│     └─ [Agregar Paso]              │
│                                     │
│  2. ⏸️ Pausa: 24:00 horas          │
│     └─ [Agregar Paso]              │
│                                     │
│  3. 📨 Mensaje: "Seguimiento..."   │
│     └─ [Agregar Paso]              │
│                                     │
│  4. ⏸️ Pausa: Hasta respuesta      │
│     └─ [Agregar Paso]              │
│                                     │
│  5. 📨 Mensaje: "Oferta..."        │
│     └─ [Agregar Paso]              │
│                                     │
│  6. 🔄 Cambiar Etapa: "Interesado" │
│     └─ [Agregar Paso]              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 Funcionalidades Detalladas

### **1. Pausa como Elemento Independiente**

**Configuración:**
- Tipo de pausa:
  - Delay fijo (HH:MM)
  - Esperar hasta recibir mensaje
  - Esperar hasta X días sin respuesta
- Visualización clara en la lista
- No requiere contenido de mensaje

### **2. Cambiar Etapa Automático**

**Configuración:**
- Selector de etapa destino (del pipeline del producto)
- Ejecuta automáticamente cuando el flujo llega a este paso
- Registra actividad en el lead

**Ejemplo de uso:**
```
Mensaje 1: "Hola, ¿estás interesado?"
Pausa: 24 horas
Mensaje 2: "¿Te gustaría agendar una llamada?"
Pausa: Hasta respuesta
Cambiar Etapa: "Interesado"  ← Se ejecuta automáticamente
Mensaje 3: "Perfecto, aquí tienes..."
```

### **3. Flexibilidad de Organización**

- ✅ Agregar múltiples pausas consecutivas:
  ```
  Pausa: 1 hora
  Pausa: 2 horas  ← Consecutiva
  Mensaje: "..."
  ```

- ✅ Agregar múltiples mensajes consecutivos:
  ```
  Mensaje: "Hola"
  Mensaje: "Cómo estás?"  ← Sin pausa entre ellos
  Pausa: 24 horas
  ```

---

## 🔧 Cambios Técnicos Propuestos

### **FASE 1: Extender Estructura**
1. Agregar campo `step_type` a `whatsapp_sequence_messages`
2. Agregar campo `target_stage_name` para cambios de etapa
3. Migración SQL

### **FASE 2: Actualizar UI - Creación**
1. Cambiar botón "Agregar Mensaje" → "Agregar Paso"
2. Modal selector de tipo de paso
3. Formularios específicos por tipo

### **FASE 3: Actualizar UI - Visualización**
1. Mostrar iconos distintos por tipo
2. Renderizar pausas y cambios de etapa claramente
3. Mantener reordenamiento

### **FASE 4: Lógica de Ejecución**
1. Motor de secuencias actualizado para manejar diferentes tipos
2. Implementar cambio automático de etapa
3. Testing completo

---

## 💭 Mejoras Adicionales Sugeridas

### **A. Validaciones Inteligentes:**
- Advertir si hay 5 pausas consecutivas (¿es intencional?)
- Advertir si no hay pausas entre muchos mensajes

### **B. Plantillas:**
- Plantillas comunes:
  - "Secuencia de bienvenida"
  - "Secuencia de seguimiento"
  - "Secuencia con cambio de etapa"

### **C. Vista de Flujo Visual:**
- Diagrama de flujo visual (futuro)
- Mostrar ramificaciones condicionales

---

## ❓ Preguntas para Centrar la Idea

1. **¿Prefieres Opción 1 (extender tabla) o Opción 2 (nueva tabla)?**
   - Recomendación: Opción 1 (más rápida y segura)

2. **¿Los cambios de etapa deben ser inmediatos o con delay?**
   - Ejemplo: ¿Cambiar etapa justo después de un mensaje o después de una pausa?

3. **¿Qué pasa si se cambia a una etapa que tiene otro flujo asignado?**
   - ¿Se inicia automáticamente?
   - ¿Se detiene el flujo actual?

4. **¿Las pausas consecutivas se suman o son independientes?**
   - Ejemplo: Pausa 1h + Pausa 2h = ¿3h total o 1h luego 2h?

---

## ✅ Recomendación Final

**Propuesta Centrada:**

1. ✅ **Opción 1**: Extender tabla actual con `step_type` y `target_stage_name`
2. ✅ **Cambio de etapa**: Ejecutar inmediatamente al llegar al paso
3. ✅ **Pausas consecutivas**: Se suman (1h + 2h = 3h total)
4. ✅ **Mensajes consecutivos**: Sin delay entre ellos (delay = 0)

**Ventajas:**
- ✅ Más rápido de implementar
- ✅ No rompe código existente
- ✅ Flexible para futuras mejoras
- ✅ Intuitivo para el usuario

---

**¿Te parece bien esta propuesta? ¿Quieres ajustar algo antes de implementar?**



