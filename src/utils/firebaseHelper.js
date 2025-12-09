/**
 * Helper para cargar Firebase dinámicamente
 * Este módulo separado evita que Vite analice estáticamente los imports
 */

/**
 * Obtiene datos de usuario desde Firestore
 * @param {string} userId - ID del usuario
 * @returns {Promise<object|null>} - Datos del usuario o null
 */
export async function getUserDataFromFirestore(userId) {
  try {
    // Construir paths dinámicamente para evitar análisis estático de Vite
    const firebasePath = '../_deprecated/firebase';
    const firestorePath = 'firebase/firestore';
    
    // Import dinámico usando paths construidos
    const [firebaseModule, firestoreModule] = await Promise.all([
      import(/* @vite-ignore */ firebasePath).catch(() => null),
      import(/* @vite-ignore */ firestorePath).catch(() => null)
    ]);
    
    if (!firebaseModule || !firestoreModule) {
      console.warn('[getUserDataFromFirestore] Firebase no disponible');
      return null;
    }
    
    const { db } = firebaseModule;
    const { doc, getDoc } = firestoreModule;
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      return { id: userId, ...userDoc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('[getUserDataFromFirestore] Error:', error);
    return null;
  }
}

