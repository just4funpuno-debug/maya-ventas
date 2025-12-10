# 🚀 EJECUTAR FASE 1.1: Crear Función SQL Transaccional

## Objetivo
Crear una función SQL en Supabase que registre ventas pendientes y descuente stock de forma **atómica** (todo o nada).

---

## 📋 PASOS

### 1. Ejecutar Script SQL

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo: `scripts/fase-1-1-crear-funcion-sql-transaccional.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **RUN** (o presiona `Ctrl+Enter`)

### 2. Verificar Creación

Deberías ver un resultado como:
```
estado              | funcion_creada                          | argumentos
--------------------|------------------------------------------|-----------
FASE 1.1 COMPLETA  | registrar_venta_pendiente_atomica        | ...
```

### 3. Ejecutar Tests

1. Abre el archivo: `scripts/test-fase-1-1.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor
4. Ejecuta

### 4. Verificar Resultados de Tests

Deberías ver mensajes como:
- ✅ TEST 1 PASADO: Función existe
- ✅ TEST 2 PASADO: Normalización correcta
- ✅ TEST 3 PASADO: Rechaza parámetros inválidos
- ✅ TEST 4 PASADO: Rechaza stock insuficiente
- ✅ TEST 5 PASADO: Transacción atómica

---

## ⚠️ SI ALGÚN TEST FALLA

1. **No continúes** a la siguiente subfase
2. Revisa los mensajes de error
3. Verifica que la función se creó correctamente:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'registrar_venta_pendiente_atomica';
   ```
4. Si hay errores, compártelos para corregirlos

---

## ✅ CRITERIOS DE ÉXITO

- [ ] La función `registrar_venta_pendiente_atomica` existe
- [ ] La función `normalize_city` existe
- [ ] Todos los tests pasan
- [ ] No hay errores en la consola de Supabase

---

## 🎯 SIGUIENTE PASO

Una vez que todos los tests pasen, continúa con:
**FASE 1.2: Actualizar código JavaScript**

---

**¿Listo para continuar? Ejecuta los scripts y comparte los resultados.**


