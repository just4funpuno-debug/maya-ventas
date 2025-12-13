/**
 * Modal para mostrar QR code de coexistencia de WhatsApp
 * FASE 6: Modal QR para Coexistencia
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} qrUrl - URL de la imagen del QR code
 * @param {string} phoneNumber - Número de teléfono asociado
 * @param {boolean} isChecking - Si está verificando coexistencia
 * @param {string} status - Estado actual ('pending', 'connected', 'failed')
 */

import React, { useEffect, useState } from 'react';
import { X, QrCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function QRModal({
  isOpen,
  onClose,
  qrUrl = null,
  phoneNumber = '',
  isChecking = false,
  status = 'pending',
  onStatusChange = null
}) {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos en segundos
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Timer de timeout
  useEffect(() => {
    if (!isOpen || status === 'connected' || hasTimedOut) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setHasTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, status, hasTimedOut]);

  // Resetear timer cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(300);
      setHasTimedOut(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (status === 'connected') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (status === 'failed' || hasTimedOut) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (isChecking) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    return <QrCode className="w-5 h-5 text-blue-500" />;
  };

  const getStatusMessage = () => {
    if (status === 'connected') {
      return '¡Coexistencia verificada exitosamente!';
    }
    if (status === 'failed' || hasTimedOut) {
      return hasTimedOut 
        ? 'Tiempo de espera agotado. Por favor, intenta nuevamente.'
        : 'Error al verificar coexistencia. Por favor, intenta nuevamente.';
    }
    if (isChecking) {
      return 'Verificando coexistencia...';
    }
    return 'Escanea el código QR con WhatsApp para activar la coexistencia.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={status === 'connected' ? onClose : undefined} 
      />
      <div className="relative z-10 w-full max-w-[400px] bg-[#181f26] rounded-xl p-6 shadow-xl border border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">
            {getStatusIcon()}
            Coexistencia WhatsApp
          </h3>
          {(status === 'connected' || !isChecking) && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Phone Number */}
        {phoneNumber && (
          <div className="mb-4 text-xs text-neutral-400">
            Número: <span className="text-neutral-200 font-medium">{phoneNumber}</span>
          </div>
        )}

        {/* Status Message */}
        <div className={`text-xs mb-4 p-3 rounded-lg ${
          status === 'connected' 
            ? 'bg-green-900/30 text-green-300 border border-green-700/50'
            : status === 'failed' || hasTimedOut
            ? 'bg-red-900/30 text-red-300 border border-red-700/50'
            : isChecking
            ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50'
            : 'bg-neutral-800/50 text-neutral-300 border border-neutral-700'
        }`}>
          {getStatusMessage()}
        </div>

        {/* QR Code */}
        {qrUrl && status === 'pending' && !hasTimedOut && (
          <div className="mb-4 flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg mb-3">
              <img 
                src={qrUrl} 
                alt="QR Code para coexistencia" 
                className="w-64 h-64"
                onError={(e) => {
                  console.error('[QRModal] Error cargando QR:', e);
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <p className="text-xs text-neutral-400 text-center max-w-xs">
              Abre WhatsApp en tu teléfono y escanea este código para activar la coexistencia.
            </p>
          </div>
        )}

        {/* Timer */}
        {status === 'pending' && !hasTimedOut && !isChecking && (
          <div className="mb-4 text-center">
            <div className="text-xs text-neutral-400 mb-1">
              Tiempo restante: <span className="text-neutral-200 font-medium">{formatTime(timeRemaining)}</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(timeRemaining / 300) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        {status === 'pending' && !hasTimedOut && !isChecking && (
          <div className="mb-4 text-xs text-neutral-400 space-y-1">
            <p className="font-medium text-neutral-300 mb-2">Instrucciones:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Abre WhatsApp en tu teléfono</li>
              <li>Ve a Configuración → Dispositivos vinculados</li>
              <li>Escanee este código QR</li>
              <li>Espera a que se verifique automáticamente</li>
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {status === 'connected' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-semibold text-white"
            >
              Continuar
            </button>
          ) : hasTimedOut || status === 'failed' ? (
            <>
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-neutral-700 text-xs text-neutral-200 hover:bg-neutral-600"
              >
                Cerrar
              </button>
              {onStatusChange && (
                <button
                  onClick={() => {
                    setHasTimedOut(false);
                    setTimeRemaining(300);
                    onStatusChange('pending');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
                >
                  Reintentar
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isChecking}
                className="px-3 py-2 rounded-xl bg-neutral-700 text-xs text-neutral-200 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChecking ? 'Verificando...' : 'Omitir'}
              </button>
              <p className="text-xs text-neutral-500 mt-2 text-center">
                Puedes configurar la coexistencia después desde Meta Developer Console
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

