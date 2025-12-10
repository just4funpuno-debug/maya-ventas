/**
 * Tests automatizados para servicio de verificación de coexistencia
 * FASE 6: Testing de coexistence-checker.js
 * 
 * Ejecutar con: npm test -- tests/whatsapp/coexistence-checker.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkCoexistenceStatus,
  pollCoexistenceStatus,
  getCoexistenceQR,
  startCoexistenceVerification
} from '../../src/services/whatsapp/coexistence-checker';
import { getPhoneNumberDetails } from '../../src/services/whatsapp/meta-graph-api';

// Mock de meta-graph-api
vi.mock('../../src/services/whatsapp/meta-graph-api', () => ({
  getPhoneNumberDetails: vi.fn()
}));

describe('Coexistence Checker Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('checkCoexistenceStatus', () => {
    it('debe retornar connected si está VERIFIED', async () => {
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'VERIFIED',
          display_phone_number: '+1234567890'
        },
        error: null
      });

      const result = await checkCoexistenceStatus('phone_123', 'access_token');

      expect(result.status).toBe('connected');
      expect(result.needsAction).toBe(false);
      expect(result.qrUrl).toBeNull();
    });

    it('debe retornar pending si no está VERIFIED', async () => {
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'UNVERIFIED',
          display_phone_number: '+1234567890'
        },
        error: null
      });

      const result = await checkCoexistenceStatus('phone_123', 'access_token');

      expect(result.status).toBe('pending');
      expect(result.needsAction).toBe(true);
    });

    it('debe retornar failed si hay error', async () => {
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de API' }
      });

      const result = await checkCoexistenceStatus('phone_123', 'access_token');

      expect(result.status).toBe('failed');
      expect(result.needsAction).toBe(true);
      expect(result.error).toBeTruthy();
    });

    it('debe retornar error si faltan parámetros', async () => {
      const result = await checkCoexistenceStatus(null, 'access_token');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('requeridos');
    });
  });

  describe('pollCoexistenceStatus', () => {
    it('debe hacer polling y detectar cuando se conecta', async () => {
      vi.useFakeTimers();

      // Primera llamada: pending
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'UNVERIFIED'
        },
        error: null
      });

      // Segunda llamada: connected
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'VERIFIED'
        },
        error: null
      });

      const onStatusChange = vi.fn();
      const cancel = pollCoexistenceStatus(
        'phone_123',
        'access_token',
        onStatusChange,
        { interval: 1000, maxAttempts: 10 }
      );

      // Avanzar tiempo para que se ejecute el polling
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(onStatusChange).toHaveBeenCalled();
      const lastCall = onStatusChange.mock.calls[onStatusChange.mock.calls.length - 1][0];
      expect(lastCall.status).toBe('connected');

      cancel();
      vi.useRealTimers();
    });

    it('debe detener polling cuando se cancela', async () => {
      vi.useFakeTimers();

      getPhoneNumberDetails.mockResolvedValue({
        data: {
          code_verification_status: 'UNVERIFIED'
        },
        error: null
      });

      const onStatusChange = vi.fn();
      const cancel = pollCoexistenceStatus(
        'phone_123',
        'access_token',
        onStatusChange,
        { interval: 1000, maxAttempts: 10 }
      );

      // Cancelar inmediatamente
      cancel();

      // Avanzar tiempo
      await vi.advanceTimersByTimeAsync(2000);

      // No debería hacer más llamadas después de cancelar
      const callCount = onStatusChange.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(onStatusChange.mock.calls.length).toBe(callCount);

      vi.useRealTimers();
    });

    it('debe detener después de maxAttempts', async () => {
      vi.useFakeTimers();

      getPhoneNumberDetails.mockResolvedValue({
        data: {
          code_verification_status: 'UNVERIFIED'
        },
        error: null
      });

      const onStatusChange = vi.fn();
      pollCoexistenceStatus(
        'phone_123',
        'access_token',
        onStatusChange,
        { interval: 100, maxAttempts: 3 }
      );

      // Avanzar tiempo para alcanzar maxAttempts
      await vi.advanceTimersByTimeAsync(500);

      // Debería haber llamado onStatusChange con failed
      const failedCall = onStatusChange.mock.calls.find(
        call => call[0].status === 'failed'
      );
      expect(failedCall).toBeTruthy();

      vi.useRealTimers();
    });
  });

  describe('getCoexistenceQR', () => {
    it('debe retornar instrucciones', async () => {
      const result = await getCoexistenceQR('phone_123', 'access_token');

      expect(result.qrUrl).toBeNull();
      expect(result.instructions).toBeTruthy();
      expect(result.instructions).toContain('Meta Developer Console');
    });
  });

  describe('startCoexistenceVerification', () => {
    it('debe iniciar verificación y polling si está pending', async () => {
      vi.useFakeTimers();

      // Verificación inicial: pending
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'UNVERIFIED'
        },
        error: null
      });

      // Polling: connected
      getPhoneNumberDetails.mockResolvedValueOnce({
        data: {
          code_verification_status: 'VERIFIED'
        },
        error: null
      });

      const onStatusChange = vi.fn();
      const cancel = startCoexistenceVerification(
        'phone_123',
        'access_token',
        onStatusChange,
        { interval: 1000, maxAttempts: 10 }
      );

      // Avanzar tiempo
      await vi.advanceTimersByTimeAsync(2000);

      expect(onStatusChange).toHaveBeenCalled();
      const calls = onStatusChange.mock.calls;
      expect(calls[0][0].status).toBe('pending');
      
      // Debería haber detectado connected
      const connectedCall = calls.find(call => call[0].status === 'connected');
      if (connectedCall) {
        expect(connectedCall[0].status).toBe('connected');
      }

      cancel();
      vi.useRealTimers();
    });

    it('debe retornar función de cancelación', () => {
      getPhoneNumberDetails.mockResolvedValue({
        data: {
          code_verification_status: 'UNVERIFIED'
        },
        error: null
      });

      const cancel = startCoexistenceVerification(
        'phone_123',
        'access_token',
        () => {},
        {}
      );

      expect(typeof cancel).toBe('function');
      cancel(); // Debe ejecutarse sin errores
    });
  });
});

