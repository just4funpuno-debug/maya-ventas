import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  LogIn, LogOut, ShoppingCart, CircleDollarSign, TrendingUp, AlertTriangle, Upload, Plus,
  Package, FileSpreadsheet, Wallet, Settings, X, UserPlus, MapPin, Search, Plane, Clock, Check, History,
  ArrowLeft, ArrowRight, MessageSquare, Home
} from "lucide-react";
import Papa from "papaparse";
import { supabase, fetchAll, upsert, clearTable } from './supabaseClient';

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
// Generador de IDs: si hay Supabase usamos UUID (requerido por columnas uuid) para que los upsert no fallen.
const uid = () => {
  try {
    if (supabase && typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignore */ }
  // Fallback: generar UUID v4 manual (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  const rnd = (len) => {
    let out='';
    for(let i=0;i<len;i++){ out += ((Math.random()*16)|0).toString(16); }
    return out;
  };
  const part1 = rnd(8);
  const part2 = rnd(4);
  const part3 = '4' + rnd(3); // version 4
  const part4 = ((8 + ((Math.random()*4)|0)).toString(16)) + rnd(3); // variant 8..b
  const part5 = rnd(12);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
};
const firstName = (n='') => n.split(' ')[0] || '';

// Detecta si un string ya es UUID v4 (simplificado)
function isProbablyUUID(id){
  return typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id);
}

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

// --- Activación sencilla de debug en móvil ---
// Opciones:
//  1) Añade ?debug o #debug a la URL -> activa _SYNC_DEBUG y persiste en localStorage.
//  2) Usa localStorage.setItem('ventas.debug','1') y recarga.
//  3) Ejecuta window.toggleSyncDebug() para alternar.
// Flag global de debug (usado para envolver console.logs). Se recalcula al togglear.
let __DBG = false;

