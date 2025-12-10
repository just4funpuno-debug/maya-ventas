-- CRUD SAFE OPERATIONS (Pedidos = sales, Productos = products)
-- Objetivo: operaciones robustas para modificar / eliminar (soft & hard) pedidos y productos
-- Incluye: soft delete, auditoría, funciones RPC (para usar vía Supabase), bloqueos optimistas.
-- Idempotente: puede ejecutarse múltiples veces sin romper.
-- NOTA: Ajusta policies RLS para permitir ejecutar estas funciones (ej. vía rpc) según tu modelo de roles.

-- ===============================================================
-- 1. Columnas adicionales (soft delete + invariantes)
-- ===============================================================
alter table products add column if not exists deleted_at timestamptz;
alter table sales add column if not exists deleted_at timestamptz;

-- (Opcional) bandera activa para consultas más simples
alter table products add column if not exists activo boolean generated always as (deleted_at is null) stored;
alter table sales add column if not exists activo boolean generated always as (deleted_at is null) stored;

-- Si la columna ya existía como normal (no generada) la recreamos para estandarizar
do $$ begin
  if exists(
    select 1 from information_schema.columns 
    where table_name='products' and column_name='activo' and is_generated='NEVER'
  ) then
    alter table products drop column activo;
    alter table products add column activo boolean generated always as (deleted_at is null) stored;
  end if;
  if exists(
    select 1 from information_schema.columns 
    where table_name='sales' and column_name='activo' and is_generated='NEVER'
  ) then
    alter table sales drop column activo;
    alter table sales add column activo boolean generated always as (deleted_at is null) stored;
  end if;
exception when others then
  -- No abortar todo el script por este ajuste; registrar aviso
  raise notice 'No se pudo recrear columna activo: %', sqlerrm;
end $$;

-- Índices parciales para acelerar consultas típicas (solo registros vivos)
create index if not exists idx_products_activo on products(sku) where deleted_at is null;
create index if not exists idx_sales_activo on sales(fecha) where deleted_at is null;

-- ===============================================================
-- 2. Tablas de auditoría
-- ===============================================================
create table if not exists product_audit (
  audit_id bigserial primary key,
  at timestamptz not null default now(),
  action text not null check (action in ('INSERT','UPDATE','DELETE','SOFT_DELETE','RESTORE','HARD_DELETE')),
  product_id uuid,
  sku text,
  old_row jsonb,
  new_row jsonb,
  actor uuid,          -- auth.uid() si disponible
  reason text
);

create table if not exists sales_audit (
  audit_id bigserial primary key,
  at timestamptz not null default now(),
  action text not null check (action in ('INSERT','UPDATE','DELETE','SOFT_DELETE','RESTORE','HARD_DELETE')),
  sale_id uuid,
  old_row jsonb,
  new_row jsonb,
  actor uuid,
  reason text
);

-- ===============================================================
-- 3. Helper para capturar auth.uid() (si no hay sesión devuelve NULL)
-- ===============================================================
create or replace function current_actor() returns uuid language sql stable as $$
  select nullif(auth.uid(), '00000000-0000-0000-0000-000000000000');
$$;

-- ===============================================================
-- 4. Triggers de auditoría (para operaciones directas). Recomendado usar funciones seguras abajo.
-- ===============================================================
create or replace function trg_audit_products() returns trigger as $$
declare
  v_action text;
begin
  if (tg_op = 'INSERT') then v_action := 'INSERT'; end if;
  if (tg_op = 'UPDATE') then
    if new.deleted_at is not null and old.deleted_at is null then
      v_action := 'SOFT_DELETE';
    elsif new.deleted_at is null and old.deleted_at is not null then
      v_action := 'RESTORE';
    else
      v_action := 'UPDATE';
    end if;
  end if;
  if (tg_op = 'DELETE') then v_action := 'DELETE'; end if;
  insert into product_audit(action, product_id, sku, old_row, new_row, actor)
  values (v_action, coalesce(old.id, new.id), coalesce(old.sku, new.sku), to_jsonb(old), to_jsonb(new), current_actor());
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$ language plpgsql;

create or replace function trg_audit_sales() returns trigger as $$
declare
  v_action text;
