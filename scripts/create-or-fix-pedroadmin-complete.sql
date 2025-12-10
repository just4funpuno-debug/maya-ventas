-- Script completo para crear o corregir el usuario pedroadmin en Supabase Auth
-- Ejecutar en Supabase SQL Editor
-- 
-- Este script:
-- 1. Verifica si el usuario existe (en cualquier case)
-- 2. Si existe, actualiza email a minúsculas y contraseña
-- 3. Si no existe, lo crea
-- 4. Asegura que esté confirmado

DO $$
DECLARE
  user_exists boolean;
  user_id uuid;
  user_email text;
BEGIN
  -- 1. Verificar si el usuario existe (case-insensitive)
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = 'pedroadmin'
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Obtener el ID y email actual del usuario
    SELECT id, email INTO user_id, user_email
    FROM auth.users
    WHERE LOWER(email) = 'pedroadmin'
    LIMIT 1;
    
    RAISE NOTICE 'Usuario encontrado: email = %, id = %', user_email, user_id;
    
    -- Actualizar email a minúsculas si no lo está
    IF user_email != 'pedroadmin' THEN
      UPDATE auth.users
      SET 
        email = 'pedroadmin',
        updated_at = now()
      WHERE id = user_id;
      
      RAISE NOTICE 'Email actualizado a minúsculas: pedroadmin';
    END IF;
    
    -- Actualizar contraseña a 'pedro123'
    UPDATE auth.users
    SET 
      encrypted_password = crypt('pedro123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()), -- Confirmar si no está confirmado
      updated_at = now()
    WHERE id = user_id;
    
    RAISE NOTICE 'Contraseña actualizada y usuario confirmado';
    
  ELSE
    -- Crear nuevo usuario
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
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'pedroadmin', -- email en minúsculas
      crypt('pedro123', gen_salt('bf')), -- contraseña: pedro123
      now(), -- email_confirmed_at (confirmado inmediatamente)
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"username":"pedroadmin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    RAISE NOTICE 'Usuario pedroadmin creado con id: %', user_id;
  END IF;
  
  -- Verificar resultado
  SELECT 
    id,
    email,
    email_confirmed_at IS NOT NULL as is_confirmed,
    encrypted_password IS NOT NULL as has_password,
    created_at
  INTO user_id, user_email, user_exists, user_exists, user_exists
  FROM auth.users
  WHERE email = 'pedroadmin';
  
  RAISE NOTICE 'Verificación final: email = %, confirmado = %, tiene contraseña = %', 
    user_email, user_exists, user_exists;
    
END $$;

-- Verificar resultado final
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'pedroadmin';

