# 🧪 FASE 1: PLAN DE TESTING

**Objetivo:** Verificar que todos los componentes de FASE 1 funcionan correctamente antes de pasar a FASE 2.

---

## 📋 CHECKLIST DE TESTING

### **1. TESTING DE BASE DE DATOS**

#### 1.1 Verificación de Tablas
- [ ] Verificar que `whatsapp_accounts` existe
- [ ] Verificar que `whatsapp_contacts` existe
- [ ] Verificar que `whatsapp_messages` existe
- [ ] Verificar que `whatsapp_sequences` existe
- [ ] Verificar que `whatsapp_sequence_messages` existe
- [ ] Verificar que `puppeteer_queue` existe
- [ ] Verificar que `puppeteer_config` existe
- [ ] Verificar que `whatsapp_delivery_issues` existe
- [ ] Verificar que `whatsapp_webhook_logs` existe

#### 1.2 Verificación de Índices
- [ ] Verificar índices en `whatsapp_contacts`
- [ ] Verificar índices en `whatsapp_messages`
- [ ] Verificar índices en `puppeteer_queue`
- [ ] Verificar índices en otras tablas

#### 1.3 Verificación de Constraints
- [ ] Probar insertar contacto sin `phone` (debe fallar)
- [ ] Probar insertar mensaje sin `contact_id` (debe fallar)
- [ ] Probar insertar con `sent_via` inválido (debe fallar)
- [ ] Probar UNIQUE constraint en `whatsapp_accounts.phone_number_id`
- [ ] Probar UNIQUE constraint en `whatsapp_contacts(account_id, phone)`

#### 1.4 Verificación de Triggers
- [ ] Insertar registro y verificar que `created_at` se establece
- [ ] Actualizar registro y verificar que `updated_at` se actualiza
- [ ] Verificar trigger de `total_messages` en secuencias

#### 1.5 Verificación de Funciones SQL
- [ ] Probar `calculate_window_24h()` con contacto nuevo
- [ ] Probar `calculate_window_24h()` con contacto con interacción reciente
- [ ] Probar `calculate_window_24h()` con contacto sin interacción
- [ ] Probar `update_contact_interaction()` con source 'client'
- [ ] Probar `update_contact_interaction()` con source 'cloud_api'
- [ ] Probar `update_contact_interaction()` con source 'puppeteer'
- [ ] Probar `update_contact_interaction()` con source 'manual'
- [ ] Probar `decide_send_method()` con contacto < 72h
- [ ] Probar `decide_send_method()` con contacto >= 72h y ventana activa
- [ ] Probar `decide_send_method()` con contacto >= 72h y ventana cerrada
- [ ] Probar `add_to_puppeteer_queue()` con mensaje de texto
- [ ] Probar `add_to_puppeteer_queue()` con mensaje de imagen

---

### **2. TESTING DE STORAGE Y REALTIME**

#### 2.1 Storage
- [ ] Verificar que bucket `whatsapp-media` existe
- [ ] Subir archivo de prueba (imagen)
- [ ] Verificar que se puede leer públicamente
- [ ] Verificar políticas de acceso
- [ ] Intentar subir sin permisos (debe fallar)

#### 2.2 Realtime
- [ ] Suscribirse a cambios en `whatsapp_contacts`
- [ ] Insertar contacto y verificar que se recibe evento
- [ ] Actualizar contacto y verificar que se recibe evento
- [ ] Suscribirse a cambios en `whatsapp_messages`
- [ ] Insertar mensaje y verificar que se recibe evento
- [ ] Suscribirse a cambios en `puppeteer_queue`
- [ ] Agregar mensaje a cola y verificar que se recibe evento

---

### **3. TESTING DE UI - GESTIÓN DE CUENTAS**

#### 3.1 Agregar Cuenta
- [ ] Abrir formulario de agregar cuenta
- [ ] Llenar todos los campos requeridos
- [ ] Intentar guardar sin campos requeridos (debe mostrar error)
- [ ] Guardar cuenta válida
- [ ] Verificar que aparece en lista
- [ ] Verificar que se guardó en BD

#### 3.2 Editar Cuenta
- [ ] Abrir formulario de editar cuenta
- [ ] Modificar campos
- [ ] Guardar cambios
- [ ] Verificar que se actualizó en BD
- [ ] Verificar que se muestra actualizado en UI

#### 3.3 Activar/Desactivar Cuenta
- [ ] Desactivar cuenta activa
- [ ] Verificar que `active = false` en BD
- [ ] Verificar que se muestra como inactiva en UI
- [ ] Activar cuenta inactiva
- [ ] Verificar que `active = true` en BD
- [ ] Verificar que se muestra como activa en UI

