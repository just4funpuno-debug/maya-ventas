# Plan: Etiquetas y Respuestas Rápidas para WhatsApp CRM

## ✅ CONFIRMACIÓN DE VIABILIDAD

### 1. **Etiquetas para Chats** ✅ POSIBLE
- **WhatsApp Cloud API**: NO tiene soporte nativo para etiquetas en conversaciones
- **Solución**: Implementar etiquetas internamente en nuestra base de datos
- **Funcionalidad**: Etiquetas locales que permiten categorizar y filtrar conversaciones
- **Compatibilidad**: 100% compatible con WhatsApp Cloud API (no interfiere)

### 2. **Respuestas Rápidas con "/"** ✅ POSIBLE
- **WhatsApp Cloud API**: Soporta todos los tipos de mensaje necesarios
- **Tipos soportados**:
  - ✅ Texto (`sendTextMessage`)
  - ✅ Imagen/es (`sendImageMessage`) - múltiples imágenes = múltiples mensajes
  - ✅ Imagen + Texto (`sendImageMessage` con `caption`)
  - ✅ Audio (`sendAudioMessage`)
  - ✅ Audio + Texto (`sendAudioMessage` + `sendTextMessage` en secuencia)
- **Comando "/"**: Implementación local en el frontend
- **Compatibilidad**: 100% funcional con WhatsApp Cloud API

---

## 📋 PLAN POR FASES

### **FASE 1: Etiquetas para Chats** (3-4 días)

#### SUBFASE 1.1: Schema y Base de Datos (1 día)
- **Objetivo**: Crear tablas y relaciones para etiquetas
- **Tareas**:
  1. Crear tabla `whatsapp_tags` (id, name, color, account_id, created_at)
  2. Crear tabla `whatsapp_contact_tags` (contact_id, tag_id, created_at) - relación muchos-a-muchos
  3. Crear índices para búsquedas rápidas
  4. Habilitar RLS y crear políticas
  5. Crear función SQL `get_contact_tags(contact_id)`

#### SUBFASE 1.2: Servicios Backend (1 día)
- **Objetivo**: Crear servicios para gestionar etiquetas
- **Tareas**:
  1. Crear `src/services/whatsapp/tags.js`:
     - `getAllTags(accountId)` - Obtener todas las etiquetas
     - `createTag(accountId, name, color)` - Crear etiqueta
     - `updateTag(tagId, name, color)` - Actualizar etiqueta
     - `deleteTag(tagId)` - Eliminar etiqueta
     - `addTagToContact(contactId, tagId)` - Asignar etiqueta
     - `removeTagFromContact(contactId, tagId)` - Quitar etiqueta
     - `getContactTags(contactId)` - Obtener etiquetas de un contacto
  2. Crear tests unitarios

#### SUBFASE 1.3: UI - Gestor de Etiquetas (1 día)
- **Objetivo**: Crear interfaz para gestionar etiquetas
- **Tareas**:
  1. Crear componente `TagManager.jsx`:
     - Lista de etiquetas existentes
     - Crear nueva etiqueta (nombre + color)
     - Editar etiqueta existente
     - Eliminar etiqueta
  2. Integrar en `WhatsAppDashboard` o crear menú separado
  3. Agregar colores predefinidos (10-15 colores)

#### SUBFASE 1.4: UI - Asignar Etiquetas a Contactos (1 día)
- **Objetivo**: Permitir asignar/quitar etiquetas desde el chat
- **Tareas**:
  1. Modificar `ChatWindow.jsx`:
     - Agregar botón "Etiquetas" en el header
     - Modal para seleccionar/deseleccionar etiquetas
     - Mostrar etiquetas asignadas como badges
  2. Modificar `ConversationList.jsx`:
     - Mostrar etiquetas en cada conversación
     - Filtrar conversaciones por etiqueta
  3. Agregar filtro de etiquetas en la búsqueda

