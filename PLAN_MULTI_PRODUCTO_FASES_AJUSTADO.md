# 🏢 PLAN AJUSTADO: Sistema Multi-Producto WhatsApp CRM

## ✅ **CONFIRMACIÓN FINAL**

### **Requisitos Confirmados:**

1. ✅ **Creación manual de cuentas WhatsApp** - Con botón, asignar producto (opcional, puede ser NULL)
2. ✅ **product_id puede ser NULL** - Para cuentas sin producto
3. ✅ **Pestañas por producto** - Dentro de cada menú existente (no nuevos menús)
4. ✅ **Asignación de productos** - **YA EXISTE** en menú "Usuarios" (usa `users.productos` como array de SKUs)
5. ✅ **Testing después de cada fase** - Sí
6. ❌ **Integración con ventas** - NO necesario ahora

### **Estructura Actual Encontrada:**

- ✅ `users.productos` = Array de SKUs (ej: `['CVP-60', 'FLEX-60']`)
- ✅ `whatsapp_accounts.product_id` = UUID que referencia a `products.id`
- ✅ `products.id` = UUID
- ✅ `products.sku` = String (ej: 'CVP-60')

**Necesitamos:** Convertir SKUs → product_ids para filtrar

---

## 📊 **FASES AJUSTADAS**

---

## **FASE 1: Base de Datos y Funciones Helper** ⏱️ 1-2 horas

### **SUBFASE 1.1: Modificar product_id en whatsapp_accounts** (30 min)

**Objetivo:** Asegurar que product_id puede ser NULL y agregar índices

**Archivos:**
- `supabase/migrations/010_whatsapp_accounts_product_null.sql`

**Cambios:**
```sql
-- Asegurar que product_id puede ser NULL (ya debería serlo, pero verificamos)
-- No hacer ALTER si ya es nullable

-- Índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_accounts_product ON whatsapp_accounts(product_id) 
  WHERE product_id IS NOT NULL;

-- Índice para cuentas sin producto
CREATE INDEX IF NOT EXISTS idx_accounts_no_product ON whatsapp_accounts(active) 
  WHERE product_id IS NULL;
```

**Testing:**
- ✅ Verificar que product_id puede ser NULL
- ✅ Verificar índices creados
- ✅ Probar insertar cuenta con y sin product_id

---

### **SUBFASE 1.2: Funciones Helper SQL** (1 hora)

**Objetivo:** Crear funciones para convertir SKUs a product_ids y filtrar cuentas

**Archivos:**
- `supabase/migrations/011_product_functions.sql`

**Funciones:**
```sql
-- Obtener product_ids desde array de SKUs
CREATE OR REPLACE FUNCTION get_product_ids_from_skus(p_skus TEXT[])
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM products
  WHERE sku = ANY(p_skus);
$$ LANGUAGE sql;

-- Obtener account_ids por SKUs de usuario
CREATE OR REPLACE FUNCTION get_account_ids_by_user_skus(p_skus TEXT[])
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(wa.id)
  FROM whatsapp_accounts wa
  INNER JOIN products p ON wa.product_id = p.id
  WHERE p.sku = ANY(p_skus)
    AND wa.active = true;
$$ LANGUAGE sql;

-- Obtener account_ids sin producto (para admin)
CREATE OR REPLACE FUNCTION get_account_ids_without_product()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE product_id IS NULL AND active = true;
$$ LANGUAGE sql;

-- Obtener account_ids por product_id específico
CREATE OR REPLACE FUNCTION get_account_ids_by_product_id(p_product_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE product_id = p_product_id AND active = true;
$$ LANGUAGE sql;
```

**Testing:**
- ✅ Probar `get_product_ids_from_skus()` con array de SKUs
- ✅ Probar `get_account_ids_by_user_skus()` con SKUs de usuario
- ✅ Probar `get_account_ids_without_product()` con cuentas sin producto
- ✅ Probar `get_account_ids_by_product_id()` con product_id específico

---

## **FASE 2: Backend - Servicios** ⏱️ 2-3 horas

### **SUBFASE 2.1: Modificar accounts.js** (1 hora)

**Objetivo:** Agregar funciones para filtrar por producto usando SKUs

