-- SECURITY PHASE 2 (Transición completa a Supabase Auth)
-- Objetivo: enlazar filas legacy de users con auth.users y cerrar brecha de passwords en texto plano.
-- Ejecutar después de haber creado usuarios en Auth con emails sintéticos username@maya.local.

-- 1. Backfill auth_id (si aún hay filas sin enlazar)
update users u
set auth_id = au.id
from auth.users au
where u.auth_id is null
  and (au.email = u.username || '@maya.local');

-- 2. Política transitoria para permitir que un usuario con auth_id NULL pueda auto-enlazarse (solo una vez)
-- (Si ya todas las filas tienen auth_id, este bloque es opcional y se puede omitir)
create policy if not exists users_link_self_once on users for update using (
  auth.role() = 'authenticated' and users.auth_id is null and
  exists (select 1 from auth.users au where au.id = auth.uid() and au.email = users.username || '@maya.local')
) with check (
  users.auth_id is null or users.auth_id = auth.uid()
);

-- 3. Endurecer: impedir inserts directos a users desde cliente (solo admin)
-- (Si ya existe users_admin_all policy de fase 1, esto ya está cubierto para inserts; opcionalmente se puede agregar una para bloquear completamente inserts si no admin)
create policy if not exists users_insert_admin_only on users for insert with check (
  exists (select 1 from users u2 where u2.auth_id = auth.uid() and u2.rol='admin')
);

-- 4. Opcional: remover campo password (recomendado una vez todo migrado)
-- alter table users drop column password; -- Ejecutar SOLO cuando estés seguro

-- 5. Verificación
-- select username, rol, auth_id is not null as linked from users order by 1;
-- select * from users where auth_id is null;

-- 6. Limpieza: una vez todas las filas tengan auth_id y password ya no se use, elimina users_link_self_once policy si la creaste.
-- drop policy users_link_self_once on users;  -- ejecutar tras verificar

-- FIN FASE 2
