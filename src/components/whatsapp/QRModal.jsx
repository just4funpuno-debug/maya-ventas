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
  onStatusChange = null,
  metaAppId = null,
  onOpenVerificationCodeModal = null // Nueva prop para abrir modal de verificación de código manualmente
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
    return qrUrl 
      ? 'Escanea el código QR con WhatsApp para activar la coexistencia.'
      : 'Revisa tu WhatsApp Business para recibir el código de verificación.';
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
          <div className="mb-4 text-xs text-neutral-400 space-y-2">
            {!qrUrl ? (
              <>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                  <p className="font-medium text-blue-200 mb-2">Código de verificación en WhatsApp Business</p>
                  <p className="text-blue-300/80 mb-3">
                    Meta enviará un <strong>código numérico de 6 dígitos</strong> directamente al WhatsApp Business de este número. 
                    El código llegará como un mensaje de Meta.
                  </p>
                  
                  <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200">
                    <strong>⚠️ Si no recibes el código:</strong> Ve primero a Meta Developer Console (enlace abajo), 
                    busca tu número y haz clic en "Use existing number" para iniciar el proceso de verificación.
                  </div>
                  
                  <ol className="list-decimal list-inside space-y-1.5 text-blue-300/90 ml-2">
                    <li>Abre <strong>WhatsApp Business</strong> en tu teléfono (del número {phoneNumber})</li>
                    <li>Busca el <strong>mensaje de Meta</strong> con el código de verificación</li>
                    <li>Copia el <strong>código numérico</strong> (6 dígitos, ejemplo: 123456)</li>
                    <li>Haz clic en el botón naranja abajo para ingresar el código aquí</li>
                  </ol>
                  <div className="mt-3 p-2 bg-blue-950/30 border border-blue-600/30 rounded text-xs text-blue-200">
                    <strong>Nota:</strong> El código puede tardar unos minutos en llegar. Asegúrate de que tu WhatsApp Business esté activo y conectado a internet.
                  </div>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3">
                  <p className="font-medium text-neutral-300 mb-2">Ingresar código de verificación</p>
                  
                  {/* Botón para abrir modal de verificación de código */}
                  {onOpenVerificationCodeModal && (
                    <>
                      <p className="text-xs text-neutral-400 mb-3">
                        Si recibiste el código de 6 dígitos en WhatsApp Business, ingrésalo aquí:
                      </p>
                      <button
                        onClick={onOpenVerificationCodeModal}
                        className="w-full mb-3 px-4 py-2 bg-[#e7922b] hover:bg-[#d6831f] text-[#1a2430] rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                      >
                        <span>🔑</span>
                        Ingresar Código de 6 Dígitos Aquí
                      </button>
                    </>
                  )}
                  
                  <p className="text-xs text-neutral-400 mb-2 mt-3 border-t border-neutral-700 pt-3">
                    <strong>O</strong> si aún no recibes el código, ve a Meta Developer Console para iniciar el proceso manualmente:
                  </p>
                  <a
                    href={`https://developers.facebook.com/apps/${metaAppId || import.meta.env.VITE_META_APP_ID || ''}/whatsapp-business/wa-dev-console/phone-numbers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 underline text-xs mb-2"
                  >
                    Abrir Meta Developer Console - Phone Numbers
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <div className="text-xs text-neutral-400 space-y-1 mt-2 pl-2 border-l-2 border-neutral-700">
                    <p className="font-medium text-neutral-300">Pasos en Meta Developer Console:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>En el menú lateral, ve a <strong>"Phone Numbers"</strong></li>
                      <li>Busca tu número <strong>{phoneNumber}</strong> en la lista</li>
                      <li>Si no está, haz clic en <strong>"Add phone number"</strong> → <strong>"Use existing number"</strong></li>
                      <li>Ingresa el código que recibiste en WhatsApp Business</li>
                    </ol>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-neutral-300 mb-2">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Abre WhatsApp Business en tu teléfono</li>
                  <li>Ve a Configuración → Dispositivos vinculados</li>
                  <li>Escanea este código QR</li>
                  <li>Espera a que se verifique automáticamente</li>
                </ol>
              </>
            )}
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
                className="px-3 py-2 rounded-xl bg-neutral-700 text-xs text-neutral-200 hover:bg-neutral-600"
              >
                Continuar sin esperar
              </button>
              {isChecking && (
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

