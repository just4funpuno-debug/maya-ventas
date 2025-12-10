// Script de migración para corregir estadoEntrega en ventasporcobrar
// Ejecuta este script con: node scripts/migrar-estadoEntrega-porcobrar.js

import { db } from '../src/firebase.js';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

async function migrarEstadoEntregaPorCobrar() {
  const ref = collection(db, 'ventasporcobrar');
  const q = query(ref, where('estado', '==', 'entregada'), where('estadoEntrega', '==', 'pendiente'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No hay documentos para migrar en ventasporcobrar.');
    return;
  }

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach(doc => {
    batch.update(doc.ref, { estadoEntrega: 'entregada' });
    count++;
  });

  await batch.commit();
  console.log(`Migración completada en ventasporcobrar. Documentos actualizados: ${count}`);
}

migrarEstadoEntregaPorCobrar().catch(e => {
  console.error('Error en la migración:', e);
});
