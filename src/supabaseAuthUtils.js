/**
 * Utilidades de Autenticación para Supabase
 * Fase 7.2: Reemplazo completo de firebaseAuthUtils.js
 * 
 * Funciones de autenticación usando Supabase Auth
 */

import { supabase } from './supabaseClient.js';

/**
 * Registro de usuario (username + contraseña, rol opcional)
 * Reemplaza: firebaseAuthUtils.registerUser()
 * 
 * @param {string} username - Username del usuario
 * @param {string} password - Contraseña
 * @param {string} rol - Rol del usuario (default: "vendedora")
 * @returns {Promise<object>} - Usuario creado (compatible con Firebase Auth)
 */
export async function registerUser(username, password, rol = "vendedora") {
  // Usar username directamente como email (sin agregar @mayalife.shop)
  // Normalizar a minúsculas para evitar problemas de case sensitivity
  const email = username.toLowerCase().trim();
  
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (authError) {
      throw new Error(`Error en Supabase Auth: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario en Supabase Auth');
    }

    // 2. Crear registro en tabla users usando el mismo ID que auth.users
    // Esto asegura que el ID coincida y se pueda vincular correctamente
    const userId = authData.user.id;
    
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingUserError) {
      console.warn('[registerUser] Error verificando usuario existente:', existingUserError);
    }

    // Si no existe, crear registro en tabla users con el mismo ID
    if (!existingUser) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId, // Usar el mismo ID que auth.users
          username,
          password: 'TEMPORAL_CHANGE_ME', // Temporal, la contraseña real está en auth
          nombre: username,
          apellidos: '',
          rol: rol === 'admin' ? 'admin' : 'seller',
          fecha_ingreso: new Date().toISOString().split('T')[0],
          productos: [] // Array vacío por defecto
        });

      if (userError) {
        console.warn('[supabaseAuthUtils] Error creando registro en tabla users:', userError);
        // Continuar aunque falle, el usuario ya está en auth
      }
    }

    // 3. Retornar objeto compatible con Firebase Auth
    return {
      uid: authData.user.id,
      email: authData.user.email,
      // Campos adicionales para compatibilidad
      username,
      rol
    };

  } catch (error) {
    console.error('[supabaseAuthUtils] Error en registerUser:', error);
    throw error;
  }
}

/**
 * Login de usuario (acepta username o email)
 * Reemplaza: firebaseAuthUtils.loginUser()
 * 
 * @param {string} usernameOrEmail - Username o email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<object>} - Usuario autenticado (compatible con Firebase Auth)
 */
export async function loginUser(usernameOrEmail, password) {
  // Usar username directamente como email (sin agregar @mayalife.shop)
  // Normalizar a minúsculas para evitar problemas de case sensitivity
  const email = usernameOrEmail.toLowerCase().trim();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Error de autenticación: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No se pudo autenticar el usuario');
    }

    // Retornar objeto compatible con Firebase Auth
    return {
      uid: data.user.id,
      email: data.user.email,
      // Campos adicionales para compatibilidad
      displayName: data.user.user_metadata?.username || usernameOrEmail
    };

  } catch (error) {
    console.error('[supabaseAuthUtils] Error en loginUser:', error);
    throw error;
  }
}

/**
 * Crear usuario en tabla users de Supabase
 * @param {object} userData - Datos del usuario
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function createSupabaseUserData(userData) {
  if (!supabase) {
    return { success: false, error: new Error('Supabase no configurado') };
  }

  try {
    const { error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        password: 'TEMPORAL_CHANGE_ME', // Temporal, se cambiará
        nombre: userData.nombre || userData.username,
        apellidos: userData.apellidos || '',
        celular: userData.celular || null,
        rol: userData.rol || 'seller',
        grupo: userData.grupo || null,
        fecha_ingreso: userData.fechaIngreso || new Date().toISOString().split('T')[0],
        sueldo: Number(userData.sueldo || 0),
        dia_pago: userData.diaPago ? Number(userData.diaPago) : null
      });

    if (error) {
      // Si es error de duplicado, intentar actualizar
      if (error.code === '23505') {
        console.warn('[supabaseAuthUtils] Usuario ya existe en tabla users, actualizando...');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            nombre: userData.nombre || userData.username,
            apellidos: userData.apellidos || '',
            celular: userData.celular || null,
            rol: userData.rol || 'seller',
            grupo: userData.grupo || null,
            sueldo: Number(userData.sueldo || 0),
            dia_pago: userData.diaPago ? Number(userData.diaPago) : null
          })
          .eq('username', userData.username);

        if (updateError) {
          return { success: false, error: updateError };
        }
        return { success: true, error: null };
      }
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[supabaseAuthUtils] Error creando datos de usuario en Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Cambiar contraseña del usuario autenticado
 * Reemplaza: firebaseAuthUtils.changePassword()
 * 
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    // Verificar que hay usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    // Reautenticar con contraseña actual
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (reauthError) {
      throw new Error(`Contraseña actual incorrecta: ${reauthError.message}`);
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      throw new Error(`Error actualizando contraseña: ${updateError.message}`);
    }

  } catch (error) {
    console.error('[supabaseAuthUtils] Error en changePassword:', error);
    throw error;
  }
}

/**
 * Obtener usuario actual autenticado
 * Reemplaza: auth.currentUser de Firebase
 * 
 * @returns {Promise<object|null>} - Usuario actual o null
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      uid: user.id,
      email: user.email,
      displayName: user.user_metadata?.username || null
    };
  } catch (error) {
    console.error('[supabaseAuthUtils] Error obteniendo usuario actual:', error);
    return null;
  }
}

/**
 * Cerrar sesión
 * Reemplaza: auth.signOut() de Firebase
 * 
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(`Error cerrando sesión: ${error.message}`);
    }
  } catch (error) {
    console.error('[supabaseAuthUtils] Error en signOut:', error);
    throw error;
  }
}

/**
 * Observar cambios en el estado de autenticación
 * Reemplaza: onAuthStateChanged() de Firebase
 * 
 * @param {function} callback - Función que se ejecuta cuando cambia el estado
 * @returns {function} - Función para desuscribirse
 */
export function onAuthStateChanged(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback({
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.username || null
      });
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Gestionar contraseña de un usuario usando Edge Function (solo admins)
 * Puede usarse tanto para crear como para actualizar contraseñas
 * 
 * @param {string} userId - ID del usuario en auth.users (UUID)
 * @param {string} password - Contraseña a establecer/actualizar
 * @param {string} action - 'create' o 'update' (default: 'update')
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function manageUserPassword(userId, password, action = 'update') {
  try {
    // Obtener la sesión actual para autenticación
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: new Error('No hay sesión activa. Debes estar autenticado.') };
    }

    const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
      ? import.meta.env.VITE_SUPABASE_URL 
      : process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      return { success: false, error: new Error('VITE_SUPABASE_URL no configurada') };
    }

    // Llamar a la Edge Function unificada
    const response = await fetch(`${supabaseUrl}/functions/v1/manage-user-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password, action })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.details || `Error gestionando contraseña: ${response.statusText}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[supabaseAuthUtils] Error gestionando contraseña:', error);
    return { success: false, error };
  }
}

/**
 * Actualizar contraseña de un usuario (alias para compatibilidad)
 * @deprecated Usar manageUserPassword en su lugar
 */
export async function updateUserPassword(userId, newPassword) {
  return manageUserPassword(userId, newPassword, 'update');
}

/**
 * Eliminar usuario de Supabase Auth usando Edge Function
 * Reemplaza: admin.auth().deleteUser() de Firebase
 * 
 * @param {string} userId - ID del usuario en auth.users (UUID)
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteUserFromAuth(userId) {
  try {
    // Obtener la sesión actual para autenticación
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: new Error('No hay sesión activa. Debes estar autenticado.') };
    }

    const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
      ? import.meta.env.VITE_SUPABASE_URL 
      : process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      return { success: false, error: new Error('VITE_SUPABASE_URL no configurada') };
    }

    // Llamar a la Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.details || `Error eliminando usuario: ${response.statusText}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[supabaseAuthUtils] Error eliminando usuario de Auth:', error);
    return { success: false, error };
  }
}

