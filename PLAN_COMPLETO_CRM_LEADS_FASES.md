# 🚀 PLAN COMPLETO: Implementación CRM de Leads - Por Fases y Subfases

## 📋 Resumen Ejecutivo

**Objetivo:** Implementar un sistema completo de CRM de Leads tipo Kommo con vista Kanban, integrado con el sistema multi-producto existente.

**Duración Estimada Total:** 20-25 horas

---

## ✅ CONFIRMACIONES

### **1. Estructura del Menú**
- ✅ Cambiar "📋 Secuencias" → "📋 CRM"
- ✅ Mantener secuencias separadas dentro del mismo menú "CRM"
- ✅ Luego crear otro menú para "Flujos por Etapa" (futuro)

### **2. Sistema Multi-Producto**
- ✅ Cada producto tiene su propio CRM
- ✅ Cada producto tiene su propio flujo de leads
- ✅ Tabs por producto (como en "Secuencias")
- ✅ Admin ve todos + tab "Todos"
- ✅ Vendedora ve solo productos asignados

### **3. Etapas del Pipeline**
- ✅ Etapas por defecto: "Leads Entrantes", "Seguimiento", "Venta", "Cliente"
- ✅ Posibilidad de cambiar nombres de etapas
- ✅ Posibilidad de añadir/quitar etapas

### **4. Detección de Leads**
- ✅ Manual: Botón para crear lead desde contacto
- ✅ Híbrido: Automática con opción manual (futuro)

---

## 📊 FASE 1: Base de Datos y Schema (3-4 horas)

### **SUBFASE 1.1: Tablas de Leads** (1.5 horas)

**Objetivo:** Crear tablas principales para gestión de leads

**Archivo:** `supabase/migrations/013_whatsapp_leads_schema.sql`

**Tablas a crear:**

```sql
-- 1. Tabla principal de leads
CREATE TABLE whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Para filtrado multi-producto
  pipeline_stage TEXT NOT NULL DEFAULT 'entrantes', -- Etapa actual del lead
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  source TEXT DEFAULT 'whatsapp', -- 'whatsapp', 'web', 'referido', 'manual'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'archived')),
  estimated_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de actividades del lead
CREATE TABLE whatsapp_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES whatsapp_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'call', 'note', 'task', 'meeting', 'stage_change')),
  content TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB, -- Para datos adicionales (duración de llamada, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de pipelines personalizados
CREATE TABLE whatsapp_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Pipeline por producto
  name TEXT NOT NULL,
  stages JSONB NOT NULL, -- [{name: string, order: number, color: string}]
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
```sql
CREATE INDEX idx_leads_contact ON whatsapp_leads(contact_id);
CREATE INDEX idx_leads_account ON whatsapp_leads(account_id);
CREATE INDEX idx_leads_product ON whatsapp_leads(product_id);
CREATE INDEX idx_leads_stage ON whatsapp_leads(pipeline_stage);
CREATE INDEX idx_leads_status ON whatsapp_leads(status);
CREATE INDEX idx_leads_assigned ON whatsapp_leads(assigned_to);
CREATE INDEX idx_leads_activity ON whatsapp_leads(last_activity_at);
CREATE INDEX idx_activities_lead ON whatsapp_lead_activities(lead_id);
CREATE INDEX idx_pipelines_product ON whatsapp_pipelines(product_id);
```

**RLS Policies:**
```sql
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_pipelines ENABLE ROW LEVEL SECURITY;

-- Policies permisivas iniciales (ajustar según necesidades)
CREATE POLICY "leads_select_all" ON whatsapp_leads FOR SELECT USING (true);
CREATE POLICY "leads_insert_all" ON whatsapp_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_update_all" ON whatsapp_leads FOR UPDATE USING (true);
CREATE POLICY "leads_delete_all" ON whatsapp_leads FOR DELETE USING (true);

