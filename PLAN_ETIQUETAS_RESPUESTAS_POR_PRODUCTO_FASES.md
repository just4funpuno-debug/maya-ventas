# 📋 Plan: Etiquetas y Respuestas Rápidas por Producto

## 🎯 Objetivo
Hacer que las etiquetas y respuestas rápidas sean independientes por producto, no por cuenta.

---

## 📊 FASE 1: Base de Datos - Schema y Migración

### SUBFASE 1.1: Agregar `product_id` a `whatsapp_tags` ✅
- **Objetivo:** Agregar columna `product_id` a la tabla `whatsapp_tags`
- **Tareas:**
  1. Crear migración SQL para agregar columna `product_id`
  2. Agregar índice en `product_id`
  3. Agregar foreign key a `products` (con fallback a `almacen_central`)
  4. Ejecutar migración
  5. Testing: Verificar que la columna existe

### SUBFASE 1.2: Agregar `product_id` a `whatsapp_quick_replies` ✅
- **Objetivo:** Agregar columna `product_id` a la tabla `whatsapp_quick_replies`
- **Tareas:**
  1. Crear migración SQL para agregar columna `product_id`
  2. Agregar índice en `product_id`
  3. Agregar foreign key a `products` (con fallback a `almacen_central`)
  4. Ejecutar migración
  5. Testing: Verificar que la columna existe

### SUBFASE 1.3: Migrar datos existentes ✅
- **Objetivo:** Asignar `product_id` a etiquetas y respuestas rápidas existentes
- **Tareas:**
  1. Crear script SQL para migrar `whatsapp_tags`:
     - Obtener `product_id` desde `whatsapp_accounts` usando `account_id`
     - Actualizar `whatsapp_tags` con `product_id`
  2. Crear script SQL para migrar `whatsapp_quick_replies`:
     - Obtener `product_id` desde `whatsapp_accounts` usando `account_id`
     - Actualizar `whatsapp_quick_replies` con `product_id`
  3. Ejecutar scripts de migración
  4. Verificar que todos los registros tienen `product_id`
  5. Testing: Verificar integridad de datos

---

## 📊 FASE 2: Backend - Servicios

### SUBFASE 2.1: Modificar servicio de etiquetas ✅
- **Objetivo:** Actualizar `src/services/whatsapp/tags.js` para filtrar por `product_id`
- **Tareas:**
  1. Modificar `getAllTags(accountId, productId)` o crear `getAllTagsByProduct(productId)`
  2. Actualizar `createTag` para requerir `product_id`
  3. Actualizar otras funciones si es necesario
  4. Testing: Verificar que las funciones funcionan correctamente

### SUBFASE 2.2: Modificar servicio de respuestas rápidas ✅
- **Objetivo:** Actualizar `src/services/whatsapp/quick-replies.js` para filtrar por `product_id`
- **Tareas:**
  1. Modificar `getAllQuickReplies(accountId, productId)` o crear `getAllQuickRepliesByProduct(productId)`
  2. Actualizar `createQuickReply` para requerir `product_id`
  3. Actualizar otras funciones si es necesario
  4. Testing: Verificar que las funciones funcionan correctamente

---

## 📊 FASE 3: Frontend - Componentes

### SUBFASE 3.1: Modificar `ConversationList.jsx` - Etiquetas ✅
- **Objetivo:** Actualizar carga de etiquetas para usar `product_id`
- **Tareas:**
  1. Modificar `loadTags` para usar `selectedProductId` en lugar de solo `accountId`
  2. Actualizar llamadas a `getAllTags` para pasar `productId`
  3. Testing: Verificar que las etiquetas se cargan correctamente por producto

### SUBFASE 3.2: Modificar `TagManagerModal.jsx` ✅
- **Objetivo:** Actualizar creación/edición de etiquetas para usar `product_id`
- **Tareas:**
  1. Modificar para recibir `productId` como prop
  2. Actualizar `createTag` para pasar `productId`
  3. Testing: Verificar que se pueden crear/editar etiquetas por producto

### SUBFASE 3.3: Modificar `SimpleAddTagModal.jsx` ✅
- **Objetivo:** Actualizar creación de etiquetas para usar `product_id`
- **Tareas:**
  1. Modificar para recibir `productId` como prop
  2. Actualizar `createTag` para pasar `productId`
  3. Testing: Verificar que se pueden crear etiquetas por producto

