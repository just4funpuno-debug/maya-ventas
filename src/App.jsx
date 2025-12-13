import React, { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from './components/ToastProvider.jsx';
import { registrarVentaPendiente, discountCityStock, restoreCityStock, adjustCityStock, subscribeCityStock } from "./supabaseUtils";
import AlmacenCityStock from "./components/AlmacenCityStock";
import ConfirmModal from "./components/ConfirmModal";
import ErrorModal from "./components/ErrorModal";
import { uploadImageToSupabase, uploadComprobanteToSupabase } from "./supabaseStorage";
import { compressImage } from "./utils/imageCompression";
import { validateStockForSale } from "./utils/stockValidation";
import { normalizeCity, denormalizeCity } from "./utils/cityUtils";
import { log, warn, error as logError } from "./utils/logger";
import { AsyncButton } from "./components/AsyncButton";
import GrupoSelector from "./components/GrupoSelector";
import WhatsAppAccountManager from "./components/whatsapp/WhatsAppAccountManager";
import MessageSenderTest from "./components/whatsapp/MessageSenderTest";
import WhatsAppDashboard from "./components/whatsapp/WhatsAppDashboard";
import SequenceConfigurator from "./components/whatsapp/SequenceConfigurator";
import CRM from "./components/whatsapp/CRM";
import PuppeteerQueuePanel from "./components/whatsapp/PuppeteerQueuePanel";
import BlockedContactsPanel from "./components/whatsapp/BlockedContactsPanel";
// Logo centralizado para reutilizar en sidebar y otros componentes
const LOGO_URL = "https://res.cloudinary.com/djtpn0kl9/image/upload/v1757639417/favicon_kxrcop.png";
import { supabase } from "./supabaseClient";
import { hasUserSeenGreetingToday, getNextPhraseForUser, logUserGreeting } from "./services/motivationalPhrases";
// --- FLUJO DE INVENTARIO MULTI-CIUDAD ---
// Estructura recomendada:
// 1. almacenCentral: inventario principal. Solo se descuenta cuando se envía stock a una ciudad.
// 2. cityStock: inventario de cada ciudad. Se suma cuando llega un <img src="https://res.cloudinary.com/djtpn0kl9/image/upload/v1757639417/favicon_kxrcop.png" alt="Logo" ... />envío desde el central y se descuenta cuando hay una venta en la ciudad.
// 3. sales: solo registra ventas. Cada venta descuenta productos del cityStock correspondiente.

// 1. Transferir productos del almacen central a una ciudad (envío/despacho)
// Llama a esta función cuando confirmes un despacho/envío desde el central a una ciudad.
async function transferToCity(sku, cantidad, ciudad) {
  try {
    if (!sku || !cantidad || !ciudad) {
      warn('[transferToCity] Parámetros faltantes:', { sku, cantidad, ciudad });
      return;
    }
    // Restar del almacen central
    const { data: product, error: productError } = await supabase
      .from('almacen_central')
      .select('stock')
      .eq('sku', sku)
      .maybeSingle();
    
    if (productError) {
      console.error('[transferToCity] Error obteniendo producto:', productError);
      return;
    }
    
    if (product) {
      await supabase
        .from('almacen_central')
        .update({ stock: Math.max(0, (product.stock || 0) - cantidad) })
        .eq('sku', sku);
    } else {
      warn('[transferToCity] Producto no encontrado:', sku);
    }
    
    // Sumar a cityStock usando función helper
    await restoreCityStock(ciudad, sku, cantidad);
    log(`[transferToCity] ${ciudad} - ${sku}: sumado ${cantidad}`);
  } catch (err) {
    console.error('[transferToCity] ERROR:', err, { sku, cantidad, ciudad });
    throw err;
  }
}

// ============================================================================
// HELPERS DE REFERENCIA - Funciones wrapper para operaciones comunes
// ============================================================================
// NOTA: Estas funciones son wrappers simples que llaman a funciones de supabaseUtils.
// Se mantienen solo las que están en uso. Las no usadas fueron eliminadas en FASE 9.1.

// Eliminar venta pendiente y restaurar stock
// ✅ EN USO - Se usa en deleteEditingSale() (línea ~7328)
async function deletePendingSale(saleId, sale) {
  const { eliminarVentaPendiente } = await import('./supabaseUtils');
  await eliminarVentaPendiente(saleId, sale);
}

/*
INTEGRACIÓN SUGERIDA EN LA UI:
- Al CONFIRMAR un despacho/envío desde el central: transferToCity(sku, cantidad, ciudad)
- Al CONFIRMAR una venta en una ciudad: registerSaleAndDiscount(sale)

VALIDACIONES RECOMENDADAS:
- Antes de transferir, verifica que haya stock suficiente en almacenCentral.
- Antes de vender, verifica que haya stock suficiente en cityStock.

AUDITORÍA Y TRAZABILIDAD:
- Registra cada movimiento importante (envío, venta, devolución) con timestamp y usuario responsable si es posible.
- Nunca modifiques el stock de una colección desde otro flujo.

Esta estructura permite reportes claros, auditoría y fácil mantenimiento.
*/
// --- Actualizar stock de ciudad en Supabase ---
async function updateCityStock(ciudad, items) {
  if (!ciudad || !items || !Object.keys(items).length) return;
  // Usar función helper de supabaseUtils
  await adjustCityStock(ciudad, items);
}
import { subscribeCollection, subscribeUsers, normalizeUser, normalizeSale } from "./supabaseUsers";
// Hook para obtener productos desde Firestore
function useProductosFirestore() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchProductos() {
      try {
        const querySnapshot = await subscribeCollection('productos');
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setProductos(items);
      } catch (error) {
        setProductos([]);
      }
      setLoading(false);
    }
    fetchProductos();
  }, []);
  return { productos, loading };
}

