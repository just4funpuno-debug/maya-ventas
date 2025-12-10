# 🧪 Guía: Prueba Completa del Flujo en Ciudad "PRUEBA"

## 📋 Objetivo

Probar todo el flujo completo desde el stock en ciudad hasta "Generar Depósito", incluyendo:
- ✅ Stock en `city_stock`
- ✅ Ventas normales con productos reales (ganancia)
- ✅ Ventas con productos sintéticos
- ✅ Ventas canceladas con costo (pérdida)
- ✅ Ventas con producto extra
- ✅ Ventas entregadas y confirmadas

---

## 🚀 Paso 1: Ejecutar el Script SQL

1. **Ve a Supabase SQL Editor**

2. **Ejecuta el script** `scripts/prueba-completa-flujo-prueba.sql`

3. **Verifica el resultado:**
   - Deberías ver mensajes de:
     - ✅ Stock creado: 3 productos
     - ✅ Ventas creadas: 7 (o 6 si no hay productos sintéticos)
   - Al final verás dos tablas:
     - Stock en `city_stock`
     - Ventas creadas con su tipo

---

## 📊 Paso 2: Verificar Stock en "Despacho de Productos"

1. **Ve al menú "Despacho de Productos"** en localhost

2. **Selecciona la ciudad "PRUEBA"**

3. **Verifica que aparezca el stock:**
   - Producto 1: 50 unidades
   - Producto 2: 30 unidades
   - Producto 3: 20 unidades

---

## 💰 Paso 3: Verificar Ventas en "Ventas"

1. **Ve al menú "Ventas"** en localhost

2. **Selecciona la ciudad "PRUEBA"**

3. **Verifica que aparezcan todas las ventas:**
   - **Venta 1**: Normal confirmada (Bs 130,00 neto)
   - **Venta 2**: Normal entregada con producto extra (Bs 175,00 neto)
   - **Venta 3**: Con producto sintético (Bs -15,00 neto) - si existe producto sintético
   - **Venta 4**: Cancelada con costo (Bs -30,00 neto) - debe aparecer en rojo
   - **Venta 5**: Normal entregada (Bs 105,00 neto)
   - **Venta 6**: Normal confirmada (Bs 160,00 neto)
   - **Venta 7**: Cancelada con costo mayor (Bs -50,00 neto) - debe aparecer en rojo

4. **Verifica el resumen:**
   - Ventas confirmadas: 4 (o 3 si no hay sintético)
   - Ventas sintéticas: 1 (si existe producto sintético)
   - Pedidos cancelados (con costo): 2
   - Total pedidos: 7 (o 6 si no hay sintético)

---

## 🏦 Paso 4: Generar Depósito

1. **En el menú "Ventas"**, con "PRUEBA" seleccionada

2. **Haz clic en "Generar Depósito"** (botón naranja)

3. **Verifica el modal "Confirmar Limpieza":**
   - Ventas confirmadas: 4 (o 3 si no hay sintético)
   - Ventas sintéticas: 1 (si existe producto sintético)
   - Pedidos cancelados (con costo): 2
   - Total pedidos: 7 (o 6 si no hay sintético)
   - **Total neto**: Debe ser la suma de todos los totales (incluyendo negativos)

4. **Haz clic en "Generar Depósito"** para confirmar

5. **Verifica que:**
   - Las ventas desaparecen del menú "Ventas"
   - Aparece un mensaje de éxito (si hay)

---

## 📦 Paso 5: Verificar en "Generar Depósito"

1. **Ve al menú "Generar Depósito"** (submenú de Historial)

2. **Selecciona la ciudad "PRUEBA"** (botón al inicio)

3. **Verifica la tabla:**
   - **Todas las ventas deben aparecer**
   - **Ventas normales**: Total positivo (negro/naranja)
   - **Ventas canceladas con costo**: Total negativo en **rojo** (Bs -30,00 y Bs -50,00)
   - **Venta con producto sintético**: Total negativo en rojo (Bs -15,00) - si existe

4. **Verifica los totales al final de la tabla:**
   - Debe sumar correctamente incluyendo los negativos
   - Ejemplo: Si hay 4 ventas normales (130+175+105+160 = 570) y 2 canceladas (-30-50 = -80) y 1 sintética (-15), el total neto debería ser: 570 - 80 - 15 = **475**

5. **Verifica que los datos estén completos:**
   - Fecha: Todas con fecha de hoy
   - Hora: 10:00 AM, 11:30 AM, 2:00 PM, 3:00 PM, 4:30 PM, 5:00 PM, 6:00 PM
   - Usuario: Vendedora Prueba 1, 2, 3, 4, 5, 6, 7
   - Celular: 71234567, 71234568, etc.
   - Precio: Valores correctos
   - Delivery: Valores correctos (gasto o gasto_cancelacion)
   - Total: Valores correctos (positivos para normales, negativos para canceladas)

---

## ✅ Checklist de Verificación

- [ ] Stock aparece en "Despacho de Productos" para ciudad "PRUEBA"
- [ ] Todas las ventas aparecen en "Ventas" para ciudad "PRUEBA"
- [ ] Ventas canceladas aparecen con total negativo (rojo) en "Ventas"
- [ ] El resumen en "Ventas" muestra correctamente:
  - Ventas confirmadas
  - Ventas sintéticas (si aplica)
  - Canceladas con costo
  - Total pedidos
- [ ] "Generar Depósito" funciona sin errores
- [ ] Las ventas desaparecen de "Ventas" después de generar depósito
- [ ] Las ventas aparecen en "Generar Depósito" con todos los datos
- [ ] Ventas canceladas muestran total negativo en rojo en "Generar Depósito"
- [ ] Los totales al final de la tabla en "Generar Depósito" son correctos
- [ ] Las ventas siguen apareciendo en "Historial"

---

## 🔄 Limpiar Datos de Prueba (Opcional)

Si quieres empezar de nuevo, ejecuta:

```sql
-- Eliminar ventas de prueba
DELETE FROM ventas WHERE ciudad = 'prueba';

-- Eliminar depósitos de prueba
DELETE FROM generar_deposito WHERE ciudad = 'prueba';

-- Eliminar stock de prueba
DELETE FROM city_stock WHERE ciudad = 'prueba';
```

---

## 📝 Notas

- El script es **idempotente**: puedes ejecutarlo varias veces sin problemas
- El stock se **suma** si ya existe (no se reemplaza)
- Las ventas se crean con `estado_pago: 'pendiente'` para que aparezcan en "Ventas"
- Las ventas canceladas tienen `gasto_cancelacion > 0` para que se consideren "con costo"
- El total de ventas canceladas debe ser **negativo** = `-gasto_cancelacion`

