/**
 * Dropdown para mostrar respuestas rápidas cuando el usuario escribe "/"
 * FASE 2: SUBFASE 2.4 - UI - Integración con "/" en MessageSender
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Type, FileImage, Music, ChevronRight } from 'lucide-react';

const TYPE_ICONS = {
  text: Type,
  image: FileImage,
  image_text: FileImage,
  audio: Music,
  audio_text: Music
};

const TYPE_LABELS = {
  text: 'Texto',
  image: 'Imagen',
  image_text: 'Imagen + Texto',
  audio: 'Audio',
  audio_text: 'Audio + Texto'
};

export default function QuickReplyDropdown({
  quickReplies,
  searchTerm,
  selectedIndex,
  onSelect,
  position = { top: 0, left: 0 }
}) {
  if (!quickReplies || quickReplies.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto min-w-[280px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateY(-100%)'
        }}
      >
        <div className="p-2">
          {quickReplies.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-400 text-center">
              No se encontraron respuestas rápidas
            </div>
          ) : (
            <div className="space-y-1">
              {quickReplies.map((reply, index) => {
                const Icon = TYPE_ICONS[reply.type] || MessageSquare;
                const isSelected = index === selectedIndex;
                
                return (
                  <motion.button
                    key={reply.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(reply)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                      isSelected
                        ? 'bg-[#e7922b]/20 border border-[#e7922b]/40'
                        : 'hover:bg-neutral-700 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#e7922b]' : 'text-neutral-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#e7922b]' : 'text-neutral-200'}`}>
                          {reply.trigger}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {TYPE_LABELS[reply.type] || reply.type}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {reply.name}
                      </p>
                      {reply.content_text && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {reply.content_text}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 text-[#e7922b] flex-shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

