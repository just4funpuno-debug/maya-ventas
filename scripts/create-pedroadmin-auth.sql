-- Script para crear el usuario pedroadmin en Supabase Auth
-- Ejecutar en Supabase SQL Editor
-- 
-- NOTA: Este script crea el usuario directamente en auth.users
-- La contraseña será: pedro123 (debe cambiarse después del primer login)

-- 1. Crear usuario en auth.users (solo si no existe)
DO $$
DECLARE
  auth_user_id uuid;
  users_table_id uuid;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'pedroadmin'
  LIMIT 1;
  
  -- Si no existe, crearlo
  IF auth_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- instance_id
      gen_random_uuid(), -- id único para el usuario
      'authenticated', -- aud
      'authenticated', -- role
      'pedroadmin', -- email (username directamente, sin @mayalife.shop)
      crypt('pedro123', gen_salt('bf')), -- encrypted_password (bcrypt hash de 'pedro123')
      now(), -- email_confirmed_at
      NULL, -- recovery_sent_at
      NULL, -- last_sign_in_at
      '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
      '{"username":"pedroadmin"}', -- raw_user_meta_data
      now(), -- created_at
      now(), -- updated_at
      '', -- confirmation_token
      '', -- email_change
      '', -- email_change_token_new
      '' -- recovery_token
    )
    RETURNING id INTO auth_user_id;
    
    RAISE NOTICE 'Usuario pedroadmin creado en auth.users con id: %', auth_user_id;
  ELSE
    RAISE NOTICE 'Usuario pedroadmin ya existe en auth.users con id: %', auth_user_id;
  END IF;

  -- 2. Vincular el usuario de auth.users con la tabla users (si existe)
  IF auth_user_id IS NOT NULL THEN
    -- Buscar el usuario en la tabla users por username
    SELECT id INTO users_table_id
    FROM users
    WHERE username = 'pedroadmin'
    LIMIT 1;
    
    -- Si existe en users, actualizar auth_id
    IF users_table_id IS NOT NULL THEN
      UPDATE users
      SET auth_id = auth_user_id
      WHERE id = users_table_id;
      
      RAISE NOTICE 'Usuario pedroadmin vinculado: auth_id = %, users.id = %', auth_user_id, users_table_id;
    ELSE
      RAISE NOTICE 'Usuario pedroadmin creado en auth.users pero no encontrado en tabla users';
    END IF;
  END IF;
END $$;

-- 3. Verificar que se creó correctamente
SELECT 
  u.id as auth_id,
  u.email,
  u.raw_user_meta_data->>'username' as username,
  us.id as users_table_id,
  us.username as users_username,
  us.auth_id as linked_auth_id
FROM auth.users u
LEFT JOIN users us ON us.auth_id = u.id OR us.username = 'pedroadmin'
WHERE u.email = 'pedroadmin';