begin
  if (tg_op = 'INSERT') then v_action := 'INSERT'; end if;
  if (tg_op = 'UPDATE') then
    if new.deleted_at is not null and old.deleted_at is null then
      v_action := 'SOFT_DELETE';
    elsif new.deleted_at is null and old.deleted_at is not null then
      v_action := 'RESTORE';
    else
      v_action := 'UPDATE';
    end if;
  end if;
  if (tg_op = 'DELETE') then v_action := 'DELETE'; end if;
  insert into sales_audit(action, sale_id, old_row, new_row, actor)
  values (v_action, coalesce(old.id, new.id), to_jsonb(old), to_jsonb(new), current_actor());
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$ language plpgsql;

-- Crear triggers si no existen (evitamos duplicados usando nombres fijos y reemplazo)
drop trigger if exists products_audit_trg on products;
create trigger products_audit_trg after insert or update or delete on products
for each row execute function trg_audit_products();

drop trigger if exists sales_audit_trg on sales;
create trigger sales_audit_trg after insert or update or delete on sales
for each row execute function trg_audit_sales();

-- ===============================================================
-- 5. Funciones utilitarias: Validaciones
-- ===============================================================
create or replace function assert_non_negative(n numeric, field_name text) returns void as $$
begin
  if n < 0 then
    raise exception 'Valor negativo no permitido para %', field_name;
  end if;
end; $$ language plpgsql immutable;

-- ===============================================================
-- 6. FUNCIONES SEGURAS PARA PRODUCTOS
-- ===============================================================
-- Actualiza un producto con control de concurrencia (expected_updated_at) y recalcula updated_at
create or replace function safe_update_product(
  p_sku text,
  p_nombre text default null,
  p_precio numeric default null,
  p_delivery numeric default null,
  p_costo numeric default null,
  p_stock integer default null,
  p_imagen_url text default null,
  p_imagen_id text default null,
  p_sintetico boolean default null,
  p_expected_updated_at timestamptz default null,
  p_reason text default null
) returns products as $$
declare v_row products; v_old products; begin
  select * into v_old from products where sku = p_sku and deleted_at is null;
  if not found then raise exception 'Producto % no encontrado o eliminado', p_sku; end if;
  if p_expected_updated_at is not null and v_old.updated_at <> p_expected_updated_at then
    raise exception 'Conflicto de concurrencia para %, updated_at actual=%', p_sku, v_old.updated_at;
  end if;
  if p_stock is not null and p_stock < 0 then raise exception 'Stock no puede ser negativo'; end if;
  update products set
    nombre = coalesce(p_nombre, nombre),
    precio = coalesce(p_precio, precio),
    delivery = coalesce(p_delivery, delivery),
    costo = coalesce(p_costo, costo),
    stock = coalesce(p_stock, stock),
    imagen_url = coalesce(p_imagen_url, imagen_url),
    imagen_id = coalesce(p_imagen_id, imagen_id),
    sintetico = coalesce(p_sintetico, sintetico),
    updated_at = now()
  where sku = p_sku
  returning * into v_row;
  -- anotación de razón específica (update posterior audit)
  if p_reason is not null then
    insert into product_audit(action, product_id, sku, old_row, new_row, actor, reason)
    values ('UPDATE', v_row.id, v_row.sku, to_jsonb(v_old), to_jsonb(v_row), current_actor(), p_reason);
  end if;
  return v_row;
end; $$ language plpgsql security definer set search_path = public;

