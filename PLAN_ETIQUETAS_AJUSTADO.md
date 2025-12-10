# Plan Ajustado: Etiquetas Integradas en Chat WhatsApp

## 🔄 Cambio de Estrategia

**Problema identificado**: El gestor de etiquetas estaba como menú separado, cuando debería estar integrado directamente en el Chat WhatsApp.

**Solución**: Integrar toda la funcionalidad de etiquetas dentro del `WhatsAppDashboard`.

---

## 📋 PLAN AJUSTADO

### **SUBFASE 1.3 (REVISADA): Integración en Chat WhatsApp**

#### Cambios Necesarios:

1. **Eliminar menú separado "Etiquetas"**
   - Remover botón del sidebar
   - Remover vista 'whatsapp-tags'
   - Mantener `TagManager.jsx` pero como componente interno

2. **Integrar en WhatsAppDashboard**
   - Agregar botón "⚙️ Gestionar Etiquetas" en el header del dashboard
   - Modal/panel deslizable para crear/editar/eliminar etiquetas
   - Usar el componente `TagManager` dentro del modal

3. **Integrar en ConversationList**
   - Mostrar badges de etiquetas en cada conversación
   - Agregar filtro por etiquetas (dropdown o chips)
   - Mostrar etiquetas asignadas visualmente

4. **Integrar en ChatWindow**
   - Botón "Etiquetas" en el header del chat
   - Modal para asignar/quitar etiquetas al contacto actual
   - Mostrar etiquetas asignadas como badges en el header

---

## 🎯 Flujo de Usuario Correcto

1. **Gestionar Etiquetas**: Desde el Chat WhatsApp → Botón "⚙️ Gestionar Etiquetas" → Modal con TagManager
2. **Asignar Etiquetas**: Desde un chat abierto → Botón "Etiquetas" → Modal para seleccionar etiquetas
3. **Filtrar por Etiquetas**: En la lista de conversaciones → Filtro de etiquetas → Ver solo chats con esa etiqueta
4. **Ver Etiquetas**: Las etiquetas se muestran como badges en cada conversación y en el header del chat

---

## ✅ Ventajas de este Enfoque

- ✅ Todo está en un solo lugar (Chat WhatsApp)
- ✅ Flujo más intuitivo
- ✅ No requiere navegar entre menús
- ✅ Filtrado directo desde la lista de conversaciones
- ✅ Asignación rápida desde el chat abierto

---

## 📝 Tareas de Implementación

### Tarea 1: Remover menú separado
- [ ] Eliminar botón "🏷️ Etiquetas" del sidebar
- [ ] Eliminar vista 'whatsapp-tags' de App.jsx
- [ ] Mantener TagManager.jsx (se usará como componente interno)

### Tarea 2: Integrar TagManager en WhatsAppDashboard
- [ ] Agregar botón "⚙️ Gestionar Etiquetas" en header
- [ ] Crear modal/panel para TagManager
- [ ] Integrar TagManager dentro del modal

### Tarea 3: Mostrar etiquetas en ConversationList
- [ ] Cargar etiquetas de cada contacto
- [ ] Mostrar badges de etiquetas en cada conversación
- [ ] Agregar filtro por etiquetas

### Tarea 4: Asignar etiquetas desde ChatWindow
- [ ] Botón "Etiquetas" en header del chat
- [ ] Modal para seleccionar/deseleccionar etiquetas
- [ ] Mostrar etiquetas asignadas como badges

---

**¿Procedemos con esta implementación ajustada?**


