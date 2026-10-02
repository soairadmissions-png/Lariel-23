import React from 'react';
import { X, Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const WishlistDrawer: React.FC = () => {
  const {
    wishlist,
    isWishlistOpen,
    setIsWishlistOpen,
    toggleWishlist,
    formatPrice,
    addToCart,
    navigateToProduct,
  } = useShop();

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col justify-between border-l border-[#E5DFD7]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E1D7] flex items-center justify-between bg-[#F5EFE6]/50">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-[#C5A880] fill-[#C5A880]" />
              <h2 className="font-serif text-lg font-normal text-[#111111]">
                Saved Pieces ({wishlist.length})
              </h2>
            </div>
            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-1.5 text-neutral-600 hover:text-neutral-950 transition-colors"
              aria-label="Close Wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#EBE3D8]">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#F2ECE4] flex items-center justify-center mb-4">
                  <Heart className="w-7 h-7 text-neutral-400 stroke-[1.2]" />
                </div>
                <h3 className="font-serif text-xl text-neutral-800 font-medium mb-1">
                  Your wishlist is empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6 font-sans">
                  Tap the heart icon on any robe, bridal party set, or accessory to save your favorites for later.
                </p>
              </div>
            ) : (
              wishlist.map((product) => (
                <div key={product.id} className="py-4 flex space-x-4">
                  <div
                    className="w-20 h-24 bg-[#F2ECE4] shrink-0 overflow-hidden cursor-pointer border border-[#E5DDD0]"
                    onClick={() => {
                      setIsWishlistOpen(false);
                      navigateToProduct(product.id);
                    }}
                  >
                    <img
                      src={product.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                      alt={product.name}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4
                          onClick={() => {
                            setIsWishlistOpen(false);
                            navigateToProduct(product.id);
                          }}
                          className="font-serif text-[15px] font-medium text-neutral-900 leading-snug cursor-pointer hover:text-[#C5A880] transition-colors"
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => toggleWishlist(product)}
                          className="text-neutral-400 hover:text-red-700 transition-colors ml-2"
                          title="Remove from wishlist"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{product.subtitle}</p>
                      <p className="text-xs font-semibold text-neutral-900 mt-1">
                        {formatPrice(product.priceUSD)}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          addToCart(product, product.colors[0], product.sizes[0] || 'Standard', 1);
                        }}
                        className="w-full bg-[#111111] text-[#FAF8F5] text-xs tracking-wide py-2 px-3 hover:bg-[#C5A880] transition-colors font-semibold flex items-center justify-center space-x-1.5 font-sans"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Move To Bag</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
