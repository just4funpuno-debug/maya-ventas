# Análisis: Renombrar tabla `products` a `almacen_central`

## Alcance del cambio

### Referencias encontradas:

1. **Código JavaScript/TypeScript:**
   - `src/App.jsx`: ~12 referencias a `supabase.from('products')`
   - `src/supabaseUsers.js`: `tableMap` mapea 'almacenCentral' a 'products'
   - Posibles referencias en otros archivos

2. **Base de datos (Supabase):**
   - Foreign keys en `sales`: `sku text references products(sku)`
   - Foreign keys en `mis_numeros`: `sku text references products(sku)`
   - Triggers: `products_updated`
   - Índices: `idx_products_sku`
   - Políticas RLS en `products`
   - Funciones SQL que usan `products` (si existen)

3. **Esquema SQL:**
   - Definición de tabla en `supabase-schema.sql`
   - Referencias en scripts de migración

## Riesgos identificados

⚠️ **ALTO RIESGO:**
- Foreign keys que referencian `products(sku)` - necesitan actualizarse
- Triggers e índices que usan el nombre de tabla
- Políticas RLS que usan el nombre de tabla
- Código JavaScript que hace queries directas a `products`

✅ **BAJO RIESGO:**
- El `tableMap` en `supabaseUsers.js` ya mapea 'almacenCentral' a 'products'
- Muchas funciones ya usan el mapeo indirecto

## Plan por fases recomendado

### FASE 1: Preparación y compatibilidad dual
- Crear vista o alias temporal
- Verificar que todo funciona

### FASE 2: Actualizar código JavaScript
- Cambiar todas las referencias directas a `products`
- Usar el mapeo existente en `tableMap`

### FASE 3: Actualizar base de datos
- Renombrar tabla
- Actualizar foreign keys
- Actualizar triggers, índices, políticas RLS

### FASE 4: Limpieza y verificación
- Eliminar código legacy
- Verificar que todo funciona
- Testing completo


