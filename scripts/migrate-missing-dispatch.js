/**
 * Script para migrar el despacho faltante
 * 
 * Migra el despacho de 2025-11-28, SANTA CRUZ
 * 
 * Uso: node scripts/migrate-missing-dispatch.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Inicializar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔄 Migrando despacho faltante...\n');

// Buscar el despacho en Firebase
const fbDispatch = await db.collection('despachosHistorial')
  .where('fecha', '==', '2025-11-28')
  .where('ciudad', '==', 'SANTA CRUZ')
  .get();

if (fbDispatch.empty) {
  console.error('❌ Despacho no encontrado en Firebase');
  process.exit(1);
}

const dispatchDoc = fbDispatch.docs[0];
const dispatchData = dispatchDoc.data();

console.log('📄 Datos del despacho:');
console.log(`   ID Firebase: ${dispatchDoc.id}`);
console.log(`   Fecha: ${dispatchData.fecha}`);
console.log(`   Ciudad: ${dispatchData.ciudad}`);
console.log(`   Items: ${JSON.stringify(dispatchData.items || {})}`);

// Normalizar ciudad
const ciudad = (dispatchData.ciudad || '').toLowerCase().replace(/\s+/g, '_');

// Preparar items
let items = dispatchData.items;
if (!items) {
  // Si items no existe, intentar construir desde los campos del documento
  items = {};
  Object.entries(dispatchData).forEach(([key, value]) => {
    if (key !== 'fecha' && key !== 'ciudad' && key !== 'status' && typeof value === 'number' && value > 0) {
      items[key] = value;
    }
  });
}

// Si items es un objeto plano, convertirlo a array
let itemsArray = [];
if (Array.isArray(items)) {
  itemsArray = items;
} else if (typeof items === 'object' && items !== null) {
  itemsArray = Object.entries(items).map(([sku, cantidad]) => ({
    sku,
    cantidad: Number(cantidad || 0)
  }));
}

// Preparar datos para Supabase
const supabaseDispatch = {
  fecha: dispatchData.fecha,
  ciudad: ciudad,
  status: 'confirmado',
  items: itemsArray,
  created_at: dispatchData.createdAt ? new Date(dispatchData.createdAt.toMillis()).toISOString() : new Date().toISOString(),
  confirmed_at: dispatchData.confirmedAt ? new Date(dispatchData.confirmedAt.toMillis()).toISOString() : new Date().toISOString()
};

// Insertar en Supabase
const { data: inserted, error } = await supabase
  .from('dispatches')
  .insert(supabaseDispatch)
  .select()
  .single();

if (error) {
  console.error('❌ Error insertando despacho en Supabase:', error);
  process.exit(1);
}

console.log('\n✅ Despacho migrado exitosamente:');
console.log(`   ID Supabase: ${inserted.id}`);
console.log(`   Fecha: ${inserted.fecha}`);
console.log(`   Ciudad: ${inserted.ciudad}`);
console.log(`   Items: ${JSON.stringify(inserted.items)}`);

console.log('\n🎉 Migración completada');
process.exit(0);



