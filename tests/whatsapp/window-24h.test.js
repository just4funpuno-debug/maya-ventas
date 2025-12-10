/**
 * Tests para utilidades de ventana 24h
 * FASE 2: Testing de SUBFASE 2.3 (utilidades)
 * 
 * Ejecutar con: npm test -- tests/whatsapp/window-24h.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWindow24hActive,
  getHoursRemaining,
  isWithin72hWindow
} from '../../src/utils/whatsapp/window-24h';
import { supabase } from '../../src/supabaseClient';

// Mock de supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => ({ data: null, error: null })),
    rpc: vi.fn(() => ({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Window 24h Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
  });

  describe('isWindow24hActive', () => {
    it('debe retornar true si ventana está activa', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: futureDate },
        error: null
      });

      const result = await isWindow24hActive('contact_123');

      expect(result).toBe(true);
    });

    it('debe retornar false si ventana está cerrada', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: pastDate },
        error: null
      });

      const result = await isWindow24hActive('contact_123');

      expect(result).toBe(false);
    });

    it('debe retornar false si no hay ventana', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: null },
        error: null
      });

      const result = await isWindow24hActive('contact_123');

      expect(result).toBe(false);
    });

    it('debe manejar errores', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Contact not found' }
      });

      const result = await isWindow24hActive('contact_123');

      expect(result).toBe(false);
    });
  });

  describe('getHoursRemaining', () => {
    it('debe calcular horas restantes correctamente', async () => {
      const futureDate = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 horas
      
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: futureDate },
        error: null
      });

      const result = await getHoursRemaining('contact_123');

      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(3);
    });

    it('debe retornar null si ventana está cerrada', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: pastDate },
        error: null
      });

      const result = await getHoursRemaining('contact_123');

      expect(result).toBeNull();
    });

    it('debe retornar null si no hay ventana', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { window_expires_at: null },
        error: null
      });

      const result = await getHoursRemaining('contact_123');

      expect(result).toBeNull();
    });
  });

  describe('isWithin72hWindow', () => {
    it('debe retornar true si contacto tiene menos de 72 horas', async () => {
      const recentDate = new Date(Date.now() - 24 * 3600000).toISOString(); // 24 horas atrás
      
      supabase.single.mockResolvedValueOnce({
        data: { created_at: recentDate },
        error: null
      });

      const result = await isWithin72hWindow('contact_123');

      expect(result.isWithin72h).toBe(true);
      expect(result.hoursSinceCreation).toBeGreaterThan(20);
      expect(result.hoursSinceCreation).toBeLessThan(30);
    });

    it('debe retornar false si contacto tiene más de 72 horas', async () => {
      const oldDate = new Date(Date.now() - 73 * 3600000).toISOString(); // 73 horas atrás
      
      supabase.single.mockResolvedValueOnce({
        data: { created_at: oldDate },
        error: null
      });

      const result = await isWithin72hWindow('contact_123');

      expect(result.isWithin72h).toBe(false);
      expect(result.hoursSinceCreation).toBeGreaterThan(70);
    });

    it('debe manejar errores', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Contact not found' }
      });

      const result = await isWithin72hWindow('contact_123');

      expect(result.isWithin72h).toBe(false);
      expect(result.hoursSinceCreation).toBeNull();
    });
  });
});


