# 🎯 Propuesta Completa: Productos Independientes + Kommo Style

## 📊 Requerimientos Confirmados

### **1. Productos Completamente Independientes**
- ✅ Cada producto es un sistema distinto
- ✅ NO se puede mover contacto/lead de Producto A → Producto B
- ✅ Cada producto tiene su propio CRM, Pipeline, Leads

### **2. Creación de Producto → Crear WhatsApp + CRM**
- ✅ Al crear nuevo producto, crear también:
  - Nuevo WhatsApp Account (dedicado)
  - CRM para ese WhatsApp (Pipeline + Configuración)
- ✅ Puede ser manual o automático

### **3. Automatización Estilo Kommo**
- ✅ Cada etapa del pipeline puede tener secuencia asignada
- ✅ Al mover lead a etapa → auto-inicia secuencia
- ✅ Más intuitivo y automatizado

---

## 🏗️ Arquitectura Propuesta

### **Estructura de Datos:**

```
PRODUCTO (almacen_central o products)
│
├── 1 WHATSAPP ACCOUNT (whatsapp_accounts)
│   └── product_id = PRODUCTO.id (obligatorio, único)
│
└── 1 CRM COMPLETO
    ├── PIPELINE (whatsapp_pipelines)
    │   └── product_id = PRODUCTO.id
    │   └── stages: [{name, order, color, sequence_id}]
    │
    ├── LEADS (whatsapp_leads)
    │   └── product_id = PRODUCTO.id (obligatorio, NO cambiable)
    │
    └── SECUENCIAS (whatsapp_sequences)
        └── account_id = WHATSAPP_ACCOUNT.id
        └── (filtradas por producto)
```

**Reglas:**
- ✅ 1 Producto = 1 WhatsApp Account (relación 1:1)
- ✅ Leads NO pueden cambiar de producto
- ✅ Cada producto tiene su propio pipeline
- ✅ Secuencias están ligadas al WhatsApp Account del producto

---

## 🚀 Plan de Implementación Completo

### **FASE 1: Validaciones de Independencia** ⏱️ 2-3 horas

#### **1.1: Restricción de WhatsApp Account por Producto**

**Objetivo:** Un producto solo puede tener 1 WhatsApp Account

**Cambios en BD:**
```sql
-- Agregar índice único para product_id en whatsapp_accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_product_unique 
ON whatsapp_accounts(product_id) 
WHERE product_id IS NOT NULL;

-- Validar que no haya múltiples cuentas por producto
-- (migración para limpiar duplicados si existen)
```

**Validación en código:**
```javascript
export async function createAccount(accountData) {
  // Si tiene product_id, verificar que no exista otro
  if (accountData.product_id) {
    const { data: existing } = await supabase
      .from('whatsapp_accounts')
      .select('id')
      .eq('product_id', accountData.product_id)
      .maybeSingle();
    
    if (existing) {
      return {
        data: null,
        error: { message: 'Este producto ya tiene un WhatsApp Account asignado' }
      };
    }
  }
  
  // Continuar con creación...
}
```

#### **1.2: Validar que Lead no cambie de Producto**

```javascript
export async function moveLeadToStage(leadId, newStage, productId, userId = null) {
  // Validar que lead pertenece al producto
  const { data: lead } = await getLeadById(leadId);
  if (lead.product_id !== productId) {
    throw new Error('No se puede mover lead a otro producto');
  }
  
  // Continuar con movimiento...
}
```

#### **1.3: Validar product_id en creación de Lead**

```javascript
export async function createLead(leadData) {
  // Validar que contact_id y account_id pertenecen al mismo producto
  // Validar que product_id coincide
  
  // Continuar...
}
```

---

### **FASE 2: Inicialización Automática al Crear Producto** ⏱️ 4-6 horas

#### **2.1: Función de Inicialización Completa**

**Archivo:** `src/services/whatsapp/products-init.js` (nuevo)

