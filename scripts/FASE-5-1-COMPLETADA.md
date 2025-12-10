# ✅ FASE 5.1 COMPLETADA: Reemplazar `.single()` por `.maybeSingle()`

## 📋 Resumen

**Estado:** ✅ COMPLETA  
**Fecha:** 2025-01-30  
**Objetivo:** Reemplazar `.single()` por `.maybeSingle()` en casos donde puede no haber resultados, para evitar errores cuando no se encuentran registros.

---

## ✅ Cambios Implementados

### 1. `transferToCity` - Buscar producto

**Ubicación:** `src/App.jsx:28-32`

**Antes:**
```javascript
const { data: product } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('sku', sku)
  .single();
```

**Después:**
```javascript
const { data: product, error: productError } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('sku', sku)
  .maybeSingle();

if (productError) {
  console.error('[transferToCity] Error obteniendo producto:', productError);
  return;
}

if (product) {
  // Actualizar stock
} else {
  console.warn('[transferToCity] Producto no encontrado:', sku);
}
```

**Beneficios:**
- ✅ No lanza error si el producto no existe
- ✅ Maneja errores de red correctamente
- ✅ Logging adecuado

---

### 2. `onAddSale` - Validar stock principal

**Ubicación:** `src/App.jsx:2315-2317`

**Antes:**
```javascript
const { data: productData, error: productError } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('id', product.id)
  .single();

if (productError || !productData) {
  console.warn('[confirmarEntrega] Error obteniendo stock del producto', productError);
  return;
}
```

**Después:**
```javascript
const { data: productData, error: productError } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('id', product.id)
  .maybeSingle();

if (productError) {
  console.warn('[onAddSale] Error obteniendo stock del producto', productError);
  return;
}

if (!productData) {
  console.warn('[onAddSale] Producto no encontrado:', product.id);
  return;
}
```

**Beneficios:**
- ✅ Maneja errores y casos sin resultados por separado
- ✅ Logging más específico

---

### 3. `onAddSale` - Validar stock extra

**Ubicación:** `src/App.jsx:2344-2348`

**Antes:**
```javascript
const { data: prod2Data } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('id', prod2.id)
  .single();
```

**Después:**
```javascript
const { data: prod2Data, error: prod2Error } = await supabase
  .from('almacen_central')
  .select('stock')
  .eq('id', prod2.id)
  .maybeSingle();

if (prod2Error) {
  console.warn('[onAddSale] Error obteniendo stock del producto extra', prod2Error);
} else if (prod2Data && typeof prod2Data.stock === 'number') {
  realStockExtra = prod2Data.stock;
}
```

**Beneficios:**
- ✅ Maneja errores correctamente
- ✅ No falla si el producto no existe

---

### 4. `addSale` - Validar stock ciudad

**Ubicación:** `src/App.jsx:6435-6440, 6456-6461`

**Antes:**
```javascript
const { data: cityStockData, error } = await supabase
  .from('city_stock')
  .select('sku, cantidad')
  .eq('ciudad', ciudadNormalizada)
  .eq('sku', payload.sku)
  .single();

if(!error && cityStockData){
  // Validar stock
} else {
  if(!esSintetico) return alert(`No existe registro de stock para la ciudad ${payload.ciudad}.`);
}
```

**Después:**
```javascript
const { data: cityStockData, error } = await supabase
  .from('city_stock')
  .select('sku, cantidad')
  .eq('ciudad', ciudadNormalizada)
  .eq('sku', payload.sku)
  .maybeSingle();

if (error) {
  console.error('[addSale] Error validando stock ciudad:', error);
  push({ type:'error', title:'Validación falló', message:'No se pudo validar stock ciudad. Intenta de nuevo.' }); 
  return;
}

if(cityStockData){
  // Validar stock
} else {
  if(!esSintetico) {
    push({ type:'error', title:'Sin registro de stock', message:`No existe registro de stock para la ciudad ${payload.ciudad}. Contacta al administrador.` }); 
    return;
  }
}
```

