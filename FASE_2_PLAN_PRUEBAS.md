# 🧪 FASE 2: Plan de Pruebas

## 📋 Objetivo

Verificar que todas las funcionalidades de FASE 2 funcionan correctamente antes de continuar con FASE 3.

---

## ✅ Checklist de Pruebas

### 1. Servicios Backend

#### 1.1 Cloud API Sender
- [ ] `sendTextMessage()` - Envío de texto exitoso
- [ ] `sendTextMessage()` - Validación de ventana 24h cerrada
- [ ] `sendTextMessage()` - Validación de ventana 72h cerrada
- [ ] `sendImageMessage()` - Envío de imagen exitoso
- [ ] `sendVideoMessage()` - Envío de video exitoso
- [ ] `sendAudioMessage()` - Envío de audio exitoso
- [ ] `sendDocumentMessage()` - Envío de documento exitoso

#### 1.2 Send Decision
- [ ] `decideSendMethod()` - Decide Cloud API cuando ventana activa
- [ ] `decideSendMethod()` - Decide Puppeteer cuando ventana cerrada
- [ ] `sendMessageIntelligent()` - Envío automático exitoso
- [ ] `addToPuppeteerQueue()` - Agregar a cola exitoso

#### 1.3 Window Utilities
- [ ] `isWindow24hActive()` - Detecta ventana activa
- [ ] `getHoursRemaining()` - Calcula horas correctamente
- [ ] `isWithin72hWindow()` - Detecta ventana 72h

### 2. Componentes UI

#### 2.1 MessageSender
- [ ] Renderiza correctamente
- [ ] Selector de tipo de mensaje funciona
- [ ] Input de texto funciona
- [ ] Selector de archivo funciona
- [ ] Campo de caption funciona
- [ ] Campo de filename funciona
- [ ] Selector de cuenta funciona
- [ ] Botón de envío funciona
- [ ] Muestra estado de carga
- [ ] Muestra errores correctamente
- [ ] Limpia formulario después de envío

#### 2.2 WindowIndicator
- [ ] Muestra ventana 24h activa
- [ ] Muestra ventana 72h activa
- [ ] Muestra ventana cerrada
- [ ] Actualiza automáticamente

#### 2.3 SendMethodBadge
- [ ] Muestra badge Cloud API
- [ ] Muestra badge Puppeteer
- [ ] Muestra razón del método

### 3. Integración

- [ ] MessageSender se integra con sendMessageIntelligent
- [ ] WindowIndicator se integra con servicios
- [ ] SendMethodBadge se integra con decideSendMethod
- [ ] Flujo completo de envío funciona

---

## 🧪 Componente de Prueba

Se creará un componente de prueba que permita probar todas las funcionalidades de forma interactiva.

---

**Estado:** Pendiente de ejecución


