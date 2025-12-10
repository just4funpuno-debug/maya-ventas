import React from "react";

// Tabla de resumen de ventas por ciudad

export default function CitySummary({ city, sales = [], products = [] }) {
  // Log para depuración de coincidencia de ciudad
  console.log(`[CitySummary] city prop:`, city, '| cityNorm:', (city || '').toUpperCase());
  // Debug: mostrar todas las ventas recibidas para esta ciudad
  React.useEffect(() => {
    const cityNorm = (city || '').toUpperCase();
    const ventasCiudad = sales.filter(s => (s.ciudad || '').toUpperCase() === cityNorm);
    console.log(`[CitySummary] Ventas recibidas para ciudad ${cityNorm}:`, ventasCiudad);
    const confirmadasDebug = ventasCiudad.filter(s => (s.estadoEntrega === 'entregada' || s.estadoEntrega === 'confirmado') && !s.settledAt);
    console.log(`[CitySummary] Ventas confirmadas para ciudad ${cityNorm}:`, confirmadasDebug);
    const canceladasDebug = ventasCiudad.filter(s => s.estadoEntrega === 'cancelado' && Number(s.gastoCancelacion || 0) > 0 && !s.settledAt);
    console.log(`[CitySummary] Ventas canceladas con costo para ciudad ${cityNorm}:`, canceladasDebug);
  }, [city, sales]);
  // Normalizar ciudad para comparación
  const cityNorm = (city || '').toUpperCase();
  // Confirmadas (no liquidadas)
  const confirmadas = sales
    .filter(s => (s.ciudad || '').toUpperCase() === cityNorm && (s.estadoEntrega === 'entregada' || s.estadoEntrega === 'confirmado') && !s.settledAt);
  // Canceladas con costo (no liquidadas)
  const canceladasConCosto = sales
    .filter(s => (s.ciudad || '').toUpperCase() === cityNorm && s.estadoEntrega === 'cancelado' && Number(s.gastoCancelacion || 0) > 0 && !s.settledAt)
    .map(s => ({
      ...s,
      sinteticaCancelada: true,
      gasto: 0,
      total: 0,
      confirmadoAt: s.confirmadoAt || s.canceladoAt || Date.parse((s.fecha||'')+'T00:00:00') || 0,
    }));
  // Helper para convertir hora a minutos del día (compatible con formato "10:00 AM" o "10:00 AM-12:00 PM")
  const minutesFrom12 = (str = '') => {
    if (!str) return 99999;
    str = str.trim();
    // Puede venir como HH:MM AM
    const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) {
      // Quizá formato 24h
      const m24 = str.match(/^(\d{2}):(\d{2})$/);
      if (m24) return Number(m24[1]) * 60 + Number(m24[2]);
      return 99999;
    }
    let h = Number(m[1]);
    const min = Number(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return h * 60 + min;
  };
  
  // Helper para convertir fecha+hora a timestamp comparable para ordenamiento
  const getDateTimeTimestamp = (venta) => {
    const fecha = venta.fecha || '';
    if (!fecha) return 0;
    
    // Normalizar fecha a formato ISO (YYYY-MM-DD)
    let fechaISO = fecha;
    if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // Formato DD/MM/YYYY -> convertir a ISO
      const [d, m, y] = fecha.split('/');
      fechaISO = `${y}-${m}-${d}`;
    } else if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Si no es ni DD/MM/YYYY ni ISO, intentar parsear como fecha válida
      try {
        const parsed = new Date(fecha);
        if (isNaN(parsed.getTime())) return 0;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        fechaISO = `${y}-${m}-${d}`;
      } catch {
        return 0;
      }
    }
    
    // Obtener hora (puede venir como horaEntrega o hora)
    const horaStr = (venta.horaEntrega || venta.hora || '').trim();
    
    // Convertir hora a minutos del día
    let minutosDia = 0;
    if (horaStr) {
      const minutos = minutesFrom12(horaStr.split('-')[0].trim());
      // minutesFrom12 retorna 99999 si no puede parsear, tratarlo como 0 (medianoche)
      minutosDia = minutos === 99999 ? 0 : minutos;
    }
    
    // Convertir a timestamp: fecha en milisegundos + minutos en milisegundos
    try {
      const fechaDate = new Date(fechaISO + 'T00:00:00');
      if (isNaN(fechaDate.getTime())) return 0;
      const timestampBase = fechaDate.getTime();
      // Agregar minutos del día (si hay hora válida)
      return timestampBase + (minutosDia * 60 * 1000);
    } catch {
      return 0;
    }
  };
  
  // Unificar y ordenar igual que historial, pero incluyendo fecha+hora
  const unificados = [...confirmadas, ...canceladasConCosto];
  const filtradas = unificados.slice().sort((a, b) => {
    // Prioridad 1: por fecha+hora combinada (más reciente primero) - PRIMERA PRIORIDAD
    const timestampA = getDateTimeTimestamp(a);
    const timestampB = getDateTimeTimestamp(b);
    // Si ambas tienen fecha+hora válida, ordenar por eso
    if (timestampA > 0 && timestampB > 0) {
      if (timestampB !== timestampA) return timestampB - timestampA; // descendente
    }
    // Si solo una tiene fecha+hora válida, esa va primero
    if (timestampA > 0 && timestampB === 0) return -1;
    if (timestampA === 0 && timestampB > 0) return 1;
    
    // Prioridad 2: por fecha textual como fallback (más reciente primero)
    if ((a.fecha || '') !== (b.fecha || '')) {
      const fechaA = a.fecha || '';
      const fechaB = b.fecha || '';
      // Si ambas son ISO (YYYY-MM-DD), comparar directamente
      if (fechaA.match(/^\d{4}-\d{2}-\d{2}$/) && fechaB.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return fechaB.localeCompare(fechaA); // descendente
      }
      // Si ambas son DD/MM/YYYY, convertir a ISO para comparar
      if (fechaA.match(/^\d{2}\/\d{2}\/\d{4}$/) && fechaB.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dA, mA, yA] = fechaA.split('/');
        const [dB, mB, yB] = fechaB.split('/');
        const isoA = `${yA}-${mA}-${dA}`;
        const isoB = `${yB}-${mB}-${dB}`;
        return isoB.localeCompare(isoA); // descendente
      }
      // Fallback: comparación textual
      return fechaB.localeCompare(fechaA);
    }
    
    // Prioridad 3: timestamp de confirmación o cancelación - SOLO como fallback
    const ta = a.confirmadoAt || a.canceladoAt || 0;
    const tb = b.confirmadoAt || b.canceladoAt || 0;
    if (tb !== ta) return tb - ta;
    
    // Prioridad 4: por id descendente para estabilidad
    return (b.id || '').localeCompare(a.id || '');
  });
  // Construir filas
  const rows = filtradas.map(s => {
    const totalCalc = Number(s.total != null ? s.total : (Number(s.precio || 0) * Number(s.cantidad || 0)));
    const gastoCancel = Number(s.gastoCancelacion || 0);
    const esCanceladaSint = !!s.sinteticaCancelada;
    return {
      id: s.id || '—',
      fecha: s.fecha || '-',
      hora: s.horaEntrega || s.hora || '-',
      ciudad: s.ciudad || '-',
      encomienda: s.encomienda || '-',
      usuario: s.usuario || s.vendedoraId || '-',
      precio: s.precio || '-',
      delivery: esCanceladaSint ? gastoCancel : (s.delivery || '-'),
      total: esCanceladaSint ? -gastoCancel : (s.total || totalCalc),
      celular: s.celular || '-',
      comprobante: s.comprobante || '',
      cancelada: esCanceladaSint
    };
  });
  const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);

  return (
    <div className="bg-[#10161e] rounded-2xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-bold text-[#ea9216]">{city}</span>
        <span className="text-xs text-neutral-400">
          {rows.length} entregas confirmadas • Total Bs {total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#181f29] text-neutral-200">
              <th className="px-2 py-1">Fecha</th>
              <th className="px-2 py-1">Hora</th>
              <th className="px-2 py-1">Ciudad</th>
              <th className="px-2 py-1">Encomienda</th>
              <th className="px-2 py-1">Usuario</th>
              <th className="px-2 py-1">Precio</th>
              <th className="px-2 py-1">Delivery</th>
              <th className="px-2 py-1">Total</th>
              <th className="px-2 py-1">Celular</th>
              <th className="px-2 py-1">Comprobante</th>
              <th className="px-2 py-1">Cancelada</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-neutral-400 py-4">Sin ventas confirmadas.</td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="border-b border-[#232b36]">
                  <td className="px-2 py-1">{r.fecha}</td>
                  <td className="px-2 py-1">{r.hora}</td>
                  <td className="px-2 py-1">{r.ciudad}</td>
                  <td className="px-2 py-1">{r.encomienda}</td>
                  <td className="px-2 py-1">{r.usuario}</td>
                  <td className="px-2 py-1">{r.precio}</td>
                  <td className="px-2 py-1">{r.delivery}</td>
                  <td className="px-2 py-1" style={r.cancelada ? { color: '#e57373', fontWeight: 'bold' } : {}}>{r.total}</td>
                  <td className="px-2 py-1">{r.celular}</td>
                  <td className="px-2 py-1">{r.comprobante ? <a href={r.comprobante} target="_blank" rel="noopener noreferrer">Ver</a> : "-"}</td>
                  <td className="px-2 py-1 text-center">{r.cancelada ? 'Sí' : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
