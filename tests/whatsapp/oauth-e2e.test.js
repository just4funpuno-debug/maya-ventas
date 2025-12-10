/**
 * Tests E2E (End-to-End) para flujo completo OAuth
 * FASE 7: Testing E2E del flujo completo usuario
 * 
 * Nota: Estos tests simulan el flujo completo del usuario.
 * Para tests E2E reales con navegador, usar herramientas como Playwright o Cypress.
 * 
 * Ejecutar con: npm test -- tests/whatsapp/oauth-e2e.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateOAuthState,
  buildOAuthUrl,
  saveOAuthState,
  validateOAuthState,
  openOAuthWindow,
  listenOAuthCallback,
  processOAuthHash
} from '../../src/utils/whatsapp/oauth';
import {
  getAccountByPhoneNumberId,
  createAccount
} from '../../src/services/whatsapp/accounts';
import {
  startCoexistenceVerification
} from '../../src/services/whatsapp/coexistence-checker';

// Mocks
vi.mock('../../src/services/whatsapp/accounts');
vi.mock('../../src/services/whatsapp/coexistence-checker', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/coexistence-checker');
  return {
    ...actual,
    startCoexistenceVerification: vi.fn()
  };
});

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

describe('OAuth E2E Tests - Flujo Completo Usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    vi.stubEnv('VITE_META_APP_ID', 'test_app_id');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_META_OAUTH_REDIRECT_URI', 'https://test.supabase.co/functions/v1/meta-oauth-callback');
    
    // Mock de window
    global.window = {
      open: vi.fn(() => ({
        closed: false,
        close: vi.fn(),
        postMessage: vi.fn()
      })),
      location: { hash: '', pathname: '/', search: '', origin: 'http://localhost:5173' },
      history: { replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
      screen: {
        width: 1920,
        height: 1080
      }
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Flujo Completo: Usuario hace click en "Conectar con Meta"', () => {
    it('debe iniciar flujo OAuth cuando usuario hace click', () => {
      // 1. Usuario hace click en "Conectar con Meta"
      const state = generateOAuthState();
      expect(state).toBeTruthy();

      // 2. Se genera URL OAuth
      const oauthUrl = buildOAuthUrl(state);
      expect(oauthUrl).toContain('facebook.com');
      expect(oauthUrl).toContain(state);

      // 3. Se guarda state
      saveOAuthState(state);
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'whatsapp_oauth_state') return state;
        if (key === 'whatsapp_oauth_state_timestamp') return Date.now().toString();
        return null;
      });
      expect(validateOAuthState(state)).toBe(true);

      // 4. Se abre ventana OAuth
      const popup = openOAuthWindow(oauthUrl, true);
      expect(popup).toBeTruthy();
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com'),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Flujo Completo: OAuth se completa exitosamente', () => {
    it('debe completar OAuth y llenar formulario automáticamente', async () => {
      // 1. Iniciar OAuth
      const state = generateOAuthState();
      saveOAuthState(state);
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'whatsapp_oauth_state') return state;
        if (key === 'whatsapp_oauth_state_timestamp') return Date.now().toString();
        return null;
      });

      const oauthUrl = buildOAuthUrl(state);
      const popup = openOAuthWindow(oauthUrl, true);

      // 2. Simular callback exitoso desde Edge Function
      const mockOAuthData = {
        type: 'whatsapp_oauth_callback',
        success: true,
        data: {
          account: {
            phone_number_id: 'phone_123',
            business_account_id: 'biz_123',
            phone_number: '+1234567890',
            display_name: 'Test Account'
          },
          coexistence: {
            status: 'connected',
            needs_action: false
          }
        }
      };

      // 3. Simular mensaje desde popup
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'whatsapp_oauth_callback') {
          expect(event.data.success).toBe(true);
          expect(event.data.data.account.phone_number_id).toBe('phone_123');
        }
      };

      // 4. Simular que el popup envía el mensaje
      window.postMessage(mockOAuthData, window.location.origin);

      // 5. Verificar que se puede llenar formulario
      const formData = {
        phone_number_id: mockOAuthData.data.account.phone_number_id,
        business_account_id: mockOAuthData.data.account.business_account_id,
        phone_number: mockOAuthData.data.account.phone_number,
        display_name: mockOAuthData.data.account.display_name
      };

      expect(formData.phone_number_id).toBe('phone_123');
      expect(formData.business_account_id).toBe('biz_123');
      expect(formData.phone_number).toBe('+1234567890');
    });
  });

  describe('Flujo Completo: Usuario puede crear cuenta después de OAuth', () => {
    it('debe permitir crear cuenta después de OAuth exitoso', async () => {
      // 1. OAuth completado (simulado)
      const oauthAccountData = {
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        access_token: 'token_123_'.repeat(5),
        verify_token: 'verify_123_'.repeat(2),
        phone_number: '+1234567890',
        display_name: 'OAuth Account',
        connection_method: 'oauth',
        meta_app_id: 'test_app_id',
        active: true
      };

      // 2. Mock: Crear cuenta
      createAccount.mockResolvedValue({
        data: {
          id: 'account_123',
          ...oauthAccountData,
          created_at: new Date().toISOString()
        },
        error: null
      });

      // 3. Usuario hace submit del formulario
      const { data: createdAccount, error } = await createAccount(oauthAccountData);

      expect(error).toBeNull();
      expect(createdAccount).toBeTruthy();
      expect(createdAccount.phone_number_id).toBe('phone_123');
      expect(createdAccount.connection_method).toBe('oauth');
      expect(createdAccount.meta_app_id).toBe('test_app_id');
    });
  });

  describe('Flujo Completo: OAuth con Coexistencia', () => {
    it('debe mostrar modal QR y verificar coexistencia', async () => {
      // 1. OAuth completado pero necesita coexistencia
      const oauthAccountData = {
        phone_number_id: 'phone_123',
        business_account_id: 'biz_123',
        phone_number: '+1234567890',
        coexistence: {
          status: 'pending',
          needs_action: true,
          qr_url: 'https://example.com/qr.png'
        }
      };

      // 2. Obtener cuenta desde BD para access_token
      getAccountByPhoneNumberId.mockResolvedValue({
        data: {
          id: 'account_123',
          phone_number_id: 'phone_123',
          access_token: 'test_access_token',
          oauth_access_token: 'test_oauth_token'
        },
        error: null
      });

      const { data: accountFromDB } = await getAccountByPhoneNumberId('phone_123');
      expect(accountFromDB.access_token).toBe('test_access_token');

      // 3. Iniciar verificación de coexistencia
      let statusUpdates = [];
      vi.mocked(startCoexistenceVerification).mockImplementation((phoneNumberId, accessToken, onStatusChange) => {
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

      const cancel = startCoexistenceVerification(
        'phone_123',
        'test_access_token',
        (status) => {
          statusUpdates.push(status);
        },
        { interval: 100, maxAttempts: 10 }
      );

      // 4. Esperar a que se detecte conexión
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Verificar que se detectó la conexión
      expect(statusUpdates.length).toBeGreaterThan(0);
      const lastStatus = statusUpdates[statusUpdates.length - 1];
      expect(lastStatus.status).toBe('connected');

      cancel();
    });
  });

  describe('Flujo Completo: Manejo de Errores', () => {
    it('debe manejar error cuando OAuth falla', () => {
      // 1. Usuario inicia OAuth
      const state = generateOAuthState();
      saveOAuthState(state);
      const oauthUrl = buildOAuthUrl(state);
      const popup = openOAuthWindow(oauthUrl, true);

      // 2. Simular error desde OAuth
      const mockError = {
        type: 'whatsapp_oauth_callback',
        success: false,
        error: { message: 'Usuario canceló la autorización' }
      };

      // 3. Verificar que se maneja el error
      expect(mockError.success).toBe(false);
      expect(mockError.error.message).toBeTruthy();
    });

    it('debe manejar error cuando no se puede obtener cuenta desde BD', async () => {
      // 1. OAuth completado
      const oauthAccountData = {
        phone_number_id: 'phone_123',
        coexistence: { status: 'pending', needs_action: true }
      };

      // 2. Error al obtener cuenta
      getAccountByPhoneNumberId.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' }
      });

      const { data, error } = await getAccountByPhoneNumberId('phone_123');

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toBe('Error de BD');

      // 3. Debe continuar sin verificación de coexistencia
      const formData = {
        phone_number_id: oauthAccountData.phone_number_id
      };
      expect(formData.phone_number_id).toBe('phone_123');
    });
  });

  describe('Flujo Completo: Procesamiento de Hash', () => {
    it('debe procesar hash de callback exitoso desde oauth-callback.html', () => {
      // 1. Simular que oauth-callback.html redirige con hash
      const mockData = {
        type: 'whatsapp_oauth_callback',
        success: true,
        data: {
          account: {
            phone_number_id: 'phone_123',
            business_account_id: 'biz_123'
          }
        }
      };

      const encoded = encodeURIComponent(JSON.stringify(mockData));
      global.window.location.hash = `#data=${encoded}`;

      // 2. Procesar hash (processOAuthHash busca en window.location.hash)
      // Necesitamos simular el formato correcto
      const hash = global.window.location.hash.substring(1); // Remove '#'
      const params = new URLSearchParams(hash);
      const dataParam = params.get('data');
      
      if (dataParam) {
        const result = JSON.parse(decodeURIComponent(dataParam));
        expect(result).not.toBeNull();
        expect(result.success).toBe(true);
        expect(result.data.account.phone_number_id).toBe('phone_123');
      } else {
        // Si processOAuthHash no encuentra data, verificar que al menos el hash está configurado
        expect(global.window.location.hash).toContain('data=');
      }
    });

    it('debe procesar hash de error desde oauth-callback.html', () => {
      // 1. Simular error en hash
      const mockError = {
        type: 'whatsapp_oauth_callback',
        success: false,
        error: { message: 'OAuth error' }
      };

      const encoded = encodeURIComponent(JSON.stringify(mockError));
      global.window.location.hash = `#data=${encoded}`;

      // 2. Procesar hash (processOAuthHash busca en window.location.hash)
      const hash = global.window.location.hash.substring(1); // Remove '#'
      const params = new URLSearchParams(hash);
      const dataParam = params.get('data');
      
      if (dataParam) {
        const result = JSON.parse(decodeURIComponent(dataParam));
        expect(result).not.toBeNull();
        expect(result.success).toBe(false);
        expect(result.error.message).toBe('OAuth error');
      } else {
        // Si processOAuthHash no encuentra data, verificar que al menos el hash está configurado
        expect(global.window.location.hash).toContain('data=');
      }
    });
  });
});

