# Flujo del Submenú "Generar Depósito"

## 📋 Resumen General

El submenú **"Generar Depósito"** permite agrupar y registrar las ventas confirmadas de una ciudad específica en un depósito único. Este proceso marca las ventas como "cobradas" y las agrupa en un snapshot que puede ser revisado, editado y finalmente confirmado.

---

## 🔄 Flujo Completo

### **FASE 1: Creación del Depósito (Desde el Menú "Ventas")**

#### 1.1. Selección de Ventas
- El usuario navega al menú **"Ventas"** y selecciona una ciudad.
- Se muestran todas las ventas confirmadas (`estado_entrega: 'confirmado'` o `'entregada'`) que tienen `estado_pago: 'pendiente'` y `deleted_from_pending_at: null`.
- El usuario puede filtrar por período (hoy, última semana, mes actual, etc.).

#### 1.2. Clic en "Generar Depósito"
- Al hacer clic en el botón **"Generar Depósito"** (función `confirmarCobro` en `App.jsx`):
  1. Se obtienen los IDs de las ventas visibles en la tabla.
  2. Se verifica que las canceladas con costo tengan registro en `sales` (función `ensureCanceladasConCostoEnVentasPorCobrar`).
  3. Se consultan las ventas desde Supabase usando los IDs obtenidos.
  4. Se calcula un **resumen** con:
     - `ventasConfirmadas`: Ventas normales confirmadas/entregadas
     - `ventasSinteticas`: Ventas de productos sintéticos
     - `canceladasConCosto`: Ventas canceladas con costo de delivery
     - `totalPedidos`: Total de pedidos
     - `totalMonto`: Suma de todos los `total`
     - `totalDelivery`: Suma de todos los `gasto`
     - `totalNeto`: Igual a `totalMonto` (no se descuenta delivery)

#### 1.3. Creación del Snapshot (`crearSnapshotDeposito`)
La función `crearSnapshotDeposito` en `supabaseUtils.js` realiza:

1. **Construcción del Payload de Ventas**:
   - Para cada venta, se crea un objeto compacto con:
     - `id`, `codigo_unico`, `total`, `gasto`, `precio`, `fecha`, `sku`, `cantidad`, `sku_extra`, `cantidad_extra`, `estado_entrega`, `sintetica_cancelada`
   - Si no hay `id`, se intenta resolver por `codigo_unico`.

2. **Creación del Registro en `deposits`**:
   ```sql
   INSERT INTO deposits (
     ciudad,           -- Normalizada (ej: "el_alto")
     fecha,            -- Fecha actual
     monto_total,      -- totalNeto del resumen
     nota,             -- JSON con resumen y ventasPayload
     estado            -- 'pendiente'
   )
   ```

3. **Marcado de Ventas como Cobradas**:
   - Para cada venta incluida en el depósito:
     ```sql
     UPDATE sales SET
       deposit_id = <depositId>,
       settled_at = <timestamp>,
       fecha_cobro = <timestamp>,
       estado_pago = 'cobrado'
     WHERE id = <ventaId>
     ```
   - Esto marca las ventas como "cobradas" y las asocia al depósito.

4. **Retorno del ID del Depósito**:
   - Se retorna el `id` del depósito creado.

#### 1.4. Navegación al Menú "Generar Depósito"
- Después de crear el depósito, la aplicación navega automáticamente al menú **"Generar Depósito"** (`setView('deposit')`).

---

### **FASE 2: Visualización y Gestión del Depósito**

#### 2.1. Carga de Depósitos Pendientes
- El componente `DepositConfirmView` se suscribe a la colección `'GenerarDeposito'` (mapeada a la tabla `deposits` en Supabase).
- Los depósitos se agrupan por ciudad y se convierten en "snapshots" locales con:
  - `id`: Nombre de la ciudad (usado como identificador lógico)
  - `city`: Nombre de la ciudad (desnormalizado, ej: "EL ALTO")
  - `timestamp`: Fecha de creación más antigua del grupo
  - `rows`: Array de ventas incluidas en el depósito
  - `resumen`: Resumen recalculado (igual que en FASE 1)

#### 2.2. Selección de Ciudad
- Se muestran botones para cada ciudad que tiene depósitos pendientes.
- Al seleccionar una ciudad, se muestra el depósito activo (`active`).

#### 2.3. Visualización del Resumen
Se muestran tres tarjetas con información:

1. **Tarjeta de Pedidos**:
   - Pedidos confirmados
   - Pedidos sintéticos
   - Cancelados con costo
   - Total de pedidos

2. **Tarjeta de Montos**:
   - Monto bruto (`totalMonto`)
   - Delivery (`totalDelivery`)
   - Neto (`totalNeto`)

3. **Formulario de Registro**:
   - Campo "Monto depositado" (por defecto muestra `totalNeto`)
   - Botón "CONFIRMAR DEPOSITO"
   - Botón "Eliminar Ventas" (eliminación masiva)

#### 2.4. Tabla de Ventas Incluidas
- Se muestra una tabla con todas las ventas incluidas en el depósito.
- Columnas:
  - Fecha, Hora, Ciudad, Encomienda, Usuario
  - Columnas por producto (solo productos NO sintéticos)
  - Precio, Delivery, Total (Neto), Celular
  - Botón "Editar" para cada fila

#### 2.5. Funcionalidades Adicionales

**a) Ver Detalle de Pedidos**:
- Botón de búsqueda que abre un modal con la tabla completa de pedidos.
- Muestra los mismos datos pero en un formato más amplio.

**b) Editar Venta**:
- Al hacer clic en "Editar", se abre un modal con los campos editables:
  - Fecha, Hora, Ciudad, Método, Vendedora, Celular
  - Precio, Gasto, Gasto Cancelación (si es cancelada)
  - Cantidad, Cantidad Extra, SKU, SKU Extra
