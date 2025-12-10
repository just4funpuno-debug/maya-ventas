/**
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * 
 * Este archivo ha sido reemplazado por `supabaseUtils.js` como parte de la migración
 * de Firebase a Supabase (Fase 7).
 * 
 * Mantenido solo para referencia histórica. No debe ser importado en código nuevo.
 */

/**
 * Sincroniza la edición de un documento en GenerarDeposito con ventashistorico y ajusta cityStock si hay cambios en cantidades/productos.
 * No afecta otros flujos ni crea nuevos documentos.
 * @param {string} id - ID del documento (igual en ambas colecciones)
 * @param {object} ventaAnterior - Datos antes de la edición
 * @param {object} ventaNueva - Datos después de la edición
 */
export async function sincronizarEdicionDepositoHistorico(id, ventaAnterior, ventaNueva) {
  try {
    // Buscar documento en ventashistorico
    let refHist = doc(db, 'ventashistorico', id);
    let snapHist = await getDoc(refHist);
    if (!snapHist.exists()) {
      // Buscar por codigoUnico si el id no existe
      if (ventaNueva.codigoUnico) {
        const q = query(collection(db, 'ventashistorico'), where('codigoUnico', '==', ventaNueva.codigoUnico));
        const snap = await getDocs(q);
        if (!snap.empty) {
          refHist = doc(db, 'ventashistorico', snap.docs[0].id);
          snapHist = snap.docs[0];
        } else {
          // Artillería pesada: buscar por ciudad, fecha, sku y cantidad
          const q2 = query(
            collection(db, 'ventashistorico'),
            where('ciudad', '==', ventaNueva.ciudad),
            where('fecha', '==', ventaNueva.fecha),
            where('sku', '==', ventaNueva.sku),
            where('cantidad', '==', ventaNueva.cantidad)
          );
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            refHist = doc(db, 'ventashistorico', snap2.docs[0].id);
            snapHist = snap2.docs[0];
          } else {
            console.warn('[sincronizarEdicionDepositoHistorico] No existe doc en ventashistorico por id, codigoUnico ni coincidencia de ciudad/fecha/sku/cantidad:', id, ventaNueva);
            return;
          }
        }
      } else {
        // Artillería pesada: buscar por ciudad, fecha, sku y cantidad
        const q2 = query(
          collection(db, 'ventashistorico'),
          where('ciudad', '==', ventaNueva.ciudad),
          where('fecha', '==', ventaNueva.fecha),
          where('sku', '==', ventaNueva.sku),
          where('cantidad', '==', ventaNueva.cantidad)
        );
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          refHist = doc(db, 'ventashistorico', snap2.docs[0].id);
          snapHist = snap2.docs[0];
        } else {
          console.warn('[sincronizarEdicionDepositoHistorico] No existe doc en ventashistorico por id ni coincidencia de ciudad/fecha/sku/cantidad:', id, ventaNueva);
          return;
        }
      }
    }
    // Emparejar todos los campos posibles 1 a 1
    const campos = [
      'fecha', 'hora', 'horaEntrega', 'ciudad', 'metodo', 'vendedora', 'usuario', 'vendedor', 'celular',
      'sku', 'cantidad', 'skuExtra', 'cantidadExtra', 'precio', 'gasto', 'gastoCancelacion', 'total', 'neto',
      'comprobante', 'destinoEncomienda', 'motivo', 'sinteticaCancelada', 'estadoEntrega', 'estado', 'codigoUnico',
      'idPorCobrar', 'idHistorico', 'vendedoraId', 'createdAt', 'updatedAt', 'entregadaAt', 'confirmadoAt', 'canceladoAt'
    ];
    const updates = {};
    // Forzar el update: copiar todos los campos relevantes de ventaNueva
    const forcedUpdate = {};
    campos.forEach(campo => {
      if (ventaNueva[campo] !== undefined) {
        forcedUpdate[campo] = ventaNueva[campo];
      }
    });
    // Si vendedora está vacío pero vendedor existe, usar vendedor
    if ((!ventaNueva.vendedora || ventaNueva.vendedora === '') && ventaNueva.vendedor) {
      forcedUpdate['vendedora'] = ventaNueva.vendedor;
    }
    // Si existe vendedor, actualizar usuario
    if (ventaNueva.vendedor) {
      forcedUpdate['usuario'] = ventaNueva.vendedor;
    }
    // Si existe hora, actualizar horaEntrega
    if (ventaNueva.hora) {
      forcedUpdate['horaEntrega'] = ventaNueva.hora;
    }
    forcedUpdate.updatedAt = serverTimestamp();
    await updateDoc(refHist, forcedUpdate);
    // Si cambian cantidades/productos, ajustar cityStock
    let ajustarStock = false;
    if (ventaAnterior.sku !== ventaNueva.sku || Number(ventaAnterior.cantidad) !== Number(ventaNueva.cantidad)) {
      ajustarStock = true;
      // Restaurar stock anterior
      await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
      // Descontar stock nuevo
      await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
    }
    if ((ventaAnterior.skuExtra !== ventaNueva.skuExtra) || Number(ventaAnterior.cantidadExtra) !== Number(ventaNueva.cantidadExtra)) {
      ajustarStock = true;
      // Restaurar stock anterior extra
      if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
        await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
      }
      // Descontar stock nuevo extra
      if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
        await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
      }
    }
    if (ajustarStock) {
      console.log('[sincronizarEdicionDepositoHistorico] Stock ajustado en cityStock para', id);
    }
  } catch (err) {
    console.error('[sincronizarEdicionDepositoHistorico] ERROR', err, { id, ventaAnterior, ventaNueva });
    throw err;
  }
}

