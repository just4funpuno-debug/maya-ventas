# Desplegar Edge Function para Eliminar Usuarios

Esta guía te ayudará a desplegar la Edge Function `delete-user` en Supabase.

## Requisitos Previos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Autenticado en Supabase CLI**
   ```bash
   supabase login
   ```

3. **Vinculado a tu proyecto**
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   (Puedes obtener el project-ref desde la URL de tu proyecto en Supabase Dashboard)

## Pasos para Desplegar

### 1. Verificar que estás en el directorio del proyecto
```bash
cd "E:\MAYA LIFE AND BEAUTY\INVENTARIO VENTAS\maya-ventas-mvp-vite-no-backticks"
```

### 2. Desplegar la función
```bash
supabase functions deploy delete-user
```

### 3. Verificar el despliegue
Después del despliegue, deberías ver un mensaje de éxito con la URL de la función.

## Configurar Variables de Entorno en Supabase

La función necesita acceso a las siguientes variables de entorno (se configuran automáticamente, pero puedes verificar):

1. Ve a tu proyecto en Supabase Dashboard
2. Settings → Edge Functions
3. Verifica que las siguientes variables estén configuradas:
   - `SUPABASE_URL` (automática)
   - `SUPABASE_ANON_KEY` (automática)
   - `SUPABASE_SERVICE_ROLE_KEY` (automática)

## Probar la Función

Puedes probar la función desde el código o usando curl:

```bash
curl -X POST https://tu-project-ref.supabase.co/functions/v1/delete-user \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "uuid-del-usuario"}'
```

## Notas Importantes

- La función requiere que el usuario esté autenticado
- Solo usuarios con rol `admin` pueden eliminar otros usuarios
- Un admin no puede eliminarse a sí mismo
- La función elimina el usuario de `auth.users`, pero la eliminación de la tabla `users` se hace desde el frontend

## Solución de Problemas

Si encuentras errores:

1. **Error de autenticación**: Verifica que estés pasando el token de sesión correcto
2. **Error 403**: Verifica que el usuario tenga rol `admin` en la tabla `users`
3. **Error 500**: Revisa los logs en Supabase Dashboard → Edge Functions → Logs


