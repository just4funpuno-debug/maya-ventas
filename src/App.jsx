import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  LogIn, LogOut, ShoppingCart, CircleDollarSign, TrendingUp, AlertTriangle, Upload, Plus,
  Package, FileSpreadsheet, Wallet, Settings, X, UserPlus, MapPin, Search, Plane, Clock, Check, History
} from "lucide-react";
import Papa from "papaparse";

// ---------------------- Helpers ----------------------
const currency = (n, cur = "BOB") =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: cur }).format(Number(n || 0));
const todayISO = () => {
  const fmt = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/La_Paz', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  return fmt;
};
// Formato uniforme DD/MM/AAAA para TODA visualización de fechas (solo UI). Valores internos siguen en ISO.
function toDMY(str){
  if(!str) return '';
  const s = String(str).slice(0,10);
  if(/\d{2}\/\d{2}\/\d{4}/.test(s)) return s; // ya en formato destino
  if(/\d{4}-\d{2}-\d{2}/.test(s)){
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return str;
}
function nowBoliviaMinutes(){
  const time = new Intl.DateTimeFormat('en-GB',{ timeZone:'America/La_Paz', hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date());
  const [h,m] = time.split(':');
  return Number(h)*60 + Number(m);
}
const uid = () => Math.random().toString(36).slice(2, 10);
const firstName = (n='') => n.split(' ')[0] || '';

// ---- Formato hora 12h helpers ----
function to12From24(hhmm='') {
  if(!hhmm) return '';
  const [hStr,m='00'] = hhmm.split(':');
  let h = Number(hStr);
  if(isNaN(h)) return hhmm;
  const ampm = h>=12 ? 'PM':'AM';
  h = h%12; if(h===0) h=12;
  return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}
function normalizeRangeTo12(range='') {
  if(!range) return '';
  if(/am|pm/i.test(range)) return range; // ya en 12h
  if(range.includes('-')) {
    const [a,b] = range.split('-');
    return `${to12From24(a.trim())}-${to12From24(b.trim())}`;
  }
  return to12From24(range.trim());
}
function minutesFrom12(str='') {
  if(!str) return 99999;
  str=str.trim();
  // puede venir como HH:MM AM
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(!m) { // quizá formato 24
    const m24 = str.match(/^(\d{2}):(\d{2})$/);
    if(m24) return Number(m24[1])*60 + Number(m24[2]);
    return 99999;
  }
  let h = Number(m[1]); const min = Number(m[2]); const ap = m[3].toUpperCase();
  if(ap==='AM') { if(h===12) h=0; }
  else { if(h!==12) h+=12; }
  return h*60 + min;
}

function semaforoEntrega(horaEntrega, fechaEntrega){
  if(!horaEntrega) return { color:'#555', clase:'bg-neutral-600', label:'Sin hora' };
  const hoy = todayISO();
  const fecha = fechaEntrega || hoy;
  // Colores vivos
  const ROJO = '#dc2626';
  const AMARILLO = '#facc15'; // amarillo intenso
  const VERDE = '#22c55e'; // verde vivo
  // Si la fecha es futura, verde vivo
  if(fecha > hoy) return { color:VERDE, clase:'bg-[#22c55e]', label:'FUTURO' };
  const inicio = horaEntrega.split('-')[0].trim();
  const targetMin = minutesFrom12(inicio);
  if(targetMin===99999) return { color:'#555', clase:'bg-neutral-600', label:'Pendiente' };
  const nowMin = nowBoliviaMinutes();
  const diff = targetMin - nowMin; // minutos restantes hoy
  if(fecha < hoy) return { color:ROJO, clase:'bg-red-600', label:'ATRASADO' };
  if(diff <= 0) return { color:ROJO, clase:'bg-red-600', label:'HORA DE ENTREGAR' };
  if(diff < 60) {
    // Parpadeo (solo visual) cuando faltan <=10 minutos
    const blink = diff <= 10; 
    return { color:AMARILLO, clase:'bg-[#facc15]', label: diff<=10? 'MENOS DE 10 MIN' : 'FALTA MENOS DE 1 HORA', blinkYellow: blink };
  }
  return { color:VERDE, clase:'bg-[#22c55e]', label:'FALTA MAS DE 1 HORA' };
}

// Frases motivacionales (50: 35 personales, 15 ventas)
const FRASES_MOTIVACION = [
  // Personales (35)
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "La constancia vence lo que la dicha no alcanza.",
  "Cree en ti y todo será posible.",
  "La disciplina tarde o temprano vencerá a la inteligencia.",
  "Hazlo con pasión o no lo hagas.",
  "Si puedes soñarlo, puedes lograrlo.",
  "Tu única competencia eres tú mismo de ayer.",
  "El progreso, no la perfección, es lo que cuenta.",
  "Pequeños pasos construyen grandes destinos.",
  "La actitud correcta convierte lo imposible en posible.",
  "Cuando sientas que vas a rendirte, recuerda por qué empezaste.",
  "Cada día es una nueva oportunidad para mejorar.",
  "El sacrificio de hoy es el éxito de mañana.",
  "No hace falta ser grande para empezar, pero hay que empezar para ser grande.",
  "Tu mente es tu mayor herramienta: aliméntala de pensamientos positivos.",
  "El enfoque vence al talento cuando el talento no se enfoca.",
  "Haz que cada hora cuente.",
  "El fracaso es información, no una identidad.",
  "La paciencia construye resultados duraderos.",
  "Si no cambia, no crece. Si no crece, no estás viviendo.",
  "Tu energía atrae tu tipo de resultados.",
  "Sueña en grande, actúa en detalle.",
  "La clave está en comenzar incluso cuando no te sientas listo.",
  "La mejor inversión es la que haces en ti mismo.",
  "Construye hábitos; los hábitos construyen tu futuro.",
  "No esperes motivación: crea disciplina.",
  "El miedo es una señal de que estás creciendo.",
  "Rodéate de personas que te reten a mejorar.",
  "El tiempo no se encuentra: se crea.",
  "Comprométete con el proceso y el resultado llegará.",
  "Tu estándar define tu techo.",
  "Menos excusas, más acción.",
  "Haz hoy algo por lo que tu yo futuro te agradezca.",
  "Transforma presión en impulso.",
  "Persiste: lo que hoy pesa mañana fortalece.",
  // Ventas (15)
  "Cada llamada es una oportunidad, no una interrupción.",
  "Escuchar al cliente vende más que hablar sin parar.",
  "Una objeción es interés disfrazado: tradúcela en valor.",
  "El seguimiento convierte el ‘quizás’ en ‘sí’.",
  "Vende soluciones, no características.",
  "El cierre empieza desde la primera pregunta bien hecha.",
  "La confianza es la moneda más valiosa en ventas.",
  "Tu energía se contagia: véndete primero a ti mismo.",
  "Un ‘no’ hoy puede ser un ‘sí’ siembra para mañana.",
  "Medir te muestra dónde multiplicar.",
  "Una relación cuidada vale más que una venta rápida.",
  "El producto entra por la emoción y se queda por la lógica.",
  "Si no lo documentas, lo olvidas; si lo mides, lo mejoras.",
  "Haz fácil decir que sí: elimina fricción.",
  "Tu mejor script es comprender el problema real del cliente."
];

function horaBolivia() {
  const h = new Intl.DateTimeFormat('en-GB',{ timeZone:'America/La_Paz', hour:'2-digit', hour12:false }).format(new Date());
  return Number(h);
}

// ---------------------- Seed de DEMO ----------------------
const seedProducts = [
  { id: uid(), sku: "CVP-60", nombre: "Cardio Vascular Plus 60 caps", precio: 120, costo: 48, stock: 35 },
  { id: uid(), sku: "FLEX-60", nombre: "FLEX CAPS 60 caps", precio: 110, costo: 44, stock: 22 },
  { id: uid(), sku: "MENO-60", nombre: "MENO PAUSE 60 caps", precio: 130, costo: 52, stock: 18 },
  { id: uid(), sku: "PBF-250", nombre: "PREBIOTIC FRESH 250 ml", precio: 70, costo: 28, stock: 50 },
];

const seedUsers = [
  { id: "admin", nombre: "Pedro", apellidos: "Admin", celular: "", email: "admin@maya.com", password: "admin123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "admin", productos: [], grupo: 'A' },
  // Renombrada Ana -> Beatriz Vargas
  { id: "v1", nombre: "Beatriz", apellidos: "vargas", celular: "", email: "ana@maya.com", password: "ana123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "seller", productos: [], grupo: 'A' },
  { id: "v2", nombre: "Luisa", apellidos: "Pérez", celular: "", email: "luisa@maya.com", password: "luisa123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "seller", productos: ["MENO-60"], grupo: 'B' },
];

const seedSales = [
  { id: uid(), fecha: todayISO(), ciudad: 'LA PAZ', sku: "CVP-60", cantidad: 2, precio: 120, vendedora: "Beatriz Vargas", metodo: "Efectivo", cliente: "Cliente 1", notas: "" },
  { id: uid(), fecha: todayISO(), ciudad: 'EL ALTO', sku: "FLEX-60", cantidad: 1, precio: 110, vendedora: "Beatriz Vargas", metodo: "Yape/QR", cliente: "Cliente 2", notas: "" },
  { id: uid(), fecha: todayISO(), ciudad: 'COCHABAMBA', sku: "MENO-60", cantidad: 1, precio: 130, vendedora: "Luisa Pérez", metodo: "Transferencia", cliente: "Cliente 3", notas: "" },
];

// LocalStorage helpers
const LS_KEYS = { products: "ventas.products", users: "ventas.users", sales: "ventas.sales", session: "ventas.session", warehouseDispatches: 'ventas.wdispatch' };
// Agregamos almacenamiento para Mis Números
LS_KEYS.numeros = 'ventas.numeros';
function loadLS(k, f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch { return f; } }
let quotaWarned = false;
function saveLS(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    if (e && typeof e === 'object' && 'name' in e && e.name === 'QuotaExceededError') {
      if (k === LS_KEYS.products) {
        try {
          const slim = Array.isArray(v) ? v.map(p => ({ ...p, imagen: null })) : v;
          localStorage.setItem(k, JSON.stringify(slim));
          if (!quotaWarned) { alert('Espacio de almacenamiento lleno. Se guardaron los productos sin imágenes. Usa imágenes más pequeñas.'); quotaWarned = true; }
        } catch { /* ignore */ }
      } else if (!quotaWarned) {
        alert('Espacio local lleno. Considera limpiar datos o reducir tamaño de imágenes.');
        quotaWarned = true;
      }
    }
  }
}

// Estimar uso de LocalStorage (bytes y porcentaje aprox sobre 5MB típico)
function estimateLocalStorageUsage() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) || '';
      // Peso aproximado en bytes (key + value) asumiendo 2 bytes por char
      total += (key.length + value.length) * 2;
    }
    const quota = 5 * 1024 * 1024; // 5MB estimado navegadores comunes
    return { bytes: total, quota, pct: Math.min(100, (total / quota) * 100) };
  } catch {
    return { bytes: 0, quota: 5*1024*1024, pct: 0 };
  }
}

function normalizeUser(u) {
  return {
    id: u.id || uid(),
    nombre: u.nombre || '',
    apellidos: u.apellidos || '',
    celular: u.celular || '',
    email: u.email || '',
    password: u.password || '',
    fechaIngreso: u.fechaIngreso || todayISO(),
    sueldo: typeof u.sueldo === 'number' ? u.sueldo : Number(u.sueldo || 0),
    fechaPago: u.fechaPago || todayISO(),
    rol: u.rol || 'seller',
  productos: Array.isArray(u.productos) ? u.productos : [],
  grupo: u.grupo || ''
  };
}

