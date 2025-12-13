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
import { getAccountByPhoneNumberId, getAccountById } from '../../services/whatsapp/accounts';
import { getPhoneNumberDetails } from '../../services/whatsapp/meta-graph-api';
import QRModal from './QRModal';
import PhoneNumberSelector from './PhoneNumberSelector';
import RegistrationGuideModal from './RegistrationGuideModal';
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
  const [showPhoneNumberSelector, setShowPhoneNumberSelector] = useState(false);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState([]);
  const [oauthAccountData, setOauthAccountData] = useState(null); // Datos de OAuth pendientes de selección
  const [desiredPhoneNumber, setDesiredPhoneNumber] = useState(''); // Número que el usuario quiere usar
  const [showRegistrationGuide, setShowRegistrationGuide] = useState(false);
  const [numberNotFound, setNumberNotFound] = useState(false);
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

  // Procesar número seleccionado (después de OAuth o selección manual)
  const processSelectedPhoneNumber = async (accountData) => {
    // Llenar formulario con los datos recibidos
    console.log('[AccountForm] Procesando número seleccionado:', {
      phone_number_id: accountData.phone_number_id,
      business_account_id: accountData.business_account_id,
      phone_number: accountData.phone_number,
      display_name: accountData.display_name,
      coexistence_status: accountData.coexistence_status,
      account_id: accountData.account_id
    });

    // Obtener la cuenta completa desde BD para tener access_token y verify_token
    // Intentar por account_id primero, luego por phone_number_id
    let accountFromDB = null;
    let accessToken = null;
    let verifyToken = null;

    try {
      if (accountData.account_id) {
        // Intentar obtener por account_id
        const { data: accountById, error: errorById } = await getAccountById(accountData.account_id);
        if (!errorById && accountById) {
          accountFromDB = accountById;
        }
      }

      // Si no funcionó por account_id, intentar por phone_number_id
      if (!accountFromDB && accountData.phone_number_id) {
        const { data: accountByPhone, error: errorByPhone } = await getAccountByPhoneNumberId(accountData.phone_number_id);
        if (!errorByPhone && accountByPhone && accountByPhone.data) {
          accountFromDB = accountByPhone.data;
        }
      }

      if (accountFromDB) {
        accessToken = accountFromDB.access_token || accountFromDB.oauth_access_token;
        verifyToken = accountFromDB.verify_token;
        console.log('[AccountForm] Cuenta obtenida de BD:', {
          hasAccessToken: !!accessToken,
          hasVerifyToken: !!verifyToken,
          accountId: accountFromDB.id
        });
      } else {
        console.warn('[AccountForm] No se pudo obtener cuenta desde BD, los campos de token no se llenarán');
      }
    } catch (err) {
      console.error('[AccountForm] Error obteniendo cuenta desde BD:', err);
    }

    // Llenar formulario con todos los datos disponibles
    setFormData(prev => ({
      ...prev,
      phone_number_id: accountData.phone_number_id || prev.phone_number_id,
      business_account_id: accountData.business_account_id || prev.business_account_id,
      phone_number: accountData.phone_number || prev.phone_number,
      display_name: accountData.display_name || prev.display_name,
      access_token: accessToken || accountData.access_token || prev.access_token,
      verify_token: verifyToken || prev.verify_token,
    }));
    setErrors({});

    // Verificar si necesita coexistencia
    // NOTA: Los números de prueba de Meta (15551520667, etc.) generalmente ya tienen coexistencia activa
    const phoneNumber = accountData.phone_number || accountFromDB?.phone_number || '';
    const isTestNumber = phoneNumber.includes('15551520') || phoneNumber.startsWith('1555'); // Números de prueba de Meta
    
    const needsCoexistence = (accountData.coexistence_status === 'pending' || 
                             accountData.coexistence_needs_action) && 
                             !isTestNumber; // No mostrar modal para números de prueba

    if (needsCoexistence && accountData.phone_number_id && accountFromDB) {
      // Usar la cuenta que ya obtuvimos arriba (no necesitamos consultarla de nuevo)
      try {
        const coexistenceAccessToken = accountFromDB.access_token || accountFromDB.oauth_access_token || accountData.access_token;

        if (!coexistenceAccessToken) {
          console.warn('[AccountForm] No se encontró access_token en la cuenta para coexistencia');
          return;
        }

        // Mostrar modal QR y iniciar verificación de coexistencia
        setQrModalData({
          qrUrl: accountData.coexistence_qr_url || accountFromDB.coexistence_qr_url || null,
          phoneNumber: phoneNumber,
          status: 'pending',
          isChecking: false
        });
        setShowQRModal(true);
        
        console.log('[AccountForm] Modal de coexistencia abierto. Nota: La coexistencia debe configurarse manualmente desde Meta Developer Console.');

        // Iniciar polling para verificar coexistencia
        console.log('[AccountForm] Iniciando verificación de coexistencia...');
        coexistenceCancelRef.current = startCoexistenceVerification(
          accountData.phone_number_id,
          coexistenceAccessToken,
          (coexistenceStatus) => {
            console.log('[AccountForm] Estado de coexistencia actualizado:', coexistenceStatus);
            
            setQrModalData(prev => ({
              ...prev,
              status: coexistenceStatus.status,
              isChecking: false,
              qrUrl: coexistenceStatus.qrUrl || prev.qrUrl
            }));

            if (coexistenceStatus.status === 'connected') {
              console.log('[AccountForm] Coexistencia conectada, cerrando modal...');
              setTimeout(() => {
                setShowQRModal(false);
                if (coexistenceCancelRef.current) {
                  coexistenceCancelRef.current();
                }
              }, 1500);
            } else if (coexistenceStatus.status === 'failed') {
              console.warn('[AccountForm] Coexistencia falló:', coexistenceStatus.error);
            }
          },
          {
            interval: 5000,
            maxAttempts: 60
          }
        );
      } catch (err) {
        console.error('[AccountForm] Error obteniendo cuenta para coexistencia:', err);
      }
    } else if (isTestNumber) {
      console.log('[AccountForm] Número de prueba de Meta detectado (' + phoneNumber + '). La coexistencia generalmente está activa para números de prueba.');
    }
  };

  // Manejar selección de número desde el selector
  const handlePhoneNumberSelected = async (selectedPhoneNumber) => {
    console.log('[AccountForm] Número seleccionado por el usuario:', selectedPhoneNumber);
    
    if (!oauthAccountData || !selectedPhoneNumber) {
      console.error('[AccountForm] Faltan datos para procesar número seleccionado');
      return;
    }

    setShowPhoneNumberSelector(false);

    try {
      // Obtener detalles del número seleccionado usando el access_token temporal
      const accessToken = oauthAccountData.access_token;
      if (!accessToken) {
        throw new Error('No hay access_token disponible');
      }

      // Obtener detalles del número seleccionado
      const { data: phoneDetails, error: detailsError } = await getPhoneNumberDetails(
        selectedPhoneNumber.id,
        accessToken
      );

      if (detailsError || !phoneDetails) {
        console.warn('[AccountForm] No se pudieron obtener detalles del número seleccionado, usando datos básicos');
      }

      // Construir accountData similar al formato normal
      const accountData = {
        phone_number_id: selectedPhoneNumber.id,
        business_account_id: oauthAccountData.business_account_id,
        phone_number: phoneDetails?.display_phone_number || selectedPhoneNumber.display_phone_number || selectedPhoneNumber.phone_number,
        display_name: phoneDetails?.verified_name || selectedPhoneNumber.verified_name || phoneDetails?.display_phone_number || selectedPhoneNumber.display_phone_number,
        coexistence_status: phoneDetails?.code_verification_status === 'VERIFIED' ? 'connected' : 'pending',
        coexistence_needs_action: phoneDetails?.code_verification_status !== 'VERIFIED',
        access_token: accessToken, // Token temporal para obtener datos, luego se guardará en BD
        meta_app_id: oauthAccountData.meta_app_id,
        meta_user_id: oauthAccountData.meta_user_id
      };

      // Procesar con los datos que tenemos
      await processSelectedPhoneNumber(accountData);

      // Limpiar datos temporales
      setOauthAccountData(null);
      setAvailablePhoneNumbers([]);

    } catch (err) {
      console.error('[AccountForm] Error procesando número seleccionado:', err);
      setOauthError(err.message || 'Error al procesar número seleccionado');
      setShowPhoneNumberSelector(false);
      setOauthAccountData(null);
      setAvailablePhoneNumbers([]);
    }
  };

  // Normalizar número de teléfono para comparación
  const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    // Remover espacios, guiones, paréntesis y el símbolo +
    return phone.replace(/\s+|-|\(|\)|\+/g, '').trim();
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

          console.log('[AccountForm] Datos recibidos de OAuth:', accountData);

          // Verificar si se requiere selección de número (múltiples números disponibles)
          if (accountData.requires_selection && accountData.phone_numbers && accountData.phone_numbers.length > 1) {
            // Múltiples números: verificar si el número deseado está en la lista
            if (desiredPhoneNumber) {
              const normalizedDesired = normalizePhoneNumber(desiredPhoneNumber);
              const foundNumber = accountData.phone_numbers.find(pn => {
                const pnNormalized = normalizePhoneNumber(
                  pn.display_phone_number || pn.phone_number || ''
                );
                return pnNormalized === normalizedDesired;
              });

              if (foundNumber) {
                // Número deseado encontrado: pre-seleccionarlo automáticamente
                console.log('[AccountForm] Número deseado encontrado, pre-seleccionando...');
                const accountDataWithSelected = {
                  ...accountData,
                  phone_number_id: foundNumber.id,
                  phone_number: foundNumber.display_phone_number || foundNumber.phone_number,
                  display_name: foundNumber.verified_name || foundNumber.display_phone_number,
                };
                // Continuar como si fuera un solo número
                await processSelectedPhoneNumber(accountDataWithSelected);
                return;
              } else {
                // Número deseado NO encontrado: mostrar selector + advertencia
                console.log('[AccountForm] Número deseado no encontrado en números registrados');
                setNumberNotFound(true);
                setAvailablePhoneNumbers(accountData.phone_numbers);
                setOauthAccountData(accountData);
                setShowPhoneNumberSelector(true);
                return;
              }
            }

            // Sin número deseado: mostrar selector normal
            console.log('[AccountForm] Múltiples números disponibles, mostrando selector...');
            setAvailablePhoneNumbers(accountData.phone_numbers);
            setOauthAccountData(accountData);
            setShowPhoneNumberSelector(true);
            return;
          }

          // Si solo hay un número o ya está seleccionado, verificar si coincide con el deseado
          if (accountData.phone_number && desiredPhoneNumber) {
            const normalizedDesired = normalizePhoneNumber(desiredPhoneNumber);
            const normalizedReceived = normalizePhoneNumber(accountData.phone_number);
            
            if (normalizedDesired !== normalizedReceived) {
              // El número obtenido no coincide con el deseado
              console.log('[AccountForm] Número obtenido no coincide con el deseado');
              setNumberNotFound(true);
              // Mostrar instrucciones pero también procesar el número obtenido (por si el usuario quiere usarlo)
              // El usuario puede elegir continuar con este número o registrarlo manualmente
            }
          }

          // Procesar normalmente
          await processSelectedPhoneNumber(accountData);
          // Si no necesita coexistencia, los campos ya están llenos arriba
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
      {/* Campo para Número Deseado + Botón Conectar con Meta */}
      {!account && (
        <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-blue-200 mb-1">
                Conectar con Meta (OAuth)
              </h3>
              <p className="text-xs text-blue-300/80">
                {desiredPhoneNumber 
                  ? `Conectaremos con: ${desiredPhoneNumber}`
                  : 'Conecta tu cuenta de WhatsApp automáticamente sin copiar/pegar datos'
                }
              </p>
            </div>
          </div>

          {/* Campo opcional para especificar número deseado */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Número de WhatsApp a vincular <span className="text-neutral-500">(Opcional)</span>
            </label>
            <input
              type="tel"
              value={desiredPhoneNumber}
              onChange={(e) => {
                setDesiredPhoneNumber(e.target.value);
                setNumberNotFound(false);
              }}
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+591 12345678 (Opcional: para pre-seleccionar)"
              disabled={isLoading || isConnectingMeta}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Si especificas un número, lo buscaremos en tus números registrados. Si no está registrado, te mostraremos cómo registrarlo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnectMeta}
            disabled={isLoading || isConnectingMeta}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isConnectingMeta ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando con Meta...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                {desiredPhoneNumber ? `Conectar con ${desiredPhoneNumber}` : 'Conectar con Meta'}
              </>
            )}
          </button>
          {oauthError && (
            <p className="mt-2 text-xs text-red-400">{oauthError}</p>
          )}
          {numberNotFound && (
            <div className="mt-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
              <p className="text-xs text-yellow-300 mb-2">
                ⚠️ El número <strong>{desiredPhoneNumber}</strong> no está registrado en Meta Developer Console.
              </p>
              <button
                type="button"
                onClick={() => setShowRegistrationGuide(true)}
                className="text-xs text-yellow-400 hover:text-yellow-300 underline"
              >
                Ver instrucciones para registrarlo →
              </button>
            </div>
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

      {/* Modal Selector de Número de Teléfono */}
      <PhoneNumberSelector
        isOpen={showPhoneNumberSelector}
        onClose={() => {
          setShowPhoneNumberSelector(false);
          setOauthAccountData(null);
          setAvailablePhoneNumbers([]);
          setNumberNotFound(false);
        }}
        phoneNumbers={availablePhoneNumbers}
        onSelect={handlePhoneNumberSelected}
        isLoading={isConnectingMeta}
      />

      {/* Modal de Guía de Registro */}
      <RegistrationGuideModal
        isOpen={showRegistrationGuide}
        onClose={() => setShowRegistrationGuide(false)}
        phoneNumber={desiredPhoneNumber}
      />
    </div>
  );
}

