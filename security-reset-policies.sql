-- security-reset-policies.sql
-- Ejecutar estas sentencias en el SQL editor de Supabase (producción).
-- Objetivo: asegurar que la tabla de marcadores de reset global (resets) existe,
-- tiene RLS y políticas que permiten a los clientes insertar y leer el último reset,
-- y que está incluida en Realtime.

-- 1. Crear tabla si no existe
create extension if not exists "pgcrypto"; -- needed for gen_random_uuid()

create table if not exists public.resets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 2. Habilitar RLS (si no estaba)
alter table public.resets enable row level security;

-- 3. Políticas abiertas (ajusta luego para solo admin si defines auth real)
-- Primero eliminamos si ya existen (DROP POLICY sí soporta IF EXISTS)
drop policy if exists "resets_select_all" on public.resets;
drop policy if exists "resets_insert_all" on public.resets;

-- Lectura (select)
create policy "resets_select_all" on public.resets
  for select using (true);
-- Inserción (insert)
create policy "resets_insert_all" on public.resets
  for insert with check (true);

-- 4. Index opcional para consultas por fecha
create index if not exists idx_resets_created_at on public.resets (created_at desc);

-- 5. Asegurar inclusión en publicación Realtime
-- Nota: si ya estaba agregada arrojará warning; es inofensivo.
-- El ADD table falla si ya estaba; lo envolvemos en bloque
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.resets';
  exception when duplicate_object then
    -- ya estaba en la publicación, ignorar
    null;
  end;
end$$;

-- 6. Verificación rápida (opcional)
-- select * from resets order by created_at desc limit 5;

-- Después de ejecutar esto, vuelve a la app, refresca ambos navegadores y prueba un reset.
