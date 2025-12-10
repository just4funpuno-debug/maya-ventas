# Verificación de Cuadros en "Almacen Central"

## 📋 Estado Actual

### ✅ Funcionalidades Verificadas

1. **Cuadro "VENTAS NACIONALES"**
   - ✅ Muestra total por vender de todos los productos
   - ✅ Muestra resumen: Central, Pend., Ciudades
   - ✅ Cálculo correcto basado en `precioPar` y `delivery`

2. **Cuadros de Productos Individuales**
   - ✅ Muestra información de inventario (Central, Pend., Ciudades)
   - ✅ Muestra TOTAL y PARES
   - ✅ Campos editables: Delivery y Precio/par
   - ✅ Botón "Fijar" para guardar valores

### ⚠️ Problema Identificado

**Campo `precioPar` no se guarda en la base de datos**

- El campo `precioPar` se puede editar en los cuadros
- Se usa para calcular "TOTAL POR VENDER"
- **PERO**: Solo se guarda `delivery` cuando se hace clic en "Fijar"
- `precioPar` solo existe en el estado local del frontend

### 📊 Columnas en `almacen_central`

Según el esquema actual:
- ✅ `precio` (numeric)
- ✅ `delivery` (numeric)
- ✅ `costo` (numeric)
- ✅ `stock` (integer)
- ❌ `precioPar` (NO existe)

## 🔧 Soluciones Posibles

### Opción 1: Agregar columna `precio_par` a `almacen_central`

```sql
ALTER TABLE almacen_central 
ADD COLUMN IF NOT EXISTS precio_par numeric(12,2) DEFAULT 0;
```

**Ventajas:**
- Permite persistir el valor de `precioPar`
- El valor se mantiene entre sesiones
- Consistente con el uso actual en el frontend

**Desventajas:**
- Requiere migración de datos si hay valores existentes
- Agrega una columna adicional

### Opción 2: Usar `precio` como `precioPar`

**Ventajas:**
- No requiere cambios en la base de datos
- Reutiliza columna existente

**Desventajas:**
- Puede causar confusión si `precio` se usa para otro propósito
- No permite tener valores diferentes

### Opción 3: Mantener `precioPar` solo en frontend

**Ventajas:**
- No requiere cambios
- Funciona para cálculos temporales

**Desventajas:**
- El valor se pierde al recargar la página
- No se sincroniza entre dispositivos

## 💡 Recomendación

**Agregar columna `precio_par` a `almacen_central`** para que el valor se persista correctamente.

## 📝 Próximos Pasos

1. Crear script SQL para agregar columna `precio_par`
2. Actualizar función `fijarValoresProducto` para guardar `precioPar`
3. Actualizar normalización de datos para incluir `precioPar`
4. Verificar que los valores se cargan correctamente desde la BD


