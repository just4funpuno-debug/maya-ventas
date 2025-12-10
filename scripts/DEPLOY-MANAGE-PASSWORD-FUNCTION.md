# Desplegar Edge Function: manage-user-password

## Objetivo
Función unificada para gestionar contraseñas de usuarios (aunque principalmente se usa para editar).

## Nota Importante
- **Al crear usuario**: La contraseña ya se establece correctamente en `signUp` (no necesita Edge Function)
- **Al editar usuario**: Se usa esta Edge Function para cambiar la contraseña

## Pasos para Desplegar

### Opción 1: Desde el Dashboard (Recomendado)

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. Haz clic en "Open Editor" o "Deploy a new function"
3. Nombre de la función: `manage-user-password`
4. Copia y pega el código de `supabase/functions/manage-user-password/index.ts`
5. Haz clic en "Deploy"

### Opción 2: Desde CLI (si tienes Supabase CLI instalado)

```bash
supabase functions deploy manage-user-password
```

## Verificación

Después del despliegue, la función estará disponible en:
`https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/manage-user-password`

## Funcionalidad

- **Al crear usuario**: La contraseña se establece automáticamente en `signUp` (no necesita esta función)
- **Al editar usuario**: Si se escribe una nueva contraseña, se actualiza usando esta Edge Function
- Solo administradores pueden cambiar contraseñas
- La contraseña debe tener al menos 6 caracteres
- Si el campo de contraseña está vacío al editar, no se actualiza

## Testing

1. **Crear usuario** (no necesita Edge Function):
   - Crea un nuevo usuario con contraseña
   - Verifica que puede iniciar sesión con esa contraseña

2. **Editar contraseña**:
   - Edita un usuario existente
   - Escribe una nueva contraseña
   - Guarda los cambios
   - Intenta iniciar sesión con el usuario y la nueva contraseña
   - Verifica que funciona correctamente


