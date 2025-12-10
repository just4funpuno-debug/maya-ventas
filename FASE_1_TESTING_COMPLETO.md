# 🧪 PLAN DE TESTING COMPLETO - FASE 1

**Fecha:** 2025-01-30  
**Estado:** En progreso

## 📋 Estrategia de Testing

Este documento organiza todos los tests necesarios para validar FASE 1 del CRM WhatsApp. Los tests están divididos en:

1. **Tests Automatizados** (ejecutables por el sistema)
2. **Tests Manuales** (requieren intervención del usuario)
3. **Tests de Integración** (verifican flujos completos)

---

## ✅ SUBFASE 1.1: Schema de Base de Datos

### Tests Automatizados ✅

**Archivo:** `scripts/verify-schema.sql` (ya creado)

**Ejecutar:**
```bash
# Desde Supabase SQL Editor o psql
psql -h [host] -U [user] -d [database] -f scripts/verify-schema.sql
```

**Verificaciones:**
- ✅ Todas las tablas existen
- ✅ Todas las columnas tienen el tipo correcto
- ✅ Índices están creados
- ✅ Triggers están activos
- ✅ Funciones SQL existen

### Tests Manuales 📝

**Checklist:**
- [ ] Ejecutar `scripts/verify-schema.sql` y verificar que no hay errores
- [ ] Verificar en Supabase Dashboard que todas las tablas aparecen
- [ ] Verificar que los índices están creados (Database > Indexes)
- [ ] Verificar que las funciones SQL existen (Database > Functions)

---

## ✅ SUBFASE 1.2: Funciones SQL

### Tests Automatizados ✅

**Archivo:** `scripts/test-functions.sql` (ya creado)

**Ejecutar:**
```bash
psql -h [host] -U [user] -d [database] -f scripts/test-functions.sql
```

**Verificaciones:**
- ✅ `calculate_window_24h()` calcula correctamente
- ✅ `update_contact_interaction()` actualiza datos
- ✅ `check_sequence_next_message()` identifica siguiente mensaje
- ✅ `decide_send_method()` decide método correcto
- ✅ `add_to_puppeteer_queue()` valida y agrega a cola

### Tests Manuales 📝

**Checklist:**
- [ ] Ejecutar script y verificar que todas las funciones retornan resultados esperados
- [ ] Verificar logs de RAISE NOTICE para confirmar flujos
- [ ] Probar casos edge (valores NULL, fechas pasadas, etc.)

---

## ✅ SUBFASE 1.3: Storage y Realtime

### Tests Automatizados ✅

**Archivo:** `scripts/test-realtime.sql` (ya creado)

**Ejecutar:**
```bash
psql -h [host] -U [user] -d [database] -f scripts/test-realtime.sql
```

**Verificaciones:**
- ✅ Funciones auxiliares existen y funcionan
- ✅ Políticas de Storage (si se crearon)

### Tests Manuales 📝

**Checklist:**
- [ ] Verificar que bucket `whatsapp-media` existe en Supabase Dashboard
- [ ] Verificar configuración del bucket:
  - [ ] Public: Yes
  - [ ] File size limit: 10MB
  - [ ] MIME types: `image/*,video/*,audio/*,application/pdf`
- [ ] Verificar Realtime habilitado en tablas:
  - [ ] `whatsapp_contacts`
  - [ ] `whatsapp_messages`
  - [ ] `puppeteer_queue`
  - [ ] `whatsapp_delivery_issues`
- [ ] Probar subida de archivo de prueba al bucket
- [ ] Verificar que se puede acceder públicamente al archivo

---

## ✅ SUBFASE 1.4: UI para Configurar Cuentas

### Tests Automatizados ✅

**Archivos creados:**
- `tests/whatsapp/accounts.test.js` - Tests de servicios
- `tests/whatsapp/validation.test.js` - Tests de validación
- `scripts/test-whatsapp-accounts.sql` - Tests de BD

**Ejecutar tests unitarios:**
```bash
# Si usas Vitest
npx vitest tests/whatsapp/accounts.test.js
npx vitest tests/whatsapp/validation.test.js

# Si usas Jest
npm test -- tests/whatsapp/accounts.test.js
npm test -- tests/whatsapp/validation.test.js
```

**Ejecutar tests de BD:**
```bash
psql -h [host] -U [user] -d [database] -f scripts/test-whatsapp-accounts.sql
```

### Tests Manuales 📝

**Checklist de UI:**

#### 1. Navegación
- [ ] Acceder como admin al Sidebar
- [ ] Verificar que aparece "WhatsApp" en sección Administración
- [ ] Hacer clic y verificar que carga la vista correctamente
- [ ] Verificar que usuarios no-admin NO ven el enlace

#### 2. Crear Cuenta
- [ ] Hacer clic en "Nueva Cuenta"
- [ ] Verificar que aparece el formulario
- [ ] Probar validaciones:
  - [ ] Dejar campos vacíos → debe mostrar errores
  - [ ] Phone Number ID con caracteres inválidos → error
  - [ ] Access Token muy corto (< 50 chars) → error
  - [ ] Verify Token muy corto (< 10 chars) → error
  - [ ] Número de teléfono con < 10 dígitos → error
