# 📋 FASE 1: FUNDACIÓN - PLAN DETALLADO

**Fecha inicio:** 2025-01-30  
**Duración estimada:** 3 días  
**Objetivo:** Establecer la base de datos, configuración y webhook básico

---

## 🎯 OBJETIVOS DE FASE 1

1. ✅ Schema completo de base de datos en Supabase
2. ✅ Configuración de cuentas WhatsApp
3. ✅ Webhook básico funcionando (recibir mensajes)
4. ✅ Testing completo de FASE 1
5. ✅ Documentación actualizada

---

## 📦 SUBFASES DETALLADAS

### **SUBFASE 1.1: Schema de Base de Datos** (4-5 horas)

#### Tareas:
- [ ] Crear archivo SQL con todas las tablas
- [ ] Tabla `whatsapp_accounts`
- [ ] Tabla `whatsapp_contacts` (con campos híbridos)
- [ ] Tabla `whatsapp_messages` (con `sent_via`)
- [ ] Tabla `whatsapp_sequences`
- [ ] Tabla `whatsapp_sequence_messages`
- [ ] Tabla `puppeteer_queue` ⭐
- [ ] Tabla `puppeteer_config` ⭐
- [ ] Tabla `whatsapp_delivery_issues`
- [ ] Tabla `whatsapp_webhook_logs`
- [ ] Crear todos los índices
- [ ] Crear triggers para `updated_at`
- [ ] Crear función para actualizar `total_messages` en secuencias
- [ ] Configurar RLS (Row Level Security) básico
- [ ] Ejecutar migración en Supabase
- [ ] Verificar que todas las tablas se crearon correctamente

#### Archivos a crear:
- `supabase/migrations/001_whatsapp_hybrid_schema.sql`
- `scripts/verify-schema.sql` (para verificación)

#### Testing:
- [ ] Verificar que todas las tablas existen
- [ ] Verificar que todos los índices se crearon
- [ ] Verificar que los triggers funcionan
- [ ] Verificar que RLS está activado
- [ ] Insertar datos de prueba y verificar constraints

---

### **SUBFASE 1.2: Funciones SQL Auxiliares** (2-3 horas)

#### Tareas:
- [ ] Función `calculate_window_24h(contact_id)`
  - Calcula `window_expires_at` desde `last_interaction_at`
  - Retorna si ventana está activa
- [ ] Función `update_contact_interaction(contact_id, source)`
  - Actualiza `last_interaction_at`
  - Actualiza `last_interaction_source`
  - Recalcula `window_expires_at`
  - Actualiza contadores según `source`
- [ ] Función `check_sequence_next_message(contact_id)`
  - Verifica si es momento de enviar siguiente mensaje
  - Retorna información del mensaje a enviar
- [ ] Función `decide_send_method(contact_id)` ⭐
  - Verifica si contacto < 72h
  - Verifica ventana 24h
  - Retorna método recomendado ('cloud_api' o 'puppeteer')
- [ ] Función `add_to_puppeteer_queue(contact_id, message_data)` ⭐
  - Agrega mensaje a `puppeteer_queue`
  - Valida datos
  - Retorna ID del mensaje en cola

#### Archivos a crear:
- `supabase/migrations/002_whatsapp_functions.sql`
- `scripts/test-functions.sql` (para testing)

#### Testing:
- [ ] Probar `calculate_window_24h` con diferentes escenarios
- [ ] Probar `update_contact_interaction` con diferentes sources
- [ ] Probar `check_sequence_next_message` con diferentes posiciones
- [ ] Probar `decide_send_method` con diferentes escenarios
- [ ] Probar `add_to_puppeteer_queue` con diferentes tipos de mensaje

---

### **SUBFASE 1.3: Configuración de Storage y Realtime** (1-2 horas)

#### Tareas:
- [ ] Crear bucket `whatsapp-media` en Supabase Storage
- [ ] Configurar políticas de acceso al bucket
  - Lectura pública para media
  - Escritura solo con service role
- [ ] Habilitar Realtime en tablas críticas:
  - `whatsapp_contacts`
  - `whatsapp_messages`
  - `puppeteer_queue`
- [ ] Verificar que Realtime funciona

#### Archivos a crear:
- `supabase/migrations/003_storage_realtime.sql`
- `scripts/test-realtime.sql`

#### Testing:
- [ ] Subir archivo de prueba al bucket
- [ ] Verificar que se puede leer públicamente
- [ ] Suscribirse a cambios en tiempo real
- [ ] Verificar que se reciben eventos

---

### **SUBFASE 1.4: UI para Configurar Cuentas WhatsApp** (3-4 horas)

#### Tareas:
- [ ] Crear componente `WhatsAppAccountManager.jsx`
- [ ] Formulario para agregar cuenta:
  - Phone Number ID
  - Business Account ID
  - Access Token (input tipo password)
  - Verify Token
  - Número de teléfono
  - Nombre para mostrar
  - Asociación opcional a producto
- [ ] Validación de campos
- [ ] Guardar en BD (`whatsapp_accounts`)
- [ ] Lista de cuentas activas
- [ ] Editar cuenta existente
- [ ] Activar/desactivar cuenta
- [ ] Eliminar cuenta (con confirmación)

#### Archivos a crear:
- `src/components/whatsapp/WhatsAppAccountManager.jsx`
- `src/services/whatsapp/accounts.js`
- `src/utils/whatsapp/validation.js`
- `src/components/whatsapp/AccountForm.jsx`
- `src/components/whatsapp/AccountList.jsx`

