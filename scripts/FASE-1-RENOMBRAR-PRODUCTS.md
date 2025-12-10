# FASE 1: Preparación - Crear vista de compatibilidad

## Objetivo
Crear una vista `products` que apunte a `almacen_central` para mantener compatibilidad temporal.

## Pasos

1. **Crear la nueva tabla `almacen_central`** (copia de `products`)
2. **Migrar datos** de `products` a `almacen_central`
3. **Crear vista `products`** que apunte a `almacen_central` (compatibilidad)
4. **Verificar** que todo funciona

## Script SQL

```sql
-- FASE 1: Preparación - Crear tabla almacen_central y vista de compatibilidad

-- 1. Crear tabla almacen_central (copia de products)
CREATE TABLE IF NOT EXISTS almacen_central (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  nombre text NOT NULL,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  delivery numeric(12,2) DEFAULT 0,
  costo numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  imagen_url text,
  imagen_id text,
  imagen text, -- Nueva columna agregada
  sintetico boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Migrar datos de products a almacen_central
INSERT INTO almacen_central (id, sku, nombre, precio, delivery, costo, stock, imagen_url, imagen_id, imagen, sintetico, created_at, updated_at)
SELECT id, sku, nombre, precio, delivery, costo, stock, imagen_url, imagen_id, imagen, sintetico, created_at, updated_at
FROM products
ON CONFLICT (sku) DO NOTHING;

-- 3. Crear vista products que apunte a almacen_central (compatibilidad temporal)
CREATE OR REPLACE VIEW products AS
SELECT * FROM almacen_central;

-- 4. Verificar migración
SELECT 
  (SELECT COUNT(*) FROM products) as productos_originales,
  (SELECT COUNT(*) FROM almacen_central) as productos_nuevos;
```

## Verificación

Después de ejecutar el script, verifica:
- ✅ La tabla `almacen_central` existe y tiene datos
- ✅ La vista `products` funciona y muestra los mismos datos
- ✅ La aplicación sigue funcionando normalmente

## Nota importante

⚠️ **NO ejecutar FASE 2 hasta confirmar que FASE 1 funciona correctamente**

