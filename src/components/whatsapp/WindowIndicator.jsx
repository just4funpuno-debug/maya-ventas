/**
 * Componente para mostrar información de ventana 24h y 72h
 * SUBFASE 2.4: Indicador de ventana
 */

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { getWindow24hInfo } from '../../services/whatsapp/send-decision';
import { isWithin72hWindow } from '../../utils/whatsapp/window-24h';

export default function WindowIndicator({ contactId }) {
  const [window24h, setWindow24h] = useState(null);
  const [window72h, setWindow72h] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    loadWindowInfo();
    
    // Actualizar cada minuto
    const interval = setInterval(loadWindowInfo, 60000);
    
    return () => clearInterval(interval);
  }, [contactId]);

  const loadWindowInfo = async () => {
    if (!contactId) return;

    try {
      setLoading(true);
      
      // Obtener info de ventana 24h
      const info24h = await getWindow24hInfo(contactId);
      setWindow24h(info24h);

      // Obtener info de ventana 72h
      const info72h = await isWithin72hWindow(contactId);
      setWindow72h(info72h);
    } catch (err) {
      console.error('[WindowIndicator] Error cargando info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !contactId) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Clock className="w-3 h-3" />
        <span>Cargando...</span>
      </div>
    );
  }

  const isWindowActive = window24h?.isActive || window72h?.isWithin72h;

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Ventana 24h */}
      {window24h?.isActive ? (
        <div className="flex items-center gap-1 text-green-400">
          <Clock className="w-3 h-3" />
          <span>
            {window24h.hoursRemaining !== null
              ? `${Math.floor(window24h.hoursRemaining)}h ${Math.floor((window24h.hoursRemaining % 1) * 60)}m`
              : 'Activa'}
          </span>
        </div>
      ) : window72h?.isWithin72h ? (
        <div className="flex items-center gap-1 text-yellow-400">
          <Clock className="w-3 h-3" />
          <span>
            {window72h.hoursSinceCreation !== null
              ? `${Math.floor(72 - window72h.hoursSinceCreation)}h restantes (72h)`
              : 'Ventana 72h'}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>Ventana cerrada</span>
        </div>
      )}
    </div>
  );
}


