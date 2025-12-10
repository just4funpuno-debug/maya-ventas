-- Script para quitar @mayalife.shop de todos los usuarios en Supabase Auth
-- Ejecutar en Supabase SQL Editor
-- 
-- Este script actualiza los emails de los usuarios en auth.users
-- cambiando de "username@mayalife.shop" a "username"

-- 1. Actualizar emails en auth.users (quitar @mayalife.shop)
UPDATE auth.users
SET 
  email = REPLACE(email, '@mayalife.shop', ''),
  updated_at = now()
WHERE email LIKE '%@mayalife.shop';

-- 2. Verificar cambios
SELECT 
  id,
  email,
  raw_user_meta_data->>'username' as username,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%@mayalife.shop' OR email NOT LIKE '%@%'
ORDER BY created_at DESC;

-- 3. Verificar vinculación entre users y auth.users
-- (Comparar username de users con email de auth.users)
SELECT 
  u.username as users_username,
  u.rol,
  au.email as auth_email,
  au.id as auth_user_id,
  CASE 
    WHEN au.email = u.username THEN 'Vinculado ✓'
    ELSE 'No vinculado ✗'
  END as estado
FROM users u
LEFT JOIN auth.users au ON au.email = u.username
ORDER BY u.username;

