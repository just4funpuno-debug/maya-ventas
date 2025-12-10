# 🔍 Análisis: Cambiar "Pipeline" por "Etapa" en CRM

## 📋 Solicitud del Usuario

- **Cambio:** "Pipeline" → "Etapa"
- **Ámbito:** Menú "CRM"
- **Requisito:** Todo lo referente a pipeline sea cambiado a "Etapa"
- **Requisito:** Revisar si se hará por fases

---

## 🔍 Análisis de Referencias

### **Archivos con Referencias a "Pipeline":**

1. **Componentes UI (Textos Visibles):**
   - `src/components/whatsapp/PipelineConfigurator.jsx` - Configurador
   - `src/components/whatsapp/LeadsKanban.jsx` - Botón "Configurar Pipeline"
   - `src/components/whatsapp/LeadDetailModal.jsx` - Campo pipeline_stage

2. **Servicios Backend:**
   - `src/services/whatsapp/pipelines.js` - Funciones de pipeline
   - `src/services/whatsapp/leads.js` - Referencias a pipeline_stage
   - `src/services/whatsapp/products-init.js` - Creación de pipeline

3. **Base de Datos:**
   - Tabla: `whatsapp_pipelines`
   - Campo: `pipeline_stage` en `whatsapp_leads`

4. **Otros Archivos:**
   - `src/App.jsx` - Mensajes de inicialización

---

## 🎯 Tipos de Cambios Necesarios

### **Nivel 1: Textos Visibles al Usuario** (DEBE CAMBIAR)
- Títulos y etiquetas en UI
- Mensajes al usuario
- Placeholders
- Tooltips

### **Nivel 2: Nombres Técnicos** (OPCIONAL - Revisar)
- Nombres de funciones: `getPipelineByProduct`
- Nombres de variables: `pipeline`, `pipelineData`
- Nombres de archivos: `PipelineConfigurator.jsx`

### **Nivel 3: Base de Datos** (NO CAMBIAR - Mantener)
- Nombre de tabla: `whatsapp_pipelines`
- Nombre de campo: `pipeline_stage`
- Nombres de columnas

---

## 📝 Propuesta de Cambios

### **CAMBIOS RECOMENDADOS (Solo Textos Visibles):**

1. **PipelineConfigurator.jsx:**
   - "Configurar Pipeline" → "Configurar Etapa"
   - "Etapas del Pipeline" → "Etapas"
   - "Pipeline por Defecto" → "Etapa por Defecto"

2. **LeadsKanban.jsx:**
   - Botón "Pipeline" → "Etapa"
   - "Configurar Pipeline" → "Configurar Etapa"

3. **Mensajes:**
   - "Pipeline creado" → "Etapa creada"
   - "Pipeline actualizado" → "Etapa actualizada"

### **NO CAMBIAR (Mantener Técnico):**
- Nombres de funciones (internos)
- Nombres de archivos
- Nombres de tablas/campos en BD

---

## 🔄 Plan por Fases

### **FASE 1: Componente PipelineConfigurator** 
- Cambiar textos visibles
- Títulos y etiquetas

### **FASE 2: Componente LeadsKanban**
- Cambiar botón "Pipeline"
- Actualizar tooltips

### **FASE 3: Otros Componentes**
- LeadDetailModal
- Mensajes en App.jsx

### **FASE 4: Verificación Final**
- Revisar todos los textos
- Testing

---

**⏳ ESPERANDO CONFIRMACIÓN ANTES DE PROCEDER**



