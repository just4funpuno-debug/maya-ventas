# 🏢 PLAN DETALLADO: Sistema Multi-Producto WhatsApp CRM

## 📋 **CONFIRMACIÓN DE REQUISITOS**

### ✅ **Requisitos Confirmados:**

1. **Creación Manual de Cuentas WhatsApp**
   - ✅ Botón para crear cuenta WhatsApp
   - ✅ Asignar producto al crear (opcional, puede ser NULL)
   - ✅ NO crear automáticamente por producto

2. **Asignación de Productos a Vendedoras**
   - ✅ Admin asigna productos que puede vender cada vendedora
   - ✅ Vendedora solo ve productos asignados
   - ✅ Vendedora solo ve chats/CRM de productos asignados

3. **Organización por Pestañas**
   - ✅ Dentro de cada menú existente (WhatsApp, Secuencias, Chat, Cola, Bloqueados)
   - ✅ Pestañas por producto (no nuevo menú por producto)
   - ✅ Pestaña "Sin Producto" para cuentas sin asignar

4. **Integración con Sistema de Ventas**
   - ✅ Al tener producto asignado, facilitar generar pedido desde chat
   - ✅ Conectar con sistema de ventas existente

5. **Testing por Fases**
   - ✅ Testing después de cada fase/subfase
   - ✅ Garantizar funcionamiento antes de continuar

---

## 🏗️ **ARQUITECTURA PROPUESTA**

### **Estructura de Datos:**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTS (Existente)                      │
│  id, sku, nombre, precio, stock, ...                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ N:M (Nueva tabla)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          USER_PRODUCTS (NUEVA - Asignación)                  │
│  user_id → products que puede vender                         │
│  product_id                                                  │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ 1:N
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              WHATSAPP_ACCOUNTS (Modificar)                   │
│  id, phone_number_id, product_id (NULL permitido), ...       │
│  ⚠️ product_id puede ser NULL (sin producto)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 1:N
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ WHATSAPP_CONTACTS│          │ WHATSAPP_MESSAGES│
│ account_id       │          │ account_id       │
└──────────────────┘          └──────────────────┘
```

### **Flujo de Permisos:**

```
Usuario (Admin o Seller)
  ↓
Obtener productos asignados (user_products)
  ↓
Cargar cuentas WhatsApp de esos productos (whatsapp_accounts WHERE product_id IN (...))
  ↓
Filtrar todas las consultas por account_id
```

---

## 📊 **FASES Y SUBFASES**

---

## **FASE 1: Base de Datos y Permisos** ⏱️ 2-3 horas

### **SUBFASE 1.1: Tabla de Asignación de Productos** (30 min)

**Objetivo:** Crear tabla para asignar productos a vendedoras

**Archivos:**
- `supabase/migrations/010_user_products_schema.sql`

**Cambios:**
```sql
-- Tabla de asignación productos-usuarios
CREATE TABLE IF NOT EXISTS user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_products_user ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product ON user_products(product_id);

-- RLS
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_products_select_all" ON user_products FOR SELECT USING (true);
CREATE POLICY "user_products_admin_all" ON user_products FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.rol = 'admin')
);
```

**Testing:**
- ✅ Verificar que se crea la tabla
- ✅ Verificar índices
- ✅ Verificar RLS

---

### **SUBFASE 1.2: Modificar product_id en whatsapp_accounts** (30 min)

**Objetivo:** Permitir NULL en product_id y agregar índices

**Archivos:**
- `supabase/migrations/011_whatsapp_accounts_product_null.sql`

**Cambios:**
```sql
-- Asegurar que product_id puede ser NULL
ALTER TABLE whatsapp_accounts 
  ALTER COLUMN product_id DROP NOT NULL; -- Si existe constraint

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

### **SUBFASE 1.3: Funciones Helper** (1 hora)

**Objetivo:** Crear funciones SQL para obtener datos filtrados por producto

**Archivos:**
- `supabase/migrations/012_product_functions.sql`

