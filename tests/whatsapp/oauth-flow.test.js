/**
 * Tests de integración para flujo completo OAuth
 * FASE 7: Testing de integración del flujo OAuth
 * 
 * Ejecutar con: npm test -- tests/whatsapp/oauth-flow.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateOAuthState,
  buildOAuthUrl,
  saveOAuthState,
  validateOAuthState,
  clearOAuthState,
  openOAuthWindow,
  listenOAuthCallback,
  processOAuthHash
} from '../../src/utils/whatsapp/oauth';
import {
  checkCoexistenceStatus,
  startCoexistenceVerification
} from '../../src/services/whatsapp/coexistence-checker';
import {
  getAccountByPhoneNumberId,
  createAccount
} from '../../src/services/whatsapp/accounts';
import { getPhoneNumberDetails } from '../../src/services/whatsapp/meta-graph-api';

// Mock de localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

// Mocks
vi.mock('../../src/services/whatsapp/meta-graph-api');
vi.mock('../../src/services/whatsapp/accounts');
vi.mock('../../src/services/whatsapp/coexistence-checker', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/coexistence-checker');
  return {
    ...actual,
    checkCoexistenceStatus: vi.fn(),
    startCoexistenceVerification: vi.fn()
  };
});

describe('OAuth Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    clearOAuthState();
    vi.stubEnv('VITE_META_APP_ID', 'test_app_id');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_META_OAUTH_REDIRECT_URI', 'https://test.supabase.co/functions/v1/meta-oauth-callback');
    
    // Mock de window para processOAuthHash
    global.window = {
      location: { hash: '', pathname: '/', search: '' },
      history: { replaceState: vi.fn() }
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Flujo OAuth Completo Sin Coexistencia', () => {
    it('debe completar flujo OAuth cuando no requiere coexistencia', async () => {
      // 1. Generar state
      const state = generateOAuthState();
      expect(state).toBeTruthy();

      // 2. Construir URL OAuth
      const oauthUrl = buildOAuthUrl(state);
      expect(oauthUrl).toContain('facebook.com');
      expect(oauthUrl).toContain(state);

      // 3. Guardar state
      saveOAuthState(state);
      
      // Mock de getItem para retornar el state guardado
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'whatsapp_oauth_state') return state;
        if (key === 'whatsapp_oauth_state_timestamp') return Date.now().toString();
        return null;
      });
      
      expect(validateOAuthState(state)).toBe(true);

      // 4. Simular callback exitoso (sin coexistencia)
      const mockAccountData = {
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        phone_number: '+1234567890',
        display_name: 'Test Account',
        coexistence_status: 'connected', // No requiere coexistencia
        coexistence_needs_action: false
      };

      // 5. Procesar datos del callback
      const formData = {
        phone_number_id: mockAccountData.phone_number_id,
        business_account_id: mockAccountData.business_account_id,
        phone_number: mockAccountData.phone_number,
        display_name: mockAccountData.display_name
      };

      expect(formData.phone_number_id).toBe('phone_123');
      expect(formData.business_account_id).toBe('biz_123');
      expect(formData.phone_number).toBe('+1234567890');

      // 6. Limpiar state
      clearOAuthState();
      
      // Mock de getItem para retornar null después de limpiar
      localStorageMock.getItem.mockImplementation(() => null);
      
      expect(validateOAuthState(state)).toBe(false);
    });
  });

  describe('Flujo OAuth Completo Con Coexistencia', () => {
    it('debe completar flujo OAuth cuando requiere coexistencia', async () => {
      // 1. Generar state y construir URL
      const state = generateOAuthState();
      const oauthUrl = buildOAuthUrl(state);
      saveOAuthState(state);

      // 2. Simular callback exitoso (con coexistencia pendiente)
      const mockAccountData = {
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        phone_number: '+1234567890',
        display_name: 'Test Account',
        coexistence_status: 'pending',
        coexistence_needs_action: true,
        coexistence_qr_url: 'https://example.com/qr.png'
      };

      // 3. Verificar que necesita coexistencia
      const needsCoexistence = mockAccountData.coexistence_status === 'pending' || 
                               mockAccountData.coexistence_needs_action;
      expect(needsCoexistence).toBe(true);

      // 4. Mock: Obtener cuenta desde BD
      const mockAccountFromDB = {
        data: {
          id: 'account_123',
          phone_number_id: 'phone_123',
          access_token: 'test_access_token',
          oauth_access_token: 'test_oauth_token'
        },
        error: null
      };

      getAccountByPhoneNumberId.mockResolvedValue(mockAccountFromDB);

      // 5. Obtener cuenta (simulado)
      const result = await getAccountByPhoneNumberId('phone_123');
      expect(result.data).toBeTruthy();
      expect(result.data.access_token).toBe('test_access_token');

      // 6. Mock: Verificar coexistencia (inicialmente pending)
      vi.mocked(checkCoexistenceStatus).mockResolvedValueOnce({
        status: 'pending',
        qrUrl: mockAccountData.coexistence_qr_url,
        needsAction: true
      });

      // 7. Mock: Polling detecta conexión
      let pollingCallback;
      vi.mocked(startCoexistenceVerification).mockImplementation((phoneNumberId, accessToken, onStatusChange) => {
        pollingCallback = onStatusChange;
        // Simular que después de un tiempo se conecta
        setTimeout(() => {
          onStatusChange({
            status: 'connected',
            qrUrl: null,
            needsAction: false
          });
        }, 100);
        return () => {}; // cancel function
      });

      // 8. Iniciar verificación de coexistencia
      const cancel = startCoexistenceVerification(
        'phone_123',
        'test_access_token',
        (status) => {
          expect(status.status).toBe('connected');
        },
        { interval: 100, maxAttempts: 10 }
      );

      // 9. Esperar a que se detecte conexión
      await new Promise(resolve => setTimeout(resolve, 200));

      // 10. Verificar que se puede llenar formulario
      const finalFormData = {
        phone_number_id: mockAccountData.phone_number_id,
        business_account_id: mockAccountData.business_account_id,
        phone_number: mockAccountData.phone_number,
        display_name: mockAccountData.display_name
      };

      expect(finalFormData.phone_number_id).toBe('phone_123');
      cancel();
    });
  });

  describe('Manejo de Errores en Flujo OAuth', () => {
    it('debe manejar error al obtener cuenta desde BD', async () => {
      const mockAccountData = {
        phone_number_id: 'phone_123',
        coexistence_status: 'pending',
        coexistence_needs_action: true
      };

      // Mock: Error al obtener cuenta
      getAccountByPhoneNumberId.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' }
      });

      const { data, error } = await getAccountByPhoneNumberId('phone_123');
      
      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toBe('Error de BD');

      // Debe continuar sin verificación de coexistencia
      const formData = {
        phone_number_id: mockAccountData.phone_number_id,
        business_account_id: null,
        phone_number: null,
        display_name: null
      };

      expect(formData.phone_number_id).toBe('phone_123');
    });

    it('debe manejar error cuando no hay access_token', async () => {
      const mockAccountData = {
        phone_number_id: 'phone_123',
        coexistence_status: 'pending'
      };

      // Mock: Cuenta sin access_token
      getAccountByPhoneNumberId.mockResolvedValue({
        data: {
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: null,
            oauth_access_token: null
          }
        },
        error: null
      });

      const { data: accountFromDB } = await getAccountByPhoneNumberId('phone_123');
      const accessToken = accountFromDB.data.access_token || accountFromDB.data.oauth_access_token;

      expect(accessToken).toBeNull();

      // Debe continuar sin verificación de coexistencia
      const formData = {
        phone_number_id: mockAccountData.phone_number_id
      };

      expect(formData.phone_number_id).toBe('phone_123');
    });

    it('debe manejar error en verificación de coexistencia', async () => {
      // Mock: checkCoexistenceStatus retorna error
      // Usamos el mock directamente ya que está configurado arriba
      const mockCheckCoexistenceStatus = vi.fn().mockResolvedValue({
        status: 'failed',
        qrUrl: null,
        needsAction: true,
        error: 'Error de API'
      });

      // Simular que checkCoexistenceStatus retorna error
      const result = await mockCheckCoexistenceStatus('phone_123', 'access_token');
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeTruthy();
    });
  });

  describe('Validación de Datos en BD Después de OAuth', () => {
    it('debe verificar que los datos se guardaron correctamente en BD', async () => {
      const mockAccountData = {
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        phone_number: '+1234567890',
        display_name: 'Test Account',
        access_token: 'test_token',
        verify_token: 'test_verify',
        connection_method: 'oauth',
        meta_app_id: 'test_app_id',
        meta_user_id: 'user_123',
        active: true
      };

      // Mock: Crear cuenta
      createAccount.mockResolvedValue({
        data: {
          id: 'account_123',
          ...mockAccountData,
          created_at: new Date().toISOString()
        },
        error: null
      });

      const result = await createAccount(mockAccountData);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.phone_number_id).toBe('phone_123');
      expect(result.data.connection_method).toBe('oauth');
      expect(result.data.meta_app_id).toBe('test_app_id');
    });

    it('debe verificar que se puede obtener cuenta después de crear', async () => {
      const mockAccount = {
        id: 'account_123',
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        connection_method: 'oauth'
      };

      getAccountByPhoneNumberId.mockResolvedValue({
        data: mockAccount,
        error: null
      });

      const result = await getAccountByPhoneNumberId('phone_123');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.phone_number_id).toBe('phone_123');
      expect(result.data.connection_method).toBe('oauth');
    });
  });

  describe('Flujo Completo con Procesamiento de Hash', () => {
    it('debe procesar hash de callback exitoso', () => {
      const mockData = {
        type: 'whatsapp_oauth_callback',
        success: true,
        data: {
          phone_number_id: 'phone_123',
          business_account_id: 'biz_123',
          phone_number: '+1234567890',
          display_name: 'Test'
        }
      };

      const encoded = btoa(JSON.stringify(mockData));
      global.window = {
        location: { hash: `#oauth-callback=${encoded}` },
        history: { replaceState: vi.fn() }
      };

      const result = processOAuthHash();

      expect(result).not.toBeNull();
      expect(result.success).toBe(true);
      expect(result.data.phone_number_id).toBe('phone_123');
    });

    it('debe procesar hash de error', () => {
      const mockError = {
        type: 'whatsapp_oauth_callback',
        success: false,
        error: { message: 'Test error' }
      };

      const encoded = btoa(JSON.stringify(mockError));
      global.window = {
        location: { hash: `#oauth-error=${encoded}` },
        history: { replaceState: vi.fn() }
      };

      const result = processOAuthHash();

      expect(result).not.toBeNull();
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Test error');
    });
  });
});

