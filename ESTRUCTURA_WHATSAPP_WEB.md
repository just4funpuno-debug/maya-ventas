# 📱 Estructura de WhatsApp Web

## 🎯 Visión General

WhatsApp Web replica la experiencia de la aplicación móvil en el navegador, manteniendo una interfaz familiar y funcional. La estructura principal consiste en **dos paneles principales** que se muestran lado a lado en desktop.

---

## 🏗️ Estructura Principal

### **1. Panel Izquierdo: Lista de Conversaciones**

#### Componentes:
- **Header del Panel Izquierdo**:
  - Barra de búsqueda (siempre visible)
  - Botón de menú (3 puntos verticales) para:
    - Nuevo chat
    - Nuevo grupo
    - Estado
    - Perfil
    - Configuración
    - Cerrar sesión

- **Lista de Conversaciones**:
  - Cada conversación muestra:
    - **Avatar** (foto de perfil o iniciales)
    - **Nombre del contacto** (o número si no hay nombre)
    - **Preview del último mensaje** (texto truncado)
    - **Timestamp** (hora relativa: "Ahora", "5m", "2h", "Ayer", fecha)
    - **Indicador de no leído** (badge verde con número)
    - **Estado del mensaje** (✓ enviado, ✓✓ entregado, ✓✓✓ leído - solo para mensajes propios)
    - **Indicador de pin** (si está fijado)
    - **Indicador de archivo** (si está archivado)

- **Ordenamiento**:
  - Conversaciones con mensajes no leídos primero
  - Luego ordenadas por última interacción (más reciente primero)
  - Conversaciones fijadas siempre arriba

- **Interacciones**:
  - Click en conversación → abre chat en panel derecho
  - Click derecho → menú contextual (fijar, archivar, silenciar, eliminar)
  - Scroll infinito para cargar más conversaciones

#### Características Visuales:
- Fondo: `#111b21` (verde oscuro muy oscuro)
- Hover: `#202c33` (verde oscuro más claro)
- Seleccionado: `#2a3942` (verde oscuro medio)
- Borde entre conversaciones: `#222d34`
- Texto principal: `#e9edef` (blanco/gris claro)
- Texto secundario: `#8696a0` (gris medio)
- Timestamp: `#8696a0`
- Badge no leído: `#25d366` (verde WhatsApp)

---

### **2. Panel Derecho: Ventana de Chat**

#### Componentes:

**A. Header del Chat**:
- **Avatar del contacto** (izquierda)
- **Nombre del contacto** (o número)
- **Estado** (en línea, última vez visto, escribiendo...)
- **Botones de acción** (derecha):
  - Llamada de voz
  - Llamada de video
  - Menú (3 puntos verticales):
    - Ver contacto
    - Buscar en conversación
    - Silenciar notificaciones
    - Borrar chat
    - Fijar chat
    - Archivar chat
    - Bloquear contacto
    - Reportar contacto

**B. Área de Mensajes**:
- **Fondo con patrón sutil** (puntos grises muy tenues)
- **Separadores de fecha** (centrados, con fondo semitransparente)
- **Burbujas de mensajes**:
  - **Mensajes propios** (derecha):
    - Fondo: `#005c4b` (verde oscuro)
    - Texto: `#e9edef` (blanco)
    - Timestamp: `#86b5b3` (gris verdoso claro)
    - Estado: ✓, ✓✓, ✓✓✓ (gris o azul si leído)
  
  - **Mensajes recibidos** (izquierda):
    - Fondo: `#202c33` (gris oscuro)
    - Texto: `#e9edef` (blanco)
    - Timestamp: `#8696a0` (gris)
  
  - **Agrupación**: Mensajes consecutivos del mismo remitente se agrupan (sin espacio entre ellos)
  - **Timestamps**: Se muestran solo en el último mensaje del grupo o al hacer hover

- **Tipos de mensajes**:
  - Texto
  - Imagen (con preview y caption opcional)
  - Video (con preview y caption opcional)
  - Audio (con barra de reproducción y duración)
  - Documento (con icono, nombre y tamaño)
  - Ubicación
  - Contacto
  - Stickers
  - GIFs

- **Mensajes citados (Reply)**:
  - Banda vertical de color a la izquierda
  - Nombre del remitente original
  - Preview del mensaje original (texto o tipo de media)

- **Mensajes reenviados**:
  - Indicador "Reenviado" arriba del mensaje
  - Nombre del remitente original (si está en contactos)

- **Mensajes eliminados**:
  - Texto: "Este mensaje fue eliminado"
  - Icono de candado
  - Fondo gris más oscuro

**C. Input de Mensaje**:
- **Barra superior** (cuando hay mensaje citado):
  - Muestra el mensaje citado
  - Botón para cancelar

- **Área de input**:
  - Botón "+" (izquierda) → menú de adjuntos:
    - Fotos y videos
    - Documento
    - Audio
    - Ubicación
    - Contacto
  - Campo de texto (expandible hasta ~5 líneas, luego scroll)
  - Botón de emoji (derecha del input)
  - Botón de envío (derecha, solo aparece cuando hay texto o media)

- **Características**:
  - Enter → enviar
  - Shift+Enter → nueva línea
  - Placeholder: "Escribe un mensaje"
  - Autocompletado de emojis con ":"
  - Preview de links (si hay URL en el texto)

---

## 🎨 Paleta de Colores de WhatsApp Web

### Colores Principales:
- **Fondo principal**: `#0b141a` (casi negro con tinte verde)
- **Fondo panel izquierdo**: `#111b21`
- **Fondo panel derecho**: `#0b141a`
- **Fondo mensajes propios**: `#005c4b`
- **Fondo mensajes recibidos**: `#202c33`
- **Texto principal**: `#e9edef`
- **Texto secundario**: `#8696a0`
- **Verde WhatsApp**: `#25d366`
- **Azul leído**: `#53bdeb`

