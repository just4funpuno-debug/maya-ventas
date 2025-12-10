# 📦 Flujo Detallado: Menú "Despacho de Productos"

## 📋 Índice
1. [Vista General](#vista-general)
2. [Componentes Principales](#componentes-principales)
3. [Flujo: Crear Despacho](#flujo-crear-despacho)
4. [Flujo: Editar Despacho Pendiente](#flujo-editar-despacho-pendiente)
5. [Flujo: Confirmar Despacho](#flujo-confirmar-despacho)
6. [Flujo: Eliminar Despacho](#flujo-eliminar-despacho)
7. [Gestión de Stock](#gestión-de-stock)
8. [Visualización de Stock por Ciudad](#visualización-de-stock-por-ciudad)

---

## 🎯 Vista General

El menú "Despacho de Productos" permite:
- **Transferir productos** del almacén central a ciudades
- **Gestionar despachos** pendientes y confirmados
- **Visualizar stock** por ciudad en tiempo real
- **Historial** de despachos confirmados

### Estados de un Despacho
- **`pendiente`**: Despacho creado pero no confirmado (stock descontado del central, NO sumado a ciudad)
- **`confirmado`**: Despacho confirmado (stock sumado a ciudad, permanece descontado del central)

---

## 🧩 Componentes Principales

### 1. **Barra de Ciudades**
- 8 ciudades: EL ALTO, LA PAZ, ORURO, SUCRE, POTOSI, TARIJA, COCHABAMBA, SANTA CRUZ
- Selección de ciudad para visualizar stock

### 2. **AlmacenCityStock Component**
- Muestra stock actual por ciudad en tiempo real
- Colores según nivel de stock:
  - 🔴 **Rojo**: < 6 unidades (Bajo)
  - 🟡 **Ámbar**: 6-11 unidades (Medio)
  - 🟢 **Verde**: ≥ 12 unidades (Alto)

### 3. **Formulario de Despacho**
- Fecha del despacho
- Lista de productos con cantidades
- Botón "Despachar" o "Actualizar"

### 4. **Tabla de Stock Central**
- Muestra stock actual de cada producto en almacén central
- Alerta visual si stock ≤ 5 (texto rojo)

### 5. **Tabla de Despachos Pendientes**
- Despachos con status `pendiente`
- Acciones: Confirmar, Editar, Eliminar

### 6. **Historial de Despachos Confirmados**
- Despachos con status `confirmado`
- Filtros: Ciudad, Fecha desde/hasta
- Paginación (20 por página)

---

## 📝 Flujo: Crear Despacho

### Paso 1: Seleccionar Ciudad
```
Usuario selecciona ciudad → setSelectedCity(ciudad)
→ Actualiza visualización de stock por ciudad
```

### Paso 2: Ingresar Cantidades
```
Usuario ingresa cantidades en formulario
→ setCantidad(sku, cantidad)
→ Actualiza lineItems state
```

### Paso 3: Validación
```javascript
// Validaciones antes de crear:
1. ¿Hay items con cantidad > 0? → Si no: alert('Ingresa cantidades')
2. ¿Stock suficiente en almacén central?
   → Para cada item:
     - Buscar producto en products
     - Verificar: prod.stock >= it.cantidad
     - Si no: alert('Stock insuficiente para ' + sku)
```

### Paso 4: Crear Despacho (submit)
```javascript
// 1. ACTUALIZACIÓN OPTIMISTA (UI inmediata)
setProducts(prev => prev.map(p => {
  const it = items.find(i => i.sku === p.sku);
  return it ? { ...p, stock: p.stock - Number(it.cantidad) } : p;
}));

// 2. DESCONTAR STOCK EN SUPABASE (almacen_central)
for (const it of items) {
  const meta = products.find(p => p.sku === it.sku);
  if (!meta || meta.sintetico || !meta.id) continue;
  
  await supabase
    .from('almacen_central')
    .update({ stock: (meta.stock || 0) - Number(it.cantidad) })
    .eq('id', meta.id);
}

// 3. CREAR REGISTRO EN SUPABASE (dispatches)
const ciudadNormalizada = ciudad.toLowerCase().trim().replace(/\s+/g, '_');
await supabase
  .from('dispatches')
  .insert({
    fecha,
    ciudad: ciudadNormalizada,
    items: items, // Array de {sku, cantidad}
    status: 'pendiente'
  });

// 4. LIMPIAR FORMULARIO
setLineItems(lineItems.map(l => ({...l, cantidad: 0})));
```

### Resultado
- ✅ Stock descontado de `almacen_central`
- ✅ Despacho creado con status `pendiente`
- ❌ Stock NO sumado a `city_stock` (solo cuando se confirma)

---

## ✏️ Flujo: Editar Despacho Pendiente

### Paso 1: Iniciar Edición
```javascript
startEdit(d) {
  setEditId(d.id);
  setFecha(d.fecha);
  setCiudad(d.ciudad);
  // Cargar cantidades del despacho
  setLineItems(prev => prev.map(li => {
    const found = d.items.find(it => it.sku === li.sku);
    return { ...li, cantidad: found ? found.cantidad : 0 };
  }));
}
```

### Paso 2: Modificar Cantidades
- Usuario modifica cantidades en formulario
- Validación: ¿Stock suficiente para incrementos?

### Paso 3: Calcular Diferencias
```javascript
// Mapas de cantidades
oldMap = { sku: cantidad_anterior }
newMap = { sku: cantidad_nueva }

// Para cada SKU:
diff = newMap[sku] - oldMap[sku]
// > 0: necesita más stock (validar disponibilidad)
// < 0: devuelve stock al central
```

### Paso 4: Actualizar Stock
```javascript
// ACTUALIZACIÓN OPTIMISTA
setProducts(prev => prev.map(p => {
  const prevQty = oldMap[p.sku] || 0;
  const nextQty = newMap[p.sku] || 0;
  const diff = nextQty - prevQty;
  return { ...p, stock: p.stock - diff };
}));

// ACTUALIZAR EN SUPABASE
for (const sku of SKUs_con_cambio) {
  const diff = newMap[sku] - oldMap[sku];
  await supabase
    .from('almacen_central')
    .update({ stock: (meta.stock || 0) - diff })
    .eq('id', meta.id);
}
```

### Paso 5: Actualizar Despacho
```javascript
await supabase
  .from('dispatches')
  .update({ 
    fecha, 
    ciudad: ciudadNormalizada, 
    items: newItems 
  })
  .eq('id', editId);
```

### Resultado
- ✅ Stock ajustado en `almacen_central` según diferencias
- ✅ Despacho actualizado en `dispatches`
- ❌ Stock en `city_stock` NO cambia (solo se actualiza al confirmar)

---

## ✅ Flujo: Confirmar Despacho

### Paso 1: Validación
```javascript
confirmDispatch(d) {
  // Validaciones:
  - ¿Despacho existe? → Si no: return
  - ¿Status es 'pendiente'? → Si no: return
  - ¿Ya hay confirmación en curso? → Si no: return
}
```

### Paso 2: Actualización Optimista
```javascript
// UI inmediata (antes de confirmar en backend)
setDispatches(prev => prev.map(x => 
  x.id === d.id 
    ? { ...x, status: 'confirmado', confirmadoAt: Date.now() }
    : x
));
```

### Paso 3: Confirmar en Supabase
```javascript
// Llamar a confirmDispatchSupabase (supabaseUtils-dispatch.js)
const result = await confirmDispatchSupabase(d);

// Internamente hace:
// 1. Verificar que despacho existe y está pendiente
// 2. Para cada item del despacho:
await restoreCityStock(ciudadNormalizada, item.sku, item.cantidad);
//    → Suma stock a city_stock

// 3. Actualizar despacho a confirmado
await supabase
  .from('dispatches')
  .update({
    status: 'confirmado',
    confirmed_at: new Date().toISOString()
  })
  .eq('id', dispatch.id);
```

### Paso 4: Manejo de Errores
```javascript
// Si falla, revertir actualización optimista
if (!result.success) {
  setDispatches(prev => prev.map(x => 
    x.id === d.id 
      ? { ...x, status: 'pendiente', confirmadoAt: undefined }
      : x
  ));
}
```

### Resultado
- ✅ Stock sumado a `city_stock` de la ciudad
- ✅ Despacho actualizado a status `confirmado`
- ✅ Stock en `almacen_central` permanece descontado (correcto)

---

## 🗑️ Flujo: Eliminar Despacho

### Paso 1: Confirmación
```javascript
handleDeleteDispatch(d) {
  setConfirmDelete(d); // Muestra modal de confirmación
}
```

### Paso 2: Restaurar Stock
```javascript
confirmDeleteDispatch() {
  // 1. ACTUALIZACIÓN OPTIMISTA (devolver stock al central)
  setProducts(prev => prev.map(p => {
    const it = confirmDelete.items.find(i => i.sku === p.sku);
    return it ? { ...p, stock: p.stock + Number(it.cantidad) } : p;
  }));

  // 2. RESTAURAR STOCK EN SUPABASE
  for (const it of confirmDelete.items) {
    const meta = products.find(p => p.sku === it.sku);
    if (!meta || meta.sintetico || !meta.id) continue;
    
    await supabase
      .from('almacen_central')
      .update({ stock: (meta.stock || 0) + Number(it.cantidad) })
      .eq('id', meta.id);
  }

  // 3. ELIMINAR DESPACHO DE SUPABASE
  await supabase
    .from('dispatches')
    .delete()
    .eq('id', confirmDelete.id);
}
```

### Resultado
- ✅ Stock restaurado en `almacen_central`
- ✅ Despacho eliminado de `dispatches`
- ⚠️ Si el despacho estaba confirmado, el stock en `city_stock` NO se resta (debe hacerse manualmente si es necesario)

---

## 📊 Gestión de Stock

### Dos Niveles de Stock

#### 1. **almacen_central** (Stock Central)
- **Ubicación**: Tabla `almacen_central`
- **Propósito**: Stock disponible en el almacén central
- **Se descuenta**: Al crear despacho pendiente
- **Se restaura**: Al eliminar despacho pendiente
- **Se ajusta**: Al editar despacho pendiente (según diferencias)

#### 2. **city_stock** (Stock por Ciudad)
- **Ubicación**: Tabla `city_stock`
- **Propósito**: Stock disponible en cada ciudad
- **Se suma**: Al confirmar despacho
- **Se descuenta**: Al registrar venta en la ciudad
- **NO se modifica**: Al crear/editar/eliminar despacho pendiente

### Flujo de Stock Completo

```
┌─────────────────┐
│ almacen_central │
│   (Stock: 100)   │
└────────┬────────┘
         │
         │ Crear Despacho Pendiente
         │ (Descuenta: -20)
         ▼
┌─────────────────┐
│ almacen_central │
│   (Stock: 80)   │
└────────┬────────┘
         │
         │ Confirmar Despacho
         │ (Suma a ciudad: +20)
         ▼
┌─────────────────┐     ┌──────────────┐
│ almacen_central │     │  city_stock  │
│   (Stock: 80)   │     │  (Stock: 20) │
└─────────────────┘     └──────────────┘
```

### Reglas Importantes

1. **Despacho Pendiente**:
   - ✅ Descuenta de `almacen_central`
   - ❌ NO suma a `city_stock`
   - 💡 Razón: El stock está "en tránsito", no ha llegado a la ciudad

2. **Despacho Confirmado**:
   - ✅ Suma a `city_stock`
   - ✅ Mantiene descuento en `almacen_central`
   - 💡 Razón: El stock llegó a la ciudad, está disponible para ventas

3. **Eliminar Despacho Pendiente**:
   - ✅ Restaura stock en `almacen_central`
   - ❌ NO afecta `city_stock` (nunca se sumó)

4. **Eliminar Despacho Confirmado**:
   - ⚠️ NO restaura automáticamente
   - ⚠️ Requiere ajuste manual si es necesario

---

## 👁️ Visualización de Stock por Ciudad

### Componente: AlmacenCityStock

```javascript
// Suscripción en tiempo real
subscribeCityStock(city, (data) => {
  // data = { sku: cantidad, ... }
  setCityStock(data);
});

// Renderizado
- Filtra productos no sintéticos
- Ordena por stock (ascendente) y luego alfabéticamente
- Muestra tarjetas con:
  - Nombre del producto
  - Stock actual
  - Color según nivel (Rojo/Ámbar/Verde)
```

### Actualización en Tiempo Real

1. **Al confirmar despacho**:
   - `restoreCityStock()` actualiza `city_stock`
   - Supabase Realtime notifica el cambio
   - `subscribeCityStock` recibe actualización
   - Componente se re-renderiza automáticamente

2. **Al registrar venta**:
   - `discountCityStock()` actualiza `city_stock`
   - Mismo flujo de actualización en tiempo real

---

## 🔄 Resumen del Flujo Completo

### Escenario: Despachar 20 unidades de Producto A a EL ALTO

```
1. CREAR DESPACHO PENDIENTE
   ├─ almacen_central: 100 → 80 (-20)
   ├─ city_stock: 0 → 0 (sin cambio)
   └─ dispatches: Nuevo registro (status: 'pendiente')

2. CONFIRMAR DESPACHO
   ├─ almacen_central: 80 → 80 (sin cambio)
   ├─ city_stock: 0 → 20 (+20)
   └─ dispatches: Actualizado (status: 'confirmado')

3. REGISTRAR VENTA EN CIUDAD
   ├─ city_stock: 20 → 15 (-5)
   └─ sales: Nuevo registro
```

---

## 📌 Notas Importantes

### Validaciones
- ✅ Stock suficiente antes de crear despacho
- ✅ Stock suficiente antes de incrementar en edición
- ✅ No editar despachos confirmados
- ✅ Confirmación antes de eliminar

### Optimistic Updates
- ✅ UI se actualiza inmediatamente
- ✅ Reversión automática si falla operación
- ✅ Mejor experiencia de usuario

### Normalización de Ciudades
- **UI**: "EL ALTO" (mayúsculas, espacios)
- **Base de datos**: "el_alto" (minúsculas, guiones bajos)
- **Conversión automática** en todas las operaciones

---

## 🎯 Casos de Uso Comunes

### 1. Despachar productos a una ciudad
```
Seleccionar ciudad → Ingresar cantidades → Despachar → Confirmar
```

### 2. Corregir cantidad de despacho pendiente
```
Editar despacho → Modificar cantidades → Actualizar
```

### 3. Cancelar despacho pendiente
```
Eliminar despacho → Confirmar → Stock restaurado
```

### 4. Ver stock disponible por ciudad
```
Seleccionar ciudad → Ver tarjetas de stock en tiempo real
```

---

*Última actualización: 29 de noviembre de 2025*