// Versión robusta: resuelve el doc de ventashistorico usando idHistorico, idPorCobrar -> lookup, codigoUnico o heurística.
export async function sincronizarEdicionDepositoHistoricoV2(referencias, ventaAnterior, ventaNueva){
  const { idGenerarDeposito, idHistorico, idPorCobrar, codigoUnico, skipStockAdjustment } = referencias || {};
  try {
    let histDocId = idHistorico || null;
    // 1. Si no tenemos idHistorico pero sí idPorCobrar, intentar leer ventasporcobrar para obtenerlo
    if(!histDocId && idPorCobrar){
      try {
        const snapPC = await getDoc(doc(db,'ventasporcobrar', idPorCobrar));
        if(snapPC.exists()){
          const data = snapPC.data();
            histDocId = data.idHistorico || null;
        }
      } catch(err){ console.warn('[syncDepoV2] fallo lookup ventasporcobrar', err); }
    }
    // 2. Buscar por codigoUnico si aún no lo tenemos
    if(!histDocId && codigoUnico){
      try {
        const q = query(collection(db,'ventashistorico'), where('codigoUnico','==', codigoUnico));
        const snap = await getDocs(q);
        if(!snap.empty) histDocId = snap.docs[0].id;
      } catch(err){ console.warn('[syncDepoV2] fallo query codigoUnico', err); }
    }
    // 3. Heurística reforzada multi-campo si aún sin resolver
    if(!histDocId){
      try {
        if(ventaNueva.ciudad && ventaNueva.fecha){
          // Query base solo por ciudad y fecha (índice más probable existente)
          const qBase = query(
            collection(db,'ventashistorico'),
            where('ciudad','==', ventaNueva.ciudad),
            where('fecha','==', ventaNueva.fecha)
          );
          const snap = await getDocs(qBase);
          if(!snap.empty){
            // Construir score comparando varios campos
            let best = null; let bestScore = -1; // score mayor es mejor
            const target = ventaNueva;
            snap.docs.forEach(d=>{
              const data = d.data();
              let score = 0;
              const eq = (a,b)=> String(a??'').trim() === String(b??'').trim();
              if(eq(data.sku, target.sku)) score+=8;
              if(Number(data.cantidad)==Number(target.cantidad)) score+=6;
              if(eq(data.skuExtra, target.skuExtra) && target.skuExtra) score+=3;
              if(Number(data.cantidadExtra)==Number(target.cantidadExtra) && target.cantidadExtra) score+=2;
              if(Number(data.precio)==Number(target.precio)) score+=4;
              if(Number(data.total)==Number(target.total)) score+=5;
              if(Number(data.gasto)==Number(target.gasto)) score+=3;
              if(eq(data.horaEntrega, target.hora) || eq(data.horaEntrega, target.horaEntrega)) score+=2;
              if(eq(data.destinoEncomienda, target.destinoEncomienda)) score+=2;
              if(eq(data.celular, target.celular) && target.celular) score+=2;
              if(eq(data.vendedora, target.vendedora) || eq(data.usuario, target.vendedor)) score+=2;
              // Penalización si sinteticaCancelada diverge
              if(Boolean(data.sinteticaCancelada) === Boolean(target.sinteticaCancelada)) score+=1; else score-=2;
              // Ajuste por proximidad numérica (precio/total) si no iguales
              const deltaTot = Math.abs(Number(data.total||0) - Number(target.total||0));
              if(deltaTot>0 && deltaTot <= 50) score+=1; // tolerancia pequeñas diferencias
              if(score > bestScore){ bestScore = score; best = d; }
            });
            // Umbral mínimo para evitar falsos positivos
            if(best && bestScore >= 10){
              histDocId = best.id;
              console.log('[syncDepoV2] heurística reforzada seleccionó', histDocId, 'score=', bestScore);
            } else if(best){
              console.warn('[syncDepoV2] heurística encontró candidato pero score bajo', best.id, bestScore);
            }
          }
        }
      } catch(err){ console.warn('[syncDepoV2] heurística reforzada fallo', err); }
    }
    if(!histDocId){
      console.warn('[syncDepoV2] No se pudo resolver doc histórico',{ idGenerarDeposito, idHistorico, idPorCobrar, codigoUnico, ventaNueva });
      return false;
    }
    const refHist = doc(db,'ventashistorico', histDocId);
    const force = { ...ventaNueva };
    // Normalizaciones: asegurar tipos numéricos
    ['precio','gasto','gastoCancelacion','cantidad','cantidadExtra','total','neto'].forEach(k=>{ if(k in force) force[k] = Number(force[k]||0); });
    // vendedora / usuario coherentes
    if(force.vendedor && !force.vendedora) force.vendedora = force.vendedor;
    if(force.vendedor) force.usuario = force.vendedor;
    if(force.hora) force.horaEntrega = force.hora; // mantener compatibilidad
    force.updatedAt = serverTimestamp();
    try { await updateDoc(refHist, force); console.log('[syncDepoV2] actualizado ventashistorico', histDocId); } catch(errUp){ console.error('[syncDepoV2] fallo update histórico', errUp); return false; }
    if(!skipStockAdjustment){
      const cambioPrincipal = (ventaAnterior.sku !== ventaNueva.sku) || (Number(ventaAnterior.cantidad)!=Number(ventaNueva.cantidad));
      const cambioExtra = (ventaAnterior.skuExtra !== ventaNueva.skuExtra) || (Number(ventaAnterior.cantidadExtra)!=Number(ventaNueva.cantidadExtra));
      try {
        if(cambioPrincipal){
          await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
          await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
        }
        if(cambioExtra){
          if(ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
          if(ventaNueva.skuExtra && ventaNueva.cantidadExtra) await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
        }
        if(cambioPrincipal || cambioExtra) console.log('[syncDepoV2] stock ajustado');
      } catch(errStock){ console.warn('[syncDepoV2] fallo ajuste stock', errStock); }
    }
    return true;
  } catch(err){
    console.error('[syncDepoV2] ERROR general', err, { referencias, ventaAnterior, ventaNueva });
    return false;
  }
}

// Elimina una venta desde GenerarDeposito devolviendo stock y borrando histórico (heurística).
// No toca ventasporcobrar. No afecta otros flujos existentes.
export async function eliminarVentaDepositoRobusto(row){
  if(!row || !row.id){ console.warn('[eliminarDeposito] row inválida', row); return { ok:false, error:'row invalida'}; }
  const result = { ok:false, restored:false, deletedGenerar:false, deletedHistorico:false, historicId:null };
  try {
    const idGenerar = row.id;
    // 1. Restaurar stock si no es sintética cancelada
    if(!row.sinteticaCancelada){
      try {
        if(row.sku && row.cantidad) await restoreCityStock(row.ciudad, row.sku, Number(row.cantidad));
        if(row.skuExtra && row.cantidadExtra) await restoreCityStock(row.ciudad, row.skuExtra, Number(row.cantidadExtra));
        result.restored = true;
      } catch(errStock){ console.warn('[eliminarDeposito] fallo restore stock (continuando)', errStock); }
    }
    // 2. Borrar doc en GenerarDeposito
    try {
      await deleteDoc(doc(db,'GenerarDeposito', idGenerar));
      result.deletedGenerar = true;
    } catch(errDel){
      console.error('[eliminarDeposito] Error eliminando GenerarDeposito', errDel);
      // Revertir stock si lo restauramos
      if(result.restored && !row.sinteticaCancelada){
        try {
          if(row.sku && row.cantidad) await discountCityStock(row.ciudad, row.sku, Number(row.cantidad));
          if(row.skuExtra && row.cantidadExtra) await discountCityStock(row.ciudad, row.skuExtra, Number(row.cantidadExtra));
          result.restored = false;
        } catch {/* ignore */}
      }
      return result;
    }
    // 3. Resolver histórico a eliminar
    let histId = row.idHistorico || null;
    if(!histId && row.codigoUnico){
      try {
        const q = query(collection(db,'ventashistorico'), where('codigoUnico','==', row.codigoUnico));
        const snap = await getDocs(q); if(!snap.empty) histId = snap.docs[0].id;
      } catch(errCU){ console.warn('[eliminarDeposito] fallo lookup codigoUnico', errCU); }
    }
    if(!histId && row.ciudad && row.fecha){
      try {
        const baseQ = query(collection(db,'ventashistorico'), where('ciudad','==', row.ciudad), where('fecha','==', row.fecha));
        const snap = await getDocs(baseQ);
        if(!snap.empty){
          let best=null; let bestScore=-1; const target=row; const eq=(a,b)=> String(a??'').trim()===String(b??'').trim();
          snap.docs.forEach(d=>{
            const data = d.data();
            let score=0;
            if(eq(data.sku,target.sku)) score+=8;
            if(Number(data.cantidad)==Number(target.cantidad)) score+=6;
            if(eq(data.skuExtra,target.skuExtra) && target.skuExtra) score+=3;
            if(Number(data.cantidadExtra)==Number(target.cantidadExtra) && target.cantidadExtra) score+=2;
            if(Number(data.precio)==Number(target.precio)) score+=4;
            if(Number(data.total)==Number(target.total)) score+=5;
            if(Number(data.gasto)==Number(target.gasto)) score+=3;
            if(eq(data.horaEntrega,target.hora) || eq(data.horaEntrega,target.horaEntrega)) score+=2;
            if(eq(data.destinoEncomienda,target.destinoEncomienda)) score+=2;
            if(eq(data.celular,target.celular) && target.celular) score+=2;
            if(eq(data.vendedora,target.vendedora) || eq(data.usuario,target.vendedor)) score+=2;
            if(Boolean(data.sinteticaCancelada) === Boolean(target.sinteticaCancelada)) score+=1; else score-=2;
            const deltaTot = Math.abs(Number(data.total||0) - Number(target.total||0)); if(deltaTot>0 && deltaTot<=50) score+=1;
            if(score>bestScore){ bestScore=score; best=d; }
          });
          if(best && bestScore>=10){ histId = best.id; }
        }
      } catch(errHeu){ console.warn('[eliminarDeposito] heurística histórico fallo', errHeu); }
    }
    // 4. Eliminar histórico si hallado
    if(histId){
      try { await deleteDoc(doc(db,'ventashistorico', histId)); result.deletedHistorico=true; result.historicId=histId; } catch(errH){ console.warn('[eliminarDeposito] fallo eliminar histórico', errH); }
    } else {
      console.warn('[eliminarDeposito] histórico no resuelto – se eliminó solo GenerarDeposito', { row });
    }
    result.ok = true;
    return result;
  } catch(err){
    console.error('[eliminarDeposito] ERROR general', err, row);
    return result;
  }
}
import { onSnapshot, doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { db } from "./firebase";

/**
 * Suscribe en tiempo real al stock de una ciudad (cityStock/{ciudad})
 * @param {string} ciudad - Nombre exacto del documento de ciudad
 * @param {function} callback - Recibe el objeto { sku: cantidad, ... }
 * @returns {function} - Función para desuscribirse
 */
export function subscribeCityStock(ciudad, callback) {
  if (!ciudad || typeof callback !== 'function') return () => {};
  const ref = doc(db, "cityStock", ciudad);
  const unsub = onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : {});
  });
  return unsub;
}
// EDITAR VENTA CONFIRMADA (ventasporcobrar y ventashistorico)
// Guard simple para evitar ediciones duplicadas concurrentes (clave: codigoUnico o idHistorico)
const _editInFlight = new Set();