### SUBFASE 3.4: Modificar `QuickReplyManager.jsx` ✅
- **Objetivo:** Actualizar carga/creación de respuestas rápidas para usar `product_id`
- **Tareas:**
  1. Modificar para recibir `productId` como prop
  2. Actualizar `getAllQuickReplies` para usar `productId`
  3. Actualizar `createQuickReply` para pasar `productId`
  4. Testing: Verificar que las respuestas rápidas se cargan/crean correctamente por producto

### SUBFASE 3.5: Modificar `WhatsAppDashboard.jsx` ✅
- **Objetivo:** Pasar `selectedProductId` a los componentes hijos
- **Tareas:**
  1. Pasar `selectedProductId` a `ConversationList`
  2. Pasar `selectedProductId` a `TagManagerModal`
  3. Pasar `selectedProductId` a `QuickReplyManager`
  4. Testing: Verificar que los componentes reciben `productId` correctamente

---

## 📊 FASE 4: Testing Final y Verificación

### SUBFASE 4.1: Testing de Backend ✅
- **Objetivo:** Verificar que los servicios funcionan correctamente
- **Tareas:**
  1. Probar `getAllTagsByProduct(productId)`
  2. Probar `createTag` con `productId`
  3. Probar `getAllQuickRepliesByProduct(productId)`
  4. Probar `createQuickReply` con `productId`
  5. Verificar que no hay errores

### SUBFASE 4.2: Testing de Frontend ✅
- **Objetivo:** Verificar que la UI funciona correctamente
- **Tareas:**
  1. Probar crear etiqueta en Producto A
  2. Cambiar a Producto B
  3. Verificar que no se ven las etiquetas de Producto A
  4. Probar crear respuesta rápida en Producto A
  5. Cambiar a Producto B
  6. Verificar que no se ven las respuestas rápidas de Producto A
  7. Verificar que al cambiar de producto, se cargan las correctas

### SUBFASE 4.3: Testing de Integridad ✅
- **Objetivo:** Verificar que los datos están correctos
- **Tareas:**
  1. Verificar que todas las etiquetas tienen `product_id`
  2. Verificar que todas las respuestas rápidas tienen `product_id`
  3. Verificar que no hay registros huérfanos
  4. Verificar que los índices funcionan correctamente

---

## 📋 Resumen de Fases

| Fase | Subfase | Descripción | Testing |
|------|---------|-------------|---------|
| **FASE 1** | 1.1 | Agregar `product_id` a `whatsapp_tags` | ✅ |
| | 1.2 | Agregar `product_id` a `whatsapp_quick_replies` | ✅ |
| | 1.3 | Migrar datos existentes | ✅ |
| **FASE 2** | 2.1 | Modificar servicio de etiquetas | ✅ |
| | 2.2 | Modificar servicio de respuestas rápidas | ✅ |
| **FASE 3** | 3.1 | Modificar `ConversationList.jsx` | ✅ |
| | 3.2 | Modificar `TagManagerModal.jsx` | ✅ |
| | 3.3 | Modificar `SimpleAddTagModal.jsx` | ✅ |
| | 3.4 | Modificar `QuickReplyManager.jsx` | ✅ |
| | 3.5 | Modificar `WhatsAppDashboard.jsx` | ✅ |
| **FASE 4** | 4.1 | Testing de Backend | ✅ |
| | 4.2 | Testing de Frontend | ✅ |
| | 4.3 | Testing de Integridad | ✅ |

---

## ⚠️ Consideraciones Importantes

1. **Migración de Datos:**
   - Todos los registros existentes deben tener `product_id` asignado
   - Si una cuenta no tiene `product_id`, no se puede migrar (debe asignarse primero)

2. **Compatibilidad:**
   - Mantener compatibilidad con `account_id` durante la transición
   - Después de la migración, `product_id` será el filtro principal

3. **Validaciones:**
   - `product_id` debe ser requerido al crear nuevas etiquetas/respuestas rápidas
   - Verificar que `product_id` existe antes de crear

4. **Índices:**
   - Agregar índices en `product_id` para mejorar rendimiento
   - Considerar índices compuestos si es necesario

---

**Fecha:** 2025-01-30  
**Estado:** 📋 **PLAN CREADO - LISTO PARA INICIAR**

