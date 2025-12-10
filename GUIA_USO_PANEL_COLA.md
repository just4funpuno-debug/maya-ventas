# Guía de Uso: Panel de Cola Puppeteer

## Descripción

El Panel de Cola Puppeteer permite gestionar y monitorear los mensajes que están en la cola para ser enviados mediante el bot Puppeteer cuando no hay ventanas de mensajería gratuita activas.

## Acceso

1. Inicia sesión como **administrador**
2. En el menú lateral, selecciona **"📋 Cola Puppeteer"**
3. El panel se abrirá mostrando la cola de mensajes

## Funcionalidades

### 1. Visualizar Mensajes en Cola

El panel muestra todos los mensajes pendientes de envío, organizados por:
- **Estado**: Pendiente, Procesando, Enviado, Fallido
- **Prioridad**: Alta, Media, Baja
- **Tipo de mensaje**: Texto, Imagen, Video, Audio, Documento

### 2. Filtrar y Buscar

**Filtros disponibles:**
- **Estado**: Filtrar por estado del mensaje
- **Prioridad**: Filtrar por nivel de prioridad
- **Tipo**: Filtrar por tipo de mensaje (texto, imagen, etc.)
- **Búsqueda**: Buscar por nombre o teléfono del contacto

**Cómo usar:**
1. Selecciona el filtro deseado en los dropdowns
2. Escribe en el campo de búsqueda para buscar contactos
3. Los resultados se actualizan automáticamente

### 3. Ver Estadísticas

El panel muestra estadísticas en tiempo real:
- **Total**: Número total de mensajes en la cola
- **Pendientes**: Mensajes esperando procesamiento
- **Procesando**: Mensajes siendo enviados actualmente
- **Enviados**: Mensajes enviados exitosamente
- **Fallidos**: Mensajes que fallaron al enviar

### 4. Ver Log de Envíos

1. Haz clic en la pestaña **"Log"**
2. Verás un historial de los últimos envíos (exitosos y fallidos)
3. Los mensajes están ordenados por fecha (más recientes primero)

### 5. Pausar/Reanudar Bot

**Pausar Bot (Emergencia):**
1. Haz clic en el botón **"Pausar Bot"** (rojo)
2. Confirma la acción en el modal
3. El bot dejará de procesar mensajes de la cola

**Reanudar Bot:**
1. Haz clic en el botón **"Reanudar Bot"** (verde)
2. El bot comenzará a procesar mensajes nuevamente

⚠️ **Nota**: Pausar el bot detiene TODOS los envíos automáticos. Úsalo solo en emergencias.

### 6. Eliminar Mensaje de la Cola

1. Localiza el mensaje que deseas eliminar
2. Haz clic en el botón **"Eliminar"** (icono de basura)
3. Confirma la acción en el modal
4. El mensaje será eliminado permanentemente

### 7. Reintentar Mensaje Fallido

1. Localiza el mensaje con estado **"Fallido"**
2. Haz clic en el botón **"Reintentar"** (icono de rotación)
3. Confirma la acción en el modal
4. El mensaje volverá a estado **"Pendiente"** y se reintentará

## Información Mostrada

Cada mensaje en la cola muestra:
- **Contacto**: Nombre y teléfono
- **Tipo**: Texto, Imagen, Video, Audio, Documento
- **Estado**: Pendiente, Procesando, Enviado, Fallido
- **Prioridad**: Alta, Media, Baja
- **Fecha de agregado**: Cuándo se agregó a la cola
- **Fecha programada**: Cuándo se debe enviar
- **Intentos**: Número de veces que se ha intentado enviar
- **Error**: Mensaje de error (si falló)

## Estados de Mensajes

- **Pendiente** (🟡): Esperando ser procesado
- **Procesando** (🔵): Siendo enviado actualmente
- **Enviado** (🟢): Enviado exitosamente
- **Fallido** (🔴): Error al enviar (requiere revisión)

## Mejores Prácticas

1. **Revisar mensajes fallidos regularmente**: Identifica problemas de entrega
2. **Usar prioridades adecuadamente**: Marca mensajes urgentes como "Alta"
3. **No pausar el bot innecesariamente**: Solo en emergencias
4. **Monitorear el log**: Revisa el historial para identificar patrones

## Troubleshooting

### El bot no está procesando mensajes

1. Verifica que el bot esté **activo** (no pausado)
2. Revisa el estado del bot en el panel
3. Verifica que haya mensajes en estado "Pendiente"
4. Revisa los logs del servidor Puppeteer

### Mensajes quedan en "Procesando"

1. Espera unos minutos (puede estar enviando)
2. Si persiste, verifica el estado del bot Puppeteer
3. Considera pausar y reanudar el bot
4. Revisa los logs del servidor

### Muchos mensajes fallidos

1. Revisa los mensajes de error en cada mensaje
2. Verifica la conexión del bot con WhatsApp
3. Verifica que el número de WhatsApp esté activo
4. Revisa si hay bloqueos masivos

## Notas Técnicas

- Los mensajes se procesan en orden de prioridad (Alta → Media → Baja)
- El bot procesa mensajes de forma secuencial (uno a la vez)
- Los mensajes fallidos se pueden reintentar manualmente
- El log muestra los últimos 100 envíos por defecto


