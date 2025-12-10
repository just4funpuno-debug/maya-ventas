# 📱 WhatsApp Dashboard - Guía Técnica

## 🏗️ Arquitectura

### Estructura de Componentes

```
WhatsAppDashboard (Principal)
├── ConversationList (Lista de conversaciones)
│   ├── WindowIndicator (Indicador de ventana)
│   └── Búsqueda y filtrado
└── ChatWindow (Chat individual)
    ├── MessageBubble (Burbujas de mensajes)
    ├── MessageSender (Envío de mensajes)
    └── WindowIndicator (Indicador de ventana)
```

---

## 📡 Servicios

### `conversations.js`

**Funciones principales:**
- `getConversations(options)` - Obtener lista de conversaciones
- `getLastMessage(contactId)` - Obtener último mensaje
- `getContactMessages(contactId, options)` - Obtener mensajes de contacto
- `getContact(contactId)` - Obtener información de contacto
- `markMessagesAsRead(contactId)` - Marcar mensajes como leídos
- `subscribeConversations(callback)` - Suscripción tiempo real
- `subscribeContactMessages(contactId, callback)` - Suscripción mensajes

**Parámetros:**
- `options.search` - Búsqueda por nombre o teléfono
- `options.limit` - Límite de resultados (default: 50)
- `options.offset` - Offset para paginación (default: 0)

**Retorna:**
- `{ data: Array, error: Object|null }`

---

## 🔄 Flujo de Datos

### 1. Carga Inicial

```
WhatsAppDashboard monta
  ↓
getAllAccounts()
  ↓
getConversations()
  ↓
subscribeConversations()
  ↓
Renderiza ConversationList
```

### 2. Selección de Contacto

```
Usuario hace click en conversación
  ↓
onSelectContact(contactId)
  ↓
getContact(contactId)
  ↓
getContactMessages(contactId)
  ↓
markMessagesAsRead(contactId)
  ↓
subscribeContactMessages(contactId)
  ↓
Renderiza ChatWindow
```

### 3. Envío de Mensaje

```
Usuario envía mensaje
  ↓
MessageSender → sendTextMessage()
  ↓
Cloud API envía mensaje
  ↓
Webhook recibe confirmación
  ↓
Suscripción tiempo real actualiza UI
```

### 4. Tiempo Real

```
Nuevo mensaje recibido
  ↓
Webhook guarda en BD
  ↓
Suscripción detecta cambio
  ↓
Callback actualiza estado
  ↓
UI se actualiza automáticamente
```

---

## 🗄️ Esquema de Base de Datos

### `whatsapp_contacts`

```sql
- id (UUID)
- account_id (UUID)
- phone (VARCHAR)
- name (VARCHAR)
- last_interaction_at (TIMESTAMPTZ)
- window_expires_at (TIMESTAMPTZ)
- window_active (BOOLEAN)
- unread_count (INT)
```

### `whatsapp_messages`

```sql
- id (UUID)
- contact_id (UUID)
- account_id (UUID)
- message_type (VARCHAR)
- content_text (TEXT)
- media_url (TEXT)
- is_from_me (BOOLEAN)
- status (VARCHAR)
- timestamp (TIMESTAMPTZ)
```

---

## 🔐 Seguridad

### Row Level Security (RLS)

- Todas las tablas tienen RLS habilitado
- Solo usuarios autenticados pueden acceder
- Los usuarios solo ven sus propios datos (si aplica)

### Validaciones

- Validación de ventana 24h antes de enviar
- Validación de ventana 72h antes de enviar
- Validación de cuenta activa
- Validación de permisos de usuario

---

## ⚡ Optimizaciones

### Paginación
- Carga inicial: 50 conversaciones
- Carga de mensajes: 50 mensajes por página
- Scroll infinito para cargar más

### Caché
- Los datos se mantienen en estado local
- Actualización solo cuando hay cambios
- Evita recargas innecesarias

### Tiempo Real
- Suscripciones se limpian al desmontar
- Una suscripción por componente
- Evita memory leaks

---

## 🧪 Testing

### Tests Unitarios
- `conversations.test.js` - Servicio de conversaciones (13 tests)
- `components.test.js` - Integración de servicios (7 tests)
- `integration.test.js` - Flujo completo (5 tests)

### Ejecutar Tests
```bash
npm test -- tests/whatsapp
```

---

## 📝 Notas de Desarrollo

### Estado de Componentes
- `ConversationList`: `conversations`, `search`, `loading`, `error`
- `ChatWindow`: `contact`, `messages`, `loading`, `hasMore`
- `MessageBubble`: Props `message`, `isFromMe`

### Hooks Utilizados
- `useState` - Estado local
- `useEffect` - Efectos secundarios
- `useRef` - Referencias DOM
- `useMemo` - Memoización

### Dependencias Externas
- `@supabase/supabase-js` - Cliente Supabase
- `lucide-react` - Iconos
- `framer-motion` - Animaciones (si se usa)

---

## 🐛 Debugging

### Logs de Consola
- `[ConversationList]` - Logs de lista de conversaciones
- `[ChatWindow]` - Logs de ventana de chat
- `[getConversations]` - Logs de servicio

### Errores Comunes
1. **"No hay cuentas WhatsApp configuradas"**
   - Solución: Configurar al menos una cuenta en "WhatsApp" del menú

2. **"Error al cargar conversaciones"**
   - Solución: Verificar conexión a Supabase y permisos RLS

3. **"Los mensajes no se actualizan"**
   - Solución: Verificar que Realtime esté habilitado en Supabase

---

**Versión:** 1.0.0  
**Última actualización:** 2025-01-02