**Beneficios:**
- ✅ Maneja errores de red correctamente
- ✅ Notificaciones más claras al usuario
- ✅ No lanza error si no existe el registro

---

### 5. `editarVentaConfirmada` - Buscar por codigo_unico

**Ubicación:** `src/supabaseUtils.js:444-462`

**Antes:**
```javascript
const { data } = await supabase
  .from('ventas')
  .select('id')
  .eq('codigo_unico', codigoUnico)
  .single();
if (data) idPorCobrar = data.id;
```

**Después:**
```javascript
const { data, error: errorPorCobrar } = await supabase
  .from('ventas')
  .select('id')
  .eq('codigo_unico', codigoUnico)
  .maybeSingle();
if (errorPorCobrar) {
  console.warn('[editarVentaConfirmada] Error buscando venta por cobrar:', errorPorCobrar);
} else if (data) {
  idPorCobrar = data.id;
}
```

**Beneficios:**
- ✅ No lanza error si no existe la venta
- ✅ Maneja errores de red correctamente
- ✅ Logging adecuado

---

### 6. `cancelarVentaConfirmada` - Buscar venta

**Ubicación:** `src/supabaseUtils.js:580-584`

**Antes:**
```javascript
const { data: saleData } = await supabase
  .from('ventas')
  .select('*')
  .eq('id', idHistorico)
  .single();

const precioNum = Number(saleData?.precio ?? venta.precio) || 0;
```

**Después:**
```javascript
const { data: saleData, error: saleDataError } = await supabase
  .from('ventas')
  .select('*')
  .eq('id', idHistorico)
  .maybeSingle();

if (saleDataError) {
  console.error('[cancelarVentaConfirmada] Error obteniendo datos de venta:', saleDataError);
  throw new Error('No se pudo obtener los datos de la venta para cancelar');
}

if (!saleData) {
  console.warn('[cancelarVentaConfirmada] Venta no encontrada:', idHistorico);
  throw new Error('Venta no encontrada');
}

const precioNum = Number(saleData?.precio ?? venta.precio) || 0;
```

**Beneficios:**
- ✅ Maneja errores correctamente
- ✅ Lanza error descriptivo si no existe la venta
- ✅ Previene errores de null reference

---

### 7. `loginUser` - Buscar usuario

**Ubicación:** `src/App.jsx:1625-1656`

**Antes:**
```javascript
const { data: userByAuthId } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', authUser.uid)
  .single();
```

**Después:**
```javascript
const { data: userByAuthId, error: errorByAuthId } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', authUser.uid)
  .maybeSingle();

if (errorByAuthId) {
  console.warn('[loginUser] Error buscando usuario por auth_id:', errorByAuthId);
} else if (userByAuthId) {
  userData = userByAuthId;
}
```

**Beneficios:**
- ✅ No falla si el usuario no existe en la tabla users
- ✅ Maneja errores de red correctamente
- ✅ Permite múltiples intentos de búsqueda

---

### 8. `confirmDispatch` - Buscar despacho

**Ubicación:** `src/supabaseUtils-dispatch.js:29-34`

**Antes:**
```javascript
const { data: existingDispatch, error: fetchError } = await supabase
  .from('dispatches')
  .select('*')
  .eq('id', dispatch.id)
  .eq('status', 'pendiente')
  .single();

if (fetchError || !existingDispatch) {
  throw new Error('Despacho no encontrado o ya confirmado');
}
```

**Después:**
```javascript
const { data: existingDispatch, error: fetchError } = await supabase
  .from('dispatches')
  .select('*')
  .eq('id', dispatch.id)
  .eq('status', 'pendiente')
  .maybeSingle();

if (fetchError) {
  throw new Error(`Error al buscar despacho: ${fetchError.message}`);
}

if (!existingDispatch) {
  throw new Error('Despacho no encontrado o ya confirmado');
}
```

