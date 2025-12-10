-- FASE 1: Preparación - Crear tabla almacen_central y vista de compatibilidad
-- ⚠️ IMPORTANTE: Ejecutar esta fase primero y verificar que todo funciona antes de continuar

-- 1. Crear tabla almacen_central (copia de products con todas las columnas)
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
  imagen text, -- Columna agregada recientemente
  sintetico boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Verificar si products es una tabla o vista, y renombrar si es necesario
DO $$
BEGIN
  -- Si products es una tabla (no vista), renombrarla a products_backup
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'products' 
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Renombrar tabla products a products_backup (si no existe ya)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'products_backup'
    ) THEN
      ALTER TABLE products RENAME TO products_backup;
      RAISE NOTICE '✅ Tabla products renombrada a products_backup';
    ELSE
      RAISE NOTICE '⚠️ products_backup ya existe, usando datos existentes';
    END IF;
  END IF;
END $$;

-- 3. Migrar datos de products_backup a almacen_central (solo si almacen_central está vacía)
INSERT INTO almacen_central (id, sku, nombre, precio, delivery, costo, stock, imagen_url, imagen_id, imagen, sintetico, created_at, updated_at)
SELECT 
  id, 
  sku, 
  nombre, 
  precio, 
  delivery, 
  costo, 
  stock, 
  imagen_url, 
  imagen_id, 
  imagen, -- Incluir columna imagen si existe
  sintetico, 
  created_at, 
  updated_at
FROM products_backup
WHERE NOT EXISTS (SELECT 1 FROM almacen_central LIMIT 1) -- Solo migrar si almacen_central está vacía
ON CONFLICT (sku) DO NOTHING;

-- 4. Crear vista products que apunte a almacen_central (compatibilidad temporal)
-- Esta vista permite que el código existente siga funcionando
CREATE OR REPLACE VIEW products AS
SELECT * FROM almacen_central;

-- 5. Habilitar RLS en almacen_central (copiar configuración de products)
ALTER TABLE almacen_central ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS básicas (copiar de products si existen)
-- Nota: Ajustar según tus políticas actuales
DO $$
BEGIN
  -- Política de lectura (todos los autenticados pueden leer)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'almacen_central' 
    AND policyname = 'almacen_central_select_all'
  ) THEN
    CREATE POLICY "almacen_central_select_all"
    ON almacen_central FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;

  -- Política de modificación (todos los autenticados pueden modificar)
  -- Ajustar según tus necesidades de seguridad
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'almacen_central' 
    AND policyname = 'almacen_central_modify_all'
  ) THEN
    CREATE POLICY "almacen_central_modify_all"
    ON almacen_central FOR ALL
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 7. Crear trigger para updated_at (copiar de products)
CREATE TRIGGER almacen_central_updated 
  BEFORE UPDATE ON almacen_central 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- 8. Crear índice en sku (copiar de products)
CREATE INDEX IF NOT EXISTS idx_almacen_central_sku 
  ON almacen_central(sku);

-- 9. Verificar migración
DO $$
DECLARE
  productos_backup_count integer;
  productos_vista_count integer;
  almacen_count integer;
BEGIN
  SELECT COUNT(*) INTO productos_backup_count FROM products_backup;
  SELECT COUNT(*) INTO productos_vista_count FROM products;
  SELECT COUNT(*) INTO almacen_count FROM almacen_central;
  
  RAISE NOTICE 'Productos en tabla backup (products_backup): %', productos_backup_count;
  RAISE NOTICE 'Productos en vista (products): %', productos_vista_count;
  RAISE NOTICE 'Productos en nueva tabla (almacen_central): %', almacen_count;
  
  IF productos_backup_count = almacen_count AND productos_vista_count = almacen_count THEN
    RAISE NOTICE '✅ Migración exitosa: Todos los conteos coinciden';
  ELSE
    RAISE WARNING '⚠️ Advertencia: Los conteos no coinciden. Verificar migración.';
  END IF;
END $$;

-- 10. Verificar que la vista funciona
SELECT 
  'Vista products creada correctamente' as status,
  COUNT(*) as total_registros
FROM products;