export async function editarVentaConfirmada(idPorCobrar, idHistorico, ventaAnterior, ventaNueva) {
  try {
  const codigoUnico = ventaAnterior?.codigoUnico || ventaNueva?.codigoUnico;
  const lockKey = codigoUnico || idHistorico || idPorCobrar;
  if(lockKey){
    if(_editInFlight.has(lockKey)){
      console.warn('[editarVentaConfirmada] edición ignorada: operación ya en curso para', lockKey);
      return; // evita doble aplicación de stock
    }
    _editInFlight.add(lockKey);
  }
  // Resolver IDs por codigoUnico si faltan
  if (codigoUnico && (!idPorCobrar || !idHistorico)) {
    try {
      if(!idPorCobrar){
        const qPC = query(collection(db,'ventasporcobrar'), where('codigoUnico','==', codigoUnico));
        const snapPC = await getDocs(qPC);
        if(!snapPC.empty) idPorCobrar = snapPC.docs[0].id;
      }
      if(!idHistorico){
        const qH = query(collection(db,'ventashistorico'), where('codigoUnico','==', codigoUnico));
        const snapH = await getDocs(qH);
        if(!snapH.empty) idHistorico = snapH.docs[0].id;
      }
    } catch(resErr){ console.warn('[editarVentaConfirmada] Fallback codigoUnico error', resErr); }
  }
  // Restaurar stock anterior
  await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
  if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
    await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
  }
  // Descontar stock nuevo
  await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
  if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
    await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
  }
  // Calcular total actualizado
  const total = (Number(ventaNueva.precio) || 0) - (Number(ventaNueva.gasto) || 0);
  // Actualizar en ventasporcobrar (solo si existe el documento real)
  if(idPorCobrar){
    let updatedPorCobrar = false;
    try {
      const porCobrarRef = doc(db, "ventasporcobrar", idPorCobrar);
      const snapPC = await getDoc(porCobrarRef);
      if(snapPC.exists()){
        await updateDoc(porCobrarRef, { ...ventaNueva, ...(codigoUnico ? { codigoUnico } : {}), updatedAt: serverTimestamp(), total });
        updatedPorCobrar = true;
      } else {
        console.warn('[editarVentaConfirmada] Doc ventasporcobrar no existe con idPorCobrar=', idPorCobrar, 'buscando por idHistorico...');
        // Fallback: buscar doc con idHistorico (referencia cruzada)
        if(idHistorico){
          try {
            const qLink = query(collection(db,'ventasporcobrar'), where('idHistorico','==', idHistorico));
            const snapLink = await getDocs(qLink);
            if(!snapLink.empty){
              const refFound = doc(db,'ventasporcobrar', snapLink.docs[0].id);
              await updateDoc(refFound, { ...ventaNueva, ...(codigoUnico ? { codigoUnico } : {}), updatedAt: serverTimestamp(), total });
              updatedPorCobrar = true;
              idPorCobrar = snapLink.docs[0].id; // actualizar variable local para consistencia
              console.log('[editarVentaConfirmada] Actualizado ventasporcobrar por idHistorico link', idPorCobrar);
            }
          } catch(linkErr){ console.warn('[editarVentaConfirmada] fallback idHistorico link error', linkErr); }
        }
        // Fallback adicional: buscar por codigoUnico (por seguridad, ya intentado arriba si faltaban IDs)
        if(!updatedPorCobrar && codigoUnico){
          try {
            const qCU = query(collection(db,'ventasporcobrar'), where('codigoUnico','==', codigoUnico));
            const snapCU = await getDocs(qCU);
            if(!snapCU.empty){
              const refFound = doc(db,'ventasporcobrar', snapCU.docs[0].id);
              await updateDoc(refFound, { ...ventaNueva, ...(codigoUnico ? { codigoUnico } : {}), updatedAt: serverTimestamp(), total });
              updatedPorCobrar = true;
              idPorCobrar = snapCU.docs[0].id;
              console.log('[editarVentaConfirmada] Actualizado ventasporcobrar por codigoUnico fallback', idPorCobrar);
            }
          } catch(cuErr){ console.warn('[editarVentaConfirmada] fallback codigoUnico segunda fase error', cuErr); }
        }
        if(!updatedPorCobrar){
          console.warn('[editarVentaConfirmada] No se logró localizar doc en ventasporcobrar – se continuará solo con histórico');
        }
      }
    } catch(pcErr){ console.warn('[editarVentaConfirmada] No se pudo actualizar ventasporcobrar, continuando:', pcErr); }
  } else {
    console.warn('[editarVentaConfirmada] idPorCobrar indefinido – intentando buscar por idHistorico / codigoUnico');
    let resolved = false;
    if(idHistorico){
      try {
        const qLink = query(collection(db,'ventasporcobrar'), where('idHistorico','==', idHistorico));
        const snapLink = await getDocs(qLink);
        if(!snapLink.empty){
          const refFound = doc(db,'ventasporcobrar', snapLink.docs[0].id);
          await updateDoc(refFound, { ...ventaNueva, ...(codigoUnico ? { codigoUnico } : {}), updatedAt: serverTimestamp(), total });
          resolved = true; idPorCobrar = snapLink.docs[0].id;
          console.log('[editarVentaConfirmada] Actualizado ventasporcobrar (sin idPorCobrar original) via idHistorico', idPorCobrar);
        }
      } catch(errLink){ console.warn('[editarVentaConfirmada] fallback búsqueda idHistorico error', errLink); }
    }
    if(!resolved && codigoUnico){
      try {
        const qCU = query(collection(db,'ventasporcobrar'), where('codigoUnico','==', codigoUnico));
        const snapCU = await getDocs(qCU);
        if(!snapCU.empty){
          const refFound = doc(db,'ventasporcobrar', snapCU.docs[0].id);
          await updateDoc(refFound, { ...ventaNueva, ...(codigoUnico ? { codigoUnico } : {}), updatedAt: serverTimestamp(), total });
          resolved = true; idPorCobrar = snapCU.docs[0].id;
          console.log('[editarVentaConfirmada] Actualizado ventasporcobrar (sin idPorCobrar) via codigoUnico', idPorCobrar);
        }
      } catch(errCU){ console.warn('[editarVentaConfirmada] fallback búsqueda codigoUnico error', errCU); }
    }
    if(!resolved){
      console.warn('[editarVentaConfirmada] No se encontró doc en ventasporcobrar (idPorCobrar ausente). Solo histórico actualizado.');
    }
  }
  // Actualizar en ventashistorico
  const historicoRef = doc(db, "ventashistorico", idHistorico);
  await updateDoc(historicoRef, {
    ...ventaNueva,
    ...(codigoUnico ? { codigoUnico } : {}),
    updatedAt: serverTimestamp(),
    total
  });
  if(lockKey) _editInFlight.delete(lockKey);
  } catch(err){
    console.error('[editarVentaConfirmada] ERROR', err, { idPorCobrar, idHistorico, ventaAnterior, ventaNueva });
    if(ventaAnterior?.codigoUnico){ _editInFlight.delete(ventaAnterior.codigoUnico); }
    throw err;
  }
}