**Archivos:**
- `src/services/whatsapp/accounts.js`

**Funciones nuevas:**
```javascript
- getAccountsByProductId(productId) // Obtener cuentas de un producto específico
- getAccountsWithoutProduct() // Obtener cuentas sin producto
- getAccountsByUserSkus(userSkus) // Obtener cuentas de productos asignados al usuario (por SKUs)
- getAccountIdsByUserSkus(userSkus) // Helper: obtener solo IDs
```

**Modificaciones:**
- `createAccount()` - Ya permite `product_id: null` ✅
- `getAllAccounts()` - Agregar filtro opcional por `productId` o `userSkus`

**Testing:**
- ✅ Probar crear cuenta con producto
- ✅ Probar crear cuenta sin producto
- ✅ Probar filtrar por productId
- ✅ Probar filtrar por userSkus (array de SKUs)

---

### **SUBFASE 2.2: Modificar conversations.js** (1 hora)

**Objetivo:** Filtrar conversaciones por productos asignados al usuario (usando SKUs)

**Archivos:**
- `src/services/whatsapp/conversations.js`

**Modificaciones:**
```javascript
- getConversations(options) - Agregar filtro por userSkus o productId
  // Si hay userSkus, obtener account_ids y filtrar
  // Si hay productId, filtrar directamente
```

**Testing:**
- ✅ Probar obtener conversaciones de productos asignados (por SKUs)
- ✅ Probar obtener conversaciones sin producto
- ✅ Probar que no se mezclan datos de diferentes productos

---

### **SUBFASE 2.3: Modificar tags.js** (30 min)

**Objetivo:** Ya filtra por accountId ✅ (solo verificar)

**Archivos:**
- `src/services/whatsapp/tags.js`

**Verificación:**
- ✅ `getAllTags(accountId)` - Ya filtra por accountId ✅
- ✅ `getContactTags(contactId)` - Ya filtra por contactId ✅

**Testing:**
- ✅ Verificar que etiquetas se filtran correctamente

---

### **SUBFASE 2.4: Modificar quick-replies.js** (30 min)

**Objetivo:** Ya filtra por accountId ✅ (solo verificar)

**Archivos:**
- `src/services/whatsapp/quick-replies.js`

**Verificación:**
- ✅ `getQuickReplies(accountId)` - Ya filtra por accountId ✅

**Testing:**
- ✅ Verificar que respuestas rápidas se filtran correctamente

---

### **SUBFASE 2.5: Modificar sequences.js** (30 min)

**Objetivo:** Ya filtra por accountId ✅ (solo verificar)

**Archivos:**
- `src/services/whatsapp/sequences.js`

**Verificación:**
- ✅ `getSequences(accountId)` - Ya filtra por accountId ✅

**Testing:**
- ✅ Verificar que secuencias se filtran correctamente

---

### **SUBFASE 2.6: Modificar puppeteer-queue.js** (30 min)

**Objetivo:** Ya filtra por accountId ✅ (solo verificar)

**Archivos:**
- `src/services/whatsapp/puppeteer-queue.js`

**Verificación:**
- ✅ `getQueueItems(accountId)` - Ya filtra por accountId ✅

**Testing:**
- ✅ Verificar que cola se filtra correctamente

---

## **FASE 3: Frontend - Componentes Base** ⏱️ 3-4 horas

### **SUBFASE 3.1: Hook useUserProducts** (1 hora)

**Objetivo:** Crear hook para obtener productos asignados al usuario actual (convertir SKUs a productos completos)

**Archivos:**
- `src/hooks/useUserProducts.js`

**Funcionalidad:**
```javascript
- Obtener usuario actual (session)
- Obtener productos asignados (session.productos = array de SKUs)
- Convertir SKUs a objetos de productos completos
- Incluir opción "Sin Producto" si es admin
- Cachear resultados
```

**Testing:**
- ✅ Probar con usuario admin (debe ver todos los productos)
- ✅ Probar con usuario seller (solo productos asignados)
- ✅ Probar sin productos asignados

---

### **SUBFASE 3.2: Componente ProductTabs** (1.5 horas)

**Objetivo:** Crear componente de pestañas por producto

