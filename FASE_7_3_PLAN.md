# 📋 FASE 7.3: Utils de Datos - Plan de Migración

## 🎯 Estrategia: Migración por Prioridad

**Total de funciones:** 18 funciones en `firestoreUtils.js`

---

## 📊 Priorización de Funciones

### 🔴 **CRÍTICAS (Primero):**

1. **Funciones de Stock:**
   - `discountCityStock()` - Descontar stock
   - `restoreCityStock()` - Restaurar stock
   - `adjustCityStock()` - Ajustar stock múltiple
   - `subscribeCityStock()` - Suscripción en tiempo real

2. **Funciones de Ventas Básicas:**
   - `registrarVentaPendiente()` - Registrar venta pendiente
   - `confirmarEntregaVenta()` - Confirmar entrega
   - `editarVentaPendiente()` - Editar venta pendiente
   - `eliminarVentaPendiente()` - Eliminar venta pendiente

### 🟡 **IMPORTANTES (Segundo):**

3. **Funciones de Ventas Avanzadas:**
   - `editarVentaConfirmada()` - Editar venta confirmada
   - `cancelarVentaConfirmada()` - Cancelar venta
   - `cancelarEntregaConfirmadaConCosto()` - Cancelar con costo
   - `registrarCancelacionPendienteConCosto()` - Cancelar pendiente con costo

4. **Funciones de Depósitos:**
   - `crearSnapshotDeposito()` - Crear depósito
   - `confirmarDepositoVenta()` - Confirmar depósito
   - `eliminarVentaDepositoRobusto()` - Eliminar venta de depósito

### 🟢 **SECUNDARIAS (Tercero):**

5. **Funciones de Sincronización:**
   - `sincronizarEdicionDepositoHistorico()` - Sincronizar edición
   - `sincronizarEdicionDepositoHistoricoV2()` - Sincronizar edición v2
   - `ensureCanceladasConCostoEnVentasPorCobrar()` - Asegurar canceladas

---

## 🔄 Orden de Implementación

### **Paso 1: Funciones de Stock** (Críticas)
- `discountCityStock()`
- `restoreCityStock()`
- `adjustCityStock()`
- `subscribeCityStock()`

### **Paso 2: Funciones de Ventas Básicas**
- `registrarVentaPendiente()`
- `confirmarEntregaVenta()`
- `editarVentaPendiente()`
- `eliminarVentaPendiente()`

### **Paso 3: Funciones de Ventas Avanzadas**
- `editarVentaConfirmada()`
- `cancelarVentaConfirmada()`
- `cancelarEntregaConfirmadaConCosto()`
- `registrarCancelacionPendienteConCosto()`

### **Paso 4: Funciones de Depósitos**
- `crearSnapshotDeposito()`
- `confirmarDepositoVenta()`
- `eliminarVentaDepositoRobusto()`

### **Paso 5: Funciones de Sincronización**
- `sincronizarEdicionDepositoHistorico()`
- `sincronizarEdicionDepositoHistoricoV2()`
- `ensureCanceladasConCostoEnVentasPorCobrar()`

---

## 📝 Notas Importantes

1. **Stock:** Usa tabla `city_stock` normalizada (ciudad, sku, cantidad)
2. **Ventas:** Usa tabla `sales` unificada con `deleted_from_pending_at`
3. **Depósitos:** Usa tabla `deposits` y actualiza `sales.deposit_id`
4. **Realtime:** Reemplazar `onSnapshot` → Supabase Realtime

---

**¿Empezamos con el Paso 1 (Funciones de Stock)?**



