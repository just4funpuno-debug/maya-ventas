# Análisis de Tablas: `deposits` y `v_sales_pending_payment`

## 📊 Resumen Ejecutivo

Estas son **dos estructuras diferentes** que sirven **propósitos distintos** en la aplicación:

1. **`deposits`** (Tabla): Menú "Generar Depósito"
2. **`v_sales_pending_payment`** (Vista): Menú "Ventas" (ventas por cobrar)

---

## 1. Tabla `deposits`

### 📍 Menú
**"Generar Depósito"** (submenú dentro de "Historial")

### 🎯 Función
Almacena **depósitos agrupados** de ventas. Cada depósito representa un conjunto de ventas que se agruparon para generar un depósito.

### 📋 Estructura
```sql
CREATE TABLE deposits (
  id uuid PRIMARY KEY,
  ciudad text NOT NULL,
  fecha date NOT NULL,
  monto_total numeric(12,2) NOT NULL,
  nota text,  -- JSON stringificado: { resumen: {...}, ventas: [...] }
  estado text DEFAULT 'pendiente',  -- 'pendiente', 'confirmado', 'cancelado'
  created_at timestamptz,
  confirmed_at timestamptz
);
```

### 🔄 Mapeo en Código
- **Firebase**: Colección `GenerarDeposito`
- **Supabase**: Tabla `deposits`
- **Código**: `subscribeCollection('GenerarDeposito', ...)` → mapea a `deposits`

### 📝 Uso en la Aplicación
- **Componente**: `DepositConfirmView` (línea 6650+ en `App.jsx`)
- **Función**: Muestra depósitos pendientes agrupados por ciudad
- **Flujo**: 
  1. Usuario selecciona ventas en menú "Ventas"
  2. Crea un depósito (agrupa ventas)
  3. El depósito se guarda en `deposits` con `nota` JSON conteniendo `resumen` y `ventas`
  4. Se muestra en "Generar Depósito" para confirmar/finalizar

### 📦 Contenido del Campo `nota`
```json
{
  "resumen": {
    "ventasConfirmadas": 10,
    "ventasSinteticas": 2,
    "canceladasConCosto": 1,
    "totalPedidos": 13,
    "totalMonto": 5000.00,
    "totalDelivery": 200.00,
    "totalNeto": 4800.00,
    "productos": { "SKU1": 5, "SKU2": 8, ... }
  },
  "ventas": [
    {
      "id": "uuid-venta-1",
      "codigo_unico": "uuid",
      "total": 500.00,
      "gasto": 20.00,
      "precio": 520.00,
      "fecha": "2025-01-15",
      "sku": "SKU1",
      "cantidad": 2,
      ...
    },
    ...
  ]
}
```

---

## 2. Vista `v_sales_pending_payment`

### 📍 Menú
**"Ventas"** (menú principal)

### 🎯 Función
Es una **VISTA** (no tabla) que filtra la tabla `sales` para mostrar **ventas individuales** que están:
- Confirmadas o entregadas (`estado_entrega IN ('confirmado', 'entregada')`)
- Pendientes de pago (`estado_pago = 'pendiente'`)
- No eliminadas de la lista por cobrar (`deleted_from_pending_at IS NULL`)

### 📋 Estructura
```sql
CREATE OR REPLACE VIEW v_sales_pending_payment AS
  SELECT * FROM sales
  WHERE deleted_from_pending_at IS NULL 
    AND estado_pago = 'pendiente'
    AND estado_entrega IN ('confirmado', 'entregada');
```

### 🔄 Mapeo en Código
- **Firebase**: Colección `ventasporcobrar`
- **Supabase**: Vista `v_sales_pending_payment` (filtra tabla `sales`)
- **Código**: `subscribeCollection('ventasporcobrar', ...)` → mapea a `sales` con filtros

### 📝 Uso en la Aplicación
- **Componente**: `SalesPage` y `CitySummary` (línea 510+ en `App.jsx`)
- **Función**: Muestra ventas individuales pendientes de pago, agrupadas por ciudad
- **Flujo**:
  1. Usuario ve ventas confirmadas pendientes de pago
  2. Puede seleccionar ventas para crear un depósito
  3. Al crear depósito, las ventas se agrupan en `deposits`
  4. Las ventas se marcan con `deposit_id` y `settled_at` en `sales`

### 📦 Datos Mostrados
- Ventas individuales (una fila por venta)
- Filtradas por ciudad
- Mostradas en tabla con detalles: fecha, hora, usuario, productos, precio, delivery, etc.

---

## 🔗 Relación entre Ambas

```
┌─────────────────────────────────────────────────────────┐
│                    MENÚ "VENTAS"                        │
│  (v_sales_pending_payment / ventasporcobrar)           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Venta 1  │  │ Venta 2  │  │ Venta 3  │  ...        │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│  Usuario selecciona ventas → Crea depósito              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              MENÚ "GENERAR DEPÓSITO"                     │
│                    (deposits)                            │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │  Depósito: EL ALTO - 2025-01-15      │               │
│  │  - Venta 1, Venta 2, Venta 3         │               │
│  │  - Total: 5000.00                    │               │
│  │  - Estado: pendiente                 │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Usuario confirma depósito → Finaliza                   │
└─────────────────────────────────────────────────────────┘
```

### Flujo Completo

1. **Ventas individuales** en `sales` con `estado_pago = 'pendiente'`
2. **Vista `v_sales_pending_payment`** filtra y muestra estas ventas en menú "Ventas"
3. **Usuario selecciona ventas** y crea un depósito
4. **Depósito se guarda** en `deposits` con `nota` JSON conteniendo todas las ventas
5. **Ventas se marcan** con `deposit_id` y `settled_at` en `sales`
6. **Depósito aparece** en menú "Generar Depósito" para confirmar/finalizar

---

## ⚠️ Diferencias Clave

| Aspecto | `deposits` | `v_sales_pending_payment` |
|---------|-----------|---------------------------|
| **Tipo** | Tabla | Vista (filtra `sales`) |
| **Menú** | "Generar Depósito" | "Ventas" |
| **Contenido** | Depósitos agrupados | Ventas individuales |
| **Estructura** | Un registro = múltiples ventas | Un registro = una venta |
| **Campo clave** | `nota` (JSON con resumen + ventas) | Filtros en WHERE |
| **Propósito** | Agrupar ventas para depósito | Mostrar ventas pendientes |

---

## ✅ Conclusión

- **`deposits`**: Tabla para depósitos agrupados (menú "Generar Depósito")
- **`v_sales_pending_payment`**: Vista para ventas individuales pendientes (menú "Ventas")

**No son duplicados**, son estructuras complementarias que trabajan juntas en el flujo de ventas → depósitos.


