/**
 * Tests para Servicio de Verificación de Código de 6 Dígitos
 * FASE 1 - SUBFASE 1.5: Testing completo del servicio
 * 
 * Ejecutar con: npm test -- tests/whatsapp/phone-verification.test.js
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock global de fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Importar funciones después de configurar mocks
let phoneVerificationModule;

describe('Phone Verification Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    phoneVerificationModule = await import('../../src/services/whatsapp/phone-verification');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Tests para isValidCodeFormat (función helper)
  // ============================================================================

  describe('isValidCodeFormat', () => {
    it('debe validar código de 6 dígitos como string', () => {
      expect(phoneVerificationModule.isValidCodeFormat('123456')).toBe(true);
    });

    it('debe validar código de 6 dígitos como número', () => {
      expect(phoneVerificationModule.isValidCodeFormat(123456)).toBe(true);
    });

    it('debe rechazar códigos con menos de 6 dígitos', () => {
      expect(phoneVerificationModule.isValidCodeFormat('12345')).toBe(false);
      expect(phoneVerificationModule.isValidCodeFormat('123')).toBe(false);
    });

    it('debe rechazar códigos con más de 6 dígitos', () => {
      expect(phoneVerificationModule.isValidCodeFormat('1234567')).toBe(false);
    });

    it('debe rechazar códigos con letras', () => {
      expect(phoneVerificationModule.isValidCodeFormat('12345a')).toBe(false);
      expect(phoneVerificationModule.isValidCodeFormat('abcdef')).toBe(false);
    });

    it('debe rechazar valores null o undefined', () => {
      expect(phoneVerificationModule.isValidCodeFormat(null)).toBe(false);
      expect(phoneVerificationModule.isValidCodeFormat(undefined)).toBe(false);
    });

    it('debe manejar strings con espacios (trim)', () => {
      expect(phoneVerificationModule.isValidCodeFormat(' 123456 ')).toBe(true);
    });
  });

  // ============================================================================
  // Tests para verifyCode()
  // ============================================================================

  describe('verifyCode', () => {
    const mockPhoneNumberId = '123456789';
    const mockAccessToken = 'EAAR0MG_TEST_TOKEN';
    const mockCode = '123456';

    it('debe verificar código exitosamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/verify_code');
      expect(fetchCall[0]).toContain(mockPhoneNumberId);
      expect(fetchCall[1].headers['Authorization']).toContain(mockAccessToken);
      expect(JSON.parse(fetchCall[1].body)).toEqual({ code: '123456' });
    });

    it('debe retornar error si phoneNumberId está vacío', async () => {
      const result = await phoneVerificationModule.verifyCode('', mockAccessToken, mockCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Phone Number ID es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si accessToken está vacío', async () => {
      const result = await phoneVerificationModule.verifyCode(mockPhoneNumberId, '', mockCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access Token es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si código está vacío', async () => {
      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Código de verificación es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si código no tiene formato válido', async () => {
      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        '12345'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('6 dígitos numéricos');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe manejar error de código inválido (error 190)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid verification code',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Código inválido');
      expect(result.errorCode).toBe(190);
    });

    it('debe manejar error de permisos (error 10)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            message: 'Permission denied',
            type: 'OAuthException',
            code: 10
          }
        })
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permisos');
      expect(result.errorCode).toBe(10);
    });

    it('debe manejar error de código expirado', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Verification code expired',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('expirado');
    });

    it('debe manejar errores de red', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('conexión');
    });

    it('debe manejar respuesta inesperada sin success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Sin campo success
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Respuesta inesperada');
    });

    it('debe normalizar código numérico a string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await phoneVerificationModule.verifyCode(
        mockPhoneNumberId,
        mockAccessToken,
        123456 // Número en vez de string
      );

      expect(result.success).toBe(true);
      const fetchCall = mockFetch.mock.calls[0];
      expect(JSON.parse(fetchCall[1].body)).toEqual({ code: '123456' });
    });
  });

  // ============================================================================
  // Tests para registerPhoneNumber()
  // ============================================================================

  describe('registerPhoneNumber', () => {
    const mockPhoneNumberId = '123456789';
    const mockAccessToken = 'EAAR0MG_TEST_TOKEN';
    const mockPin = '123456';

    it('debe registrar número exitosamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await phoneVerificationModule.registerPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockPin
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/register');
      expect(fetchCall[0]).toContain(mockPhoneNumberId);
      expect(fetchCall[1].headers['Authorization']).toContain(mockAccessToken);
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({
        messaging_product: 'whatsapp',
        pin: '123456'
      });
    });

    it('debe retornar error si phoneNumberId está vacío', async () => {
      const result = await phoneVerificationModule.registerPhoneNumber('', mockAccessToken, mockPin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Phone Number ID es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si accessToken está vacío', async () => {
      const result = await phoneVerificationModule.registerPhoneNumber(mockPhoneNumberId, '', mockPin);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access Token es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si PIN está vacío', async () => {
      const result = await phoneVerificationModule.registerPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('PIN es requerido');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe retornar error si PIN no tiene formato válido', async () => {
      const result = await phoneVerificationModule.registerPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        '12345'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('6 dígitos numéricos');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe manejar errores de API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid PIN',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const result = await phoneVerificationModule.registerPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockPin
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.errorCode).toBe(190);
    });

    it('debe manejar errores de red', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await phoneVerificationModule.registerPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockPin
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('conexión');
    });
  });

  // ============================================================================
  // Tests para verifyAndRegisterPhoneNumber()
  // ============================================================================

  describe('verifyAndRegisterPhoneNumber', () => {
    const mockPhoneNumberId = '123456789';
    const mockAccessToken = 'EAAR0MG_TEST_TOKEN';
    const mockCode = '123456';

    it('debe verificar y registrar exitosamente', async () => {
      // Mock para verifyCode exitoso
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock para registerPhoneNumber exitoso
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await phoneVerificationModule.verifyAndRegisterPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.registered).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('debe retornar error si verificación falla', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid verification code',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const result = await phoneVerificationModule.verifyAndRegisterPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.registered).toBe(false);
      expect(result.error).toContain('Código inválido');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo verifyCode fue llamado
    });

    it('debe retornar error si verificación exitosa pero registro falla', async () => {
      // Mock para verifyCode exitoso
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock para registerPhoneNumber fallido
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Registration failed',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const result = await phoneVerificationModule.verifyAndRegisterPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.verified).toBe(true); // Verificación fue exitosa
      expect(result.registered).toBe(false); // Pero registro falló
      expect(result.error).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('debe manejar errores inesperados', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await phoneVerificationModule.verifyAndRegisterPhoneNumber(
        mockPhoneNumberId,
        mockAccessToken,
        mockCode
      );

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.registered).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});


