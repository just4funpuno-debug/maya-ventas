/**
 * Proveedor de Autenticación con Supabase
 * 
 * Usa Supabase Auth en todos los entornos (desarrollo y producción).
 * Migración completa desde Firebase a Supabase completada.
 */

/**
 * Determina qué proveedor de autenticación usar
 * @returns {'supabase'} - Siempre retorna Supabase
 */
export function getAuthProvider() {
  // Siempre usar Supabase en todos los entornos
  return 'supabase';
}

/**
 * Login de usuario (usa Supabase Auth)
 * @param {string} usernameOrEmail - Username o email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<object>} - Usuario autenticado
 */
export async function loginUser(usernameOrEmail, password) {
  const { loginUser: supabaseLogin } = await import('../supabaseAuthUtils');
  return await supabaseLogin(usernameOrEmail, password);
}

/**
 * Registro de usuario (usa Supabase Auth)
 * @param {string} username - Username del usuario
 * @param {string} password - Contraseña
 * @param {string} rol - Rol del usuario (default: "vendedora")
 * @returns {Promise<object>} - Usuario creado
 */
export async function registerUser(username, password, rol = "vendedora") {
  const { registerUser: supabaseRegister } = await import('../supabaseAuthUtils');
  return await supabaseRegister(username, password, rol);
}

/**
 * Cambiar contraseña (usa Supabase Auth)
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function changePassword(currentPassword, newPassword) {
  const { changePassword: supabaseChangePassword } = await import('../supabaseAuthUtils');
  return await supabaseChangePassword(currentPassword, newPassword);
}

/**
 * Obtener usuario actual (usa Supabase Auth)
 * @returns {Promise<object|null>} - Usuario actual o null
 */
export async function getCurrentUser() {
  const { getCurrentUser: supabaseGetCurrentUser } = await import('../supabaseAuthUtils');
  return await supabaseGetCurrentUser();
}

/**
 * Cerrar sesión (usa Supabase Auth)
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { signOut: supabaseSignOut } = await import('../supabaseAuthUtils');
  return await supabaseSignOut();
}

/**
 * Observar cambios en el estado de autenticación (usa Supabase Auth)
 * @param {function} callback - Función que se ejecuta cuando cambia el estado
 * @returns {Promise<function>} - Función para desuscribirse
 */
export async function onAuthStateChanged(callback) {
  const { onAuthStateChanged: supabaseOnAuthStateChanged } = await import('../supabaseAuthUtils');
  return supabaseOnAuthStateChanged(callback);
}

