/**
 * Componente selector de grupos con opción de añadir nuevos grupos
 * Fase 2: Selector de grupos para formularios de usuarios
 */

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { subscribeCollection } from '../supabaseUsers';

export default function GrupoSelector({ value, onChange, disabled = false, session }) {
  const [grupos, setGrupos] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGrupoNombre, setNewGrupoNombre] = useState('');
  const [newGrupoDescripcion, setNewGrupoDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Suscripción en tiempo real a grupos
  useEffect(() => {
    const unsub = subscribeCollection('grupos', (list) => {
      // Ordenar por nombre
      const sorted = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
      setGrupos(sorted);
    });
    return () => unsub();
  }, []);

  // Función para agregar nuevo grupo
  async function handleAddGrupo(e) {
    e.preventDefault();
    setError('');
    
    if (!newGrupoNombre.trim()) {
      setError('El nombre del grupo es requerido');
      return;
    }

    // Verificar que el usuario sea admin
    if (session?.rol !== 'admin') {
      setError('Solo administradores pueden agregar grupos');
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from('grupos')
        .insert({
          nombre: newGrupoNombre.trim(),
          descripcion: newGrupoDescripcion.trim() || null,
          activo: true
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          setError('Ya existe un grupo con ese nombre');
        } else {
          setError(`Error al crear grupo: ${insertError.message}`);
        }
        setSaving(false);
        return;
      }

      // Limpiar formulario y cerrar modal
      setNewGrupoNombre('');
      setNewGrupoDescripcion('');
      setShowAddModal(false);
      setError('');

      // Seleccionar el nuevo grupo automáticamente
      if (onChange) {
        onChange(data.nombre);
      }
    } catch (err) {
      setError(`Error inesperado: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2 items-start">
      {/* Selector de grupos */}
      <div className="flex-1">
        <select
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ea9216] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">-- Sin grupo --</option>
          {grupos.map(g => (
            <option key={g.id} value={g.nombre}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Botón añadir grupo (solo para admins) */}
      {session?.rol === 'admin' && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={disabled}
          className="px-3 py-2 bg-[#ea9216] hover:bg-[#d8820f] text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="Añadir nuevo grupo"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Modal para añadir grupo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f171e] border border-neutral-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e7922b] flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Añadir Nuevo Grupo
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewGrupoNombre('');
                  setNewGrupoDescripcion('');
                  setError('');
                }}
                className="p-1 rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleAddGrupo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={newGrupoNombre}
                  onChange={(e) => setNewGrupoNombre(e.target.value)}
                  placeholder="Ej: Grupo D"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ea9216]"
                  autoFocus
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={newGrupoDescripcion}
                  onChange={(e) => setNewGrupoDescripcion(e.target.value)}
                  placeholder="Descripción del grupo"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ea9216]"
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-2">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewGrupoNombre('');
                    setNewGrupoDescripcion('');
                    setError('');
                  }}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-sm font-medium transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !newGrupoNombre.trim()}
                  className="px-4 py-2 rounded-xl bg-[#ea9216] hover:bg-[#d8820f] text-[#1a2430] text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Añadir Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


