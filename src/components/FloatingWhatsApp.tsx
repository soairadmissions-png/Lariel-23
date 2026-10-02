import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { BRAND_CONTACT } from '../data/faqs';

export const FloatingWhatsApp: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {showTooltip && (
        <div className="relative mb-2.5 bg-[#FAF8F5] text-neutral-900 border border-[#E0D7CC] p-3 shadow-xl max-w-xs text-left animate-fadeIn">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-1.5 right-1.5 text-neutral-400 hover:text-black"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#A68962]">
            LARIEL BRIDAL CONCIERGE
          </p>
          <p className="text-xs text-neutral-700 mt-1 font-sans">
            Need help with party sizes, custom palette dyes, or express delivery dates?
          </p>
        </div>
      )}

      <a
        href={`https://wa.me/${BRAND_CONTACT.whatsappRaw}?text=Hello%20Lariel%20Essentials!%20I%20would%20like%20to%20inquire%20about%20a%20bridal%20order`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-13 h-13 rounded-full bg-[#111111] text-[#FAF8F5] flex items-center justify-center shadow-2xl hover:bg-[#25D366] hover:scale-105 transition-all duration-300 border border-[#C5A880]/50 group"
        aria-label="Chat with Bridal Concierge on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 text-[#C5A880] group-hover:text-white transition-colors" />
      </a>
    </div>
  );
};
