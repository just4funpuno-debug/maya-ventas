# Análisis Completo: Migración de Firebase a Supabase

**Fecha:** $(date)  
**Proyecto:** MAYA Ventas MVP  
**Objetivo:** Migrar completamente de Firebase/Firestore a Supabase manteniendo toda la funcionalidad y datos

---

## 📊 RESUMEN EJECUTIVO

### ✅ **VIABILIDAD: ALTA**

La migración es **totalmente viable** y recomendada por las siguientes razones:

1. ✅ **Supabase ya tiene esquema preparado** (`supabase-schema.sql`)
2. ✅ **Cloudinary se mantiene igual** (no requiere cambios)
3. ✅ **Estructura de datos compatible** (solo requiere mapeo)
4. ✅ **Supabase Auth es más robusto** que Firebase Auth para este caso
5. ✅ **Mejor control de datos** con PostgreSQL
6. ✅ **Costos más predecibles** con Supabase

### ⚠️ **RIESGOS IDENTIFICADOS**

1. **RIESGO MEDIO:** Pérdida de datos durante migración (mitigable con backups)
2. **RIESGO BAJO:** Cambios en tiempo real (Supabase Realtime es compatible)
3. **RIESGO BAJO:** Autenticación (requiere migración de usuarios)

---

## 🗂️ INVENTARIO COMPLETO DE COLECCIONES FIRESTORE

### 1. **almacenCentral** (Productos Centrales)
**Estructura:**
- Documento por SKU (ID = SKU)
- Campos: `sku`, `nombre`, `precio`, `costo`, `stock`, `imagen`, `sintetico`, `createdAt`, `updatedAt`

**Uso:**
- Inventario principal
- Se descuenta cuando se envía stock a ciudades
- Lectura/escritura frecuente

**Mapeo Supabase:**
- Tabla: `products` (ya existe en schema)
- Campo `sku` como clave primaria alternativa
- Índice en `sku` para búsquedas rápidas

---

### 2. **cityStock** (Stock por Ciudad) ⚠️ ESTRUCTURA ESPECIAL
**Estructura:**
- Documento por ciudad (ID = nombre ciudad, ej: "LA PAZ")
- Contenido: Objeto plano `{ "SKU1": cantidad1, "SKU2": cantidad2, ... }`
- Ejemplo: `{ "CVP-60": 10, "FLEX-60": 5 }`

**Uso:**
- Stock disponible en cada ciudad
- Se actualiza con despachos y ventas
- Lectura/escritura muy frecuente

**Mapeo Supabase:**
- **OPCIÓN A (Recomendada):** Tabla `city_stock` con estructura normalizada:
  ```sql
  CREATE TABLE city_stock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudad text NOT NULL,
    sku text NOT NULL REFERENCES products(sku),
    cantidad integer NOT NULL DEFAULT 0,
    UNIQUE(ciudad, sku)
  );
  ```
- **OPCIÓN B:** Mantener JSONB (menos eficiente pero más rápido de migrar)
  ```sql
  CREATE TABLE city_stock_jsonb (
    ciudad text PRIMARY KEY,
    stock_data jsonb NOT NULL DEFAULT '{}'::jsonb
  );
  ```

**Recomendación:** OPCIÓN A (normalizada) para mejor rendimiento y consultas.

---

### 3. **VentasSinConfirmar** (Ventas Pendientes)
**Estructura:**
- Documento por venta (ID auto-generado)
- Campos: `fecha`, `ciudad`, `sku`, `cantidad`, `precio`, `vendedora`, `estado`, `createdAt`, etc.

**Uso:**
- Ventas registradas pero no confirmadas
- Se mueven a `ventashistorico` y `ventasporcobrar` al confirmar

**Mapeo Supabase:**
- Tabla: `sales` con `estado_entrega = 'pendiente'`
- O tabla separada `pending_sales` (recomendado para claridad)

---

### 4. **ventashistorico** (Historial de Ventas)
**Estructura:**
- Documento por venta (ID auto-generado)
- Campos completos de venta + `estadoEntrega`, `codigoUnico`, `idPorCobrar`, `settledAt`, etc.

**Uso:**
- Registro histórico permanente de todas las ventas
- Referencia cruzada con `ventasporcobrar`

