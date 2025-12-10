# 🔄 FASE 2: Actualizar código JavaScript (sales → ventas)

## ✅ Cambios Realizados

### 1. `src/supabaseUsers.js`
- ✅ Actualizado `tableMap`:
  - `'VentasSinConfirmar': 'ventas'` (antes: `'sales'`)
  - `'ventasporcobrar': 'ventas'` (antes: `'sales'`)
  - `'ventashistorico': 'ventas'` (antes: `'sales'`)

### 2. `src/App.jsx`
- ✅ Actualizadas 7 referencias `.from('sales')` → `.from('ventas')`:
  - Línea ~760: Consulta por `deposit_id`
  - Línea ~786: Consulta por `id`
  - Línea ~2044: Consulta de ventas para depósito
  - Línea ~6647: Consulta de ventas sintéticas
  - Línea ~7087: Consulta para eliminación masiva
  - Línea ~7127: Eliminación de ventas
  - Línea ~7220: Consulta de `deposit_id` para edición

### 3. `src/supabaseUtils.js`
- ✅ Actualizadas 24 referencias `.from('sales')` → `.from('ventas')`:
  - Funciones de inserción, actualización, eliminación
  - Funciones de búsqueda por `codigo_unico`
  - Funciones de sincronización con depósitos
  - Funciones de gestión de ventas confirmadas

### 4. `src/supabaseUtils-deposits.js`
- ✅ Actualizadas 4 referencias `.from('sales')` → `.from('ventas')`:
  - `createDepositFromSales`: Consulta de ventas
  - `createDepositFromSales`: Actualización de `deposit_id`
  - `getSalesPendingPayment`: Consulta por ciudad
  - `getSaleById`: Consulta por ID

## 🧪 Testing Requerido

### Testing Manual
1. **Menú "Ventas"**:
   - [ ] Abrir menú "Ventas"
   - [ ] Seleccionar una ciudad
   - [ ] Verificar que se muestran las ventas correctamente
   - [ ] Verificar que se pueden ver comprobantes
   - [ ] Verificar que se pueden editar ventas (admin)

2. **Menú "Historial"**:
   - [ ] Abrir menú "Historial"
   - [ ] Verificar que se muestran las ventas históricas
   - [ ] Verificar filtros (fecha, ciudad)
   - [ ] Verificar paginación

3. **Registrar Venta**:
   - [ ] Crear una nueva venta
   - [ ] Verificar que se guarda correctamente
   - [ ] Verificar que aparece en "Ventas" después de confirmar

4. **Generar Depósito**:
   - [ ] Abrir menú "Generar Depósito"
   - [ ] Verificar que se muestran las ventas por cobrar
   - [ ] Verificar que se puede crear un depósito
   - [ ] Verificar que se puede confirmar un depósito

5. **Funcionalidades de Edición**:
   - [ ] Editar una venta desde "Ventas"
   - [ ] Editar una venta desde "Generar Depósito"
   - [ ] Verificar que los cambios se guardan correctamente

6. **Eliminación**:
   - [ ] Eliminar una venta pendiente
   - [ ] Verificar que se elimina correctamente

### Testing de Consola
- [ ] Abrir consola del navegador (F12)
- [ ] Verificar que no hay errores relacionados con `sales`
- [ ] Verificar que las consultas a Supabase usan `ventas`

## ✅ Criterios de Éxito
- [ ] Todas las referencias a `sales` actualizadas a `ventas`
- [ ] No hay errores en la consola
- [ ] Todas las funcionalidades funcionan correctamente
- [ ] Los datos se cargan y muestran correctamente
- [ ] Las operaciones CRUD funcionan (crear, leer, actualizar, eliminar)

## 🔍 Verificación de Código
Para verificar que no quedan referencias a `sales`:
```bash
# Buscar referencias restantes (no debería haber ninguna)
grep -r "\.from\('sales'\)" src/
grep -r '\.from\("sales"\)' src/
```

## ➡️ Próximo Paso
Una vez completado el testing y verificado que todo funciona:
- **FASE 3**: Actualizar vistas SQL (`v_sales_net`, `v_sales_pending_payment`, `v_sales_history`)