// CANCELAR VENTA CONFIRMADA (ventasporcobrar y ventashistorico)
export async function cancelarVentaConfirmada(idPorCobrar, idHistorico, venta) {
  // Restaurar stock
  await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
  if (venta.skuExtra && venta.cantidadExtra) {
    await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
  }
  // Eliminar de ventasporcobrar y ventashistorico
  await deleteDoc(doc(db, "ventasporcobrar", idPorCobrar));
  await deleteDoc(doc(db, "ventashistorico", idHistorico));
}

// CONFIRMAR DEPÓSITO (ventasporcobrar y ventashistorico)
export async function confirmarDepositoVenta(idPorCobrar, idHistorico) {
  const fechaCobro = serverTimestamp();
  // Leer los documentos actuales para recalcular total
  const porCobrarSnap = await getDoc(doc(db, "ventasporcobrar", idPorCobrar));
  const historicoSnap = await getDoc(doc(db, "ventashistorico", idHistorico));
  let totalPorCobrar = undefined;
  let totalHistorico = undefined;
  if (porCobrarSnap.exists()) {
    const data = porCobrarSnap.data();
    totalPorCobrar = (Number(data.precio) || 0) - (Number(data.gasto) || 0);
  }
  if (historicoSnap.exists()) {
    const data = historicoSnap.data();
    totalHistorico = (Number(data.precio) || 0) - (Number(data.gasto) || 0);
  }
  // Actualizar estadoPago, fechaCobro y total en ambas colecciones
  await updateDoc(doc(db, "ventasporcobrar", idPorCobrar), {
    estadoPago: "cobrado",
    fechaCobro,
    ...(totalPorCobrar !== undefined ? { total: totalPorCobrar } : {})
  });
  await updateDoc(doc(db, "ventashistorico", idHistorico), {
    estadoPago: "cobrado",
    fechaCobro,
    ...(totalHistorico !== undefined ? { total: totalHistorico } : {})
  });
}
// CONFIRMAR ENTREGA: Mover venta a ventashistorico y ventasporcobrar
export async function confirmarEntregaVenta(id, venta) {
  // Descuento de stock (omitir si producto principal es sintético para evitar logs ruidosos)
  try {
    if(!venta.sintetico){
      await discountCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
      if (venta.skuExtra && venta.cantidadExtra) await discountCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    }
  } catch(errStock){ console.warn('[confirmarEntregaVenta] fallo discountCityStock (continuando)', errStock); }
  const precioNum = Number(venta.precio)||0;
  const gastoNum = Number(venta.gasto)||0;
  const totalBase = precioNum - gastoNum; // puede ser negativo (ej. sintético con gasto > 0)
  const totalHistorico = totalBase;
  // En ventasporcobrar evitamos total negativo (puede bloquear reglas). Si es <0 lo normalizamos a 0 y guardamos campo ajusteTotal.
  const totalPorCobrar = totalBase < 0 ? 0 : totalBase;
  const codigoUnico = uuidv4();
  const historicoRef = collection(db, 'ventashistorico');
  // Determinar estadoEntrega correcto
  let estadoEntrega = 'entregada';
  if (Number(venta.gastoCancelacion || 0) > 0) {
    estadoEntrega = 'cancelado';
  }
  const historicoPayload = {
    ...venta,
    estado: estadoEntrega === 'entregada' ? 'entregada' : 'cancelado',
    estadoEntrega,
    confirmadoAt: serverTimestamp(),
    entregadaAt: serverTimestamp(),
    estadoPago: 'pendiente',
    total: totalHistorico,
    codigoUnico,
    totalBaseOriginal: totalBase,
    ...(totalBase < 0 ? { totalAjustadoParaPorCobrar: 0 } : {})
  };
  const histDocRef = await addDoc(historicoRef, historicoPayload);
  let porCobrarDocRef = null;
  try {
    const porCobrarRef = collection(db, 'ventasporcobrar');
    const porCobrarPayload = {
      ...venta,
      estado: estadoEntrega === 'entregada' ? 'entregada' : 'cancelado',
      estadoEntrega,
      confirmadoAt: serverTimestamp(),
      entregadaAt: serverTimestamp(),
      estadoPago: 'pendiente',
      total: totalPorCobrar,
      codigoUnico,
      idHistorico: histDocRef.id,
      ...(totalBase < 0 ? { totalOriginalNegativo: totalBase } : {})
    };
    porCobrarDocRef = await addDoc(porCobrarRef, porCobrarPayload);
    await updateDoc(histDocRef, { idPorCobrar: porCobrarDocRef.id });
  } catch(errPC){
    console.error('[confirmarEntregaVenta] Error creando documento en ventasporcobrar', errPC);
    await updateDoc(histDocRef, { idPorCobrar: null, errorPorCobrar: true });
  }
  await deleteDoc(doc(db,'VentasSinConfirmar', id));
}
// CANCELAR ENTREGA CONFIRMADA (solo costo en histórico, devolver stock)
export async function cancelarEntregaConfirmadaConCosto(idHistorico, venta, costoDelivery) {
  try {
    const costo = Number(costoDelivery)||0;
    await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
    if (venta.skuExtra && venta.cantidadExtra) await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    const ref = doc(db,'ventashistorico', idHistorico);
    const snapHist = await getDoc(ref);
    const histData = snapHist.exists()? snapHist.data(): {};
    const precioNum = Number(histData.precio ?? venta.precio) || 0;
    const total = precioNum - costo;
    await updateDoc(ref, {
      estadoEntrega: 'cancelado',
      canceladoAt: serverTimestamp(),
      gastoCancelacion: costo,
      total,
      sinteticaCancelada: true
    });
    const idPorCobrar = histData.idPorCobrar || venta.idPorCobrar;
    if(idPorCobrar){
      try {
        await updateDoc(doc(db,'ventasporcobrar', idPorCobrar), {
          estadoEntrega: 'cancelado',
          canceladoAt: serverTimestamp(),
          gastoCancelacion: costo,
          total,
          sinteticaCancelada: true
        });
      } catch(errPC){ console.warn('[cancelarEntregaConfirmadaConCosto] fallo actualizar ventasporcobrar', errPC); }
    }
  } catch(err){
    console.error('[cancelarEntregaConfirmadaConCosto] ERROR', err, { idHistorico, venta, costoDelivery });
    throw err;
  }
}

