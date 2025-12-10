# 🔧 FASE 2.1: Crear Funciones SQL Atómicas para Stock

## Objetivo
Crear funciones SQL atómicas para `discountCityStock` y `restoreCityStock` que eliminen race conditions.

---

## 🎯 Problema Actual

Las funciones `discountCityStock` y `restoreCityStock` tienen race conditions porque:

1. **Leen el stock actual** (SELECT)
2. **Calculan la nueva cantidad** (en JavaScript)
3. **Actualizan el stock** (UPDATE)

**Problema:** Entre el paso 1 y 3, otro proceso puede haber cambiado el stock, causando inconsistencias.

---

## ✅ Solución

Crear funciones SQL atómicas que hagan todo en una sola operación:

1. **`descontar_stock_ciudad_atomico(ciudad, sku, cantidad)`**
   - Descuenta stock de forma atómica
   - Usa optimistic locking para detectar race conditions
   - Retorna el nuevo stock

2. **`restaurar_stock_ciudad_atomico(ciudad, sku, cantidad)`**
   - Suma stock de forma atómica
   - Usa `INSERT ... ON CONFLICT DO UPDATE` para garantizar atomicidad
   - Retorna el nuevo stock

---

## 📋 Pasos de Ejecución

### Paso 1: Crear las funciones SQL

1. Abre Supabase SQL Editor
2. Ejecuta: `scripts/fase-2-1-crear-funciones-sql-stock.sql`
3. Verifica que aparezca: "✅ Funciones creadas correctamente"

### Paso 2: Ejecutar tests

1. Ejecuta: `scripts/test-fase-2-1.sql`
2. Verifica que todos los tests pasen:
   - ✅ TEST 1: Funciones existen
   - ✅ TEST 2: Descontar funciona
   - ✅ TEST 3: Restaurar funciona
   - ✅ TEST 4: Crear registro si no existe
   - ✅ TEST 5: No permite stock negativo

### Paso 3: Verificar en Supabase

Ejecuta este query para verificar que las funciones existen:

```sql
SELECT 
  proname as nombre_funcion,
  pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname IN ('descontar_stock_ciudad_atomico', 'restaurar_stock_ciudad_atomico')
ORDER BY proname;
```

**Resultado esperado:** 2 filas (una por cada función)

---

## ✅ Criterios de Éxito

- [ ] Las funciones SQL fueron creadas correctamente
- [ ] Todos los tests pasan (5/5)
- [ ] Las funciones retornan el stock actualizado
- [ ] No hay errores en Supabase SQL Editor

---

## 🎯 Siguiente Paso

Si todos los tests pasan, continúa con:
**FASE 2.2: Actualizar código JavaScript**

---

**¿Las funciones fueron creadas correctamente? Ejecuta los tests y comparte los resultados.**