// Componente Catálogo Completo
function CatalogoCompletoFirestore() {
  const { productos, loading } = useProductosFirestore();
  const total = productos.length;
  const totalCentral = productos.filter(p => p.ubicacion === "Central").length;
  const totalPorLlegar = productos.filter(p => p.estado === "Por llegar").length;
  const totalCiudades = productos.filter(p => p.ubicacion === "Ciudad").length;
  const totalBs = productos.reduce((sum, p) => sum + (p.precio || 0), 0);
  return (
    <div className="bg-[#151c22] p-6 rounded-xl mb-4">
  <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#e7922b' }}>
        <span>🗃️</span> Catálogo Completo
      </h2>
      <div className="mb-2">
  <div className="inline-block bg-[#232b32] px-3 py-1 rounded-lg text-xs font-semibold mb-2" style={{ color: '#e7922b' }}>
          POR VENDER NACIONAL
        </div>
  <div className="text-2xl font-bold" style={{ color: '#e7922b' }}>Bs {totalBs.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</div>
      </div>
      <div className="flex gap-2 mb-2">
  <span className="bg-[#232b32] px-2 py-1 rounded text-xs" style={{ color: '#e7922b' }}>Central: {totalCentral}</span>
  <span className="bg-[#232b32] px-2 py-1 rounded text-xs" style={{ color: '#e7922b' }}>Por llegar: {totalPorLlegar}</span>
  <span className="bg-[#232b32] px-2 py-1 rounded text-xs" style={{ color: '#e7922b' }}>En ciudades: {totalCiudades}</span>
  <span className="bg-[#232b32] px-2 py-1 rounded text-xs" style={{ color: '#e7922b' }}>Total: {total}</span>
      </div>
      {loading ? (
        <div className="text-gray-400">Cargando productos...</div>
      ) : productos.length === 0 ? (
        <div className="text-gray-400">No hay productos visibles (productos sintéticos ocultos).</div>
      ) : (
        <ul className="mt-2">
          {productos.map((producto) => (
            <li key={producto.id} className="border-b border-[#232b32] py-2">
              <span className="font-semibold" style={{ color: '#e7922b' }}>{producto.nombre}</span>
              <span className="ml-2" style={{ color: '#e7922b' }}>Bs {producto.precio?.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  LogIn, LogOut, ShoppingCart, CircleDollarSign, TrendingUp, AlertTriangle, Upload, Plus,
  Package, FileSpreadsheet, Wallet, Settings, X, UserPlus, MapPin, Search, Plane, Clock, Check, History,
  ArrowLeft, ArrowRight, MessageSquare, Menu, ChevronDown, BookOpen, Pencil, Save
} from "lucide-react";
import Papa from "papaparse";

// ---------------------- Helpers ----------------------
const currency = (n, cur = "BOB") =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: cur }).format(Number(n || 0));
export const todayISO = () => {
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
  // (Eliminados productos demo)
];

const seedUsers = [
  { id: "admin", nombre: "Pedro", apellidos: "Admin", celular: "", email: "admin@maya.com", password: "admin123", fechaIngreso: todayISO(), sueldo: 0, fechaPago: todayISO(), rol: "admin", productos: [], grupo: 'A' },
];

const seedSales = [
  // (Eliminadas ventas demo)
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
          if (!quotaWarned) { toast.push({ type: 'warn', title: 'Almacenamiento', message: 'Espacio de almacenamiento lleno. Se guardaron los productos sin imágenes. Usa imágenes más pequeñas.' }); quotaWarned = true; }
        } catch { /* ignore */ }
      } else if (!quotaWarned) {
        toast.push({ type: 'warn', title: 'Almacenamiento', message: 'Espacio local lleno. Considera limpiar datos o reducir tamaño de imágenes.' });
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

// Normalizador de usuario para datos legacy/localStorage
// Nota: Para datos de Supabase, usar normalizeUser de supabaseUsers.js
function normalizeUserLocal(u) {
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

function App() {
  const [products, setProducts] = useState([]);
    try { log('[APP] Montando App.jsx. location.hash=', window.location.hash); } catch {}
  const [users, setUsers] = useState(() => loadLS(LS_KEYS.users, seedUsers)
    .map(u=> (u.id==='v1' && u.nombre==='Ana') ? { ...u, nombre:'Beatriz', apellidos:'vargas' } : u)
    .map(normalizeUserLocal));
  const [sales, setSales] = useState([]);
  // Dataset completo de ventas por cobrar (confirmadas/canceladas) usado para KPI "Por Cobrar" en dashboard
  const [ventasAll, setVentasAll] = useState([]);
  // Ventas históricas del día (solo para KPI en dashboard)
  const [historicoHoy, setHistoricoHoy] = useState([]);
  
  // Sistema de notificaciones y modales (FASE 7.3)
  const toast = useToast();
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar', cancelText: 'Cancelar', confirmColor: 'red', isLoading: false });

  // Declarar view antes de usarlo en useEffect para evitar ReferenceError
  // Declaración única de view antes de cualquier uso
  const [view, setView] = useState(()=>{
    try { return localStorage.getItem('ui.view') || 'dashboard'; } catch { return 'dashboard'; }
  }); // 'dashboard' | 'historial' | 'ventas' | 'register-sale' | 'almacen' | 'create-user' | 'products' | 'mis-numeros' | 'config' | 'whatsapp-accounts' | 'whatsapp-test' | 'whatsapp-dashboard' | 'whatsapp-sequences' | 'whatsapp-queue' | 'whatsapp-blocked'

  // Suscripción en tiempo real a VentasSinConfirmar (dashboard) y ventashistorico (historial)
  useEffect(() => {
    let unsub;
    (async () => {
      try {
        if (view === 'dashboard') {
          // Suscribirse a VentasSinConfirmar (sales con estado_entrega='pendiente')
          unsub = subscribeCollection('VentasSinConfirmar', (pendientes) => {
            setSales(pendientes);
          }, {
            filters: { estado_entrega: 'pendiente' },
            orderBy: { column: 'created_at', ascending: false }
          });
          
          // Suscribirse también al histórico SOLO de hoy para KPI "Entregas de hoy"
          try {
            const hoy = todayISO();
            const unsubHistHoy = subscribeCollection('ventashistorico', (historico) => {
              // Normalizar timestamps igual que historial
              let base = Date.now() - historico.length;
              const normalizadas = historico.map(s=>{
                let next = s;
                if((next.estadoEntrega||'confirmado')==='confirmado' && !next.confirmadoAt){ next = { ...next, confirmadoAt: ++base }; }
                if(next.estadoEntrega==='cancelado' && !next.canceladoAt){ next = { ...next, canceladoAt: ++base }; }
                return next;
              });
              setHistoricoHoy(normalizadas);
            }, {
              filters: { fecha: hoy },
              orderBy: { column: 'created_at', ascending: false }
            });
            // Encadenar para limpiar ambos
            const prevUnsub = unsub;
            unsub = () => { prevUnsub && prevUnsub(); unsubHistHoy && unsubHistHoy(); };
          } catch(errHist){ warn('No se pudo suscribir a historicoHoy', errHist); }
        } else if (view === 'historial') {
          // Suscribirse a ventashistorico (sales con estado_entrega IN ('confirmado', 'entregada', 'cancelado'))
          unsub = subscribeCollection('ventashistorico', (historico) => {
            // Normalización similar a la anterior
            let base = Date.now() - historico.length;
            const normalizadas = historico.map(s => {
              let next = s;
              if ((next.estadoEntrega || 'confirmado') === 'confirmado' && !next.confirmadoAt) {
                next = { ...next, confirmadoAt: ++base };
              }
              if (next.estadoEntrega === 'cancelado' && !next.canceladoAt) {
                next = { ...next, canceladoAt: ++base };
              }
              if (!next.vendedoraId && next.vendedora) {
                const full = next.vendedora.toLowerCase().trim();
                const match = seedUsers.find(u => (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === full));
                if (match) next = { ...next, vendedoraId: match.id };
              }
              return next;
            });
            setSales(normalizadas);
          }, {
            orderBy: { column: 'created_at', ascending: false }
          });
  } else if (view === 'ventas') { // LEGACY: esta rama ya no se usará cuando el router esté activo
          // Suscribirse a ventasporcobrar (sales con deleted_from_pending_at IS NULL)
          unsub = subscribeCollection('ventasporcobrar', (porCobrarRaw) => {
            let base = Date.now() - porCobrarRaw.length;
            const normalizadas = porCobrarRaw.map(s => {
              let next = s;
              // Tratar 'entregada' y legacy 'confirmado' como confirmadas
              if (((next.estadoEntrega === 'entregada') || (next.estadoEntrega || 'confirmado') === 'confirmado') && !next.confirmadoAt) {
                next = { ...next, confirmadoAt: ++base };
              }
              if (next.estadoEntrega === 'cancelado' && !next.canceladoAt) {
                next = { ...next, canceladoAt: ++base };
              }
              if (!next.vendedoraId && next.vendedora) {
                const full = next.vendedora.toLowerCase().trim();
                const match = seedUsers.find(u => (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === full));
                if (match) next = { ...next, vendedoraId: match.id };
              }
              return next;
            });
            log('[VENTAS view] ventasporcobrar normalizadas:', normalizadas);
            setSales(normalizadas);
          }, {
            orderBy: { column: 'created_at', ascending: false }
          });
        }
      } catch (err) {
        warn('No se pudo suscribir a la colección de ventas', err);
      }
    })();
    return () => unsub && unsub();
  }, [view]);

  // Suscripción independiente (siempre activa) a 'ventasporcobrar' para KPI Por Cobrar global
  useEffect(()=>{
    try {
      const unsub = subscribeCollection('ventasporcobrar', (porCobrarRaw) => {
        let base = Date.now() - porCobrarRaw.length;
        const normalizadas = porCobrarRaw.map(s=>{
          let next = s;
          if(((next.estadoEntrega==='entregada') || (next.estadoEntrega||'confirmado')==='confirmado') && !next.confirmadoAt){ next = { ...next, confirmadoAt: ++base }; }
          if(next.estadoEntrega==='cancelado' && !next.canceladoAt){ next = { ...next, canceladoAt: ++base }; }
          return next;
        });
        setVentasAll(normalizadas);
      }, {
        orderBy: { column: 'created_at', ascending: false }
      });
      return ()=> unsub && unsub();
    } catch(err){ warn('No se pudo suscribir a ventasporcobrar para KPI Por Cobrar', err); }
  }, []);
  const [session, setSession] = useState(() => loadLS(LS_KEYS.session, null));
  const [dispatches, setDispatches] = useState(() => loadLS(LS_KEYS.warehouseDispatches, []).map(d=> ({ ...d, status: d.status || 'confirmado' })));
  // Estado para "Mis Números"
  const [numbers, setNumbers] = useState(()=> loadLS(LS_KEYS.numeros, [])); // [{id, sku, telefonia, nombreOtro, celular, caduca, createdAt}]
  // Suscripción en tiempo real a la tabla 'mis_numeros' (mapeada desde 'numbers' en supabaseUsers.js)
  useEffect(() => {
    const unsub = subscribeCollection('numbers', setNumbers); // 'numbers' se mapea a 'mis_numeros' en Supabase
    return () => unsub();
  }, []);
  const [teamMessages, setTeamMessages] = useState(()=> loadLS(LS_KEYS.teamMessages, [])); // [{id, grupo, authorId, authorNombre, text, createdAt, readBy:[] }]
  // Suscripción en tiempo real a la colección 'team_messages'
  useEffect(() => {
    const unsub = subscribeCollection('team_messages', setTeamMessages, {
      orderBy: { column: 'created_at', ascending: false }
    });
    return () => unsub();
  }, []);
  // Estado global UI adicional para navegación móvil
  const [showMobileNav, setShowMobileNav] = useState(false);
  // Estado para colapsar sidebar en desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function MobileTopBar(){
    return (
      <div className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-[#18252e] border-b border-[#0f171e] sticky top-0 z-40">
        <button onClick={()=>setShowMobileNav(true)} className="p-2 rounded-lg bg-neutral-800/70 active:scale-95"><Menu className="w-5 h-5 text-[#e7922b]" /></button>
        <div className="flex items-center gap-2">
          <img
            src={LOGO_URL}
            alt="Logo Maya Ventas"
            className="w-7 h-7 rounded-full object-cover"
            onError={(e) => { e.currentTarget.src = '/favicon.png'; }}
            loading="lazy"
          />
          <span className="text-sm font-semibold tracking-wide text-[#e7922b]">MAYA Ventas</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Placeholder para acciones rápidas futuras */}
        </div>
      </div>
    );
  }

  function MobileBottomNav({ view, setView }){
    const items = [
      { key:'dashboard', icon:<TrendingUp className="w-5 h-5"/>, label:'Dash' },
      { key:'ventas', icon:<ShoppingCart className="w-5 h-5"/>, label:'Ventas' },
      { key:'register-sale', icon:<Plus className="w-5 h-5"/>, label:'Nueva' },
      { key:'historial', icon:<History className="w-5 h-5"/>, label:'Historial' }
    ];
    return (
  <nav className="bottom-nav-static md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#18252e] border-t border-[#0f171e] flex justify-around h-16 items-center shadow-[0_-2px_8px_rgba(0,0,0,0.55)] select-none" style={{WebkitUserSelect:'none'}}>
        {items.map(it=>{
          const active = view===it.key;
          return (
    <button key={it.key} onClick={()=>setView(it.key)} className={`flex flex-col items-center justify-center gap-0.5 px-2 w-16 text-[11px] font-medium ${active? 'text-[#e7922b]':'text-neutral-400'} focus:outline-none`}>{it.icon}<span>{it.label}</span></button>
          );
        })}
      </nav>
    );
  }

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
  const [receiptTemp, setReceiptTemp] = useState(null); // base64 para preview
  const [receiptFile, setReceiptFile] = useState(null); // File original para subir
  const [uploadingReceipt, setUploadingReceipt] = useState(false); // loading al subir
  // Snapshots de limpiezas pendientes de registrar depósito (pueden ser varias ciudades)
  const [depositSnapshots, setDepositSnapshots] = useState([]); // [{ id, city, timestamp, rows, resumen, depositAmount?, depositNote?, savedAt? }]
  // Sincronizar menú "Generar Depósito" con la tabla deposits de Supabase
  useEffect(()=>{
    // Solo suscribir cuando la vista de depósito está activa (optimiza)
    if(view !== 'deposit') return;
    const unsub = subscribeCollection('GenerarDeposito', (deposits) => {
      if(!deposits.length){ setDepositSnapshots([]); return; }
      
      // Procesar de forma asíncrona
      (async () => {
        // Agrupar por ciudad para recrear estructura de "snapshot" (limpieza) anterior
        const groups = {};
        
        // FASE 2: Recolectar todos los IDs de ventas para consultar sales
        const allVentaIds = new Set();
        const ventasPorDeposito = new Map(); // Map<depositId, ventas[]>
        
        log(`[FASE 0] Total depósitos recibidos: ${deposits.length}`);
        for(const d of deposits){
          const cityRaw = d.ciudad || d.city || '—';
          const city = denormalizeCity(cityRaw);
          if(!groups[city]) groups[city] = { city, rows: [], createdAts: [] };
          
          // Debug: Ver estructura del depósito
          if(deposits.indexOf(d) === 0) {
            log('[FASE 0 DEBUG] Primer depósito:', {
              id: d.id,
              ciudad: d.ciudad,
              city: d.city,
              tieneNota: !!d.nota,
              tipoNota: typeof d.nota,
              campos: Object.keys(d || {})
            });
          }
          
          // FASE 1: Parsear campo nota y extraer ventas del JSON
          let ventasDelDeposito = [];
          let tieneNotaValida = false;
          
          try {
            // Verificar si nota existe y no es null/undefined/vacío
            if(d.nota !== null && d.nota !== undefined && d.nota !== '') {
              const notaParsed = typeof d.nota === 'string' ? JSON.parse(d.nota) : d.nota;
              
              if(notaParsed && notaParsed.ventas && Array.isArray(notaParsed.ventas) && notaParsed.ventas.length > 0) {
                ventasDelDeposito = notaParsed.ventas;
                tieneNotaValida = true;
                log(`[FASE 1] Depósito ${d.id}: Extraídas ${ventasDelDeposito.length} ventas del JSON`);
                
                // FASE 2: Recolectar IDs para consulta
                ventasDelDeposito.forEach(venta => {
                  // En Supabase, las ventas en el JSON solo tienen "id"
                  const ventaId = venta.id || venta.idPorCobrar || venta.idHistorico || venta.id_por_cobrar || venta.id_historico;
                  
                  if(ventaId && typeof ventaId === 'string' && ventaId.length > 10) {
                    allVentaIds.add(ventaId);
                  }
                });
                
                ventasPorDeposito.set(d.id, { city, ventas: ventasDelDeposito, deposit: d });
              }
            }
            
            // Si no tiene nota válida, tratar el depósito como una venta individual (compatibilidad con Firebase)
            // El ID del depósito ES el ID de la venta en sales
            if(!tieneNotaValida && d.id) {
              if(d.id && typeof d.id === 'string' && d.id.length > 10) {
                allVentaIds.add(d.id);
                // Crear una venta "sintética" desde el depósito para mantener compatibilidad
                ventasDelDeposito = [{
                  id: d.id,
                  precio: d.precio || d.monto_total || 0,
                  gasto: d.gasto || 0,
                  total: d.total || d.monto_total || 0,
                  fecha: d.fecha || null,
                  sku: d.sku || null,
                  cantidad: d.cantidad || null,
                  ciudad: d.ciudad || d.city || null
                }];
                ventasPorDeposito.set(d.id, { city, ventas: ventasDelDeposito, deposit: d });
                log(`[FASE 1] Depósito ${d.id}: Tratado como venta individual (sin nota)`);
              }
            }
          } catch(err) {
            warn('[FASE 1] Error procesando depósito', d.id, err);
          }
          
          // Convertir created_at de Supabase a timestamp
          if(d.created_at) {
            const timestamp = typeof d.created_at === 'string' ? new Date(d.created_at).getTime() : d.created_at;
            groups[city].createdAts.push(timestamp);
          }
        }
        
        // FASE 2: Consultar sales para obtener datos completos
        let salesDataMap = new Map();
        log(`[FASE 2] Total IDs recolectados: ${allVentaIds.size}`);
        
        // ESTRATEGIA: Los depósitos sin nota tienen IDs que pueden ser:
        // 1. IDs de ventas en sales (si el depósito es una venta individual)
        // 2. deposit_id en sales (si el depósito agrupa múltiples ventas)
        // Necesitamos buscar por ambos campos
        
        if(allVentaIds.size > 0 || deposits.length > 0) {
          try {
            const { supabase } = await import('./supabaseClient.js');
            
            // Obtener todos los IDs de depósitos
            const depositIds = deposits.map(d => d.id).filter(Boolean);
            log(`[FASE 2] Consultando ventas para ${depositIds.length} depósitos`);
            
            if(depositIds.length > 0) {
              // Buscar ventas que tengan deposit_id igual a alguno de los IDs de depósitos
              const chunkSize = 1000;
              for(let i = 0; i < depositIds.length; i += chunkSize) {
                const chunk = depositIds.slice(i, i + chunkSize);
                const { data: salesData, error } = await supabase
                  .from('ventas')
                  .select('*')
                  .in('deposit_id', chunk);
                
                if(error) {
                  console.error('[FASE 2] Error consultando sales por deposit_id:', error);
                } else if(salesData && salesData.length > 0) {
                  log(`[FASE 2] Encontradas ${salesData.length} ventas por deposit_id`);
                  // Normalizar cada venta antes de guardarla
                  salesData.forEach(sale => {
                    const normalized = normalizeSale(sale);
                    salesDataMap.set(normalized.id, normalized);
                    // Mapear por deposit_id para facilitar la búsqueda
                    if(normalized.depositId) {
                      salesDataMap.set(normalized.depositId, normalized);
                    }
                  });
                }
              }
              
              // También buscar por id directo (por si los depósitos son ventas individuales)
              if(allVentaIds.size > 0) {
                const ventaIdsArray = Array.from(allVentaIds);
                for(let i = 0; i < ventaIdsArray.length; i += chunkSize) {
                  const chunk = ventaIdsArray.slice(i, i + chunkSize);
                  const { data: salesData, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .in('id', chunk);
                  
                  if(error) {
                    console.error('[FASE 2] Error consultando sales por id:', error);
                  } else if(salesData && salesData.length > 0) {
                    log(`[FASE 2] Encontradas ${salesData.length} ventas por id`);
                    salesData.forEach(sale => {
                      const normalized = normalizeSale(sale);
                      salesDataMap.set(normalized.id, normalized);
                    });
                  }
                }
              }
            }
            
            log(`[FASE 2] Obtenidos ${salesDataMap.size} registros completos de sales (normalizados)`);
            
            // Debug: Ver todas las claves del Map
            const allMapKeys = Array.from(salesDataMap.keys());
            log('[FASE 2 DEBUG] Claves en salesDataMap:', allMapKeys);
            
            // Debug: Ver primera venta de sales
            if(salesDataMap.size > 0) {
              const primeraSale = Array.from(salesDataMap.values())[0];
              log('[FASE 2 DEBUG] Primera venta de sales:', {
                id: primeraSale.id,
                depositId: primeraSale.depositId,
                horaEntrega: primeraSale.horaEntrega,
                vendedora: primeraSale.vendedora,
                celular: primeraSale.celular,
                metodo: primeraSale.metodo,
                destinoEncomienda: primeraSale.destinoEncomienda,
                precio: primeraSale.precio,
                gasto: primeraSale.gasto,
                total: primeraSale.total
              });
            }
          } catch(err) {
            console.error('[FASE 2] Error en consulta a sales:', err);
          }
        }
        
        // Combinar datos del JSON con datos de sales y normalizar campos (FASE 3)
        log(`[FASE 3] Procesando ${ventasPorDeposito.size} depósitos con ventas`);
        for(const [depositId, { city, ventas, deposit }] of ventasPorDeposito.entries()) {
          ventas.forEach(venta => {
            const ventaId = venta.id || venta.idPorCobrar || venta.idHistorico;
            // Buscar saleData por ventaId o por depositId (los depósitos sin nota tienen depositId = deposit.id)
            let saleData = ventaId ? salesDataMap.get(ventaId) : null;
            // Si no se encontró por ventaId, intentar por depositId
            if(!saleData && depositId) {
              saleData = salesDataMap.get(depositId);
            }
            
            // Debug: Verificar si se encontró saleData
            if(!saleData && (ventaId || depositId)) {
              // Debug más detallado: ver todas las claves y valores del Map
              const allKeys = Array.from(salesDataMap.keys());
              const allValues = Array.from(salesDataMap.values());
              warn(`[FASE 3] No se encontró saleData para ventaId: ${ventaId}, depositId: ${depositId}`, {
                id: venta.id,
                idPorCobrar: venta.idPorCobrar,
                idHistorico: venta.idHistorico,
                saleDataKeys: allKeys.slice(0, 10),
                saleDataValues: allValues.slice(0, 2).map(v => ({
                  id: v.id,
                  depositId: v.depositId,
                  deposit_id: v.deposit_id
                }))
              });
            }
            
            // Combinar: JSON tiene prioridad para campos básicos, sales para campos faltantes
            // saleData ya está normalizado (camelCase)
            const ventaCombinada = {
              ...venta, // Datos del JSON (prioridad)
              ...(saleData ? {
                // Campos de sales que no están en el JSON o están vacíos (usar nombres normalizados)
                hora_entrega: saleData.horaEntrega || venta.hora_entrega || venta.hora || null,
                horaEntrega: saleData.horaEntrega || venta.hora_entrega || venta.hora || null,
                vendedora: saleData.vendedora || venta.vendedora || null,
                celular: saleData.celular || venta.celular || null,
                metodo: saleData.metodo || venta.metodo || null,
                destino_encomienda: saleData.destinoEncomienda || venta.destino_encomienda || venta.destinoEncomienda || null,
                destinoEncomienda: saleData.destinoEncomienda || venta.destino_encomienda || venta.destinoEncomienda || null,
                gasto_cancelacion: saleData.gastoCancelacion || venta.gasto_cancelacion || venta.gastoCancelacion || null,
                gastoCancelacion: saleData.gastoCancelacion || venta.gasto_cancelacion || venta.gastoCancelacion || null,
                motivo: saleData.motivo || venta.motivo || null,
                ciudad: saleData.ciudad || venta.ciudad || deposit.ciudad || null,
                vendedora_id: saleData.vendedoraId || venta.vendedora_id || venta.vendedoraId || null,
                vendedoraId: saleData.vendedoraId || venta.vendedora_id || venta.vendedoraId || null
              } : {}),
              id: ventaId || `temp-${Date.now()}-${Math.random()}`,
              depositId: deposit.id,
              depositFecha: deposit.fecha
            };
            
            // FASE 3: Normalizar campos para la tabla
            const vendedoraValue = ventaCombinada.vendedora || ventaCombinada.vendedor || '';
            const horaValue = ventaCombinada.horaEntrega || ventaCombinada.hora_entrega || ventaCombinada.hora || '';
            
            // Determinar si es cancelada con costo
            // Una venta es cancelada con costo si:
            // 1. estado_entrega === 'cancelado' Y gasto_cancelacion > 0
            // 2. O si ya está marcada como sintetica_cancelada
            const estadoEntrega = ventaCombinada.estado_entrega || ventaCombinada.estadoEntrega || '';
            const gastoCancelacionNum = Number(ventaCombinada.gastoCancelacion || ventaCombinada.gasto_cancelacion || 0);
            const esCanceladaConCosto = (estadoEntrega === 'cancelado' && gastoCancelacionNum > 0) || 
                                         Boolean(ventaCombinada.sinteticaCancelada || ventaCombinada.sintetica_cancelada);
            
            // Calcular total: si es cancelada con costo y tiene gastoCancelacion, total = -gastoCancelacion
            // Si no, usar total explícito o calcular precio - gasto
            let totalCalculado;
            if (esCanceladaConCosto && gastoCancelacionNum > 0) {
              totalCalculado = -gastoCancelacionNum;
            } else if (ventaCombinada.total != null) {
              totalCalculado = Number(ventaCombinada.total);
            } else {
              const precioNum = Number(ventaCombinada.precio || 0);
              const gastoNum = Number(ventaCombinada.gasto || 0);
              totalCalculado = precioNum - gastoNum;
            }
            
            const ventaNormalizada = {
              ...ventaCombinada,
              // Mapear campos de sales a nombres esperados por la tabla
              hora: horaValue,
              vendedor: vendedoraValue, // Para la tabla (firstName(r.vendedor))
              vendedora: vendedoraValue, // Para el formulario de edición (r.vendedora)
              // Desnormalizar ciudad si está normalizada
              ciudad: ventaCombinada.ciudad ? denormalizeCity(ventaCombinada.ciudad) : (ventaCombinada.ciudad || city),
              // Mantener campos originales para compatibilidad
              hora_entrega: horaValue,
              horaEntrega: horaValue,
              // Asegurar que campos numéricos sean números
              precio: Number(ventaCombinada.precio || 0),
              gasto: Number(ventaCombinada.gasto || 0),
              total: totalCalculado, // Usar total calculado (negativo para canceladas con costo)
              cantidad: Number(ventaCombinada.cantidad || 0),
              cantidadExtra: Number(ventaCombinada.cantidad_extra || ventaCombinada.cantidadExtra || 0),
              gastoCancelacion: gastoCancelacionNum > 0 ? gastoCancelacionNum : null,
              gasto_cancelacion: gastoCancelacionNum > 0 ? gastoCancelacionNum : null,
              sinteticaCancelada: esCanceladaConCosto,
              sintetica_cancelada: esCanceladaConCosto,
              estadoEntrega: estadoEntrega,
              estado_entrega: estadoEntrega,
              // Campos de texto
              celular: ventaCombinada.celular || '',
              metodo: ventaCombinada.metodo || '',
              destinoEncomienda: ventaCombinada.destinoEncomienda || ventaCombinada.destino_encomienda || '',
              motivo: ventaCombinada.motivo || '',
              // SKUs
              sku: ventaCombinada.sku || null,
              skuExtra: ventaCombinada.skuExtra || ventaCombinada.sku_extra || null,
              // Flags
              sinteticaCancelada: esCanceladaConCosto
            };
            
            groups[city].rows.push(ventaNormalizada);
          });
        }
        
        // Fallback: si algún depósito no tiene ventas en el JSON, mantenerlo como row
        for(const d of deposits){
          const cityRaw = d.ciudad || d.city || '—';
          const city = denormalizeCity(cityRaw);
          if(!ventasPorDeposito.has(d.id) && groups[city]) {
            groups[city].rows.push({ ...d, id: d.id });
          }
        }
        
        const computeResumen = (rows)=>{
          const ventasSinteticas = rows.filter(r=> !r.sinteticaCancelada && products.find(p=>p.sku===r.sku)?.sintetico).length;
          const ventasConfirmadas = rows.filter(r=> !r.sinteticaCancelada && !products.find(p=>p.sku===r.sku)?.sintetico).length;
          const canceladasConCosto = rows.filter(r=> r.sinteticaCancelada).length;
          const productTotals = {};
          rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) productTotals[r.sku]=(productTotals[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) productTotals[r.skuExtra]=(productTotals[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
          const totalMonto = rows.reduce((a,r)=> a + Number(r.total||0),0);
          const totalDelivery = rows.reduce((a,r)=> a + Number(r.gasto||0),0);
          const totalNeto = rows.reduce((a,r)=> a + Number(r.total||0),0);
          return { ventasConfirmadas, ventasSinteticas, canceladasConCosto, totalPedidos: ventasConfirmadas+ventasSinteticas+canceladasConCosto, totalMonto, totalDelivery, totalNeto, productos: productTotals };
        };
        
        const snapshots = Object.values(groups).map(g=> ({
          id: g.city, // id lógico por ciudad
          city: g.city,
          timestamp: g.createdAts.length? Math.min(...g.createdAts): Date.now(),
          rows: g.rows,
          resumen: computeResumen(g.rows)
        }));
        
        log(`[FASE 3] Snapshots generados:`, snapshots.length, 'ciudades,', snapshots.reduce((sum, s) => sum + s.rows.length, 0), 'ventas totales');
        
        // Debug: Verificar datos de la primera venta
        if(snapshots.length > 0 && snapshots[0].rows.length > 0) {
          const primeraVenta = snapshots[0].rows[0];
          log('[DEBUG] Primera venta del primer snapshot:', {
            id: primeraVenta.id,
            fecha: primeraVenta.fecha,
            hora: primeraVenta.hora,
            ciudad: primeraVenta.ciudad,
            vendedor: primeraVenta.vendedor,
            vendedora: primeraVenta.vendedora,
            celular: primeraVenta.celular,
            precio: primeraVenta.precio,
            gasto: primeraVenta.gasto,
            total: primeraVenta.total,
            sku: primeraVenta.sku,
            cantidad: primeraVenta.cantidad,
            metodo: primeraVenta.metodo,
            destinoEncomienda: primeraVenta.destinoEncomienda,
            horaEntrega: primeraVenta.horaEntrega,
            hora_entrega: primeraVenta.hora_entrega
          });
        }
        
        setDepositSnapshots(snapshots);
      })(); // Cerrar IIFE async
    }, {
      filters: { estado: 'pendiente' }
    });
    return () => unsub();
  }, [view, products]);

  // Mostrar saludo motivacional una vez al día (vendedoras y admin) usando Supabase
  useEffect(()=>{
    if(!session) return;
    
    (async function showGreeting() {
      try {
        console.log('[Greeting] Verificando si debe mostrarse el saludo...', { userId: session.id, rol: session.rol });
        
        // Verificar si ya vio el saludo hoy (usando Supabase)
        const { data: alreadySeen, error: checkError } = await hasUserSeenGreetingToday(session.id);
        
        if (checkError) {
          console.error('[Greeting] Error verificando si ya vio el saludo:', checkError);
          // Continuar intentando mostrar el saludo aunque haya error
        } else if (alreadySeen) {
          console.log('[Greeting] Ya se mostró el saludo hoy');
          return; // Ya mostrado hoy
        }
        
        console.log('[Greeting] No se ha mostrado hoy, obteniendo frase...');
        
        // Obtener próxima frase del pool (usando Supabase)
        const { data: phraseData, error: phraseError } = await getNextPhraseForUser(session.id);
        
        if (phraseError) {
          console.error('[Greeting] Error obteniendo frase:', phraseError);
          return;
        }
        
        if (!phraseData || !phraseData.phrase_text) {
          console.log('[Greeting] NO se mostrará el modal porque no hay frase disponible');
          return;
        }
        
        console.log('[Greeting] Frase obtenida correctamente:', phraseData);
        
        // Saludo según hora Bolivia
        const h = horaBolivia();
        const saludo = h < 12 ? 'Buenos días' : (h < 18 ? 'Buenas tardes' : 'Buenas noches');
        const nombre = (session.nombre||'').split(' ')[0];
        
        console.log('[Greeting] Mostrando saludo:', { saludo, nombre, frase: phraseData.phrase_text, phraseId: phraseData.phrase_id });
        
        // Mostrar el saludo
        setGreeting({ 
          saludo, 
          nombre: nombre.toUpperCase(), 
          frase: phraseData.phrase_text,
          phraseId: phraseData.phrase_id 
        });
        
        // Registrar en Supabase que vio el saludo (async, no bloquea)
        try {
          const { error: logError } = await logUserGreeting(session.id, phraseData.phrase_id, phraseData.phrase_text, saludo);
          if (logError) {
            console.error('[Greeting] Error registrando saludo:', logError);
            // No afecta la visualización del saludo
          } else {
            console.log('[Greeting] Saludo registrado correctamente en Supabase');
          }
        } catch (err) {
          console.error('[Greeting] Error fatal registrando saludo:', err);
        }
        
      } catch (err) {
        console.error('[Greeting] Error fatal:', err);
      }
    })();
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

  // Sincroniza productos en tiempo real desde Firestore (colección almacenCentral)
  useEffect(() => {
    const unsub = subscribeCollection('almacenCentral', setProducts);
    return () => unsub();
  }, []);

  // Suscripción en tiempo real a cityStock (ejemplo: puedes guardar en un estado aparte)
  const [cityStock, setCityStock] = useState([]);
  useEffect(() => {
    const unsub = subscribeCollection('cityStock', setCityStock);
    return () => unsub();
  }, []);
  // Suscripción en tiempo real a despachos y despachosHistorial usando subscribeCollection
  const [despachos, setDespachos] = useState([]);
  const [despachosHistorial, setDespachosHistorial] = useState([]);
  useEffect(() => {
    const unsubPend = subscribeCollection('despachos', setDespachos);
    const unsubHist = subscribeCollection('despachosHistorial', setDespachosHistorial);
    return () => { unsubPend(); unsubHist(); };
  }, []);
  // Combinar y ordenar para setDispatches (eliminando duplicados por ID)
  useEffect(() => {
    // Filtrar despachos: solo pendientes
    const pendientes = despachos.filter(d => (d.status || 'pendiente') === 'pendiente');
    // Filtrar historial: solo confirmados
    const confirmados = despachosHistorial
      .filter(d => (d.status || 'confirmado') === 'confirmado')
      .map(d => ({...d, status: 'confirmado'}));
    
    // Combinar y eliminar duplicados por ID
    const allMap = new Map();
    [...pendientes, ...confirmados].forEach(d => {
      if (d.id && !allMap.has(d.id)) {
        allMap.set(d.id, d);
      }
    });
    const all = Array.from(allMap.values());
    all.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));
    setDispatches(all);
  }, [despachos, despachosHistorial]);
  useEffect(() => saveLS(LS_KEYS.users, users), [users]);
  useEffect(() => saveLS(LS_KEYS.sales, sales), [sales]);
  useEffect(() => saveLS(LS_KEYS.session, session), [session]);
  useEffect(() => saveLS(LS_KEYS.warehouseDispatches, dispatches), [dispatches]);
  useEffect(() => saveLS(LS_KEYS.numeros, numbers), [numbers]);
  useEffect(() => saveLS(LS_KEYS.teamMessages, teamMessages), [teamMessages]);

  // Suscripción en tiempo real a la colección 'users' de Supabase.
  // Si Supabase devuelve 0 (por permisos o vacío) mantenemos el estado local existente.
  useEffect(() => {
    if(!session) return; // sólo cuando hay sesión activa
    try {
      const unsub = subscribeUsers((list) => {
        setUsers(prev => (list && list.length ? list : prev));
      });
      return () => unsub();
    } catch(err){
      warn('No se pudo suscribir a users Supabase', err);
    }
  }, [session]);

  // Auto logout por inactividad eliminado: se desactiva completamente para no cerrar sesión automáticamente.

  // Persist view when changes
  useEffect(()=>{ try { localStorage.setItem('ui.view', view); } catch {} }, [view]);

  if (!session) return <Auth onLogin={(s)=>{ setSession(s); navigate('dashboard'); }} users={users} products={products} />;

  return (
  <div className="min-h-screen bg-[#121f27] text-neutral-100 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Barra superior móvil */}
      <MobileTopBar />
      {/* Overlay móvil para menú */}
      {showMobileNav && <div onClick={()=>setShowMobileNav(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden z-30"></div>}
      <Sidebar 
        session={session} 
        onLogout={() => { try { localStorage.removeItem(LS_KEYS.session); } catch{}; setSession(null); setView('dashboard'); }} 
        view={view} 
        setView={navigate} 
        showMobileNav={showMobileNav}
        setShowMobileNav={setShowMobileNav}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      {/* Mensajes de equipo (botón flotante) - FUERA del overflow para que funcione el fixed */}
      {view === 'dashboard' && (
        <TeamMessagesWidget session={session} users={users} teamMessages={teamMessages} setTeamMessages={setTeamMessages} />
      )}
      {/* Transición animada entre pantallas principales en móvil */}
  <div className={`flex-1 relative pb-16 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-14' : 'md:ml-0'} overflow-y-auto`}> 
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative w-full pb-safe"
            >
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
                historicoHoy={historicoHoy}
                ventasAll={ventasAll}
                editingReceipt={editingReceipt}
                setEditingReceipt={setEditingReceipt}
                receiptTemp={receiptTemp}
                setReceiptTemp={setReceiptTemp}
                receiptFile={receiptFile}
                setReceiptFile={setReceiptFile}
                uploadingReceipt={uploadingReceipt}
                setUploadingReceipt={setUploadingReceipt}
                onOpenReceipt={(sale)=> sale?.comprobante && setViewingReceipt({ id:sale.id, data:sale.comprobante })}
                onEditReceipt={(sale)=> { setEditingReceipt(sale); setReceiptTemp(sale.comprobante||null); setReceiptFile(null); }}
              />
            </motion.div>
          )}
          {view === 'historial' && session.rol === 'admin' && (
            <motion.div
              key="historial"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative w-full overflow-y-auto pb-24 md:pb-safe"
            >
              <HistorialView
                sales={sales}
                products={products}
                session={session}
                users={users}
                onOpenReceipt={(sale) => sale?.comprobante && setViewingReceipt({ id: sale.id, data: sale.comprobante })}
                onGoDeposit={() => setView('deposit')}
              />
            </motion.div>
          )}
          {view === 'ventas' && (
            <motion.div
              key="ventas"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <VentasView sales={sales} setSales={setSales} products={products} session={session} users={users} dispatches={dispatches} setDispatches={setDispatches} setProducts={setProducts} setView={navigate} setDepositSnapshots={setDepositSnapshots} />
            </motion.div>
          )}
          {view === 'deposit' && session.rol==='admin' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <DepositConfirmView snapshots={depositSnapshots} setSnapshots={setDepositSnapshots} products={products} setSales={setSales} users={users} onBack={()=> setView('historial')} />
            </motion.div>
          )}
          {view === 'almacen' && session.rol === 'admin' && (
            <motion.div
              key="almacen"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <AlmacenView products={products} setProducts={setProducts} dispatches={dispatches} setDispatches={setDispatches} session={session} setConfirmModal={setConfirmModal} />
            </motion.div>
          )}
          {view === 'register-sale' && (
            <motion.div
              key="register-sale"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <div className="relative w-full h-full flex flex-col bg-[#121f27]">
                <RegisterSaleView products={products} setProducts={setProducts} sales={sales} setSales={setSales} session={session} dispatches={dispatches} />
                {/* Anti-flash fondo blanco en extremos inferiores iOS/Android */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#121f27]"></div>
              </div>
            </motion.div>
          )}
          {view === 'create-user' && (
            <motion.div
              key="create-user"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <CreateUserAdmin users={users} setUsers={setUsers} session={session} products={products} />
            </motion.div>
          )}
          {view === 'products' && session.rol === 'admin' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <ProductsView products={products} setProducts={setProducts} session={session} />
            </motion.div>
          )}
          {view === 'frases' && session.rol === 'admin' && (
            <motion.div
              key="frases"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <FrasesView />
            </motion.div>
          )}
          {view === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
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
              />
            </motion.div>
          )}
          {view === 'mis-numeros' && (
            <motion.div
              key="mis-numeros"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <MisNumerosView products={products} numbers={numbers} setNumbers={setNumbers} />
            </motion.div>
          )}
          {view === 'whatsapp-test' && session.rol === 'admin' && (
            <div
              key="whatsapp-test"
              className="w-full"
            >
              <MessageSenderTest />
            </div>
          )}
          {view === 'whatsapp-accounts' && session.rol === 'admin' && (
            <motion.div
              key="whatsapp-accounts"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <WhatsAppAccountManager session={session} />
            </motion.div>
          )}
          {view === 'whatsapp-dashboard' && session.rol === 'admin' && (
            <motion.div
              key="whatsapp-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden"
              style={{ height: '100%', minHeight: '100%', maxHeight: '100%' }}
            >
              <WhatsAppDashboard session={session} />
            </motion.div>
          )}
          {view === 'whatsapp-sequences' && session.rol === 'admin' && (
            <motion.div
              key="whatsapp-sequences"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 pb-safe"
            >
              <CRM session={session} />
            </motion.div>
          )}
          {view === 'whatsapp-queue' && session.rol === 'admin' && (
            <motion.div
              key="whatsapp-queue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pb-safe"
            >
              <PuppeteerQueuePanel session={session} />
            </motion.div>
          )}
          {view === 'whatsapp-blocked' && session.rol === 'admin' && (
            <motion.div
              key="whatsapp-blocked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pb-safe"
            >
              <BlockedContactsPanel session={session} />
            </motion.div>
          )}

        </AnimatePresence>
        {/* Barra inferior móvil persistente fuera de las vistas animadas para no desmontarse */}
        <MobileBottomNav view={view} setView={navigate} />
      </div>
      {/* Modal de saludo motivacional */}
      <AnimatePresence>
        {greeting && (
          <Modal
            onClose={() => setGreeting(null)}
            disableClose={!greetingCloseReady}
            autoWidth
          >
            <div className="space-y-4 w-full max-w-[480px] px-1">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#e7922b] mb-2">
                  {greeting.saludo}
                </h2>
                <p className="text-lg text-neutral-300 font-semibold mb-4">
                  {greeting.nombre}
                </p>
              </div>
              <div className="bg-[#0f171e] rounded-xl p-6 border border-[#e7922b]/30">
                <p className="text-neutral-200 text-center text-base leading-relaxed italic">
                  "{greeting.frase}"
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setGreeting(null)}
                  disabled={!greetingCloseReady}
                  className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
                    greetingCloseReady
                      ? 'bg-[#e7922b] text-[#1a2430] hover:brightness-110 active:scale-95 cursor-pointer'
                      : 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {greetingCloseReady ? 'Continuar' : 'Espera un momento...'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Modales globales de comprobantes */}
      <AnimatePresence>
        {/* TABLA_LUPA_DETALLE_ENTREGA: modal que aparece al hacer click en la lupa de una entrega confirmada */}
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
          <Modal onClose={()=>{ setEditingReceipt(null); setReceiptTemp(null); setReceiptFile(null); }}>
            <div className="space-y-4 w-full max-w-[400px] px-1">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Upload className="w-4 h-4" /> Comprobante (QR)</h3>
              <div className="space-y-2 text-xs">
                <div className="text-neutral-400">Venta: <span className="font-semibold text-neutral-200">{editingReceipt.id.slice(-6)}</span></div>
                <input type="file" accept="image/*,.pdf" onChange={e=>{
                  const f = e.target.files?.[0];
                  if(!f){ 
                    setReceiptTemp(editingReceipt.comprobante||null); 
                    setReceiptFile(null);
                    return; 
                  }
                  if(f.size > 2*1024*1024){ toast.push({ type: 'error', title: 'Error', message: 'Archivo supera 2MB' }); return; }
                  // Guardar el File original
                  setReceiptFile(f);
                  // Crear preview base64
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
                {!receiptTemp && editingReceipt.comprobante && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/40">
                    {/^data:application\/pdf/.test(editingReceipt.comprobante) ? (
                      <a href={editingReceipt.comprobante} target="_blank" rel="noreferrer" className="text-[10px] underline text-[#e7922b]">Ver comprobante actual (PDF)</a>
                    ) : (
                      <img src={editingReceipt.comprobante} alt="Comprobante actual" className="max-h-40 mx-auto object-contain" />
                    )}
                  </div>
                )}
                {!receiptTemp && !editingReceipt.comprobante && <div className="text-[10px] text-neutral-500">No hay comprobante cargado.</div>}
                <div className="text-[10px] text-neutral-500">Tamaño máximo 2MB. Se subirá a Supabase Storage.</div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setEditingReceipt(null); setReceiptTemp(null); setReceiptFile(null); }} disabled={uploadingReceipt} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Cerrar</button>
                <button disabled={!receiptFile || uploadingReceipt} onClick={async ()=>{
                  if(!receiptFile){ toast.push({ type: 'error', title: 'Error', message: 'Selecciona un archivo' }); return; }
                  if(uploadingReceipt) return; // Guard contra doble ejecución
                  
                  setUploadingReceipt(true);
                  
                  // Guardar estado anterior para rollback
                  const previousSales = [...sales];
                  const previousReceipt = editingReceipt.comprobante || null;
                  const currentEditingReceipt = editingReceipt;
                  const currentReceiptFile = receiptFile;
                  
                  try {
                    // ACTUALIZACIÓN OPTIMISTA: Actualizar estado local inmediatamente con el preview temporal
                    setSales(prev => prev.map(s=> s.id===editingReceipt.id ? { ...s, comprobante: receiptTemp } : s));
                    
                    // Cerrar modal inmediatamente para mejor UX
                    setEditingReceipt(null);
                    setReceiptTemp(null);
                    setReceiptFile(null);
                    
                    // Comprimir si es imagen (PDFs se manejan directamente)
                    let fileToUpload = currentReceiptFile;
                    if (currentReceiptFile.type.startsWith('image/')) {
                      fileToUpload = await compressImage(currentReceiptFile, 60, 500);
                    }
                    
                    // Subir a Supabase Storage
                    const result = await uploadComprobanteToSupabase(fileToUpload, 'comprobantes');
                    const comprobanteUrl = result.url || result.secure_url;
                    
                    // Actualizar en la tabla ventas
                    const { error } = await supabase
                      .from('ventas')
                      .update({ comprobante: comprobanteUrl })
                      .eq('id', currentEditingReceipt.id);
                    
                    if (error) {
                      throw new Error(`Error actualizando comprobante: ${error.message}`);
                    }
                    
                    // Reemplazar preview temporal con la URL real de Supabase
                    setSales(prev => prev.map(s=> s.id===currentEditingReceipt.id ? { ...s, comprobante: comprobanteUrl } : s));
                    
                    toast.push({ type: 'success', title: 'Éxito', message: 'Comprobante subido correctamente' });
                  } catch (err) {
                    // ROLLBACK: Revertir actualización optimista si falla
                    console.error('[Dashboard] Error subiendo comprobante:', err);
                    setSales(previousSales);
                    // Reabrir modal con datos anteriores
                    setEditingReceipt({ ...currentEditingReceipt, comprobante: previousReceipt });
                    setReceiptTemp(previousReceipt);
                    setReceiptFile(currentReceiptFile);
                    toast.push({ type: 'error', title: 'Error', message: 'Error al subir comprobante: ' + (err?.message || 'Error desconocido') });
                  } finally {
                    setUploadingReceipt(false);
                  }
                }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs disabled:opacity-40">
                  {uploadingReceipt ? 'Subiendo...' : 'Guardar'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Vista de depósito ahora es pantalla dedicada (ver view === 'deposit') */}
      
      {/* Modales globales de confirmación y error (FASE 7.3) */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar', cancelText: 'Cancelar', confirmColor: 'red', isLoading: false })}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar', cancelText: 'Cancelar', confirmColor: 'red', isLoading: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmColor={confirmModal.confirmColor}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}

// ---------------------- Frases Motivacionales ----------------------
function FrasesView(){
  const [frases, setFrases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  
  const loadPhrases = async () => {
    try {
      setLoading(true);
      const { getAllPhrases } = await import('./services/motivationalPhrases');
      const { data, error } = await getAllPhrases();
      if (error) {
        console.error('[FrasesView] Error cargando frases:', error);
        toast.push({ type: 'error', title: 'Error', message: 'Error al cargar frases: ' + (error?.message || 'Error desconocido') });
        setFrases([]);
      } else {
        setFrases(data || []);
      }
    } catch (err) {
      console.error('[FrasesView] Error fatal:', err);
      toast.push({ type: 'error', title: 'Error', message: 'Error fatal al cargar frases' });
      setFrases([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadPhrases();
  }, []);
  
  const handleEdit = (frase) => {
    setEditingId(frase.id);
    setEditText(frase.phrase_text);
  };
  
  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };
  
  const handleSave = async () => {
    if (!editText.trim()) {
      toast.push({ type: 'error', title: 'Error', message: 'La frase no puede estar vacía' });
      return;
    }
    
    if (saving) return;
    
    try {
      setSaving(true);
      const { updatePhrase } = await import('./services/motivationalPhrases');
      const { data, error } = await updatePhrase(editingId, { phrase_text: editText.trim() });
      
      if (error) {
        console.error('[FrasesView] Error actualizando frase:', error);
        toast.push({ type: 'error', title: 'Error', message: 'Error al actualizar frase: ' + (error?.message || 'Error desconocido') });
      } else {
        toast.push({ type: 'success', title: 'Éxito', message: 'Frase actualizada correctamente' });
        setEditingId(null);
        setEditText('');
        // Recargar frases para reflejar los cambios
        await loadPhrases();
      }
    } catch (err) {
      console.error('[FrasesView] Error fatal actualizando frase:', err);
      toast.push({ type: 'error', title: 'Error', message: 'Error fatal al actualizar frase' });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Frases motivacionales</h2>
      </header>
      {loading ? (
        <div className="text-center text-neutral-400 py-8">Cargando frases...</div>
      ) : frases.length === 0 ? (
        <div className="text-center text-neutral-400 py-8">No hay frases disponibles</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frases.map((fr)=>(
            <div key={fr.id} className="relative p-4 rounded-xl bg-[#0f171e] border border-neutral-800 text-sm leading-snug text-neutral-200 shadow group">
              {editingId === fr.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-[#e7922b] resize-none"
                    rows={3}
                    disabled={saving}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-neutral-700 text-xs text-neutral-300 hover:bg-neutral-600 disabled:opacity-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !editText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#e7922b] text-xs text-[#1a2430] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin">⏳</span> Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> Guardar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="pr-8">"{fr.phrase_text}"</p>
                  <button
                    onClick={() => handleEdit(fr)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-800/70 opacity-0 group-hover:opacity-100 hover:bg-neutral-700 transition-all text-neutral-400 hover:text-[#e7922b]"
                    title="Editar frase"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------- Configuración (cambiar contraseña) ----------------------
function ConfigView({ session, users, setUsers, setSession, setProducts, setSales, setDispatches, setNumbers, setTeamMessages, setDepositSnapshots, setView }) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repite, setRepite] = useState('');
  const [msg, setMsg] = useState('');

  async function cambiar(e){
    e.preventDefault();
    setMsg('');
    if(!nueva || nueva.length < 6){ setMsg('La nueva debe tener al menos 6 caracteres'); return; }
    if(nueva !== repite){ setMsg('Las contraseñas no coinciden'); return; }
    try {
      const { changePassword } = await import('./supabaseAuthUtils');
      const result = await changePassword(nueva);
      if (result.error) {
        throw new Error(result.error.message || 'No se pudo cambiar la contraseña');
      }
      setActual(''); setNueva(''); setRepite('');
      setMsg('Contraseña actualizada');
    } catch (err) {
      setMsg('Error: ' + (err?.message || 'No se pudo cambiar la contraseña.'));
    }
  }

  function resetAll(){
    if(!session || session.rol!== 'admin') { toast.push({ type: 'error', title: 'Error', message: 'Solo admin' }); return; }
    if(resetConfirm !== 'BORRAR') { toast.push({ type: 'error', title: 'Error', message: 'Debes escribir BORRAR para confirmar.' }); return; }
    setShowResetModal(true);
  }

  function confirmResetAll() {
    setShowResetModal(false);
    setResetConfirm("");
    try {
      setSales([]);
      setProducts([]);
      setUsers(prev=> prev.filter(u=> u.rol==='admin'));
      setDispatches([]);
      setNumbers([]);
      setTeamMessages([]);
      setDepositSnapshots([]);
      const prefix = 'ventas.';
      const keep = new Set(['ventas.session']);
      const toRemove = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(!k) continue;
        if(k.startsWith(prefix) && !keep.has(k)) toRemove.push(k);
      }
      toRemove.forEach(k=> localStorage.removeItem(k));
      localStorage.removeItem('ui.view');
      localStorage.removeItem('ui.cityFilter');
      toast.push({ type: 'success', title: 'Éxito', message: 'Datos borrados. El sistema está limpio.' });
      setView('dashboard');
    } catch(e){ console.error(e); toast.push({ type: 'error', title: 'Error', message: 'Error al borrar datos' }); }
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
            <div className="mb-2">
              <label className="block text-xs text-neutral-400 mb-1">Escribe <b>BORRAR</b> para confirmar:</label>
              <input type="text" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm mb-2" placeholder="BORRAR" />
            </div>
            <button
              onClick={resetAll}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm w-full"
              disabled={resetConfirm !== 'BORRAR'}
              style={{ opacity: resetConfirm === 'BORRAR' ? 1 : 0.5 }}
            >Borrar todo (Irreversible)</button>
            <AnimatePresence>
              {showResetModal && (
                <Modal onClose={()=>setShowResetModal(false)} disableClose>
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-red-500">¿Estás seguro?</h2>
                    <p className="text-neutral-300 text-sm">Esta acción eliminará <b>toda</b> la información del sistema y no se puede deshacer.</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>setShowResetModal(false)} className="px-4 py-2 rounded-xl bg-neutral-700 text-white">Cancelar</button>
                      <AsyncButton
                        onClick={async ()=> { await confirmResetAll(); }}
                        busyText="Borrando..."
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                      >
                        Sí, borrar todo
                      </AsyncButton>
                    </div>
                  </div>
                </Modal>
              )}
            </AnimatePresence>
          </div>
        )}
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
          <div className="flex items-center justify-center gap-3 mb-4 text-center">
            <LogIn className="w-5 h-5" />
            <h1 className="text-xl font-semibold text-[#ea9216]">Maya Ventas</h1>
          </div>
          <LoginForm users={users} onLogin={onLogin} />
          {/* ...existing code... */}
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
  
  // Normalizar email a minúsculas cuando cambia (usando handler en lugar de useEffect para evitar loops)
  const handleEmailChange = (e) => {
    const value = e.target.value.toLowerCase().trim();
    setEmail(value);
  };

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      // Usar Supabase Auth
      const { loginUser } = await import("./supabaseAuthUtils");
      const authUser = await loginUser(email, password);
      
      if (!authUser || !authUser.uid) {
        throw new Error("Credenciales incorrectas");
      }
      
      // Buscar datos extra en Supabase - primero por id directo, luego por username
      let userData = null;
      let userError = null;
      
      // Buscar por id directo (el id de auth.users coincide con el id de users)
      const { data: userById, error: errorById } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.uid)
        .maybeSingle();
      
      if (errorById) {
        warn('[loginUser] Error buscando usuario por id:', errorById);
        userError = errorById;
      } else if (userById) {
        userData = userById;
      }
      
      // Si no se encuentra por id, buscar por username (email sin dominio)
      // Normalizar a minúsculas para búsqueda case-insensitive
      if (!userData) {
        const usernameFromEmail = (email.includes('@') ? email.split('@')[0] : email).toLowerCase().trim();
        const { data: userByUsername, error: errorByUsername } = await supabase
          .from('users')
          .select('*')
          .ilike('username', usernameFromEmail) // ilike es case-insensitive
          .maybeSingle();
        
        if (errorByUsername) {
          warn('[loginUser] Error buscando usuario por username:', errorByUsername);
        } else if (userByUsername) {
          userData = userByUsername;
        }
      }
      
      let userInfo = { 
        id: userData?.id || authUser.uid, 
        nombre: userData?.nombre || authUser.email?.split('@')[0] || '', 
        username: userData?.username || authUser.email?.split('@')[0] || authUser.email || '', 
        rol: userData?.rol || 'seller', 
        productos: userData?.productos || [], 
        grupo: userData?.grupo || '',
        apellidos: userData?.apellidos || '',
        celular: userData?.celular || '',
        sueldo: userData?.sueldo || 0,
        diaPago: userData?.dia_pago || null,
        fechaIngreso: userData?.fecha_ingreso || new Date().toISOString().split('T')[0]
      };
      
      if (userData && !userError) {
        userInfo = { ...userInfo, ...userData };
      }
      
      onLogin(userInfo);
    } catch (error) {
      const errorMessage = error?.message || 'Error desconocido';
      console.error('[Login] Error completo:', error);
      
      // Mensajes de error más específicos
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Email not confirmed')) {
        setErr("ERROR DE CREDENCIALES PARA USUARIO " + email.toUpperCase());
      } else if (errorMessage.includes('User not found')) {
        setErr("Usuario no encontrado. Verifica que el usuario exista en Supabase Auth.");
      } else {
        setErr("ERROR DE CREDENCIALES PARA USUARIO " + email.toUpperCase() + ": " + errorMessage);
      }
    }
  }

  return (
  <form onSubmit={submit} className="space-y-3">
  <div>
    <label className="text-sm">Usuario</label>
    <div className="flex items-center mt-1">
      <input
        value={email}
        onChange={handleEmailChange}
        className="flex-1 bg-[#3a4750] rounded-l-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ea9216] border-r-0"
        placeholder="usuario"
        autoComplete="username"
      />
  <span className="bg-[#3a4750] rounded-r-xl px-2 py-2 text-neutral-400 border-l border-[#232b32] text-sm select-none" style={{display:'none'}}>@mayalife.shop</span>
    </div>
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
function Sidebar({ session, onLogout, view, setView, showMobileNav, setShowMobileNav, collapsed, setCollapsed }) {
  const [openOps, setOpenOps] = React.useState(true);
  const [openAdmin, setOpenAdmin] = React.useState(true);
  const [openConfig, setOpenConfig] = React.useState(true);
  // Asegurar que en móvil siempre esté expandido cuando se abre el menú
  React.useEffect(()=>{
    if(showMobileNav && collapsed){
      setCollapsed(false);
    }
  }, [showMobileNav, collapsed, setCollapsed]);
  return (
    <>
      {/* Pestañita/logo cuando está colapsado en desktop */}
      {collapsed && (
        <button
          className="hidden md:flex fixed top-4 left-0 z-50 w-12 h-12 bg-[#273947] rounded-r-2xl shadow-lg items-center justify-center transition-all duration-300"
          style={{ border: 'none' }}
          onClick={()=>setCollapsed(false)}
        >
          <img
            src={LOGO_URL}
            alt="Logo Maya Ventas"
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => { e.currentTarget.src = '/favicon.png'; }}
            loading="lazy"
          />
        </button>
      )}
      <aside
        className={`md:fixed md:top-0 md:left-0 md:h-screen md:z-40 bg-[#273947] border-r border-[#0f171e] p-4 flex flex-col gap-4 md:transition-all md:duration-300 md:ease-in-out ${collapsed ? 'md:-translate-x-[90%] md:w-14 md:overflow-visible' : 'md:w-[250px] lg:w-[280px] md:translate-x-0'} w-full md:block ${showMobileNav ? 'fixed inset-0 z-40 overflow-y-auto mobile-sidebar-enter-active' : 'hidden mobile-sidebar-leave-active'} md:flex`}
        style={{ transition: 'max-height 0.35s cubic-bezier(.4,0,.2,1), opacity 0.25s, transform 0.35s' }}
      >
        {/* Botón para colapsar en desktop */}
        {!collapsed && (
          <button
            className="hidden md:flex absolute top-4 right-[-18px] w-8 h-8 bg-[#273947] rounded-full shadow items-center justify-center border border-[#0f171e]"
            style={{ zIndex: 51 }}
            onClick={()=>setCollapsed(true)}
            title="Colapsar menú"
          >
            <img
              src={LOGO_URL}
              alt="Logo Maya Ventas"
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => { e.currentTarget.src = '/favicon.png'; }}
              loading="lazy"
            />
          </button>
        )}
      {/* Cerrar en móvil */}
      <div className="md:hidden flex items-center justify-between mb-2">
        <div className="font-semibold tracking-wide text-[#e7922b]">MENÚ</div>
        <button onClick={()=>setShowMobileNav(false)} className="p-2 rounded-lg bg-neutral-800/70"><X className="w-5 h-5" /></button>
      </div>
  {(!collapsed || showMobileNav) && (
        <div className="flex items-center gap-3">
          <img
            src={LOGO_URL}
            alt="Logo Maya Ventas"
            className="w-10 h-10 rounded-2xl object-cover"
            onError={(e) => { e.currentTarget.src = '/favicon.png'; }}
          />
          <div>
            <div className="font-semibold leading-tight">Maya Ventas</div>
            <div className="text-xs text-neutral-400">{session.nombre}</div>
          </div>
        </div>
      )}
  {(!collapsed || showMobileNav) && (
        <>
          <nav className="text-sm flex-1 space-y-3">
            {/* Operaciones */}
            <div>
              <button onClick={()=>setOpenOps(o=>!o)} className="w-full flex items-center justify-between text-xs tracking-wide text-neutral-300 px-1 btn-animated">
                <span className="uppercase">Operaciones</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openOps? 'rotate-180':''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openOps && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-1 mt-2"
                  >
                    <button onClick={() => { setView('dashboard'); if (showMobileNav) setShowMobileNav(false); if (window.innerWidth >= 768 && !showMobileNav) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='dashboard'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><TrendingUp className={"w-4 h-4 "+(view==='dashboard'? 'text-[#273947]' : 'text-white')} /> Dashboard</button>
                    <button onClick={() => { setView('ventas'); if (showMobileNav) setShowMobileNav(false); if (window.innerWidth >= 768 && !showMobileNav) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='ventas'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><CircleDollarSign className={"w-4 h-4 "+(view==='ventas'? 'text-[#273947]' : 'text-white')} /> Ventas</button>
                    <button onClick={() => { setView('register-sale'); if (showMobileNav) setShowMobileNav(false); if (window.innerWidth >= 768 && !showMobileNav) setCollapsed(true); }} className={"w-full flex items-center gap-2 p-2 rounded-xl text-left transition btn-animated "+(view==='register-sale'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><ShoppingCart className={"w-4 h-4 "+(view==='register-sale'? 'text-[#273947]' : 'text-white')} /> Registrar Venta</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Administración */}
            {session.rol==='admin' && (
              <div>
                <button onClick={()=>setOpenAdmin(o=>!o)} className="w-full flex items-center justify-between text-xs tracking-wide text-neutral-300 px-1 btn-animated">
                  <span className="uppercase">Administración</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openAdmin? 'rotate-180':''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openAdmin && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-1 mt-2"
                    >
                      <button onClick={() => { setView('historial'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='historial'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><History className={"w-4 h-4 "+(view==='historial'? 'text-[#273947]' : 'text-white')} /> Historial</button>
                      <button onClick={() => { setView('almacen'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='almacen'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='almacen'? 'text-[#273947]' : 'text-white')} /> Despacho de Productos</button>
                      <button onClick={() => { setView('products'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full flex items-center gap-2 p-2 rounded-xl text-left transition btn-animated "+(view==='products'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Package className={"w-4 h-4 "+(view==='products'? 'text-[#273947]' : 'text-white')} /> Almacen Central</button>
                      <button onClick={() => { setView('create-user'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='create-user'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><UserPlus className={"w-4 h-4 "+(view==='create-user'? 'text-[#273947]' : 'text-white')} /> Usuarios</button>
                      {session.rol === 'admin' && <button onClick={() => { setView('frases'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='frases'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><BookOpen className={"w-4 h-4 "+(view==='frases'? 'text-[#273947]' : 'text-white')} /> 📚 Frases</button>}
                      <button onClick={() => { setView('whatsapp-accounts'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-accounts'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-accounts'? 'text-[#273947]' : 'text-white')} /> WhatsApp</button>
                      {session.rol === 'admin' && <button onClick={() => { setView('whatsapp-sequences'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-sequences'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-sequences'? 'text-[#273947]' : 'text-white')} /> 📋 CRM</button>}
                      {session.rol === 'admin' && <button onClick={() => { setView('whatsapp-dashboard'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-dashboard'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-dashboard'? 'text-[#273947]' : 'text-white')} /> 💬 Chat WhatsApp</button>}
                      {session.rol === 'admin' && <button onClick={() => { setView('whatsapp-queue'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-queue'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-queue'? 'text-[#273947]' : 'text-white')} /> 📋 Cola Puppeteer</button>}
                      {session.rol === 'admin' && <button onClick={() => { setView('whatsapp-blocked'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-blocked'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-blocked'? 'text-[#273947]' : 'text-white')} /> 🚫 Contactos Bloqueados</button>}
                      {session.rol === 'admin' && <button onClick={() => { setView('whatsapp-test'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full text-left flex items-center gap-2 p-2 rounded-xl transition btn-animated "+(view==='whatsapp-test'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><MessageSquare className={"w-4 h-4 "+(view==='whatsapp-test'? 'text-[#273947]' : 'text-white')} /> 🧪 Pruebas WhatsApp</button>}
                      <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-800/60 cursor-pointer" onClick={()=>{ setView('mis-numeros'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }}><Wallet className="w-4 h-4" /> {view==='mis-numeros'? <span className="font-semibold text-[#ea9216]">Mis Números</span> : 'Mis Números'}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* Configuración */}
            <div>
              <button onClick={()=>setOpenConfig(o=>!o)} className="w-full flex items-center justify-between text-xs tracking-wide text-neutral-300 px-1 btn-animated">
                <span className="uppercase">Configuración</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openConfig? 'rotate-180':''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openConfig && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-1 mt-2"
                  >
                    <button onClick={()=>{ setView('config'); if (showMobileNav) setShowMobileNav(false); if (!showMobileNav && window.innerWidth >= 768) setCollapsed(true); }} className={"w-full flex items-center gap-2 p-2 rounded-xl text-left transition btn-animated "+(view==='config'? 'bg-[#ea9216] text-[#313841]' : 'hover:bg-[#313841]')}><Settings className={"w-4 h-4 "+(view==='config'? 'text-[#273947]' : 'text-white')} /> Configuración</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
          <button onClick={onLogout} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-800/80 text-sm">
            <LogOut className="w-4 h-4" /> Cerrar Sesion
          </button>
        </>
      )}
      </aside>
    </>
  );
}

// ---------------------- Main ----------------------
function Main({ products, setProducts, sales, setSales, session, users, teamMessages, setTeamMessages, depositSnapshots, historicoHoy, ventasAll, editingReceipt, setEditingReceipt, receiptTemp, setReceiptTemp, receiptFile, setReceiptFile, uploadingReceipt, setUploadingReceipt }) {
  const [showSale, setShowSale] = useState(false);
  const lowStock = useMemo(() => products.filter((p) => p.stock <= 10), [products]);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  // (Estados de depósito ahora globales en App)
  // Estado para confirmar con costo de delivery
  const [confirmingSale, setConfirmingSale] = useState(null); // id de venta a confirmar
  const [deliveryCost, setDeliveryCost] = useState('');
  // Doble confirmación cuando el costo ingresado es 0
  // zeroCostCheck eliminado: siempre se pedirá segunda confirmación detallada
  // Segunda confirmación de detalles
  const [secondConfirm, setSecondConfirm] = useState(null); // { id, ciudad, cantidad, monto, costoDelivery }
  // Loading states dashboard actions
  const [confirmingRowId, setConfirmingRowId] = useState(null); // click confirmar (primer paso llegada)
  const [savingDeliveryCost, setSavingDeliveryCost] = useState(false); // guardar costo (modal 1 / zero cost / second confirm)
  const [savingSecondConfirm, setSavingSecondConfirm] = useState(false); // confirm final detalles
  const [secondConfirmReady, setSecondConfirmReady] = useState(false); // habilitar botón tras delay
  const [secondConfirmCountdown, setSecondConfirmCountdown] = useState(3);
  const [cancelingProcessing, setCancelingProcessing] = useState(false); // submit cancelar (primer form)
  const [confirmingCancelCostLoading, setConfirmingCancelCostLoading] = useState(false); // confirm extra costo cancelación
  const [reschedulingLoading, setReschedulingLoading] = useState(false); // reprogramar

  // Handler para el submit del modal de costo de delivery
  function confirmarConCostoSubmit(e) {
    e.preventDefault();
    if(savingDeliveryCost) return;
    let costo = (deliveryCost||'').replace(',','.');
    if(costo==='') costo='0';
    if(Number(costo) < 0) costo = '0'; // nunca negativos
    const sale = sales.find(s=> s.id === confirmingSale);
    if(!sale){ setConfirmingSale(null); return; }
    // Determinar monto bruto evitando duplicar si sale.total llega como string ya acumulada
    let bruto;
    if(sale.total !== undefined && sale.total !== null && sale.total !== '' && !isNaN(Number(sale.total))){
      bruto = Number(sale.total); // usar total directo
    } else {
      bruto = Number(sale.precio||0); // nunca multiplicar ni sumar extras
    }
    const detalle = [];
    if(sale.sku){
      const prod = products.find(p=>p.sku===sale.sku);
      detalle.push(`${Number(sale.cantidad||0)} ${prod? prod.nombre : sale.sku}`);
    }
    if(sale.skuExtra){
      const prod2 = products.find(p=>p.sku===sale.skuExtra);
      detalle.push(`${Number(sale.cantidadExtra||0)} ${prod2? prod2.nombre : sale.skuExtra}`);
    }
    setSecondConfirm({ id: sale.id, ciudad: sale.ciudad||'', productosDetalle: detalle, monto: bruto, costoDelivery: Number(costo||0) });
    setDeliveryCost(costo);
    setConfirmingSale(null);
  }

  function cancelarSecondConfirm(){
    // Regresar al primer modal para editar costo nuevamente
    if(secondConfirm){
      setConfirmingSale(secondConfirm.id);
      setDeliveryCost(String(secondConfirm.costoDelivery||0));
    }
    setSecondConfirm(null);
  }

  function confirmarSecondConfirm(){
    if(!secondConfirm || savingSecondConfirm) return;
    setSavingSecondConfirm(true);
    const { id, costoDelivery } = secondConfirm;
    
    // Guardar estado original para revertir si falla
    const originalSalesState = [...sales];
    
    // Actualización optimista: eliminar la venta del estado local inmediatamente
    setSales(prev => prev.filter(s => s.id !== id));
    
    Promise.resolve(confirmarEntregaConCosto(id, costoDelivery))
      .then(()=>{
        // Cerrar modal cuando Supabase confirma
        // La suscripción en tiempo real actualizará la lista automáticamente
        setSecondConfirm(null);
        setDeliveryCost('');
      })
      .catch(err=>{
        console.error('[confirmarSecondConfirm] Error:', err);
        // Revertir actualización optimista si falla
        setSales(originalSalesState);
        toast.push({ type: 'error', title: 'Error', message: 'No se pudo confirmar la entrega. Intenta nuevamente.' });
      })
      .finally(()=>{
        setSavingSecondConfirm(false);
      });
  }

  // Delay de 3s antes de permitir confirmar entrega
  useEffect(()=>{
    if(secondConfirm){
      setSecondConfirmReady(false);
      setSecondConfirmCountdown(3);
      let remaining = 3;
      const t = setTimeout(()=> setSecondConfirmReady(true), 3000);
      const interval = setInterval(()=>{
        remaining -=1; setSecondConfirmCountdown(remaining);
        if(remaining<=0) clearInterval(interval);
      },1000);
      return ()=> clearTimeout(t);
    } else {
      setSecondConfirmReady(false);
    }
  }, [secondConfirm]);
  // Edición / carga de comprobante (QR)
  // Reprogramar pedido pendiente
  const [reschedulingSale, setReschedulingSale] = useState(null); // objeto venta
  const [rsFecha, setRsFecha] = useState(todayISO());
  const [rsHIni, setRsHIni] = useState('');
  const [rsMIni, setRsMIni] = useState('00');
  const [rsAmpmIni, setRsAmpmIni] = useState('AM');
  // Hora fin eliminada: ya no se maneja rango, solo hora inicio

  // Dataset para KPIs: solo ventas confirmadas. Admin: todas; vendedor: las suyas.
  const userSales = useMemo(() => {
  const confirmed = sales.filter(s=> (s.estadoEntrega==='entregada') || (s.estadoEntrega||'confirmado')==='confirmado');
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
    // Para "Entregas de hoy" ahora se requiere reflejar la SUMATORIA TOTAL del día tal cual se ve en Historial.
    // Historial construye: confirmadas (entregada|confirmado|cancelado con settledAt) + filas sintéticas de cancelación con costo (total negativo) y NO descuenta el gasto de delivery del campo total.
    // Replicamos esa lógica pero solo para la fecha de hoy y solo sumando "total" bruto (o derivado) + filas sintéticas negativas.
    // 1) Filtrado por alcance de grupo (no-admin) idéntico a historial
  // Dataset para KPI entregasHoy (solo dashboard): usamos historicoHoy (ventas históricas filtradas a hoy)
  let baseSales = historicoHoy || [];
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
    // 2) Confirmadas del día (incluye canceladas liquidadas)
    const confirmadasHoy = baseSales.filter(s=> s.fecha===hoyISO && (s.estadoEntrega==='entregada' || s.estadoEntrega==='confirmado' || (s.estadoEntrega==='cancelado' && s.settledAt)));
    // 3) Filas sintéticas canceladas con costo (todas las canceladas con costo del día, igual que historial)
    const canceladasCostoHoy = baseSales.filter(s=> s.fecha===hoyISO && s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0)>0)
      .map(s=> ({ sinteticaCancelada:true, total:-Number(s.gastoCancelacion||0) }));
    // 4) Sumar TOTAL bruto de confirmadas (si no hay total explícito derivar de precios) + total negativo de sintéticas.
    let entregasHoy = 0;
    confirmadasHoy.forEach(s=>{
      const bruto = (typeof s.total === 'number') ? Number(s.total) : (
        (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)
      );
      entregasHoy += bruto; // SIN restar gasto para alinear con sumatoria TOTAL de historial
    });
    canceladasCostoHoy.forEach(r=> { entregasHoy += r.total; }); // valores negativos (gasto cancelación)
    // 5) Productos entregados hoy: contar unidades confirmadas de productos NO sintéticos (principal y extra)
    const productosHoy = confirmadasHoy
      .filter(s=> s.estadoEntrega==='entregada' || s.estadoEntrega==='confirmado')
      .reduce((sum, s) => {
        let acc = 0;
        // Principal
        if (s.sku) {
          const p = products.find(pp => pp.sku === s.sku);
          if (p && !p.sintetico) acc += Number(s.cantidad || 0);
        }
        // Extra
        if (s.skuExtra) {
          const pe = products.find(pp => pp.sku === s.skuExtra);
          if (pe && !pe.sintetico) acc += Number(s.cantidadExtra || 0);
        }
        return sum + acc;
      }, 0);
    // Por Cobrar (nueva definición): SUMA de la columna Total de todas las ciudades del menú "ventas" excepto Cochabamba.
    // Replicamos la lógica de CitySummary en cada ciudad y agregamos.
    const porCobrar = (()=>{
      if(!ventasAll || !ventasAll.length) return 0;
      const datos = ventasAll.filter(s=> (s.ciudad||'').toLowerCase() !== 'cochabamba' && !s.settledAt);
      let totalGlobal = 0;
      datos.forEach(s=>{
        if(s.estadoEntrega==='entregada' || s.estadoEntrega==='confirmado'){
          // Tomar total mostrado: s.total si existe; de lo contrario precio*cantidad (+ extra)
          const totalCalc = (s.total!=null) ? Number(s.total) : (
            (Number(s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0):0)
          );
          totalGlobal += totalCalc;
        } else if(s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0)>0){
          // Fila sintética negativa igual que CitySummary
          totalGlobal += -Number(s.gastoCancelacion||0);
        }
      });
      return totalGlobal;
    })();
    const porDiaData = Object.entries(agg.porDia).sort((a,b)=> a[0].localeCompare(b[0])).map(([fecha,total])=>({fecha,total}));
    return { total: agg.total, porCobrar, entregasHoy, productosHoy, tickets: userSales.length, porDiaData };
  }, [userSales, products, sales, session, users, depositSnapshots, historicoHoy, ventasAll]);

  function confirmarEntregaConCosto(id, costo){
    const sale = sales.find(s=>s.id===id);
    if(!sale) return Promise.resolve();
    if((sale.estadoEntrega||'pendiente') === 'pendiente') {
      return import('./supabaseUtils')
        .then(({ confirmarEntregaVenta }) => confirmarEntregaVenta(sale.id, { ...sale, gasto: Number(costo||0) }))
        .catch(err => {
          toast.push({ type: 'error', title: 'Error', message: 'Error al confirmar la entrega en Supabase: ' + (err?.message || err) });
          throw err;
        });
    } else {
      setSales(prev => {
        const nowTs = Date.now();
        const today = todayISO();
        return prev.map(s=> {
          if(s.id!==id) return s;
          let fechaFinal = s.fecha;
          if(s.fecha && s.fecha > today) fechaFinal = today;
          return { ...s, fecha: fechaFinal, estadoEntrega:'confirmado', gasto: Number(costo||0), confirmadoAt: nowTs };
        });
      });
      return Promise.resolve();
    }
  }
  function abrirModalCosto(sale){
    setConfirmingSale(sale.id);
    setDeliveryCost(sale.gasto != null ? String(sale.gasto) : '');
  }
  function cancelarModalCosto(){
    setConfirmingSale(null); setDeliveryCost('');
  }
              async function confirmarCobro(){
                if(depositInFlight) return;
                setDepositInFlight(true);
                setDepositPhase('copy');
                try {
                  // IDs esperados: solo los de las filas visibles (ciudad/periodo actual)
                  const expectedIds = rows.map(r => r.idPorCobrar || r.id).filter(Boolean);
                  
                  warn('[confirmarCobro] Procesando', expectedIds.length, 'ventas para', city);
                  
                  // Asegurar que todas las canceladas con costo tienen doc en ventasporcobrar
                  try {
                    const { ensureCanceladasConCostoEnVentasPorCobrar } = await import('./supabaseUtils');
                    await ensureCanceladasConCostoEnVentasPorCobrar(city);
                  } catch(err){ warn('[confirmarCobro] ensureCanceladasConCostoEnVentasPorCobrar fallo', err); }
                  
                  // Obtener ventas desde Supabase
                  const ventaIds = [...new Set(expectedIds)];
                  if (ventaIds.length === 0) {
                    warn('[confirmarCobro] No hay ventas para procesar');
                    return;
                  }
                  
                  // Obtener datos de ventas desde Supabase
                  const { data: ventasData, error: ventasError } = await supabase
                    .from('ventas')
                    .select('*')
                    .in('id', ventaIds)
                    .is('deleted_from_pending_at', null)
                    .eq('estado_pago', 'pendiente');
                  
                  if (ventasError) throw ventasError;
                  
                  // Normalizar ventas: convertir snake_case a camelCase y marcar canceladas con costo
                  const ventasParaDeposito = (ventasData || []).map(v => {
                    const gastoCancelacion = Number(v.gasto_cancelacion || v.gastoCancelacion || 0);
                    const estadoEntrega = v.estado_entrega || v.estadoEntrega || '';
                    const esCanceladaConCosto = estadoEntrega === 'cancelado' && gastoCancelacion > 0;
                    
                    return {
                      id: v.id,
                      idPorCobrar: v.id,
                      codigoUnico: v.codigo_unico || v.codigoUnico || null,
                      total: esCanceladaConCosto ? -gastoCancelacion : (v.total != null ? Number(v.total) : null),
                      precio: Number(v.precio || 0),
                      gasto: Number(v.gasto || 0),
                      fecha: v.fecha || null,
                      sku: v.sku || null,
                      cantidad: v.cantidad != null ? Number(v.cantidad) : null,
                      skuExtra: v.sku_extra || v.skuExtra || null,
                      cantidadExtra: v.cantidad_extra != null ? Number(v.cantidad_extra) : (v.cantidadExtra != null ? Number(v.cantidadExtra) : null),
                      estadoEntrega: estadoEntrega,
                      estado_entrega: estadoEntrega,
                      sinteticaCancelada: esCanceladaConCosto || !!v.sintetica_cancelada || !!v.sinteticaCancelada,
                      sintetica_cancelada: esCanceladaConCosto || !!v.sintetica_cancelada || !!v.sinteticaCancelada,
                      gastoCancelacion: gastoCancelacion,
                      gasto_cancelacion: gastoCancelacion
                    };
                  });
                  
                  if (ventasParaDeposito.length === 0) {
                    warn('[confirmarCobro] No se encontraron ventas válidas en Supabase');
                    return;
                  }
                  
                  setDepositProgress({ phase:'copy', total: ventasParaDeposito.length, done:0, errors:0 });
                  
                  // Calcular resumen
                  const resumen = {
                    ventasConfirmadas: ventasParaDeposito.filter(v => v.estadoEntrega === 'confirmado' || v.estadoEntrega === 'entregada').length,
                    ventasSinteticas: ventasParaDeposito.filter(v => v.sinteticaCancelada && v.estadoEntrega !== 'cancelado').length,
                    canceladasConCosto: ventasParaDeposito.filter(v => v.estadoEntrega === 'cancelado' && Number(v.gastoCancelacion || 0) > 0).length,
                    totalPedidos: ventasParaDeposito.length,
                    totalMonto: ventasParaDeposito.reduce((sum, v) => sum + (v.precio || 0), 0),
                    totalDelivery: ventasParaDeposito.reduce((sum, v) => {
                      if (v.estadoEntrega === 'cancelado' && v.gastoCancelacion > 0) {
                        return sum + v.gastoCancelacion; // Para canceladas, usar gastoCancelacion
                      }
                      return sum + (v.gasto || 0);
                    }, 0),
                    totalNeto: ventasParaDeposito.reduce((sum, v) => {
                      if (v.estadoEntrega === 'cancelado' && v.gastoCancelacion > 0) {
                        return sum - v.gastoCancelacion; // Para canceladas, restar el gasto de cancelación
                      }
                      return sum + (v.total || 0);
                    }, 0)
                  };
                  
                  // Crear depósito usando crearSnapshotDeposito
                  const { crearSnapshotDeposito } = await import('./supabaseUtils');
                  const depositId = await crearSnapshotDeposito(city, ventasParaDeposito, resumen);
                  
                  warn('[confirmarCobro] Depósito creado:', depositId);
                  setDepositProgress({ phase:'copy', total: ventasParaDeposito.length, done: ventasParaDeposito.length, errors:0 });
                } catch(err){
                  console.error('[confirmarCobro] Error proceso depósito', err);
                  setDepositProgress(prev => ({ ...prev, errors: prev.total || 0 }));
                } finally {
                  setDepositPhase(null);
                  setDepositInFlight(false);
                  setCobrarOpen(false);
                  setView('deposit');
                }
              }
  const [cancelingSale, setCancelingSale] = useState(null);
  const [cancelDeliveryCost, setCancelDeliveryCost] = useState('');
  const [confirmCancelCost, setConfirmCancelCost] = useState(null); // {id, costo}
  function solicitarCancelarEntrega(id){
    const sale = sales.find(s=>s.id===id);
    if(!sale) return;
    setCancelingSale(id);
    setCancelDeliveryCost('');
  }
  function confirmarCancelacion(e){
    e.preventDefault();
  if(cancelingProcessing) return;
    const costo = cancelDeliveryCost.trim();
    const nowTs = Date.now();
    const sale = sales.find(s=>s.id===cancelingSale);
    if (!sale) { setCancelingSale(null); setCancelDeliveryCost(''); return; }
    // Si hay costo >0 pedir confirmación adicional
    if(Number(costo)>0 && !confirmCancelCost){
      setConfirmCancelCost({ id: cancelingSale, costo: Number(costo) });
      return; // esperar confirmación
    }
    // Lógica para pedidos pendientes (VentasSinConfirmar)
  setCancelingProcessing(true);
  if ((sale.estadoEntrega||'pendiente') === 'pendiente') {
      // Guardar estado anterior para rollback en caso de error
      const previousSales = [...sales];
      
      // Optimistic update: eliminar del estado local inmediatamente
      setSales(prev => prev.filter(s => s.id !== sale.id));
      setCancelingSale(null); setCancelDeliveryCost('');
      
      // Solo restaurar stock desde Supabase, no localmente
      import('./supabaseUtils').then(({ eliminarVentaPendiente, registrarCancelacionPendienteConCosto }) => {
        eliminarVentaPendiente(sale.id, sale).then(()=>{
          const costoNum = Number(costo)||0;
          if(costoNum>0){
            registrarCancelacionPendienteConCosto(sale, costoNum).catch(err=>{
              console.error('Error registrando costo de cancelación', err);
              // El costo de cancelación es opcional, no revertimos la eliminación
            });
          }
    }).catch(err => {
          // Revertir actualización optimista si falla
          console.error('[confirmarCancelacion] Error eliminando venta pendiente, revirtiendo cambios', err);
          setSales(previousSales);
          toast.push({ type: 'error', title: 'Error', message: 'Error al cancelar el pedido: ' + (err?.message || 'desconocido') + '. Los cambios fueron revertidos.' });
    }).finally(()=> setCancelingProcessing(false));
      });
    } else {
      const gastoNum = costo? Number(costo):0;
      // Optimistic: marcar localmente
      setSales(prev => prev.map(s=> s.id===cancelingSale ? { ...s, estadoEntrega:'cancelado', gastoCancelacion: gastoNum, canceladoAt: nowTs } : s));
      const targetId = sale.id; // id en ventashistorico
      setCancelingSale(null); setCancelDeliveryCost('');
      // Persistir en Firestore: actualizar doc histórico (y devolver stock + costo)
      import('./supabaseUtils').then(({ cancelarEntregaConfirmadaConCosto }) => {
    cancelarEntregaConfirmadaConCosto(targetId, sale, gastoNum).catch(err=>{
          console.error('Error cancelando confirmada con costo', err);
          toast.push({ type: 'error', title: 'Error', message: 'Error al cancelar venta confirmada: '+ (err?.message||err) });
    }).finally(()=> setCancelingProcessing(false));
      });
    }
  if((sale.estadoEntrega||'pendiente') === 'pendiente') return; // ya se maneja async arriba
  setCancelingProcessing(false);
  }
  function cerrarCancelacion(){ setCancelingSale(null); setCancelDeliveryCost(''); }
  function cancelarConfirmExtra(){ setConfirmCancelCost(null); }
  async function ejecutarCancelacionConfirmada(){
    if(!confirmCancelCost) return;
  if(confirmingCancelCostLoading) return;
  setConfirmingCancelCostLoading(true);
    // Simular submit original con costo ya confirmado
    const fakeEvent = { preventDefault:()=>{} };
    confirmarCancelacion(fakeEvent); // ahora pasará la validación porque confirmCancelCost existe
    setConfirmCancelCost(null);
  setConfirmingCancelCostLoading(false);
  }

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

  async function onAddSale(payload) {
    const { sku, cantidad, skuExtra, cantidadExtra } = payload;
    const product = products.find((p) => p.sku === sku);
    if (!product) { push({ type:'error', title:'Producto', message:'Producto no encontrado'}); return; }
    const esSintetico = !!product.sintetico;
    if (esSintetico && payload.cantidad !== 1) { payload.cantidad = 1; }
    
    // Obtener producto extra si existe
    const productExtra = skuExtra ? products.find(p => p.sku === skuExtra) : null;
    
    // Validar stock usando función común
    const validation = await validateStockForSale({
      product,
      cantidad,
      productExtra,
      cantidadExtra,
      validationType: 'central', // Dashboard valida stock central
      onError: push
    });
    
    if (!validation.valid) {
      return; // El error ya fue mostrado por onError
    }
    
    // Registrar venta (no descontamos stock aquí según modelo actual)
    const nextSale = { id: uid(), ...payload, estadoEntrega: 'pendiente' };
    setSales([nextSale, ...sales]);
    setShowSale(false);
    push({ type:'success', title:'Venta registrada', message:`SKU ${sku}${cantidadExtra? ' + extra':''}` });
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
          toast.push({ type: 'error', title: 'Error', message: 'Hubo un problema importando el CSV. Revisa los encabezados.' });
        }
      },
    });
  }

  return (
    <div className="flex-1 p-6 bg-[#121f27] relative">
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
        // Pedidos pasados (solo para admin)
        const pasadas = session.rol === 'admin' ? allPend.filter(p=>p.fecha < hoy) : [];
        const fechasPasadas = session.rol === 'admin' ? Array.from(new Set(pasadas.map(f=>f.fecha))).sort().reverse() : [];
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

  function TablaPendientes({rows, titulo, fechaLabel, isPast}){
          if(!rows.length) return null;
          return (
            <div className="rounded-2xl p-4 bg-[#0f171e] mb-6">
              <div className="flex items-center justify-between mb-3">
    <h3 className={`text-sm font-semibold flex items-center gap-2 ${isPast ? 'text-red-400' : ''}`}><Clock className={`w-4 h-4 ${isPast ? 'text-red-400' : 'text-[#f09929]'}`} /> {titulo}</h3>
    {fechaLabel ? <div className="text-[11px] text-neutral-500">{fechaLabel}</div> : <div />}
              </div>
              <div className="overflow-x-auto -mx-3 md:mx-0 pb-2 scrollbar-thin scrollable-shadow" ref={el=>{
                if(!el || el.__scrollEnhance) return; el.__scrollEnhance = true;
                const hint = el.querySelector('.scroll-hint');
                function updateShadows(){
                  const max = el.scrollWidth - el.clientWidth;
                  if(max <= 2){ el.classList.remove('scrolling-left','scrolling-right','scrolling-both'); return; }
                  const x = el.scrollLeft;
                  const atStart = x < 4; const atEnd = (max - x) < 4;
                  el.classList.remove('scrolling-left','scrolling-right','scrolling-both');
                  if(!atStart && !atEnd) el.classList.add('scrolling-both');
                  else if(!atStart) el.classList.add('scrolling-left');
                  else if(!atEnd) el.classList.add('scrolling-right');
                }
                function firstScroll(){ if(hint){ hint.classList.add('scroll-hint-hidden'); } el.removeEventListener('scroll', firstScroll); }
                el.addEventListener('scroll', firstScroll, { passive:true });
                el.addEventListener('scroll', updateShadows, { passive:true });
                window.addEventListener('resize', updateShadows);
                setTimeout(updateShadows, 60);
              }}>
                <div className="scroll-hint md:hidden text-[10px] px-3 pb-1 text-[#e7922b] scroll-hint-enter select-none">Desliza ↔ para ver columnas</div>
                <table className="w-full text-[11px] min-w-[640px]">
                  <thead className="bg-neutral-800/60">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Hora</th>
                      <th className="p-2 text-left">Ciudad</th>
                      <th className="p-2 text-left hidden md:table-cell">Encomienda</th>
                      <th className="p-2 text-left hidden md:table-cell">Usuario</th>
                      <th className="p-2 text-center md:hidden">Cant./Detalle</th>
                      {productOrder.map(sku=>{
                        const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap hidden md:table-cell">{prod?.nombre.split(' ')[0]}</th>;
                      })}
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2 text-center hidden md:table-cell">Celular</th>
                      <th className="p-2 text-center">Estado</th>
                      <th className="p-2 text-center">Comprobante</th>
                      <th className="p-2 text-left">Confirmar</th>
                      <th className="p-2 text-center">Reprogramar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(s=>{
                      const cantidades = productOrder.map(sku=>{ let c=0; if(s.sku===sku) c+=Number(s.cantidad||0); if(s.skuExtra===sku) c+=Number(s.cantidadExtra||0); return c; });
                      const precioTotal = Number(s.precio ?? 0);
                      const totalCant = cantidades.reduce((a,b)=>a+b,0);
                      return (
                        <tr key={s.id} className="border-t border-neutral-800">
                          <td className="p-2 whitespace-nowrap">{toDMY(s.fecha)}</td>
                          <td className="p-2">{s.horaEntrega||''}</td>
                          <td className="p-2">{s.ciudad||''}</td>
                          <td className="p-2 text-left max-w-[160px] hidden md:table-cell">
                            {s.metodo==='Encomienda' ? (
                              <span className="text-[14px]" title={s.destinoEncomienda||'Encomienda'}>{s.destinoEncomienda||''}</span>
                            ) : (s.motivo ? <span className="text-[12px] text-[#e7922b]" title={s.motivo}>{s.motivo}</span> : null)}
                          </td>
                          <td className="p-2 whitespace-nowrap hidden md:table-cell">{firstName(s.vendedora)||''}</td>
                          <td className="p-2 md:hidden">
                            <div className="text-center font-semibold text-neutral-100">{totalCant || ''}</div>
                            {(() => {
                              // Mostrar detalle compacto de productos en móvil: NombreCompleto×cantidad, excluyendo sintéticos
                              const details = cantidades.map((c, i) => {
                                if (!c) return null;
                                const sku = productOrder[i];
                                const prod = products.find(p => p.sku === sku);
                                const label = (prod?.nombre || sku);
                                return `${label}×${c}`;
                              }).filter(Boolean);
                              const text = details.join(' · ');
                              return details.length ? (
                                <div className="text-[10px] text-neutral-400 mt-0.5 truncate" title={text}>
                                  {text}
                                </div>
                              ) : null;
                            })()}
                          </td>
                          {cantidades.map((c,i)=> <td key={i} className="p-2 text-center hidden md:table-cell">{c||''}</td>)}
                          <td className="p-2 text-right font-semibold">{currency(precioTotal)}</td>
                          <td className="p-2 text-center hidden md:table-cell">{s.celular||''}</td>
                          <td className="p-2 text-center">
                            {(() => { const sem = semaforoEntrega(s.horaEntrega, s.fecha); const glow = sem.color==='#dc2626' ? '0 0 4px #dc2626' : `0 0 4px ${sem.color}`; const blinkClass = sem.color==='#dc2626' ? 'blink-red' : (sem.blinkYellow? 'blink-yellow':''); return (<div className="flex items-center justify-center"><span className={"w-3 h-3 rounded-full shadow-inner "+blinkClass} style={{background:sem.color, boxShadow:glow}} title={sem.label}></span></div>); })()}</td>
                          <td className="p-2 text-center">
                            {['Delivery','Encomienda'].includes(s.metodo||'') && (
                              <button onClick={()=>{ setEditingReceipt(s); setReceiptTemp(s.comprobante||null); }} title={s.comprobante? 'Ver / cambiar comprobante' : 'Subir comprobante'} className={"p-1 rounded-lg border text-neutral-200 "+(s.comprobante? 'bg-[#1d2a34] border-[#e7922b]':'bg-neutral-700/60 hover:bg-neutral-600 border-neutral-600')}> 
                                <Upload className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button onClick={()=>{ abrirModalCosto(s); }} title="Confirmar" className="p-1 rounded-lg bg-[#1d2a34] hover:bg-[#274152] border border-[#e7922b]/40 text-[#e7922b]"><Check className="w-3 h-3" /></button>
                              <button onClick={()=>solicitarCancelarEntrega(s.id)} title="Cancelar" className="p-1 rounded-lg bg-neutral-700/60 hover:bg-neutral-700 text-neutral-200 border border-neutral-600"><X className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={()=>abrirReprogramar(s)} title="Reprogramar" className="p-1 inline-flex items-center gap-1 rounded-lg bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 border border-neutral-600 text-[10px]">
                              <Clock className="w-4 h-4" />
                              <span className="hidden md:inline">Rep</span>
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
            {/* Pedidos pasados - Solo para admin */}
            {session.rol === 'admin' && fechasPasadas.map(f=>{
              const rows = pasadas.filter(r=>r.fecha===f).sort((a,b)=>{
                const ha=(a.horaEntrega||'').split('-')[0].trim();
                const hb=(b.horaEntrega||'').split('-')[0].trim();
                return minutesFrom12(ha)-minutesFrom12(hb);
              });
              const titulo = `Entregas pendientes PASADAS - ${toDMY(f)}`;
              return <TablaPendientes key={f} rows={rows} titulo={titulo} fechaLabel={f} isPast={true} />;
            })}
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
                <button type="button" onClick={cancelarModalCosto} className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm">Cancelar</button>
          <button disabled={savingDeliveryCost} className={`px-4 py-2 rounded-xl font-semibold text-sm ${savingDeliveryCost? 'bg-neutral-600 text-neutral-300 cursor-not-allowed':'bg-[#e7922b] text-[#1a2430]'}`}>{savingDeliveryCost? 'Guardando...' : 'Confirmar'}</button>
              </div>
              <div className="text-[10px] text-neutral-500">Al confirmar se descontará el stock central y la venta pasará a la ciudad. Deja vacío o ingresa 0 si no hubo costo.</div>
            </form>
          </Modal>
        )}
        {secondConfirm && (
          <Modal onClose={cancelarSecondConfirm} autoWidth>
            <div className="w-full max-w-[380px] px-1 space-y-5">
              <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar Entrega</h3>
              <div className="text-xs text-neutral-300 leading-relaxed space-y-1">
                <div><span className="font-semibold text-neutral-100">Ciudad:</span> {secondConfirm.ciudad}</div>
                <div><span className="font-semibold text-neutral-100">Productos:</span> {secondConfirm.productosDetalle && secondConfirm.productosDetalle.length > 0 ? secondConfirm.productosDetalle.join(', ') : '-'}</div>
                <div><span className="font-semibold text-neutral-100">Precio:</span> Bs {secondConfirm.monto.toFixed(2)}</div>
                <div><span className="font-semibold text-neutral-100">Delivery:</span> Bs {Number(secondConfirm.costoDelivery).toFixed(2)}</div>
                <div><span className="font-semibold" style={{ color: '#e7922b' }}>Monto Total:</span> <span style={{ color: '#e7922b' }}>Bs {(secondConfirm.monto - Number(secondConfirm.costoDelivery)).toFixed(2)}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={cancelarSecondConfirm} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
                <button
                  disabled={!secondConfirmReady || savingSecondConfirm}
                  onClick={()=>{
                    if(!secondConfirmReady || savingSecondConfirm) return;
                    setSavingSecondConfirm(true);
                    try{ confirmarSecondConfirm(); } finally { setTimeout(()=>setSavingSecondConfirm(false), 800); }
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold text-xs ${(!secondConfirmReady || savingSecondConfirm)? 'bg-neutral-600 text-neutral-300 cursor-not-allowed':'bg-[#e7922b] text-[#1a2430]'}`}
                >
                  {savingSecondConfirm && 'Confirmando entrega...'}
                  {!savingSecondConfirm && !secondConfirmReady && `Espera ${secondConfirmCountdown}s...`}
                  {!savingSecondConfirm && secondConfirmReady && 'Confirmar entrega'}
                </button>
              </div>
              <div className="text-[10px] text-neutral-500">Verifica los datos antes de confirmar. Esta acción es irreversible.</div>
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
                <button disabled={cancelingProcessing} className={`px-4 py-2 rounded-xl font-semibold text-sm ${cancelingProcessing? 'bg-neutral-600 text-neutral-300 cursor-not-allowed':'bg-red-600 hover:bg-red-500 text-white'}`}>{cancelingProcessing? 'Cancelando...' : 'Cancelar Pedido'}</button>
              </div>
              <div className="text-[10px] text-neutral-500">Se marcará como cancelado y se guardará el costo (si lo indicas). No se descuenta stock del central.</div>
            </form>
          </Modal>
        )}
        {confirmCancelCost && (
          <Modal onClose={cancelarConfirmExtra} autoWidth>
            <div className="w-full max-w-[360px] px-1 space-y-5">
              <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar costo de cancelación</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">Registrarás un gasto de <span className="font-semibold text-red-500">Bs {confirmCancelCost.costo.toFixed(2)}</span> por esta cancelación. ¿Confirmas?</p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={cancelarConfirmExtra} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
                <button disabled={confirmingCancelCostLoading} onClick={ejecutarCancelacionConfirmada} className={`px-4 py-2 rounded-xl font-semibold text-xs ${confirmingCancelCostLoading? 'bg-neutral-600 text-neutral-300 cursor-not-allowed':'bg-red-600 hover:bg-red-500 text-white'}`}>{confirmingCancelCostLoading? 'Guardando...' : 'Sí, registrar gasto'}</button>
              </div>
              <div className="text-[10px] text-neutral-500">Esta acción guardará el costo y no se podrá deshacer.</div>
            </div>
          </Modal>
        )}
        {editingReceipt && (
          <Modal onClose={()=>{ setEditingReceipt(null); setReceiptTemp(null); setReceiptFile(null); }}>
            <div className="space-y-4 w-full max-w-[400px] px-1">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2"><Upload className="w-4 h-4" /> Comprobante (QR)</h3>
              <div className="space-y-2 text-xs">
                <div className="text-neutral-400">Venta: <span className="font-semibold text-neutral-200">{editingReceipt.id.slice(-6)}</span></div>
                <input type="file" accept="image/*,.pdf" onChange={e=>{
                  const f = e.target.files?.[0];
                  if(!f){ 
                    setReceiptTemp(editingReceipt.comprobante||null); 
                    setReceiptFile(null);
                    return; 
                  }
                  if(f.size > 2*1024*1024){ toast.push({ type: 'error', title: 'Error', message: 'Archivo supera 2MB' }); return; }
                  // Guardar el File original
                  setReceiptFile(f);
                  // Crear preview base64
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
                {!receiptTemp && editingReceipt.comprobante && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/40">
                    {/^data:application\/pdf/.test(editingReceipt.comprobante) ? (
                      <a href={editingReceipt.comprobante} target="_blank" rel="noreferrer" className="text-[10px] underline text-[#e7922b]">Ver comprobante actual (PDF)</a>
                    ) : (
                      <img src={editingReceipt.comprobante} alt="Comprobante actual" className="max-h-40 mx-auto object-contain" />
                    )}
                  </div>
                )}
                {!receiptTemp && !editingReceipt.comprobante && <div className="text-[10px] text-neutral-500">No hay comprobante cargado.</div>}
                <div className="text-[10px] text-neutral-500">Tamaño máximo 2MB. Se subirá a Supabase Storage.</div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setEditingReceipt(null); setReceiptTemp(null); setReceiptFile(null); }} disabled={uploadingReceipt} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Cerrar</button>
                <button disabled={!receiptFile || uploadingReceipt} onClick={async ()=>{
                  if(!receiptFile){ toast.push({ type: 'error', title: 'Error', message: 'Selecciona un archivo' }); return; }
                  if(uploadingReceipt) return; // Guard contra doble ejecución
                  
                  setUploadingReceipt(true);
                  
                  // Guardar estado anterior para rollback
                  const previousSales = [...sales];
                  const previousReceipt = editingReceipt.comprobante || null;
                  const currentEditingReceipt = editingReceipt;
                  const currentReceiptFile = receiptFile;
                  
                  try {
                    // ACTUALIZACIÓN OPTIMISTA: Actualizar estado local inmediatamente con el preview temporal
                    setSales(prev => prev.map(s=> s.id===editingReceipt.id ? { ...s, comprobante: receiptTemp } : s));
                    
                    // Cerrar modal inmediatamente para mejor UX
                    setEditingReceipt(null);
                    setReceiptTemp(null);
                    setReceiptFile(null);
                    
                    // Comprimir si es imagen (PDFs se manejan directamente)
                    let fileToUpload = currentReceiptFile;
                    if (currentReceiptFile.type.startsWith('image/')) {
                      fileToUpload = await compressImage(currentReceiptFile, 60, 500);
                    }
                    
                    // Subir a Supabase Storage
                    const result = await uploadComprobanteToSupabase(fileToUpload, 'comprobantes');
                    const comprobanteUrl = result.url || result.secure_url;
                    
                    // Actualizar en la tabla ventas
                    const { error } = await supabase
                      .from('ventas')
                      .update({ comprobante: comprobanteUrl })
                      .eq('id', currentEditingReceipt.id);
                    
                    if (error) {
                      throw new Error(`Error actualizando comprobante: ${error.message}`);
                    }
                    
                    // Reemplazar preview temporal con la URL real de Supabase
                    setSales(prev => prev.map(s=> s.id===currentEditingReceipt.id ? { ...s, comprobante: comprobanteUrl } : s));
                    
                    toast.push({ type: 'success', title: 'Éxito', message: 'Comprobante subido correctamente' });
                  } catch (err) {
                    // ROLLBACK: Revertir actualización optimista si falla
                    console.error('[Dashboard] Error subiendo comprobante:', err);
                    setSales(previousSales);
                    // Reabrir modal con datos anteriores
                    setEditingReceipt({ ...currentEditingReceipt, comprobante: previousReceipt });
                    setReceiptTemp(previousReceipt);
                    setReceiptFile(currentReceiptFile);
                    toast.push({ type: 'error', title: 'Error', message: 'Error al subir comprobante: ' + (err?.message || 'Error desconocido') });
                  } finally {
                    setUploadingReceipt(false);
                  }
                }} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs disabled:opacity-40">
                  {uploadingReceipt ? 'Subiendo...' : 'Guardar'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {reschedulingSale && (
          <Modal onClose={()=>{ setReschedulingSale(null); }}>
            <form onSubmit={async e=>{ e.preventDefault();
              if(reschedulingLoading) return; // Guard contra doble ejecución
              setReschedulingLoading(true);
              
              const build12 = (h,m,ap)=>{ if(!h) return ''; return `${h}:${m} ${ap}`; };
              const inicio = build12(rsHIni, rsMIni, rsAmpmIni);
              const horaEntrega = inicio; // fin eliminado
              
              // Guardar estado anterior para rollback en caso de error
              const previousSales = [...sales];
              
              // ACTUALIZACIÓN OPTIMISTA: Actualizar UI inmediatamente
              setSales(prev => prev.map(x=> x.id===reschedulingSale.id ? { ...x, fecha: rsFecha, horaEntrega } : x));
              setReschedulingSale(null);
              
              try {
                // Actualizar en Supabase si es pendiente
                if(reschedulingSale.id){
                  const { editarVentaPendiente } = await import('./supabaseUtils');
                  const cleanNew = Object.fromEntries(Object.entries({ ...reschedulingSale, fecha: rsFecha, horaEntrega }).filter(([_, v]) => v !== undefined));
                  await editarVentaPendiente(reschedulingSale.id, reschedulingSale, cleanNew);
                }
                
                toast.push({ type: 'success', title: 'Éxito', message: 'Venta reprogramada correctamente' });
              } catch (err) {
                // ROLLBACK: Revertir actualización optimista si falla
                console.error('[Reprogramar] Error actualizando venta:', err);
                setSales(previousSales);
                setReschedulingSale({ ...reschedulingSale, fecha: rsFecha, horaEntrega }); // Reabrir modal con datos anteriores
                toast.push({ type: 'error', title: 'Error', message: 'Error al reprogramar la venta: ' + (err?.message || 'Error desconocido') });
              } finally {
                setReschedulingLoading(false);
              }
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
                <button type="button" onClick={()=>setReschedulingSale(null)} disabled={reschedulingLoading} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Cancelar</button>
                <button type="submit" disabled={reschedulingLoading} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed">{reschedulingLoading ? 'Guardando...' : 'Guardar'}</button>
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
  // Registrar pagos de este mes para evitar parpadeo una vez marcado "Pagado".
  const [pagosMarcados, setPagosMarcados] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('ventas.pagados')||'{}'); } catch { return {}; }
  }); // { userId: 'YYYY-MM' }
  const [confirmEdit,setConfirmEdit]=useState(null); // { original, updated, diff }
  useEffect(()=>{ try { localStorage.setItem('ventas.pagados', JSON.stringify(pagosMarcados)); } catch {} }, [pagosMarcados]);
  const mesClave = ()=> { const d = new Date(); return d.getFullYear()+ '-' + String(d.getMonth()+1).padStart(2,'0'); };
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [markingPaidUserId, setMarkingPaidUserId] = useState(null);
  
  async function marcarPagado(u){
    if(isMarkingPaid || markingPaidUserId) return; // Guard contra doble ejecución
    
    // Guardar estado anterior para rollback
    const previousPagos = { ...pagosMarcados };
    
    setIsMarkingPaid(true);
    setMarkingPaidUserId(u.id);
    
    // Actualización optimista
    setPagosMarcados(prev=> ({ ...prev, [u.id]: mesClave() }));
    
    try {
      // Aquí se podría agregar una llamada a Supabase si es necesario
      // Por ahora solo actualizamos el estado local
      // await supabase.from('users').update({ fechaPago: todayISO() }).eq('id', u.id);
    } catch(err) {
      // Revertir si falla
      console.error('[marcarPagado] Error:', err);
      setPagosMarcados(previousPagos);
      toast.push({ type: 'error', title: 'Error', message: 'Error al marcar pago: ' + (err?.message || 'desconocido') });
    } finally {
      setIsMarkingPaid(false);
      setMarkingPaidUserId(null);
    }
  }
  const [payingUser,setPayingUser]=useState(null); // usuario al que se confirma pago hoy
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  function reset(){ setNombre(''); setApellidos(''); setCelular(''); setEmail(''); setPassword(''); setFechaIngreso(todayISO()); setSueldo('0'); setDiaPago(Number(todayISO().slice(-2))); setRol('seller'); setGrupo(''); setProductosAsignados([]); }
  async function submit(e){
    e.preventDefault();
    setMensaje('');
    if(!nombre||!apellidos||!email||!password){ setMensaje('Completa todos'); return; }
    if(!diaPago || diaPago<1 || diaPago>31){ setMensaje('Día de pago inválido'); return; }
    if(users.some(u=>u.username===email)){ setMensaje('Ese usuario ya existe'); return; }
    
    if(isCreatingUser) return; // Guard contra doble ejecución
    setIsCreatingUser(true);
    
    // Guardar estado anterior para rollback en caso de error
    const previousUsers = [...users];
    
    try {
      // Crear en Auth + registro en tabla users
      const { registerUser } = await import('./supabaseAuthUtils');
      const authUser = await registerUser(email, password, rol==='admin' ? 'admin' : 'seller');
      const userId = authUser.uid;
      
      // Completar campos adicionales en Supabase (actualizar el registro que se creó en registerUser)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          nombre,
          apellidos,
          celular: celular||'',
          username: email,
          sueldo: Number(sueldo||0),
          dia_pago: Number(diaPago),
          fecha_ingreso: fechaIngreso,
          rol: rol==='admin' ? 'admin' : 'seller',
          grupo: rol==='admin' ? '' : (grupo||''),
          productos: rol==='admin' ? [] : productosAsignados
        })
        .eq('id', userId); // Ahora el ID coincide con auth.users.id
      
      if (updateError) {
        warn('[Crear Usuario] Error actualizando tabla users:', updateError);
        // Si falla el update, intentar insert directamente (por si el registro no se creó en registerUser)
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            nombre,
            apellidos,
            celular: celular||'',
            username: email,
            password: 'TEMPORAL_CHANGE_ME',
            sueldo: Number(sueldo||0),
            dia_pago: Number(diaPago),
            fecha_ingreso: fechaIngreso,
            rol: rol==='admin' ? 'admin' : 'seller',
            grupo: rol==='admin' ? '' : (grupo||''),
            productos: rol==='admin' ? [] : productosAsignados
          });
        if (insertError) {
          warn('[Crear Usuario] Error insertando en tabla users:', insertError);
          throw new Error('No se pudo crear el usuario en la base de datos');
        }
      }
      
      const extra = {
        nombre,
        apellidos,
        celular: celular||'',
        username: email,
        sueldo: Number(sueldo||0),
        diaPago: Number(diaPago),
        fechaIngreso,
        rol: rol==='admin' ? 'admin' : 'seller',
        grupo: rol==='admin' ? '' : (grupo||''),
        productos: rol==='admin' ? [] : productosAsignados
      };
      
      // Refrescar estado local (para UI actual que aún usa users local)
      const nuevo = normalizeUser({ id:userId, ...extra, password });
      setUsers(prev=> [...prev, nuevo]);
      
      // Si llegamos aquí, todo fue exitoso
      reset();
      setMensaje('Usuario creado y sincronizado');
    } catch(err){
      // Revertir actualización optimista si falla
      console.error('[Crear Usuario] Error:', err);
      setUsers(previousUsers);
      setMensaje('Error creando usuario: '+ (err?.message||'desconocido'));
    } finally {
      setIsCreatingUser(false);
    }
  }
  function startEdit(u){
    const legacyDia = u.diaPago || (u.fechaPago? Number(String(u.fechaPago).slice(-2)) : Number(todayISO().slice(-2)));
    setEditingId(u.id);
    // Para compatibilidad, usar username en el campo email del formulario de edición
    setEditData({ ...u, email: u.username || u.email || '', sueldo:String(u.sueldo), diaPago: legacyDia });
  }
  function cancelEdit(){ setEditingId(null); setEditData(null); }
  const [isSavingUser, setIsSavingUser] = useState(false);
  async function saveEdit(e){
    if(e) e.preventDefault();
    if(!editData?.nombre||!editData.apellidos||!editData.email) return;
    if(!editData.diaPago || editData.diaPago<1 || editData.diaPago>31){ toast.push({ type: 'error', title: 'Error', message: 'Día de pago inválido' }); return; }
    if(users.some(u=>u.username===editData.email && u.id!==editData.id)){ toast.push({ type: 'error', title: 'Error', message: 'Usuario ya usado' }); return; }
    
    if(isSavingUser) return; // Guard contra doble ejecución
    setIsSavingUser(true);
    
    // Obtener usuario original para comparar contraseña
    const originalUser = users.find(u=>u.id===editData.id);
    const passwordChanged = editData.password && editData.password.trim() && editData.password !== (originalUser?.password || '');
    
    // Validar contraseña si se está cambiando
    if (passwordChanged && editData.password.length < 6) {
      toast.push({ type: 'error', title: 'Error', message: 'La contraseña debe tener al menos 6 caracteres' });
      setIsSavingUser(false);
      return;
    }
    
    // Guardar estado anterior para rollback en caso de error
    const previousUsers = [...users];
    
    // ACTUALIZACIÓN OPTIMISTA: Actualizar UI inmediatamente
    const updatedList = users.map(u=> u.id===editData.id? normalizeUser({ ...u, ...editData, grupo: editData.rol==='admin'? '' : (editData.grupo||''), username: editData.email, diaPago:Number(editData.diaPago), sueldo:Number(editData.sueldo||0), productos: editData.rol==='admin'? [] : (editData.productos||[]) }) : u);
    setUsers(updatedList);
    
    // Persistir en Supabase si existe id
    try {
      if(editData.id){
        // 1. Actualizar contraseña en Auth si se proporcionó una nueva
        if (passwordChanged && session?.rol === 'admin') {
          try {
            const { manageUserPassword } = await import('./supabaseAuthUtils');
            const passwordResult = await manageUserPassword(editData.id, editData.password.trim(), 'update');
            if (!passwordResult.success) {
              warn('Error actualizando contraseña en Auth:', passwordResult.error);
              // Continuamos aunque falle, pero mostramos advertencia
            } else {
              log('Contraseña actualizada en Auth exitosamente');
            }
          } catch (passwordErr) {
            warn('Error al actualizar contraseña en Auth:', passwordErr);
            // Continuamos con la actualización de otros campos
          }
        }
        
        // 2. Actualizar otros campos en la tabla users
        const payload = {
          nombre: editData.nombre,
          apellidos: editData.apellidos,
          celular: editData.celular||'',
          username: editData.email,
          sueldo: Number(editData.sueldo||0),
          dia_pago: Number(editData.diaPago),
          fecha_ingreso: editData.fechaIngreso||todayISO(),
          rol: editData.rol==='admin'? 'admin':'seller',
          grupo: editData.rol==='admin'? '' : (editData.grupo||''),
          productos: editData.rol==='admin'? [] : (editData.productos||[])
        };
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editData.id);
        
        if (error) {
          warn('Error actualizando usuario en Supabase', error);
        }
      }
    } catch(err){ 
      // ROLLBACK: Revertir actualización optimista si falla
      warn('Error actualizando usuario en Supabase', err);
      setUsers(previousUsers);
      toast.push({ type: 'error', title: 'Error', message: 'Error al guardar cambios: ' + (err?.message || 'Error desconocido') });
    } finally {
      setIsSavingUser(false);
    }
    setConfirmEdit(null);
    cancelEdit();
  }
  function handleEditSubmit(e){ e.preventDefault(); if(!editData) return; if(!editData.nombre||!editData.apellidos||!editData.email) return; if(!editData.diaPago || editData.diaPago<1 || editData.diaPago>31){ toast.push({ type: 'error', title: 'Error', message: 'Día de pago inválido' }); return; } if(users.some(u=>u.username===editData.email && u.id!==editData.id)){ toast.push({ type: 'error', title: 'Error', message: 'Usuario ya usado' }); return; } const original = users.find(u=>u.id===editData.id); if(!original) { saveEdit(); return; } // diff simple
    const fields = ['nombre','apellidos','celular','email','rol','grupo','fechaIngreso','diaPago','sueldo'];
    const diff = fields.map(f=>{ const newVal = f==='email'? editData.email : editData[f]; const oldVal = f==='email'? (original.username||original.email) : (original[f]); if(String(newVal) !== String(oldVal||'')) return { campo:f, antes:String(oldVal||''), despues:String(newVal||'') }; return null; }).filter(Boolean);
    // Agregar password al diff solo si se está cambiando (no está vacío)
    if(editData.password && editData.password.trim() && editData.password !== (original.password || '')) {
      diff.push({ campo: 'password', antes: '••••••', despues: '•••••• (nueva)' });
    }
    // productos
    const oldProd = (original.productos||[]).join(', ');
    const newProd = (editData.productos||[]).join(', ');
    if(oldProd !== newProd) diff.push({ campo:'productos', antes: oldProd||'—', despues: newProd||'—' });
    setConfirmEdit({ original, updated: editData, diff });
  }
  function askDelete(u){ if(u.id===session.id){ toast.push({ type: 'error', title: 'Error', message: 'No puedes eliminar tu propia sesión.' }); return; } if(u.id==='admin'){ toast.push({ type: 'error', title: 'Error', message: 'No puedes eliminar el usuario administrador principal.' }); return; } setDeletingUser(u); }
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  async function performDelete(){
    if(!deletingUser || isDeletingUser) return; // Guard contra doble ejecución
    
    // Guardar estado anterior para rollback
    const previousUsers = [...users];
    
    const target = deletingUser;
    setIsDeletingUser(true);
    
    // Actualización optimista
    setUsers(users.filter(x=>x.id!==target.id));
    setDeletingUser(null);
    // Intentar eliminar de Supabase (tabla users y auth.users)
    try { 
      if(target.id){ 
        // 1. Primero intentar eliminar de auth.users usando Edge Function
        try {
          const { deleteUserFromAuth } = await import('./supabaseAuthUtils');
          
          const authDeleteResult = await deleteUserFromAuth(target.id);
          if (!authDeleteResult.success) {
            // Si falla, puede que el usuario no exista en Auth o la Edge Function no esté desplegada
            warn('[Eliminar Usuario] No se pudo eliminar de Auth:', authDeleteResult.error?.message || 'Error desconocido');
            // Continuamos con la eliminación de la tabla users aunque falle Auth
          } else {
            log('[Eliminar Usuario] Usuario eliminado de Auth exitosamente');
          }
        } catch (authErr) {
          warn('[Eliminar Usuario] Error al intentar eliminar de Auth:', authErr);
          // Continuamos con la eliminación de la tabla users aunque falle Auth
        }
        
        // 2. Eliminar de la tabla users (siempre intentamos esto)
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', target.id);
        if (error) {
          throw error; // Lanzar error para que se capture en el catch externo
        } else {
          log('[Eliminar Usuario] Usuario eliminado de tabla users exitosamente');
        }
      } 
    } catch(err){ 
      // Revertir actualización optimista si falla
      console.error('[Eliminar Usuario] Error:', err);
      setUsers(previousUsers);
      setDeletingUser(target); // Restaurar usuario en el modal
      toast.push({ type: 'error', title: 'Error', message: 'Error eliminando usuario: ' + (err?.message || 'desconocido') + '. Los cambios fueron revertidos.' });
    } finally {
      setIsDeletingUser(false);
    }
  }
  return (
  <div className="flex-1 p-6 safe-scroll-bg">
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
                  <div className="mt-1">
                    <GrupoSelector
                      value={grupo}
                      onChange={setGrupo}
                      disabled={false}
                      session={session}
                    />
                  </div>
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
              <button disabled={isCreatingUser} className="px-4 py-2 bg-white text-neutral-900 font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">{isCreatingUser ? 'Creando...' : 'Guardar'}</button>
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
                    <input type="password" className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.password || ''} onChange={e=>setEditData({...editData,password:e.target.value})} placeholder="Nueva contraseña (dejar vacío para no cambiar)" />
                    <select className="bg-neutral-800 rounded-lg px-2 py-1" value={editData.rol} onChange={e=>setEditData({...editData,rol:e.target.value})}>
                      <option value="seller">Vendedora</option>
                      <option value="admin">Admin</option>
                    </select>
                    {editData.rol==='seller' && (
                      <div className="md:col-span-1">
                        <GrupoSelector
                          value={editData.grupo||''}
                          onChange={(val) => setEditData({...editData, grupo: val})}
                          disabled={false}
                          session={session}
                        />
                      </div>
                    )}
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
                <button 
                  onClick={performDelete} 
                  disabled={isDeletingUser}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeletingUser ? 'Eliminando...' : 'Eliminar'}
                </button>
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
                <button onClick={()=>setConfirmEdit(null)} disabled={isSavingUser} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Cancelar</button>
                <button disabled={confirmEdit.diff.length===0 || isSavingUser} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">{isSavingUser ? 'Guardando...' : 'Confirmar'}</button>
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
                <button 
                  onClick={()=>{ marcarPagado(payingUser); setPayingUser(null); }} 
                  disabled={isMarkingPaid && markingPaidUserId === payingUser?.id}
                  className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isMarkingPaid && markingPaidUserId === payingUser?.id ? 'Marcando...' : 'Confirmar'}
                </button>
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
function ProductsView({ products, setProducts, session }) {
  // Eliminar productos demo del estado al cargar o modificar
  useEffect(() => {
    const clean = products.filter(p => {
      const fields = [p.nombre, p.sku, p.descripcion, p.categoria];
      return !fields.some(f => typeof f === 'string' && f.toLowerCase().includes('demo'));
    });
    if (clean.length !== products.length) setProducts(clean);
    // eslint-disable-next-line
  }, [products]);
  // Filtrar productos que NO sean demo
  const filteredProducts = products.filter(p => {
    const fields = [p.nombre, p.sku, p.descripcion, p.categoria];
    return !fields.some(f => typeof f === 'string' && f.toLowerCase().includes('demo'));
  });
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState(null); // base64
  const [sintetico, setSintetico] = useState(false); // producto sin precio/costo/stock
  const [mensaje, setMensaje] = useState('');
  const [editingSku, setEditingSku] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [usage, setUsage] = useState(() => estimateLocalStorageUsage());
  const [optimizing, setOptimizing] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false); // loading al agregar/actualizar producto

  useEffect(()=>{ setUsage(estimateLocalStorageUsage()); }, [products]);

  function resetForm() { setSku(''); setNombre(''); setPrecio(''); setCosto(''); setStock(''); setImagen(null); setEditingSku(null); setEditingId(null); setSintetico(false); }

  // ...existing code...

  async function submit(e) {
    e.preventDefault();
  if (savingProduct) return; // evitar doble click
  setSavingProduct(true);
    setMensaje('');
    if (!nombre) { setMensaje('Nombre es obligatorio'); return; }
    let generatedSku = sku;
    if (!generatedSku) {
      generatedSku = nombre.toUpperCase().replace(/[^A-Z0-9]+/g,'-').slice(0,8) + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
    }
    const exists = products.find(p => p.sku === generatedSku);
    const data = {
      sku: generatedSku,
      nombre: nombre.trim(),
      precio: sintetico ? 0 : Number(precio || 0),
      costo: sintetico ? 0 : Number(costo || 0),
      stock: sintetico ? 0 : Number(stock || 0)
    };
    if (sintetico) data.sintetico = true;
    // Subir imagen si es base64 (no URL) y hay imagen
    // En localhost: usar Supabase Storage
    // Usar Supabase Storage siempre
    let urlImagen = null;
    
    if (typeof imagen === 'string' && imagen.startsWith('data:')) {
      setMensaje('Subiendo imagen a Supabase Storage...');
      try {
        // Usar Supabase Storage (tanto en localhost como en Vercel)
        const result = await uploadImageToSupabase(imagen, 'productos');
        urlImagen = result.url;
      } catch (err) {
        setMensaje(`Error subiendo imagen: ${err && err.message ? err.message : String(err)}`);
        return;
      }
    } else if (typeof imagen === 'string' && imagen.startsWith('http')) {
      urlImagen = imagen;
    } else if (imagen === null && exists && exists.imagen) {
      urlImagen = exists.imagen;
    }
    if (urlImagen) data.imagen = urlImagen;
    try {
      if (editingId) {
        // Actualización optimista: actualizar estado local inmediatamente
        setProducts(prev => prev.map(p => 
          p.id === editingId 
            ? { ...p, ...data, updated_at: new Date().toISOString() }
            : p
        ));
        
        // Editar producto existente por id (actualizar directamente en almacen_central)
        const { error, data: updatedData } = await supabase
          .from('almacen_central')
          .update(data)
          .eq('id', editingId)
          .select()
          .single();
        
        if (error) {
          // Revertir actualización optimista si falla
          setProducts(prev => prev.map(p => 
            p.id === editingId 
              ? exists // Restaurar datos originales
              : p
          ));
          throw error;
        }
        
        // Actualizar estado con datos del servidor
        if (updatedData) {
          setProducts(prev => prev.map(p => 
            p.id === editingId 
              ? { ...p, ...updatedData, imagen: updatedData.imagen || updatedData.imagen_url || p.imagen }
              : p
          ));
        }
        
        setMensaje('Producto actualizado');
      } else if (exists) {
        setMensaje('Nombre genera código existente, intenta variar el nombre');
        setSavingProduct(false);
        return;
      } else {
        // Crear nuevo producto
        // No incluir createdAt en data, la tabla usa created_at automáticamente
        
        // Insertar directamente en almacen_central
        const { error, data: newProduct } = await supabase
          .from('almacen_central')
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        
        // Actualización optimista: agregar producto al estado local inmediatamente
        if (newProduct) {
          setProducts(prev => [...prev, {
            ...newProduct,
            imagen: newProduct.imagen || newProduct.imagen_url || null
          }]);
        }
        
        setMensaje('Producto agregado');
      }
      resetForm();
    } catch (err) {
      setMensaje('Error Supabase: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setSavingProduct(false);
    }
  }
  function edit(p) {
    setEditingSku(p.sku);
    setEditingId(p.id);
    setSku(p.sku); setNombre(p.nombre); setPrecio(String(p.precio)); setCosto(String(p.costo)); setStock(String(p.stock)); setImagen(p.imagen || null); setSintetico(!!p.sintetico);
  }
  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);

  async function remove(p) {
    setPendingDeleteProduct(p);
    setShowDeleteModal(true);
  }

  async function confirmRemove() {
    if (!pendingDeleteProduct) return;
    try {
      // Actualización optimista: eliminar del estado local inmediatamente
      setProducts(prev => prev.filter(p => p.id !== pendingDeleteProduct.id));
      
      // Eliminar directamente de almacen_central
      const { error } = await supabase
        .from('almacen_central')
        .delete()
        .eq('id', pendingDeleteProduct.id);
      
      if (error) {
        // Revertir actualización optimista si falla
        setProducts(prev => [...prev, pendingDeleteProduct]);
        throw error;
      }
      
      if (editingSku === pendingDeleteProduct.sku) resetForm();
      setMensaje('Producto eliminado');
    } catch (err) {
      setMensaje('Error al eliminar en Supabase');
      console.error('[Eliminar Producto] Error:', err);
    }
    setShowDeleteModal(false);
    setPendingDeleteProduct(null);
  }

  function cancelRemove() {
    setShowDeleteModal(false);
    setPendingDeleteProduct(null);
  }

  // Ordenar por createdAt asc (los viejos primero, recién agregados al final). Los que no tengan createdAt quedan primero.
  const filtered = products
    .filter(p => [p.sku, p.nombre].join(' ').toLowerCase().includes(filter.toLowerCase()))
    .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));

  // Permite editar los campos de la tarjeta de producto
  function handleProductCardInput(id, field, value) {
    setProducts(products => products.map(p => {
      if (p.id !== id) return p;
      // Solo permitir números válidos
      let v = value;
      if (field === 'delivery' || field === 'precioPar') {
        v = value === '' ? '' : Number(value);
        if (v !== '' && isNaN(v)) v = '';
      }
      return { ...p, [field]: v };
    }));
  }

  // Guardar delivery y precioPar en almacen_central
  async function fijarValoresProducto(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    setSavingCard(prev=> ({ ...prev, [id]: true }));
    try {
      const deliveryValue = typeof prod.delivery === 'number' ? prod.delivery : Number(prod.delivery) || 0;
      const precioParValue = typeof prod.precioPar === 'number' ? prod.precioPar : Number(prod.precioPar) || 0;
      
      // Actualización optimista
      setProducts(prev => prev.map(p => 
        p.id === id 
          ? { ...p, delivery: deliveryValue, precioPar: precioParValue }
          : p
      ));
      
      // Preparar datos para actualizar (incluir delivery y precio_par)
      const updateData = {
        delivery: deliveryValue,
        precio_par: precioParValue
      };
      
      const { error } = await supabase
        .from('almacen_central')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        // Revertir si falla
        setProducts(prev => prev.map(p => 
          p.id === id 
            ? prod
            : p
        ));
        throw error;
      }
      
      setMensaje('Valores guardados');
    } catch (err) {
      setMensaje('Error al guardar en Supabase');
      console.error('[Fijar Valores Producto] Error:', err);
    } finally {
      setSavingCard(prev=> ({ ...prev, [id]: false }));
    }
  }
  const [savingCard, setSavingCard] = useState({}); // { [productId]: boolean }
  
  // Estado para ajuste de stock
  const [selectedProductForStock, setSelectedProductForStock] = useState(null); // id del producto seleccionado
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState(''); // cantidad a sumar
  const [adjustingStock, setAdjustingStock] = useState(false); // loading al ajustar stock
  const [stockAdjustmentMessage, setStockAdjustmentMessage] = useState(''); // mensaje de éxito/error
  
  // Función para validar ajuste de stock antes de ejecutar
  function validateStockAdjustment() {
    if (!selectedProductForStock) {
      setStockAdjustmentMessage('⚠️ Selecciona un producto');
      return false;
    }
    
    if (!stockAdjustmentAmount || stockAdjustmentAmount.trim() === '') {
      setStockAdjustmentMessage('⚠️ Ingresa una cantidad');
      return false;
    }
    
    const cantidad = Number(stockAdjustmentAmount);
    
    if (isNaN(cantidad)) {
      setStockAdjustmentMessage('⚠️ La cantidad debe ser un número válido');
      return false;
    }
    
    if (!Number.isInteger(cantidad)) {
      setStockAdjustmentMessage('⚠️ La cantidad debe ser un número entero');
      return false;
    }
    
    if (cantidad <= 0) {
      setStockAdjustmentMessage('⚠️ La cantidad debe ser mayor a 0');
      return false;
    }
    
    if (cantidad > 100000) {
      setStockAdjustmentMessage('⚠️ La cantidad no puede ser mayor a 100,000');
      return false;
    }
    
    const product = products.find(p => p.id === selectedProductForStock);
    if (!product) {
      setStockAdjustmentMessage('❌ Producto no encontrado');
      return false;
    }
    
    if (product.sintetico) {
      setStockAdjustmentMessage('⚠️ No se puede ajustar stock de productos sintéticos');
      return false;
    }
    
    return true;
  }
  
  // Función para sumar stock a un producto existente
  async function sumarStock() {
    // Validar antes de proceder
    if (!validateStockAdjustment()) {
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => {
        setStockAdjustmentMessage('');
      }, 3000);
      return;
    }
    
    const cantidad = Number(stockAdjustmentAmount);
    const product = products.find(p => p.id === selectedProductForStock);
    const currentStock = Number(product.stock || 0);
    const newStock = currentStock + cantidad;
    
    setAdjustingStock(true);
    setStockAdjustmentMessage('');
    
    try {
      // Actualización optimista: actualizar estado local inmediatamente
      setProducts(prev => prev.map(p => 
        p.id === selectedProductForStock 
          ? { ...p, stock: newStock }
          : p
      ));
      
      // Actualizar en almacen_central
      const { error } = await supabase
        .from('almacen_central')
        .update({ stock: newStock })
        .eq('id', selectedProductForStock);
      
      if (error) {
        // Revertir actualización optimista si falla
        setProducts(prev => prev.map(p => 
          p.id === selectedProductForStock 
            ? { ...p, stock: currentStock } // Restaurar stock original
            : p
        ));
        throw error;
      }
      
      // Éxito: limpiar formulario y mostrar mensaje
      setStockAdjustmentMessage(`✅ Stock actualizado exitosamente: ${currentStock} → ${newStock} (+${cantidad})`);
      setStockAdjustmentAmount('');
      setSelectedProductForStock(null);
      
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => {
        setStockAdjustmentMessage('');
      }, 4000);
      
    } catch (err) {
      setStockAdjustmentMessage('❌ Error al actualizar stock: ' + (err?.message || String(err)));
      console.error('[Sumar Stock] Error:', err);
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => {
        setStockAdjustmentMessage('');
      }, 5000);
    } finally {
      setAdjustingStock(false);
    }
  }
  
  // Función para limpiar el formulario de ajuste de stock
  function resetStockAdjustment() {
    setSelectedProductForStock(null);
    setStockAdjustmentAmount('');
    setStockAdjustmentMessage('');
  }

  // ---------------- Pending dispatches (despachos) integration ----------------
  // Mostrará en 'Pend.' la suma de cantidades en envíos pendientes (no recibidos) para cada SKU.
  const [pendingDispatches, setPendingDispatches] = useState([]); // docs de despachos
  useEffect(()=>{
    let unsub; (async ()=>{
      try {
        // Suscribirse a despachos pendientes usando subscribeCollection
        unsub = subscribeCollection('despachos', (dispatches) => {
          // Filtrar solo pendientes
          const pendientes = dispatches.filter(d => (d.status || 'pendiente') === 'pendiente');
          setPendingDispatches(pendientes);
        }, {
          filters: { status: 'pendiente' }
        });
      } catch(err){ warn('[AlmacenCentral] no se pudo suscribir despachos', err); }
    })();
    return ()=> unsub && unsub();
  }, []);
  const pendientesPorSku = useMemo(()=>{
    const map = {}; // sku -> cantidad pendiente
    pendingDispatches.forEach(d => {
      // Heurística: considerar pendiente si NO tiene flag recibido / settled / completed
      if(d.recibido || d.completed || d.settledAt) return; // campos posibles
      (d.items||[]).forEach(it => {
        if(!it || !it.sku) return;
        const cant = Number(it.cantidad||0); if(!cant) return;
        map[it.sku] = (map[it.sku]||0) + cant;
      });
    });
    return map;
  }, [pendingDispatches]);

  // ---------------- City stocks aggregation (todas las ciudades) ----------------
  const [allCityStocks, setAllCityStocks] = useState({}); // { ciudad: { sku: cantidad } }
  useEffect(()=>{
    let unsub; (async ()=>{
      try {
        // Suscribirse a todos los cityStock usando subscribeCollection
        unsub = subscribeCollection('cityStock', (cityStockData) => {
          // Convertir array normalizado a objeto por ciudad (formato legacy)
          const data = {};
          cityStockData.forEach(item => {
            const ciudad = item.id; // El id es la ciudad en el formato normalizado
            if (!data[ciudad]) data[ciudad] = {};
            // Los demás campos son los SKUs
            Object.keys(item).forEach(key => {
              if (key !== 'id') data[ciudad][key] = item[key];
            });
          });
          setAllCityStocks(data);
        });
      } catch(err){ warn('[AlmacenCentral] no se pudo suscribir cityStock', err); }
    })(); return ()=> unsub && unsub();
  }, []);
  const stockCiudadesPorSku = useMemo(()=>{
    const map={};
    Object.values(allCityStocks).forEach(cityDoc => {
      for(const sku in cityDoc){ const v = Number(cityDoc[sku]||0); if(!v) continue; map[sku] = (map[sku]||0)+v; }
    });
    return map;
  }, [allCityStocks]);
  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
  <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-[#f09929]" /> Almacen Central</h2>
    <p className="text-sm text-neutral-400">Gestión básica del inventario central.</p>
      </header>
  <div className="grid lg:grid-cols-3 gap-6 items-start">
  <div className="rounded-2xl p-5 lg:col-span-1 bg-[#0f171e]">
          <form onSubmit={submit} className="space-y-4 text-sm">
            {/* Eliminado campo SKU visible: se autogenerará simple */}
            <input type="hidden" value={sku} readOnly />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Nombre *</label>
                <input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 text-sm" placeholder="Nombre del producto" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400">Stock</label>
                <input disabled={sintetico} type="number" maxLength={5} value={stock} onChange={e=>setStock(e.target.value.slice(0,5))} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 text-sm disabled:opacity-40 text-right" placeholder="0" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="chkSint" type="checkbox" checked={sintetico} onChange={e=>setSintetico(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="chkSint" className="text-[11px] text-neutral-400 select-none">Producto sintético (sin precio / costo / stock)</label>
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
              <button disabled={savingProduct} className={"px-4 py-2 font-semibold rounded-xl "+(savingProduct?"bg-neutral-500 cursor-not-allowed text-neutral-300":"bg-white text-neutral-900")}>{savingProduct ? (editingSku? 'Actualizando...' : 'Agregando...') : (editingSku ? 'Actualizar' : 'Agregar')}</button>
            </div>
          </form>
          <div className="mt-6 space-y-2 text-[11px] text-neutral-500 border-t border-neutral-800 pt-4">
            {/* Eliminado: Uso almacenamiento y botones de optimización/quitar imágenes */}
          </div>
          
          {/* Cuadro de Ajuste de Stock */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#e7922b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Ajuste de Stock
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-400 mb-1 block">Producto</label>
                <select
                  value={selectedProductForStock || ''}
                  onChange={e => {
                    const productId = e.target.value || null;
                    setSelectedProductForStock(productId);
                    setStockAdjustmentAmount(''); // Limpiar cantidad al cambiar producto
                    setStockAdjustmentMessage(''); // Limpiar mensaje al cambiar producto
                  }}
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea9216]"
                >
                  <option value="">Seleccionar producto...</option>
                  {filteredProducts.filter(p => !p.sintetico).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock || 0})</option>
                  ))}
                </select>
              </div>
              
              {selectedProductForStock && (() => {
                const selectedProd = products.find(p => p.id === selectedProductForStock);
                const currentStock = Number(selectedProd?.stock || 0);
                const adjustment = Number(stockAdjustmentAmount) || 0;
                const newStock = currentStock + adjustment;
                const isValidAmount = stockAdjustmentAmount && Number(stockAdjustmentAmount) > 0 && Number.isInteger(Number(stockAdjustmentAmount));
                
                return (
                  <>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-neutral-400 mb-1 block">Cantidad a sumar</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        max="100000"
                        value={stockAdjustmentAmount}
                        onChange={e => {
                          const val = e.target.value;
                          // Solo permitir números positivos enteros
                          if (val === '' || (Number(val) > 0 && Number.isInteger(Number(val)) && Number(val) <= 100000)) {
                            setStockAdjustmentAmount(val);
                            setStockAdjustmentMessage(''); // Limpiar mensaje al cambiar cantidad
                          }
                        }}
                        onBlur={() => {
                          // Validar al perder el foco
                          if (stockAdjustmentAmount && !isValidAmount) {
                            validateStockAdjustment();
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#ea9216]"
                      />
                      <div className="text-[10px] text-neutral-500 mt-1">Solo números enteros positivos (máx. 100,000)</div>
                    </div>
                    
                    <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1 text-xs">
                      <div className="flex justify-between text-neutral-400">
                        <span>Stock actual:</span>
                        <span className="font-semibold text-white">{currentStock.toLocaleString()}</span>
                      </div>
                      {isValidAmount && (
                        <>
                          <div className="flex justify-between text-neutral-400">
                            <span>Cantidad a sumar:</span>
                            <span className="font-semibold text-green-400">+{adjustment.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-neutral-300 pt-1 border-t border-neutral-700">
                            <span className="font-semibold">Nuevo stock:</span>
                            <span className="font-bold text-lg" style={{ color: '#e7922b' }}>{newStock.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetStockAdjustment}
                        disabled={adjustingStock}
                        className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        disabled={!isValidAmount || adjustingStock}
                        onClick={sumarStock}
                        className={`flex-1 px-4 py-2 font-semibold rounded-xl transition ${
                          !isValidAmount || adjustingStock
                            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                            : 'bg-[#ea9216] hover:bg-[#d88215] text-[#313841]'
                        }`}
                      >
                        {adjustingStock ? 'Sumando...' : 'Sumar al Stock'}
                      </button>
                    </div>
                    
                    {stockAdjustmentMessage && (
                      <div className={`text-xs mt-2 p-2 rounded-lg ${
                        stockAdjustmentMessage.includes('✅') 
                          ? 'text-green-400 bg-green-400/10 border border-green-400/20' 
                          : stockAdjustmentMessage.includes('⚠️')
                          ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
                          : 'text-red-400 bg-red-400/10 border border-red-400/20'
                      }`}>
                        {stockAdjustmentMessage}
                      </div>
                    )}
                  </>
                );
              })()}
              
              {!selectedProductForStock && (
                <div className="text-xs text-neutral-500 text-center py-2">
                  Selecciona un producto para ajustar su stock
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {/* Eliminado Catálogo Completo duplicado */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-neutral-400">{products.length} productos</div>
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
                    <td className="p-3">{p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-10 h-10 object-cover rounded-md border border-neutral-700" /> : <div className="w-10 h-10 rounded-md bg-neutral-800 grid place-items-center text-[10px] text-neutral-500">N/A</div>}</td>
                    <td className="p-3">{p.nombre}</td>
                    <td className={"p-3 text-right " + (p.stock <= 5 ? 'text-red-400' : '')}>{p.stock}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>edit(p)} className="text-xs px-2 py-1 bg-neutral-700 rounded-lg">Editar</button>
                        <button onClick={()=>remove(p)} className="text-xs px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-neutral-500 text-sm">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
            {/* Modal de confirmación de eliminación de producto */}
            {showDeleteModal && (
              <Modal onClose={cancelRemove} autoWidth>
                <div className="w-full max-w-xs px-1 space-y-4">
                  <h3 className="text-lg font-semibold text-red-400">¿Eliminar producto?</h3>
                  <div className="text-sm text-neutral-300 mb-2">Esta acción no se puede deshacer.<br/>Producto: <span className="font-bold text-neutral-100">{pendingDeleteProduct?.nombre}</span></div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={cancelRemove} className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold">Cancelar</button>
                    <button onClick={confirmRemove} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">Sí, eliminar</button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
      {/* Grilla de tarjetas de productos debajo de la tabla */}
      <div className="mt-10">
        {/* Cuadro informativo VENTAS NACIONALES centrado */}
        <div className="mb-4 flex justify-center w-full">
          <div className="rounded-2xl bg-[#10161e] p-4 flex flex-col gap-1 w-full max-w-xs shadow border border-[#181f25] items-center text-center">
          <div className="flex items-center gap-2 mb-1">
            {/* Reemplazar el icono de dolar por un icono de mundo */}
            <span className="text-xl" style={{ color: '#e7922b' }}>
              {/* Usar el icono Globe de lucide-react */}
              <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24" fill="none" stroke="#e7922b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </span>
            <span className="text-[15px] font-semibold" style={{ color: '#e7922b' }}>VENTAS NACIONALES</span>
          </div>
          {(() => {
             // SUMATORIA TOTAL DE "TOTAL POR VENDER" DE TODOS LOS PRODUCTOS
             const totalPorVenderGlobal = filteredProducts.reduce((acc,p)=>{
               const central = Number(p.stock)||0;
               const pend = pendientesPorSku[p.sku]||0;
               const ciudades = (typeof stockCiudadesPorSku !== 'undefined' && stockCiudadesPorSku) ? (stockCiudadesPorSku[p.sku]||0) : 0;
               const totalAll = central + pend + ciudades;
               const pares = Math.floor(totalAll/2);
               const precioPar = Number(p.precioPar)||0;
               const delivery = Number(p.delivery)||0;
               return acc + (precioPar - delivery) * pares;
             },0);
             return <div className="text-3xl font-bold text-white mt-1">Bs {totalPorVenderGlobal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>;
           })()}
          {/* Cuadros resumen Central, Pend., Ciudades */}
          {(() => {
            // Sumar totales de todos los productos
            const totalCentral = filteredProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
            // Si tienes campos reales para Pend. y Ciudades, reemplaza los 0 por los valores sumados
            const totalPend = Object.values(pendientesPorSku).reduce((a,b)=>a+b,0);
            const totalCiudades = filteredProducts.reduce((acc,p)=> acc + (stockCiudadesPorSku[p.sku]||0), 0);
            return (
              <div className="flex gap-2 mt-3 justify-center">
                <div className="bg-[#232b32] rounded-md min-w-[60px] min-h-[38px] flex flex-col items-center justify-center px-3 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Central</span>
                  <span className="font-bold text-white text-[17px] mt-0.5 flex items-center justify-center w-full">{totalCentral}</span>
                </div>
                <div className="bg-[#232b32] rounded-md min-w-[60px] min-h-[38px] flex flex-col items-center justify-center px-3 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Pend.</span>
                  <span className="font-bold text-white text-[17px] mt-0.5 flex items-center justify-center w-full">{totalPend}</span>
                </div>
                <div className="bg-[#232b32] rounded-md min-w-[60px] min-h-[38px] flex flex-col items-center justify-center px-3 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Ciudades</span>
                  <span className="font-bold text-white text-[17px] mt-0.5 flex items-center justify-center w-full">{totalCiudades}</span>
                </div>
              </div>
            );
          })()}
        </div>
        </div>
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-2 gap-y-1">
          {filteredProducts.filter(p => !p.sintetico).map((p) => (
            <div key={p.id} className="bg-[#151c22] rounded-xl p-2 border border-[#232b32] shadow flex flex-col gap-1 text-[13px] max-w-xs min-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-neutral-800 rounded-md flex items-center justify-center text-[9px] text-neutral-500 font-bold">{p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-8 h-8 object-cover rounded-md border border-neutral-700" /> : 'N/A'}</div>
                <div className="flex-1">
                  <div className="font-bold text-xs leading-tight" style={{ color: '#e7922b' }}>{p.nombre}</div>
                  {/* SKU removido por solicitud */}
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-[#232b32] text-[11px] font-bold px-2 py-0.5 rounded mb-1">
                    {(() => { const central = Number(p.stock)||0; const pend = pendientesPorSku[p.sku]||0; const ciudades = stockCiudadesPorSku ? (stockCiudadesPorSku[p.sku]||0) : 0; const totalAll = central + pend + ciudades; return (<><span style={{ color: '#e7922b' }}>TOTAL:</span> <span style={{ color: '#fff' }}>{totalAll}</span></>); })()}
                  </span>
                  <span className="bg-[#232b32] text-[11px] px-2 py-0.5 rounded">
                    {(() => { const central = Number(p.stock)||0; const pend = pendientesPorSku[p.sku]||0; const ciudades = stockCiudadesPorSku ? (stockCiudadesPorSku[p.sku]||0) : 0; const totalAll = central + pend + ciudades; const pares = Math.floor(totalAll/2); return (<><span style={{ color: '#e7922b' }}>PARES:</span> <span style={{ color: '#fff' }}>{pares}</span></>); })()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
                <div className="bg-[#232b32] rounded-md min-w-[40px] min-h-[38px] flex flex-col items-center justify-center px-1 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Central</span>
                  <span className="font-bold text-white text-[15px] mt-0.5 flex items-center justify-center w-full">{p.stock ?? 0}</span>
                </div>
                <div className="bg-[#232b32] rounded-md min-w-[40px] min-h-[38px] flex flex-col items-center justify-center px-1 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Pend.</span>
                  <span className="font-bold text-white text-[15px] mt-0.5 flex items-center justify-center w-full">{pendientesPorSku[p.sku]||0}</span>
                </div>
                <div className="bg-[#232b32] rounded-md min-w-[40px] min-h-[38px] flex flex-col items-center justify-center px-1 py-1">
                  <span className="text-neutral-400 text-[11px] leading-none">Ciudades</span>
                  <span className="font-bold text-white text-[15px] mt-0.5 flex items-center justify-center w-full">{stockCiudadesPorSku[p.sku]||0}</span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <div className="flex flex-col items-start w-[80px]">
                  <label className="text-[11px] text-neutral-400 mb-0.5">Delivery:</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full bg-neutral-800 rounded-md px-1 py-0.5 text-[12px] text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 border border-neutral-700"
                    placeholder="0"
                    value={typeof p.delivery === 'number' ? String(p.delivery) : (p.delivery ?? '')}
                    onChange={e => handleProductCardInput(p.id, 'delivery', e.target.value)}
                  />
                </div>
                <div className="flex flex-col items-start w-[80px]">
                  <label className="text-[11px] text-neutral-400 mb-0.5">Precio/par:</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full bg-neutral-800 rounded-md px-1 py-0.5 text-[12px] text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-600 border border-neutral-700"
                    placeholder="0"
                    value={typeof p.precioPar === 'number' ? String(p.precioPar) : (p.precioPar ?? '')}
                    onChange={e => handleProductCardInput(p.id, 'precioPar', e.target.value)}
                  />
                </div>
                <button
                  className={`text-[12px] px-3 py-0.5 rounded-md font-bold min-w-[56px] ${savingCard[p.id] ? 'bg-neutral-600 cursor-not-allowed text-neutral-300' : 'bg-amber-600 hover:bg-amber-700 text-[#1a1e23]'}`}
                  disabled={!!savingCard[p.id]}
                  onClick={() => { if(!savingCard[p.id]) fijarValoresProducto(p.id); }}
                >{savingCard[p.id] ? 'Guardando...' : 'Fijar'}</button>
              </div>
              <div className="flex justify-between text-xs mt-1">
                {(() => {
                  // Calcular pares sobre TOTAL (central + pendientes + ciudades)
                  const central = Number(p.stock)||0;
                  const pend = pendientesPorSku[p.sku]||0;
                  const ciudades = stockCiudadesPorSku ? (stockCiudadesPorSku[p.sku]||0) : 0;
                  const totalAll = central + pend + ciudades;
                  const pares = Math.floor(totalAll / 2);
                  const precioPar = Number(p.precioPar) || 0;
                  const delivery = Number(p.delivery) || 0;
                  const total = (precioPar - delivery) * pares;
                  return (
                    <span className="text-neutral-400 text-[12px]">
                      TOTAL POR VENDER: <span className="font-bold" style={{ color: '#e7922b' }}>{total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------- Almacén (vista solo lectura de inventario) ----------------------
function AlmacenView({ products, setProducts, dispatches, setDispatches, session, setConfirmModal }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [isDeletingDispatch, setIsDeletingDispatch] = useState(false);
  const [isUndoingDispatch, setIsUndoingDispatch] = useState(false);
  const [undoingDispatchId, setUndoingDispatchId] = useState(null);
  
  // Eliminar despacho pendiente
  async function handleDeleteDispatch(d) {
    setConfirmDelete(d);
  }

  async function confirmDeleteDispatch() {
    if (!confirmDelete || isDeletingDispatch) return; // Guard contra doble ejecución
    
    // Guardar estado anterior para rollback
    const previousProducts = [...products];
    const previousDispatches = [...dispatches];
    
    setIsDeletingDispatch(true);
    // Devolver stock local
    setProducts(prev => prev.map(p => {
      const it = confirmDelete.items.find(i => i.sku === p.sku);
      return it ? { ...p, stock: p.stock + Number(it.cantidad || 0) } : p;
    }));
    // Devolver stock en Supabase (solo no sintéticos usando id real)
    for (const it of confirmDelete.items) {
      const meta = products.find(p=>p.sku===it.sku);
      if(!meta || meta.sintetico || !meta.id) continue;
      try { 
        const { error } = await supabase
          .from('almacen_central')
          .update({ stock: (meta.stock || 0) + Number(it.cantidad || 0) })
          .eq('id', meta.id);
        if (error) warn('[Eliminar Despacho] Error restaurando stock', error);
      } catch(err) { warn('[Eliminar Despacho] Error restaurando stock', err); }
    }
    try {
      // Eliminar despacho de Supabase
      const { error } = await supabase
        .from('dispatches')
        .delete()
        .eq('id', confirmDelete.id);
      
      if (error) throw error;
      setDispatches(prev => prev.filter(x => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) {
      // Revertir actualización optimista si falla
      console.error('[Eliminar Despacho] Error:', e);
      setProducts(previousProducts);
      setDispatches(previousDispatches);
      toast.push({ type: 'error', title: 'Error', message: 'Error eliminando en Supabase: ' + (e?.message || 'desconocido') + '. Los cambios fueron revertidos.' });
    } finally {
      setIsDeletingDispatch(false);
    }
  }

  function cancelDeleteDispatch() {
    setConfirmDelete(null);
  }
  const ciudades = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ","PRUEBA"];
  const [fecha, setFecha] = useState(todayISO());
  const [ciudad, setCiudad] = useState(ciudades[0]);

  // Nueva barra de ciudades estilo ventas
  const [selectedCity, setSelectedCity] = useState(ciudades[0]);
  useEffect(() => { setCiudad(selectedCity); }, [selectedCity]);
  // Campo notas removido según requerimiento
  const [lineItems, setLineItems] = useState(() => products.map(p => ({ sku: p.sku, cantidad: 0 })));
  // Edición de despacho pendiente
  const [editId, setEditId] = useState(null);
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

  async function submit(e){
    e.preventDefault();
  if(isSubmittingDispatch){ warn('[despachos] submit ignorado (in-flight)'); return; }
    const items = lineItems.filter(i=>i.cantidad>0);
    if(!items.length){ toast.push({ type: 'error', title: 'Error', message: 'Ingresa cantidades' }); return; }
    // Validar stock disponible
    for(const it of items){
      const prod = products.find(p=>p.sku===it.sku);
      if(!prod) continue;
      if(prod.stock < it.cantidad){
        toast.push({ type: 'error', title: 'Error', message: 'Stock insuficiente para '+it.sku });
        return;
      }
    }
  setIsSubmittingDispatch(true);
  if(editId){
      const existing = dispatches.find(d=> d.id===editId);
      if(!existing){ toast.push({ type: 'error', title: 'Error', message: 'Despacho no encontrado' }); return; }
      if(existing.status==='confirmado'){ toast.push({ type: 'error', title: 'Error', message: 'No se puede editar un despacho confirmado' }); return; }
      const newItems = items; // ya filtrados >0
      // Mapas para diffs
      const oldMap = Object.fromEntries((existing.items||[]).map(it=> [it.sku, Number(it.cantidad||0)]));
      const newMap = Object.fromEntries(newItems.map(it=> [it.sku, Number(it.cantidad||0)]));
      // Validar disponibilidad adicional requerida
      for(const { sku } of newItems){
        const prevQty = oldMap[sku] || 0;
        const nextQty = newMap[sku] || 0;
        const diff = nextQty - prevQty; // positivo => se necesitan más pares
        if(diff > 0){
          const prod = products.find(p=>p.sku===sku);
          if(prod && !prod.sintetico && prod.stock < diff){
            toast.push({ type: 'error', title: 'Error', message: 'Stock central insuficiente al incrementar '+sku+' (+'+diff+')' });
            return;
          }
        }
      }
      // Guardar estado anterior para rollback en caso de error
      const previousProducts = [...products];
      const previousDispatches = [...dispatches];
      
      // Ajustar estado local de productos (stock central) según diffs (actualización optimista)
      setProducts(prev => prev.map(p=>{
        if(p.sintetico) return p;
        const prevQty = oldMap[p.sku] || 0;
        const nextQty = newMap[p.sku] || 0;
        if(prevQty === nextQty) return p;
        const diff = nextQty - prevQty; // >0 consumir, <0 devolver
        return { ...p, stock: p.stock - diff }; // diff negativo suma
      }));
      
      // Persistir ajustes de stock central en Supabase usando batch update (optimizado)
      const stockUpdateErrors = [];
      const actualizaciones = [];
      
      // Preparar array de actualizaciones
      for(const sku of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])){
        const prevQty = oldMap[sku] || 0;
        const nextQty = newMap[sku] || 0;
        if(prevQty === nextQty) continue;
        const diff = nextQty - prevQty;
        const meta = products.find(p=>p.sku===sku);
        if(!meta || meta.sintetico || !meta.id) continue;
        
        actualizaciones.push({
          id: meta.id,
          diff: diff
        });
      }
      
      // Si hay actualizaciones, ejecutar batch update
      if(actualizaciones.length > 0) {
        try {
          const { data, error } = await supabase.rpc('actualizar_stock_multiple', {
            actualizaciones: actualizaciones
          });
          
          if (error) {
            console.error('[editar despacho] Error en batch update de stock', error);
            // Si falla el batch, agregar todos como errores
            actualizaciones.forEach(act => {
              stockUpdateErrors.push({ sku: products.find(p=>p.id===act.id)?.sku, diff: act.diff, error });
            });
          } else if (data) {
            // Verificar si hubo errores individuales
            if (data.errores && data.errores.length > 0) {
              warn('[editar despacho] Algunos productos tuvieron errores:', data.errores);
              data.errores.forEach((err, idx) => {
                if (idx < actualizaciones.length) {
                  const act = actualizaciones[idx];
                  stockUpdateErrors.push({ 
                    sku: products.find(p=>p.id===act.id)?.sku, 
                    diff: act.diff, 
                    error: err 
                  });
                }
              });
            }
            log(`[editar despacho] Stock actualizado para ${data.actualizados || 0} productos`);
          }
        } catch(e){ 
          console.error('[editar despacho] Error en batch update de stock', e);
          // Si falla completamente, agregar todos como errores
          actualizaciones.forEach(act => {
            stockUpdateErrors.push({ sku: products.find(p=>p.id===act.id)?.sku, diff: act.diff, error: e });
          });
        }
      }
      
      // Si hubo errores al actualizar stock, revertir cambios locales
      if (stockUpdateErrors.length > 0) {
        console.error('[editar despacho] Errores al actualizar stock, revirtiendo cambios locales', stockUpdateErrors);
        setProducts(previousProducts);
        toast.push({ type: 'error', title: 'Error', message: 'Error al actualizar stock de productos. Los cambios fueron revertidos. Por favor, intente nuevamente.' });
        return;
      }
      
      // Actualizar documento del despacho en Supabase
      try {
        const ciudadNormalizada = normalizeCity(ciudad);
        const { error } = await supabase
          .from('dispatches')
          .update({ 
            fecha, 
            ciudad: ciudadNormalizada, 
            items: newItems 
          })
          .eq('id', editId);
        if (error) {
          // Revertir cambios locales si falla actualizar el despacho
          console.error('[editar despacho] Error actualizando despacho, revirtiendo cambios', error);
          setProducts(previousProducts);
          setDispatches(previousDispatches);
          toast.push({ type: 'error', title: 'Error', message: 'Error al actualizar el despacho. Los cambios fueron revertidos. Por favor, intente nuevamente.' });
          return;
        }
      } catch(e){ 
        // Revertir cambios locales si falla actualizar el despacho
        console.error('[editar despacho] Error actualizando despacho, revirtiendo cambios', e);
        setProducts(previousProducts);
        setDispatches(previousDispatches);
        toast.push({ type: 'error', title: 'Error', message: 'Error al actualizar el despacho. Los cambios fueron revertidos. Por favor, intente nuevamente.' });
        return;
      }
      
      // Actualizar estado local de despachos (solo si todo fue exitoso)
      setDispatches(prev => prev.map(d=> d.id===editId ? { ...d, fecha, ciudad, items: newItems } : d));
    } else {
      const record = { fecha, ciudad, items, status: 'pendiente', creadoAt: Date.now() };
      
      // Guardar estado anterior para rollback en caso de error
      const previousProducts = [...products];
      const previousDispatches = [...dispatches];
      
      // Actualización optimista: descontar stock local inmediatamente
      setProducts(prev => prev.map(p => {
        const it = items.find(i => i.sku === p.sku);
        return it ? { ...p, stock: p.stock - Number(it.cantidad || 0) } : p;
      }));
      
      // Generar ID temporal para el despacho (se reemplazará con el ID real de Supabase)
      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const ciudadNormalizada = normalizeCity(ciudad);
      
      // Actualización optimista: agregar despacho a la lista inmediatamente
      const optimisticDispatch = {
        id: tempId,
        fecha,
        ciudad: ciudadNormalizada,
        items: items,
        status: 'pendiente',
        creadoAt: Date.now()
      };
      setDispatches(prev => [optimisticDispatch, ...prev]);
      
      // Descontar stock en Supabase (solo no sintéticos)
      for (const it of items) {
        const meta = products.find(p=>p.sku===it.sku);
        if(!meta || meta.sintetico || !meta.id) continue;
        try { 
          const { error } = await supabase
            .from('almacen_central')
            .update({ stock: (meta.stock || 0) - Number(it.cantidad || 0) })
            .eq('id', meta.id);
          if (error) {
            warn('[Crear Despacho] Error descontando stock', error);
            // Revertir actualizaciones optimistas: productos y dispatches
            setProducts(previousProducts);
            setDispatches(previousDispatches);
            throw error;
          }
        } catch(err) { 
          warn('[Crear Despacho] Error descontando stock', err);
          // Revertir actualizaciones optimistas: productos y dispatches
          setProducts(previousProducts);
          setDispatches(previousDispatches);
          throw err;
        }
      }
  // NOTA (Opción A): Ya NO sumamos a cityStock en creación de despacho pendiente.
  // La ciudad recibe el stock únicamente cuando el despacho se CONFIRMA (see confirmDispatch).
  // Esto evita inflar stock por pendientes aún en tránsito.
      // Guardar despacho en Supabase
      try { 
        const { data: insertedData, error } = await supabase
          .from('dispatches')
          .insert({
            fecha,
            ciudad: ciudadNormalizada,
            items: items,
            status: 'pendiente'
          })
          .select()
          .single();
        
        if (error) {
          // Revertir actualizaciones optimistas
          setProducts(previousProducts);
          setDispatches(previousDispatches);
          throw error;
        }
        
        // Reemplazar despacho temporal con el real (con ID de Supabase)
        // NOTA: La suscripción de Supabase también agregará este despacho, pero el useEffect
        // que combina despachos eliminará duplicados por ID, así que esto es seguro
        if (insertedData) {
          setDispatches(prev => {
            // Eliminar el temporal y cualquier duplicado del real, luego agregar el real
            const filtered = prev.filter(d => d.id !== tempId && d.id !== insertedData.id);
            return [{ ...insertedData, status: 'pendiente' }, ...filtered];
          });
        }
      } catch(err) { 
        warn('[Crear Despacho] Error guardando', err);
        // Revertir actualizaciones optimistas
        setProducts(previousProducts);
        setDispatches(previousDispatches);
        toast.push({ type: 'error', title: 'Error', message: 'Error al crear despacho: ' + (err?.message || 'desconocido') });
      }
    }
  // Reset cantidades
  setLineItems(lineItems.map(l=>({...l,cantidad:0})));
  setEditId(null);
  setIsSubmittingDispatch(false);
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

  // Excluir productos sintéticos de las columnas de inventario/despachos
  const productosColumns = useMemo(() => products.filter(p=>!p.sintetico), [products]);
  const [fechaDesdeConf, setFechaDesdeConf] = useState('');
  const [fechaHastaConf, setFechaHastaConf] = useState('');
  const [pageConf, setPageConf] = useState(1);
  // Pendientes: no se filtran por ciudad ni fechas
  const dispatchesPendientes = useMemo(() => 
    dispatches.filter(d=> d.status !== 'confirmado')
      .slice().sort((a,b)=> b.fecha.localeCompare(a.fecha)), // más reciente arriba
    [dispatches]
  );
  // Confirmados base (ordenar más reciente primero)
  const dispatchesConfirmadosBase = useMemo(() => 
    dispatches.filter(d=> d.status === 'confirmado')
      .slice().sort((a,b)=> b.fecha.localeCompare(a.fecha)),
    [dispatches]
  );
  const dispatchesConfirmadosFiltrados = useMemo(() => 
    dispatchesConfirmadosBase.filter(d=> {
      // Normalizar la comparación: el filtro viene en formato desnormalizado (EL ALTO)
      // pero d.ciudad está normalizado (el_alto), así que normalizamos el filtro para comparar
      const ciudadMatches = !filtroCiudad || d.ciudad === normalizeCity(filtroCiudad);
      const fechaDesdeMatches = !fechaDesdeConf || d.fecha >= fechaDesdeConf;
      const fechaHastaMatches = !fechaHastaConf || d.fecha <= fechaHastaConf;
      return ciudadMatches && fechaDesdeMatches && fechaHastaMatches;
    }),
    [dispatchesConfirmadosBase, filtroCiudad, fechaDesdeConf, fechaHastaConf]
  );
  const PAGE_CONF = 20;
  const totalPagesConf = useMemo(() => 
    Math.max(1, Math.ceil(dispatchesConfirmadosFiltrados.length / PAGE_CONF)),
    [dispatchesConfirmadosFiltrados.length]
  );
  const pageConfItems = useMemo(() => 
    dispatchesConfirmadosFiltrados.slice((pageConf-1)*PAGE_CONF, pageConf*PAGE_CONF),
    [dispatchesConfirmadosFiltrados, pageConf]
  );
  useEffect(()=>{ setPageConf(1); }, [filtroCiudad, fechaDesdeConf, fechaHastaConf]);
  useEffect(()=>{ if(pageConf>totalPagesConf) setPageConf(1); }, [pageConf, totalPagesConf]);

  async function undoDispatch(rec){
    if(isUndoingDispatch || undoingDispatchId === rec.id) return; // Guard contra doble ejecución
    
    setConfirmModal({
      isOpen: true,
      title: 'Deshacer despacho',
      message: `¿Deshacer despacho de ${denormalizeCity(rec.ciudad)} (${rec.fecha})?`,
      onConfirm: async () => {
        setIsUndoingDispatch(true);
        setUndoingDispatchId(rec.id);
        
        // Guardar estado anterior para rollback
        const previousProducts = [...products];
        const previousDispatches = [...dispatches];
        
        try {
          // Actualización optimista: actualizar estado local inmediatamente
          if(rec.status==='confirmado'){
            // Restaurar stock del almacén central (ya que se había descontado al crear el despacho)
            setProducts(prev => prev.map(p => {
              const it = rec.items.find(i=>i.sku===p.sku);
              return it ? { ...p, stock: p.stock + it.cantidad } : p;
            }));
          }
          // Eliminar registro del estado local
          setDispatches(prev => prev.filter(d => d.id !== rec.id));
          
          // Eliminar despacho en Supabase
          const { deleteDispatch } = await import('./supabaseUtils-dispatch.js');
          const result = await deleteDispatch(rec.id);
          
          if (!result.success) {
            throw result.error || new Error('Error al eliminar despacho');
          }
          
          // Éxito: notificación
          toast.push({ type: 'success', title: 'Éxito', message: 'Despacho deshecho correctamente' });
        } catch (err) {
          // Rollback: revertir actualización optimista si falla
          console.error('[undoDispatch] Error:', err);
          setProducts(previousProducts);
          setDispatches(previousDispatches);
          toast.push({ type: 'error', title: 'Error', message: 'Error al deshacer despacho: ' + (err?.message || 'Error desconocido') });
        } finally {
          setIsUndoingDispatch(false);
          setUndoingDispatchId(null);
        }
      },
      confirmText: 'Deshacer',
      cancelText: 'Cancelar',
      confirmColor: 'orange',
      isLoading: isUndoingDispatch && undoingDispatchId === rec.id
    });
  }

  // Confirmar despacho: transacción atómica (usa runTransaction + increment)
  const [dispatchInFlightId, setDispatchInFlightId] = useState(null); // anti-multiclick confirmación
  async function confirmDispatch(d){
    if(!d || d.status==='confirmado' || dispatchInFlightId===d.id) return;
    setDispatchInFlightId(d.id);
    // Optimista (UI rápida); si falla revertiremos
    const optimisticTime = Date.now();
    setDispatches(prev => prev.map(x => x.id===d.id ? { ...x, status:'confirmado', confirmadoAt: optimisticTime } : x));
    
    try {
      const { confirmDispatch: confirmDispatchSupabase } = await import('./supabaseUtils-dispatch.js');
      const result = await confirmDispatchSupabase(d);
      
      if (!result.success) {
        throw result.error || new Error('Error confirmando despacho');
      }
    } catch (e){
      // Revertir optimista si falló
      setDispatches(prev => prev.map(x => x.id===d.id ? { ...x, status:'pendiente', confirmadoAt: undefined } : x));
      console.error('[confirmDispatch] Error:', e);
      // (Silencioso ahora) - se podría mostrar toast
    } finally {
      setDispatchInFlightId(prev => prev===d.id ? null : prev);
    }
  }

  // Migración de confirmados antiguos desde localStorage a despachosHistorial (una sola vez)
  useEffect(()=>{
    (async()=>{
      try {
        if(localStorage.getItem('despachosHistorial.migrated.v1')) return;
        const raw = localStorage.getItem(LS_KEYS.warehouseDispatches);
        if(!raw){ localStorage.setItem('despachosHistorial.migrated.v1','1'); return; }
        const arr = JSON.parse(raw);
        if(!Array.isArray(arr)){ localStorage.setItem('despachosHistorial.migrated.v1','1'); return; }
        const confirmados = arr.filter(r=> r && r.status==='confirmado' && r.id);
        if(!confirmados.length){ localStorage.setItem('despachosHistorial.migrated.v1','1'); return; }
        for(const rec of confirmados){
          try {
            // Verificar si ya existe en Supabase
            const { data: existing } = await supabase
              .from('dispatches')
              .select('id')
              .eq('id', rec.id)
              .eq('status', 'confirmado')
              .single();
            
            if (existing) continue;
            
            const ciudadNormalizada = normalizeCity(rec.ciudad);
            const { error } = await supabase
              .from('dispatches')
              .insert({
                id: rec.id,
                ciudad: ciudadNormalizada,
                fecha: rec.fecha,
                items: rec.items || [],
                status: 'confirmado',
                created_at: rec.creadoAt || rec.createdAt ? new Date(rec.creadoAt || rec.createdAt).toISOString() : new Date().toISOString(),
                confirmed_at: rec.confirmadoAt ? new Date(rec.confirmadoAt).toISOString() : new Date().toISOString()
              });
            
            if (error) throw error;
          } catch {}
        }
        localStorage.setItem('despachosHistorial.migrated.v1','1');
      } catch {/* ignore */}
    })();
  }, []);

  return (
    <div className="flex-1 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-[#f09929]" /> Despacho de Productos</h2>
        <p className="text-sm text-neutral-400">Registrar envíos de stock a ciudades y ver acumulados.</p>
      </header>

      {/* Barra de ciudades estilo ventas */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold mr-1">Ciudades:</div>
        {ciudades.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCity(c)}
            className={
              "px-4 py-2 rounded-xl text-sm font-semibold transition " +
              (selectedCity === c
                ? "bg-[#ea9216] text-[#313841]"
                : "bg-[#10161e] hover:bg-[#273947]/40 text-neutral-200")
            }
            style={{letterSpacing:'0.5px'}}
          >{c}</button>
        ))}
      </div>

  {/* Lista de productos y stock en la ciudad seleccionada (en tiempo real desde Firestore) */}
  <AlmacenCityStock city={selectedCity} products={products} />

      <div className="grid lg:grid-cols-3 gap-6 items-start mb-8">
        <div className="rounded-2xl p-5 lg:col-span-1 bg-[#0f171e]">
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Fecha</label>
                <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" />
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
                </tr>
              </thead>
              <tbody>
                {productosColumns.map(p => (
                    <tr key={p.sku} className="border-t border-neutral-800">
                      <td className="p-3 font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                          {p.imagen ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" /> : <span className="text-[9px] text-neutral-500">IMG</span>}
                        </div>
                        <span className="truncate max-w-[180px]">{p.nombre}</span>
                      </td>
                      <td className={"p-3 text-right "+(p.stock<=5?'text-red-400' : '')}>{p.stock}</td>
                    </tr>
                ))}
                {productosColumns.length===0 && <tr><td colSpan={2} className="p-6 text-center text-neutral-500 text-sm">Sin productos</td></tr>}
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
                      <td className="p-2">{denormalizeCity(d.ciudad)}</td>
                      {productosColumns.map(p=>{
                        const it = d.items.find(i=>i.sku===p.sku);
                        return <td key={p.sku} className="p-2 text-right">{it?it.cantidad: ''}</td>;
                      })}
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-400 border border-yellow-600/40">Esperando confirmación</span>
                      </td>
                      <td className="p-2 flex gap-2">
                        <button
                          onClick={()=>confirmDispatch(d)}
                          disabled={dispatchInFlightId===d.id}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${dispatchInFlightId===d.id ? 'bg-emerald-700 text-neutral-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                        >{dispatchInFlightId===d.id ? 'Confirmando...' : 'Confirmar'}</button>
                        <button onClick={()=>startEdit(d)} className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px]">Editar</button>
                        <button onClick={()=>handleDeleteDispatch(d)} className="px-2 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-[10px]">Eliminar</button>
                      </td>
      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#181f26] rounded-xl p-6 shadow-xl w-full max-w-xs text-center border border-neutral-700">
            <div className="mb-4 text-lg font-semibold text-red-500">¿Eliminar despacho?</div>
            <div className="mb-6 text-neutral-400 text-sm">Esta acción no se puede deshacer.<br/>¿Seguro que deseas eliminar el despacho de <b style={{color:'#e7922b'}}>{denormalizeCity(confirmDelete.ciudad)} ({toDMY(confirmDelete.fecha)})</b>?</div>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={confirmDeleteDispatch} 
                disabled={isDeletingDispatch}
                className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingDispatch ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button 
                onClick={cancelDeleteDispatch} 
                disabled={isDeletingDispatch}
                className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
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
                        <td className="p-2">{denormalizeCity(d.ciudad)}</td>
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
    </div>
  );
}

// Despachos pendientes para ciudad con opción de confirmar o cancelar
function CityPendingShipments({ city, dispatches, setDispatches, products, session }) {
  // Normalizar ciudad para comparar (dispatches.ciudad está normalizado: "la_paz", city viene desnormalizado: "LA PAZ")
  const cityNormalized = normalizeCity(city);
  const pendientes = dispatches.filter(d=>d.ciudad===cityNormalized && d.status==='pendiente');
  const [openId, setOpenId] = useState(null); // id abierto
  const [openPos, setOpenPos] = useState(null); // posición del botón lupa
  useEffect(()=>{
    if(!openId) return;
    function handleKey(e){ if(e.key==='Escape'){ setOpenId(null); setOpenPos(null);} }
    window.addEventListener('keydown', handleKey);
    return ()=> window.removeEventListener('keydown', handleKey);
  }, [openId]);
  if(!pendientes.length) return null;
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
              <div className="text-[10px] text-neutral-500">Pendiente de aprobación</div>
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
function CityStock({ city, products, sales, dispatches, setSales, session, onStockRefresh }) {
  // Hooks siempre al inicio - TODOS los hooks deben estar aquí antes de cualquier return condicional
  const [showRaw, setShowRaw] = useState(false);
  const btnRef = useRef(null);
  const [openedAt, setOpenedAt] = useState(null);
  const [pendingDetailSku, setPendingDetailSku] = useState(null);
  const [cityStock, setCityStock] = useState({});
  // Estados para eliminación de venta pendiente (FASE 7.2.1)
  const [removingPendingId, setRemovingPendingId] = useState(null);
  const [isRemovingPending, setIsRemovingPending] = useState(false);
  // Mostrar productos y cantidades reales del cityStock
  const enviados = Object.fromEntries(
    Object.entries(cityStock)
      .filter(([sku, cant]) => cant > 0)
  );
  const sumEnviado = Object.values(enviados).reduce((sum, cant) => sum + Number(cant), 0);
  useEffect(()=>{ if(showRaw && !openedAt) setOpenedAt(new Date()); }, [showRaw, openedAt]);
  useEffect(()=>{ if(!showRaw) return; function onKey(e){ if(e.key==='Escape') setShowRaw(false); } window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey); }, [showRaw]);

  // Leer cityStock real de Supabase
  // Usar un contador para forzar refresh cuando sea necesario
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  
  useEffect(() => {
    if (!city) return;
    // Usar subscribeCityStock de supabaseUtils
    const unsub = subscribeCityStock(city, (stockData) => {
      // Actualizar directamente con los datos de Realtime (fuente de verdad)
      setCityStock(stockData || {});
    });
    return () => unsub && unsub();
  }, [city, stockRefreshKey]); // Agregar stockRefreshKey para forzar refresh

  // Escuchar evento personalizado para forzar refresh del stock
  useEffect(() => {
    const handleRefresh = (event) => {
      const refreshCity = event.detail?.city;
      const currentCity = (city || '').toUpperCase();
      if (refreshCity && (refreshCity.toUpperCase() === currentCity)) {
        // Forzar refresh del stock
        setStockRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('refreshCityStock', handleRefresh);
    return () => window.removeEventListener('refreshCityStock', handleRefresh);
  }, [city]);

  // Rastrear hash anterior de ventas pendientes para actualización optimista
  const previousPendingHashRef = useRef('');
  const previousHashRef = useRef('');
  
  // Actualización optimista del stock cuando se registra una nueva venta pendiente
  useEffect(() => {
    if (!city) return;
    
    const cityNorm = (city || '').toUpperCase();
    
    // Obtener ventas pendientes de esta ciudad
    const pendingSales = sales.filter(s => 
      (s.ciudad || '').toUpperCase() === cityNorm && 
      (s.estadoEntrega === 'pendiente' || !s.estadoEntrega) &&
      !s.sintetico
    );
    
    // Crear hash de ventas pendientes para detectar nuevas
    const pendingHash = pendingSales
      .map(s => `${s.id || s.idPorCobrar || s.idHistorico}-${s.sku}-${s.cantidad}-${s.skuExtra || ''}-${s.cantidadExtra || 0}`)
      .sort()
      .join('|');
    
    // Si hay nuevas ventas pendientes (hash cambió), actualizar stock optimistamente
    if (previousPendingHashRef.current !== '' && previousPendingHashRef.current !== pendingHash) {
      // Calcular diferencia: nuevas ventas pendientes
      const previousIds = new Set(previousPendingHashRef.current.split('|').map(h => h.split('-')[0]));
      const newPendingSales = pendingSales.filter(s => {
        const saleId = s.id || s.idPorCobrar || s.idHistorico;
        return saleId && !previousIds.has(String(saleId));
      });
      
      // Descontar optimistamente las nuevas ventas pendientes del stock
      if (newPendingSales.length > 0) {
        setCityStock(prevStock => {
          const optimisticStock = { ...prevStock };
          newPendingSales.forEach(sale => {
            if (sale.sku && sale.cantidad) {
              const currentStock = optimisticStock[sale.sku] || 0;
              optimisticStock[sale.sku] = Math.max(0, currentStock - Number(sale.cantidad || 0));
            }
            if (sale.skuExtra && sale.cantidadExtra) {
              const currentStock = optimisticStock[sale.skuExtra] || 0;
              optimisticStock[sale.skuExtra] = Math.max(0, currentStock - Number(sale.cantidadExtra || 0));
            }
          });
          return optimisticStock;
        });
      }
    }
    
    previousPendingHashRef.current = pendingHash;
  }, [sales, city]);
  
  // Forzar refresh del stock cuando cambian las ventas confirmadas de esta ciudad
  // Esto detecta tanto nuevas confirmaciones como ediciones que afectan el stock
  useEffect(() => {
    if (!city) return;
    
    // Crear un hash de las ventas confirmadas de esta ciudad para detectar cambios
    const cityNorm = (city || '').toUpperCase();
    const confirmedSalesHash = sales
      .filter(s => (s.ciudad || '').toUpperCase() === cityNorm && 
                   (s.estadoEntrega === 'confirmado' || s.estadoEntrega === 'entregada') &&
                   !s.sintetico)
      .map(s => `${s.id || s.idPorCobrar || s.idHistorico}-${s.sku}-${s.cantidad}-${s.skuExtra || ''}-${s.cantidadExtra || 0}`)
      .sort()
      .join('|');
    
    // Comparar con el hash anterior
    if (previousHashRef.current !== confirmedSalesHash && previousHashRef.current !== '') {
      // Hubo un cambio en las ventas confirmadas, forzar refresh del stock
      const timer = setTimeout(() => {
        setStockRefreshKey(prev => prev + 1);
      }, 300); // Delay corto para permitir que Supabase procese el cambio
      previousHashRef.current = confirmedSalesHash;
      return () => clearTimeout(timer);
    }
    previousHashRef.current = confirmedSalesHash;
  }, [sales, city]);

  if (!city) return null;

  // Mostrar stock real de cityStock
  const rows = useMemo(() => 
    products.filter(p=>!p.sintetico && cityStock[p.sku] > 0).map(p=> ({
      sku: p.sku,
      nombre: p.nombre,
      disponible: cityStock[p.sku] || 0
    })),
    [products, cityStock]
  );
  if(!rows.length) return null;
  
  async function removePending(id){
    if(!session || session.rol!=='admin') return;
    if(isRemovingPending) return; // Guard contra doble ejecución
    setRemovingPendingId(id);
  }
  
  async function confirmRemovePending(){
    if(!removingPendingId || isRemovingPending) return;
    
    const saleId = removingPendingId;
    const sale = sales.find(s => s.id === saleId);
    
    if(!sale) {
      setRemovingPendingId(null);
      return;
    }
    
    // Guardar estado anterior para rollback
    const previousSales = [...sales];
    
    // Actualización optimista: eliminar del estado local inmediatamente
    setSales(prev => prev.filter(s => s.id !== saleId));
    setIsRemovingPending(true);
    
    try {
      // Eliminar de Supabase usando eliminarVentaPendiente
      const { eliminarVentaPendiente } = await import('./supabaseUtils');
      await eliminarVentaPendiente(saleId, sale);
      
      // Cerrar modal cuando Supabase confirma
      setRemovingPendingId(null);
    } catch(err) {
      // Revertir actualización optimista si falla
      console.error('[removePending] Error eliminando venta pendiente, revirtiendo cambios', err);
      setSales(previousSales);
      toast.push({ type: 'error', title: 'Error', message: 'Error al eliminar el pedido pendiente: ' + (err?.message || 'desconocido') + '. Los cambios fueron revertidos.' });
    } finally {
      setIsRemovingPending(false);
    }
  }
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
                <div className="text-sm font-semibold text-[#e7922b] truncate" title={prod?prod.nombre:pendingDetailSku}>Pendientes · {prod?prod.nombre:pendingDetailSku}</div>
                <button onClick={()=>setPendingDetailSku(null)} className="text-[11px] px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600">Cerrar</button>
              </div>
              {pendList.length>0 ? (
                <div className="space-y-2 max-h-60 overflow-auto pr-1">
                  {pendList.map(p=>{
                    return (
                      <div key={p.id} className="flex items-start gap-2 text-[11px] bg-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/60">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#e7922b] truncate" title={p.vendedora||p.vendedor}>{firstName(p.vendedora||p.vendedor||'')}</div>
                          <div className="text-[10px] text-neutral-400 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>{toDMY(p.fecha)}</span>
                            {p.hora && <span>{p.hora}</span>}
                            {p.metodo==='Encomienda' && <span className="text-blue-300" title={p.destinoEncomienda}>{p.destinoEncomienda||''}</span>}
                            {p.motivo && <span className="text-[#e7922b]" title={p.motivo}>{p.motivo}</span>}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 flex flex-wrap gap-1">
                            {p.cantidad!=null && <span>Cant: {p.cantidad}</span>}
                            {p.cantidadExtra!=null && p.skuExtra && <span>Extra: {p.cantidadExtra}</span>}
                            {p.precio!=null && <span>Monto: {currency(p.total || (Number(p.precio||0)*Number(p.cantidad||0)))}</span>}
                          </div>
                        </div>
                        {session?.rol==='admin' && (
                          <button 
                            onClick={()=>removePending(p.id)} 
                            disabled={isRemovingPending}
                            className="mt-0.5 p-1 rounded bg-red-600/70 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed" 
                            title="Borrar pendiente"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500">Sin pendientes (refresca la página si persiste el número).</div>
              )}
            </div>
          </div>
        );
      })()}
      {/* Modal de confirmación para eliminar venta pendiente */}
      {removingPendingId && (() => {
        const saleToRemove = sales.find(s => s.id === removingPendingId);
        const prod = saleToRemove ? products.find(p => p.sku === saleToRemove.sku) : null;
        return (
          <Modal onClose={() => !isRemovingPending && setRemovingPendingId(null)} autoWidth>
            <div className="w-full max-w-[360px] px-1 space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">
                <X className="w-4 h-4" /> Eliminar pedido pendiente
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                ¿Eliminar el pedido pendiente de <span className="font-semibold text-neutral-100">
                  {prod ? prod.nombre : saleToRemove?.sku || 'producto desconocido'}
                </span>?
                {saleToRemove && saleToRemove.cantidad && (
                  <span className="block mt-1">Cantidad: {saleToRemove.cantidad}</span>
                )}
              </p>
              <p className="text-[10px] text-neutral-500">
                Esta acción restaurará el stock en la ciudad y no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button 
                  onClick={() => setRemovingPendingId(null)} 
                  disabled={isRemovingPending}
                  className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmRemovePending} 
                  disabled={isRemovingPending}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRemovingPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ---------------------- Mis Números (Admin) ----------------------
function MisNumerosView({ products, numbers, setNumbers }) {
  const [sku, setSku] = useState(products[0]?.sku || '');
  const [otherName, setOtherName] = useState('');
  const [telefonia, setTelefonia] = useState('');
  const [celular, setCelular] = useState('');
  const [caduca, setCaduca] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSavingNumber, setIsSavingNumber] = useState(false);
  const prodMap = useMemo(()=> Object.fromEntries(products.map(p=>[p.sku,p.nombre])), [products]);
  const hoy = todayISO();

  // Supabase sync (tabla mis_numeros)
  useEffect(()=>{
    let unsub;
    (async()=>{
      try {
        unsub = subscribeCollection('numbers', (numbersData) => { // 'numbers' se mapea a 'mis_numeros' en Supabase
          // Ordenar por caduca ascendente
          const sorted = [...numbersData].sort((a, b) => {
            const caducaA = a.caduca || '';
            const caducaB = b.caduca || '';
            return caducaA.localeCompare(caducaB);
          });
          log('[MisNumerosView] Datos recibidos de suscripción:', sorted.length, 'números');
          setNumbers(sorted);
          setLoading(false);
        }, {
          orderBy: { column: 'caduca', ascending: true }
        });
      } catch {
        setLoading(false);
      }
    })();
    return ()=> unsub && unsub();
  }, [setNumbers]);

  const ordenados = [...numbers].sort((a,b)=> (a.caduca||'').localeCompare(b.caduca||'')); 

  async function submit(e) {
    e.preventDefault();
    if(isSavingNumber) return; // Guard contra doble ejecución
    
    setMsg('');
    if(!sku) return setMsg('Selecciona producto');
    if(sku==='otros' && !otherName.trim()) return setMsg('Nombre requerido para Otros');
    if(!telefonia) return setMsg('Telefonía requerida');
    if(!celular) return setMsg('Celular requerido');
    if(!caduca) return setMsg('Fecha de caducidad requerida');
    
    setIsSavingNumber(true);
    
    try {
      // Guardar estado anterior para rollback
      const previousNumbers = [...numbers];
      
      if(editingId){
        // Actualización optimista: actualizar el estado local inmediatamente
        // Nota: En el estado local mantenemos 'otros' para la UI, pero en Supabase guardamos null
        const updatedNumber = {
          id: editingId,
          sku: sku === 'otros' ? null : (sku || null), // En BD: null cuando es 'otros'
          telefonia: telefonia.trim() || null,
          nombreOtro: sku === 'otros' ? (otherName.trim() || null) : null,
          celular: celular.trim() || null,
          caduca: caduca || null
        };
        
        setNumbers(prev => {
          const updated = prev.map(n => n.id === editingId ? { ...n, ...updatedNumber } : n);
          return updated.sort((a, b) => {
            const caducaA = a.caduca || '';
            const caducaB = b.caduca || '';
            return caducaA.localeCompare(caducaB);
          });
        });
        
        const { error } = await supabase
          .from('mis_numeros')
          .update({
            sku: sku === 'otros' ? null : (sku || null), // 'otros' no existe en products, usar null
            telefonia: telefonia.trim() || null,
            nombre_otro: sku === 'otros' ? (otherName.trim() || null) : null,
            celular: celular.trim() || null,
            caduca: caduca || null
          })
          .eq('id', editingId);
        
        if (error) throw error;
        setMsg('Actualizado');
        clearForm();
      } else {
        // Generar ID temporal para actualización optimista
        const tempId = uid();
        const newNumber = {
          id: tempId,
          sku: sku === 'otros' ? 'otros' : (sku || null), // En UI mantenemos 'otros' si es null
          telefonia: telefonia.trim() || null,
          nombreOtro: sku === 'otros' ? (otherName.trim() || null) : null,
          celular: celular.trim() || null,
          caduca: caduca || null
        };
        
        // Actualización optimista: agregar el nuevo número al estado local ANTES de Supabase
        setNumbers(prev => {
          const updated = [...prev, newNumber];
          return updated.sort((a, b) => {
            const caducaA = a.caduca || '';
            const caducaB = b.caduca || '';
            return caducaA.localeCompare(caducaB);
          });
        });
        
        const { error, data } = await supabase
          .from('mis_numeros')
          .insert({
            sku: sku === 'otros' ? null : (sku || null), // 'otros' no existe en products, usar null
            telefonia: telefonia.trim() || null,
            nombre_otro: sku === 'otros' ? (otherName.trim() || null) : null,
            celular: celular.trim() || null,
            caduca: caduca || null
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Reemplazar número temporal con el real (con ID de Supabase)
        if (data) {
          setNumbers(prev => {
            const filtered = prev.filter(n => n.id !== tempId);
            const realNumber = {
              id: data.id,
              sku: data.sku || (sku === 'otros' ? 'otros' : null), // En UI mantenemos 'otros' si es null
              telefonia: data.telefonia || null,
              nombreOtro: data.nombre_otro || null,
              celular: data.celular || null,
              caduca: data.caduca || null,
              createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
            };
            const updated = [...filtered, realNumber];
            return updated.sort((a, b) => {
              const caducaA = a.caduca || '';
              const caducaB = b.caduca || '';
              return caducaA.localeCompare(caducaB);
            });
          });
        }
        
        setMsg('Guardado');
        clearForm();
      }
    } catch (e){
      // Rollback: revertir actualización optimista si falla
      console.error('[Guardar Número] Error:', e);
      setNumbers(previousNumbers);
      setMsg('Error guardando: ' + (e?.message || 'desconocido'));
    } finally {
      setIsSavingNumber(false);
    }
  }

  function clearForm(){
    setSku(products[0]?.sku || '');
    setOtherName('');
  setTelefonia('');
    setCelular('');
    setCaduca('');
    setEditingId(null);
  }

  function startEdit(n){
    setEditingId(n.id);
    // Si sku es null pero hay nombreOtro, significa que es 'otros'
    // Si sku es null y no hay nombreOtro, usar el primer producto disponible
    // Si sku existe, usarlo directamente
    let skuValue = n.sku;
    if (!skuValue) {
      if (n.nombreOtro) {
        skuValue = 'otros';
      } else {
        // Si no hay sku ni nombreOtro, usar el primer producto disponible
        skuValue = products[0]?.sku || '';
      }
    }
    setSku(skuValue);
    setOtherName(n.nombreOtro || '');
    setTelefonia(n.telefonia || n.email || ''); // Usar telefonia si existe, sino email (compatibilidad)
    setCelular(n.celular || '');
    setCaduca(n.caduca || '');
    setMsg('');
  }

  // Estado para modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  function askRemove(id) {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  }

  function confirmRemove() {
    const id = pendingDeleteId;
    setShowDeleteModal(false);
    setPendingDeleteId(null);
    (async()=>{
      try {
        const { error } = await supabase
          .from('mis_numeros')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        if(editingId===id) clearForm();
      } catch {
        setMsg('Error al borrar');
      }
    })();
  }

  function cancelRemove() {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
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
              <label className="text-xs uppercase tracking-wide text-neutral-400">Telefonía</label>
              <input value={telefonia} onChange={e=>setTelefonia(e.target.value)} className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1" placeholder="telefonía" />
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
              <button type="submit" disabled={isSavingNumber} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {isSavingNumber ? (editingId ? 'Actualizando...' : 'Guardando...') : (editingId ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </form>
          <div className="text-[10px] text-neutral-500 mt-4">Datos sincronizados con Supabase.</div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f171e] border border-neutral-800 rounded-2xl overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-800/60">
                <tr>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-left">Telefonía</th>
                  <th className="p-2 text-left">Celular</th>
                  <th className="p-2 text-left">Caducidad</th>
                  <th className="p-2 text-center">Días</th>
                  <th className="p-2 text-center">Estado</th>
                  <th className="p-2 text-right w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="p-6 text-center text-neutral-500 text-sm">Cargando...</td></tr>}
                {!loading && ordenados.map(n=>{
                  const dLeft = daysLeft(n.caduca);
                  const expired = dLeft < 0;
                  const soon = !expired && dLeft <= 7;
                  // Determinar nombre a mostrar: si es 'otros' (sku null con nombreOtro) usar nombreOtro, sino buscar en prodMap, sino mostrar sku o 'Sin producto'
                  let displayName = 'Sin producto';
                  if (!n.sku && n.nombreOtro) {
                    // sku es null pero hay nombreOtro = es 'otros'
                    displayName = n.nombreOtro || 'Otros';
                  } else if (n.sku === 'otros') {
                    // Compatibilidad: si sku es literalmente 'otros' (no debería pasar, pero por si acaso)
                    displayName = n.nombreOtro || 'Otros';
                  } else if (n.sku && prodMap[n.sku]) {
                    displayName = prodMap[n.sku];
                  } else if (n.sku) {
                    displayName = n.sku;
                  }
                  const st = statusInfo(n);
                  return (
                    <tr key={n.id} className={"border-t border-neutral-800 "+(expired?'bg-red-900/20': soon?'bg-yellow-700/10':'')}>
                      <td className="p-2 truncate" title={displayName}>{displayName || '—'}</td>
                      <td className="p-2 truncate" title={n.telefonia || n.email || ''}>{n.telefonia || n.email || '—'}</td>
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
                          <button onClick={()=>askRemove(n.id)} className="px-2 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-[10px]">Eliminar</button>
      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#18232e] border border-neutral-700 rounded-2xl p-6 w-full max-w-xs shadow-xl flex flex-col items-center">
            <div className="text-lg font-semibold text-red-400 mb-2">¿Eliminar registro?</div>
            <div className="text-sm text-neutral-300 mb-4 text-center">Esta acción no se puede deshacer.</div>
            <div className="flex gap-3 w-full justify-center">
              <button onClick={confirmRemove} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold">Sí, eliminar</button>
              <button onClick={cancelRemove} className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
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
  // Log para depuración: mostrar el valor de 'precio' de cada venta
  useEffect(() => {
    sales.forEach((s, i) => {
      log(`[HistorialView] Fila ${i}: id=${s.id}, precio=`, s.precio, 'obj:', s);
    });
  }, [sales]);
  // Log para depuración: mostrar el contenido de sales recibido
  useEffect(() => {
    log('[HistorialView] sales recibidas:', sales);
  }, [sales]);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  const [tableFilter, setTableFilter] = useState('all'); // all | today | week | month
  const [cityFilter, setCityFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  // Confirmadas verdaderas (para gráfico)
  const confirmedBase = sales.filter(s=> s.estadoEntrega === 'entregada' || s.estadoEntrega === 'confirmado');
  // Base para tabla: confirmadas + canceladas liquidadas + canceladas con costo (todas) + pendientes
  let confirmadas = sales.filter(s=> s.estadoEntrega === 'entregada' || s.estadoEntrega === 'confirmado' || ((s.estadoEntrega==='cancelado') && s.settledAt));
  const canceladasConCosto = sales.filter(s=> s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0)
    .map(s=> ({
      ...s,
      id: s.id+':canc', // id visual extra
      idPorCobrar: s.idPorCobrar || s.id, // asegurar campo para flujo de depósito
      originalId: s.id,
  // Representar gasto como una salida: total y neto negativos
  // (la tabla ya suma 'total' para monto y 'delivery' usa gasto normal; para canceladas con costo queremos que aparezca -gasto en Total)
  total: -Number(s.gastoCancelacion||0),
  gasto: Number(s.gastoCancelacion||0), // se muestra en columna Delivery como positivo (costo incurrido)
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

  // TABLA_ENTREGAS_CONFIRMADAS: tabla principal de entregas confirmadas en menú ventas
  const rows = useMemo(() => tablaVentas
    .slice()
    .sort((a, b) => {
      // Prioridad: los que tienen timestamp de confirmación o cancelación (reciente primero)
      const ta = a.confirmadoAt || a.canceladoAt || 0;
      const tb = b.confirmadoAt || b.canceladoAt || 0;
      const aHas = !!ta; const bHas = !!tb;
      if(aHas && !bHas) return -1;
      if(!aHas && bHas) return 1;
      if(tb !== ta) return tb - ta; // ambos tienen -> descendente
      // Luego por fecha textual (más reciente primero)
      if ((a.fecha || '') !== (b.fecha || '')) return (b.fecha || '').localeCompare(a.fecha || '');
      // Luego por id descendente para estabilidad
      return (b.id || '').localeCompare(a.id || '');
    })
    .map(s => {
      // Adaptar para mostrar aunque falten campos
      const p1 = products.find(p => p.sku === s.sku);
      const p2 = s.skuExtra ? products.find(p => p.sku === s.skuExtra) : null;
  // Solo mostrar el precio unitario, sin multiplicar por cantidad
  // Usar solo el campo 'precio' del documento, nunca 'monto'
  const precioUnit = s.precio != null ? Number(s.precio) : 0;
  // El total solo si existe explícitamente
  const total = s.total != null ? Number(s.total) : null;
      const gasto = Number(s.gasto || 0);
      // Calcular neto evitando doble resta del gasto.
      // Heurísticas:
      // 1. Si es sintética cancelada: usar neto explícito o total - gasto.
      // 2. Si total coincide con (precio - gasto) => total ya es neto, no restar de nuevo.
      // 3. Si total coincide con precio (bruto) => restar gasto para obtener neto.
      // 4. Caso sintético de gasto puro (precio 0, total negativo = -gasto) => tomar total.
      // 5. Fallback: total - gasto.
      let netoCalc;
      const precioNum = Number(s.precio || 0);
      if (s.sinteticaCancelada) {
        netoCalc = s.neto != null ? Number(s.neto) : ((total ?? 0) - gasto);
      } else if (total != null) {
        const isTotalAlreadyNet = Math.abs((precioNum - gasto) - total) < 0.000001;
        const isTotalBruto = Math.abs(precioNum - total) < 0.000001;
        const isPureGasto = (precioNum === 0 && total < 0 && Math.abs(total) === gasto);
        if (isTotalAlreadyNet || isPureGasto) {
          netoCalc = total; // no volver a restar
        } else if (isTotalBruto) {
          netoCalc = total - gasto;
        } else {
          // Ambiguo: asumir que total es bruto y restar gasto una vez
          netoCalc = total - gasto;
        }
      } else {
        // Sin campo total explícito: derivar de precio
        netoCalc = precioNum - gasto;
      }
      return {
        id: s.id || '(sin id)',
        fecha: s.fecha || '(sin fecha)',
        hora: s.horaEntrega || '',
        ciudad: s.ciudad || '(sin ciudad)',
        vendedor: s.vendedora || s.vendedoraId || '(sin vendedora)',
        productos: [p1?.nombre || s.sku || '(sin producto)', p2 ? p2.nombre : null].filter(Boolean).join(' + '),
        cantidades: [s.cantidad ?? '', s.cantidadExtra ?? ''].filter(v => v !== '').join(' + '),
  precio: precioUnit,
  total,
        gasto,
        neto: netoCalc,
        metodo: s.metodo || '(sin método)',
        celular: s.celular || '',
        comprobante: s.comprobante,
        destinoEncomienda: s.destinoEncomienda,
        motivo: s.motivo,
        sku: s.sku,
        cantidad: s.cantidad,
        skuExtra: s.skuExtra,
        cantidadExtra: s.cantidadExtra,
        sinteticaCancelada: !!s.sinteticaCancelada,
        gastoCancelacion: s.gastoCancelacion,
        esPendiente: !!s.esPendiente,
        estadoEntrega: s.estadoEntrega || (s.esPendiente ? 'pendiente' : 'confirmado'),
        // Mostrar datos crudos si faltan campos clave
        _raw: s
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
              <button onClick={onGoDeposit} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold shadow hover:brightness-110 active:scale-[0.98]">Generar depósito</button>
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
          {/* Usar rows (dataset ya normalizado del historial) para evitar recalcular y garantizar tiempo real */}
          <ChartVentas period={period} sales={rows} products={products} />
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
            let precio=0, delivery=0, neto=0;
            pageRows.forEach(r=>{
              if(r.sku) skuTotals[r.sku] = (skuTotals[r.sku]||0) + Number(r.cantidad||0);
              if(r.skuExtra) skuTotals[r.skuExtra] = (skuTotals[r.skuExtra]||0) + Number(r.cantidadExtra||0);
              if(r.sinteticaCancelada){
                delivery += Number(r.gastoCancelacion||0);
                neto += Number(r.neto||0);
              } else {
                precio += Number(r.precio||0); // unit price only
                delivery += Number(r.gasto||0);
                neto += Number(r.neto||0);
              }
            });
            return { skuTotals, precio, delivery, neto };
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
                  <th className="p-2 text-right">Precio</th>
                  <th className="p-2 text-right">Delivery</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-center">Celular</th>
                  <th className="p-2 text-center">Comp.</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r=>{
                  const cantidades = productOrder.map(sku=>{ if(r.sinteticaCancelada) return 0; let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                  const isNegBase = Number(r.total||0) < 0 || Number(r.neto||0) < 0;
                  const isNeg = (r.metodo==='Encomienda') ? false : isNegBase;
                  return (
                    <tr key={r.id} className={"border-t border-neutral-800 "+(r.sinteticaCancelada? 'bg-red-900/10':'')+(isNeg && !r.sinteticaCancelada? ' bg-red-900/5':'')}>
                      <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{toDMY(r.fecha)}</td>
                      <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.hora}</td>
                      <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.ciudad}</td>
                      <td className="p-2 text-left max-w-[160px]">{
                        r.metodo==='Encomienda'
                          ? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>
                          : (()=>{
                              const esCancelCosto = r.estadoEntrega==='cancelado' && Number(r.gastoCancelacion||0)>0;
                              if(esCancelCosto) return ''; // no mostrar texto "Cancelación con costo delivery"
                              return r.motivo? <span className="text-[12px] text-[#e7922b]" title={r.motivo}>{r.motivo}</span> : '';
                            })()
                      }</td>
                      <td className="p-2 whitespace-nowrap">{firstName(r.vendedor)}</td>
                      {cantidades.map((c,i)=> <td key={i} className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{c||''}</td>)}
                      {/* Precio (mostrar precio unitario). Si es cancelada sintética se deja vacío */}
                      <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{r.sinteticaCancelada? '' : currency(r.precio)}</td>
                      <td className={"p-2 text-right "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>
                        {typeof r.gastoCancelacion === 'number' && r.gastoCancelacion > 0
                          ? currency(r.gastoCancelacion)
                          : (r.gasto ? currency(r.gasto) : '')}
                      </td>
                      {/* Total (neto) */}
                      <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(r.neto)}</td>
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
                    <td className="p-2 text-right font-bold text-[#e7922b]">{
                      (()=>{
                        // Suma de precios unitarios (no se multiplica por cantidades) solo de la página actual
                        const totalPrecioPage = pageRows.reduce((acc,r)=> acc + (r.sinteticaCancelada ? 0 : Number(r.precio)||0), 0);
                        return totalPrecioPage ? currency(totalPrecioPage) : '';
                      })()
                    }</td>
                    <td className="p-2 text-right font-bold text-[#e7922b]">{pageTotals.delivery?currency(pageTotals.delivery):''}</td>
                    <td className="p-2 text-right font-bold text-[#e7922b]">{pageTotals.neto?currency(pageTotals.neto):''}</td>
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
  console.log('[TeamMessagesWidget] 🚀 Componente ejecutándose...', { hasSession: !!session, sessionRol: session?.rol });
  
  // Debug: verificar session y rol
  if (!session) {
    console.log('[TeamMessagesWidget] ❌ No hay session, ocultando widget');
    return null;
  }
  
  const myGroup = (users.find(u=>u.id===session.id)?.grupo) || session.grupo || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  // Para admin: selección de grupo a visualizar y a enviar
  const isAdmin = session?.rol === 'admin';
  
  // Debug logs
  console.log('[TeamMessagesWidget] 🔍 Debug:', {
    hasSession: !!session,
    sessionId: session?.id,
    sessionRol: session?.rol,
    isAdmin,
    usersLength: users?.length || 0
  });
  
  // Nueva restricción: solo admins pueden ver/usar el widget (ocultar para vendedores)
  if(!isAdmin) {
    console.log('[TeamMessagesWidget] ❌ Usuario no es admin, ocultando widget');
    return null;
  }
  
  console.log('[TeamMessagesWidget] ✅ Usuario es admin, mostrando widget');
  const allGroups = useMemo(()=> Array.from(new Set(users.map(u=>u.grupo).filter(Boolean))).sort(), [users]);
  const [viewGroup, setViewGroup] = useState(isAdmin ? '__ALL__' : myGroup);
  const [sendGroup, setSendGroup] = useState(isAdmin ? '' : myGroup);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [markingReadId, setMarkingReadId] = useState(null);
  if(!isAdmin && !myGroup) return null; // vendedora sin grupo -> ocultar
  // Mensajes visibles
  const visibleMsgs = (isAdmin && viewGroup==='__ALL__') ? teamMessages.slice() : teamMessages.filter(m=> m.grupo === (isAdmin? viewGroup : myGroup));
  const msgs = visibleMsgs.sort((a,b)=> b.createdAt - a.createdAt);
  // Unread (admin cuenta sobre TODOS los mensajes)
  const unread = (isAdmin ? teamMessages : msgs).filter(m=> m.authorId!==session.id && !m.readBy.includes(session.id)).length;
  async function send(){
    if(isSendingMessage) return; // Guard contra doble ejecución
    
    const targetGroup = isAdmin ? sendGroup : myGroup;
    const t = text.trim(); 
    if(!t) return; 
    if(!targetGroup){ 
      toast.push({ type: 'error', title: 'Error', message: 'Selecciona un grupo' }); 
      return; 
    }
    if(t.length>500){ 
      toast.push({ type: 'error', title: 'Error', message: 'Máx 500 caracteres' }); 
      return; 
    }
    
    setIsSendingMessage(true);
    
    // Guardar estado anterior para rollback
    const previousMessages = [...teamMessages];
    const previousText = text;
    
    try {
      const authorNombre = (session.nombre||'') + ' ' + (session.apellidos||'');
      const tempId = uid();
      const msg = { 
        id: tempId, 
        grupo: targetGroup, 
        authorId: session.id, 
        authorNombre: authorNombre.trim(), 
        text: t, 
        createdAt: Date.now(), 
        readBy: [session.id] 
      };
      
      // Actualización optimista: agregar mensaje al estado local inmediatamente
      setTeamMessages(prev=> [msg, ...prev]);
      setText('');
      
      // Guardar en Supabase
      const { error, data } = await supabase
        .from('team_messages')
        .insert({
          grupo: targetGroup,
          author_id: session.id,
          author_nombre: authorNombre.trim(),
          text: t,
          read_by: [session.id]
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Reemplazar mensaje temporal con el real (con ID de Supabase)
      if (data) {
        setTeamMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId);
          return [{
            id: data.id,
            grupo: data.grupo,
            authorId: data.author_id,
            authorNombre: data.author_nombre,
            text: data.text,
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            readBy: Array.isArray(data.read_by) ? data.read_by : []
          }, ...filtered];
        });
      }
      
      // Éxito: notificación
      toast.push({ type: 'success', title: 'Éxito', message: 'Mensaje enviado correctamente' });
    } catch (err) {
      // Rollback: revertir actualización optimista si falla
      console.error('[send] Error:', err);
      setTeamMessages(previousMessages);
      setText(previousText);
      toast.push({ type: 'error', title: 'Error', message: 'Error al enviar mensaje: ' + (err?.message || 'Error desconocido') });
    } finally {
      setIsSendingMessage(false);
    }
  }
  async function markRead(id){
    if(isMarkingRead || markingReadId === id) return; // Guard contra doble ejecución
    if(!id) return;
    
    // Verificar que el mensaje no esté ya marcado como leído
    const message = teamMessages.find(m => m.id === id);
    if(!message || message.readBy.includes(session.id)) return;
    
    setIsMarkingRead(true);
    setMarkingReadId(id);
    
    // Guardar estado anterior para rollback
    const previousMessages = [...teamMessages];
    
    try {
      // ACTUALIZACIÓN OPTIMISTA: Actualizar estado local inmediatamente
      setTeamMessages(prev => prev.map(m => 
        m.id === id && !m.readBy.includes(session.id)
          ? { ...m, readBy: [...m.readBy, session.id] }
          : m
      ));
      
      // Actualizar en Supabase
      const currentMessage = teamMessages.find(m => m.id === id);
      if(currentMessage) {
        const updatedReadBy = [...(currentMessage.readBy || []), session.id];
        const { error } = await supabase
          .from('team_messages')
          .update({ read_by: updatedReadBy })
          .eq('id', id);
        
        if (error) throw error;
      }
      
      // Éxito: notificación (FASE 9.8)
      toast.push({ type: 'success', title: 'Éxito', message: 'Mensaje marcado como leído' });
    } catch (err) {
      // ROLLBACK: Revertir actualización optimista si falla
      console.error('[markRead] Error:', err);
      setTeamMessages(previousMessages);
      toast.push({ type: 'error', title: 'Error', message: 'Error al marcar mensaje como leído: ' + (err?.message || 'Error desconocido') });
    } finally {
      setIsMarkingRead(false);
      setMarkingReadId(null);
    }
  }
  function remove(id){ setTeamMessages(prev=> prev.filter(m=>m.id!==id)); if(confirmDeleteId===id) setConfirmDeleteId(null); }
  useEffect(()=>{ setConfirmDeleteId(null); }, [viewGroup, open]);
  
  console.log('[TeamMessagesWidget] 🎨 Renderizando JSX:', { open, shouldShowButton: !open });
  
  return (
    <>
      {!open && (
        <button
          onClick={()=>{
            console.log('[TeamMessagesWidget] 🖱️ Botón CLICKEADO!');
            setOpen(true);
          }}
          className="fixed right-6 z-[9999] w-12 h-12 rounded-full bg-[#e7922b] text-[#1a2430] font-bold shadow-lg flex items-center justify-center hover:brightness-110 active:scale-95"
          style={{ 
            bottom: window.innerWidth <= 640 ? '5rem' : '6rem',
            right: '1.5rem',
            position: 'fixed',
            zIndex: 9999,
            opacity: 1,
            visibility: 'visible'
          }}
        >
          <MessageSquare className="w-6 h-6" />
          {unread>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{unread}</span>}
        </button>
      )}
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
                <button onClick={send} className="h-16 px-4 rounded-xl bg-[#e7922b] text-[#1a2430] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed" disabled={!text.trim() || (isAdmin && !sendGroup) || isSendingMessage}>
                  {isSendingMessage ? 'Enviando...' : 'Enviar'}
                </button>
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
                            <button 
                              onClick={()=>markRead(m.id)} 
                              disabled={isMarkingRead && markingReadId === m.id}
                              className="px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isMarkingRead && markingReadId === m.id ? 'Marcando...' : 'Leído'}
                            </button>
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
  // Nueva lógica: cada barra = sumatoria EXACTA de la columna 'total' mostrada en el Historial.
  // Incluir:
  //  - Ventas confirmadas (entregada|confirmado)
  //  - Canceladas con costo (filas sintéticas negativas) donde total ya viene negativo en rows
  //  - Productos sintéticos (su total ya viene en la fila)
  // Derivación: si una fila no tiene 'total', se reconstruye como precio*cantidad (+ extra) SIN restar delivery (igual que tabla que usa 'total' explícito si existe, si no lo muestra vacío; aquí asumimos valor bruto si faltara).
  const data = useMemo(()=>{
    if(!sales || !sales.length) return [];
    // Asegurar fecha YYYY-MM-DD
    const norm = sales.map(s=>{
      let fecha = s.fecha || s._raw?.fecha;
      if(!fecha && s.createdAt && typeof s.createdAt.seconds==='number'){
        fecha = new Date(s.createdAt.seconds*1000).toISOString().slice(0,10);
      }
      return { ...s, fecha };
    }).filter(s=> !!s.fecha);
    // Filas elegibles: confirmadas, entregadas, canceladas con costo sintéticas (sinteticaCancelada) y cualquier fila con total numérico.
    const elegibles = norm.filter(s=> (
      s.sinteticaCancelada || s.estadoEntrega==='entregada' || (s.estadoEntrega||'confirmado')==='confirmado'
    ));
    function totalFila(s){
      if(typeof s.total === 'number') return Number(s.total);
      // reconstrucción mínima si no hay total: precio principal * cantidad (+ extra)
      const p1 = products.find(p=>p.sku===s.sku);
      const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra):null;
      const bruto = (Number(p1?.precio||s.precio||0)*Number(s.cantidad||0)) + (s.skuExtra ? Number(p2?.precio||0)*Number(s.cantidadExtra||0):0);
      return bruto; // no restamos gasto para reflejar SUMATORIA de la columna total (que ya lo incluiría si fue guardado)
    }
    const baseTodayISO = todayISO(); // Fecha actual Bolivia YYYY-MM-DD
    // Helper: sumar/restar días sobre una ISO (tratada como fecha en Bolivia) sin depender de TZ local
    function shiftISO(dateISO, delta){
      const [y,m,d] = dateISO.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m-1, d));
      dt.setUTCDate(dt.getUTCDate()+delta);
      const yy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
      const dd = String(dt.getUTCDate()).padStart(2,'0');
      return `${yy}-${mm}-${dd}`;
    }
    if(period==='week'){
      const days = [...Array(7)].map((_,i)=> shiftISO(baseTodayISO, -(6-i)));
      const map = Object.fromEntries(days.map(d=>[d,0]));
      elegibles.forEach(s=>{ if(map[s.fecha]!=null) map[s.fecha]+= totalFila(s); });
      return days.map(d=>({ label:d, total: map[d] }));
    }
    if(period==='month'){
      const [yearStr,monthStr] = baseTodayISO.split('-');
      const year = Number(yearStr); const month = Number(monthStr); // month 1..12
      const daysInMonth = new Date(year, month, 0).getDate(); // usar mes real
      const map={};
      for(let day=1; day<=daysInMonth; day++){
        const iso = `${yearStr}-${monthStr}-${String(day).padStart(2,'0')}`;
        map[iso]=0;
      }
      elegibles.forEach(s=>{ if(map[s.fecha]!=null) map[s.fecha]+= totalFila(s); });
      return Object.keys(map).map(k=>({ label:k.slice(8,10), total: map[k] }));
    }
    // quarter -> últimas 12 semanas
    const weeks=[]; for(let i=11;i>=0;i--){ const endISO = shiftISO(baseTodayISO, -(i*7)); const startISO = shiftISO(endISO, -6); weeks.push({ startISO, endISO, total:0 }); }
    elegibles.forEach(s=>{ const val= totalFila(s); if(!val) return; for(const w of weeks){ if(s.fecha>=w.startISO && s.fecha<=w.endISO){ w.total+=val; break; } } });
    return weeks.map(w=>({ label:w.startISO, total:w.total }));
  }, [sales, period, products]);

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
      {data.length===0 ? (
        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">Sin datos para el período seleccionado.</div>
      ) : (
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
      )}
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
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-md grid place-items-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={(autoWidth ? "" : "w-full max-w-lg ") + "rounded-2xl p-5 relative bg-[#0f171e] " + className}
      >
        {!disableClose && <button className="absolute right-3 top-3 p-1 bg-neutral-800 rounded-full" onClick={onClose}><X className="w-4 h-4" /></button>}
        {children}
      </motion.div>
    </motion.div>
  );
}

function SaleForm({ products, session, onSubmit, initialSku, fixedCity }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(todayISO());
  const isAdmin = session?.rol === 'admin';
  const today = todayISO();
  const ciudades = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ","PRUEBA"];
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
  const [comprobanteFile, setComprobanteFile] = useState(null); // File para Supabase Storage
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [celular, setCelular] = useState("");
  // Notas removidas según requerimiento
  const [destinoEncomienda, setDestinoEncomienda] = useState("");
  const [motivo, setMotivo] = useState(""); // motivo para productos sintéticos
  const [saving, setSaving] = useState(false); // estado guardando venta

  // Forzar que cada vez que se abre el formulario la fecha arranque en el día actual
  useEffect(()=>{ setFecha(todayISO()); },[]);

  // ya no actualizamos precio unitario
  useEffect(()=>{
    if(initialSku){
      setSku(initialSku);
    }
  }, [initialSku]);

  async function submit(e) {
    e.preventDefault();
  if(saving) return; // evita multiclick
    // Validar fecha para no admins (vendedoras)
    if(!isAdmin && fecha < today){
      toast.push({ type: 'error', title: 'Error', message: 'No puedes seleccionar una fecha pasada.' });
      setFecha(today);
      return;
    }
    if(!sku) { toast.push({ type: 'error', title: 'Error', message: 'Producto inválido' }); return; }
    const prodActual = products.find(p=>p.sku===sku);
    const esSintetico = !!prodActual?.sintetico;
    if(esSintetico){
      if(!motivo.trim()) { toast.push({ type: 'error', title: 'Error', message: 'Ingresa un motivo' }); return; }
    } else {
      if(!cantidad || cantidad <=0) { toast.push({ type: 'error', title: 'Error', message: 'Cantidad inválida' }); return; }
      if(skuExtra && cantidadExtra <=0) { toast.push({ type: 'error', title: 'Error', message: 'Cantidad adicional inválida' }); return; }
    }
  function build12(h,m,ap){ if(!h) return ''; return `${h}:${m} ${ap}`; }
  const horaEntrega = build12(hIni,mIni,ampmIni); // sin hora fin
  if(metodo==='Encomienda' && !destinoEncomienda.trim()) { toast.push({ type: 'error', title: 'Error', message: 'Ingresa destino de la encomienda' }); return; }
  // Subir comprobante si aplica
  let comprobanteFinal;
  if(!esSintetico && comprobanteFile){
    try {
      setSubiendo(true);
      // Usar Supabase Storage (tanto en localhost como en Vercel)
      const result = await uploadComprobanteToSupabase(comprobanteFile, 'comprobantes');
      comprobanteFinal = result.url || result.secure_url;
      setComprobanteUrl(comprobanteFinal);
    } catch(err){
      console.error('Error subiendo comprobante', err);
      toast.push({ type: 'error', title: 'Error', message: 'Error al subir comprobante: '+(err?.message||err) });
      setSubiendo(false);
      return;
    } finally { setSubiendo(false); }
  }
  try {
    setSaving(true);
    await onSubmit({ fecha, ciudad: ciudadVenta, sku, cantidad: esSintetico?1:Number(cantidad), skuExtra: esSintetico? undefined : (skuExtra || undefined), cantidadExtra: esSintetico? undefined : (skuExtra ? Number(cantidadExtra) : undefined), precio: esSintetico?0:Number(precioTotal||0), horaEntrega, vendedora: session.nombre, vendedoraId: session.id, metodo: esSintetico? undefined : metodo, celular: esSintetico? undefined : celular, destinoEncomienda: (!esSintetico && metodo==='Encomienda')? destinoEncomienda.trim(): undefined, comprobante: esSintetico? undefined : (comprobanteFinal || undefined), motivo: esSintetico? motivo.trim(): undefined });
  } finally {
    setSaving(false);
  }
  }

  return (
    <form
      onSubmit={e=> e.preventDefault()}
      onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); } }}
      className="space-y-3"
    >
  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#f09929]" /> Registrar venta</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Fecha</label>
          <input
            type="date"
            value={fecha}
            min={isAdmin ? undefined : today}
            onChange={(e) => {
              const v = e.target.value;
              if(!isAdmin && v < today) return; // ignorar selección inválida
              setFecha(v);
            }}
            className="w-full bg-neutral-800 rounded-xl px-3 py-2 mt-1"
          />
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
                    {products.filter(p=>p.sku!==sku && !p.sintetico).map(p=> <option key={p.sku} value={p.sku}>{p.nombre}</option>)}
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
                    <input type="file" accept="image/*,.pdf" onChange={e=>{
                      const f = e.target.files?.[0]; if(!f){ setComprobanteFile(null); setComprobanteUrl(null); return; }
                      if(f.size > 2*1024*1024){ toast.push({ type: 'error', title: 'Error', message: 'Archivo supera 2MB' }); return; }
                      setComprobanteFile(f);
                    }} className="text-xs" />
                    <div className="text-[10px] text-neutral-500">Se subirá a Supabase Storage al guardar (máx 2MB).</div>
                    {subiendo && <div className="text-[10px] text-blue-400">Subiendo...</div>}
                    {comprobanteUrl && <div className="text-[10px] text-green-400">Subido: <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="underline">ver</a></div>}
                    {!comprobanteUrl && comprobanteFile && !subiendo && <div className="text-[10px] text-neutral-400">Listo para subir.</div>}
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
        <button
          type="button"
          onClick={submit}
          disabled={saving || subiendo}
          className={`px-4 py-2 rounded-xl font-semibold ${ (saving||subiendo) ? 'bg-neutral-600 text-neutral-300 cursor-not-allowed' : 'bg-white text-neutral-900'}`}
        >{saving ? 'Guardando venta...' : 'Guardar venta'}</button>
      </div>
    </form>
  );
}

// ---------------------- Registrar Venta (vista dedicada) ----------------------
function RegisterSaleView({ products, setProducts, sales, setSales, session, dispatches }) {
  const { push } = useToast();
  const [selectedCity, setSelectedCity] = useState(null);
  // Suscripción en tiempo real al stock de la ciudad seleccionada
  const [cityStock, setCityStock] = useState({});
  useEffect(() => {
    if (!selectedCity) return;
    // Usar subscribeCityStock de supabaseUtils
    const unsub = subscribeCityStock(selectedCity, (stockData) => {
      setCityStock(stockData || {});
    });
    return () => unsub && unsub();
  }, [selectedCity]);
  const [showSale, setShowSale] = useState(false);
  const [initialSku, setInitialSku] = useState(null);
  const cities = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ","PRUEBA"];
  const allowed = useMemo(() => {
    const assigned = session.productos || [];
    // Admin o vendedor con lista vacía => todos.
    if (session.rol === 'admin' || assigned.length === 0) return products;
    return products.filter(p => assigned.includes(p.sku));
  }, [products, session]);

  function openSale(p){
    if(!selectedCity) { toast.push({ type: 'error', title: 'Error', message: 'Primero selecciona la ciudad.' }); return; }
    setInitialSku(p.sku);
    setShowSale(true);
  }

  async function addSale(payload){
    const product = products.find(p=>p.sku===payload.sku);
    if(!product) {
      push({ type:'error', title:'Producto', message:'Producto no encontrado' });
      return;
    }
    const esSintetico = !!product.sintetico;
    if(esSintetico && payload.cantidad !== 1){ payload.cantidad = 1; }
    
    // Obtener producto extra si existe
    const productExtra = payload.skuExtra ? products.find(p => p.sku === payload.skuExtra) : null;
    
    // Validar stock usando función común (validación de ciudad)
    if(payload.ciudad){
      const validation = await validateStockForSale({
        product,
        cantidad: payload.cantidad,
        productExtra,
        cantidadExtra: payload.cantidadExtra,
        ciudad: payload.ciudad,
        validationType: 'city', // RegisterSaleView valida stock de ciudad
        onError: push
      });
      
      if (!validation.valid) {
        return; // El error ya fue mostrado por onError
      }
    }
    
    // Si pasa validaciones, registrar venta pendiente (la función SQL transaccional descuenta el stock automáticamente)
    
    // Guardar estado anterior para rollback en caso de error
    const previousCityStock = { ...cityStock };
    
    // Actualización optimista: descontar stock inmediatamente en la UI
    if (!esSintetico && payload.ciudad && payload.sku) {
      setCityStock(prev => {
        const updated = { ...prev };
        const currentStock = Number(updated[payload.sku] || 0);
        updated[payload.sku] = Math.max(0, currentStock - Number(payload.cantidad || 0));
        
        // Descontar stock adicional si existe
        if (payload.skuExtra && payload.cantidadExtra) {
          const currentStockExtra = Number(updated[payload.skuExtra] || 0);
          updated[payload.skuExtra] = Math.max(0, currentStockExtra - Number(payload.cantidadExtra));
        }
        
        return updated;
      });
    }
    
    try {
      const result = await registrarVentaPendiente({
        ...payload,
        usuario: session?.nombre || session?.email || '',
        estadoEntrega: 'pendiente',
      });
      setShowSale(false);
      // No mostrar notificación de éxito - la actualización visual del stock es suficiente
      return result; // Retornar ID de venta para integración WhatsApp
    } catch (err) {
      // Revertir actualización optimista en caso de error
      setCityStock(previousCityStock);
      console.error('[addSale] Error al registrar venta:', err);
      push({ type: 'error', title: 'Error al registrar venta', message: err?.message || 'No se pudo registrar la venta. El stock no se descontó.' });
    }
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
            const esSintetico = !!p.sintetico;
            // Stock real de Firestore para la ciudad (sin restar ventas pendientes locales)
            const stockBase = cityStock[p.sku] || 0;
            return (
              <button key={p.sku} onClick={()=>openSale(p)} className="group rounded-3xl p-3 transition flex flex-col gap-3 bg-[#0f171e] hover:ring-2 hover:ring-neutral-600/40 w-full max-w-[280px] mx-auto">
                <div className="text-[15px] font-semibold tracking-wide text-center uppercase leading-snug line-clamp-2 px-1" title={p.nombre}>{p.nombre}</div>
                <div className="relative w-full rounded-2xl bg-neutral-800 overflow-hidden border border-neutral-700 shadow-inner">
                  <div className="w-full pb-[100%]"></div>
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-500">SIN IMAGEN</span>
                  )}
                  {!esSintetico && (
                    <div className="absolute top-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-[20px] font-semibold text-[#f09929] leading-none" title={`Stock Firestore: ${stockBase}`}>{stockBase}</div>
                  )}
                </div>
                {!esSintetico && (
                  <div className="text-[15px] font-semibold text-[#f09929] tracking-wide text-center">STOCK: {stockBase}</div>
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
            <SaleForm products={allowed} session={session} onSubmit={addSale} initialSku={initialSku} fixedCity={selectedCity} cityStock={cityStock} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------- Ventas (listado dedicado) ----------------------
function VentasView({ sales, setSales, products, session, users = [], dispatches, setDispatches, setProducts, setView, setDepositSnapshots }) {
  const cities = ["EL ALTO","LA PAZ","ORURO","SUCRE","POTOSI","TARIJA","COCHABAMBA","SANTA CRUZ","PRUEBA"]; // removido 'SIN CIUDAD'
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

  const rows = useMemo(() => sales.map(s => {
    const p = products.find(p=>p.sku===s.sku);
    return { ...s, nombre: p?.nombre || '—' };
  }), [sales, products]);
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({});
  function beginEdit(sale) {
    setEditingSale(sale);
    setEditForm({ ...sale });
  }
  function updateEditField(field, value) {
    setEditForm(f => ({ ...f, [field]: value }));
  }
  async function saveEdit() {
    if (!editingSale) return;
    // Buscar IDs para ambas colecciones
    const idPorCobrar = editingSale.idPorCobrar || editingSale.id;
    const idHistorico = editingSale.idHistorico || editingSale.idHistoricoRef || editingSale.id;
    // Importar función de edición global
    const { editarVentaConfirmada } = await import('./supabaseUtils');
    await editarVentaConfirmada(idPorCobrar, idHistorico, editingSale, editForm);
    setEditingSale(null);
    setEditForm({});
  }

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
            <CityStock key={`${cityFilter}-${sales.length}`} city={cityFilter} products={products} sales={sales} dispatches={dispatches.filter(d=>d.status==='confirmado')} setSales={setSales} session={session} />
            <CitySummary city={cityFilter} sales={sales} setSales={setSales} products={products} session={session} users={users} setProducts={setProducts} setView={setView} setDepositSnapshots={setDepositSnapshots} />
          </>
        )}
  {/* Tabla de ventas removida a solicitud. */}
      </div>
    </div>
  );
}

// Resumen tipo cuadro para una ciudad seleccionada
function CitySummary({ city, sales, setSales, products, session, users = [], setProducts, setView, setDepositSnapshots }) {
  // Replicar lógica de historial: solo mostrar confirmadas y canceladas con costo
  const cityNorm = useMemo(() => (city||'').toUpperCase(), [city]);
  
  const confirmadas = useMemo(() => sales
    .filter(s=>(s.ciudad||'').toUpperCase()===cityNorm && (s.estadoEntrega==='entregada' || (s.estadoEntrega||'confirmado')==='confirmado') && !s.settledAt)
    .sort((a,b)=>{
      // 1. Ordenar por fecha (descendente: más reciente primero)
      if(a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      // 2. Si la fecha es igual, ordenar por hora de entrega (descendente: más tarde primero)
      const ha = (a.horaEntrega || a.hora || '').split('-')[0].trim();
      const hb = (b.horaEntrega || b.hora || '').split('-')[0].trim();
      const minutosA = minutesFrom12(ha);
      const minutosB = minutesFrom12(hb);
      if(minutosA !== minutosB) return minutosB - minutosA; // Descendente: más tarde primero
      // 3. Si fecha y hora son iguales, ordenar por ID (descendente: más reciente primero)
      return (b.id||'').localeCompare(a.id||'');
    }),
    [sales, cityNorm]
  );

  const canceladasConCosto = useMemo(() => sales
    .filter(s=>(s.ciudad||'').toUpperCase()===cityNorm && s.estadoEntrega==='cancelado' && Number(s.gastoCancelacion||0) > 0 && !s.settledAt)
    .map(s=> ({
      ...s,
      sinteticaCancelada: true,
      gasto: 0,
      // Mostrar el impacto del gasto como total negativo (antes estaba 0 y se ocultaba el efecto)
      total: -Number(s.gastoCancelacion||0),
      confirmadoAt: s.confirmadoAt || s.canceladoAt || Date.parse(s.fecha+'T00:00:00') || 0,
    })),
    [sales, cityNorm]
  );

  const unificados = useMemo(() => [...confirmadas, ...canceladasConCosto], [confirmadas, canceladasConCosto]);
  
  const filtradas = useMemo(() => unificados.slice().sort((a,b)=> {
    // 1. Ordenar por fecha (descendente: más reciente primero)
    if(a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    // 2. Si la fecha es igual, ordenar por hora de entrega (descendente: más tarde primero)
    const ha = (a.horaEntrega || a.hora || '').split('-')[0].trim();
    const hb = (b.horaEntrega || b.hora || '').split('-')[0].trim();
    const minutosA = minutesFrom12(ha);
    const minutosB = minutesFrom12(hb);
    if(minutosA !== minutosB) return minutosB - minutosA; // Descendente: más tarde primero
    // 3. Si fecha y hora son iguales, ordenar por ID (descendente: más reciente primero)
    return (b.id||'').localeCompare(a.id||'');
  }), [unificados]);

  // Construir filas (rows) que antes se usaban pero no estaban definidas -> causaba ReferenceError
  const rows = useMemo(() => filtradas.map(s=> {
    const p1 = s.sku ? products.find(p=>p.sku===s.sku) : null;
    const p2 = s.skuExtra ? products.find(p=>p.sku===s.skuExtra) : null;
    const totalCalc = Number(s.total != null ? s.total : (Number(s.precio||0)*Number(s.cantidad||0) +
      (s.skuExtra ? (products.find(p=>p.sku===s.skuExtra)?.precio||0)*Number(s.cantidadExtra||0) : 0)));
    const gasto = Number(s.gasto||0);
    const gastoCancel = Number(s.gastoCancelacion||0);
    const esCanceladaSint = !!s.sinteticaCancelada;
    return {
        id: s.id || '—',
        sku: s.sku || '—',
        cantidad: s.cantidad != null ? s.cantidad : '',
        skuExtra: s.skuExtra || '',
        cantidadExtra: s.cantidadExtra != null ? s.cantidadExtra : '',
        fecha: s.fecha || '—',
        hora: s.horaEntrega || s.hora || '',
        ciudad: s.ciudad || '—',
        vendedor: s.vendedora || s.vendedor || '—',
        productos: esCanceladaSint ? '— (Cancelada)' : [p1?.nombre || s.sku || '—', p2 ? p2.nombre : null].filter(Boolean).join(' + '),
        cantidades: esCanceladaSint ? '' : [s.cantidad, s.cantidadExtra].filter(x => x != null).join(' + '),
    precio: Number(s.precio) || 0,
    // Si es fila cancelada sintética: total negativo del gastoCancel.
    // Si es una venta de producto sintético (precio 0) con gasto > 0 y sin total definido, reflejar el impacto como total negativo del gasto.
    total: esCanceladaSint
      ? -gastoCancel
      : (()=>{
          const isSyntheticProduct = !!p1?.sintetico; // producto principal sintético
          const rawTotal = Number(s.total) || 0;
          if(isSyntheticProduct && rawTotal === 0 && gasto > 0) return -gasto;
          return rawTotal;
        })(),
        gasto: esCanceladaSint ? 0 : gasto,
        neto: esCanceladaSint ? -gastoCancel : (totalCalc - gasto),
        gastoCancelacion: gastoCancel,
        sinteticaCancelada: esCanceladaSint,
        metodo: s.metodo || '—',
        celular: s.celular || '',
        comprobante: s.comprobante || '',
        destinoEncomienda: s.destinoEncomienda || '',
        motivo: s.motivo || ''
      };
  }), [filtradas, products]);

  // (Variables previas que ya no se usan eliminadas)
  // Excluir productos sintéticos de las columnas (vista por ciudad)
  const productOrder = products.filter(p=>!p.sintetico).map(p=>p.sku);
  const [openComp, setOpenComp] = useState(null); // base64 comprobante
  const [editingSale, setEditingSale] = useState(null);
  const [confirmDeleteSale, setConfirmDeleteSale] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [editDiff, setEditDiff] = useState([]);
  const [showResumen, setShowResumen] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false); // modal cobrar
  // Estado para snapshot de depósito debe estar en nivel superior para no romper orden de hooks
  const [depositInFlight, setDepositInFlight] = useState(false);
  const [depositPhase, setDepositPhase] = useState(null); // 'copy' | 'delete' | null
  const [depositProgress, setDepositProgress] = useState({ phase:null, total:0, done:0, errors:0 });
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
      precio: sale.precio != null ? sale.precio : 0,
      gasto: sale.gasto != null ? sale.gasto : 0,
  ...(sale.codigoUnico ? { codigoUnico: sale.codigoUnico } : {}),
    });
  }

  function updateEditField(field, value){ setEditForm(f=> ({...f, [field]: value})); }

  // Calcula diferencias entre original y editado
  function getEditDiff(original, updated) {
    if (!original || !updated) return [];
    const fields = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'horaEntrega', label: 'Hora' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'metodo', label: 'Método' },
      { key: 'destinoEncomienda', label: 'Destino Encomienda' },
      { key: 'vendedora', label: 'Vendedor(a)' },
      { key: 'celular', label: 'Celular' },
      { key: 'sku', label: 'SKU' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'skuExtra', label: 'SKU Extra' },
      { key: 'cantidadExtra', label: 'Cantidad Extra' },
      { key: 'precio', label: 'Precio Unitario' },
      { key: 'total', label: 'Precio' },
      { key: 'gasto', label: 'Delivery (Gasto)' },
    ];
    return fields
      .map(f => {
        let oldVal = original[f.key] ?? '';
        let newVal = updated[f.key] ?? '';

        // Para vendedora: mostrar solo primer nombre en el modal
        if (f.key === 'vendedora') {
          oldVal = firstName(String(oldVal));
          newVal = firstName(String(newVal));
        }

        // Para campos numéricos: normalizar comparación (evitar falsos positivos)
        const camposNumericos = ['precio', 'cantidad', 'cantidadExtra', 'gasto'];
        if (camposNumericos.includes(f.key)) {
          const oldNum = Number(oldVal || 0);
          const newNum = Number(newVal || 0);
          if (oldNum !== newNum) {
            return { label: f.label, before: oldVal, after: newVal };
          }
          return null;
        }

        if (String(oldVal) !== String(newVal)) {
          return { label: f.label, before: oldVal, after: newVal };
        }
        return null;
      })
      .filter(Boolean);
  }

  function handleSaveEditClick() {
    // Al presionar Guardar, mostrar confirmación con diff
    const diff = getEditDiff(editingSale, editForm);
    setEditDiff(diff);
    setShowConfirmEdit(true);
  }

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  async function confirmEditAndSave() {
    if (!editingSale) return;
    // Si no hay cambios, cerrar simplemente
    if(editDiff.length===0){
      setShowConfirmEdit(false);
      return;
    }
    
    // Guardar estado original para revertir en caso de error
    const originalSales = [...sales];
    
    // Calcular diferencias en cantidades para actualizar stock optimistamente
    const cantidadAnterior = Number(editingSale.cantidad || 0);
    const cantidadNueva = Number(editForm.cantidad != null ? editForm.cantidad : cantidadAnterior);
    const cantidadDiff = cantidadNueva - cantidadAnterior;
    
    const cantidadExtraAnterior = Number(editingSale.cantidadExtra || 0);
    const cantidadExtraNueva = Number(editForm.cantidadExtra != null ? editForm.cantidadExtra : cantidadExtraAnterior);
    const cantidadExtraDiff = cantidadExtraNueva - cantidadExtraAnterior;
    
    const skuAnterior = editingSale.sku;
    const skuNuevo = editForm.sku || skuAnterior;
    const skuExtraAnterior = editingSale.skuExtra;
    const skuExtraNuevo = editForm.skuExtra || skuExtraAnterior;
    
    const ciudadAnterior = editingSale.ciudad;
    const ciudadNueva = editForm.ciudad || ciudadAnterior;
    
    try {
      if(isSavingEdit){ warn('[confirmEditAndSave] click ignorado mientras guarda'); return; }
      setIsSavingEdit(true);
      
      // Actualización optimista del stock de ciudad si cambió la cantidad o el SKU
      // Solo si la venta está confirmada/entregada (ya se descontó stock)
      if ((editingSale.estadoEntrega === 'confirmado' || editingSale.estadoEntrega === 'entregada') && 
          !editingSale.sintetico && 
          (cantidadDiff !== 0 || cantidadExtraDiff !== 0 || skuAnterior !== skuNuevo || skuExtraAnterior !== skuExtraNuevo)) {
        // Actualizar stock optimistamente en el componente CityStock
        // Esto se hace a través de un estado compartido o forzando re-render
        // Por ahora, confiamos en Realtime que actualizará el stock correctamente
        // La actualización optimista del stock se manejará en el useEffect de CityStock
      }
      
      // Actualización optimista: actualizar estado local inmediatamente
      setSales(prev => prev.map(s => {
        // Buscar la venta por id, idPorCobrar o idHistorico
        const idPorCobrar = editingSale.idPorCobrar || editingSale.id;
        const idHistorico = editingSale.idHistorico || editingSale.idHistoricoRef || editingSale.id;
        
        if (s.id === idPorCobrar || s.id === idHistorico || 
            s.idPorCobrar === idPorCobrar || s.idHistorico === idHistorico) {
          // Actualizar con los nuevos valores del formulario
          return {
            ...s,
            fecha: editForm.fecha || s.fecha,
            horaEntrega: editForm.horaEntrega || s.horaEntrega || s.hora || null,
            hora: editForm.horaEntrega || s.horaEntrega || s.hora || null,
            ciudad: editForm.ciudad || s.ciudad,
            metodo: editForm.metodo || s.metodo,
            destinoEncomienda: editForm.destinoEncomienda || s.destinoEncomienda,
            vendedora: editForm.vendedora || s.vendedora || s.vendedor,
            vendedor: editForm.vendedora || s.vendedora || s.vendedor,
            celular: editForm.celular || s.celular,
            sku: editForm.sku || s.sku,
            cantidad: editForm.cantidad != null ? editForm.cantidad : s.cantidad,
            skuExtra: editForm.skuExtra || s.skuExtra,
            cantidadExtra: editForm.cantidadExtra != null ? editForm.cantidadExtra : s.cantidadExtra,
            precio: editForm.precio != null ? editForm.precio : s.precio,
            gasto: editForm.gasto != null ? editForm.gasto : s.gasto,
            // Recalcular total si cambió precio o cantidad
            total: editForm.total != null ? editForm.total : (
              editForm.precio != null || editForm.cantidad != null 
                ? (Number(editForm.precio || s.precio || 0) * Number(editForm.cantidad || s.cantidad || 0)) +
                  (editForm.skuExtra && editForm.cantidadExtra 
                    ? (products.find(p => p.sku === editForm.skuExtra)?.precio || 0) * Number(editForm.cantidadExtra || 0)
                    : (s.skuExtra && s.cantidadExtra 
                      ? (products.find(p => p.sku === s.skuExtra)?.precio || 0) * Number(s.cantidadExtra || 0)
                      : 0))
                : s.total
            )
          };
        }
        return s;
      }));
      
      const idPorCobrar = editingSale.idPorCobrar || editingSale.id;
      const idHistorico = editingSale.idHistorico || editingSale.idHistoricoRef || editingSale.id;
      const { editarVentaConfirmada } = await import('./supabaseUtils');
      await editarVentaConfirmada(idPorCobrar, idHistorico, editingSale, editForm);
      
      // Forzar refresh del stock después de editar (si cambió cantidad o SKU)
      const cantidadCambio = Number(editForm.cantidad || editingSale.cantidad) !== Number(editingSale.cantidad);
      const cantidadExtraCambio = Number(editForm.cantidadExtra || editingSale.cantidadExtra || 0) !== Number(editingSale.cantidadExtra || 0);
      const skuCambio = (editForm.sku || editingSale.sku) !== editingSale.sku;
      const skuExtraCambio = (editForm.skuExtra || editingSale.skuExtra || '') !== (editingSale.skuExtra || '');
      
      if (cantidadCambio || cantidadExtraCambio || skuCambio || skuExtraCambio) {
        // Pequeño delay para permitir que Supabase procese el cambio
        setTimeout(() => {
          // Disparar evento personalizado para forzar refresh del stock
          const ciudad = editForm.ciudad || editingSale.ciudad;
          if (ciudad) {
            window.dispatchEvent(new CustomEvent('refreshCityStock', { detail: { city: ciudad } }));
          }
        }, 500);
      }
      
      setEditingSale(null);
      setEditForm({});
      setShowConfirmEdit(false);
      setEditDiff([]);
    } catch(err){
      console.error('[confirmEditAndSave] Error aplicando edición', err);
      // Revertir cambios optimistas en caso de error
      setSales(originalSales);
      toast.push({ type: 'error', title: 'Error', message: 'No se pudo guardar los cambios de la venta. Revisa consola.' });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteEditingSale(){
    if(!editingSale) return;
    // Si es venta pendiente (VentasSinConfirmar)
    if(editingSale.firestoreId){
      await deletePendingSale(editingSale.firestoreId, editingSale);
    } else {
      // Venta confirmada: eliminar de ventasporcobrar y ventashistorico, restaurar stock
      const { cancelarVentaConfirmada } = await import('./supabaseUtils');
      const idPorCobrar = editingSale.idPorCobrar || editingSale.id;
      const idHistorico = editingSale.idHistorico || editingSale.idHistoricoRef || editingSale.id;
      await cancelarVentaConfirmada(idPorCobrar, idHistorico, editingSale);
      // Remover optimistamente del estado local de ventas
      setSales(prev => prev.filter(v => {
        // Coincidencia por id cruzada (idPorCobrar o idHistorico) o por combinación clave
        if (v.id === idPorCobrar || v.id === idHistorico) return false;
        if (v.idPorCobrar && v.idPorCobrar === idPorCobrar) return false;
        if (v.idHistorico && v.idHistorico === idHistorico) return false;
        const sameCore = v.ciudad===editingSale.ciudad && v.fecha===editingSale.fecha && v.sku===editingSale.sku && Number(v.cantidad)===Number(editingSale.cantidad);
        return !sameCore; // keep only those NOT matching removal criteria => invert logic
      }));
    }
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
  <div className="overflow-x-auto table-scroll-wrapper -mx-2 md:mx-0 pb-2"><table className="w-full text-[11px] min-w-[1000px]">
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
              <th className="p-2 text-right">Precio</th>
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
              const isNegBase = Number(r.total||0) < 0 || Number(r.neto||0) < 0;
              const isNeg = (r.metodo==='Encomienda') ? false : isNegBase;
              return (
                <tr key={r.id} className={"border-t border-neutral-800 "+(r.sinteticaCancelada? 'bg-red-900/10':'')+ (isNeg && !r.sinteticaCancelada ? ' bg-red-900/5':'')}>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{toDMY(r.fecha)}</td>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.hora}</td>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.ciudad}</td>
                  <td className={"p-2 text-left max-w-[160px] "+(isNeg? 'text-red-400 font-semibold':'')}>{r.metodo==='Encomienda' ? <span className="text-[14px]" title={r.destinoEncomienda||''}>{r.destinoEncomienda||''}</span>: (r.motivo? <span className="text-[12px] text-[#e7922b]" title={r.motivo}>{r.motivo}</span> : null)}</td>
                  <td className={"p-2 whitespace-nowrap "+(isNeg? 'text-red-400 font-semibold':'')}>{firstName(r.vendedor)}</td>
                  {cantidades.map((c,i)=> <td key={i} className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{c||''}</td>)}
                  <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(r.precio)}</td>
                  <td className={"p-2 text-right "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>
                    {r.gastoCancelacion ? currency(r.gastoCancelacion) : (r.gasto ? currency(r.gasto) : '')}
                  </td>
                  <td className={"p-2 text-right font-semibold "+(r.sinteticaCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(r.total)}</td>
                  <td className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{r.celular||''}</td>
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
            // Totales: Total ahora es (precio - delivery) por fila (neto mostrado en la columna)
            const sumPrecio = rows.reduce((a,r)=> a + (r.sinteticaCancelada ? 0 : (Number(r.precio)||0)), 0);
            const sumDelivery = rows.reduce((a,r)=> a + (r.sinteticaCancelada ? Number(r.gastoCancelacion||0) : Number(r.gasto||0)), 0);
            const sumTotal = rows.reduce((a,r)=> {
              if(r.sinteticaCancelada){ return a + (-Number(r.gastoCancelacion||0)); }
              const precio = Number(r.precio||0);
              const gasto = Number(r.gasto||0);
              return a + (precio - gasto);
            }, 0);
            return (
              <tfoot>
                <tr className="border-t border-neutral-800 bg-neutral-900/40">
                  <td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={5}>Totales</td>
                  {productOrder.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
                  <td className="p-2 text-right font-bold text-[#e7922b]">{sumPrecio?currency(sumPrecio):''}</td>
                  <td className="p-2 text-right font-bold text-[#e7922b]">{sumDelivery?currency(sumDelivery):''}</td>
                  <td className="p-2 text-right font-bold text-[#e7922b]">{currency(sumTotal)}</td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
      {isAdmin && <td className="p-2"></td>}
                </tr>
              </tfoot>
            );
          })()}
  </table></div>
        {rows.length>0 && session.rol==='admin' && (
          <div className="mt-4 flex justify-end">
            {/* Botón antes: 'Limpiar'. Ahora refleja la acción real: generar snapshot para depósito */}
            <button onClick={()=>setCobrarOpen(true)} className="px-6 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-sm font-semibold shadow hover:brightness-110 active:scale-[0.98]">Generar Depósito</button>
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
              // Función confirmarCobro para generar depósito
              async function confirmarCobro(){
                if(depositInFlight) return;
                setDepositInFlight(true);
                setDepositPhase('copy');
                try {
                  // IDs esperados: solo los de las filas visibles (ciudad actual)
                  const expectedIds = rows.map(r => r.idPorCobrar || r.id).filter(Boolean);
                  
                  warn('[confirmarCobro] Procesando', expectedIds.length, 'ventas para', city);
                  
                  // Asegurar que todas las canceladas con costo tienen doc en ventasporcobrar
                  try {
                    const { ensureCanceladasConCostoEnVentasPorCobrar } = await import('./supabaseUtils');
                    await ensureCanceladasConCostoEnVentasPorCobrar(city);
                  } catch(err){ warn('[confirmarCobro] ensureCanceladasConCostoEnVentasPorCobrar fallo', err); }
                  
                  // Obtener ventas desde Supabase
                  const ventaIds = [...new Set(expectedIds)];
                  if (ventaIds.length === 0) {
                    warn('[confirmarCobro] No hay ventas para procesar');
                    return;
                  }
                  
                  // Obtener datos de ventas desde Supabase
                  const { data: ventasData, error: ventasError } = await supabase
                    .from('ventas')
                    .select('*')
                    .in('id', ventaIds)
                    .is('deleted_from_pending_at', null)
                    .eq('estado_pago', 'pendiente');
                  
                  if (ventasError) throw ventasError;
                  
                  // Normalizar ventas: convertir snake_case a camelCase y marcar canceladas con costo
                  const ventasParaDeposito = (ventasData || []).map(v => {
                    const gastoCancelacion = Number(v.gasto_cancelacion || v.gastoCancelacion || 0);
                    const estadoEntrega = v.estado_entrega || v.estadoEntrega || '';
                    const esCanceladaConCosto = estadoEntrega === 'cancelado' && gastoCancelacion > 0;
                    
                    return {
                      id: v.id,
                      idPorCobrar: v.id,
                      codigoUnico: v.codigo_unico || v.codigoUnico || null,
                      total: esCanceladaConCosto ? -gastoCancelacion : (v.total != null ? Number(v.total) : null),
                      precio: Number(v.precio || 0),
                      gasto: Number(v.gasto || 0),
                      fecha: v.fecha || null,
                      sku: v.sku || null,
                      cantidad: v.cantidad != null ? Number(v.cantidad) : null,
                      skuExtra: v.sku_extra || v.skuExtra || null,
                      cantidadExtra: v.cantidad_extra != null ? Number(v.cantidad_extra) : (v.cantidadExtra != null ? Number(v.cantidadExtra) : null),
                      estadoEntrega: estadoEntrega,
                      estado_entrega: estadoEntrega,
                      sinteticaCancelada: esCanceladaConCosto || !!v.sintetica_cancelada || !!v.sinteticaCancelada,
                      sintetica_cancelada: esCanceladaConCosto || !!v.sintetica_cancelada || !!v.sinteticaCancelada,
                      gastoCancelacion: gastoCancelacion,
                      gasto_cancelacion: gastoCancelacion
                    };
                  });
                  
                  if (ventasParaDeposito.length === 0) {
                    warn('[confirmarCobro] No se encontraron ventas válidas en Supabase');
                    return;
                  }
                  
                  setDepositProgress({ phase:'copy', total: ventasParaDeposito.length, done:0, errors:0 });
                  
                  // Calcular resumen
                  const resumen = {
                    ventasConfirmadas: ventasParaDeposito.filter(v => v.estadoEntrega === 'confirmado' || v.estadoEntrega === 'entregada').length,
                    ventasSinteticas: ventasParaDeposito.filter(v => v.sinteticaCancelada && v.estadoEntrega !== 'cancelado').length,
                    canceladasConCosto: ventasParaDeposito.filter(v => v.estadoEntrega === 'cancelado' && Number(v.gastoCancelacion || 0) > 0).length,
                    totalPedidos: ventasParaDeposito.length,
                    totalMonto: ventasParaDeposito.reduce((sum, v) => sum + (v.precio || 0), 0),
                    totalDelivery: ventasParaDeposito.reduce((sum, v) => {
                      if (v.estadoEntrega === 'cancelado' && v.gastoCancelacion > 0) {
                        return sum + v.gastoCancelacion; // Para canceladas, usar gastoCancelacion
                      }
                      return sum + (v.gasto || 0);
                    }, 0),
                    totalNeto: ventasParaDeposito.reduce((sum, v) => {
                      if (v.estadoEntrega === 'cancelado' && v.gastoCancelacion > 0) {
                        return sum - v.gastoCancelacion; // Para canceladas, restar el gasto de cancelación
                      }
                      return sum + (v.total || 0);
                    }, 0)
                  };
                  
                  // Crear depósito usando crearSnapshotDeposito
                  const { crearSnapshotDeposito } = await import('./supabaseUtils');
                  const depositId = await crearSnapshotDeposito(city, ventasParaDeposito, resumen);
                  
                  warn('[confirmarCobro] Depósito creado:', depositId);
                  setDepositProgress({ phase:'copy', total: ventasParaDeposito.length, done: ventasParaDeposito.length, errors:0 });
                } catch(err){
                  console.error('[confirmarCobro] Error proceso depósito', err);
                  setDepositProgress(prev => ({ ...prev, errors: prev.total || 0 }));
                } finally {
                  setDepositPhase(null);
                  setDepositInFlight(false);
                  setCobrarOpen(false);
                  setView('deposit');
                }
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
                  <div className="relative flex justify-end gap-2 pt-1 min-h-[52px]">
                    <button onClick={()=>!depositInFlight && setCobrarOpen(false)} disabled={depositInFlight} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Cancelar</button>
                    <button onClick={confirmarCobro} disabled={depositInFlight} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-50">{depositInFlight? 'En curso...' : 'Generar Depósito'}</button>
                    {depositInFlight && (
                      <div className="absolute inset-0 -top-16 flex flex-col items-center justify-center gap-3 bg-black/70 rounded-lg animate-fade text-xs font-medium px-4 py-3">
                        {depositPhase==='copy' && (
                          <div className="flex flex-col items-center gap-1 text-[#e7922b] w-full">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" className="opacity-20" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                              Copiando ventas...
                            </div>
                            <div className="w-48 h-1 bg-neutral-700 rounded overflow-hidden"><div className="h-full bg-[#e7922b] transition-all" style={{width: `${depositProgress.total? (depositProgress.done/depositProgress.total*100):0}%`}}></div></div>
                            <span className="text-[10px] text-neutral-400">{depositProgress.done}/{depositProgress.total} copiados {depositProgress.errors? `· errores: ${depositProgress.errors}`:''}</span>
                          </div>
                        )}
                        {depositPhase==='delete' && (
                          <div className="flex flex-col items-center gap-1 text-red-400 w-full">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" className="opacity-20" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                              Eliminando originales...
                            </div>
                            <div className="w-48 h-1 bg-neutral-700 rounded overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{width: `${depositProgress.total? (depositProgress.done/depositProgress.total*100):0}%`}}></div></div>
                            <span className="text-[10px] text-neutral-400">{depositProgress.done}/{depositProgress.total} eliminados {depositProgress.errors? `· errores: ${depositProgress.errors}`:''}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-neutral-500">No cierres esta ventana</span>
                      </div>
                    )}
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
                  <select value={editForm.vendedora || ''} onChange={e=>updateEditField('vendedora', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                    <option value="">— Seleccionar —</option>
                    {users.map(u => {
                      const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.trim();
                      // Solo primera palabra del nombre (ej: "Wendy Nayeli" -> "Wendy")
                      const primerNombre = (u.nombre || '').split(' ')[0] || u.id;
                      return (
                        <option key={u.id} value={nombreCompleto}>
                          {primerNombre}
                        </option>
                      );
                    })}
                  </select>
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
                <label className="flex flex-col gap-1">Precio
                  <input type="number" value={editForm.precio} onChange={e=>updateEditField('precio', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
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
                  <button onClick={handleSaveEditClick} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold">Guardar</button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de confirmación de edición */}
        {showConfirmEdit && (
          <Modal onClose={()=>setShowConfirmEdit(false)} autoWidth>
            <div className="w-full max-w-[420px] space-y-4">
              <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Confirmar cambios en la venta</h3>
              <div className="text-[12px] leading-relaxed text-neutral-300 space-y-2">
                <p>Se detectaron los siguientes cambios:</p>
                <div className="bg-neutral-800/60 rounded-lg p-3 border border-neutral-700 text-[11px] space-y-1">
                  {editDiff.length === 0 ? (
                    <div className="text-neutral-400">No hay cambios.</div>
                  ) : (
                    <ul className="space-y-1">
                      {editDiff.map((d, i) => (
                        <li key={i}><span className="text-neutral-400">{d.label}:</span> <span className="line-through text-red-400">{String(d.before)||'—'}</span> <span className="text-[#e7922b] font-semibold">→ {String(d.after)||'—'}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>setShowConfirmEdit(false)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
                <button disabled={editDiff.length===0 || isSavingEdit} onClick={confirmEditAndSave} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">{isSavingEdit? 'Guardando...' : 'Confirmar'}</button>
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
                    <th className="px-0.2 py-0.5 text-right">Precio</th>
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
                    // isNeg original (total o neto negativo) pero excluimos pagos/metodo 'Encomienda'
                    const isNegBase = Number(r.total||0) < 0 || Number(r.neto||0) < 0;
                    const isNeg = (r.metodo==='Encomienda') ? false : isNegBase;
                    return (
                      <tr key={r.id} className={"border-t border-neutral-800 "+(esCancelada? 'bg-red-900/10':'')+ (isNeg && !esCancelada ? ' bg-red-900/5':'')}>
                        <td className={"px-1 py-0.5 whitespace-nowrap "+(isNeg? 'text-red-400 font-semibold':'')}>{toDMY(r.fecha)}</td>
                        <td className={"px-1 py-0.5 whitespace-nowrap "+(isNeg? 'text-red-400 font-semibold':'')}>{r.hora}</td>
                        <td className={"px-1 py-0.5 whitespace-nowrap "+(isNeg? 'text-red-400 font-semibold':'')}>{r.ciudad}</td>
                        <td className={"px-1 py-0.5 text-left max-w-[140px] truncate "+(isNeg? 'text-red-400 font-semibold':'')}>{r.metodo==='Encomienda'? (r.destinoEncomienda||'') : (r.motivo? r.motivo : '')}</td>
                        {cantidades.map((c,i)=> <td key={i} className={"px-1 py-0.5 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{c||''}</td>)}
                        <td className={"px-1 py-0.5 text-right font-semibold "+(esCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{r.sinteticaCancelada? '' : currency(r.precio||0)}</td>
                        <td className={"px-1 py-0.5 text-right "+(esCancelada? 'text-red-400 font-semibold': (isNeg? 'text-red-400 font-semibold':''))}>{esCancelada? 'Cancelado '+currency(r.gastoCancelacion||0) : (r.gasto?currency(r.gasto):'')}</td>
                        <td className={"px-1 py-0.5 text-right font-semibold "+(esCancelada? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(r.sinteticaCancelada ? -Number(r.gastoCancelacion||0) : (Number(r.precio||0) - Number(r.gasto||0)))}</td>
                        <td className={"px-1 py-0.5 text-center whitespace-nowrap "+(isNeg? 'text-red-400 font-semibold':'')}>{r.celular||''}</td>
                      </tr>
                    );
                  })}
      {!rows.length && <tr><td colSpan={productOrder.length+8} className="p-6 text-center text-neutral-500 text-sm">Sin ventas confirmadas.</td></tr>}
                </tbody>
                {rows.length>0 && (()=>{
                  const totSku = {};
                  rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
      const sumPrecio = rows.reduce((a,r)=> a + (r.sinteticaCancelada?0:Number(r.precio||0)),0);
                  const sumDelivery = rows.reduce((a,r)=> a + (r.sinteticaCancelada? Number(r.gastoCancelacion||0): Number(r.gasto||0)),0);
                  const sumTotal = rows.reduce((a,r)=>{
                    if(r.sinteticaCancelada) return a + (-Number(r.gastoCancelacion||0));
                    return a + (Number(r.precio||0) - Number(r.gasto||0));
                  },0);
                  return (
                    <tfoot>
                      <tr className="border-t border-neutral-800 bg-neutral-900/40">
                        <td className="px-1 py-0.5 text-[8px] font-semibold text-neutral-400" colSpan={4}>Totales</td>
                        {productOrder.map(sku=> <td key={sku} className="px-1 py-0.5 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
        <td className="px-1 py-0.5 text-right font-bold text-[#e7922b]">{sumPrecio?currency(sumPrecio):''}</td>
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

// ---------------------- Vista Generar Depósito ----------------------
function DepositConfirmView({ snapshots, setSnapshots, products, setSales, users = [], onBack }) {
  const toast = useToast();
  // Estado para mostrar el modal de detalle de pedidos
  const [showDepositDetail, setShowDepositDetail] = useState(false);
  // Confirmación de eliminación (modal adicional)
  const [deleteConfirm, setDeleteConfirm] = useState(null); // row a eliminar
  // Estado de eliminación en progreso
  const [deletingId, setDeletingId] = useState(null);
  const [deletingRowInFlight, setDeletingRowInFlight] = useState(false);
  // Estado para confirmación de deleteRow
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null); // { id, onConfirm }
  function requestDeleteRow(){
    if(!editingRow) return;
    // Pasar la fila a confirmar y cerrar el modal de edición para evitar doble overlay
    setDeleteConfirm(editingRow);
    setEditingRow(null);
  }
  async function performDeleteRow(){
    if(!deleteConfirm || deletingId || deletingRowInFlight) return;
    setDeletingRowInFlight(true);
    const row = deleteConfirm;
    setDeletingId(row.id);
    try {
      const { eliminarVentaDepositoRobusto } = await import('./supabaseUtils');
      const resp = await eliminarVentaDepositoRobusto(row);
      if(resp && resp.ok){
        // Actualizar snapshots locales
        const targetId = row.id;
        patchActive(prev => {
          const rows = prev.rows.filter(r => r.id !== targetId);
            return { ...prev, rows, resumen: recompute(rows) };
        });
        setSales(prev => prev.filter(s => s.id !== targetId));
      } else {
        warn('[performDeleteRow] Eliminación no confirmada', resp);
      }
    } catch(err){
      console.error('[performDeleteRow] Error', err);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
      setDeletingRowInFlight(false);
    }
  }
  function cancelDeleteRow(){ setDeleteConfirm(null); }
  const [activeId, setActiveId] = useState(()=> snapshots?.length ? snapshots[snapshots.length-1].id : null); // última añadida
  const active = snapshots.find(s=>s.id===activeId) || null;
  
  // Ordenar filas por fecha y hora (más recientes primero, luego más tarde primero)
  const sortedRows = active?.rows ? [...active.rows].sort((a, b) => {
    // Primero por fecha (descendente: más recientes primero)
    const fechaA = a.fecha || '';
    const fechaB = b.fecha || '';
    if (fechaA !== fechaB) {
      return fechaB.localeCompare(fechaA); // Invertido para descendente
    }
    // Si la fecha es igual, ordenar por hora (descendente: más tarde primero)
    const horaA = a.hora || a.horaEntrega || '';
    const horaB = b.hora || b.horaEntrega || '';
    // Convertir hora a formato comparable (ej: "4:00 PM" -> "16:00")
    const parseHora = (h) => {
      if (!h) return '00:00';
      const match = h.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return h;
      let horas = parseInt(match[1], 10);
      const minutos = parseInt(match[2], 10);
      const periodo = match[3].toUpperCase();
      if (periodo === 'PM' && horas !== 12) horas += 12;
      if (periodo === 'AM' && horas === 12) horas = 0;
      return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };
    return parseHora(horaB).localeCompare(parseHora(horaA)); // Invertido para descendente
  }) : [];
  
  const [montoDepositado, setMontoDepositado] = useState('');
  const [nota, setNota] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editRowInFlight, setEditRowInFlight] = useState(false);
  const [formValues, setFormValues] = useState({ total:'', gasto:'', gastoCancel:'', cantidad:'', cantidadExtra:'', sku:'', skuExtra:'' });
  const [confirmingDeposit, setConfirmingDeposit] = useState(null); // { amount, note }
  function recompute(rows){
    const ventasSinteticas = rows.filter(r=> !r.sinteticaCancelada && products.find(p=>p.sku===r.sku)?.sintetico).length;
    const ventasConfirmadas = rows.filter(r=> !r.sinteticaCancelada && !products.find(p=>p.sku===r.sku)?.sintetico).length;
    const canceladasConCosto = rows.filter(r=> r.sinteticaCancelada).length;
    const productTotals = {};
    rows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) productTotals[r.sku]=(productTotals[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) productTotals[r.skuExtra]=(productTotals[r.skuExtra]||0)+Number(r.cantidadExtra||0); });
  // Total columna Total: si sintética, -gastoCancelacion; si no, r.total o 0
  const totalMonto = rows.reduce((a,r)=> {
    if(r.sinteticaCancelada) return a - Number(r.gastoCancelacion||0);
    return a + Number((r.total!==undefined && r.total!==null) ? r.total : 0);
  },0);
  // Total columna Delivery: r.gasto si existe, si no, gastoCancelacion si sintética
  const totalDelivery = rows.reduce((a,r)=> {
    if(r.sinteticaCancelada) return a + Number(r.gastoCancelacion||0);
    return a + Number((r.gasto!==undefined && r.gasto!==null) ? r.gasto : 0);
  },0);
  const totalNeto = totalMonto;
  // Suma visible en la columna Precio: si no existe r.precio (ventas históricas previas) usamos r.total para no perder el valor.
  const totalPrecio = rows.reduce((a,r)=> {
    if(r.sinteticaCancelada) return a + 0; // sintética cancelada siempre muestra 0 en Precio
    const base = (r.precio !== undefined && r.precio !== null) ? r.precio : r.total; // fallback
    return a + Number(base||0);
  },0);
  return { ventasConfirmadas, ventasSinteticas, canceladasConCosto, totalPedidos: ventasConfirmadas+ventasSinteticas+canceladasConCosto, totalMonto, totalDelivery, totalNeto, totalPrecio, productos: productTotals };
  }
  function patchActive(mutator){
    setSnapshots(prev => prev.map(s=> s.id===activeId ? mutator(s) : s));
  }
  function openEdit(r){
    setEditingRow(r);
    setFormValues({ 
      fecha: r.fecha || '',
      hora: r.hora || '',
      ciudad: r.ciudad || '',
      metodo: r.metodo || '',
      vendedora: r.vendedora || '',
      celular: r.celular || '',
      precio: r.sinteticaCancelada? '': String(r.precio ?? r.total ?? 0),
      gasto: r.sinteticaCancelada? '': String(r.gasto||0), 
      gastoCancel: r.sinteticaCancelada? String(r.gastoCancelacion||0): '',
      cantidad: String(r.cantidad||''),
      cantidadExtra: String(r.cantidadExtra||''),
      sku: r.sku||'',
      skuExtra: r.skuExtra||''
    });
  }
  function closeEdit(){ setEditingRow(null); setEditRowInFlight(false); }
  function updateForm(field,val){ setFormValues(f=>({...f,[field]:val})); }
  // Estado para modal de confirmación de edición
  const [confirmEditModal, setConfirmEditModal] = useState(null); // { diff, newRow, oldRow }
  const [editLoading, setEditLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false); // loading confirm depósito

  function calcularDiffRow(oldRow, newRow) {
    const campos = [
      'fecha','hora','ciudad','metodo','vendedora','celular','sku','cantidad','skuExtra','cantidadExtra','precio','gasto','gastoCancelacion'
    ];
    const diff = [];
    campos.forEach(c => {
      const antes = String(oldRow[c] ?? '');
      const despues = String(newRow[c] ?? '');
      if(antes !== despues){
        diff.push({ campo: c, antes, despues });
      }
    });
    return diff;
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editingRow) return;
    // Construir el nuevo objeto editado
    let newRow;
    if (editingRow.sinteticaCancelada) {
      const gc = Math.max(0, Number(formValues.gastoCancel || 0) || 0);
      newRow = {
        ...editingRow,
        fecha: formValues.fecha || '',
        hora: formValues.hora || '',
        ciudad: formValues.ciudad || '',
        metodo: formValues.metodo || '',
        vendedora: formValues.vendedora || '',
        celular: formValues.celular || '',
        gastoCancelacion: gc,
        neto: -gc
      };
    } else {
      const p = Math.max(0, Number(formValues.precio || 0) || 0);
      const g = Math.max(0, Number(formValues.gasto || 0) || 0);
      const cant = Math.max(0, Number(formValues.cantidad || 0) || 0);
      const cantExtra = Math.max(0, Number(formValues.cantidadExtra || 0) || 0);
      newRow = {
        ...editingRow,
        fecha: formValues.fecha || '',
        hora: formValues.hora || '',
        ciudad: formValues.ciudad || '',
        metodo: formValues.metodo || '',
        vendedora: formValues.vendedora || '',
        celular: formValues.celular || '',
        precio: p,
        total: p,
        gasto: g,
        neto: p - g,
        cantidad: cant,
        cantidadExtra: cantExtra,
        sku: formValues.sku || '',
        skuExtra: formValues.skuExtra || ''
      };
    }
    const diff = calcularDiffRow(editingRow, newRow);
    setConfirmEditModal({ diff, newRow, oldRow: editingRow });
  }

  async function confirmarEditSave() {
    setEditLoading(true);
    // Actualizar snapshot local
    patchActive(prev => {
      const rows = prev.rows.map(r => r.id === editingRow.id ? confirmEditModal.newRow : r);
      return { ...prev, rows, resumen: recompute(rows) };
    });
    // Actualizar venta original local
    setSales(prev => prev.map(s => s.id === editingRow.id ? confirmEditModal.newRow : s));
    // Sincronizar con depósito en Supabase
    try {
      // Buscar el depósito asociado a esta venta
      const { data: saleData } = await supabase
        .from('ventas')
        .select('deposit_id')
        .eq('id', editingRow.id)
        .single();
      
      if (saleData?.deposit_id) {
        // Si la venta tiene un depósito asociado, actualizar la venta directamente
        // La venta ya está actualizada arriba, así que solo necesitamos sincronizar con historial
        const { sincronizarEdicionDepositoHistoricoV2 } = await import('./supabaseUtils');
        await sincronizarEdicionDepositoHistoricoV2(
          {
            idGenerarDeposito: editingRow.id,
            idHistorico: editingRow.id,
            idPorCobrar: editingRow.id,
            codigoUnico: editingRow.codigoUnico || editingRow.codigo_unico
          },
          confirmEditModal.oldRow,
          confirmEditModal.newRow
        );
      }
    } catch (err) {
      warn('Error sincronizando con depósito:', err);
    }
    // Sincronizar robustamente con ventashistorico, cityStock y ventasporcobrar (como en ventas)
    try {
      // Ajustar cityStock manualmente por delta
      const oldRow = confirmEditModal.oldRow;
      const newRow = confirmEditModal.newRow;
      const { discountCityStock, restoreCityStock } = await import('./supabaseUtils');
      // Principal
      if(oldRow.sku !== newRow.sku){
        if(oldRow.sku && oldRow.cantidad) await restoreCityStock(oldRow.ciudad, oldRow.sku, Number(oldRow.cantidad));
        if(newRow.sku && newRow.cantidad) await discountCityStock(newRow.ciudad, newRow.sku, Number(newRow.cantidad));
      } else if(Number(oldRow.cantidad) !== Number(newRow.cantidad)) {
        const diff = Number(newRow.cantidad) - Number(oldRow.cantidad);
        if(diff>0) { // se aumentó la cantidad vendida -> descontar adicional
          await discountCityStock(newRow.ciudad, newRow.sku, diff);
        } else if(diff<0){ // se redujo -> restaurar
          await restoreCityStock(newRow.ciudad, newRow.sku, Math.abs(diff));
        }
      }
      // Extra
      if(oldRow.skuExtra !== newRow.skuExtra){
        if(oldRow.skuExtra && oldRow.cantidadExtra) await restoreCityStock(oldRow.ciudad, oldRow.skuExtra, Number(oldRow.cantidadExtra));
        if(newRow.skuExtra && newRow.cantidadExtra) await discountCityStock(newRow.ciudad, newRow.skuExtra, Number(newRow.cantidadExtra));
      } else if(Number(oldRow.cantidadExtra||0) !== Number(newRow.cantidadExtra||0)) {
        const diffExtra = Number(newRow.cantidadExtra||0) - Number(oldRow.cantidadExtra||0);
        if(diffExtra>0){ await discountCityStock(newRow.ciudad, newRow.skuExtra, diffExtra); }
        else if(diffExtra<0){ await restoreCityStock(newRow.ciudad, newRow.skuExtra, Math.abs(diffExtra)); }
      }
      // Sincronizar histórico sin reajustar stock (ya aplicado)
      const { sincronizarEdicionDepositoHistoricoV2 } = await import('./supabaseUtils');
      const refs = {
        idGenerarDeposito: editingRow.id,
        idHistorico: oldRow.idHistorico || newRow.idHistorico,
        idPorCobrar: oldRow.idPorCobrar || newRow.idPorCobrar,
        codigoUnico: oldRow.codigoUnico || newRow.codigoUnico,
        skipStockAdjustment: true
      };
      const ok = await sincronizarEdicionDepositoHistoricoV2(refs, oldRow, newRow);
      if(!ok) warn('Sync V2 no pudo actualizar ventashistorico');
    } catch (err) {
      warn('Error sincronizando/ajustando stock (V2 manual):', err);
    }
    setEditLoading(false);
    setEditingRow(null);
    setConfirmEditModal(null);
  }
  function deleteRow(id){
    setConfirmDeleteRow({
      id,
      onConfirm: () => {
        patchActive(prev=>{ const rows = prev.rows.filter(r=>r.id!==id); return { ...prev, rows, resumen: recompute(rows) }; });
        setConfirmDeleteRow(null);
      }
    });
  }
  function markSaved(amount, note){
    if(!active) return;
    patchActive(prev=> ({ ...prev, depositAmount: amount, depositNote: note||'', savedAt: Date.now() }));
  }
  async function finalizeDeposit(){
    if(!active || !confirmingDeposit || depositLoading) return;
    setDepositLoading(true);
    try {
      const ciudadNormalizada = normalizeCity(active.city);
      
      // Obtener depósitos pendientes de la ciudad
      const { data: depositsData, error: depositsError } = await supabase
        .from('generar_deposito')
        .select('id')
        .eq('ciudad', ciudadNormalizada)
        .eq('estado', 'pendiente');
      
      if (depositsError) throw depositsError;
      
      const ids = (depositsData || []).map(d => d.id);
      const chunkSize = 450;
      
      // Eliminar depósitos en chunks
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('generar_deposito')
          .delete()
          .in('id', chunk);
        
        if (error) throw error;
      }
      
      // Limpiar snapshot local
      setSnapshots(prev => prev.filter(s=> s.id !== active.id));
      setConfirmingDeposit(null);
      setMontoDepositado(''); 
      setNota('');
    } catch(err){
      console.error('[finalizeDeposit] Error eliminando depósitos', err);
      toast.push({ type: 'error', title: 'Error', message: 'Error finalizando depósito: ' + (err?.message || 'desconocido') });
    } finally {
      setDepositLoading(false);
    }
  }
  // Solo mostrar columnas de productos NO sintéticos
  const orderedSkus = products.filter(p=>!p.sintetico).map(p=>p.sku);
  if(!snapshots.length){
    return (
      <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#f09929]" /> Generar Depósito</h2>
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Volver</button>
          </header>
          <div className="text-neutral-400 text-sm">No hay limpiezas pendientes de depósito.</div>
        </div>
      </div>
    );
  }
  // Recalcular siempre el resumen para garantizar que totalPrecio refleje la suma visible actual.
  const resumen = active ? recompute(sortedRows) : {};
  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#f09929]" /> Generar Depósito</h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {snapshots.map(s=>{
              const activeFlag = s.id===activeId;
              return (
                <button key={s.id} onClick={()=>setActiveId(s.id)} className={"px-3 py-1 rounded-full border text-xs "+(activeFlag? 'bg-[#e7922b] text-[#1a2430] border-[#e7922b]':'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700')}>
                  {s.city} {s.savedAt && '✓'}
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
            <div className="p-4 rounded-2xl bg-[#0f171e] border border-neutral-800 text-[12px] space-y-1">
              <div><span className="text-neutral-400">Pedidos confirmados:</span> <span className="font-semibold text-[#e7922b]">{resumen.ventasConfirmadas}</span></div>
              <div><span className="text-neutral-400">Pedidos sintéticos:</span> <span className="font-semibold text-[#e7922b]">{resumen.ventasSinteticas}</span></div>
              <div><span className="text-neutral-400">Cancelados c/costo:</span> <span className="font-semibold text-red-400">{resumen.canceladasConCosto}</span></div>
              <div><span className="text-neutral-400">Total pedidos:</span> <span className="font-semibold text-[#e7922b]">{resumen.totalPedidos}</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0f171e] border border-neutral-800 text-[12px] space-y-1">
              <div><span className="text-neutral-400">Monto bruto:</span> {currency(resumen.totalMonto||0)}</div>
              <div><span className="text-neutral-400">Delivery:</span> {currency(resumen.totalDelivery||0)}</div>
              <div><span className="text-neutral-400">Neto:</span> <span className="font-semibold text-[#e7922b]">{currency(resumen.totalNeto||0)}</span></div>
            </div>
            <form onSubmit={e=>{ e.preventDefault(); const amount = montoDepositado? Number(montoDepositado): resumen.totalNeto; setConfirmingDeposit({ amount, note: nota }); }} className="p-4 rounded-2xl bg-[#0f171e] border border-neutral-800 text-[12px] space-y-2">
              <div className="font-semibold text-[#e7922b] text-sm mb-1">Registrar Depósito</div>
              <label className="flex flex-col gap-1">Monto depositado
                <input value={montoDepositado} onChange={e=>setMontoDepositado(e.target.value)} placeholder={currency(resumen.totalNeto||0)} className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              {/* Nota eliminada por requerimiento */}
              <div className="text-[10px] text-neutral-500">Al confirmar se registrará y se quitará esta limpieza de la lista.</div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#e7922b] text-white text-xs font-semibold">{active.savedAt? 'ACTUALIZAR':'CONFIRMAR DEPOSITO'}</button>
              </div>
            </form>
          </div>
          <div className="rounded-2xl bg-[#0f171e] border border-neutral-800 p-4 overflow-auto">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <button type="button" className="p-1 rounded hover:bg-neutral-700 focus:outline-none" onClick={()=>setShowDepositDetail(true)} title="Ver detalle de pedidos">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#f09929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth="2" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#f09929]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" /></svg>
              Pedidos incluidos en el depósito
            </div>
      {/* Modal de detalle de pedidos incluidos en el depósito */}
      {showDepositDetail && (
        <Modal onClose={()=>setShowDepositDetail(false)} autoWidth>
          <div className="max-w-[98vw] p-2">
            <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#f09929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Detalle de pedidos incluidos en el depósito
              <span className="ml-3 text-[#e7922b] font-normal text-xs">{new Date().toLocaleDateString()}</span>
            </h3>
            <div>
              <table className="w-full text-[11px]">
                <thead className="bg-neutral-800/60">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Hora</th>
                    <th className="p-2 text-left">Ciudad</th>
                    <th className="p-2 text-left">Encomienda</th>
                    {orderedSkus.map(sku=>{
                      const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
                    })}
                    <th className="p-2 text-right">Precio</th>
                    <th className="p-2 text-right">Delivery</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-center">Celular</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(r=>{
                    const esCanc = !!r.sinteticaCancelada;
                    const cantidades = orderedSkus.map(sku=>{
                      if(esCanc) return 0; let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
                    const syntheticCost = r.sinteticaCancelada ? -Number(r.gastoCancelacion||0) : null;
                    const netoCalc = r.sinteticaCancelada ? -Number(r.gastoCancelacion||0) : (Math.max(0, Number(r.precio||0)) - Math.max(0, Number(r.gasto||0)));
                    const isNeg = (r.metodo==='Encomienda') ? false : (netoCalc < 0);
                    return (
                      <tr key={r.id} className={"border-t border-neutral-800 "+(esCanc? 'bg-red-900/10':'')+ (isNeg && !esCanc ? ' bg-red-900/5':'')}>
                        <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{toDMY(r.fecha)}</td>
                        <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.hora}</td>
                        <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.ciudad}</td>
                        <td className={"p-2 text-left max-w-[160px] truncate "+(isNeg? 'text-red-400 font-semibold':'')}>{r.metodo==='Encomienda'? (r.destinoEncomienda||'') : (r.motivo|| (esCanc? 'Cancelado' : ''))}</td>
                        {cantidades.map((c,i)=><td key={i} className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{c||''}</td>)}
                        <td className={"p-2 text-right font-semibold "+(esCanc? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(Math.max(0, Number(r.precio||0)))}</td>
                        <td className={"p-2 text-right "+(esCanc? 'text-red-400': (isNeg? 'text-red-400':''))}>{
                          esCanc
                            ? currency(r.gastoCancelacion||0)
                            : currency((r.gasto!==undefined && r.gasto!==null) ? r.gasto : 0)
                        }</td>
                        <td className={"p-2 text-right font-semibold "+(isNeg? 'text-red-400':'')} title={esCanc? 'Sintética cancelada: neto = -gastoCancelacion' : 'Neto = Precio - Gasto'}>{currency(netoCalc)}</td>
                        <td className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{r.celular||''}</td>
                      </tr>
                    );
                  })}
                  {!sortedRows.length && <tr><td colSpan={orderedSkus.length+9} className="p-6 text-center text-neutral-500 text-sm">Sin datos</td></tr>}
                </tbody>
                {sortedRows.length>0 && (()=>{
                  // Totales igual que en la tabla principal
                  const totSku={};
                  let totalPrecio=0, totalDelivery=0, totalNeto=0;
                  sortedRows.forEach(r=>{
                    if(r.sinteticaCancelada) {
                      totalDelivery += Number(r.gastoCancelacion||0);
                      totalNeto += -Number(r.gastoCancelacion||0);
                      return;
                    }
                    if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0);
                    if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0);
                    totalPrecio += (r.precio!==undefined && r.precio!==null)? Number(r.precio): (r.total||0);
                    totalDelivery += (r.gasto!==undefined && r.gasto!==null)? Number(r.gasto): 0;
                    totalNeto += (r.total!==undefined && r.total!==null)? Number(r.total): 0;
                  });
                  return (
                    <tfoot>
                      <tr className="border-t border-neutral-800 bg-neutral-900/40">
                        <td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={4}>Totales</td>
                        {orderedSkus.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
                        <td className="p-2 text-right font-bold text-[#e7922b]">{currency(totalPrecio||0)}</td>
                        <td className="p-2 text-right font-bold text-[#e7922b]">{totalDelivery? currency(totalDelivery):''}</td>
                        <td className="p-2 text-right font-bold text-[#e7922b]">{currency(totalNeto||0)}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </div>
        </Modal>
      )}
            <div className="overflow-x-auto table-scroll-wrapper -mx-2 md:mx-0 pb-2"><table className="w-full text-[11px] min-w-[1180px]">
          <thead className="bg-neutral-800/60">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Hora</th>
              <th className="p-2 text-left">Ciudad</th>
              <th className="p-2 text-left">Encomienda</th>
              <th className="p-2 text-center">Usuario</th>
              {orderedSkus.map(sku=>{
                const prod = products.find(p=>p.sku===sku); return <th key={sku} className="p-2 text-center whitespace-nowrap">{prod?.nombre.split(' ')[0]}</th>;
              })}
              <th className="p-2 text-right">Precio</th>
              <th className="p-2 text-right">Delivery</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-center">Celular</th>
              <th className="p-2 text-center">Editar</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(r=>{
              const esCanc = !!r.sinteticaCancelada;
              const cantidades = orderedSkus.map(sku=>{
                if(esCanc) return 0; let c=0; if(r.sku===sku) c+=Number(r.cantidad||0); if(r.skuExtra===sku) c+=Number(r.cantidadExtra||0); return c; });
              const syntheticCost = r.sinteticaCancelada ? -Number(r.gastoCancelacion||0) : null;
              const netoCalc = r.sinteticaCancelada ? -Number(r.gastoCancelacion||0) : (Math.max(0, Number(r.precio||0)) - Math.max(0, Number(r.gasto||0)));
              const isNeg = (r.metodo==='Encomienda') ? false : (netoCalc < 0);
              return (
                <tr key={r.id} className={"border-t border-neutral-800 "+(esCanc? 'bg-red-900/10':'')+ (isNeg && !esCanc ? ' bg-red-900/5':'')}>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{toDMY(r.fecha)}</td>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.hora}</td>
                  <td className={"p-2 "+(isNeg? 'text-red-400 font-semibold':'')}>{r.ciudad}</td>
                  <td className={"p-2 text-left max-w-[160px] truncate "+(isNeg? 'text-red-400 font-semibold':'')}>{r.metodo==='Encomienda'? (r.destinoEncomienda||'') : (r.motivo|| (esCanc? 'Cancelado' : ''))}</td>
                  <td className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{firstName(r.vendedor)||''}</td>
                  {cantidades.map((c,i)=><td key={i} className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{c||''}</td>)}
                  <td className={"p-2 text-right font-semibold "+(esCanc? 'text-red-400': (isNeg? 'text-red-400':''))}>{currency(Math.max(0, Number(r.precio||0)))}</td>
                  <td className={"p-2 text-right "+(esCanc? 'text-red-400': (isNeg? 'text-red-400':''))}>{
                    esCanc
                      ? currency(r.gastoCancelacion||0)
                      : currency((r.gasto!==undefined && r.gasto!==null) ? r.gasto : 0)
                  }</td>
                  <td className={"p-2 text-right font-semibold "+(isNeg? 'text-red-400':'')} title={esCanc? 'Sintética cancelada: neto = -gastoCancelacion' : 'Neto = Precio - Gasto'}>{currency(netoCalc)}</td>
                  <td className={"p-2 text-center "+(isNeg? 'text-red-400 font-semibold':'')}>{r.celular||''}</td>
                  <td className="p-2 text-center"><button onClick={()=>openEdit(r)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] border border-neutral-700">Editar</button></td>
                </tr>
              );
            })}
    {!sortedRows.length && <tr><td colSpan={orderedSkus.length+10} className="p-6 text-center text-neutral-500 text-sm">Sin datos</td></tr>}
          </tbody>
          {sortedRows.length>0 && ( ()=>{ const totSku={}; sortedRows.forEach(r=>{ if(r.sinteticaCancelada) return; if(r.sku) totSku[r.sku]=(totSku[r.sku]||0)+Number(r.cantidad||0); if(r.skuExtra) totSku[r.skuExtra]=(totSku[r.skuExtra]||0)+Number(r.cantidadExtra||0); }); return (
            <tfoot>
              <tr className="border-t border-neutral-800 bg-neutral-900/40">
                <td className="p-2 text-[10px] font-semibold text-neutral-400" colSpan={5}>Totales</td>
                {orderedSkus.map(sku=> <td key={sku} className="p-2 text-center font-semibold text-[#e7922b]">{totSku[sku]||''}</td>)}
                <td className="p-2 text-right font-bold text-[#e7922b]">{currency(resumen.totalPrecio||0)}</td>
                <td className="p-2 text-right font-bold text-[#e7922b]">{resumen.totalDelivery? currency(resumen.totalDelivery):''}</td>
                <td className="p-2 text-right font-bold text-[#e7922b]">{currency(resumen.totalNeto||0)}</td>
                <td className="p-2"></td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          ); })()}
  </table></div>
          </div>
        </>
      )}
      {editingRow && (
        <Modal onClose={closeEdit} autoWidth>
          <form onSubmit={e => { e.preventDefault(); if (editRowInFlight) return; setEditRowInFlight(true); saveEdit(); }} className="w-full max-w-[420px] space-y-4 text-[12px]">
            <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">Editar Venta</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 text-[10px] text-neutral-500">ID: {editingRow.id.slice(-8)}</div>
              <label className="flex flex-col gap-1">Fecha
                <input type="date" value={formValues.fecha || ''} onChange={e=>updateForm('fecha', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              <label className="flex flex-col gap-1">Hora
                <input type="time" value={formValues.hora || ''} onChange={e=>updateForm('hora', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              <label className="flex flex-col gap-1">Ciudad
                <input value={formValues.ciudad || ''} onChange={e=>updateForm('ciudad', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              <label className="flex flex-col gap-1">Método
                <select value={formValues.metodo || ''} onChange={e=>updateForm('metodo', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                  <option value="">—</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Encomienda">Encomienda</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Vendedor(a)
                <select value={formValues.vendedora || ''} onChange={e=>updateForm('vendedora', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1">
                  <option value="">— Seleccionar —</option>
                  {users.map(u => {
                    const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.trim();
                    const primerNombre = u.nombre ? u.nombre.split(' ')[0] : u.id; // Extract first name
                    return (
                      <option key={u.id} value={nombreCompleto}>
                        {primerNombre}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1">Celular
                <input value={formValues.celular || ''} onChange={e=>updateForm('celular', e.target.value)} className="bg-neutral-800 rounded-lg px-2 py-1" />
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
              <label className="flex flex-col gap-1">Precio
                <input value={formValues.precio || ''} onChange={e=>updateForm('precio', e.target.value)} type="number" className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
              <label className="flex flex-col gap-1">Delivery (Gasto)
                <input value={formValues.gasto} onChange={e=>updateForm('gasto', e.target.value)} type="number" className="bg-neutral-800 rounded-lg px-2 py-1" />
              </label>
            </div>
            <div className="col-span-2 text-[10px] text-neutral-500">Neto se recalcula automáticamente: {currency(Math.max(0, Number(formValues.precio||0)) - Math.max(0, Number(formValues.gasto||0)))}</div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={requestDeleteRow} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs">Eliminar</button>
              <button type="button" onClick={closeEdit} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
              <button type="submit" disabled={editRowInFlight} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">{editRowInFlight ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleteConfirm && (
        <Modal onClose={cancelDeleteRow} autoWidth>
          <div className="w-full max-w-[360px] space-y-5 text-[12px]">
            <h3 className="text-sm font-semibold text-red-400">Confirmar eliminación</h3>
            <div className="space-y-2 text-neutral-300">
              <p>Vas a eliminar esta venta del listado del depósito.</p>
              <div className="rounded-lg bg-neutral-800/50 border border-neutral-700 p-3 text-[11px] space-y-1">
                <div><span className="text-neutral-400">ID:</span> {deleteConfirm.id.slice(-8)}</div>
                <div><span className="text-neutral-400">Ciudad:</span> {deleteConfirm.ciudad||'—'}</div>
                <div><span className="text-neutral-400">SKU:</span> {deleteConfirm.sku||'—'} {deleteConfirm.cantidad? `(${deleteConfirm.cantidad})`:''}</div>
                {deleteConfirm.skuExtra && <div><span className="text-neutral-400">SKU Extra:</span> {deleteConfirm.skuExtra} {deleteConfirm.cantidadExtra? `(${deleteConfirm.cantidadExtra})`:''}</div>}
                <div><span className="text-neutral-400">Total:</span> {currency(deleteConfirm.total||0)}</div>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">Esta acción eliminará el documento en Generar Depósito, intentará eliminar su histórico y restaurará el stock. Si el histórico no se identifica con suficiente coincidencia se conservará.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={cancelDeleteRow} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
              <button onClick={performDeleteRow} disabled={!!deletingId || deletingRowInFlight} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-40">{deletingId || deletingRowInFlight ? 'Cargando...' : 'Eliminar'}</button>
            </div>
          </div>
        </Modal>
      )}
      {confirmEditModal && (
        <Modal onClose={()=>setConfirmEditModal(null)} autoWidth>
          <div className="w-full max-w-[400px] px-1 space-y-5">
            <h3 className="text-sm font-semibold text-[#e7922b]">Confirmar cambios</h3>
            {confirmEditModal.diff.length === 0 ? (
              <div className="text-xs text-neutral-400">No hay cambios para guardar.</div>
            ) : (
              <div className="max-h-48 overflow-auto border border-neutral-800 rounded-lg divide-y divide-neutral-800 text-[11px] bg-neutral-900/40">
                {confirmEditModal.diff.map(d => (
                  <div key={d.campo} className="px-3 py-2 flex flex-col gap-1">
                    <div className="font-semibold text-neutral-300 uppercase text-[10px] tracking-wide">{d.campo}</div>
                    <div className="flex flex-col gap-0.5">
                      <div className="line-through text-neutral-500 break-all">{d.antes || '—'}</div>
                      <div className="text-[#e7922b] break-all">{d.despues || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-neutral-500">Revisa y confirma para aplicar los cambios. Los datos originales se perderán al guardar.</div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=>setConfirmEditModal(null)} className="px-3 py-2 rounded-xl bg-neutral-700 text-xs">Cancelar</button>
              <button disabled={confirmEditModal.diff.length === 0 || editLoading} onClick={confirmarEditSave} className="px-4 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">{editLoading ? 'Cargando...' : 'Confirmar'}</button>
            </div>
          </div>
        </Modal>
      )}
      {confirmingDeposit && active && (
        <Modal onClose={()=> setConfirmingDeposit(null)} autoWidth>
          <div className="w-full max-w-[400px] px-1 space-y-5">
            <h3 className="text-sm font-semibold text-[#e7922b]">Generar Depósito</h3>
            <div className="text-xs text-neutral-300 leading-relaxed space-y-2">
              <p className="flex justify-between"><span className="text-neutral-400">Ciudad:</span> <span className="font-semibold text-neutral-100">{active.city}</span></p>
              <p className="flex justify-between"><span className="text-neutral-400">Monto a registrar:</span> <span className="font-semibold text-[#e7922b]">{currency(confirmingDeposit.amount)}</span></p>
              <div className="mt-3 border border-neutral-800 rounded-lg p-3 bg-neutral-900/40 space-y-1">
                <div className="flex justify-between"><span className="text-neutral-400">Pedidos confirmados:</span><span className="font-semibold">{resumen.ventasConfirmadas}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Pedidos sintéticos:</span><span className="font-semibold">{resumen.ventasSinteticas}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Cancelados c/costo:</span><span className="font-semibold text-red-400">{resumen.canceladasConCosto}</span></div>
                <div className="flex justify-between pt-1"><span className="text-neutral-400">Total pedidos:</span><span className="font-semibold text-[#e7922b]">{resumen.totalPedidos}</span></div>
                <div className="h-px bg-neutral-800 my-1" />
                <div className="flex justify-between"><span className="text-neutral-400">Monto bruto:</span><span>{currency(resumen.totalPrecio||0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Delivery:</span><span>{currency(resumen.totalDelivery||0)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Neto:</span><span className="font-semibold text-[#e7922b]">{currency(resumen.totalNeto||0)}</span></div>
              </div>
              {confirmingDeposit.note && <p className="text-[10px] text-neutral-500">Nota: <span className="text-neutral-400">{confirmingDeposit.note}</span></p>}
              <p className="text-[10px] text-neutral-500">Al confirmar se moverán estas ventas y se cerrará la limpieza. Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button disabled={depositLoading} onClick={()=> setConfirmingDeposit(null)} className="px-4 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40">Volver</button>
              <button disabled={depositLoading} onClick={finalizeDeposit} className="px-5 py-2 rounded-xl bg-[#e7922b] text-[#1a2430] text-xs font-semibold disabled:opacity-40">{depositLoading? 'Cargando...' : 'Sí, Confirmar'}</button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modal de confirmación para deleteRow */}
      <AnimatePresence>
        {confirmDeleteRow && (
          <ConfirmModal
            isOpen={true}
            onClose={() => setConfirmDeleteRow(null)}
            onConfirm={() => {
              if (confirmDeleteRow.onConfirm) {
                confirmDeleteRow.onConfirm();
              }
            }}
            title="Eliminar pedido"
            message="¿Eliminar este pedido de la lista de depósito?"
            confirmText="Eliminar"
            cancelText="Cancelar"
            confirmColor="red"
            isLoading={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;