-- Schema SQL Actualizado para Migración Firebase → Supabase
-- Incluye campos de la propuesta de refactorización
-- Re-run safe: all IF NOT EXISTS

-- 1. Extensions (pgcrypto for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  nombre text NOT NULL,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  delivery numeric(12,2) DEFAULT 0,
  costo numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  imagen_url text,
  imagen_id text,
  sintetico boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  nombre text NOT NULL,
  apellidos text NOT NULL,
  celular text,
  rol text NOT NULL CHECK (rol IN ('admin','seller')),
  grupo text,
  fecha_ingreso date NOT NULL DEFAULT current_date,
  sueldo numeric(12,2) DEFAULT 0,
  dia_pago int CHECK (dia_pago BETWEEN 1 AND 31),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Tabla de Depósitos (nueva, para reemplazar GenerarDeposito)
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad text NOT NULL,
  fecha date NOT NULL,
  monto_total numeric(12,2) NOT NULL,
  nota text,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- 5. Tabla de Ventas (UNIFICADA con soft delete)
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos básicos de la venta
  fecha date NOT NULL,
  ciudad text NOT NULL,
  sku text REFERENCES products(sku) ON UPDATE CASCADE ON DELETE SET NULL,
  cantidad int NOT NULL DEFAULT 1,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  sku_extra text REFERENCES products(sku) ON UPDATE CASCADE ON DELETE SET NULL,
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
  settled_at timestamptz,  -- Cuando se incluye en depósito
  fecha_cobro timestamptz,
  
  -- SOFT DELETE para "ventasporcobrar"
  -- NULL = está en lista por cobrar
  deleted_from_pending_at timestamptz,
  
  -- Referencia a depósito
  deposit_id uuid REFERENCES deposits(id) ON DELETE SET NULL,
  
  -- Campos adicionales
  comprobante text,
  hora_entrega text,
  destino_encomienda text,
  motivo text,
  sintetica_cancelada boolean DEFAULT false,
  
  -- Código único (mantener para compatibilidad durante migración)
  codigo_unico uuid UNIQUE,
  
  updated_at timestamptz DEFAULT now()
);

-- 6. Tabla de Stock por Ciudad (NORMALIZADA)
CREATE TABLE IF NOT EXISTS city_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad text NOT NULL,
  sku text NOT NULL REFERENCES products(sku) ON UPDATE CASCADE ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 0,
  UNIQUE(ciudad, sku)
);

-- 7. Tabla de Despachos (UNIFICADA)
CREATE TABLE IF NOT EXISTS dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  ciudad text NOT NULL,
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'cancelado')),
  items jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- 8. Tabla de Mensajes de Equipo
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_nombre text,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_by jsonb DEFAULT '[]'::jsonb
);

-- 9. Tabla de Números de Contacto
CREATE TABLE IF NOT EXISTS mis_numeros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text REFERENCES products(sku) ON UPDATE CASCADE ON DELETE SET NULL,
  email text,
  celular text,
  caduca date,
  telefonia text, -- Línea telefónica (Entel, Tigo, etc.)
  nombre_otro text, -- Nombre del producto cuando sku='otros'
  created_at timestamptz DEFAULT now()
);

-- 10. Tabla de Snapshots de Depósitos (legacy, para compatibilidad)
CREATE TABLE IF NOT EXISTS deposit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  timestamp bigint NOT NULL,
  rows jsonb NOT NULL,
  resumen jsonb,
  deposit_amount numeric(12,2),
  deposit_note text,
  saved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 11. Tabla de Resets Globales
CREATE TABLE IF NOT EXISTS resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- 12. Triggers para updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sales_updated BEFORE UPDATE ON sales 
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sales_fecha ON sales(fecha);
CREATE INDEX IF NOT EXISTS idx_sales_estado_entrega ON sales(estado_entrega);
CREATE INDEX IF NOT EXISTS idx_sales_estado_pago ON sales(estado_pago);
CREATE INDEX IF NOT EXISTS idx_sales_ciudad ON sales(ciudad);
CREATE INDEX IF NOT EXISTS idx_sales_vendedora_id ON sales(vendedora_id);
CREATE INDEX IF NOT EXISTS idx_sales_deposit_id ON sales(deposit_id);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_from_pending ON sales(deleted_from_pending_at);
CREATE INDEX IF NOT EXISTS idx_sales_codigo_unico ON sales(codigo_unico);

CREATE INDEX IF NOT EXISTS idx_dispatches_fecha ON dispatches(fecha);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_city_stock_ciudad ON city_stock(ciudad);
CREATE INDEX IF NOT EXISTS idx_city_stock_sku ON city_stock(sku);
CREATE INDEX IF NOT EXISTS idx_city_stock_ciudad_sku ON city_stock(ciudad, sku);

