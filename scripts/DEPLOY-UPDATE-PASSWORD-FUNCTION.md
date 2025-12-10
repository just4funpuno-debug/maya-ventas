# Desplegar Edge Function: update-user-password

## Objetivo
Permitir que los administradores cambien la contraseña de otros usuarios desde el formulario de edición.

## Pasos para Desplegar

### Opción 1: Desde el Dashboard (Recomendado)

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. Haz clic en "Open Editor" o "Deploy a new function"
3. Nombre de la función: `update-user-password`
4. Copia y pega el código de `supabase/functions/update-user-password/index.ts`
5. Haz clic en "Deploy"

### Opción 2: Desde CLI (si tienes Supabase CLI instalado)

```bash
supabase functions deploy update-user-password
```

## Verificación

Después del despliegue, la función estará disponible en:
`https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/update-user-password`

## Funcionalidad

- Solo administradores pueden cambiar contraseñas de otros usuarios
- La contraseña debe tener al menos 6 caracteres
- Si el campo de contraseña está vacío, no se actualiza
- La contraseña se actualiza en Supabase Auth (no solo en la tabla users)

## Testing

1. Edita un usuario vendedora
2. Escribe una nueva contraseña en el campo "Contraseña"
3. Guarda los cambios
4. Intenta iniciar sesión con el usuario y la nueva contraseña
5. Verifica que funciona correctamente


