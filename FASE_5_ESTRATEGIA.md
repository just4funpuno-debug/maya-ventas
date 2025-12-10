# 📋 FASE 5: VENTAS - Estrategia por Subfases

## 🎯 Enfoque: Migración Paso a Paso con Control Total

**Razón:** Esta es la fase más crítica y compleja:
- 414 ventas en historial
- 47 ventas por cobrar
- 10 ventas pendientes
- 24 depósitos
- Relaciones complejas entre colecciones

---

## 📊 Subfases de la Fase 5

### ✅ Subfase 5.1: Migración de Historial (Solo lectura)
**Objetivo:** Migrar `ventashistorico` → `sales`
- 414 ventas históricas
- Preservar `codigoUnico`
- Mapear `settledAt` → `deleted_from_pending_at`
- Validar totales por ciudad

### ⏳ Subfase 5.2: Migración de Ventas por Cobrar
**Objetivo:** Activar ventas en `ventasporcobrar`
- Buscar por `codigoUnico` en `sales`
- Si existe: `deleted_from_pending_at = NULL`
- Si NO existe: crear nueva fila
- 47 ventas activas

### ⏳ Subfase 5.3: Migración de Ventas Pendientes
**Objetivo:** Migrar `VentasSinConfirmar` → `sales`
- Estado: `estado_entrega = 'pendiente'`
- 10 ventas pendientes

### ⏳ Subfase 5.4: Migración de Depósitos
**Objetivo:** Vincular depósitos con ventas
- Migrar `GenerarDeposito` → `deposits`
- Actualizar `sales.deposit_id` y `settled_at`
- 24 depósitos

### ⏳ Subfase 5.5: Validación Completa
**Objetivo:** Validar integridad total
- Comparar totales por ciudad
- Verificar `codigoUnico` único
- Validar relaciones cruzadas
- Probar queries complejas

---

## 🔄 Orden de Ejecución

1. **Subfase 5.1** → Validar → Continuar
2. **Subfase 5.2** → Validar → Continuar
3. **Subfase 5.3** → Validar → Continuar
4. **Subfase 5.4** → Validar → Continuar
5. **Subfase 5.5** → Validación final

---

## ✅ Ventajas de este Enfoque

1. **Control total:** Validamos después de cada subfase
2. **Rollback fácil:** Si algo falla, solo revertimos la subfase actual
3. **Debugging claro:** Problemas aislados por subfase
4. **Confianza:** Cada paso validado antes de continuar

---

**¿Empezamos con la Subfase 5.1?**



