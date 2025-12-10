# ✅ Checklist de Verificación - Menú WhatsApp

## 📋 Estructura del Menú

### Menú Principal (Solo Admin)
1. **WhatsApp** (`whatsapp-accounts`)
   - ✅ Componente: `WhatsAppAccountManager`
   - ✅ Ruta: `view === 'whatsapp-accounts'`
   - ✅ Botón en menú: Línea 1927 App.jsx

2. **📋 CRM** (`whatsapp-sequences`)
   - ✅ Componente: `CRM`
   - ✅ Ruta: `view === 'whatsapp-sequences'`
   - ✅ Botón en menú: Línea 1928 App.jsx
   - ✅ Tabs internos: Leads y Secuencias

3. **💬 Chat WhatsApp** (`whatsapp-dashboard`)
   - ✅ Componente: `WhatsAppDashboard`
   - ✅ Ruta: `view === 'whatsapp-dashboard'`
   - ✅ Botón en menú: Línea 1929 App.jsx

4. **📋 Cola Puppeteer** (`whatsapp-queue`)
   - ✅ Componente: `PuppeteerQueuePanel`
   - ✅ Ruta: `view === 'whatsapp-queue'`
   - ✅ Botón en menú: Línea 1930 App.jsx

5. **🧪 Pruebas WhatsApp** (`whatsapp-test`)
   - ✅ Componente: `MessageSenderTest`
   - ✅ Ruta: `view === 'whatsapp-test'`
   - ✅ Botón en menú: Línea 1931 App.jsx

## 🔍 Verificaciones por Componente

### 1. WhatsAppAccountManager
- [ ] Carga correctamente
- [ ] Muestra lista de cuentas
- [ ] Botón "Agregar" funciona
- [ ] Edición de cuentas funciona
- [ ] Eliminación de cuentas funciona
- [ ] Tabs por productos funcionan
- [ ] Sin errores de consola

### 2. CRM (whatsapp-sequences)
- [ ] Carga correctamente
- [ ] Tab "Leads" funciona
- [ ] Tab "Secuencias" funciona
- [ ] Botón "Templates" visible
- [ ] Botón "Templates" se habilita/deshabilita correctamente
- [ ] Modal TemplateManager se abre correctamente
- [ ] Sin errores de consola

### 3. LeadsKanban (dentro de CRM)
- [ ] Carga pipeline y leads
- [ ] Muestra columnas por etapa
- [ ] Drag & drop funciona
- [ ] Botón "Agregar Lead" funciona
- [ ] Botón "Configurar Pipeline" funciona
- [ ] Botón "Asignar flujo" en cada etapa funciona
- [ ] Modal StageFlowSelector se abre correctamente
- [ ] Sin errores de consola

### 4. SequenceConfigurator (dentro de CRM)
- [ ] Carga secuencias
- [ ] Botón "Crear Secuencia" funciona
- [ ] Edición de secuencias funciona
- [ ] Eliminación de secuencias funciona
- [ ] SequenceMessageEditor funciona
- [ ] Agregar pasos funciona (mensaje, pausa, cambio etapa, condición)
- [ ] Sin errores de consola

### 5. WhatsAppDashboard (Chat WhatsApp)
- [ ] Carga conversaciones
- [ ] Selección de contacto funciona
- [ ] ChatWindow se muestra correctamente
- [ ] Envío de mensajes funciona
- [ ] Modales (Tags, Quick Replies, Blocked) funcionan
- [ ] Tabs por productos funcionan
- [ ] Sin errores de consola

### 6. ConversationList (dentro de WhatsAppDashboard)
- [ ] Lista de conversaciones se carga
- [ ] Búsqueda funciona
- [ ] Filtros funcionan
- [ ] Selección de contacto funciona
- [ ] Botones de menú (Tags, Quick Replies, Blocked) funcionan
- [ ] Sin errores de consola

### 7. ChatWindow (dentro de WhatsAppDashboard)
- [ ] Carga mensajes
- [ ] Envío de mensajes funciona
- [ ] Envío de media funciona
- [ ] Respuestas (reply) funcionan
- [ ] Reenvío (forward) funciona
- [ ] Indicador de ventana 24h funciona
- [ ] Badge de método de envío funciona
- [ ] Sin errores de consola

### 8. PuppeteerQueuePanel
- [ ] Carga mensajes en cola
- [ ] Estadísticas se muestran
- [ ] Filtros funcionan
- [ ] Botones de acción (pausar, reanudar, retry) funcionan
- [ ] Tabs por productos funcionan
- [ ] Sin errores de consola

### 9. MessageSenderTest
- [ ] Carga contactos y cuentas
- [ ] Pruebas de envío funcionan
- [ ] Indicadores de ventana funcionan
- [ ] Sin errores de consola

### 10. TemplateManager
- [ ] Se abre desde botón Templates en CRM
- [ ] Lista templates correctamente
- [ ] Crear template funciona
- [ ] Editar template funciona
- [ ] Eliminar template funciona
- [ ] Botón "Enviar a WhatsApp" funciona
- [ ] Botón "Sincronizar" funciona
- [ ] Sin errores de consola

### 11. TemplateForm
- [ ] Campos de formulario funcionan
- [ ] Header (text, image, video, document) funciona
- [ ] Body funciona
- [ ] Footer funciona
- [ ] Botones (quick reply, CTA) funcionan
- [ ] Validaciones funcionan
- [ ] Sin errores de consola

### 12. SequenceMessageForm
- [ ] Toggle "Mensaje Personalizado" / "Template de WhatsApp" funciona
- [ ] Selector de template funciona
- [ ] Campos de mensaje personalizado funcionan
- [ ] Campos de condición funcionan
- [ ] Guardar funciona
- [ ] Sin errores de consola

## 🔧 Verificaciones Técnicas

- [ ] Build sin errores
- [ ] Sin errores de linting
- [ ] Todos los imports están correctos
- [ ] Todos los componentes se renderizan sin errores
- [ ] Navegación entre vistas funciona
- [ ] Estados se mantienen correctamente
- [ ] Responsive funciona (móvil/desktop)


