# 📋 Propuesta: Leads Entrantes Automático y Protección de Etapa

## 🎯 Objetivos

1. **Crear leads automáticamente** cuando un contacto nuevo envía un mensaje
2. **Proteger la etapa "Leads Entrantes"** para que no se pueda modificar ni eliminar

---

## 🔍 Análisis Actual

### Estado Actual

1. **Creación de Leads:**
   - ✅ Existe función `createLead()` con `pipeline_stage = 'entrantes'` por defecto
   - ✅ Existe función `createLeadFromContact()` que crea lead con `pipeline_stage = 'entrantes'`
   - ❌ **NO se crea automáticamente** cuando llega un mensaje nuevo
   - ✅ El webhook crea/actualiza el contacto pero NO crea el lead

2. **Pipeline Stages:**
   - ✅ Etapa "Leads Entrantes" se crea por defecto en `initializeCRMForProduct()`
   - ✅ Nombre usado: "Leads Entrantes" (con mayúsculas) en UI
   - ❌ **NO está protegida** - se puede eliminar o modificar
   - ❌ **NO hay validación** para asegurar que siempre exista

3. **Normalización:**
   - Código usa: `pipeline_stage = 'entrantes'` (minúsculas)
   - UI muestra: "Leads Entrantes" (con mayúsculas y espacios)
   - ⚠️ **Necesitamos normalizar** el nombre para comparaciones

---

## 💡 Propuesta de Solución

### FASE 1: Creación Automática de Leads

#### 1.1 Agregar lógica en Webhook (`whatsapp-webhook/index.ts`)

**Ubicación:** Función `processMessages()` después de guardar el mensaje

**Lógica:**
```typescript
// Después de guardar mensaje y si NO es del sistema
if (!isFromMe) {
  await updateContactInteraction(contact.id, 'client');
  await pauseSequenceIfNeeded(contact.id);
  
  // NUEVO: Crear lead automáticamente si no existe
  await createLeadIfNotExists(contact.id, accountId);
}
```

**Función nueva:**
```typescript
async function createLeadIfNotExists(contactId: string, accountId: string) {
  const supabase = getSupabaseClient();
  
  // 1. Obtener product_id de la cuenta
  const { data: account } = await supabase
    .from('whatsapp_accounts')
    .select('product_id')
    .eq('id', accountId)
    .single();
  
  if (!account?.product_id) {
    console.warn('[createLeadIfNotExists] Cuenta no tiene product_id asignado');
    return;
  }
  
  // 2. Verificar si ya existe lead activo
  const { data: existingLead } = await supabase
    .from('whatsapp_leads')
    .select('id')
    .eq('contact_id', contactId)
    .eq('product_id', account.product_id)
    .eq('status', 'active')
    .maybeSingle();
  
  if (existingLead) {
    console.log('[createLeadIfNotExists] Lead ya existe:', existingLead.id);
    return;
  }
  
  // 3. Crear lead automáticamente en etapa "entrantes"
  const { data: newLead, error } = await supabase
    .from('whatsapp_leads')
    .insert({
      contact_id: contactId,
      account_id: accountId,
      product_id: account.product_id,
      pipeline_stage: 'entrantes', // Normalizado a minúsculas
      source: 'whatsapp_incoming', // Nuevo source para diferenciar
      status: 'active',
      last_activity_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('[createLeadIfNotExists] Error creando lead:', error);
    return;
  }
  
  console.log('[createLeadIfNotExists] ✅ Lead creado automáticamente:', newLead.id);
}
```

**Consideraciones:**
- ✅ Solo crea si NO existe lead activo
- ✅ Usa `product_id` de la cuenta
- ✅ Source: `'whatsapp_incoming'` para diferenciar de manuales
- ✅ Pipeline stage: `'entrantes'` (normalizado)

---

### FASE 2: Protección de Etapa "Leads Entrantes"

#### 2.1 Constante de Normalización

**Archivo:** `src/services/whatsapp/pipelines.js`

```javascript
// Constante para el nombre normalizado de la etapa protegida
export const PROTECTED_STAGE_NAME = 'Leads Entrantes';
export const PROTECTED_STAGE_KEY = 'entrantes'; // Para pipeline_stage en leads
```

#### 2.2 Validaciones en Backend

**2.2.1 Validar que siempre exista en `updatePipeline()`**

```javascript
export async function updatePipeline(pipelineId, updates) {
  // ... código existente ...
  
  if (updates.stages !== undefined) {
    // Validar que siempre exista "Leads Entrantes"
    const hasProtectedStage = updates.stages.some(stage => 
      stage.name === PROTECTED_STAGE_NAME || stage.name.toLowerCase().includes('entrantes')
    );
    
    if (!hasProtectedStage) {
      return {
        data: null,
        error: { 
          message: `La etapa "${PROTECTED_STAGE_NAME}" es obligatoria y no puede ser eliminada` 
        }
      };
    }
    
    // Validar que el nombre de "Leads Entrantes" no cambie
    updates.stages.forEach(stage => {
      if (stage.name.toLowerCase().includes('entrantes') && 
          stage.name !== PROTECTED_STAGE_NAME) {
        // Normalizar nombre a "Leads Entrantes"
        stage.name = PROTECTED_STAGE_NAME;
      }
    });
  }
  
  // ... resto del código ...
}
```

