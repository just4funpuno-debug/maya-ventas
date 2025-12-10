/**
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * 
 * Este archivo ha sido reemplazado por `supabaseClient.js` como parte de la migración
 * de Firebase a Supabase (Fase 7).
 * 
 * Mantenido solo para referencia histórica. No debe ser importado en código nuevo.
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCF-q5TvekwqvO4s1SavFlX4zpO5q_FIZY",
  authDomain: "maya-ventas.firebaseapp.com",
  projectId: "maya-ventas",
  storageBucket: "maya-ventas.firebasestorage.app",
  messagingSenderId: "696160231725",
  appId: "1:696160231725:web:279d5b1a375a710ecd33a4",
  measurementId: "G-QVF0QV6LBN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);