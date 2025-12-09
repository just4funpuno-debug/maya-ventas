/**
 * Componente para mostrar badge de notificaciones no leídas
 * FASE 7.2: SUBFASE 7.2.3 - Notificaciones en Tiempo Real
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';

export default function NotificationBadge({ count, onClick }) {
  if (!count || count === 0) {
    return null;
  }

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
      aria-label={`${count} notificaciones no leídas`}
    >
      <Bell className="w-5 h-5 text-neutral-400" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}


