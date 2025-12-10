# 📋 FASE 4: SECUENCIAS Y AUTOMATIZACIÓN - PLAN DETALLADO

**Fecha de inicio:** 2025-01-31  
**Duración estimada:** 4 días (14-17 según plan original)  
**Objetivo:** Implementar sistema completo de secuencias automáticas con decisión híbrida (Cloud API vs Puppeteer)

---

## 🎯 OBJETIVOS GENERALES

1. ✅ Permitir crear y configurar secuencias de mensajes flexibles
2. ✅ Automatizar envío de mensajes según timing configurado
3. ✅ Integrar decisión híbrida (Cloud API vs Puppeteer) en secuencias
4. ✅ Procesar secuencias automáticamente con cron jobs
5. ✅ Pausar secuencias cuando el cliente responde

---

## 📦 SUBFASE 4.1: CONFIGURADOR DE SECUENCIAS (UI)

**Duración estimada:** 1.5 días  
**Objetivo:** Crear interfaz completa para gestionar secuencias de mensajes

### Tareas:

1. **Servicio de Secuencias**
   - [ ] `src/services/whatsapp/sequences.js`
     - `getSequences(accountId)` - Obtener todas las secuencias
     - `getSequenceById(sequenceId)` - Obtener secuencia específica
     - `createSequence(data)` - Crear nueva secuencia
     - `updateSequence(sequenceId, data)` - Actualizar secuencia
     - `deleteSequence(sequenceId)` - Eliminar secuencia
     - `getSequenceMessages(sequenceId)` - Obtener mensajes de secuencia
     - `addSequenceMessage(sequenceId, messageData)` - Agregar mensaje
     - `updateSequenceMessage(messageId, data)` - Actualizar mensaje
     - `deleteSequenceMessage(messageId)` - Eliminar mensaje
     - `reorderSequenceMessages(sequenceId, newOrder)` - Reordenar mensajes

2. **Componente Configurador Principal**
   - [ ] `src/components/whatsapp/SequenceConfigurator.jsx`
     - Lista de secuencias (por cuenta)
     - Botón "Nueva Secuencia"
     - Modal/panel para crear/editar secuencia
     - Campos: nombre, descripción, cuenta asociada
     - Toggle activo/inactivo
     - Vista previa de mensajes

3. **Componente Editor de Mensajes**
   - [ ] `src/components/whatsapp/SequenceMessageEditor.jsx`
     - Lista de mensajes de la secuencia
     - Drag & drop para reordenar (usar `react-beautiful-dnd` o similar)
     - Botón "Agregar Mensaje"
     - Modal para editar cada mensaje:
       - Tipo de mensaje (text, image, video, audio, document)
       - Contenido (texto o selección de archivo)
       - Caption (para imágenes/videos)
       - Delay desde mensaje anterior (horas)
       - Validación de tamaños de media
     - Botón eliminar mensaje
     - Vista previa del mensaje

4. **Validaciones**
   - [ ] Validar que al menos hay 1 mensaje en la secuencia
   - [ ] Validar tamaños de media (imagen max 300KB, video max 10MB)
   - [ ] Validar que los delays son números positivos
   - [ ] Validar que los message_number son únicos y secuenciales

5. **Integración en UI**
   - [ ] Agregar vista "Secuencias" en menú WhatsApp
   - [ ] Integrar en `App.jsx`

### Archivos a crear:
- `src/services/whatsapp/sequences.js`
- `src/components/whatsapp/SequenceConfigurator.jsx`
- `src/components/whatsapp/SequenceMessageEditor.jsx`
- `src/components/whatsapp/SequenceMessageForm.jsx` (formulario individual)

### Testing SUBFASE 4.1:
- [ ] Tests unitarios para `sequences.js` (CRUD completo)
- [ ] Tests de componentes (renderizado, interacciones)
- [ ] Test manual: crear secuencia, agregar mensajes, reordenar, eliminar
- [ ] Verificar que se guarda correctamente en BD
- [ ] Verificar validaciones funcionan

---

## ⚙️ SUBFASE 4.2: MOTOR DE SECUENCIAS CON DECISIÓN HÍBRIDA

**Duración estimada:** 1.5 días  
**Objetivo:** Implementar lógica de evaluación y envío automático con decisión híbrida

### Tareas:

1. **Motor de Evaluación**
   - [ ] `src/services/whatsapp/sequence-engine.js`
     - `evaluateSequences(accountId)` - Evaluar todas las secuencias activas
     - `evaluateContactSequence(contactId)` - Evaluar secuencia de un contacto
     - `shouldSendNextMessage(contactId)` - Verificar si es momento de enviar
     - `calculateNextMessageTime(contactId)` - Calcular cuándo enviar siguiente
     - `getNextSequenceMessage(contactId)` - Obtener siguiente mensaje a enviar

2. **Integración con Decisión Híbrida**
   - [ ] `src/services/whatsapp/sequence-decision.js`
     - `processSequenceMessage(contactId, messageData)` - Procesar mensaje de secuencia
     - Integrar `decideSendMethod()` de `send-decision.js`
     - Si Cloud API → enviar directamente via `cloud-api-sender.js`
     - Si Puppeteer → agregar a `puppeteer_queue` via función SQL
     - Actualizar contadores en `whatsapp_contacts`
     - Actualizar `sequence_position` del contacto
     - Guardar mensaje en `whatsapp_messages`

