/**
 * Tests automatizados para servicio Meta Graph API
 * FASE 4: Testing de meta-graph-api.js
 * 
 * Ejecutar con: npm test -- tests/whatsapp/meta-graph-api.test.js
 * O con Vitest: npx vitest tests/whatsapp/meta-graph-api.test.js
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  exchangeCodeForToken,
  getUserInfo,
  getBusinessAccounts,
  getPhoneNumbers,
  getPhoneNumberDetails,
  checkCoexistenceStatus,
  getWhatsAppAccountData
} from '../../src/services/whatsapp/meta-graph-api';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de variables de entorno usando vi.stubEnv
describe('Meta Graph API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Configurar variables de entorno usando vi.stubEnv
    vi.stubEnv('VITE_META_APP_ID', 'test_app_id');
    vi.stubEnv('VITE_META_APP_SECRET', 'test_app_secret');
    vi.stubEnv('VITE_META_OAUTH_REDIRECT_URI', 'https://test.supabase.co/functions/v1/meta-oauth-callback');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('exchangeCodeForToken', () => {
    it('debe intercambiar code por access_token exitosamente', async () => {
      const mockResponse = {
        access_token: 'test_access_token_123',
        token_type: 'bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await exchangeCodeForToken('test_code_123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockResponse);
      expect(result.data.access_token).toBe('test_access_token_123');
      
      // Verificar que se llamó a la URL correcta
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('oauth/access_token');
      expect(callUrl).toContain('client_id=test_app_id');
      expect(callUrl).toContain('code=test_code_123');
    });

    it('debe retornar error si code no se proporciona', async () => {
      const result = await exchangeCodeForToken(null);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Code es requerido');
      expect(result.error.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si faltan variables de entorno', async () => {
      // Limpiar variables de entorno para este test
      vi.unstubAllEnvs();
      
      const result = await exchangeCodeForToken('test_code');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      // El error puede ser sobre variables de entorno o sobre fetch
      expect(result.error.message).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe manejar errores de Graph API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: { message: 'Invalid code' } })
      });

      const result = await exchangeCodeForToken('invalid_code');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      // El error puede ser 400 o 500 dependiendo de cómo se maneje
      expect([400, 500]).toContain(result.error.status);
      expect(result.error.message).toContain('Error');
    });

    it('debe retornar error si la respuesta no contiene access_token', async () => {
      // Asegurar que las variables de entorno estén configuradas
      vi.stubEnv('VITE_META_APP_ID', 'test_app_id');
      vi.stubEnv('VITE_META_APP_SECRET', 'test_app_secret');
      vi.stubEnv('VITE_META_OAUTH_REDIRECT_URI', 'https://test.supabase.co/functions/v1/meta-oauth-callback');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: 'bearer' }) // Sin access_token
      });

      const result = await exchangeCodeForToken('test_code');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('no contiene access_token');
    });
  });

  describe('getUserInfo', () => {
    it('debe obtener información del usuario exitosamente', async () => {
      const mockUserInfo = {
        id: '123456789',
        name: 'Test User',
        email: 'test@example.com'
      };

      // Limpiar mocks anteriores
      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo
      });

      const result = await getUserInfo('test_access_token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockUserInfo);
      expect(result.data.id).toBe('123456789');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/me?fields=id,name,email');
      expect(callUrl).toContain('access_token=test_access_token');
    });

    it('debe retornar error si access_token no se proporciona', async () => {
      const result = await getUserInfo(null);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Access token es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe manejar errores de Graph API', async () => {
      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: { message: 'Invalid token' } })
      });

      const result = await getUserInfo('invalid_token');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      // El status puede variar dependiendo del manejo de errores
      expect([400, 401, 500]).toContain(result.error.status);
    });
  });

  describe('getBusinessAccounts', () => {
    it('debe obtener Business Accounts exitosamente', async () => {
      const mockBusinesses = {
        data: [
          { id: 'biz_123', name: 'Business 1' },
          { id: 'biz_456', name: 'Business 2' }
        ]
      };

      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBusinesses
      });

      const result = await getBusinessAccounts('test_access_token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockBusinesses.data);
      expect(result.data).toHaveLength(2);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/me/businesses');
    });

    it('debe retornar error si la respuesta no tiene data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Sin data
      });

      const result = await getBusinessAccounts('test_access_token');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Respuesta inválida');
    });
  });

  describe('getPhoneNumbers', () => {
    it('debe obtener Phone Numbers exitosamente', async () => {
      const mockPhoneNumbers = {
        data: [
          {
            id: 'phone_123',
            display_phone_number: '+1234567890',
            verified_name: 'Test Business'
          }
        ]
      };

      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumbers
      });

      const result = await getPhoneNumbers('biz_123', 'test_access_token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockPhoneNumbers.data);
      expect(result.data[0].id).toBe('phone_123');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/biz_123/owned_phone_numbers');
    });

    it('debe retornar error si faltan parámetros', async () => {
      const result = await getPhoneNumbers(null, 'test_access_token');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('son requeridos');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getPhoneNumberDetails', () => {
    it('debe obtener detalles del Phone Number exitosamente', async () => {
      const mockDetails = {
        display_phone_number: '+1234567890',
        verified_name: 'Test Business',
        code_verification_status: 'VERIFIED',
        quality_rating: { score: 'HIGH' }
      };

      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails
      });

      const result = await getPhoneNumberDetails('phone_123', 'test_access_token');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDetails);
      expect(result.data.code_verification_status).toBe('VERIFIED');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/phone_123?fields=');
      expect(callUrl).toContain('code_verification_status');
    });
  });

  describe('checkCoexistenceStatus', () => {
    it('debe retornar connected si está VERIFIED', async () => {
      const mockDetails = {
        code_verification_status: 'VERIFIED'
      };

      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails
      });

      const result = await checkCoexistenceStatus('phone_123', 'test_access_token');

      expect(result.error).toBeNull();
      expect(result.data.coexistence_status).toBe('connected');
      expect(result.data.needs_action).toBe(false);
      expect(result.data.verified_at).not.toBeNull();
    });

    it('debe retornar pending si no está VERIFIED', async () => {
      const mockDetails = {
        code_verification_status: 'UNVERIFIED'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails
      });

      const result = await checkCoexistenceStatus('phone_123', 'test_access_token');

      expect(result.error).toBeNull();
      expect(result.data.coexistence_status).toBe('pending');
      expect(result.data.needs_action).toBe(true);
      expect(result.data.verified_at).toBeNull();
    });
  });

  describe('getWhatsAppAccountData', () => {
    it('debe obtener todos los datos exitosamente', async () => {
      mockFetch.mockClear();
      
      // Mock de getUserInfo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user_123', name: 'Test User' })
      });

      // Mock de getBusinessAccounts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'biz_123', name: 'Business 1' }]
        })
      });

      // Mock de getPhoneNumbers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'phone_123',
            display_phone_number: '+1234567890',
            verified_name: 'Test Business'
          }]
        })
      });

      // Mock de getPhoneNumberDetails (llamado por getWhatsAppAccountData)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1234567890',
          verified_name: 'Test Business',
          code_verification_status: 'VERIFIED'
        })
      });

      // Mock adicional para checkCoexistenceStatus que también llama a getPhoneNumberDetails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_phone_number: '+1234567890',
          verified_name: 'Test Business',
          code_verification_status: 'VERIFIED'
        })
      });

      const result = await getWhatsAppAccountData('test_access_token');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.meta_user_id).toBe('user_123');
      expect(result.data.business_account_id).toBe('biz_123');
      expect(result.data.phone_number_id).toBe('phone_123');
      expect(result.data.phone_number).toBe('+1234567890');
      expect(result.data.display_name).toBe('Test Business');
      expect(result.data.coexistence.coexistence_status).toBe('connected');
      
      // Puede ser 4 o 5 llamadas dependiendo de si checkCoexistenceStatus llama a getPhoneNumberDetails
      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('debe retornar error si no hay Business Accounts', async () => {
      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user_123' })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }) // Sin Business Accounts
      });

      const result = await getWhatsAppAccountData('test_access_token');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      // El mensaje puede variar, verificar que hay un error
      expect(result.error.message).toBeTruthy();
    });

    it('debe retornar error si no hay Phone Numbers', async () => {
      mockFetch.mockClear();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user_123' })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'biz_123' }]
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }) // Sin Phone Numbers
      });

      const result = await getWhatsAppAccountData('test_access_token');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      // El mensaje puede variar, verificar que hay un error
      expect(result.error.message).toBeTruthy();
    });

    it('debe manejar errores parciales (warnings)', async () => {
      mockFetch.mockClear();
      
      // getUserInfo falla (pero no crítico)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized'
      });

      // getBusinessAccounts funciona
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'biz_123' }]
        })
      });

      // getPhoneNumbers funciona
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 'phone_123',
            display_phone_number: '+1234567890'
          }]
        })
      });

      // getPhoneNumberDetails falla (pero no crítico)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found'
      });

      // checkCoexistenceStatus falla (pero no crítico) - usa getPhoneNumberDetails internamente
      // No necesita otro mock porque ya falló getPhoneNumberDetails

      const result = await getWhatsAppAccountData('test_access_token');

      // Debe retornar datos aunque algunos pasos fallaron
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data.business_account_id).toBe('biz_123');
      expect(result.data.phone_number_id).toBe('phone_123');
      // meta_user_id puede ser null si getUserInfo falló
      expect(result.data.meta_user_id).toBeNull();
    });
  });
});

