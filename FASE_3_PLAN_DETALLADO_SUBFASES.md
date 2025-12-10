# FASE 3: Dashboard básico tipo WhatsApp Web - Plan Detallado

## 📋 Objetivo

Crear un dashboard tipo WhatsApp Web con lista de conversaciones, chat individual, burbujas de mensajes, estados y tiempo real.

---

## 🎯 Subfases

### SUBFASE 3.1: Servicio de Conversaciones
- Obtener lista de conversaciones (contactos con mensajes)
- Ordenar por última interacción
- Filtrar por búsqueda
- Obtener mensajes de un contacto
- Funciones auxiliares

### SUBFASE 3.2: Componente Lista de Conversaciones
- Lista de contactos con última interacción
- Búsqueda de contactos
- Indicador de no leídos
- Timestamp de última interacción
- Selección de contacto

### SUBFASE 3.3: Componente Chat Individual
- Área de mensajes
- Scroll automático
- Carga de mensajes históricos
- Integración con MessageSender

### SUBFASE 3.4: Componente Burbujas de Mensajes
- Burbujas de texto
- Burbujas de media (imagen, video, audio, documento)
- Estados de mensaje (enviado, entregado, leído)
- Timestamps
- Indicador de "escribiendo..."

### SUBFASE 3.5: Tiempo Real (Realtime)
- Suscripción a nuevos mensajes
- Actualización automática de lista
- Actualización automática de chat
- Indicadores de estado en tiempo real

### SUBFASE 3.6: Dashboard Principal
- Layout tipo WhatsApp Web
- Lista de conversaciones (izquierda)
- Chat individual (derecha)
- Responsive design
- Integración completa

### SUBFASE 3.7: Testing y Documentación
- Tests unitarios de servicios
- Tests de componentes
- Tests de integración
- Documentación completa

---

## 📁 Archivos a Crear

### Servicios
- `src/services/whatsapp/conversations.js` - Gestión de conversaciones
- `src/services/whatsapp/messages.js` - Gestión de mensajes

### Componentes
- `src/components/whatsapp/ConversationList.jsx` - Lista de conversaciones
- `src/components/whatsapp/ChatWindow.jsx` - Ventana de chat
- `src/components/whatsapp/MessageBubble.jsx` - Burbuja de mensaje
- `src/components/whatsapp/WhatsAppDashboard.jsx` - Dashboard principal

### Tests
- `tests/whatsapp/conversations.test.js`
- `tests/whatsapp/messages.test.js`
- `tests/whatsapp/components.test.js`

---

## ✅ Criterios de Éxito

- ✅ Lista de conversaciones funcional
- ✅ Chat individual funcional
- ✅ Burbujas de mensajes correctas
- ✅ Estados de mensajes visibles
- ✅ Tiempo real funcionando
- ✅ No rompe código existente
- ✅ Tests pasando
- ✅ Documentación completa

---

## 🛡️ Precauciones

- **NO modificar** archivos existentes sin necesidad
- **Crear nuevos archivos** para nuevas funcionalidades
- **Integrar cuidadosamente** con código existente
- **Testing exhaustivo** después de cada subfase
- **Documentar todo** el proceso

---

**Estado:** Pendiente de inicio