#### SUBFASE 1.5: Testing y Documentación (0.5 días)
- **Objetivo**: Verificar funcionalidad completa
- **Tareas**:
  1. Tests unitarios para servicios
  2. Tests de integración
  3. Documentación de uso

---

### **FASE 2: Respuestas Rápidas con "/"** (4-5 días)

#### SUBFASE 2.1: Schema y Base de Datos (1 día)
- **Objetivo**: Crear estructura para respuestas rápidas
- **Tareas**:
  1. Crear tabla `whatsapp_quick_replies`:
     - `id` (UUID)
     - `account_id` (UUID, FK a whatsapp_accounts)
     - `trigger` (TEXT) - comando trigger (ej: "/saludo")
     - `name` (TEXT) - nombre descriptivo
     - `type` (TEXT) - 'text', 'image', 'image_text', 'audio', 'audio_text'
     - `content_text` (TEXT) - texto de la respuesta
     - `media_path` (TEXT) - ruta al archivo en Storage (si aplica)
     - `media_type` (TEXT) - 'image', 'audio' (si aplica)
     - `created_at`, `updated_at`
  2. Crear índices (`account_id`, `trigger`)
  3. Habilitar RLS y políticas
  4. Crear función SQL `get_quick_replies(account_id, search_term)`

#### SUBFASE 2.2: Servicios Backend (1.5 días)
- **Objetivo**: Crear servicios para gestionar respuestas rápidas
- **Tareas**:
  1. Crear `src/services/whatsapp/quick-replies.js`:
     - `getAllQuickReplies(accountId)` - Obtener todas
     - `getQuickReplyById(id)` - Obtener por ID
     - `searchQuickReplies(accountId, searchTerm)` - Buscar por trigger o nombre
     - `createQuickReply(accountId, data)` - Crear nueva
     - `updateQuickReply(id, data)` - Actualizar
     - `deleteQuickReply(id)` - Eliminar
     - `uploadQuickReplyMedia(file, type)` - Subir media a Storage
  2. Crear `src/services/whatsapp/quick-reply-sender.js`:
     - `sendQuickReply(accountId, contactId, quickReplyId)` - Enviar respuesta rápida
     - Lógica para enviar múltiples mensajes si es necesario (múltiples imágenes)
  3. Crear tests unitarios

#### SUBFASE 2.3: UI - Gestor de Respuestas Rápidas (1.5 días)
- **Objetivo**: Crear interfaz para gestionar respuestas rápidas
- **Tareas**:
  1. Crear componente `QuickReplyManager.jsx`:
     - Lista de respuestas rápidas
     - Crear nueva respuesta rápida:
       - Campo "Trigger" (ej: "/saludo")
       - Campo "Nombre"
       - Selector de tipo (texto, imagen, imagen+texto, audio, audio+texto)
       - Campo de texto (si aplica)
       - Upload de media (si aplica)
       - Vista previa
     - Editar respuesta rápida existente
     - Eliminar respuesta rápida
  2. Integrar en `WhatsAppDashboard` o menú separado
  3. Validaciones:
     - Trigger único por cuenta
     - Validar tipos de archivo
     - Validar tamaños de archivo

#### SUBFASE 2.4: UI - Integración con "/" en MessageSender (1 día)
- **Objetivo**: Implementar comando "/" en el campo de mensaje
- **Tareas**:
  1. Modificar `MessageSender.jsx`:
     - Detectar cuando el usuario escribe "/"
     - Mostrar dropdown con respuestas rápidas disponibles
     - Filtrar por lo que el usuario escribe después de "/"
     - Seleccionar respuesta rápida
     - Enviar automáticamente
  2. Crear componente `QuickReplyDropdown.jsx`:
     - Lista filtrada de respuestas rápidas
     - Mostrar nombre y tipo
     - Vista previa si es texto
  3. Manejar envío de múltiples mensajes (múltiples imágenes)

