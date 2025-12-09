/**
 * Componente para mostrar historial de ventas de un contacto
 * FASE 7: SUBFASE 7.1.3 - Integración con Sistema de Ventas
 */

import React, { useState, useEffect } from 'react';
import { getContactSales } from '../../services/whatsapp/sales-integration';
import { Calendar, DollarSign, MapPin, Package, CheckCircle, Clock, XCircle } from 'lucide-react';

/**
 * Formatear fecha para mostrar
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formatear monto para mostrar
 */
function formatCurrency(amount) {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB'
  }).format(amount);
}

/**
 * Obtener color según estado de entrega
 */
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'confirmado':
      return 'text-green-400';
    case 'pendiente':
      return 'text-yellow-400';
    case 'cancelado':
      return 'text-red-400';
    default:
      return 'text-neutral-400';
  }
}

/**
 * Obtener icono según estado de entrega
 */
function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'confirmado':
      return <CheckCircle className="w-4 h-4" />;
    case 'pendiente':
      return <Clock className="w-4 h-4" />;
    case 'cancelado':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export default function SalesHistory({ contactId }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    async function fetchSales() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await getContactSales(contactId);

        if (fetchError) {
          console.error('[SalesHistory] Error obteniendo ventas:', fetchError);
          setError(fetchError.message || 'Error al obtener ventas');
          setSales([]);
        } else {
          setSales(data || []);
        }
      } catch (err) {
        console.error('[SalesHistory] Error fatal:', err);
        setError(err.message || 'Error desconocido');
        setSales([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, [contactId]);

  if (!contactId) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
        <div className="flex items-center gap-2 text-neutral-400">
          <div className="w-4 h-4 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin"></div>
          <span className="text-sm">Cargando historial de ventas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-800/50">
        <p className="text-sm text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
        <div className="flex items-center gap-2 text-neutral-500">
          <Package className="w-4 h-4" />
          <span className="text-sm">No hay ventas asociadas a este contacto</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
      <div className="p-3 bg-neutral-800/70 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Historial de Ventas ({sales.length})
          </h3>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {sales.map((sale) => (
          <div
            key={sale.sale_id}
            className="p-3 border-b border-neutral-700/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Fecha y Cliente */}
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span className="text-xs text-neutral-400">
                    {formatDate(sale.fecha)}
                  </span>
                  {sale.cliente && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="text-xs text-neutral-300 truncate">
                        {sale.cliente}
                      </span>
                    </>
                  )}
                </div>

                {/* Ciudad */}
                {sale.ciudad && (
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                    <span className="text-xs text-neutral-400">{sale.ciudad}</span>
                  </div>
                )}

                {/* Estado */}
                {sale.estado_entrega && (
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 ${getStatusColor(sale.estado_entrega)}`}>
                      {getStatusIcon(sale.estado_entrega)}
                      <span className="text-xs font-medium capitalize">
                        {sale.estado_entrega}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              {sale.total && (
                <div className="flex items-center gap-1 text-right flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


