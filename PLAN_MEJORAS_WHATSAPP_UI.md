# Plan de Mejoras para Interfaz WhatsApp Web
## Análisis y Fases de Implementación

### 📋 Resumen Ejecutivo

Este documento detalla el plan de implementación para mejorar la interfaz del chat WhatsApp para que se parezca más a WhatsApp Web, manteniendo los colores actuales del proyecto (`#e7922b` para mensajes enviados, `bg-neutral-800` para recibidos).

**Objetivo:** Mejorar la experiencia de usuario y funcionalidad del chat WhatsApp sin romper el código existente.

**Duración estimada:** 5-7 días de desarrollo

---

## 🎯 Funcionalidades a Implementar

### ✅ Excluidas (por decisión del usuario)
- ❌ Cambio de colores (mantener colores actuales)

### ✅ Incluidas (a implementar)

#### **ALTA PRIORIDAD**
1. **Separadores de fecha en el chat** (Hoy, Ayer, fecha específica)
2. **Fondo con patrón sutil** en el área de mensajes
3. **Agrupación de mensajes consecutivos** del mismo remitente
4. **Mejora de timestamps** (más legibles)

#### **MEDIA PRIORIDAD**
5. **Estado online/última vez visto** en header y lista
6. **Foto de perfil** en avatares (con fallback a iniciales)
7. **Indicador "escribiendo..."** en tiempo real
8. **Menú de opciones funcional** en header del chat

#### **BAJA PRIORIDAD**
9. **Emoji picker** en input de mensaje
10. **Respuesta a mensajes** (reply)
11. **Reenvío de mensajes**
12. **Eliminar mensaje** (con confirmación)
13. **Fijar conversaciones** en la lista
14. **Archivar conversaciones**

---

## 📊 Análisis de Esquema Actual

### Tablas Existentes

#### `whatsapp_contacts`
- ✅ `id`, `name`, `phone`
- ✅ `last_interaction_at`, `last_interaction_source`
- ✅ `window_expires_at`
- ✅ `profile_pic_url` (YA EXISTE - solo cambiar nombre en migración)
- ❌ `is_online` (FALTA)
- ❌ `last_seen_at` (FALTA)
- ❌ `is_pinned` (FALTA)
- ❌ `is_archived` (FALTA)

#### `whatsapp_messages`
- ✅ `id`, `contact_id`, `account_id`
- ✅ `message_type`, `content_text`, `media_url`
- ✅ `is_from_me`, `status`, `timestamp`
- ✅ `caption`, `media_filename`
- ❌ `reply_to_message_id` (FALTA - para respuestas)
- ❌ `is_deleted` (FALTA - para soft delete)
- ❌ `deleted_at` (FALTA)

---

## 🗂️ Fases de Implementación

### **FASE 1: Mejoras Visuales Básicas** (2 días)
**Objetivo:** Mejorar la apariencia visual sin cambios en la base de datos

#### SUBFASE 1.1: Separadores de Fecha (4 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx`
  - `src/utils/whatsapp/date-formatters.js` (nuevo)
- **Funcionalidad:**
  - Agrupar mensajes por fecha
  - Mostrar "Hoy", "Ayer", o fecha específica
  - Separador visual entre grupos
- **Testing:**
  - Verificar que los separadores aparecen correctamente
  - Verificar formato de fechas en español
  - Verificar que funciona con mensajes en tiempo real

#### SUBFASE 1.2: Fondo con Patrón (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx`
  - `public/whatsapp-pattern.svg` (nuevo - opcional)
- **Funcionalidad:**
  - Agregar fondo beige/gris claro con patrón sutil
  - Mantener contraste con burbujas de mensaje
- **Testing:**
  - Verificar que el patrón no interfiere con la legibilidad
  - Verificar en modo claro/oscuro (si aplica)

#### SUBFASE 1.3: Agrupación de Mensajes (4 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageBubble.jsx`
  - `src/utils/whatsapp/message-grouping.js` (nuevo)
