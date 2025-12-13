/**
 * Modal con instrucciones para registrar un número en Meta Developer Console
 * Se muestra cuando el usuario especifica un número que no está registrado
 */

import React from 'react';
import { X, ExternalLink, CheckCircle, Phone, AlertCircle } from 'lucide-react';

export default function RegistrationGuideModal({
  isOpen,
  onClose,
  phoneNumber = ''
}) {
  if (!isOpen) return null;

  const metaDeveloperUrl = 'https://developers.facebook.com/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-[#181f26] rounded-xl p-6 shadow-xl border border-neutral-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#e7922b] flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Registrar Número en Meta Developer Console
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Número a registrar */}
        {phoneNumber && (
          <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
            <p className="text-sm text-blue-300">
              <strong>Número a registrar:</strong> {phoneNumber}
            </p>
          </div>
        )}

        {/* Instrucciones */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300 mb-1">
                  Importante
                </p>
                <p className="text-xs text-yellow-200/80">
                  El número debe estar activo en WhatsApp Business App en tu celular antes de registrarlo en Meta Developer Console.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Accede a Meta Developer Console
              </h4>
              <p className="text-xs text-neutral-400 mb-2">
                Ve a la consola de desarrolladores de Meta
              </p>
              <a
                href={metaDeveloperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Abrir Meta Developer Console
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Selecciona tu App de WhatsApp Business
              </h4>
              <p className="text-xs text-neutral-400">
                En el dashboard, busca y selecciona tu aplicación de WhatsApp Business
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Ve a Phone Numbers
              </h4>
              <p className="text-xs text-neutral-400 mb-2">
                En el menú lateral izquierdo, ve a: <strong className="text-neutral-300">WhatsApp → Phone Numbers</strong>
              </p>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Agregar Número
              </h4>
              <p className="text-xs text-neutral-400 mb-2">
                Haz clic en <strong className="text-neutral-300">"Add phone number"</strong> o <strong className="text-neutral-300">"Agregar número"</strong>
              </p>
              <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                <p className="text-xs text-neutral-400">
                  ⚠️ Selecciona <strong className="text-yellow-400">"Use existing number"</strong> (NO "Get a new number")
                </p>
              </div>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              5
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Ingresa tu Número
              </h4>
              {phoneNumber ? (
                <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                  <p className="text-xs text-neutral-300 font-mono">{phoneNumber}</p>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Ingresa tu número completo con código de país (ej: +591 12345678)
                </p>
              )}
              <p className="text-xs text-neutral-400 mt-2">
                Debe ser el mismo número de tu WhatsApp Business App
              </p>
            </div>
          </div>

          {/* Paso 6 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              6
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Verifica el Número
              </h4>
              <p className="text-xs text-neutral-400 mb-2">
                Meta enviará un código de verificación a tu WhatsApp Business App
              </p>
              <div className="space-y-2">
                <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                  <p className="text-xs text-neutral-400">
                    • Abre WhatsApp Business en tu celular
                  </p>
                  <p className="text-xs text-neutral-400">
                    • Busca el mensaje de Meta con el código
                  </p>
                  <p className="text-xs text-neutral-400">
                    • Ingresa el código en Meta Developer Console
                  </p>
                </div>
                <p className="text-xs text-neutral-500 italic">
                  A veces Meta muestra un QR code en lugar de código numérico. Ambos métodos funcionan.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 7 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e7922b] text-[#1a2430] flex items-center justify-center font-bold text-sm">
              7
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-200 mb-1">
                Vuelve Aquí y Continúa
              </h4>
              <p className="text-xs text-neutral-400">
                Una vez que el número esté registrado en Meta Developer Console, vuelve aquí y haz clic nuevamente en "Conectar con Meta"
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-700 text-sm font-medium text-neutral-200 hover:bg-neutral-600 transition"
          >
            Entendido
          </button>
          <a
            href={metaDeveloperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-[#e7922b] text-sm font-medium text-white hover:bg-[#d6821b] transition flex items-center gap-2"
          >
            Abrir Meta Developer Console
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}


