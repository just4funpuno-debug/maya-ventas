# 📋 Plan de Implementación: Botón Contactos Bloqueados

## ✅ Confirmación del Usuario

- **Tipo de vista:** Modal (se queda en el chat)
- **Información:** Bloqueados + Sospechosos (completo)
- **Filtrado automático:** Sí — solo del producto actual del chat
- **Restricción de acceso:** Todos los usuarios con acceso al chat

---

## 🎯 Fases de Implementación

### **FASE 1: Crear BlockedContactsModal (Wrapper Modal)**

**Objetivo:** Crear un componente modal que envuelva `BlockedContactsPanel` y permita mostrarlo como modal overlay.

#### **SUBFASE 1.1: Crear estructura básica del modal**
- Crear archivo `src/components/whatsapp/BlockedContactsModal.jsx`
- Estructura básica: Header, cuerpo, botón cerrar
- Aceptar props: `isOpen`, `onClose`, `productId`, `session`

#### **SUBFASE 1.2: Integrar BlockedContactsPanel**
- Importar y renderizar `BlockedContactsPanel` dentro del modal
- Pasar `productId` al panel para filtrado automático
- Ajustar estilos para que se vea bien en modal

#### **SUBFASE 1.3: Ajustar restricción de acceso**
- Modificar `BlockedContactsPanel` para que no requiera ser admin
- Permitir acceso a todos los usuarios con acceso al chat

#### **TESTING FASE 1:**
- Verificar que el modal se abre y cierra correctamente
- Verificar que muestra `BlockedContactsPanel` correctamente
- Verificar que filtra por `productId` automáticamente

---

### **FASE 2: Agregar Botón en ConversationList**

**Objetivo:** Agregar el botón de "Contactos Bloqueados" en la lista de conversaciones.

#### **SUBFASE 2.1: Agregar botón**
- Importar ícono `Ban` o `ShieldAlert` de lucide-react
- Agregar botón junto a botones de Etiquetas y Respuestas Rápidas
- Aplicar estilos consistentes

#### **SUBFASE 2.2: Conectar callback**
- Agregar prop `onOpenBlockedContacts` a `ConversationList`
- Conectar botón con el callback
- Pasar callback desde `WhatsAppDashboard`

#### **TESTING FASE 2:**
- Verificar que el botón aparece en la UI
- Verificar que el botón tiene el ícono correcto
- Verificar que al hacer clic se llama al callback

---

### **FASE 3: Integrar en WhatsAppDashboard**

**Objetivo:** Conectar todo el flujo en el dashboard principal.

#### **SUBFASE 3.1: Agregar estado y handlers**
- Agregar estado `showBlockedContactsModal`
- Crear handlers para abrir/cerrar modal
- Conectar con botón en `ConversationList`

#### **SUBFASE 3.2: Renderizar modal**
- Importar `BlockedContactsModal`
- Renderizar modal cuando `showBlockedContactsModal` es true
- Pasar `selectedProductId` y `session` al modal

#### **TESTING FASE 3:**
- Verificar flujo completo: botón → modal abre
- Verificar que muestra contactos del producto correcto
- Verificar que funciona para usuarios no-admin
- Verificar que se puede cerrar el modal

---

## 📝 Archivos a Modificar/Crear

### **Nuevos:**
1. `src/components/whatsapp/BlockedContactsModal.jsx` (NUEVO)

### **Modificar:**
1. `src/components/whatsapp/ConversationList.jsx`
   - Agregar botón
   - Agregar prop `onOpenBlockedContacts`

2. `src/components/whatsapp/WhatsAppDashboard.jsx`
   - Agregar estado para modal
   - Agregar handlers
   - Renderizar modal
   - Pasar callback a ConversationList

3. `src/components/whatsapp/BlockedContactsPanel.jsx`
   - Modificar restricción de acceso (si es necesario)

---

## ✅ Criterios de Éxito

### **FASE 1:**
- ✅ Modal se crea y muestra correctamente
- ✅ Panel se integra dentro del modal
- ✅ Filtrado por producto funciona

### **FASE 2:**
- ✅ Botón aparece en la UI
- ✅ Botón tiene el ícono correcto
- ✅ Callback se ejecuta al hacer clic

### **FASE 3:**
- ✅ Flujo completo funciona
- ✅ Modal muestra contactos del producto correcto
- ✅ Acceso funciona para todos los usuarios

---

## 🧪 Testing

Cada fase/subfase incluirá:
1. **Testing manual:** Verificar visualmente que funciona
2. **Testing de integración:** Verificar que no rompe funcionalidad existente
3. **Testing de edge cases:** Verificar casos límite



