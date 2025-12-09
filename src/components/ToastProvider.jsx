import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext(null);

let idCounter = 0;
function nextId(){ return ++idCounter; }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((toast) => {
    const id = nextId();
    const t = { id, type: toast.type||'info', title: toast.title||'', message: toast.message||'', timeout: toast.timeout ?? 3500 };
    setToasts(prev => [...prev, t]);
    if(t.timeout>0){
      setTimeout(()=>{ setToasts(prev => prev.filter(x=>x.id!==id)); }, t.timeout);
    }
    return id;
  }, []);
  const remove = useCallback((id)=> setToasts(prev => prev.filter(t=>t.id!==id)), []);
  const api = { push, remove };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed z-[999] top-4 right-4 flex flex-col gap-3 w-[320px] max-w-[90vw]">
        {toasts.map(t => (
          <div key={t.id} className={`group border rounded-xl shadow-lg p-3 pr-4 text-sm flex gap-3 backdrop-blur bg-neutral-900/85 border-neutral-700/70 animate-slide-in-right overflow-hidden`}> 
            <div className={`w-1 rounded-full ${t.type==='error'?'bg-red-500': t.type==='success'?'bg-emerald-500': t.type==='warn'?'bg-amber-400':'bg-sky-400'}`}></div>
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-semibold mb-0.5 tracking-wide text-[13px]">{t.title}</div>}
              <div className="text-neutral-300 leading-snug break-words whitespace-pre-wrap">{t.message}</div>
            </div>
            <button onClick={()=>remove(t.id)} className="opacity-50 hover:opacity-100 text-neutral-400 text-xs mt-1">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(){
  const ctx = useContext(ToastCtx);
  if(!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

// Animación simple con Tailwind (agregar en index.css si no existe la utilidad personalizada)
// .animate-slide-in-right { animation: slide-in-right 0.35s cubic-bezier(.4,.0,.2,1); }
// @keyframes slide-in-right { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }
