import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Eye,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Heart,
  Search,
} from 'lucide-react';
import { Product } from '../types';
import { ProductDetailView } from '../views/ProductDetailView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface AdminLivePreviewModalProps {
  product: Product;
  onClose: () => void;
  onNavigateToStorefront: (productId: string) => void;
}

export const AdminLivePreviewModal: React.FC<AdminLivePreviewModalProps> = ({
  product,
  onClose,
  onNavigateToStorefront,
}) => {
  const { products, siteSettings, showToast } = useShop();
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const containerWidths = {
    desktop: 'w-full max-w-7xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[414px] max-w-full',
  };

  const handleGoToStorefront = () => {
    const isSavedInCatalog = products.some((p) => p.id === product.id || p.slug === product.slug);
    if (!isSavedInCatalog) {
      showToast('This product is an unsaved draft. Please save it first to view its public storefront URL.');
      return;
    }
    onClose();
    onNavigateToStorefront(product.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col">
      {/* Top Banner Control Bar */}
      <header className="bg-[#181614] text-white px-4 sm:px-8 py-3 flex items-center justify-between border-b border-[#2C2723] shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#C5A880]">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[10px] tracking-widest text-[#C5A880] uppercase font-semibold">
              Live Storefront Preview
            </div>
            <div className="font-serif text-sm truncate text-white">
              {product.name || 'Untitled Bridal Piece'} ({product.category || 'bridal'} · {product.style || 'Silk'})
            </div>
          </div>
          <span
            className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              product.status === 'published'
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-900/60 text-amber-300 border border-amber-500/30'
            }`}
          >
            Status: {product.status || 'draft'}
          </span>
        </div>

        {/* Viewport Width Toggles */}
        <div className="hidden sm:flex items-center space-x-1 bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              deviceMode === 'desktop' ? 'bg-[#C5A880] text-[#181614]' : 'text-neutral-400 hover:text-white'
            }`}
            title="Desktop View (Full Width)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              deviceMode === 'tablet' ? 'bg-[#C5A880] text-[#181614]' : 'text-neutral-400 hover:text-white'
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              deviceMode === 'mobile' ? 'bg-[#C5A880] text-[#181614]' : 'text-neutral-400 hover:text-white'
            }`}
            title="Mobile View (414px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleGoToStorefront}
            className="px-3 py-1.5 bg-white/10 hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs rounded-lg font-medium transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Go to Live Storefront</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Preview Canvas Container */}
      <div className="flex-1 overflow-y-auto bg-[#ECE5DB] p-2 sm:p-6 lg:p-8 flex justify-center items-start">
        <div
          className={`${containerWidths[deviceMode]} bg-[#FAF8F5] shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 min-h-[600px] border border-[#DCD1BF] flex flex-col`}
        >
          {/* Simulated Storefront Header */}
          <div className="bg-[#FAF8F5] border-b border-[#EBE3D8] px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center space-x-2">
              <img
                src={siteSettings?.brandLogoImage || CANONICAL_DEFAULTS.LOGO_WORDMARK}
                alt="Lariel"
                onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.LOGO_WORDMARK)}
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
            <div className="flex items-center space-x-3 text-neutral-600 text-xs">
              <span className="text-[10px] tracking-wider uppercase text-[#A68962] font-semibold hidden sm:inline">
                Bridal Robes & Essentials
              </span>
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <Heart className="w-3.5 h-3.5 text-neutral-400" />
              <ShoppingBag className="w-3.5 h-3.5 text-[#181614]" />
            </div>
          </div>

          {/* Render real ProductDetailView with previewProduct override wrapped in ErrorBoundary */}
          <ErrorBoundary>
            <ProductDetailView previewProduct={product} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
