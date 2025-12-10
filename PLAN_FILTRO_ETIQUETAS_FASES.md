# 📋 Plan: Filtro de Etiquetas en Panel Izquierdo

## 🎯 Objetivo
Implementar un botón de filtro "Etiquetas" debajo del buscador de conversaciones que:
1. Se despliegue mostrando las etiquetas existentes
2. Permita filtrar conversaciones por etiqueta
3. Tenga un botón para añadir nuevas etiquetas (abre el modal)

## 📐 Ubicación
- **Panel**: Izquierdo (ConversationList)
- **Posición**: Debajo del buscador de conversaciones
- **Estilo**: Similar a los filtros de WhatsApp Web (Todos, No leídos, Grupos, etc.)

---

## 🔄 FASES DE IMPLEMENTACIÓN

### **FASE 1: Botón de Filtro y Estructura Base** (30 min)
**Objetivo**: Crear el botón de filtro "Etiquetas" con menú desplegable básico

**Tareas**:
1. Modificar `ConversationList.jsx`:
   - Agregar estado para controlar visibilidad del menú de etiquetas
   - Agregar botón "Etiquetas" debajo del buscador
   - Crear estructura del menú desplegable (sin funcionalidad aún)
   - Estilos básicos (similar a WhatsApp Web)

**Resultado esperado**:
- Botón "Etiquetas" visible debajo del buscador
- Al hacer clic, se despliega un menú vacío
- Estilos consistentes con el diseño actual

---

### **FASE 2: Cargar y Mostrar Etiquetas Existentes** (30 min)
**Objetivo**: Mostrar las etiquetas de la cuenta en el menú desplegable

**Tareas**:
1. Modificar `ConversationList.jsx`:
   - Obtener `accountId` (necesario para cargar etiquetas)
   - Llamar a `getAllTags(accountId)` al abrir el menú
   - Mostrar lista de etiquetas con:
     - Color de la etiqueta (círculo o cuadrado pequeño)
     - Nombre de la etiqueta
     - Checkbox o indicador si está seleccionada
   - Manejar estados de carga y error

**Resultado esperado**:
- Al abrir el menú, se cargan y muestran las etiquetas existentes
- Cada etiqueta muestra su color y nombre
- Lista vacía si no hay etiquetas

---

### **FASE 3: Filtrar Conversaciones por Etiqueta** (45 min)
**Objetivo**: Implementar la funcionalidad de filtrado

**Tareas**:
1. Modificar `ConversationList.jsx`:
   - Agregar estado para etiquetas seleccionadas (puede ser múltiple)
   - Al hacer clic en una etiqueta, agregarla/quitar del filtro
   - Modificar `getConversations` para incluir filtro por etiquetas
   - Actualizar `conversations.js` service si es necesario para soportar filtro por etiquetas
   - Mostrar indicador visual de etiquetas activas
   - Botón "Limpiar filtros" cuando hay etiquetas seleccionadas

**Resultado esperado**:
- Al seleccionar una etiqueta, se filtran las conversaciones
- Solo se muestran conversaciones que tienen esa etiqueta
- Se puede seleccionar múltiples etiquetas (AND o OR - decidir lógica)
- Se puede limpiar el filtro

---

### **FASE 4: Botón "Añadir Etiqueta" y Modal** (30 min)
**Objetivo**: Agregar botón para crear nuevas etiquetas

**Tareas**:
1. Modificar `ConversationList.jsx`:
   - Agregar botón "➕ Añadir etiqueta" al final del menú
   - Al hacer clic, abrir `TagManagerModal`
   - Pasar `accountId` al modal
   - Recargar etiquetas después de crear una nueva

2. Modificar `TagManagerModal.jsx` (si es necesario):
   - Asegurar que funciona correctamente cuando se abre desde ConversationList
   - Recargar lista de etiquetas después de crear/editar/eliminar

**Resultado esperado**:
- Botón "Añadir etiqueta" visible en el menú
- Al hacer clic, se abre el modal para crear etiqueta
- Después de crear, el menú se actualiza con la nueva etiqueta

---

### **FASE 5: Mejoras Visuales y UX** (30 min)
**Objetivo**: Pulir la interfaz y experiencia de usuario

**Tareas**:
1. Mejoras visuales:
   - Animaciones suaves al abrir/cerrar menú
   - Hover effects en etiquetas
   - Indicador visual de etiquetas seleccionadas
   - Badge con número de conversaciones filtradas
   - Icono de flecha que rota al abrir/cerrar

2. UX:
   - Cerrar menú al hacer clic fuera
   - Cerrar menú al seleccionar una etiqueta (opcional)
   - Mostrar "Sin etiquetas" cuando no hay etiquetas creadas
   - Tooltips y textos de ayuda

**Resultado esperado**:
- Interfaz pulida y profesional
- Animaciones suaves
- Feedback visual claro

---

## 📁 Archivos a Modificar

1. **`src/components/whatsapp/ConversationList.jsx`**
   - Agregar botón de filtro "Etiquetas"
   - Agregar menú desplegable
   - Integrar carga de etiquetas
   - Implementar filtrado

2. **`src/services/whatsapp/conversations.js`** (si es necesario)
   - Agregar soporte para filtrar por etiquetas en `getConversations`

3. **`src/components/whatsapp/TagManagerModal.jsx`** (posible)
   - Asegurar compatibilidad cuando se abre desde ConversationList

---

## 🎨 Diseño Visual

### Botón de Filtro:
```
┌─────────────────────────────┐
│ 🔍 Buscar conversaciones... │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 🏷️ Etiquetas          ▼     │  ← Botón con flecha
└─────────────────────────────┘
```

### Menú Desplegable:
```
┌─────────────────────────────┐
│ 🏷️ Etiquetas          ▲     │
├─────────────────────────────┤
│ ⬛ PRE REGISTRADOS          │  ← Etiqueta con color
│ ⬛ Seguimiento              │
│ ⬛ Cliente VIP              │
│                             │
│ ─────────────────────────── │
│ ➕ Añadir etiqueta          │  ← Botón para añadir
└─────────────────────────────┘
```

---

## ✅ Criterios de Éxito

- [ ] Botón "Etiquetas" visible debajo del buscador
- [ ] Menú se despliega al hacer clic
- [ ] Muestra todas las etiquetas de la cuenta
- [ ] Permite filtrar conversaciones por etiqueta
- [ ] Botón "Añadir etiqueta" abre el modal
- [ ] Después de crear etiqueta, se actualiza el menú
- [ ] Interfaz consistente con WhatsApp Web
- [ ] Funciona correctamente en mobile y desktop

---

## 🚀 Orden de Implementación

1. **FASE 1** → Testing básico
2. **FASE 2** → Testing de carga
3. **FASE 3** → Testing de filtrado
4. **FASE 4** → Testing completo
5. **FASE 5** → Testing final y pulido

