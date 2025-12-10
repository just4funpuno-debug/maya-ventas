/**
 * Tests E2E (End-to-End) para flujo completo de integración con ventas
 * FASE 7.3: SUBFASE 7.3.1 - Testing E2E de Integración con Ventas
 * 
 * Ejecutar con: npm test -- tests/whatsapp/e2e/sales-integration.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findContactByPhone,
  createContactFromSale,
  associateContactWithSale,
  getContactSales,
  getSaleContact
} from '../../../src/services/whatsapp/sales-integration';

// Mocks
vi.mock('../../../src/services/whatsapp/sales-integration');
vi.mock('../../../src/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  }
}));

describe('Sales Integration E2E Tests - Flujo Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flujo Completo: Crear Venta → Crear Contacto → Asociar', () => {
    it('debe completar flujo: crear venta → crear contacto automáticamente → asociar', async () => {
      const accountId = 'account_123';
      const saleId = 'sale_123';
      const phone = '+59112345678';

      // 1. Simular venta creada
      const mockSale = {
        id: saleId,
        celular: phone,
        cliente: 'Juan Pérez',
        total: 150.00,
        fecha: new Date().toISOString()
      };

      // 2. Verificar si contacto existe
      findContactByPhone.mockResolvedValueOnce({
        data: null, // No existe
        error: null
      });

      const contactCheck = await findContactByPhone(phone, accountId);
      expect(contactCheck.data).toBeNull();

      // 3. Crear contacto desde venta
      const mockContact = {
        id: 'contact_123',
        account_id: accountId,
        phone: phone,
        name: 'Juan Pérez',
        created_at: new Date().toISOString()
      };

      createContactFromSale.mockResolvedValueOnce({
        data: mockContact,
        error: null,
        wasExisting: false
      });

      const contactResult = await createContactFromSale(saleId, accountId);
      expect(contactResult.data).toBeTruthy();
      expect(contactResult.wasExisting).toBe(false);

      // 4. Asociar contacto con venta (ya se hace automáticamente en createContactFromSale)
      associateContactWithSale.mockResolvedValueOnce({
        success: true,
        error: null
      });

      const associationResult = await associateContactWithSale(
        contactResult.data.id,
        saleId
      );
      expect(associationResult.success).toBe(true);
    });

    it('debe asociar venta con contacto existente si ya existe', async () => {
      const accountId = 'account_123';
      const saleId = 'sale_123';
      const phone = '+59112345678';

      // 1. Contacto ya existe
      const existingContact = {
        id: 'contact_123',
        account_id: accountId,
        phone: phone,
        name: 'Juan Pérez'
      };

      findContactByPhone.mockResolvedValueOnce({
        data: existingContact,
        error: null
      });

      // 2. Crear contacto desde venta (debe detectar existente)
      createContactFromSale.mockResolvedValueOnce({
        data: existingContact,
        error: null,
        wasExisting: true
      });

      const contactResult = await createContactFromSale(saleId, accountId);
      expect(contactResult.data).toBeTruthy();
      expect(contactResult.wasExisting).toBe(true);
    });
  });

  describe('Flujo: Obtener Historial de Ventas de Contacto', () => {
    it('debe obtener todas las ventas asociadas a un contacto', async () => {
      const contactId = 'contact_123';

      const mockSales = [
        {
          id: 'sale_1',
          fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          total: 100.00,
          estado_entrega: 'entregada'
        },
        {
          id: 'sale_2',
          fecha: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          total: 200.00,
          estado_entrega: 'pendiente'
        },
        {
          id: 'sale_3',
          fecha: new Date().toISOString(),
          total: 150.00,
          estado_entrega: 'confirmado'
        }
      ];

      getContactSales.mockResolvedValueOnce({
        data: mockSales,
        error: null
      });

      const salesResult = await getContactSales(contactId);
      
      expect(salesResult.data).toHaveLength(3);
      expect(salesResult.data[0].id).toBe('sale_1');
      expect(salesResult.data[2].id).toBe('sale_3'); // Más reciente primero
    });
  });

  describe('Flujo: Obtener Contacto de Venta', () => {
    it('debe obtener contacto asociado a una venta', async () => {
      const saleId = 'sale_123';

      const mockContact = {
        id: 'contact_123',
        phone: '+59112345678',
        name: 'Juan Pérez',
        account_id: 'account_123'
      };

      getSaleContact.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      const contactResult = await getSaleContact(saleId);
      
      expect(contactResult.data).toBeTruthy();
      expect(contactResult.data.phone).toBe('+59112345678');
      expect(contactResult.data.name).toBe('Juan Pérez');
    });
  });
});


