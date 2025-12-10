// Reutilizable: evita doble ejecución de una acción async por multiclick.
// Uso:
// const { run, running, error } = useSingleAsyncAction(async () => { await api(); });
// <button disabled={running} onClick={run}>{running? 'Procesando...' : 'Guardar'}</button>
import { useCallback, useRef, useState } from 'react';

export function useSingleAsyncAction(fn, { autoResetMs = 0 } = {}) {
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (...args) => {
    if (runningRef.current) return; // ignore extra clicks
    runningRef.current = true;
    setRunning(true);
    setError(null);
    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      setError(err);
      console.error('[useSingleAsyncAction]', err);
      throw err;
    } finally {
      if (autoResetMs > 0) {
        setTimeout(() => { runningRef.current = false; setRunning(false); }, autoResetMs);
      } else {
        runningRef.current = false;
        setRunning(false);
      }
    }
  }, [fn, autoResetMs]);

  return { run, running, error };
}
