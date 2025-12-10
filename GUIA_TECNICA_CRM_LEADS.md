# 🔧 Guía Técnica - CRM de Leads

## 📋 Arquitectura

### Estructura de Componentes

```
CRM.jsx (Componente principal)
├── LeadsKanban.jsx (Vista Kanban de leads)
│   ├── LeadDetailModal.jsx (Modal de detalle)
│   ├── CreateLeadModal.jsx (Modal crear lead)
│   └── PipelineConfigurator.jsx (Configurador de pipeline)
└── SequenceConfigurator.jsx (Gestión de secuencias)
```

### Servicios Backend

- **`src/services/whatsapp/leads.js`**
  - CRUD de leads
  - Gestión de actividades
  - Estadísticas y búsqueda

- **`src/services/whatsapp/pipelines.js`**
  - Gestión de pipelines
  - Configuración de etapas

- **`src/services/whatsapp/sales-integration.js`**
  - Integración con sistema de ventas
  - Obtener ventas de contactos

---

## 🗄️ Base de Datos

### Tablas Principales

#### `whatsapp_leads`
```sql
- id (UUID)
- contact_id (UUID) → whatsapp_contacts
- account_id (UUID) → whatsapp_accounts
- product_id (UUID) → products/almacen_central
- pipeline_stage (TEXT)
- lead_score (INTEGER 0-100)
- source (TEXT: 'whatsapp', 'web', 'referido', 'manual')
- assigned_to (UUID) → users
- status (TEXT: 'active', 'won', 'lost', 'archived')
- estimated_value (NUMERIC)
- notes (TEXT)
- last_activity_at (TIMESTAMPTZ)
- created_at, updated_at
```

