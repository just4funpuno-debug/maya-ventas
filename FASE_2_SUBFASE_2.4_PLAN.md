# SUBFASE 2.4: Integración con UI - Plan Detallado

## 📋 Objetivo

Crear componentes de UI para enviar mensajes desde la interfaz, integrando con los servicios de Cloud API y decisión inteligente.

---

## 🎯 Funcionalidades a Implementar

### 1. Componente `MessageSender`
- Input para texto
- Selector de tipo de mensaje (texto, imagen, video, audio, documento)
- Selector de archivo para media
- Campo para caption (opcional)
- Botón de envío
- Indicador de método (Cloud API vs Puppeteer)
- Información de ventana 24h/72h

### 2. Integración con Servicios
- Usar `sendMessageIntelligent()` para envío automático
- Mostrar estado de carga
- Manejar errores y mostrarlos al usuario
- Actualizar UI después de envío exitoso

### 3. Indicadores Visuales
- Badge de método de envío (Cloud API / Puppeteer)
- Contador de horas restantes en ventana 24h
- Estado de ventana 72h
- Feedback visual de éxito/error

---

## 📁 Archivos a Crear

1. `src/components/whatsapp/MessageSender.jsx` - Componente principal
2. `src/components/whatsapp/WindowIndicator.jsx` - Indicador de ventana
3. `src/components/whatsapp/SendMethodBadge.jsx` - Badge de método

---

## 🔄 Flujo de Usuario

1. Usuario selecciona contacto
2. Usuario escribe mensaje o selecciona archivo
3. Sistema muestra método de envío previsto (Cloud API / Puppeteer)
4. Sistema muestra estado de ventana 24h/72h
5. Usuario hace clic en "Enviar"
6. Sistema envía mensaje usando `sendMessageIntelligent()`
7. Sistema muestra resultado (éxito/error)
8. UI se actualiza con el nuevo mensaje

---

## ✅ Criterios de Éxito

- ✅ Usuario puede enviar mensajes de texto
- ✅ Usuario puede enviar mensajes con media
- ✅ Sistema muestra método de envío previsto
- ✅ Sistema muestra estado de ventana
- ✅ Errores se muestran claramente
- ✅ UI se actualiza después de envío exitoso

---

**Estado:** Pendiente de implementación


