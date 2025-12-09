/**
 * Lista de cuentas WhatsApp con acciones
 * SUBFASE 1.4: Lista con editar, activar/desactivar, eliminar
 */

import React from 'react';
import { Edit2, Trash2, Power, PowerOff, CheckCircle2, XCircle } from 'lucide-react';
import { AsyncButton } from '../AsyncButton';

export default function AccountList({ 
  accounts = [], 
  onEdit, 
  onDelete, 
  onToggleActive,
  isLoading = false 
}) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400 text-sm">
        <p>No hay cuentas WhatsApp configuradas</p>
        <p className="text-xs mt-1 text-neutral-500">Crea tu primera cuenta para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className={`p-4 rounded-lg border transition ${
            account.active
              ? 'bg-neutral-800/50 border-neutral-700'
              : 'bg-neutral-900/50 border-neutral-800 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Información principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-neutral-200 truncate">
                  {account.display_name || account.phone_number || 'Sin nombre'}
                </h3>
                {account.active ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="space-y-1 text-xs text-neutral-400">
                <p className="truncate">
                  <span className="text-neutral-500">Teléfono:</span> {account.phone_number}
                </p>
                <p className="truncate">
                  <span className="text-neutral-500">Phone Number ID:</span>{' '}
                  <span className="font-mono text-neutral-300">{account.phone_number_id}</span>
                </p>
                {account.product_id ? (
                  <p className="truncate">
                    <span className="text-neutral-500">Producto:</span>{' '}
                    <span className="text-neutral-300">
                      {account.product_name || account.product_sku || account.product_id.substring(0, 8) + '...'}
                    </span>
                  </p>
                ) : (
                  <p className="truncate text-neutral-500">
                    <span className="text-neutral-500">Producto:</span> Sin producto asociado
                  </p>
                )}
                <p className="text-neutral-500 text-[10px]">
                  Creado: {new Date(account.created_at).toLocaleDateString('es-BO')}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Toggle Active */}
              <AsyncButton
                onClick={() => onToggleActive(account.id, !account.active)}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-neutral-700 transition"
                title={account.active ? 'Desactivar cuenta' : 'Activar cuenta'}
              >
                {account.active ? (
                  <PowerOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Power className="w-4 h-4 text-neutral-400" />
                )}
              </AsyncButton>

              {/* Editar */}
              <button
                onClick={() => onEdit(account)}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-40"
                title="Editar cuenta"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
              </button>

              {/* Eliminar */}
              <button
                onClick={() => onDelete(account)}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-40"
                title="Eliminar cuenta"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