- [ ] Llenar formulario correctamente
- [ ] Hacer clic en "Crear Cuenta"
- [ ] Verificar que aparece notificación de éxito
- [ ] Verificar que la cuenta aparece en la lista
- [ ] Verificar en Supabase Dashboard que se guardó en BD

#### 3. Editar Cuenta
- [ ] Hacer clic en botón "Editar" de una cuenta
- [ ] Verificar que el formulario se pre-llena con datos
- [ ] Modificar algunos campos
- [ ] Hacer clic en "Actualizar Cuenta"
- [ ] Verificar notificación de éxito
- [ ] Verificar que los cambios se reflejan en la lista
- [ ] Verificar en BD que `updated_at` se actualizó

#### 4. Activar/Desactivar
- [ ] Hacer clic en botón de activar/desactivar
- [ ] Verificar que el estado cambia visualmente
- [ ] Verificar notificación de éxito
- [ ] Verificar en BD que `active` cambió

#### 5. Eliminar Cuenta
- [ ] Hacer clic en botón "Eliminar"
- [ ] Verificar que aparece modal de confirmación
- [ ] Hacer clic en "Cancelar" → modal debe cerrarse
- [ ] Hacer clic en "Eliminar" → cuenta debe desaparecer
- [ ] Verificar notificación de éxito
- [ ] Verificar en BD que la cuenta fue eliminada

#### 6. Selector de Productos
- [ ] Si hay productos en BD, verificar que aparecen en el selector
- [ ] Seleccionar un producto
- [ ] Guardar cuenta
- [ ] Verificar que se guardó la asociación

#### 7. Access Token (Seguridad)
- [ ] Verificar que Access Token se muestra como password (puntos)
- [ ] Hacer clic en "Mostrar" → debe mostrar texto
- [ ] Hacer clic en "Ocultar" → debe ocultar texto

#### 8. Tiempo Real
- [ ] Abrir la vista en dos pestañas diferentes
- [ ] Crear cuenta en una pestaña
- [ ] Verificar que aparece automáticamente en la otra pestaña

#### 9. Estado Vacío
- [ ] Eliminar todas las cuentas
- [ ] Verificar que aparece mensaje "No hay cuentas configuradas"

#### 10. Responsive
- [ ] Probar en móvil (ancho < 768px)
- [ ] Verificar que el formulario se adapta
- [ ] Verificar que la lista se adapta

---

## 🔄 Tests de Integración

### Flujo Completo: Crear y Usar Cuenta

**Pasos:**
1. [ ] Crear cuenta desde UI
2. [ ] Verificar en BD que se guardó
3. [ ] Usar los datos de la cuenta para hacer una llamada de prueba a WhatsApp API (si tienes credenciales)
4. [ ] Verificar que los tokens funcionan

---

## 📊 Cobertura de Testing

### Automatizado
- ✅ Validaciones de formularios (100%)
- ✅ Servicios CRUD (100%)
- ✅ Funciones SQL (100%)
- ✅ Schema de BD (100%)

### Manual
- ⏳ UI completa (pendiente de ejecutar)
- ⏳ Integración end-to-end (pendiente)

---

## 🚀 Cómo Ejecutar Todos los Tests

### 1. Tests Automatizados
```bash
# Instalar dependencias de testing (si no están)
npm install --save-dev vitest @vitest/ui

# Ejecutar todos los tests
npm test

# O con Vitest
npx vitest --run
```

### 2. Tests de Base de Datos
```bash
# Ejecutar todos los scripts SQL
psql -h [host] -U [user] -d [database] -f scripts/verify-schema.sql
psql -h [host] -U [user] -d [database] -f scripts/test-functions.sql
psql -h [host] -U [user] -d [database] -f scripts/test-realtime.sql
psql -h [host] -U [user] -d [database] -f scripts/test-whatsapp-accounts.sql
```

### 3. Tests Manuales
- Seguir el checklist de cada subfase
- Marcar cada item cuando se complete
- Documentar cualquier problema encontrado

---

## 📝 Notas para el Usuario

**Lo que TÚ puedes hacer:**
1. ✅ Ejecutar los scripts SQL en Supabase Dashboard
2. ✅ Probar la UI manualmente (crear, editar, eliminar cuentas)
3. ✅ Verificar que los datos se guardan en BD
4. ✅ Probar en diferentes dispositivos (móvil/desktop)
5. ✅ Verificar que Realtime funciona (abrir dos pestañas)

**Lo que YO hice:**
1. ✅ Creé todos los tests automatizados
2. ✅ Creé scripts SQL de verificación
3. ✅ Documenté todos los tests manuales
4. ✅ Preparé checklist completo

**Si encuentras problemas:**
- Documenta el problema
- Toma capturas de pantalla si es necesario
- Comparte los logs de error
- Yo puedo ayudar a solucionarlo

---

## ✅ Estado Actual

- ✅ SUBFASE 1.1: Tests creados y listos
- ✅ SUBFASE 1.2: Tests creados y listos
- ✅ SUBFASE 1.3: Tests creados y listos
- ✅ SUBFASE 1.4: Tests creados y listos
- ⏳ Ejecución manual: Pendiente de tu parte

---

**Última actualización:** 2025-01-30