**Mapeo Supabase:**
- Tabla: `sales` con campo `is_historical = true`
- O tabla separada `sales_history` (recomendado)

---

### 5. **ventasporcobrar** (Ventas por Cobrar)
**Estructura:**
- Documento por venta (ID auto-generado)
- Similar a `ventashistorico` pero con `estadoPago`, `fechaCobro`, `snapshotId`

**Uso:**
- Ventas confirmadas pendientes de pago
- Se agrupan en depósitos
- Referencia cruzada con `ventashistorico` via `idHistorico` / `codigoUnico`

**Mapeo Supabase:**
- Tabla: `sales` con `estado_pago = 'pendiente'`
- O tabla separada `sales_pending_payment` (recomendado)

---

### 6. **GenerarDeposito** (Depósitos Generados)
**Estructura:**
- Documento por venta individual en depósito (ID auto-generado)
- Campos: `ciudad`, `idPorCobrar`, `idHistorico`, `codigoUnico`, `total`, `resumen`, etc.

**Uso:**
- Agrupa ventas por cobrar de una ciudad para generar depósito
- Se crea al confirmar depósito desde UI

**Mapeo Supabase:**
- Tabla: `deposit_items` (normalizada)
- O mantener JSONB en `deposit_snapshots` (ya existe en schema)

---

### 7. **users** (Usuarios)
**Estructura:**
- Documento por usuario (ID = Firebase Auth UID)
- Campos: `username`, `nombre`, `apellidos`, `rol`, `grupo`, `sueldo`, `diaPago`, etc.

**Uso:**
- Datos adicionales de usuarios
- Firebase Auth maneja autenticación
- Firestore almacena datos de perfil

**Mapeo Supabase:**
- Tabla: `users` (ya existe en schema)
- Supabase Auth maneja autenticación
- Campo `auth_id` para vincular con `auth.users`

---

### 8. **despachos** (Despachos Pendientes)
**Estructura:**
- Documento por despacho (ID auto-generado)
- Campos: `fecha`, `ciudad`, `status`, `items` (array de productos)

**Uso:**
- Despachos de productos del almacén central a ciudades
- Se mueven a `despachosHistorial` al confirmar

**Mapeo Supabase:**
- Tabla: `dispatches` (ya existe en schema)
- Campo `status` para distinguir pendientes/confirmados

---

### 9. **despachosHistorial** (Historial de Despachos)
**Estructura:**
- Similar a `despachos` pero con `status = 'confirmado'`

**Mapeo Supabase:**
- Misma tabla `dispatches` con `status = 'confirmado'`

---

### 10. **numbers** (Números de Contacto)
**Estructura:**
- Documento por número (ID auto-generado)
- Campos: `sku`, `email`, `celular`, `caduca`, `createdAt`

**Uso:**
- Contactos de clientes interesados en productos

**Mapeo Supabase:**
- Tabla: `numbers` (ya existe en schema)

---

### 11. **team_messages** (Mensajes de Equipo)
**Estructura:**
- Documento por mensaje (ID auto-generado)
- Campos: `grupo`, `authorId`, `authorNombre`, `text`, `createdAt`, `readBy` (array)

**Uso:**
- Mensajería interna por grupos

**Mapeo Supabase:**
- Tabla: `team_messages` (ya existe en schema)

---

## 🔄 FLUJOS CRÍTICOS IDENTIFICADOS

### 1. **Flujo de Venta Completo**
```
1. Registrar venta → VentasSinConfirmar
2. Descontar stock → cityStock[ciudad][sku] -= cantidad
3. Confirmar entrega → 
   - Mover a ventashistorico
   - Crear en ventasporcobrar
   - Vincular con codigoUnico
4. Generar depósito →
   - Crear docs en GenerarDeposito
   - Marcar ventasporcobrar con settledAt
5. Finalizar depósito →
   - Eliminar GenerarDeposito
   - Actualizar ventashistorico
```

**Riesgo:** ALTO - Flujo complejo con múltiples colecciones relacionadas

---