// REGISTRO DE VENTA PENDIENTE
export async function registrarVentaPendiente(venta) {
  try {
    console.log('[registrarVentaPendiente] venta:', venta);
    // Descontar productos del cityStock
    await discountCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
    if (venta.skuExtra && venta.cantidadExtra) {
      await discountCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
    }
    // Limpiar campos undefined
    const cleanVenta = Object.fromEntries(Object.entries(venta).filter(([_, v]) => v !== undefined));
    // Guardar en VentasSinConfirmar
    const ref = collection(db, "VentasSinConfirmar");
    await addDoc(ref, {
      ...cleanVenta,
      estado: "pendiente",
      createdAt: serverTimestamp(),
    });
    console.log('[registrarVentaPendiente] Venta registrada y stock descontado.');
  } catch (err) {
    console.error('[registrarVentaPendiente] ERROR:', err, venta);
    throw err;
  }
}

// EDICIÓN DE VENTA PENDIENTE
export async function editarVentaPendiente(id, ventaAnterior, ventaNueva) {
  // Restaurar stock anterior
  await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.sku, Number(ventaAnterior.cantidad));
  if (ventaAnterior.skuExtra && ventaAnterior.cantidadExtra) {
    await restoreCityStock(ventaAnterior.ciudad, ventaAnterior.skuExtra, Number(ventaAnterior.cantidadExtra));
  }
  // Descontar stock nuevo
  await discountCityStock(ventaNueva.ciudad, ventaNueva.sku, Number(ventaNueva.cantidad));
  if (ventaNueva.skuExtra && ventaNueva.cantidadExtra) {
    await discountCityStock(ventaNueva.ciudad, ventaNueva.skuExtra, Number(ventaNueva.cantidadExtra));
  }
  // Actualizar documento
  const ref = doc(db, "VentasSinConfirmar", id);
  await updateDoc(ref, {
    ...ventaNueva,
    updatedAt: serverTimestamp(),
  });
}

