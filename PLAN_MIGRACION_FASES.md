# 🗺️ PLAN DE MIGRACIÓN FIREBASE → SUPABASE
## Migración por Fases con Testing Exhaustivo

**Proyecto:** MAYA Ventas MVP  
**Objetivo:** Migrar de Firebase a Supabase sin romper funcionalidad  
**Estrategia:** Fases incrementales con testing y rollback en cada etapa

---

## 📊 RESUMEN DE FASES

| Fase | Nombre | Duración | Subfases | Testing | Riesgo |
|------|--------|----------|----------|---------|--------|
| **0** | Preparación | 1 día | 3 | ✅ | BAJO |
| **1** | Datos Base (No críticos) | 2 días | 4 | ✅ | BAJO |
| **2** | Usuarios y Auth | 2 días | 3 | ✅ | MEDIO |
| **3** | Productos e Inventario | 2 días | 3 | ✅ | MEDIO |
| **4** | Stock Multi-Ciudad | 2 días | 3 | ✅ | ALTO |
| **5** | Ventas (Paso a paso) | 4 días | 5 | ✅ | ALTO |
| **6** | Despachos | 1 día | 2 | ✅ | MEDIO |
| **7** | Código Frontend | 3 días | 4 | ✅ | MEDIO |
| **8** | Testing Integral | 2 días | 4 | ✅ | BAJO |
| **9** | Despliegue Controlado | 1 día | 2 | ✅ | BAJO |

**TOTAL ESTIMADO:** 20 días (4 semanas con buffer)

---

## 🎯 PRINCIPIOS DE MIGRACIÓN

1. ✅ **Nunca romper funcionalidad existente**
2. ✅ **Testing exhaustivo después de cada subfase**
3. ✅ **Rollback disponible en cada punto**
4. ✅ **Dual-write durante transición crítica**
5. ✅ **Validación de datos en cada paso**
6. ✅ **Documentación de cada cambio**

---

# FASE 0: PREPARACIÓN Y SETUP

**Duración:** 1 día  
**Riesgo:** BAJO  
**Objetivo:** Preparar entorno y herramientas

## Subfase 0.1: Backup Completo
**Duración:** 2 horas

**Tareas:**
- [ ] Exportar todas las colecciones de Firestore a JSON
- [ ] Verificar integridad de backups
- [ ] Guardar backups en múltiples ubicaciones
- [ ] Documentar estructura de datos actual

**Script:**
```bash
# scripts/backup-firestore.js
# Exporta todas las colecciones
```

**Testing:**
- [ ] Verificar que todos los JSON se generaron
- [ ] Validar que no hay archivos corruptos
- [ ] Contar documentos en cada colección

**Criterio de Éxito:** ✅ Backup completo y verificado

---

## Subfase 0.2: Setup Supabase
**Duración:** 2 horas

**Tareas:**
- [ ] Crear proyecto Supabase
- [ ] Configurar variables de entorno
- [ ] Ejecutar schema SQL base
- [ ] Verificar conexión

**Testing:**
- [ ] Conectar desde cliente de prueba
- [ ] Verificar que las tablas se crearon
- [ ] Probar inserción de dato de prueba

**Criterio de Éxito:** ✅ Supabase configurado y accesible

---

## Subfase 0.3: Scripts de Utilidad
**Duración:** 4 horas

**Tareas:**
- [ ] Crear `scripts/validate-counts.js` (comparar conteos)
- [ ] Crear `scripts/rollback-phase.js` (rollback por fase)
- [ ] Crear `scripts/compare-data.js` (comparar datos)
- [ ] Crear `scripts/migration-logger.js` (logging estructurado)

**Testing:**
- [ ] Probar cada script con datos de prueba
- [ ] Verificar que los logs se generan correctamente

**Criterio de Éxito:** ✅ Scripts funcionando y documentados

---

# FASE 1: DATOS BASE (NO CRÍTICOS)

**Duración:** 2 días  
**Riesgo:** BAJO  
**Objetivo:** Migrar datos que no afectan funcionalidad crítica

