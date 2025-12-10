# ✅ Confirmación: Implementación de CRM de Leads

## 📋 Resumen de Requisitos

### **1. Cambio de Nombre del Menú**
- ✅ Cambiar menú "📋 Secuencias" → "📋 CRM"
- ✅ Mantener la misma ubicación en el sidebar
- ✅ Solo visible para admin (como actualmente)

### **2. Sistema Multi-Producto para CRM**
- ✅ Cada producto tiene su **propio CRM** y su **propio flujo de leads**
- ✅ Usar tabs por producto (como ya está implementado en "Secuencias")
- ✅ Admin ve todos los productos + tab "Todos"
- ✅ Vendedora ve solo productos asignados

### **3. Funcionalidad del CRM**
- ✅ **Vista Kanban** con columnas de pipeline (etapas del lead)
- ✅ **Arrastrar y soltar** leads entre etapas
- ✅ **Filtrado por producto** usando tabs
- ✅ **Integración con WhatsApp** (contactos y mensajes existentes)

### **4. Integración con Sistema Actual**
- ✅ Aprovechar `whatsapp_contacts` y `whatsapp_messages`
- ✅ Integrar con sistema de ventas (`sales`)
- ✅ Mantener funcionalidad de secuencias (¿o se integra en el CRM?)

---

## ❓ Preguntas para Confirmar

### **Pregunta 1: Funcionalidad de Secuencias**
¿Qué hacemos con las **secuencias actuales**?

**Opción A:** Mantener secuencias como parte del CRM
- Las secuencias se convierten en "automatizaciones" del CRM
- Se pueden activar según la etapa del lead
- Todo dentro del mismo menú "CRM"

**Opción B:** Separar secuencias del CRM
- Secuencias siguen siendo independientes
- CRM de Leads es una nueva funcionalidad
- Ambos dentro del menú "CRM" pero en secciones diferentes

**Opción C:** Integrar secuencias en el flujo de leads
- Las secuencias se ejecutan automáticamente según la etapa del lead
- No se gestionan manualmente, solo se configuran

**¿Cuál prefieres?** (Recomiendo Opción A)

---

### **Pregunta 2: Etapas del Pipeline**
¿Qué etapas quieres para el pipeline de leads?

**Propuestas del análisis:**
- "Leads Entrantes"
- "Fast Brain"
- "Venta Fast Brain"
- "Continuar Fast Brain"
- "Clientes"

**¿Estas etapas están bien o prefieres otras?**

---

### **Pregunta 3: Estructura del Componente**
¿Cómo organizamos el componente "CRM"?

**Opción A:** Tabs dentro del componente
- Tab "Leads" (Vista Kanban)
- Tab "Secuencias" (Configuración de secuencias)
- Tab "Automatizaciones" (Reglas automáticas)

**Opción B:** Todo integrado
- Vista principal: Kanban de Leads
- Panel lateral: Configuración de secuencias/automatizaciones
- Todo visible al mismo tiempo

**Opción C:** Solo Kanban
- Solo vista Kanban de Leads
- Secuencias se gestionan desde otro lugar o se eliminan

**¿Cuál prefieres?** (Recomiendo Opción A)

---

### **Pregunta 4: Detección Automática de Leads**
¿Quieres detección automática de leads?

**Opción A:** Sí, automático
- Cuando llega un mensaje nuevo de WhatsApp, se crea automáticamente un lead
- Se clasifica automáticamente según palabras clave
- Se asigna automáticamente a una vendedora

**Opción B:** Manual
- El usuario debe crear el lead manualmente desde un contacto
- Más control, menos automatización

**Opción C:** Híbrido
- Detección automática con opción de crear manualmente
- El usuario puede aprobar/rechazar leads automáticos

**¿Cuál prefieres?** (Recomiendo Opción C)

---

## ✅ Confirmación de Implementación

### **Lo que SÍ vamos a hacer:**
1. ✅ Cambiar nombre del menú "Secuencias" → "CRM"
2. ✅ Crear tablas de base de datos para leads y pipeline
3. ✅ Implementar vista Kanban con drag & drop
4. ✅ Integrar con sistema multi-producto (tabs por producto)
5. ✅ Filtrar leads por producto seleccionado
6. ✅ Integrar con contactos y mensajes de WhatsApp existentes

### **Lo que necesitamos confirmar:**
1. ❓ ¿Qué hacer con las secuencias actuales?
2. ❓ ¿Qué etapas del pipeline usar?
3. ❓ ¿Cómo organizar el componente CRM?
4. ❓ ¿Detección automática de leads?

---

## 🎯 Propuesta Inicial (Puedes ajustar)

### **FASE 1: Estructura Base**
1. Cambiar nombre del menú "Secuencias" → "CRM"
2. Crear tablas: `whatsapp_leads`, `whatsapp_lead_activities`, `whatsapp_pipelines`
3. Vista Kanban básica con etapas por defecto
4. Arrastrar y soltar leads entre etapas
5. Filtrado por producto (usar tabs existentes)

### **FASE 2: Integración**
1. Integrar con contactos de WhatsApp
2. Crear leads desde contactos existentes
3. Mostrar historial de mensajes en cada lead
4. Integrar con sistema de ventas

### **FASE 3: Automatización**
1. Detección automática de leads (opcional)
2. Secuencias automáticas por etapa
3. Asignación automática de leads

### **FASE 4: Métricas**
1. Dashboard de métricas
2. Reportes de conversión
3. Análisis por producto

---

## 📝 Resumen para Confirmar

**Cambios confirmados:**
- ✅ Menú "Secuencias" → "CRM"
- ✅ Cada producto tiene su propio CRM
- ✅ Vista Kanban con pipeline de leads
- ✅ Integración con sistema multi-producto

**Pendiente de confirmar:**
- ❓ Funcionalidad de secuencias (¿mantener, integrar, eliminar?)
- ❓ Etapas del pipeline
- ❓ Estructura del componente
- ❓ Detección automática de leads

---

**¿Confirmas estos puntos y respondes las preguntas antes de iniciar?**

