# 📋 Plan de Implementación: Fases y Subfases

## 🎯 Objetivos Confirmados

✅ **Inicialización:** Automática  
✅ **WhatsApp Account:** Se crea vacío automáticamente  
✅ **Metodología:** Fase por fase con testing entre cada una

---

## 📊 División en Fases

### **FASE 1: Validaciones de Independencia** ⏱️ 2-3 horas

**Objetivo:** Asegurar que los productos sean completamente independientes

#### **SUBFASE 1.1: Índice único para WhatsApp Account por producto** (30 min)
- Crear índice único en BD
- Migración SQL
- Testing: Verificar que no permite duplicados

#### **SUBFASE 1.2: Validar en createAccount()** (45 min)
- Agregar validación antes de crear
- Mensaje de error claro
- Testing: Intentar crear cuenta duplicada

#### **SUBFASE 1.3: Validar que lead no cambie de producto** (45 min)
- Validación en moveLeadToStage()
- Validación en createLead()
- Testing: Intentar mover lead a otro producto

---

### **FASE 2: Inicialización Automática** ⏱️ 4-6 horas

**Objetivo:** Crear Pipeline + WhatsApp automáticamente al crear producto

#### **SUBFASE 2.1: Crear función initializeCRMForProduct()** (2-3 horas)
- Nuevo archivo: `src/services/whatsapp/products-init.js`
- Función para crear Pipeline por defecto
- Función para crear WhatsApp Account vacío
- Testing: Llamar función y verificar creación

#### **SUBFASE 2.2: Integrar en creación de producto** (2-3 horas)
- Modificar `App.jsx` (ProductsView)
- Llamar función después de crear producto
- Manejo de errores
- Testing: Crear producto y verificar inicialización

---

### **FASE 3: Automatización Estilo Kommo** ⏱️ 1-2 días

**Objetivo:** Secuencias automáticas por etapa del pipeline

#### **SUBFASE 3.1: Agregar selector de secuencia en PipelineConfigurator** (3-4 horas)
- Modificar componente
- Cargar secuencias disponibles
- Selector por etapa
- Guardar sequence_id en etapa
- Testing: Configurar pipeline con secuencias

#### **SUBFASE 3.2: Modificar moveLeadToStage() con auto-asignación** (4-5 horas)
- Leer sequence_id de la etapa
- Auto-asignar secuencia al mover lead
- Detener secuencia si etapa no tiene
- Testing: Mover lead y verificar asignación automática

---

## 🧪 Estrategia de Testing

Después de cada subfase:
1. ✅ Verificar que funciona correctamente
2. ✅ Probar casos edge (errores, validaciones)
3. ✅ Revisar logs/consola
4. ✅ Documentar resultados

---

## 📝 Empecemos con FASE 1 - SUBFASE 1.1

**¿Listo para empezar?** 🚀



