/**
 * Tests de integración para filtrado de conversaciones por etiquetas
 * FASE 1: SUBFASE 1.5 - Tests de Integración
 * 
 * Nota: Estos tests verifican la lógica de filtrado por etiquetas.
 * Para tests más completos, se recomienda testing manual de la UI.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del módulo supabaseClient (factory function para evitar hoisting issues)
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    or: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => mockSupabase),
    rpc: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

import { getConversations } from '../../src/services/whatsapp/conversations';
import { supabase } from '../../src/supabaseClient';

describe('Filtrado de Conversaciones por Etiquetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
  });

  describe('getConversations con filtro de etiquetas', () => {
    it('debe retornar array vacío si no hay contactos con las etiquetas', async () => {
      const tagIds = ['tag1'];
      
      // Simulamos que no hay contactos con la etiqueta
      supabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_contact_tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        }
        return supabase;
      });

      const result = await getConversations({ tagIds });

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('debe retornar todas las conversaciones si no se proporcionan tagIds', async () => {
      const mockConversations = [
        { id: 'contact1', name: 'Contacto 1', phone: '+1234567890' },
        { id: 'contact2', name: 'Contacto 2', phone: '+0987654321' },
        { id: 'contact3', name: 'Contacto 3', phone: '+1122334455' }
      ];

      supabase.range.mockResolvedValue({ data: mockConversations, error: null });

      const result = await getConversations({});

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.error).toBeNull();
    });

    it('debe aplicar filtro de etiquetas cuando se proporcionan tagIds', async () => {
      const tagIds = ['tag1'];
      const mockContactTags = [
        { contact_id: 'contact1' },
        { contact_id: 'contact2' }
      ];
      
      supabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_contact_tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockContactTags, error: null }))
            }))
          };
        }
        if (table === 'whatsapp_contacts') {
          return supabase;
        }
        return supabase;
      });

      const mockConversations = [
        { id: 'contact1', name: 'Contacto 1', phone: '+1234567890' },
        { id: 'contact2', name: 'Contacto 2', phone: '+0987654321' }
      ];

      supabase.range.mockResolvedValue({ data: mockConversations, error: null });

      const result = await getConversations({ tagIds });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.error).toBeNull();
      // Verificar que se llamó a .in() para filtrar por IDs de contactos
      expect(supabase.in).toHaveBeenCalled();
    });
  });
});
