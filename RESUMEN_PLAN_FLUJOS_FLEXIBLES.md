# 📋 Resumen Ejecutivo: Plan de Implementación

## ✅ Confirmaciones

1. ✅ Pausas consecutivas: **Se suman** (1h + 2h = 3h)
2. ✅ Cambio de etapa: **Inmediato**
3. ✅ Cambio a etapa con flujo: **Detener actual e iniciar nuevo**
4. ✅ Estructura: **Opción 1 - Extender tabla actual**

---

## 🎯 Objetivo

Transformar los flujos de solo "mensajes" a **"pasos flexibles"** que pueden ser:
- 📨 **Mensajes** (texto, imagen, video, etc.)
- ⏸️ **Pausas** (elemento independiente)
- 🔄 **Cambio de Etapa** (acción automática)

---

## 📊 Plan por Fases (10 fases)

### **FASE 1:** Base de Datos (30 min)
- Agregar campo `step_type` y `target_stage_name`
- Actualizar registros existentes

### **FASE 2:** Selector de Tipo (1 hora)
- Cambiar "Agregar Mensaje" → "Agregar Paso"
- Modal selector de tipo

### **FASE 3:** Formulario de Pausa (1.5 horas)
- Formulario específico para pausas

### **FASE 4:** Formulario Cambio de Etapa (2 horas)
- Formulario para configurar cambio automático

### **FASE 5:** Visualización (1 hora)
- Iconos distintos por tipo de paso

### **FASE 6:** Lógica Pausas Consecutivas (1.5 horas)
- Implementar suma de pausas

### **FASE 7:** Lógica Cambio de Etapa (2 horas)
- Implementar cambio automático

### **FASE 8:** Servicios y Validaciones (1 hora)
- Validaciones por tipo de paso

### **FASE 9:** Migración Existentes (30 min - Opcional)
- Convertir pausas antiguas

### **FASE 10:** Testing Completo (1 hora)
- Testing end-to-end

---

## ⏱️ Tiempo Total Estimado: ~12 horas

---

## ✅ ¿Comenzamos con FASE 1?

**El plan está listo. ¿Quieres que empiece con la FASE 1 (Base de Datos)?**