**Funciones:**
```sql
-- Obtener productos asignados a un usuario
CREATE OR REPLACE FUNCTION get_user_products(p_user_id UUID)
RETURNS TABLE(product_id UUID, product_name TEXT, product_sku TEXT) AS $$
  SELECT p.id, p.nombre, p.sku
  FROM products p
  INNER JOIN user_products up ON p.id = up.product_id
  WHERE up.user_id = p_user_id;
$$ LANGUAGE sql;

-- Obtener account_ids por productos (para filtrado)
CREATE OR REPLACE FUNCTION get_account_ids_by_products(p_product_ids UUID[])
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE (product_id = ANY(p_product_ids) OR product_id IS NULL)
    AND active = true;
$$ LANGUAGE sql;

-- Obtener account_ids sin producto
CREATE OR REPLACE FUNCTION get_account_ids_without_product()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE product_id IS NULL AND active = true;
$$ LANGUAGE sql;
```

**Testing:**
- ✅ Probar `get_user_products()` con usuario con productos
- ✅ Probar `get_account_ids_by_products()` con array de productos
- ✅ Probar `get_account_ids_without_product()` con cuentas sin producto

---

### **SUBFASE 1.4: Seed de Datos (Opcional)** (30 min)

**Objetivo:** Si hay datos existentes, asignar productos a cuentas

**Archivos:**
- `supabase/migrations/013_migrate_existing_data.sql`

**Cambios:**
```sql
-- Script para asignar productos a cuentas existentes (si es necesario)
-- Ejemplo: Asignar producto a cuenta si no tiene
-- UPDATE whatsapp_accounts SET product_id = 'uuid-producto' WHERE id = 'uuid-cuenta';
```

**Testing:**
- ✅ Verificar que datos existentes no se rompen
- ✅ Verificar que nuevas cuentas pueden crearse sin producto

---

## **FASE 2: Backend - Servicios** ⏱️ 3-4 horas

### **SUBFASE 2.1: Servicio de User Products** (1 hora)

**Objetivo:** Crear servicio para gestionar asignación productos-usuarios

**Archivos:**
- `src/services/whatsapp/user-products.js`

**Funciones:**
```javascript
- getUserProducts(userId)
- assignProductToUser(userId, productId)
- removeProductFromUser(userId, productId)
- getUsersByProduct(productId)
- getProductsByUser(userId)
```

**Testing:**
- ✅ Unit tests para todas las funciones
- ✅ Probar asignación/eliminación
- ✅ Probar obtener productos de usuario

---

### **SUBFASE 2.2: Modificar accounts.js** (1 hora)

**Objetivo:** Agregar funciones para filtrar por producto

**Archivos:**
- `src/services/whatsapp/accounts.js`

**Funciones nuevas:**
```javascript
- getAccountsByProduct(productId)
- getAccountsWithoutProduct()
- getAccountsByUserProducts(userId) // Obtener cuentas de productos asignados al usuario
```

**Modificaciones:**
- `createAccount()` - Permitir `product_id: null`
- `getAllAccounts()` - Agregar filtro opcional por `productId`

**Testing:**
- ✅ Probar crear cuenta con producto
- ✅ Probar crear cuenta sin producto
- ✅ Probar filtrar por producto
- ✅ Probar obtener cuentas de productos asignados

---

### **SUBFASE 2.3: Modificar conversations.js** (1 hora)

**Objetivo:** Filtrar conversaciones por productos asignados al usuario

**Archivos:**
- `src/services/whatsapp/conversations.js`

**Modificaciones:**
```javascript
- getConversations(options) - Agregar filtro por productIds
- getContactMessages(contactId, accountId) - Ya filtra por accountId ✅
- getLastMessage(contactId) - Ya filtra por contactId ✅
```

**Testing:**
- ✅ Probar obtener conversaciones de un producto específico
- ✅ Probar obtener conversaciones sin producto
- ✅ Probar que no se mezclan datos de diferentes productos

---

### **SUBFASE 2.4: Modificar tags.js** (30 min)

**Objetivo:** Filtrar etiquetas por productos asignados

**Archivos:**
- `src/services/whatsapp/tags.js`

**Modificaciones:**
```javascript
- getAllTags(accountId) - Ya filtra por accountId ✅
- getContactTags(contactId) - Ya filtra por contactId ✅
```

**Testing:**
- ✅ Verificar que etiquetas se filtran correctamente
- ✅ Probar con múltiples productos

---

### **SUBFASE 2.5: Modificar quick-replies.js** (30 min)

**Objetivo:** Filtrar respuestas rápidas por productos asignados