-- Similar para activities y pipelines
```

**Testing:**
- ✅ Verificar creación de tablas
- ✅ Verificar índices
- ✅ Verificar RLS policies
- ✅ Probar insertar lead de prueba

---

### **SUBFASE 1.2: Funciones SQL Helper** (1 hora)

**Objetivo:** Crear funciones SQL para operaciones comunes

**Archivo:** `supabase/migrations/014_whatsapp_leads_functions.sql`

**Funciones:**

```sql
-- 1. Obtener leads por producto
CREATE OR REPLACE FUNCTION get_leads_by_product_id(
  p_product_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  account_id UUID,
  pipeline_stage TEXT,
  lead_score INTEGER,
  assigned_to UUID,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.contact_id,
    l.account_id,
    l.pipeline_stage,
    l.lead_score,
    l.assigned_to,
    l.last_activity_at,
    l.created_at
  FROM whatsapp_leads l
  WHERE l.product_id = p_product_id
    AND l.status = p_status
  ORDER BY l.last_activity_at DESC NULLS LAST, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Contar leads por etapa y producto
CREATE OR REPLACE FUNCTION count_leads_by_stage(
  p_product_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.pipeline_stage,
    COUNT(*)::BIGINT
  FROM whatsapp_leads l
  WHERE l.product_id = p_product_id
    AND l.status = p_status
  GROUP BY l.pipeline_stage;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar última actividad del lead
CREATE OR REPLACE FUNCTION update_lead_activity(
  p_lead_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_leads
  SET last_activity_at = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;
```

**Testing:**
- ✅ Probar funciones con datos de prueba
- ✅ Verificar rendimiento con índices

---

### **SUBFASE 1.3: Datos Iniciales (Pipeline por Defecto)** (0.5 horas)

**Objetivo:** Crear pipeline por defecto para cada producto

**Archivo:** `supabase/migrations/015_default_pipelines.sql`

**Script:**
```sql
-- Crear pipeline por defecto para cada producto activo
INSERT INTO whatsapp_pipelines (account_id, product_id, name, stages, is_default)
SELECT 
  NULL as account_id, -- Pipeline global por producto
  p.id as product_id,
  'Pipeline por Defecto' as name,
  '[
    {"name": "Leads Entrantes", "order": 1, "color": "#3b82f6"},
    {"name": "Seguimiento", "order": 2, "color": "#f59e0b"},
    {"name": "Venta", "order": 3, "color": "#10b981"},
    {"name": "Cliente", "order": 4, "color": "#8b5cf6"}
  ]'::jsonb as stages,
  true as is_default
FROM products p
WHERE p.sintetico = false OR p.sintetico IS NULL
ON CONFLICT DO NOTHING;
```

**Testing:**
- ✅ Verificar creación de pipelines por defecto
- ✅ Verificar que se crean para todos los productos no sintéticos

---

## 📊 FASE 2: Backend Services (4-5 horas)

### **SUBFASE 2.1: Servicio de Leads** (2 horas)

**Objetivo:** Crear servicio completo para gestión de leads

**Archivo:** `src/services/whatsapp/leads.js`

**Funciones a implementar:**

```javascript
// Obtener leads por producto (con filtrado multi-producto)
export async function getLeadsByProduct(productId, userSkus, options = {}) {
  // Filtrar por productId y userSkus
  // Retornar leads con información de contacto
}

// Obtener lead por ID
export async function getLeadById(leadId) {
  // Retornar lead completo con actividades
}

// Crear lead manualmente
export async function createLead(leadData) {
  // contact_id, account_id, product_id, pipeline_stage, etc.
  // Crear actividad inicial
}

// Actualizar lead (cambiar etapa, asignar, etc.)
export async function updateLead(leadId, updates) {
  // Actualizar campos
  // Crear actividad de cambio de etapa si aplica
}

// Mover lead a otra etapa
export async function moveLeadToStage(leadId, newStage) {
  // Actualizar pipeline_stage
  // Crear actividad de tipo 'stage_change'
}

// Eliminar lead (soft delete)
export async function deleteLead(leadId) {
  // Cambiar status a 'archived'
}

// Obtener actividades de un lead
export async function getLeadActivities(leadId) {
  // Retornar todas las actividades ordenadas por fecha
}

// Agregar actividad a un lead
export async function addLeadActivity(leadId, activityData) {
  // Crear actividad
  // Actualizar last_activity_at del lead
}

// Obtener contadores por etapa
export async function getLeadCountsByStage(productId, userSkus) {
  // Usar función SQL count_leads_by_stage
}

// Buscar leads
export async function searchLeads(productId, userSkus, searchTerm) {
  // Búsqueda por nombre de contacto, teléfono, notas
}
```

**Testing:**
- ✅ Tests unitarios para cada función
- ✅ Verificar filtrado por producto
- ✅ Verificar permisos por userSkus

---

### **SUBFASE 2.2: Servicio de Pipelines** (1.5 horas)

**Objetivo:** Crear servicio para gestión de pipelines

**Archivo:** `src/services/whatsapp/pipelines.js`

**Funciones:**

```javascript
// Obtener pipeline por producto
export async function getPipelineByProduct(productId) {
  // Retornar pipeline por defecto o personalizado
}

// Crear pipeline personalizado
export async function createPipeline(pipelineData) {
  // product_id, name, stages (JSON)
}

// Actualizar pipeline
export async function updatePipeline(pipelineId, updates) {
  // Actualizar nombre y/o etapas
}

// Eliminar pipeline
export async function deletePipeline(pipelineId) {
  // Solo si no es el default
}

// Obtener todas las etapas de un pipeline
export async function getPipelineStages(productId) {
  // Retornar array de etapas con orden y color
}
```

**Testing:**
- ✅ Tests unitarios
- ✅ Verificar validación de etapas

---

### **SUBFASE 2.3: Integración con Contactos** (1 hora)

**Objetivo:** Funciones para crear leads desde contactos

**Archivo:** `src/services/whatsapp/leads.js` (extender)

**Funciones adicionales:**

```javascript
// Crear lead desde contacto
export async function createLeadFromContact(contactId, productId, accountId) {
  // Verificar si ya existe lead para este contacto
  // Si no existe, crear nuevo lead
  // Si existe, retornar lead existente
}

// Verificar si contacto tiene lead
export async function contactHasLead(contactId, productId) {
  // Retornar true/false
}

// Obtener lead de un contacto
export async function getLeadByContact(contactId, productId) {
  // Retornar lead si existe
}
```

**Testing:**
- ✅ Verificar creación desde contacto
- ✅ Verificar duplicados

---

## 📊 FASE 3: Componente CRM Principal (6-7 horas)

### **SUBFASE 3.1: Refactorizar SequenceConfigurator** (1 hora)

**Objetivo:** Renombrar y reorganizar componente para incluir tabs

**Archivo:** `src/components/whatsapp/CRM.jsx` (nuevo, reemplaza SequenceConfigurator)

**Cambios:**
- ✅ Renombrar componente a `CRM`
- ✅ Agregar tabs: "Leads" y "Secuencias"
- ✅ Mantener funcionalidad de secuencias en tab "Secuencias"
- ✅ Crear estructura para tab "Leads"

**Estructura:**
```jsx
<CRM>
  <ProductTabs /> {/* Tabs por producto */}
  <Tabs>
    <Tab "Leads"> {/* Nueva funcionalidad */}
    <Tab "Secuencias"> {/* Funcionalidad existente */}
  </Tabs>
</CRM>
```

**Testing:**
- ✅ Verificar que secuencias siguen funcionando
- ✅ Verificar tabs de productos
- ✅ Verificar navegación entre tabs

---

### **SUBFASE 3.2: Vista Kanban de Leads** (3 horas)

**Objetivo:** Implementar vista Kanban completa con drag & drop

**Archivo:** `src/components/whatsapp/LeadsKanban.jsx`

**Características:**
- ✅ Columnas dinámicas según pipeline del producto
- ✅ Tarjetas de leads arrastrables
- ✅ Contadores por columna
- ✅ Filtrado por producto (usar tabs)
- ✅ Búsqueda de leads
- ✅ Filtros adicionales (asignado a, fecha, etc.)

**Librería para drag & drop:**
- Usar `@dnd-kit/core` o `react-beautiful-dnd`

**Componentes:**
```jsx
<LeadsKanban>
  <KanbanHeader /> {/* Búsqueda, filtros */}
  <KanbanBoard>
    {stages.map(stage => (
      <KanbanColumn key={stage.name}>
        <ColumnHeader count={count} />
        <Droppable>
          {leads.map(lead => (
            <LeadCard key={lead.id} draggable />
          ))}
        </Droppable>
      </KanbanColumn>
    ))}
  </KanbanBoard>
</LeadsKanban>
```

**Testing:**
- ✅ Verificar drag & drop funciona
- ✅ Verificar actualización de etapa
- ✅ Verificar contadores
- ✅ Verificar filtros

---

### **SUBFASE 3.3: Tarjeta de Lead** (1 hora)

**Objetivo:** Componente para mostrar información del lead

**Archivo:** `src/components/whatsapp/LeadCard.jsx`

**Información a mostrar:**
- ✅ Avatar del contacto
- ✅ Nombre del contacto
- ✅ Teléfono
- ✅ Última actividad
- ✅ Lead score (opcional)
- ✅ Valor estimado (opcional)
- ✅ Asignado a (opcional)
- ✅ Etiquetas (opcional)

**Interacciones:**
- ✅ Click para abrir detalle
- ✅ Hover para mostrar acciones rápidas

**Testing:**
- ✅ Verificar renderizado correcto
- ✅ Verificar interacciones

---

### **SUBFASE 3.4: Modal de Detalle de Lead** (1.5 horas)

**Objetivo:** Modal completo con información del lead

**Archivo:** `src/components/whatsapp/LeadDetailModal.jsx`

**Secciones:**
- ✅ Información del contacto
- ✅ Historial de conversaciones (WhatsApp)
- ✅ Actividades del lead (timeline)
- ✅ Notas y comentarios
- ✅ Cambiar etapa manualmente
- ✅ Asignar a vendedora
- ✅ Valor estimado
- ✅ Botón "Crear Venta" (integrar con sistema de ventas)

**Testing:**
- ✅ Verificar todas las secciones
- ✅ Verificar acciones (asignar, cambiar etapa, etc.)

---

### **SUBFASE 3.5: Botón "Crear Lead"** (0.5 horas)

**Objetivo:** Botón para crear lead manualmente desde contacto

**Ubicación:** 
- En `ChatWindow` (botón en header del contacto)
- En `ConversationList` (acción en cada conversación)

**Funcionalidad:**
- ✅ Abrir modal para seleccionar producto
- ✅ Crear lead automáticamente
- ✅ Mostrar confirmación

**Testing:**
- ✅ Verificar creación desde chat
- ✅ Verificar creación desde lista

---

## 📊 FASE 4: Gestión de Pipelines (2-3 horas)

### **SUBFASE 4.1: Configurador de Pipelines** (2 horas)

**Objetivo:** Permitir personalizar etapas del pipeline

**Archivo:** `src/components/whatsapp/PipelineConfigurator.jsx`

**Funcionalidades:**
- ✅ Ver etapas actuales del pipeline
- ✅ Cambiar nombre de etapa
- ✅ Cambiar color de etapa
- ✅ Reordenar etapas (drag & drop)
- ✅ Agregar nueva etapa
- ✅ Eliminar etapa (con validación: no eliminar si hay leads)
- ✅ Restaurar pipeline por defecto

**UI:**
```jsx
<PipelineConfigurator>
  <StageList>
    {stages.map(stage => (
      <StageItem editable />
    ))}
  </StageList>
  <AddStageButton />
  <SaveButton />
</PipelineConfigurator>
```

**Testing:**
- ✅ Verificar edición de etapas
- ✅ Verificar validaciones
- ✅ Verificar guardado

---

### **SUBFASE 4.2: Integración en CRM** (1 hora)

**Objetivo:** Agregar botón para configurar pipeline en el CRM

**Cambios:**
- ✅ Botón "Configurar Pipeline" en header del CRM
- ✅ Abrir modal con PipelineConfigurator
- ✅ Actualizar vista Kanban cuando se guarda

**Testing:**
- ✅ Verificar actualización en tiempo real

---

## 📊 FASE 5: Integración y Mejoras (3-4 horas)

### **SUBFASE 5.1: Integración con Chat WhatsApp** (1.5 horas)

**Objetivo:** Mostrar información del lead en el chat

**Cambios en `ChatWindow.jsx`:**
- ✅ Mostrar etapa del lead en header (si existe)
- ✅ Botón para cambiar etapa desde el chat
- ✅ Mostrar actividades del lead
- ✅ Botón "Ver en CRM" que abre el detalle

**Testing:**
- ✅ Verificar visualización
- ✅ Verificar acciones

---

### **SUBFASE 5.2: Integración con Sistema de Ventas** (1 hora)

**Objetivo:** Conectar leads con ventas

**Funcionalidades:**
- ✅ Botón "Crear Venta" en detalle del lead
- ✅ Al crear venta, actualizar lead a etapa "Cliente" o "Venta"
- ✅ Mostrar ventas relacionadas en detalle del lead
- ✅ Calcular valor real del lead (suma de ventas)

**Testing:**
- ✅ Verificar creación de venta desde lead
- ✅ Verificar actualización de etapa

---

### **SUBFASE 5.3: Contadores y Métricas Básicas** (1 hora)

**Objetivo:** Mostrar métricas en el CRM

**Métricas a mostrar:**
- ✅ Total de leads por producto
- ✅ Leads por etapa (ya en columnas)
- ✅ Leads asignados a mí (para vendedoras)
- ✅ Leads sin asignar
- ✅ Valor total estimado del pipeline

**UI:**
- ✅ Cards de métricas en header del CRM
- ✅ Actualización en tiempo real

**Testing:**
- ✅ Verificar cálculos correctos
- ✅ Verificar actualización

---

### **SUBFASE 5.4: Cambio de Nombre del Menú** (0.5 horas)

**Objetivo:** Cambiar "Secuencias" → "CRM" en App.jsx

**Cambios:**
- ✅ Cambiar texto del botón
- ✅ Cambiar view de 'whatsapp-sequences' a 'whatsapp-crm' (opcional, mantener por compatibilidad)
- ✅ Actualizar imports si es necesario

**Testing:**
- ✅ Verificar navegación
- ✅ Verificar que todo sigue funcionando

---

## 📊 FASE 6: Testing y Ajustes Finales (2-3 horas)

### **SUBFASE 6.1: Testing Manual Completo** (1.5 horas)

**Checklist:**
- ✅ Crear lead manualmente desde contacto
- ✅ Mover lead entre etapas (drag & drop)
- ✅ Ver detalle del lead
- ✅ Agregar nota/actividad
- ✅ Asignar lead a vendedora
- ✅ Cambiar nombre de etapa
- ✅ Agregar/quitar etapa
- ✅ Filtrar por producto
- ✅ Búsqueda de leads
- ✅ Crear venta desde lead
- ✅ Verificar permisos (admin vs vendedora)

---

### **SUBFASE 6.2: Ajustes de UI/UX** (1 hora)

**Mejoras:**
- ✅ Animaciones suaves en drag & drop
- ✅ Loading states
- ✅ Mensajes de error claros
- ✅ Confirmaciones para acciones importantes
- ✅ Responsive design (móvil y desktop)

---

### **SUBFASE 6.3: Documentación** (0.5 horas)

**Documentos a crear:**
- ✅ `GUIA_USO_CRM_LEADS.md` - Guía de usuario
- ✅ `GUIA_TECNICA_CRM_LEADS.md` - Guía técnica
- ✅ Actualizar documentación general

---

## 📊 RESUMEN DE FASES

| Fase | Subfases | Duración | Prioridad |
|------|----------|----------|-----------|
| **FASE 1** | 3 subfases | 3-4 horas | 🔴 Alta |
| **FASE 2** | 3 subfases | 4-5 horas | 🔴 Alta |
| **FASE 3** | 5 subfases | 6-7 horas | 🔴 Alta |
| **FASE 4** | 2 subfases | 2-3 horas | 🟡 Media |
| **FASE 5** | 4 subfases | 3-4 horas | 🟡 Media |
| **FASE 6** | 3 subfases | 2-3 horas | 🟢 Baja |

**Duración Total Estimada: 20-26 horas**

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

1. **FASE 1** → Base de datos (fundación)
2. **FASE 2** → Backend services (lógica de negocio)
3. **FASE 3** → Componentes principales (UI)
4. **FASE 4** → Gestión de pipelines (personalización)
5. **FASE 5** → Integraciones (conectar con sistema existente)
6. **FASE 6** → Testing y ajustes (pulir)

---

## ✅ CHECKLIST FINAL

### **Funcionalidades Core:**
- ✅ Vista Kanban con drag & drop
- ✅ Crear lead manualmente
- ✅ Mover lead entre etapas
- ✅ Ver detalle del lead
- ✅ Filtrar por producto
- ✅ Personalizar etapas del pipeline
- ✅ Integración con contactos de WhatsApp
- ✅ Integración con sistema de ventas

### **Sistema Multi-Producto:**
- ✅ Cada producto tiene su propio CRM
- ✅ Tabs por producto
- ✅ Filtrado correcto por permisos

### **UI/UX:**
- ✅ Interfaz intuitiva
- ✅ Responsive
- ✅ Animaciones suaves
- ✅ Mensajes claros

---

## 🚀 PRÓXIMOS PASOS (Futuro)

### **FASE 7: Automatización** (Opcional)
- Detección automática de leads
- Clasificación automática por palabras clave
- Asignación automática

### **FASE 8: Flujos por Etapa** (Nuevo Menú)
- Crear flujos automatizados para cada etapa
- Secuencias automáticas según etapa
- Reglas de negocio personalizables

### **FASE 9: Métricas Avanzadas**
- Dashboard completo de métricas
- Reportes de conversión
- Análisis de rendimiento

---

**¿Confirmas este plan completo antes de iniciar?**

