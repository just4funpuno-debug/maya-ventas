# FASE 3: Frontend - Componentes - Plan Detallado

## 📋 Objetivo
Modificar los componentes frontend para integrar el filtrado por productos, obtener `session.productos` del usuario, pasar `userSkus` a los servicios, y agregar tabs por productos en los menús principales.

---

## 🔍 Análisis Previo

### Información del Usuario
- Los usuarios tienen `session.productos` (array de SKUs) en `App.jsx`
- `session` se pasa como prop a los componentes
- Necesitamos obtener `session.productos` y pasarlo a los servicios

### Componentes a Modificar
1. **WhatsAppDashboard.jsx** - Dashboard principal
2. **ConversationList.jsx** - Lista de conversaciones
3. **ChatWindow.jsx** - Ventana de chat
4. **AccountList.jsx** - Lista de cuentas
5. **SequenceConfigurator.jsx** - Configurador de secuencias
6. **PuppeteerQueuePanel.jsx** - Panel de cola Puppeteer
7. **BlockedContactsPanel.jsx** - Panel de contactos bloqueados

### Menús que Necesitan Tabs
- "Chat WhatsApp" - Tabs por producto
- "Secuencias" - Tabs por producto
- "Cola Puppeteer" - Tabs por producto
- "Contactos Bloqueados" - Tabs por producto
- "WhatsApp" (cuentas) - Tabs por producto

---

## 📦 SUBFASE 3.1: Helper para Obtener userSkus (30 min)

### Objetivo:
Crear un helper/utility para obtener `userSkus` del usuario de manera consistente.

### Cambios:
1. Crear `src/utils/whatsapp/user-products.js`:
   - Función `getUserSkus(session)` que retorna `session?.productos || null`
   - Función `isAdmin(session)` que retorna `session?.rol === 'admin'`
   - Helper para determinar si mostrar todos los productos o filtrar

### Testing:
- ✅ Retorna SKUs del usuario correctamente
- ✅ Retorna `null` si es admin
- ✅ Retorna `null` si no hay productos asignados

---

## 📦 SUBFASE 3.2: Modificar Componentes Principales (2 horas)

### Componentes a Modificar:

#### 1. WhatsAppDashboard.jsx
- ✅ Obtener `userSkus` del `session`
- ✅ Pasar `userSkus` a `getAllAccounts(userSkus)`
- ✅ Filtrar cuentas mostradas por productos
- ✅ Agregar tabs por productos en el header

#### 2. ConversationList.jsx
- ✅ Obtener `userSkus` del `session` (vía props)
- ✅ Pasar `userSkus` a `getConversations({ userSkus, ... })`
- ✅ Mostrar solo conversaciones de productos asignados

#### 3. ChatWindow.jsx
- ✅ Obtener `userSkus` del `session` (vía props)
- ✅ Pasar `userSkus` a `getContactMessages(contactId, { userSkus, ... })`
- ✅ Pasar `userSkus` a `getLastMessage(contactId, userSkus)`

#### 4. AccountList.jsx / WhatsAppAccountManager.jsx
- ✅ Obtener `userSkus` del `session`
- ✅ Pasar `userSkus` a `getAllAccounts(userSkus)`
- ✅ Agregar tabs por productos

### Testing:
- ✅ Cada componente pasa `userSkus` correctamente
- ✅ Los datos se filtran por productos
- ✅ Admin ve todos los datos

---

## 📦 SUBFASE 3.3: Agregar Tabs por Productos (1.5 horas)

### Objetivo:
Agregar tabs por productos en los menús principales para navegar entre productos.

### Componentes a Modificar:

#### 1. WhatsAppDashboard.jsx
- ✅ Agregar tabs en el header para seleccionar producto
- ✅ Tab "Todos" para admin
- ✅ Tabs individuales por producto asignado
- ✅ Filtrar datos según tab seleccionado

#### 2. SequenceConfigurator.jsx
- ✅ Agregar tabs por productos
- ✅ Filtrar secuencias por producto seleccionado

#### 3. PuppeteerQueuePanel.jsx
- ✅ Agregar tabs por productos
- ✅ Filtrar cola por producto seleccionado

