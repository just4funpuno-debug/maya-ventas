# Resetear Contraseña de pedroadmin en Supabase

## Opción 1: Usando la UI de Supabase (Más Fácil)

1. Ve a tu proyecto de Supabase
2. Navega a **Authentication** > **Users**
3. Busca el usuario `pedroadmin`
4. Haz clic en los **tres puntos** (⋮) junto al usuario
5. Selecciona **"Reset Password"** o **"Send Password Reset Email"**
6. O simplemente haz clic en el usuario y luego en **"Reset Password"**

**Nota:** Si usas "Send Password Reset Email", el usuario recibirá un email para resetear la contraseña. Como estamos usando username sin dominio, esto podría no funcionar.

## Opción 2: Actualizar Contraseña Directamente (Recomendado)

1. Ve a **Authentication** > **Users**
2. Busca y haz clic en el usuario `pedroadmin`
3. En la sección **"Password"**, haz clic en **"Change Password"** o **"Set Password"**
4. Ingresa la nueva contraseña: `pedro123`
5. Guarda los cambios

## Opción 3: Usando SQL (Avanzado)

Ejecuta el script `scripts/verify-pedroadmin-password.sql` en el SQL Editor de Supabase.

Este script:
- Verifica que el usuario existe
- Actualiza la contraseña a `pedro123` usando bcrypt
- Verifica que se actualizó correctamente

## Verificar que Funciona

Después de actualizar la contraseña, intenta hacer login con:
- **Usuario**: `pedroadmin`
- **Contraseña**: `pedro123`

## Nota Importante

Si el usuario no está "confirmado" (email_confirmed_at es NULL), es posible que necesites confirmarlo manualmente en la UI de Supabase o usando SQL:

```sql
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'pedroadmin';
```