#### 3.4 Eliminar Cuenta
- [ ] Intentar eliminar cuenta
- [ ] Verificar que pide confirmación
- [ ] Confirmar eliminación
- [ ] Verificar que se eliminó de BD
- [ ] Verificar que desapareció de lista

#### 3.5 Validaciones
- [ ] Intentar agregar cuenta con Phone Number ID duplicado (debe fallar)
- [ ] Intentar agregar cuenta con Access Token vacío (debe fallar)
- [ ] Verificar que campos numéricos solo aceptan números

---

### **4. TESTING DE WEBHOOK**

#### 4.1 Verificación GET
- [ ] Enviar GET request con `hub.verify_token` correcto
- [ ] Verificar que retorna `hub.challenge`
- [ ] Enviar GET request con `hub.verify_token` incorrecto
- [ ] Verificar que retorna error 403
- [ ] Configurar webhook en Meta Developer Console
- [ ] Verificar que Meta acepta el webhook

#### 4.2 Procesamiento POST - Mensajes Entrantes
- [ ] Enviar POST con mensaje de texto entrante
- [ ] Verificar que se guarda en `whatsapp_messages`
- [ ] Verificar que se crea/actualiza contacto
- [ ] Verificar que `is_from_me = false`
- [ ] Verificar que `sent_via = 'client'`
- [ ] Verificar que se actualiza `last_interaction_at`
- [ ] Verificar que se guarda en `whatsapp_webhook_logs`

#### 4.3 Procesamiento POST - Mensajes Salientes (Manual)
- [ ] Enviar POST con mensaje saliente (`is_from_me = true`)
- [ ] Verificar que se guarda en `whatsapp_messages`
- [ ] Verificar que `is_from_me = true`
- [ ] Verificar que `sent_via = 'manual'`
- [ ] Verificar que se actualiza `last_interaction_at`
- [ ] Verificar que se actualiza `last_interaction_source = 'manual'`

#### 4.4 Procesamiento POST - Eventos de Status
- [ ] Enviar POST con status 'sent'
- [ ] Verificar que se actualiza `status` en mensaje
- [ ] Verificar que se actualiza `status_updated_at`
- [ ] Enviar POST con status 'delivered'
- [ ] Verificar que se actualiza correctamente
- [ ] Enviar POST con status 'read'
- [ ] Verificar que se actualiza correctamente
- [ ] Enviar POST con status 'failed'
- [ ] Verificar que se guarda `error_message`

#### 4.5 Manejo de Errores
- [ ] Enviar POST con payload inválido
- [ ] Verificar que se maneja el error
- [ ] Verificar que se guarda en `webhook_logs` con `processed = false`
- [ ] Enviar POST sin campos requeridos
- [ ] Verificar que se maneja el error

---

### **5. TESTING DE INTEGRACIÓN**

#### 5.1 Flujo Completo - Agregar Cuenta y Recibir Mensaje
- [ ] Agregar cuenta desde UI
- [ ] Configurar webhook en Meta
- [ ] Enviar mensaje de prueba desde WhatsApp
- [ ] Verificar que se recibe en webhook
- [ ] Verificar que se procesa correctamente
- [ ] Verificar que aparece en BD
- [ ] Verificar que se actualiza en tiempo real en UI

#### 5.2 Flujo Completo - Múltiples Mensajes
- [ ] Enviar 5 mensajes consecutivos
- [ ] Verificar que todos se procesan
- [ ] Verificar que se guardan en BD
- [ ] Verificar que `last_interaction_at` se actualiza con cada mensaje

---

## 📊 RESULTADOS DE TESTING

### Tests Pasados: 0/XX
### Tests Fallidos: 0/XX
### Tests Pendientes: XX/XX

### Errores Encontrados:
*(Ninguno aún)*

### Observaciones:
*(Ninguna aún)*

---

## ✅ CRITERIOS DE APROBACIÓN

FASE 1 se considera completada cuando:

- [ ] ✅ 100% de tests pasados
- [ ] ✅ Sin errores críticos
- [ ] ✅ Webhook funcionando correctamente
- [ ] ✅ UI funcionando correctamente
- [ ] ✅ Base de datos completa y funcional
- [ ] ✅ Documentación actualizada

---

**Fecha de testing:** [Fecha]  
**Tester:** [Nombre]  
**Resultado:** ⏳ Pendiente

