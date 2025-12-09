import React, { useEffect, useState } from "react";
import { subscribeCityStock } from "../supabaseUtils";

// Componente: muestra el stock real de Supabase para una ciudad
export default function AlmacenCityStock({ city, products }) {
  const [cityStock, setCityStock] = useState({});
  useEffect(() => {
    if (!city) return;
    const unsub = subscribeCityStock(city, (data) => {
      // subscribeCityStock ya devuelve un objeto { sku: cantidad }
      // Si viene como array, convertirlo; si ya es objeto, usarlo directamente
      const stockObj = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.sku && typeof item.cantidad === 'number') {
            stockObj[item.sku] = item.cantidad;
          }
        });
      } else if (data && typeof data === 'object') {
        // Ya es un objeto { sku: cantidad }
        Object.assign(stockObj, data);
      }
      console.log(`[AlmacenCityStock] cityStock de ${city}:`, stockObj);
      setCityStock(stockObj);
    });
    return () => unsub && unsub();
  }, [city]);

  return (
    <div className="mb-8 bg-[#0f171e] rounded-2xl p-4">
  <h3 className="text-sm font-semibold mb-2" style={{color:'#e7922b', textTransform:'uppercase'}}>STOCK EN {city.toUpperCase()}</h3>
      <div className="flex flex-wrap gap-2">
        {products
          .filter(p => !p.sintetico)
          .slice()
          .sort((a,b)=>{
            const sa = cityStock[a.sku] || 0;
            const sb = cityStock[b.sku] || 0;
            if (sa !== sb) return sa - sb; // ascendente por stock
            return a.nombre.localeCompare(b.nombre); // desempate alfabético
          })
          .map(p => {
            const stock = cityStock[p.sku] || 0;
            let levelClass = 'bg-[#151c22]';
            if (stock < 6) levelClass = 'bg-red-900/60 ring-1 ring-red-600';
            else if (stock < 12) levelClass = 'bg-amber-900/50 ring-1 ring-amber-600/70';
            else levelClass = 'bg-emerald-900/40 ring-1 ring-emerald-600/60';
            const levelLabel = stock < 6 ? 'Bajo' : stock < 12 ? 'Medio' : 'Alto';
            return (
              <div
                key={p.sku}
                className={`${levelClass} rounded-xl px-3 py-2 flex flex-col items-center min-w-0 max-w-[180px] transition-colors`}
                style={{flex:'0 0 auto'}}
                title={`${p.nombre} | Stock: ${stock} (${levelLabel})`}
              >
                  <div className="font-medium truncate text-white w-full text-center" style={{maxWidth:'150px'}}>{p.nombre}</div>
                <div className="text-xs text-white truncate w-full text-center">Stock: <span className="font-bold" style={{color:'#e7922b'}}>{stock}</span></div>
              </div>
            );
          })}
        {products.filter(p => !p.sintetico).length === 0 && <div className="text-neutral-500 text-sm">No hay productos registrados.</div>}
      </div>
    </div>
  );
}