### 2. **Flujo de Stock Multi-Ciudad**
```
1. Almacén Central → Despacho → cityStock[ciudad]
2. Venta en ciudad → cityStock[ciudad][sku] -= cantidad
3. Cancelación → cityStock[ciudad][sku] += cantidad
```

**Riesgo:** MEDIO - Estructura especial de cityStock requiere atención

---

### 3. **Flujo de Autenticación**
```
1. Login → Firebase Auth
2. Obtener datos → Firestore users collection
3. Sesión → localStorage + estado React
```

**Riesgo:** MEDIO - Requiere migración de usuarios a Supabase Auth

---

## 📋 COMPARACIÓN FIREBASE vs SUPABASE

| Aspecto | Firebase | Supabase | Compatibilidad |
|---------|----------|----------|----------------|
| **Base de datos** | Firestore (NoSQL) | PostgreSQL (SQL) | ⚠️ Requiere mapeo |
| **Tiempo real** | onSnapshot() | Realtime subscriptions | ✅ Compatible |
| **Autenticación** | Firebase Auth | Supabase Auth | ✅ Compatible |
| **Queries** | where(), orderBy() | SQL WHERE, ORDER BY | ✅ Compatible |
| **Transacciones** | runTransaction() | BEGIN/COMMIT | ✅ Compatible |
| **Batch writes** | writeBatch() | Multi-insert/update | ✅ Compatible |
| **Índices** | Automáticos | Manuales (mejor control) | ✅ Mejora |
| **Relaciones** | Referencias manuales | Foreign keys nativas | ✅ Mejora |
| **Validación** | Reglas de seguridad | Constraints + RLS | ✅ Mejora |

---

## 🎯 PLAN DE MIGRACIÓN POR FASES

### **FASE 1: Preparación y Análisis** (1-2 días)
**Objetivo:** Validar datos y preparar entorno

**Tareas:**
1. ✅ Crear backup completo de Firestore
2. ✅ Exportar todos los datos a JSON
3. ✅ Validar integridad de datos
4. ✅ Configurar proyecto Supabase
5. ✅ Ejecutar schema SQL en Supabase
6. ✅ Configurar variables de entorno

**Entregables:**
- Backup de Firestore
- Script de validación de datos
- Proyecto Supabase configurado

**Riesgo:** BAJO

---

### **FASE 2: Migración de Datos Base** (2-3 días)
**Objetivo:** Migrar datos estáticos y usuarios

**Tareas:**
1. Migrar `almacenCentral` → `products`
2. Migrar `users` → `users` + Supabase Auth
3. Migrar `despachos` + `despachosHistorial` → `dispatches`
4. Migrar `numbers` → `numbers`
5. Migrar `team_messages` → `team_messages`

**Scripts necesarios:**
- `migrate-products.js`
- `migrate-users.js` (incluye creación en Supabase Auth)
- `migrate-dispatches.js`
- `migrate-numbers.js`
- `migrate-messages.js`

**Validación:**
- Comparar conteos de documentos
- Verificar integridad referencial
- Probar consultas básicas

**Riesgo:** MEDIO - Usuarios requieren migración de Auth

---

### **FASE 3: Migración de Stock (cityStock)** (1-2 días)
**Objetivo:** Migrar estructura especial de stock por ciudad

**Tareas:**
1. Crear tabla `city_stock` normalizada
2. Script para convertir `{ciudad: {sku: cantidad}}` → `[(ciudad, sku, cantidad)]`
3. Migrar datos
4. Validar totales de stock

**Script:**
```javascript
// migrate-cityStock.js
// Lee cityStock de Firestore
// Convierte estructura plana a filas normalizadas
// Inserta en city_stock
```

**Validación:**
- Sumar stock por ciudad y comparar
- Verificar que no se pierdan SKUs

**Riesgo:** MEDIO - Estructura especial requiere transformación

---

### **FASE 4: Migración de Ventas** (3-4 días)
**Objetivo:** Migrar todas las ventas manteniendo relaciones

**Tareas:**
1. Migrar `ventashistorico` → `sales_history`
2. Migrar `ventasporcobrar` → `sales_pending_payment`
3. Migrar `VentasSinConfirmar` → `pending_sales`
4. Migrar `GenerarDeposito` → `deposit_items`
5. Preservar `codigoUnico` y referencias cruzadas

