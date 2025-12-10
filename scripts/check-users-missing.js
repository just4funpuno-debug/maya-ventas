/**
 * Script para verificar usuarios faltantes
 * Compara usuarios en Firebase Auth vs Firestore vs Supabase
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const serviceAccount = JSON.parse(
  await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const auth = admin.auth();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando usuarios...\n');

// Firebase Auth
const authUsers = await auth.listUsers();
console.log('📊 Firebase Auth:', authUsers.users.length, 'usuarios');
authUsers.users.forEach(u => {
  const username = u.email?.replace('@mayalife.shop', '') || u.uid.substring(0, 8);
  console.log(`  - ${username} (${u.email || 'sin email'})`);
});

// Firebase Firestore
const firestoreSnapshot = await db.collection('users').get();
const firestoreUsers = firestoreSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
console.log('\n📊 Firebase Firestore:', firestoreUsers.length, 'usuarios');
firestoreUsers.forEach(u => {
  console.log(`  - ${u.username || u.id} (ID: ${u.id})`);
});

// Supabase
const { data: supabaseUsers } = await supabase.from('users').select('username');
console.log('\n📊 Supabase (datos):', supabaseUsers?.length || 0, 'usuarios');
supabaseUsers?.forEach(u => {
  console.log(`  - ${u.username}`);
});

// Comparar
console.log('\n🔍 Análisis:');
const authUsernames = authUsers.users.map(u => {
  const email = u.email || '';
  return email.includes('@mayalife.shop') ? email.replace('@mayalife.shop', '') : u.uid;
});
const firestoreUsernames = firestoreUsers.map(u => u.username || u.id);
const supabaseUsernames = supabaseUsers?.map(u => u.username) || [];

console.log('\n❌ Usuarios en Auth pero NO en Firestore:');
authUsernames.forEach(username => {
  if (!firestoreUsernames.includes(username)) {
    const authUser = authUsers.users.find(u => {
      const email = u.email || '';
      return email.includes('@mayalife.shop') ? email.replace('@mayalife.shop', '') === username : u.uid === username;
    });
    console.log(`  - ${username} (${authUser?.email || 'sin email'})`);
  }
});

console.log('\n❌ Usuarios en Firestore pero NO en Supabase:');
firestoreUsernames.forEach(username => {
  if (!supabaseUsernames.includes(username)) {
    console.log(`  - ${username}`);
  }
});

process.exit(0);



