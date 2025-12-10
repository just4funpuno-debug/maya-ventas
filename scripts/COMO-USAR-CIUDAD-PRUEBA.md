# 🧪 Cómo Usar la Ciudad de Prueba "PRUEBA"

## ✅ Pasos para Crear y Usar la Ciudad de Prueba

### Paso 1: Crear la Ciudad de Prueba con Ventas

1. **Ve a Supabase SQL Editor**

2. **Ejecuta el script** `scripts/crear-ciudad-prueba.sql`

3. **Verifica que se crearon las ventas:**
   - El script mostrará un resumen con:
     - ✅ Ventas confirmadas: 4
     - ✅ Ventas canceladas con costo: 1
     - ✅ Total ventas: 5

---

### Paso 2: Usar la Ciudad de Prueba en la Aplicación

1. **Ve al menú "Ventas"** en localhost

2. **Selecciona la ciudad "PRUEBA"** (aparecerá al final de la lista de ciudades)

3. **Verás las 5 ventas de prueba:**
   - 4 ventas confirmadas/entregadas
   - 1 venta cancelada con costo

---

### Paso 3: Probar "Generar Depósito"

1. **En el menú "Ventas"**, con la ciudad "PRUEBA" seleccionada

2. **Haz clic en "Generar Depósito"** (botón naranja)

3. **Verás el modal "Confirmar Limpieza"** con:
   - Ventas confirmadas: 4
   - Ventas sintéticas: 0
   - Pedidos cancelados (con costo): 1
   - Total pedidos: 5

4. **Haz clic en "Generar Depósito"** para confirmar

5. **Las ventas desaparecerán del menú "Ventas"** y aparecerán en:
   - **"Generar Depósito"** (submenú de Historial)
   - **"Historial"** (siguen visibles ahí)

---

### Paso 4: Revertir el Depósito (Opcional)

Si quieres revertir el depósito y volver a probar:

1. **Ve a Supabase SQL Editor**

2. **Ejecuta** `scripts/revertir-deposito-prueba.sql`:
   - Primero ejecuta la consulta SELECT para ver los depósitos
   - Copia el ID del depósito de "PRUEBA"
   - Reemplaza `'DEPOSIT_ID_AQUI'` con el ID copiado
   - Ejecuta el bloque `DO $$`

3. **Verifica** que las ventas volvieron al menú "Ventas"

---

## 🗑️ Limpiar la Ciudad de Prueba (Opcional)

Si quieres eliminar todas las ventas de prueba:

```sql
-- Eliminar todas las ventas de la ciudad "PRUEBA"
DELETE FROM ventas WHERE ciudad = 'prueba';

-- Eliminar depósitos de prueba (si existen)
DELETE FROM generar_deposito WHERE ciudad = 'prueba';
```

---

## 📋 Resumen de la Ciudad de Prueba

- **Nombre en BD**: `prueba` (minúsculas, normalizado)
- **Nombre en UI**: `PRUEBA` (mayúsculas)
- **Ventas creadas**: 5 (4 confirmadas + 1 cancelada con costo)
- **Productos**: Usa productos reales de `almacen_central`
- **Vendedoras**: "Vendedora Prueba", "Vendedora Prueba 2", etc.
- **Celulares**: 71234567, 71234568, etc.

---

## 💡 Notas

- La ciudad "PRUEBA" aparece al final de la lista de ciudades
- Las ventas de prueba usan productos reales, así que el stock se descuenta correctamente
- Puedes crear más ventas de prueba manualmente desde "Registrar Venta" si lo necesitas
- La ciudad de prueba no afecta ninguna otra ciudad ni sus datos