-- 14. Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mis_numeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_stock ENABLE ROW LEVEL SECURITY;

-- 15. Políticas RLS Permisivas (para desarrollo/prototipo)
-- WARNING: Reemplazar con políticas más restrictivas en producción

-- Products
DROP POLICY IF EXISTS "open_select_products" ON products;
DROP POLICY IF EXISTS "open_modify_products" ON products;
CREATE POLICY "open_select_products" ON products FOR SELECT USING (true);
CREATE POLICY "open_modify_products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Users
DROP POLICY IF EXISTS "open_select_users" ON users;
DROP POLICY IF EXISTS "open_modify_users" ON users;
CREATE POLICY "open_select_users" ON users FOR SELECT USING (true);
CREATE POLICY "open_modify_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Sales
DROP POLICY IF EXISTS "open_select_sales" ON sales;
DROP POLICY IF EXISTS "open_modify_sales" ON sales;
CREATE POLICY "open_select_sales" ON sales FOR SELECT USING (true);
CREATE POLICY "open_modify_sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- Dispatches
DROP POLICY IF EXISTS "open_select_dispatches" ON dispatches;
DROP POLICY IF EXISTS "open_modify_dispatches" ON dispatches;
CREATE POLICY "open_select_dispatches" ON dispatches FOR SELECT USING (true);
CREATE POLICY "open_modify_dispatches" ON dispatches FOR ALL USING (true) WITH CHECK (true);

-- Team Messages
DROP POLICY IF EXISTS "open_select_team_messages" ON team_messages;
DROP POLICY IF EXISTS "open_modify_team_messages" ON team_messages;
CREATE POLICY "open_select_team_messages" ON team_messages FOR SELECT USING (true);
CREATE POLICY "open_modify_team_messages" ON team_messages FOR ALL USING (true) WITH CHECK (true);

-- Mis Números (renombrado de numbers)
DROP POLICY IF EXISTS "open_select_numbers" ON mis_numeros;
DROP POLICY IF EXISTS "open_modify_numbers" ON mis_numeros;
CREATE POLICY "open_select_numbers" ON mis_numeros FOR SELECT USING (true);
CREATE POLICY "open_modify_numbers" ON mis_numeros FOR ALL USING (true) WITH CHECK (true);

-- Deposits
DROP POLICY IF EXISTS "open_select_deposits" ON deposits;
DROP POLICY IF EXISTS "open_modify_deposits" ON deposits;
CREATE POLICY "open_select_deposits" ON deposits FOR SELECT USING (true);
CREATE POLICY "open_modify_deposits" ON deposits FOR ALL USING (true) WITH CHECK (true);

-- Deposit Snapshots
DROP POLICY IF EXISTS "open_select_deposit_snapshots" ON deposit_snapshots;
DROP POLICY IF EXISTS "open_modify_deposit_snapshots" ON deposit_snapshots;
CREATE POLICY "open_select_deposit_snapshots" ON deposit_snapshots FOR SELECT USING (true);
CREATE POLICY "open_modify_deposit_snapshots" ON deposit_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Resets
DROP POLICY IF EXISTS "open_select_resets" ON resets;
DROP POLICY IF EXISTS "open_modify_resets" ON resets;
CREATE POLICY "open_select_resets" ON resets FOR SELECT USING (true);
CREATE POLICY "open_modify_resets" ON resets FOR ALL USING (true) WITH CHECK (true);

-- City Stock
DROP POLICY IF EXISTS "open_select_city_stock" ON city_stock;
DROP POLICY IF EXISTS "open_modify_city_stock" ON city_stock;
CREATE POLICY "open_select_city_stock" ON city_stock FOR SELECT USING (true);
CREATE POLICY "open_modify_city_stock" ON city_stock FOR ALL USING (true) WITH CHECK (true);

-- 16. Vistas útiles (opcional)
CREATE OR REPLACE VIEW v_sales_net AS
  SELECT s.*, 
    (COALESCE(s.total, (s.precio * s.cantidad) + COALESCE(p2.precio,0)*COALESCE(s.cantidad_extra,0)) - COALESCE(s.gasto,0)) AS neto
  FROM sales s
  LEFT JOIN products p2 ON p2.sku = s.sku_extra;

-- Vista para ventas por cobrar (activas)
CREATE OR REPLACE VIEW v_sales_pending_payment AS
  SELECT * FROM sales
  WHERE deleted_from_pending_at IS NULL 
    AND estado_pago = 'pendiente'
    AND estado_entrega IN ('confirmado', 'entregada');

-- Vista para historial (todas las confirmadas)
CREATE OR REPLACE VIEW v_sales_history AS
  SELECT * FROM sales
  WHERE estado_entrega IN ('confirmado', 'entregada', 'cancelado');

-- END OF SCHEMA

