# FASE 3: Actualizar base de datos (Foreign Keys, Triggers, etc.)

## Objetivo
Actualizar todas las referencias en la base de datos: foreign keys, triggers, índices, políticas RLS.

## ⚠️ ADVERTENCIA
Esta fase es la más crítica. Asegúrate de tener un backup antes de continuar.

## Pasos

### 1. Actualizar Foreign Keys

```sql
-- Eliminar foreign keys existentes
ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_sku_fkey;

ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_sku_extra_fkey;

ALTER TABLE mis_numeros 
  DROP CONSTRAINT IF EXISTS numbers_sku_fkey;

-- Crear nuevas foreign keys apuntando a almacen_central
ALTER TABLE sales 
  ADD CONSTRAINT sales_sku_fkey 
  FOREIGN KEY (sku) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE sales 
  ADD CONSTRAINT sales_sku_extra_fkey 
  FOREIGN KEY (sku_extra) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE mis_numeros 
  ADD CONSTRAINT numbers_sku_fkey 
  FOREIGN KEY (sku) REFERENCES almacen_central(sku) 
  ON UPDATE CASCADE ON DELETE SET NULL;
```

### 2. Actualizar Triggers

```sql
-- Eliminar trigger antiguo
DROP TRIGGER IF EXISTS products_updated ON products;

-- Crear trigger en almacen_central
CREATE TRIGGER almacen_central_updated 
  BEFORE UPDATE ON almacen_central 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();
```

### 3. Actualizar Índices

```sql
-- Eliminar índice antiguo
DROP INDEX IF EXISTS idx_products_sku;

-- Crear índice en almacen_central
CREATE INDEX IF NOT EXISTS idx_almacen_central_sku 
  ON almacen_central(sku);
```

### 4. Actualizar Políticas RLS

```sql
-- Primero, deshabilitar RLS en products (vista)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS en almacen_central
ALTER TABLE almacen_central ENABLE ROW LEVEL SECURITY;

-- Copiar políticas de products a almacen_central
-- (Necesitarás verificar qué políticas existen actualmente)
-- Ejemplo:
CREATE POLICY IF NOT EXISTS "almacen_central_select_all"
  ON almacen_central FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "almacen_central_modify_all"
  ON almacen_central FOR ALL
  USING (true);
```

### 5. Eliminar vista de compatibilidad (OPCIONAL - solo si todo funciona)

```sql
-- ⚠️ SOLO ejecutar si FASE 2 y FASE 3 funcionan correctamente
DROP VIEW IF EXISTS products;
```

## Verificación

Después de ejecutar el script, verifica:
- ✅ Foreign keys funcionan correctamente
- ✅ Triggers se ejecutan al actualizar
- ✅ Índices mejoran el rendimiento
- ✅ Políticas RLS permiten acceso correcto
- ✅ La aplicación sigue funcionando

## Rollback (si algo falla)

Si algo falla, puedes revertir:
```sql
-- Recrear vista de compatibilidad
CREATE OR REPLACE VIEW products AS SELECT * FROM almacen_central;
```

## Nota importante

⚠️ **Hacer backup antes de ejecutar esta fase**
⚠️ **Probar en localhost primero antes de aplicar en producción**


