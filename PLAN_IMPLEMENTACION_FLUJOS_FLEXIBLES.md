# 🚀 Plan de Implementación: Flujos Flexibles

## ✅ Confirmaciones Recibidas

1. ✅ **Pausas consecutivas**: Se suman (1h + 2h = 3h total)
2. ✅ **Cambio de etapa**: Inmediato al llegar al paso
3. ✅ **Cambio a etapa con flujo**: Detener flujo actual e iniciar nuevo automáticamente
4. ✅ **Estructura técnica**: Opción 1 - Extender tabla actual

---

## 📋 Plan por Fases

### **FASE 1: Extender Estructura de Base de Datos**
**Objetivo:** Agregar campos necesarios para soportar pausas y cambios de etapa

**Tareas:**
1. Crear migración SQL para agregar campos:
   - `step_type` VARCHAR(20) con CHECK constraint
   - `target_stage_name` TEXT (para cambios de etapa)
2. Actualizar registros existentes: `step_type = 'message'` (todos los actuales)
3. Actualizar constraint de `message_type` para permitir NULL en pausas/cambios de etapa
4. Testing: Verificar que migración funciona, datos existentes intactos

**Archivos:**
- `supabase/migrations/020_add_flexible_flow_steps.sql`

**Testing:**
- Verificar que tabla se actualiza correctamente
- Verificar que flujos existentes siguen funcionando
- Verificar que nuevos campos aceptan valores correctos

---

### **FASE 2: Actualizar UI - Selector de Tipo de Paso**
**Objetivo:** Cambiar "Agregar Mensaje" a "Agregar Paso" con selector

**Tareas:**
1. Cambiar botón "Agregar Mensaje" → "Agregar Paso" en `SequenceMessageEditor.jsx`
2. Crear modal selector de tipo de paso (`StepTypeSelector.jsx`)
3. Integrar selector en flujo de creación
4. Testing: Verificar que selector aparece y permite elegir tipo

**Archivos:**
- `src/components/whatsapp/SequenceMessageEditor.jsx`
- `src/components/whatsapp/StepTypeSelector.jsx` (nuevo)

**Testing:**
- Verificar que selector muestra 3 opciones (Mensaje, Pausa, Cambiar Etapa)
- Verificar que al elegir tipo se abre formulario correcto

---

### **FASE 3: Formulario de Pausa Independiente**
**Objetivo:** Crear formulario específico para pausas (sin contenido de mensaje)

**Tareas:**
1. Crear componente `PauseStepForm.jsx`
2. Formulario con opciones:
   - Tipo de pausa (fixed_delay, until_message, until_days_without_response)
   - Delay en formato HH:MM (para fixed_delay)
   - Días sin respuesta (para until_days_without_response)
3. Integrar en flujo de creación
4. Testing: Verificar que se crean pausas correctamente

**Archivos:**
- `src/components/whatsapp/PauseStepForm.jsx` (nuevo)
- `src/services/whatsapp/sequences.js` (actualizar `addSequenceMessage`)

**Testing:**
- Verificar que pausas se guardan con `step_type = 'pause'`
- Verificar que campos de mensaje quedan NULL en pausas
- Verificar validaciones (delay requerido, etc.)

---

### **FASE 4: Formulario de Cambio de Etapa**
**Objetivo:** Crear formulario para configurar cambio automático de etapa

**Tareas:**
1. Crear componente `StageChangeStepForm.jsx`
2. Formulario con:
   - Selector de etapa destino (del pipeline del producto)
   - Información de qué flujo se iniciará (si la etapa tiene uno)
3. Obtener etapas disponibles del pipeline del producto
4. Integrar en flujo de creación
5. Testing: Verificar que se crean cambios de etapa correctamente

**Archivos:**
- `src/components/whatsapp/StageChangeStepForm.jsx` (nuevo)
- `src/services/whatsapp/sequences.js` (actualizar `addSequenceMessage`)
- `src/services/whatsapp/pipelines.js` (función para obtener etapas)

**Testing:**
- Verificar que cambios de etapa se guardan con `step_type = 'stage_change'`
- Verificar que `target_stage_name` se guarda correctamente
- Verificar que solo muestra etapas del producto del flujo

---

### **FASE 5: Actualizar Visualización de Pasos**
**Objetivo:** Mostrar iconos y estilos distintos para cada tipo de paso

**Tareas:**
1. Actualizar `SequenceMessageEditor.jsx` para mostrar diferentes iconos:
   - 📨 Mensaje
   - ⏸️ Pausa
   - 🔄 Cambiar Etapa
2. Estilos visuales distintos para cada tipo
3. Mostrar información específica por tipo:
   - Pausa: mostrar delay/tipo de pausa
   - Cambio de Etapa: mostrar nombre de etapa destino
4. Testing: Verificar que visualización es clara y correcta

**Archivos:**
- `src/components/whatsapp/SequenceMessageEditor.jsx`

**Testing:**
- Verificar que cada tipo muestra su icono correcto
- Verificar que información se muestra correctamente
- Verificar que reordenamiento funciona con todos los tipos

---