- **Funcionalidad:**
  - Agrupar mensajes consecutivos del mismo remitente
  - Mostrar timestamp solo en el último mensaje del grupo
  - Reducir espaciado entre mensajes agrupados
- **Testing:**
  - Verificar agrupación correcta
  - Verificar que los timestamps aparecen solo donde corresponde
  - Verificar que funciona con mensajes en tiempo real

#### SUBFASE 1.4: Mejora de Timestamps (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageBubble.jsx`
- **Funcionalidad:**
  - Aumentar tamaño de fuente de timestamps
  - Mejorar contraste
  - Formato más legible
- **Testing:**
  - Verificar legibilidad en diferentes tamaños de pantalla

---

### **FASE 2: Funcionalidades de Estado** (2 días)
**Objetivo:** Agregar información de estado del contacto

#### SUBFASE 2.1: Migración de Base de Datos (2 horas)
- **Archivos a crear:**
  - `supabase/migrations/007_whatsapp_ui_improvements.sql`
- **Cambios en BD:**
  ```sql
  -- Agregar columnas a whatsapp_contacts
  -- Nota: profile_pic_url ya existe, solo agregamos las demás
  ALTER TABLE whatsapp_contacts 
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
  
  -- Agregar columnas a whatsapp_messages
  ALTER TABLE whatsapp_messages
    ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES whatsapp_messages(id),
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  
  -- Índices
  CREATE INDEX IF NOT EXISTS idx_contacts_pinned ON whatsapp_contacts(is_pinned) WHERE is_pinned = TRUE;
  CREATE INDEX IF NOT EXISTS idx_contacts_archived ON whatsapp_contacts(is_archived) WHERE is_archived = FALSE;
  CREATE INDEX IF NOT EXISTS idx_messages_reply ON whatsapp_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
  ```
- **Testing:**
  - Ejecutar migración en entorno de desarrollo
  - Verificar que no rompe código existente
  - Verificar índices

#### SUBFASE 2.2: Estado Online/Última Vez Visto (4 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx` (header)
  - `src/components/whatsapp/ConversationList.jsx` (lista)
  - `src/services/whatsapp/contacts-status.js` (nuevo)
- **Funcionalidad:**
  - Mostrar "En línea" si `is_online = true`
  - Mostrar "Visto por última vez hace X" si no está en línea
  - Actualizar estado en tiempo real via Realtime
- **Testing:**
  - Verificar que el estado se actualiza correctamente
  - Verificar formato de "última vez visto"
  - Verificar suscripción en tiempo real

#### SUBFASE 2.3: Foto de Perfil (3 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx`
  - `src/components/whatsapp/ConversationList.jsx`
  - `src/components/whatsapp/MessageBubble.jsx` (opcional - para mensajes)
- **Funcionalidad:**
  - Mostrar foto de perfil si existe `profile_pic_url` (campo ya existe en BD)
  - Fallback a iniciales si no hay foto
  - Cargar imagen con manejo de errores
- **Testing:**
  - Verificar que muestra foto cuando existe
  - Verificar fallback a iniciales
  - Verificar manejo de errores de carga

#### SUBFASE 2.4: Indicador "Escribiendo..." (3 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx`
  - `src/services/whatsapp/typing-indicator.js` (nuevo)
  - `supabase/migrations/007_whatsapp_ui_improvements.sql` (tabla typing_indicators)
- **Funcionalidad:**
  - Detectar cuando el usuario está escribiendo
  - Mostrar "Contacto está escribiendo..." en el chat
  - Usar Realtime para sincronización
- **Testing:**
  - Verificar que aparece cuando se escribe
  - Verificar que desaparece después de X segundos
  - Verificar sincronización en tiempo real

---

### **FASE 3: Funcionalidades Interactivas** (2 días)
**Objetivo:** Agregar interacciones tipo WhatsApp Web

