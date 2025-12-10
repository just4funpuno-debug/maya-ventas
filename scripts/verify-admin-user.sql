-- Script para verificar si un usuario tiene rol 'admin' en la tabla users
-- Reemplaza 'pedroadmin' con el username del usuario que quieres verificar

-- Verificar usuario por username
SELECT 
  u.id,
  u.username,
  u.rol,
  u.nombre,
  u.apellidos,
  au.id as auth_id,
  au.email as auth_email,
  au.confirmed_at as auth_confirmed
FROM users u
LEFT JOIN auth.users au ON u.id = au.id OR u.username = au.email
WHERE u.username ILIKE '%pedroadmin%' OR au.email ILIKE '%pedroadmin%';

-- Verificar todos los usuarios con rol 'admin'
SELECT 
  u.id,
  u.username,
  u.rol,
  u.nombre,
  u.apellidos,
  au.id as auth_id,
  au.email as auth_email,
  CASE 
    WHEN u.id = au.id THEN 'ID coincide'
    WHEN u.username = au.email THEN 'Username coincide con email'
    ELSE 'No coincide'
  END as vinculacion
FROM users u
LEFT JOIN auth.users au ON u.id = au.id OR u.username = au.email
WHERE u.rol = 'admin';


