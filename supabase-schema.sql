-- Re-run safe: all IF NOT EXISTS

-- 1. Extensions (pgcrypto for gen_random_uuid)
create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  nombre text not null,
  precio numeric(12,2) not null default 0,
  delivery numeric(12,2) default 0,
  costo numeric(12,2) not null default 0,
  stock integer not null default 0,
  imagen_url text,
  imagen_id text,
  sintetico boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  nombre text not null,
  apellidos text not null,
  celular text,
  rol text not null check (rol in ('admin','seller')),
  grupo text,
  fecha_ingreso date not null default current_date,
  sueldo numeric(12,2) default 0,
  dia_pago int check (dia_pago between 1 and 31),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  ciudad text not null,
  sku text references products(sku) on update cascade on delete set null,
  cantidad int not null default 1,
  precio numeric(12,2) not null default 0,
  sku_extra text references products(sku) on update cascade on delete set null,
  cantidad_extra int default 0,
  total numeric(12,2),
  vendedora text,
  vendedora_id uuid references users(id) on update cascade on delete set null,
  celular text,
  metodo text,
  cliente text,
  notas text,
  estado_entrega text default 'pendiente',
  gasto numeric(12,2) default 0,
  gasto_cancelacion numeric(12,2) default 0,
  confirmado_at bigint,
  cancelado_at bigint,
  settled_at timestamptz,
  comprobante text,
  hora_entrega text,
  destino_encomienda text,
  motivo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  ciudad text not null,
  status text default 'pendiente',
  items jsonb not null,
  created_at timestamptz default now()
);
create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  grupo text,
  author_id uuid references users(id) on delete set null,
  author_nombre text,
  text text not null,
  created_at timestamptz default now(),
  read_by jsonb default '[]'::jsonb
);
create table if not exists numbers (
  id uuid primary key default gen_random_uuid(),
  sku text references products(sku) on update cascade on delete set null,
  email text,
  celular text,
  caduca date,
  created_at timestamptz default now()
);
create table if not exists deposit_snapshots (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  timestamp bigint not null,
  rows jsonb not null,
  resumen jsonb,
  deposit_amount numeric(12,2),
  deposit_note text,
  saved_at timestamptz,
  created_at timestamptz default now()
);
-- Global resets log (broadcast de wipes)
create table if not exists resets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);
-- Simple triggers to keep updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;
create trigger products_updated before update on products for each row execute function set_updated_at();
create trigger users_updated before update on users for each row execute function set_updated_at();
create trigger sales_updated before update on sales for each row execute function set_updated_at();
-- Indexes
create index if not exists idx_sales_fecha on sales(fecha);
create index if not exists idx_sales_estado on sales(estado_entrega);
create index if not exists idx_sales_vendedora_id on sales(vendedora_id);
create index if not exists idx_dispatches_fecha on dispatches(fecha);
create index if not exists idx_products_sku on products(sku);

-- 6. Enable Row Level Security (RLS). We'll start permissive then tighten.
alter table products enable row level security;
alter table users enable row level security;
alter table sales enable row level security;
alter table dispatches enable row level security;
alter table team_messages enable row level security;
alter table numbers enable row level security;
alter table deposit_snapshots enable row level security;
alter table resets enable row level security;

-- WARNING: Using anon public key on client. Below policies ALLOW everything (for prototype only).
-- Replace soon with Supabase Auth or service role + edge functions.
-- Re-create open policies (idempotent)
drop policy if exists "open_select_products" on products;
drop policy if exists "open_modify_products" on products;
create policy "open_select_products" on products for select using (true);
create policy "open_modify_products" on products for all using (true) with check (true);

drop policy if exists "open_select_users" on users;
drop policy if exists "open_modify_users" on users;
create policy "open_select_users" on users for select using (true);
create policy "open_modify_users" on users for all using (true) with check (true);

drop policy if exists "open_select_sales" on sales;
drop policy if exists "open_modify_sales" on sales;
create policy "open_select_sales" on sales for select using (true);
create policy "open_modify_sales" on sales for all using (true) with check (true);

drop policy if exists "open_select_dispatches" on dispatches;
drop policy if exists "open_modify_dispatches" on dispatches;
create policy "open_select_dispatches" on dispatches for select using (true);
create policy "open_modify_dispatches" on dispatches for all using (true) with check (true);

drop policy if exists "open_select_team_messages" on team_messages;
drop policy if exists "open_modify_team_messages" on team_messages;
create policy "open_select_team_messages" on team_messages for select using (true);
create policy "open_modify_team_messages" on team_messages for all using (true) with check (true);

drop policy if exists "open_select_numbers" on numbers;
drop policy if exists "open_modify_numbers" on numbers;
create policy "open_select_numbers" on numbers for select using (true);
create policy "open_modify_numbers" on numbers for all using (true) with check (true);

drop policy if exists "open_select_deposit_snapshots" on deposit_snapshots;
drop policy if exists "open_modify_deposit_snapshots" on deposit_snapshots;
create policy "open_select_deposit_snapshots" on deposit_snapshots for select using (true);
create policy "open_modify_deposit_snapshots" on deposit_snapshots for all using (true) with check (true);
drop policy if exists "open_select_resets" on resets;
drop policy if exists "open_modify_resets" on resets;
create policy "open_select_resets" on resets for select using (true);
create policy "open_modify_resets" on resets for all using (true) with check (true);

-- 7. Seed initial data (only run once; wrap in DO block to avoid duplicates based on SKU/username)
do $$ begin
  -- Products seed
  if not exists (select 1 from products where sku='CVP-60') then
    insert into products (sku,nombre,precio,costo,stock) values
      ('CVP-60','Cardio Vascular Plus 60 caps',120,48,35),
      ('FLEX-60','FLEX CAPS 60 caps',110,44,22),
      ('MENO-60','MENO PAUSE 60 caps',130,52,18),
      ('PBF-250','PREBIOTIC FRESH 250 ml',70,28,50);
  end if;
  -- Users seed (plain passwords - CHANGE LATER!)
  if not exists (select 1 from users where username='admin') then
    insert into users (username,password,nombre,apellidos,rol,grupo,fecha_ingreso,sueldo,dia_pago) values
      ('admin','admin123','Pedro','Admin','admin','A',current_date,0,extract(day from current_date)),
      ('pedroadmin','pedro123','Pedro','Admin','admin','A',current_date,0,extract(day from current_date)),
      ('ana','ana123','Beatriz','vargas','seller','A',current_date,0,extract(day from current_date)),
      ('luisa','luisa123','Luisa','Pérez','seller','B',current_date,0,extract(day from current_date));
  end if;
  -- Sales seed minimal
  if not exists (select 1 from sales) then
    insert into sales (fecha,ciudad,sku,cantidad,precio,vendedora,metodo,cliente,notas,estado_entrega)
    values
      (current_date,'LA PAZ','CVP-60',2,120,'Beatriz Vargas','Efectivo','Cliente 1','', 'confirmado'),
      (current_date,'EL ALTO','FLEX-60',1,110,'Beatriz Vargas','Yape/QR','Cliente 2','', 'confirmado'),
      (current_date,'COCHABAMBA','MENO-60',1,130,'Luisa Pérez','Transferencia','Cliente 3','', 'confirmado');
  end if;
end $$;

-- 8. Helpful views (optional)
create or replace view v_sales_net as
  select s.*, (coalesce(s.total, (s.precio * s.cantidad) + coalesce(p2.precio,0)*coalesce(s.cantidad_extra,0)) - coalesce(s.gasto,0)) as neto
  from sales s
  left join products p2 on p2.sku = s.sku_extra;

-- END OF SCHEMA
