# 📋 Guía de Testing Manual - CRM de Leads

## 🎯 Objetivo

Verificar que todas las funcionalidades del CRM de Leads funcionen correctamente.

---

## ✅ Checklist de Testing

### 1. Acceso al CRM

- [ ] **Menú "CRM" visible**
  - Verificar que el menú "📋 CRM" aparece en el sidebar (solo para admins)
  - Verificar que al hacer click se abre el componente CRM

- [ ] **Tabs del CRM**
  - Verificar que aparecen dos tabs: "Leads" y "Secuencias"
  - Verificar que se puede cambiar entre tabs
  - Verificar que el tab activo se resalta en naranja

---

### 2. Tab "Leads" - Vista General

- [ ] **Tabs de Productos**
  - Verificar que aparecen tabs por cada producto (solo productos no sintéticos)
  - Verificar que los admins ven tab "Todos"
  - Verificar que al cambiar de producto se recargan los leads

- [ ] **Métricas**
  - Verificar que aparecen 4 tarjetas de métricas:
    - Total Leads (con contador de activos)
    - Leads Ganados (con tasa de conversión)
    - Valor Total Estimado
    - Score Promedio
  - Verificar que los números son correctos
  - Verificar que la tasa de conversión se calcula correctamente

- [ ] **Botones de Acción**
  - Verificar que aparece botón "Pipeline" (gris)
  - Verificar que aparece botón "Crear Lead" (naranja)
  - Verificar que ambos botones son clickeables

---

### 3. Vista Kanban

- [ ] **Columnas del Kanban**
  - Verificar que aparecen columnas por cada etapa del pipeline
  - Verificar que cada columna tiene:
    - Nombre de la etapa con color
    - Contador de leads en esa etapa
    - Zona de drop (si está vacía, muestra "Arrastra leads aquí")

- [ ] **Tarjetas de Lead**
  - Verificar que cada lead muestra:
    - Nombre del contacto
    - Teléfono
    - Valor estimado (si tiene)
    - Última actividad
    - Lead Score con barra de progreso (si tiene)
  - Verificar que las tarjetas son clickeables (abren modal de detalle)

- [ ] **Drag & Drop**
  - Arrastrar un lead de una columna a otra
  - Verificar que el lead se mueve correctamente
  - Verificar que aparece notificación de éxito
  - Verificar que el contador de la columna se actualiza
  - Verificar que se crea una actividad de "stage_change"

---

### 4. Configuración de Pipeline

- [ ] **Abrir Configurador**
  - Click en botón "Pipeline"
  - Verificar que se abre modal de configuración

- [ ] **Editar Etapas**
  - Click en botón "Editar" de una etapa
  - Cambiar el nombre de la etapa
  - Cambiar el color de la etapa
  - Verificar que se guarda correctamente
  - Verificar que el cambio se refleja en el Kanban

- [ ] **Agregar Etapa**
  - Llenar formulario "Agregar Nueva Etapa"
  - Seleccionar color
  - Click en "Agregar Etapa"
  - Verificar que aparece nueva columna en el Kanban

- [ ] **Eliminar Etapa**
  - Click en botón eliminar de una etapa
  - Confirmar eliminación
  - Verificar que la columna desaparece del Kanban
  - Verificar que no se puede eliminar si solo queda 1 etapa

- [ ] **Reordenar Etapas**
  - Click en botones ↑ ↓ para mover etapas
  - Verificar que el orden cambia en el Kanban

- [ ] **Restaurar por Defecto**
  - Click en "Restaurar por Defecto"
  - Confirmar
  - Verificar que se restauran las 4 etapas estándar

---

### 5. Crear Lead

- [ ] **Desde CRM**
  - Click en botón "Crear Lead" en LeadsKanban
  - Verificar que se abre modal
  - Buscar contacto
  - Seleccionar contacto
  - Seleccionar cuenta WhatsApp
  - Llenar valor estimado, score, notas
  - Click en "Crear Lead"
  - Verificar que aparece en el Kanban en etapa "Leads Entrantes"
  - Verificar que las métricas se actualizan

- [ ] **Desde Chat WhatsApp**
  - Abrir chat con un contacto
  - Verificar que aparece botón "Crear Lead" (icono UserPlus) en el header
  - Click en el botón
  - Verificar que el modal se abre con:
    - Contacto pre-seleccionado
    - Cuenta pre-seleccionada
    - Producto pre-seleccionado
  - Llenar datos y crear
  - Verificar que el botón desaparece o se muestra como deshabilitado

