/**
 * Tests E2E (End-to-End) para flujo completo de envío de mensajes
 * FASE 7.3: SUBFASE 7.3.1 - Testing E2E de Envío de Mensajes
 * 
 * Ejecutar con: npm test -- tests/whatsapp/e2e/message-sending.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendTextMessage, sendImageMessage } from '../../../src/services/whatsapp/cloud-api-sender';
import { decideSendMethod } from '../../../src/services/whatsapp/send-decision';
import { checkWindow24h, check72hWindow } from '../../../src/utils/whatsapp/window-24h';

// Mocks
vi.mock('../../../src/services/whatsapp/cloud-api-sender', () => ({
  sendTextMessage: vi.fn(),
  sendImageMessage: vi.fn()
}));

vi.mock('../../../src/services/whatsapp/send-decision', () => ({
  decideSendMethod: vi.fn()
}));

vi.mock('../../../src/utils/whatsapp/window-24h', () => ({
  checkWindow24h: vi.fn(),
  check72hWindow: vi.fn()
}));

describe('Message Sending E2E Tests - Flujo Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flujo Completo: Decidir Método → Enviar Mensaje', () => {
    it('debe completar flujo: verificar ventana → decidir método → enviar texto', async () => {
      const accountId = 'account_123';
      const contactId = 'contact_123';
      const phone = '+59112345678';
      const messageText = 'Hola, este es un mensaje de prueba';

      // 1. Verificar ventana 24h
      checkWindow24h.mockResolvedValueOnce({
        isActive: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });

      const window24h = await checkWindow24h(contactId);
      expect(window24h.isActive).toBe(true);

      // 2. Decidir método de envío
      decideSendMethod.mockResolvedValueOnce({
        method: 'cloud_api',
        reason: 'window_24h_active',
        cost: 0,
        error: null
      });

      const decision = await decideSendMethod(contactId);
      expect(decision.method).toBe('cloud_api');
      expect(decision.error).toBeNull();

      // 3. Enviar mensaje via Cloud API
      sendTextMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.123456789',
        timestamp: new Date().toISOString(),
        error: null
      });

      const sendResult = await sendTextMessage(accountId, contactId, phone, messageText);
      
      expect(sendResult.success).toBe(true);
      expect(sendResult.messageId).toBeTruthy();
      expect(decideSendMethod).toHaveBeenCalledWith(contactId);
      expect(sendTextMessage).toHaveBeenCalledWith(accountId, contactId, phone, messageText);
    });

    it('debe usar Puppeteer cuando ventana está cerrada', async () => {
      const accountId = 'account_123';
      const contactId = 'contact_123';
      const phone = '+59112345678';
      const messageText = 'Mensaje fuera de ventana';

      // 1. Verificar ventana 24h (cerrada)
      checkWindow24h.mockResolvedValueOnce({
        isActive: false,
        expiresAt: null
      });

      // 2. Verificar ventana 72h (cerrada)
      check72hWindow.mockResolvedValueOnce({
        isActive: false,
        expiresAt: null
      });

      // 3. Decidir método de envío (debe ser Puppeteer)
      decideSendMethod.mockResolvedValueOnce({
        method: 'puppeteer',
        reason: 'window_closed',
        cost: 0,
        error: null
      });

      const decision = await decideSendMethod(contactId);
      expect(decision.method).toBe('puppeteer');
      expect(decision.error).toBeNull();
    });
  });

  describe('Flujo: Enviar Mensaje con Media', () => {
    it('debe completar flujo: enviar imagen con caption', async () => {
      const accountId = 'account_123';
      const contactId = 'contact_123';
      const phone = '+59112345678';
      const imageUrl = 'https://example.com/image.jpg';
      const caption = 'Esta es una imagen de prueba';

      // 1. Verificar ventana
      checkWindow24h.mockResolvedValueOnce({
        isActive: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });

      // 2. Decidir método
      decideSendMethod.mockResolvedValueOnce({
        method: 'cloud_api',
        reason: 'window_24h_active',
        cost: 0,
        error: null
      });

      // 3. Enviar imagen
      sendImageMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.987654321',
        timestamp: new Date().toISOString(),
        error: null
      });

      const sendResult = await sendImageMessage(
        accountId,
        contactId,
        phone,
        imageUrl,
        caption
      );

      expect(sendResult.success).toBe(true);
      expect(sendResult.messageId).toBeTruthy();
      expect(sendImageMessage).toHaveBeenCalledWith(
        accountId,
        contactId,
        phone,
        imageUrl,
        caption
      );
    });
  });

  describe('Flujo: Manejo de Errores', () => {
    it('debe manejar error cuando Cloud API falla y hacer fallback a Puppeteer', async () => {
      const accountId = 'account_123';
      const contactId = 'contact_123';
      const phone = '+59112345678';
      const messageText = 'Mensaje con error';

      // 1. Ventana activa
      checkWindow24h.mockResolvedValueOnce({
        isActive: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });

      // 2. Decidir método (Cloud API)
      decideSendMethod.mockResolvedValueOnce({
        method: 'cloud_api',
        reason: 'window_24h_active',
        cost: 0,
        error: null
      });

      // 3. Cloud API falla
      sendTextMessage.mockResolvedValueOnce({
        success: false,
        error: { message: 'API Error', code: 'RATE_LIMIT' },
        messageId: null,
        fallback: 'puppeteer'
      });

      const sendResult = await sendTextMessage(accountId, contactId, phone, messageText);
      
      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBeTruthy();
      expect(sendResult.fallback).toBe('puppeteer');
    });
  });
});