## Subfase 1.1: Numbers (Contactos)
**Duración:** 2 horas

**Tareas:**
- [ ] Crear script `migrate-numbers.js`
- [ ] Migrar colección `numbers` → tabla `numbers`
- [ ] Validar conteos

**Testing:**
- [ ] Comparar conteo: `numbers` (Firebase) == `numbers` (Supabase)
- [ ] Verificar 10 registros aleatorios campo por campo
- [ ] Probar query: `SELECT * FROM numbers WHERE sku = 'X'`

**Criterio de Éxito:** ✅ 100% de datos migrados, conteos coinciden

**Rollback:** Eliminar tabla `numbers` en Supabase

---

## Subfase 1.2: Team Messages
**Duración:** 2 horas

**Tareas:**
- [ ] Crear script `migrate-messages.js`
- [ ] Migrar `team_messages` → `team_messages`
- [ ] Validar estructura JSONB de `readBy`

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que `readBy` se migró como array
- [ ] Probar query por grupo

**Criterio de Éxito:** ✅ Mensajes migrados, estructura correcta

**Rollback:** Eliminar tabla `team_messages`

---

## Subfase 1.3: Despachos Historial (Solo lectura)
**Duración:** 3 horas

**Tareas:**
- [ ] Crear script `migrate-dispatches-history.js`
- [ ] Migrar `despachosHistorial` → `dispatches` (status='confirmado')
- [ ] Validar estructura de items

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que items se migraron correctamente
- [ ] Probar query por ciudad y fecha

**Criterio de Éxito:** ✅ Historial migrado, consultas funcionan

**Rollback:** Eliminar registros con status='confirmado'

---

## Subfase 1.4: Testing Fase 1 Completa
**Duración:** 1 hora

**Testing Integral:**
- [ ] Ejecutar `validate-counts.js` para todas las tablas migradas
- [ ] Verificar que no hay errores en logs
- [ ] Probar queries complejas en Supabase
- [ ] Comparar datos aleatorios entre Firebase y Supabase

**Criterio de Éxito:** ✅ Todas las validaciones pasan

---

# FASE 2: USUARIOS Y AUTENTICACIÓN

**Duración:** 2 días  
**Riesgo:** MEDIO  
**Objetivo:** Migrar usuarios sin afectar sesiones activas

## Subfase 2.1: Migración de Datos de Usuarios
**Duración:** 3 horas

**Tareas:**
- [ ] Crear script `migrate-users-data.js`
- [ ] Migrar `users` → `users` (solo datos, sin auth)
- [ ] Preservar campos: username, rol, grupo, sueldo, etc.
- [ ] Crear campo temporal `firebase_uid` para referencia

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que todos los campos se migraron
- [ ] Validar que `firebase_uid` se guardó correctamente

**Criterio de Éxito:** ✅ Datos de usuarios migrados

**Rollback:** Eliminar tabla `users` (solo datos, no auth)

---

## Subfase 2.2: Migración de Autenticación
**Duración:** 4 horas

**Tareas:**
- [ ] Crear script `migrate-users-auth.js`
- [ ] Para cada usuario en Firebase Auth:
  - [ ] Crear usuario en Supabase Auth
  - [ ] Vincular con `users.firebase_uid`
  - [ ] Mantener misma contraseña (si es posible) o generar temporal
- [ ] Documentar usuarios que requieren reset de contraseña

**Testing:**
- [ ] Intentar login con cada usuario migrado
- [ ] Verificar que `auth.users` se vinculó con `users.id`
- [ ] Probar recuperación de contraseña

**Criterio de Éxito:** ✅ Todos los usuarios pueden autenticarse

**Rollback:** Eliminar usuarios de Supabase Auth (mantener datos)

---

## Subfase 2.3: Dual-Write Auth (Transición)
**Duración:** 1 día

**Tareas:**
- [ ] Modificar `firebaseAuthUtils.js` para escribir en ambos sistemas
- [ ] Nuevos logins: crear en Firebase Y Supabase
- [ ] Mantener Firebase Auth activo para usuarios existentes
- [ ] Monitorear logs de autenticación

**Testing:**
- [ ] Probar login con usuario existente (Firebase)
- [ ] Probar login con usuario nuevo (ambos sistemas)
- [ ] Verificar que sesiones funcionan en ambos
- [ ] Probar cambio de contraseña

**Criterio de Éxito:** ✅ Autenticación funciona en ambos sistemas

**Rollback:** Revertir cambios en `firebaseAuthUtils.js`

---

# FASE 3: PRODUCTOS E INVENTARIO CENTRAL

**Duración:** 2 días  
**Riesgo:** MEDIO  
**Objetivo:** Migrar productos sin afectar stock

## Subfase 3.1: Migración de Productos
**Duración:** 3 horas

**Tareas:**
- [ ] Crear script `migrate-products.js`
- [ ] Migrar `almacenCentral` → `products`
- [ ] Preservar: sku, nombre, precio, costo, stock, imagen, sintetico
- [ ] Validar que SKU es único

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que todos los SKUs se migraron
- [ ] Comparar stock total: `SUM(stock)` en ambos sistemas
- [ ] Verificar imágenes (URLs de Cloudinary)

**Criterio de Éxito:** ✅ Productos migrados, stock total coincide

**Rollback:** Eliminar tabla `products`

---

## Subfase 3.2: Validación de Integridad
**Duración:** 2 horas

**Tareas:**
- [ ] Comparar cada producto campo por campo
- [ ] Verificar que no hay SKUs duplicados
- [ ] Validar tipos de datos (precio, costo, stock)
- [ ] Verificar que imágenes son accesibles

**Testing:**
- [ ] Script `validate-products.js` ejecuta sin errores
- [ ] Todos los productos tienen imagen válida
- [ ] Stock total coincide exactamente

**Criterio de Éxito:** ✅ Integridad 100% verificada

---

## Subfase 3.3: Dual-Write Productos (Opcional)
**Duración:** 3 horas

**Tareas:**
- [ ] Modificar funciones de productos para escribir en ambos
- [ ] Nuevos productos: crear en Firebase Y Supabase
- [ ] Ediciones: actualizar en ambos sistemas
- [ ] Monitorear consistencia

**Testing:**
- [ ] Crear producto nuevo (debe aparecer en ambos)
- [ ] Editar producto (debe actualizarse en ambos)
- [ ] Verificar que no hay divergencias

**Criterio de Éxito:** ✅ Sincronización funcionando

**Rollback:** Revertir cambios, mantener solo Firebase

---

# FASE 4: STOCK MULTI-CIUDAD (CRÍTICO)

**Duración:** 2 días  
**Riesgo:** ALTO  
**Objetivo:** Migrar estructura especial de cityStock

## Subfase 4.1: Análisis y Preparación
**Duración:** 2 horas

**Tareas:**
- [ ] Analizar estructura actual de `cityStock`
- [ ] Documentar todas las ciudades y SKUs
- [ ] Calcular totales por ciudad
- [ ] Crear script de validación previa

**Testing:**
- [ ] Verificar que se identificaron todas las ciudades
- [ ] Validar que todos los SKUs están en el análisis
- [ ] Comparar totales con `almacenCentral`

**Criterio de Éxito:** ✅ Análisis completo y validado

---

## Subfase 4.2: Migración de cityStock
**Duración:** 4 horas

**Tareas:**
- [ ] Crear script `migrate-cityStock.js`
- [ ] Convertir estructura plana `{ciudad: {sku: cantidad}}` → filas normalizadas
- [ ] Migrar a tabla `city_stock` (ciudad, sku, cantidad)
- [ ] Validar que no se perdió ningún SKU

**Testing:**
- [ ] Comparar totales por ciudad: `SUM(cantidad) WHERE ciudad = 'X'`
- [ ] Verificar que todos los SKUs se migraron
- [ ] Validar que no hay duplicados (ciudad, sku)
- [ ] Comparar stock total global

