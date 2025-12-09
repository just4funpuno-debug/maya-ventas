/**
 * Componente Avatar reutilizable para mostrar foto de perfil o iniciales
 * FASE 2: SUBFASE 2.3 - Foto de Perfil
 */

import React, { useState } from 'react';

export default function Avatar({ 
  profilePicUrl, 
  name, 
  phone, 
  size = 'md',
  className = '' 
}) {
  const [imageError, setImageError] = useState(false);
  
  // Tamaños predefinidos
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  // Obtener iniciales
  const getInitials = () => {
    const displayName = name || phone || '?';
    return displayName[0].toUpperCase();
  };

  // Si hay foto y no hay error, mostrar imagen
  if (profilePicUrl && !imageError) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden flex-shrink-0 bg-[#e7922b]/20 flex items-center justify-center`}>
        <img
          src={profilePicUrl}
          alt={name || phone || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback a iniciales
  return (
    <div className={`${sizeClasses[size]} ${className} rounded-full bg-[#e7922b]/20 flex items-center justify-center flex-shrink-0`}>
      <span className={`font-semibold text-[#e7922b] ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
        {getInitials()}
      </span>
    </div>
  );
}


