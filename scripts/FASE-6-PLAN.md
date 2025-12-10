# 🟢 FASE 6: OPTIMIZACIONES DE PERFORMANCE

## 📋 Objetivo

Optimizar el rendimiento de la aplicación, especialmente:
1. Optimizar queries de depósitos (ya está usando chunks, pero puede mejorarse)
2. Batch updates en despachos (actualizar múltiples productos en una transacción)
3. Testing de performance

---

## 🔍 Problemas Identificados

### 6.1: Batch Updates en Edición de Despachos

**Ubicación:** `src/App.jsx:4309-4329`

**Problema:**
```javascript
// Actualiza stock uno por uno en un loop
for(const sku of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])){
  const prevQty = oldMap[sku] || 0;
  const nextQty = newMap[sku] || 0;
  if(prevQty === nextQty) continue;
  const diff = nextQty - prevQty;
  const meta = products.find(p=>p.sku===sku);
  if(!meta || meta.sintetico || !meta.id) continue;
  try { 
    const { error } = await supabase
      .from('almacen_central')
      .update({ stock: (meta.stock || 0) - diff })
      .eq('id', meta.id);
    // ...
  }
}
```

**Impacto:**
- Si hay 10 productos diferentes, se hacen 10 queries separadas
- Cada query tiene latencia de red
- No es atómico (si una falla, otras pueden haber sido aplicadas)

**Solución:**
- Crear función SQL que actualice múltiples productos en una transacción
- Usar `rpc()` para llamar la función con un array de actualizaciones

---

### 6.2: Optimizar Queries de Depósitos

**Ubicación:** `src/App.jsx:747-801`

**Estado Actual:**
- Ya está usando chunks de 1000 (bueno)
- Hace 2 queries separadas (por `deposit_id` y por `id`)
- Podría combinarse en una sola query con `OR`

**Mejora Propuesta:**
- Combinar ambas queries en una sola usando `OR` o múltiples condiciones
- O usar una función SQL que haga ambas búsquedas en una transacción

---

### 6.3: Re-renders Innecesarios

**Ubicación:** Múltiples `useEffect` en `src/App.jsx`

**Problema:**
- Algunos `useEffect` pueden ejecutarse más veces de las necesarias
- Falta de `useMemo` en cálculos costosos

**Solución:**
- Revisar dependencias de `useEffect`
- Agregar `useMemo` donde corresponda
- Optimizar cálculos derivados

---

## 📝 Subfases

### FASE 6.1: Optimizar queries de depósitos

**Tareas:**
1. Revisar queries actuales de depósitos
2. Combinar queries cuando sea posible
3. Verificar que los chunks están optimizados

**Archivos a modificar:**
- `src/App.jsx:747-801`

---

### FASE 6.2: Batch updates en despachos

**Tareas:**
1. Crear función SQL para actualizar múltiples productos en una transacción
2. Actualizar código JavaScript para usar la función SQL
3. Mantener rollback en caso de error

**Archivos a modificar:**
- Crear `scripts/fase-6-2-crear-funcion-sql-batch-update.sql`
- `src/App.jsx:4309-4329`

---

### FASE 6.3: Optimizar re-renders

**Tareas:**
1. Revisar `useEffect` con dependencias innecesarias
2. Agregar `useMemo` en cálculos costosos
3. Optimizar componentes que se re-renderizan frecuentemente

**Archivos a modificar:**
- `src/App.jsx`: Múltiples ubicaciones

---

### FASE 6.4: Testing de performance

**Tareas:**
1. Medir tiempo de ejecución antes y después
2. Verificar que las optimizaciones funcionan
3. Documentar mejoras de performance

---

## ✅ Checklist

- [ ] FASE 6.1: Optimizar queries de depósitos
- [ ] FASE 6.2: Batch updates en despachos
- [ ] FASE 6.3: Optimizar re-renders
- [ ] FASE 6.4: Testing de performance

---

## 🚀 Empezamos con FASE 6.1


