// Script de migración para corregir estadoEntrega en ventashistorico
// Ejecuta este script con: node scripts/migrar-estadoEntrega-historico.js

import { db } from '../src/firebase.js';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

async function migrarEstadoEntrega() {
  const historicoRef = collection(db, 'ventashistorico');
  const q = query(historicoRef, where('estado', '==', 'entregada'), where('estadoEntrega', '==', 'pendiente'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No hay documentos para migrar.');
    return;
  }

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach(doc => {
    batch.update(doc.ref, { estadoEntrega: 'entregada' });
    count++;
  });

  await batch.commit();
  console.log(`Migración completada. Documentos actualizados: ${count}`);
}

migrarEstadoEntrega().catch(e => {
  console.error('Error en la migración:', e);
});