**Criterio de Éxito:** ✅ Stock migrado, totales coinciden exactamente

**Rollback:** Eliminar tabla `city_stock`

---

## Subfase 4.3: Dual-Write Stock (CRÍTICO)
**Duración:** 1 día

**Tareas:**
- [ ] Modificar `discountCityStock()` y `restoreCityStock()` para escribir en ambos
- [ ] Cada operación de stock: actualizar Firebase Y Supabase
- [ ] Implementar transacciones para consistencia
- [ ] Monitorear logs de cada operación

**Testing:**
- [ ] Registrar venta (debe descontar en ambos)
- [ ] Cancelar venta (debe restaurar en ambos)
- [ ] Despachar productos (debe actualizar en ambos)
- [ ] Verificar que totales coinciden después de cada operación

**Criterio de Éxito:** ✅ Stock sincronizado en ambos sistemas

**Rollback:** Revertir cambios, mantener solo Firebase

---

# FASE 5: VENTAS (PASO A PASO - CRÍTICO)

**Duración:** 4 días  
**Riesgo:** ALTO  
**Objetivo:** Migrar ventas preservando todas las relaciones

## Subfase 5.1: Migración de Historial (Solo lectura)
**Duración:** 4 horas

**Tareas:**
- [ ] Crear script `migrate-sales-history.js`
- [ ] Migrar `ventashistorico` → `sales` (con `deleted_from_pending_at` según `settledAt`)
- [ ] Preservar `codigoUnico` y todos los campos
- [ ] Mapear timestamps correctamente

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que `codigoUnico` se preservó
- [ ] Validar que `deleted_from_pending_at` se asignó correctamente
- [ ] Comparar totales de ventas por ciudad

**Criterio de Éxito:** ✅ Historial migrado, relaciones preservadas

**Rollback:** Eliminar registros con `estado_entrega IN ('confirmado', 'entregada', 'cancelado')`

---

## Subfase 5.2: Migración de Ventas por Cobrar
**Duración:** 3 horas

**Tareas:**
- [ ] Crear script `migrate-sales-pending.js`
- [ ] Para cada venta en `ventasporcobrar`:
  - [ ] Buscar en `sales` por `codigoUnico`
  - [ ] Si existe: actualizar `deleted_from_pending_at = NULL`
  - [ ] Si NO existe: crear nueva fila
- [ ] Preservar referencias `idHistorico` / `idPorCobrar`

**Testing:**
- [ ] Comparar conteos de ventas por cobrar
- [ ] Verificar que todas tienen `deleted_from_pending_at IS NULL`
- [ ] Validar que referencias cruzadas se preservaron
- [ ] Probar query: ventas por cobrar por ciudad

**Criterio de Éxito:** ✅ Ventas por cobrar migradas y activas

**Rollback:** Actualizar `deleted_from_pending_at = now()` para todas

---

## Subfase 5.3: Migración de Ventas Pendientes
**Duración:** 2 horas

**Tareas:**
- [ ] Crear script `migrate-pending-sales.js`
- [ ] Migrar `VentasSinConfirmar` → `sales` (estado_entrega='pendiente')
- [ ] Preservar todos los campos

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que estado es 'pendiente'
- [ ] Validar que se pueden consultar

**Criterio de Éxito:** ✅ Ventas pendientes migradas

**Rollback:** Eliminar registros con `estado_entrega='pendiente'`

---

## Subfase 5.4: Migración de Depósitos
**Duración:** 2 horas

**Tareas:**
- [ ] Crear script `migrate-deposits.js`
- [ ] Migrar `GenerarDeposito` → actualizar `sales.deposit_id` y `settled_at`
- [ ] Buscar ventas por `codigoUnico` y actualizar

**Testing:**
- [ ] Verificar que ventas en depósitos tienen `deposit_id` asignado
- [ ] Validar que `settled_at` se asignó correctamente
- [ ] Comparar totales de depósitos