3. **Detección de Respuestas**
   - [ ] `src/services/whatsapp/sequence-pauser.js`
     - `checkClientResponse(contactId)` - Verificar si cliente respondió
     - `pauseSequence(contactId)` - Pausar secuencia si cliente respondió
     - Integrar en webhook (ya existe en `whatsapp-webhook/index.ts`)

4. **Actualización de Posición**
   - [ ] Función para avanzar `sequence_position` después de enviar
   - Función para marcar secuencia como completada
   - Función para resetear secuencia si es necesario

### Archivos a crear:
- `src/services/whatsapp/sequence-engine.js`
- `src/services/whatsapp/sequence-decision.js`
- `src/services/whatsapp/sequence-pauser.js`

### Archivos a modificar:
- `supabase/functions/whatsapp-webhook/index.ts` (agregar lógica de pausa)

### Testing SUBFASE 4.2:
- [ ] Tests unitarios para `sequence-engine.js`
- [ ] Tests unitarios para `sequence-decision.js`
- [ ] Tests de integración: evaluar secuencia, decidir método, enviar
- [ ] Test manual: crear contacto con secuencia, verificar que evalúa correctamente
- [ ] Test manual: verificar que pausa cuando cliente responde
- [ ] Verificar que actualiza posición correctamente

---

## ⏰ SUBFASE 4.3: CRON JOBS PARA PROCESAMIENTO AUTOMÁTICO

**Duración estimada:** 1 día  
**Objetivo:** Implementar Edge Function que procese secuencias automáticamente cada hora

### Tareas:

1. **Edge Function de Procesamiento**
   - [ ] `supabase/functions/process-sequences/index.ts`
     - Obtener todos los contactos con secuencias activas
     - Para cada contacto, evaluar si debe enviarse siguiente mensaje
     - Integrar `decideSendMethod()` para decidir método
     - Enviar via Cloud API o agregar a Puppeteer
     - Actualizar estados y contadores
     - Logging detallado

2. **Configuración de Cron**
   - [ ] Configurar Supabase Cron (pg_cron) o Vercel Cron
   - [ ] Ejecutar cada 1 hora
   - [ ] Manejo de errores y reintentos
   - [ ] Notificaciones si falla múltiples veces

3. **Monitoreo y Logs**
   - [ ] Agregar logs estructurados
   - [ ] Métricas de procesamiento (cuántos mensajes enviados, errores, etc.)
   - [ ] Dashboard opcional para ver estado del cron

### Archivos a crear:
- `supabase/functions/process-sequences/index.ts`
- `supabase/functions/process-sequences/README.md`

### Archivos a modificar:
- `supabase/migrations/006_process_sequences_cron.sql` (si usamos pg_cron)

### Testing SUBFASE 4.3:
- [ ] Test manual: ejecutar Edge Function manualmente
- [ ] Verificar que procesa contactos correctamente
- [ ] Verificar que decide método correcto (Cloud API vs Puppeteer)
- [ ] Verificar que actualiza BD correctamente
- [ ] Test de cron: verificar que se ejecuta cada hora
- [ ] Test de errores: verificar manejo de errores

---

## 📊 TESTING FINAL FASE 4

### Tests de Integración Completa:
- [ ] Crear secuencia con 3 mensajes
- [ ] Asignar secuencia a contacto
- [ ] Verificar que cron procesa y envía mensajes
- [ ] Verificar que decide método correcto según ventana
- [ ] Verificar que pausa cuando cliente responde
- [ ] Verificar que actualiza posición correctamente

### Tests de Rendimiento:
- [ ] Verificar que procesa 100+ contactos en < 30 segundos
- [ ] Verificar que no hay memory leaks
- [ ] Verificar que cron no se ejecuta múltiples veces simultáneamente

### Tests de Edge Cases:
- [ ] Contacto sin secuencia asignada
- [ ] Secuencia desactivada
- [ ] Contacto bloqueado
- [ ] Ventana cerrada (debe usar Puppeteer)
- [ ] Free Entry Point activo (debe usar Cloud API)
- [ ] Cliente responde durante secuencia

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Puedo crear secuencias con múltiples mensajes
2. ✅ Puedo reordenar mensajes con drag & drop
3. ✅ El sistema evalúa automáticamente cuándo enviar cada mensaje
4. ✅ El sistema decide correctamente entre Cloud API y Puppeteer
5. ✅ Los mensajes se envían automáticamente según timing
6. ✅ Las secuencias se pausan cuando el cliente responde
7. ✅ El cron procesa secuencias cada hora sin errores

---

## 📝 NOTAS IMPORTANTES

- **Dependencias:** Necesitamos `decideSendMethod()` de FASE 2 (ya implementado ✅)
- **Base de datos:** Las tablas `whatsapp_sequences` y `whatsapp_sequence_messages` ya existen ✅
- **Integración:** Reutilizar `cloud-api-sender.js` y funciones SQL de `puppeteer_queue` ✅

---

**¿Listo para comenzar con SUBFASE 4.1?** 🚀