// ELIMINAR VENTA PENDIENTE
export async function eliminarVentaPendiente(id, venta) {
  // Restaurar stock
  await restoreCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
  if (venta.skuExtra && venta.cantidadExtra) {
    await restoreCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
  }
  // Eliminar documento
  const ref = doc(db, "VentasSinConfirmar", id);
  await deleteDoc(ref);
}
// Registrar en histórico una cancelación de venta pendiente con costo de delivery
export async function registrarCancelacionPendienteConCosto(venta, costo) {
  try {
    console.log('[registrarCancelacionPendienteConCosto] inicio', { venta, costo });
  const historicoRef = collection(db, 'ventashistorico');
  const porCobrarRef = collection(db, 'ventasporcobrar');
    const nowFecha = new Date();
    const fechaISO = (venta.fecha || nowFecha.toISOString().slice(0,10));
    const costoNum = Number(costo)||0;
    if(!costoNum){
      console.warn('[registrarCancelacionPendienteConCosto] costo = 0: se omite inserción');
      return; // nada que registrar
    }
    const codigoUnico = uuidv4();
    let payload = {
      fecha: fechaISO,
      ciudad: venta.ciudad,
      sku: venta.sku,
      cantidad: venta.cantidad,
      skuExtra: venta.skuExtra ? venta.skuExtra : undefined,
      cantidadExtra: (venta.skuExtra && venta.cantidadExtra) ? venta.cantidadExtra : undefined,
      precio: 0, // no hubo ingreso
      gastoCancelacion: costoNum,
      gasto: 0, // gasto normal no aplica; usamos gastoCancelacion
      total: 0, // evitar interpretaciones en métricas (UI crea sintética)
      estadoEntrega: 'cancelado',
      canceladoAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      vendedora: venta.vendedora,
      vendedoraId: venta.vendedoraId || venta.vendedora_id || null,
      metodo: venta.metodo || 'Delivery',
      sinteticaCancelada: true,
      codigoUnico,
      motivo: "cancelado", // SIEMPRE motivo para sintéticos de cancelación con costo
      // No guardar motivo "Cancelación con costo delivery" para evitar ruido visual
    };
    // Eliminar undefined (Firestore no los acepta)
    payload = Object.fromEntries(Object.entries(payload).filter(([_,v])=> v !== undefined));
    // Crear en ventashistorico
    const docRef = await addDoc(historicoRef, payload);
    // Crear en ventasporcobrar (idéntico payload, pero con referencia cruzada)
    let porCobrarPayload = { ...payload, idHistorico: docRef.id };
    const porCobrarDocRef = await addDoc(porCobrarRef, porCobrarPayload);
    // Actualizar referencia cruzada en ventashistorico
    await updateDoc(docRef, { idPorCobrar: porCobrarDocRef.id });
    console.log('[registrarCancelacionPendienteConCosto] doc creado', docRef.id, payload, 'y en ventasporcobrar', porCobrarDocRef.id);
    // Corrección defensiva: si total quedó 0 pero debe ser negativo (precio=0 y costo>0), actualizar ambos
    if(payload.total === 0 && costoNum > 0 && payload.precio === 0){
      try {
        await updateDoc(doc(db,'ventashistorico', docRef.id), { total: -costoNum });
        await updateDoc(doc(db,'ventasporcobrar', porCobrarDocRef.id), { total: -costoNum });
        console.log('[registrarCancelacionPendienteConCosto] total corregido a', -costoNum, 'en ambas colecciones');
      } catch(corrErr){ console.warn('[registrarCancelacionPendienteConCosto] fallo corrección total', corrErr); }
    }
  } catch(err){
    console.error('[registrarCancelacionPendienteConCosto] ERROR', err, { venta, costo });
    throw err;
  }
}
// firestoreUtils.js
// Helpers para manejo de stock de cityStock en Firestore

