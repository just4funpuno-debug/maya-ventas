/**
 * Formulario para crear/editar cuentas WhatsApp
 * SUBFASE 1.4: Formulario con validación
 */

import React, { useState, useEffect, useRef } from 'react';
import { AsyncButton } from '../AsyncButton';
import { useToast } from '../ToastProvider';
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
import VerificationCodeModal from './VerificationCodeModal';
import { ExternalLink, Loader2 } from 'lucide-react';

export default function AccountForm({ 
  account = null, // Si se proporciona, es modo edición
  products = [], // Lista de productos disponibles
  onSubmit, 
  onCancel,
  isLoading = false,
  onOAuthSuccess = null // Callback opcional cuando OAuth es exitoso (para recargar lista)
}) {
  const toast = useToast();
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
  const [showVerificationCodeModal, setShowVerificationCodeModal] = useState(false);
  const [verificationCodeModalData, setVerificationCodeModalData] = useState({
    phoneNumberId: '',
    accessToken: '',
    phoneNumber: '',
    verificationStatus: null
  });
  const verificationCodeSuccessRef = useRef(null);
  const accountDataRef = useRef(null); // Guardar accountData para uso en el modal
  const oauthPopupRef = useRef(null);
  const oauthCancelRef = useRef(null);
  const coexistenceCancelRef = useRef(null);
  const qrModalCloseRef = useRef(null);

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
          console.log('[AccountForm] OAuth exitoso, datos recibidos:', accountData);
          
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
          
          console.log('[AccountForm] Necesita coexistencia?', needsCoexistence, 'phone_number_id:', accountData.phone_number_id, 'account_id:', accountData.account_id);

          if (needsCoexistence && (accountData.account_id || accountData.phone_number_id)) {
            // Obtener cuenta desde BD para tener access_token
            // Usar account_id si está disponible (más directo y confiable)
            // Intentar varias veces con delay (la cuenta puede tardar en estar disponible)
            try {
              const accountIdentifier = accountData.account_id ? 'account_id' : 'phone_number_id';
              const accountIdentifierValue = accountData.account_id || accountData.phone_number_id;
              console.log(`[AccountForm] Obteniendo cuenta desde BD para coexistencia, ${accountIdentifier}:`, accountIdentifierValue);
              
              let accountFromDB = null;
              let accountError = null;
              let attempts = 0;
              const maxAttempts = 5;
              const delayMs = 1000; // 1 segundo entre intentos
              
              while (attempts < maxAttempts) {
                attempts++;
                console.log(`[AccountForm] Intento ${attempts}/${maxAttempts} obteniendo cuenta desde BD para coexistencia...`);
                
                // Usar getAccountById si tenemos account_id, sino getAccountByPhoneNumberId
                const result = accountData.account_id 
                  ? await getAccountById(accountData.account_id, null) // null = sin filtro de permisos
                  : await getAccountByPhoneNumberId(accountData.phone_number_id);
                accountFromDB = result.data;
                accountError = result.error;
                
                console.log('[AccountForm] Respuesta getAccountByPhoneNumberId (coexistencia):', { 
                  accountFromDB, 
                  accountError, 
                  attempts,
                  hasAccountFromDB: !!accountFromDB,
                  accountFromDBType: typeof accountFromDB,
                  accountFromDBKeys: accountFromDB ? Object.keys(accountFromDB) : null,
                  hasData: !!accountFromDB?.data,
                  dataType: typeof accountFromDB?.data
                });
                
                // Verificar si la cuenta existe (maybeSingle() retorna null si no existe, o el objeto directamente si existe)
                const retrievedAccountData = accountFromDB?.data || accountFromDB;
                if (!accountError && retrievedAccountData) {
                  console.log('[AccountForm] ✅ Cuenta encontrada en BD para coexistencia:', retrievedAccountData);
                  // Guardar la cuenta correctamente estructurada
                  accountFromDB = { data: retrievedAccountData };
                  break;
                }
                
                if (attempts < maxAttempts) {
                  console.log(`[AccountForm] Cuenta no encontrada, esperando ${delayMs}ms antes de reintentar...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
              }
              
              const finalAccountData = accountFromDB?.data || accountFromDB;
              if (accountError || !finalAccountData) {
                console.error('[AccountForm] No se pudo obtener cuenta desde BD para coexistencia después de', maxAttempts, 'intentos:', accountError);
                console.error('[AccountForm] accountFromDB final:', accountFromDB);
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
              
              // Usar finalAccountData en lugar de accountFromDB.data
              accountFromDB = { data: finalAccountData };

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

              // FASE 3.1: Verificar si se requiere código de 6 dígitos
              console.log('[AccountForm] Verificando estado de verificación de código...');
              console.log('[AccountForm] phone_number_id:', accountData.phone_number_id);
              console.log('[AccountForm] accessToken presente:', !!accessToken);
              
              try {
                const phoneDetailsResult = await getPhoneNumberDetails(
                  accountData.phone_number_id,
                  accessToken
                );

                console.log('[AccountForm] phoneDetailsResult completo:', phoneDetailsResult);
                console.log('[AccountForm] code_verification_status:', phoneDetailsResult.data?.code_verification_status);
                console.log('[AccountForm] phoneDetailsResult.data:', phoneDetailsResult.data);

                // Detectar si se requiere verificación (PENDING o NOT_VERIFIED)
                const verificationStatus = phoneDetailsResult.data?.code_verification_status;
                const needsCodeVerification = verificationStatus === 'PENDING' || verificationStatus === 'NOT_VERIFIED';

                if (phoneDetailsResult.data && needsCodeVerification) {
                  console.log('[AccountForm] ✅ Se requiere verificación de código de 6 dígitos (status:', verificationStatus, ')');
                  
                  // Mostrar modal de verificación de código
                  setShowVerificationCodeModal(true);
                  
                  // Función para cuando la verificación de código es exitosa
                  const handleVerificationCodeSuccess = async () => {
                    console.log('[AccountForm] ✅ Verificación de código exitosa, recargando detalles del número...');
                    
                    // Recargar detalles del número para verificar que ahora esté VERIFIED
                    const updatedDetails = await getPhoneNumberDetails(
                      accountData.phone_number_id,
                      accessToken
                    );
                    
                    if (updatedDetails.data?.code_verification_status === 'VERIFIED') {
                      // Código verificado, llenar formulario y continuar
                      setFormData(prev => ({
                        ...prev,
                        phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                        business_account_id: accountData.business_account_id || prev.business_account_id,
                        phone_number: accountData.phone_number || prev.phone_number,
                        display_name: accountData.display_name || prev.display_name,
                        access_token: accessToken,
                        verify_token: accountFromDB.data.verify_token || prev.verify_token,
                      }));
                      setErrors({});
                      
                      toast.push({
                        type: 'success',
                        title: 'Verificación exitosa',
                        message: 'El número ha sido verificado correctamente. Por favor, asigna un producto y haz clic en "Guardar" para completar.'
                      });
                      
                      // Recargar lista de cuentas si hay callback
                      if (onOAuthSuccess) {
                        setTimeout(() => {
                          onOAuthSuccess();
                        }, 500);
                      }
                    } else {
                      // Aún pendiente (no debería pasar, pero por si acaso)
                      toast.push({
                        type: 'warning',
                        title: 'Verificación pendiente',
                        message: 'El código fue verificado pero el estado aún no se actualizó. Por favor, espera unos segundos e intenta de nuevo.'
                      });
                    }
                  };

                  // Guardar datos del modal y función de éxito
                  setVerificationCodeModalData({
                    phoneNumberId: accountData.phone_number_id,
                    accessToken: accessToken,
                    phoneNumber: accountData.phone_number || accountFromDB.data.phone_number || '',
                    verificationStatus: verificationStatus,
                    businessAccountId: accountData.business_account_id || accountFromDB.data.business_account_id || null
                  });
                  verificationCodeSuccessRef.current = handleVerificationCodeSuccess;
                  setShowVerificationCodeModal(true);
                  
                  return; // Salir aquí, no continuar con QR modal
                } else {
                  const verificationStatus = phoneDetailsResult.data?.code_verification_status || 'no disponible';
                  console.log('[AccountForm] No se requiere verificación de código (status:', verificationStatus, '), continuando con flujo normal de coexistencia');
                  
                  // Si está VERIFIED, no necesita verificación
                  if (verificationStatus === 'VERIFIED') {
                    console.log('[AccountForm] ✅ Número ya verificado, continuando con flujo normal');
                  }
                  
                  // Si hay error pero tenemos datos, guardar phone_number_id para usar en botón manual
                  if (phoneDetailsResult.error) {
                    console.warn('[AccountForm] ⚠️ Error al obtener detalles pero continuando:', phoneDetailsResult.error);
                  }
                  
                  // Guardar datos para poder abrir modal manualmente si es necesario (incluso si no detectamos PENDING/NOT_VERIFIED)
                  accountDataRef.current = accountData;
                  window.__accountFromDBForManualVerification = accountFromDB;
                }
              } catch (codeVerificationError) {
                console.error('[AccountForm] ❌ Error verificando estado de código:', codeVerificationError);
                console.error('[AccountForm] Error completo:', {
                  message: codeVerificationError.message,
                  stack: codeVerificationError.stack,
                  name: codeVerificationError.name
                });
                // Continuar con flujo normal si hay error al verificar
              }
              
              // Guardar datos para poder abrir modal manualmente si es necesario
              accountDataRef.current = accountData;
              window.__accountFromDBForManualVerification = accountFromDB;

              // Función para cerrar modal y llenar formulario con tokens
              const handleCloseQRModal = () => {
                setShowQRModal(false);
                // Llenar formulario con datos obtenidos (incluyendo tokens)
                setFormData(prev => ({
                  ...prev,
                  phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                  business_account_id: accountData.business_account_id || prev.business_account_id,
                  phone_number: accountData.phone_number || prev.phone_number,
                  display_name: accountData.display_name || prev.display_name,
                  access_token: accountFromDB.data.access_token || accountFromDB.data.oauth_access_token || prev.access_token,
                  verify_token: accountFromDB.data.verify_token || prev.verify_token,
                }));
                setErrors({});
                
                toast.push({
                  type: 'info',
                  title: 'Cuenta creada',
                  message: 'La cuenta se creó exitosamente. Puedes configurar la coexistencia más tarde. Por favor, asigna un producto y haz clic en "Guardar" para completar.'
                });
                
                // Recargar lista de cuentas si hay callback
                if (onOAuthSuccess) {
                  setTimeout(() => {
                    onOAuthSuccess();
                  }, 500);
                }
              };

              // Mostrar modal QR y iniciar verificación de coexistencia
              setQrModalData({
                qrUrl: accountData.coexistence_qr_url || accountFromDB.data.coexistence_qr_url || null,
                phoneNumber: accountData.phone_number || accountFromDB.data.phone_number || '',
                status: 'pending',
                isChecking: true // Cambiar a true para mostrar spinner
              });
              setShowQRModal(true);
              
              // Guardar función de cierre para usarla en el modal
              qrModalCloseRef.current = handleCloseQRModal;

              console.log('[AccountForm] Iniciando verificación de coexistencia...');

              // Iniciar polling para verificar coexistencia
              coexistenceCancelRef.current = startCoexistenceVerification(
                accountData.phone_number_id,
                accessToken,
                (coexistenceStatus) => {
                  console.log('[AccountForm] Estado de coexistencia actualizado:', coexistenceStatus);
                  // Actualizar estado del modal
                  // isChecking solo debe ser true durante la primera verificación
                  // Después de eso, aunque esté en 'pending', el usuario puede cerrar el modal
                  setQrModalData(prev => ({
                    ...prev,
                    status: coexistenceStatus.status,
                    isChecking: false, // Permitir cerrar el modal en cualquier momento
                    qrUrl: coexistenceStatus.qrUrl || prev.qrUrl
                  }));

                  // Si se conectó, cerrar modal y continuar
                  if (coexistenceStatus.status === 'connected') {
                    console.log('[AccountForm] ✅ Coexistencia conectada, cerrando modal y llenando formulario...');
                    setTimeout(() => {
                      setShowQRModal(false);
                      // Llenar formulario con datos obtenidos (incluyendo tokens)
                      setFormData(prev => ({
                        ...prev,
                        phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                        business_account_id: accountData.business_account_id || prev.business_account_id,
                        phone_number: accountData.phone_number || prev.phone_number,
                        display_name: accountData.display_name || prev.display_name,
                        access_token: accountFromDB.data.access_token || accountFromDB.data.oauth_access_token || prev.access_token,
                        verify_token: accountFromDB.data.verify_token || prev.verify_token,
                      }));
                      setErrors({});
                      
                      toast.push({
                        type: 'success',
                        title: 'Coexistencia verificada',
                        message: 'La cuenta se configuró correctamente. Por favor, asigna un producto y haz clic en "Guardar" para completar.'
                      });
                      
                      // Recargar lista de cuentas si hay callback
                      if (onOAuthSuccess) {
                        setTimeout(() => {
                          onOAuthSuccess();
                        }, 500);
                      }
                    }, 1500); // Esperar 1.5 segundos para mostrar éxito
                  } else if (coexistenceStatus.status === 'failed') {
                    console.warn('[AccountForm] ⚠️ Coexistencia falló:', coexistenceStatus.error);
                    // Mantener modal abierto pero mostrar error
                    setQrModalData(prev => ({
                      ...prev,
                      status: 'failed',
                      isChecking: false,
                      error: coexistenceStatus.error
                    }));
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
            // IMPORTANTE: La cuenta ya se creó en la BD por la Edge Function
            // Necesitamos obtener la cuenta completa desde la BD para tener access_token y verify_token
            if (accountData.account_id || accountData.phone_number_id) {
              try {
                const accountIdentifier = accountData.account_id ? 'account_id' : 'phone_number_id';
                const accountIdentifierValue = accountData.account_id || accountData.phone_number_id;
                console.log(`[AccountForm] Obteniendo cuenta desde BD (sin coexistencia), ${accountIdentifier}:`, accountIdentifierValue);
                
                // Intentar varias veces con delay (la cuenta puede tardar en estar disponible)
                let accountFromDB = null;
                let accountError = null;
                let attempts = 0;
                const maxAttempts = 5;
                const delayMs = 1000; // 1 segundo entre intentos
                
                while (attempts < maxAttempts) {
                  attempts++;
                  console.log(`[AccountForm] Intento ${attempts}/${maxAttempts} obteniendo cuenta desde BD (sin coexistencia)...`);
                  
                  // Usar getAccountById si tenemos account_id, sino getAccountByPhoneNumberId
                  const result = accountData.account_id 
                    ? await getAccountById(accountData.account_id, null) // null = sin filtro de permisos
                    : await getAccountByPhoneNumberId(accountData.phone_number_id);
                  accountFromDB = result.data;
                  accountError = result.error;
                  
                  console.log('[AccountForm] Respuesta getAccountByPhoneNumberId (sin coexistencia):', { accountFromDB, accountError, attempts });
                  
                  if (!accountError && accountFromDB && accountFromDB.data) {
                    console.log('[AccountForm] ✅ Cuenta encontrada en BD');
                    break;
                  }
                  
                  if (attempts < maxAttempts) {
                    console.log(`[AccountForm] Cuenta no encontrada, esperando ${delayMs}ms antes de reintentar...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                  }
                }
                
                const finalAccountDataNormal = accountFromDB?.data || accountFromDB;
                if (accountError || !finalAccountDataNormal) {
                  console.error('[AccountForm] No se pudo obtener cuenta desde BD para tokens después de', maxAttempts, 'intentos:', accountError);
                  console.error('[AccountForm] accountFromDB final (normal):', accountFromDB);
                  // Llenar solo los datos que tenemos
                  setFormData(prev => ({
                    ...prev,
                    phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                    business_account_id: accountData.business_account_id || prev.business_account_id,
                    phone_number: accountData.phone_number || prev.phone_number,
                    display_name: accountData.display_name || prev.display_name,
                  }));
                  setErrors({});
                  
                  toast.push({
                    type: 'warning',
                    title: 'Cuenta creada parcialmente',
                    message: 'La cuenta se creó, pero no se pudieron obtener los tokens. Por favor, completa los campos manualmente.'
                  });
                  return;
                }

                // Llenar formulario con todos los datos, incluyendo tokens
                const newFormData = {
                  phone_number_id: accountFromDB.data.phone_number_id || accountData.phone_number_id || prev.phone_number_id,
                  business_account_id: accountFromDB.data.business_account_id || accountData.business_account_id || prev.business_account_id,
                  phone_number: accountFromDB.data.phone_number || accountData.phone_number || prev.phone_number,
                  display_name: accountFromDB.data.display_name || accountData.display_name || prev.display_name,
                  access_token: accountFromDB.data.access_token || accountFromDB.data.oauth_access_token || prev.access_token,
                  verify_token: accountFromDB.data.verify_token || prev.verify_token,
                };
                
                console.log('[AccountForm] Llenando formulario con datos:', {
                  hasAccessToken: !!newFormData.access_token,
                  hasVerifyToken: !!newFormData.verify_token,
                  accessTokenLength: newFormData.access_token?.length || 0,
                  verifyTokenLength: newFormData.verify_token?.length || 0,
                });
                
                setFormData(prev => ({
                  ...prev,
                  ...newFormData,
                }));
                setErrors({});
                
                // Mostrar mensaje informativo: la cuenta se creó, pero necesita asignar producto
                toast.push({
                  type: 'info',
                  title: 'Cuenta creada',
                  message: 'La cuenta se creó exitosamente. Por favor, asigna un producto y haz clic en "Guardar" para completar la configuración.'
                });
                
                // Recargar lista de cuentas si hay callback
                if (onOAuthSuccess) {
                  // Esperar un momento para que la BD se actualice
                  setTimeout(() => {
                    onOAuthSuccess();
                  }, 1000);
                }
              } catch (err) {
                console.error('[AccountForm] Error obteniendo cuenta para tokens:', err);
                // Llenar solo los datos que tenemos
                setFormData(prev => ({
                  ...prev,
                  phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                  business_account_id: accountData.business_account_id || prev.business_account_id,
                  phone_number: accountData.phone_number || prev.phone_number,
                  display_name: accountData.display_name || prev.display_name,
                }));
                setErrors({});
                
                toast.push({
                  type: 'warning',
                  title: 'Cuenta creada parcialmente',
                  message: 'La cuenta se creó, pero no se pudieron obtener los tokens. Por favor, completa los campos manualmente.'
                });
              }
            } else {
              // No hay phone_number_id, llenar solo lo que tenemos
              setFormData(prev => ({
                ...prev,
                phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                business_account_id: accountData.business_account_id || prev.business_account_id,
                phone_number: accountData.phone_number || prev.phone_number,
                display_name: accountData.display_name || prev.display_name,
              }));
              setErrors({});
            }
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
          // Si hay función de cierre guardada, usarla (incluye llenar formulario)
          if (qrModalCloseRef.current) {
            qrModalCloseRef.current();
          } else {
            // Fallback: solo cerrar modal
            setShowQRModal(false);
          }
          // Cancelar verificación de coexistencia
          if (coexistenceCancelRef.current) {
            coexistenceCancelRef.current();
          }
        }}
        qrUrl={qrModalData.qrUrl}
        phoneNumber={qrModalData.phoneNumber}
        isChecking={qrModalData.isChecking}
        status={qrModalData.status}
        metaAppId={import.meta.env.VITE_META_APP_ID || null}
        onStatusChange={(newStatus) => {
          setQrModalData(prev => ({
            ...prev,
            status: newStatus.status || prev.status,
            isChecking: newStatus.status === 'pending'
          }));
        }}
        onOpenVerificationCodeModal={async () => {
          // Cerrar QR modal y abrir modal de verificación de código
          setShowQRModal(false);
          
          // Intentar obtener datos desde accountDataRef y window
          const accountData = accountDataRef.current;
          const accountFromDB = window.__accountFromDBForManualVerification;
          
          console.log('[AccountForm] Abriendo modal de verificación de código manualmente', {
            hasAccountData: !!accountData,
            hasAccountFromDB: !!accountFromDB
          });
          
          if (accountData && accountFromDB?.data) {
            const accessToken = accountFromDB.data.access_token || accountFromDB.data.oauth_access_token;
            
            if (accessToken && accountData.phone_number_id) {
              // Crear función de éxito
              const handleVerificationCodeSuccess = async () => {
                console.log('[AccountForm] ✅ Verificación de código exitosa (manual), recargando detalles...');
                
                const { getPhoneNumberDetails } = await import('../../services/whatsapp/meta-graph-api');
                
                const updatedDetails = await getPhoneNumberDetails(
                  accountData.phone_number_id,
                  accessToken
                );
                
                if (updatedDetails.data?.code_verification_status === 'VERIFIED') {
                  setFormData(prev => ({
                    ...prev,
                    phone_number_id: accountData.phone_number_id || prev.phone_number_id,
                    business_account_id: accountData.business_account_id || prev.business_account_id,
                    phone_number: accountData.phone_number || prev.phone_number,
                    display_name: accountData.display_name || prev.display_name,
                    access_token: accessToken,
                    verify_token: accountFromDB.data.verify_token || prev.verify_token,
                  }));
                  setErrors({});
                  
                  toast.push({
                    type: 'success',
                    title: 'Verificación exitosa',
                    message: 'El número ha sido verificado correctamente. Por favor, asigna un producto y haz clic en "Guardar" para completar.'
                  });
                  
                  if (onOAuthSuccess) {
                    setTimeout(() => {
                      onOAuthSuccess();
                    }, 500);
                  }
                }
              };
              
              // Intentar obtener el estado de verificación actual
              let currentVerificationStatus = null;
              try {
                const { getPhoneNumberDetails } = await import('../../services/whatsapp/meta-graph-api');
                const phoneDetails = await getPhoneNumberDetails(accountData.phone_number_id, accessToken);
                currentVerificationStatus = phoneDetails.data?.code_verification_status || null;
              } catch (e) {
                console.warn('[AccountForm] No se pudo obtener estado de verificación:', e);
              }
              
              setVerificationCodeModalData({
                phoneNumberId: accountData.phone_number_id,
                accessToken: accessToken,
                phoneNumber: accountData.phone_number || accountFromDB.data.phone_number || '',
                verificationStatus: currentVerificationStatus,
                businessAccountId: accountData.business_account_id || accountFromDB.data.business_account_id || null
              });
              verificationCodeSuccessRef.current = handleVerificationCodeSuccess;
              setShowVerificationCodeModal(true);
            } else {
              toast.push({
                type: 'error',
                title: 'Error',
                message: 'No se pudo obtener los datos necesarios para verificar el código. Por favor, intenta cerrar y reabrir el formulario.'
              });
            }
          } else {
            toast.push({
              type: 'error',
              title: 'Error',
              message: 'No se encontraron los datos de la cuenta. Por favor, intenta cerrar y reabrir el formulario.'
            });
          }
        }}
      />

      {/* Modal de Verificación de Código de 6 Dígitos */}
      <VerificationCodeModal
        isOpen={showVerificationCodeModal}
        onClose={() => {
          setShowVerificationCodeModal(false);
          verificationCodeSuccessRef.current = null;
        }}
        phoneNumberId={verificationCodeModalData.phoneNumberId}
        accessToken={verificationCodeModalData.accessToken}
        phoneNumber={verificationCodeModalData.phoneNumber}
        verificationStatus={verificationCodeModalData.verificationStatus}
        metaAppId={import.meta.env.VITE_META_APP_ID || null}
        businessAccountId={verificationCodeModalData.businessAccountId}
        onSuccess={() => {
          // Llamar función de éxito si existe
          if (verificationCodeSuccessRef.current) {
            verificationCodeSuccessRef.current();
            verificationCodeSuccessRef.current = null;
          }
          setShowVerificationCodeModal(false);
        }}
      />
    </div>
  );
}