### Bordes y Separadores:
- `#222d34` (bordes sutiles)
- `#313d45` (bordes más visibles)

---

## 📐 Layout Responsive

### Desktop (>768px):
- **Panel izquierdo**: Ancho fijo ~30-35% (no cambia según cantidad de chats)
- **Panel derecho**: Ancho flexible ~65-70% (ocupa espacio restante)
- **Ambos paneles siempre visibles** cuando hay conversación seleccionada

### Mobile (<768px):
- **Panel izquierdo**: Ocupa 100% cuando no hay chat seleccionado
- **Panel derecho**: Ocupa 100% cuando hay chat seleccionado (panel izquierdo se oculta)
- **Botón "Atrás"** en el header del chat para volver a la lista
- **Menú hamburguesa** para mostrar lista cuando hay chat abierto

---

## 🔄 Funcionalidades Clave

### 1. **Búsqueda**:
- Búsqueda en tiempo real en la lista de conversaciones
- Búsqueda dentro de una conversación específica (Ctrl+F o menú)

### 2. **Filtros**:
- Todos los chats
- No leídos
- Grupos
- Fijados

### 3. **Estados y Notificaciones**:
- Badge de no leídos en conversaciones
- Notificación de sonido (configurable)
- Indicador "escribiendo..." en tiempo real
- Indicador "en línea" / "última vez visto"

### 4. **Gestión de Conversaciones**:
- Fijar/desfijar
- Archivar/desarchivar
- Silenciar/activar notificaciones
- Eliminar chat (solo local, no elimina mensajes del servidor)
- Bloquear contacto

### 5. **Media y Archivos**:
- Preview de imágenes antes de enviar
- Compresión automática de imágenes
- Límite de tamaño para archivos
- Descarga de archivos recibidos

---

## 🆚 Comparación con Nuestra Implementación

### ✅ Lo que ya tenemos:
1. ✅ Layout de dos paneles (izquierda: conversaciones, derecha: chat)
2. ✅ Lista de conversaciones con avatar, nombre, preview, timestamp
3. ✅ Ventana de chat con header, mensajes y input
4. ✅ Burbujas de mensajes diferenciadas (propios vs recibidos)
5. ✅ Agrupación de mensajes consecutivos
6. ✅ Separadores de fecha
7. ✅ Fondo con patrón sutil
8. ✅ Input expandible con botón de emojis
9. ✅ Botón "+" para adjuntos
10. ✅ Envío con Enter, nueva línea con Shift+Enter
11. ✅ Mensajes citados (Reply)
12. ✅ Mensajes reenviados (Forward)
13. ✅ Responsive design (mobile/desktop)
14. ✅ Indicadores de estado (en línea, última vez visto)
15. ✅ Notificaciones en tiempo real

### ⚠️ Lo que podríamos mejorar/agregar:
1. ⚠️ **Colores**: Nuestra paleta es más neutra (grises), WhatsApp usa verdes oscuros
2. ⚠️ **Filtros en lista**: No tenemos filtros (Todos, No leídos, Grupos, Fijados)
3. ⚠️ **Menú contextual**: No tenemos click derecho en conversaciones
4. ⚠️ **Estados de mensaje**: No mostramos ✓, ✓✓, ✓✓✓ para mensajes propios
5. ⚠️ **Búsqueda dentro de chat**: No tenemos búsqueda dentro de una conversación
6. ⚠️ **Preview de links**: No detectamos y mostramos preview de URLs
7. ⚠️ **Gestión avanzada**: Faltan opciones como archivar, silenciar, bloquear
8. ⚠️ **Stickers y GIFs**: No soportamos estos tipos de mensajes aún
9. ⚠️ **Ubicación y Contacto**: No soportamos estos tipos de mensajes
10. ⚠️ **Menú de 3 puntos**: No tenemos menú completo en header del chat

---

## 📝 Notas de Diseño

### Principios de WhatsApp Web:
1. **Simplicidad**: Interfaz limpia, sin elementos innecesarios
2. **Familiaridad**: Replica la experiencia móvil
3. **Eficiencia**: Accesos rápidos a funciones comunes
4. **Feedback visual**: Estados claros (enviado, entregado, leído, escribiendo)
5. **Consistencia**: Mismos patrones en toda la aplicación

### Patrones de Interacción:
- **Hover**: Cambio sutil de color de fondo
- **Click**: Feedback inmediato (animación sutil)
- **Scroll**: Suave, con carga incremental
- **Keyboard shortcuts**: Enter para enviar, Ctrl+F para buscar
- **Drag & drop**: Arrastrar archivos al área de chat para adjuntar

---

## 🎯 Recomendaciones para Nuestra Implementación

### Prioridad Alta:
1. **Ajustar colores** (si el usuario lo desea) para acercarse más a WhatsApp Web
2. **Agregar estados de mensaje** (✓, ✓✓, ✓✓✓) para mensajes propios
3. **Implementar filtros** en la lista de conversaciones
4. **Agregar menú contextual** (click derecho) en conversaciones

### Prioridad Media:
5. **Búsqueda dentro de chat** (Ctrl+F)
6. **Preview de links** automático
7. **Gestión de conversaciones** (archivar, silenciar, bloquear)
8. **Menú completo** en header del chat

### Prioridad Baja:
9. **Soporte para Stickers y GIFs**
10. **Soporte para Ubicación y Contacto**
11. **Drag & drop** de archivos

---

## 📚 Referencias

- [WhatsApp Web](https://web.whatsapp.com/)
- [WhatsApp Design Guidelines](https://www.whatsapp.com/design/)
- Estructura basada en observación directa de la interfaz de WhatsApp Web