**Archivos:**
- `src/services/whatsapp/quick-replies.js`

**Modificaciones:**
```javascript
- getQuickReplies(accountId) - Ya filtra por accountId ✅
```

**Testing:**
- ✅ Verificar que respuestas rápidas se filtran correctamente

---

### **SUBFASE 2.6: Modificar sequences.js** (30 min)

**Objetivo:** Filtrar secuencias por productos asignados

**Archivos:**
- `src/services/whatsapp/sequences.js`

**Modificaciones:**
```javascript
- getSequences(accountId) - Ya filtra por accountId ✅
```

**Testing:**
- ✅ Verificar que secuencias se filtran correctamente

---

### **SUBFASE 2.7: Modificar puppeteer-queue.js** (30 min)

**Objetivo:** Filtrar cola Puppeteer por productos asignados

**Archivos:**
- `src/services/whatsapp/puppeteer-queue.js`

**Modificaciones:**
```javascript
- getQueueItems(accountId) - Ya filtra por accountId ✅
```

**Testing:**
- ✅ Verificar que cola se filtra correctamente

---

## **FASE 3: Frontend - Componentes Base** ⏱️ 3-4 horas

### **SUBFASE 3.1: Hook useUserProducts** (1 hora)

**Objetivo:** Crear hook para obtener productos asignados al usuario actual

**Archivos:**
- `src/hooks/useUserProducts.js`

**Funcionalidad:**
```javascript
- Obtener usuario actual
- Obtener productos asignados
- Incluir opción "Sin Producto" si es admin
- Cachear resultados
```

**Testing:**
- ✅ Probar con usuario admin (debe ver todos)
- ✅ Probar con usuario seller (solo productos asignados)
- ✅ Probar sin productos asignados

---

### **SUBFASE 3.2: Componente ProductTabs** (1.5 horas)

**Objetivo:** Crear componente de pestañas por producto

**Archivos:**
- `src/components/whatsapp/ProductTabs.jsx`

**Funcionalidad:**
```jsx
- Mostrar pestañas por producto
- Pestaña "Sin Producto" (solo admin)
- Indicador de cantidad de cuentas por producto
- Animaciones con Framer Motion
```

**Props:**
```javascript
{
  products: Array, // Productos asignados
  selectedProductId: string | null,
  onSelectProduct: (productId: string | null) => void,
  showWithoutProduct: boolean // Solo admin
}
```

**Testing:**
- ✅ Verificar que se muestran pestañas correctas
- ✅ Probar cambio de pestaña
- ✅ Verificar animaciones

---

### **SUBFASE 3.3: Modificar WhatsAppAccounts.jsx** (1.5 horas)

**Objetivo:** Agregar selector de producto al crear cuenta

**Archivos:**
- `src/components/whatsapp/WhatsAppAccounts.jsx`

**Cambios:**
- Agregar selector de producto en formulario de creación
- Opción "Sin Producto" en selector
- Mostrar producto asignado en lista de cuentas
- Permitir editar producto de cuenta existente

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
- Filtrar cuentas por producto seleccionado
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
- Aceptar prop `productId`
- Filtrar consultas por `productId`
- Mostrar solo conversaciones del producto seleccionado

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
- Filtrar mensajes por `productId`
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

## **FASE 5: Gestión de Asignación de Productos** ⏱️ 2-3 horas

### **SUBFASE 5.1: Componente UserProductManager** (2 horas)

**Objetivo:** Crear interfaz para que admin asigne productos a vendedoras

**Archivos:**
- `src/components/admin/UserProductManager.jsx`

**Funcionalidad:**
- Lista de usuarios (vendedoras)
- Checkboxes para productos asignados
- Guardar asignaciones
- Mostrar productos asignados por usuario

**Testing:**
- ✅ Probar asignar productos a vendedora
- ✅ Probar quitar productos
- ✅ Verificar que se guarda correctamente

---

### **SUBFASE 5.2: Integrar en Menú Admin** (1 hora)

**Objetivo:** Agregar opción en menú admin para gestionar asignaciones

**Archivos:**
- `src/App.jsx`

**Cambios:**
- Agregar opción "Asignar Productos" en menú admin
- Mostrar `UserProductManager` cuando se selecciona