-- Soft delete producto (mantiene historial de ventas intacto). Hard delete opcional.
create or replace function safe_delete_product(
  p_sku text,
  p_hard boolean default false,
  p_reason text default null
) returns text as $$
declare v_row products; v_refs int; begin
  select * into v_row from products where sku = p_sku;
  if not found then return 'NO_EXISTE'; end if;
  if p_hard then
    -- Solo permitir hard si ya está soft deleted y sin referencias vivas (ventas activas)
    select count(*) into v_refs from sales where sku = p_sku and deleted_at is null;
    if v_refs > 0 then raise exception 'No se puede hard-delete producto %: hay ventas activas (%)', p_sku, v_refs; end if;
    delete from products where sku = p_sku;
    insert into product_audit(action, product_id, sku, old_row, new_row, actor, reason)
    values ('HARD_DELETE', v_row.id, v_row.sku, to_jsonb(v_row), null, current_actor(), p_reason);
    return 'HARD_DELETED';
  else
    if v_row.deleted_at is not null then return 'YA_ELIMINADO'; end if;
    update products set deleted_at = now(), updated_at = now() where sku = p_sku;
    insert into product_audit(action, product_id, sku, old_row, new_row, actor, reason)
    values ('SOFT_DELETE', v_row.id, v_row.sku, to_jsonb(v_row), null, current_actor(), p_reason);
    return 'SOFT_DELETED';
  end if;
end; $$ language plpgsql security definer set search_path = public;

-- Restaurar producto soft deleted
create or replace function restore_product(p_sku text, p_reason text default null) returns products as $$
declare v_old products; v_new products; begin
  select * into v_old from products where sku = p_sku and deleted_at is not null;
  if not found then raise exception 'Producto % no está en estado eliminado', p_sku; end if;
  update products set deleted_at = null, updated_at = now() where sku = p_sku returning * into v_new;
  insert into product_audit(action, product_id, sku, old_row, new_row, actor, reason)
  values ('RESTORE', v_new.id, v_new.sku, to_jsonb(v_old), to_jsonb(v_new), current_actor(), p_reason);
  return v_new;
end; $$ language plpgsql security definer set search_path = public;

-- ===============================================================
-- 7. FUNCIONES SEGURAS PARA SALES (PEDIDOS)
-- ===============================================================
-- Recalcula total si no se proporciona y valida no negativos.
create or replace function safe_update_sale(
  p_id uuid,
  p_fecha date default null,
  p_ciudad text default null,
  p_sku text default null,
  p_cantidad int default null,
  p_precio numeric default null,
  p_sku_extra text default null,
  p_cantidad_extra int default null,
  p_total numeric default null,
  p_estado_entrega text default null,
  p_gasto numeric default null,
  p_gasto_cancelacion numeric default null,
  p_metodo text default null,
  p_cliente text default null,
  p_notas text default null,
  p_motivo text default null,
  p_expected_updated_at timestamptz default null,
  p_reason text default null
) returns sales as $$
declare v_old sales; v_new sales; v_total numeric; begin
  select * into v_old from sales where id = p_id and deleted_at is null;
  if not found then raise exception 'Pedido % no encontrado o eliminado', p_id; end if;
  if p_expected_updated_at is not null and v_old.updated_at <> p_expected_updated_at then
    raise exception 'Conflicto de concurrencia pedido %, updated_at actual=%', p_id, v_old.updated_at;
  end if;
  if p_cantidad is not null and p_cantidad < 0 then raise exception 'Cantidad < 0'; end if;
  if p_cantidad_extra is not null and p_cantidad_extra < 0 then raise exception 'Cantidad extra < 0'; end if;
  if p_gasto is not null and p_gasto < 0 then raise exception 'Gasto < 0'; end if;
  if p_gasto_cancelacion is not null and p_gasto_cancelacion < 0 then raise exception 'Gasto cancelación < 0'; end if;
  -- Calcula total si no viene
  if p_total is null then
    v_total := coalesce(p_precio, v_old.precio) * coalesce(p_cantidad, v_old.cantidad);
    if p_sku_extra is not null or p_cantidad_extra is not null then
      -- Busca precio producto extra si existe
      v_total := v_total + coalesce((select precio from products where sku = coalesce(p_sku_extra, v_old.sku_extra)),0) * coalesce(p_cantidad_extra, v_old.cantidad_extra);
    end if;
    -- descuentos/gastos se aplican afuera (mantener simple)
  else
    v_total := p_total;
  end if;
  update sales set
    fecha = coalesce(p_fecha, fecha),
    ciudad = coalesce(p_ciudad, ciudad),
    sku = coalesce(p_sku, sku),
    cantidad = coalesce(p_cantidad, cantidad),
    precio = coalesce(p_precio, precio),
    sku_extra = coalesce(p_sku_extra, sku_extra),
    cantidad_extra = coalesce(p_cantidad_extra, cantidad_extra),
    total = v_total,
    estado_entrega = coalesce(p_estado_entrega, estado_entrega),
    gasto = coalesce(p_gasto, gasto),
    gasto_cancelacion = coalesce(p_gasto_cancelacion, gasto_cancelacion),
    metodo = coalesce(p_metodo, metodo),
    cliente = coalesce(p_cliente, cliente),
    notas = coalesce(p_notas, notas),
    motivo = coalesce(p_motivo, motivo),
    updated_at = now()
  where id = p_id
  returning * into v_new;
  if p_reason is not null then
    insert into sales_audit(action, sale_id, old_row, new_row, actor, reason)
    values ('UPDATE', v_new.id, to_jsonb(v_old), to_jsonb(v_new), current_actor(), p_reason);
  end if;
  return v_new;
