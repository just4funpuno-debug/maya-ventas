# 🛡️ FASE 5: DETECCIÓN Y GESTIÓN - Plan Detallado

**Objetivo:** Implementar panel de cola Puppeteer, detección automática de bloqueos y gestión de contactos bloqueados.

**Duración estimada:** 3 días (18-20)

---

## 📋 SUBFASE 5.1: Panel de Cola Puppeteer

**Objetivo:** Crear UI para visualizar y gestionar la cola de mensajes de Puppeteer.

**Tiempo estimado:** 4-6 horas

### Tareas:

1. **Servicio para obtener cola Puppeteer:**
   - [ ] Crear `src/services/whatsapp/puppeteer-queue.js`
   - [ ] Función `getQueueMessages()` - Obtener mensajes de la cola
   - [ ] Función `getQueueStats()` - Estadísticas de la cola
   - [ ] Función `pauseQueue()` - Pausar procesamiento (emergencia)
   - [ ] Función `resumeQueue()` - Reanudar procesamiento
   - [ ] Función `removeFromQueue()` - Eliminar mensaje de la cola
   - [ ] Función `subscribeQueue()` - Suscripción Realtime

2. **Componente Panel de Cola:**
   - [ ] Crear `src/components/whatsapp/PuppeteerQueuePanel.jsx`
   - [ ] Lista de mensajes en cola (tabla o cards)
   - [ ] Mostrar: contacto, mensaje, tipo, status, prioridad, fecha
   - [ ] Filtros: status (pending, processing, sent, failed), prioridad, tipo
   - [ ] Búsqueda por nombre de contacto o teléfono
   - [ ] Paginación

3. **Componente Card de Mensaje:**
   - [ ] Crear `src/components/whatsapp/QueueMessageCard.jsx`
   - [ ] Mostrar información del mensaje
   - [ ] Botones de acción: eliminar, reintentar
   - [ ] Indicador de status visual
   - [ ] Badge de prioridad

4. **Log de Últimos Envíos:**
   - [ ] Sección de log en el panel
   - [ ] Mostrar últimos 100 envíos
   - [ ] Filtros por status y fecha
   - [ ] Detalles de cada envío

5. **Botón Pausar Bot (Emergencia):**
   - [ ] Toggle para pausar/reanudar bot
   - [ ] Confirmación antes de pausar
   - [ ] Indicador visual del estado
   - [ ] Guardar estado en BD (tabla `puppeteer_config` o similar)

6. **Integración en App.jsx:**
   - [ ] Agregar menú "Cola Puppeteer"
   - [ ] Integrar componente en vista
   - [ ] Solo visible para admin

### Archivos a crear:

- `src/services/whatsapp/puppeteer-queue.js`
- `src/components/whatsapp/PuppeteerQueuePanel.jsx`
- `src/components/whatsapp/QueueMessageCard.jsx`

### Testing:

- [ ] Tests unitarios para `puppeteer-queue.js`
- [ ] Test manual del panel completo
- [ ] Verificar filtros y búsqueda
- [ ] Verificar pausar/reanudar bot

---

## 📋 SUBFASE 5.2: Detección Automática de Bloqueos

**Objetivo:** Implementar sistema que detecte automáticamente cuando un contacto bloquea el número.

**Tiempo estimado:** 4-6 horas

### Tareas:

1. **Servicio de Detección:**
   - [ ] Crear `src/services/whatsapp/block-detector.js`
   - [ ] Función `checkMessageStatus()` - Verificar status de mensajes
   - [ ] Función `detectBlockedContact()` - Detectar si contacto está bloqueado
   - [ ] Función `updateBlockStatus()` - Actualizar estado de bloqueo
   - [ ] Función `calculateBlockProbability()` - Calcular probabilidad

2. **Lógica de Detección:**
   - [ ] Monitorear mensajes en status "sent" por 72h+
   - [ ] Contar mensajes consecutivos sin entregar (consecutive_undelivered)
   - [ ] Calcular probabilidad de bloqueo (0-100%)
   - [ ] Marcar como bloqueado si umbral > 80%
   - [ ] Pausar secuencias automáticamente si está bloqueado

3. **Edge Function para Detección:**
   - [ ] Crear `supabase/functions/detect-blocks/index.ts`
   - [ ] Obtener mensajes "sent" con más de 72h
   - [ ] Verificar status en WhatsApp Cloud API
   - [ ] Actualizar `consecutive_undelivered` y `block_probability`
   - [ ] Marcar como bloqueado si corresponde
   - [ ] Pausar secuencias de contactos bloqueados

4. **Cron Job para Detección:**
   - [ ] Configurar cron job (cada 6 horas)
   - [ ] Ejecutar Edge Function `detect-blocks`
   - [ ] Logging de resultados

5. **Actualización de Schema (si necesario):**
   - [ ] Verificar que `whatsapp_contacts` tiene columnas necesarias
   - [ ] `consecutive_undelivered`, `block_probability`, `is_blocked`
   - [ ] Agregar índices si faltan