### **FASE 6: Lógica de Ejecución - Pausas Consecutivas**
**Objetivo:** Implementar suma de pausas consecutivas en el motor de secuencias

**Tareas:**
1. Actualizar `sequence-engine.js` para:
   - Detectar pausas consecutivas
   - Sumar sus delays (1h + 2h = 3h total)
   - Aplicar delay total antes de siguiente paso
2. Actualizar `shouldSendNextMessage` para manejar pausas como pasos
3. Testing: Verificar que pausas consecutivas se suman correctamente

**Archivos:**
- `src/services/whatsapp/sequence-engine.js`

**Testing:**
- Verificar que Pausa 1h + Pausa 2h = 3h total
- Verificar que se aplica correctamente en ejecución
- Verificar que pausas independientes funcionan bien

---

### **FASE 7: Lógica de Ejecución - Cambio de Etapa Automático**
**Objetivo:** Implementar cambio automático de etapa cuando se ejecuta el paso

**Tareas:**
1. Actualizar `sequence-engine.js` para detectar pasos tipo `stage_change`
2. Al ejecutar paso `stage_change`:
   - Llamar a `moveLeadToStage()` con etapa destino
   - Detener flujo actual
   - Si etapa destino tiene flujo, iniciarlo automáticamente
3. Registrar actividad en el lead
4. Testing: Verificar que cambio de etapa funciona correctamente

**Archivos:**
- `src/services/whatsapp/sequence-engine.js`
- `src/services/whatsapp/leads.js` (ya tiene `moveLeadToStage`)

**Testing:**
- Verificar que etapa se cambia automáticamente
- Verificar que flujo actual se detiene
- Verificar que nuevo flujo se inicia si etapa tiene uno
- Verificar que se registra actividad correctamente

---

### **FASE 8: Actualizar Servicios y Validaciones**
**Objetivo:** Asegurar que todos los servicios manejan correctamente los nuevos tipos

**Tareas:**
1. Actualizar `sequences.js`:
   - Validar `step_type` al crear paso
   - Validar campos según tipo de paso
   - Permitir NULL en campos de mensaje para pausas/cambios de etapa
2. Actualizar funciones de actualización/eliminación
3. Testing: Verificar validaciones y errores apropiados

**Archivos:**
- `src/services/whatsapp/sequences.js`

**Testing:**
- Verificar validaciones correctas por tipo
- Verificar errores descriptivos
- Verificar que no se permite tipo inválido

---

### **FASE 9: Migración de Pausas Existentes (Opcional)**
**Objetivo:** Convertir pausas existentes (mensajes especiales "⏸️ Pausa") a pasos tipo 'pause'

**Tareas:**
1. Crear script SQL para identificar pausas existentes
2. Actualizar registros: `step_type = 'pause'` y limpiar campos de mensaje
3. Testing: Verificar que pausas existentes se convierten correctamente

**Archivos:**
- `supabase/migrations/021_migrate_existing_pauses.sql` (opcional)

**Testing:**
- Verificar que pausas existentes se identifican correctamente
- Verificar que conversión mantiene delays
- Verificar que no se rompen flujos existentes

---

### **FASE 10: Testing Completo y Verificación Final**
**Objetivo:** Testing end-to-end de todas las funcionalidades

**Tareas:**
1. Crear flujo de prueba con todos los tipos de pasos
2. Verificar ejecución completa del flujo
3. Verificar pausas consecutivas
4. Verificar cambio de etapa automático
5. Verificar que flujo nuevo se inicia después de cambio de etapa
6. Testing de casos límite y errores

**Testing:**
- Flujo completo con todos los tipos
- Pausas consecutivas
- Cambio de etapa
- Inicio de nuevo flujo
- Casos de error

---

## 📊 Resumen de Fases

| Fase | Descripción | Tiempo Estimado | Testing |
|------|-------------|-----------------|---------|
| **1** | Base de datos | 30 min | ✅ |
| **2** | Selector de tipo | 1 hora | ✅ |
| **3** | Formulario pausa | 1.5 horas | ✅ |
| **4** | Formulario cambio etapa | 2 horas | ✅ |
| **5** | Visualización | 1 hora | ✅ |
| **6** | Lógica pausas consecutivas | 1.5 horas | ✅ |
| **7** | Lógica cambio etapa | 2 horas | ✅ |
| **8** | Servicios y validaciones | 1 hora | ✅ |
| **9** | Migración existentes (opcional) | 30 min | ✅ |
| **10** | Testing completo | 1 hora | ✅ |

**Tiempo Total Estimado:** ~12 horas

---

## ✅ Criterios de Éxito

1. ✅ Puedes crear flujos con mensajes, pausas y cambios de etapa
2. ✅ Las pausas consecutivas se suman correctamente
3. ✅ El cambio de etapa se ejecuta automáticamente
4. ✅ Si la etapa tiene flujo, se detiene el actual y se inicia el nuevo
5. ✅ Todo el código existente sigue funcionando
6. ✅ No se rompen flujos ya creados

---

## 🎯 ¿Comenzamos con FASE 1?

**¿Estás de acuerdo con este plan? ¿Quieres ajustar algo antes de empezar?**