**Criterio de Éxito:** ✅ Depósitos migrados y vinculados

**Rollback:** Actualizar `deposit_id = NULL` y `settled_at = NULL`

---

## Subfase 5.5: Validación Completa de Ventas
**Duración:** 3 horas

**Testing Integral:**
- [ ] Ejecutar `validate-sales-complete.js`
- [ ] Comparar totales por ciudad en ambos sistemas
- [ ] Verificar que `codigoUnico` es único
- [ ] Validar relaciones: `idHistorico`, `idPorCobrar`
- [ ] Probar queries complejas:
  - Ventas por cobrar por ciudad
  - Historial por fecha
  - Depósitos por ciudad

**Criterio de Éxito:** ✅ Todas las validaciones pasan

---

# FASE 6: DESPACHOS PENDIENTES

**Duración:** 1 día  
**Riesgo:** MEDIO  
**Objetivo:** Migrar despachos pendientes

## Subfase 6.1: Migración de Despachos Pendientes
**Duración:** 3 horas

**Tareas:**
- [ ] Crear script `migrate-dispatches-pending.js`
- [ ] Migrar `despachos` → `dispatches` (status='pendiente')
- [ ] Preservar estructura de items

**Testing:**
- [ ] Comparar conteos
- [ ] Verificar que items se migraron correctamente
- [ ] Validar que status es 'pendiente'

**Criterio de Éxito:** ✅ Despachos pendientes migrados

**Rollback:** Eliminar registros con `status='pendiente'`

---

## Subfase 6.2: Dual-Write Despachos
**Duración:** 3 horas

**Tareas:**
- [ ] Modificar funciones de despachos para escribir en ambos
- [ ] Nuevos despachos: crear en ambos sistemas
- [ ] Confirmar despacho: actualizar en ambos

**Testing:**
- [ ] Crear despacho nuevo (debe aparecer en ambos)
- [ ] Confirmar despacho (debe actualizar en ambos)
- [ ] Verificar que stock se actualiza en ambos

**Criterio de Éxito:** ✅ Despachos sincronizados

**Rollback:** Revertir cambios

---

# FASE 7: CÓDIGO FRONTEND

**Duración:** 3 días  
**Riesgo:** MEDIO  
**Objetivo:** Reemplazar Firebase por Supabase en el código

## Subfase 7.1: Cliente Supabase
**Duración:** 2 horas

**Tareas:**
- [ ] Crear `src/supabaseClient.js` (reemplazar `firebase.js`)
- [ ] Configurar cliente con variables de entorno
- [ ] Crear helpers básicos

**Testing:**
- [ ] Probar conexión
- [ ] Verificar que se puede leer una tabla

**Criterio de Éxito:** ✅ Cliente funcionando

---

## Subfase 7.2: Auth Utils
**Duración:** 4 horas

**Tareas:**
- [ ] Crear `src/supabaseAuthUtils.js`
- [ ] Reemplazar `registerUser()`, `loginUser()`, `changePassword()`
- [ ] Adaptar a Supabase Auth

**Testing:**
- [ ] Probar registro de usuario
- [ ] Probar login
- [ ] Probar cambio de contraseña
- [ ] Verificar sesiones

**Criterio de Éxito:** ✅ Autenticación funcionando

---

## Subfase 7.3: Utils de Datos (Paso a paso)
**Duración:** 2 días

**Tareas:**
- [ ] Crear `src/supabaseUtils.js` (reemplazar `firestoreUtils.js`)
- [ ] Migrar función por función:
  - [ ] Funciones de stock (`discountCityStock`, `restoreCityStock`)
  - [ ] Funciones de ventas (`registrarVentaPendiente`, `confirmarEntregaVenta`)
  - [ ] Funciones de depósitos (`crearSnapshotDeposito`)
  - [ ] Funciones de despachos
- [ ] Reemplazar `onSnapshot` → Supabase Realtime

