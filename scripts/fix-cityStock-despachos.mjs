// Script: Corregir cityStock inflado por suma doble de despachos
// Uso: Ejecutar una sola vez con `node scripts/fix-cityStock-despachos.mjs`
// Requisitos: variables de entorno Firebase inicializadas como en tu app.

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

// Ajusta con tu config si no reutilizas la de la app
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG_JSON || '{}');
if(!firebaseConfig.projectId){
  console.error('Falta FIREBASE_CONFIG_JSON en env con projectId. Abortando.');
  process.exit(1);
}
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main(){
  console.log('[fix-cityStock] Iniciando');
  const pendientesSnap = await getDocs(collection(db,'despachos'));
  const confirmadosSnap = await getDocs(collection(db,'despachosHistorial'));
  const infladoPend = {}; // ciudad -> sku -> cantidad
  const infladoConf = {}; // ciudad -> sku -> cantidad
  pendientesSnap.forEach(d=>{
    const data = d.data();
    (data.items||[]).forEach(it=>{
      if(!it.sku || !it.cantidad) return;
      infladoPend[data.ciudad] = infladoPend[data.ciudad] || {};
      infladoPend[data.ciudad][it.sku] = (infladoPend[data.ciudad][it.sku]||0) + Number(it.cantidad||0);
    });
  });
  confirmadosSnap.forEach(d=>{
    const data = d.data();
    (data.items||[]).forEach(it=>{
      if(!it.sku || !it.cantidad) return;
      infladoConf[data.ciudad] = infladoConf[data.ciudad] || {};
      infladoConf[data.ciudad][it.sku] = (infladoConf[data.ciudad][it.sku]||0) + Number(it.cantidad||0);
    });
  });
  // cityStock actual
  const cityStockDocs = await Promise.all(Object.keys({...infladoPend, ...infladoConf}).map(async ciudad=>{
    const ref = doc(db,'cityStock', ciudad);
    const snap = await getDoc(ref);
    return { ciudad, ref, data: snap.exists()? snap.data(): {} };
  }));
  let cambios = 0;
  for(const entry of cityStockDocs){
    const { ciudad, ref, data } = entry;
    const restar = {};
    const pend = infladoPend[ciudad] || {};
    const conf = infladoConf[ciudad] || {};
    // Fórmula: restar pendientes + confirmados (una vez cada uno) porque ya fueron sumados en creación y confirmación
    Object.keys({...pend, ...conf}).forEach(sku=>{
      const cant = (pend[sku]||0) + (conf[sku]||0);
      if(cant>0){
        restar[sku] = cant;
      }
    });
    if(Object.keys(restar).length===0) continue;
    const nuevo = { ...data };
    Object.entries(restar).forEach(([sku,cant])=>{
      nuevo[sku] = Math.max(0, (nuevo[sku]||0) - cant);
    });
    await setDoc(ref, nuevo);
    cambios++;
    console.log(`[fix-cityStock] Ciudad ${ciudad} ajustada: -${JSON.stringify(restar)}`);
  }
  console.log(`[fix-cityStock] Completado. Ciudades ajustadas: ${cambios}`);
  console.log('Revisa manualmente que los números concidan con el histórico real.');
}

main().catch(e=>{ console.error('[fix-cityStock] ERROR', e); process.exit(1); });