**Testing:**
- ✅ Verificar que solo admin ve la opción
- ✅ Probar acceso a gestión de asignaciones

---

## **FASE 6: Integración con Sistema de Ventas** ⏱️ 2-3 horas

### **SUBFASE 6.1: Botón "Generar Pedido" en ChatWindow** (1.5 horas)

**Objetivo:** Agregar botón para generar pedido desde chat

**Archivos:**
- `src/components/whatsapp/ChatWindow.jsx`

**Funcionalidad:**
- Botón "Generar Pedido" en header (solo si hay producto asignado)
- Abrir modal/formulario de venta
- Pre-llenar datos del contacto
- Pre-seleccionar producto del chat

**Testing:**
- ✅ Probar generar pedido desde chat con producto
- ✅ Verificar que se pre-llenan datos
- ✅ Verificar que se crea venta correctamente

---

### **SUBFASE 6.2: Integración con SaleForm** (1.5 horas)

**Objetivo:** Conectar formulario de venta con datos del chat

**Archivos:**
- `src/components/SaleForm.jsx` (o componente de venta)

**Cambios:**
- Aceptar props de contacto y producto desde chat
- Pre-llenar formulario
- Validar que producto existe y tiene stock

**Testing:**
- ✅ Probar crear venta desde chat
- ✅ Verificar validaciones
- ✅ Verificar que se actualiza stock

---

## **FASE 7: Testing Final y Ajustes** ⏱️ 2-3 horas

### **SUBFASE 7.1: Testing de Integración** (1.5 horas)

**Objetivo:** Probar todo el flujo completo

**Casos de prueba:**
- ✅ Admin crea cuenta WhatsApp con producto
- ✅ Admin crea cuenta WhatsApp sin producto
- ✅ Admin asigna productos a vendedora
- ✅ Vendedora ve solo productos asignados
- ✅ Vendedora ve solo chats de productos asignados
- ✅ Cambio de pestaña filtra correctamente
- ✅ Generar pedido desde chat funciona
- ✅ No se mezclan datos entre productos

---

### **SUBFASE 7.2: Ajustes y Optimizaciones** (1.5 horas)

**Objetivo:** Ajustar detalles y optimizar rendimiento

**Tareas:**
- ✅ Optimizar queries con índices
- ✅ Agregar loading states
- ✅ Mejorar mensajes de error
- ✅ Ajustar animaciones
- ✅ Verificar responsive design

---

## 📊 **RESUMEN DE FASES**

| Fase | Subfases | Tiempo Estimado | Prioridad |
|------|----------|-----------------|-----------|
| **FASE 1** | 4 subfases | 2-3 horas | 🔴 Alta |
| **FASE 2** | 7 subfases | 3-4 horas | 🔴 Alta |
| **FASE 3** | 3 subfases | 3-4 horas | 🔴 Alta |
| **FASE 4** | 6 subfases | 4-5 horas | 🔴 Alta |
| **FASE 5** | 2 subfases | 2-3 horas | 🟡 Media |
| **FASE 6** | 2 subfases | 2-3 horas | 🟡 Media |
| **FASE 7** | 2 subfases | 2-3 horas | 🟢 Baja |

**Tiempo Total Estimado: 18-25 horas**

---

## ✅ **CHECKLIST DE CONFIRMACIÓN**

Antes de iniciar, confirmar:

- [x] ✅ Creación manual de cuentas WhatsApp (no automática)
- [x] ✅ Asignar producto al crear cuenta (opcional, puede ser NULL)
- [x] ✅ Admin asigna productos a vendedoras
- [x] ✅ Vendedora solo ve productos asignados
- [x] ✅ Organización por pestañas (no nuevos menús)
- [x] ✅ Pestaña "Sin Producto" para cuentas sin asignar
- [x] ✅ Integración con sistema de ventas
- [x] ✅ Testing después de cada fase/subfase

---

## 🚀 **ORDEN DE IMPLEMENTACIÓN**

1. **FASE 1** → Base de datos y permisos
2. **FASE 2** → Backend servicios
3. **FASE 3** → Componentes base (hooks, tabs)
4. **FASE 4** → Integración en menús
5. **FASE 5** → Gestión de asignaciones
6. **FASE 6** → Integración con ventas
7. **FASE 7** → Testing final

---

**¿Confirmas este plan antes de iniciar?**