try {
  if (typeof window !== 'undefined') {
    if (location.search.includes('debug') || location.hash.includes('debug')) {
      window._SYNC_DEBUG = true;
    }
    if (localStorage.getItem('ventas.debug') === '1') {
      window._SYNC_DEBUG = true;
    }
    if (window._SYNC_DEBUG) {
      localStorage.setItem('ventas.debug','1');
    }
    window.toggleSyncDebug = function(on){
      if(on===undefined) on = !window._SYNC_DEBUG;
      window._SYNC_DEBUG = !!on;
      if(window._SYNC_DEBUG) localStorage.setItem('ventas.debug','1'); else localStorage.removeItem('ventas.debug');
      __DBG = !!(import.meta?.env?.DEV) && !!window._SYNC_DEBUG;
      if(__DBG) console.log('[DEBUG] _SYNC_DEBUG =', window._SYNC_DEBUG);
      return window._SYNC_DEBUG;
    };
    // Calcular al cargar
    __DBG = !!(import.meta?.env?.DEV) && !!window._SYNC_DEBUG;
    if(__DBG) console.log('[DEBUG] _SYNC_DEBUG =', window._SYNC_DEBUG);
  }
} catch { /* ignore */ }

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
  { id: "admin", nombre: "Pedro", apellidos: "Admin", celular: "", email: "admin@maya.com", username: 'admin', password: "admin123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "admin", productos: [], grupo: 'A' },
  // Nuevo admin adicional solicitado
  { id: "admin2", nombre: "Pedro", apellidos: "Admin", celular: "", email: "pedroadmin@maya.com", username: 'pedroadmin', password: "pedro123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "admin", productos: [], grupo: 'A' },
  // Renombrada Ana -> Beatriz Vargas
  { id: "v1", nombre: "Beatriz", apellidos: "vargas", celular: "", email: "ana@maya.com", username: 'ana', password: "ana123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "seller", productos: [], grupo: 'A' },
  { id: "v2", nombre: "Luisa", apellidos: "Pérez", celular: "", email: "luisa@maya.com", username: 'luisa', password: "luisa123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "seller", productos: ["MENO-60"], grupo: 'B' },
];

const seedSales = [
  { id: uid(), fecha: todayISO(), ciudad: 'LA PAZ', sku: "CVP-60", cantidad: 2, precio: 120, vendedora: "Beatriz Vargas", metodo: "Efectivo", cliente: "Cliente 1", notas: "" },
  { id: uid(), fecha: todayISO(), ciudad: 'EL ALTO', sku: "FLEX-60", cantidad: 1, precio: 110, vendedora: "Beatriz Vargas", metodo: "Yape/QR", cliente: "Cliente 2", notas: "" },
  { id: uid(), fecha: todayISO(), ciudad: 'COCHABAMBA', sku: "MENO-60", cantidad: 1, precio: 130, vendedora: "Luisa Pérez", metodo: "Transferencia", cliente: "Cliente 3", notas: "" },
];

// LocalStorage helpers
const LS_KEYS = { products: "ventas.products", users: "ventas.users", sales: "ventas.sales", session: "ventas.session", warehouseDispatches: 'ventas.wdispatch', teamMessages:'ventas.team.msgs' };
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
    username: u.username || u.email || '', // migración desde email
    password: u.password || '',
    fechaIngreso: u.fechaIngreso || todayISO(),
    sueldo: typeof u.sueldo === 'number' ? u.sueldo : Number(u.sueldo || 0),
    // Nuevo: día de pago del mes (1-31). Migramos desde fechaPago (date) si existe.
    diaPago: (() => {
      if (u.diaPago && !isNaN(Number(u.diaPago))) {
        const n = Number(u.diaPago); if(n>=1 && n<=31) return n; }
      if (u.fechaPago) { // legacy almacenaba fecha completa
        const str = String(u.fechaPago);
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { return Number(str.slice(-2)); }
        const n = Number(str); if(!isNaN(n) && n>=1 && n<=31) return n;
      }
      return Number(todayISO().slice(-2));
    })(),
    // Conservamos fechaPago legacy si alguien la usa en otra parte (no se utilizará en UI nueva)
    fechaPago: u.fechaPago || todayISO(),
    rol: u.rol || 'seller',
    productos: Array.isArray(u.productos) ? u.productos : [],
    grupo: u.grupo || ''
  };
}

export default function App() {
  // --- Supabase sync flags ---
  const [cloudReady, setCloudReady] = useState(false); // loaded initial snapshot from Supabase
  const usingCloud = !!supabase; // environment provided
  // Exponer para debug manual
  if(typeof window !== 'undefined'){ window.__SB = supabase; window.__USING_CLOUD = usingCloud; }
  useEffect(()=>{
    if(!usingCloud){
      console.warn('[reset-sync] usingCloud=false (Supabase no configurado). Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en build?');
    } else {
      console.info('[reset-sync] usingCloud=true (Supabase client activo)');
    }
  }, [usingCloud]);

  const [products, setProducts] = useState(() => loadLS(LS_KEYS.products, seedProducts));
  const [users, setUsers] = useState(() => {
    const base = loadLS(LS_KEYS.users, seedUsers)
      .map(u=> (u.id==='v1' && u.nombre==='Ana') ? { ...u, nombre:'Beatriz', apellidos:'vargas' } : u)
      .map(normalizeUser);
    // Migración: asegurar usuario pedroadmin exista aunque el LS sea antiguo
    if (!base.some(u=> u.username==='pedroadmin')) {
      base.push(normalizeUser({ id: 'admin2', nombre:'Pedro', apellidos:'Admin', username:'pedroadmin', password:'pedro123', rol:'admin', productos:[], grupo:'A', fechaIngreso: todayISO(), fechaPago: todayISO(), sueldo:0 }));
    }
    return base;
  });
  const [sales, setSales] = useState(() => {
    const loaded = loadLS(LS_KEYS.sales, seedSales).map(s=> ({ ...s, ciudad: s.ciudad || 'SIN CIUDAD', estadoEntrega: s.estadoEntrega || 'confirmado' }));
    // Asignar timestamps de confirmación a los ya confirmados que no lo tengan para poder ordenar por orden de confirmación.
    let base = Date.now() - loaded.length; // asegura orden estable.
    return loaded.map(s=> {
      let next = s;
      if((next.estadoEntrega||'confirmado')==='confirmado' && !next.confirmadoAt){
        next = { ...next, confirmadoAt: ++base };
      }
      if(next.estadoEntrega==='cancelado' && !next.canceladoAt){
        next = { ...next, canceladoAt: ++base };
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
  const [teamMessages, setTeamMessages] = useState(()=> loadLS(LS_KEYS.teamMessages, [])); // [{id, grupo, authorId, authorNombre, text, createdAt, readBy:[] }]
  // Marca temporal de usuarios recientemente editados (para evitar que la carga inicial o un pull rápido sobrescriba cambios locales antes del push)
  const pendingUserEditsRef = useRef(new Set());
  const [view, setView] = useState(()=>{
    try { return localStorage.getItem('ui.view') || 'dashboard'; } catch { return 'dashboard'; }
  }); // 'dashboard' | 'historial' | 'ventas' | 'register-sale' | 'almacen' | 'create-user' | 'products' | 'mis-numeros' | 'config'

  function navigate(next){
    if(!next || next === view) return;
    setView(next);
    try { window.location.hash = '#'+next; } catch {}
  }
  const [greeting, setGreeting] = useState(null); // { saludo, nombre, frase }
  const [greetingCloseReady, setGreetingCloseReady] = useState(false);
  // Comprobantes globales
  const [viewingReceipt, setViewingReceipt] = useState(null); // { id, data }
  const [editingReceipt, setEditingReceipt] = useState(null); // venta en edición
  const [receiptTemp, setReceiptTemp] = useState(null);
  // Snapshots de limpiezas pendientes de registrar depósito (pueden ser varias ciudades)
  const [depositSnapshots, setDepositSnapshots] = useState([]); // [{ id, city, timestamp, rows, resumen, depositAmount?, depositNote?, savedAt? }]

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
  useEffect(() => saveLS(LS_KEYS.teamMessages, teamMessages), [teamMessages]);

  // Migración: convertir IDs legacy de usuarios (ej: 'admin','v1') a UUID para evitar error 22P02 en columnas uuid
  useEffect(()=>{
    // Si todos ya parecen UUID, nada que hacer
    if(!users.some(u=> !isProbablyUUID(u.id))) return;
    const map = {}; // old -> new
    const converted = users.map(u=>{
      if(isProbablyUUID(u.id)) return u;
      const nu = (crypto?.randomUUID && crypto.randomUUID()) || uid();
      map[u.id] = nu; return { ...u, id: nu };
    });
    setUsers(converted);
    // Actualizar referencias en ventas y sesión
    if(Object.keys(map).length){
      setSales(prev => prev.map(s=> map[s.vendedoraId] ? { ...s, vendedoraId: map[s.vendedoraId] } : s));
      setSession(prev => prev && map[prev.id] ? { ...prev, id: map[prev.id] } : prev);
      try { localStorage.setItem('ventas.userIdUuidMigration','1'); } catch{}
  if(__DBG) console.log('[migracion usuarios->uuid]', map);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // Auto logout por inactividad (15 minutos) y intento de cerrar pestaña al cerrar sesión
  useEffect(()=>{
    if(!session) return; // solo cuando logueado
    let timeoutId;
    const LOGOUT_MS = 15 * 60 * 1000; // 15 minutos
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(()=>{
        try { localStorage.removeItem(LS_KEYS.session); } catch{}
        setSession(null);
        setView('dashboard');
        alert('Sesión cerrada por inactividad');
        try { window.close(); } catch {}
      }, LOGOUT_MS);
    };
    const activityEvents = ['mousemove','keydown','click','scroll','focus'];
    activityEvents.forEach(ev=> window.addEventListener(ev, resetTimer));
    resetTimer();
    return ()=> { activityEvents.forEach(ev=> window.removeEventListener(ev, resetTimer)); clearTimeout(timeoutId); };
  }, [session]);

  // Persist view when changes
  useEffect(()=>{ try { localStorage.setItem('ui.view', view); } catch {} }, [view]);

  // --- Initial pull from Supabase (one-shot) ---
  useEffect(()=>{
    if(!usingCloud || cloudReady) return;
    (async()=>{
      try {
        const [p,u,s,dp,tm,num,ds] = await Promise.all([
          fetchAll('products').catch(()=>[]),
          fetchAll('users').catch(()=>[]),
          fetchAll('sales').catch(()=>[]),
          fetchAll('dispatches').catch(()=>[]),
          fetchAll('team_messages').catch(()=>[]),
          fetchAll('numbers').catch(()=>[]),
          fetchAll('deposit_snapshots').catch(()=>[])
        ]);
        if(p.length) setProducts(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          p.forEach(r=>{ map.set(r.id,{ id:r.id, sku:r.sku, nombre:r.nombre, precio:Number(r.precio||0), costo:Number(r.costo||0), stock:Number(r.stock||0), imagenUrl:r.imagen_url, imagenId:r.imagen_id, sintetico:r.sintetico, delivery: r.delivery!=null? Number(r.delivery)||0 : null, precioPar: r.precio_par!=null? Number(r.precio_par)||0 : null }); });
          return Array.from(map.values());
        });
        if(u.length) setUsers(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          u.forEach(r=>{
            const existing = map.get(r.id);
            if(existing && pendingUserEditsRef.current.has(r.id)){
              if(window._SYNC_DEBUG) console.log('[users] skip remote overwrite (recent local edit)', r.id);
              return; // evitar sobreescritura inmediata
            }
            const mergedPassword = r.password ? r.password : (existing?.password || '');
            map.set(r.id, normalizeUser({ id:r.id, username:r.username, password: mergedPassword, nombre:r.nombre, apellidos:r.apellidos, celular:r.celular, rol:r.rol, grupo:r.grupo, fechaIngreso:r.fecha_ingreso, sueldo:Number(r.sueldo||0), diaPago:r.dia_pago }));
          });
            if(!Array.from(map.values()).some(u=>u.username==='pedroadmin')){
              map.set('admin2', normalizeUser({ id: 'admin2', nombre:'Pedro', apellidos:'Admin', username:'pedroadmin', password:'pedro123', rol:'admin', productos:[], grupo:'A', fechaIngreso: todayISO(), fechaPago: todayISO(), sueldo:0 }));
            }
          return Array.from(map.values());
        });
        if(s.length) setSales(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          s.forEach(r=>{ map.set(r.id,{ id:r.id, fecha:r.fecha, ciudad:r.ciudad, sku:r.sku, cantidad:r.cantidad, precio:Number(r.precio||0), skuExtra:r.sku_extra, cantidadExtra:r.cantidad_extra, total:r.total?Number(r.total):undefined, vendedora:r.vendedora, vendedoraId:r.vendedora_id, metodo:r.metodo, cliente:r.cliente, notas:r.notas, estadoEntrega:r.estado_entrega, gasto:Number(r.gasto||0), gastoCancelacion:Number(r.gasto_cancelacion||0), confirmadoAt:r.confirmado_at, canceladoAt:r.cancelado_at, settledAt:r.settled_at, comprobante:r.comprobante, horaEntrega:r.hora_entrega, destinoEncomienda:r.destino_encomienda, motivo:r.motivo }); });
          return Array.from(map.values());
        });
        if(dp.length) setDispatches(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          dp.forEach(r=>{ map.set(r.id,{ id:r.id, fecha:r.fecha, ciudad:r.ciudad, status:r.status, items:r.items||[] }); });
          return Array.from(map.values());
        });
        if(tm.length) setTeamMessages(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          tm.forEach(r=>{ map.set(r.id,{ id:r.id, grupo:r.grupo, authorId:r.author_id, authorNombre:r.author_nombre, text:r.text, createdAt:r.created_at, readBy:Array.isArray(r.read_by)? r.read_by:[] }); });
          return Array.from(map.values());
        });
        if(num.length) setNumbers(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          num.forEach(r=>{ map.set(r.id,{ id:r.id, sku:r.sku, email:r.email, celular:r.celular, caduca:r.caduca, createdAt:r.created_at }); });
          return Array.from(map.values());
        });
        if(ds.length) setDepositSnapshots(prev=>{
          const map=new Map(prev.map(x=>[x.id,x]));
          ds.forEach(r=>{ map.set(r.id,{ id:r.id, city:r.city, timestamp:r.timestamp, rows:r.rows, resumen:r.resumen, depositAmount:r.deposit_amount, depositNote:r.deposit_note, savedAt:r.saved_at }); });
          return Array.from(map.values());
        });
      } catch(err){ console.warn('Supabase initial load error', err); }
      finally { setCloudReady(true); }
    })();
  }, [usingCloud, cloudReady]);

  // Migrar registros locales con ids no-UUID (creados antes de habilitar Supabase) para que puedan insertarse.
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return;
    const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Sales
    setSales(prev=> prev.some(s=>!uuidRe.test(s.id)) ? prev.map(s=> uuidRe.test(s.id)? s : { ...s, id: uid() }) : prev);
    // Products (id no se referencia en otras tablas, usamos sku para relaciones)
    setProducts(prev=> prev.some(p=>!uuidRe.test(p.id)) ? prev.map(p=> uuidRe.test(p.id)? p : { ...p, id: uid() }) : prev);
    // Dispatches
    setDispatches(prev=> prev.some(d=>!uuidRe.test(d.id)) ? prev.map(d=> uuidRe.test(d.id)? d : { ...d, id: uid() }) : prev);
    // Team messages
    setTeamMessages(prev=> prev.some(m=>!uuidRe.test(m.id)) ? prev.map(m=> uuidRe.test(m.id)? m : { ...m, id: uid() }) : prev);
    // Numbers
    setNumbers(prev=> prev.some(n=>!uuidRe.test(n.id)) ? prev.map(n=> uuidRe.test(n.id)? n : { ...n, id: uid() }) : prev);
    // Deposit snapshots
    setDepositSnapshots(prev=> prev.some(s=>!uuidRe.test(s.id)) ? prev.map(s=> uuidRe.test(s.id)? s : { ...s, id: uid() }) : prev);
  }, [usingCloud, cloudReady, setSales, setProducts, setDispatches, setTeamMessages, setNumbers, setDepositSnapshots]);

  // --- Outbound sync (debounced simple) ---
  const debounceRef = useRef({});
  const suppressSyncRef = useRef(false); // evita que upserts corran durante reset masivo
  function debouncedPush(key, fn){
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, 800);
  }
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('products', async()=>{
  try { await upsert('products', products.map(p=>({ id:p.id, sku:p.sku, nombre:p.nombre, precio:p.precio, costo:p.costo, stock:p.stock, imagen_url:p.imagenUrl||null, imagen_id:p.imagenId||null, sintetico:!!p.sintetico, delivery: p.delivery!=null? Number(p.delivery)||0 : null, precio_par: p.precioPar!=null? Number(p.precioPar)||0 : null }))); } catch(e){ console.warn('sync products', e); }
  }); }, [products, usingCloud, cloudReady]);

  // Reconciliación periódica: elimina localmente productos que ya no existen en la nube (evita "resurrección")
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return;
    let stop=false; let timer;
    async function reconcile(){
      if(stop) return;
      try {
        const sb = supabase; if(!sb) return;
        const { data, error } = await sb.from('products').select('id,sku');
        if(!error && Array.isArray(data)){
          const remoteIds = new Set(data.map(r=>r.id));
          const remoteSkus = new Set(data.map(r=>r.sku));
          setProducts(prev=> prev.filter(p=> {
            // proteger productos recién creados (si ya definimos recentProductsRef global la usamos)
            try { if(recentProductsRef?.current && (recentProductsRef.current.has(p.id) || recentProductsRef.current.has(p.sku))) return true; } catch{}
            return remoteIds.has(p.id) || remoteSkus.has(p.sku);
          }));
        }
      } catch(e){ /* ignore network */ }
      finally { if(!stop) timer=setTimeout(reconcile, 8000); }
    }
    timer=setTimeout(reconcile, 6000); // primer pase después de 6s
    return ()=>{ stop=true; clearTimeout(timer); };
  }, [usingCloud, cloudReady]);

  // Realtime para products (INSERT/UPDATE/DELETE) – evita tener que recargar para ver cambios de otro dispositivo
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return; // sólo en modo nube
    try {
      if(!supabase) return;
  const mapRow = (r)=> ({ id:r.id, sku:r.sku, nombre:r.nombre, precio:r.precio, costo:r.costo, stock:r.stock, imagenUrl:r.imagen_url||null, imagenId:r.imagen_id||null, sintetico:!!r.sintetico, delivery: r.delivery!=null? Number(r.delivery)||0 : null, precioPar: r.precio_par!=null? Number(r.precio_par)||0 : null });
      const channel = supabase.channel('products_changes')
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'products' }, (payload)=>{
          const row = mapRow(payload.new||{});
          setProducts(prev=>{
            if(prev.some(p=>p.id===row.id || p.sku===row.sku)) return prev.map(p=> (p.id===row.id || p.sku===row.sku) ? { ...p, ...row } : p);
            return [...prev, row];
          });
          if(typeof __DBG!=='undefined' && __DBG) console.log('[realtime products] INSERT', row.sku);
        })
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'products' }, (payload)=>{
          const row = mapRow(payload.new||{});
            setProducts(prev=> prev.map(p=> (p.id===row.id || p.sku===row.sku) ? { ...p, ...row } : p));
          if(typeof __DBG!=='undefined' && __DBG) console.log('[realtime products] UPDATE', row.sku);
        })
        .on('postgres_changes', { event:'DELETE', schema:'public', table:'products' }, (payload)=>{
          const oldId = payload.old?.id; const oldSku = payload.old?.sku;
          if(!oldId && !oldSku) return;
          setProducts(prev=> prev.filter(p=> p.id!==oldId && p.sku!==oldSku));
          if(typeof __DBG!=='undefined' && __DBG) console.log('[realtime products] DELETE', oldSku||oldId);
        })
        .subscribe(status=>{ if(status==='SUBSCRIBED' && typeof __DBG!=='undefined' && __DBG) console.log('[realtime products] subscribed'); });
      return ()=>{ try { supabase.removeChannel(channel); } catch{} };
    } catch(e){ if(typeof __DBG!=='undefined' && __DBG) console.warn('products realtime error', e); }
  }, [usingCloud, cloudReady]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('users', async()=>{
    try {
      // Deduplicar local por username
      const seen=new Set();
      const list = users.filter(u=>{
        const uname=(u.username||'').trim().toLowerCase();
        if(!uname) return false; if(seen.has(uname)) return false; seen.add(uname); return true;
      });
      if(list.length !== users.length && window._SYNC_DEBUG){ console.warn('[sync users] eliminados duplicados locales', users.length - list.length); }
      // Usar onConflict=username para que haga UPSERT por username (evita 23505)
      const sb = supabase; if(!sb) return;
      const payload = list.map(u=>({ id:u.id, username:u.username, password:u.password, nombre:u.nombre, apellidos:u.apellidos, celular:u.celular, rol:u.rol, grupo:u.grupo, fecha_ingreso:u.fechaIngreso, sueldo:u.sueldo, dia_pago:u.diaPago }));
      // Preferir onConflict por id (PK) para evitar intento de inserción al cambiar username existente.
      const { error } = await sb.from('users').upsert(payload, { onConflict:'id' });
      if(error){
        if(error.code==='23505'){
          console.warn('[sync users] conflicto (posible username duplicado). Considerar validar antes de guardar.', error);
        } else {
          console.warn('sync users', error);
        }
      }
    } catch(e){ console.warn('sync users ex', e); }
  }); }, [users, usingCloud, cloudReady]);

  // Realtime users (para que otras pestañas reflejen cambios y evitar sobrescrituras ciegas)
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return;
    try {
      const mapRow = r=> ({ id:r.id, username:r.username, password:r.password||'', nombre:r.nombre, apellidos:r.apellidos, celular:r.celular, rol:r.rol, grupo:r.grupo, fechaIngreso:r.fecha_ingreso, sueldo:Number(r.sueldo||0), diaPago:r.dia_pago });
      const channel = supabase.channel('users_changes')
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'users' }, (payload)=>{
          const row = mapRow(payload.new||{});
          setUsers(prev=>{
            if(pendingUserEditsRef.current.has(row.id)) return prev; // no pisar edición local reciente
            if(prev.some(u=>u.id===row.id || u.username===row.username)) return prev.map(u=> (u.id===row.id || u.username===row.username)? { ...u, ...row }: u);
            return [...prev, normalizeUser(row)];
          });
        })
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'users' }, (payload)=>{
          const row = mapRow(payload.new||{});
          setUsers(prev=>{
            if(pendingUserEditsRef.current.has(row.id)) return prev; // proteger edición local
            return prev.map(u=> (u.id===row.id || u.username===row.username)? { ...u, ...row } : u);
          });
        })
        .on('postgres_changes', { event:'DELETE', schema:'public', table:'users' }, (payload)=>{
          const oldId = payload.old?.id; const oldUsername = payload.old?.username;
          setUsers(prev=> prev.filter(u=> u.id!==oldId && u.username!==oldUsername));
        })
        .subscribe();
      return ()=>{ try { supabase.removeChannel(channel); } catch{} };
    } catch(e){ console.warn('users realtime error', e); }
  }, [usingCloud, cloudReady]);

  // Reconciliación de IDs por username (si local y remoto difieren genera 23505 al intentar insertar nuevo id)
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return; // esperar fetch inicial
    let cancelled=false;
    (async()=>{
      try {
        const sb = supabase; if(!sb) return;
        const { data, error } = await sb.from('users').select('id,username');
        if(error || !Array.isArray(data)) return;
        const remoteMap = new Map(data.map(r=>[(r.username||'').toLowerCase(), r.id]));
        // Si algún usuario local tiene mismo username pero id distinto -> alinear id local al remoto
        const needFix = users.filter(u=>{
          const ru = remoteMap.get((u.username||'').toLowerCase());
          return ru && ru !== u.id;
        });
        if(!needFix.length) return;
  if(__DBG) console.log('[reconcile users] ajustando ids', needFix.map(u=>u.username));
        setUsers(prev => prev.map(u=>{
          const ru = remoteMap.get((u.username||'').toLowerCase());
          return ru && ru!==u.id ? { ...u, id: ru } : u;
        }));
        setSession(prev => { if(!prev) return prev; const ru = remoteMap.get((prev.username||'').toLowerCase()); return ru && ru!==prev.id ? { ...prev, id: ru } : prev; });
        setSales(prev => prev.map(s=>{
          if(!s.vendedoraId) return s;
            const matchUser = users.find(u=>u.id===s.vendedoraId);
            if(matchUser){
              const ru = remoteMap.get((matchUser.username||'').toLowerCase());
              return ru && ru!==s.vendedoraId ? { ...s, vendedoraId: ru } : s;
            }
          return s;
        }));
      } catch(e){ if(window._SYNC_DEBUG) console.warn('[reconcile users] ex', e); }
    })();
    return ()=>{ cancelled=true; };
  }, [usingCloud, cloudReady, users]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('sales', async()=>{
    try {
      const rows = sales.map(s=>{
        const precioNum = Number(s.precio);
        const cantidadNum = Number(s.cantidad);
        const row = {
          id: s.id,
          fecha: s.fecha || todayISO(),
            ciudad: s.ciudad || 'SIN CIUDAD',
            sku: s.sku || null,
            cantidad: (isNaN(cantidadNum) || cantidadNum<=0) ? 1 : cantidadNum,
            precio: isNaN(precioNum) ? 0 : precioNum,
            sku_extra: s.skuExtra || null,
            cantidad_extra: s.cantidadExtra!=null ? Number(s.cantidadExtra)||0 : 0,
            total: (s.total!=null && !isNaN(Number(s.total))) ? Number(s.total) : null,
            vendedora: s.vendedora || null,
            vendedora_id: (s.vendedoraId && isProbablyUUID(s.vendedoraId)) ? s.vendedoraId : null,
            metodo: s.metodo || null,
            cliente: s.cliente || null,
            notas: s.notas || null,
            estado_entrega: s.estadoEntrega || 'confirmado',
            gasto: s.gasto!=null ? Number(s.gasto)||0 : 0,
            gasto_cancelacion: s.gastoCancelacion!=null ? Number(s.gastoCancelacion)||0 : 0,
            confirmado_at: s.confirmadoAt || null,
            cancelado_at: s.canceladoAt || null,
            settled_at: s.settledAt || null,
            comprobante: s.comprobante || null,
            hora_entrega: s.horaEntrega || null,
            destino_encomienda: s.destinoEncomienda || null,
            motivo: s.motivo || null
        };
        return row;
      });
      // Detectar filas problemáticas (precio null/improper)
      const bad = rows.filter(r=> r.precio==null || isNaN(Number(r.precio)));
      if(bad.length){ console.warn('Filas con precio inválido normalizadas a 0', bad.map(b=>b.id)); }
      await upsert('sales', rows);
      window._lastSalesPushError = null;
  if(__DBG){ console.log('[SYNC sales] upsert ok', rows.length); }
    } catch(e){ console.warn('sync sales', e); window._lastSalesPushError = e; }
  }); }, [sales, usingCloud, cloudReady]);

  // Helpers de diagnóstico global
  useEffect(()=>{
    if(!usingCloud) return;
    // Mostrar URL del proyecto para comparar entre dispositivos
  try { if(__DBG && supabase) console.log('[DEBUG] Supabase URL', supabase?.restUrl||supabase?.url||''); } catch{}
    // Función para forzar push inmediato de ventas
    window._forcePushSales = async ()=>{
      if(!suppressSyncRef?.current){ /* noop guard */ }
      try {
        const sb = supabase; if(!sb) return console.warn('no supabase');
        const rows = sales.map(s=>({ id:s.id, fecha:s.fecha||todayISO(), ciudad:s.ciudad||'SIN CIUDAD', sku:s.sku||null, cantidad:Number(s.cantidad||0)||1, precio:Number(s.precio||0)||0, sku_extra:s.skuExtra||null, cantidad_extra:Number(s.cantidadExtra||0)||0, total:(s.total!=null && !isNaN(Number(s.total)))?Number(s.total):null, vendedora:s.vendedora||null, vendedora_id:(s.vendedoraId && isProbablyUUID(s.vendedoraId))? s.vendedoraId : null, metodo:s.metodo||null, cliente:s.cliente||null, notas:s.notas||null, estado_entrega:s.estadoEntrega||'confirmado', gasto:Number(s.gasto||0)||0, gasto_cancelacion:Number(s.gastoCancelacion||0)||0, confirmado_at:s.confirmadoAt||null, cancelado_at:s.canceladoAt||null, settled_at:s.settledAt||null, comprobante:s.comprobante||null, hora_entrega:s.horaEntrega||null, destino_encomienda:s.destinoEncomienda||null, motivo:s.motivo||null }));
        const { error } = await sb.from('sales').upsert(rows);
        if(error){
          console.warn('[DEBUG forcePushSales] batch error, intentando fila por fila', error);
          // fallback fila por fila para identificar cuál rompe
          for(const r of rows){
            const { error: eRow } = await sb.from('sales').upsert([r]);
            if(eRow){
              window._lastSalesPushErrorDetail = { id:r.id, error: eRow.message||String(eRow) };
              console.warn('[DEBUG forcePushSales] fallo fila', r.id, eRow);
              break;
            }
          }
        } else {
          window._lastSalesPushErrorDetail = null;
        }
        console.log('[DEBUG forcePushSales] filas', rows.length, error||'OK');
      } catch(e){ console.warn('[DEBUG forcePushSales] ex', e); window._lastSalesPushErrorDetail = { exception: e.message||String(e) }; }
    };
    // Pull manual top 5
    window._pullHeadSales = async ()=>{
      try { const { data, error } = await supabase.from('sales').select('id,fecha,ciudad,updated_at').order('updated_at',{ascending:false}).limit(5); console.log('[DEBUG head sales]', data||[], error||''); return data; } catch(e){ console.warn('[DEBUG head sales] ex', e); }
    };
    // Obtener solo IDs locales para comparar
    window._localSalesIds = ()=> sales.map(s=>s.id);
  }, [usingCloud, cloudReady, sales]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('dispatches', async()=>{
    try { await upsert('dispatches', dispatches.map(d=>({ id:d.id, fecha:d.fecha, ciudad:d.ciudad, status:d.status, items:d.items })) ); } catch(e){ console.warn('sync dispatches', e); }
  }); }, [dispatches, usingCloud, cloudReady]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('team_messages', async()=>{
    try { await upsert('team_messages', teamMessages.map(m=>({ id:m.id, grupo:m.grupo, author_id:m.authorId, author_nombre:m.authorNombre, text:m.text, created_at:m.createdAt, read_by:m.readBy })) ); } catch(e){ console.warn('sync team messages', e); }
  }); }, [teamMessages, usingCloud, cloudReady]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('numbers', async()=>{
    try { await upsert('numbers', numbers.map(n=>({ id:n.id, sku:n.sku, email:n.email, celular:n.celular, caduca:n.caduca, created_at:n.createdAt })) ); } catch(e){ console.warn('sync numbers', e); }
  }); }, [numbers, usingCloud, cloudReady]);
  useEffect(()=>{ if(!usingCloud || !cloudReady || suppressSyncRef.current) return; debouncedPush('deposit_snapshots', async()=>{
    try { await upsert('deposit_snapshots', depositSnapshots.map(d=>({ id:d.id, city:d.city, timestamp:d.timestamp, rows:d.rows, resumen:d.resumen, deposit_amount:d.depositAmount, deposit_note:d.depositNote, saved_at:d.savedAt })) ); } catch(e){ console.warn('sync deposit_snapshots', e); }
  }); }, [depositSnapshots, usingCloud, cloudReady]);

  // Poll de ventas (cada 5s) siempre trae top 200 y fusiona (evita perder filas por reloj o filtros gte)
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return; let stop=false;
    async function pull(){
      if(stop) return;
      try {
        const sb = supabase; if(!sb) return;
        const { data, error } = await sb.from('sales').select('*').order('updated_at',{ascending:false}).limit(200);
        if(!error && Array.isArray(data)){
          setSales(prev=>{
            const before = prev.length;
            const map=new Map(prev.map(x=>[x.id,x]));
            data.forEach(r=> map.set(r.id,{...map.get(r.id), ...r}));
            const merged = Array.from(map.values());
            if(window._SYNC_DEBUG){
              const newOnes = data.filter(r=> !prev.find(p=>p.id===r.id)).map(r=>r.id.slice(-6));
              if(newOnes.length) console.log('[SYNC sales poll] nuevos', newOnes);
              else console.log('[SYNC sales poll] sin cambios (prev='+before+')');
            }
            return merged;
          });
        } else if(error && window._SYNC_DEBUG){ console.warn('[SYNC sales poll] error', error); }
      } catch(e){ if(window._SYNC_DEBUG) console.warn('[SYNC sales poll] ex', e); }
      finally { if(!stop) setTimeout(pull, 5000); }
    }
    pull();
    return ()=>{ stop=true; };
  }, [usingCloud, cloudReady]);

  // Realtime sales (INSERT/UPDATE) para acelerar reflejo y cubrir direccionalidad móvil->PC
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return;
    const sb = supabase; if(!sb) return;
    const channel = sb.channel('sales_changes')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'sales' }, payload => {
        const r = payload.new; if(!r) return;
        setSales(prev=>{
          if(prev.find(s=>s.id===r.id)) return prev; // ya está (poll o propio push)
          if(__DBG) console.log('[RT sales] insert', r.id.slice(-6));
          const mapped = { id:r.id, fecha:r.fecha, ciudad:r.ciudad, sku:r.sku, cantidad:r.cantidad, precio:Number(r.precio||0), skuExtra:r.sku_extra, cantidadExtra:r.cantidad_extra, total:r.total?Number(r.total):undefined, vendedora:r.vendedora, vendedoraId:r.vendedora_id, metodo:r.metodo, cliente:r.cliente, notas:r.notas, estadoEntrega:r.estado_entrega, gasto:Number(r.gasto||0), gastoCancelacion:Number(r.gasto_cancelacion||0), confirmadoAt:r.confirmado_at, canceladoAt:r.cancelado_at, settledAt:r.settled_at, comprobante:r.comprobante, horaEntrega:r.hora_entrega, destinoEncomienda:r.destino_encomienda, motivo:r.motivo };
          return [mapped, ...prev];
        });
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'sales' }, payload => {
        const r = payload.new; if(!r) return;
        setSales(prev=> prev.map(s=> s.id===r.id ? { ...s, ciudad:r.ciudad, sku:r.sku, cantidad:r.cantidad, precio:Number(r.precio||0), skuExtra:r.sku_extra, cantidadExtra:r.cantidad_extra, total:r.total?Number(r.total):undefined, vendedora:r.vendedora, vendedoraId:r.vendedora_id, metodo:r.metodo, cliente:r.cliente, notas:r.notas, estadoEntrega:r.estado_entrega, gasto:Number(r.gasto||0), gastoCancelacion:Number(r.gasto_cancelacion||0), confirmadoAt:r.confirmado_at, canceladoAt:r.cancelado_at, settledAt:r.settled_at, comprobante:r.comprobante, horaEntrega:r.hora_entrega, destinoEncomienda:r.destino_encomienda, motivo:r.motivo } : s));
  if(__DBG) console.log('[RT sales] update', r.id.slice(-6));
      })
      .subscribe();
    return ()=>{ try { supabase.removeChannel(channel); } catch{} };
  }, [usingCloud, cloudReady]);

  // Re-migrar (id no UUID) ventas rezagadas creadas en navegadores sin crypto.randomUUID antes del cambio de uid()
  useEffect(()=>{
    if(!usingCloud || !cloudReady) return;
    const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    setSales(prev => prev.some(s=> !uuidRe.test(s.id)) ? prev.map(s=> uuidRe.test(s.id)? s : { ...s, id: uid() }) : prev);
  }, [usingCloud, cloudReady]);

  // Instrumentación para saber por qué se salta un push de ventas
  useEffect(()=>{
    if(!usingCloud) return;
    if(!window._SYNC_DEBUG) return; // activar con window._SYNC_DEBUG=true en consola
  if(suppressSyncRef.current && __DBG) console.log('[SYNC sales] skip: suppressSyncRef');
  else if(!suppressSyncRef.current && !cloudReady && __DBG) console.log('[SYNC sales] skip: !cloudReady');
  }, [sales, usingCloud, cloudReady]);

  // ---- Reset total (debe vivir aquí para acceder a suppressSyncRef) ----
  const [lastResetInfo, setLastResetInfo] = useState(null); // {before, after, ts}
  const [globalNotice, setGlobalNotice] = useState(null); // {msg, ts}
  async function handleResetAll(){
    if(!session || session.rol!== 'admin') { alert('Solo admin'); return; }
    if(!window.confirm('¿Borrar absolutamente TODA la información (ventas, historial, productos, despachos, mensajes, números, snapshots) tanto local como en la nube? Esta acción no se puede deshacer.')) return;
    suppressSyncRef.current = true;
    // Cancelar timers de sync ya programados para evitar re-upsert después del borrado
    try { Object.values(debounceRef.current).forEach(id=> clearTimeout(id)); } catch{}
  try {
  if(usingCloud){
        try {
          // Contar filas antes (diagnóstico)
          const before = {};
          const tables = ['sales','dispatches','team_messages','numbers','deposit_snapshots','products','users'];
          const sb = supabase;
          await Promise.all(tables.map(async t=>{ try { before[t] = (await fetchAll(t)).length; } catch { before[t] = 'err'; } }));
          console.log('RESET antes (conteos):', before);
          // Borrar dependientes primero
          await Promise.all([
            clearTable('sales'),
            clearTable('dispatches'),
            clearTable('team_messages'),
            clearTable('numbers'),
            clearTable('deposit_snapshots')
          ]);
          // Borrar productos y usuarios no-admin (separado para preservar al menos un admin)
          try { await clearTable('products'); } catch(e){ console.warn('clear products', e); }
          try { if(supabase) { await supabase.from('users').delete().neq('rol','admin'); } } catch(e){ console.warn('clear non-admin users', e); }
          // Insertar marca de reset global
          try {
            const sb = supabase;
            if(sb){
              const { data:resetData, error:resetErr } = await sb.from('resets').insert({}).select('created_at').single();
              if(resetErr){ console.warn('[reset-sync] error al insertar marca resets', resetErr); setGlobalNotice({ msg:'Fallo al insertar marca reset', ts:Date.now() }); }
              else { console.info('[reset-sync] marca reset insertada', resetData); }
            } else console.warn('insert reset marker: supabase undefined');
          } catch(e){ console.warn('insert reset marker', e); setGlobalNotice({ msg:'Fallo al insertar marca de reset (revisa políticas resets)', ts:Date.now() }); }
          // Contar después
            const after = {};
            await Promise.all(tables.map(async t=>{ try { after[t] = (await fetchAll(t)).length; } catch { after[t] = 'err'; } }));
            // Si todavía quedan filas inesperadas (excepto users admin), intentar segunda pasada rápida
            const leftover = Object.entries(after).filter(([tbl,count])=> typeof count==='number' && count>0 && !(tbl==='users' && count<=2));
            if(leftover.length){
              console.warn('[RESET] Quedan filas tras primer borrado, reintentando', leftover);
              try {
                await Promise.all([
                  clearTable('sales').catch(()=>{}),
                  clearTable('dispatches').catch(()=>{}),
                  clearTable('team_messages').catch(()=>{}),
                  clearTable('numbers').catch(()=>{}),
                  clearTable('deposit_snapshots').catch(()=>{}),
                  clearTable('products').catch(()=>{})
                ]);
                try { if(supabase) await supabase.from('users').delete().neq('rol','admin'); } catch{}
              } catch(e){ console.warn('[RESET] error reintento', e); }
              // Recontar
              await Promise.all(tables.map(async t=>{ try { after[t] = (await fetchAll(t)).length; } catch { } }));
            }
            console.log('RESET después (conteos):', after);
            setLastResetInfo({ before, after, ts: new Date().toISOString() });
            try { window._lastResetDiag = { before, after, ts: Date.now() }; localStorage.setItem('ventas.lastResetDiag', JSON.stringify(window._lastResetDiag)); } catch{}
        } catch(e){ console.warn('Cloud clear failed', e); }
      }
      setSales([]);
      setProducts([]);
      setUsers(prev=> prev.filter(u=> u.rol==='admin'));
      setDispatches([]);
      setNumbers([]);
      setTeamMessages([]);
      setDepositSnapshots([]);
      try {
        const prefix='ventas.'; const keep=new Set(['ventas.session']); const keys=[];
        for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith(prefix) && !keep.has(k)) keys.push(k); }
        keys.forEach(k=> localStorage.removeItem(k));
        localStorage.removeItem('ui.view');
        localStorage.removeItem('ui.cityFilter');
      } catch{}
  alert('Datos borrados local + nube (ver consola para detalles).');
  setGlobalNotice({ msg:'Reset ejecutado aquí', ts:Date.now() });
      setView('dashboard');
    } catch(e){ console.error(e); alert('Error al borrar datos'); }
  finally { setTimeout(()=>{ suppressSyncRef.current = false; }, 3000); }
  }

  // Detección de resets por Realtime (instantáneo) con fallback polling cada 2s (reactivado)
  useEffect(()=>{
    if(!usingCloud) return;
    const sb = supabase; if(!sb) return;
    let disposed=false; let lastSeen=null; const cleanupFns=[]; let missing=false;
    const LS_RESET_KEY='ventas.resets.lastSeen';
    try { const stored=localStorage.getItem(LS_RESET_KEY); if(stored) lastSeen=stored; } catch{}
    async function init(){
      try {
        const { error, data } = await sb.from('resets').select('created_at').order('created_at',{ascending:false}).limit(1);
        if(error){
          const msg=(error.message||'').toLowerCase();
          if(msg.includes('not found')||msg.includes('does not exist')||error.code==='42P01'||error.status===404){
            missing=true; if(window._SYNC_DEBUG) console.warn('[resets] tabla no existe.'); return;
          }
          if(window._SYNC_DEBUG) console.warn('[resets] error inicial', error);
        } else {
          const remoteTs = data && data[0]?.created_at;
          // Si ya lo vimos (persistido), establecer lastSeen para no disparar reset en este reload
          if(remoteTs && remoteTs===lastSeen && __DBG) console.log('[resets] último reset ya procesado previamente');
          if(remoteTs && !lastSeen){ // primera vez sin registro local -> marcarlo como visto pero NO limpiar local automáticamente
            lastSeen = remoteTs;
            try { localStorage.setItem(LS_RESET_KEY, remoteTs); } catch{}
            if(__DBG) console.log('[resets] marcando reset histórico como visto (no se borra local).');
          }
        }
      } catch(e){ if(window._SYNC_DEBUG) console.warn('[resets] excepción inicial', e); return; }
      if(disposed) return;
      if(missing){
        // Reintentar descubrir la tabla cada 5s hasta que exista
        function retry(){
          if(disposed || !missing) return;
          sb.from('resets').select('created_at').limit(1).then(({ error })=>{
            if(!error){ missing=false; console.info('[reset-sync] tabla resets ahora existe, iniciando suscripción'); start(); }
            else {
              const msg=(error.message||'').toLowerCase();
              if(msg.includes('not found')||msg.includes('does not exist')||error.code==='42P01'){
                setTimeout(retry, 5000);
              } else {
                // otro error: seguir intentando más lento
                setTimeout(retry, 8000);
              }
            }
          }).catch(()=> setTimeout(retry,5000));
        }
        setTimeout(retry, 4000);
        return;
      }
      start();
    }
    function applyRemoteReset(ts){
      if(disposed) return; if(ts && ts===lastSeen) return; lastSeen=ts; try { localStorage.setItem(LS_RESET_KEY, ts||''); } catch{}
      console.info('[reset-sync] remote reset marker', ts);
      suppressSyncRef.current=true;
      setSales([]); setProducts([]); setDispatches([]); setNumbers([]); setTeamMessages([]); setDepositSnapshots([]); setUsers(prev=>prev.filter(u=>u.rol==='admin'));
      try { const prefix='ventas.'; const keep=new Set(['ventas.session','ventas.resets.lastSeen']); const rm=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith(prefix)&&!keep.has(k)) rm.push(k);} rm.forEach(k=> localStorage.removeItem(k)); } catch{}
      setTimeout(()=>{ if(!disposed) suppressSyncRef.current=false; },2500);
      setGlobalNotice({ msg:'Otro dispositivo ejecutó un reset global', ts:Date.now() });
      alert('Borrado global detectado (otro dispositivo).');
    }
    function start(){
      console.info('[reset-sync] iniciando canal resets');
      const channel = sb.channel('resets_broadcast')
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'resets' }, payload=>{ const ts=payload.new?.created_at; console.info('[reset-sync] evento INSERT resets recibido', payload); applyRemoteReset(ts); })
        .subscribe((status)=>{ console.info('[reset-sync] estado canal resets:', status); });
      channel.on('broadcast', (ev)=>{ if(__DBG) console.log('[resets broadcast]', ev); });
      let pollTimer; async function poll(){ if(disposed) return; try { const { data } = await sb.from('resets').select('created_at').order('created_at',{ascending:false}).limit(1); const ts=data&&data[0]?.created_at; if(ts && ts!==lastSeen) applyRemoteReset(ts); } catch(e){ } finally { if(!disposed) pollTimer=setTimeout(poll,2000); } }
      poll();
      cleanupFns.push(()=>{ try{ if(pollTimer) clearTimeout(pollTimer);}catch{}; try{ sb.removeChannel(channel);}catch{} });
    }
    init();
    return ()=>{ disposed=true; cleanupFns.forEach(f=>f()); };
  }, [usingCloud]);

  // Fallback heurístico: si detectamos products locales >0 pero en nube =0 justo después de marcar un reset local insert fallido, intentar refetch y limpiar.
  useEffect(()=>{
    let cancelled=false;
    let emptyCloudStreakRef = { count:0 };
    async function check(){
      if(!usingCloud || !cloudReady) return;
      if(suppressSyncRef.current) return;
      if(products.length===0) return; // nada que hacer
      try {
        const sb=supabase; if(!sb) return;
        const { data, error } = await sb.from('products').select('id').limit(1);
        if(!error && Array.isArray(data) && data.length===0){
          emptyCloudStreakRef.count++;
        } else {
          emptyCloudStreakRef.count=0; // se encontró algo o error -> resetear
        }
        // Sólo limpiar si cloud vacío se confirma varias veces (evita borrar tras crear producto antes del primer upsert / realtime)
        if(emptyCloudStreakRef.count>=3){
          console.warn('[reset-sync] heurística (triple confirm) nube vacía, limpiando local');
          setProducts([]); setSales([]); setDispatches([]); setNumbers([]); setTeamMessages([]); setDepositSnapshots([]); setUsers(prev=>prev.filter(u=>u.rol==='admin'));
          setGlobalNotice({ msg:'Sincronizado: limpieza heurística confirmada (nube vacía)', ts:Date.now() });
        }
      } catch{}
      finally {
        if(!cancelled) setTimeout(check, 4000);
      }
    }
    const t=setTimeout(check, 6000);
    return ()=>{ cancelled=true; clearTimeout(t); };
  }, [products, usingCloud, cloudReady]);


  if (!session) return <Auth onLogin={(s)=>{ setSession(s); navigate('dashboard'); }} users={users} products={products} />;

  return (
  <div className="min-h-screen bg-[#121f27] text-neutral-100 flex">
  {globalNotice && (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#0f171e]/90 border border-neutral-700 shadow text-sm flex items-center gap-3">
      <span>{globalNotice.msg}</span>
      <button onClick={()=>setGlobalNotice(null)} className="text-xs text-[#e7922b] hover:underline">Cerrar</button>
    </div>
  )}
  {/* DebugOverlay removido para producción */}
  <Sidebar session={session} onLogout={() => { try { localStorage.removeItem(LS_KEYS.session); } catch{}; setSession(null); setView('dashboard'); }} view={view} setView={navigate} />
      {/* Barra de navegación histórica (atrás / adelante) */}
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
          teamMessages={teamMessages}
          setTeamMessages={setTeamMessages}
          depositSnapshots={depositSnapshots}
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
         onGoDeposit={()=> setView('deposit')}
       />
     )}
    {view === 'ventas' && (
  <VentasView sales={sales} setSales={setSales} products={products} session={session} dispatches={dispatches} setDispatches={setDispatches} setProducts={setProducts} setView={navigate} setDepositSnapshots={setDepositSnapshots} />
    )}
      {view === 'deposit' && session.rol==='admin' && (
  <DepositConfirmView snapshots={depositSnapshots} setSnapshots={setDepositSnapshots} products={products} setSales={setSales} onBack={()=> setView('historial')} />
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
      {view === 'products' && session.rol === 'admin' && (
  <ProductsView products={products} setProducts={setProducts} session={session} dispatches={dispatches} sales={sales} />
      )}
      {view === 'frases' && session.rol === 'admin' && (
        <FrasesView />
      )}
      {view === 'config' && (
        <ConfigView 
          session={session} 
          users={users} 
          setUsers={setUsers} 
          setSession={setSession}
          setProducts={setProducts}
          setSales={setSales}
          setDispatches={setDispatches}
          setNumbers={setNumbers}
          setTeamMessages={setTeamMessages}
          setDepositSnapshots={setDepositSnapshots}
          setView={setView}
          onResetAll={handleResetAll}
          lastResetInfo={lastResetInfo}
        />
      )}
      {view === 'mis-numeros' && (
        <MisNumerosView products={products} numbers={numbers} setNumbers={setNumbers} />
      )}
      {/* Modales globales de comprobantes */}
      <AnimatePresence>
        {viewingReceipt && (
          <Modal onClose={()=> setViewingReceipt(null)}>
            <div className="space-y-4 w-full max-w-[400px] px-1">
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
            <div className="space-y-4 w-full max-w-[400px] px-1">
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
  {/* Vista de depósito ahora es pantalla dedicada (ver view === 'deposit') */}
    </div>
  );
}

// ---- Debug Overlay (sin consola móvil) ----
function DebugOverlay({ sales, session }){
  const [remoteHead, setRemoteHead] = useState([]); // top 3
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [pushStatus, setPushStatus] = useState('');
  const [forceStatus, setForceStatus] = useState('');
  useEffect(()=>{
    let stop=false;
    async function loop(){
      if(stop) return;
      try {
        setLoading(true);
        const { data, error } = await supabase.from('sales').select('id,precio,updated_at').order('updated_at',{ascending:false}).limit(3);
        if(!stop){ if(!error && Array.isArray(data)) setRemoteHead(data); setLastFetched(new Date().toLocaleTimeString()); }
      } catch(e){ /* ignore */ }
      finally { setLoading(false); if(!stop) setTimeout(loop, 5000); }
    }
    if(window._SYNC_DEBUG) loop();
    return ()=>{ stop=true; };
  }, []);
  const localHead = sales.slice(0,3).map(s=>({ id:s.id, precio:s.precio }));
  async function pushTest(){
    try {
      setPushStatus('enviando...');
  let vId = session? session.id : null;
  if(vId && !isProbablyUUID(vId)) vId = null; // no mandamos IDs legacy
  const test = { id: uid(), fecha: todayISO(), ciudad:'TEST', sku:null, cantidad:1, precio: 4321, vendedora: session? session.nombre: 'N/A', vendedoraId: vId, metodo:'Efectivo', cliente:'Debug', notas:'debug' };
      // Insert directo sin pasar por estado para diferenciar si llega (no depende del debounce)
      const { error } = await supabase.from('sales').upsert([{ id:test.id, fecha:test.fecha, ciudad:test.ciudad, sku:test.sku, cantidad:test.cantidad, precio:test.precio, vendedora:test.vendedora, vendedora_id:test.vendedoraId, metodo:test.metodo, cliente:test.cliente, notas:test.notas, estado_entrega:'confirmado' }]);
      if(error) setPushStatus('error '+error.message);
      else { setPushStatus('OK '+test.id.slice(-6)); }
    } catch(e){ setPushStatus('excepcion '+e.message); }
  }
  return (
    <div style={{ position:'fixed', top:8, right:8, zIndex:5000, width:260 }} className="text-[10px] bg-[#0d141a]/90 border border-[#1f2d36] rounded-xl p-3 space-y-2 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#e7922b]">DEBUG</span>
        <button onClick={()=>{ window.toggleSyncDebug(false); location.reload(); }} className="text-[9px] px-2 py-0.5 bg-neutral-700 rounded">X</button>
      </div>
      <div className="space-y-1">
        <div>Local ventas: <span className="text-neutral-200 font-semibold">{sales.length}</span></div>
        <div>Local top: {localHead.map(h=> h.id.slice(-4)+'/'+h.precio).join(', ') || '—'}</div>
        <div>Remote top: {remoteHead.map(h=> h.id.slice(-4)+'/'+h.precio).join(', ') || (loading? 'cargando...' : '—')}</div>
        <div>Última consulta: {lastFetched||'—'}</div>
        <div>Push err: {window._lastSalesPushError? String(window._lastSalesPushError.message||window._lastSalesPushError): 'null'}</div>
        {window._lastResetDiag && (
          <div className="mt-1 border border-neutral-700 rounded p-1 text-[8px] max-h-28 overflow-auto">
            <div className="text-neutral-400 mb-0.5">ResetDiag:</div>
            {Object.entries(window._lastResetDiag.after||{}).map(([k,v])=> <div key={k}>{k}:{v}</div>)}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <button onClick={pushTest} className="w-full bg-[#e7922b] text-[#1a2430] font-semibold rounded py-1 text-[10px]">Venta test 4321</button>
        <div className="text-[9px] text-neutral-400">Estado: {pushStatus||'—'}</div>
        <button onClick={async()=>{ setForceStatus('forzando...'); try { await window._forcePushSales(); setForceStatus('OK'); } catch(e){ setForceStatus('error'); } }} className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold rounded py-1 text-[10px]">Force Push Ventas</button>
        <div className="text-[9px] text-neutral-400">Force: {forceStatus||'—'}</div>
      </div>
      {window._lastSalesPushErrorDetail && (
        <div className="text-[8px] text-red-400 break-words max-h-24 overflow-auto border border-red-500/30 rounded p-1">
          Err fila: {window._lastSalesPushErrorDetail.id? String(window._lastSalesPushErrorDetail.id).slice(-6):''} {window._lastSalesPushErrorDetail.error||window._lastSalesPushErrorDetail.exception}
        </div>
      )}
      <div className="text-[8px] text-neutral-500">Se oculta quitando ?debug o usando toggleSyncDebug(false)</div>
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
function ConfigView({ session, users, setUsers, setSession, setProducts, setSales, setDispatches, setNumbers, setTeamMessages, setDepositSnapshots, setView, onResetAll, lastResetInfo }) {
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
        {session?.rol==='admin' && (
          <div className="mt-8 border-t border-neutral-800 pt-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#e7922b]">Reset total</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">Elimina absolutamente todas las ventas, historial, productos, despachos, números, mensajes y snapshots de depósito de este navegador, dejando solo el usuario administrador activo.</p>
            <ResetAllButton session={session} onResetAll={onResetAll} />
            {lastResetInfo && (
              <div className="mt-3 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-[10px] leading-relaxed space-y-1">
                <div className="text-neutral-400">Último reset: <span className="text-neutral-200">{new Date(lastResetInfo.ts).toLocaleString()}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-semibold text-neutral-300 mb-1">Antes</div>
                    {Object.entries(lastResetInfo.before).map(([k,v])=> <div key={k}>{k}: <span className="text-neutral-200">{String(v)}</span></div>)}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-300 mb-1">Después</div>
                    {Object.entries(lastResetInfo.after).map(([k,v])=> <div key={k}>{k}: <span className="text-neutral-200">{String(v)}</span></div>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResetAllButton({ session, onResetAll }){
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if(!session || session.rol!=='admin') return null;
  if(!open){
    return <button onClick={()=>setOpen(true)} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm w-full">Borrar todo (Irreversible)</button>;
  }
  return (
    <div className="p-3 rounded-xl bg-red-900/20 border border-red-700 space-y-2">
      <div className="text-[11px] leading-relaxed text-red-300">Escribe BORRAR TODO y presiona Confirmar. Esto eliminará datos locales y en la nube excepto el admin.</div>
      <input autoFocus value={text} onChange={e=>setText(e.target.value.toUpperCase())} placeholder="BORRAR TODO" className="w-full bg-red-950/40 border border-red-700 rounded-lg px-3 py-2 text-sm tracking-wide" />
      <div className="flex gap-2">
        <button onClick={()=>{ setOpen(false); setText(''); }} className="flex-1 px-3 py-2 rounded-lg bg-neutral-700 text-sm">Cancelar</button>
        <button disabled={text!=='BORRAR TODO'} onClick={()=>{ if(text==='BORRAR TODO'){ setOpen(false); setText(''); onResetAll(); } }} className="flex-1 px-3 py-2 rounded-lg bg-red-600 disabled:opacity-40 text-sm font-semibold">Confirmar</button>
      </div>
    </div>
  );
}

// ---------------------- Login Form (restaurado) ----------------------
function LoginForm({ users=[], onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e){
    e.preventDefault();
    setError('');
    const uName = usuario.trim();
    const pass = password;
    if(!uName || !pass){ setError('Completa usuario y contraseña'); return; }
    setLoading(true);
    try {
      // Fallback local: buscar por nombre (case-insensitive) o email
      const lower = uName.toLowerCase();
      const user = users.find(u =>
        (u.username && u.username.toLowerCase()===lower) ||
        (u.nombre && u.nombre.toLowerCase()===lower) ||
        (u.email && u.email.toLowerCase()===lower)
      );
      if(!user || user.password !== pass){
        setError('Credenciales inválidas');
      } else {
        onLogin(user);
      }
    } catch(err){
      console.warn('login error', err);
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
  <label className="text-xs uppercase tracking-wide text-neutral-400">Usuario</label>
  <input autoFocus value={usuario} onChange={e=>setUsuario(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="usuario / email" />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-neutral-400">Contraseña</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="••••••" />
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
      <button disabled={loading} className="w-full px-5 py-2 rounded-xl bg-[#e7922b] disabled:opacity-40 text-[#1a2430] font-semibold text-sm">
        {loading? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}

// ---------------------- Auth (sin backticks) ----------------------
function Auth({ onLogin, users }) {
  // Vista simplificada solo para login; creación de vendedoras pasa a interfaz de admin.
  return (
  <div className="min-h-screen grid place-items-center bg-[#313841] text-[#eeeeee] p-6 w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
  <div className="bg-[#3a4750]/80 rounded-2xl p-6 shadow-xl border border-[#313841]">
          <div className="flex items-center justify-center gap-3 mb-4 text-center">
            <LogIn className="w-5 h-5" />
            <h1 className="text-xl font-semibold text-[#ea9216]">Maya Ventas</h1>
          </div>
          <LoginForm users={users} onLogin={onLogin} />
          {/* Sección de accesos demo eliminada */}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------- Forms ----------------------
// DebugOverlay removido

function Sidebar({ session, onLogout, view, setView }){
  return (
    <aside className="w-60 bg-[#0f171e] border-r border-neutral-800 p-3 flex flex-col">
      <div className="text-lg font-semibold mb-4 px-2">Maya</div>
      <nav className="flex-1 overflow-auto pr-1">
        <button onClick={() => setView('dashboard')} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition "+ (view === 'dashboard' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Home className={"w-4 h-4 "+(view==='dashboard'? 'text-[#273947]' : 'text-white')} /> Dashboard</button>
        {session.rol==='admin' && <button onClick={() => setView('historial')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'historial' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><History className={"w-4 h-4 "+(view==='historial'? 'text-[#273947]' : 'text-white')} /> Historial</button>}
        <button onClick={() => setView('ventas')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'ventas' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><CircleDollarSign className={"w-4 h-4 "+(view==='ventas'? 'text-[#273947]' : 'text-white')} /> Ventas</button>
        {session.rol === 'admin' && (
          <button onClick={() => setView('almacen')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'almacen' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='almacen'? 'text-[#273947]' : 'text-white')} /> Despacho de Productos</button>
        )}
        {session.rol === 'admin' && (
          <button onClick={() => setView('create-user')} className={"mt-1 w-full text-left flex items-center gap-2 p-2 rounded-xl transition " + (view === 'create-user' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><UserPlus className={"w-4 h-4 "+(view==='create-user'? 'text-[#273947]' : 'text-white')} /> Usuarios</button>
        )}
        <button onClick={() => setView('register-sale')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition " + (view === 'register-sale' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><ShoppingCart className={"w-4 h-4 "+(view==='register-sale'? 'text-[#273947]' : 'text-white')} /> Registrar venta</button>
        {session.rol === 'admin' && (
          <button onClick={() => setView('products')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition " + (view === 'products' ? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='products'? 'text-[#273947]' : 'text-white')} /> Productos</button>
        )}
        {session.rol === 'admin' && <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-800/60 mt-1 cursor-pointer" onClick={()=>setView('mis-numeros')}><Wallet className="w-4 h-4" /> {view==='mis-numeros' ? <span className="font-semibold text-[#ea9216]">Mis Números</span> : 'Mis Números'}</div>}
        <button onClick={()=>setView('config')} className={"flex items-center gap-2 p-2 rounded-xl w-full text-left mt-1 transition "+(view==='config'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Settings className={"w-4 h-4 "+(view==='config'? 'text-[#273947]' : 'text-white')} /> Configuración</button>
      </nav>
      <button onClick={onLogout} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-800/80 text-sm mt-2">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </aside>
  );
}

// ---------------------- Main ----------------------
function Main({ products, setProducts, sales, setSales, session, users, teamMessages, setTeamMessages, depositSnapshots }) {
  const [showSale, setShowSale] = useState(false);
  const lowStock = products.filter((p) => p.stock <= 10);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  // (Estados de depósito ahora globales en App)
  // Estado para confirmar con costo de delivery
  const [confirmingSale, setConfirmingSale] = useState(null); // id de venta a confirmar
  const [deliveryCost, setDeliveryCost] = useState('');
  // Doble confirmación cuando el costo ingresado es 0
  const [zeroCostCheck, setZeroCostCheck] = useState(null); // { id }
  // Edición / carga de comprobante (QR)
  const [editingReceipt, setEditingReceipt] = useState(null); // objeto venta
  const [receiptTemp, setReceiptTemp] = useState(null); // base64 temporal
  // Reprogramar pedido pendiente
  const [reschedulingSale, setReschedulingSale] = useState(null); // objeto venta
  const [rsFecha, setRsFecha] = useState(todayISO());
  const [rsHIni, setRsHIni] = useState('');
  const [rsMIni, setRsMIni] = useState('00');
  const [rsAmpmIni, setRsAmpmIni] = useState('AM');
  // Hora fin eliminada: ya no se maneja rango, solo hora inicio

  // Dataset para KPIs: solo ventas confirmadas. Admin: todas; vendedor: las suyas.
  const userSales = useMemo(() => {
    const confirmed = sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado');
    if(session.rol === 'admin') return confirmed;
    return confirmed.filter(s=> s.vendedora === session.nombre);
  }, [sales, session]);

  const kpis = useMemo(() => {
    const hoyISO = todayISO();
    // Alcance base para totales históricos (confirmadas) mantiene lógica previa (usuario vs admin)
    const agg = { total:0, porDia:{} };
    userSales.forEach(s=>{
      const bruto = typeof s.total === 'number' ? s.total : (
        (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)
      );
      agg.total += bruto;
      agg.porDia[s.fecha] = (agg.porDia[s.fecha]||0) + bruto;
    });
    // Para métricas "hoy" debemos replicar EXACTAMENTE la lógica de Historial (alcance de grupo para no-admin + filas sintéticas de cancelación).
    let baseSales = sales;
    if(session.rol !== 'admin'){
      const myGroup = session.grupo || (users.find(u=>u.id===session.id)?.grupo)||'';
      if(myGroup){
        const filtroGrupo = (arr)=> arr.filter(s=>{
          const vId = s.vendedoraId; if(vId){ const vu = users.find(u=>u.id===vId); return vu? vu.grupo===myGroup:false; }
          const vu = users.find(u=> (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === (s.vendedora||'').trim().toLowerCase()));
          return vu? vu.grupo===myGroup:false;
        });
        baseSales = filtroGrupo(baseSales);
      }
    }
    const confirmadasHoy = baseSales.filter(s=> s.fecha===hoyISO && ((s.estadoEntrega||'confirmado')==='confirmado' || (s.estadoEntrega==='cancelado' && s.settledAt)));
    const canceladasCostoHoy = baseSales.filter(s=> s.fecha===hoyISO && s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0)>0)
      .map(s=> ({ sinteticaCancelada:true, neto:-Number(s.gastoCancelacion||0) }));
    // Pendientes hoy no suman (neto 0) así que se omiten.
    let entregasHoy = 0;
    confirmadasHoy.forEach(s=>{
      const bruto = typeof s.total === 'number' ? s.total : (
        (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)
      );
      const gasto = Number(s.gasto||0);
      entregasHoy += (bruto - gasto);
    });
    canceladasCostoHoy.forEach(r=> { entregasHoy += r.neto; }); // valores negativos
    // Productos entregados hoy: cantidades de confirmadas hoy (excluyendo canceladas liquidadas y sintéticas)
    const productosHoy = confirmadasHoy.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado').reduce((sum,s)=>{
      return sum + Number(s.cantidad||0) + (s.skuExtra? Number(s.cantidadExtra||0):0);
    },0);
    // Por Cobrar: neto de ENTREGAS CONFIRMADAS pendientes de liquidar (sin settledAt) + costos de cancelación pendientes (negativos), excluyendo ciudad Cochabamba.
    // (Antes sumaba todo el histórico confirmado y por eso era mayor que la suma por ciudades que ves en CitySummary.)
    const porCobrarBase = sales
      .filter(s=> !s.settledAt && (s.ciudad||'').toLowerCase() !== 'cochabamba')
      .reduce((sum,s)=> {
        const estado = (s.estadoEntrega||'confirmado');
        if(estado==='confirmado') {
          const bruto = typeof s.total === 'number' ? s.total : (
            (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)
          );
            const gasto = Number(s.gasto||0);
            return sum + (bruto - gasto);
        }
        if(estado==='cancelado' && Number(s.gastoCancelacion||0) > 0) {
          return sum - Number(s.gastoCancelacion||0);
        }
        return sum;
      },0);
    // Sumar snapshots visibles en Confirmar Depósito (aún no confirmados) excluyendo Cochabamba
    const snapshotPendiente = (depositSnapshots||[])
      .filter(s=> (s.city||'').toLowerCase() !== 'cochabamba')
      .reduce((sum,s)=> sum + Number(s.resumen?.totalNeto||0), 0);
    const porCobrar = porCobrarBase + snapshotPendiente;
    const porDiaData = Object.entries(agg.porDia).sort((a,b)=> a[0].localeCompare(b[0])).map(([fecha,total])=>({fecha,total}));
    return { total: agg.total, porCobrar, entregasHoy, productosHoy, tickets: userSales.length, porDiaData };
  }, [userSales, products, sales, session, users, depositSnapshots]);

  function confirmarEntregaConCosto(id, costo){
    setSales(prev => {
      const sale = prev.find(s=>s.id===id);
      if(!sale) return prev;
      // Verificar stock central disponible antes de confirmar
      const needed = [];
      const prodPrincipal = products.find(p=>p.sku===sale.sku);
      if(prodPrincipal && !prodPrincipal.sintetico){ needed.push({ sku: sale.sku, qty: Number(sale.cantidad||0) }); }
      if(sale.skuExtra){
        const prodExtra = products.find(p=>p.sku===sale.skuExtra);
        if(prodExtra && !prodExtra.sintetico){ needed.push({ sku: sale.skuExtra, qty: Number(sale.cantidadExtra||0) }); }
      }
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
    const raw = (deliveryCost||'').trim();
    if(raw === ''){
      // Interpretar vacío como 0 -> doble confirmación
      setZeroCostCheck({ id: confirmingSale });
      setConfirmingSale(null);
      setDeliveryCost(''); // mantener vacío
      return;
    }
    if(isNaN(Number(raw))) { alert('Ingresa un costo válido'); return; }
    const num = Number(raw);
    if(num === 0){
      // Abrir segunda ventana de confirmación para costo cero
      setZeroCostCheck({ id: confirmingSale });
      // Mantener el valor para posible edición posterior, pero cerramos el primer modal
      setConfirmingSale(null);
      return;
    }
    confirmarEntregaConCosto(confirmingSale, num);
    cancelarModalCosto();
  }
  const [cancelingSale, setCancelingSale] = useState(null); // id
  const [cancelDeliveryCost, setCancelDeliveryCost] = useState('');
  function solicitarCancelarEntrega(id){
    const sale = sales.find(s=>s.id===id);
    if(!sale) return;
    setCancelingSale(id);
    setCancelDeliveryCost('');
  }
  function confirmarCancelacion(e){
    e.preventDefault();
    const costo = cancelDeliveryCost.trim();
  const nowTs = Date.now();
  setSales(prev => prev.map(s=> s.id===cancelingSale ? { ...s, estadoEntrega:'cancelado', gastoCancelacion: costo? Number(costo):0, canceladoAt: nowTs } : s));
    setCancelingSale(null); setCancelDeliveryCost('');
  }
  function cerrarCancelacion(){ setCancelingSale(null); setCancelDeliveryCost(''); }

  function abrirReprogramar(s){
    setReschedulingSale(s);
    setRsFecha(s.fecha || todayISO());
    // parse horaEntrega en formato posible "H:MM AM-H:MM PM" o solo inicio
    const range = normalizeRangeTo12(s.horaEntrega||'');
    let inicio = range;
  if(range.includes('-')) { const [a] = range.split('-'); inicio = a.trim(); }
    const parse12 = part => {
      const m = part.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if(!m) return null; return { h:m[1], m:m[2], ap:m[3].toUpperCase() };
    };
    const i = parse12(inicio);
    if(i){ setRsHIni(i.h); setRsMIni(i.m); setRsAmpmIni(i.ap); } else { setRsHIni(''); setRsMIni('00'); setRsAmpmIni('AM'); }
  }

  function onAddSale(payload) {
    const { sku, cantidad, skuExtra, cantidadExtra } = payload;
    const product = products.find((p) => p.sku === sku);
    if (!product) return alert("Producto no encontrado");
    const esSintetico = !!product.sintetico;
    // Forzar cantidad 1 para sintético
    if(esSintetico && payload.cantidad !== 1){ payload.cantidad = 1; }
    // Ya no descontamos aquí. Validación opcional: que exista stock central suficiente para una futura confirmación.
    if (!esSintetico && product.stock < cantidad) return alert("Stock central insuficiente (no se puede reservar)");
    if (skuExtra && cantidadExtra) {
      const prod2 = products.find(p=>p.sku===skuExtra);
      if(!prod2) return alert('Producto adicional no existe');
      if(!prod2.sintetico && prod2.stock < cantidadExtra) return alert('Stock central insuficiente del adicional');
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
          <KPI icon={<CircleDollarSign className="w-5 h-5 text-[#f09929]" />} label="Entregas de hoy" value={currency(kpis.entregasHoy)} />
          <KPI icon={<TrendingUp className="w-5 h-5 text-[#f09929]" />} label="Por Cobrar" value={currency(kpis.porCobrar)} />
          <KPI icon={<ShoppingCart className="w-5 h-5 text-[#f09929]" />} label="Productos entregados HOY" value={kpis.productosHoy} />
  </div>
      )}

  {/* Mensajes de equipo (botón flotante) */}
  <TeamMessagesWidget session={session} users={users} teamMessages={teamMessages} setTeamMessages={setTeamMessages} />
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
  // Excluir productos sintéticos de las columnas de tablas de pendientes
  const productOrder = products.filter(p=>!p.sintetico).map(p=>p.sku);

  function TablaPendientes({rows, titulo, fechaLabel}){
          if(!rows.length) return null;
          return (
            <div className="rounded-2xl p-4 bg-[#0f171e] mb-6">
              <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-[#f09929]" /> {titulo}</h3>
    {fechaLabel ? <div className="text-[11px] text-neutral-500">{fechaLabel}</div> : <div />}
              </div>
              <div className="overflow-auto -mx-3 md:mx-0 pb-2">
                <div className="md:hidden text-[10px] text-neutral-500 px-3 pb-1">Desliza horizontalmente para ver todas las columnas →</div>
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
                            ) : (s.motivo ? <span className="text-[12px] text-[#e7922b]" title={s.motivo}>{s.motivo}</span> : null)}
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
                              <button onClick={()=>solicitarCancelarEntrega(s.id)} title="Cancelar" className="p-1 rounded-lg bg-neutral-700/60 hover:bg-neutral-700 text-neutral-200 border border-neutral-600"><X className="w-3 h-3" /></button>
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
              <div className="text-[10px] text-neutral-500">Al confirmar se descontará el stock central y la venta pasará a la ciudad. Deja vacío o ingresa 0 si no hubo costo.</div>
            </form>
          </Modal>
        )}
        {zeroCostCheck && (
          <Modal onClose={()=>{ // Volver al primer modal con costo 0 prellenado
            setConfirmingSale(zeroCostCheck.id);
            setZeroCostCheck(null);
            setDeliveryCost('0');
          }} autoWidth>
            <div className="w-full max-w-[380px] px-1 space-y-5">
              <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar costo 0</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">Has indicado <span className="font-semibold text-neutral-100">0</span> como costo de delivery. ¿Confirmas que esta entrega <span className="font-semibold">no generó ningún gasto</span> de envío?</p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>{ // volver a editar
                  setConfirmingSale(zeroCostCheck.id); setZeroCostCheck(null); setDeliveryCost('0');
                }} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
                <button onClick={()=>{ confirmarEntregaConCosto(zeroCostCheck.id, 0); setZeroCostCheck(null); setDeliveryCost(''); }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs">Sí, sin costo</button>
              </div>
              <div className="text-[10px] text-neutral-500">Esta acción marcará el delivery con costo 0. Si hubo un gasto, vuelve y edita el monto.</div>
            </div>
          </Modal>
        )}
        {cancelingSale && (
          <Modal onClose={cerrarCancelacion}>
            <form onSubmit={confirmarCancelacion} className="space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b]">Cancelar Pedido</h3>
              <div className="text-[11px] text-neutral-300 leading-relaxed">¿Este pedido generó algún costo de delivery que debamos registrar como pérdida?</div>
              <input type="number" step="0.01" value={cancelDeliveryCost} onChange={e=>setCancelDeliveryCost(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2" placeholder="0.00" />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cerrarCancelacion} className="px-3 py-2 rounded-xl bg-neutral-700 text-sm">Volver</button>
                <button className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm">Cancelar Pedido</button>
              </div>
              <div className="text-[10px] text-neutral-500">Se marcará como cancelado y se guardará el costo (si lo indicas). No se descuenta stock del central.</div>
            </form>
          </Modal>
        )}
        {editingReceipt && (
          <Modal onClose={()=>{ setEditingReceipt(null); setReceiptTemp(null); }}>
            <div className="space-y-4 w-full max-w-[400px] px-1">
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
              const horaEntrega = inicio; // fin eliminado
              setSales(prev => prev.map(x=> x.id===reschedulingSale.id ? { ...x, fecha: rsFecha, horaEntrega } : x));
              setReschedulingSale(null);
            }} className="space-y-4 w-full max-w-[400px] px-1">
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
                  {/* Hora fin eliminada */}
                </div>
                <div className="text-[10px] text-neutral-500">Se actualizará la fecha y hora del pedido pendiente.</div>
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
  if(session?.rol !== 'admin') return <div className="flex-1 p-6 text-sm text-neutral-400">No autorizado.</div>;
  const [nombre,setNombre]=useState('');
  const [apellidos,setApellidos]=useState('');
  const [celular,setCelular]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [fechaIngreso,setFechaIngreso]=useState(todayISO());
  const [sueldo,setSueldo]=useState('0');
  const [diaPago,setDiaPago]=useState(Number(todayISO().slice(-2))); // día del mes
  const [rol,setRol]=useState('seller');
  const [grupo,setGrupo]=useState('');
  const [mensaje,setMensaje]=useState('');
  const [productosAsignados,setProductosAsignados]=useState([]);
  const [editingId,setEditingId]=useState(null);
  const [editData,setEditData]=useState(null);
  const [deletingUser,setDeletingUser]=useState(null);
  const [deletingUserBusy,setDeletingUserBusy]=useState(false);
  // Registrar pagos de este mes para evitar parpadeo una vez marcado "Pagado".
  const [pagosMarcados, setPagosMarcados] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('ventas.pagados')||'{}'); } catch { return {}; }
  }); // { userId: 'YYYY-MM' }
  const [confirmEdit,setConfirmEdit]=useState(null); // { original, updated, diff }
  useEffect(()=>{ try { localStorage.setItem('ventas.pagados', JSON.stringify(pagosMarcados)); } catch {} }, [pagosMarcados]);
  const mesClave = ()=> { const d = new Date(); return d.getFullYear()+ '-' + String(d.getMonth()+1).padStart(2,'0'); };
  function marcarPagado(u){ setPagosMarcados(prev=> ({ ...prev, [u.id]: mesClave() })); }
  const [payingUser,setPayingUser]=useState(null); // usuario al que se confirma pago hoy
  function reset(){ setNombre(''); setApellidos(''); setCelular(''); setEmail(''); setPassword(''); setFechaIngreso(todayISO()); setSueldo('0'); setDiaPago(Number(todayISO().slice(-2))); setRol('seller'); setGrupo(''); setProductosAsignados([]); }
  function submit(e){ e.preventDefault(); setMensaje(''); const emailTrim=email.trim(); if(!nombre||!apellidos||!emailTrim||!password){ setMensaje('Completa todos'); return; } if(!diaPago || diaPago<1 || diaPago>31){ setMensaje('Día de pago inválido'); return; } if(users.some(u=> (u.username||'').toLowerCase()===emailTrim.toLowerCase() )){ setMensaje('Ese usuario ya existe'); return; } const nuevo=normalizeUser({ id:uid(), nombre, apellidos, celular, username: emailTrim.toLowerCase(), password, fechaIngreso, sueldo:Number(sueldo||0), diaPago:Number(diaPago), rol, productos: rol==='admin'? [] : productosAsignados, grupo: rol==='admin'? '' : grupo }); setUsers([...users, nuevo]); setTimeout(()=>{
    (async()=>{ try { const sb=supabase; if(!sb) return; const payload=[{ id:nuevo.id, username:nuevo.username, password:nuevo.password, nombre:nuevo.nombre, apellidos:nuevo.apellidos, celular:nuevo.celular, rol:nuevo.rol, grupo:nuevo.grupo, fecha_ingreso:nuevo.fechaIngreso, sueldo:nuevo.sueldo, dia_pago:nuevo.diaPago }]; const { error } = await sb.from('users').upsert(payload, { onConflict:'id' }); if(error) console.warn('[users] create upsert error', error); } catch(err){ console.warn('[users] create upsert ex', err); } })();
  }, 10); reset(); setMensaje('Usuario creado'); }
  function startEdit(u){
    const legacyDia = u.diaPago || (u.fechaPago? Number(String(u.fechaPago).slice(-2)) : Number(todayISO().slice(-2)));
    setEditingId(u.id);
    // Para compatibilidad, usar username en el campo email del formulario de edición
    setEditData({ ...u, email: u.username || u.email || '', sueldo:String(u.sueldo), diaPago: legacyDia });
  }
  function cancelEdit(){ setEditingId(null); setEditData(null); }
  function saveEdit(e){ if(e) e.preventDefault(); if(!editData.nombre||!editData.apellidos||!editData.email) return; if(!editData.diaPago || editData.diaPago<1 || editData.diaPago>31){ alert('Día de pago inválido'); return; } if(users.some(u=>u.username===editData.email && u.id!==editData.id)){ alert('Usuario ya usado'); return; }
    const updated=users.map(u=> u.id===editData.id? normalizeUser({ ...u, ...editData, grupo: editData.rol==='admin'? '' : (editData.grupo||''), username: editData.email, diaPago:Number(editData.diaPago), sueldo:Number(editData.sueldo||0), productos: editData.rol==='admin'? [] : (editData.productos||[]) }) : u);
    // Marcar edición pendiente para proteger contra overwrite remoto inmediato
    try { pendingUserEditsRef.current.add(editData.id); setTimeout(()=> pendingUserEditsRef.current.delete(editData.id), 5000); } catch {}
    setUsers(updated);
    // Push inmediato (no esperar debounce) para que el remoto refleje antes de que otro pull lo sobrescriba
    (async()=>{
      try {
        const sb = supabase; if(!sb) return;
        const row = updated.find(u=>u.id===editData.id);
        if(row){
          // Update directo por id para soportar cambio de username sin conflicto de inserción
          const updateObj = { username: row.username, password: row.password, nombre: row.nombre, apellidos: row.apellidos, celular: row.celular, rol: row.rol, grupo: row.grupo, fecha_ingreso: row.fechaIngreso, sueldo: row.sueldo, dia_pago: row.diaPago };
          const { error } = await sb.from('users').update(updateObj).eq('id', row.id);
          if(error){
            if(error.code==='23505') alert('Ese usuario ya existe en la nube. Elige otro nombre.');
            console.warn('[users] immediate update error', error);
          }
        }
      } catch(err){ console.warn('[users] immediate update ex', err); }
    })();
    setConfirmEdit(null); cancelEdit(); }
  function handleEditSubmit(e){ e.preventDefault(); if(!editData) return; if(!editData.nombre||!editData.apellidos||!editData.email) return; if(!editData.diaPago || editData.diaPago<1 || editData.diaPago>31){ alert('Día de pago inválido'); return; } if(users.some(u=>u.username===editData.email && u.id!==editData.id)){ alert('Usuario ya usado'); return; } const original = users.find(u=>u.id===editData.id); if(!original) { saveEdit(); return; } // diff simple
    const fields = ['nombre','apellidos','celular','email','password','rol','grupo','fechaIngreso','diaPago','sueldo'];
    const diff = fields.map(f=>{ const newVal = f==='email'? editData.email : editData[f]; const oldVal = f==='email'? (original.username||original.email) : (original[f]); if(String(newVal) !== String(oldVal||'')) return { campo:f, antes:String(oldVal||''), despues:String(newVal||'') }; return null; }).filter(Boolean);
    // productos
    const oldProd = (original.productos||[]).join(', ');
    const newProd = (editData.productos||[]).join(', ');
    if(oldProd !== newProd) diff.push({ campo:'productos', antes: oldProd||'—', despues: newProd||'—' });
    setConfirmEdit({ original, updated: editData, diff });
  }
  function askDelete(u){ if(u.id===session.id){ alert('No puedes eliminar tu propia sesión.'); return; } if(u.id==='admin'){ alert('No puedes eliminar el usuario administrador principal.'); return; } setDeletingUser(u); }
  async function performDelete(){
    if(!deletingUser) return; if(deletingUserBusy) return; setDeletingUserBusy(true);
    const target = deletingUser; const done = ()=>{ setDeletingUserBusy(false); setDeletingUser(null); };
    try {
      // Eliminar local inmediatamente para UX optimista
      setUsers(prev=> prev.filter(x=>x.id!==target.id));
      // Intentar borrar en la nube si hay cliente supabase
      if(window._SYNC_DEBUG) console.log('[users] delete start', target.id, target.username);
      {
        const sb = supabase; if(sb){
          // 1) Intentar por id
          let { error, data } = await sb.from('users').delete().eq('id', target.id).select('id');
          if(error){
            console.warn('[users] delete by id error', error);
          }
          let deletedCount = Array.isArray(data)? data.length : 0;
          // 2) Si no borró nada y tenemos username, intentar por username (posible desalineación de id local)
            if(deletedCount===0 && target.username){
              const { error:err2, data: data2 } = await sb.from('users').delete().eq('username', target.username).select('id');
              if(err2){ console.warn('[users] delete by username error', err2); }
              if(Array.isArray(data2) && data2.length){ deletedCount = data2.length; }
            }
          if(window._SYNC_DEBUG) console.log('[users] delete remote result', deletedCount);
          if(deletedCount===0){
            // Revertir local si no se pudo borrar remoto (para consistencia) y avisar
            setUsers(prev=> prev.some(u=>u.id===target.id)? prev : [...prev, target]);
            alert('No se pudo eliminar remotamente (0 filas). Revisa políticas RLS.');
          } else {
            // Confirmar que no se re-suba accidentalmente: no hace falta porque ya no está en users[]
          }
        }
      }
    } catch(e){
      console.warn('[users] delete ex', e);
      // Restaurar local en caso de error
      setUsers(prev=> prev.some(u=>u.id===target.id)? prev : [...prev, target]);
      alert('Error eliminando.');
    } finally { done(); }
  }
  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#f09929]" /> Usuarios</h2>
        <p className="text-sm text-neutral-400">Crear, editar y eliminar usuarios.</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="max-w-xl rounded-2xl p-5 bg-[#0f171e] border border-neutral-800">
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
              <label className="text-xs uppercase tracking-wide text-neutral-400">Celular</label>
              <input value={celular} onChange={e=>setCelular(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Ej: 71234567" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Usuario *</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="usuario" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Contraseña *</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Ingreso</label>
                <input type="date" value={fechaIngreso} onChange={e=>setFechaIngreso(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Día de Pago</label>
                <input type="number" min={1} max={31} value={diaPago} onChange={e=>setDiaPago(Number(e.target.value))} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="1-31" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Sueldo</label>
                <input type="number" step="0.01" value={sueldo} onChange={e=>setSueldo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Rol</label>
                <select value={rol} onChange={e=>{ const v=e.target.value; setRol(v); if(v==='admin') setGrupo(''); }} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
                  <option value="seller">Vendedora</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {rol==='seller' && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-neutral-400">Grupo</label>
                  <input value={grupo} onChange={e=>setGrupo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Ej: A" />
                </div>
              )}
            </div>
            {rol==='seller' && (
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Productos asignados</label>
                <div className="mt-2 max-h-40 overflow-auto border border-neutral-800 rounded-xl divide-y divide-neutral-800">
                  {products.map(p=>{
                    const checked=productosAsignados.includes(p.sku);
                    return (
                      <label key={p.sku} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-neutral-800/60">
                        <input type="checkbox" className="accent-white" checked={checked} onChange={()=> setProductosAsignados(prev=> checked? prev.filter(s=>s!==p.sku): [...prev,p.sku])} />
                        <span>{p.nombre}</span>
                      </label>
                    );
                  })}
                  {products.length===0 && <div className="px-3 py-2 text-neutral-500 text-xs">No hay productos</div>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              {mensaje && <div className={"text-sm "+(mensaje==='Usuario creado'? 'text-green-400':'text-red-400')}>{mensaje}</div>}
              <button className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl">Guardar</button>
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300">Usuarios existentes</h3>
          <div className="space-y-4 max-w-3xl">
            {users.map(u=> (
              <div key={u.id} className="rounded-xl p-4 bg-[#0f171e] border border-neutral-800">
                {editingId===u.id ? (
                  <form onSubmit={handleEditSubmit} className="grid md:grid-cols-4 gap-3 text-xs">
                    <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.nombre} onChange={e=>setEditData({...editData,nombre:e.target.value})} placeholder="Nombre" />
                    <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.apellidos} onChange={e=>setEditData({...editData,apellidos:e.target.value})} placeholder="Apellidos" />
                    <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.celular} onChange={e=>setEditData({...editData,celular:e.target.value})} placeholder="Celular" />
                    <input className="bg-neutral-800 rounded-lg px-2 py-1 md:col-span-2" value={editData.email} onChange={e=>setEditData({...editData,email:e.target.value})} placeholder="Usuario" />
                    <input type="password" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.password} onChange={e=>setEditData({...editData,password:e.target.value})} placeholder="Contraseña" />
                    <select className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.rol} onChange={e=>setEditData({...editData,rol:e.target.value})}>
                      <option value="seller">Vendedora</option>
                      <option value="admin">Admin</option>
                    </select>
                    {editData.rol==='seller' && <input className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.grupo||''} onChange={e=>setEditData({...editData,grupo:e.target.value})} placeholder="Grupo" />}
                    <input type="date" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.fechaIngreso} onChange={e=>setEditData({...editData,fechaIngreso:e.target.value})} />
                    <input type="number" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.sueldo} onChange={e=>setEditData({...editData,sueldo:e.target.value})} placeholder="Sueldo" />
                    <input type="number" min={1} max={31} className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.diaPago} onChange={e=>setEditData({...editData,diaPago:Number(e.target.value)})} placeholder="Día pago" />
                    {editData.rol==='seller' && (
                      <div className="md:col-span-4 border border-neutral-800 rounded-lg max-h-32 overflow-auto divide-y divide-neutral-800">
                        {products.map(p=>{
                          const checked=(editData.productos||[]).includes(p.sku);
                          return (
                            <label key={p.sku} className="flex items-center gap-2 px-3 py-1.5 text-[10px] cursor-pointer hover:bg-neutral-800/60">
                              <input type="checkbox" className="accent-white" checked={checked} onChange={()=> setEditData(prev=>{ const list=prev.productos||[]; return { ...prev, productos: checked? list.filter(s=>s!==p.sku): [...list,p.sku] }; })} />
                              <span>{p.sku} · {p.nombre}</span>
                            </label>
                          );
                        })}
                        {products.length===0 && <div className="px-3 py-2 text-neutral-500 text-xs">No hay productos</div>}
                      </div>
                    )}
                    <div className="flex gap-2 md:col-span-4 justify-end pt-1">
                      <button type="button" onClick={cancelEdit} className="px-3 py-1 bg-neutral-700 rounded-lg text-[11px]">Cancelar</button>
                      <button className="px-3 py-1 bg-white text-neutral-900 rounded-lg font-semibold text-[11px]">Guardar</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium flex items-center flex-wrap gap-1">
                        <span>{u.nombre} {u.apellidos}</span>
                        <span className="text-[9px] ml-1 px-2 py-0.5 rounded-full bg-neutral-700 uppercase tracking-wide">{u.rol}</span>
                        {u.grupo && <span className="text-[9px] ml-1 px-2 py-0.5 rounded-full bg-neutral-800 uppercase tracking-wide">G:{u.grupo}</span>}
                        {(() => {
                          const hoyDia = Number(todayISO().slice(-2));
                          const now = new Date();
                          const diasMes = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                          const dia = u.diaPago || Number(String(u.fechaPago||'').slice(-2));
                          if(!dia) return null;
                          let diff = dia - hoyDia; // días hasta próximo pago
                          if(diff < 0) diff = (diasMes - hoyDia) + dia;
                          const pagado = pagosMarcados[u.id] === mesClave();
                          const esHoy = diff===0;
                          // Estados:
                          // - esHoy & !pagado => rojo parpadeo
                          // - esHoy & pagado => verde
                          // - diff>7 & pagado => verde
                          // - 1<=diff<=7 => naranja (advertencia próxima) independientemente de pagado anterior
                          // - resto => sin indicador
                          if(esHoy){
                            const color = pagado ? '#16a34a' : '#dc2626';
                            const blinkClass = !pagado ? 'blink-red' : '';
                            const title = pagado ? 'Pago registrado hoy' : 'Pago HOY';
                            return <span title={title} className={"ml-1 w-2.5 h-2.5 rounded-full inline-block "+blinkClass} style={{background:color, boxShadow:`0 0 4px ${color}`}} />;
                          }
                          if(diff>=1 && diff<=7){
                            const title = diff===1 ? 'Pago en 1 día' : `Pago en ${diff} días`;
                            const color = '#f59e0b';
                            return <span title={title} className="ml-1 w-2.5 h-2.5 rounded-full inline-block" style={{background:color, boxShadow:`0 0 4px ${color}`}} />;
                          }
                          if(diff>7 && pagado){
                            const color = '#16a34a';
                            return <span title="Pago al día" className="ml-1 w-2.5 h-2.5 rounded-full inline-block" style={{background:color, boxShadow:`0 0 4px ${color}`}} />;
                          }
                          return null;
                        })()}
                        {(() => {
                          const hoyDia = Number(todayISO().slice(-2));
                          const now = new Date();
                          const diasMes = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                          const dia = u.diaPago || Number(String(u.fechaPago||'').slice(-2));
                          if(!dia) return null;
                          let diff = dia - hoyDia; if(diff < 0) diff = (diasMes - hoyDia) + dia;
                          const esHoy = diff===0; if(!esHoy) return null;
                          const yaPagadoEsteMes = pagosMarcados[u.id] === mesClave();
                          if(yaPagadoEsteMes) return null;
                          return <button type="button" onClick={()=>setPayingUser(u)} className="ml-1 px-2 py-0.5 rounded-full bg-neutral-700 hover:bg-neutral-600 text-[9px] font-medium">Pagado</button>;
                        })()}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>startEdit(u)} className="text-[11px] px-2 py-1 bg-neutral-700 rounded-lg">Editar</button>
                        <button onClick={()=>askDelete(u)} className="text-[11px] px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg">Eliminar</button>
                      </div>
                    </div>
                    <div className="text-neutral-400 text-[11px]">{u.username} · Cel: {u.celular || '—'}</div>
                    {u.rol==='seller' && <div className="text-neutral-500 text-[10px] mt-1">Productos: {(u.productos||[]).length===0 ? 'Ninguno' : u.productos.join(', ')}</div>}
                    <div className="text-neutral-500 text-[10px]">Ingreso: {toDMY(u.fechaIngreso)} · Pago: Día {u.diaPago || Number(String(u.fechaPago).slice(-2))} · Sueldo: {currency(u.sueldo||0)}</div>
                  </div>
                )}
              </div>
            ))}
            {users.length===0 && <div className="text-neutral-500 text-sm">No hay usuarios.</div>}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {deletingUser && (
          <Modal onClose={()=>setDeletingUser(null)} autoWidth>
            <div className="w-full max-w-[360px] px-1 space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><UserPlus className="w-4 h-4" /> Eliminar usuario</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">¿Eliminar a <span className="font-semibold text-neutral-100">{deletingUser.nombre} {deletingUser.apellidos}</span>? Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>setDeletingUser(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button disabled={deletingUserBusy} onClick={performDelete} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-semibold">{deletingUserBusy? 'Eliminando...' : 'Eliminar'}</button>
              </div>
            </div>
          </Modal>
        )}
        {confirmEdit && (
          <Modal onClose={()=>setConfirmEdit(null)} autoWidth>
            <div className="w-full max-w-[430px] px-1 space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Settings className="w-4 h-4" /> Confirmar cambios</h3>
              {confirmEdit.diff.length===0 ? (
                <div className="text-xs text-neutral-400">No hay cambios para guardar.</div>
              ) : (
                <div className="max-h-48 overflow-auto border border-neutral-800 rounded-lg divide-y divide-neutral-800 text-[11px] bg-neutral-900/40">
                  {confirmEdit.diff.map(d=> (
                    <div key={d.campo} className="px-3 py-2 flex flex-col gap-1">
                      <div className="font-semibold text-neutral-300 uppercase text-[10px] tracking-wide">{d.campo}</div>
                      <div className="flex flex-col gap-0.5">
                        <div className="line-through text-neutral-500 break-all">{d.antes||'—'}</div>
                        <div className="text-[#e7922b] break-all">{d.despues||'—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-neutral-500">Revisa y confirma para aplicar los cambios. Los datos originales se perderán al guardar.</div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>setConfirmEdit(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button disabled={confirmEdit.diff.length===0} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">Confirmar</button>
              </div>
            </div>
          </Modal>
        )}
        {payingUser && (
          <Modal onClose={()=>setPayingUser(null)} autoWidth>
            <div className="w-full max-w-[360px] px-1 space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> Confirmar Pago</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">¿Marcar pago de <span className="font-semibold text-neutral-100">{payingUser.nombre} {payingUser.apellidos}</span> como realizado hoy?</p>
              <div className="text-[10px] text-neutral-500">Esto mostrará un indicador verde hasta 7 días antes del próximo pago.</div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>setPayingUser(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button onClick={()=>{ marcarPagado(payingUser); setPayingUser(null); }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Confirmar</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------- Admin Users List ----------------------
// UsersListAdmin eliminado (fusionado en CreateUserAdmin)


// ---------------------- Productos ----------------------
function ProductsView({ products, setProducts, session, dispatches=[], sales=[] }) {
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [stock, setStock] = useState('');
  // imagenBase64 se mantiene sólo para compatibilidad con productos previos
  const [imagenBase64, setImagenBase64] = useState(null);
  const [imagenUrl, setImagenUrl] = useState(null); // Cloudinary secure_url
  const [imagenId, setImagenId] = useState(null); // Cloudinary public_id
  const [subiendo, setSubiendo] = useState(false);
  const [sintetico, setSintetico] = useState(false); // producto sin precio/costo/stock
  const [mensaje, setMensaje] = useState('');
  const [editingSku, setEditingSku] = useState(null);
  const [filter, setFilter] = useState('');
  const [usage, setUsage] = useState(() => estimateLocalStorageUsage());
  const [optimizing, setOptimizing] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const pendingUpdateRef = useRef(null);
  // Edición de delivery / precio por par
  const [priceEditSku, setPriceEditSku] = useState(null);
  const [priceDraftDelivery, setPriceDraftDelivery] = useState('');
  const [priceDraftPrecioPar, setPriceDraftPrecioPar] = useState('');
  const [priceConfirmOpen, setPriceConfirmOpen] = useState(false);
  const pricePendingRef = useRef(null);
  // Productos recién agregados (gracia contra reconciliación prematura)
  const recentProductsRef = useRef(new Set());

  useEffect(()=>{ setUsage(estimateLocalStorageUsage()); }, [products]);

  function resetForm() { setSku(''); setNombre(''); setStock(''); setImagenBase64(null); setImagenUrl(null); setImagenId(null); setEditingSku(null); setSintetico(false); setSubiendo(false); }

  function applyProductUpdate(data, exists){
    if (exists && editingSku) {
      setProducts(products.map(p => p.sku === editingSku ? data : p));
      setMensaje('Producto actualizado');
    } else if (exists && !editingSku) {
      setMensaje('Nombre genera código existente, intenta variar el nombre');
      return false;
    } else {
      setProducts([...products, data]);
      setMensaje('Producto agregado');
      // Protección y upsert inmediato
      try {
        recentProductsRef.current.add(data.id);
        recentProductsRef.current.add(data.sku);
        setTimeout(()=>{ recentProductsRef.current.delete(data.id); recentProductsRef.current.delete(data.sku); }, 15000);
        if(supabase){
          supabase.from('products').upsert([{
            id:data.id,
            sku:data.sku,
            nombre:data.nombre,
            stock:data.stock,
            imagen_url:data.imagenUrl||null,
            imagen_id:data.imagenId||null,
            sintetico:!!data.sintetico
          }]).then(({error})=>{ if(error) console.warn('[products] upsert inmediato error', error); });
        }
      } catch(e){ /* ignore */ }
    }
    resetForm();
    return true;
  }

  function submit(e) {
    e.preventDefault();
    setMensaje('');
    if (!nombre) { setMensaje('Nombre es obligatorio'); return; }
    let generatedSku = sku;
    if (!generatedSku) {
      generatedSku = nombre.toUpperCase().replace(/[^A-Z0-9]+/g,'-').slice(0,8) + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
    }
    const exists = products.find(p => p.sku === generatedSku);
    const data = {
      id: exists ? exists.id : uid(),
      sku: generatedSku,
      nombre: nombre.trim(),
      stock: sintetico ? 0 : Number(stock || 0),
      imagen: imagenBase64 || (exists ? exists.imagen : null),
      imagenUrl: imagenUrl || (exists ? exists.imagenUrl : null),
      imagenId: imagenId || (exists ? exists.imagenId : null),
      sintetico: sintetico ? true : undefined
    };
    if (exists && editingSku) {
      // abrir modal confirmación
      pendingUpdateRef.current = { data, exists: true };
      setConfirmUpdateOpen(true);
      return;
    }
    applyProductUpdate(data, exists);
  }

  function edit(p) {
    setEditingSku(p.sku);
    setSku(p.sku);
    setNombre(p.nombre);
    setStock(String(p.stock));
    setImagenBase64(p.imagen || null);
    setImagenUrl(p.imagenUrl || null);
    setImagenId(p.imagenId || null);
    setSintetico(!!p.sintetico);
  }
  async function remove(p) {
    if (!confirm('¿Eliminar producto ' + p.sku + '?')) return;
    const localUpdate = ()=>{
      setProducts(prev=> prev.filter(x => x.sku !== p.sku));
      if (editingSku === p.sku) resetForm();
    };
  const hasCloud = !!supabase; // no depende de cloudReady aquí para evitar ReferenceError
    if(hasCloud){
      try {
        // Intento 1: borrar por id (si existe) devolviendo filas afectadas
        let affected = 0; let lastError=null;
        if(p.id){
          const { data:del1, error:err1 } = await supabase.from('products').delete().eq('id', p.id).select('id');
          if(err1){ lastError=err1; console.warn('[products] delete por id error', err1); }
          else affected = (del1||[]).length;
        }
        // Fallback / alternativa: si no afectó nada, intentar por sku
        if(affected===0 && p.sku){
          const { data:del2, error:err2 } = await supabase.from('products').delete().eq('sku', p.sku).select('id');
            if(err2){ lastError = err2; console.warn('[products] delete por sku error', err2); }
            else affected += (del2||[]).length;
        }
        if(affected===0){
          console.warn('[products] no se borró ninguna fila (id/sku no coincidieron)', { id:p.id, sku:p.sku, lastError });
          alert('No se encontró el producto en la nube para borrar. Puede que ya no exista o haya desincronización.');
        } else {
          if(typeof __DBG!=='undefined' && __DBG) console.log('[products] eliminado remoto filas:', affected, p.sku);
          if(p.imagenId){ import('./cloudinary.js').then(m=> m.deleteProductImage?.(p.imagenId)); }
          localUpdate();
        }
      } catch(e){
        console.warn('[products] excepción delete remoto', e);
        alert('Error al borrar en la nube.');
      }
    } else {
      if(p.imagenId){ import('./cloudinary.js').then(m=> m.deleteProductImage?.(p.imagenId)); }
      localUpdate();
    }
  }

  // Mantener orden de creación: no ordenar; solo filtrar
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Nombre *</label>
                <input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="Nombre del producto" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Stock</label>
                <input disabled={sintetico} type="number" value={stock} onChange={e=>setStock(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 disabled:opacity-40" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="chkSint" type="checkbox" checked={sintetico} onChange={e=>setSintetico(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="chkSint" className="text-[11px] text-neutral-400 select-none">Producto sintético (sin precio / costo / stock)</label>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400">Imagen</label>
              <input type="file" accept="image/*" disabled={subiendo} onChange={async (e)=>{
                const file = e.target.files?.[0];
                if(!file){ setImagenBase64(null); setImagenUrl(null); setImagenId(null); return; }
                setMensaje('Procesando imagen...');
                // Pequeña compresión previa para ahorrar ancho de banda
                const compress = (file) => new Promise(res=>{
                  const img = new Image();
                  const rd = new FileReader();
                  rd.onload = ev => {
                    img.onload = () => {
                      try {
                        let { width, height } = img; const maxSide = 800;
                        if(width>maxSide||height>maxSide){
                          const scale=Math.min(maxSide/width,maxSide/height); width=Math.round(width*scale); height=Math.round(height*scale);
                        }
                        const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height; const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,width,height);
                        canvas.toBlob(b=>res(b), 'image/jpeg', 0.8);
                      } catch { res(file); }
                    };
                    if(typeof ev.target.result==='string') img.src=ev.target.result;
                  };
                  rd.readAsDataURL(file);
                });
                try {
                  setSubiendo(true);
                  const blob = await compress(file) || file;
                  // Subir a Cloudinary
                  const formFile = new File([blob], file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg', { type: 'image/jpeg' });
                  const { uploadProductImage } = await import('./cloudinary.js');
                  const up = await uploadProductImage(formFile, { folder: 'productos' });
                  setImagenUrl(up.secure_url); setImagenId(up.public_id); setImagenBase64(null);
                  setMensaje('Imagen subida');
                } catch(err){
                  // Fallback: mantener base64 local si falla firma / red
                  setMensaje('Fallo subida, usando local');
                  const reader = new FileReader();
                  reader.onload = ev => { if(typeof ev.target.result==='string') setImagenBase64(ev.target.result); };
                  reader.readAsDataURL(file);
                } finally { setSubiendo(false); }
              }} className="w-full mt-1 text-xs" />
              {(imagenUrl || imagenBase64) && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={imagenUrl || imagenBase64} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-neutral-700" />
                  <button type="button" onClick={()=>{ setImagenBase64(null); setImagenUrl(null); setImagenId(null); }} className="text-xs text-red-400 underline">Quitar</button>
                </div>
              )}
              <div className="text-[10px] text-neutral-500 mt-1">Las nuevas imágenes se suben a la nube (Cloudinary). Si falla la red se guarda local comprimida.</div>
              {subiendo && <div className="text-[10px] text-neutral-400 mt-1">Subiendo...</div>}
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
          if(!p.imagen || p.imagenUrl) return res(p); // no tocar las ya migradas a nube
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
                setProducts(products.map(p=> ({...p, imagen: null, imagenUrl: null, imagenId: null})));
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
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.sku} className="border-t border-neutral-800">
                    <td className="p-3">{(p.imagenUrl || p.imagen) ? <img src={p.imagenUrl || p.imagen} alt={p.nombre} className="w-10 h-10 object-cover rounded-md border border-neutral-700" /> : <div className="w-10 h-10 rounded-md bg-neutral-800 grid place-items-center text-[10px] text-neutral-500">N/A</div>}</td>
                    <td className="p-3">{p.nombre}</td>
                    <td className={"p-3 text-right " + (p.stock <= 5 ? 'text-red-400' : '')}>{p.stock}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>edit(p)} className="text-xs px-2 py-1 bg-neutral-700 rounded-lg">Editar</button>
                        <button onClick={()=>remove(p)} className="text-xs px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg">Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-neutral-500 text-sm">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {(() => {
        const pendientesPorSku = {}; const confirmadosPorSku = {}; const ventasConfirmadas = {};
        dispatches.forEach(d=> d.items.forEach(it=>{
          if(d.status==='pendiente') pendientesPorSku[it.sku]=(pendientesPorSku[it.sku]||0)+Number(it.cantidad||0);
          if(d.status==='confirmado') confirmadosPorSku[it.sku]=(confirmadosPorSku[it.sku]||0)+Number(it.cantidad||0);
        }));
        sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado').forEach(s=>{
          if(s.sku) ventasConfirmadas[s.sku]=(ventasConfirmadas[s.sku]||0)+Number(s.cantidad||0);
          if(s.skuExtra) ventasConfirmadas[s.skuExtra]=(ventasConfirmadas[s.skuExtra]||0)+Number(s.cantidadExtra||0);
        });
        const ciudadesPorSku={}; Object.keys(confirmadosPorSku).forEach(sku=>{ const v=confirmadosPorSku[sku]-(ventasConfirmadas[sku]||0); ciudadesPorSku[sku]=v<0?0:v; });
        // Filtrar productos visibles (no sintéticos)
        const visibles = products.filter(p=> !p.sintetico);
        // Totales sólo sobre visibles
        let totalCentral=0,totalPend=0,totalCiud=0;
        visibles.forEach(p=> {
          totalCentral += Number(p.stock||0);
          totalPend += pendientesPorSku[p.sku]||0;
          totalCiud += ciudadesPorSku[p.sku]||0;
        });
        // Calcular TOTAL POR VENDER agregado (solo visibles con precio/delivery definidos)
        const totalPorVenderNacional = visibles.reduce((acc,p)=>{
          const pend=pendientesPorSku[p.sku]||0; const city=ciudadesPorSku[p.sku]||0; const totalProd=Number(p.stock||0)+pend+city; const pares=Math.floor(totalProd/2); const delivery=Number(p.delivery||0); const precio=Number(p.precioPar||0); if(precio>0){ acc += (precio - delivery) * pares; } return acc; },0);
        return (
          <div className="mt-10 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 rounded-2xl bg-[#0f171e] border border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-[#e7922b] mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Catálogo Completo</h3>
              <div className="mb-4">
                <div className="inline-block rounded-xl bg-neutral-900/60 border border-neutral-700 px-4 py-3">
                  <div className="text-[11px] flex items-center gap-1 text-neutral-400"><CircleDollarSign className="w-3 h-3 text-[#e7922b]" /> POR VENDER NACIONAL</div>
                  <div className="text-sm font-semibold text-[#e7922b] mt-1">{currency(totalPorVenderNacional,'BOB')}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] mb-4">
                <div className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700">Central: <span className="font-semibold text-[#e7922b]">{totalCentral}</span></div>
                <div className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700">Por llegar: <span className="font-semibold text-[#e7922b]">{totalPend}</span></div>
                <div className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700">En ciudades: <span className="font-semibold text-[#e7922b]">{totalCiud}</span></div>
                <div className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700">Total: <span className="font-semibold text-[#e7922b]">{totalCentral+totalPend+totalCiud}</span></div>
              </div>
        {visibles.length===0 && <div className="text-xs text-neutral-500">No hay productos visibles (productos sintéticos ocultos).</div>}
        {visibles.length>0 && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibles.map(p=> {
                    const pend=pendientesPorSku[p.sku]||0; const city=ciudadesPorSku[p.sku]||0; const totalProd=Number(p.stock||0)+pend+city; const pares=Math.floor(totalProd/2);
                    return (
                      <div key={p.id||p.sku} className="flex flex-col gap-2 bg-neutral-800/40 border border-neutral-700/60 rounded-xl p-3 text-[11px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">{(p.imagenUrl||p.imagen)?<img src={p.imagenUrl||p.imagen} alt={p.nombre} className="w-full h-full object-cover" />:<span className="text-[9px] text-neutral-500">IMG</span>}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate flex items-center gap-2" title={p.nombre}>
                              <span className="truncate">{p.nombre}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-900/70 border border-neutral-700 text-[#e7922b] font-semibold shrink-0">TOTAL: {totalProd}</span>
                              <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-900/50 border border-neutral-700 text-neutral-300 font-medium shrink-0">PARES: {pares}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="rounded bg-neutral-900/60 px-2 py-1 text-[10px] text-neutral-400">Central<br/><span className={p.stock<=5?'text-red-400 font-semibold':'text-neutral-200'}>{p.stock}</span></div>
                          <div className="rounded bg-neutral-900/60 px-2 py-1 text-[10px] text-neutral-400">Pend.<br/><span className={pend>0?'text-yellow-400 font-semibold':'text-neutral-200'}>{pend}</span></div>
                          <div className="rounded bg-neutral-900/60 px-2 py-1 text-[10px] text-neutral-400">Ciudades<br/><span className="text-neutral-200 font-semibold">{city}</span></div>
                        </div>
                        <div className="mt-2 text-[10px] text-neutral-400 flex flex-wrap gap-4 items-center">
                          <span>Delivery: <b className="text-neutral-200">{p.delivery ?? '-'}</b></span>
                          <span>Precio/par: <b className="text-neutral-200">{p.precioPar ?? '-'}</b></span>
                          <button
                            className="ml-auto text-[10px] underline text-neutral-400 hover:text-white"
                            onClick={()=>{ setPriceEditSku(p.sku); setPriceDraftDelivery(p.delivery ?? ''); setPriceDraftPrecioPar(p.precioPar ?? ''); }}
                          >Editar</button>
                        </div>
                        {(() => { const delivery=Number(p.delivery||0); const precio=Number(p.precioPar||0); const totalPV = (precio>0)? ((precio - delivery) * pares) : 0; return (
                          <div className="mt-1 text-[10px] text-neutral-400 flex items-center justify-between">
                            <span className="uppercase tracking-wide">TOTAL POR VENDER</span>
                            <span className={totalPV>0? 'text-[#e7922b] font-semibold':'text-neutral-500'}>{totalPV.toFixed(2)}</span>
                          </div>
                        ); })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {confirmUpdateOpen && (
        <Modal onClose={()=>{ setConfirmUpdateOpen(false); pendingUpdateRef.current=null; }}>
          <div className="space-y-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar actualización</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">Se actualizará el producto <span className="font-semibold text-neutral-100">{editingSku}</span>. ¿Deseas continuar?</p>
            <div className="flex justify-end gap-2">
              <button onClick={()=>{ setConfirmUpdateOpen(false); pendingUpdateRef.current=null; }} className="px-3 py-2 rounded-lg bg-neutral-700 text-xs">Cancelar</button>
              <button onClick={()=>{ const pu = pendingUpdateRef.current; if(pu) applyProductUpdate(pu.data, pu.exists); setConfirmUpdateOpen(false); pendingUpdateRef.current=null; }} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Aplicar cambios</button>
            </div>
          </div>
        </Modal>
      )}
      {priceEditSku && (
        <Modal onClose={()=> setPriceEditSku(null)}>
          <div className="space-y-4 w-full max-w-xs">
            <h3 className="text-sm font-semibold text-[#e7922b]">Editar Delivery / Precio</h3>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Delivery</label>
                <input type="number" min="0" value={priceDraftDelivery} onChange={e=> setPriceDraftDelivery(e.target.value)} className="w-full bg-neutral-800 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Precio por par</label>
                <input type="number" min="0" step="0.01" value={priceDraftPrecioPar} onChange={e=> setPriceDraftPrecioPar(e.target.value)} className="w-full bg-neutral-800 rounded px-3 py-2" />
              </div>
              {(() => { const p=products.find(x=>x.sku===priceEditSku); if(!p) return null; const totalProd=(Number(p.stock||0)+( (dispatches.filter(d=>d.status==='pendiente').flatMap(d=>d.items).filter(i=>i.sku===p.sku).reduce((a,b)=>a+Number(b.cantidad||0),0)) ) + 0); const pares=Math.floor((Number(p.stock||0)+( (dispatches.filter(d=>d.status==='pendiente').flatMap(d=>d.items).filter(i=>i.sku===p.sku).reduce((a,b)=>a+Number(b.cantidad||0),0)) ) )/2); const delivery=Number(priceDraftDelivery||0); const precio=Number(priceDraftPrecioPar||0); const totalPV=(precio>0)? ((precio-delivery)*pares):0; return <div className="text-[10px] text-neutral-400">Previsualización TOTAL POR VENDER: <span className="text-[#e7922b] font-semibold">{totalPV.toFixed(2)}</span></div>; })()}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=> setPriceEditSku(null)} className="px-3 py-2 rounded-lg bg-neutral-700 text-xs">Cancelar</button>
              <button onClick={()=>{
                if(!priceEditSku) return; const d=priceDraftDelivery===''?undefined:Number(priceDraftDelivery); const pr=priceDraftPrecioPar===''?undefined:Number(priceDraftPrecioPar);
                if((d!=null && d<0) || (pr!=null && pr<0)) return;
                // Guardar en ref y abrir confirmación
                pricePendingRef.current = { sku: priceEditSku, delivery: d, precioPar: pr };
                setPriceEditSku(null);
                setPriceConfirmOpen(true);
              }} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
      {priceConfirmOpen && (
        <Modal onClose={()=>{ setPriceConfirmOpen(false); pricePendingRef.current=null; }}>
          <div className="space-y-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar cambios</h3>
            {(() => { const pending = pricePendingRef.current; if(!pending) return null; const prod = products.find(p=>p.sku===pending.sku); return (
              <div className="text-[12px] text-neutral-300 space-y-2">
                <div>Producto: <span className="font-semibold text-neutral-100">{prod?prod.nombre:pending.sku}</span></div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-neutral-800/60 p-2 rounded">
                    <div className="text-neutral-400">Delivery actual</div>
                    <div className="font-mono">{prod && prod.delivery!=null?prod.delivery:'-'}</div>
                  </div>
                  <div className="bg-neutral-800/60 p-2 rounded">
                    <div className="text-neutral-400">Delivery nuevo</div>
                    <div className="font-mono text-[#e7922b]">{pending.delivery!=null?pending.delivery:'-'}</div>
                  </div>
                  <div className="bg-neutral-800/60 p-2 rounded">
                    <div className="text-neutral-400">Precio actual</div>
                    <div className="font-mono">{prod && prod.precioPar!=null?prod.precioPar:'-'}</div>
                  </div>
                  <div className="bg-neutral-800/60 p-2 rounded">
                    <div className="text-neutral-400">Precio nuevo</div>
                    <div className="font-mono text-[#e7922b]">{pending.precioPar!=null?pending.precioPar:'-'}</div>
                  </div>
                </div>
              </div>
            ); })()}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=>{ setPriceConfirmOpen(false); pricePendingRef.current=null; }} className="px-3 py-2 rounded-lg bg-neutral-700 text-xs">Cancelar</button>
              <button onClick={()=>{
                const pending = pricePendingRef.current; if(!pending) return;
                setProducts(prev=> prev.map(p=> p.sku===pending.sku ? { ...p, delivery: pending.delivery, precioPar: pending.precioPar } : p));
                setPriceConfirmOpen(false); pricePendingRef.current=null;
              }} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Aplicar</button>
            </div>
          </div>
        </Modal>
      )}
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
  // Edición de despacho pendiente
  const [editId, setEditId] = useState(null);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false); // modal confirmación actualización
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

  function submit(e) {
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
    if(editId){
      // Abrir modal de confirmación; la lógica se aplica en confirmApplyEdit()
      setConfirmUpdateOpen(true);
      return;
    } else {
      const record = { id: uid(), fecha, ciudad, items, status: 'pendiente' };
      setDispatches([record, ...dispatches]);
      // Descontar stock inmediatamente (reserva)
      setProducts(prev => prev.map(p => {
        const it = items.find(i=>i.sku===p.sku);
        return it ? { ...p, stock: p.stock - it.cantidad } : p;
      }));
    }
    // Reset cantidades
    setLineItems(lineItems.map(l=>({...l,cantidad:0})));
    setEditId(null);
  // notas removido
  }

  function startEdit(d){
    // Solo permitir editar pendientes
    if(d.status==='confirmado') return;
    setEditId(d.id);
    setFecha(d.fecha);
    setCiudad(d.ciudad);
    // Cargar cantidades
    setLineItems(prev => prev.map(li => {
      const found = d.items.find(it=>it.sku===li.sku);
      return { ...li, cantidad: found? found.cantidad : 0 };
    }));
  }

  function confirmApplyEdit(){
    const items = lineItems.filter(i=>i.cantidad>0);
    const old = dispatches.find(d=> d.id===editId);
    setDispatches(prev => prev.map(d=> d.id===editId ? { ...d, fecha, ciudad, items } : d));
    if(old){
      setProducts(prev => prev.map(p => {
        const newIt = items.find(i=>i.sku===p.sku);
        const oldIt = old.items.find(i=>i.sku===p.sku);
        const newQty = newIt? newIt.cantidad : 0;
        const oldQty = oldIt? oldIt.cantidad : 0;
        const diff = newQty - oldQty; // si >0 reservamos más (restar), si <0 liberar
        return diff!==0 ? { ...p, stock: p.stock - diff } : p;
      }));
    }
    // Cerrar modal y reset de formulario
    setConfirmUpdateOpen(false);
    resetAfterSubmit();
  }

  function resetAfterSubmit(){
    setLineItems(lineItems.map(l=>({...l,cantidad:0})));
    setEditId(null);
    setFecha(todayISO());
    setCiudad(ciudades[0]);
  }

  // Excluir productos sintéticos de las columnas de inventario/despachos
  const productosColumns = products.filter(p=>!p.sintetico);
  const [fechaDesdeConf, setFechaDesdeConf] = useState('');
  const [fechaHastaConf, setFechaHastaConf] = useState('');
  const [pageConf, setPageConf] = useState(1);
  // Pendientes: no se filtran por ciudad ni fechas
  const dispatchesPendientes = dispatches.filter(d=> d.status !== 'confirmado')
    .slice().sort((a,b)=> b.fecha.localeCompare(a.fecha)); // más reciente arriba
  // Confirmados base (ordenar más reciente primero)
  const dispatchesConfirmadosBase = dispatches.filter(d=> d.status === 'confirmado')
    .slice().sort((a,b)=> b.fecha.localeCompare(a.fecha));
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
              <div className="mt-2 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
                {productosColumns.map(p=>{
                  const li = lineItems.find(l=>l.sku===p.sku) || {cantidad:0};
                  return (
                    <div key={p.sku} className="flex items-center gap-3 px-3 py-2 text-xs">
                      <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-700 shrink-0">
                        {(p.imagenUrl || p.imagen) ? <img src={p.imagenUrl || p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-[9px] text-neutral-500">IMG</span>}
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
              <div className="flex items-center gap-2">
                {editId && <button type="button" onClick={()=>{ setEditId(null); setLineItems(lineItems.map(l=>({...l,cantidad:0}))); setFecha(todayISO()); setCiudad(ciudades[0]); }} className="px-4 py-2 bg-neutral-700 text-neutral-200 font-semibold rounded-xl text-xs">Cancelar</button>}
                <button className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl">{editId? 'Actualizar' : 'Despachar'}</button>
              </div>
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
                          {(p.imagenUrl || p.imagen) ? <img src={p.imagenUrl || p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-[9px] text-neutral-500">IMG</span>}
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
                        <button onClick={()=>startEdit(d)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Editar</button>
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
                      </tr>
                    ))}
                    {dispatchesConfirmadosFiltrados.length===0 && <tr><td colSpan={productosColumns.length+2} className="p-4 text-center text-neutral-500">Sin confirmados en el rango</td></tr>}
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
      {confirmUpdateOpen && (
        <Modal onClose={()=> setConfirmUpdateOpen(false)}>
          <div className="space-y-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar actualización</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">Se actualizará el despacho pendiente y se ajustarán las reservas de stock según los nuevos valores. ¿Continuar?</p>
            <div className="flex justify-end gap-2">
              <button onClick={()=> setConfirmUpdateOpen(false)} className="px-3 py-2 rounded-lg bg-neutral-700 text-xs">Cancelar</button>
              <button onClick={confirmApplyEdit} className="px-4 py-2 rounded-lg bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Aplicar cambios</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Despachos pendientes para ciudad con opción de confirmar o cancelar
function CityPendingShipments({ city, dispatches, setDispatches, products, setProducts, session }) {
  const pendientes = dispatches.filter(d=>d.ciudad===city && d.status==='pendiente');
  const [openId, setOpenId] = useState(null); // id abierto
  const [openPos, setOpenPos] = useState(null); // posición del botón lupa
  useEffect(()=>{
    if(!openId) return;
  function handleKey(e){ if(e.key==='Escape'){ setOpenId(null); setOpenPos(null);} }
    window.addEventListener('keydown', handleKey);
    return ()=> window.removeEventListener('keydown', handleKey);
  }, [openId]);
  if(!pendientes.length) return null;
  function confirmar(d){
    // Stock ya fue descontado al crear. Solo cambiar estado.
    setDispatches(prev => prev.map(x=> x.id===d.id?{...x,status:'confirmado'}:x));
  }
  function cancelar(d){
    if(!confirm('Cancelar envío pendiente?')) return;
    // Restaurar stock reservado
    setProducts(prev => prev.map(p => {
      const it = d.items.find(i=>i.sku===p.sku);
      return it ? { ...p, stock: p.stock + it.cantidad } : p;
    }));
    setDispatches(prev => prev.filter(x=>x.id!==d.id));
  }
  return (
  <div className="rounded-2xl p-4 bg-[#0f171e]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-start gap-3">
           <div>
             <div className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-[#f09929]" /> {city}</div>
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
                <button onClick={(e)=> { if(abierto){ setOpenId(null); setOpenPos(null);} else { const rect = e.currentTarget.getBoundingClientRect(); setOpenPos(rect); setOpenId(d.id);} }} className="shrink-0 text-neutral-300 hover:text-[#e7922b] transition" title="Ver detalle">
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
              {abierto && openPos && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/50" onClick={()=>{ setOpenId(null); setOpenPos(null); }} />
                  {(() => {
                    const style = { position:'fixed', top: (openPos.bottom + 8) + 'px', left: openPos.left + 'px' };
                    return (
                      <div style={style} className="z-50 w-[92vw] sm:w-64 max-h-[60vh] overflow-auto bg-[#10161e] border border-neutral-700 rounded-xl shadow-2xl p-3 flex flex-col gap-2 animate-fade-in">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-semibold text-[#e7922b]">Por llegar – {city}</div>
                          <button onClick={()=>{ setOpenId(null); setOpenPos(null); }} className="text-[10px] px-2 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600">Cerrar</button>
                        </div>
                        <div className="space-y-2 pr-1">
                          {d.items.map(it=>{
                            const prod = products.find(p=>p.sku===it.sku);
                            return (
                              <div key={it.sku} className="flex items-center justify-between gap-4 text-[15px] leading-snug bg-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/60">
                                <span className="truncate max-w-[160px]" title={prod?prod.nombre:it.sku}>{prod?prod.nombre:it.sku}</span>
                                <span className="text-[#e7922b] font-bold">{it.cantidad}</span>
                              </div>
                            );
                          })}
                          {!d.items.length && <div className="text-[10px] text-neutral-500">Sin items</div>}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- AGREGAR: CityStock (faltaba y causaba ReferenceError en VentasView) ---
function CityStock({ city, products, sales, dispatches, setSales, session }) {
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
  // Pedidos pendientes (reservados por entregar)
  const pendientes = {};
  sales
    .filter(s=>s.ciudad===city && (s.estadoEntrega||'')==='pendiente')
    .forEach(s=>{
      if(s.sku) pendientes[s.sku] = (pendientes[s.sku]||0) + Number(s.cantidad||0);
  // Ya no contamos SKU extra como "por entregar" para evitar mostrar reservas que el usuario no ve como pedido principal.
    });
  const rows = products.filter(p=>!p.sintetico).map(p=> {
    const sent = enviados[p.sku]||0;
    const sold = vendidos[p.sku]||0;
    const pend = pendientes[p.sku]||0;
    const disp = sent - sold - pend; // disponible real considerando pendientes
    if(!sent && !sold && !pend) return null; // mostrar solo si hubo movimiento o pendiente
    return { sku: p.sku, nombre: p.nombre, enviados: sent, vendidos: sold, pendiente: pend, disponible: disp };
  }).filter(Boolean);
  if(!rows.length) return null;
  const [showRaw, setShowRaw] = useState(false);
  const btnRef = useRef(null);
  const [openedAt, setOpenedAt] = useState(null);
  // Nuevo: sku para mostrar detalle de pendientes específicos
  const [pendingDetailSku, setPendingDetailSku] = useState(null);
  function removePending(id){
    if(!session || session.rol!=='admin') return;
    if(!confirm('¿Eliminar este pedido pendiente?')) return;
    setSales(prev => prev.filter(s=> s.id!==id));
  }
  useEffect(()=>{ if(showRaw && !openedAt) setOpenedAt(new Date()); }, [showRaw, openedAt]);
  useEffect(()=>{ if(!showRaw) return; function onKey(e){ if(e.key==='Escape') setShowRaw(false); } window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey); }, [showRaw]);
  const sumEnviado = Object.values(enviados).reduce((a,b)=>a+b,0);
  return (
    <div className="rounded-2xl p-4 bg-[#0f171e] mb-6 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <button ref={btnRef} onClick={()=>{ setShowRaw(true); }} className="p-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 relative" title="Ver detalle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          <Package className="w-4 h-4 text-[#f09929]" /> Stock en {city}
        </h3>
        <div></div>
      </div>
      {showRaw && (
        <>
          {/* Backdrop */}
          <div onClick={()=>setShowRaw(false)} className="fixed inset-0 z-40 bg-black/50" />
          {(() => {
            // Posicionar bajo la lupa (fallback centrado si no existe)
            let style = {};
            if(btnRef.current){
              const rect = btnRef.current.getBoundingClientRect();
              style = { position:'fixed', top: rect.bottom + 8 + 'px', left: rect.left + 'px' };
            } else {
              style = { position:'fixed', top:'80px', left:'50%', transform:'translateX(-50%)' };
            }
            const fh = openedAt || new Date();
            const fecha = fh.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
            return (
              <div style={style} className="z-50 w-[92vw] sm:w-[420px] max-h-[70vh] overflow-auto bg-[#10161e] border border-neutral-700 rounded-xl shadow-2xl p-3 flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#e7922b]">Stock {city} {fecha}</div>
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
            );
          })()}
        </>
      )}
      <div className="flex flex-wrap gap-3">
        {rows.map(r=> (
          <div key={r.sku} className="w-[140px] rounded-xl bg-neutral-800/40 border border-neutral-700/60 px-3 py-2 flex flex-col gap-1 min-h-[70px]">
            <div className="text-[11px] font-medium leading-snug truncate" title={r.nombre}>{r.nombre}</div>
            <div className="flex items-end gap-2 mt-auto">
              <div>
                <div className={"text-2xl font-bold leading-none "+(r.disponible<0? 'text-red-400':'text-[#e7922b]')}>{r.disponible}</div>
                <div className="text-[9px] text-neutral-500 mt-0.5">Disponible</div>
              </div>
              {r.pendiente > 0 && (
                <button onClick={()=>setPendingDetailSku(r.sku)} className="text-right group cursor-pointer">
                  <div className="text-[9px] text-neutral-500 group-hover:text-neutral-300 transition">Por entregar</div>
                  <div className="text-sm font-semibold text-[#e7922b] leading-none mt-0.5">{r.pendiente}</div>
                </button>
              )}
            </div>
          </div>
        ))}
  </div>
      {pendingDetailSku && (()=>{
        const pendList = sales.filter(s=> s.ciudad===city && (s.estadoEntrega||'')==='pendiente' && s.sku===pendingDetailSku);
        const prod = products.find(p=>p.sku===pendingDetailSku);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setPendingDetailSku(null)} />
            <div className="relative z-10 w-full max-w-sm bg-[#10161e] border border-neutral-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#e7922b]">Pendientes · {prod?prod.nombre:pendingDetailSku}</div>
                <button onClick={()=>setPendingDetailSku(null)} className="text-[11px] px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600">Cerrar</button>
              </div>
              {pendList.length>0 ? (
                <div className="space-y-2 max-h-60 overflow-auto pr-1">
                  {pendList.map(p=> (
                    <div key={p.id} className="flex items-center gap-2 text-[11px] bg-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/60">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate" title={p.fecha+ ' '+ (p.horaEntrega||'')}>{toDMY(p.fecha)} {(p.horaEntrega||'')}</span>
                        {p.notas && <span className="text-[9px] text-neutral-500 truncate" title={p.notas}>{p.notas}</span>}
                      </div>
                      <span className="text-[#e7922b] font-semibold">{p.cantidad}</span>
                      {session?.rol==='admin' && (
                        <button onClick={()=>removePending(p.id)} className="ml-1 p-1 rounded bg-red-600/70 hover:bg-red-600 text-white" title="Borrar pendiente">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500">Sin pendientes (refresca la página si persiste el número).</div>
              )}
              <div className="text-[10px] text-neutral-500">Se cuentan solo pedidos con estado pendiente donde este producto es principal. {session?.rol==='admin' && 'Puedes borrar manualmente si detectas un registro fantasma.'}</div>
            </div>
          </div>
        );
      })()}
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
  if(!email) return setMsg('Usuario requerido');
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
              <label className="text-xs uppercase tracking-wide text-neutral-400">Usuario</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="usuario" />
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
                  <th className="p-2 text-left">Usuario</th>
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
function HistorialView({ sales, products, session, users=[], onOpenReceipt, onGoDeposit }) {
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  const [tableFilter, setTableFilter] = useState('all'); // all | today | week | month
  const [cityFilter, setCityFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  // Confirmadas verdaderas (para gráfico)
  const confirmedBase = sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado');
  // Base para tabla: confirmadas + canceladas liquidadas + canceladas con costo (todas) + pendientes
  let confirmadas = sales.filter(s=> (s.estadoEntrega||'confirmado')==='confirmado' || ((s.estadoEntrega==='cancelado') && s.settledAt));
  const canceladasConCosto = sales.filter(s=> s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0)
    .map(s=> ({
      ...s,
      id: s.id+':canc',
      total: 0,
      gasto: Number(s.gastoCancelacion||0),
      neto: -Number(s.gastoCancelacion||0),
      cantidad: 0,
      cantidadExtra: 0,
      sku: '',
      skuExtra: '',
      sinteticaCancelada: true,
      confirmadoAt: s.confirmadoAt || s.canceladoAt || 0
    }));
  confirmadas = [...confirmadas, ...canceladasConCosto];
  const pendientesTabla = sales.filter(s=> (s.estadoEntrega||'')==='pendiente').map(s=> ({ ...s, esPendiente:true, neto:0 }));
  let tablaVentas = [...confirmadas, ...pendientesTabla];
  if(session?.rol !== 'admin') {
    const myGroup = session.grupo || (users.find(u=>u.id===session.id)?.grupo)||'';
    if(myGroup){
      const filtroGrupo = (arr)=> arr.filter(s=>{
        const vId = s.vendedoraId; if(vId){ const vu = users.find(u=>u.id===vId); return vu? vu.grupo===myGroup:false; }
        const vu = users.find(u=> (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === (s.vendedora||'').trim().toLowerCase()));
        return vu? vu.grupo===myGroup:false;
      });
      confirmadas = filtroGrupo(confirmadas);
      tablaVentas = filtroGrupo(tablaVentas);
    }
  }

  const rows = useMemo(()=> tablaVentas
    .slice()
    .sort((a,b)=> {
      // Orden principal: momento de confirmación / cancelación (más reciente primero).
      const ta = a.confirmadoAt || a.canceladoAt || 0;
      const tb = b.confirmadoAt || b.canceladoAt || 0;
      if(tb !== ta) return tb - ta;
      // Pendientes (sin timestamp) quedarán abajo; como fallback usar fecha (desc) y luego id.
      if(a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return (b.id||'').localeCompare(a.id||'');
    })
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
    neto: s.sinteticaCancelada ? (s.neto != null ? s.neto : (total - gasto)) : (total - gasto),
        metodo:s.metodo,
        celular:s.celular||'',
  comprobante:s.comprobante,
  destinoEncomienda: s.destinoEncomienda,
  motivo: s.motivo,
  // conservar campos originales para totales por producto
  sku: s.sku,
  cantidad: s.cantidad,
  skuExtra: s.skuExtra,
 cantidadExtra: s.cantidadExtra,
 sinteticaCancelada: !!s.sinteticaCancelada,
 gastoCancelacion: s.gastoCancelacion,
 esPendiente: !!s.esPendiente,
 estadoEntrega: s.estadoEntrega || (s.esPendiente?'pendiente':'confirmado')
      };
  }), [tablaVentas, products]);

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-[#f09929]" /> Historial de Ventas
            </h2>
            <p className="text-sm text-neutral-400">Ventas confirmadas y análisis temporal.</p>
          </div>
          {session?.rol==='admin' && (
            <div className="flex gap-2">
              <button onClick={onGoDeposit} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold shadow hover:brightness-110 active:scale-[0.98]">Confirmar depósito</button>
            </div>
          )}
        </div>
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
          <ChartVentas period={period} sales={confirmadas} products={products} />
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
        <div className="overflow-auto -mx-3 md:mx-0 pb-2">
          <div className="md:hidden text-[10px] text-neutral-500 px-3 pb-1">Desliza horizontalmente para ver la tabla →</div>
        {(() => {
          // Excluir productos sintéticos de las columnas de la tabla de ventas confirmadas
          const productOrder = products.filter(p=>!p.sintetico).map(p=>p.sku);
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
                  const cantidades = productOrder.map(sku=>{ if(r.sinteticaCancelada) return 0; let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                  return (
                    <tr key={r.id} className={"border-t border-neutral-800 "+(r.sinteticaCancelada? 'bg-red-900/10':'')}>
                      <td className="p-2">{toDMY(r.fecha)}</td>
                      <td className="p-2">{r.hora}</td>
                      <td className="p-2">{r.ciudad}</td>
                      <td className="p-2 text-left max-w-[160px]">{r.metodo==='Encomienda'? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>: (r.motivo? <span className="text-[12px] text-[#e7922b]" title={r.motivo}>{r.motivo}</span> : '')}</td>
                      <td className="p-2 whitespace-nowrap">{firstName(r.vendedor)}</td>
                      {cantidades.map((c,i)=> <td key={i} className="p-2 text-center">{c||''}</td>)}
                      <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400':'')}>{currency(r.total)}</td>
                      <td className={"p-2 text-right "+(r.sinteticaCancelada? 'text-red-400':'')}>{r.gasto?currency(r.gasto):''}</td>
                      <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400':'')}>{currency(r.neto)}</td>
                      <td className="p-2 text-center">{r.celular||''}</td>
                      <td className="p-2 text-center">
                        {r.sinteticaCancelada ? (
                          <span className="text-[10px] font-semibold text-red-400">Cancelado</span>
                        ) : (
                          r.comprobante && (
                            <button
                              onClick={()=>{ const sale = confirmadas.find(s=>s.id===r.id); if(sale && onOpenReceipt) onOpenReceipt(sale); }}
                              className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1d2a34] hover:bg-[#253341] border border-[#e7922b]/40"
                              title="Ver comprobante"
                            >
                              <Search className="w-3 h-3 text-[#e7922b]" />
                            </button>
                          )
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


// Widget flotante: botón + modal
function TeamMessagesWidget({ session, users, teamMessages, setTeamMessages }) {
  const myGroup = (users.find(u=>u.id===session.id)?.grupo) || session.grupo || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  // Para admin: selección de grupo a visualizar y a enviar
  const isAdmin = session?.rol === 'admin';
  const allGroups = useMemo(()=> Array.from(new Set(users.map(u=>u.grupo).filter(Boolean))).sort(), [users]);
  const [viewGroup, setViewGroup] = useState(isAdmin ? '__ALL__' : myGroup);
  const [sendGroup, setSendGroup] = useState(isAdmin ? '' : myGroup);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  if(!isAdmin && !myGroup) return null; // vendedora sin grupo -> ocultar
  // Mensajes visibles
  const visibleMsgs = (isAdmin && viewGroup==='__ALL__') ? teamMessages.slice() : teamMessages.filter(m=> m.grupo === (isAdmin? viewGroup : myGroup));
  const msgs = visibleMsgs.sort((a,b)=> b.createdAt - a.createdAt);
  // Unread (admin cuenta sobre TODOS los mensajes)
  const unread = (isAdmin ? teamMessages : msgs).filter(m=> m.authorId!==session.id && !m.readBy.includes(session.id)).length;
  function send(){
    const targetGroup = isAdmin ? sendGroup : myGroup;
    const t = text.trim(); if(!t) return; if(!targetGroup){ alert('Selecciona un grupo'); return; }
    if(t.length>500){ alert('Máx 500 caracteres'); return; }
    const authorNombre = (session.nombre||'') + ' ' + (session.apellidos||'');
    const msg = { id: uid(), grupo: targetGroup, authorId: session.id, authorNombre: authorNombre.trim(), text:t, createdAt: Date.now(), readBy: [session.id] };
    setTeamMessages(prev=> [msg, ...prev]);
    setText('');
    if(isAdmin && viewGroup!=='__ALL__' && targetGroup!==viewGroup){
      // Si admin envió a otro grupo distinto al actualmente filtrado (no ALL), podríamos cambiar filtro; lo mantenemos.
    }
  }
  function markRead(id){ setTeamMessages(prev=> prev.map(m=> m.id===id && !m.readBy.includes(session.id)? { ...m, readBy:[...m.readBy, session.id] }: m)); }
  function remove(id){ setTeamMessages(prev=> prev.filter(m=>m.id!==id)); if(confirmDeleteId===id) setConfirmDeleteId(null); }
  useEffect(()=>{ setConfirmDeleteId(null); }, [viewGroup, open]);
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#e7922b] text-[#1a2430] font-bold shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95">
        <MessageSquare className="w-6 h-6" />
        {unread>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <Modal onClose={()=>setOpen(false)}>
            <div className="w-[380px] max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#f09929]" /> Mensajes de Equipo</h3>
                {!isAdmin && <div className="text-[10px] text-neutral-500">Grupo: {myGroup}</div>}
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-2 mb-3 text-[11px]">
                  <div className="flex items-center gap-2">
                    <label className="text-neutral-400">Ver:</label>
                    <select value={viewGroup} onChange={e=>setViewGroup(e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1 flex-1">
                      <option value="__ALL__">Todos los grupos</option>
                      {allGroups.map(g=> <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-neutral-400">Enviar a:</label>
                    <select value={sendGroup} onChange={e=>setSendGroup(e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1 flex-1">
                      <option value="">(Seleccionar)</option>
                      {allGroups.map(g=> <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 mb-4">
                <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={isAdmin? 'Nota para el grupo seleccionado' : 'Escribe una nota'} className="flex-1 bg-neutral-800 rounded-xl p-2 text-sm h-16 resize-none" />
                <button onClick={send} className="h-16 px-4 rounded-xl bg-[#e7922b] text-[#1a2430] text-sm font-semibold disabled:opacity-40" disabled={!text.trim() || (isAdmin && !sendGroup)}>Enviar</button>
              </div>
              {!msgs.length && <div className="text-xs text-neutral-500">Sin mensajes.</div>}
              <ul className="space-y-3 overflow-auto pr-1 flex-1">
                {msgs.map(m=>{
                  const isMine = m.authorId===session.id;
                  const read = m.readBy.includes(session.id);
                  return (
                    <li key={m.id} className="p-3 rounded-xl border border-neutral-700/60 bg-neutral-900/40 text-sm group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-neutral-400 mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-neutral-300">{isMine? 'Yo' : (m.authorNombre||'Alguien')}</span>
                            {isAdmin && <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-700/60 border border-neutral-600/40">{m.grupo}</span>}
                            <span className="text-[10px] whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</span>
                            {read && !isMine && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/40">Leído</span>}
                          </div>
                          <div className="whitespace-pre-wrap leading-snug break-words">{m.text}</div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 items-end">
                          {!isMine && !read && (
                            <button onClick={()=>markRead(m.id)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Leído</button>
                          )}
                          {(isMine || read) && (
                            <div className="relative">
                              {confirmDeleteId!==m.id && (
                                <button onClick={()=>setConfirmDeleteId(m.id)} className="px-2 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-[10px]">Eliminar</button>
                              )}
                              {confirmDeleteId===m.id && (
                                <div className="absolute top-0 right-0 mt-6 w-40 z-50 p-2 rounded-lg bg-neutral-800 border border-neutral-600 shadow-lg animate-fade-in text-[10px]">
                                  <div className="mb-2 leading-snug">¿Eliminar mensaje?</div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={()=>setConfirmDeleteId(null)} className="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600">No</button>
                                    <button onClick={()=>remove(m.id)} className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 font-semibold">Sí</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}

function ChartVentas({ period, sales, products=[] }) {
  // Tick personalizado para semana: muestra fecha y debajo el día (LUNES...)
  const WeekTick = (props)=>{
    const { x, y, payload } = props;
    const dateStr = payload?.value || '';
    let dayName = '';
    if(/\d{4}-\d{2}-\d{2}/.test(dateStr)){
      const d = new Date(dateStr+"T00:00:00");
      const dias = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];
      dayName = dias[d.getDay()] || '';
    }
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={10} textAnchor="middle" fill="#f09929" fontSize={15}>{dateStr}</text>
        <text dy={25} textAnchor="middle" fill="#f09929" fontSize={15}>{dayName}</text>
      </g>
    );
  };
  // Agrupar por periodo: usamos NETO (total - gasto delivery) y excluimos cancelaciones sintéticas
  const data = useMemo(()=>{
    if(!sales.length) return [];
    const today = new Date();
    function fmt(d){ return d.toISOString().slice(0,10); }

    function netoVenta(s){
      if(s.sinteticaCancelada) return 0; // no graficar pérdidas por cancelación
      // bruto preferente: campo total si existe; si no, reconstruir con precios catálogo
      let bruto;
      if(typeof s.total === 'number') bruto = Number(s.total||0);
      else {
        const p1 = products.find(p=>p.sku===s.sku);
        const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra):null;
        bruto = (Number(p1?.precio ?? s.precio ?? 0) * Number(s.cantidad||0)) + (s.skuExtra ? Number(p2?.precio||0) * Number(s.cantidadExtra||0) : 0);
      }
      const gasto = Number(s.gasto||0);
      return bruto - gasto; // neto después de delivery
    }

    if(period==='week'){
      const days = [...Array(7)].map((_,i)=>{
        const d = new Date(today);
        d.setDate(d.getDate() - (6-i));
        return fmt(d);
      });
      const map = Object.fromEntries(days.map(d=>[d,0]));
      sales.forEach(s=>{ if(map[s.fecha] != null) map[s.fecha] += netoVenta(s); });
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
      sales.forEach(s=>{ if(map[s.fecha] != null) map[s.fecha] += netoVenta(s); });
      return Object.keys(map).map(k=>({ label: k.slice(8,10), total: map[k] }));
    }
    // quarter: ahora mostrar últimas 12 semanas (cada barra = semana, etiqueta = inicio de semana)
    const weeks = [];
    for(let i=11;i>=0;i--){
      const end = new Date(today);
      end.setDate(end.getDate() - (i*7)); // fin semana incluido
      const start = new Date(end);
      start.setDate(start.getDate()-6); // 7 días
      weeks.push({ startISO: fmt(start), endISO: fmt(end), total:0 });
    }
    sales.forEach(s=>{
      for(const w of weeks){
        if(s.fecha >= w.startISO && s.fecha <= w.endISO){
          w.total += netoVenta(s);
          break;
        }
      }
    });
    return weeks.map(w=>({ label: w.startISO.slice(5), total: w.total }));
  }, [period, sales, products]);

  // Escalado personalizado para semana y mes: incrementos de 250
  let yAxisProps = { stroke:'#f09929', tickLine:false, axisLine:false };
  if(['week','month'].includes(period) && data.length){
    const maxVal = Math.max(...data.map(d=>d.total||0));
    const step = 250;
    const upper = Math.max(step, Math.ceil(maxVal/step)*step);
    const ticks = [];
    for(let v=0; v<=upper; v+=step) ticks.push(v);
    yAxisProps = { ...yAxisProps, domain:[0, upper], ticks, tickFormatter:(v)=>v };
  }
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f09929" opacity={0.35} />
          <XAxis dataKey="label" stroke="#f09929" tickLine={false} axisLine={false}
            tick={period==='week'? <WeekTick /> : undefined}
          />
          <YAxis {...yAxisProps} />
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
  const [mIni, setMIni] = useState('00');
  const [ampmIni, setAmpmIni] = useState('AM');
  // Eliminados estados de hora fin y duplicados para reprogramación.
  const [skuExtra, setSkuExtra] = useState('');
  const [cantidadExtra, setCantidadExtra] = useState(0);
  // Métodos disponibles restringidos a Delivery y Encomienda. Iniciar en Delivery.
  const [metodo, setMetodo] = useState("Delivery");
  const [comprobanteFile, setComprobanteFile] = useState(null); // base64
  const [celular, setCelular] = useState("");
  // Notas removidas según requerimiento
  const [destinoEncomienda, setDestinoEncomienda] = useState("");
  const [motivo, setMotivo] = useState(""); // motivo para productos sintéticos

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
    const prodActual = products.find(p=>p.sku===sku);
    const esSintetico = !!prodActual?.sintetico;
    if(esSintetico){
      if(!motivo.trim()) return alert('Ingresa un motivo');
    } else {
      if(!cantidad || cantidad <=0) return alert('Cantidad inválida');
      if(skuExtra && cantidadExtra <=0) return alert('Cantidad adicional inválida');
    }
  function build12(h,m,ap){ if(!h) return ''; return `${h}:${m} ${ap}`; }
  const horaEntrega = build12(hIni,mIni,ampmIni); // sin hora fin
  if(metodo==='Encomienda' && !destinoEncomienda.trim()) return alert('Ingresa destino de la encomienda');
  onSubmit({ fecha, ciudad: ciudadVenta, sku, cantidad: esSintetico?1:Number(cantidad), skuExtra: esSintetico? undefined : (skuExtra || undefined), cantidadExtra: esSintetico? undefined : (skuExtra ? Number(cantidadExtra) : undefined), total: esSintetico?0:Number(precioTotal||0), horaEntrega, vendedora: session.nombre, vendedoraId: session.id, metodo: esSintetico? undefined : metodo, celular: esSintetico? undefined : celular, destinoEncomienda: (!esSintetico && metodo==='Encomienda')? destinoEncomienda.trim(): undefined, comprobante: esSintetico? undefined : (comprobanteFile || undefined), motivo: esSintetico? motivo.trim(): undefined });
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
  {/* Hora fin removida */}
        {!fixedCity && (
          <div>
            <label className="text-sm">Ciudad</label>
            <select value={ciudadVenta} onChange={e=>setCiudadVenta(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1">
              {ciudades.map(c=> <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
        {(() => { const prodActual = products.find(p=>p.sku===sku); const esSintetico = !!prodActual?.sintetico; return (
          <>
            <div className="col-span-2 text-xs text-neutral-500 -mt-2">Producto principal ya fue elegido al iniciar. ({prodActual?.nombre||'—'}) {esSintetico && <span className="text-[#f09929] font-semibold">(Sintético)</span>}</div>
            {esSintetico && (
              <div className="col-span-2">
                <label className="text-sm">Motivo</label>
                <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 text-sm" placeholder="Describe el motivo" rows={2} />
                <div className="text-[10px] text-neutral-500 mt-1">Requerido para productos sintéticos.</div>
              </div>
            )}
            {!esSintetico && (
              <>
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
              </>
            )}
          </>
        ); })()}
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
    const esSintetico = !!product.sintetico;
    if(esSintetico && payload.cantidad !== 1){ payload.cantidad = 1; }
    if(!esSintetico && product.stock < payload.cantidad) return alert('Stock central insuficiente (no se puede reservar)');
    if(payload.skuExtra && payload.cantidadExtra){
      const prod2 = products.find(p=>p.sku===payload.skuExtra);
      if(!prod2) return alert('Producto adicional no encontrado');
      if(!prod2.sintetico && prod2.stock < payload.cantidadExtra) return alert('Stock central insuficiente del adicional');
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
            const esSintetico = !!p.sintetico;
            return (
              <button key={p.sku} onClick={()=>openSale(p)} className="group rounded-3xl p-3 transition flex flex-col gap-3 bg-[#0f171e] hover:ring-2 hover:ring-neutral-600/40 w-full max-w-[280px] mx-auto">
                <div className="text-[15px] font-semibold tracking-wide text-center uppercase leading-snug line-clamp-2 px-1" title={p.nombre}>{p.nombre}</div>
                <div className="relative w-full rounded-2xl bg-neutral-800 overflow-hidden border border-neutral-700 shadow-inner">
                  <div className="w-full pb-[100%]"></div>
                  {(() => {
                    const src = p.imagen || p.imagenUrl || p.imagen_url || p.imagenURL || null;
                    if(src) return <img src={src} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />;
                    return <span className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-500">SIN IMAGEN</span>;
                  })()}
                  {!esSintetico && (
                    <div className="absolute top-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-[20px] font-semibold text-[#f09929] leading-none" title={`Stock base: ${stockBase}\nPendientes: ${ventasPendientes}`}>{disponible}</div>
                  )}
                </div>
                {!esSintetico && (
                  <div className="text-[15px] font-semibold text-[#f09929] tracking-wide text-center">STOCK: {disponible}</div>
                )}
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
function VentasView({ sales, setSales, products, session, dispatches, setDispatches, setProducts, setView, setDepositSnapshots }) {
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
            <CityPendingShipments city={cityFilter} dispatches={dispatches} setDispatches={setDispatches} products={products} setProducts={setProducts} session={session} />
            <CityStock city={cityFilter} products={products} sales={sales} dispatches={dispatches.filter(d=>d.status==='confirmado')} setSales={setSales} session={session} />
            <CitySummary city={cityFilter} sales={sales} setSales={setSales} products={products} session={session} setProducts={setProducts} setView={setView} setDepositSnapshots={setDepositSnapshots} />
          </>
        )}
  {/* Tabla de ventas removida a solicitud. */}
      </div>
    </div>
  );
}

// Resumen tipo cuadro para una ciudad seleccionada
function CitySummary({ city, sales, setSales, products, session, setProducts, setView, setDepositSnapshots }) {
  // Ventas confirmadas normales
  const confirmadas = sales
    .filter(s=>s.ciudad===city && (s.estadoEntrega||'confirmado')==='confirmado' && !s.settledAt)
    .sort((a,b)=>{
      const ta = a.confirmadoAt || a.canceladoAt || 0;
      const tb = b.confirmadoAt || b.canceladoAt || 0;
      // más reciente primero
      if(tb !== ta) return tb - ta;
      if(a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return (b.id||'').localeCompare(a.id||'');
    });

  // Pedidos cancelados con costo de delivery: deben aparecer para reflejar gasto.
  const canceladasConCosto = sales
    .filter(s=> s.ciudad===city && s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0 && !s.settledAt)
    .map(s=> ({
      ...s,
      sinteticaCancelada: true,
      gasto: 0,
      total: 0,
      confirmadoAt: s.confirmadoAt || s.canceladoAt || Date.parse(s.fecha+'T00:00:00') || 0,
    }));

  // Unificar y ordenar por fecha y hora (más reciente primero). Si hay horaEntrega, se usa para desempatar.
  const unificados = [...confirmadas, ...canceladasConCosto];
  const filtradas = unificados.slice().sort((a,b)=> {
    const ta = a.confirmadoAt || a.canceladoAt || 0;
    const tb = b.confirmadoAt || b.canceladoAt || 0;
    if(tb !== ta) return tb - ta;
    if(a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return (b.id||'').localeCompare(a.id||'');
  });

  // Construir filas (rows) que antes se usaban pero no estaban definidas -> causaba ReferenceError
  const rows = filtradas.map(s=> {
    const p1 = products.find(p=>p.sku===s.sku);
    const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra) : null;
    const totalCalc = Number(s.total != null ? s.total : (Number(s.precio||0)*Number(s.cantidad||0) +
      (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)));
    const gasto = Number(s.gasto||0);
    const gastoCancel = Number(s.gastoCancelacion||0);
    const esCanceladaSint = !!s.sinteticaCancelada;
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
      productos: esCanceladaSint ? '— (Cancelada)' : [p1?.nombre || s.sku, p2 ? p2.nombre : null].filter(Boolean).join(' + '),
      cantidades: esCanceladaSint ? '' : [s.cantidad, s.cantidadExtra].filter(x => x != null).join(' + '),
      total: esCanceladaSint ? 0 : totalCalc,
      gasto: esCanceladaSint ? 0 : gasto,
      neto: esCanceladaSint ? -gastoCancel : (totalCalc - gasto), // neto negativo como pérdida por cancelación
      gastoCancelacion: gastoCancel,
      sinteticaCancelada: esCanceladaSint,
      metodo: s.metodo,
      celular: s.celular || '',
      comprobante: s.comprobante,
  destinoEncomienda: s.destinoEncomienda,
  motivo: s.motivo
    };
  });

  // (Variables previas que ya no se usan eliminadas)
  // Excluir productos sintéticos de las columnas (vista por ciudad)
  const productOrder = products.filter(p=>!p.sintetico).map(p=>p.sku);
  const [openComp, setOpenComp] = useState(null); // base64 comprobante
  const [editingSale, setEditingSale] = useState(null);
  const [confirmDeleteSale, setConfirmDeleteSale] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showResumen, setShowResumen] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false); // modal cobrar
  // eliminado estado 'cobrando' (flujo ahora sin espera)
  const hoyISO = todayISO();
  const hoyDMY = hoyISO ? (hoyISO.slice(8,10)+'/'+hoyISO.slice(5,7)+'/'+hoyISO.slice(0,4)) : '';
  useEffect(()=>{
    if(!showResumen) return;
    function onKey(e){ if(e.key==='Escape') setShowResumen(false); }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [showResumen]);
  const isAdmin = session?.rol==='admin';

  function beginEdit(id){
    const sale = filtradas.find(s=>s.id===id);
    if(!sale) return;
    setEditingSale(sale);
    setEditForm({
      fecha: sale.fecha || '',
      horaEntrega: sale.horaEntrega || sale.hora || '',
      ciudad: sale.ciudad || '',
      metodo: sale.metodo || 'Delivery',
      destinoEncomienda: sale.destinoEncomienda || '',
      vendedora: sale.vendedora || sale.vendedor || '',
      celular: sale.celular || '',
      sku: sale.sku || '',
      cantidad: sale.cantidad || 0,
      skuExtra: sale.skuExtra || '',
      cantidadExtra: sale.cantidadExtra || 0,
      total: sale.total != null ? sale.total : 0,
      gasto: sale.gasto != null ? sale.gasto : 0,
    });
  }

  function updateEditField(field, value){ setEditForm(f=> ({...f, [field]: value})); }

  function saveEditSale(){
    if(!editingSale) return;
    setSales(prev => prev.map(s=> s.id===editingSale.id ? {
      ...s,
      fecha: editForm.fecha,
      horaEntrega: editForm.horaEntrega,
      ciudad: editForm.ciudad,
      metodo: editForm.metodo,
      destinoEncomienda: editForm.metodo==='Encomienda' ? editForm.destinoEncomienda : '',
      vendedora: editForm.vendedora,
      celular: editForm.celular,
      sku: editForm.sku,
      cantidad: Number(editForm.cantidad)||0,
      skuExtra: editForm.skuExtra || '',
      cantidadExtra: Number(editForm.cantidadExtra)||0,
      total: Number(editForm.total)||0,
      gasto: Number(editForm.gasto)||0,
      neto: (Number(editForm.total)||0) - (Number(editForm.gasto)||0)
    } : s));
    setEditingSale(null);
  }

  function deleteEditingSale(){
    if(!editingSale) return;
    // Eliminación definitiva
    setSales(prev => prev.filter(s=> s.id!==editingSale.id));
    setConfirmDeleteSale(false);
    setEditingSale(null);
  }

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
      <div className="overflow-auto -mx-3 md:mx-0 pb-2">
        <div className="md:hidden text-[10px] text-neutral-500 px-3 pb-1">Desliza horizontalmente para ver la tabla →</div>
        <table className="w-full text-[11px] min-w-[1000px]">
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
              {isAdmin && <th className="p-2 text-center">Editar</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              // Si es fila cancelada sintética, no debe descontar productos: cantidades en cero
              const cantidades = productOrder.map(sku=>{
                if(r.sinteticaCancelada) return 0;
                let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
              return (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="p-2">{toDMY(r.fecha)}</td>
                  <td className="p-2">{r.hora}</td>
                  <td className="p-2">{r.ciudad}</td>
                  <td className="p-2 text-left max-w-[160px]">{r.metodo==='Encomienda' ? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>: (r.motivo? <span className="text-[12px] text-[#e7922b]" title={r.motivo}>{r.motivo}</span> : null)}</td>
                  <td className="p-2 whitespace-nowrap">{firstName(r.vendedor)}</td>
                  {cantidades.map((c,i)=> <td key={i} className="p-2 text-center">{c||''}</td>)}
  <td className="p-2 text-right font-semibold">{currency(r.total)}</td>
  <td className={"p-2 text-right "+(r.sinteticaCancelada? 'text-red-400':'')}>{r.gasto?currency(r.gasto):''}</td>
  <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400':'')}>{currency(r.neto)}</td>
                  <td className="p-2 text-center">{r.celular||''}</td>
                  <td className="p-2 text-center">
                    {r.sinteticaCancelada && Number(r.gastoCancelacion||0) > 0 ? (
                      <span className="text-[11px] font-semibold text-red-400">Cancelado</span>
                    ) : (
                      r.comprobante && (
                        <button
                          onClick={()=>setOpenComp(r.comprobante)}
                          title="Ver comprobante"
                          className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                          </svg>
                        </button>
                      )
                    )}
                  </td>
                  {isAdmin && (
                    <td className="p-2 text-center">
                      <button onClick={()=>beginEdit(r.id)} className="px-2 py-1 rounded-lg bg-[#1d2a34] hover:bg-[#253341] text-[10px] border border-[#e7922b]/40">Editar</button>
                    </td>
                  )}
                </tr>
              );
            })}
  {!rows.length && <tr><td colSpan={5+productOrder.length+5} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
          </tbody>
          {rows.length>0 && (()=>{
            const totSku = {};
            rows.forEach(r=>{
              if(r.sinteticaCancelada) return; // no afectar stock ni totales de producto
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
      {isAdmin && <td className="p-2"></td>}
                </tr>
              </tfoot>
            );
          })()}
        </table>
        {rows.length>0 && session.rol==='admin' && (
          <div className="mt-4 flex justify-end">
            <button onClick={()=>setCobrarOpen(true)} className="px-6 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-sm font-semibold shadow hover:brightness-110 active:scale-[0.98]">Limpiar</button>
          </div>
        )}
        {cobrarOpen && (
          <Modal onClose={()=>{ setCobrarOpen(false); }} autoWidth>
            {(()=>{
              // Construir resumen de ventas confirmadas actuales (excluye filas sintéticas canceladas y productos sintéticos)
              const resumenSku = {};
              rows.forEach(r=>{
                if(r.sinteticaCancelada) return;
                if(r.sku) resumenSku[r.sku] = (resumenSku[r.sku]||0) + Number(r.cantidad||0);
                if(r.skuExtra) resumenSku[r.skuExtra] = (resumenSku[r.skuExtra]||0) + Number(r.cantidadExtra||0);
              });
              const entries = Object.entries(resumenSku);
              // Conteo de confirmadas separando sintéticas
              const ventasSinteticas = rows.filter(r=>{
                if(r.sinteticaCancelada) return false;
                const prod = products.find(p=>p.sku===r.sku);
                return prod?.sintetico;
              }).length;
              const ventasConfirmadasReales = rows.filter(r=>{
                if(r.sinteticaCancelada) return false;
                const prod = products.find(p=>p.sku===r.sku);
                return !(prod?.sintetico);
              }).length;
              const canceladasConCostoCount = sales.filter(s=> s.ciudad===city && s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0).length;
              // Total pedidos (confirmadas reales + sintéticas + canceladas con costo)
              const unidadesTotales = ventasConfirmadasReales + ventasSinteticas + canceladasConCostoCount;
              function confirmarCobro(){
                // Construir snapshot incluso si no hay confirmadas
                const productTotals = {};
                rows.forEach(r=>{
                  if(r.sinteticaCancelada) return;
                  if(r.sku) productTotals[r.sku] = (productTotals[r.sku]||0) + Number(r.cantidad||0);
                  if(r.skuExtra) productTotals[r.skuExtra] = (productTotals[r.skuExtra]||0) + Number(r.cantidadExtra||0);
                });
                const totalMonto = rows.reduce((a,r)=> a + Number(r.total||0),0);
                const totalDelivery = rows.reduce((a,r)=> a + Number(r.gasto||0),0);
                const totalNeto = rows.reduce((a,r)=> a + Number(r.neto||0),0);
                setDepositSnapshots(prev => [
                  ...prev,
                  {
                    id: uid(),
                    city,
                    timestamp: Date.now(),
                    rows: rows.map(r=> ({...r})),
                    resumen:{
                      ventasConfirmadas: ventasConfirmadasReales,
                      ventasSinteticas,
                      canceladasConCosto: canceladasConCostoCount,
                      totalPedidos: unidadesTotales,
                      totalMonto,
                      totalDelivery,
                      totalNeto,
                      productos: productTotals
                    }
                  }
                ]);
                // Descontar stock central (solo confirmadas reales, no sintéticas)
                setProducts(curr=> curr.map(p=>{
                  const cant = resumenSku[p.sku];
                  if(!cant) return p;
                  if(p.sintetico) return p;
                  return { ...p, stock: Math.max(0, p.stock - cant) };
                }));
                // Marcar ventas como liquidadas (settled) en lugar de eliminarlas
                const settledTs = Date.now();
                setSales(prev=> prev.map(s=> {
                  if(s.ciudad !== city) return s;
                  const esConfirmada = (s.estadoEntrega||'confirmado')==='confirmado';
                  const esCanceladaConCosto = s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0;
                  if(esConfirmada || esCanceladaConCosto) {
                    if(s.settledAt) return s; // ya marcado
                    return { ...s, settledAt: settledTs };
                  }
                  return s;
                }));
                // Cerrar y navegar inmediatamente
                setCobrarOpen(false);
                setView('deposit');
              }
              return (
                <div className="w-full max-w-[440px] space-y-4">
                  <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Confirmar Limpieza</h3>
                  <div className="text-[12px] leading-relaxed text-neutral-300 space-y-2">
                    <p>Al confirmar se eliminarán las ventas CONFIRMADAS y las CANCELADAS con costo de esta ciudad. Las entregas pendientes permanecen. Se descuenta del stock central solo lo confirmado (productos no sintéticos).</p>
                    <div className="text-[12px] bg-neutral-800/60 border border-neutral-700 rounded-lg px-3 py-2 flex flex-col gap-1">
                      <span><span className="text-neutral-400">Ventas confirmadas:</span> <span className="font-semibold text-[#e7922b]">{ventasConfirmadasReales}</span></span>
                      <span><span className="text-neutral-400">Ventas sintéticas:</span> <span className="font-semibold text-[#e7922b]">{ventasSinteticas}</span></span>
                      <span><span className="text-neutral-400">Pedidos cancelados (con costo):</span> <span className="font-semibold text-red-400">{canceladasConCostoCount}</span></span>
                      <span><span className="text-neutral-400">Total pedidos (incluye sintéticos y cancelados con costo):</span> <span className="font-semibold text-[#e7922b]">{unidadesTotales}</span></span>
                      <span className="text-[10px] text-neutral-500">(Detalle oculto)</span>
                    </div>
                    <p className="text-yellow-400 text-[11px]">Se descuenta stock solo de productos NO sintéticos. Pendientes NO se borran. Los despachos (envíos) NO se tocan. Acción irreversible.</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={()=>setCobrarOpen(false)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                    <button onClick={confirmarCobro} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Confirmar</button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}
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
        {editingSale && (
          <Modal onClose={()=>setEditingSale(null)} autoWidth>
            <div className="w-full max-w-[520px] space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Editar Venta</h3>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <label className="flex flex-col gap-1">Fecha
                  <input type="date" value={editForm.fecha} onChange={e=>updateEditField('fecha', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Hora
                  <input value={editForm.horaEntrega} onChange={e=>updateEditField('horaEntrega', e.target.value)} placeholder="10:00 AM" className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Ciudad
                  <input value={editForm.ciudad} onChange={e=>updateEditField('ciudad', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Método
                  <select value={editForm.metodo} onChange={e=>updateEditField('metodo', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                    <option value="Delivery">Delivery</option>
                    <option value="Encomienda">Encomienda</option>
                  </select>
                </label>
                {editForm.metodo==='Encomienda' && (
                  <label className="flex flex-col gap-1 col-span-2">Destino Encomienda
                    <input value={editForm.destinoEncomienda} onChange={e=>updateEditField('destinoEncomienda', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                  </label>
                )}
                <label className="flex flex-col gap-1">Vendedor(a)
                  <input value={editForm.vendedora} onChange={e=>updateEditField('vendedora', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Celular
                  <input value={editForm.celular} onChange={e=>updateEditField('celular', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">SKU
                  <select value={editForm.sku} onChange={e=>updateEditField('sku', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                    <option value="">—</option>
                    {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">Cant
                  <input type="number" value={editForm.cantidad} onChange={e=>updateEditField('cantidad', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">SKU Extra
                  <select value={editForm.skuExtra} onChange={e=>updateEditField('skuExtra', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                    <option value="">—</option>
                    {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">Cant Extra
                  <input type="number" value={editForm.cantidadExtra} onChange={e=>updateEditField('cantidadExtra', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Monto (Total)
                  <input type="number" value={editForm.total} onChange={e=>updateEditField('total', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <label className="flex flex-col gap-1">Delivery (Gasto)
                  <input type="number" value={editForm.gasto} onChange={e=>updateEditField('gasto', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
                <div className="col-span-2 text-[10px] text-neutral-500">Neto se recalcula automáticamente: <span className="text-[#e7922b] font-semibold">{currency((Number(editForm.total)||0)-(Number(editForm.gasto)||0))}</span></div>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <div className="flex gap-2">
                  <button onClick={()=>setConfirmDeleteSale(true)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white">Eliminar</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setEditingSale(null)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                  <button onClick={saveEditSale} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Guardar</button>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {confirmDeleteSale && editingSale && (
          <Modal onClose={()=>setConfirmDeleteSale(false)} autoWidth>
            <div className="w-full max-w-[420px] space-y-4">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">Confirmar Eliminación</h3>
              <div className="text-[12px] leading-relaxed text-neutral-300 space-y-2">
                <p>¿Seguro que deseas eliminar este pedido? Esta acción no se puede deshacer.</p>
                <div className="bg-neutral-800/60 rounded-lg p-3 border border-neutral-700 text-[11px] space-y-1">
                  <div><span className="text-neutral-400">Fecha:</span> {toDMY(editingSale.fecha)}</div>
                  <div><span className="text-neutral-400">Ciudad:</span> {editingSale.ciudad}</div>
                  <div><span className="text-neutral-400">Usuario:</span> {firstName(editingSale.vendedora||editingSale.vendedor)}</div>
                  <div><span className="text-neutral-400">Productos:</span> {[editingSale.sku, editingSale.skuExtra].filter(Boolean).join(' + ')||'—'}</div>
                  <div><span className="text-neutral-400">Cant:</span> {[editingSale.cantidad, editingSale.cantidadExtra].filter(x=>x).join(' + ')||'—'}</div>
                  <div><span className="text-neutral-400">Monto:</span> {currency(editingSale.total||0)}</div>
                  <div><span className="text-neutral-400">Delivery:</span> {currency(editingSale.gasto||0)}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>setConfirmDeleteSale(false)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button onClick={deleteEditingSale} className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white">Eliminar</button>
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
                    const esCancelada = !!r.sinteticaCancelada;
                    const cantidades = productOrder.map(sku=>{
                      if(esCancelada) return 0; // no mostrar productos
                      let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                    return (
                      <tr key={r.id} className={"border-t border-neutral-800 "+(esCancelada? 'bg-red-900/10':'')}>
                        <td className="px-1 py-0.5 whitespace-nowrap">{toDMY(r.fecha)}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{r.hora}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{r.ciudad}</td>
                        <td className="px-1 py-0.5 text-left max-w-[140px] truncate">{r.metodo==='Encomienda'? (r.destinoEncomienda||'') : (r.motivo? r.motivo : '')}</td>
                        {cantidades.map((c,i)=> <td key={i} className="px-1 py-0.5 text-center">{c||''}</td>)}
                        <td className={"px-1 py-0.5 text-right "+(esCancelada? 'text-red-400 font-semibold':'')}>{esCancelada? 'Cancelado '+currency(r.gastoCancelacion||0) : (r.gasto?currency(r.gasto):'')}</td>
                        <td className={"px-1 py-0.5 text-right font-semibold "+(esCancelada? 'text-red-400':'')}>{currency(r.neto)}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{r.celular||''}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && <tr><td colSpan={productOrder.length+7} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
                </tbody>
                {rows.length>0 && (()=>{
                  const totSku = {};
                  rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
                  const sumDelivery = rows.reduce((a,r)=> a + (r.sinteticaCancelada? Number(r.gastoCancelacion||0): Number(r.gasto||0)),0);
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

// ---------------------- Vista Confirmar Depósito ----------------------
function DepositConfirmView({ snapshots, setSnapshots, products, setSales, onBack }) {
  const [activeId, setActiveId] = useState(()=> snapshots?.length ? snapshots[snapshots.length-1].id : null); // última añadida
  const active = snapshots.find(s=>s.id===activeId) || null;
  const [montoDepositado, setMontoDepositado] = useState('');
  const [nota, setNota] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [formValues, setFormValues] = useState({ total:'', gasto:'', gastoCancel:'', cantidad:'', cantidadExtra:'', sku:'', skuExtra:'' });
  const [confirmingDeposit, setConfirmingDeposit] = useState(null); // { amount, note }
  function recompute(rows){
    const ventasSinteticas = rows.filter(r=> !r.sinteticaCancelada && products.find(p=>p.sku===r.sku)?.sintetico).length;
    const ventasConfirmadas = rows.filter(r=> !r.sinteticaCancelada && !products.find(p=>p.sku===r.sku)?.sintetico).length;
    const canceladasConCosto = rows.filter(r=> r.sinteticaCancelada).length;
    const productTotals = {};
    rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) productTotals[r.sku]=(productTotals[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) productTotals[r.skuExtra]=(productTotals[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
    const totalMonto = rows.reduce((a,r)=> a + Number(r.total||0),0);
    const totalDelivery = rows.reduce((a,r)=> a + Number(r.gasto||0),0);
    const totalNeto = rows.reduce((a,r)=> a + Number(r.neto||0),0);
    return { ventasConfirmadas, ventasSinteticas, canceladasConCosto, totalPedidos: ventasConfirmadas+ventasSinteticas+canceladasConCosto, totalMonto, totalDelivery, totalNeto, productos: productTotals };
  }
  function patchActive(mutator){
    setSnapshots(prev => prev.map(s=> s.id===activeId ? mutator(s) : s));
  }
  function openEdit(r){
    setEditingRow(r);
    setFormValues({ 
      total: r.sinteticaCancelada? '': String(r.total||0), 
      gasto: r.sinteticaCancelada? '': String(r.gasto||0), 
      gastoCancel: r.sinteticaCancelada? String(r.gastoCancelacion||0): '',
      cantidad: String(r.cantidad||''),
      cantidadExtra: String(r.cantidadExtra||''),
      sku: r.sku||'',
      skuExtra: r.skuExtra||''
    });
  }
  function closeEdit(){ setEditingRow(null); }
  function updateForm(field,val){ setFormValues(f=>({...f,[field]:val})); }
  function saveEdit(e){ 
    e.preventDefault(); if(!editingRow) return; 
    patchActive(prev=>{ 
      const rows = prev.rows.map(r=>{ 
        if(r.id!==editingRow.id) return r; 
        if(r.sinteticaCancelada){ 
          const gc=Math.max(0,Number(formValues.gastoCancel||0)||0); 
          return { ...r, gastoCancelacion:gc, neto:-gc }; 
        } else { 
          const t=Math.max(0,Number(formValues.total||0)||0); 
          const g=Math.max(0,Number(formValues.gasto||0)||0); 
          const cant = Math.max(0, Number(formValues.cantidad||0)||0); 
          const cantExtra = Math.max(0, Number(formValues.cantidadExtra||0)||0); 
          return { ...r, total:t, gasto:g, neto:t-g, cantidad:cant, cantidadExtra:cantExtra, sku: formValues.sku||'', skuExtra: formValues.skuExtra||'' }; 
        } 
      }); 
      return { ...prev, rows, resumen: recompute(rows) }; 
    }); 
    // Persistir cambios en la venta original (solo si no es sintética cancelada)
    setSales(prev => prev.map(s=>{
      if(s.id!==editingRow.id) return s;
      if(editingRow.sinteticaCancelada){
        const gc=Math.max(0,Number(formValues.gastoCancel||0)||0);
        return { ...s, gastoCancelacion: gc };
      } else {
        const t=Math.max(0,Number(formValues.total||0)||0);
        const g=Math.max(0,Number(formValues.gasto||0)||0);
        const cant = Math.max(0, Number(formValues.cantidad||0)||0);
        const cantExtra = Math.max(0, Number(formValues.cantidadExtra||0)||0);
        return { ...s, total:t, gasto:g, neto:t-g, cantidad:cant, cantidadExtra:cantExtra, sku: formValues.sku||'', skuExtra: formValues.skuExtra||'' };
      }
    }));
    setEditingRow(null); 
  }
  function deleteRow(id){ if(!window.confirm('¿Eliminar este pedido de la lista de depósito?')) return; patchActive(prev=>{ const rows = prev.rows.filter(r=>r.id!==id); return { ...prev, rows, resumen: recompute(rows) }; }); }
  function markSaved(amount, note){
    if(!active) return;
    patchActive(prev=> ({ ...prev, depositAmount: amount, depositNote: note||'', savedAt: Date.now() }));
  }
  function finalizeDeposit(){
    if(!active || !confirmingDeposit) return;
    const { amount, note } = confirmingDeposit;
    markSaved(amount, note);
    // Eliminar snapshot de la lista (ya confirmado)
    setSnapshots(prev => prev.filter(s=> s.id!==active.id));
    // Elegir nueva activa
    setTimeout(()=> {
      setConfirmingDeposit(null);
      setMontoDepositado(''); setNota('');
      // Actualizar activeId tras eliminación
      setSnapshots(prev => { // necesitamos leer nuevos snapshots para activeId: usar callback en setSnapshots? ya eliminamos arriba; fallback en efecto siguiente render
        return prev; // no muta, solo placeholder
      });
    },0);
  }
  const orderedSkus = products.map(p=>p.sku);
  if(!snapshots.length){
    return (
      <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#f09929]" /> Confirmar Depósito</h2>
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
          </header>
          <div className="text-neutral-400 text-sm">No hay limpiezas pendientes de depósito.</div>
        </div>
      </div>
    );
  }
  const resumen = active?.resumen||{};
  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#f09929]" /> Confirmar Depósito</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {snapshots.map(s=>{
              const activeFlag = s.id===activeId;
              return (
                <button key={s.id} onClick={()=>setActiveId(s.id)} className={"px-3 py-1 rounded-full border text-xs "+(activeFlag? 'bg-[#e7922b] text-[#1a2430] border-[#e7922b]':'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700')}>
                  {s.city} · {new Date(s.timestamp).toLocaleTimeString()} {s.savedAt && '✓'}
                </button>
              );
            })}
          </div>
          {active && <p className="text-sm text-neutral-400">Detalle de la limpieza de <span className="text-[#e7922b] font-semibold">{active.city}</span> realizada el {new Date(active.timestamp).toLocaleString()}.</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
        </div>
      </header>
      {!active && <div className="text-neutral-400 text-sm">Selecciona una limpieza.</div>}
      {active && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f171e] text-[12px] space-y-1">
              <div><span className="text-neutral-400">Pedidos confirmados:</span> <span className="font-semibold text-[#e7922b]">{resumen.ventasConfirmadas}</span></div>
              <div><span className="text-neutral-400">Pedidos sintéticos:</span> <span className="font-semibold text-[#e7922b]">{resumen.ventasSinteticas}</span></div>
              <div><span className="text-neutral-400">Cancelados c/costo:</span> <span className="font-semibold text-red-400">{resumen.canceladasConCosto}</span></div>
              <div><span className="text-neutral-400">Total pedidos:</span> <span className="font-semibold text-[#e7922b]">{resumen.totalPedidos}</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0f171e] text-[12px] space-y-1">
              <div><span className="text-neutral-400">Monto bruto:</span> {currency(resumen.totalMonto||0)}</div>
              <div><span className="text-neutral-400">Delivery:</span> {currency(resumen.totalDelivery||0)}</div>
              <div><span className="text-neutral-400">Neto:</span> <span className="font-semibold text-[#e7922b]">{currency(resumen.totalNeto||0)}</span></div>
            </div>
            <form onSubmit={e=>{ e.preventDefault(); const amount = montoDepositado? Number(montoDepositado): resumen.totalNeto; setConfirmingDeposit({ amount, note: nota }); }} className="p-4 rounded-2xl bg-[#0f171e] text-[12px] space-y-2">
              <div className="font-semibold text-[#e7922b] text-sm mb-1">Registrar Depósito</div>
              <label className="flex flex-col gap-1">Monto depositado
                <input value={montoDepositado} onChange={e=>setMontoDepositado(e.target.value)} placeholder={currency(resumen.totalNeto||0)} className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              <label className="flex flex-col gap-1">Nota (opcional)
                <textarea value={nota} onChange={e=>setNota(e.target.value)} rows={2} className="bg-neutral-800 rounded-lg px-2 py-1 resize-none" />
              </label>
              <div className="text-[10px] text-neutral-500">Al confirmar se registrará y se quitará esta limpieza de la lista.</div>
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">{active.savedAt? 'Actualizar':'Confirmar'}</button>
              </div>
            </form>
          </div>
          <div className="rounded-2xl bg-[#0f171e] p-4 overflow-auto">
            <div className="text-sm font-semibold mb-3">Pedidos incluidos en la limpieza</div>
            <table className="w-full text-[11px] min-w-[1180px]">
          <thead className="bg-neutral-800/60">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Hora</th>
              <th className="p-2 text-left">Ciudad</th>
               <th className="p-2 text-left">Encomienda</th>
              {orderedSkus.map(sku=>{
                const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
              })}
              <th className="p-2 text-right">Monto</th>
              <th className="p-2 text-right">Delivery</th>
              <th className="p-2 text-right">Neto</th>
              <th className="p-2 text-center">Celular</th>
              <th className="p-2 text-center">Editar</th>
      <th className="p-2 text-center">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {active.rows.map(r=>{
              const esCanc = !!r.sinteticaCancelada;
              const cantidades = orderedSkus.map(sku=>{
                if(esCanc) return 0; let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
              return (
                <tr key={r.id} className="">
                  <td className="p-2">{toDMY(r.fecha)}</td>
                  <td className="p-2">{r.hora}</td>
                  <td className="p-2">{r.ciudad}</td>
                  <td className="p-2 text-left max-w-[160px] truncate">{r.metodo==='Encomienda'? (r.destinoEncomienda||'') : (r.motivo|| (esCanc? 'Cancelado' : ''))}</td>
                  {cantidades.map((c,i)=><td key={i} className="p-2 text-center">{c||''}</td>)}
                  <td className="p-2 text-right font-semibold">{currency(r.total||0)}</td>
                  <td className={"p-2 text-right "+(esCanc? 'text-red-400':'')}>{esCanc? currency(r.gastoCancelacion||0): (r.gasto? currency(r.gasto):'')}</td>
                  <td className={"p-2 text-right font-semibold "+(esCanc? 'text-red-400':'')}>{currency(r.neto||0)}</td>
                  <td className="p-2 text-center">{r.celular||''}</td>
                  <td className="p-2 text-center"><button onClick={()=>openEdit(r)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] border border-neutral-700">Editar</button></td>
      <td className="p-2 text-center"><button onClick={()=>deleteRow(r.id)} className="px-2 py-1 rounded-lg bg-red-600/70 hover:bg-red-600 text-[10px] border border-red-500/60 text-white">X</button></td>
                </tr>
              );
            })}
    {!active.rows.length && <tr><td colSpan={orderedSkus.length+10} className="p-6 text-center text-neutral-500 text-sm">Sin datos</td></tr>}
          </tbody>
          {active.rows.length>0 && ( ()=>{ const totSku={}; active.rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0); }); return (<tfoot><tr className="bg-neutral-900/40"><td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={4}>Totales</td>{orderedSkus.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}<td className="p-2 text-right font-bold text-[#e7922b]">{currency(resumen.totalMonto||0)}</td><td className="p-2 text-right font-bold text-[#e7922b]">{resumen.totalDelivery? currency(resumen.totalDelivery):''}</td><td className="p-2 text-right font-bold text-[#e7922b]">{currency(resumen.totalNeto||0)}</td><td className="p-2"></td><td className="p-2"></td><td className="p-2"></td></tr></tfoot>); })()}
        </table>
          </div>
        </>
      )}
      {editingRow && (
        <Modal onClose={closeEdit} autoWidth>
          <form onSubmit={saveEdit} className="w-full max-w-[420px] space-y-4 text-[12px]">
            <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Editar Pedido</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 text-[10px] text-neutral-500">ID: {editingRow.id.slice(-8)}</div>
              <label className="flex flex-col gap-1 col-span-2">Fecha
                <input disabled value={toDMY(editingRow.fecha)} className="bg-neutral-800 rounded-lg px-2 py-1 opacity-60" />
              </label>
              {!editingRow.sinteticaCancelada && (
                <>
                  <label className="flex flex-col gap-1">Monto
                    <input value={formValues.total} onChange={e=>updateForm('total', e.target.value)} type="number" step="0.01" className="bg-neutral-800 rounded-lg px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1">Delivery
                    <input value={formValues.gasto} onChange={e=>updateForm('gasto', e.target.value)} type="number" step="0.01" className="bg-neutral-800 rounded-lg px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1">SKU
                    <select value={formValues.sku} onChange={e=>updateForm('sku', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                      <option value="">—</option>
                      {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">Cant
                    <input value={formValues.cantidad} onChange={e=>updateForm('cantidad', e.target.value)} type="number" className="bg-neutral-800 rounded-lg px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1">SKU Extra
                    <select value={formValues.skuExtra} onChange={e=>updateForm('skuExtra', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                      <option value="">—</option>
                      {products.map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">Cant Extra
                    <input value={formValues.cantidadExtra} onChange={e=>updateForm('cantidadExtra', e.target.value)} type="number" className="bg-neutral-800 rounded-lg px-2 py-1" />
                  </label>
                </>
              )}
              {editingRow.sinteticaCancelada && (
                <label className="flex flex-col gap-1 col-span-2">Gasto cancelación
                  <input value={formValues.gastoCancel} onChange={e=>updateForm('gastoCancel', e.target.value)} type="number" step="0.01" className="bg-neutral-800 rounded-lg px-2 py-1" />
                </label>
              )}
              <div className="col-span-2 text-[10px] text-neutral-500">Neto calculado: {editingRow.sinteticaCancelada ? '-'+currency(Math.max(0, Number(formValues.gastoCancel||0))) : currency(Math.max(0, Number(formValues.total||0)) - Math.max(0, Number(formValues.gasto||0)))} </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeEdit} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmingDeposit && active && (
        <Modal onClose={()=> setConfirmingDeposit(null)} autoWidth>
          <div className="w-full max-w-[400px] px-1 space-y-5">
            <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar Depósito</h3>
            <div className="text-xs text-neutral-300 leading-relaxed space-y-2">
              <p>Ciudad: <span className="font-semibold text-neutral-100">{active.city}</span></p>
              <p>Monto a registrar: <span className="font-semibold text-[#e7922b]">{currency(confirmingDeposit.amount)}</span></p>
              {confirmingDeposit.note && <p>Nota: <span className="text-neutral-400">{confirmingDeposit.note}</span></p>}
              <p className="text-[10px] text-neutral-500">Esta acción registrará el depósito y eliminará esta limpieza de la lista. No podrás editarla luego.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=> setConfirmingDeposit(null)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
              <button onClick={finalizeDeposit} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Sí, Confirmar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}