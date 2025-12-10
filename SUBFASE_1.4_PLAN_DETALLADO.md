# 📋 SUBFASE 1.4: UI - Asignar Etiquetas a Contactos

## 🎯 Objetivo
Permitir asignar/quitar etiquetas a contactos y mostrarlas visualmente en el chat y en la lista de conversaciones.

---

## 📐 Tareas a Implementar

### **TAREA 1: Mostrar Etiquetas en ChatWindow Header** (30 min)
**Objetivo**: Mostrar las etiquetas asignadas al contacto actual como badges en el header del chat.

**Tareas**:
1. Modificar `ChatWindow.jsx`:
   - Cargar etiquetas del contacto usando `getContactTags(contactId)`
   - Mostrar etiquetas como badges pequeños debajo del nombre del contacto
   - Cada badge debe mostrar el color y nombre de la etiqueta
   - Diseño compacto y visualmente atractivo

**Resultado esperado**:
- Badges de etiquetas visibles en el header del chat
- Actualización automática cuando se asignan/quitan etiquetas

---

### **TAREA 2: Mostrar Etiquetas en ConversationList** (30 min)
**Objetivo**: Mostrar etiquetas asignadas a cada contacto en la lista de conversaciones.

**Tareas**:
1. Modificar `ConversationList.jsx`:
   - Cargar etiquetas para cada conversación
   - Mostrar badges de etiquetas en cada item de conversación
   - Diseño compacto (máximo 2-3 etiquetas visibles, resto con "+N")
   - Posición: debajo del nombre o al lado del timestamp

**Resultado esperado**:
- Etiquetas visibles en cada conversación de la lista
- Diseño que no sobrecargue la interfaz

---

### **TAREA 3: Modal para Asignar/Quitar Etiquetas desde ChatWindow** (45 min)
**Objetivo**: Permitir asignar/quitar etiquetas al contacto actual desde el botón "Etiquetas" en el header.

**Tareas**:
1. Modificar `TagManagerModal.jsx` o crear componente nuevo:
   - Cuando se pasa `contactId`, mostrar sección para asignar/quitar etiquetas
   - Lista de todas las etiquetas de la cuenta con checkbox
   - Etiquetas ya asignadas marcadas como seleccionadas
   - Botones para guardar cambios
   - Usar `setContactTags(contactId, tagIds)` para actualizar

2. Modificar `ChatWindow.jsx`:
   - El botón "Etiquetas" en el header debe abrir el modal con `contactId`
   - Recargar etiquetas después de guardar cambios

**Resultado esperado**:
- Modal funcional para gestionar etiquetas del contacto
- Actualización inmediata en el header después de guardar

---

### **TAREA 4: Optimización y Carga Eficiente** (15 min)
**Objetivo**: Optimizar la carga de etiquetas para evitar múltiples llamadas.

**Tareas**:
1. Crear hook `useContactTags(contactId)` si es necesario
2. Cachear etiquetas cuando sea posible
3. Usar suscripciones en tiempo real si aplica

**Resultado esperado**:
- Carga eficiente de etiquetas
- Sin llamadas redundantes a la API

---

## 📁 Archivos a Modificar

1. **`src/components/whatsapp/ChatWindow.jsx`**
   - Cargar y mostrar etiquetas en el header
   - Integrar modal para asignar/quitar etiquetas

2. **`src/components/whatsapp/ConversationList.jsx`**
   - Cargar y mostrar etiquetas en cada conversación

3. **`src/components/whatsapp/TagManagerModal.jsx`** (o nuevo componente)
   - Agregar funcionalidad para asignar/quitar etiquetas cuando hay `contactId`

4. **`src/services/whatsapp/tags.js`** (posible)
   - Verificar que `getContactTags` y `setContactTags` funcionen correctamente

---

## 🎨 Diseño Visual

### Badges de Etiquetas:
- **Tamaño**: Pequeño (text-xs)
- **Formato**: Círculo de color + nombre truncado
- **Máximo visible**: 2-3 etiquetas, resto con "+N"
- **Hover**: Mostrar tooltip con nombre completo

### En ChatWindow Header:
```
┌─────────────────────────────────────┐
│ [Avatar] Nombre del Contacto       │
│         🟠 VIP  🔵 Cliente          │  ← Badges aquí
│         En línea                    │
└─────────────────────────────────────┘
```

### En ConversationList:
```
┌─────────────────────────────────────┐
│ [Avatar] Nombre                     │
│         🟠 VIP  🔵 Cliente  +2      │  ← Badges aquí
│         Último mensaje...           │
└─────────────────────────────────────┘
```

---

## ✅ Criterios de Éxito

- [ ] Etiquetas visibles en header de ChatWindow
- [ ] Etiquetas visibles en cada conversación de ConversationList
- [ ] Modal funcional para asignar/quitar etiquetas
- [ ] Actualización inmediata después de cambios
- [ ] Diseño compacto y no sobrecargado
- [ ] Carga eficiente sin llamadas redundantes

---

## 🚀 Orden de Implementación

1. **TAREA 1** → Mostrar etiquetas en ChatWindow header
2. **TAREA 2** → Mostrar etiquetas en ConversationList
3. **TAREA 3** → Modal para asignar/quitar etiquetas
4. **TAREA 4** → Optimización y pulido