**Scripts necesarios:**
- `migrate-sales-history.js`
- `migrate-sales-pending.js`
- `migrate-pending-sales.js`
- `migrate-deposits.js`

**Validación:**
- Verificar que `codigoUnico` se preserve
- Validar referencias `idHistorico` / `idPorCobrar`
- Comparar totales y conteos

**Riesgo:** ALTO - Flujo complejo con múltiples relaciones

---

### **FASE 5: Adaptación del Código** (4-5 días)
**Objetivo:** Reemplazar llamadas Firebase por Supabase

**Tareas:**
1. Crear capa de abstracción `supabaseClient.js`
2. Reemplazar `onSnapshot` → Supabase Realtime
3. Reemplazar `getDoc/setDoc/updateDoc` → Supabase queries
4. Reemplazar Firebase Auth → Supabase Auth
5. Adaptar funciones en `firestoreUtils.js`
6. Actualizar `App.jsx` y componentes

**Archivos a modificar:**
- `src/firebase.js` → `src/supabaseClient.js`
- `src/firebaseAuthUtils.js` → `src/supabaseAuthUtils.js`
- `src/firestoreUtils.js` → `src/supabaseUtils.js`
- `src/firestoreUsers.js` → Adaptar
- `src/App.jsx` → Reemplazar imports
- Todos los componentes que usan Firebase

**Riesgo:** MEDIO - Muchos archivos pero cambios sistemáticos

---

### **FASE 6: Pruebas y Validación** (2-3 días)
**Objetivo:** Asegurar que todo funcione igual

**Tareas:**
1. Pruebas de autenticación
2. Pruebas de CRUD de productos
3. Pruebas de flujo de ventas completo
4. Pruebas de stock multi-ciudad
5. Pruebas de tiempo real
6. Pruebas de generación de depósitos
7. Validación de datos migrados

**Checklist:**
- [ ] Login funciona
- [ ] Productos se cargan y editan
- [ ] Ventas se registran correctamente
- [ ] Stock se actualiza en tiempo real
- [ ] Depósitos se generan correctamente
- [ ] Historial muestra datos correctos
- [ ] KPIs calculan correctamente

**Riesgo:** MEDIO - Requiere pruebas exhaustivas

---

### **FASE 7: Despliegue y Monitoreo** (1-2 días)
**Objetivo:** Poner en producción y monitorear

**Tareas:**
1. Desplegar código actualizado
2. Configurar variables de entorno en producción
3. Monitorear logs y errores
4. Validar que usuarios pueden acceder
5. Mantener Firebase activo como respaldo (1 semana)
6. Desactivar Firebase después de validación

**Riesgo:** BAJO - Con respaldo de Firebase

---

## ⚠️ RIESGOS Y MITIGACIONES

### **RIESGO 1: Pérdida de Datos Durante Migración**
**Probabilidad:** MEDIA  
**Impacto:** ALTO

**Mitigaciones:**
1. ✅ Backup completo antes de iniciar
2. ✅ Migración en modo "dual-write" (escribir en ambos sistemas)
3. ✅ Validación exhaustiva de conteos
4. ✅ Scripts de rollback preparados
5. ✅ Mantener Firebase activo durante fase de transición

---

### **RIESGO 2: Incompatibilidad de Estructura de Datos**
**Probabilidad:** BAJA  
**Impacto:** MEDIO

**Mitigaciones:**
1. ✅ Schema SQL ya preparado
2. ✅ Scripts de transformación de datos
3. ✅ Validación de tipos de datos
4. ✅ Pruebas con datos de muestra primero

---

### **RIESGO 3: Problemas con Tiempo Real**
**Probabilidad:** BAJA  
**Impacto:** MEDIO

**Mitigaciones:**
1. ✅ Supabase Realtime es compatible
2. ✅ Pruebas de suscripciones en desarrollo
3. ✅ Fallback a polling si es necesario

---

### **RIESGO 4: Migración de Usuarios Fallida**
**Probabilidad:** MEDIA  
**Impacto:** ALTO

**Mitigaciones:**
1. ✅ Script de migración de usuarios probado
2. ✅ Comunicación a usuarios sobre cambio
3. ✅ Proceso de recuperación de contraseñas
4. ✅ Mantener Firebase Auth activo temporalmente

