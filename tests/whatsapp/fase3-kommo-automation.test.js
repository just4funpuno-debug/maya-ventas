/**
 * Tests para FASE 3: Automatización Estilo Kommo
 * SUBFASE 3.2 - Auto-asignación de secuencias en moveLeadToStage()
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase3-kommo-automation.test.js
 * O con Vitest: npx vitest tests/whatsapp/fase3-kommo-automation.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de pipelines module
const mockGetPipelineByProduct = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock('../../src/services/whatsapp/pipelines', () => ({
  getPipelineByProduct: (...args) => mockGetPipelineByProduct(...args)
}));

// Variables para capturar llamadas a funciones mockeadas
let assignSequenceCalled = false;
let stopSequenceCalled = false;
let assignSequenceParams = null;
let stopSequenceParams = null;

// Mock de las funciones de leads que se llaman desde moveLeadToStage
vi.mock('../../src/services/whatsapp/leads', async (importOriginal) => {
  const actual = await importOriginal();
  
  return {
    ...actual,
    assignSequenceToLead: vi.fn((leadId, sequenceId, userId) => {
      assignSequenceCalled = true;
      assignSequenceParams = { leadId, sequenceId, userId };
      return Promise.resolve({ success: true, error: null });
    }),
    stopLeadSequence: vi.fn((leadId, userId) => {
      stopSequenceCalled = true;
      stopSequenceParams = { leadId, userId };
      return Promise.resolve({ success: true, error: null });
    })
  };
});

describe('FASE 3: Automatización Estilo Kommo - SUBFASE 3.2', () => {
  let moveLeadToStage;

  beforeEach(async () => {
    vi.clearAllMocks();
    assignSequenceCalled = false;
    stopSequenceCalled = false;
    assignSequenceParams = null;
    stopSequenceParams = null;
    
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    
    // Importar moveLeadToStage después de configurar mocks
    const leadsModule = await import('../../src/services/whatsapp/leads');
    moveLeadToStage = leadsModule.moveLeadToStage;
  });

  describe('moveLeadToStage() - Auto-asignación de secuencias', () => {
    it('TEST 1: debe auto-asignar secuencia cuando etapa tiene sequence_id', async () => {
      const leadId = 'lead-123';
      const newStage = 'Seguimiento';
      const userId = 'user-456';
      const productId = 'product-789';
      const sequenceId = 'sequence-abc';

      const currentLead = {
        pipeline_stage: 'Leads Entrantes',
        product_id: productId
      };

      const pipeline = {
        id: 'pipeline-1',
        product_id: productId,
        stages: [
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
          { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: sequenceId },
          { name: 'Venta', order: 3, color: '#10b981', sequence_id: null }
        ]
      };

      const updatedLead = {
        id: leadId,
        pipeline_stage: newStage,
        product_id: productId
      };

      // Mock: Obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: Obtener pipeline
      mockGetPipelineByProduct.mockResolvedValueOnce({
        data: pipeline,
        error: null
      });

      // Mock: Actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: updatedLead,
        error: null
      });

      // Mock: addLeadActivity (insert)
      supabase.insert.mockResolvedValueOnce({
        data: { id: 'activity-1' },
        error: null
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(leadId, newStage, userId, productId);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.pipeline_stage).toBe(newStage);

      // Verificar que se llamó a assignSequenceToLead
      expect(assignSequenceCalled).toBe(true);
      expect(assignSequenceParams).toEqual({
        leadId,
        sequenceId,
        userId
      });
    });

    it('TEST 2: debe detener secuencia cuando etapa no tiene sequence_id', async () => {
      const leadId = 'lead-123';
      const newStage = 'Cliente';
      const userId = 'user-456';
      const productId = 'product-789';

      const currentLead = {
        pipeline_stage: 'Venta',
        product_id: productId
      };

      const pipeline = {
        id: 'pipeline-1',
        product_id: productId,
        stages: [
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
          { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: 'seq-1' },
          { name: 'Venta', order: 3, color: '#10b981', sequence_id: 'seq-2' },
          { name: 'Cliente', order: 4, color: '#8b5cf6', sequence_id: null }
        ]
      };

      const updatedLead = {
        id: leadId,
        pipeline_stage: newStage,
        product_id: productId
      };

      // Mock: Obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: Obtener pipeline
      mockGetPipelineByProduct.mockResolvedValueOnce({
        data: pipeline,
        error: null
      });

      // Mock: Actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: updatedLead,
        error: null
      });

      // Mock: addLeadActivity
      supabase.insert.mockResolvedValueOnce({
        data: { id: 'activity-1' },
        error: null
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(leadId, newStage, userId, productId);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.pipeline_stage).toBe(newStage);

      // Verificar que se llamó a stopLeadSequence
      expect(stopSequenceCalled).toBe(true);
      expect(stopSequenceParams).toEqual({
        leadId,
        userId
      });
    });

    it('TEST 3: debe continuar aunque falle la obtención del pipeline', async () => {
      const leadId = 'lead-123';
      const newStage = 'Seguimiento';
      const userId = 'user-456';
      const productId = 'product-789';

      const currentLead = {
        pipeline_stage: 'Leads Entrantes',
        product_id: productId
      };

      const updatedLead = {
        id: leadId,
        pipeline_stage: newStage,
        product_id: productId
      };

      // Mock: Obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: Error al obtener pipeline
      mockGetPipelineByProduct.mockResolvedValueOnce({
        data: null,
        error: { message: 'Pipeline no encontrado' }
      });

      // Mock: Actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: updatedLead,
        error: null
      });

      // Mock: addLeadActivity
      supabase.insert.mockResolvedValueOnce({
        data: { id: 'activity-1' },
        error: null
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(leadId, newStage, userId, productId);

      // Debe continuar aunque no haya pipeline
      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.pipeline_stage).toBe(newStage);
    });

    it('TEST 4: debe buscar correctamente la etapa por nombre', async () => {
      const leadId = 'lead-123';
      const newStage = 'Venta';
      const userId = 'user-456';
      const productId = 'product-789';
      const sequenceId = 'sequence-xyz';

      const currentLead = {
        pipeline_stage: 'Seguimiento',
        product_id: productId
      };

      const pipeline = {
        id: 'pipeline-1',
        product_id: productId,
        stages: [
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
          { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: 'seq-1' },
          { name: 'Venta', order: 3, color: '#10b981', sequence_id: sequenceId },
          { name: 'Cliente', order: 4, color: '#8b5cf6', sequence_id: null }
        ]
      };

      const updatedLead = {
        id: leadId,
        pipeline_stage: newStage,
        product_id: productId
      };

      // Mock: Obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: Obtener pipeline
      mockGetPipelineByProduct.mockResolvedValueOnce({
        data: pipeline,
        error: null
      });

      // Mock: Actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: updatedLead,
        error: null
      });

      // Mock: addLeadActivity
      supabase.insert.mockResolvedValueOnce({
        data: { id: 'activity-1' },
        error: null
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(leadId, newStage, userId, productId);

      expect(result.error).toBeNull();
      expect(result.data.pipeline_stage).toBe(newStage);

      // Verificar que se llamó con la secuencia correcta de la etapa "Venta"
      expect(assignSequenceCalled).toBe(true);
      expect(assignSequenceParams).toEqual({
        leadId,
        sequenceId, // sequenceId de la etapa "Venta"
        userId
      });
    });
  });

  describe('Tests de Integración - Flujo Completo', () => {
    it('TEST 5: flujo completo - mover lead y auto-asignar secuencia', async () => {
      const leadId = 'lead-123';
      const oldStage = 'Leads Entrantes';
      const newStage = 'Seguimiento';
      const userId = 'user-456';
      const productId = 'product-789';
      const sequenceId = 'sequence-abc';

      const currentLead = {
        pipeline_stage: oldStage,
        product_id: productId
      };

      const pipeline = {
        id: 'pipeline-1',
        product_id: productId,
        stages: [
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
          { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: sequenceId },
          { name: 'Venta', order: 3, color: '#10b981', sequence_id: 'seq-2' }
        ]
      };

      const updatedLead = {
        id: leadId,
        pipeline_stage: newStage,
        product_id: productId,
        last_activity_at: new Date().toISOString()
      };

      // Mock: Obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: Obtener pipeline
      mockGetPipelineByProduct.mockResolvedValueOnce({
        data: pipeline,
        error: null
      });

      // Mock: Actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: updatedLead,
        error: null
      });

      // Mock: addLeadActivity
      supabase.insert.mockResolvedValueOnce({
        data: { id: 'activity-1' },
        error: null
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(leadId, newStage, userId, productId);

      // Verificaciones
      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.pipeline_stage).toBe(newStage);
      
      // Verificar que se obtuvo el pipeline
      expect(mockGetPipelineByProduct).toHaveBeenCalledWith(productId);
      
      // Verificar que se asignó la secuencia
      expect(assignSequenceCalled).toBe(true);
      expect(assignSequenceParams).toEqual({
        leadId,
        sequenceId,
        userId
      });
    });
  });
});
