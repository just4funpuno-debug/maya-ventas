// Edge Function unificada para manejar contraseñas de usuarios (crear y actualizar)
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

    // Crear cliente admin para verificar rol (evita problemas de RLS)
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

    // Verificar que el usuario sea admin usando cliente admin (evita RLS)
    // Intentar primero por id, luego por email/username
    let userData = null;
    let userDataError = null;
    
    // Intentar buscar por id (debería coincidir con auth.users.id)
    const { data: userById, error: errorById } = await supabaseAdmin
      .from('users')
      .select('id, rol, username')
      .eq('id', user.id)
      .single()
    
    if (userById && !errorById) {
      userData = userById;
    } else {
      // Si no se encuentra por id, intentar por email/username
      console.log('Usuario no encontrado por id, intentando por email/username:', { userId: user.id, email: user.email })
      const { data: userByEmail, error: errorByEmail } = await supabaseAdmin
        .from('users')
        .select('id, rol, username')
        .eq('username', user.email || '')
        .single()
      
      if (userByEmail && !errorByEmail) {
        userData = userByEmail;
      } else {
        userDataError = errorByEmail || errorById;
      }
    }

    if (userDataError || !userData || userData.rol !== 'admin') {
      console.error('Error verificando rol:', { 
        userDataError, 
        userData, 
        authUserId: user.id,
        authUserEmail: user.email,
        foundUserRol: userData?.rol || 'no encontrado'
      })
      return new Response(
        JSON.stringify({ 
          error: 'No autorizado. Solo administradores pueden gestionar contraseñas.',
          details: userDataError?.message || `Usuario con rol: ${userData?.rol || 'no encontrado'}`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del body
    const { userId, password, action = 'update' } = await req.json()
    
    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: 'userId y password son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // El cliente admin ya está creado arriba para verificar el rol

    // Buscar el usuario en auth.users
    // Primero intentar por ID directo, luego buscar en la tabla users para obtener el email/username
    let targetAuthUserId = userId;
    let userFoundInAuth = false;

    // Intentar obtener el usuario de auth.users por ID
    const { data: authUserById, error: authErrorById } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authUserById?.user) {
      // Usuario encontrado por ID, usar ese ID
      targetAuthUserId = authUserById.user.id;
      userFoundInAuth = true;
      console.log('Usuario encontrado en auth.users por ID:', { targetAuthUserId });
    } else {
      // Si no se encuentra por ID, buscar en la tabla users para obtener el email/username
      console.log('Usuario no encontrado en auth.users por ID, buscando en tabla users:', { userId });
      const { data: userFromTable, error: userTableError } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();
      
      if (userFromTable && userFromTable.username) {
        // Buscar en auth.users por email/username
        const emailToSearch = userFromTable.username.toLowerCase().trim();
        console.log('Buscando usuario en auth.users por email/username:', { emailToSearch });
        
        const { data: authUsersList, error: authErrorList } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authUsersList?.users) {
          const foundUser = authUsersList.users.find(u => 
            u.email?.toLowerCase().trim() === emailToSearch
          );
          
          if (foundUser) {
            targetAuthUserId = foundUser.id;
            userFoundInAuth = true;
            console.log('Usuario encontrado en auth.users por email:', { targetAuthUserId, email: foundUser.email });
          }
        }
      }
    }

    // Verificar que encontramos el usuario en auth.users
    if (!userFoundInAuth) {
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no encontrado en Auth. Verifica que el usuario existe en auth.users.',
          details: `No se pudo encontrar el usuario con ID: ${userId} en auth.users. Asegúrate de que el usuario fue creado correctamente en Supabase Auth.`
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result;

    if (action === 'create') {
      // Para crear: verificar si el usuario ya existe
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(targetAuthUserId);
      
      if (existingUser?.user) {
        // Si existe, actualizar contraseña
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          targetAuthUserId,
          { password: password }
        );

        if (updateError) {
          throw updateError;
        }

        result = { user: updatedUser.user, action: 'updated' };
      } else {
        return new Response(
          JSON.stringify({ error: 'Usuario no encontrado en Auth. Debe crearse primero con signUp.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Para actualizar: cambiar contraseña del usuario existente
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetAuthUserId,
        { password: password }
      )

      if (updateError) {
        console.error('Error actualizando contraseña:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Error al actualizar contraseña',
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      result = { user: updatedUser.user, action: 'updated' };
    }

    // Retornar éxito
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Contraseña ${result.action === 'updated' ? 'actualizada' : 'establecida'} exitosamente`,
        userId: result.user?.id || userId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error en manage-user-password function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

