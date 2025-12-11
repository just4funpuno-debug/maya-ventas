/**
 * Formulario para crear/editar cuentas WhatsApp
 * SUBFASE 1.4: Formulario con validación
 */

import React, { useState, useEffect, useRef } from 'react';
import { AsyncButton } from '../AsyncButton';
import { validateWhatsAppAccount } from '../../utils/whatsapp/validation';
import { getProducts } from '../../services/whatsapp/accounts';
import { 
  generateOAuthState, 
  buildOAuthUrl, 
  saveOAuthState,
  openOAuthWindow,
  listenOAuthCallback,
  clearOAuthState
} from '../../utils/whatsapp/oauth';
import { startCoexistenceVerification } from '../../services/whatsapp/coexistence-checker';
import { getAccountByPhoneNumberId } from '../../services/whatsapp/accounts';
import QRModal from './QRModal';
import { ExternalLink, Loader2 } from 'lucide-react';

export default function AccountForm({ 
  account = null, // Si se proporciona, es modo edición
  products = [], // Lista de productos disponibles
  onSubmit, 
  onCancel,
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    verify_token: '',
    phone_number: '',
    display_name: '',
    product_id: '',
    active: true
  });
  
  const [errors, setErrors] = useState({});
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [availableProducts, setAvailableProducts] = useState(products);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalData, setQrModalData] = useState({
    qrUrl: null,
    phoneNumber: '',
    status: 'pending',
    isChecking: false
  });
  const oauthPopupRef = useRef(null);
  const oauthCancelRef = useRef(null);
  const coexistenceCancelRef = useRef(null);

  // Cargar productos si no se proporcionaron
  useEffect(() => {
    if (products.length === 0) {
      getProducts().then(({ data }) => {
        if (data) {
          setAvailableProducts(data);
        }
      });
    }
  }, [products]);

  // Si se proporciona account, es modo edición
  useEffect(() => {
    if (account) {
      setFormData({
        phone_number_id: account.phone_number_id || '',
        business_account_id: account.business_account_id || '',
        access_token: account.access_token || '',
        verify_token: account.verify_token || '',
        phone_number: account.phone_number || '',
        display_name: account.display_name || '',
        product_id: account.product_id || '',
        active: account.active !== undefined ? account.active : true
      });
    }
  }, [account]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // Validar
    const validation = validateWhatsAppAccount(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Limpiar errores
    setErrors({});

    // Llamar callback
    await onSubmit(formData);
  };

  // Limpiar listeners cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (oauthCancelRef.current) {
        oauthCancelRef.current();
      }
      if (coexistenceCancelRef.current) {
        coexistenceCancelRef.current();
      }
      if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
        oauthPopupRef.current.close();
      }
      clearOAuthState();
    };
  }, []);

  const handleConnectMeta = async () => {
    try {
      setIsConnectingMeta(true);
      setOauthError(null);

      // Generar state único
      const state = generateOAuthState();
      saveOAuthState(state);

      // Construir URL OAuth
      const oauthUrl = buildOAuthUrl(state);

      // Abrir popup OAuth
      const popup = openOAuthWindow(oauthUrl, true);
      if (!popup) {
        throw new Error('No se pudo abrir la ventana de OAuth');
      }

      oauthPopupRef.current = popup;

      // Escuchar callback
      oauthCancelRef.current = listenOAuthCallback(
        popup,
        async (accountData) => {
          // OAuth exitoso - llenar formulario con datos
          setIsConnectingMeta(false);
          setOauthError(null);
          
          // Cerrar popup
          if (popup && !popup.closed) {
            popup.close();
          }
          clearOAuthState();

          // Verificar si necesita coexistencia
          const needsCoexistence = accountData.coexistence_status === 'pending' || 
                                   accountData.coexistence_needs_action;

          if (needsCoexistence && accountData.phone_number_id) {
            // Obtener cuenta desde BD para tener access_token
            try {
              const { data: accountFromDB, error: accountError } = await getAccountByPhoneNumberId(accountData.phone_number_id);
              
              if (accountError || !accountFromDB || !accountFromDB.data) {
                console.warn('[AccountForm] No se pudo obtener cuenta desde BD para coexistencia:', accountError);
                // Continuar sin verificación de coexistencia
                setFormData(prev => ({
                  ...prev,
                  phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                  business_account_id: accountData.business_account_id || prev.business_account_id,
                  phone_number: accountData.phone_number || prev.phone_number,
                  display_name: accountData.display_name || prev.display_name,
                }));
                setErrors({});
                return;
              }

              const accessToken = accountFromDB.data.access_token || accountFromDB.data.oauth_access_token;

              if (!accessToken) {
                console.warn('[AccountForm] No se encontró access_token en la cuenta');
                // Continuar sin verificación de coexistencia
                setFormData(prev => ({
                  ...prev,
                  phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                  business_account_id: accountData.business_account_id || prev.business_account_id,
                  phone_number: accountData.phone_number || prev.phone_number,
                  display_name: accountData.display_name || prev.display_name,
                }));
                setErrors({});
                return;
              }

              // Mostrar modal QR y iniciar verificación de coexistencia
              setQrModalData({
                qrUrl: accountData.coexistence_qr_url || accountFromDB.data.coexistence_qr_url || null,
                phoneNumber: accountData.phone_number || accountFromDB.data.phone_number || '',
                status: 'pending',
                isChecking: false
              });
              setShowQRModal(true);

              // Iniciar polling para verificar coexistencia
              coexistenceCancelRef.current = startCoexistenceVerification(
                accountData.phone_number_id,
                accessToken,
                (coexistenceStatus) => {
                  // Actualizar estado del modal
                  setQrModalData(prev => ({
                    ...prev,
                    status: coexistenceStatus.status,
                    isChecking: coexistenceStatus.status === 'pending',
                    qrUrl: coexistenceStatus.qrUrl || prev.qrUrl
                  }));

                  // Si se conectó, cerrar modal y continuar
                  if (coexistenceStatus.status === 'connected') {
                    setTimeout(() => {
                      setShowQRModal(false);
                      // Llenar formulario con datos obtenidos
                      setFormData(prev => ({
                        ...prev,
                        phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                        business_account_id: accountData.business_account_id || prev.business_account_id,
                        phone_number: accountData.phone_number || prev.phone_number,
                        display_name: accountData.display_name || prev.display_name,
                      }));
                      setErrors({});
                    }, 1500); // Esperar 1.5 segundos para mostrar éxito
                  }
                },
                {
                  interval: 5000, // Verificar cada 5 segundos
                  maxAttempts: 60 // 5 minutos máximo
                }
              );
            } catch (err) {
              console.error('[AccountForm] Error obteniendo cuenta para coexistencia:', err);
              // Continuar sin verificación de coexistencia
              setFormData(prev => ({
                ...prev,
                phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                business_account_id: accountData.business_account_id || prev.business_account_id,
                phone_number: accountData.phone_number || prev.phone_number,
                display_name: accountData.display_name || prev.display_name,
              }));
              setErrors({});
            }
          } else {
            // No necesita coexistencia, llenar formulario directamente
            setFormData(prev => ({
              ...prev,
              phone_number_id: accountData.phone_number_id || prev.phone_number_id,
              business_account_id: accountData.business_account_id || prev.business_account_id,
              phone_number: accountData.phone_number || prev.phone_number,
              display_name: accountData.display_name || prev.display_name,
            }));
            setErrors({});
          }
        },
        (error) => {
          // OAuth falló
          setIsConnectingMeta(false);
          setOauthError(error.message || 'Error al conectar con Meta');
          
          // Cerrar popup
          if (popup && !popup.closed) {
            popup.close();
          }
          clearOAuthState();
        }
      );
    } catch (err) {
      console.error('[AccountForm] Error iniciando OAuth:', err);
      setIsConnectingMeta(false);
      setOauthError(err.message || 'Error al iniciar conexión con Meta');
      clearOAuthState();
    }
  };

  return (
    <div className="space-y-4">
      {/* Botón Conectar con Meta */}
      {!account && (
        <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-blue-200 mb-1">
                Conectar con Meta (OAuth)
              </h3>
              <p className="text-xs text-blue-300/80">
                Conecta tu cuenta de WhatsApp automáticamente sin copiar/pegar datos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectMeta}
            disabled={isLoading || isConnectingMeta}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isConnectingMeta ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando con Meta...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Conectar con Meta
              </>
            )}
          </button>
          {oauthError && (
            <p className="mt-2 text-xs text-red-400">{oauthError}</p>
          )}
        </div>
      )}

      {/* Divider */}
      {!account && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-neutral-900 text-neutral-400">O completa manualmente</span>
          </div>
        </div>
      )}

      {/* Phone Number ID */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Phone Number ID <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.phone_number_id}
          onChange={(e) => handleChange('phone_number_id', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
            errors.phone_number_id ? 'border-red-500' : 'border-neutral-700'
          }`}
          placeholder="Ej: 123456789012345"
          disabled={isLoading}
        />
        {errors.phone_number_id && (
          <p className="mt-1 text-xs text-red-400">{errors.phone_number_id}</p>
        )}
      </div>

      {/* Business Account ID */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Business Account ID <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.business_account_id}
          onChange={(e) => handleChange('business_account_id', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
            errors.business_account_id ? 'border-red-500' : 'border-neutral-700'
          }`}
          placeholder="Ej: 987654321098765"
          disabled={isLoading || isConnectingMeta}
        />
        {errors.business_account_id && (
          <p className="mt-1 text-xs text-red-400">{errors.business_account_id}</p>
        )}
      </div>

      {/* Access Token */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Access Token <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showAccessToken ? 'text' : 'password'}
            value={formData.access_token}
            onChange={(e) => handleChange('access_token', e.target.value)}
            className={`w-full px-3 py-2 pr-10 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
              errors.access_token ? 'border-red-500' : 'border-neutral-700'
            }`}
            placeholder="Token de acceso de WhatsApp Cloud API"
            disabled={isLoading || isConnectingMeta}
          />
          <button
            type="button"
            onClick={() => setShowAccessToken(!showAccessToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 text-xs"
            disabled={isLoading || isConnectingMeta}
          >
            {showAccessToken ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {errors.access_token && (
          <p className="mt-1 text-xs text-red-400">{errors.access_token}</p>
        )}
      </div>

      {/* Verify Token */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Verify Token <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.verify_token}
          onChange={(e) => handleChange('verify_token', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
            errors.verify_token ? 'border-red-500' : 'border-neutral-700'
          }`}
          placeholder="Token de verificación para webhook"
          disabled={isLoading || isConnectingMeta}
        />
        {errors.verify_token && (
          <p className="mt-1 text-xs text-red-400">{errors.verify_token}</p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Número de Teléfono <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.phone_number}
          onChange={(e) => handleChange('phone_number', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
            errors.phone_number ? 'border-red-500' : 'border-neutral-700'
          }`}
          placeholder="Ej: +591 12345678"
          disabled={isLoading || isConnectingMeta}
        />
        {errors.phone_number && (
          <p className="mt-1 text-xs text-red-400">{errors.phone_number}</p>
        )}
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
          Nombre para Mostrar
        </label>
        <input
          type="text"
          value={formData.display_name}
          onChange={(e) => handleChange('display_name', e.target.value)}
          className={`w-full px-3 py-2 rounded-lg bg-neutral-800 border text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
            errors.display_name ? 'border-red-500' : 'border-neutral-700'
          }`}
          placeholder="Ej: Maya Life - Producto X"
          disabled={isLoading || isConnectingMeta}
        />
        {errors.display_name && (
          <p className="mt-1 text-xs text-red-400">{errors.display_name}</p>
        )}
      </div>

      {/* Product ID (opcional) */}
      {availableProducts.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Producto Asociado (opcional)
          </label>
          <select
            value={formData.product_id}
            onChange={(e) => handleChange('product_id', e.target.value || '')}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            disabled={isLoading || isConnectingMeta}
          >
            <option value="">Sin producto asociado</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name || product.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => handleChange('active', e.target.checked)}
          className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-[#e7922b] focus:ring-2 focus:ring-[#e7922b]"
          disabled={isLoading || isConnectingMeta}
        />
        <label htmlFor="active" className="text-xs font-medium text-neutral-300">
          Cuenta activa
        </label>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-neutral-700 text-sm font-medium text-neutral-200 hover:bg-neutral-600 disabled:opacity-40"
          >
            Cancelar
          </button>
        )}
                <AsyncButton
                  onClick={handleSubmit}
                  disabled={isLoading || isConnectingMeta}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#e7922b] text-sm font-medium text-white hover:bg-[#d6821b] disabled:opacity-40"
                >
          {account ? 'Actualizar Cuenta' : 'Crear Cuenta'}
        </AsyncButton>
      </div>

      {/* Modal QR para Coexistencia */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          if (coexistenceCancelRef.current) {
            coexistenceCancelRef.current();
          }
        }}
        qrUrl={qrModalData.qrUrl}
        phoneNumber={qrModalData.phoneNumber}
        isChecking={qrModalData.isChecking}
        status={qrModalData.status}
        onStatusChange={(newStatus) => {
          setQrModalData(prev => ({
            ...prev,
            status: newStatus.status || prev.status,
            isChecking: newStatus.status === 'pending'
          }));
        }}
      />
    </div>
  );
}

