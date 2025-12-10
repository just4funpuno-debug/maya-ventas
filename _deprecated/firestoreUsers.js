/**
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * 
 * Este archivo ha sido reemplazado por `supabaseUsers.js` como parte de la migración
 * de Firebase a Supabase (Fase 7.4).
 * 
 * **NO USAR ESTE ARCHIVO** - Todas las funciones han sido migradas a Supabase:
 * - `subscribeCollection()` → `supabaseUsers.subscribeCollection()`
 * - `getAllUsers()` → `supabaseUsers.getAllUsers()`
 * - `subscribeUsers()` → `supabaseUsers.subscribeUsers()`
 * - `normalizeUserDoc()` → `supabaseUsers.normalizeUser()`
 * 
 * Este archivo se mantiene temporalmente para referencia durante la migración,
 * pero será eliminado en la Subfase 7.4.5 (Limpieza final).
 * 
 * Fecha de obsolescencia: 2025-01-27
 * Reemplazado por: src/supabaseUsers.js
 */

// Suscripción genérica a cualquier colección de Firestore
// Uso: subscribeCollection('almacenCentral', callback)

// ⚠️ OBSOLETO - Usar supabaseUsers.js en su lugar
export function subscribeCollection(colName, callback) {
	console.warn('[firestoreUsers] ⚠️ subscribeCollection está obsoleto. Usa supabaseUsers.subscribeCollection()');
	return onSnapshot(collection(db, colName), snap => {
		const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
		callback(list);
	});
}

// Utilidades para manejar la colección 'users' y suscripciones genéricas en Firestore
// IMPORTANTE: Nunca guardar contraseñas aquí; sólo en Firebase Auth.
import { getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// ⚠️ OBSOLETO - Usar supabaseUsers.js en su lugar
// Leer todos los usuarios una sola vez
export async function getAllUsers() {
	console.warn('[firestoreUsers] ⚠️ getAllUsers está obsoleto. Usa supabaseUsers.getAllUsers()');
	const snap = await getDocs(collection(db, 'users'));
	return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ⚠️ OBSOLETO - Usar supabaseUsers.js en su lugar
// Suscripción en tiempo real; retorna función para desuscribir
export function subscribeUsers(callback) {
	console.warn('[firestoreUsers] ⚠️ subscribeUsers está obsoleto. Usa supabaseUsers.subscribeUsers()');
	const colRef = collection(db, 'users');
	return onSnapshot(colRef, snap => {
		const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
		callback(list);
	});
}

// ⚠️ OBSOLETO - Usar supabaseUsers.js en su lugar
// Normalizador (placeholder para evoluciones futuras)
export function normalizeUserDoc(u){
	console.warn('[firestoreUsers] ⚠️ normalizeUserDoc está obsoleto. Usa supabaseUsers.normalizeUser()');
	return { ...u };
}