---

### **RIESGO 5: Cambios en Flujos de Negocio**
**Probabilidad:** BAJA  
**Impacto:** ALTO

**Mitigaciones:**
1. ✅ Mapeo detallado de flujos
2. ✅ Pruebas exhaustivas de cada flujo
3. ✅ Documentación de cambios
4. ✅ Capacitación del equipo

---

## 📊 ESTIMACIÓN DE TIEMPO TOTAL

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 1: Preparación | 1-2 días | - |
| Fase 2: Datos Base | 2-3 días | Fase 1 |
| Fase 3: Stock | 1-2 días | Fase 2 |
| Fase 4: Ventas | 3-4 días | Fase 2, 3 |
| Fase 5: Código | 4-5 días | Fase 4 |
| Fase 6: Pruebas | 2-3 días | Fase 5 |
| Fase 7: Despliegue | 1-2 días | Fase 6 |
| **TOTAL** | **14-21 días** | |

**Tiempo recomendado:** 3 semanas con buffer para imprevistos

---

## 🔧 HERRAMIENTAS Y SCRIPTS NECESARIOS

### Scripts de Migración a Crear:

1. **`scripts/migrate-all-firebase-to-supabase.js`**
   - Script maestro que orquesta toda la migración
   - Validaciones y reportes

2. **`scripts/migrate-products.js`**
   - Migra almacenCentral → products

3. **`scripts/migrate-users-with-auth.js`**
   - Migra users → users + Supabase Auth
   - Crea usuarios en Supabase Auth

4. **`scripts/migrate-cityStock.js`**
   - Convierte estructura plana a normalizada
   - Migra cityStock → city_stock

5. **`scripts/migrate-sales-complete.js`**
   - Migra todas las colecciones de ventas
   - Preserva relaciones y codigoUnico

6. **`scripts/validate-migration.js`**
   - Compara conteos entre Firebase y Supabase
   - Valida integridad de datos

7. **`scripts/rollback-migration.js`**
   - Script de emergencia para revertir cambios

---

## ✅ CHECKLIST PRE-MIGRACIÓN

- [ ] Backup completo de Firestore exportado
- [ ] Proyecto Supabase creado y configurado
- [ ] Schema SQL ejecutado en Supabase
- [ ] Variables de entorno configuradas
- [ ] Scripts de migración desarrollados y probados
- [ ] Equipo informado sobre migración
- [ ] Ventana de mantenimiento programada
- [ ] Plan de rollback preparado
- [ ] Documentación actualizada

---

## 🎯 RECOMENDACIONES FINALES

### **SÍ, LA MIGRACIÓN ES RECOMENDADA**

**Ventajas:**
1. ✅ Mejor control de datos con PostgreSQL
2. ✅ Costos más predecibles
3. ✅ Mejor rendimiento para consultas complejas
4. ✅ Relaciones nativas (foreign keys)
5. ✅ Supabase Auth más robusto
6. ✅ Mejor para escalabilidad futura

**Consideraciones:**
1. ⚠️ Requiere tiempo de desarrollo (2-3 semanas)
2. ⚠️ Necesita pruebas exhaustivas
3. ⚠️ Requiere migración de usuarios activos

**Estrategia Recomendada:**
1. **Migración por fases** (como se detalla arriba)
2. **Dual-write temporal** (escribir en ambos sistemas)
3. **Validación exhaustiva** antes de cortar Firebase
4. **Mantener Firebase como respaldo** 1 semana después del corte

---

## 📞 PRÓXIMOS PASOS

1. **Revisar este documento** y aprobar plan
2. **Crear proyecto Supabase** y configurar
3. **Desarrollar scripts de migración** (Fase 1-4)
4. **Ejecutar migración en ambiente de desarrollo**
5. **Validar resultados**
6. **Adaptar código** (Fase 5)
7. **Pruebas exhaustivas** (Fase 6)
8. **Desplegar a producción** (Fase 7)

---

**¿Preguntas o dudas sobre el plan?** Estoy disponible para aclarar cualquier punto o ajustar el plan según tus necesidades específicas.



