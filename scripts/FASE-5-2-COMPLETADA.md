# ✅ FASE 5.2 COMPLETADA: Mejorar Validación de Stock

## 📋 Resumen

**Estado:** ✅ COMPLETA  
**Fecha:** 2025-01-30  
**Objetivo:** Centralizar la validación de stock en una función común para eliminar duplicación entre `onAddSale` (Dashboard) y `addSale` (RegisterSaleView).

---

## ✅ Cambios Implementados

### 1. Creación de función común `validateStockForSale`

**Ubicación:** `src/utils/stockValidation.js` (nuevo archivo)

**Funcionalidad:**
- Valida stock principal (almacén central o ciudad)
- Valida stock extra si existe
- Maneja productos sintéticos
- Soporta dos tipos de validación:
  - `'central'`: Valida stock del almacén central (`almacen_central`)
  - `'city'`: Valida stock de la ciudad (`city_stock`)

**Estructura:**
```javascript
export async function validateStockForSale({
  product,
  cantidad,
  productExtra = null,
  cantidadExtra = null,
  ciudad = null,
  validationType = 'central', // 'central' | 'city'
  onError
})
```

**Funciones auxiliares:**
- `validateCentralStock()`: Valida stock del almacén central
- `validateCityStock()`: Valida stock de la ciudad

**Beneficios:**
- ✅ Código centralizado y reutilizable
- ✅ Manejo consistente de errores
- ✅ Mensajes de error uniformes
- ✅ Fácil mantenimiento y testing

---

### 2. Actualización de `onAddSale` (Dashboard)

**Ubicación:** `src/App.jsx:2316-2384`

**Antes:**
- ~70 líneas de código duplicado para validación de stock
- Validación de stock central manual
- Validación de stock extra manual
- Manejo de errores disperso

**Después:**
- ~20 líneas de código
- Usa `validateStockForSale` con `validationType: 'central'`
- Código más limpio y mantenible

**Código simplificado:**
```javascript
async function onAddSale(payload) {
  const { sku, cantidad, skuExtra, cantidadExtra } = payload;
  const product = products.find((p) => p.sku === sku);
  if (!product) { push({ type:'error', title:'Producto', message:'Producto no encontrado'}); return; }
  const esSintetico = !!product.sintetico;
  if (esSintetico && payload.cantidad !== 1) { payload.cantidad = 1; }
  
  // Obtener producto extra si existe
  const productExtra = skuExtra ? products.find(p => p.sku === skuExtra) : null;
  
  // Validar stock usando función común
  const validation = await validateStockForSale({
    product,
    cantidad,
    productExtra,
    cantidadExtra,
    validationType: 'central', // Dashboard valida stock central
    onError: push
  });
  
  if (!validation.valid) {
    return; // El error ya fue mostrado por onError
  }
  
  // Registrar venta...
}
```

**Reducción de código:** ~50 líneas eliminadas

---

### 3. Actualización de `addSale` (RegisterSaleView)

**Ubicación:** `src/App.jsx:6405-6516`

**Antes:**
- ~75 líneas de código duplicado para validación de stock
- Validación de stock ciudad manual
- Validación de stock extra manual
- Manejo de errores disperso
- Try-catch anidado

**Después:**
- ~30 líneas de código
- Usa `validateStockForSale` con `validationType: 'city'`
- Código más limpio y mantenible
- Mantiene lógica de actualización optimista y rollback

**Código simplificado:**
```javascript
async function addSale(payload){
  const product = products.find(p=>p.sku===payload.sku);
  if(!product) {
    push({ type:'error', title:'Producto', message:'Producto no encontrado' });
    return;
  }
  const esSintetico = !!product.sintetico;
  if(esSintetico && payload.cantidad !== 1){ payload.cantidad = 1; }
  
  // Obtener producto extra si existe
  const productExtra = payload.skuExtra ? products.find(p => p.sku === payload.skuExtra) : null;
  
  // Validar stock usando función común (validación de ciudad)
  if(payload.ciudad){
    const validation = await validateStockForSale({
      product,
      cantidad: payload.cantidad,
      productExtra,
      cantidadExtra: payload.cantidadExtra,
      ciudad: payload.ciudad,
      validationType: 'city', // RegisterSaleView valida stock de ciudad
      onError: push
    });
    
    if (!validation.valid) {
      return; // El error ya fue mostrado por onError
    }
  }
  
  // Registrar venta con actualización optimista...
}
```

**Reducción de código:** ~45 líneas eliminadas

---

## 📊 Resumen de Mejoras

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Líneas de código duplicadas** | ~145 líneas | 0 líneas | ✅ 100% eliminadas |
| **Funciones de validación** | 2 funciones duplicadas | 1 función común | ✅ Centralizado |
| **Mantenibilidad** | Baja (cambios en 2 lugares) | Alta (cambios en 1 lugar) | ✅ Mejorada |
| **Consistencia de errores** | Variable | Uniforme | ✅ Mejorada |
| **Testabilidad** | Difícil (código disperso) | Fácil (función aislada) | ✅ Mejorada |

---

## ✅ Beneficios Implementados

1. **Eliminación de Duplicación**: ~145 líneas de código duplicado eliminadas
2. **Centralización**: Toda la lógica de validación en un solo lugar
3. **Consistencia**: Mensajes de error uniformes en toda la aplicación
4. **Mantenibilidad**: Cambios futuros solo requieren modificar un archivo
5. **Testabilidad**: Función aislada fácil de testear
6. **Reutilización**: La función puede usarse en otros lugares si es necesario

---

## 🔍 Detalles Técnicos

### Validación de Stock Central

- Consulta `almacen_central` para obtener stock actualizado
- Maneja errores de red correctamente
- Usa stock local como fallback si hay error
- Valida que el stock sea suficiente

### Validación de Stock Ciudad

- Consulta `city_stock` para obtener stock de la ciudad
- Normaliza el nombre de la ciudad
- Maneja casos donde no existe registro
- Valida que el stock sea suficiente

### Manejo de Productos Sintéticos

- Los productos sintéticos no requieren validación de stock
- Se permite cualquier cantidad (aunque se ajusta a 1)

### Manejo de Productos Extra

- Valida stock del producto extra si existe
- Aplica las mismas reglas que el producto principal
- Maneja errores de forma independiente

---

## 📝 Próximos Pasos

- **FASE 5.3**: Centralizar normalización de ciudades
- **FASE 5.4**: Testing de validaciones

---

## 🔗 Referencias

- `src/utils/stockValidation.js`: Nueva función común
- `src/App.jsx:2316-2384`: `onAddSale` simplificado
- `src/App.jsx:6405-6516`: `addSale` simplificado


