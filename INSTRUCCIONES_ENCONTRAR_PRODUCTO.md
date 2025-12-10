# 🔍 Instrucciones: Encontrar Producto Cardio Vascular

## 📋 Situación Actual

El script `OBTENER_ID_CVP60.sql` no encontró el producto con SKU `CVP-60` en `almacen_central`.

---

## 🔧 Solución

### Paso 1: Listar Productos Disponibles

Ejecuta el script `scripts/LISTAR_PRODUCTOS_DISPONIBLES.sql` para ver:
- Todos los productos disponibles
- Productos que contengan "cardio" o "vascular" en el nombre

### Paso 2: Identificar el Producto Correcto

Una vez que veas la lista, identifica:
- El **SKU real** del producto Cardio Vascular
- El **ID (UUID)** del producto
- El **nombre exacto** del producto

### Paso 3: Actualizar Scripts

Una vez identificado el producto, necesitaremos:
1. Actualizar `OBTENER_ID_CVP60.sql` con el SKU correcto
2. Actualizar los scripts de migración con el ID correcto

---

## 💡 Posibles SKUs

El producto podría tener un SKU diferente, por ejemplo:
- `CVP-60`
- `CVP60`
- `CARDIO-60`
- `CARDIO60`
- Otro formato

---

**Ejecuta `LISTAR_PRODUCTOS_DISPONIBLES.sql` y comparte los resultados para continuar.**