// (imports consolidados al inicio)

/**
 * Descuenta cantidad de un SKU en el stock de una ciudad
 */
export async function discountCityStock(ciudad, sku, cantidad) {
  try {
    if (!ciudad || !sku || !cantidad) {
      console.warn('[discountCityStock] Parámetros faltantes:', { ciudad, sku, cantidad });
      return;
    }
    const ref = doc(db, "cityStock", ciudad);
    const snap = await getDoc(ref);
    let data = {};
    if (snap.exists()) data = snap.data();
    const prev = data[sku] || 0;
    data[sku] = Math.max(0, prev - cantidad);
    await setDoc(ref, data);
    console.log(`[discountCityStock] ${ciudad} - ${sku}: ${prev} -> ${data[sku]} (descontado ${cantidad})`);
  } catch (err) {
    console.error('[discountCityStock] ERROR:', err, { ciudad, sku, cantidad });
    throw err;
  }
}

/**
 * Suma cantidad de un SKU en el stock de una ciudad
 */
export async function restoreCityStock(ciudad, sku, cantidad) {
  if (!ciudad || !sku || !cantidad) return;
  const ref = doc(db, "cityStock", ciudad);
  const snap = await getDoc(ref);
  let data = {};
  if (snap.exists()) data = snap.data();
  data[sku] = (data[sku] || 0) + cantidad;
  await setDoc(ref, data);
}

/**
 * Ajusta el stock de varios SKUs en una ciudad (objeto {sku: cantidad})
 * Si la cantidad es positiva suma, si es negativa descuenta
 */
export async function adjustCityStock(ciudad, items) {
  if (!ciudad || !items || typeof items !== 'object') return;
  const ref = doc(db, "cityStock", ciudad);
  const snap = await getDoc(ref);
  let data = {};
  if (snap.exists()) data = snap.data();
  for (const sku in items) {
    data[sku] = (data[sku] || 0) + items[sku];
    if (data[sku] < 0) data[sku] = 0;
  }
  await setDoc(ref, data);
}

