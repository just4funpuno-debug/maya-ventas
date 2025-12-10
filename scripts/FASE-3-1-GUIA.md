# 🔧 FASE 3.1: Crear Función SQL Transaccional para Edición

## Objetivo
Crear una función SQL transaccional que edite una venta pendiente y ajuste el stock de forma atómica (todo o nada).

---

## 🎯 Problema Actual

**Ubicación:** `src/supabaseUtils.js:313-367` - `editarVentaPendiente`

**Problema:**
```javascript
// 1. Restaura stock anterior
await restoreCityStock(...);
// 2. Descuenta stock nuevo
await discountCityStock(...);
// 3. Actualiza la venta
await supabase.from('ventas').update(...);
// Si esto falla, el stock queda inconsistente
```

**Impacto:** Si falla la actualización de la venta después de ajustar el stock, el stock queda inconsistente.

---

## ✅ Solución

Crear función SQL `editar_venta_pendiente_atomica` que:
1. Restaura stock anterior
2. Valida y descuenta stock nuevo
3. Actualiza la venta
4. Todo en una transacción atómica (si falla algo, todo se revierte)

---

## 📋 Pasos de Ejecución

### Paso 1: Crear la función SQL

1. Abre Supabase SQL Editor
2. Ejecuta: `scripts/fase-3-1-crear-funcion-sql-edicion.sql`
3. Verifica que aparezca: "✅ Función creada correctamente"

### Paso 2: Verificar en Supabase

Ejecuta este query para verificar que la función existe:

```sql
SELECT 
  proname as nombre_funcion,
  pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'editar_venta_pendiente_atomica';
```

**Resultado esperado:** 1 fila con la función

---

## ✅ Criterios de Éxito

- [ ] La función SQL fue creada correctamente
- [ ] No hay errores en Supabase SQL Editor
- [ ] La función tiene todos los parámetros necesarios

---

## 🎯 Siguiente Paso

Si la función fue creada correctamente, continúa con:
**FASE 3.2: Actualizar código JavaScript**

---

**¿La función fue creada correctamente? Ejecuta el script y comparte el resultado.**


