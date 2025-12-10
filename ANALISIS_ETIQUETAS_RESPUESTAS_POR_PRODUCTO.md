# 📊 Análisis: Etiquetas y Respuestas Rápidas por Producto

## 🔍 Estado Actual

### **ETIQUETAS (Tags)**

**Tabla:** `whatsapp_tags`
- ✅ Tiene `account_id` (FK a `whatsapp_accounts`)
- ❌ **NO tiene `product_id`**

**Servicio:** `src/services/whatsapp/tags.js`
- `getAllTags(accountId)` - Filtra solo por `account_id`
- No filtra por `product_id`

**Componente:** `ConversationList.jsx`
- Carga etiquetas usando `getAllTags(accountId)`
- Solo usa `accountId`, no `productId`

**Problema:**
- Las etiquetas están vinculadas a `account_id`, no a `product_id`
- Si un producto tiene múltiples cuentas, cada cuenta tiene sus propias etiquetas
- **NO son independientes por producto** - son independientes por cuenta

---

### **RESPUESTAS RÁPIDAS (Quick Replies)**

**Tabla:** `whatsapp_quick_replies`
- ✅ Tiene `account_id` (FK a `whatsapp_accounts`)
- ❌ **NO tiene `product_id`**

**Servicio:** `src/services/whatsapp/quick-replies.js`
- `getAllQuickReplies(accountId)` - Filtra solo por `account_id`
- No filtra por `product_id`

**Componente:** `ConversationList.jsx`
- Abre `QuickReplyManager` que usa `getAllQuickReplies(accountId)`
- Solo usa `accountId`, no `productId`

**Problema:**
- Las respuestas rápidas están vinculadas a `account_id`, no a `product_id`
- Si un producto tiene múltiples cuentas, cada cuenta tiene sus propias respuestas rápidas
- **NO son independientes por producto** - son independientes por cuenta

---

## ❌ CONCLUSIÓN

### **NO son independientes por producto**

**Estado actual:**
- ✅ Son independientes por **cuenta** (`account_id`)
- ❌ **NO son independientes por producto** (`product_id`)

**Implicaciones:**
1. Si un producto tiene múltiples cuentas, cada cuenta tiene sus propias etiquetas/respuestas rápidas
2. Al cambiar de producto, se ven las etiquetas/respuestas rápidas de todas las cuentas de ese producto
3. No hay una forma de tener etiquetas/respuestas rápidas compartidas por producto

---

## ✅ SOLUCIÓN PROPUESTA

Para hacerlas independientes por producto, necesitaríamos:

### 1. **Agregar `product_id` a las tablas**
   - Agregar columna `product_id` a `whatsapp_tags`
   - Agregar columna `product_id` a `whatsapp_quick_replies`
   - Migrar datos existentes asignando `product_id` desde `whatsapp_accounts`

### 2. **Modificar servicios**
   - `getAllTags(accountId, productId)` - Filtrar por ambos
   - `getAllQuickReplies(accountId, productId)` - Filtrar por ambos
   - O mejor: `getAllTagsByProduct(productId)` - Solo por producto

### 3. **Modificar componentes**
   - Pasar `selectedProductId` a los servicios
   - Filtrar etiquetas/respuestas rápidas por producto seleccionado

### 4. **Migración de datos**
   - Asignar `product_id` a etiquetas/respuestas rápidas existentes basándose en `account_id`

---

## ❓ PREGUNTA PARA EL USUARIO

**¿Quieres que las etiquetas y respuestas rápidas sean:**
1. **Independientes por producto** (todas las cuentas del mismo producto comparten etiquetas/respuestas rápidas)
2. **Independientes por cuenta** (cada cuenta tiene sus propias etiquetas/respuestas rápidas) - **ESTADO ACTUAL**

**Recomendación:**
- Si cada producto tiene un solo número de WhatsApp → **Opción 1** (por producto) es mejor
- Si cada producto puede tener múltiples números → **Opción 2** (por cuenta) puede ser mejor

---

**Fecha:** 2025-01-30

