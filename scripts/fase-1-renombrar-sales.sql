-- ================================================================
-- FASE 1: Renombrar sales → ventas
-- ================================================================
-- Esta fase crea la nueva tabla 'ventas', renombra 'sales' a 'sales_backup',
-- migra los datos, y crea una vista 'sales' para compatibilidad temporal.
-- 
-- ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ⚠️ Hacer backup de la base de datos antes de ejecutar
-- ================================================================

DO $$
DECLARE
  sales_exists boolean;
  sales_is_table boolean;
  sales_is_view boolean;
  ventas_exists boolean;
  sales_backup_exists boolean;
  total_registros integer;
BEGIN
  -- Verificar si 'sales' existe y qué tipo es
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sales'
  ) INTO sales_exists;
  
  IF NOT sales_exists THEN
    RAISE EXCEPTION 'La tabla sales no existe. No se puede continuar.';
  END IF;
  
  -- Verificar si 'sales' es una tabla o una vista
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND table_type = 'BASE TABLE'
  ) INTO sales_is_table;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'sales'
  ) INTO sales_is_view;
  
  IF sales_is_view THEN
    RAISE EXCEPTION 'sales ya es una vista. Ejecuta primero la FASE 4 de la migración anterior o revierte los cambios.';
  END IF;
  
  IF NOT sales_is_table THEN
    RAISE EXCEPTION 'sales no es una tabla base. Estado desconocido.';
  END IF;
  
  -- Verificar si 'ventas' ya existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ventas'
  ) INTO ventas_exists;
  
  IF ventas_exists THEN
    RAISE EXCEPTION 'La tabla ventas ya existe. No se puede continuar.';
  END IF;
  
  -- Verificar si 'sales_backup' ya existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sales_backup'
  ) INTO sales_backup_exists;
  
  IF sales_backup_exists THEN
    RAISE EXCEPTION 'La tabla sales_backup ya existe. Ejecuta primero la FASE 4 o elimina sales_backup manualmente.';
  END IF;
  
  -- Contar registros en sales
  SELECT COUNT(*) INTO total_registros FROM sales;
  
  RAISE NOTICE 'Iniciando FASE 1: Renombrar sales → ventas';
  RAISE NOTICE 'Total de registros en sales: %', total_registros;
  
  -- PASO 1: Crear tabla 'ventas' con la misma estructura que 'sales'
  RAISE NOTICE 'PASO 1: Creando tabla ventas...';
  
  CREATE TABLE ventas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos básicos de la venta
    fecha date NOT NULL,
    ciudad text NOT NULL,
    sku text REFERENCES almacen_central(sku) ON UPDATE CASCADE ON DELETE SET NULL,
    cantidad int NOT NULL DEFAULT 1,
    precio numeric(12,2) NOT NULL DEFAULT 0,
    sku_extra text REFERENCES almacen_central(sku) ON UPDATE CASCADE ON DELETE SET NULL,
    cantidad_extra int DEFAULT 0,
    total numeric(12,2),
    
    -- Información de vendedora
    vendedora text,
    vendedora_id uuid REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    celular text,
    
    -- Método de pago y cliente
    metodo text,
    cliente text,
    notas text,
    
    -- ESTADO DE LA VENTA
    estado_entrega text NOT NULL DEFAULT 'pendiente' 
      CHECK (estado_entrega IN ('pendiente', 'confirmado', 'entregada', 'cancelado')),
    estado_pago text DEFAULT 'pendiente' 
      CHECK (estado_pago IN ('pendiente', 'cobrado', 'cancelado')),
    
    -- Gastos
    gasto numeric(12,2) DEFAULT 0,
    gasto_cancelacion numeric(12,2) DEFAULT 0,
    
    -- Timestamps de estados
    created_at timestamptz DEFAULT now(),
    confirmado_at timestamptz,
    entregada_at timestamptz,
    cancelado_at timestamptz,
    settled_at timestamptz,
    fecha_cobro timestamptz,
    
    -- SOFT DELETE para "ventasporcobrar"
    deleted_from_pending_at timestamptz,
    
    -- Referencia a depósito (ahora generar_deposito)
    deposit_id uuid REFERENCES generar_deposito(id) ON DELETE SET NULL,
    
    -- Campos adicionales
    comprobante text,
    hora_entrega text,
    destino_encomienda text,
    motivo text,
    sintetica_cancelada boolean DEFAULT false,
    
    -- Código único
    codigo_unico uuid UNIQUE,
    
    updated_at timestamptz DEFAULT now()
  );
  
  RAISE NOTICE 'Tabla ventas creada correctamente.';
  
  -- PASO 2: Migrar datos de sales a ventas
  RAISE NOTICE 'PASO 2: Migrando datos de sales a ventas...';
  
  INSERT INTO ventas (
    id, fecha, ciudad, sku, cantidad, precio, sku_extra, cantidad_extra, total,
    vendedora, vendedora_id, celular, metodo, cliente, notas,
    estado_entrega, estado_pago, gasto, gasto_cancelacion,
    created_at, confirmado_at, entregada_at, cancelado_at, settled_at, fecha_cobro,
    deleted_from_pending_at, deposit_id, comprobante, hora_entrega,
    destino_encomienda, motivo, sintetica_cancelada, codigo_unico, updated_at
  )
  SELECT 
    id, fecha, ciudad, sku, cantidad, precio, sku_extra, cantidad_extra, total,
    vendedora, vendedora_id, celular, metodo, cliente, notas,
    estado_entrega, estado_pago, gasto, gasto_cancelacion,
    created_at, confirmado_at, entregada_at, cancelado_at, settled_at, fecha_cobro,
    deleted_from_pending_at, deposit_id, comprobante, hora_entrega,
    destino_encomienda, motivo, sintetica_cancelada, codigo_unico, updated_at
  FROM sales;
  
  -- Verificar que se migraron todos los registros
  DECLARE
    registros_migrados integer;
  BEGIN
    SELECT COUNT(*) INTO registros_migrados FROM ventas;
    IF registros_migrados != total_registros THEN
      RAISE EXCEPTION 'Error en migración: se esperaban % registros, se migraron %', total_registros, registros_migrados;
    END IF;
    RAISE NOTICE 'Migración exitosa: % registros migrados a ventas', registros_migrados;
  END;
  
  -- PASO 3: Renombrar sales a sales_backup
  RAISE NOTICE 'PASO 3: Renombrando sales a sales_backup...';
  
  ALTER TABLE sales RENAME TO sales_backup;
  
  RAISE NOTICE 'Tabla sales renombrada a sales_backup.';
  
  -- PASO 4: Crear vista 'sales' que apunta a 'ventas' (compatibilidad temporal)
  RAISE NOTICE 'PASO 4: Creando vista sales para compatibilidad...';
  
  CREATE VIEW sales AS SELECT * FROM ventas;
  
  RAISE NOTICE 'Vista sales creada correctamente.';
  
  -- PASO 5: Habilitar RLS en ventas
  RAISE NOTICE 'PASO 5: Habilitando RLS en ventas...';
  
  ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
  
  -- PASO 6: Crear políticas RLS para ventas (copiar de sales_backup)
  RAISE NOTICE 'PASO 6: Creando políticas RLS para ventas...';
  
  DROP POLICY IF EXISTS "open_select_ventas" ON ventas;
  DROP POLICY IF EXISTS "open_modify_ventas" ON ventas;
  
  CREATE POLICY "open_select_ventas" ON ventas FOR SELECT USING (true);
  CREATE POLICY "open_modify_ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);
  
  RAISE NOTICE 'Políticas RLS creadas para ventas.';
  
  -- PASO 7: Crear trigger updated_at para ventas
  RAISE NOTICE 'PASO 7: Creando trigger updated_at para ventas...';
  
  CREATE TRIGGER ventas_updated BEFORE UPDATE ON ventas 
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  
  RAISE NOTICE 'Trigger ventas_updated creado.';
  
  -- PASO 8: Crear índices en ventas (copiar de sales_backup)
  RAISE NOTICE 'PASO 8: Creando índices en ventas...';
  
  CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
  CREATE INDEX IF NOT EXISTS idx_ventas_estado_entrega ON ventas(estado_entrega);
  CREATE INDEX IF NOT EXISTS idx_ventas_estado_pago ON ventas(estado_pago);
  CREATE INDEX IF NOT EXISTS idx_ventas_ciudad ON ventas(ciudad);
  CREATE INDEX IF NOT EXISTS idx_ventas_vendedora_id ON ventas(vendedora_id);
  CREATE INDEX IF NOT EXISTS idx_ventas_deposit_id ON ventas(deposit_id);
  CREATE INDEX IF NOT EXISTS idx_ventas_deleted_from_pending ON ventas(deleted_from_pending_at);
  CREATE INDEX IF NOT EXISTS idx_ventas_codigo_unico ON ventas(codigo_unico);
  
  RAISE NOTICE 'Índices creados en ventas.';
  
  -- PASO 9: Habilitar Realtime para ventas
  RAISE NOTICE 'PASO 9: Habilitando Realtime para ventas...';
  
  -- Nota: Realtime se habilita desde el Dashboard de Supabase
  -- O usando: ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
  
  RAISE NOTICE '✅ FASE 1 COMPLETADA EXITOSAMENTE';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE '  - Tabla ventas creada: ✅';
  RAISE NOTICE '  - Datos migrados: % registros', total_registros;
  RAISE NOTICE '  - Tabla sales renombrada a sales_backup: ✅';
  RAISE NOTICE '  - Vista sales creada (compatibilidad): ✅';
  RAISE NOTICE '  - RLS habilitado: ✅';
  RAISE NOTICE '  - Triggers creados: ✅';
  RAISE NOTICE '  - Índices creados: ✅';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ PRÓXIMOS PASOS:';
  RAISE NOTICE '  1. Habilitar Realtime para ventas desde el Dashboard de Supabase';
  RAISE NOTICE '  2. Ejecutar test-fase-1-renombrar-sales.sql para verificar';
  RAISE NOTICE '  3. Continuar con FASE 2: Actualizar código JavaScript';
  
END $$;

-- Verificación final
SELECT 
  'RESUMEN FASE 1' as resumen,
  (SELECT COUNT(*) FROM sales_backup) as total_en_backup,
  (SELECT COUNT(*) FROM ventas) as total_en_ventas,
  (SELECT COUNT(*) FROM sales) as total_en_vista,
  CASE 
    WHEN (SELECT COUNT(*) FROM sales_backup) = (SELECT COUNT(*) FROM ventas) 
     AND (SELECT COUNT(*) FROM ventas) = (SELECT COUNT(*) FROM sales)
    THEN '✅ TODO CORRECTO'
    ELSE '❌ ERROR: Conteos no coinciden'
  END as estado_final;

