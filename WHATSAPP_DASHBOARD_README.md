# 📱 WhatsApp Dashboard - Guía de Uso

## 📋 Descripción

Dashboard tipo WhatsApp Web para gestionar conversaciones y enviar mensajes a través de WhatsApp Cloud API. Incluye lista de conversaciones, chat individual, burbujas de mensajes y actualización en tiempo real.

---

## 🚀 Acceso

1. Inicia sesión como **administrador**
2. En el menú lateral, ve a **Administración** → **💬 Chat WhatsApp**
3. El dashboard se abrirá automáticamente

---

## 🎯 Funcionalidades

### 1. Lista de Conversaciones

**Ubicación:** Panel izquierdo del dashboard

**Características:**
- ✅ Lista de contactos ordenados por última interacción
- ✅ Búsqueda en tiempo real por nombre o teléfono
- ✅ Preview del último mensaje
- ✅ Indicador de mensajes no leídos
- ✅ Indicador de ventana 24h/72h
- ✅ Timestamp de última interacción

**Cómo usar:**
- **Buscar:** Escribe en el campo de búsqueda para filtrar conversaciones
- **Seleccionar:** Haz click en una conversación para abrir el chat
- **Ver no leídos:** El contador rojo muestra mensajes sin leer

---

### 2. Chat Individual

**Ubicación:** Panel derecho del dashboard

**Características:**
- ✅ Área de mensajes con scroll automático
- ✅ Carga paginada de mensajes históricos
- ✅ Header con información del contacto
- ✅ Botones de acción (llamada, video, más opciones)
- ✅ Integración con MessageSender para enviar mensajes

**Cómo usar:**
- **Ver mensajes:** Los mensajes se cargan automáticamente
- **Cargar más:** Haz scroll hacia arriba para cargar mensajes antiguos
- **Enviar mensaje:** Usa el componente de envío en la parte inferior
- **Volver:** En móvil, usa el botón de flecha para volver a la lista

---

### 3. Burbujas de Mensajes

**Tipos de mensajes soportados:**
- ✅ **Texto:** Mensajes de texto simples
- ✅ **Imagen:** Imágenes con caption opcional
- ✅ **Video:** Videos con caption opcional
- ✅ **Audio:** Archivos de audio con controles
- ✅ **Documento:** Documentos con descarga

**Estados de mensaje:**
- ⏱️ **Pendiente:** Reloj (mensaje enviándose)
- ✓ **Enviado:** Check simple (mensaje enviado)
- ✓✓ **Entregado:** Doble check gris (mensaje entregado)
- ✓✓ **Leído:** Doble check azul (mensaje leído)
- ❌ **Fallido:** Reloj rojo (error al enviar)

**Timestamps:**
- "Ahora" para mensajes recientes
- "Xm", "Xh", "Xd" para tiempos relativos
- Fecha completa para mensajes antiguos

---

### 4. Tiempo Real

**Características:**
- ✅ Actualización automática de lista de conversaciones
- ✅ Actualización automática de mensajes en chat
- ✅ Actualización de estados de mensajes
- ✅ Sin necesidad de recargar la página

**Cómo funciona:**
- Las suscripciones se activan automáticamente
- Los cambios se reflejan en tiempo real
- No requiere intervención del usuario

---

## 📱 Responsive Design

### Desktop
- Lista de conversaciones visible (izquierda)
- Chat individual visible (derecha)
- Layout tipo WhatsApp Web

### Móvil
- Lista de conversaciones oculta cuando hay chat abierto
- Botón de volver para regresar a la lista
- Diseño optimizado para pantallas pequeñas

---

## 🔧 Requisitos

### Cuentas WhatsApp
- Al menos una cuenta WhatsApp debe estar configurada
- La cuenta debe estar activa
- Si no hay cuentas, se mostrará un mensaje informativo

### Permisos
- Solo usuarios con rol **admin** pueden acceder
- Los usuarios normales no verán esta opción en el menú

---

## 🐛 Troubleshooting

### No se muestran conversaciones
1. Verifica que haya contactos en la base de datos
2. Verifica que haya mensajes asociados a los contactos
3. Revisa la consola del navegador para errores

### Los mensajes no se actualizan en tiempo real
1. Verifica la conexión a internet
2. Verifica que Realtime esté habilitado en Supabase
3. Revisa la consola del navegador para errores

### No puedo enviar mensajes
1. Verifica que haya una cuenta WhatsApp activa
2. Verifica que la ventana 24h o 72h esté abierta
3. Revisa los permisos de la cuenta WhatsApp

### El dashboard no carga
1. Verifica que tengas permisos de administrador
2. Verifica la conexión a Supabase
3. Revisa la consola del navegador para errores

---

## 📚 Documentación Técnica

### Componentes Principales

- **`WhatsAppDashboard`**: Componente principal que orquesta todo
- **`ConversationList`**: Lista de conversaciones
- **`ChatWindow`**: Ventana de chat individual
- **`MessageBubble`**: Burbuja de mensaje individual

### Servicios

- **`conversations.js`**: Gestión de conversaciones y mensajes
- **`accounts.js`**: Gestión de cuentas WhatsApp

### Base de Datos

- **`whatsapp_contacts`**: Tabla de contactos
- **`whatsapp_messages`**: Tabla de mensajes
- **`whatsapp_accounts`**: Tabla de cuentas WhatsApp

---

## 🎓 Próximos Pasos

- FASE 4: Motor de secuencias con decisión híbrida
- FASE 5: Panel de cola Puppeteer
- FASE 6: Integración con sistema de ventas

---

**Versión:** 1.0.0  
**Última actualización:** 2025-01-02


