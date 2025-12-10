// Script para crear cityStock en Firestore con stock inicial 0 para cada ciudad y producto
// Ejecuta este script una sola vez en tu entorno Node.js con permisos de admin

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase'; // Ajusta la ruta si es necesario

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Define tus ciudades aquí
const ciudades = ['elalto', 'lapaz', 'cochabamba', 'santacruz'];

async function createCityStock() {
  const almacenCentralCol = collection(db, 'almacenCentral');
  const snapshot = await getDocs(almacenCentralCol);
  const productos = snapshot.docs.map(doc => doc.id);

  for (const ciudad of ciudades) {
    const stockCiudad = {};
    for (const sku of productos) {
      stockCiudad[sku] = 0;
    }
    await setDoc(doc(db, 'cityStock', ciudad), stockCiudad);
    console.log(`cityStock creado para: ${ciudad}`);
  }
  console.log('cityStock inicializado para todas las ciudades.');
}

createCityStock().catch(console.error);
