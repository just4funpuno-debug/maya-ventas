# Crear Usuario pedroadmin en Supabase Auth

## ⚠️ IMPORTANTE: Usa la UI de Supabase (Más Fácil y Confiable)

**Los scripts SQL pueden fallar por permisos. La forma más fácil es usar la UI:**

### Pasos en la UI de Supabase:

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral, ve a **Authentication** > **Users**
4. Haz clic en el botón **"Add user"** (arriba a la derecha) o **"Invite user"**
5. En el modal que aparece:
   - **Email**: `pedroadmin` (en minúsculas, sin @mayalife.shop)
   - **Password**: `pedro123`
   - **Auto Confirm User**: ✅ **MARCAR ESTA OPCIÓN** (muy importante)
6. Haz clic en **"Create user"** o **"Send invitation"**

### Verificar que se creó:

Después de crear, deberías ver el usuario en la lista con:
- Email: `pedroadmin`
- Status: "Confirmed" o "Active"

## Opción 2: Usando SQL (Solo si la UI no funciona)

Si por alguna razón no puedes usar la UI, intenta ejecutar `scripts/create-pedroadmin-simple.sql` en el SQL Editor.

## Opción 3: Usando el Dashboard de Supabase

1. Ve a **Authentication** > **Users**
2. Haz clic en **"Add user"**
3. Selecciona **"Create new user"**
4. Ingresa:
   - Email: `pedroadmin` (username directamente, sin @mayalife.shop)
   - Password: `pedro123`
   - Marca **"Auto Confirm User"**
5. Haz clic en **"Create user"**

## Verificar que funciona

Después de crear el usuario, intenta hacer login en localhost con:
- **Usuario**: `pedroadmin`
- **Contraseña**: `pedro123` (o la que hayas configurado)

## Nota Importante

El sistema ahora usa el username directamente como email (sin agregar dominio). 
Por lo tanto, cuando ingreses `pedroadmin`, el sistema buscará `pedroadmin` directamente en Supabase Auth.