- Al guardar:
  1. Se calcula el `diff` entre valores antiguos y nuevos.
  2. Se muestra un modal de confirmación con los cambios.
  3. Al confirmar:
     - Se actualiza el snapshot local.
     - Se actualiza la venta en `sales`.
     - Se sincroniza con el depósito si tiene `deposit_id`.
     - Se ajusta `city_stock` según los cambios en cantidades/SKUs:
       - Si cambió el SKU: restaura stock del antiguo, descuenta del nuevo.
       - Si cambió la cantidad: ajusta el stock según la diferencia.
     - Se sincroniza con `ventashistorico` usando `sincronizarEdicionDepositoHistoricoV2`.

**c) Eliminar Venta Individual**:
- Botón "Eliminar" en el modal de edición.
- Confirma eliminación y llama a `eliminarVentaDepositoRobusto`.
- Actualiza el snapshot local y elimina la venta de `sales`.

**d) Eliminación Masiva**:
- Botón "Eliminar Ventas" en el formulario de registro.
- Abre un modal que muestra:
  - Total de ventas por cobrar de la ciudad
  - Cantidad de ventas sintéticas
- Al confirmar, elimina todas las ventas por cobrar de la ciudad en chunks de 450 registros.

---

### **FASE 3: Confirmación del Depósito**

#### 3.1. Ingreso de Monto Depositado
- El usuario ingresa el monto depositado (por defecto muestra `totalNeto`).
- Opcionalmente puede agregar una nota (actualmente no se muestra en la UI).

#### 3.2. Confirmación
- Al hacer clic en **"CONFIRMAR DEPOSITO"**:
  1. Se valida que haya un depósito activo y un monto confirmado.
  2. Se ejecuta `finalizeDeposit()`:
     - Se obtienen todos los depósitos pendientes de la ciudad desde `deposits`.
     - Se eliminan todos los depósitos pendientes de la ciudad (en chunks de 450).
     - Se limpia el snapshot local (se elimina de la lista de snapshots).
     - Se resetean los campos del formulario.

#### 3.3. Resultado
- El depósito desaparece de la lista de depósitos pendientes.
- Las ventas ya estaban marcadas como "cobradas" en la FASE 1, por lo que no aparecen más en el menú "Ventas" (filtro `estado_pago: 'pendiente'`).

---

## 📊 Estructura de Datos

### Tabla `deposits`
```sql
CREATE TABLE deposits (
  id uuid PRIMARY KEY,
  ciudad text NOT NULL,           -- Normalizada (ej: "el_alto")
  fecha date NOT NULL,             -- Fecha de creación
  monto_total numeric(12,2),       -- totalNeto del resumen
  nota text,                       -- JSON con { resumen, ventas }
  estado text DEFAULT 'pendiente', -- 'pendiente' o eliminado
  created_at timestamptz,
  updated_at timestamptz
);
```

### Campos Actualizados en `sales` al Crear Depósito
```sql
UPDATE sales SET
  deposit_id = <uuid>,           -- ID del depósito
  settled_at = <timestamptz>,    -- Timestamp de liquidación
  fecha_cobro = <timestamptz>,    -- Fecha de cobro
  estado_pago = 'cobrado'         -- Cambia de 'pendiente' a 'cobrado'
WHERE id IN (<ventas_ids>);
```

---

## 🔍 Puntos Clave

1. **No se Eliminan Ventas**: Las ventas NO se eliminan, solo se marcan como "cobradas" (`estado_pago: 'cobrado'`).

2. **Snapshot por Ciudad**: Cada ciudad tiene su propio depósito. Si se crean múltiples depósitos para la misma ciudad, se agrupan en un solo snapshot.

3. **Edición con Sincronización**: Al editar una venta en el depósito, se sincroniza automáticamente con:
   - `sales` (tabla principal)
   - `city_stock` (ajuste de stock)
   - `ventashistorico` (si aplica)

4. **Eliminación de Depósitos**: Al confirmar el depósito, se eliminan los registros de `deposits`, pero las ventas permanecen marcadas como "cobradas".

5. **Cálculo de Totales**: 
   - `totalMonto`: Suma de `total` de todas las ventas (incluye canceladas con costo negativo).
   - `totalDelivery`: Suma de `gasto` (o `gastoCancelacion` para canceladas).
   - `totalNeto`: Igual a `totalMonto` (no se descuenta delivery del total).

6. **Ventas Sintéticas Canceladas**: Se muestran con fondo rojo y tienen `total` negativo igual a `-gastoCancelacion`.

---

## 🎯 Casos de Uso

1. **Depósito Normal**:
   - Crear depósito desde "Ventas" → Revisar en "Generar Depósito" → Confirmar depósito.

2. **Editar Antes de Confirmar**:
   - Crear depósito → Editar una o más ventas → Confirmar depósito.

3. **Eliminar Venta del Depósito**:
   - Crear depósito → Editar venta → Eliminar venta → Confirmar depósito.

4. **Eliminación Masiva**:
   - Crear depósito → "Eliminar Ventas" → Confirmar eliminación → Las ventas desaparecen de "Ventas".

---

## ⚠️ Notas Importantes

- **Solo Admin**: Este menú solo es accesible para usuarios con `rol: 'admin'`.
- **Ventas Filtradas**: Solo se muestran ventas con `estado_pago: 'pendiente'` y `deleted_from_pending_at: null`.
- **Stock Ajustado**: Al editar cantidades/SKUs, el stock de la ciudad se ajusta automáticamente.
- **Persistencia**: Los depósitos se guardan en `deposits` y persisten hasta que se confirman (se eliminan).