**2.2.2 Validar en `createPipeline()`**

```javascript
export async function createPipeline(pipelineData) {
  // ... código existente ...
  
  // Validar que siempre tenga "Leads Entrantes"
  const hasProtectedStage = stages.some(stage => 
    stage.name === PROTECTED_STAGE_NAME || stage.name.toLowerCase().includes('entrantes')
  );
  
  if (!hasProtectedStage) {
    // Agregar automáticamente si no existe
    stages.unshift({
      name: PROTECTED_STAGE_NAME,
      order: Math.min(...stages.map(s => s.order || 0)) - 1, // Primera posición
      color: '#3b82f6',
      sequence_id: null
    });
  }
  
  // ... resto del código ...
}
```

#### 2.3 Protección en Frontend

**2.3.1 En `PipelineConfigurator.jsx`**

```javascript
// Función para verificar si es etapa protegida
const isProtectedStage = (stageName) => {
  return stageName === 'Leads Entrantes' || 
         stageName.toLowerCase().includes('entrantes');
};

// Deshabilitar botón de eliminar para etapa protegida
const handleDeleteStage = (index) => {
  const stage = stages[index];
  if (isProtectedStage(stage.name)) {
    toast.push({
      type: 'warning',
      title: 'Etapa protegida',
      message: 'No se puede eliminar la etapa "Leads Entrantes"'
    });
    return;
  }
  // ... resto del código ...
};

// Deshabilitar edición de nombre para etapa protegida
const handleEditStage = (index) => {
  const stage = stages[index];
  if (isProtectedStage(stage.name)) {
    // Permitir editar color y orden, pero no nombre
    setEditingStage({ ...stage, canEditName: false });
  } else {
    setEditingStage({ ...stage, canEditName: true });
  }
};
```

**2.3.2 UI: Mostrar indicador visual**

```jsx
{isProtectedStage(stage.name) && (
  <span className="text-xs text-blue-400 ml-2">
    🔒 Etapa protegida
  </span>
)}
```

---

### FASE 3: Migración de Datos Existentes

#### 3.1 Normalizar nombres de etapa existentes

**Script SQL:** `supabase/migrations/026_normalize_entrantes_stage.sql`

```sql
-- Normalizar nombre de etapa "entrantes" a "Leads Entrantes" en pipelines
UPDATE whatsapp_pipelines
SET stages = (
  SELECT jsonb_agg(
    CASE 
      WHEN stage->>'name' ILIKE '%entrantes%' THEN
        jsonb_set(stage, '{name}', '"Leads Entrantes"')
      ELSE stage
    END
  )
  FROM jsonb_array_elements(stages) AS stage
)
WHERE stages IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(stages) AS stage
    WHERE stage->>'name' ILIKE '%entrantes%'
      AND stage->>'name' != 'Leads Entrantes'
  );

-- Asegurar que todos los pipelines tengan "Leads Entrantes"
DO $$
DECLARE
  pipeline_record RECORD;
  has_entrantes BOOLEAN;
BEGIN
  FOR pipeline_record IN 
    SELECT id, stages, product_id
    FROM whatsapp_pipelines
    WHERE is_default = true
  LOOP
    -- Verificar si tiene etapa "entrantes"
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(pipeline_record.stages) AS stage
      WHERE stage->>'name' ILIKE '%entrantes%'
    ) INTO has_entrantes;
    
    -- Si no tiene, agregarla
    IF NOT has_entrantes THEN
      UPDATE whatsapp_pipelines
      SET stages = (
        SELECT jsonb_agg(stage ORDER BY (stage->>'order')::int)
        FROM (
          SELECT jsonb_build_object(
            'name', 'Leads Entrantes',
            'order', 0,
            'color', '#3b82f6',
            'sequence_id', NULL
          ) AS stage
          UNION ALL
          SELECT jsonb_set(
            stage,
            '{order}',
            to_jsonb((stage->>'order')::int + 1)
          )
          FROM jsonb_array_elements(pipeline_record.stages) AS stage
        ) AS all_stages
      )
      WHERE id = pipeline_record.id;
    END IF;
  END LOOP;
END $$;
```

---

## 📝 Resumen de Cambios

### Backend

1. **`supabase/functions/whatsapp-webhook/index.ts`**
   - ✅ Agregar función `createLeadIfNotExists()`
   - ✅ Llamar desde `processMessages()` cuando llega mensaje del cliente

