/**
 * Tests automatizados para validaciones de WhatsApp
 * SUBFASE 1.4: Testing de validation.js
 * 
 * Ejecutar con: npm test -- tests/whatsapp/validation.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  validatePhoneNumberId,
  validateBusinessAccountId,
  validateAccessToken,
  validateVerifyToken,
  validatePhoneNumber,
  validateDisplayName,
  validateProductId,
  validateWhatsAppAccount
} from '../../src/utils/whatsapp/validation';

describe('WhatsApp Validation Utils', () => {
  describe('validatePhoneNumberId', () => {
    it('debe validar un Phone Number ID válido', () => {
      const result = validatePhoneNumberId('123456789012345');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('debe rechazar Phone Number ID vacío', () => {
      const result = validatePhoneNumberId('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requerido');
    });

    it('debe rechazar Phone Number ID con caracteres inválidos', () => {
      const result = validatePhoneNumberId('123@456');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('caracteres inválidos');
    });

    it('debe aceptar Phone Number ID con guiones y guiones bajos', () => {
      const result = validatePhoneNumberId('123-456_789');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBusinessAccountId', () => {
    it('debe validar un Business Account ID válido', () => {
      const result = validateBusinessAccountId('987654321');
      expect(result.valid).toBe(true);
    });

    it('debe rechazar Business Account ID vacío', () => {
      const result = validateBusinessAccountId('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requerido');
    });
  });

  describe('validateAccessToken', () => {
    it('debe validar un Access Token válido (>= 50 caracteres)', () => {
      const longToken = 'a'.repeat(50);
      const result = validateAccessToken(longToken);
      expect(result.valid).toBe(true);
    });

    it('debe rechazar Access Token muy corto', () => {
      const shortToken = 'short';
      const result = validateAccessToken(shortToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muy corto');
    });

    it('debe rechazar Access Token vacío', () => {
      const result = validateAccessToken('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requerido');
    });
  });

  describe('validateVerifyToken', () => {
    it('debe validar un Verify Token válido (>= 10 caracteres)', () => {
      const result = validateVerifyToken('verify1234567890');
      expect(result.valid).toBe(true);
    });

    it('debe rechazar Verify Token muy corto', () => {
      const result = validateVerifyToken('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10 caracteres');
    });
  });

  describe('validatePhoneNumber', () => {
    it('debe validar un número de teléfono válido', () => {
      const result = validatePhoneNumber('+591 12345678');
      expect(result.valid).toBe(true);
    });

    it('debe validar número sin código de país', () => {
      const result = validatePhoneNumber('1234567890');
      expect(result.valid).toBe(true);
    });

    it('debe rechazar número con menos de 10 dígitos', () => {
      const result = validatePhoneNumber('123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10 dígitos');
    });

    it('debe aceptar números con espacios y guiones', () => {
      const result = validatePhoneNumber('+591 123-456-78');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDisplayName', () => {
    it('debe aceptar nombre válido', () => {
      const result = validateDisplayName('Maya Life - Producto X');
      expect(result.valid).toBe(true);
    });

    it('debe aceptar nombre vacío (opcional)', () => {
      const result = validateDisplayName('');
      expect(result.valid).toBe(true);
    });

    it('debe rechazar nombre muy largo (> 100 caracteres)', () => {
      const longName = 'a'.repeat(101);
      const result = validateDisplayName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100 caracteres');
    });
  });

  describe('validateProductId', () => {
    it('debe aceptar UUID válido', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'; // UUID v4 válido
      const result = validateProductId(uuid);
      expect(result.valid).toBe(true);
    });

    it('debe aceptar product_id vacío (opcional)', () => {
      const result = validateProductId('');
      expect(result.valid).toBe(true);
    });

    it('debe rechazar UUID inválido', () => {
      const result = validateProductId('not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID válido');
    });
  });

  describe('validateWhatsAppAccount', () => {
    it('debe validar cuenta completa válida', () => {
      const accountData = {
        phone_number_id: '123456789',
        business_account_id: '987654321',
        access_token: 'a'.repeat(50),
        verify_token: 'verify1234567890',
        phone_number: '+591 12345678',
        display_name: 'Test Account',
        product_id: ''
      };

      const result = validateWhatsAppAccount(accountData);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('debe detectar múltiples errores', () => {
      const invalidData = {
        phone_number_id: '',
        business_account_id: '',
        access_token: 'short',
        verify_token: 'short',
        phone_number: '123',
        display_name: 'a'.repeat(101),
        product_id: 'invalid-uuid'
      };

      const result = validateWhatsAppAccount(invalidData);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('debe validar campos opcionales correctamente', () => {
      const accountData = {
        phone_number_id: '123456789',
        business_account_id: '987654321',
        access_token: 'a'.repeat(50),
        verify_token: 'verify1234567890',
        phone_number: '+591 12345678',
        display_name: '', // Opcional
        product_id: '' // Opcional
      };

      const result = validateWhatsAppAccount(accountData);
      expect(result.valid).toBe(true);
    });
  });
});

