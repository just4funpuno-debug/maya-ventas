-- =====================================================
-- FASE 1: Renombrar tabla deposits → generar_deposito
-- =====================================================
-- Objetivo: Crear nueva tabla, migrar datos, crear vista de compatibilidad
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Verificar si deposits existe y es una tabla base (no vista)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deposits'
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'La tabla deposits no existe o es una vista. Verifica el estado actual.';
  END IF;
END $$;

-- PASO 2: Crear la nueva tabla generar_deposito
CREATE TABLE IF NOT EXISTS generar_deposito (
  id uuid PRIMARY KEY,
  ciudad text NOT NULL,
  fecha date NOT NULL,
  monto_total numeric(12,2),
  nota text,
  estado text DEFAULT 'pendiente',
  created_at timestamptz,
  updated_at timestamptz
);

-- PASO 3: Migrar datos de deposits a generar_deposito
-- Verificar qué columnas existen en deposits y migrar solo las que existen
DO $$
DECLARE
  has_updated_at BOOLEAN;
BEGIN
  -- Verificar si updated_at existe en deposits
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deposits' 
    AND column_name = 'updated_at'
  ) INTO has_updated_at;
  
  -- Migrar datos según las columnas disponibles
  IF has_updated_at THEN
    INSERT INTO generar_deposito (id, ciudad, fecha, monto_total, nota, estado, created_at, updated_at)
    SELECT 
      id,
      ciudad,
      fecha,
      monto_total,
      nota,
      estado,
      created_at,
      updated_at
    FROM deposits
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO generar_deposito (id, ciudad, fecha, monto_total, nota, estado, created_at, updated_at)
    SELECT 
      id,
      ciudad,
      fecha,
      monto_total,
      nota,
      estado,
      created_at,
      COALESCE(created_at, now()) as updated_at  -- Usar created_at o now() si no existe
    FROM deposits
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- PASO 4: Renombrar deposits a deposits_backup
ALTER TABLE deposits RENAME TO deposits_backup;

-- PASO 5: Crear vista deposits que apunta a generar_deposito (compatibilidad)
CREATE OR REPLACE VIEW deposits AS
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  nota,
  estado,
  created_at,
  updated_at
FROM generar_deposito;

-- PASO 6: Habilitar RLS en generar_deposito
ALTER TABLE generar_deposito ENABLE ROW LEVEL SECURITY;

-- PASO 7: Crear políticas RLS para generar_deposito (copiar de deposits_backup si existen)
-- Primero eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "open_select_deposits" ON generar_deposito;
DROP POLICY IF EXISTS "open_modify_deposits" ON generar_deposito;

-- Crear políticas abiertas (temporal, para compatibilidad)
CREATE POLICY "open_select_deposits" ON generar_deposito FOR SELECT USING (true);
CREATE POLICY "open_modify_deposits" ON generar_deposito FOR ALL USING (true) WITH CHECK (true);

-- PASO 8: Crear trigger para updated_at en generar_deposito
CREATE OR REPLACE FUNCTION set_generar_deposito_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generar_deposito_updated ON generar_deposito;
CREATE TRIGGER generar_deposito_updated
  BEFORE UPDATE ON generar_deposito
  FOR EACH ROW
  EXECUTE FUNCTION set_generar_deposito_updated_at();

-- PASO 9: Crear índices en generar_deposito
CREATE INDEX IF NOT EXISTS idx_generar_deposito_ciudad ON generar_deposito(ciudad);
CREATE INDEX IF NOT EXISTS idx_generar_deposito_fecha ON generar_deposito(fecha);
CREATE INDEX IF NOT EXISTS idx_generar_deposito_estado ON generar_deposito(estado);

-- PASO 10: Habilitar Realtime para generar_deposito
ALTER PUBLICATION supabase_realtime ADD TABLE generar_deposito;

-- PASO 11: Verificación final
DO $$
DECLARE
  total_backup INTEGER;
  total_nuevo INTEGER;
  total_vista INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_backup FROM deposits_backup;
  SELECT COUNT(*) INTO total_nuevo FROM generar_deposito;
  SELECT COUNT(*) INTO total_vista FROM deposits;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN FASE 1';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros en deposits_backup: %', total_backup;
  RAISE NOTICE 'Registros en generar_deposito: %', total_nuevo;
  RAISE NOTICE 'Registros en vista deposits: %', total_vista;
  
  IF total_backup = total_nuevo AND total_nuevo = total_vista THEN
    RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Todos los registros coinciden';
  ELSE
    RAISE WARNING '⚠️ DISCREPANCIA DETECTADA - Verifica los datos';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Verificar estructura
SELECT 
  'deposits_backup' as tabla,
  COUNT(*) as total_registros
FROM deposits_backup
UNION ALL
SELECT 
  'generar_deposito' as tabla,
  COUNT(*) as total_registros
FROM generar_deposito
UNION ALL
SELECT 
  'deposits (vista)' as tabla,
  COUNT(*) as total_registros
FROM deposits;