**Beneficios:**
- ✅ Distingue entre error de red y despacho no encontrado
- ✅ Mensajes de error más descriptivos

---

### 9. `registerUser` - Verificar usuario existente

**Ubicación:** `src/supabaseAuthUtils.js:48-52`

**Antes:**
```javascript
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('id', userId)
  .single();

if (!existingUser) {
  // Crear usuario
}
```

**Después:**
```javascript
const { data: existingUser, error: existingUserError } = await supabase
  .from('users')
  .select('id')
  .eq('id', userId)
  .maybeSingle();

if (existingUserError) {
  console.warn('[registerUser] Error verificando usuario existente:', existingUserError);
}

if (!existingUser) {
  // Crear usuario
}
```

**Beneficios:**
- ✅ No falla si el usuario no existe
- ✅ Maneja errores de red correctamente

---

### 10. Múltiples búsquedas por `codigo_unico` en `supabaseUtils.js`

**Ubicaciones:**
- `src/supabaseUtils.js:715-723` - `crearSnapshotDeposito`
- `src/supabaseUtils.js:930-938` - `eliminarDeposito`
- `src/supabaseUtils.js:1010-1017` - `sincronizarEdicionDepositoHistorico`
- `src/supabaseUtils.js:1092-1099` - `sincronizarEdicionDepositoHistoricoV2`

**Cambio:** Todos reemplazados de `.single()` a `.maybeSingle()` con manejo de errores adecuado.

**Beneficios:**
- ✅ No lanzan error si no existe la venta
- ✅ Manejan errores de red correctamente
- ✅ Logging adecuado

---

## 📊 Resumen de Cambios

| Ubicación | Función | Cambio | Estado |
|-----------|---------|--------|--------|
| `App.jsx:28-32` | `transferToCity` | `.single()` → `.maybeSingle()` | ✅ |
| `App.jsx:2315-2317` | `onAddSale` | `.single()` → `.maybeSingle()` | ✅ |
| `App.jsx:2344-2348` | `onAddSale` (extra) | `.single()` → `.maybeSingle()` | ✅ |
| `App.jsx:6435-6440` | `addSale` | `.single()` → `.maybeSingle()` | ✅ |
| `App.jsx:6456-6461` | `addSale` (extra) | `.single()` → `.maybeSingle()` | ✅ |
| `App.jsx:1625-1656` | `loginUser` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:444-462` | `editarVentaConfirmada` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:580-584` | `cancelarVentaConfirmada` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:715-723` | `crearSnapshotDeposito` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:930-938` | `eliminarDeposito` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:1010-1017` | `sincronizarEdicionDepositoHistorico` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils.js:1092-1099` | `sincronizarEdicionDepositoHistoricoV2` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseUtils-dispatch.js:29-34` | `confirmDispatch` | `.single()` → `.maybeSingle()` | ✅ |
| `supabaseAuthUtils.js:48-52` | `registerUser` | `.single()` → `.maybeSingle()` | ✅ |

---

## ✅ Beneficios Implementados

1. **Prevención de Errores**: No se lanzan errores cuando no hay resultados
2. **Manejo de Errores Mejorado**: Distingue entre errores de red y casos sin resultados
3. **Logging Adecuado**: Los errores se registran correctamente
4. **Experiencia de Usuario**: Mensajes de error más claros y descriptivos
5. **Robustez**: El código maneja casos edge correctamente

---

## 📝 Próximos Pasos

- **FASE 5.2**: Mejorar validación de stock
- **FASE 5.3**: Centralizar normalización de ciudades
- **FASE 5.4**: Testing de validaciones

---

## 🔗 Referencias

- `src/App.jsx`: Múltiples ubicaciones
- `src/supabaseUtils.js`: Múltiples ubicaciones
- `src/supabaseUtils-dispatch.js:29-34`
- `src/supabaseAuthUtils.js:48-52`