#### `whatsapp_lead_activities`
```sql
- id (UUID)
- lead_id (UUID) → whatsapp_leads
- type (TEXT: 'message', 'call', 'note', 'task', 'meeting', 'stage_change')
- content (TEXT)
- user_id (UUID) → users
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

#### `whatsapp_pipelines`
```sql
- id (UUID)
- account_id (UUID) → whatsapp_accounts
- product_id (UUID) → products/almacen_central
- name (TEXT)
- stages (JSONB) -- Array de {name, order, color}
- is_default (BOOLEAN)
- created_at, updated_at
```

### Funciones SQL Helper

- `get_leads_by_product_id()` - Obtener leads por producto
- `count_leads_by_stage()` - Contar leads por etapa
- `update_lead_activity()` - Actualizar última actividad
- `contact_has_lead()` - Verificar si contacto tiene lead
- `get_lead_by_contact()` - Obtener lead de contacto
- `get_lead_stats_by_product()` - Estadísticas de leads

---

## 🔄 Flujos de Datos

### Crear Lead

1. Usuario hace click en "Crear Lead"
2. Selecciona contacto, cuenta, producto
3. `createLead()` → Inserta en `whatsapp_leads`
4. Crea actividad inicial automática
5. Actualiza métricas y recarga Kanban

### Mover Lead entre Etapas

1. Usuario arrastra tarjeta
2. `moveLeadToStage()` → Actualiza `pipeline_stage`
3. Crea actividad de tipo `stage_change`
4. Actualiza `last_activity_at`
5. Recarga Kanban y métricas

### Agregar Actividad

1. Usuario agrega actividad en modal
2. `addLeadActivity()` → Inserta en `whatsapp_lead_activities`
3. Actualiza `last_activity_at` del lead
4. Recarga lista de actividades

---

## 🎨 Componentes Principales

### LeadsKanban.jsx

**Props:**
- `session` - Sesión del usuario

**Estados:**
- `selectedProductId` - Producto seleccionado
- `stages` - Etapas del pipeline
- `leads` - Lista de leads
- `leadCounts` - Contadores por etapa
- `leadStats` - Estadísticas generales

**Funciones:**
- `loadPipelineAndLeads()` - Cargar pipeline y leads
- `handleDragStart()` - Inicio de drag
- `handleDrop()` - Drop de lead en nueva etapa
- `formatDate()` - Formatear fechas

### LeadDetailModal.jsx

**Props:**
- `leadId` - ID del lead
- `productId` - ID del producto
- `onClose` - Callback cerrar
- `onUpdate` - Callback actualizar
- `session` - Sesión del usuario

**Estados:**
- `lead` - Datos del lead
- `activities` - Lista de actividades
- `sales` - Lista de ventas
- `editing` - Modo edición

**Funciones:**
- `loadLead()` - Cargar datos del lead
- `loadActivities()` - Cargar actividades
- `loadSales()` - Cargar ventas
- `handleSave()` - Guardar cambios
- `handleAddActivity()` - Agregar actividad

### CreateLeadModal.jsx

**Props:**
- `productId` - ID del producto
- `selectedProductId` - Producto seleccionado
- `onClose` - Callback cerrar
- `onSuccess` - Callback éxito
- `session` - Sesión del usuario
- `preSelectedContactId` - Contacto pre-seleccionado
- `preSelectedAccountId` - Cuenta pre-seleccionada

**Funciones:**
- `loadContacts()` - Cargar contactos disponibles
- `loadAccounts()` - Cargar cuentas WhatsApp
- `handleCreateLead()` - Crear lead

### PipelineConfigurator.jsx

**Props:**
- `productId` - ID del producto
- `onClose` - Callback cerrar
- `onUpdate` - Callback actualizar
- `session` - Sesión del usuario

**Funciones:**
- `loadPipeline()` - Cargar pipeline actual
- `handleSave()` - Guardar cambios
- `handleAddStage()` - Agregar etapa
- `handleDeleteStage()` - Eliminar etapa
- `handleMoveStage()` - Reordenar etapas
- `handleRestoreDefault()` - Restaurar por defecto

---

## 🔐 Seguridad y Permisos

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS:
- **Permisivas:** Todos los usuarios autenticados pueden leer/escribir
- **Futuro:** Se pueden agregar políticas más restrictivas por rol

### Filtrado Multi-producto

- Usuarios no-admin: Solo ven leads de sus productos asignados
- Admins: Ven todos los leads
- Filtrado se hace mediante `userSkus` y funciones SQL helper

---

## 🚀 Optimizaciones

### Carga de Datos

- **Lazy Loading:** Las ventas se cargan solo cuando se abre el modal
- **Caché:** Los productos se cargan una vez al inicio
- **Actualización Selectiva:** Solo se recargan datos necesarios después de cambios

### Rendimiento

- **Índices:** Todas las tablas tienen índices en campos clave
- **Paginación:** Los leads se limitan a 100 por defecto
- **Debounce:** La búsqueda de contactos tiene debounce implícito

---

## 🐛 Troubleshooting

### Error: "No se puede cargar el pipeline"

**Causa:** No existe pipeline por defecto para el producto

**Solución:** 
1. Click en "Pipeline" → "Restaurar por Defecto"
2. O crear pipeline manualmente

### Error: "Lead no encontrado"

**Causa:** El lead fue eliminado o no tienes permisos

**Solución:** Verificar permisos y que el lead existe

### Error: "No se pueden cargar las ventas"

**Causa:** La función `get_contact_sales` no existe o hay error en la tabla

**Solución:** Verificar que la migración 006 se ejecutó correctamente

---

## 📝 Notas de Desarrollo

### Drag & Drop

- Usa HTML5 Drag & Drop API nativo
- No requiere librerías externas
- Funciona en todos los navegadores modernos

### Actualización de Métricas

- Se recargan automáticamente después de:
  - Crear lead
  - Mover lead
  - Actualizar lead
  - Cambiar producto

### Integración con Ventas

- Las ventas se obtienen mediante `get_contact_sales` RPC
- Se calcula el total automáticamente
- Se muestra comparación con valor estimado

---

**Fecha:** 2025-01-30

