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
  // Unificar y ordenar igual que historial
  const unificados = [...confirmadas, ...canceladasConCosto];
  const filtradas = unificados.slice().sort((a, b) => {
    const ta = a.confirmadoAt || a.canceladoAt || 0;
    const tb = b.confirmadoAt || b.canceladoAt || 0;
    if (tb !== ta) return tb - ta;
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
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