```javascript
/**
 * Inicializar CRM completo para un producto nuevo
 * Se ejecuta automáticamente al crear producto
 */
export async function initializeCRMForProduct(productId, productData) {
  try {
    const results = {
      pipeline: null,
      whatsapp: null,
      errors: []
    };
    
    // 1. Crear Pipeline por defecto
    try {
      const defaultStages = [
        { 
          name: 'Leads Entrantes', 
          order: 1, 
          color: '#3b82f6', 
          sequence_id: null 
        },
        { 
          name: 'Seguimiento', 
          order: 2, 
          color: '#f59e0b', 
          sequence_id: null 
        },
        { 
          name: 'Venta', 
          order: 3, 
          color: '#10b981', 
          sequence_id: null 
        },
        { 
          name: 'Cliente', 
          order: 4, 
          color: '#8b5cf6', 
          sequence_id: null 
        }
      ];
      
      const { createPipeline } = await import('./pipelines');
      const { data: pipeline, error: pipelineError } = await createPipeline({
        product_id: productId,
        name: `Pipeline - ${productData.nombre || 'Por Defecto'}`,
        stages: defaultStages,
        is_default: true,
        account_id: null // Pipeline global por producto
      });
      
      if (pipelineError) throw pipelineError;
      results.pipeline = pipeline;
    } catch (err) {
      results.errors.push({ step: 'pipeline', error: err.message });
      console.error('[initializeCRMForProduct] Error creando pipeline:', err);
    }
    
    // 2. Crear WhatsApp Account vacío (para configurar después)
    try {
      const { createAccount } = await import('./accounts');
      const { data: whatsapp, error: whatsappError } = await createAccount({
        product_id: productId,
        display_name: `${productData.nombre || 'Producto'} - WhatsApp`,
        active: false, // Inactivo hasta configurar credenciales
        phone_number_id: null, // Se configura después
        business_account_id: null,
        access_token: null,
        verify_token: null,
        phone_number: null
      });
      
      if (whatsappError) throw whatsappError;
      results.whatsapp = whatsapp;
    } catch (err) {
      results.errors.push({ step: 'whatsapp', error: err.message });
      console.error('[initializeCRMForProduct] Error creando WhatsApp:', err);
    }
    
    return {
      success: results.errors.length === 0,
      data: results,
      errors: results.errors
    };
  } catch (err) {
    console.error('[initializeCRMForProduct] Error fatal:', err);
    return {
      success: false,
      data: null,
      errors: [{ step: 'general', error: err.message }]
    };
  }
}
```

#### **2.2: Integrar en Creación de Producto**

**Archivo:** `src/App.jsx` (modificar función `submit` en `ProductsView`)

```javascript
// Después de crear producto exitosamente:
if (newProduct) {
  setProducts(prev => [...prev, newProduct]);
  
  // Inicializar CRM para el nuevo producto
  try {
    const { initializeCRMForProduct } = await import('./services/whatsapp/products-init');
    const initResult = await initializeCRMForProduct(newProduct.id, {
      nombre: newProduct.nombre,
      sku: newProduct.sku
    });
    
    if (initResult.success) {
      setMensaje('Producto agregado y CRM inicializado correctamente');
    } else {
      setMensaje('Producto agregado. Algunos componentes del CRM no se pudieron inicializar.');
      console.warn('[ProductsView] Errores en inicialización:', initResult.errors);
    }
  } catch (err) {
    console.error('[ProductsView] Error inicializando CRM:', err);
    setMensaje('Producto agregado. Error inicializando CRM automático.');
  }
}
```

---

### **FASE 3: Automatización por Etapas (Kommo Style)** ⏱️ 1-2 días

#### **3.1: Agregar sequence_id a Etapas del Pipeline**

**Cambio en Schema:**
- No requiere migración (JSONB ya lo soporta)
- Solo actualizar estructura esperada

#### **3.2: Modificar PipelineConfigurator.jsx**

Agregar selector de secuencia en cada etapa:

```jsx
// En cada etapa, agregar:
<div className="mb-3">
  <label>Secuencia Automática (Opcional)</label>
  <select
    value={stage.sequence_id || ''}
    onChange={(e) => updateStageSequence(stageIndex, e.target.value)}
  >
    <option value="">Sin secuencia</option>
    {availableSequences.map(seq => (
      <option key={seq.id} value={seq.id}>
        {seq.name}
      </option>
    ))}
  </select>
</div>
```

#### **3.3: Modificar moveLeadToStage() con Auto-Asignación**

