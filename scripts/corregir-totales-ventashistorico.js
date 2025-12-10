// Script para revisar y limpiar ventas antiguas con posible duplicación de 'gasto' en Firestore
// Ejecuta este script con Node.js y las credenciales de Firebase correctamente configuradas

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function revisarYCorregirVentas() {
  const historicoRef = db.collection('ventashistorico');
  const snapshot = await historicoRef.get();
  let corregidos = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Si el total no coincide con precio-gasto, lo corregimos
    const precio = Number(data.precio) || 0;
    const gasto = Number(data.gasto) || 0;
    const totalEsperado = precio - gasto;
    if (data.total !== totalEsperado) {
      await doc.ref.update({ total: totalEsperado });
      corregidos++;
      console.log(`Corrigiendo venta ${doc.id}: total actualizado a ${totalEsperado}`);
    }
  }
  console.log(`Ventas corregidas: ${corregidos}`);
}

revisarYCorregirVentas().catch(console.error);
