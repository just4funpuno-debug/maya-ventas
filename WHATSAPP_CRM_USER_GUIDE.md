# 👤 WhatsApp CRM - Guía de Usuario

**Versión:** 1.0.0  
**Fecha:** 2025-02-01

---

## 📋 Tabla de Contenidos

1. [Primeros Pasos](#primeros-pasos)
2. [Conectar Cuenta WhatsApp](#conectar-cuenta-whatsapp)
3. [Enviar Mensajes](#enviar-mensajes)
4. [Gestionar Secuencias](#gestionar-secuencias)
5. [Ver Conversaciones](#ver-conversaciones)
6. [Integración con Ventas](#integración-con-ventas)
7. [Gestionar Bloqueados](#gestionar-bloqueados)
8. [Cola Puppeteer](#cola-puppeteer)

---

## 🚀 Primeros Pasos

### Acceso al Sistema

1. Iniciar sesión en la aplicación Maya Ventas
2. Ir al menú lateral
3. Buscar secciones de WhatsApp:
   - **⚙️ Configuración WhatsApp** - Gestionar cuentas
   - **💬 Chat WhatsApp** - Ver conversaciones
   - **⚙️ Secuencias WhatsApp** - Crear secuencias
   - **🤖 Cola Puppeteer** - Ver cola de envíos
   - **🚫 Contactos Bloqueados** - Gestionar bloqueados

---

## 🔌 Conectar Cuenta WhatsApp

### Método 1: OAuth (Recomendado)

1. Ir a **"⚙️ Configuración WhatsApp"**
2. Click en **"Conectar con Meta"**
3. Se abrirá una ventana de Meta
4. Autorizar la aplicación
5. Si es necesario, escanear QR para coexistencia
6. La cuenta se conecta automáticamente

### Método 2: Manual

1. Ir a **"⚙️ Configuración WhatsApp"**
2. Click en **"Agregar Cuenta"**
3. Completar formulario:
   - **Phone Number ID** (de Meta Developer Console)
   - **Business Account ID** (de Meta Developer Console)
   - **Access Token** (de Meta Developer Console)
   - **Verify Token** (crear uno único)
   - **Número de Teléfono** (formato: +59112345678)
   - **Nombre para Mostrar**
4. Click en **"Guardar"**

### Coexistencia

Si necesitas usar WhatsApp Web al mismo tiempo:

1. Después de conectar, aparecerá un modal con QR
2. Escanear QR con tu celular
3. Click en **"Verificar Conexión"**
4. Esperar confirmación

---

## 💬 Enviar Mensajes

### Enviar Mensaje de Texto

1. Ir a **"💬 Chat WhatsApp"**
2. Seleccionar contacto de la lista
3. Escribir mensaje en el campo de texto
4. Click en **"Enviar"** o presionar Enter
5. El sistema decide automáticamente el método (Cloud API o Puppeteer)

### Enviar Imagen/Video/Audio/Documento

1. Seleccionar contacto
2. Click en el ícono de **adjuntar** (📎)
3. Seleccionar tipo de archivo:
   - **Imagen** - JPG, PNG, GIF
   - **Video** - MP4, AVI
   - **Audio** - MP3, WAV
   - **Documento** - PDF, DOC, etc.
4. Seleccionar archivo
5. (Opcional) Agregar caption
6. Click en **"Enviar"**

### Indicadores de Ventana

- **🟢 Ventana 24h Activa** - Mensajes gratis via Cloud API
- **🟡 Ventana 72h Activa** - Mensajes gratis via Cloud API
- **🔴 Ventana Cerrada** - Mensajes via Puppeteer (gratis)

---

## 📋 Gestionar Secuencias

### Crear Secuencia

1. Ir a **"⚙️ Secuencias WhatsApp"**
2. Click en **"Nueva Secuencia"**
3. Completar:
   - **Nombre** (ej: "Bienvenida Nuevos Clientes")
   - **Descripción** (opcional)
   - **Cuenta WhatsApp**
4. Click en **"Crear"**

### Agregar Mensajes a Secuencia

1. Seleccionar secuencia
2. Click en **"Agregar Mensaje"**
3. Seleccionar tipo:
   - **Texto** - Escribir mensaje
   - **Imagen/Video/Audio/Documento** - Subir archivo
4. Configurar:
   - **Delay desde mensaje anterior** (horas)
   - **Caption** (si es media)
5. Click en **"Agregar"**
6. Repetir para más mensajes

### Reordenar Mensajes

1. En la lista de mensajes
2. Usar botones **↑** y **↓** para mover
3. Los cambios se guardan automáticamente

### Activar/Desactivar Secuencia

1. En la lista de secuencias
2. Toggle **"Activa"** para activar/desactivar

### Asignar Secuencia a Contacto

1. Ir a **"💬 Chat WhatsApp"**
2. Seleccionar contacto
3. Click en **"Asignar Secuencia"**
4. Seleccionar secuencia
5. Click en **"Asignar"**

La secuencia se ejecutará automáticamente según los delays configurados.

---

## 💬 Ver Conversaciones

### Lista de Conversaciones

1. Ir a **"💬 Chat WhatsApp"**
2. Ver lista de contactos con mensajes
3. Ordenados por última interacción (más reciente primero)
4. Indicadores:
   - **🟢** - Ventana activa
   - **🔴** - Ventana cerrada
   - **📬** - Mensajes no leídos

### Buscar Contacto

1. En la lista de conversaciones
2. Usar campo de búsqueda
3. Buscar por nombre o teléfono

### Ver Chat Individual

1. Click en contacto de la lista
2. Ver historial de mensajes
3. Enviar nuevos mensajes
4. Ver historial de ventas (si está asociado)

### Historial de Ventas

En el chat individual, verás:
- Lista de ventas asociadas
- Fecha, productos, total
- Estado de entrega

---

## 🛒 Integración con Ventas

### Crear Contacto desde Venta

1. Al registrar una venta
2. Marcar checkbox **"Crear contacto WhatsApp"**
3. Seleccionar cuenta WhatsApp
4. Si el teléfono ya tiene contacto, se asocia automáticamente
5. Si no, se crea nuevo contacto

### Ver Ventas de Contacto

1. Ir a **"💬 Chat WhatsApp"**
2. Seleccionar contacto
3. Ver sección **"Historial de Ventas"**
4. Ver todas las ventas asociadas

---

## 🚫 Gestionar Bloqueados

### Ver Contactos Bloqueados

1. Ir a **"🚫 Contactos Bloqueados"**
2. Ver lista de:
   - **Bloqueados Confirmados** - Marcados como bloqueados
   - **Sospechosos** - Alta probabilidad de bloqueo

### Marcar como Bloqueado/No Bloqueado

1. En la lista de bloqueados
2. Click en **"Marcar como Bloqueado"** o **"Marcar como No Bloqueado"**
3. Confirmar acción

### Agregar Nota

1. Click en contacto
2. Agregar nota en campo de texto
3. Click en **"Guardar Nota"**

### Estadísticas

Ver estadísticas de bloqueo:
- Total bloqueados
- Total sospechosos
- Probabilidad promedio

---

## 🤖 Cola Puppeteer

### Ver Cola de Mensajes

1. Ir a **"🤖 Cola Puppeteer"**
2. Ver mensajes pendientes:
   - **Pendientes** - Esperando envío
   - **Procesando** - En proceso
   - **Enviados** - Completados
   - **Fallidos** - Con error

### Filtros

- Por estado (pending, processing, sent, failed)
- Por prioridad (HIGH, MEDIUM, LOW)
- Por tipo de mensaje
- Por búsqueda (nombre o teléfono)

### Estadísticas

Ver estadísticas de la cola:
- Total de mensajes
- Por estado
- Por prioridad
- Por tipo

### Log de Últimos Envíos

Ver log de últimos envíos:
- Mensajes enviados
- Mensajes fallidos
- Con detalles de error

### Pausar/Reanudar Bot

1. Ver estado del bot
2. Click en **"Pausar Bot"** (emergencia)
3. O **"Reanudar Bot"** para continuar

### Reintentar Mensaje Fallido

1. En la lista de mensajes fallidos
2. Click en **"Reintentar"**
3. El mensaje vuelve a la cola

---

## 💡 Consejos y Mejores Prácticas

### Mensajes

- ✅ Usar mensajes personalizados
- ✅ Evitar spam
- ✅ Respetar horarios de envío
- ✅ Responder rápidamente a clientes

### Secuencias

- ✅ Empezar con mensaje de bienvenida
- ✅ Usar delays apropiados (24h, 48h, etc.)
- ✅ No enviar más de 3-5 mensajes por secuencia
- ✅ Pausar si cliente responde

### Bloqueados

- ✅ Revisar bloqueados regularmente
- ✅ Marcar correctamente (bloqueado/no bloqueado)
- ✅ Agregar notas para referencia

---

## ❓ Preguntas Frecuentes

### ¿Por qué mi mensaje no se envía?

- Verificar que la cuenta esté activa
- Verificar que el contacto no esté bloqueado
- Verificar logs en "Cola Puppeteer"

### ¿Cómo sé qué método se usó para enviar?

- En el chat, ver badge de método (Cloud API o Puppeteer)
- En la cola Puppeteer, ver mensajes enviados

### ¿Puedo usar WhatsApp Web al mismo tiempo?

- Sí, usando coexistencia (escanear QR)

### ¿Cómo pausar una secuencia?

- La secuencia se pausa automáticamente si el cliente responde
- O desactivar la secuencia en "Secuencias WhatsApp"

---

**Última actualización:** 2025-02-01