export default function App() {
  const [products, setProducts] = useState(() => loadLS(LS_KEYS.products, seedProducts));
  const [users, setUsers] = useState(() => loadLS(LS_KEYS.users, seedUsers)
    .map(u=> (u.id==='v1' && u.nombre==='Ana') ? { ...u, nombre:'Beatriz', apellidos:'vargas' } : u)
    .map(normalizeUser));
  const [sales, setSales] = useState(() => {
    const loaded = loadLS(LS_KEYS.sales, seedSales).map(s=> ({ ...s, ciudad: s.ciudad || 'SIN CIUDAD', estadoEntrega: s.estadoEntrega || 'confirmado' }));
    // Asignar timestamps de confirmación a los ya confirmados que no lo tengan para poder ordenar por orden de confirmación.
    let base = Date.now() - loaded.length; // asegura orden estable.
    return loaded.map(s=> {
      let next = s;
      if((next.estadoEntrega||'confirmado')==='confirmado' && !next.confirmadoAt){
        next = { ...next, confirmadoAt: ++base };
      }
      // Migración: agregar vendedoraId si falta
      if(!next.vendedoraId && next.vendedora){
        const full = next.vendedora.toLowerCase().trim();
        const match = seedUsers.find(u=> (`${u.nombre} ${u.apellidos}`.trim().toLowerCase()===full));
        if(match) next = { ...next, vendedoraId: match.id };
      }
      return next;
    });
  });
  const [session, setSession] = useState(() => loadLS(LS_KEYS.session, null));
  const [dispatches, setDispatches] = useState(() => loadLS(LS_KEYS.warehouseDispatches, []).map(d=> ({ ...d, status: d.status || 'confirmado' })));
  // Estado para "Mis Números"
  const [numbers, setNumbers] = useState(()=> loadLS(LS_KEYS.numeros, [])); // [{id, sku, email, celular, caduca, createdAt}]
  const [view, setView] = useState(()=>{
     try { return localStorage.getItem('ui.view') || 'dashboard'; } catch { return 'dashboard'; }
  }); // 'dashboard' | 'historial' | 'ventas' | 'register-sale' | 'almacen' | 'create-user' | 'users-list' | 'products' | 'mis-numeros' | 'config'
  const [greeting, setGreeting] = useState(null); // { saludo, nombre, frase }
  const [greetingCloseReady, setGreetingCloseReady] = useState(false);
  // Comprobantes globales
  const [viewingReceipt, setViewingReceipt] = useState(null); // { id, data }
  const [editingReceipt, setEditingReceipt] = useState(null); // venta en edición
  const [receiptTemp, setReceiptTemp] = useState(null);

  // Mostrar saludo motivacional a vendedoras (no admin) una vez al día
  useEffect(()=>{
    if(!session || session.rol !== 'seller') return;
    try {
      const key = `ventas.greeting.${session.id}`;
      const data = JSON.parse(localStorage.getItem(key)||'null');
      const hoy = todayISO();
      if(data && data.date === hoy) return; // ya mostrado hoy
      // Obtener pool restante de frases sin repetir hasta completar ciclo
      const poolKey = `ventas.greeting.pool.${session.id}`;
      let pool = JSON.parse(localStorage.getItem(poolKey)||'null');
      if(!Array.isArray(pool) || pool.length===0){
        // reiniciar pool barajado
        pool = [...FRASES_MOTIVACION].sort(()=>Math.random()-0.5);
      }
      const frase = pool.shift();
      localStorage.setItem(poolKey, JSON.stringify(pool));
      localStorage.setItem(key, JSON.stringify({ date: hoy, frase }));
      // Saludo según hora Bolivia
      const h = horaBolivia();
      const saludo = h < 12 ? 'Buenos días' : (h < 18 ? 'Buenas tardes' : 'Buenas noches');
      const nombre = (session.nombre||'').split(' ')[0];
      setGreeting({ saludo, nombre: nombre.toUpperCase(), frase });
    } catch {/* ignore */}
  }, [session]);

  // Habilitar botón de cierre tras 5s (no autocierra)
  useEffect(()=>{
    if(!greeting) return;
    setGreetingCloseReady(false);
    const t = setTimeout(()=> setGreetingCloseReady(true), 5000);
    return ()=> clearTimeout(t);
  }, [greeting]);

  // Migración: devolver al stock central la cantidad de ventas pendientes (para nuevo modelo de 'reservado') solo una vez
  useEffect(()=>{
    try {
      if(localStorage.getItem('ventas.reservationMigrationDone')) return;
      const pendings = sales.filter(s=> (s.estadoEntrega||'confirmado')==='pendiente');
      if(!pendings.length) { localStorage.setItem('ventas.reservationMigrationDone','1'); return; }
      const devolver = {};
      pendings.forEach(s=>{
        if(s.sku) devolver[s.sku] = (devolver[s.sku]||0) + Number(s.cantidad||0);
        if(s.skuExtra) devolver[s.skuExtra] = (devolver[s.skuExtra]||0) + Number(s.cantidadExtra||0);
      });
      setProducts(prev => prev.map(p=> devolver[p.sku] ? { ...p, stock: p.stock + devolver[p.sku] } : p));
      localStorage.setItem('ventas.reservationMigrationDone','1');
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => saveLS(LS_KEYS.products, products), [products]);
  useEffect(() => saveLS(LS_KEYS.users, users), [users]);
  useEffect(() => saveLS(LS_KEYS.sales, sales), [sales]);
  useEffect(() => saveLS(LS_KEYS.session, session), [session]);
  useEffect(() => saveLS(LS_KEYS.warehouseDispatches, dispatches), [dispatches]);
  useEffect(() => saveLS(LS_KEYS.numeros, numbers), [numbers]);

  // Persist view when changes
  useEffect(()=>{ try { localStorage.setItem('ui.view', view); } catch {} }, [view]);

  if (!session) return <Auth onLogin={setSession} users={users} products={products} />;

  return (
  <div className="min-h-screen bg-[#121f27] text-neutral-100 flex">
  <Sidebar session={session} onLogout={() => { setSession(null); setView('dashboard'); }} view={view} setView={setView} />
      <AnimatePresence>
        {greeting && (
          <Modal onClose={()=> greetingCloseReady && setGreeting(null)} disableClose>
            <div className="max-w-md text-center space-y-4">
              <h3 className="text-lg font-semibold text-[#e7922b]">{greeting.saludo}, {greeting.nombre} 👋</h3>
              <p className="text-sm text-neutral-300">Que tengas una excelente jornada. “{greeting.frase}”</p>
              {!greetingCloseReady && (
                <p className="text-[10px] text-neutral-500">Podrás cerrar este mensaje en unos segundos...</p>
              )}
              {greetingCloseReady && (
                <button onClick={()=>setGreeting(null)} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-sm font-semibold">Cerrar</button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {view === 'dashboard' && (
        <Main 
          products={products} 
          setProducts={setProducts} 
          sales={sales} 
          setSales={setSales} 
          session={session} 
          users={users}
          onOpenReceipt={(sale)=> sale?.comprobante && setViewingReceipt({ id:sale.id, data:sale.comprobante })}
          onEditReceipt={(sale)=> { setEditingReceipt(sale); setReceiptTemp(sale.comprobante||null); }}
        />
      )}
     {view === 'historial' && session.rol === 'admin' && (
       <HistorialView 
         sales={sales} 
         products={products} 
         session={session} 
         users={users}
         onOpenReceipt={(sale)=> sale?.comprobante && setViewingReceipt({ id:sale.id, data:sale.comprobante })}
       />
     )}
      {view === 'ventas' && (
        <VentasView sales={sales} products={products} session={session} dispatches={dispatches} setDispatches={setDispatches} />
      )}
      {view === 'almacen' && session.rol === 'admin' && (
        <AlmacenView products={products} setProducts={setProducts} dispatches={dispatches} setDispatches={setDispatches} session={session} />
      )}
      {view === 'register-sale' && (
  <RegisterSaleView products={products} setProducts={setProducts} sales={sales} setSales={setSales} session={session} dispatches={dispatches} />
      )}
      {view === 'create-user' && (
        <CreateUserAdmin users={users} setUsers={setUsers} session={session} products={products} />
      )}
      {view === 'users-list' && (
        <UsersListAdmin users={users} setUsers={setUsers} session={session} products={products} />
      )}
      {view === 'products' && session.rol === 'admin' && (
        <ProductsView products={products} setProducts={setProducts} session={session} />
      )}
      {view === 'frases' && session.rol === 'admin' && (
        <FrasesView />
      )}
      {view === 'config' && (
        <ConfigView session={session} users={users} setUsers={setUsers} setSession={setSession} />
      )}
      {view === 'mis-numeros' && (
        <MisNumerosView products={products} numbers={numbers} setNumbers={setNumbers} />
      )}
      {/* Modales globales de comprobantes */}
      <AnimatePresence>
        {viewingReceipt && (
          <Modal onClose={()=> setViewingReceipt(null)}>
            <div className="space-y-4 w-[360px]">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Search className="w-4 h-4" /> Ver Comprobante</h3>
              <div className="text-[11px] text-neutral-400">Venta: <span className="font-semibold text-neutral-200">{viewingReceipt.id.slice(-6)}</span></div>
              <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/40 flex items-center justify-center min-h-[160px]">
                {/^data:application\/pdf/.test(viewingReceipt.data) ? (
                  <a href={viewingReceipt.data} target="_blank" rel="noreferrer" className="text-[11px] underline text-[#e7922b]">Abrir PDF</a>
                ) : (
                  <img src={viewingReceipt.data} alt="Comprobante" className="max-h-60 object-contain" />
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={()=> setViewingReceipt(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cerrar</button>
              </div>
            </div>
          </Modal>
        )}
        {editingReceipt && (
          <Modal onClose={()=>{ setEditingReceipt(null); setReceiptTemp(null); }}>
            <div className="space-y-4 w-[360px]">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Upload className="w-4 h-4" /> Comprobante (QR)</h3>
              <div className="space-y-2 text-xs">
                <div className="text-neutral-400">Venta: <span className="font-semibold text-neutral-200">{editingReceipt.id.slice(-6)}</span></div>
                <input type="file" accept="image/*,.pdf" onChange={e=>{
                  const f = e.target.files?.[0];
                  if(!f){ setReceiptTemp(editingReceipt.comprobante||null); return; }
                  if(f.size > 2*1024*1024){ alert('Archivo supera 2MB'); return; }
                  const reader = new FileReader();
                  reader.onload = ev => setReceiptTemp(ev.target?.result||null);
                  reader.readAsDataURL(f);
                }} className="text-xs" />
                {receiptTemp && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/40">
                    {/^data:application\/pdf/.test(receiptTemp) ? (
                      <a href={receiptTemp} target="_blank" rel="noreferrer" className="text-[10px] underline text-[#e7922b]">Abrir PDF</a>
                    ) : (
                      <img src={receiptTemp} alt="Comprobante" className="max-h-40 mx-auto object-contain" />
                    )}
                  </div>
                )}
                {!receiptTemp && <div className="text-[10px] text-neutral-500">No hay comprobante cargado.</div>}
                <div className="text-[10px] text-neutral-500">Tamaño máximo 2MB. Se almacena localmente en este navegador.</div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setEditingReceipt(null); setReceiptTemp(null); }} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cerrar</button>
                <button disabled={!receiptTemp} onClick={()=>{
                  if(!receiptTemp){ alert('Selecciona un archivo'); return; }
                  setSales(prev => prev.map(s=> s.id===editingReceipt.id ? { ...s, comprobante: receiptTemp } : s));
                  setEditingReceipt(null); setReceiptTemp(null);
                }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs disabled:opacity-40">Guardar</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------- Frases Motivacionales ----------------------
function FrasesView(){
  const frases = FRASES_MOTIVACION;
  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Frases motivacionales</h2>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {frases.map((fr,i)=>(
          <div key={i} className="p-4 rounded-xl bg-[#0f171e] border border-neutral-800 text-sm leading-snug text-neutral-200 shadow">
            “{fr}”
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------- Configuración (cambiar contraseña) ----------------------
function ConfigView({ session, users, setUsers, setSession }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repite, setRepite] = useState('');
  const [msg, setMsg] = useState('');

  function cambiar(e){
    e.preventDefault();
    setMsg('');
    const u = users.find(u=>u.id===session.id);
    if(!u) { setMsg('Usuario no encontrado'); return; }
    if(u.password !== actual){ setMsg('Contraseña actual incorrecta'); return; }
    if(!nueva || nueva.length < 6){ setMsg('La nueva debe tener al menos 6 caracteres'); return; }
    if(nueva !== repite){ setMsg('Las contraseñas no coinciden'); return; }
    const updated = users.map(x=> x.id===u.id ? { ...x, password: nueva } : x);
    setUsers(updated);
    // actualizar sesión
    setSession({ ...session });
    setActual(''); setNueva(''); setRepite('');
    setMsg('Contraseña actualizada');
  }

  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
      <header className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Settings className="w-5 h-5 text-[#f09929]" /> Configuración</h2>
        <p className="text-sm text-neutral-400">Actualiza tu contraseña de acceso.</p>
      </header>
      <div className="max-w-md bg-[#0f171e] p-5 rounded-2xl border border-neutral-800">
        <form onSubmit={cambiar} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Contraseña actual</label>
            <input type="password" value={actual} onChange={e=>setActual(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Nueva contraseña</label>
            <input type="password" value={nueva} onChange={e=>setNueva(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Repite nueva contraseña</label>
            <input type="password" value={repite} onChange={e=>setRepite(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          {msg && <div className={"text-sm "+(msg==='Contraseña actualizada' ? 'text-green-400':'text-red-400')}>{msg}</div>}
          <div className="flex justify-end pt-2">
            <button className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-sm">Guardar</button>
          </div>
        </form>
        <div className="text-[10px] text-neutral-500 mt-4">Recomendación: usa una contraseña única de al menos 8 caracteres con números.</div>
      </div>
    </div>
  );
}

// ---------------------- Auth (sin backticks) ----------------------
function Auth({ onLogin, users }) {
  // Vista simplificada solo para login; creación de vendedoras pasa a interfaz de admin.
  return (
  <div className="min-h-screen grid place-items-center bg-[#313841] text-[#eeeeee] p-6 w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
  <div className="bg-[#3a4750]/80 rounded-2xl p-6 shadow-xl border border-[#313841]">
          <div className="flex items-center gap-3 mb-4">
            <LogIn className="w-5 h-5" />
            <h1 className="text-xl font-semibold text-[#ea9216]">MAYA – Acceso</h1>
          </div>
          <LoginForm users={users} onLogin={onLogin} />
          <div className="mt-4 space-y-2">
            <div className="text-xs text-neutral-400">Accesos demo rápidos</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const u = users.find(u => u.id === 'admin');
                  if (u) onLogin({ id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), email: u.email, rol: u.rol, productos: u.productos || [], grupo: u.grupo||'' });
                }}
                className="flex-1 btn-secondary text-sm"
              >Admin demo</button>
              <button
                type="button"
                onClick={() => {
                  const u = users.find(u => u.id === 'v1') || users.find(u => u.rol === 'seller');
                  if (u) onLogin({ id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), email: u.email, rol: u.rol, productos: u.productos || [], grupo: u.grupo||'' });
                }}
                className="flex-1 btn-secondary text-sm"
              >Vendedora demo</button>
            </div>
          </div>
          <div className="text-xs text-[#eeeeee]/70 mt-4 leading-relaxed">
            Acceso restringido. La creación de nuevas vendedoras ahora solo la realiza un administrador.<br />
            Demo: admin@maya.com / admin123 · ana@maya.com / ana123 · luisa@maya.com / luisa123
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------- Forms ----------------------
function LoginForm({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
  const u = users.find((x) => x.email === email && x.password === password);
  if (!u) return setErr("Credenciales incorrectas");
  onLogin({ id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), email: u.email, rol: u.rol, productos: u.productos || [], grupo: u.grupo||'' });
  }

  return (
  <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm">Correo</label>
  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#3a4750] rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#ea9216]" placeholder="tucorreo@maya.com" />
      </div>
      <div>
        <label className="text-sm">Contraseña</label>
  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#3a4750] rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#ea9216]" placeholder="••••••••" />
      </div>
      {err && <div className="text-red-400 text-sm">{err}</div>}
  <button className="w-full btn-primary mt-2">Entrar</button>
    </form>
  );
}

// (Formulario de registro eliminado del flujo público)

// ---------------------- Sidebar ----------------------
function Sidebar({ session, onLogout, view, setView }) {
  return (
  <aside className="w-[280px] bg-[#273947] border-r border-[#0f171e] p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-2xl bg-[#ea9216] grid place-items-center text-[#313841] font-black">M</div>
  <div>
          <div className="font-semibold leading-tight">MAYA Ventas</div>
          <div className="text-xs text-neutral-400">{session.nombre}</div>
        </div>
      </div>
      <nav className="text-sm flex-1">
        <button onClick={() => setView('dashboard')} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'dashboard' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><TrendingUp className={"w-4 h-4 "+(view==='dashboard'? 'text-[#273947]' : 'text-white')} /> Dashboard</button>
  {session.rol === 'admin' && (
  <button onClick={() => setView('historial')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'historial' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><History className={"w-4 h-4 "+(view==='historial'? 'text-[#273947]' : 'text-white')} /> Historial</button>
  )}
        <button onClick={() => setView('ventas')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'ventas' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><CircleDollarSign className={"w-4 h-4 "+(view==='ventas'? 'text-[#273947]' : 'text-white')} /> VENTAS</button>
        {session.rol === 'admin' && (
          <button onClick={() => setView('almacen')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'almacen' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='almacen'? 'text-[#273947]' : 'text-white')} /> Despacho de Productos</button>
        )}
        {session.rol === 'admin' && (
          <>
            <button onClick={() => setView('create-user')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'create-user' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><UserPlus className={"w-4 h-4 "+(view==='create-user'? 'text-[#273947]' : 'text-white')} /> Crear Usuario</button>
            <button onClick={() => setView('users-list')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'users-list' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Settings className={"w-4 h-4 "+(view==='users-list'? 'text-[#273947]' : 'text-white')} /> Usuarios existentes</button>
          </>
        )}
        <button onClick={() => setView('register-sale')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition " + (view === 'register-sale' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><ShoppingCart className={"w-4 h-4 "+(view==='register-sale'? 'text-[#273947]' : 'text-white')} /> Registrar venta</button>
        {session.rol === 'admin' && (
          <button onClick={() => setView('products')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition " + (view === 'products' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='products'? 'text-[#273947]' : 'text-white')} /> Productos</button>
        )}
        {session.rol === 'admin' && <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-800/60 mt-1 cursor-pointer" onClick={()=>setView('mis-numeros')}><Wallet className="w-4 h-4" /> {view==='mis-numeros' ? <span className="font-semibold text-[#ea9216]">Mis Números</span> : 'Mis Números'}</div>}
        {session.rol === 'admin' && (
          <button onClick={()=>setView('frases')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition "+(view==='frases'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}>💬 Frases motivacionales</button>
        )}
        <button onClick={()=>setView('config')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition "+(view==='config'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Settings className={"w-4 h-4 "+(view==='config'? 'text-[#273947]' : 'text-white')} /> Configuración</button>
      </nav>
      <button onClick={onLogout} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-800/80 text-sm">
        <LogOut className="w-4 h-4" /> Salir
      </button>
    </aside>
  );
}

// ---------------------- Main ----------------------
function Main({ products, setProducts, sales, setSales, session, users }) {
  const [showSale, setShowSale] = useState(false);
  const lowStock = products.filter((p) => p.stock <= 10);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  // Estado para confirmar con costo de delivery
  const [confirmingSale, setConfirmingSale] = useState(null); // id de venta a confirmar
  const [deliveryCost, setDeliveryCost] = useState('');
  // Edición / carga de comprobante (QR)
  const [editingReceipt, setEditingReceipt] = useState(null); // objeto venta
  const [receiptTemp, setReceiptTemp] = useState(null); // base64 temporal
  // Reprogramar pedido pendiente
  const [reschedulingSale, setReschedulingSale] = useState(null); // objeto venta
  const [rsFecha, setRsFecha] = useState(todayISO());
  const [rsHIni, setRsHIni] = useState('');
  const [rsMIni, setRsMIni] = useState('00');
  const [rsAmpmIni, setRsAmpmIni] = useState('AM');
  const [rsHFin, setRsHFin] = useState('');
  const [rsMFin, setRsMFin] = useState('00');
  const [rsAmpmFin, setRsAmpmFin] = useState('PM');

  // Dataset para KPIs: solo ventas confirmadas. Admin: todas; vendedor: las suyas.
  const userSales = useMemo(() => {
    const confirmed = sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado');
    if(session.rol === 'admin') return confirmed;
    return confirmed.filter(s=> s.vendedora === session.nombre);
  }, [sales, session]);

  const kpis = useMemo(() => {
    const hoyISO = todayISO();
    const agg = { total:0, hoy:0, porDia:{} };
    userSales.forEach(s=>{
      const bruto = typeof s.total === 'number' ? s.total : (
        (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)
      );
      const gasto = Number(s.gasto||0);
      const neto = bruto - gasto; // lo solicitado (después de descontar delivery)
      agg.total += bruto; // mantenemos acumulado bruto (puede ajustarse si luego se pide neto)
      if(s.fecha === hoyISO) agg.hoy += neto; // KPI "Ventas de hoy" = neto confirmado
      agg.porDia[s.fecha] = (agg.porDia[s.fecha]||0) + bruto;
    });
    const porDiaData = Object.entries(agg.porDia).sort((a,b)=> a[0].localeCompare(b[0])).map(([fecha,total])=>({fecha,total}));
    return { total: agg.total, hoy: agg.hoy, tickets: userSales.length, porDiaData };
  }, [userSales, products]);

  function confirmarEntregaConCosto(id, costo){
    setSales(prev => {
      const sale = prev.find(s=>s.id===id);
      if(!sale) return prev;
      // Verificar stock central disponible antes de confirmar
      const needed = [{ sku: sale.sku, qty: Number(sale.cantidad||0) }];
  if(sale.skuExtra) needed.push({ sku: sale.skuExtra, qty: Number(sale.cantidadExtra||0) });
      let ok = true;
      setProducts(curr => {
        for(const n of needed){
          const prod = curr.find(p=>p.sku===n.sku);
          if(!prod || prod.stock < n.qty){ ok=false; break; }
        }
        if(!ok) return curr; // no descontamos
        return curr.map(p=>{
          const n = needed.find(x=>x.sku===p.sku); if(!n) return p; return { ...p, stock: p.stock - n.qty };
        });
      });
      if(!ok){ alert('Stock central insuficiente para confirmar este pedido. Revisa inventario.'); return prev; }
  const nowTs = Date.now();
  const today = todayISO();
  return prev.map(s=> {
    if(s.id!==id) return s;
    // Si la fecha programada es futura respecto a hoy, reemplazar por fecha de confirmación
    let fechaFinal = s.fecha;
    if(s.fecha && s.fecha > today) fechaFinal = today;
    return { ...s, fecha: fechaFinal, estadoEntrega:'confirmado', gasto: Number(costo||0), confirmadoAt: nowTs };
  });
    });
  }
  function abrirModalCosto(sale){
    setConfirmingSale(sale.id);
    setDeliveryCost(sale.gasto != null ? String(sale.gasto) : '');
  }
  function cancelarModalCosto(){
    setConfirmingSale(null); setDeliveryCost('');
  }
  function confirmarConCostoSubmit(e){
    e.preventDefault();
    if(deliveryCost === '' || isNaN(Number(deliveryCost))) { alert('Ingresa un costo válido'); return; }
    confirmarEntregaConCosto(confirmingSale, deliveryCost);
    cancelarModalCosto();
  }
  function cancelarEntrega(id){
    setSales(prev => {
      const sale = prev.find(s=>s.id===id);
      if(!sale) return prev;
      // No restauramos porque todavía no se había descontado del central (reservado)
      return prev.filter(s=>s.id!==id);
    });
  }

  function abrirReprogramar(s){
    setReschedulingSale(s);
    setRsFecha(s.fecha || todayISO());
    // parse horaEntrega en formato posible "H:MM AM-H:MM PM" o solo inicio
    const range = normalizeRangeTo12(s.horaEntrega||'');
    let inicio = range;
    let fin = '';
    if(range.includes('-')) { const [a,b] = range.split('-'); inicio = a.trim(); fin = b.trim(); }
    const parse12 = part => {
      const m = part.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if(!m) return null; return { h:m[1], m:m[2], ap:m[3].toUpperCase() };
    };
    const i = parse12(inicio);
    if(i){ setRsHIni(i.h); setRsMIni(i.m); setRsAmpmIni(i.ap); } else { setRsHIni(''); setRsMIni('00'); setRsAmpmIni('AM'); }
    const f = parse12(fin);
    if(f){ setRsHFin(f.h); setRsMFin(f.m); setRsAmpmFin(f.ap); } else { setRsHFin(''); setRsMFin('00'); setRsAmpmFin('PM'); }
  }

  function onAddSale(payload) {
    const { sku, cantidad, skuExtra, cantidadExtra } = payload;
    const product = products.find((p) => p.sku === sku);
    if (!product) return alert("Producto no encontrado");
    // Ya no descontamos aquí. Validación opcional: que exista stock central suficiente para una futura confirmación.
    if (product.stock < cantidad) return alert("Stock central insuficiente (no se puede reservar)");
    if (skuExtra && cantidadExtra) {
      const prod2 = products.find(p=>p.sku===skuExtra);
      if(!prod2) return alert('Producto adicional no existe');
      if(prod2.stock < cantidadExtra) return alert('Stock central insuficiente del adicional');
    }
    const nextSale = { id: uid(), ...payload, estadoEntrega: 'pendiente' };
    setSales([nextSale, ...sales]);
    setShowSale(false);
  }

  function importCSV(kind, file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          if (kind === "products") {
            const mapped = data
              .map((r) => ({
                id: uid(),
                sku: String(r.sku || "").trim(),
                nombre: String(r.nombre || "").trim(),
                precio: Number(r.precio || 0),
                costo: Number(r.costo || 0),
                stock: Number(r.stock || 0),
              }))
              .filter((r) => r.sku && r.nombre);
            setProducts((prev) => mergeBySku(prev, mapped));
          } else if (kind === "sales") {
            const mapped = data
              .map((r) => ({
                id: uid(),
                fecha: String(r.fecha || todayISO()).slice(0, 10),
                sku: String(r.sku || "").trim(),
                cantidad: Number(r.cantidad || 1),
                precio: Number(r.precio || 0),
                vendedora: String(r.vendedora || session.nombre).trim(),
                metodo: String(r.metodo || "Efectivo").trim(),
                cliente: String(r.cliente || "").trim(),
                notas: String(r.notas || "").trim(),
              }))
              .filter((r) => r.sku);
            setSales((prev) => [...mapped, ...prev]);
          }
        } catch (e) {
          alert("Hubo un problema importando el CSV. Revisa los encabezados.");
        }
      },
    });
  }

  return (
    <div className="flex-1 p-6 bg-[#121f27]">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
      </header>

      {/* KPIs solo para admin */}
      {session.rol === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KPI icon={<CircleDollarSign className="w-5 h-5 text-[#f09929]" />} label="Ventas de hoy" value={currency(kpis.hoy)} />
          <KPI icon={<TrendingUp className="w-5 h-5 text-[#f09929]" />} label="Ventas acumuladas" value={currency(kpis.total)} />
          <KPI icon={<ShoppingCart className="w-5 h-5 text-[#f09929]" />} label="Tickets (mis ventas)" value={kpis.tickets} />
          <KPI icon={<AlertTriangle className="w-5 h-5 text-[#f09929]" />} label="Bajo stock" value={lowStock.length} />
        </div>
      )}

      {/* Entregas pendientes por fecha (hoy y futuras) */}
  {(() => {
        const allPendRaw = sales.filter(s=> (s.estadoEntrega||'confirmado')==='pendiente')
          .map(s=> ({...s, horaEntrega: normalizeRangeTo12(s.horaEntrega||'')}));
        // Filtrar por grupo si es vendedora
        let allPend = allPendRaw;
        if(session.rol!=='admin'){
          // Determinar grupo del usuario en sesión
          const userGroup = (users.find(u=>u.id===session.id)?.grupo)||session.grupo||'';
          if(userGroup){
            allPend = allPendRaw.filter(p=>{
              const vId = p.vendedoraId;
              if(vId){
                const vu = users.find(u=>u.id===vId);
                return vu? (vu.grupo===userGroup) : false;
              }
              // fallback comparar nombre
              const vu = users.find(u=> (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === (p.vendedora||'').trim().toLowerCase()));
              return vu? (vu.grupo===userGroup):false;
            });
          }
        }
        const hoy = todayISO();
        const pendientesHoy = allPend.filter(p=>p.fecha===hoy)
          .sort((a,b)=>{
            const ha=(a.horaEntrega||'').split('-')[0].trim();
            const hb=(b.horaEntrega||'').split('-')[0].trim();
            return minutesFrom12(ha)-minutesFrom12(hb);
          });
        const futuras = allPend.filter(p=>p.fecha>hoy);
        const fechasFuturas = Array.from(new Set(futuras.map(f=>f.fecha))).sort();
        const productOrder = products.map(p=>p.sku);

  function TablaPendientes({rows, titulo, fechaLabel}){
          if(!rows.length) return null;
          return (
            <div className="rounded-2xl p-4 bg-[#0f171e] mb-6">
              <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-[#f09929]" /> {titulo}</h3>
    {fechaLabel ? <div className="text-[11px] text-neutral-500">{fechaLabel}</div> : <div />}
              </div>
              <div className="overflow-auto">
                <table className="w-full text-[11px] min-w-[960px]">
                  <thead className="bg-neutral-800/60">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Hora</th>
                      <th className="p-2 text-left">Ciudad</th>
                      <th className="p-2 text-left">Encomienda</th>
                      <th className="p-2 text-left">Usuario</th>
                      {productOrder.map(sku=>{
                        const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
                      })}
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 text-center">Celular</th>
                      <th className="p-2 text-center">Estado</th>
                      <th className="p-2 text-center">Comprobante</th>
                      <th className="p-2 text-left">Confirmar</th>
                      <th className="p-2 text-center">Reprogramar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(s=>{
                      const cantidades = productOrder.map(sku=>{ let c=0; if(s.sku===sku) c+=Number(s.cantidad||0); if(s.skuExtra===sku) c+=Number(s.cantidadExtra||0); return c; });
                      const precioTotal = typeof s.total==='number'? s.total : (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0):0);
                      return (
                        <tr key={s.id} className="border-t border-neutral-800">
                          <td className="p-2 whitespace-nowrap">{toDMY(s.fecha)}</td>
                          <td className="p-2">{s.horaEntrega||''}</td>
                          <td className="p-2">{s.ciudad||''}</td>
                          <td className="p-2 text-left max-w-[160px]">
                            {s.metodo==='Encomienda' ? (
                              <span className="text-[14px]" title={s.destinoEncomienda||'Encomienda'}>{s.destinoEncomienda||''}</span>
                            ) : null}
                          </td>
                          <td className="p-2 whitespace-nowrap">{firstName(s.vendedora)||''}</td>
                          {cantidades.map((c,i)=> <td key={i} className="p-2 text-center">{c||''}</td>)}
                          <td className="p-2 text-right font-semibold">{currency(precioTotal)}</td>
                          <td className="p-2 text-center">{s.celular||''}</td>
                          <td className="p-2 text-center">
                            {(() => { const sem = semaforoEntrega(s.horaEntrega, s.fecha); const glow = sem.color==='#dc2626' ? '0 0 4px #dc2626' : `0 0 4px ${sem.color}`; const blinkClass = sem.color==='#dc2626' ? 'blink-red' : (sem.blinkYellow? 'blink-yellow':''); return (<div className="flex items-center justify-center"><span className={"w-3 h-3 rounded-full shadow-inner "+blinkClass} style={{background:sem.color, boxShadow:glow}} title={sem.label}></span></div>); })()}</td>
                          <td className="p-2 text-center">
                            {['Delivery','Encomienda'].includes(s.metodo||'') && (
                              <button onClick={()=>{ setEditingReceipt(s); setReceiptTemp(s.comprobante||null); }} title={s.comprobante? 'Ver / cambiar comprobante' : 'Subir comprobante'} className={"p-1 rounded-lg border text-neutral-200 "+(s.comprobante? 'bg-[#1d2a34] border-[#e7922b]':'bg-neutral-700/60 hover:bg-neutral-600 border-neutral-600')}> 
                                <Upload className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button onClick={()=>abrirModalCosto(s)} title="Confirmar" className="p-1 rounded-lg bg-[#1d2a34] hover:bg-[#274152] border border-[#e7922b]/40 text-[#e7922b]"><Check className="w-3 h-3" /></button>
                              <button onClick={()=>cancelarEntrega(s.id)} title="Cancelar" className="p-1 rounded-lg bg-neutral-700/60 hover:bg-neutral-700 text-neutral-200 border border-neutral-600"><X className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={()=>abrirReprogramar(s)} title="Reprogramar" className="p-1 inline-flex items-center gap-1 rounded-lg bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 border border-neutral-600 text-[10px]">
                              <Clock className="w-3 h-3" />
                              <span>Rep</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        return (
          <>
            <TablaPendientes rows={pendientesHoy} titulo="Entregas pendientes HOY" fechaLabel={hoy} />
            {fechasFuturas.map(f=>{
              const rows = futuras.filter(r=>r.fecha===f).sort((a,b)=>{
                const ha=(a.horaEntrega||'').split('-')[0].trim();
                const hb=(b.horaEntrega||'').split('-')[0].trim();
                return minutesFrom12(ha)-minutesFrom12(hb);
              });
              const diffDays = Math.round((new Date(f).getTime() - new Date(hoy).getTime())/86400000);
              let titulo;
              let fechaLabel;
              if(diffDays===1){
                titulo = 'Entregas pendientes MAÑANA';
                fechaLabel = '';
              } else if(diffDays===2){
                titulo = 'Entregas pendientes PASADO MAÑANA';
                fechaLabel = '';
              } else {
                titulo = `Entregas pendientes ${f}`;
                fechaLabel = f;
              }
              return <TablaPendientes key={f} rows={rows} titulo={titulo} fechaLabel={fechaLabel} />;
            })}
            {allPend.length===0 && (
              <div className="rounded-2xl p-6 bg-[#0f171e] mb-6 text-center text-xs text-neutral-500">Sin entregas pendientes</div>
            )}
          </>
        );
      })()}

  {/* Se eliminó el cuadro de 'Ventas recientes' según solicitud */}

      <AnimatePresence>
        {showSale && (
          <Modal onClose={() => setShowSale(false)}>
            <SaleForm products={products} session={session} onSubmit={onAddSale} />
          </Modal>
        )}
        {confirmingSale && (
          <Modal onClose={cancelarModalCosto}>
            <form onSubmit={confirmarConCostoSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b]">COSTO DE DELIVERY</h3>
              <input autoFocus type="number" step="0.01" value={deliveryCost} onChange={e=>setDeliveryCost(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2" placeholder="0.00" />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cancelarModalCosto} className="px-3 py-2 rounded-xl bg-neutral-700 text-sm">Cancelar</button>
                <button className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-sm">Confirmar</button>
              </div>
              <div className="text-[10px] text-neutral-500">Al confirmar se descontará el stock central y la venta pasará a la ciudad con este gasto.</div>
            </form>
          </Modal>
        )}
        {editingReceipt && (
          <Modal onClose={()=>{ setEditingReceipt(null); setReceiptTemp(null); }}>
            <div className="space-y-4 w-[360px]">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Upload className="w-4 h-4" /> Comprobante (QR)</h3>
              <div className="space-y-2 text-xs">
                <div className="text-neutral-400">Venta: <span className="font-semibold text-neutral-200">{editingReceipt.id.slice(-6)}</span></div>
                <input type="file" accept="image/*,.pdf" onChange={e=>{
                  const f = e.target.files?.[0];
                  if(!f){ setReceiptTemp(editingReceipt.comprobante||null); return; }
                  if(f.size > 2*1024*1024){ alert('Archivo supera 2MB'); return; }
                  const reader = new FileReader();
                  reader.onload = ev => setReceiptTemp(ev.target?.result||null);
                  reader.readAsDataURL(f);
                }} className="text-xs" />
                {receiptTemp && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/40">
                    {/^data:application\/pdf/.test(receiptTemp) ? (
                      <a href={receiptTemp} target="_blank" rel="noreferrer" className="text-[10px] underline text-[#e7922b]">Abrir PDF</a>
                    ) : (
                      <img src={receiptTemp} alt="Comprobante" className="max-h-40 mx-auto object-contain" />
                    )}
                  </div>
                )}
                {!receiptTemp && <div className="text-[10px] text-neutral-500">No hay comprobante cargado.</div>}
                <div className="text-[10px] text-neutral-500">Tamaño máximo 2MB. Se almacena localmente en este navegador.</div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setEditingReceipt(null); setReceiptTemp(null); }} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cerrar</button>
                <button disabled={!receiptTemp} onClick={()=>{
                  if(!receiptTemp){ alert('Selecciona un archivo'); return; }
                  setSales(prev => prev.map(s=> s.id===editingReceipt.id ? { ...s, comprobante: receiptTemp } : s));
                  setEditingReceipt(null); setReceiptTemp(null);
                }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs disabled:opacity-40">Guardar</button>
              </div>
            </div>
          </Modal>
        )}
        {reschedulingSale && (
          <Modal onClose={()=>{ setReschedulingSale(null); }}>
            <form onSubmit={e=>{ e.preventDefault();
              const build12 = (h,m,ap)=>{ if(!h) return ''; return `${h}:${m} ${ap}`; };
              const inicio = build12(rsHIni, rsMIni, rsAmpmIni);
              const fin = build12(rsHFin, rsMFin, rsAmpmFin);
              const horaEntrega = fin? `${inicio}-${fin}` : inicio;
              setSales(prev => prev.map(x=> x.id===reschedulingSale.id ? { ...x, fecha: rsFecha, horaEntrega } : x));
              setReschedulingSale(null);
            }} className="space-y-4 w-[360px]">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Clock className="w-4 h-4" /> Reprogramar entrega</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 text-neutral-400">Fecha</label>
                  <input type="date" value={rsFecha} onChange={e=>setRsFecha(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block mb-1 text-neutral-400">Hora inicio</label>
                  <div className="flex gap-2">
                    <select value={rsHIni} onChange={e=>setRsHIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs w-16">
                      <option value="">--</option>
                      {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h}>{h}</option>)}
                    </select>
                    <select value={rsMIni} onChange={e=>setRsMIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs w-18">
                      {['00','15','30','45'].map(m=> <option key={m}>{m}</option>)}
                    </select>
                    <select value={rsAmpmIni} onChange={e=>setRsAmpmIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs">
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-neutral-400">Hora fin (opcional)</label>
                  <div className="flex gap-2">
                    <select value={rsHFin} onChange={e=>setRsHFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs w-16">
                      <option value="">--</option>
                      {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h}>{h}</option>)}
                    </select>
                    <select value={rsMFin} onChange={e=>setRsMFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs w-18">
                      {['00','15','30','45'].map(m=> <option key={m}>{m}</option>)}
                    </select>
                    <select value={rsAmpmFin} onChange={e=>setRsAmpmFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-xs">
                      <option>AM</option>
                      <option>PM</option>
                    </select>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-500">Se actualizará la fecha/horario del pedido pendiente.</div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setReschedulingSale(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs">Guardar</button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------- Admin Create User ----------------------
function CreateUserAdmin({ users, setUsers, session, products }) {
  if (session?.rol !== 'admin') {
    return <div className="flex-1 p-6 text-sm text-neutral-400">No autorizado.</div>;
  }
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(todayISO());
  const [sueldo, setSueldo] = useState('0');
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [rol, setRol] = useState('seller');
  const [grupo, setGrupo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [productosAsignados, setProductosAsignados] = useState([]); // array de SKUs

  function submit(e) {
    e.preventDefault();
    setMensaje('');
    if (!nombre || !apellidos || !email || !password) { setMensaje('Completa todos los campos obligatorios'); return; }
    if (users.some(u => u.email === email)) { setMensaje('Ese correo ya existe'); return; }
  const nuevo = normalizeUser({ id: uid(), nombre, apellidos, celular, email, password, fechaIngreso, sueldo: Number(sueldo || 0), fechaPago, rol, productos: rol === 'admin' ? [] : productosAsignados, grupo });
    setUsers([...users, nuevo]);
  setNombre(''); setApellidos(''); setCelular(''); setEmail(''); setPassword(''); setFechaIngreso(todayISO()); setSueldo('0'); setFechaPago(todayISO()); setRol('seller'); setProductosAsignados([]); setGrupo('');
    setMensaje('Usuario creado');
  }


  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
  <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#f09929]" /> Crear Usuario</h2>
        <p className="text-sm text-neutral-400">Alta de nuevas vendedoras o admins.</p>
      </header>
  <div className="max-w-xl rounded-2xl p-5 bg-[#0f171e]">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Nombre *</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Apellidos *</label>
            <input value={apellidos} onChange={e=>setApellidos(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Número de Celular</label>
            <input value={celular} onChange={e=>setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Ej: 71234567" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Correo Electrónico *</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="usuario@correo.com" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Contraseña *</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Fecha de Ingreso</label>
            <input type="date" value={fechaIngreso} onChange={e=>setFechaIngreso(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Monto de Sueldo</label>
            <input type="number" step="0.01" value={sueldo} onChange={e=>setSueldo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="0" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Fecha de Pago</label>
            <input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Rol</label>
            <select value={rol} onChange={e=>setRol(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
              <option value="seller">Vendedora</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400">Grupo (equipo)</label>
            <input value={grupo} onChange={e=>setGrupo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Ej: A" />
          </div>
          {rol === 'seller' && (
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Productos asignados</label>
              <div className="mt-2 max-h-40 overflow-auto border border-neutral-800 rounded-xl divide-y divide-neutral-800">
                {products.map(p => {
                  const checked = productosAsignados.includes(p.sku);
                  return (
                    <label key={p.sku} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-neutral-800/60">
                      <input type="checkbox" className="accent-white" checked={checked} onChange={()=>{
                        setProductosAsignados(prev => checked ? prev.filter(s=>s!==p.sku) : [...prev, p.sku]);
                      }} />
                      <span>{p.nombre}</span>
                    </label>
                  );
                })}
                {products.length === 0 && <div className="px-3 py-2 text-neutral-500 text-xs">No hay productos</div>}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">Si no seleccionas, la vendedora no verá productos. (Admin siempre ve todos)</div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            {mensaje && <div className={"text-sm " + (mensaje === 'Usuario creado' ? 'text-green-400' : 'text-red-400')}>{mensaje}</div>}
            <button className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------- Admin Users List ----------------------
function UsersListAdmin({ users, setUsers, session, products }) {
  if (session?.rol !== 'admin') {
    return <div className="flex-1 p-6 text-sm text-neutral-400">No autorizado.</div>;
  }
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);

  function startEdit(u) {
    setEditingId(u.id);
  setEditData({ ...u, sueldo: String(u.sueldo) });
  }
  function cancelEdit() { setEditingId(null); setEditData(null); }
  function saveEdit(e) {
    e.preventDefault();
    if (!editData.nombre || !editData.apellidos || !editData.email) return;
    if (users.some(u => u.email === editData.email && u.id !== editData.id)) { alert('Correo ya usado'); return; }
  const updated = users.map(u => u.id === editData.id ? normalizeUser({ ...u, ...editData, sueldo: Number(editData.sueldo || 0), productos: editData.rol === 'admin' ? [] : (editData.productos || []) }) : u);
    setUsers(updated);
    cancelEdit();
  }
  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
  <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#f09929]" /> Crear Usuario</h2>
        <p className="text-sm text-neutral-400">Alta de nuevas vendedoras o admins.</p>
      </header>
      <div className="space-y-4 max-w-5xl">
        {users.map(u => (
          <div key={u.id} className="rounded-xl p-4 bg-[#0f171e]">
            {editingId === u.id ? (
              <form onSubmit={saveEdit} className="grid md:grid-cols-4 gap-3 text-sm">
                <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.nombre} onChange={e=>setEditData({...editData,nombre:e.target.value})} placeholder="Nombre" />
                <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.apellidos} onChange={e=>setEditData({...editData,apellidos:e.target.value})} placeholder="Apellidos" />
                <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.celular} onChange={e=>setEditData({...editData,celular:e.target.value})} placeholder="Celular" />
                <input className="bg-neutral-800 rounded-lg px-2 py-1 md:col-span-2" value={editData.email} onChange={e=>setEditData({...editData,email:e.target.value})} placeholder="Correo" />
                <input type="password" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.password} onChange={e=>setEditData({...editData,password:e.target.value})} placeholder="Contraseña" />
                <select className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.rol} onChange={e=>setEditData({...editData,rol:e.target.value})}>
                  <option value="seller">Vendedora</option>
                  <option value="admin">Admin</option>
                </select>
                <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.grupo||''} onChange={e=>setEditData({...editData,grupo:e.target.value})} placeholder="Grupo" />
                <input type="date" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.fechaIngreso} onChange={e=>setEditData({...editData,fechaIngreso:e.target.value})} />
                <input type="number" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.sueldo} onChange={e=>setEditData({...editData,sueldo:e.target.value})} placeholder="Sueldo" />
                <input type="date" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.fechaPago} onChange={e=>setEditData({...editData,fechaPago:e.target.value})} />
                {editData.rol === 'seller' && (
                  <div className="md:col-span-4 border border-neutral-800 rounded-lg max-h-40 overflow-auto divide-y divide-neutral-800">
                    {products.map(p => {
                      const checked = (editData.productos || []).includes(p.sku);
                      return (
                        <label key={p.sku} className="flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer hover:bg-neutral-800/60">
                          <input type="checkbox" className="accent-white" checked={checked} onChange={()=>{
                            setEditData(prev => {
                              const list = prev.productos || [];
                              return {
                                ...prev,
                                productos: checked ? list.filter(s=>s!==p.sku) : [...list, p.sku]
                              };
                            });
                          }} />
                          <span>{p.sku} · {p.nombre}</span>
                        </label>
                      );
                    })}
                    {products.length === 0 && <div className="px-3 py-2 text-neutral-500 text-xs">No hay productos</div>}
                  </div>
                )}
                <div className="flex gap-2 md:col-span-4 justify-end pt-1">
                  <button type="button" onClick={cancelEdit} className="px-3 py-1 bg-neutral-700 rounded-lg text-xs">Cancelar</button>
                  <button className="px-3 py-1 bg-white text-neutral-900 rounded-lg font-semibold text-xs">Guardar</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{u.nombre} {u.apellidos} <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-neutral-700 uppercase tracking-wide">{u.rol}</span>{u.grupo && <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-neutral-800 uppercase tracking-wide">G:{u.grupo}</span>}</div>
                  <div className="flex gap-2">
                    <button onClick={()=>startEdit(u)} className="text-xs px-2 py-1 bg-neutral-700 rounded-lg">Editar</button>
                  </div>
                </div>
                <div className="text-neutral-400 text-xs">{u.email} · Cel: {u.celular || '—'}</div>
                {u.rol === 'seller' && (
                  <div className="text-neutral-500 text-[10px] mt-1">Productos: {(u.productos || []).length === 0 ? 'Ninguno asignado' : u.productos.join(', ')}</div>
                )}
                <div className="text-neutral-500 text-[11px]">Ingreso: {toDMY(u.fechaIngreso)} · Pago: {toDMY(u.fechaPago)} · Sueldo: {currency(u.sueldo || 0)}</div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <div className="text-neutral-500 text-sm">No hay usuarios.</div>}
      </div>
    </div>
  );
}

// ---------------------- Productos ----------------------
function ProductsView({ products, setProducts, session }) {
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null); // base64
  const [mensaje, setMensaje] = useState('');
  const [editingSku, setEditingSku] = useState(null);
  const [filter, setFilter] = useState('');
  const [usage, setUsage] = useState(() => estimateLocalStorageUsage());
  const [optimizing, setOptimizing] = useState(false);

  useEffect(()=>{ setUsage(estimateLocalStorageUsage()); }, [products]);

  function resetForm() { setSku(''); setNombre(''); setPrecio(''); setCosto(''); setStock(''); setImagen(null); setEditingSku(null); }

  function submit(e) {
    e.preventDefault();
    setMensaje('');
    if (!nombre) { setMensaje('Nombre es obligatorio'); return; }
    let generatedSku = sku;
    if (!generatedSku) {
      generatedSku = nombre.toUpperCase().replace(/[^A-Z0-9]+/g,'-').slice(0,8) + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
    }
    const exists = products.find(p => p.sku === generatedSku);
  const data = { id: exists ? exists.id : uid(), sku: generatedSku, nombre: nombre.trim(), precio: Number(precio||0), costo: Number(costo||0), stock: Number(stock||0), imagen: imagen || (exists ? exists.imagen : null) };
    if (exists && editingSku) {
      setProducts(products.map(p => p.sku === editingSku ? data : p));
  setMensaje('Producto actualizado');
    } else if (exists && !editingSku) {
  setMensaje('Nombre genera código existente, intenta variar el nombre');
      return;
    } else {
      setProducts([data, ...products]);
      setMensaje('Producto agregado');
    }
    resetForm();
  }

  function edit(p) {
    setEditingSku(p.sku);
    setSku(p.sku); setNombre(p.nombre); setPrecio(String(p.precio)); setCosto(String(p.costo)); setStock(String(p.stock)); setImagen(p.imagen || null);
  }
  function remove(p) {
    if (!confirm('¿Eliminar producto ' + p.sku + '?')) return;
    setProducts(products.filter(x => x.sku !== p.sku));
    if (editingSku === p.sku) resetForm();
  }

  const filtered = products.filter(p => [p.sku, p.nombre].join(' ').toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
  <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-[#f09929]" /> Productos</h2>
        <p className="text-sm text-neutral-400">Gestión básica del catálogo.</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
  <div className="rounded-2xl p-5 lg:col-span-1 bg-[#0f171e]">
          <form onSubmit={submit} className="space-y-4 text-sm">
            {/* Eliminado campo SKU visible: se autogenerará simple */}
            <input type="hidden" value={sku} readOnly />
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Nombre *</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Nombre del producto" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Precio</label>
                <input type="number" step="0.01" value={precio} onChange={e=>setPrecio(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Costo</label>
                <input type="number" step="0.01" value={costo} onChange={e=>setCosto(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Stock</label>
                <input type="number" value={stock} onChange={e=>setStock(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Imagen</label>
              <input type="file" accept="image/*" onChange={(e)=>{
                const file = e.target.files?.[0];
                if(!file) { setImagen(null); return; }
                // Compresión inteligente: reducir hasta <=60KB objetivo
                const targetKB = 60;
                const img = new Image();
                const reader = new FileReader();
                reader.onload = ev=> {
                  img.onload = () => {
                    try {
                      const canvas = document.createElement('canvas');
                      let { width, height } = img;
                      const maxSide = 500;
                      if (width > maxSide || height > maxSide) {
                        const scale = Math.min(maxSide / width, maxSide / height);
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                      }
                      canvas.width = width; canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0, width, height);
                      let quality = 0.7; let data;
                      for(; quality >= 0.3; quality -= 0.1){
                        data = canvas.toDataURL('image/jpeg', quality);
                        if((data.length/1024) <= targetKB) break;
                      }
                      setImagen(data);
                    } catch { }
                  };
                  if (typeof ev.target?.result === 'string') img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
              }} className="w-full mt-1 text-xs" />
              {imagen && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={imagen} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-neutral-700" />
                  <button type="button" onClick={()=>setImagen(null)} className="text-xs text-red-400 underline">Quitar</button>
                </div>
              )}
              <div className="text-[10px] text-neutral-500 mt-1">Las imágenes se comprimen (máx 500px, objetivo &lt;=60KB). Si sigues llenando el espacio puedes optimizar o quitar todas.</div>
            </div>
            {mensaje && <div className={"text-xs " + (mensaje.includes('agregado') || mensaje.includes('actualizado') ? 'text-green-400' : 'text-red-400')}>{mensaje}</div>}
            <div className="flex gap-2 justify-end">
              {editingSku && <button type="button" onClick={resetForm} className="px-3 py-2 bg-neutral-700 rounded-xl">Cancelar</button>}
              <button className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl">{editingSku ? 'Actualizar' : 'Agregar'}</button>
            </div>
          </form>
          <div className="mt-6 space-y-2 text-[11px] text-neutral-500 border-t border-neutral-800 pt-4">
            <div>Uso almacenamiento aprox: {(usage/1024).toFixed(0)} KB (límite típico ~5000 KB)</div>
            <div className="flex gap-2 flex-wrap">
              <button disabled={optimizing} onClick={async()=>{
                setOptimizing(true);
                // Re-comprimir todas las imágenes existentes con parámetros más agresivos
                const recompress = async (p)=> new Promise(res=>{
                  if(!p.imagen) return res(p);
                  const img = new Image();
                  img.onload = () => {
                    try {
                      const canvas = document.createElement('canvas');
                      let { width, height } = img;
                      const maxSide = 450;
                      if(width>maxSide||height>maxSide){
                        const scale = Math.min(maxSide/width, maxSide/height);
                        width = Math.round(width*scale); height = Math.round(height*scale);
                      }
                      canvas.width = width; canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img,0,0,width,height);
                      let q=0.6; let data;
                      for(; q>=0.25; q-=0.1){
                        data = canvas.toDataURL('image/jpeg', q);
                        if(data.length/1024 <= 55) break;
                      }
                      res({ ...p, imagen: data });
                    } catch { res(p); }
                  };
                  img.onerror=()=>res(p);
                  img.src = p.imagen;
                });
                const next = [];
                for(const p of products){
                  // eslint-disable-next-line no-await-in-loop
                  next.push(await recompress(p));
                }
                setProducts(next);
                setOptimizing(false);
              }} className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">{optimizing?'Optimizando...':'Optimizar imágenes'}</button>
              <button onClick={()=>{
                if(!confirm('Esto quitará TODAS las imágenes de productos para liberar espacio. ¿Continuar?')) return;
                setProducts(products.map(p=> ({...p, imagen: null})));
              }} className="px-3 py-1 rounded-lg bg-red-700/80 hover:bg-red-700">Quitar todas</button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-neutral-400">{products.length} productos</div>
            <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar..." className="bg-neutral-800 rounded-xl px-3 py-2 text-sm w-64" />
          </div>
          <div className="overflow-auto border border-neutral-800 rounded-2xl bg-[#10161e]">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800/60">
                <tr>
                  <th className="text-left p-3">Img</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-right p-3">Precio</th>
                  <th className="text-right p-3">Costo</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Margen</th>
                  <th className="text-right p-3 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const margen = p.precio ? ((p.precio - p.costo) / p.precio) * 100 : 0;
                  return (
                    <tr key={p.sku} className="border-t border-neutral-800">
            <td className="p-3">{p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-10 h-10 object-cover rounded-md border border-neutral-700" /> : <div className="w-10 h-10 rounded-md bg-neutral-800 grid place-items-center text-[10px] text-neutral-500">N/A</div>}</td>
                      <td className="p-3">{p.nombre}</td>
                      <td className="p-3 text-right">{currency(p.precio)}</td>
                      <td className="p-3 text-right">{currency(p.costo)}</td>
                      <td className={"p-3 text-right " + (p.stock <= 5 ? 'text-red-400' : '')}>{p.stock}</td>
                      <td className="p-3 text-right">{margen.toFixed(0)}%</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={()=>edit(p)} className="text-xs px-2 py-1 bg-neutral-700 rounded-lg">Editar</button>
                          <button onClick={()=>remove(p)} className="text-xs px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg">Borrar</button>
                        </div>
                      </td>
                    </tr>
                );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-neutral-500 text-sm">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------- Almacén (vista solo lectura de inventario) ----------------------
function AlmacenView({ products, setProducts, dispatches, setDispatches, session }) {
  const ciudades = ["LA PAZ","EL ALTO","COCHABAMBA","SANTA CRUZ","TARIJA","ORURO","POTOSI","SUCRE"];
  const [fecha, setFecha] = useState(todayISO());
  const [ciudad, setCiudad] = useState(ciudades[0]);
  // Campo notas removido según requerimiento
  const [lineItems, setLineItems] = useState(() => products.map(p => ({ sku: p.sku, cantidad: 0 })));
  const [filtroCiudad, setFiltroCiudad] = useState('');

  // Re-sincroniza lineItems si cambia catálogo (mantiene cantidades existentes)
  useEffect(()=>{
    setLineItems(prev => products.map(p => {
      const found = prev.find(l=>l.sku===p.sku);
      return { sku: p.sku, cantidad: found ? found.cantidad : 0 };
    }));
  }, [products]);

  function setCantidad(sku, val){
    const n = Math.max(0, Number(val)||0);
    setLineItems(items => items.map(i => i.sku===sku?{...i,cantidad:n}:i));
  }

  function totalPorSku(sku){
    return dispatches.filter(d=>d.items.some(i=>i.sku===sku)).reduce((acc,d)=>{
      const it = d.items.find(i=>i.sku===sku); return acc + (it?it.cantidad:0);
    },0);
  }

  function submit(e){
    e.preventDefault();
    const items = lineItems.filter(i=>i.cantidad>0);
    if(!items.length){ alert('Ingresa cantidades'); return; }
    // Validar stock disponible
    for(const it of items){
      const prod = products.find(p=>p.sku===it.sku);
      if(!prod) continue;
      if(prod.stock < it.cantidad){
        alert('Stock insuficiente para '+it.sku);
        return;
      }
    }
  const record = { id: uid(), fecha, ciudad, items, status: 'pendiente' };
  setDispatches([record, ...dispatches]);
  // Stock se descuenta solo al confirmar
    // Reset cantidades
    setLineItems(lineItems.map(l=>({...l,cantidad:0})));
  // notas removido
  }

  const productosColumns = products;
  const [fechaDesdeConf, setFechaDesdeConf] = useState('');
  const [fechaHastaConf, setFechaHastaConf] = useState('');
  const [pageConf, setPageConf] = useState(1);
  // Pendientes: no se filtran por ciudad ni fechas
  const dispatchesPendientes = dispatches.filter(d=> d.status !== 'confirmado');
  // Confirmados base
  const dispatchesConfirmadosBase = dispatches.filter(d=> d.status === 'confirmado');
  const dispatchesConfirmadosFiltrados = dispatchesConfirmadosBase.filter(d=> (
    (!filtroCiudad || d.ciudad === filtroCiudad) &&
    (!fechaDesdeConf || d.fecha >= fechaDesdeConf) && (!fechaHastaConf || d.fecha <= fechaHastaConf)
  ));
  const PAGE_CONF = 20;
  const totalPagesConf = Math.max(1, Math.ceil(dispatchesConfirmadosFiltrados.length / PAGE_CONF));
  const pageConfItems = dispatchesConfirmadosFiltrados.slice((pageConf-1)*PAGE_CONF, pageConf*PAGE_CONF);
  useEffect(()=>{ setPageConf(1); }, [filtroCiudad, fechaDesdeConf, fechaHastaConf]);
  useEffect(()=>{ if(pageConf>totalPagesConf) setPageConf(1); }, [pageConf, totalPagesConf]);

  function undoDispatch(rec){
    if(!confirm('Deshacer despacho de '+rec.ciudad+' ('+rec.fecha+') ?')) return;
    if(rec.status==='confirmado'){
      // Restaurar stock solo si ya había sido descontado
      setProducts(prev => prev.map(p => {
        const it = rec.items.find(i=>i.sku===p.sku);
        return it ? { ...p, stock: p.stock + it.cantidad } : p;
      }));
    }
    // Eliminar registro
    setDispatches(prev => prev.filter(d => d.id !== rec.id));
  }

  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
  <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-[#f09929]" /> Despacho de Productos</h2>
        <p className="text-sm text-neutral-400">Registrar envíos de stock a ciudades y ver acumulados.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6 items-start mb-8">
  <div className="rounded-2xl p-5 lg:col-span-1 bg-[#0f171e]">
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Fecha</label>
                <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Ciudad</label>
                <select value={ciudad} onChange={e=>setCiudad(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
                  {ciudades.map(c=> <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Cantidades por producto</label>
              <div className="mt-2 max-h-52 overflow-auto border border-neutral-800 rounded-xl divide-y divide-neutral-800">
                {productosColumns.map(p=>{
                  const li = lineItems.find(l=>l.sku===p.sku) || {cantidad:0};
                  return (
                    <div key={p.sku} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-700 shrink-0">
                        {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-[9px] text-neutral-500">IMG</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.nombre}</div>
                        <div className="text-[10px] text-neutral-500 truncate">Stock: {p.stock}</div>
                      </div>
                      <input type="number" min={0} value={li.cantidad} onChange={e=>setCantidad(p.sku,e.target.value)} className="w-20 bg-neutral-800 rounded-lg px-2 py-1 text-right" />
                    </div>
                  );
                })}
                {productosColumns.length===0 && <div className="px-3 py-2 text-neutral-500 text-xs">Sin productos</div>}
              </div>
            </div>
            {/* Notas removido */}
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl">Despachar</button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl overflow-auto bg-[#0f171e]">
            <table className="w-full text-xs">
              <thead className="bg-neutral-800/60">
                <tr>
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-right">Stock Actual</th>
                  <th className="p-3 text-right">Total Despachado</th>
                </tr>
              </thead>
              <tbody>
                {productosColumns.map(p => {
                  const total = totalPorSku(p.sku);
                  return (
                    <tr key={p.sku} className="border-t border-neutral-800">
                      <td className="p-3 font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                          {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-[9px] text-neutral-500">IMG</span>}
                        </div>
                        <span className="truncate max-w-[180px]">{p.nombre}</span>
                      </td>
                      <td className={"p-3 text-right "+(p.stock<=5?'text-red-400' : '')}>{p.stock}</td>
                      <td className="p-3 text-right">{total}</td>
                    </tr>
                  );
                })}
                {productosColumns.length===0 && <tr><td colSpan={3} className="p-6 text-center text-neutral-500 text-sm">Sin productos</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl p-4 bg-[#0f171e] space-y-8">
            {/* Filtros */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-sm">Despachos Enviados (pendientes de confirmación)</h3>
            </div>
            {/* Tabla pendientes */}
            <div className="overflow-auto max-h-60 border border-neutral-800 rounded-xl">
              <table className="w-full text-[11px]">
                <thead className="bg-neutral-800/60">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Ciudad</th>
                    {productosColumns.map(p=> <th key={p.sku} className="p-2 text-right whitespace-nowrap max-w-[140px]">{p?.nombre.split(' ')[0]}</th>)}
                    <th className="p-2 text-left">Estado</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchesPendientes.map(d => (
                    <tr key={d.id} className="border-t border-neutral-800">
                      <td className="p-2">{toDMY(d.fecha)}</td>
                      <td className="p-2">{d.ciudad}</td>
                      {productosColumns.map(p=>{
                        const it = d.items.find(i=>i.sku===p.sku);
                        return <td key={p.sku} className="p-2 text-right">{it?it.cantidad: ''}</td>;
                      })}
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-400 border border-yellow-600/40">Esperando confirmación</span>
                      </td>
                      <td className="p-2">
                        <button onClick={()=>undoDispatch(d)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Deshacer</button>
                      </td>
                    </tr>
                  ))}
                  {dispatchesPendientes.length===0 && <tr><td colSpan={productosColumns.length+4} className="p-4 text-center text-neutral-500">Sin despachos pendientes</td></tr>}
                </tbody>
              </table>
            </div>
            {/* Historial confirmados */}
            <div>
              <div className="flex items-end justify-between mb-2 gap-4 flex-wrap">
                <h4 className="font-medium text-sm">Historial de Despachos Confirmados</h4>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="flex flex-col">
                    <label className="text-[9px] uppercase tracking-wide text-neutral-400">Ciudad</label>
                    <select value={filtroCiudad} onChange={e=>setFiltroCiudad(e.target.value)} className="bg-neutral-800 rounded px-2 py-1">
                      <option value="">Todas</option>
                      {ciudades.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] uppercase tracking-wide text-neutral-400">Desde</label>
                    <input type="date" value={fechaDesdeConf} onChange={e=>setFechaDesdeConf(e.target.value)} className="bg-neutral-800 rounded px-2 py-1" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] uppercase tracking-wide text-neutral-400">Hasta</label>
                    <input type="date" value={fechaHastaConf} onChange={e=>setFechaHastaConf(e.target.value)} className="bg-neutral-800 rounded px-2 py-1" />
                  </div>
                  {(filtroCiudad || fechaDesdeConf || fechaHastaConf) && (
                    <button onClick={()=>{setFiltroCiudad(''); setFechaDesdeConf(''); setFechaHastaConf('')}} className="h-7 px-2 bg-neutral-700 hover:bg-neutral-600 rounded">Limpiar</button>
                  )}
                </div>
              </div>
              <div className="overflow-auto max-h-60 border border-neutral-800 rounded-xl">
                <table className="w-full text-[11px]">
                  <thead className="bg-neutral-800/60">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Ciudad</th>
                      {productosColumns.map(p=> <th key={p.sku} className="p-2 text-right whitespace-nowrap max-w-[140px]">{p?.nombre.split(' ')[0]}</th>)}
                      <th className="p-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageConfItems.map(d => (
                      <tr key={d.id} className="border-t border-neutral-800">
                        <td className="p-2">{toDMY(d.fecha)}</td>
                        <td className="p-2">{d.ciudad}</td>
                        {productosColumns.map(p=>{
                          const it = d.items.find(i=>i.sku===p.sku);
                          return <td key={p.sku} className="p-2 text-right">{it?it.cantidad: ''}</td>;
                        })}
                        <td className="p-2">
                          <button onClick={()=>undoDispatch(d)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Deshacer</button>
                        </td>
                      </tr>
                    ))}
                    {dispatchesConfirmadosFiltrados.length===0 && <tr><td colSpan={productosColumns.length+3} className="p-4 text-center text-neutral-500">Sin confirmados en el rango</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400">
                <div>{dispatchesConfirmadosFiltrados.length} registros · Página {pageConf} / {totalPagesConf}</div>
                <div className="flex gap-2">
                  <button disabled={pageConf===1} onClick={()=>setPageConf(p=>Math.max(1,p-1))} className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-40">Prev</button>
                  <button disabled={pageConf===totalPagesConf} onClick={()=>setPageConf(p=>Math.min(totalPagesConf,p+1))} className="px-2 py-1 rounded bg-neutral-800 disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-neutral-500">MVP almacén: faltan ingresos, devoluciones y estados de envío.</div>
    </div>
  );
}

// Despachos pendientes para ciudad con opción de confirmar o cancelar
function CityPendingShipments({ city, dispatches, setDispatches, products, session }) {
  const pendientes = dispatches.filter(d=>d.ciudad===city && d.status==='pendiente');
  const [openId, setOpenId] = useState(null); // popup abierto
  useEffect(()=>{
    if(!openId) return;
    function handleKey(e){ if(e.key==='Escape'){ setOpenId(null); } }
    window.addEventListener('keydown', handleKey);
    return ()=> window.removeEventListener('keydown', handleKey);
  }, [openId]);
  if(!pendientes.length) return null;
  function confirmar(d){
    setDispatches(prev => prev.map(x=> x.id===d.id?{...x,status:'confirmado'}:x));
  }
  function cancelar(d){
    if(!confirm('Cancelar envío pendiente?')) return;
    setDispatches(prev => prev.filter(x=>x.id!==d.id));
  }
  return (
  <div className="rounded-2xl p-4 bg-[#0f171e]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-start gap-3">
           <div>
             <div className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-[#f09929]" /> {city}</div>
             <div className="text-xs text-neutral-500">{pendientes.length} envíos pendientes • Total {currency(pendientes.reduce((a,f)=>a+f.total,0))}</div>
           </div>
        </div>
      </div>
      <div className="flex gap-3 pb-1 flex-wrap">
        {pendientes.map(d=> {
          const abierto = openId===d.id;
          return (
            <div key={d.id} className="relative bg-neutral-800/40 border border-neutral-700 rounded-xl p-3 flex flex-col gap-2 w-full md:w-auto min-w-[180px]">
              <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium truncate">{toDMY(d.fecha)}</div>
              <div className="flex items-center gap-2">
                <button onClick={()=> setOpenId(abierto?null:d.id)} className="shrink-0 text-neutral-300 hover:text-[#e7922b] transition" title="Ver detalle">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </button>
                <div className="text-base font-semibold text-[#e7922b] tracking-wide">Por llegar</div>
              </div>
              {session?.rol==='admin' ? (
                <div className="flex gap-2 pt-1">
                  <button onClick={()=>{confirmar(d); if(abierto) setOpenId(null);}} className="flex-1 rounded-lg text-[10px] py-1 font-semibold bg-[#e7922b] text-[#1a2430]">Confirmar</button>
                  <button onClick={()=>{cancelar(d); if(abierto) setOpenId(null);}} className="flex-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-[10px] py-1">Cancelar</button>
                </div>
              ) : (
                <div className="text-[10px] text-neutral-500">Pendiente de aprobación</div>
              )}
              {abierto && (
                <div className="absolute z-30 -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-64 rounded-xl bg-[#10161e] border border-neutral-700 p-3 shadow-xl flex flex-col gap-2">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#10161e] border-b border-r border-neutral-700 rotate-45"></div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-semibold text-neutral-400">Por llegar – {city}</div>
                    <button onClick={()=>setOpenId(null)} className="text-[10px] px-2 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600">Cerrar</button>
                  </div>
                  <div className="max-h-40 overflow-auto pr-1 space-y-2">
                    {d.items.map(it=>{
                      const prod = products.find(p=>p.sku===it.sku);
                      return (
                        <div key={it.sku} className="flex items-center justify-between gap-4 text-[15px] leading-snug bg-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/60">
                          <span className="truncate max-w-[150px]" title={prod?prod.nombre:it.sku}>{prod?prod.nombre:it.sku}</span>
                          <span className="text-[#e7922b] font-bold">{it.cantidad}</span>
                        </div>
                      );
                    })}
                    {!d.items.length && <div className="text-[10px] text-neutral-500">Sin items</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- AGREGAR: CityStock (faltaba y causaba ReferenceError en VentasView) ---
function CityStock({ city, products, sales, dispatches }) {
  if(!city) return null;
  const confirmados = Array.isArray(dispatches) ? dispatches.filter(d=>d.ciudad===city && d.status==='confirmado') : [];
  const enviados = {};
  confirmados.forEach(d=>{
    d.items.forEach(it=>{
      enviados[it.sku] = (enviados[it.sku]||0) + Number(it.cantidad||0);
    });
  });
  const vendidos = {};
  sales
    .filter(s=>s.ciudad===city && (s.estadoEntrega||'confirmado')==='confirmado')
    .forEach(s=>{
      if(s.sku) vendidos[s.sku] = (vendidos[s.sku]||0) + Number(s.cantidad||0);
      if(s.skuExtra) vendidos[s.skuExtra] = (vendidos[s.skuExtra]||0) + Number(s.cantidadExtra||0);
    });

  const rows = products.map(p=>{
    const sent = enviados[p.sku]||0;
    const sold = vendidos[p.sku]||0;
    const disp = sent - sold;
    if(!sent && !sold) return null; // mostrar solo si hubo movimiento
    return { sku:p.sku, nombre:p.nombre, enviados:sent, vendidos:sold, disponible:disp };
  }).filter(Boolean);

  if(!rows.length) return null;

  const [showRaw, setShowRaw] = useState(false);
  // Cerrar popup raw con ESC
  useEffect(()=>{
    if(!showRaw) return; // solo cuando está abierto
    function onKey(e){ if(e.key==='Escape'){ setShowRaw(false); } }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [showRaw]);
  const sumEnviado = Object.values(enviados).reduce((a,b)=>a+b,0);
  return (
    <div className="rounded-2xl p-4 bg-[#0f171e] mb-6 relative">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <button onClick={()=>setShowRaw(v=>!v)} title="Ver total enviado confirmado (sin descontar ventas pendientes)" className={"p-1 rounded-lg border border-neutral-700/60 hover:bg-neutral-700/40 transition " + (showRaw? 'bg-neutral-700/40':'')}> 
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-neutral-300"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </button>
        <Package className="w-4 h-4 text-[#f09929]" /> Stock en {city}
      </h3>
      {showRaw && (
        <div className="absolute z-30 top-10 left-2 w-[340px] max-h-[360px] overflow-auto bg-[#10161e] border border-neutral-700 rounded-xl shadow-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-neutral-300">Stock {city} (sin descontar pendientes)</div>
            <button onClick={()=>setShowRaw(false)} className="text-[10px] px-2 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600">Cerrar</button>
          </div>
          <div className="space-y-2">
            {Object.entries(enviados).map(([sku,cant])=>{
              const prod = products.find(p=>p.sku===sku);
              return (
                <div key={sku} className="flex items-center justify-between gap-4 text-[15px] leading-snug bg-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/60">
                  <span className="truncate max-w-[200px]" title={prod?prod.nombre:sku}>{prod?prod.nombre:sku}</span>
                  <span className="text-[#e7922b] font-bold">{cant}</span>
                </div>
              );
            })}
            {!Object.keys(enviados).length && <div className="text-[11px] text-neutral-500">Sin envíos confirmados.</div>}
          </div>
          <div className="text-[15px] text-neutral-500 pt-1">Total en Stock: <span className="text-[#e7922b] font-semibold">{sumEnviado}</span></div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map(r=> {
          const color = 'text-[#e7922b]';
          return (
            <div key={r.sku} className="rounded-xl bg-neutral-800/40 border border-neutral-700/60 px-3 py-3 flex flex-col gap-2 min-h-[90px]">
              <div className="text-[11px] font-medium leading-snug line-clamp-2" title={r.nombre}>{r.nombre}</div>
              <div className="mt-auto">
                <div className={"text-2xl font-bold leading-none "+color}>{r.disponible}</div>
                <div className="mt-1 flex gap-3 text-[9px] text-neutral-500">
                  <span>Env {r.enviados}</span>
                  <span>Ven {r.vendidos}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-neutral-500">Disponible = Enviado confirmado - Vendido confirmado.</div>
    </div>
  );
}

// ---------------------- Mis Números (Admin) ----------------------
function MisNumerosView({ products, numbers, setNumbers }) {
  const [sku, setSku] = useState(products[0]?.sku || '');
  const [otherName, setOtherName] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [caduca, setCaduca] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const prodMap = useMemo(()=> Object.fromEntries(products.map(p=>[p.sku,p.nombre])), [products]);
  const hoy = todayISO();
  const ordenados = [...numbers].sort((a,b)=> (a.caduca||'').localeCompare(b.caduca||'')); 

  function submit(e) {
    e.preventDefault();
    setMsg('');
    if(!sku) return setMsg('Selecciona producto');
    if(sku==='otros' && !otherName.trim()) return setMsg('Nombre requerido para Otros');
    if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setMsg('Correo inválido');
    if(!celular) return setMsg('Celular requerido');
    if(!caduca) return setMsg('Fecha de caducidad requerida');
    if(editingId){
      setNumbers(prev => prev.map(n => n.id===editingId ? {
        ...n,
        sku,
        nombreOtro: sku==='otros' ? otherName.trim() : undefined,
        email: email.trim(),
        celular: celular.trim(),
        caduca
      } : n));
      setMsg('Actualizado');
    } else {
      setNumbers(prev => [{
        id: uid(),
        sku,
        nombreOtro: sku==='otros' ? otherName.trim() : undefined,
        email: email.trim(),
        celular: celular.trim(),
        caduca,
        createdAt: Date.now()
      }, ...prev]);
      setMsg('Guardado');
    }
    clearForm();
  }

  function clearForm(){
    setSku(products[0]?.sku || '');
    setOtherName('');
    setEmail('');
    setCelular('');
    setCaduca('');
    setEditingId(null);
  }

  function startEdit(n){
    setEditingId(n.id);
    setSku(n.sku);
    setOtherName(n.nombreOtro || '');
    setEmail(n.email);
    setCelular(n.celular);
    setCaduca(n.caduca);
    setMsg('');
  }

  function remove(id){
    if(!confirm('Eliminar registro?')) return;
    setNumbers(prev => prev.filter(n=>n.id!==id));
    if(editingId===id) clearForm();
  }

  // Calcula días restantes hasta la fecha (caduca - hoy)
  function daysLeft(fecha){
    if(!fecha) return NaN;
    try {
      const d1 = new Date(fecha+"T00:00:00");
      const d2 = new Date(hoy+"T00:00:00");
      return Math.round((d1.getTime() - d2.getTime())/86400000);
    } catch {
      return NaN;
    }
  }

  // Luces:
  // Verde  : faltan >14 días
  // Amarillo: faltan 8–14 días
  // Rojo   : faltan 0–7 días (y vencidos también los tratamos como rojo)
  function statusInfo(n){
    const d = daysLeft(n.caduca);
    if(d <= 7) return { label: d < 0 ? 'Expirado' : '≤7 días', color:'#dc2626' };
    if(d <= 14) return { label:'≤14 días', color:'#e7b62b' };
    return { label:'>14 días', color:'#22c55e' };
  }

  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto space-y-8">
      <header>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-[#f09929]" /> Mis Números</h2>
        <p className="text-sm text-neutral-400">Registrar y visualizar contactos asociados a productos con fecha de caducidad.</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="bg-[#0f171e] border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4 text-neutral-300">{editingId ? 'Editar Número' : 'Agregar Número'}</h3>
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Producto</label>
              <select value={sku} onChange={e=>setSku(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
                {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
                <option value="otros">Otros</option>
                {products.length===0 && <option value="">(Sin productos)</option>}
              </select>
            </div>
            {sku==='otros' && (
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Nombre del producto (Otros)</label>
                <input
                  value={otherName}
                  onChange={e=>setOtherName(e.target.value)}
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1"
                  placeholder="Describe el producto"
                />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Correo electrónico</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Número de celular</label>
              <input value={celular} onChange={e=>setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Ej: 71234567" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Fecha de caducidad</label>
              <input type="date" value={caduca} onChange={e=>setCaduca(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
            </div>
            {msg && <div className={"text-xs "+(msg==='Guardado' || msg==='Actualizado'?'text-green-400':'text-red-400')}>{msg}</div>}
            <div className="flex justify-end gap-2">
              {editingId && (
                <button type="button" onClick={clearForm} className="px-4 py-2 rounded-xl bg-neutral-700 text-neutral-200 font-semibold text-sm">Cancelar</button>
              )}
              <button className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-sm">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
          <div className="text-[10px] text-neutral-500 mt-4">Los datos se almacenan localmente (MVP).</div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f171e] border border-neutral-800 rounded-2xl overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-800/60">
                <tr>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-left">Correo</th>
                  <th className="p-2 text-left">Celular</th>
                  <th className="p-2 text-left">Caducidad</th>
                  <th className="p-2 text-center">Días</th>
                  <th className="p-2 text-center">Estado</th>
                  <th className="p-2 text-right w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map(n=>{
                  const dLeft = daysLeft(n.caduca);
                  const expired = dLeft < 0;
                  const soon = !expired && dLeft <= 7;
                  const displayName = n.sku==='otros' ? (n.nombreOtro || 'Otros') : (prodMap[n.sku] || n.sku);
                  const st = statusInfo(n);
                  return (
                    <tr key={n.id} className={"border-t border-neutral-800 "+(expired?'bg-red-900/20': soon?'bg-yellow-700/10':'')}>
                      <td className="p-2 truncate" title={displayName}>{displayName}</td>
                      <td className="p-2 truncate" title={n.email}>{n.email}</td>
                      <td className="p-2">{n.celular}</td>
                      <td className="p-2">{toDMY(n.caduca)}</td>
                      <td className={"p-2 text-center font-semibold "+(expired?'text-red-400': soon?'text-[#e7922b]':'text-neutral-300')}>{isNaN(dLeft)?'':dLeft}</td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ background: st.color, boxShadow: `0 0 4px ${st.color}` }}
                            title={st.label}
                          ></span>
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={()=>startEdit(n)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Editar</button>
                          <button onClick={()=>remove(n.id)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Borrar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {ordenados.length===0 && <tr><td colSpan={7} className="p-6 text-center text-neutral-500 text-sm">Sin registros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------- Historial (vista de ventas confirmadas + gráfico) ----------------------
function HistorialView({ sales, products, session, users=[], onOpenReceipt }) {
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  const [tableFilter, setTableFilter] = useState('all'); // all | today | week | month
  const [cityFilter, setCityFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  // Confirmadas base
  let confirmadas = sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado');
  if(session?.rol !== 'admin') {
    const myGroup = session.grupo || (users.find(u=>u.id===session.id)?.grupo)||'';
    if(myGroup){
      confirmadas = confirmadas.filter(s=>{
        const vId = s.vendedoraId;
        if(vId){
          const vu = users.find(u=>u.id===vId);
          return vu? vu.grupo===myGroup : false;
        }
        const vu = users.find(u=> (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === (s.vendedora||'').trim().toLowerCase()));
        return vu? vu.grupo===myGroup : false;
      });
    }
  }

  const rows = useMemo(()=> confirmadas
    .slice() // copiar
    .sort((a,b)=> (b.confirmadoAt||0) - (a.confirmadoAt||0))
    .map(s=>{
      const p1 = products.find(p=>p.sku===s.sku);
      const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra) : null;
      const total = Number(s.total != null ? s.total :
        (Number(s.precio||0)*Number(s.cantidad||0) +
         (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)));
      const gasto = Number(s.gasto||0);
      return {
        id:s.id,
        fecha:s.fecha,
        hora:s.horaEntrega||'',
        ciudad:s.ciudad,
        vendedor:s.vendedora,
  // productos y cantidades agregados ya no usados en nueva vista, se mantienen por compatibilidad
  productos:[p1?.nombre||s.sku, p2? p2.nombre:null].filter(Boolean).join(' + '),
  cantidades:[s.cantidad, s.cantidadExtra].filter(v=>v!=null).join(' + '),
        total,
        gasto,
        neto: total - gasto,
        metodo:s.metodo,
        celular:s.celular||'',
  comprobante:s.comprobante,
  destinoEncomienda: s.destinoEncomienda,
  // conservar campos originales para totales por producto
  sku: s.sku,
  cantidad: s.cantidad,
  skuExtra: s.skuExtra,
  cantidadExtra: s.cantidadExtra
      };
    }), [confirmadas, products]);

  // --- Filtros para tabla ---
  const hoy = todayISO();
  const now = new Date(hoy+"T00:00:00");
  const weekAgo = new Date(now.getTime() - 6*86400000); // incluye hoy -> 7 días
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  function keepByFilter(r){
    if(tableFilter==='all') return true;
    if(tableFilter==='today') return r.fecha === hoy;
    if(tableFilter==='week') {
      // Últimos 7 días incluyendo hoy
      const d = new Date(r.fecha+"T00:00:00");
      return d >= weekAgo;
    }
    if(tableFilter==='month') return r.fecha.slice(0,7) === hoy.slice(0,7);
    return true;
  }
  const uniqueCities = useMemo(()=> Array.from(new Set(rows.map(r=>r.ciudad))).filter(Boolean).sort(), [rows]);
  const filteredRows = rows.filter(r=>{
    if(!keepByFilter(r)) return false;
    if(cityFilter!=='all' && r.ciudad !== cityFilter) return false;
    if(dateStart && r.fecha < dateStart) return false;
    if(dateEnd && r.fecha > dateEnd) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if(safePage !== page) setTimeout(()=> setPage(safePage), 0); // ajustar silenciosamente si filtros reducen páginas
  const pageRows = filteredRows.slice((safePage-1)*pageSize, safePage*pageSize);

  // Reset página al cambiar filtros manuales
  useEffect(()=>{ setPage(1); }, [tableFilter, cityFilter, dateStart, dateEnd]);

  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto space-y-6">
      <header className="mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-[#f09929]" /> Historial de Ventas
        </h2>
        <p className="text-sm text-neutral-400">Ventas confirmadas y análisis temporal.</p>
      </header>

      {session?.rol==='admin' && (
        <div className="rounded-2xl p-4 bg-[#0f171e] border border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-neutral-400">
              Ventas ({period === 'week' ? 'últimos 7 días' : period === 'month' ? 'mes actual' : 'último trimestre'})
            </div>
            <select
              value={period}
              onChange={e=>setPeriod(e.target.value)}
              className="bg-neutral-800 rounded-lg px-2 py-1 text-xs"
            >
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="quarter">Trimestre</option>
            </select>
          </div>
          <ChartVentas period={period} sales={confirmadas} />
        </div>
      )}

  <div className="rounded-2xl bg-[#0f171e]">
        {/* Botones de filtro */}
        <div className="p-3 flex flex-wrap items-center gap-3 border-b border-neutral-800 text-[11px]">
          <span className="text-neutral-400 mr-2">Filtrar:</span>
          {[
            {id:'all', label:'Todos'},
            {id:'today', label:'Hoy'},
            {id:'week', label:'Últimos 7 días'},
            {id:'month', label:'Mes actual'}
          ].map(f=> (
            <button
              key={f.id}
              onClick={()=>setTableFilter(f.id)}
              className={"px-3 py-1.5 rounded-lg border text-xs font-medium transition " + (tableFilter===f.id ? 'bg-[#e7922b] border-[#e7922b] text-[#1a2430]' : 'bg-neutral-800/60 border-neutral-700 hover:bg-neutral-700')}
            >{f.label}</button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)} className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-2 py-1 text-xs">
              <option value="all">Todas las ciudades</option>
              {uniqueCities.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <label className="text-neutral-500 text-[10px]">Desde</label>
            <input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)} className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-2 py-1 text-xs" />
            <label className="text-neutral-500 text-[10px]">Hasta</label>
            <input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} className="bg-neutral-800/60 border border-neutral-700 rounded-lg px-2 py-1 text-xs" />
            {(dateStart||dateEnd) && (
              <button type="button" onClick={()=>{ setDateStart(''); setDateEnd(''); }} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Limpiar</button>
            )}
          </div>
          <div className="ml-auto text-[10px] text-neutral-500">{filteredRows.length} / {rows.length} registros · Página {safePage} de {totalPages}</div>
        </div>
        <div className="overflow-auto">
        {(() => {
          const productOrder = products.map(p=>p.sku);
          // Totales para página actual (no global) para consistencia con CitySummary; podría cambiarse a filteredRows si se desea global filtrado
          const pageTotals = (()=>{
            const skuTotals = {};
            let monto=0, delivery=0, neto=0;
            pageRows.forEach(r=>{
              // calcular cantidades por sku en este row
              if(r.sku) skuTotals[r.sku] = (skuTotals[r.sku]||0) + Number(r.cantidad||0);
              if(r.skuExtra) skuTotals[r.skuExtra] = (skuTotals[r.skuExtra]||0) + Number(r.cantidadExtra||0);
              monto += Number(r.total||0);
              delivery += Number(r.gasto||0);
              neto += Number(r.neto||0);
            });
            return { skuTotals, monto, delivery, neto };
          })();
          return (
            <table className="w-full text-[11px] min-w-[1100px]">
              <thead className="bg-neutral-800/60">
                <tr>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Hora</th>
                  <th className="p-2 text-left">Ciudad</th>
                  <th className="p-2 text-left">Encomienda</th>
                  <th className="p-2 text-left">Usuario</th>
                  {productOrder.map(sku=>{ const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>; })}
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">Delivery</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-center">Celular</th>
                  <th className="p-2 text-center">Comp.</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r=>{
                  const cantidades = productOrder.map(sku=>{ let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                  return (
                    <tr key={r.id} className="border-t border-neutral-800">
                      <td className="p-2">{toDMY(r.fecha)}</td>
                      <td className="p-2">{r.hora}</td>
                      <td className="p-2">{r.ciudad}</td>
                      <td className="p-2 text-left max-w-[160px]">{r.metodo==='Encomienda'? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>: ''}</td>
                      <td className="p-2 whitespace-nowrap">{firstName(r.vendedor)}</td>
                      {cantidades.map((c,i)=> <td key={i} className="p-2 text-center">{c||''}</td>)}
                      <td className="p-2 text-right font-semibold">{currency(r.total)}</td>
                      <td className="p-2 text-right">{r.gasto?currency(r.gasto):''}</td>
                      <td className="p-2 text-right font-semibold">{currency(r.neto)}</td>
                      <td className="p-2 text-center">{r.celular||''}</td>
                      <td className="p-2 text-center">
                        {r.comprobante && (
                          <button
                            onClick={()=>{ const sale = confirmadas.find(s=>s.id===r.id); if(sale && onOpenReceipt) onOpenReceipt(sale); }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1d2a34] hover:bg-[#253341] border border-[#e7922b]/40"
                            title="Ver comprobante"
                          >
                            <Search className="w-3 h-3 text-[#e7922b]" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={5+productOrder.length+5} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
              </tbody>
              {pageRows.length>0 && (
                <tfoot>
                  <tr className="border-t border-neutral-800 bg-neutral-900/40">
                    <td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={5}>Totales (página)</td>
                    {productOrder.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{pageTotals.skuTotals[sku]||''}</td>)}
                    <td className="p-2 text-right font-bold text-[#e7922b]">{currency(pageTotals.monto)}</td>
                    <td className="p-2 text-right font-bold text-[#e7922b]">{pageTotals.delivery?currency(pageTotals.delivery):''}</td>
                    <td className="p-2 text-right font-bold text-[#e7922b]">{currency(pageTotals.neto)}</td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          );
        })()}
        {filteredRows.length > pageSize && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 text-[11px]">
            <button disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className={`px-3 py-1 rounded-lg border ${safePage===1? 'opacity-40 cursor-default border-neutral-700 bg-neutral-800':'bg-neutral-800/60 border-neutral-700 hover:bg-neutral-700'}`}>Anterior</button>
            <div className="flex items-center gap-1">
              <span className="text-neutral-400">Página</span>
              <input value={safePage} onChange={e=>{ const v = Number(e.target.value)||1; if(v>=1 && v<=totalPages) setPage(v); }} className="w-12 text-center bg-neutral-800/60 border border-neutral-700 rounded-lg px-2 py-1" />
              <span className="text-neutral-400">de {totalPages}</span>
            </div>
            <button disabled={safePage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className={`px-3 py-1 rounded-lg border ${safePage===totalPages? 'opacity-40 cursor-default border-neutral-700 bg-neutral-800':'bg-neutral-800/60 border-neutral-700 hover:bg-neutral-700'}`}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
// ---------------------- Pequeños componentes ----------------------
function KPI({ icon, label, value }) {
  return (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 bg-[#0f171e]">
      <div className="flex items-center gap-2 text-neutral-400 text-sm">{icon} {label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </motion.div>
  );
}

function ChartVentas({ period, sales }) {
  // Agrupar según periodo seleccionado
  const data = useMemo(()=>{
    if(!sales.length) return [];
    const today = new Date();
    function fmt(d){ return d.toISOString().slice(0,10); }
    if(period==='week'){
      const days = [...Array(7)].map((_,i)=>{
        const d = new Date(today);
        d.setDate(d.getDate() - (6-i));
        return fmt(d);
      });
      const map = Object.fromEntries(days.map(d=>[d,0]));
      sales.forEach(s=>{ if(map[s.fecha] != null) map[s.fecha] += s.precio * s.cantidad; });
      return days.map(d=>({ label:d, total: map[d] }));
    }
    if(period==='month'){
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month+1, 0).getDate();
      const map = {};
      for(let day=1; day<=daysInMonth; day++){
        const d = new Date(year, month, day);
        map[fmt(d)] = 0;
      }
      sales.forEach(s=>{ if(map[s.fecha] != null) map[s.fecha] += s.precio * s.cantidad; });
      return Object.keys(map).map(k=>({ label: k.slice(8,10), total: map[k] }));
    }
    // quarter (últimos 3 meses incluyendo el actual)
    const months = [];
    for(let i=2;i>=0;i--){
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      months.push({ y:d.getFullYear(), m:d.getMonth() });
    }
    const map = months.map(m=>({ key: m.y+'-'+String(m.m+1).padStart(2,'0'), total:0 }));
    sales.forEach(s=>{
      const seg = s.fecha.slice(0,7);
      const bucket = map.find(b=>b.key===seg);
      if(bucket) bucket.total += s.precio * s.cantidad;
    });
    return map.map(b=>({ label: b.key, total: b.total }));
  }, [period, sales]);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f09929" opacity={0.35} />
          <XAxis dataKey="label" stroke="#f09929" tickLine={false} axisLine={false} />
          <YAxis stroke="#f09929" tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => currency(v)} contentStyle={{ background:'#0f171e', border:'1px solid #f09929', fontSize:12 }} cursor={{ fill:'#f0992930' }} />
          <Bar dataKey="total" fill="#f09929" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Modal({ children, onClose, className="", disableClose=false, autoWidth=false }) {
  React.useEffect(()=>{
    if(disableClose) return;
    function onKey(e){
      if(e.key === 'Escape') { try { e.stopPropagation(); } catch{} onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [onClose, disableClose]);
  return (
    <motion.div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        className={(autoWidth ? "" : "w-full max-w-lg ") + "rounded-2xl p-5 relative bg-[#0f171e] " + className}
      >
        {!disableClose && <button className="absolute right-3 top-3 p-1 bg-neutral-800 rounded-full" onClick={onClose}><X className="w-4 h-4" /></button>}
        {children}
      </motion.div>
    </motion.div>
  );
}

function SaleForm({ products, session, onSubmit, initialSku, fixedCity }) {
  const [fecha, setFecha] = useState(todayISO());
  const ciudades = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ"];
  const [ciudadVenta, setCiudadVenta] = useState(fixedCity || ciudades[0]);
  const visibleProducts = useMemo(()=>{
    const assigned = session.productos || [];
    // Admin o vendedor con lista vacía => todos.
    if (session.rol === 'admin' || assigned.length === 0) return products;
    return products.filter(p => assigned.includes(p.sku));
  }, [products, session]);

  const [sku, setSku] = useState(initialSku || (visibleProducts[0] ? visibleProducts[0].sku : ""));
  const [cantidad, setCantidad] = useState(1);
  const [precioTotal, setPrecioTotal] = useState(0); // ahora representa TOTAL
  const [hIni, setHIni] = useState('');
  const [rsHIni, setRsHIni] = useState('');
  const [mIni, setMIni] = useState('00');
  const [rsMIni, setRsMIni] = useState('00');
  const [ampmIni, setAmpmIni] = useState('AM');
  const [hFin, setHFin] = useState('');
  const [rsHFin, setRsHFin] = useState('');
  const [mFin, setMFin] = useState('00');
  const [rsMFin, setRsMFin] = useState('00');
  const [ampmFin, setAmpmFin] = useState('PM');
  const [skuExtra, setSkuExtra] = useState('');
  const [cantidadExtra, setCantidadExtra] = useState(0);
  // Métodos disponibles restringidos a Delivery y Encomienda. Iniciar en Delivery.
  const [metodo, setMetodo] = useState("Delivery");
  const [comprobanteFile, setComprobanteFile] = useState(null); // base64
  const [celular, setCelular] = useState("");
  // Notas removidas según requerimiento
  const [destinoEncomienda, setDestinoEncomienda] = useState("");

  // Forzar que cada vez que se abre el formulario la fecha arranque en el día actual
  useEffect(()=>{ setFecha(todayISO()); },[]);

  // ya no actualizamos precio unitario
  useEffect(()=>{
    if(initialSku){
      setSku(initialSku);
    }
  }, [initialSku]);

  function submit(e) {
    e.preventDefault();
    if(!sku) return alert('Producto inválido');
    if(!cantidad || cantidad <=0) return alert('Cantidad inválida');
    if(skuExtra && cantidadExtra <=0) return alert('Cantidad adicional inválida');
    function build12(h,m,ap){ if(!h) return ''; return `${h}:${m} ${ap}`; }
    const inicioStr = build12(hIni,mIni,ampmIni);
    const finStr = build12(hFin,mFin,ampmFin);
    const horaEntrega = inicioStr && finStr ? `${inicioStr}-${finStr}` : inicioStr;
  if(metodo==='Encomienda' && !destinoEncomienda.trim()) return alert('Ingresa destino de la encomienda');
  onSubmit({ fecha, ciudad: ciudadVenta, sku, cantidad: Number(cantidad), skuExtra: skuExtra || undefined, cantidadExtra: skuExtra ? Number(cantidadExtra) : undefined, total: Number(precioTotal||0), horaEntrega, vendedora: session.nombre, vendedoraId: session.id, metodo, celular, destinoEncomienda: metodo==='Encomienda'? destinoEncomienda.trim(): undefined, comprobante: comprobanteFile || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#f09929]" /> Registrar venta</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Hora inicio</label>
          <div className="flex gap-2 mt-1">
            <select value={hIni} onChange={e=>setHIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-16">
              <option value="">--</option>
              {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h}>{h}</option>)}
            </select>
            <select value={mIni} onChange={e=>setMIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-18">
              {['00','15','30','45'].map(m=> <option key={m}>{m}</option>)}
            </select>
            <select value={ampmIni} onChange={e=>setAmpmIni(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Hora fin (opcional)</label>
          <div className="flex gap-2 mt-1">
            <select value={hFin} onChange={e=>setHFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-16">
              <option value="">--</option>
              {Array.from({length:12},(_,i)=>i+1).map(h=> <option key={h}>{h}</option>)}
            </select>
            <select value={mFin} onChange={e=>setMFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm w-18">
              {['00','15','30','45'].map(m=> <option key={m}>{m}</option>)}
            </select>
            <select value={ampmFin} onChange={e=>setAmpmFin(e.target.value)} className="bg-neutral-800 rounded-xl px-2 py-2 text-sm">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
        {!fixedCity && (
          <div>
            <label className="text-sm">Ciudad</label>
            <select value={ciudadVenta} onChange={e=>setCiudadVenta(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
              {ciudades.map(c=> <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="col-span-2 text-xs text-neutral-500 -mt-2">Producto principal ya fue elegido al iniciar. ({(visibleProducts.find(p=>p.sku===sku)?.nombre)||'—'})</div>
        <div>
          <label className="text-sm">Cantidad</label>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Precio TOTAL</label>
          <input type="number" step="0.01" value={precioTotal} onChange={(e) => setPrecioTotal(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm">Producto adicional (opcional)</label>
          <select value={skuExtra} onChange={e=>setSkuExtra(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
            <option value="">— Ninguno —</option>
            {products.filter(p=>p.sku!==sku).map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
          </select>
          <div className="text-[10px] text-neutral-500 mt-1">Lista completa (aunque no esté habilitado).</div>
        </div>
        <div>
          <label className="text-sm">Cantidad adicional</label>
          <input type="number" min={0} value={cantidadExtra} onChange={e=>setCantidadExtra(e.target.value)} disabled={!skuExtra} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-50" />
        </div>
        <div>
          <label className="text-sm">Método de pago</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
            <option value="Delivery">Delivery</option>
            <option value="Encomienda">Encomienda</option>
          </select>
          {metodo==='Encomienda' && (
            <div className="mt-2">
              <label className="block text-[11px] text-neutral-400 mb-1">Destino Encomienda</label>
              <input value={destinoEncomienda} onChange={e=>setDestinoEncomienda(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm" placeholder="Ciudad / Agencia / Referencia" />
            </div>
          )}
          {/* Input de comprobante siempre visible (opcional) */}
          <div className="mt-2 text-xs space-y-1">
            <input type="file" accept="image/*,.pdf" onChange={async e=>{
              const f = e.target.files?.[0]; if(!f) { setComprobanteFile(null); return; }
              if(f.size > 2*1024*1024){ alert('Archivo supera 2MB'); return; }
              const reader = new FileReader();
              reader.onload = ev=> setComprobanteFile(ev.target?.result || null);
              reader.readAsDataURL(f);
            }} className="text-xs" />
            <div className="text-[10px] text-neutral-500">Comprobante (máx 2MB) — opcional.</div>
            {comprobanteFile && <div className="text-[10px] text-green-400">Comprobante adjuntado</div>}
          </div>
        </div>
        <div>
          <label className="text-sm">Celular</label>
          <input value={celular} onChange={(e) => setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Número" />
        </div>
  {/* Campo Notas removido */}
      </div>
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-white text-neutral-900 rounded-xl font-semibold">Guardar venta</button>
      </div>
    </form>
  );
}

// ---------------------- Registrar Venta (vista dedicada) ----------------------
function RegisterSaleView({ products, setProducts, sales, setSales, session, dispatches }) {
  const [showSale, setShowSale] = useState(false);
  const [initialSku, setInitialSku] = useState(null);
  const cities = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ"];
  const [selectedCity, setSelectedCity] = useState(null);
  const allowed = useMemo(() => {
    const assigned = session.productos || [];
    // Admin o vendedor con lista vacía => todos.
    if (session.rol === 'admin' || assigned.length === 0) return products;
    return products.filter(p => assigned.includes(p.sku));
  }, [products, session]);

  function openSale(p){
    if(!selectedCity) { alert('Primero selecciona la ciudad.'); return; }
    setInitialSku(p.sku);
    setShowSale(true);
  }

  function addSale(payload){
    const product = products.find(p=>p.sku===payload.sku);
    if(!product) return alert('Producto no encontrado');
    if(product.stock < payload.cantidad) return alert('Stock central insuficiente (no se puede reservar)');
    if(payload.skuExtra && payload.cantidadExtra){
      const prod2 = products.find(p=>p.sku===payload.skuExtra);
      if(!prod2) return alert('Producto adicional no encontrado');
      if(prod2.stock < payload.cantidadExtra) return alert('Stock central insuficiente del adicional');
    }
    const nextSale = { id: uid(), ...payload, estadoEntrega: 'pendiente' };
    setSales([nextSale, ...sales]);
    setShowSale(false);
  }

  return (
    <div className="flex-1 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#f09929]" /> Registrar venta</h2>
          <p className="text-sm text-neutral-400">1) Elige la ciudad  2) Selecciona el producto  3) Completa los datos.</p>
        </div>
        <div className="text-xs text-neutral-500">{allowed.length} productos habilitados</div>
      </header>
      {/* Botones de ciudades */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mr-1">Ciudades:</div>
        {cities.map(c => (
          <button
            key={c}
            onClick={()=> setSelectedCity(selectedCity===c? null : c)}
            className={"px-4 py-2 rounded-xl text-sm font-semibold transition " + (selectedCity===c ? "bg-[#ea9216] text-[#313841]" : "bg-[#10161e] hover:bg-[#273947]/40 text-neutral-200")}
            style={{letterSpacing:'0.5px'}}
          >{c}</button>
        ))}
      </div>
      {!selectedCity && <div className="text-neutral-500 text-sm mb-4">Selecciona una ciudad para mostrar los productos.</div>}
      {selectedCity && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
          {allowed.map(p => {
            // Fórmula solicitada: mostrar (stock - pedidos por confirmar)
            // Donde 'stock' = envíos confirmados - ventas confirmadas (lo disponible real hoy)
            // y 'pedidos por confirmar' = ventas pendientes (estadoEntrega !== 'confirmado')
            let enviadosConfirmados = 0; // total enviado confirmado a la ciudad para este SKU
            let ventasConfirmadas = 0;   // ventas ya confirmadas (restan del stock base)
            let ventasPendientes = 0;    // pedidos aún no confirmados
            (dispatches||[]).filter(d=>d.ciudad===selectedCity && d.status==='confirmado').forEach(d=>{
              d.items.forEach(it=>{ if(it.sku===p.sku) enviadosConfirmados += Number(it.cantidad||0); });
            });
            (sales||[]).filter(s=>s.ciudad===selectedCity).forEach(s=>{
              const cantPrin = s.sku===p.sku ? Number(s.cantidad||0) : 0;
              const cantExtra = s.skuExtra===p.sku ? Number(s.cantidadExtra||0) : 0;
              if((s.estadoEntrega||'')==='confirmado') ventasConfirmadas += cantPrin + cantExtra; else ventasPendientes += cantPrin + cantExtra;
            });
            const stockBase = enviadosConfirmados - ventasConfirmadas; // disponible sin contar pendientes
            const disponible = stockBase - ventasPendientes; // lo que queda si todos los pendientes se confirman
            return (
              <button key={p.sku} onClick={()=>openSale(p)} className="group rounded-3xl p-3 transition flex flex-col gap-3 bg-[#0f171e] hover:ring-2 hover:ring-neutral-600/40 w-[270px] mx-auto">
                <div className="text-[15px] font-semibold tracking-wide text-center uppercase leading-snug line-clamp-2 px-1" title={p.nombre}>{p.nombre}</div>
                <div className="relative w-full rounded-2xl bg-neutral-800 overflow-hidden border border-neutral-700 shadow-inner">
                  <div className="w-full pb-[100%]"></div>
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-500">SIN IMAGEN</span>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-[20px] font-semibold text-[#f09929] leading-none" title={`Stock base: ${stockBase}\nPendientes: ${ventasPendientes}`}>{disponible}</div>
                </div>
                <div className="text-[15px] font-semibold text-[#f09929] tracking-wide text-center">STOCK: {disponible}</div>
              </button>
            );
          })}
          {allowed.length===0 && <div className="text-neutral-500 text-sm col-span-full">No tienes productos asignados.</div>}
        </div>
      )}
      <AnimatePresence>
        {showSale && (
          <Modal onClose={()=>setShowSale(false)}>
            <SaleForm products={allowed} session={session} onSubmit={addSale} initialSku={initialSku} fixedCity={selectedCity} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------- Ventas (listado dedicado) ----------------------
function VentasView({ sales, products, session, dispatches, setDispatches }) {
  const cities = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ"]; // removido 'SIN CIUDAD'
  const [cityFilter, setCityFilter] = useState(()=>{
    try {
      const saved = localStorage.getItem('ui.cityFilter');
      if(saved && cities.includes(saved)) return saved;
    } catch {}
    return cities[0];
  });
  useEffect(()=>{
    try {
      if(cityFilter) localStorage.setItem('ui.cityFilter', cityFilter); else localStorage.removeItem('ui.cityFilter');
    } catch {}
  }, [cityFilter]);

  const rows = sales.map(s => {
    const p = products.find(p=>p.sku===s.sku);
    return { ...s, nombre: p?.nombre || '—' };
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <header>
        <h2 className="text-xl font-semibold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#f09929]" /> Ventas</h2>
      </header>
      {/* Botones de ciudades en horizontal */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mr-2">Ciudades:</div>
          {cities.map(c => (
            <button
              key={c}
              onClick={() => setCityFilter(cityFilter === c ? null : c)}
              className={
                "px-5 py-3 rounded-xl text-base font-semibold transition " +
                (cityFilter === c
                  ? "bg-[#ea9216] text-[#313841]"
                  : "bg-[#10161e] hover:bg-[#273947]/40 text-neutral-200")
              }
              style={{letterSpacing:'0.5px'}}
            >
              {c}
            </button>
          ))}
        </div>
        {cityFilter && (
          <>
            <CityPendingShipments city={cityFilter} dispatches={dispatches} setDispatches={setDispatches} products={products} session={session} />
            <CityStock city={cityFilter} products={products} sales={sales} dispatches={dispatches.filter(d=>d.status==='confirmado')} />
            <CitySummary city={cityFilter} sales={sales} products={products} />
          </>
        )}
  {/* Tabla de ventas removida a solicitud. */}
      </div>
    </div>
  );
}

// Resumen tipo cuadro para una ciudad seleccionada
function CitySummary({ city, sales, products }) {
  const filtradas = sales
    .filter(s=>s.ciudad===city && (s.estadoEntrega||'confirmado')==='confirmado')
    .sort((a,b)=>{
      // Orden descendente: más reciente primero
      const ta = b.confirmadoAt || 0;
      const tb = a.confirmadoAt || 0;
      if(ta!==tb) return ta - tb;
      if(b.fecha!==a.fecha) return b.fecha.localeCompare(a.fecha);
      const ha = (b.horaEntrega||'').split('-')[0].trim();
      const hb = (a.horaEntrega||'').split('-')[0].trim();
      return minutesFrom12(normalizeRangeTo12(ha)) - minutesFrom12(normalizeRangeTo12(hb));
    });

  // Construir filas (rows) que antes se usaban pero no estaban definidas -> causaba ReferenceError
  const rows = filtradas.map(s=> {
    const p1 = products.find(p=>p.sku===s.sku);
    const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra) : null;
    const totalCalc = Number(s.total != null ? s.total : (Number(s.precio||0)*Number(s.cantidad||0) +
      (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)));
    const gasto = Number(s.gasto||0);
    return {
      id: s.id,
      sku: s.sku,
      cantidad: s.cantidad,
      skuExtra: s.skuExtra,
      cantidadExtra: s.cantidadExtra,
      fecha: s.fecha,
      hora: s.horaEntrega || '',
      ciudad: s.ciudad,
      vendedor: s.vendedora,
      productos: [p1?.nombre || s.sku, p2 ? p2.nombre : null].filter(Boolean).join(' + '),
      cantidades: [s.cantidad, s.cantidadExtra].filter(x => x != null).join(' + '),
      total: totalCalc,
      gasto,
      neto: totalCalc - gasto,
      metodo: s.metodo,
      celular: s.celular || '',
      comprobante: s.comprobante,
      destinoEncomienda: s.destinoEncomienda
    };
  });

  // (Variables previas que ya no se usan eliminadas)
  const productOrder = products.map(p=>p.sku);
  const [openComp, setOpenComp] = useState(null); // base64 comprobante
  const [showResumen, setShowResumen] = useState(false);
  const hoyISO = todayISO();
  const hoyDMY = hoyISO ? (hoyISO.slice(8,10)+'/'+hoyISO.slice(5,7)+'/'+hoyISO.slice(0,4)) : '';
  useEffect(()=>{
    if(!showResumen) return;
    function onKey(e){ if(e.key==='Escape') setShowResumen(false); }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [showResumen]);
  return (
    <div className="rounded-2xl p-4 bg-[#0f171e]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-start gap-3">
            <button onClick={()=>setShowResumen(true)} title="Ver resumen sin columnas extra" className="p-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-[#f09929]" /> {city}</div>
              <div className="text-xs text-neutral-500">{rows.length} entregas confirmadas • Total {currency(rows.reduce((a,f)=>a+f.total,0))}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-[11px] min-w-[960px]">
          <thead className="bg-neutral-800/60">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Hora</th>
              <th className="p-2 text-left">Ciudad</th>
              <th className="p-2 text-left">Encomienda</th>
              <th className="p-2 text-left">Usuario</th>
              {productOrder.map(sku=>{
                const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
              })}
              <th className="p-2 text-right">Monto</th>
              <th className="p-2 text-right">Delivery</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-center">Celular</th>
              <th className="p-2 text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const cantidades = productOrder.map(sku=>{ let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
              return (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="p-2">{toDMY(r.fecha)}</td>
                  <td className="p-2">{r.hora}</td>
                  <td className="p-2">{r.ciudad}</td>
                  <td className="p-2 text-left max-w-[160px]">{r.metodo==='Encomienda' ? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>: null}</td>
                  <td className="p-2 whitespace-nowrap">{firstName(r.vendedor)}</td>
                  {cantidades.map((c,i)=> <td key={i} className="p-2 text-center">{c||''}</td>)}
      <td className="p-2 text-right font-semibold">{currency(r.total)}</td>
      <td className="p-2 text-right">{r.gasto?currency(r.gasto):''}</td>
      <td className="p-2 text-right font-semibold">{currency(r.neto)}</td>
                  <td className="p-2 text-center">{r.celular||''}</td>
                  <td className="p-2 text-center">
                    {r.comprobante && (
                      <button
                        onClick={()=>setOpenComp(r.comprobante)}
                        title="Ver comprobante"
                        className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
    {!rows.length && <tr><td colSpan={5+productOrder.length+5} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
          </tbody>
          {rows.length>0 && (()=>{
            const totSku = {};
            rows.forEach(r=>{
              if(r.sku) totSku[r.sku] = (totSku[r.sku]||0) + Number(r.cantidad||0);
              if(r.skuExtra) totSku[r.skuExtra] = (totSku[r.skuExtra]||0) + Number(r.cantidadExtra||0);
            });
            const sumMonto = rows.reduce((a,r)=> a + Number(r.total||0), 0);
            const sumDelivery = rows.reduce((a,r)=> a + Number(r.gasto||0), 0);
            const sumTotal = rows.reduce((a,r)=> a + Number(r.neto||0), 0);
            return (
              <tfoot>
                <tr className="border-t border-neutral-800 bg-neutral-900/40">
                  <td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={5}>Totales</td>
                  {productOrder.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
                  <td className="p-2 text-right font-bold text-[#e7922b]">{currency(sumMonto)}</td>
                  <td className="p-2 text-right font-bold text-[#e7922b]">{sumDelivery?currency(sumDelivery):''}</td>
                  <td className="p-2 text-right font-bold text-[#e7922b]">{currency(sumTotal)}</td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
        {openComp && (
          <Modal onClose={()=>setOpenComp(null)}>
            <div className="space-y-3 w-[360px]">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Comprobante</h3>
              {/pdf/i.test(openComp.slice(0,40)) ? (
                <a href={openComp} target="_blank" rel="noreferrer" className="text-xs underline text-[#e7922b]">Abrir PDF en nueva pestaña</a>
              ) : (
                <img src={openComp} alt="Comprobante" className="max-h-80 mx-auto object-contain rounded-lg border border-neutral-700" />
              )}
              <div className="text-[10px] text-neutral-500">Archivo almacenado localmente.</div>
              <div className="flex justify-end">
                <button onClick={()=>setOpenComp(null)} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Cerrar</button>
              </div>
            </div>
          </Modal>
        )}
        {showResumen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-8 bg-black/50">
            <div className="relative bg-[#10161e] border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-[1400px] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-[#e7922b]">Entregas confirmadas – {city} {hoyDMY}</div>
                <button onClick={()=>setShowResumen(false)} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs">Cerrar</button>
              </div>
              <table className="w-full text-[12px] leading-tight">
                <thead className="bg-neutral-800/60">
                  <tr>
                    <th className="px-0.2 py-0.5 text-left">Fecha</th>
                    <th className="px-0.2 py-0.5 text-left">Hora</th>
                    <th className="px-0.2 py-0.5 text-left">Ciudad</th>
                    <th className="px-0.2 py-0.5 text-left">Encomienda</th>
                    {productOrder.map(sku=>{
                      const prod = products.find(p=>p.sku===sku); return <th key={sku} className="px-1 py-0.5 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
                    })}
                    <th className="px-0.2 py-0.5 text-right">Delivery</th>
                    <th className="px-0.2 py-0.5 text-right">Total</th>
                    <th className="px-0.2 py-0.5 text-center">Celular</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r=>{
                    const cantidades = productOrder.map(sku=>{ let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                    return (
                      <tr key={r.id} className="border-t border-neutral-800">
                        <td className="px-1 py-0.5 whitespace-nowrap">{toDMY(r.fecha)}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{r.hora}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{r.ciudad}</td>
                        <td className="px-1 py-0.5 text-left max-w-[140px] truncate">{r.metodo==='Encomienda'? r.destinoEncomienda||'' : ''}</td>
                        {cantidades.map((c,i)=> <td key={i} className="px-1 py-0.5 text-center">{c||''}</td>)}
                        <td className="px-1 py-0.5 text-right">{r.gasto?currency(r.gasto):''}</td>
                        <td className="px-1 py-0.5 text-right font-semibold">{currency(r.neto)}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{r.celular||''}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && <tr><td colSpan={productOrder.length+7} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
                </tbody>
                {rows.length>0 && (()=>{
                  const totSku = {};
                  rows.forEach(r=>{ if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
                  const sumDelivery = rows.reduce((a,r)=> a + Number(r.gasto||0),0);
                  const sumTotal = rows.reduce((a,r)=> a + Number(r.neto||0),0);
                  return (
                    <tfoot>
                      <tr className="border-t border-neutral-800 bg-neutral-900/40">
                        <td className="px-1 py-0.5 text-[8px] font-semibold text-neutral-400" colSpan={4}>Totales</td>
                        {productOrder.map(sku=> <td key={sku} className="px-1 py-0.5 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
                        <td className="px-1 py-0.5 text-right font-bold text-[#e7922b]">{sumDelivery?currency(sumDelivery):''}</td>
                        <td className="px-1 py-0.5 text-right font-bold text-[#e7922b]">{currency(sumTotal)}</td>
                        <td className="px-1 py-0.5"></td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
