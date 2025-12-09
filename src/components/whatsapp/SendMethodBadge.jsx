/**
 * Componente para mostrar el método de envío previsto
 * SUBFASE 2.4: Badge de método
 */

import React from 'react';
import { Cloud, Bot } from 'lucide-react';

export default function SendMethodBadge({ method, reason }) {
  if (!method) {
    return null;
  }

  const isCloudAPI = method === 'cloud_api';
  const isPuppeteer = method === 'puppeteer';

  const getReasonText = () => {
    switch (reason) {
      case 'window_24h_active':
        return 'Ventana 24h activa';
      case 'window_72h_active':
        return 'Ventana 72h activa';
      case 'window_closed':
        return 'Ventana cerrada';
      default:
        return reason || 'Automático';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isCloudAPI && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs">
          <Cloud className="w-3 h-3" />
          <span>Cloud API</span>
        </div>
      )}
      {isPuppeteer && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 text-xs">
          <Bot className="w-3 h-3" />
          <span>Puppeteer</span>
        </div>
      )}
      {reason && (
        <span className="text-xs text-neutral-400">
          ({getReasonText()})
        </span>
      )}
    </div>
  );
}


