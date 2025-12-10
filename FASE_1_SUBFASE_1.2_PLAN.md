# 📋 FASE 1: SUBFASE 1.2 - Funciones Helper SQL

## 🎯 Objetivo

Crear funciones SQL para convertir SKUs a product_ids y filtrar cuentas por productos.

## 📝 Funciones Creadas

### 1. `get_product_ids_from_skus(p_skus TEXT[])`
**Propósito:** Convierte array de SKUs a array de product_ids (UUIDs)

**Ejemplo:**
```sql
SELECT get_product_ids_from_skus(ARRAY['CVP-60', 'FLEX-60']);
-- Retorna: [uuid1, uuid2]
```

### 2. `get_account_ids_by_user_skus(p_skus TEXT[])`
**Propósito:** Obtiene account_ids de cuentas activas cuyos productos tienen SKUs en el array

**Ejemplo:**
```sql
SELECT get_account_ids_by_user_skus(ARRAY['CVP-60', 'FLEX-60']);
-- Retorna: [account_uuid1, account_uuid2, ...]
```

### 3. `get_account_ids_without_product()`
**Propósito:** Obtiene account_ids de cuentas activas sin producto asignado

**Ejemplo:**
```sql
SELECT get_account_ids_without_product();
-- Retorna: [account_uuid1, account_uuid2, ...]
```

### 4. `get_account_ids_by_product_id(p_product_id UUID)`
**Propósito:** Obtiene account_ids de cuentas activas de un producto específico

**Ejemplo:**
```sql
SELECT get_account_ids_by_product_id('uuid-del-producto');
-- Retorna: [account_uuid1, account_uuid2, ...]
```

### 5. `get_account_ids_by_product_ids(p_product_ids UUID[])`
**Propósito:** Obtiene account_ids de cuentas activas de múltiples productos

**Ejemplo:**
```sql
SELECT get_account_ids_by_product_ids(ARRAY['uuid1', 'uuid2']);
-- Retorna: [account_uuid1, account_uuid2, ...]
```

## ✅ Testing

### Pasos para Probar:

1. **Ejecutar Migración:**
   - Abrir Supabase SQL Editor
   - Ejecutar `EJECUTAR_MIGRACION_011_FUNCIONES.sql`
   - Verificar que aparezcan mensajes de éxito

2. **Probar cada función:**

   **a) get_product_ids_from_skus:**
   ```sql
   -- Obtener SKUs de productos existentes primero
   SELECT sku FROM products LIMIT 2;
   -- Luego probar la función
   SELECT get_product_ids_from_skus(ARRAY['CVP-60', 'FLEX-60']);
   ```

   **b) get_account_ids_by_user_skus:**
   ```sql
   SELECT get_account_ids_by_user_skus(ARRAY['CVP-60']);
   ```

   **c) get_account_ids_without_product:**
   ```sql
   SELECT get_account_ids_without_product();
   ```

   **d) get_account_ids_by_product_id:**
   ```sql
   -- Obtener un product_id primero
   SELECT id FROM products LIMIT 1;
   -- Luego probar
   SELECT get_account_ids_by_product_id('uuid-del-producto');
   ```

   **e) get_account_ids_by_product_ids:**
   ```sql
   SELECT get_account_ids_by_product_ids(ARRAY['uuid1', 'uuid2']);
   ```

3. **Verificar Funciones:**
   ```sql
   SELECT proname, pg_get_function_arguments(oid), pg_get_function_result(oid)
   FROM pg_proc
   WHERE proname LIKE 'get_%product%' OR proname LIKE 'get_account%'
   ORDER BY proname;
   ```

## 📊 Resultado Esperado

- ✅ 5 funciones creadas correctamente
- ✅ Todas las funciones retornan arrays de UUIDs
- ✅ Funciones funcionan con datos reales
- ✅ Sin errores en ejecución

## 🚀 Siguiente Paso

Una vez completada esta subfase, proceder con **FASE 2: Backend - Servicios**
