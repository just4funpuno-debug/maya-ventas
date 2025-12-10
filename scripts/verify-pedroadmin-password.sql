-- Script para verificar y actualizar la contraseña de pedroadmin en Supabase Auth
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el usuario existe
SELECT 
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'pedroadmin';

-- 2. Si el usuario existe pero la contraseña no funciona, actualizarla
-- NOTA: Esto requiere permisos de administrador en Supabase
-- La contraseña será: pedro123

DO $$
DECLARE
  user_exists boolean;
  user_id uuid;
BEGIN
  -- Verificar si el usuario existe
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'pedroadmin') INTO user_exists;
  
  IF user_exists THEN
    -- Obtener el ID del usuario
    SELECT id INTO user_id FROM auth.users WHERE email = 'pedroadmin' LIMIT 1;
    
    -- Actualizar la contraseña usando bcrypt
    UPDATE auth.users
    SET 
      encrypted_password = crypt('pedro123', gen_salt('bf')),
      updated_at = now()
    WHERE id = user_id;
    
    RAISE NOTICE 'Contraseña actualizada para pedroadmin (ID: %)', user_id;
  ELSE
    RAISE NOTICE 'Usuario pedroadmin no existe en auth.users';
  END IF;
END $$;

-- 3. Verificar nuevamente
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE email = 'pedroadmin';

