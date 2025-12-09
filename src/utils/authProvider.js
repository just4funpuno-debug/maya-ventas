/**
 * Proveedor de Autenticación Unificado
 * 
 * Detecta automáticamente el entorno y usa:
 * - Supabase Auth en desarrollo (localhost)
 * - Firebase Auth en producción (Vercel)
 * 
 * Esta capa de abstracción permite mantener ambos sistemas funcionando
 * durante la transición de Firebase a Supabase.
 */

import { isDev, isProd } from './envValidation';

/**
 * Determina qué proveedor de autenticación usar
 * @returns {'supabase' | 'firebase'}
 */
export function getAuthProvider() {
  // Si estamos en desarrollo, usar Supabase
  if (isDev()) {
    return 'supabase';
  }
  
  // Si estamos en producción, usar Firebase
  if (isProd()) {
    return 'firebase';
  }
  
  // Por defecto, usar Supabase
  return 'supabase';
}

/**
 * Login de usuario (usa el proveedor según el entorno)
 * @param {string} usernameOrEmail - Username o email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<object>} - Usuario autenticado
 */
export async function loginUser(usernameOrEmail, password) {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { loginUser: supabaseLogin } = await import('../supabaseAuthUtils');
    return await supabaseLogin(usernameOrEmail, password);
  } else {
    // Firebase Auth - usar path dinámico
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseAuthUtils = 'firebaseAuthUtils';
    const firebasePath = `${baseDir}${deprecated}/${firebaseAuthUtils}`;
    const { loginUser: firebaseLogin } = await import(/* @vite-ignore */ firebasePath).catch(() => {
      throw new Error('Firebase no disponible');
    });
    return await firebaseLogin(usernameOrEmail, password);
  }
}

/**
 * Registro de usuario (usa el proveedor según el entorno)
 * @param {string} username - Username del usuario
 * @param {string} password - Contraseña
 * @param {string} rol - Rol del usuario (default: "vendedora")
 * @returns {Promise<object>} - Usuario creado
 */
export async function registerUser(username, password, rol = "vendedora") {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { registerUser: supabaseRegister } = await import('../supabaseAuthUtils');
    return await supabaseRegister(username, password, rol);
  } else {
    // Firebase Auth - usar path dinámico
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseAuthUtils = 'firebaseAuthUtils';
    const firebasePath = `${baseDir}${deprecated}/${firebaseAuthUtils}`;
    const { registerUser: firebaseRegister } = await import(/* @vite-ignore */ firebasePath).catch(() => {
      throw new Error('Firebase no disponible');
    });
    return await firebaseRegister(username, password, rol);
  }
}

/**
 * Cambiar contraseña (usa el proveedor según el entorno)
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function changePassword(currentPassword, newPassword) {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { changePassword: supabaseChangePassword } = await import('../supabaseAuthUtils');
    return await supabaseChangePassword(currentPassword, newPassword);
  } else {
    // Firebase Auth - usar path dinámico
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseAuthUtils = 'firebaseAuthUtils';
    const firebasePath = `${baseDir}${deprecated}/${firebaseAuthUtils}`;
    const { changePassword: firebaseChangePassword } = await import(/* @vite-ignore */ firebasePath).catch(() => {
      throw new Error('Firebase no disponible');
    });
    return await firebaseChangePassword(currentPassword, newPassword);
  }
}

/**
 * Obtener usuario actual (usa el proveedor según el entorno)
 * @returns {Promise<object|null>} - Usuario actual o null
 */
export async function getCurrentUser() {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { getCurrentUser: supabaseGetCurrentUser } = await import('../supabaseAuthUtils');
    return await supabaseGetCurrentUser();
  } else {
    // Firebase Auth - usar path dinámico
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseFile = 'firebase';
    const firebasePath = `${baseDir}${deprecated}/${firebaseFile}`;
    const { auth } = await import(/* @vite-ignore */ firebasePath).catch(() => {
      return { auth: { currentUser: null } };
    });
    return auth.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName
    } : null;
  }
}

/**
 * Cerrar sesión (usa el proveedor según el entorno)
 * @returns {Promise<void>}
 */
export async function signOut() {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { signOut: supabaseSignOut } = await import('../supabaseAuthUtils');
    return await supabaseSignOut();
  } else {
    // Firebase Auth - usar path dinámico
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseFile = 'firebase';
    const firebasePath = `${baseDir}${deprecated}/${firebaseFile}`;
    const { auth } = await import(/* @vite-ignore */ firebasePath).catch(() => {
      throw new Error('Firebase no disponible');
    });
    return await auth.signOut();
  }
}

/**
 * Observar cambios en el estado de autenticación
 * @param {function} callback - Función que se ejecuta cuando cambia el estado
 * @returns {Promise<function>} - Función para desuscribirse
 */
export async function onAuthStateChanged(callback) {
  const provider = getAuthProvider();
  
  if (provider === 'supabase') {
    const { onAuthStateChanged: supabaseOnAuthStateChanged } = await import('../supabaseAuthUtils');
    return supabaseOnAuthStateChanged(callback);
  } else {
    // Firebase Auth - usar paths dinámicos
    const baseDir = '../../';
    const deprecated = '_deprecated';
    const firebaseFile = 'firebase';
    const firebaseMod = 'firebase';
    const authMod = 'auth';
    
    const firebasePath = `${baseDir}${deprecated}/${firebaseFile}`;
    const firebaseAuthPath = `${firebaseMod}/${authMod}`;
    
    const [{ auth }, { onAuthStateChanged: firebaseOnAuthStateChanged }] = await Promise.all([
      import(/* @vite-ignore */ firebasePath).catch(() => {
        throw new Error('Firebase no disponible');
      }),
      import(/* @vite-ignore */ firebaseAuthPath).catch(() => {
        throw new Error('Firebase Auth no disponible');
      })
    ]);
    
    return firebaseOnAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
      } else {
        callback(null);
      }
    });
  }
}