#### SUBFASE 3.1: Menú de Opciones Funcional (3 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ChatWindow.jsx`
  - `src/components/whatsapp/ChatMenu.jsx` (nuevo)
- **Funcionalidades del menú:**
  - Ver información del contacto
  - Buscar en conversación
  - Silenciar notificaciones
  - Archivar conversación
  - Eliminar conversación
- **Testing:**
  - Verificar que todas las opciones funcionan
  - Verificar que los cambios se reflejan en tiempo real

#### SUBFASE 3.2: Respuesta a Mensajes (4 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageBubble.jsx`
  - `src/components/whatsapp/MessageSender.jsx`
  - `src/services/whatsapp/messages.js` (agregar función reply)
- **Funcionalidad:**
  - Botón "Responder" en cada mensaje
  - Mostrar mensaje citado en el input
  - Enviar mensaje con `reply_to_message_id`
  - Mostrar mensaje citado en la burbuja de respuesta
- **Testing:**
  - Verificar que se puede responder a mensajes
  - Verificar que el mensaje citado se muestra correctamente
  - Verificar que funciona con todos los tipos de mensaje

#### SUBFASE 3.3: Reenvío de Mensajes (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageBubble.jsx`
  - `src/services/whatsapp/messages.js` (agregar función forward)
- **Funcionalidad:**
  - Botón "Reenviar" en mensajes
  - Selector de contactos para reenvío
  - Enviar mensaje reenviado
- **Testing:**
  - Verificar que se puede reenviar a múltiples contactos
  - Verificar que el contenido se preserva

#### SUBFASE 3.4: Eliminar Mensaje (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageBubble.jsx`
  - `src/services/whatsapp/messages.js` (agregar función delete)
- **Funcionalidad:**
  - Botón "Eliminar" en mensajes propios
  - Confirmación antes de eliminar
  - Soft delete (marcar como eliminado)
  - Mostrar "Este mensaje fue eliminado" para otros usuarios
- **Testing:**
  - Verificar que solo se pueden eliminar mensajes propios
  - Verificar confirmación
  - Verificar que se marca como eliminado

---

### **FASE 4: Funcionalidades de Lista** (1 día)
**Objetivo:** Mejorar la lista de conversaciones

#### SUBFASE 4.1: Fijar Conversaciones (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ConversationList.jsx`
  - `src/services/whatsapp/conversations.js` (agregar función pin)
- **Funcionalidad:**
  - Botón para fijar/desfijar conversación
  - Mostrar conversaciones fijadas primero
  - Indicador visual de conversación fijada
- **Testing:**
  - Verificar que las conversaciones fijadas aparecen primero
  - Verificar que se puede fijar/desfijar

#### SUBFASE 4.2: Archivar Conversaciones (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/ConversationList.jsx`
  - `src/services/whatsapp/conversations.js` (agregar función archive)
- **Funcionalidad:**
  - Botón para archivar conversación
  - Filtrar conversaciones archivadas
  - Sección "Archivados" en la lista
- **Testing:**
  - Verificar que las conversaciones archivadas no aparecen en la lista principal
  - Verificar que se pueden ver en "Archivados"

---

### **FASE 5: Mejoras del Input** (1 día)
**Objetivo:** Mejorar la experiencia de escribir mensajes

#### SUBFASE 5.1: Emoji Picker (4 horas)
- **Archivos a crear:**
  - `src/components/whatsapp/EmojiPicker.jsx` (nuevo)
  - `src/utils/whatsapp/emojis.js` (nuevo)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageSender.jsx`
- **Funcionalidad:**
  - Botón de emoji en el input
  - Picker de emojis desplegable
  - Insertar emoji en el texto
- **Testing:**
  - Verificar que se pueden insertar emojis
  - Verificar que el picker se cierra correctamente

#### SUBFASE 5.2: Mejoras del Input (2 horas)
- **Archivos a modificar:**
  - `src/components/whatsapp/MessageSender.jsx`
- **Funcionalidades:**
  - Botón de adjuntar archivo más visible
  - Vista previa de media antes de enviar
  - Indicador de "presionando Enter"
- **Testing:**
  - Verificar que todas las funcionalidades funcionan
  - Verificar UX fluida

---

## 🔄 Dependencias entre Fases

```
FASE 1 (Visuales) ──┐
                    ├──> Pueden ejecutarse en paralelo
