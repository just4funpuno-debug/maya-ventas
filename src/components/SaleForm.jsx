
import React, { useEffect, useMemo, useState } from "react";
import { AsyncButton } from "./AsyncButton.jsx";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { todayISO } from "../App.jsx"; // si todayISO no es exportado, mover helper a util común y ajustar import
import { uploadComprobanteToSupabase } from "../supabaseStorage";
import { compressImage } from "../utils/imageCompression";
import { useToast } from "./ToastProvider.jsx";
import { createContactFromSale } from "../services/whatsapp/sales-integration";
import { getAllAccounts } from "../services/whatsapp/accounts";

export default function SaleForm({ products, session, onSubmit, initialSku, fixedCity, cityStock }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [noStockFlash, setNoStockFlash] = useState(false);
  const [fecha, setFecha] = useState(todayISO());
  const isAdmin = session?.rol === 'admin';
  const today = todayISO();
  const ciudades = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ","PRUEBA"];
  const [ciudadVenta, setCiudadVenta] = useState(fixedCity || ciudades[0]);
  const visibleProducts = useMemo(()=>{
    const assigned = session.productos || [];
    // Debug: Log para diagnosticar problema en Vercel
    if (typeof window !== 'undefined' && import.meta.env?.PROD) {
      console.log('[SaleForm] Debug productos:', {
        userId: session?.id,
        rol: session?.rol,
        productosAssigned: assigned,
        productosLength: assigned.length,
        allProductsCount: products.length,
        isAdmin: session?.rol === 'admin'
      });
    }
    if (session.rol === 'admin' || assigned.length === 0) return products;
    const filtered = products.filter(p => assigned.includes(p.sku));
    if (typeof window !== 'undefined' && import.meta.env?.PROD) {
      console.log('[SaleForm] Productos filtrados:', filtered.length);
    }
    return filtered;
  }, [products, session]);

  const [sku, setSku] = useState(initialSku || (visibleProducts[0] ? visibleProducts[0].sku : ""));
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
  // Guardar el File, no base64
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [celular, setCelular] = useState("");
  const [notas, setNotas] = useState("");
  const [overlayMsg, setOverlayMsg] = useState(null); // {title, message}
  const [createWhatsAppContact, setCreateWhatsAppContact] = useState(false);
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  useEffect(()=>{ setFecha(todayISO()); },[]);

  // Cargar cuentas WhatsApp disponibles
  useEffect(() => {
    async function loadAccounts() {
      try {
        const { data, error } = await getAllAccounts();
        if (error) {
          console.warn('[SaleForm] Error cargando cuentas WhatsApp:', error);
          return;
        }
        const activeAccounts = (data || []).filter(acc => acc.active);
        setWhatsappAccounts(activeAccounts);
        // Seleccionar primera cuenta activa por defecto
        if (activeAccounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(activeAccounts[0].id);
        }
      } catch (err) {
        console.warn('[SaleForm] Error cargando cuentas WhatsApp:', err);
      }
    }
    loadAccounts();
  }, []);

  function build12(h,m,ap){
    if(!h) return '';
    return `${h}:${m} ${ap}`;
  }

  async function submit(){
    if(saving) return; // evita multiclick redundante (AsyncButton también bloquea)
    if(stockActual <= 0){
      setNoStockFlash(true);
      setOverlayMsg({ title:'Sin stock', message:'No hay unidades disponibles en esta ciudad para este producto.' });
      setTimeout(()=> setNoStockFlash(false), 3000);
      return;
    }
    if(fecha < today){
      toast.push({ type: 'error', title: 'Error', message: 'No puedes seleccionar una fecha pasada.' });
      setFecha(today);
      return;
    }
  if(!sku){ setOverlayMsg({ title:'Producto', message:'Producto inválido.'}); return; }
  if(!cantidad || cantidad <=0){ setOverlayMsg({ title:'Cantidad', message:'Cantidad inválida.'}); return; }
  if(skuExtra && cantidadExtra <=0){ setOverlayMsg({ title:'Adicional', message:'Cantidad adicional inválida.'}); return; }
    const inicioStr = build12(hIni,mIni,ampmIni);
    const finStr = build12(hFin,mFin,ampmFin);
    const horaEntrega = inicioStr && finStr ? `${inicioStr}-${finStr}` : (inicioStr || '');

    let comprobanteCloudUrl = null;
    if (comprobanteFile) {
      try {
        // Usar Supabase Storage en todos los entornos
        const result = await uploadComprobanteToSupabase(comprobanteFile, 'comprobantes');
        comprobanteCloudUrl = result.url || result.secure_url;
        setComprobanteUrl(comprobanteCloudUrl);
      } catch (err) {
        toast.push({ type: 'error', title: 'Error', message: 'Error al subir comprobante: ' + err.message });
        return;
      }
    }

    try {
      setSaving(true);
      const result = await onSubmit({
      fecha,
      ciudad: ciudadVenta,
      sku,
      cantidad: Number(cantidad),
      skuExtra: skuExtra || undefined,
      cantidadExtra: skuExtra ? Number(cantidadExtra) : undefined,
  precio: Number(precioTotal||0),
      horaEntrega,
      vendedora: session.nombre,
      metodo,
      celular,
      notas,
      comprobante: comprobanteCloudUrl || undefined
      });

      // Crear contacto WhatsApp si está habilitado y hay celular
      if (createWhatsAppContact && celular && celular.trim() && selectedAccountId && result?.id) {
        try {
          const { data: contact, error: contactError, wasExisting } = await createContactFromSale(
            result.id,
            selectedAccountId
          );

          if (contactError) {
            console.error('[SaleForm] Error creando contacto WhatsApp:', contactError);
            toast.push({
              type: 'warning',
              title: 'Contacto WhatsApp',
              message: `Venta guardada, pero no se pudo crear contacto: ${contactError.message}`
            });
          } else if (contact) {
            toast.push({
              type: 'success',
              title: 'Contacto WhatsApp',
              message: wasExisting
                ? 'Venta asociada con contacto existente'
                : 'Contacto WhatsApp creado exitosamente'
            });
          }
        } catch (err) {
          console.error('[SaleForm] Error creando contacto WhatsApp:', err);
          // No mostrar error al usuario, la venta ya se guardó
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const prodActual = visibleProducts.find(p=>p.sku===sku);
  const stockCiudad = cityStock && sku ? Number(cityStock[sku]||0) : null;
  const stockActual = stockCiudad !== null ? stockCiudad : (prodActual ? Number(prodActual.stock||0) : 0);
  // Ajustar cantidad si excede stock o si stock es cero
  useEffect(()=>{
    setCantidad(prev => {
      if(stockActual <=0) return 0;
      const n = Number(prev)||0;
      if(n<1) return 1;
      if(n>stockActual) return stockActual;
      return n;
    });
    // limpiar flash si ahora hay stock
    if(stockActual>0 && noStockFlash) setNoStockFlash(false);
  }, [stockActual]);

  // Filtrar productos extra con stock > 0
  const extraOptions = useMemo(()=> visibleProducts.filter(p=> !p.sintetico && p.sku!==sku).filter(p=>{
    if(cityStock){ return Number(cityStock[p.sku]||0) > 0; }
    return Number(p.stock||0) > 0;
  }), [visibleProducts, sku, cityStock]);
  const prodExtra = extraOptions.find(p=> p.sku===skuExtra);
  const stockExtraCiudad = cityStock && skuExtra ? Number(cityStock[skuExtra]||0) : null;
  const stockExtra = stockExtraCiudad !== null ? stockExtraCiudad : (prodExtra ? Number(prodExtra.stock||0) : 0);
  useEffect(()=>{
    if(!skuExtra) { setCantidadExtra(0); return; }
    setCantidadExtra(prev => {
      const n = Number(prev)||0;
      if(n<0) return 0;
      if(n>stockExtra) return stockExtra;
      return n;
    });
  }, [skuExtra, stockExtra]);
  const esSintetico = !!prodActual?.sintetico;
  return (
    <form
      onSubmit={e=> { e.preventDefault(); }}
      onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); } }}
      className="space-y-4"
    >
      {overlayMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 rounded-2xl">
          <div className="bg-neutral-900/95 border border-neutral-700 rounded-2xl p-6 w-[320px] max-w-[90%] text-center shadow-xl animate-slide-in-right">
            <h4 className="text-lg font-semibold mb-2 text-red-400 tracking-wide">{overlayMsg.title}</h4>
            <p className="text-sm text-neutral-300 mb-4 whitespace-pre-wrap">{overlayMsg.message}</p>
            <button type="button" onClick={()=>setOverlayMsg(null)} className="px-4 py-2 rounded-xl bg-[#ea9216] text-[#2b2b2b] font-semibold hover:bg-[#f3a63f] focus:outline-none focus:ring-2 focus:ring-amber-400/60">Entendido</button>
          </div>
        </div>
      )}
      <h3 className="font-semibold text-lg mb-1 flex items-center gap-2 relative">
        <ShoppingCart className="w-5 h-5 text-[#f09929]" /> Registrar venta
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Fecha</label>
          <input
            type="date"
            value={fecha}
            min={today}
            onChange={e=>{
              const v = e.target.value;
              if(v < today) return; // ignora fechas pasadas
              setFecha(v);
            }}
            className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1"
          />
        </div>
  <div className="md:col-span-1">
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
  <div className="md:col-span-1">
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
    <div className="md:col-span-1">
          <label className="text-sm">Ciudad</label>
    <select value={ciudadVenta} onChange={e=>setCiudadVenta(e.target.value)} disabled={!!fixedCity} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-50">
            {ciudades.map(c=> <option key={c}>{c}</option>)}
          </select>
        </div>
    <div className="md:col-span-2 text-xs text-neutral-500 -mt-2">
      Producto principal {(initialSku? 'fijado':'seleccionado')} al iniciar: {(visibleProducts.find(p=>p.sku===sku)?.nombre)||'—'}
    </div>
        {!esSintetico && (
          <>
      <div className="md:col-span-1">
              <label className="text-sm flex items-center justify-between">Cantidad
                {prodActual && <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-full ${stockActual<=0?'bg-red-700 text-white': stockActual<5? 'bg-amber-600 text-[#1d1d1d]':'bg-emerald-600 text-[#0f2318]'}`}>Disp: {stockActual}</span>}
              </label>
              <input
                type="number"
                min={stockActual>0?1:0}
                max={stockActual}
                value={cantidad}
                disabled={stockActual<=0}
                onChange={e=>{
                  const v = Number(e.target.value)||0;
                  if(stockActual<=0){ setCantidad(0); return; }
                  if(v<1) setCantidad(1); else if(v>stockActual) setCantidad(stockActual); else setCantidad(v);
                }}
                className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-50"
              />
            </div>
      <div className="md:col-span-1">
              <label className="text-sm">Precio TOTAL</label>
              <input type="number" step="0.01" value={precioTotal} onChange={e=>setPrecioTotal(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
            </div>
      <div className="md:col-span-1">
              <label className="text-sm flex items-center justify-between">Producto adicional (opcional)
                {skuExtra && <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-full ${stockExtra<=0?'bg-red-700 text-white': stockExtra<5? 'bg-amber-600 text-[#1d1d1d]':'bg-emerald-600 text-[#0f2318]'}`}>Disp: {stockExtra}</span>}
              </label>
              <select value={skuExtra} onChange={e=>setSkuExtra(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
                <option value="">— Ninguno —</option>
                {extraOptions.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
              </select>
            </div>
      <div className="md:col-span-1">
              <label className="text-sm">Cantidad adicional</label>
                <input
                  type="number"
                  min={0}
                  max={stockExtra}
                  value={cantidadExtra}
                  onChange={e=>{
                    const v = Number(e.target.value)||0;
                    if(!skuExtra){ setCantidadExtra(0); return; }
                    if(v<0) setCantidadExtra(0); else if(v>stockExtra) setCantidadExtra(stockExtra); else setCantidadExtra(v);
                  }}
                  disabled={!skuExtra}
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-50"
                />
            </div>
      <div className="md:col-span-1">
              <label className="text-sm">Método de pago</label>
              <select value={metodo} onChange={e=>setMetodo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
                <option value="Efectivo">Efectivo</option>
                <option value="Deposito QR">Deposito QR</option>
              </select>
              {metodo === 'Deposito QR' && (
                <div className="mt-2 text-xs space-y-1">
                  <input type="file" accept="image/*,.pdf" onChange={async e=>{
                    const f = e.target.files?.[0];
                    if(!f){ setComprobanteFile(null); return; }
                    if(f.size > 2*1024*1024){ toast.push({ type: 'error', title: 'Error', message: 'Archivo supera 2MB' }); return; }
                    
                    // Comprimir imagen si es una imagen (no PDF)
                    if(f.type.startsWith('image/')) {
                      try {
                        const compressed = await compressImage(f, 60, 500);
                        setComprobanteFile(compressed);
                      } catch (err) {
                        console.warn('Error comprimiendo imagen, usando original:', err);
                        setComprobanteFile(f); // Usar original si falla la compresión
                      }
                    } else {
                      // Si es PDF, usar directamente sin comprimir
                      setComprobanteFile(f);
                    }
                  }} className="text-xs" />
                  <div className="text-[10px] text-neutral-500">
                    Sube comprobante (máx 2MB). 
                    Se sube a Supabase Storage.}
                  </div>
                  {comprobanteFile && <div className="text-[10px] text-green-400">Comprobante listo para subir</div>}
                  {comprobanteUrl && <div className="text-[10px] text-blue-400">Subido: <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer">ver archivo</a></div>}
                </div>
              )}
            </div>
            <div className="md:col-span-1">
              <label className="text-sm">Celular</label>
              <input value={celular} onChange={e=>setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Número" />
            </div>
          </>
        )}
        {/* Opción para crear contacto WhatsApp */}
        {celular && celular.trim() && whatsappAccounts.length > 0 && (
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createWhatsAppContact}
                onChange={e => setCreateWhatsAppContact(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-800 border-neutral-600 text-[#e7922b] focus:ring-[#e7922b]"
              />
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-300">Crear contacto WhatsApp</span>
              </div>
            </label>
            {createWhatsAppContact && (
              <div className="mt-2 ml-6">
                <label className="text-xs text-neutral-400">Cuenta WhatsApp:</label>
                <select
                  value={selectedAccountId || ''}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full bg-neutral-800 rounded-lg px-2 py-1.5 mt-1 text-xs"
                >
                  {whatsappAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name || acc.phone_number} {acc.active ? '' : '(inactiva)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <div className="md:col-span-2">
          <label className="text-sm">Notas</label>
          <textarea value={notas} onChange={e=>setNotas(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Observaciones" />
        </div>
      </div>
      <div className="flex justify-end pt-2 sticky bottom-0 bg-[#121f27] pb-1">
        <AsyncButton
          onClick={submit}
          busyText="Guardando venta..."
          className={`px-4 py-2 rounded-xl font-semibold transition-colors duration-300 ${
            noStockFlash
              ? 'bg-red-700 text-white animate-pulse'
              : saving
                ? 'bg-neutral-600 text-neutral-300 cursor-not-allowed'
                : (stockActual<=0 ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-[#ea9216] text-[#313841] hover:bg-[#f3a63f]')
          }`}
          disabled={saving || stockActual<=0}
        >{ noStockFlash ? 'Prod. Sin Stock' : 'Guardar venta' }</AsyncButton>
      </div>
    </form>
  );
}