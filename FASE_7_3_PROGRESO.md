# 📊 FASE 7.3: Utils de Datos - Progreso

## ✅ Funciones Implementadas (Paso 1 y 2)

### 🔴 Funciones de Stock (Paso 1 - Completado):

1. ✅ **`discountCityStock(ciudad, sku, cantidad)`**
   - Descuenta stock de una ciudad
   - Usa tabla `city_stock` normalizada
   - Maneja creación si no existe

2. ✅ **`restoreCityStock(ciudad, sku, cantidad)`**
   - Restaura stock de una ciudad
   - Usa tabla `city_stock` normalizada

3. ✅ **`adjustCityStock(ciudad, items)`**
   - Ajusta stock de múltiples SKUs
   - Acepta cantidades positivas (suma) o negativas (resta)

4. ✅ **`subscribeCityStock(ciudad, callback)`**
   - Suscripción en tiempo real al stock
   - Reemplaza `onSnapshot` de Firebase
   - Retorna función para desuscribirse

### 🟡 Funciones de Ventas Básicas (Paso 2 - Completado):

5. ✅ **`registrarVentaPendiente(venta)`**
   - Registra venta pendiente
   - Descuenta stock automáticamente
   - Inserta en tabla `sales` con `estado_entrega='pendiente'`

6. ✅ **`confirmarEntregaVenta(id, venta)`**
   - Confirma entrega de venta
   - Actualiza estado a 'entregada' o 'cancelado'
   - Activa en lista por cobrar (`deleted_from_pending_at=null`)

7. ✅ **`editarVentaPendiente(id, ventaAnterior, ventaNueva)`**
   - Edita venta pendiente
   - Ajusta stock (restaura anterior, descuenta nuevo)

8. ✅ **`eliminarVentaPendiente(id, venta)`**
   - Elimina venta pendiente
   - Restaura stock automáticamente

---

## ⏳ Funciones Pendientes

### 🟡 Funciones de Ventas Avanzadas (Paso 3):

- ⏳ `editarVentaConfirmada()`
- ⏳ `cancelarVentaConfirmada()`
- ⏳ `cancelarEntregaConfirmadaConCosto()`
- ⏳ `registrarCancelacionPendienteConCosto()`

### 🟢 Funciones de Depósitos (Paso 4):

- ⏳ `crearSnapshotDeposito()`
- ⏳ `confirmarDepositoVenta()`
- ⏳ `eliminarVentaDepositoRobusto()`

### 🟢 Funciones de Sincronización (Paso 5):

- ⏳ `sincronizarEdicionDepositoHistorico()`
- ⏳ `sincronizarEdicionDepositoHistoricoV2()`
- ⏳ `ensureCanceladasConCostoEnVentasPorCobrar()`

---

## 📊 Progreso General

**Funciones completadas:** 8/18 (44%)  
**Funciones críticas:** ✅ 100% (Stock + Ventas Básicas)

---

## 🎯 Próximos Pasos

1. **Implementar funciones de ventas avanzadas** (Paso 3)
2. **Implementar funciones de depósitos** (Paso 4)
3. **Implementar funciones de sincronización** (Paso 5)
4. **Probar todas las funciones** con datos reales
5. **Actualizar componentes** para usar nuevas funciones (Fase 7.4)

---

## ✅ Criterios de Éxito (Parcial)

- [x] ✅ Funciones de stock implementadas
- [x] ✅ Funciones de ventas básicas implementadas
- [x] ✅ Compatibilidad con código existente
- [x] ✅ Manejo de errores implementado
- [ ] ⏳ Funciones avanzadas pendientes
- [ ] ⏳ Testing completo pendiente

---

**Estado:** ✅ Funciones críticas completadas. Listo para continuar con funciones avanzadas o pasar a Fase 7.4 (actualizar componentes).



