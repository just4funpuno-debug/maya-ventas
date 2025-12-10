/**
 * Tests unitarios para asignación de secuencias a leads
 * FASE 1: SUBFASE 1.1, 1.2, 1.3 y 1.4 - Testing de funciones de secuencias
 * - SUBFASE 1.1: assignSequenceToLead()
 * - SUBFASE 1.2: getLeadSequence()
 * - SUBFASE 1.3: pauseLeadSequence(), resumeLeadSequence(), stopLeadSequence()
 * - SUBFASE 1.4: Tests de integración end-to-end
 * 
 * Ejecutar con: npm test -- tests/whatsapp/lead-sequences.test.js
 * O con Vitest: npx vitest tests/whatsapp/lead-sequences.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  assignSequenceToLead, 
  getLeadSequence,
  pauseLeadSequence,
  resumeLeadSequence,
  stopLeadSequence
} from '../../src/services/whatsapp/leads';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Lead Sequences Service - SUBFASE 1.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
  });

  describe('assignSequenceToLead', () => {
    const mockLead = {
      id: 'lead_123',
      contact_id: 'contact_123',
      account_id: 'account_123'
    };

    const mockSequence = {
      id: 'sequence_123',
      account_id: 'account_123',
      active: true,
      name: 'Secuencia de Bienvenida'
    };

    it('TEST 1: debe asignar secuencia exitosamente', async () => {
      // Mock: obtener lead (primera llamada)
      supabase.single.mockResolvedValueOnce({
        data: mockLead,
        error: null
      });

      // Mock: obtener secuencia (segunda llamada)
      supabase.single.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock: actualizar contacto - update().eq() retorna promesa
      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);

      // Mock: insert para addLeadActivity (crear actividad)
      const insertThenable = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_123' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable);

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { success, error } = await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_leads');
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('TEST 2: debe retornar error si lead no existe', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Lead no encontrado', code: 'PGRST116' }
      });

      const { success, error } = await assignSequenceToLead('lead_invalid', 'sequence_123');

      expect(success).toBe(false);
      expect(error).toBeTruthy();
      expect(error?.message || error?.code).toBeTruthy();
    });

    it('TEST 3: debe retornar error si lead no tiene contacto asociado', async () => {
      const leadWithoutContact = {
        id: 'lead_123',
        contact_id: null,
        account_id: 'account_123'
      };

      supabase.single.mockResolvedValueOnce({
        data: leadWithoutContact,
        error: null
      });

      const { success, error } = await assignSequenceToLead('lead_123', 'sequence_123');

      expect(success).toBe(false);
      expect(error).toBeTruthy();
      expect(error.message).toBe('Lead sin contacto asociado');
    });

    it('TEST 4: debe retornar error si secuencia no existe', async () => {
      supabase.single
        .mockResolvedValueOnce({
          data: mockLead,
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Secuencia no encontrada', code: 'PGRST116' }
        });

      const { success, error } = await assignSequenceToLead('lead_123', 'sequence_invalid');

      expect(success).toBe(false);
      expect(error).toBeTruthy();
    });

    it('TEST 5: debe retornar error si secuencia no pertenece a la misma cuenta', async () => {
      const sequenceDifferentAccount = {
        ...mockSequence,
        account_id: 'account_different'
      };

      supabase.single
        .mockResolvedValueOnce({
          data: mockLead,
          error: null
        })
        .mockResolvedValueOnce({
          data: sequenceDifferentAccount,
          error: null
        });

      const { success, error } = await assignSequenceToLead('lead_123', 'sequence_123');

      expect(success).toBe(false);
      expect(error).toBeTruthy();
      expect(error.message).toBe('La secuencia no pertenece a la misma cuenta del lead');
    });

    it('TEST 6: debe retornar error si secuencia no está activa', async () => {
      const inactiveSequence = {
        ...mockSequence,
        active: false
      };

      supabase.single
        .mockResolvedValueOnce({
          data: mockLead,
          error: null
        })
        .mockResolvedValueOnce({
          data: inactiveSequence,
          error: null
        });

      const { success, error } = await assignSequenceToLead('lead_123', 'sequence_123');

      expect(success).toBe(false);
      expect(error).toBeTruthy();
      expect(error.message).toBe('La secuencia no está activa');
    });
  });

  describe('getLeadSequence - SUBFASE 1.2', () => {
    const mockLead = {
      id: 'lead_123',
      contact_id: 'contact_123'
    };

    const mockContactWithSequence = {
      id: 'contact_123',
      sequence_active: true,
      sequence_id: 'sequence_123',
      sequence_position: 2,
      sequence_started_at: '2025-01-30T10:00:00Z',
      whatsapp_sequences: {
        id: 'sequence_123',
        name: 'Secuencia de Bienvenida',
        active: true,
        total_messages: 5
      }
    };

    const mockContactWithoutSequence = {
      id: 'contact_123',
      sequence_active: false,
      sequence_id: null,
      sequence_position: 0,
      sequence_started_at: null,
      whatsapp_sequences: null
    };

    it('TEST 1: debe obtener secuencia cuando existe', async () => {
      // Mock: obtener lead
      supabase.single.mockResolvedValueOnce({
        data: mockLead,
        error: null
      });

      // Mock: obtener contacto con secuencia
      supabase.single.mockResolvedValueOnce({
        data: mockContactWithSequence,
        error: null
      });

      const { data, error } = await getLeadSequence('lead_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_leads');
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.active).toBe(true);
      expect(data.sequence_id).toBe('sequence_123');
      expect(data.position).toBe(2);
      expect(data.sequence).toBeTruthy();
      expect(data.sequence.name).toBe('Secuencia de Bienvenida');
    });

    it('TEST 2: debe retornar null cuando no hay secuencia', async () => {
      // Mock: obtener lead
      supabase.single.mockResolvedValueOnce({
        data: mockLead,
        error: null
      });

      // Mock: obtener contacto sin secuencia
      supabase.single.mockResolvedValueOnce({
        data: mockContactWithoutSequence,
        error: null
      });

      const { data, error } = await getLeadSequence('lead_123');

      expect(error).toBeNull();
      expect(data).toBeNull(); // No hay secuencia asignada
    });

    it('TEST 3: debe retornar error si lead no existe', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Lead no encontrado', code: 'PGRST116' }
      });

      const { data, error } = await getLeadSequence('lead_invalid');

      expect(data).toBeNull();
      expect(error).toBeTruthy();
    });

    it('TEST 4: debe incluir información completa de secuencia', async () => {
      // Mock: obtener lead
      supabase.single.mockResolvedValueOnce({
        data: mockLead,
        error: null
      });

      // Mock: obtener contacto con secuencia
      supabase.single.mockResolvedValueOnce({
        data: mockContactWithSequence,
        error: null
      });

      const { data, error } = await getLeadSequence('lead_123');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('sequence_id');
      expect(data).toHaveProperty('position');
      expect(data).toHaveProperty('started_at');
      expect(data).toHaveProperty('sequence');
      expect(data.sequence).toHaveProperty('id');
      expect(data.sequence).toHaveProperty('name');
      expect(data.sequence).toHaveProperty('active');
      expect(data.sequence).toHaveProperty('total_messages');
    });

    it('TEST 5: debe incluir posición y progreso', async () => {
      // Mock: obtener lead
      supabase.single.mockResolvedValueOnce({
        data: mockLead,
        error: null
      });

      // Mock: obtener contacto con secuencia
      supabase.single.mockResolvedValueOnce({
        data: mockContactWithSequence,
        error: null
      });

      const { data } = await getLeadSequence('lead_123');

      expect(data.position).toBe(2);
      expect(data.sequence.total_messages).toBe(5);
      // Posición 2 significa que va en el mensaje 3 (position + 1)
    });
  });

  describe('Control de Secuencias - SUBFASE 1.3', () => {
    const mockLead = {
      id: 'lead_123',
      contact_id: 'contact_123'
    };

    const mockContactWithSequence = {
      id: 'contact_123',
      sequence_id: 'sequence_123'
    };

    describe('pauseLeadSequence', () => {
      it('TEST 1: debe pausar secuencia exitosamente', async () => {
        // Mock: obtener lead
        supabase.single.mockResolvedValueOnce({
          data: mockLead,
          error: null
        });

        // Mock: actualizar contacto (pausar)
        const updateThenable = {
          eq: vi.fn(() => Promise.resolve({ error: null }))
        };
        supabase.update.mockReturnValueOnce(updateThenable);

        // Mock: insert para addLeadActivity
        const insertThenable = {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'activity_123' }, error: null }))
          }))
        };
        supabase.insert.mockReturnValueOnce(insertThenable);

        // Mock: rpc para update_lead_activity
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const { success, error } = await pauseLeadSequence('lead_123', 'user_123');

        expect(supabase.from).toHaveBeenCalledWith('whatsapp_leads');
        expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
        expect(success).toBe(true);
        expect(error).toBeNull();
      });

      it('TEST 2: debe retornar error si lead no existe', async () => {
        supabase.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Lead no encontrado', code: 'PGRST116' }
        });

        const { success, error } = await pauseLeadSequence('lead_invalid', 'user_123');

        expect(success).toBe(false);
        expect(error).toBeTruthy();
      });
    });

    describe('resumeLeadSequence', () => {
      it('TEST 3: debe retomar secuencia exitosamente', async () => {
        // Mock: obtener lead
        supabase.single.mockResolvedValueOnce({
          data: mockLead,
          error: null
        });

        // Mock: obtener contacto para verificar sequence_id
        supabase.single.mockResolvedValueOnce({
          data: mockContactWithSequence,
          error: null
        });

        // Mock: actualizar contacto (retomar)
        const updateThenable = {
          eq: vi.fn(() => Promise.resolve({ error: null }))
        };
        supabase.update.mockReturnValueOnce(updateThenable);

        // Mock: insert para addLeadActivity
        const insertThenable = {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'activity_123' }, error: null }))
          }))
        };
        supabase.insert.mockReturnValueOnce(insertThenable);

        // Mock: rpc para update_lead_activity
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const { success, error } = await resumeLeadSequence('lead_123', 'user_123');

        expect(success).toBe(true);
        expect(error).toBeNull();
      });

      it('TEST 4: debe retornar error si no hay secuencia asignada', async () => {
        // Mock: obtener lead
        supabase.single.mockResolvedValueOnce({
          data: mockLead,
          error: null
        });

        // Mock: obtener contacto sin secuencia
        supabase.single.mockResolvedValueOnce({
          data: { id: 'contact_123', sequence_id: null },
          error: null
        });

        const { success, error } = await resumeLeadSequence('lead_123', 'user_123');

        expect(success).toBe(false);
        expect(error).toBeTruthy();
        expect(error.message).toBe('El contacto no tiene secuencia asignada');
      });
    });

    describe('stopLeadSequence', () => {
      it('TEST 5: debe detener secuencia exitosamente', async () => {
        // Mock: obtener lead
        supabase.single.mockResolvedValueOnce({
          data: mockLead,
          error: null
        });

        // Mock: obtener contacto para obtener sequence_id
        supabase.single.mockResolvedValueOnce({
          data: mockContactWithSequence,
          error: null
        });

        // Mock: actualizar contacto (detener y limpiar)
        const updateThenable = {
          eq: vi.fn(() => Promise.resolve({ error: null }))
        };
        supabase.update.mockReturnValueOnce(updateThenable);

        // Mock: insert para addLeadActivity
        const insertThenable = {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'activity_123' }, error: null }))
          }))
        };
        supabase.insert.mockReturnValueOnce(insertThenable);

        // Mock: rpc para update_lead_activity
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const { success, error } = await stopLeadSequence('lead_123', 'user_123');

        expect(success).toBe(true);
        expect(error).toBeNull();
        // Verificar que se actualizó con los campos correctos (sequence_id: null, etc.)
      });

      it('TEST 6: debe retornar error si lead no existe', async () => {
        supabase.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Lead no encontrado', code: 'PGRST116' }
        });

        const { success, error } = await stopLeadSequence('lead_invalid', 'user_123');

        expect(success).toBe(false);
        expect(error).toBeTruthy();
      });
    });
  });

  describe('Tests de Integración - SUBFASE 1.4', () => {
    const mockLead = {
      id: 'lead_123',
      contact_id: 'contact_123',
      account_id: 'account_123'
    };

    const mockSequence = {
      id: 'sequence_123',
      account_id: 'account_123',
      active: true,
      name: 'Secuencia de Bienvenida',
      total_messages: 5
    };

    const mockContactWithSequence = {
      id: 'contact_123',
      sequence_active: true,
      sequence_id: 'sequence_123',
      sequence_position: 2,
      sequence_started_at: '2025-01-30T10:00:00Z',
      whatsapp_sequences: mockSequence
    };

    it('TEST INTEGRACIÓN 1: Flujo completo - Asignar → Pausar → Retomar → Detener', async () => {
      // PASO 1: Asignar secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null }) // obtener lead
        .mockResolvedValueOnce({ data: mockSequence, error: null }); // obtener secuencia

      const updateThenable1 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable1);

      const insertThenable1 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_1' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable1);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const assignResult = await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');
      expect(assignResult.success).toBe(true);

      // PASO 2: Pausar secuencia
      supabase.single.mockResolvedValueOnce({ data: mockLead, error: null });
      const updateThenable2 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable2);
      const insertThenable2 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_2' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable2);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const pauseResult = await pauseLeadSequence('lead_123', 'user_123');
      expect(pauseResult.success).toBe(true);

      // PASO 3: Retomar secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: { id: 'contact_123', sequence_id: 'sequence_123' }, error: null });

      const updateThenable3 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable3);
      const insertThenable3 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_3' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable3);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const resumeResult = await resumeLeadSequence('lead_123', 'user_123');
      expect(resumeResult.success).toBe(true);

      // PASO 4: Detener secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: { id: 'contact_123', sequence_id: 'sequence_123' }, error: null });

      const updateThenable4 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable4);
      const insertThenable4 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_4' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable4);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const stopResult = await stopLeadSequence('lead_123', 'user_123');
      expect(stopResult.success).toBe(true);
    });

    it('TEST INTEGRACIÓN 2: Flujo completo - Asignar → Obtener → Detener', async () => {
      // PASO 1: Asignar secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: mockSequence, error: null });

      const updateThenable1 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable1);
      const insertThenable1 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_1' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable1);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const assignResult = await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');
      expect(assignResult.success).toBe(true);

      // PASO 2: Obtener información de secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: mockContactWithSequence, error: null });

      const { data: sequenceData, error: sequenceError } = await getLeadSequence('lead_123');
      expect(sequenceError).toBeNull();
      expect(sequenceData).toBeTruthy();
      expect(sequenceData.active).toBe(true);
      expect(sequenceData.sequence_id).toBe('sequence_123');

      // PASO 3: Detener secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: { id: 'contact_123', sequence_id: 'sequence_123' }, error: null });

      const updateThenable2 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable2);
      const insertThenable2 = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_2' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable2);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const stopResult = await stopLeadSequence('lead_123', 'user_123');
      expect(stopResult.success).toBe(true);
    });

    it('TEST INTEGRACIÓN 3: Validar que la secuencia se asigna correctamente al contacto', async () => {
      // Asignar secuencia
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: mockSequence, error: null });

      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);
      const insertThenable = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_1' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');

      // Verificar que se actualizó el contacto con los campos correctos
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.update).toHaveBeenCalled();
      const updateCall = supabase.update.mock.calls.find(call => 
        call[0] && call[0].sequence_id === 'sequence_123'
      );
      expect(updateCall).toBeTruthy();
      expect(updateCall[0].sequence_active).toBe(true);
      expect(updateCall[0].sequence_position).toBe(0);
    });

    it('TEST INTEGRACIÓN 4: Obtener secuencia después de asignar', async () => {
      // PASO 1: Asignar
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: mockSequence, error: null });

      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);
      const insertThenable = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_1' }, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable);
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');

      // PASO 2: Obtener inmediatamente después
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ 
          data: {
            ...mockContactWithSequence,
            sequence_position: 0 // Acaba de empezar
          },
          error: null
        });

      const { data, error } = await getLeadSequence('lead_123');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.sequence_id).toBe('sequence_123');
      expect(data.active).toBe(true);
      expect(data.position).toBe(0); // Recién asignada, posición inicial
    });

    it('TEST INTEGRACIÓN 5: Verificar que se registran todas las actividades', async () => {
      // Asignar → Pausar → Retomar
      
      // Asignar
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: mockSequence, error: null });

      const updateThenable1 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable1);
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_1' }, error: null }))
        }))
      });
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await assignSequenceToLead('lead_123', 'sequence_123', 'user_123');

      // Pausar
      supabase.single.mockResolvedValueOnce({ data: mockLead, error: null });
      const updateThenable2 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable2);
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_2' }, error: null }))
        }))
      });
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await pauseLeadSequence('lead_123', 'user_123');

      // Retomar
      supabase.single
        .mockResolvedValueOnce({ data: mockLead, error: null })
        .mockResolvedValueOnce({ data: { id: 'contact_123', sequence_id: 'sequence_123' }, error: null });
      const updateThenable3 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable3);
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity_3' }, error: null }))
        }))
      });
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await resumeLeadSequence('lead_123', 'user_123');

      // Verificar que se llamó insert 3 veces (una por cada acción)
      const insertCalls = supabase.insert.mock.calls.filter(call => 
        call[0] && call[0].lead_id === 'lead_123'
      );
      expect(supabase.insert).toHaveBeenCalledTimes(3);
    });
  });
});
