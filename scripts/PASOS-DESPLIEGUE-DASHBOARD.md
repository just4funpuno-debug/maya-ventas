# Pasos para Desplegar Edge Function desde Dashboard

## Opción 1: Usar el Editor (Recomendado)

1. **Haz clic en "Open Editor"** en la tarjeta "Via Editor" (la primera tarjeta con los símbolos `<>`)

2. **Se abrirá un editor de código**. Ahora:
   - **Nombre de la función**: Escribe `delete-user` en el campo de nombre
   - **Código**: Reemplaza todo el código que aparece por defecto con el código de `supabase/functions/delete-user/index.ts`

3. **Haz clic en "Deploy"** o "Save" para desplegar

## Opción 2: Usar el botón verde "Deploy a new function"

1. **Haz clic en el botón verde "Deploy a new function"** (arriba a la derecha)

2. **Selecciona "Via Editor"** o simplemente sigue los pasos que aparezcan

3. **Nombre**: `delete-user`

4. **Código**: Copia el contenido de `supabase/functions/delete-user/index.ts`

5. **Deploy**

## Código a copiar

El código completo está en: `supabase/functions/delete-user/index.ts`

Si necesitas copiarlo directamente, aquí está:

```typescript
// Edge Function para eliminar usuarios de Supabase Auth
// Esta función requiere autenticación y permisos de admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener el token de autorización del header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Token de autorización requerido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Usuario no autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea admin
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || userData.rol !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Solo administradores pueden eliminar usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener el ID del usuario a eliminar del body
    const { userId } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No permitir que un admin se elimine a sí mismo
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente con service_role para eliminar de Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Eliminar usuario de auth.users usando Admin API
    const { data: deletedUser, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error eliminando usuario de Auth:', deleteError)
      return new Response(
        JSON.stringify({ 
          error: 'Error al eliminar usuario de Auth',
          details: deleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retornar éxito
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuario eliminado de Auth exitosamente',
        userId: deletedUser?.id || userId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error en delete-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Verificación

Después de desplegar, deberías ver la función `delete-user` en la lista de Edge Functions.

La URL de la función será:
`https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/delete-user`