**Testing:**
- [ ] Probar cada función migrada
- [ ] Verificar que suscripciones en tiempo real funcionan
- [ ] Comparar resultados con Firebase

**Criterio de Éxito:** ✅ Todas las funciones migradas y funcionando

---

## Subfase 7.4: Componentes y App.jsx
**Duración:** 1 día

**Tareas:**
- [ ] Actualizar `App.jsx`:
  - [ ] Reemplazar imports de Firebase
  - [ ] Actualizar suscripciones a Realtime
  - [ ] Adaptar lógica de estado
- [ ] Actualizar componentes que usan Firebase:
  - [ ] `SalesPage.jsx`
  - [ ] `ProductsPage.jsx`
  - [ ] Otros componentes

**Testing:**
- [ ] Probar cada vista de la aplicación
- [ ] Verificar que datos se cargan correctamente
- [ ] Probar operaciones CRUD en cada módulo

**Criterio de Éxito:** ✅ Aplicación funcionando completamente

---

# FASE 8: TESTING INTEGRAL

**Duración:** 2 días  
**Riesgo:** BAJO  
**Objetivo:** Validar que todo funciona igual que antes

## Subfase 8.1: Testing de Funcionalidades Core
**Duración:** 1 día

**Checklist:**
- [ ] **Autenticación:**
  - [ ] Login funciona
  - [ ] Registro funciona
  - [ ] Cambio de contraseña funciona
  - [ ] Sesiones persisten

- [ ] **Productos:**
  - [ ] Listar productos
  - [ ] Crear producto
  - [ ] Editar producto
  - [ ] Subir imagen
  - [ ] Eliminar producto

- [ ] **Stock:**
  - [ ] Ver stock por ciudad
  - [ ] Descontar stock al vender
  - [ ] Restaurar stock al cancelar
  - [ ] Despachar productos

- [ ] **Ventas:**
  - [ ] Registrar venta pendiente
  - [ ] Confirmar entrega
  - [ ] Editar venta confirmada
  - [ ] Cancelar venta
  - [ ] Ver historial

- [ ] **Depósitos:**
  - [ ] Generar depósito
  - [ ] Ver depósitos
  - [ ] Finalizar depósito
  - [ ] Eliminar venta de depósito

**Criterio de Éxito:** ✅ Todas las funcionalidades core funcionan

---

## Subfase 8.2: Testing de Datos
**Duración:** 2 horas

**Tareas:**
- [ ] Ejecutar `validate-all-data.js`
- [ ] Comparar totales entre Firebase y Supabase:
  - [ ] Total productos
  - [ ] Total stock por ciudad
  - [ ] Total ventas por estado
  - [ ] Total usuarios
- [ ] Verificar integridad referencial

**Criterio de Éxito:** ✅ Todos los totales coinciden

---

## Subfase 8.3: Testing de Rendimiento
**Duración:** 2 horas

**Tareas:**
- [ ] Medir tiempo de carga de productos
- [ ] Medir tiempo de carga de ventas
- [ ] Medir tiempo de consultas complejas
- [ ] Comparar con Firebase (debe ser igual o mejor)

**Criterio de Éxito:** ✅ Rendimiento igual o mejor que Firebase

---

## Subfase 8.4: Testing de Tiempo Real
**Duración:** 2 horas

**Tareas:**
- [ ] Abrir app en 2 navegadores
- [ ] Crear venta en uno, verificar que aparece en otro
- [ ] Editar producto, verificar actualización en tiempo real
- [ ] Actualizar stock, verificar sincronización

**Criterio de Éxito:** ✅ Tiempo real funcionando correctamente

---

# FASE 9: DESPLIEGUE CONTROLADO

**Duración:** 1 día  
**Riesgo:** BAJO  
**Objetivo:** Poner en producción de forma segura

## Subfase 9.1: Preparación de Producción
**Duración:** 2 horas

**Tareas:**
- [ ] Configurar variables de entorno en producción
- [ ] Verificar que Supabase está accesible desde producción
- [ ] Preparar rollback plan
- [ ] Notificar al equipo