FASE 2 (Estado) ───┤
                    │
FASE 3 (Interactivas) ──> Depende de FASE 2 (BD)
                    │
FASE 4 (Lista) ─────┤
                    │
FASE 5 (Input) ─────┘
```

**Nota:** FASE 2 debe completarse antes de FASE 3, 4 y 5 porque agrega campos a la BD.

---

## 🧪 Estrategia de Testing

### Por cada Subfase:
1. **Tests unitarios** para nuevas funciones/utilities
2. **Tests de integración** para componentes modificados
3. **Testing manual** de la funcionalidad completa
4. **Verificación** de que no se rompe código existente

### Testing Global:
- Ejecutar todos los tests existentes después de cada fase
- Verificar que la UI funciona en móvil y desktop
- Verificar que Realtime funciona correctamente

---

## 📝 Checklist de Verificación por Fase

### FASE 1 ✅
- [ ] Separadores de fecha funcionan
- [ ] Fondo con patrón se ve bien
- [ ] Mensajes se agrupan correctamente
- [ ] Timestamps son legibles
- [ ] No se rompe código existente

### FASE 2 ✅
- [ ] Migración de BD ejecutada correctamente
- [ ] Estado online se muestra
- [ ] Última vez visto se muestra
- [ ] Fotos de perfil funcionan
- [ ] Indicador "escribiendo" funciona
- [ ] No se rompe código existente

### FASE 3 ✅
- [ ] Menú de opciones funciona
- [ ] Respuesta a mensajes funciona
- [ ] Reenvío funciona
- [ ] Eliminar mensaje funciona
- [ ] No se rompe código existente

### FASE 4 ✅
- [ ] Fijar conversaciones funciona
- [ ] Archivar conversaciones funciona
- [ ] No se rompe código existente

### FASE 5 ✅
- [ ] Emoji picker funciona
- [ ] Mejoras del input funcionan
- [ ] No se rompe código existente

---

## 🚀 Orden de Implementación Recomendado

1. **FASE 1** (Visuales básicas) - No requiere BD, mejora inmediata
2. **FASE 2** (Estado) - Requiere BD, base para otras funcionalidades
3. **FASE 3** (Interactivas) - Depende de FASE 2
4. **FASE 4** (Lista) - Depende de FASE 2
5. **FASE 5** (Input) - Independiente, puede hacerse en paralelo con FASE 3/4

---

## ⚠️ Consideraciones Importantes

1. **Compatibilidad hacia atrás:** Todas las nuevas columnas deben ser opcionales (NULL) para no romper datos existentes
2. **Realtime:** Verificar que las suscripciones no se duplican
3. **Performance:** Agregar índices donde sea necesario
4. **UX:** Mantener animaciones suaves y transiciones
5. **Testing:** Ejecutar tests después de cada subfase

---

## 📅 Timeline Estimado

- **FASE 1:** 2 días
- **FASE 2:** 2 días
- **FASE 3:** 2 días
- **FASE 4:** 1 día
- **FASE 5:** 1 día

**Total:** 8 días (con buffer para testing y ajustes)

---

## ✅ Criterios de Éxito

1. ✅ La interfaz se ve más parecida a WhatsApp Web
2. ✅ Todas las funcionalidades nuevas funcionan correctamente
3. ✅ No se rompe código existente
4. ✅ Todos los tests pasan
5. ✅ La experiencia de usuario es fluida y sin errores

---

¿Procedemos con la implementación siguiendo este plan?

