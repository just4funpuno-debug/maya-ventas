// Script para migrar la colección 'stock' a 'almacenCentral' en Firestore
// Ejecuta este script una sola vez en tu entorno Node.js con permisos de admin

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase'; // Ajusta la ruta si es necesario

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateStockToAlmacenCentral() {
  const stockCol = collection(db, 'stock');
  const almacenCentralCol = collection(db, 'almacenCentral');
  const snapshot = await getDocs(stockCol);
  for (const s of snapshot.docs) {
    await setDoc(doc(almacenCentralCol, s.id), s.data());
    console.log(`Migrado SKU: ${s.id}`);
  }
  console.log('Migración completada.');
}

migrateStockToAlmacenCentral().catch(console.error);
