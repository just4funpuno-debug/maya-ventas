# Edge Function: Eliminar Usuarios de Auth

Esta Edge Function permite eliminar usuarios de Supabase Auth de forma segura, sin exponer la `service_role` key en el frontend.

## 📁 Estructura

```
supabase/
  └── functions/
      └── delete-user/
          └── index.ts    # Código de la función
```

## 🔐 Seguridad

La función implementa las siguientes medidas de seguridad:

1. **Autenticación requerida**: El usuario debe estar autenticado
2. **Verificación de rol**: Solo usuarios con rol `admin` pueden eliminar otros usuarios
3. **Protección contra auto-eliminación**: Un admin no puede eliminarse a sí mismo
4. **Service Role Key protegida**: La key solo existe en el servidor (Edge Function), nunca en el frontend

## 🚀 Despliegue

### Opción 1: Usando el script PowerShell (Windows)

```powershell
.\scripts\deploy-delete-user-function.ps1
```

### Opción 2: Manualmente

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Autenticarte**:
   ```bash
   supabase login
   ```

3. **Vincular tu proyecto**:
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   (Obtén el `project-ref` desde la URL de tu proyecto en Supabase Dashboard)

4. **Desplegar la función**:
   ```bash
   supabase functions deploy delete-user
   ```

## 📝 Uso desde el Frontend

La función se llama automáticamente desde `src/supabaseAuthUtils.js` cuando se elimina un usuario:

```javascript
import { deleteUserFromAuth } from './supabaseAuthUtils';

const result = await deleteUserFromAuth(userId);
if (result.success) {
  console.log('Usuario eliminado de Auth');
} else {
  console.error('Error:', result.error);
}
```

## 🔍 Verificación

Después del despliegue, puedes verificar que la función está disponible:

1. Ve a tu proyecto en Supabase Dashboard
2. Edge Functions → `delete-user`
3. Deberías ver la función listada

## 🐛 Solución de Problemas

### Error: "No autorizado"
- Verifica que el usuario esté autenticado
- Verifica que el usuario tenga rol `admin` en la tabla `users`

### Error: "Function not found"
- Verifica que la función esté desplegada: `supabase functions list`
- Verifica que estés usando la URL correcta de tu proyecto

### Error: "Service role key not found"
- Las variables de entorno se configuran automáticamente
- Si persiste, verifica en Supabase Dashboard → Settings → Edge Functions

## 📚 Documentación Adicional

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)


