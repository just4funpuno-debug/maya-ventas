import React, { useEffect, useState, useMemo } from "react";
import { subscribeCollection } from "../../supabaseUsers.js";
import CitySummary from "../../components/CitySummary.jsx";

// Este wrapper suscribe a ventasporcobrar y muestra la tabla de entregas confirmadas por ciudad
export default function SalesPage() {
  console.log('[DEBUG] SalesPage montado');
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [city, setCity] = useState("EL ALTO");

  // Suscripción a ventasporcobrar con normalización igual a historial
  useEffect(() => {
    const unsub = subscribeCollection('ventasporcobrar', (porCobrarRaw) => {
      console.log('[DEBUG] ventasporcobrar recibidas (raw):', porCobrarRaw.length);
      // Normalización adicional (subscribeCollection ya normaliza, pero agregamos timestamps si faltan)
      let base = Date.now() - porCobrarRaw.length;
      const porCobrar = porCobrarRaw.map(s => {
        let next = s;
        if ((next.estadoEntrega || 'confirmado') === 'confirmado' && !next.confirmadoAt) {
          next = { ...next, confirmadoAt: ++base };
        }
        if (next.estadoEntrega === 'cancelado' && !next.canceladoAt) {
          next = { ...next, canceladoAt: ++base };
        }
        if (!next.vendedoraId && next.vendedora) {
          // No tenemos seedUsers aquí, así que solo dejar el campo vacío o igualar nombre
          next = { ...next, vendedoraId: next.vendedora };
        }
        return next;
      });
      console.log('[DEBUG] ventasporcobrar normalizadas:', porCobrar);
      setSales(porCobrar);
    }, {
      orderBy: { column: 'created_at', ascending: false }
    });
    return () => unsub();
  }, []);

  // Suscripción a productos (opcional, para mostrar nombres de productos)
  useEffect(() => {
    const unsub = subscribeCollection('almacenCentral', (prods) => {
      console.log('[DEBUG] productos recibidos:', prods.length);
      setProducts(prods);
    });
    return () => unsub();
  }, []);

  const cities = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ"];

  // Filtrar igual que historial: solo confirmadas y canceladas con costo
  // Usar 'estadoEntrega' para compatibilidad con ventashistorico y ventasporcobrar
  const filteredSales = useMemo(() => sales.filter(s => {
    const estado = s.estadoEntrega || 'confirmado';
    if (estado === 'entregada' || estado === 'confirmado') return true;
    if (estado === 'cancelado' && Number(s.gastoCancelacion || 0) > 0) return true;
    return false;
  }), [sales]);
  console.log('[RENDER] filteredSales:', filteredSales);
  console.log('[DEBUG] ventasporcobrar filtradas:', filteredSales);

  return (
    <div className="flex-1 p-6 space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Ventas</h2>
      </header>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mr-2">Ciudades:</div>
        {cities.map(c => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={
              "px-5 py-3 rounded-xl text-base font-semibold transition " +
              (city === c
                ? "bg-[#ea9216] text-[#313841]"
                : "bg-[#10161e] hover:bg-[#273947]/40 text-neutral-200")
            }
            style={{letterSpacing:'0.5px'}}
          >
            {c}
          </button>
        ))}
      </div>
      <CitySummary city={city} sales={filteredSales} setSales={setSales} products={products} session={{rol:'admin'}} setProducts={setProducts} setView={()=>{}} setDepositSnapshots={()=>{}} />
    </div>
  );
}
