// Script para registrar el usuario admin en Firebase Auth y Firestore
import { registerUser } from './firebaseAuthUtils';

async function createAdmin() {
  try {
    const user = await registerUser('pedroadmin', 'pedro123', 'admin');
    console.log('Usuario admin creado:', user.uid);
  } catch (e) {
    console.error('Error creando usuario admin:', e);
  }
}

createAdmin();
