-- SECURITY MIGRATION (RLS + Auth linkage)
-- Ejecutar en Supabase SQL editor en este orden. Ajusta si ya existe alguna columna/policy.

-- 1. Agregar columna auth_id a users (si no existe)
alter table users add column if not exists auth_id uuid unique;

-- 2. (Opcional pero recomendado) Foreign key a auth.users
-- Nota: requiere permisos y que la referencia exista.
-- alter table users add constraint users_auth_id_fk foreign key (auth_id) references auth.users(id) on update cascade on delete set null;

-- 3. Desactivar políticas abiertas actuales (DROP) para reemplazarlas.
-- Products
drop policy if exists "open_select_products" on products;
drop policy if exists "open_modify_products" on products;
-- Users
drop policy if exists "open_select_users" on users;
drop policy if exists "open_modify_users" on users;
-- Sales
drop policy if exists "open_select_sales" on sales;
drop policy if exists "open_modify_sales" on sales;
-- Dispatches
drop policy if exists "open_select_dispatches" on dispatches;
drop policy if exists "open_modify_dispatches" on dispatches;
-- Team messages
drop policy if exists "open_select_team_messages" on team_messages;
drop policy if exists "open_modify_team_messages" on team_messages;
-- Numbers
drop policy if exists "open_select_numbers" on numbers;
drop policy if exists "open_modify_numbers" on numbers;
-- Deposit snapshots
drop policy if exists "open_select_deposit_snapshots" on deposit_snapshots;
drop policy if exists "open_modify_deposit_snapshots" on deposit_snapshots;
-- Resets
drop policy if exists "open_select_resets" on resets;
drop policy if exists "open_modify_resets" on resets;

-- 4. Nuevas POLICIES mínimas
-- Helper: condición para ADMIN actual
create or replace view _current_is_admin as
  select exists(
    select 1 from users u
    where u.auth_id = auth.uid() and u.rol = 'admin'
  ) as is_admin;

-- PRODUCTS: todos los autenticados leen; solo admin modifica
create policy products_select_all on products for select using ( auth.role() = 'authenticated' );
create policy products_admin_all on products for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

-- USERS: admin ve todos; cada usuario ve/actualiza SOLO su fila
create policy users_admin_all on users for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);
create policy users_self_select on users for select using ( users.auth_id = auth.uid() );
create policy users_self_update on users for update using ( users.auth_id = auth.uid() ) with check ( users.auth_id = auth.uid() );

-- SALES: admin todo; sellers solo sus ventas (vendedora_id = su users.id)
create policy sales_admin_all on sales for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);
create policy sales_owner_rw on sales for select using (
  exists (select 1 from users u where u.auth_id = auth.uid() and sales.vendedora_id = u.id)
);
create policy sales_owner_insert on sales for insert with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and sales.vendedora_id = u.id)
);
create policy sales_owner_update on sales for update using (
  exists (select 1 from users u where u.auth_id = auth.uid() and sales.vendedora_id = u.id)
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and sales.vendedora_id = u.id)
);

-- DISPATCHES: admin full; lectura para autenticados
create policy dispatches_select_all on dispatches for select using ( auth.role() = 'authenticated' );
create policy dispatches_admin_all on dispatches for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

-- TEAM MESSAGES: admin todo; user lee los de su grupo y crea propios
-- Simplificación: todos autenticados leen y escriben; refinar a grupo si se desea.
create policy team_messages_select_all on team_messages for select using ( auth.role() = 'authenticated' );
create policy team_messages_insert_auth on team_messages for insert with check (
  exists (select 1 from users u where u.auth_id = auth.uid())
);
create policy team_messages_update_admin on team_messages for update using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

-- NUMBERS & DEPOSIT SNAPSHOTS: lectura todos autenticados; admin modifica
create policy numbers_select_all on numbers for select using ( auth.role() = 'authenticated' );
create policy numbers_admin_all on numbers for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

create policy deposit_snapshots_select_all on deposit_snapshots for select using ( auth.role() = 'authenticated' );
create policy deposit_snapshots_admin_all on deposit_snapshots for all using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

-- RESETS: sólo admin insertar; todos autenticados leer
create policy resets_select_auth on resets for select using ( auth.role() = 'authenticated' );
create policy resets_admin_insert on resets for insert with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.rol='admin')
);

-- 5. (Manual) Crear usuarios Auth: para cada username existente crea un usuario en Auth con email = username || '@maya.local'
-- Luego vincula: update users set auth_id = (select id from auth.users where email = username || '@maya.local') where auth_id is null;

-- 6. Verificación rápida:
-- select username, rol, auth_id is not null as linked from users;
-- select * from sales limit 5;

-- 7. Si algo falla, puedes revertir temporalmente creando una política abierta de emergencia:
-- create policy emergency_all on sales for all using (true) with check (true);
-- (Elimínala enseguida)

-- FIN
