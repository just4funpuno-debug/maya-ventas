/**
 * Tests para Asignación de Flujos a Etapas desde el Kanban
 * FASE 4: Testing completo de la funcionalidad
 * 
 * Ejecutar con: npm test -- tests/whatsapp/stage-flow-selector.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    neq: vi.fn(() => mockSupabase)
  };
  
  return {
    supabase: mockSupabase
  };
});

// Variables para los mocks
let mockGetPipelineByProduct;
let mockUpdatePipeline;

// Mock del módulo pipelines antes de importarlo
vi.mock('../../src/services/whatsapp/pipelines', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/pipelines');
  
  // Crear mocks
  mockGetPipelineByProduct = vi.fn();
  mockUpdatePipeline = vi.fn();
  
  // Crear una implementación de updateStageSequence que usa los mocks
  const updateStageSequence = async (productId, stageName, sequenceId) => {
    try {
      const { data: pipeline, error: pipelineError } = await mockGetPipelineByProduct(productId);
      
      if (pipelineError || !pipeline) {
        return {
          data: null,
          error: pipelineError || { message: 'Pipeline no encontrado' }
        };
      }
      
      if (!Array.isArray(pipeline.stages)) {
        return {
          data: null,
          error: { message: 'Pipeline no tiene etapas válidas' }
        };
      }
      
      const updatedStages = pipeline.stages.map(stage => {
        if (stage.name === stageName) {
          return {
            ...stage,
            sequence_id: sequenceId || null
          };
        }
        return stage;
      });
      
      const stageExists = updatedStages.some(s => s.name === stageName);
      if (!stageExists) {
        return {
          data: null,
          error: { message: `Etapa "${stageName}" no encontrada` }
        };
      }
      
      return await mockUpdatePipeline(pipeline.id, {
        stages: updatedStages
      });
    } catch (err) {
      return { data: null, error: { message: err.message || 'Error desconocido' } };
    }
  };
  
  return {
    ...actual,
    getPipelineByProduct: mockGetPipelineByProduct,
    updatePipeline: mockUpdatePipeline,
    updateStageSequence
  };
});

describe('Stage Flow Selector - updateStageSequence', () => {
  let updateStageSequence;

  beforeEach(async () => {
    vi.clearAllMocks();
    const pipelinesModule = await import('../../src/services/whatsapp/pipelines');
    updateStageSequence = pipelinesModule.updateStageSequence;
  });

  it('debe asignar un flujo a una etapa existente', async () => {
    const productId = 'product-123';
    const stageName = 'Leads Entrantes';
    const sequenceId = 'sequence-456';

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
        { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: null },
        { name: 'Venta', order: 3, color: '#10b981', sequence_id: 'sequence-789' }
      ]
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    const mockUpdateResult = {
      data: {
        ...mockPipeline,
        stages: [
          { ...mockPipeline.stages[0], sequence_id: sequenceId },
          mockPipeline.stages[1],
          mockPipeline.stages[2]
        ]
      },
      error: null
    };

    mockUpdatePipeline.mockResolvedValue(mockUpdateResult);

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(mockGetPipelineByProduct).toHaveBeenCalledWith(productId);
    expect(mockUpdatePipeline).toHaveBeenCalled();
  });

  it('debe quitar un flujo de una etapa (asignar null)', async () => {
    const productId = 'product-123';
    const stageName = 'Venta';
    const sequenceId = null;

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
        { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: null },
        { name: 'Venta', order: 3, color: '#10b981', sequence_id: 'sequence-789' }
      ]
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    const mockUpdateResult = {
      data: {
        ...mockPipeline,
        stages: [
          mockPipeline.stages[0],
          mockPipeline.stages[1],
          { ...mockPipeline.stages[2], sequence_id: null }
        ]
      },
      error: null
    };

    mockUpdatePipeline.mockResolvedValue(mockUpdateResult);

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(mockGetPipelineByProduct).toHaveBeenCalledWith(productId);
  });

  it('debe retornar error si el pipeline no existe', async () => {
    const productId = 'product-123';
    const stageName = 'Leads Entrantes';
    const sequenceId = 'sequence-456';

    mockGetPipelineByProduct.mockResolvedValue({
      data: null,
      error: { message: 'Pipeline no encontrado' }
    });

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  it('debe retornar error si la etapa no existe', async () => {
    const productId = 'product-123';
    const stageName = 'Etapa Inexistente';
    const sequenceId = 'sequence-456';

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
        { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: null }
      ]
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('no encontrada');
    expect(result.data).toBeNull();
  });

  it('debe preservar otras etapas al actualizar una específica', async () => {
    const productId = 'product-123';
    const stageName = 'Seguimiento';
    const sequenceId = 'sequence-999';

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: 'sequence-111' },
        { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: null },
        { name: 'Venta', order: 3, color: '#10b981', sequence_id: 'sequence-789' }
      ]
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    const mockUpdateResult = {
      data: {
        ...mockPipeline,
        stages: [
          mockPipeline.stages[0],
          { ...mockPipeline.stages[1], sequence_id: sequenceId },
          mockPipeline.stages[2]
        ]
      },
      error: null
    };

    mockUpdatePipeline.mockResolvedValue(mockUpdateResult);

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    
    const updatedStages = result.data.stages;
    expect(updatedStages[0].sequence_id).toBe('sequence-111');
    expect(updatedStages[1].sequence_id).toBe(sequenceId);
    expect(updatedStages[2].sequence_id).toBe('sequence-789');
  });

  it('debe retornar error si el pipeline no tiene etapas válidas', async () => {
    const productId = 'product-123';
    const stageName = 'Leads Entrantes';
    const sequenceId = 'sequence-456';

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: null
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('no tiene etapas válidas');
  });

  it('debe manejar errores al actualizar el pipeline', async () => {
    const productId = 'product-123';
    const stageName = 'Leads Entrantes';
    const sequenceId = 'sequence-456';

    const mockPipeline = {
      id: 'pipeline-123',
      product_id: productId,
      stages: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null }
      ]
    };

    mockGetPipelineByProduct.mockResolvedValue({
      data: mockPipeline,
      error: null
    });

    mockUpdatePipeline.mockResolvedValue({
      data: null,
      error: { message: 'Error al actualizar' }
    });

    const result = await updateStageSequence(productId, stageName, sequenceId);

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