**Archivos:**
- `src/components/whatsapp/ProductTabs.jsx`

**Funcionalidad:**
```jsx
- Mostrar pestañas por producto (usando productos del hook)
- Pestaña "Sin Producto" (solo admin)
- Indicador de cantidad de cuentas por producto
- Animaciones con Framer Motion
```

**Props:**
```javascript
{
  products: Array, // Productos asignados (objetos completos con id, sku, nombre)
  selectedProductId: string | null, // UUID del producto o null para "Sin Producto"
  onSelectProduct: (productId: string | null) => void,
  showWithoutProduct: boolean // Solo admin
}
```

**Testing:**
- ✅ Verificar que se muestran pestañas correctas
- ✅ Probar cambio de pestaña
- ✅ Verificar animaciones

---

### **SUBFASE 3.3: Modificar WhatsAppAccountManager** (1.5 horas)

**Objetivo:** Agregar selector de producto al crear cuenta

**Archivos:**
- `src/components/whatsapp/WhatsAppAccountManager.jsx`

**Cambios:**
- Agregar selector de producto en formulario de creación
- Opción "Sin Producto" en selector
- Mostrar producto asignado en lista de cuentas
- Permitir editar producto de cuenta existente
- Usar `products` para obtener lista de productos (con id y sku)

**Testing:**
- ✅ Probar crear cuenta con producto
- ✅ Probar crear cuenta sin producto
- ✅ Probar editar producto de cuenta
- ✅ Verificar que se muestra correctamente en lista

---

## **FASE 4: Frontend - Integración en Menús** ⏱️ 4-5 horas

### **SUBFASE 4.1: Modificar WhatsAppDashboard** (2 horas)

**Objetivo:** Integrar pestañas de productos en Chat WhatsApp

**Archivos:**
- `src/components/whatsapp/WhatsAppDashboard.jsx`

**Cambios:**
- Integrar `ProductTabs` en la parte superior
- Usar `useUserProducts` para obtener productos asignados
- Filtrar cuentas por producto seleccionado (usar SKUs → account_ids)
- Pasar `productId` a `ConversationList` y `ChatWindow`
- Guardar `selectedProductId` en localStorage

**Testing:**
- ✅ Probar cambio de pestaña
- ✅ Verificar que se filtran conversaciones
- ✅ Verificar que se mantiene selección al recargar
- ✅ Probar con múltiples productos

---

### **SUBFASE 4.2: Modificar ConversationList** (1 hora)

**Objetivo:** Filtrar conversaciones por producto seleccionado

**Archivos:**
- `src/components/whatsapp/ConversationList.jsx`

**Cambios:**
- Aceptar prop `productId` (UUID o null)
- Si `productId` es null, filtrar por cuentas sin producto
- Si `productId` existe, filtrar por ese producto
- Usar `getConversations({ productId })` o `getConversations({ accountIds })`

**Testing:**
- ✅ Verificar que se filtran conversaciones correctamente
- ✅ Probar cambio de producto
- ✅ Verificar que no se mezclan datos

---

### **SUBFASE 4.3: Modificar ChatWindow** (1 hora)

**Objetivo:** Filtrar mensajes por producto seleccionado

**Archivos:**
- `src/components/whatsapp/ChatWindow.jsx`

**Cambios:**
- Aceptar prop `productId`
- Filtrar mensajes por `productId` (a través de accountId)
- Mostrar información del producto en header (opcional)

**Testing:**
- ✅ Verificar que se filtran mensajes correctamente
- ✅ Probar enviar mensaje desde producto específico

---

### **SUBFASE 4.4: Modificar SequenceConfigurator** (1 hora)

**Objetivo:** Integrar pestañas de productos en Secuencias

**Archivos:**
- `src/components/whatsapp/SequenceConfigurator.jsx`

**Cambios:**
- Integrar `ProductTabs`
- Filtrar secuencias por producto seleccionado
- Crear secuencias para producto específico

**Testing:**
- ✅ Verificar que se filtran secuencias
- ✅ Probar crear secuencia para producto específico

---

### **SUBFASE 4.5: Modificar PuppeteerQueuePanel** (1 hora)