**Criterio de Éxito:** ✅ Todo listo para desplegar

---

## Subfase 9.2: Despliegue y Monitoreo
**Duración:** 1 día

**Tareas:**
- [ ] Desplegar código actualizado
- [ ] Monitorear logs de errores
- [ ] Verificar que usuarios pueden acceder
- [ ] Mantener Firebase activo como respaldo (1 semana)
- [ ] Monitorear métricas:
  - [ ] Errores en consola
  - [ ] Tiempo de respuesta
  - [ ] Uso de recursos

**Criterio de Éxito:** ✅ Aplicación funcionando en producción

**Rollback:** Revertir a versión anterior con Firebase

---

## Subfase 9.3: Limpieza Final
**Duración:** 1 hora (después de 1 semana)

**Tareas:**
- [ ] Validar que no hay errores en producción
- [ ] Confirmar que todos los usuarios pueden acceder
- [ ] Desactivar dual-write (solo Supabase)
- [ ] Documentar migración completada

**Criterio de Éxito:** ✅ Migración completada, Firebase desactivado

---

# 📋 CHECKLIST GENERAL POR FASE

## Antes de Iniciar Cada Fase:
- [ ] Backup completo realizado
- [ ] Scripts de migración probados con datos de prueba
- [ ] Plan de rollback preparado
- [ ] Testing plan definido

## Durante Cada Fase:
- [ ] Ejecutar migración
- [ ] Validar datos inmediatamente
- [ ] Ejecutar tests específicos
- [ ] Documentar cualquier problema

## Después de Cada Fase:
- [ ] ✅ Testing completo ejecutado
- [ ] ✅ Criterios de éxito cumplidos
- [ ] ✅ Documentación actualizada
- [ ] ✅ Logs revisados

---

# 🚨 PLAN DE ROLLBACK

## Rollback por Fase:

### Fase 1-3 (Datos Base):
```sql
-- Eliminar tablas migradas
DROP TABLE IF EXISTS numbers CASCADE;
DROP TABLE IF EXISTS team_messages CASCADE;
DROP TABLE IF EXISTS dispatches CASCADE;
```

### Fase 4 (Stock):
```sql
DROP TABLE IF EXISTS city_stock CASCADE;
-- Revertir código a Firebase
```

### Fase 5 (Ventas):
```sql
-- Eliminar todas las ventas
TRUNCATE TABLE sales CASCADE;
-- Revertir código
```

### Fase 6-7 (Código):
```bash
# Revertir commits de código
git revert <commit-hash>
# O restaurar desde branch anterior
git checkout <previous-branch>
```

---

# 📊 MÉTRICAS DE ÉXITO

## Por Fase:
- ✅ **Conteos:** 100% de documentos migrados
- ✅ **Integridad:** 0 errores de validación
- ✅ **Funcionalidad:** Todas las pruebas pasan
- ✅ **Rendimiento:** Tiempos iguales o mejores

## Global:
- ✅ **Datos:** 100% migrados sin pérdida
- ✅ **Funcionalidad:** 100% de features funcionando
- ✅ **Usuarios:** 100% pueden autenticarse
- ✅ **Tiempo Real:** Funcionando correctamente

---

# 📝 DOCUMENTACIÓN A GENERAR

1. **Log de Migración:** Cada fase documentada
2. **Problemas Encontrados:** Issues y soluciones
3. **Cambios de Código:** Lista de archivos modificados
4. **Guía de Rollback:** Pasos para revertir cada fase
5. **Validaciones:** Resultados de cada test

---

# ✅ PRÓXIMOS PASOS

1. **Revisar este plan** y aprobar
2. **Iniciar Fase 0:** Preparación
3. **Ejecutar fase por fase** con testing exhaustivo
4. **Documentar cada paso**
5. **Ajustar plan** según necesidades reales

---

**¿Listo para comenzar?** Empezamos con la Fase 0 cuando apruebes este plan.