### Archivos a crear:

- `src/services/whatsapp/block-detector.js`
- `supabase/functions/detect-blocks/index.ts`
- `supabase/functions/detect-blocks/README.md`

### Testing:

- [ ] Tests unitarios para `block-detector.js`
- [ ] Test manual de Edge Function
- [ ] Verificar detección con mensajes de prueba
- [ ] Verificar pausa automática de secuencias

---

## 📋 SUBFASE 5.3: Panel de Posibles Bloqueos

**Objetivo:** Crear UI para visualizar y gestionar contactos con problemas de entrega.

**Tiempo estimado:** 3-4 horas

### Tareas:

1. **Servicio para Obtener Bloqueados:**
   - [ ] Extender `block-detector.js` o crear nuevo servicio
   - [ ] Función `getBlockedContacts()` - Obtener contactos bloqueados
   - [ ] Función `getSuspiciousContacts()` - Obtener contactos sospechosos
   - [ ] Función `reactivateContact()` - Reactivar contacto
   - [ ] Función `addBlockNote()` - Agregar nota al contacto

2. **Componente Panel de Bloqueados:**
   - [ ] Crear `src/components/whatsapp/BlockedContacts.jsx`
   - [ ] Lista de contactos bloqueados
   - [ ] Lista de contactos sospechosos (probabilidad 50-80%)
   - [ ] Mostrar métricas: probabilidad, mensajes consecutivos, última entrega
   - [ ] Gráfica de tasa de bloqueo (opcional)

3. **Acciones por Contacto:**
   - [ ] Botón "Reactivar" - Marcar como no bloqueado
   - [ ] Botón "Eliminar" - Eliminar contacto
   - [ ] Botón "Agregar Nota" - Agregar nota personalizada
   - [ ] Modal de confirmación para acciones

4. **Estadísticas:**
   - [ ] Tasa de bloqueo total
   - [ ] Contactos bloqueados vs activos
   - [ ] Gráfica de bloqueos por fecha
   - [ ] Métricas de entrega

5. **Integración en App.jsx:**
   - [ ] Agregar menú "Contactos Bloqueados"
   - [ ] Integrar componente en vista
   - [ ] Solo visible para admin

### Archivos a crear:

- `src/components/whatsapp/BlockedContacts.jsx`
- `src/components/whatsapp/BlockedContactCard.jsx` (opcional)

### Testing:

- [ ] Tests unitarios para funciones de bloqueo
- [ ] Test manual del panel completo
- [ ] Verificar acciones (reactivar, eliminar, nota)
- [ ] Verificar estadísticas

---

## 📋 SUBFASE 5.4: Testing y Documentación

**Objetivo:** Completar testing exhaustivo y documentación de FASE 5.

**Tiempo estimado:** 2-3 horas

### Tareas:

1. **Testing Completo:**
   - [ ] Ejecutar todos los tests unitarios
   - [ ] Test manual de cada funcionalidad
   - [ ] Test de integración (panel + detección + gestión)
   - [ ] Verificar Edge Functions
   - [ ] Verificar Cron Jobs

2. **Documentación:**
   - [ ] Documentar cada subfase completada
   - [ ] Crear guía de uso del panel de cola
   - [ ] Crear guía de detección de bloqueos
   - [ ] Documentar Edge Functions
   - [ ] Actualizar README principal

3. **Verificación Final:**
   - [ ] Verificar que no se rompió código existente
   - [ ] Verificar performance
   - [ ] Verificar UI/UX
   - [ ] Checklist de completitud

### Archivos a crear:

- `FASE_5_SUBFASE_5.1_COMPLETADA.md`
- `FASE_5_SUBFASE_5.2_COMPLETADA.md`
- `FASE_5_SUBFASE_5.3_COMPLETADA.md`
- `FASE_5_COMPLETADA.md`
- `GUIA_USO_PANEL_COLA.md`
- `GUIA_DETECCION_BLOQUEOS.md`

---

## ✅ Criterios de Éxito FASE 5

1. **Panel de Cola:**
   - ✅ Visualizar todos los mensajes en cola
   - ✅ Filtrar y buscar mensajes
   - ✅ Pausar/reanudar bot
   - ✅ Ver log de últimos envíos

2. **Detección de Bloqueos:**
   - ✅ Detectar contactos bloqueados automáticamente
   - ✅ Calcular probabilidad de bloqueo
   - ✅ Pausar secuencias automáticamente
   - ✅ Ejecutar cada 6 horas

3. **Panel de Bloqueados:**
   - ✅ Visualizar contactos bloqueados y sospechosos
   - ✅ Reactivar contactos
   - ✅ Ver estadísticas de bloqueo

4. **Testing:**
   - ✅ 100% de tests pasando
   - ✅ Documentación completa
   - ✅ Sin errores en consola

---

## 🚀 Empezamos con SUBFASE 5.1

¿Listo para comenzar con el Panel de Cola Puppeteer?