/**
 * Crear snapshot remoto de depósito con las ventas por cobrar de una ciudad.
 * NO elimina documentos originales; solo marca snapshotId y settledAt.
 * @param {string} ciudad
 * @param {Array<object>} ventas - ventas seleccionadas (filtradas en la UI)
 * @param {object} resumen - objeto resumen (ventasConfirmadas, ventasSinteticas, canceladasConCosto, totalPedidos, totalMonto, totalDelivery, totalNeto, productos)
 * @returns {Promise<string>} snapshotId
 */
export async function crearSnapshotDeposito(ciudad, ventas, resumen){
  if(!ciudad) throw new Error('ciudad requerida');
  const colName = 'GenerarDeposito'; // solicitado por el usuario
  const colRef = collection(db, colName);
  // Construir payload compacto de ventas (referencias, no todos los campos)
  const ventasPayload = [];
  for(const v of ventas){
    let idPorCobrar = v.idPorCobrar || v.id; // fallback
    let idHistorico = v.idHistorico || v.idHistoricoRef || v.id; // fallback
    const codigoUnico = v.codigoUnico;
    // Resolver idPorCobrar por codigoUnico si no luce real (puede ser histórico)
    if(codigoUnico && (!idPorCobrar || idPorCobrar === idHistorico)){
      try {
        const qPC = query(collection(db,'ventasporcobrar'), where('codigoUnico','==', codigoUnico));
        const snap = await getDocs(qPC);
        if(!snap.empty) idPorCobrar = snap.docs[0].id;
      } catch { /* ignore */ }
    }
    const baseVenta = {
      idPorCobrar: idPorCobrar || null,
      idHistorico: idHistorico || null,
      codigoUnico: codigoUnico || null,
      total: v.total ?? ((Number(v.precio)||0) - (Number(v.gasto)||0)),
      gasto: Number(v.gasto||0),
      precio: Number(v.precio||0),
      fecha: v.fecha || null,
      sku: v.sku || null,
      cantidad: v.cantidad ?? null,
      skuExtra: (v.skuExtra ?? null) || null,
      cantidadExtra: (v.cantidadExtra ?? null),
      estadoEntrega: v.estadoEntrega || null,
      sinteticaCancelada: !!v.sinteticaCancelada
    };
    // Remover claves undefined explícitamente (aunque forzamos null arriba) por seguridad
    const limpia = Object.fromEntries(Object.entries(baseVenta).filter(([_,val])=> val !== undefined));
    ventasPayload.push(limpia);
  }
  // Limpiar resumen (evitar valores undefined en anidado)
  const resumenLimpio = resumen ? JSON.parse(JSON.stringify(resumen, (_k, value)=> value === undefined ? null : value)) : {};
  const snapshotDoc = await addDoc(colRef, {
    ciudad,
    createdAt: serverTimestamp(),
    resumen: resumenLimpio,
    ventas: ventasPayload,
    estado: 'pendiente'
  });
  const snapshotId = snapshotDoc.id;
  // Marcar ventasporcobrar con snapshotId + settledAt
  for(const v of ventasPayload){
    if(!v.idPorCobrar) continue;
    try {
      await updateDoc(doc(db,'ventasporcobrar', v.idPorCobrar), { snapshotId, settledAt: serverTimestamp() });
    } catch(err){ console.warn('[crearSnapshotDeposito] no se pudo marcar venta', v.idPorCobrar, err); }
  }
  return snapshotId;
}

// Garantiza que todas las ventas canceladas con costo (gastoCancelacion>0) tengan doc en ventasporcobrar
// Sin copiar desde histórico al depósito directamente: sólo recrea el doc faltante en ventasporcobrar.
export async function ensureCanceladasConCostoEnVentasPorCobrar(ciudad){
  try {
    if(!ciudad) return [];
    const creadas = [];
    // Traer canceladas de histórico de esa ciudad (filtro por estadoEntrega='cancelado'; gastoCancelacion>0 se filtra cliente)
    const qHist = query(collection(db,'ventashistorico'), where('ciudad','==', ciudad), where('estadoEntrega','==','cancelado'));
    const snapHist = await getDocs(qHist);
    for(const d of snapHist.docs){
      const data = d.data();
      if(!(Number(data.gastoCancelacion||0) > 0)) continue; // sólo con costo
      let idPorCobrar = data.idPorCobrar;
      let porCobrarExiste = false;
      if(idPorCobrar){
        try {
          const snapPC = await getDoc(doc(db,'ventasporcobrar', idPorCobrar));
          porCobrarExiste = snapPC.exists();
        } catch { porCobrarExiste = false; }
      }
      if(!porCobrarExiste){
        // Crear doc en ventasporcobrar con misma data base
        const base = { ...data };
        delete base.idPorCobrar; // se regenerará
        base.idHistorico = d.id;
        base.createdAt = base.createdAt || serverTimestamp();
        // Asegurar total coherente (si faltara)
        if(typeof base.total !== 'number'){
          const precioNum = Number(base.precio||0);
            const gastoNum = Number(base.gastoCancelacion||0);
            base.total = precioNum - gastoNum;
        }
        const pcRef = await addDoc(collection(db,'ventasporcobrar'), base);
        await updateDoc(doc(db,'ventashistorico', d.id), { idPorCobrar: pcRef.id });
        creadas.push(pcRef.id);
        console.warn('[ensureCanceladasConCostoEnVentasPorCobrar] Recreado doc ventasporcobrar faltante', pcRef.id, 'para historico', d.id);
      }
    }
    return creadas;
  } catch(err){
    console.warn('[ensureCanceladasConCostoEnVentasPorCobrar] Error', err, { ciudad });
    return [];
  }
}
