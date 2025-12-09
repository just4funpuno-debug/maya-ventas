/**
 * Componente para seleccionar emojis
 * FASE 5: SUBFASE 5.1 - Emoji Picker
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';

// Categorías de emojis comunes
const EMOJI_CATEGORIES = {
  'Frecuentes': ['😀', '😂', '❤️', '👍', '😊', '😍', '🙏', '😎', '🔥', '💯'],
  'Caras': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  'Gestos': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Corazones': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Símbolos': ['✅', '❌', '⭐', '🌟', '💫', '✨', '🔥', '💯', '💪', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎗', '🎫', '🎟', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹'],
  'Comida': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🥞', '🥐', '🥨', '🍞', '🥖', '🥯', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🍘', '🍙'],
  'Bebidas': ['🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🧉', '🧊', '🥤', '🍶', '☕', '🍵', '🧋', '🥛', '🍼', '🫖', '🍾'],
  'Objetos': ['📱', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱'],
  'Números': ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
};

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Frecuentes');

  const handleEmojiClick = (emoji) => {
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 mb-2 w-80 bg-neutral-900 rounded-lg shadow-xl border border-neutral-800 z-50"
      >
        {/* Categorías */}
        <div className="flex items-center gap-1 p-2 border-b border-neutral-800 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                activeCategory === category
                  ? 'bg-[#e7922b] text-white'
                  : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emojis */}
        <div className="p-3 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
              <button
                key={`${activeCategory}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-neutral-800 transition"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Componente de botón para abrir el picker
export function EmojiPickerButton({ onEmojiSelect, isOpen, onToggle }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`p-2 rounded-lg transition ${
          isOpen
            ? 'bg-[#e7922b] text-white'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
        }`}
        title="Emojis"
      >
        <Smile className="w-5 h-5" />
      </button>
      {isOpen && (
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            onEmojiSelect(emoji);
            onToggle(); // Cerrar después de seleccionar
          }}
          isOpen={isOpen}
          onClose={onToggle}
        />
      )}
    </div>
  );
}