2. **`src/services/whatsapp/pipelines.js`**
   - ✅ Agregar constantes `PROTECTED_STAGE_NAME` y `PROTECTED_STAGE_KEY`
   - ✅ Validar en `updatePipeline()` que no se elimine "Leads Entrantes"
   - ✅ Validar en `createPipeline()` que siempre exista
   - ✅ Normalizar nombre a "Leads Entrantes"

### Frontend

3. **`src/components/whatsapp/PipelineConfigurator.jsx`**
   - ✅ Función `isProtectedStage()` para identificar etapa protegida
   - ✅ Deshabilitar eliminación de etapa protegida
   - ✅ Deshabilitar edición de nombre de etapa protegida
   - ✅ Indicador visual (🔒) para etapa protegida

### Migraciones

4. **`supabase/migrations/026_normalize_entrantes_stage.sql`**
   - ✅ Normalizar nombres existentes
   - ✅ Agregar etapa si falta en pipelines existentes

---

## ✅ Validaciones

### Backend
- ✅ No se puede eliminar "Leads Entrantes"
- ✅ No se puede cambiar el nombre de "Leads Entrantes"
- ✅ Se puede cambiar color y orden
- ✅ Todos los pipelines deben tener "Leads Entrantes"

### Frontend
- ✅ Botón eliminar deshabilitado visualmente
- ✅ Campo nombre deshabilitado para etapa protegida
- ✅ Mensaje de advertencia si se intenta modificar
- ✅ Indicador visual (🔒)

### Webhook
- ✅ Lead se crea automáticamente en etapa "entrantes"
- ✅ No crea duplicados (verifica existencia)
- ✅ Usa product_id de la cuenta
- ✅ Source: `'whatsapp_incoming'`

---

## 🔄 Flujo Completo

```
1. Cliente envía mensaje → Webhook recibe
2. Webhook crea/actualiza contacto
3. Webhook guarda mensaje
4. Webhook verifica: ¿Existe lead activo?
   ├─ NO → Crea lead en "entrantes" automáticamente
   └─ SÍ → Continúa sin crear
5. Lead aparece en Kanban en columna "Leads Entrantes"
6. Usuario puede mover lead a otras etapas
7. Etapa "Leads Entrantes" siempre existe y está protegida
```

---

## 🧪 Testing

### Tests a Crear

1. **Backend:**
   - ✅ Test: No se puede eliminar "Leads Entrantes"
   - ✅ Test: No se puede cambiar nombre de "Leads Entrantes"
   - ✅ Test: Pipeline debe tener "Leads Entrantes" al crear
   - ✅ Test: Lead se crea automáticamente en webhook

2. **Frontend:**
   - ✅ Test: Botón eliminar deshabilitado
   - ✅ Test: Campo nombre deshabilitado
   - ✅ Test: Indicador visual visible

---

## 📋 Checklist de Implementación

- [ ] FASE 1.1: Agregar función `createLeadIfNotExists()` en webhook
- [ ] FASE 1.2: Llamar función desde `processMessages()`
- [ ] FASE 2.1: Agregar constantes de protección
- [ ] FASE 2.2: Validaciones en `updatePipeline()`
- [ ] FASE 2.3: Validaciones en `createPipeline()`
- [ ] FASE 2.4: Protección en `PipelineConfigurator.jsx`
- [ ] FASE 3.1: Migración SQL para normalizar
- [ ] Tests: Backend
- [ ] Tests: Frontend
- [ ] Pruebas manuales: Webhook
- [ ] Pruebas manuales: Protección de etapa

---

## ❓ Preguntas/Consideraciones

1. **¿Qué hacer si un contacto tiene múltiples productos?**
   - ✅ Crear lead por cada product_id de la cuenta
   - ✅ Cada lead es independiente

2. **¿Qué pasa si se elimina un lead manualmente?**
   - ✅ El siguiente mensaje creará uno nuevo automáticamente

3. **¿Se puede desactivar la creación automática?**
   - 🤔 Podríamos agregar un flag en la cuenta, pero por ahora NO

4. **¿Qué hacer con leads existentes en otras etapas?**
   - ✅ No afecta, solo crea nuevos leads automáticamente

5. **¿Normalizar "entrantes" vs "Leads Entrantes"?**
   - ✅ UI usa "Leads Entrantes" (con mayúsculas)
   - ✅ DB usa "entrantes" (minúsculas) en `pipeline_stage`
   - ✅ Pipeline usa "Leads Entrantes" (con mayúsculas) en `stages.name`

---

## ✅ Recomendaciones Finales

1. ✅ **Implementar creación automática** - Mejora UX, no hay razón para no hacerlo
2. ✅ **Proteger etapa "Leads Entrantes"** - Es esencial para el flujo
3. ✅ **Normalizar nombres** - Evitar inconsistencias
4. ✅ **Agregar indicadores visuales** - Mejor UX
5. ✅ **Tests completos** - Asegurar funcionamiento

---

¿Procedemos con la implementación? 🚀


