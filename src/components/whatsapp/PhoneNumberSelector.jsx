/**
 * Modal para seleccionar número de teléfono cuando hay múltiples disponibles
 * Permite al usuario elegir qué número usar antes de guardar la cuenta
 */

import React from 'react';
import { Phone, Check, X } from 'lucide-react';

export default function PhoneNumberSelector({
  isOpen,
  onClose,
  phoneNumbers = [],
  onSelect,
  isLoading = false
}) {
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = React.useState(null);

  React.useEffect(() => {
    // Si solo hay un número, seleccionarlo automáticamente
    if (phoneNumbers.length === 1) {
      setSelectedPhoneNumberId(phoneNumbers[0].id);
    }
  }, [phoneNumbers]);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedPhoneNumberId) {
      const selected = phoneNumbers.find(pn => pn.id === selectedPhoneNumberId);
      if (selected) {
        onSelect(selected);
      }
    }
  };

  const handleCancel = () => {
    setSelectedPhoneNumberId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={handleCancel}
      />
      <div className="relative z-10 w-full max-w-md bg-[#181f26] rounded-xl p-6 shadow-xl border border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#e7922b] flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Seleccionar Número de WhatsApp
          </h3>
          <button
            onClick={handleCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-400 mb-4">
          Selecciona el número de WhatsApp que deseas usar para esta cuenta. Puedes tener múltiples números configurados en Meta Developer Console.
        </p>

        {/* Lista de números */}
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {phoneNumbers.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No hay números disponibles
            </div>
          ) : (
            phoneNumbers.map((phoneNumber) => {
              const isSelected = selectedPhoneNumberId === phoneNumber.id;
              const isTestNumber = phoneNumber.display_phone_number?.includes('15551520') || 
                                   phoneNumber.phone_number?.includes('15551520');
              
              return (
                <button
                  key={phoneNumber.id}
                  onClick={() => setSelectedPhoneNumberId(phoneNumber.id)}
                  disabled={isLoading}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    isSelected
                      ? 'border-[#e7922b] bg-[#e7922b]/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600 hover:bg-neutral-800'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`text-sm font-medium ${
                          isSelected ? 'text-[#e7922b]' : 'text-neutral-200'
                        }`}>
                          {phoneNumber.display_phone_number || phoneNumber.phone_number || phoneNumber.id}
                        </div>
                        {isTestNumber && (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-900/30 text-blue-300 border border-blue-700/50">
                            Prueba
                          </span>
                        )}
                      </div>
                      {phoneNumber.verified_name && (
                        <div className="text-xs text-neutral-400">
                          {phoneNumber.verified_name}
                        </div>
                      )}
                      {phoneNumber.quality_rating && (
                        <div className="text-xs text-neutral-500 mt-1">
                          Calidad: {phoneNumber.quality_rating}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#e7922b] flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-[#1a2430]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Info adicional */}
        {phoneNumbers.length > 1 && (
          <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> Puedes configurar múltiples números en Meta Developer Console. 
              Cada número puede estar asociado a un producto diferente.
            </p>
          </div>
        )}

        {/* Advertencia si el número deseado no está en la lista */}
        {phoneNumbers.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
            <p className="text-xs text-yellow-300 mb-2">
              ⚠️ El número que especificaste no está en tu lista de números registrados.
            </p>
            <p className="text-xs text-yellow-200/80">
              Puedes elegir uno de los números disponibles arriba, o registrarlo primero en Meta Developer Console.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-neutral-700 text-sm font-medium text-neutral-200 hover:bg-neutral-600 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedPhoneNumberId || isLoading}
            className="px-4 py-2 rounded-lg bg-[#e7922b] text-sm font-medium text-white hover:bg-[#d6821b] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Usar este Número
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

