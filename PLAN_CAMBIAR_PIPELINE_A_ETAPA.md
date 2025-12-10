# 📋 Plan: Cambiar "Pipeline" por "Etapa" en CRM

## 🎯 Objetivo

Cambiar todas las referencias visibles de "Pipeline" a "Etapa" en el menú CRM para que sea más entendible.

---

## 🔍 Análisis de Referencias Encontradas

### **Nivel 1: Textos Visibles al Usuario** ✅ (DEBEN CAMBIAR)

#### **1. PipelineConfigurator.jsx**
- ✅ "Configurar Pipeline" → "Configurar Etapa"
- ✅ "Edita las etapas de tu pipeline de leads" → "Edita las etapas de leads"
- ✅ "Etapas del Pipeline" → "Etapas"
- ✅ "Cargando pipeline..." → "Cargando etapas..."
- ✅ "Pipeline actualizado correctamente" → "Etapa actualizada correctamente"
- ✅ "No se pudo cargar el pipeline" → "No se pudo cargar las etapas"
- ✅ "No hay pipeline para actualizar" → "No hay etapas para actualizar"
- ✅ "No se pudo actualizar el pipeline" → "No se pudo actualizar las etapas"
- ✅ "restaurar el pipeline por defecto" → "restaurar las etapas por defecto"
- ✅ "Pipeline restaurado correctamente" → "Etapas restauradas correctamente"
- ✅ "No se pudo restaurar el pipeline" → "No se pudo restaurar las etapas"

#### **2. LeadsKanban.jsx**
- ✅ Botón "Pipeline" → "Etapa"
- ✅ "Configurar Pipeline" (tooltip) → "Configurar Etapa"
- ✅ "No se pudo cargar el pipeline" → "No se pudo cargar las etapas"
- ✅ "Modal Configurar Pipeline" (comentario) → "Modal Configurar Etapa"

#### **3. App.jsx**
- ✅ "Pipeline y WhatsApp Account creados" → "Etapas y WhatsApp Account creados"
- ✅ "Pipeline creado correctamente" → "Etapas creadas correctamente"
- ✅ "Pipeline Creado" (toast title) → "Etapas Creadas"
- ✅ "Pipeline inicializado" → "Etapas inicializadas"
- ✅ "Pipeline por Defecto" → "Etapas por Defecto"

#### **4. Comentarios en Código**
- ✅ Comentarios que mencionan "pipeline" para el usuario

---

### **Nivel 2: Nombres Técnicos** ⚠️ (REVISAR - Mantener)

#### **Funciones y Servicios:**
- ⚠️ `getPipelineByProduct()` - Mantener (interno)
- ⚠️ `updatePipeline()` - Mantener (interno)
- ⚠️ `createPipeline()` - Mantener (interno)
- ⚠️ `restoreDefaultPipeline()` - Mantener (interno)
- ⚠️ Nombre de archivo: `PipelineConfigurator.jsx` - Mantener
- ⚠️ Nombre de archivo: `pipelines.js` - Mantener

#### **Variables y Estados:**
- ⚠️ `pipeline` (variable) - Mantener (interno)
- ⚠️ `pipeline_stage` (campo BD) - Mantener (interno)
- ⚠️ `loadPipeline()` - Mantener (interno)

**Razón:** Son nombres técnicos internos. Cambiarlos podría romper código existente y hacer el refactor muy extenso.

---

### **Nivel 3: Base de Datos** ❌ (NO CAMBIAR)

- ❌ Tabla `whatsapp_pipelines` - Mantener
- ❌ Campo `pipeline_stage` - Mantener
- ❌ Campos internos de BD - Mantener

**Razón:** Cambiar estructura de BD requiere migraciones complejas y puede romper datos existentes.

---

## 📝 Plan por Fases

### **FASE 1: Componente PipelineConfigurator** 
**Archivo:** `src/components/whatsapp/PipelineConfigurator.jsx`

**Cambios:**
1. Título del modal: "Configurar Pipeline" → "Configurar Etapa"
2. Subtítulo: "Edita las etapas de tu pipeline" → "Edita las etapas de leads"
3. "Etapas del Pipeline" → "Etapas"
4. Mensajes de error/éxito
5. Comentarios visibles

**Tiempo estimado:** 15 minutos

---

### **FASE 2: Componente LeadsKanban**
**Archivo:** `src/components/whatsapp/LeadsKanban.jsx`

**Cambios:**
1. Botón "Pipeline" → "Etapa"
2. Tooltip "Configurar Pipeline" → "Configurar Etapa"
3. Mensajes de error

**Tiempo estimado:** 10 minutos

---

### **FASE 3: Mensajes en App.jsx**
**Archivo:** `src/App.jsx`

**Cambios:**
1. Mensajes de toast sobre pipeline
2. Títulos de notificaciones

**Tiempo estimado:** 10 minutos

---

### **FASE 4: Otros Componentes**
**Archivos:** Otros archivos que mencionen "pipeline" al usuario

**Cambios:**
1. Revisar referencias restantes
2. Cambiar textos visibles

**Tiempo estimado:** 10 minutos

---

### **FASE 5: Verificación y Testing**
**Acción:** Revisar que todos los cambios sean consistentes

**Verificaciones:**
1. ✅ Todos los textos visibles cambiados
2. ✅ Nombres técnicos mantenidos (funciones, variables)
3. ✅ Base de datos intacta
4. ✅ Funcionalidad sigue funcionando

**Tiempo estimado:** 15 minutos

---

## ⏱️ Tiempo Total Estimado

**Total:** ~60 minutos (1 hora)

---

## ✅ Resumen de Cambios

| Tipo | Acción | Cantidad Aprox. |
|------|--------|----------------|
| Textos visibles | Cambiar "Pipeline" → "Etapa" | ~20 referencias |
| Nombres técnicos | Mantener | - |
| Base de datos | Mantener | - |

---

## 🎯 Estrategia

**Cambiar:** Solo textos que el usuario ve (UI)
**Mantener:** Nombres técnicos, funciones, BD

**Ventajas:**
- ✅ Cambio rápido y seguro
- ✅ No rompe funcionalidad existente
- ✅ Usuario ve "Etapa" en lugar de "Pipeline"
- ✅ Código interno sigue siendo consistente

---

**⏳ ESPERANDO CONFIRMACIÓN ANTES DE PROCEDER**

¿Procedemos con este plan por fases?



