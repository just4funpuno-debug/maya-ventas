-- Script SIMPLE para crear el usuario pedroadmin en Supabase Auth
-- Ejecutar en Supabase SQL Editor
-- 
-- Este script crea el usuario si no existe, o lo actualiza si ya existe

-- 1. Verificar si el usuario existe
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users
WHERE LOWER(email) = 'pedroadmin';

-- 2. Si el usuario NO existe, crearlo
-- Si el usuario YA existe, este INSERT fallará pero no causará error (ON CONFLICT)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'pedroadmin',
  crypt('pedro123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"pedroadmin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE LOWER(email) = 'pedroadmin'
);

-- 3. Si el usuario existe, actualizar su contraseña y confirmarlo
UPDATE auth.users
SET 
  email = 'pedroadmin', -- Asegurar que esté en minúsculas
  encrypted_password = crypt('pedro123', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE LOWER(email) = 'pedroadmin';

-- 4. Verificar resultado
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE email = 'pedroadmin';

