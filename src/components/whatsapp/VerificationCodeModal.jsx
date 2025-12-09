/**
 * Modal para verificar código de 6 dígitos de WhatsApp Business
 * FASE 2: Componente UI (Modal)
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} phoneNumberId - ID del número de teléfono de Meta Graph API
 * @param {string} accessToken - Access token de Meta
 * @param {string} phoneNumber - Número de teléfono para mostrar al usuario
 * @param {function} onSuccess - Callback cuando la verificación es exitosa
 * @param {string} verificationStatus - Estado de verificación: 'PENDING', 'NOT_VERIFIED', 'VERIFIED'
 * @param {string} metaAppId - ID de la app de Meta para construir el enlace
 * @param {string} businessAccountId - ID del Business Account para construir enlace alternativo
 */

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

export default function VerificationCodeModal({
  isOpen,
  onClose,
  phoneNumberId,
  accessToken,
  phoneNumber = '',
  onSuccess = null,
  verificationStatus = null,
  metaAppId = null,
  businessAccountId = null
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Resetear estados cuando el modal se abre/cierra
  React.useEffect(() => {
    if (!isOpen) {
      // Resetear cuando se cierra
      setCode('');
      setLoading(false);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError(''); // Limpiar error cuando el usuario escribe
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { verifyAndRegisterPhoneNumber } = await import('../../services/whatsapp/phone-verification');
      
      const result = await verifyAndRegisterPhoneNumber(
        phoneNumberId,
        accessToken,
        code
      );

      if (result.success) {
        setSuccess(true);
        // Llamar callback después de un breve delay para mostrar mensaje de éxito
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Error al verificar código');
      }
    } catch (err) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={success ? onClose : undefined} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md bg-[#181f26] rounded-xl p-6 shadow-xl border border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-200">
            Verificar Número de Teléfono
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-green-400 text-lg font-medium">
              ¡Verificación exitosa!
            </p>
            <p className="text-neutral-400 mt-2">
              El número ha sido verificado correctamente.
            </p>
          </div>
        ) : (
          <>
            {/* Instructions */}
            <div className="mb-6">
              <p className="text-neutral-300 mb-2">
                Ingresa el código de 6 dígitos que recibiste en tu WhatsApp Business:
              </p>
              {phoneNumber && (
                <p className="text-sm text-neutral-400 mb-3">
                  Número: <span className="font-mono text-neutral-300">{phoneNumber}</span>
                </p>
              )}
              
              {/* Mensaje especial si el estado es NOT_VERIFIED */}
              {verificationStatus === 'NOT_VERIFIED' && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-300">
                    <strong>⚠️ El código aún no ha sido enviado por Meta.</strong>
                    <br />
                    Debes agregar el número manualmente desde Meta Developer Console para recibir el código.
                    Puedes cerrar este modal y continuar después cuando tengas el código.
                  </p>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Código de Verificación
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  {code.length}/6 dígitos
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-neutral-600 hover:border-neutral-500"
                    disabled={loading}
                  >
                    {verificationStatus === 'NOT_VERIFIED' ? 'Cerrar y continuar después' : 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#e7922b] hover:bg-[#d6831f] text-[#1a2430] rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#e7922b] hover:border-[#d6831f]"
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar'
                    )}
                  </button>
                </div>
                
                {/* Mensaje adicional si no hay código todavía */}
                {verificationStatus === 'NOT_VERIFIED' && code.length === 0 && (
                  <p className="text-xs text-center text-neutral-500 mt-1">
                    Puedes cerrar este modal y volver cuando recibas el código
                  </p>
                )}
              </div>

              {/* Retry Button (mostrar solo si hay error y no está cargando) */}
              {error && !loading && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setCode('');
                    }}
                    className="w-full px-4 py-2 bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg transition"
                  >
                    Limpiar e intentar de nuevo
                  </button>
                </div>
              )}
            </form>

            {/* Help Text */}
            <div className="mt-6 space-y-4">
              {verificationStatus === 'NOT_VERIFIED' ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-400 font-semibold mb-2">
                    ⚠️ El código aún no ha sido enviado por Meta
                  </p>
                  <p className="text-xs text-yellow-300 mb-3">
                    Para recibir el código de 6 dígitos, debes iniciar el proceso manualmente desde Meta Developer Console.
                  </p>
                  <div className="space-y-3 text-xs text-yellow-200 mb-3">
                    <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                      <p className="font-semibold mb-1 text-yellow-100">⚠️ Tu número ya está registrado</p>
                      <p className="text-yellow-300">
                        El número <strong className="font-mono">{phoneNumber}</strong> está registrado pero <strong>NO tiene coexistencia activada</strong>. 
                        Necesitas activarla para usar la API.
                      </p>
                    </div>
                    
                    <p className="font-semibold mb-2 text-yellow-100">✅ ACTIVAR COEXISTENCIA para número existente</p>
                    <p className="text-yellow-300 mb-3">
                      Tu número <strong className="font-mono">{phoneNumber}</strong> ya está en WhatsApp Business Manager, 
                      pero necesitas activar la coexistencia para usarlo con la API.
                    </p>
                    
                    <p className="font-semibold mb-2 text-yellow-100">OPCIÓN 1: Desde WhatsApp Business Manager (Donde estás ahora)</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2 mb-4">
                      <li>
                        <strong>Haz clic en tu número</strong> <strong className="font-mono">{phoneNumber}</strong> en la lista de "Cuentas de WhatsApp"
                      </li>
                      <li>
                        En el panel derecho que se abre, busca un botón o enlace que diga:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><strong>"Conectar con API"</strong> o <strong>"Enable API"</strong></li>
                          <li><strong>"Activar API"</strong> o <strong>"Habilitar API"</strong></li>
                          <li><strong>"Migrar a API"</strong> o <strong>"Migrate to API"</strong></li>
                        </ul>
                      </li>
                      <li>
                        Si encuentras esa opción, haz clic y sigue los pasos
                      </li>
                      <li>
                        Si <strong>NO encuentras</strong> esa opción, continúa con la <strong>OPCIÓN 2</strong> abajo
                      </li>
                    </ol>
                    
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                      <p className="font-semibold mb-1 text-blue-100">💡 ¿Cómo obtener acceso a la app?</p>
                      <p className="text-xs text-blue-300 mb-2">
                        <strong>NO necesitas crear una nueva app.</strong> Puedes hacerte administrador de la app existente "CARDIO VASCULAR PLUS BOLIVIA".
                      </p>
                      <p className="text-xs text-blue-300">
                        <strong>Opción A:</strong> Si eres el dueño de la cuenta de Facebook que creó la app, ya deberías tener acceso.<br />
                        <strong>Opción B:</strong> Si no eres el dueño, pídele al administrador actual que te agregue como administrador en Roles → Roles.
                      </p>
                    </div>
                    
                    <p className="font-semibold mb-2 text-yellow-100">OPCIÓN 2: Desde Meta Developer Console</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2 mb-4">
                      <li>
                        <strong>Intenta acceder a tu app:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Ve a: <code className="text-xs bg-neutral-800 px-1 py-0.5 rounded">developers.facebook.com/apps/1253651046588346/</code></li>
                          <li>Si puedes entrar, continúa al paso 2</li>
                          <li>Si NO puedes entrar (app bloqueada), necesitas permisos (ver cuadro azul arriba)</li>
                        </ul>
                      </li>
                      <li>
                        En el <strong>menú lateral</strong>, busca y haz clic en <strong>"WhatsApp"</strong>
                      </li>
                      <li>
                        Dentro de WhatsApp, haz clic en <strong>"Phone Numbers"</strong>
                      </li>
                      <li>
                        Haz clic en <strong>"Add phone number"</strong> / <strong>"Agregar número"</strong>
                      </li>
                      <li>
                        Selecciona <strong>"Use existing number"</strong> / <strong>"Usar número existente"</strong>
                      </li>
                      <li>
                        Ingresa tu número: <strong className="font-mono">{phoneNumber}</strong>
                      </li>
                      <li>
                        Meta enviará un código de 6 dígitos a tu WhatsApp Business
                      </li>
                      <li>
                        <strong>Vuelve a este modal</strong> e ingresa el código cuando lo recibas
                      </li>
                    </ol>
                    
                    <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                      <p className="text-xs text-blue-300">
                        💡 <strong>Ventaja:</strong> WhatsApp Business Manager es más accesible y no requiere acceso a aplicaciones bloqueadas.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <a
                      href="https://business.facebook.com/settings/whatsapp-accounts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold rounded-lg transition text-sm w-full justify-center shadow-lg"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Abrir WhatsApp Business Manager
                    </a>
                    <p className="text-xs text-yellow-300 text-center mt-1">
                      Luego: Menú lateral → <strong>Cuentas</strong> → <strong>Cuentas de WhatsApp</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400 font-semibold mb-2">
                    ¿No recibiste el código?
                  </p>
                  <p className="text-xs text-blue-300">
                    Revisa tu WhatsApp Business. El código fue enviado automáticamente por Meta.
                    Si no lo recibes, espera unos minutos o intenta agregar el número manualmente desde Meta Developer Console.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

