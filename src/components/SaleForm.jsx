import React, { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { todayISO } from "../App.jsx"; // si todayISO no es exportado, mover helper a util común y ajustar import

export default function SaleForm({ products, session, onSubmit }) {
  const [fecha, setFecha] = useState(todayISO());
  const ciudades = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ"];
  const [ciudadVenta, setCiudadVenta] = useState(ciudades[0]);
  const visibleProducts = useMemo(()=>{
    const assigned = session.productos || [];
    if (session.rol === 'admin' || assigned.length === 0) return products;
    return products.filter(p => assigned.includes(p.sku));
  }, [products, session]);

  const [sku, setSku] = useState(visibleProducts[0] ? visibleProducts[0].sku : "");
  const [cantidad, setCantidad] = useState(1);
  const [precioTotal, setPrecioTotal] = useState(0);
  const [hIni, setHIni] = useState('');
  const [mIni, setMIni] = useState('00');
  const [ampmIni, setAmpmIni] = useState('AM');
  const [hFin, setHFin] = useState('');
  const [mFin, setMFin] = useState('00');
  const [ampmFin, setAmpmFin] = useState('PM');
  const [skuExtra, setSkuExtra] = useState('');
  const [cantidadExtra, setCantidadExtra] = useState(0);
  const [metodo, setMetodo] = useState("Efectivo");
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [celular, setCelular] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(()=>{ setFecha(todayISO()); },[]);

  function build12(h,m,ap){
    if(!h) return '';
    return `${h}:${m} ${ap}`;
  }

  function submit(e){
    e.preventDefault();
    if(!sku) return alert('Producto inválido');
    if(!cantidad || cantidad <=0) return alert('Cantidad inválida');
    if(skuExtra && cantidadExtra <=0) return alert('Cantidad adicional inválida');
    const inicioStr = build12(hIni,mIni,ampmIni);
    const finStr = build12(hFin,mFin,ampmFin);
    const horaEntrega = inicioStr && finStr ? `${inicioStr}-${finStr}` : (inicioStr || '');
    onSubmit({
      fecha,
      ciudad: ciudadVenta,
      sku,
      cantidad: Number(cantidad),
      skuExtra: skuExtra || undefined,
      cantidadExtra: skuExtra ? Number(cantidadExtra) : undefined,
      total: Number(precioTotal||0),
      horaEntrega,
      vendedora: session.nombre,
      metodo,
      celular,
      notas,
      comprobante: comprobanteFile || undefined
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-[#f09929]" /> Registrar venta
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Hora inicio</label>
          <div className="flex gap-2 mt-1">
            <select value={hIni} onChange={e=>setHIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-16">
              <option value="">--</option>
              {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
            <select value={mIni} onChange={e=>setMIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-18">
              {['00','15','30','45'].map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={ampmIni} onChange={e=>setAmpmIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm">
              <option>AM</option><option>PM</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Hora fin (opcional)</label>
          <div className="flex gap-2 mt-1">
            <select value={hFin} onChange={e=>setHFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-16">
              <option value="">--</option>
              {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
            <select value={mFin} onChange={e=>setMFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-18">
              {['00','15','30','45'].map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={ampmFin} onChange={e=>setAmpmFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm">
              <option>AM</option><option>PM</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Ciudad</label>
          <select value={ciudadVenta} onChange={e=>setCiudadVenta(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
            {ciudades.map(c=> <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2 text-xs text-neutral-500 -mt-2">
          Producto principal ya fue elegido al iniciar. ({(visibleProducts.find(p=>p.sku===sku)?.nombre)||'—'})
        </div>
        <div>
          <label className="text-sm">Cantidad</label>
          <input type="number" min={1} value={cantidad} onChange={e=>setCantidad(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Precio TOTAL</label>
          <input type="number" step="0.01" value={precioTotal} onChange={e=>setPrecioTotal(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Producto adicional (opcional)</label>
          <select value={skuExtra} onChange={e=>setSkuExtra(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
            <option value="">— Ninguno —</option>
            {visibleProducts.filter(p=>p.sku!==sku).map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Cantidad adicional</label>
            <input type="number" min={0} value={cantidadExtra} onChange={e=>setCantidadExtra(e.target.value)} disabled={!skuExtra} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-50" />
        </div>
        <div>
          <label className="text-sm">Método de pago</label>
          <select value={metodo} onChange={e=>setMetodo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
            <option value="Efectivo">Efectivo</option>
            <option value="Deposito QR">Deposito QR</option>
          </select>
          {metodo === 'Deposito QR' && (
            <div className="mt-2 text-xs space-y-1">
              <input type="file" accept="image/*,.pdf" onChange={async e=>{
                const f = e.target.files?.[0]; if(!f){ setComprobanteFile(null); return; }
                if(f.size > 2*1024*1024){ alert('Archivo supera 2MB'); return; }
                const reader = new FileReader();
                reader.onload = ev=> setComprobanteFile(ev.target?.result || null);
                reader.readAsDataURL(f);
              }} className="text-xs" />
              <div className="text-[10px] text-neutral-500">Sube comprobante (máx 2MB). Se guarda local.</div>
              {comprobanteFile && <div className="text-[10px] text-green-400">Comprobante adjuntado</div>}
            </div>
          )}
        </div>
        <div>
          <label className="text-sm">Celular</label>
          <input value={celular} onChange={e=>setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Número" />
        </div>
        <div className="col-span-2">
          <label className="text-sm">Notas</label>
          <textarea value={notas} onChange={e=>setNotas(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Observaciones" />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-[#ea9216] text-[#313841] rounded-xl font-semibold">Guardar venta</button>
      </div>
    </form>
  );
}