- [ ] **Validaciones**
  - Intentar crear lead sin seleccionar contacto → Debe mostrar error
  - Intentar crear lead sin seleccionar cuenta → Debe mostrar error
  - Intentar crear lead duplicado → Debe mostrar warning (no error)

---

### 6. Modal de Detalle de Lead

- [ ] **Abrir Modal**
  - Click en una tarjeta de lead en el Kanban
  - Verificar que se abre modal de detalle

- [ ] **Información del Contacto**
  - Verificar que muestra nombre y teléfono

- [ ] **Información del Lead**
  - Verificar que muestra:
    - Valor estimado
    - Lead Score con barra de progreso
    - Etapa actual
    - Notas
    - Fechas (creado, última actividad)

- [ ] **Editar Lead**
  - Click en botón "Editar"
  - Cambiar valor estimado
  - Cambiar lead score
  - Cambiar notas
  - Click en "Guardar"
  - Verificar que los cambios se guardan
  - Verificar que se actualiza en el Kanban

- [ ] **Historial de Ventas**
  - Verificar que aparece sección "Historial de Ventas"
  - Verificar que muestra todas las ventas del contacto
  - Verificar que muestra total de ventas reales junto al valor estimado

- [ ] **Actividades**
  - Verificar que aparece lista de actividades
  - Click en "Agregar Actividad"
  - Seleccionar tipo de actividad
  - Escribir contenido
  - Click en "Agregar"
  - Verificar que aparece en la lista
  - Verificar que se actualiza "Última Actividad"

---

### 7. Filtrado Multi-producto

- [ ] **Tabs de Productos**
  - Verificar que solo aparecen productos no sintéticos
  - Verificar que los usuarios no-admin solo ven sus productos asignados
  - Verificar que los admins ven todos los productos + tab "Todos"

- [ ] **Filtrado de Leads**
  - Cambiar de producto en el tab
  - Verificar que solo se muestran leads del producto seleccionado
  - Verificar que las métricas se actualizan por producto

---

### 8. Integración con Chat WhatsApp

- [ ] **Botón en Chat**
  - Abrir chat con contacto que no tiene lead
  - Verificar que aparece botón "Crear Lead" (icono UserPlus)
  - Abrir chat con contacto que ya tiene lead
  - Verificar que el botón aparece deshabilitado (verde) con tooltip

- [ ] **Crear Lead desde Chat**
  - Click en botón "Crear Lead" desde chat
  - Verificar que el modal se abre pre-configurado
  - Crear lead
  - Verificar que el botón desaparece o se deshabilita

---

### 9. Integración con Ventas

- [ ] **En Modal de Detalle**
  - Abrir modal de detalle de un lead
  - Verificar que aparece sección "Historial de Ventas"
  - Verificar que muestra todas las ventas del contacto
  - Verificar que muestra total de ventas reales

- [ ] **Comparación de Valores**
  - Lead con valor estimado: $1,000
  - Contacto con ventas reales: $1,500
  - Verificar que se muestran ambos valores
  - Verificar que el valor real está en verde

---

### 10. Métricas y Estadísticas

- [ ] **Actualización en Tiempo Real**
  - Crear un nuevo lead
  - Verificar que "Total Leads" se incrementa
  - Mover lead a etapa "Venta"
  - Verificar que los contadores se actualizan
  - Cambiar status de lead a "won"
  - Verificar que "Leads Ganados" se incrementa
  - Verificar que la tasa de conversión se recalcula

- [ ] **Cálculos Correctos**
  - Verificar que "Valor Total" es la suma de todos los valores estimados
  - Verificar que "Score Promedio" es el promedio de todos los scores
  - Verificar que "Tasa de Conversión" es (won_leads / total_leads) * 100

---

## 🐛 Errores Comunes a Verificar

- [ ] **Errores de Consola**
  - Abrir DevTools (F12)
  - Verificar que no hay errores en la consola
  - Verificar que no hay warnings críticos

- [ ] **Errores de Red**
  - Verificar que no hay errores 404, 500, etc.
  - Verificar que todas las llamadas a la API son exitosas

- [ ] **Errores de Permisos**
  - Probar con usuario no-admin
  - Verificar que solo ve sus productos asignados
  - Verificar que no puede acceder a leads de otros productos

---

## ✅ Criterios de Aprobación

- ✅ Todas las funcionalidades básicas funcionan
- ✅ No hay errores en consola
- ✅ El drag & drop funciona correctamente
- ✅ Las métricas se actualizan en tiempo real
- ✅ La integración con chat funciona
- ✅ La integración con ventas funciona
- ✅ El filtrado multi-producto funciona correctamente

---

**Fecha:** 2025-01-30

