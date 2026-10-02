import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const ToastNotification: React.FC = () => {
  const { toastMessage, showToast } = useShop();

  if (!toastMessage) return null;

  const isError =
    toastMessage.toLowerCase().includes('fail') ||
    toastMessage.toLowerCase().includes('error') ||
    toastMessage.toLowerCase().includes('must') ||
    toastMessage.toLowerCase().includes('too large');

  const handleDismiss = () => {
    // Setting empty toast clears it
    showToast('');
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md pointer-events-auto transition-all duration-300 ease-out transform translate-y-0"
    >
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#181614] text-[#FAF8F5] border border-[#C5A880]/40 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="shrink-0 mt-0.5">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#C5A880]" />
          )}
        </div>
        <div className="flex-1 text-xs sm:text-sm font-sans leading-relaxed text-[#F5EFE6]">
          {toastMessage}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 -mr-1 text-neutral-400 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