#### 4. BlockedContactsPanel.jsx
- ✅ Agregar tabs por productos
- ✅ Filtrar contactos bloqueados por producto seleccionado

#### 5. WhatsAppAccountManager.jsx
- ✅ Agregar tabs por productos
- ✅ Filtrar cuentas por producto seleccionado

### Diseño de Tabs:
```jsx
<div className="flex gap-2 border-b border-neutral-700">
  {isAdmin && (
    <button onClick={() => setSelectedProduct(null)}>
      Todos
    </button>
  )}
  {userProducts.map(product => (
    <button 
      key={product.id}
      onClick={() => setSelectedProduct(product.id)}
    >
      {product.sku} - {product.name}
    </button>
  ))}
</div>
```

### Testing:
- ✅ Tabs se muestran correctamente
- ✅ Filtrado funciona al cambiar de tab
- ✅ Admin ve tab "Todos"

---

## 📦 SUBFASE 3.4: Modificar Otros Componentes (1 hora)

### Componentes Adicionales:

#### 1. SequenceConfigurator.jsx
- ✅ Pasar `userSkus` a `getSequences(accountId, userSkus)`
- ✅ Verificar permisos al crear/editar secuencias

#### 2. PuppeteerQueuePanel.jsx
- ✅ Pasar `userSkus` a `getQueueMessages({ userSkus, ... })`
- ✅ Pasar `userSkus` a `getQueueStats(accountId, userSkus)`

#### 3. BlockedContactsPanel.jsx
- ✅ Pasar `userSkus` a `getBlockedContacts({ userSkus, ... })`
- ✅ Pasar `userSkus` a `getSuspiciousContacts({ userSkus, ... })`

### Testing:
- ✅ Todos los componentes pasan `userSkus`
- ✅ Filtrado funciona correctamente

---

## 📦 SUBFASE 3.5: Testing y Ajustes Finales (1 hora)

### Testing:
1. **Testing Manual:**
   - ✅ Login como admin - ver todos los datos
   - ✅ Login como vendedora - ver solo productos asignados
   - ✅ Cambiar entre tabs de productos
   - ✅ Verificar que no se muestran datos de otros productos

2. **Testing de Integración:**
   - ✅ Flujo completo: login → seleccionar producto → ver datos filtrados
   - ✅ Verificar que los servicios reciben `userSkus` correctamente

3. **Ajustes:**
   - ✅ Corregir cualquier error visual
   - ✅ Mejorar UX de los tabs
   - ✅ Asegurar que el filtrado es consistente

---

## 📝 Notas de Implementación

### Patrón para Obtener userSkus:
```javascript
import { getUserSkus, isAdmin } from '../../utils/whatsapp/user-products';

// En el componente
const userSkus = getUserSkus(session);
const admin = isAdmin(session);
```

### Patrón para Pasar a Servicios:
```javascript
// Antes
const { data } = await getAllAccounts();

// Después
const { data } = await getAllAccounts(userSkus);
```

### Patrón para Tabs:
```javascript
const [selectedProductId, setSelectedProductId] = useState(null);

// Obtener productos del usuario
const userProducts = await getProductsForUser(session);

// Filtrar por producto seleccionado
const filteredData = selectedProductId 
  ? data.filter(item => item.product_id === selectedProductId)
  : data;
```

---

## ✅ Criterios de Éxito

1. ✅ Todos los componentes obtienen `userSkus` del `session`
2. ✅ Todos los servicios reciben `userSkus` como parámetro
3. ✅ Los datos se filtran correctamente por productos
4. ✅ Los tabs por productos funcionan en todos los menús
5. ✅ Admin puede ver todos los datos (sin filtro)
6. ✅ Usuarios solo ven datos de sus productos asignados
7. ✅ No se rompe funcionalidad existente

---

## 🚀 Orden de Implementación

1. **SUBFASE 3.1**: Helper para obtener userSkus
2. **SUBFASE 3.2**: Modificar componentes principales
3. **SUBFASE 3.3**: Agregar tabs por productos
4. **SUBFASE 3.4**: Modificar otros componentes
5. **SUBFASE 3.5**: Testing y ajustes finales

---

**Tiempo Estimado Total**: 5-6 horas

