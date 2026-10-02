import React, { useState, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, navigateToProduct, formatPrice, products } = useShop();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'draft' || p.status === 'archived') return false;
      const matchesCategory =
        activeFilter === 'all' ||
        (activeFilter === 'bridal' && p.category === 'bridal') ||
        (activeFilter === 'bridesmaids' && p.category === 'bridesmaids') ||
        (activeFilter === 'sets' && p.category === 'sets') ||
        (activeFilter === 'adire' && p.category === 'adire') ||
        (activeFilter === 'pyjamas' && p.category === 'pyjamas') ||
        (activeFilter === 'accessories' && p.category === 'accessories');

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.collectionName.toLowerCase().includes(q) ||
        p.style.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.colors.some((c) => c.name.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, activeFilter, products]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="relative min-h-screen px-4 pt-16 pb-20 flex justify-center">
        <div className="relative bg-[#FAF8F5] w-full max-w-3xl shadow-2xl p-6 sm:p-8 border border-[#E5DFD7] h-fit">
          {/* Header & Input */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E1D7]">
            <div className="flex items-center flex-1 mr-4">
              <Search className="w-5 h-5 text-[#C5A880] mr-3 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search robes, styles, colours, Adire, sets, or fabrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-base sm:text-lg bg-transparent border-none focus:outline-none placeholder:text-neutral-400 font-serif"
              />
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1.5 text-neutral-500 hover:text-neutral-900"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-2 py-4 border-b border-[#E8E1D7]/60 text-xs">
            {[
              { label: 'All Collections', value: 'all' },
              { label: 'Bridal Robes', value: 'bridal' },
              { label: 'For Your Girls', value: 'bridesmaids' },
              { label: 'Bridal Sets', value: 'sets' },
              { label: 'Adire Heritage', value: 'adire' },
              { label: 'Pyjamas', value: 'pyjamas' },
              { label: 'Accessories', value: 'accessories' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-3 py-1 text-[11px] tracking-wider uppercase transition-all ${
                  activeFilter === f.value
                    ? 'bg-[#111111] text-[#FAF8F5] font-semibold'
                    : 'bg-[#F2ECE4] text-neutral-700 hover:bg-[#E8E0D5]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Popular searches when empty */}
          {!searchTerm && (
            <div className="py-4 text-left">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#A68962] font-semibold block mb-2">
                POPULAR SEARCHES
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {['Amanda 3D Petals', 'Mercy Tulle Robe', 'Complete Robe Set', 'Adire Eleko', 'Silk Hair Bonnet', 'Feather Pyjamas', 'Ivory Robes'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchTerm(term)}
                    className="px-2.5 py-1 bg-[#F5EFE6] text-neutral-800 text-[11px] hover:text-[#C5A880] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="text-[11px] text-neutral-500 tracking-widest uppercase mb-3 text-left">
              {filteredProducts.length} PIECES FOUND
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {filteredProducts.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigateToProduct(product.id);
                  }}
                  className="flex items-center space-x-3 p-2.5 bg-[#FAF8F5] hover:bg-[#F2ECE4] transition-colors cursor-pointer border border-[#EDE6DD]"
                >
                  <div className="w-14 h-18 bg-[#EBE3D8] shrink-0 overflow-hidden">
                    <img
                      src={product.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                      alt={product.name}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-[14px] font-medium text-neutral-900 truncate">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 truncate">{product.subtitle}</p>
                    <p className="text-xs font-semibold text-neutral-900 mt-1">
                      {formatPrice(product.priceUSD)}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