#### Testing:
- [ ] Agregar cuenta de prueba
- [ ] Verificar que se guarda en BD
- [ ] Editar cuenta
- [ ] Activar/desactivar
- [ ] Validar que campos requeridos funcionan
- [ ] Probar con datos inválidos

---

### **SUBFASE 1.5: Edge Function - Webhook Básico** (4-5 horas)

#### Tareas:
- [ ] Crear Edge Function `whatsapp-webhook`
- [ ] Implementar verificación GET (webhook setup)
  - Verificar `hub.verify_token`
  - Retornar `hub.challenge`
- [ ] Implementar procesamiento POST
  - Parsear payload de WhatsApp
  - Identificar tipo de evento (message, status)
  - Guardar en `whatsapp_webhook_logs`
- [ ] Procesar eventos de tipo `message`:
  - Extraer datos del mensaje
  - Identificar si es entrante o saliente
  - Detectar `is_from_me = true` (envío manual)
  - Crear/actualizar contacto
  - Guardar mensaje en BD
  - Actualizar `last_interaction_at` si corresponde
- [ ] Procesar eventos de tipo `status`:
  - Actualizar status del mensaje (sent, delivered, read, failed)
  - Actualizar `status_updated_at`
- [ ] Manejo de errores y logging

#### Archivos a crear:
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-webhook/types.ts`
- `supabase/functions/whatsapp-webhook/utils.ts`
- `src/services/whatsapp/webhook-processor.js` (helpers para frontend)

#### Testing:
- [ ] Probar verificación GET con token correcto
- [ ] Probar verificación GET con token incorrecto
- [ ] Probar POST con mensaje de texto entrante
- [ ] Probar POST con mensaje saliente (`is_from_me = true`)
- [ ] Probar POST con evento de status
- [ ] Verificar que se guardan en BD correctamente
- [ ] Verificar que se actualiza `last_interaction_at`
- [ ] Probar con payloads inválidos

---

### **SUBFASE 1.6: Integración en App Principal** (2-3 horas)

#### Tareas:
- [ ] Agregar vista "WhatsApp" en sidebar de `App.jsx`
- [ ] Crear ruta/vista principal de WhatsApp
- [ ] Integrar `WhatsAppAccountManager` en vista
- [ ] Mostrar estado de cuentas activas
- [ ] Agregar navegación entre secciones
- [ ] Agregar indicador de webhook activo

#### Archivos a modificar:
- `src/App.jsx` (agregar vista WhatsApp)
- `src/components/whatsapp/WhatsAppDashboard.jsx` (vista principal)

#### Testing:
- [ ] Verificar que aparece en sidebar
- [ ] Navegar a vista WhatsApp
- [ ] Verificar que se muestra `WhatsAppAccountManager`
- [ ] Verificar que se pueden agregar cuentas desde la app

---

### **SUBFASE 1.7: Testing Completo de FASE 1** (3-4 horas)

#### Tareas:
- [ ] Testing de base de datos:
  - Insertar datos de prueba en todas las tablas
  - Verificar constraints
  - Verificar triggers
  - Verificar funciones SQL
- [ ] Testing de webhook:
  - Configurar webhook en Meta Developer Console
  - Enviar mensaje de prueba desde WhatsApp
  - Verificar que se recibe y procesa
  - Verificar que se guarda en BD
- [ ] Testing de UI:
  - Agregar cuenta desde UI
  - Verificar que se guarda
  - Editar cuenta
  - Activar/desactivar
- [ ] Testing de integración:
  - Flujo completo: agregar cuenta → recibir mensaje → ver en BD
- [ ] Documentar resultados
- [ ] Crear checklist de verificación

#### Archivos a crear:
- `tests/FASE_1_TEST_RESULTS.md`
- `tests/FASE_1_CHECKLIST.md`

---

## 📝 DOCUMENTACIÓN

### Documentos a crear/actualizar:
- [ ] `FASE_1_PROGRESO.md` - Tracking de progreso
- [ ] `FASE_1_TEST_RESULTS.md` - Resultados de testing
- [ ] `FASE_1_COMPLETADA.md` - Resumen de lo completado

---

## ✅ CRITERIOS DE ÉXITO FASE 1

1. ✅ Todas las tablas creadas correctamente
2. ✅ Todas las funciones SQL funcionando
3. ✅ Storage y Realtime configurados
4. ✅ UI para gestionar cuentas funcionando
5. ✅ Webhook recibiendo y procesando mensajes
6. ✅ Integración en app principal
7. ✅ Testing completo pasado
8. ✅ Documentación actualizada

---

## 🚨 PUNTOS CRÍTICOS

1. **Webhook debe verificar token correctamente** - Seguridad
2. **Detección de `is_from_me = true`** - Para identificar envíos manuales
3. **Actualización de `last_interaction_at`** - Crítico para ventana 24h
4. **RLS configurado correctamente** - Seguridad de datos
5. **Realtime funcionando** - Para dashboard en tiempo real

---

## 📊 MÉTRICAS DE PROGRESO

- **Subfase 1.1:** 0/15 tareas
- **Subfase 1.2:** 0/5 tareas
- **Subfase 1.3:** 0/4 tareas
- **Subfase 1.4:** 0/8 tareas
- **Subfase 1.5:** 0/8 tareas
- **Subfase 1.6:** 0/6 tareas
- **Subfase 1.7:** 0/7 tareas

**Total:** 0/53 tareas completadas

---

**¿Listo para comenzar con SUBFASE 1.1?** 🚀

