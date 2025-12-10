-- Script para verificar y corregir el case del usuario pedroadmin
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar usuarios con diferentes casos
SELECT 
  id,
  email,
  LOWER(email) as email_lowercase,
  email_confirmed_at IS NOT NULL as is_confirmed,
  created_at
FROM auth.users
WHERE LOWER(email) = 'pedroadmin'
ORDER BY created_at DESC;

-- 2. Si hay un usuario con mayúsculas, actualizarlo a minúsculas
UPDATE auth.users
SET 
  email = LOWER(email),
  updated_at = now()
WHERE LOWER(email) = 'pedroadmin' AND email != LOWER(email);

-- 3. Si hay múltiples usuarios (uno en mayúsculas y otro en minúsculas),
-- eliminar el duplicado en mayúsculas (mantener el de minúsculas)
DO $$
DECLARE
  lower_user_id uuid;
  upper_user_id uuid;
BEGIN
  -- Obtener ID del usuario en minúsculas
  SELECT id INTO lower_user_id
  FROM auth.users
  WHERE email = 'pedroadmin'
  LIMIT 1;
  
  -- Obtener ID del usuario en mayúsculas (si existe)
  SELECT id INTO upper_user_id
  FROM auth.users
  WHERE email = 'PEDROADMIN'
  LIMIT 1;
  
  -- Si ambos existen, eliminar el de mayúsculas
  IF lower_user_id IS NOT NULL AND upper_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = upper_user_id;
    RAISE NOTICE 'Usuario duplicado en mayúsculas eliminado (ID: %)', upper_user_id;
  END IF;
END $$;

-- 4. Verificar resultado final
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE LOWER(email) = 'pedroadmin';



