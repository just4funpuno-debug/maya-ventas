# 📋 PLAN DE MIGRACIÓN: sales → ventas

## 🎯 Objetivo
Renombrar la tabla `sales` a `ventas` para mantener uniformidad en la estructura de la base de datos, siguiendo el mismo patrón usado en migraciones anteriores (`products` → `almacen_central`, `deposits` → `generar_deposito`).

## 📊 Análisis de Dependencias

### Tabla `sales` actual
- **Foreign Keys desde `sales`**:
  - `sales.sku` → `almacen_central(sku)`
  - `sales.sku_extra` → `almacen_central(sku)`
  - `sales.vendedora_id` → `users(id)`
  - `sales.deposit_id` → `generar_deposito(id)`

### Dependencias de `sales`
- **Vistas**:
  - `v_sales_net`
  - `v_sales_pending_payment`
  - `v_sales_history`

- **Triggers**:
  - `sales_updated` (updated_at)

- **Índices**:
  - `idx_sales_fecha`
  - `idx_sales_estado_entrega`
  - `idx_sales_estado_pago`
  - `idx_sales_ciudad`
  - `idx_sales_vendedora_id`
  - `idx_sales_deposit_id`
  - `idx_sales_deleted_from_pending`
  - `idx_sales_codigo_unico`

- **RLS Policies**:
  - `open_select_sales`
  - `open_modify_sales`

- **Código JavaScript**:
  - `src/App.jsx`: múltiples referencias a `.from('sales')`
  - `src/supabaseUtils.js`: múltiples referencias
  - `src/supabaseUtils-deposits.js`: múltiples referencias
  - `src/supabaseUsers.js`: mapeo de colecciones lógicas a `sales`

## 🔄 Estrategia de Migración (4 Fases)

### FASE 1: Crear estructura y migrar datos ✅
**Objetivo**: Crear `ventas`, migrar datos, mantener compatibilidad con vista `sales`

**Acciones**:
1. Crear tabla `ventas` con misma estructura que `sales`
2. Migrar todos los datos de `sales` a `ventas`
3. Renombrar `sales` a `sales_backup`
4. Crear vista `sales` que apunta a `ventas` (compatibilidad)
5. Habilitar RLS, triggers, índices en `ventas`
6. Habilitar Realtime para `ventas`

**Testing**:
- Verificar conteos: `sales_backup` = `ventas` = `sales` (vista)
- Verificar que la aplicación sigue funcionando
- Verificar Realtime funciona

**Archivos**:
- `scripts/fase-1-renombrar-sales.sql`
- `scripts/test-fase-1-renombrar-sales.sql`
- `scripts/EJECUTAR-FASE-1-SALES.md`

---

### FASE 2: Actualizar código JavaScript
**Objetivo**: Actualizar todas las referencias de `sales` a `ventas` en el código

**Archivos a modificar**:
1. `src/supabaseUsers.js`:
   - Actualizar `tableMap`: `'ventasporcobrar': 'ventas'`, `'ventashistorico': 'ventas'`, `'VentasSinConfirmar': 'ventas'`

2. `src/App.jsx`:
   - Buscar y reemplazar `.from('sales')` por `.from('ventas')`
   - Verificar que todas las consultas usen `ventas`

3. `src/supabaseUtils.js`:
   - Actualizar todas las referencias a `sales` por `ventas`

4. `src/supabaseUtils-deposits.js`:
   - Actualizar referencias a `sales` por `ventas`

**Testing**:
- Verificar que todas las funcionalidades siguen funcionando
- Verificar menú "Ventas"
- Verificar menú "Historial"
- Verificar "Registrar Venta"
- Verificar "Generar Depósito"

**Archivos**:
- `scripts/fase-2-renombrar-sales.md` (guía de cambios)
- `scripts/test-fase-2-renombrar-sales.sql` (verificación en BD)

---

### FASE 3: Actualizar foreign keys y vistas
**Objetivo**: Actualizar vistas y verificar foreign keys apuntan a `ventas`

**Acciones**:
1. Actualizar vistas:
   - `v_sales_net` → usar `ventas` en lugar de `sales`
   - `v_sales_pending_payment` → usar `ventas`
   - `v_sales_history` → usar `ventas`

2. Verificar foreign keys:
   - `ventas.sku` → `almacen_central(sku)` ✅ (ya correcto en FASE 1)
   - `ventas.sku_extra` → `almacen_central(sku)` ✅
   - `ventas.vendedora_id` → `users(id)` ✅
   - `ventas.deposit_id` → `generar_deposito(id)` ✅

3. Verificar que no hay dependencias rotas

**Testing**:
- Verificar que las vistas funcionan correctamente
- Verificar que las foreign keys están correctas
- Verificar que no hay errores en la aplicación

**Archivos**:
- `scripts/fase-3-renombrar-sales.sql`
- `scripts/test-fase-3-renombrar-sales.sql`
- `scripts/EJECUTAR-FASE-3-SALES.md`

---

### FASE 4: Limpieza final
**Objetivo**: Eliminar vista `sales` y tabla `sales_backup` (opcional)

**Acciones**:
1. Verificar que no hay código usando `sales` (solo `ventas`)
2. Eliminar vista `sales`
3. (Opcional) Eliminar tabla `sales_backup` después de verificar que todo funciona

**Testing**:
- Verificar que la aplicación funciona sin la vista `sales`
- Verificar que no hay referencias a `sales` en el código
- Verificar integridad de datos final

**Archivos**:
- `scripts/fase-4-renombrar-sales.sql`
- `scripts/test-fase-4-renombrar-sales.sql`
- `scripts/EJECUTAR-FASE-4-SALES.md`

## ⚠️ Consideraciones Importantes

1. **Realtime**: Debe habilitarse manualmente desde el Dashboard de Supabase para `ventas`
2. **Backup**: Siempre hacer backup antes de cada fase
3. **Testing**: Ejecutar tests después de cada fase
4. **Reversibilidad**: Las fases 1-3 son reversibles, la fase 4 requiere más cuidado

## 📅 Orden de Ejecución

1. ✅ **FASE 1** → Ejecutar script SQL, habilitar Realtime, testing
2. ⏳ **FASE 2** → Actualizar código JavaScript, testing
3. ⏳ **FASE 3** → Actualizar vistas, testing
4. ⏳ **FASE 4** → Limpieza final (opcional), testing

## 🔍 Verificación Final

Después de completar todas las fases:
- [ ] Tabla `ventas` existe y tiene todos los datos
- [ ] Código JavaScript usa `ventas` en lugar de `sales`
- [ ] Vistas actualizadas y funcionando
- [ ] Foreign keys correctas
- [ ] Realtime habilitado para `ventas`
- [ ] Aplicación funciona sin errores
- [ ] Vista `sales` eliminada (FASE 4)
- [ ] Tabla `sales_backup` eliminada (FASE 4, opcional)