end; $$ language plpgsql security definer set search_path = public;

-- Soft / hard delete de pedido
create or replace function safe_delete_sale(
  p_id uuid,
  p_hard boolean default false,
  p_reason text default null
) returns text as $$
declare v_old sales; begin
  select * into v_old from sales where id = p_id;
  if not found then return 'NO_EXISTE'; end if;
  if p_hard then
    delete from sales where id = p_id;
    insert into sales_audit(action, sale_id, old_row, new_row, actor, reason)
    values ('HARD_DELETE', v_old.id, to_jsonb(v_old), null, current_actor(), p_reason);
    return 'HARD_DELETED';
  else
    if v_old.deleted_at is not null then return 'YA_ELIMINADO'; end if;
    update sales set deleted_at = now(), updated_at = now() where id = p_id;
    insert into sales_audit(action, sale_id, old_row, new_row, actor, reason)
    values ('SOFT_DELETE', v_old.id, to_jsonb(v_old), null, current_actor(), p_reason);
    return 'SOFT_DELETED';
  end if;
end; $$ language plpgsql security definer set search_path = public;

-- Restaurar pedido
create or replace function restore_sale(p_id uuid, p_reason text default null) returns sales as $$
declare v_old sales; v_new sales; begin
  select * into v_old from sales where id = p_id and deleted_at is not null;
  if not found then raise exception 'Pedido % no está eliminado', p_id; end if;
  update sales set deleted_at = null, updated_at = now() where id = p_id returning * into v_new;
  insert into sales_audit(action, sale_id, old_row, new_row, actor, reason)
  values ('RESTORE', v_new.id, to_jsonb(v_old), to_jsonb(v_new), current_actor(), p_reason);
  return v_new;
end; $$ language plpgsql security definer set search_path = public;

-- ===============================================================
-- 8. VISTAS DE LECTURA (solo activos) - opcional
-- ===============================================================
create or replace view products_active as
  select * from products where deleted_at is null;
create or replace view sales_active as
  select * from sales where deleted_at is null;

-- ===============================================================
-- 9. RLS (EJEMPLO OPCIONAL) Para ocultar eliminados a usuarios no admin
-- (Descomentar y adaptar si ya migraste a Auth y roles)
-- drop policy if exists sales_no_deleted on sales;
-- create policy sales_no_deleted on sales for select using (deleted_at is null);
-- drop policy if exists products_no_deleted on products;
-- create policy products_no_deleted on products for select using (deleted_at is null);

-- ===============================================================
-- 10. PRUEBAS RÁPIDAS (ejecutar manualmente)
-- select safe_update_product('CVP-60', p_precio:=150, p_expected_updated_at:=(select updated_at from products where sku='CVP-60'), p_reason:='Ajuste precio');
-- select safe_delete_product('CVP-60', false, 'Descontinuado temporal');
-- select restore_product('CVP-60','Vuelve a catálogo');
-- select safe_delete_product('CVP-60', true, 'Eliminar definitivamente');
-- select safe_update_sale('<id-uuid>', p_cantidad:=3, p_reason:='Cliente aumentó');
-- select safe_delete_sale('<id-uuid>', false, 'Cancelado cliente');
-- select restore_sale('<id-uuid>','Reactivado');

-- FIN DEL SCRIPT
