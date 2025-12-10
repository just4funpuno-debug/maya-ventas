# Desplegar Edge Function desde Supabase Dashboard

Como alternativa al CLI, puedes desplegar la función directamente desde el Dashboard de Supabase.

## Pasos:

### 1. Ve al Dashboard de Supabase
Abre: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz

### 2. Ve a Edge Functions
- En el menú lateral, haz clic en **"Edge Functions"**
- O ve directamente a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions

### 3. Crear nueva función
- Haz clic en **"Create a new function"** o **"New Function"**
- Nombre: `delete-user`

### 4. Copiar el código
Copia el contenido completo del archivo `supabase/functions/delete-user/index.ts` y pégalo en el editor.

### 5. Desplegar
- Haz clic en **"Deploy"** o **"Save"**

¡Listo! La función estará disponible en:
`https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/delete-user`


