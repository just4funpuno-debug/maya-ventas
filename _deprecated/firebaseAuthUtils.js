/**
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * 
 * Este archivo ha sido reemplazado por `supabaseAuthUtils.js` como parte de la migración
 * de Firebase a Supabase (Fase 7).
 * 
 * Mantenido solo para referencia histórica. No debe ser importado en código nuevo.
 */

import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Registro de usuario (username + contraseña, rol opcional)
export async function registerUser(username, password, rol = "vendedora") {
  const email = `${username}@mayalife.shop`;
  // Crea el usuario en Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  // Guarda datos extra en Firestore
  await setDoc(doc(db, "users", user.uid), {
    username,
    rol,
    createdAt: new Date()
  });
  return user;
}

// Login de usuario (acepta username o email)
export async function loginUser(usernameOrEmail, password) {
  let email = usernameOrEmail;
  if (!usernameOrEmail.includes('@')) {
    email = `${usernameOrEmail}@mayalife.shop`;
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Cambiar contraseña del usuario autenticado
export async function changePassword(currentPassword, newPassword) {
  if (!auth.currentUser) throw new Error('No hay usuario autenticado');
  const user = auth.currentUser;
  // Reautenticar
  const email = user.email;
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  // Cambiar contraseña
  await updatePassword(user, newPassword);
}