```javascript
export async function moveLeadToStage(leadId, newStage, productId, userId = null) {
  try {
    // 1. Validar que lead pertenece al producto
    const { data: lead } = await getLeadById(leadId);
    if (!lead) throw new Error('Lead no encontrado');
    
    if (lead.product_id !== productId) {
      throw new Error('No se puede mover lead a otro producto');
    }
    
    // 2. Obtener pipeline del producto
    const { data: pipeline } = await getPipelineByProduct(productId);
    if (!pipeline) throw new Error('Pipeline no encontrado');
    
    // 3. Buscar etapa y su secuencia asignada
    const stage = (pipeline.stages || []).find(s => s.name === newStage);
    
    // 4. Mover lead a nueva etapa
    await updateLead(leadId, { 
      pipeline_stage: newStage,
      last_activity_at: new Date().toISOString()
    });
    
    // 5. Si etapa tiene secuencia → asignar automáticamente
    if (stage && stage.sequence_id) {
      const { assignSequenceToLead } = await import('./leads');
      const { success, error } = await assignSequenceToLead(
        leadId, 
        stage.sequence_id, 
        userId
      );
      
      if (!success) {
        console.error('[moveLeadToStage] Error asignando secuencia:', error);
        // Continuar aunque falle la asignación
      }
    } else {
      // 6. Si no tiene secuencia → detener actual (si existe)
      const { stopLeadSequence } = await import('./leads');
      await stopLeadSequence(leadId, userId);
    }
    
    // 7. Registrar actividad
    await addLeadActivity(leadId, {
      type: 'stage_change',
      content: `Lead movido a etapa: ${newStage}${stage?.sequence_id ? ` (Secuencia iniciada)` : ''}`,
      user_id: userId,
      metadata: { 
        old_stage: lead.pipeline_stage,
        new_stage: newStage,
        sequence_id: stage?.sequence_id || null
      }
    });
    
    return { success: true, error: null };
  } catch (err) {
    console.error('[moveLeadToStage] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}
```

---

## 📋 Resumen de Cambios

### **Base de Datos:**
1. ✅ Índice único para `whatsapp_accounts.product_id`
2. ✅ Validaciones de integridad
3. ✅ (Opcional) Migración para limpiar datos existentes

### **Backend (Services):**
1. ✅ `products-init.js` - Inicialización automática
2. ✅ Validaciones en `createAccount()`
3. ✅ Validaciones en `moveLeadToStage()`
4. ✅ Validaciones en `createLead()`

### **Frontend (Components):**
1. ✅ Integración en `ProductsView` (crear producto)
2. ✅ Mejoras en `PipelineConfigurator` (selector de secuencias)
3. ✅ UI más intuitiva

---

## 🎯 Flujo Completo Final

### **1. Crear Producto:**
```
Usuario crea "CARDIO PLUS"
  ↓
Automáticamente:
  ✅ Pipeline por defecto creado
  ✅ WhatsApp Account vacío creado (para configurar)
  ✅ CRM listo para usar
```

### **2. Configurar Pipeline:**
```
Usuario configura:
  - Etapa "Leads Entrantes" → Secuencia "Bienvenida CARDIO PLUS"
  - Etapa "Seguimiento" → Secuencia "Seguimiento CARDIO PLUS"
  - Etapa "Venta" → Sin secuencia
  - Etapa "Cliente" → Secuencia "Post-Venta CARDIO PLUS"
```

### **3. Configurar WhatsApp:**
```
Usuario configura credenciales del WhatsApp Account
  ↓
WhatsApp Account activo
```

### **4. Usar CRM:**
```
Crear Lead para "CARDIO PLUS"
  ↓
Lead va a "Leads Entrantes"
  ↓
Automáticamente inicia "Secuencia Bienvenida CARDIO PLUS"
  ↓
Mover a "Seguimiento"
  ↓
Automáticamente inicia "Secuencia Seguimiento CARDIO PLUS"
```

---

## ✅ Ventajas de Esta Solución

1. **✅ Productos Independientes**
   - Validaciones estrictas
   - No se puede mezclar datos entre productos

2. **✅ Inicialización Automática**
   - Pipeline listo al crear producto
   - WhatsApp Account preparado
   - Menos pasos manuales

3. **✅ Automatización Kommo Style**
   - Secuencias por etapa
   - Auto-inicio al mover lead
   - Más intuitivo

4. **✅ Compatible con Sistema Actual**
   - No requiere migración masiva
   - Compatible con datos existentes

---

## 📝 Próximos Pasos

1. ✅ Revisar y aprobar propuesta
2. ✅ Implementar FASE 1 (Validaciones)
3. ✅ Implementar FASE 2 (Inicialización)
4. ✅ Implementar FASE 3 (Automatización Kommo)
5. ✅ Testing completo

---

**¿Te parece bien esta propuesta completa? ¿Quieres que empiece a implementar?** 🚀