#### SUBFASE 2.5: Testing y Documentación (0.5 días)
- **Objetivo**: Verificar funcionalidad completa
- **Tareas**:
  1. Tests unitarios
  2. Tests de integración
  3. Pruebas manuales de todos los tipos
  4. Documentación de uso

---

## 📊 RESUMEN DE FASES

| Fase | Duración | Complejidad | Prioridad |
|------|----------|-------------|-----------|
| FASE 1: Etiquetas | 3-4 días | Media | Alta |
| FASE 2: Respuestas Rápidas | 4-5 días | Alta | Alta |
| **TOTAL** | **7-9 días** | - | - |

---

## 🔧 CONSIDERACIONES TÉCNICAS

### Etiquetas:
- **Almacenamiento**: Tabla `whatsapp_contact_tags` (relación muchos-a-muchos)
- **Colores**: Array predefinido de colores (hex codes)
- **Filtrado**: Índices en `contact_id` y `tag_id` para búsquedas rápidas
- **RLS**: Políticas permisivas (ajustar según necesidades)

### Respuestas Rápidas:
- **Múltiples imágenes**: Enviar múltiples mensajes `sendImageMessage` en secuencia
- **Audio + Texto**: Enviar primero `sendTextMessage`, luego `sendAudioMessage`
- **Storage**: Usar bucket `whatsapp-media` existente
- **Validaciones**:
  - Tamaño máximo de imagen: 5MB
  - Tamaño máximo de audio: 16MB
  - Formatos soportados: según WhatsApp Cloud API

### Comando "/":
- **Detección**: `onKeyDown` en el textarea, detectar "/"
- **Dropdown**: Mostrar cuando se detecta "/" y hay texto después
- **Filtrado**: Filtrar respuestas rápidas por trigger o nombre
- **Selección**: Al seleccionar, reemplazar "/..." con la respuesta y enviar

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: Etiquetas
- [ ] SUBFASE 1.1: Schema y Base de Datos
- [ ] SUBFASE 1.2: Servicios Backend
- [ ] SUBFASE 1.3: UI - Gestor de Etiquetas
- [ ] SUBFASE 1.4: UI - Asignar Etiquetas a Contactos
- [ ] SUBFASE 1.5: Testing y Documentación

### FASE 2: Respuestas Rápidas
- [ ] SUBFASE 2.1: Schema y Base de Datos
- [ ] SUBFASE 2.2: Servicios Backend
- [ ] SUBFASE 2.3: UI - Gestor de Respuestas Rápidas
- [ ] SUBFASE 2.4: UI - Integración con "/" en MessageSender
- [ ] SUBFASE 2.5: Testing y Documentación

---

## 🎯 RESULTADO ESPERADO

### Etiquetas:
- Los usuarios pueden crear etiquetas personalizadas
- Pueden asignar múltiples etiquetas a cada contacto
- Pueden filtrar conversaciones por etiqueta
- Las etiquetas se muestran visualmente en la lista de conversaciones

### Respuestas Rápidas:
- Los usuarios pueden crear respuestas rápidas con diferentes tipos de contenido
- Al escribir "/" en el campo de mensaje, aparece un dropdown con respuestas disponibles
- Al seleccionar una respuesta rápida, se envía automáticamente
- Soporta texto, imágenes, audio y combinaciones

---

## ⚠️ NOTAS IMPORTANTES

1. **Etiquetas son locales**: No se sincronizan con WhatsApp (no existe en la API)
2. **Respuestas rápidas**: Se envían como mensajes normales (no hay diferencia para WhatsApp)
3. **Múltiples imágenes**: Se envían como mensajes separados (limitación de WhatsApp API)
4. **Testing**: Es crucial probar todos los tipos de respuesta rápida antes de desplegar

---

## 🚀 SIGUIENTE PASO

¿Quieres que comencemos con **FASE 1: Etiquetas** o prefieres revisar el plan primero?


