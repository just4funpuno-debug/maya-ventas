// Script para actualizar el campo 'total' en todos los documentos de 'ventashistorico'
// Ejecuta este script una sola vez desde Node.js (no desde el navegador)

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

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
const db = getFirestore(app);

async function actualizarTotales() {
  const historicoRef = collection(db, 'ventashistorico');
  const snapshot = await getDocs(historicoRef);
  let count = 0;
  for (const d of snapshot.docs) {
    const data = d.data();
    const precio = Number(data.precio) || 0;
    const gasto = Number(data.gasto) || 0;
    const gastoCancel = Number(data.gastoCancelacion||0) || 0;
    let total;
    if(data.estadoEntrega === 'cancelado' && gastoCancel>0){
      total = precio - gastoCancel; // puede ser negativo si precio=0
    } else {
      total = precio - gasto;
    }
    if (data.total !== total) {
      await updateDoc(doc(db, 'ventashistorico', d.id), { total });
      count++;
      console.log(`Actualizado ${d.id}: total = ${total}`);
    }
  }
  console.log(`Totales actualizados: ${count}`);
}

actualizarTotales().then(()=>{
  console.log('Proceso terminado.');
  process.exit(0);
}).catch(e=>{
  console.error(e);
  process.exit(1);
});