**Objetivo:** Integrar pestañas de productos en Cola Puppeteer

**Archivos:**
- `src/components/whatsapp/PuppeteerQueuePanel.jsx` (si existe)

**Cambios:**
- Integrar `ProductTabs`
- Filtrar cola por producto seleccionado

**Testing:**
- ✅ Verificar que se filtra cola correctamente

---

### **SUBFASE 4.6: Modificar BlockedContactsPanel** (1 hora)

**Objetivo:** Integrar pestañas de productos en Contactos Bloqueados

**Archivos:**
- `src/components/whatsapp/BlockedContactsPanel.jsx` (si existe)

**Cambios:**
- Integrar `ProductTabs`
- Filtrar contactos bloqueados por producto seleccionado

**Testing:**
- ✅ Verificar que se filtran contactos bloqueados

---

## **FASE 5: Testing Final y Ajustes** ⏱️ 2-3 horas

### **SUBFASE 5.1: Testing de Integración** (1.5 horas)

**Objetivo:** Probar todo el flujo completo

**Casos de prueba:**
- ✅ Admin crea cuenta WhatsApp con producto
- ✅ Admin crea cuenta WhatsApp sin producto
- ✅ Admin ve todos los productos en pestañas
- ✅ Vendedora ve solo productos asignados (según `users.productos`)
- ✅ Vendedora ve solo chats de productos asignados
- ✅ Cambio de pestaña filtra correctamente
- ✅ No se mezclan datos entre productos
- ✅ Cuentas sin producto funcionan correctamente

---

### **SUBFASE 5.2: Ajustes y Optimizaciones** (1.5 horas)

**Objetivo:** Ajustar detalles y optimizar rendimiento

**Tareas:**
- ✅ Optimizar queries con índices
- ✅ Agregar loading states
- ✅ Mejorar mensajes de error
- ✅ Ajustar animaciones
- ✅ Verificar responsive design

---

## 📊 **RESUMEN DE FASES AJUSTADAS**

| Fase | Subfases | Tiempo Estimado | Prioridad |
|------|----------|-----------------|-----------|
| **FASE 1** | 2 subfases | 1-2 horas | 🔴 Alta |
| **FASE 2** | 6 subfases | 2-3 horas | 🔴 Alta |
| **FASE 3** | 3 subfases | 3-4 horas | 🔴 Alta |
| **FASE 4** | 6 subfases | 4-5 horas | 🔴 Alta |
| **FASE 5** | 2 subfases | 2-3 horas | 🟢 Baja |

**Tiempo Total Estimado: 12-17 horas**

---

## ✅ **CAMBIOS RESPECTO AL PLAN ORIGINAL**

### **Eliminado:**
- ❌ FASE 5 (Gestión de Asignaciones) - Ya existe en menú "Usuarios"
- ❌ FASE 6 (Integración con Ventas) - No necesario ahora
- ❌ Tabla `user_products` - Ya existe `users.productos`

### **Ajustado:**
- ✅ Usar `users.productos` (array de SKUs) en lugar de tabla separada
- ✅ Convertir SKUs → product_ids para filtrar
- ✅ Funciones SQL para conversión SKU → product_id

---

## 🚀 **ORDEN DE IMPLEMENTACIÓN**

1. **FASE 1** → Base de datos y funciones helper
2. **FASE 2** → Backend servicios
3. **FASE 3** → Componentes base (hooks, tabs)
4. **FASE 4** → Integración en menús
5. **FASE 5** → Testing final

---

## 🔍 **PUNTOS CLAVE**

1. **Conversión SKU → product_id:**
   - `users.productos` = `['CVP-60', 'FLEX-60']` (SKUs)
   - Necesitamos convertir a `[uuid1, uuid2]` (product_ids)
   - Usar función SQL `get_product_ids_from_skus()`

2. **Filtrado:**
   - Obtener SKUs del usuario → Convertir a product_ids → Obtener account_ids → Filtrar consultas

3. **Pestañas:**
   - Mostrar productos asignados al usuario
   - Admin ve todos + "Sin Producto"
   - Seller ve solo asignados

---

**¿Confirmas este plan ajustado antes de iniciar?**

