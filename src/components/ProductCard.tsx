import React, { useState } from 'react';
import { Heart, Eye, ShoppingBag, Check } from 'lucide-react';
import { Product, ProductColor } from '../types';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface ProductCardProps {
  product: Product;
  featured?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, featured = false }) => {
  const {
    formatPrice,
    navigateToProduct,
    setQuickViewProduct,
    toggleWishlist,
    isWishlisted,
    addToCart,
    showToast,
  } = useShop();

  const defaultColor = product.colors?.[0] || { name: 'Natural', hex: '#FAF5EE' };
  const [selectedColor, setSelectedColor] = useState<ProductColor>(defaultColor);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const wishlisted = isWishlisted(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.sizes?.[0] || 'Standard';
    addToCart(product, selectedColor || defaultColor, defaultSize, 1);
  };

  return (
    <div
      className="group relative flex flex-col cursor-pointer transition-all duration-300"
      onClick={() => navigateToProduct(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F2ECE4] mb-2 sm:mb-4 border border-[#EBE3D8] rounded-xl sm:rounded-2xl">
        {/* Main image & hover image */}
        <img
          src={isHovered && product.images?.[1] ? product.images[1] : product.images?.[currentImageIndex] || product.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
          alt={product.name}
          onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col space-y-1 sm:space-y-1.5 z-10">
          {(product.stockStatus === 'out_of_stock' || product.stockQuantity === 0) ? (
            <span className="bg-rose-900/90 text-white text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
              SOLD OUT
            </span>
          ) : product.badge ? (
            <span className="bg-[#111111] text-[#FAF8F5] text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
              {product.badge}
            </span>
          ) : product.compareAtPriceUSD && product.compareAtPriceUSD > product.priceUSD ? (
            <span className="bg-amber-800 text-amber-50 text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
              SALE
            </span>
          ) : product.isNew ? (
            <span className="bg-[#A58860] text-white text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
              NEW
            </span>
          ) : null}
          {product.category === 'adire' && (
            <span className="bg-[#C5A880] text-[#111111] text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
              HERITAGE CRAFT
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 rounded-full transition-all duration-200 z-20 shadow-xs ${
            wishlisted
              ? 'bg-[#111111] text-[#C5A880]'
              : 'bg-[#FAF8F5]/85 text-neutral-800 hover:bg-[#FAF8F5] hover:text-[#C5A880]'
          }`}
          aria-label="Save to wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${wishlisted ? 'fill-[#C5A880]' : ''}`} />
        </button>

        {/* Action Overlay buttons */}
        <div className="absolute inset-x-2 sm:inset-x-3 bottom-2 sm:bottom-3 flex items-center space-x-1 sm:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="flex-1 bg-[#FAF8F5]/95 backdrop-blur-xs text-neutral-900 text-[9px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] uppercase py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-full hover:bg-[#111111] hover:text-white transition-colors font-medium text-center flex items-center justify-center space-x-1 sm:space-x-1.5 border border-neutral-300 shadow-sm whitespace-nowrap"
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Quick View</span>
          </button>

          <button
            onClick={(e) => {
              if (product.stockStatus === 'out_of_stock' || product.stockQuantity === 0) {
                e.stopPropagation();
                showToast(`"${product.name}" is currently sold out`);
                return;
              }
              handleQuickAdd(e);
            }}
            disabled={product.stockStatus === 'out_of_stock' || product.stockQuantity === 0}
            className={`p-1.5 sm:p-2.5 rounded-full border shadow-sm shrink-0 transition-colors ${
              product.stockStatus === 'out_of_stock' || product.stockQuantity === 0
                ? 'bg-neutral-300 text-neutral-500 border-neutral-300 cursor-not-allowed'
                : 'bg-[#111111] text-[#FAF8F5] hover:bg-[#C5A880] hover:text-[#111111] border-black'
            }`}
            title={product.stockStatus === 'out_of_stock' || product.stockQuantity === 0 ? 'Sold Out' : 'Quick Add to Bag'}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Information Container */}
      <div className="flex flex-col flex-1 text-left space-y-1 sm:space-y-1.5">
        {/* Color swatches preview */}
        {product.colors && product.colors.length > 1 && (
          <div className="flex items-center space-x-1 sm:space-x-1.5 py-0.5 sm:py-1" onClick={(e) => e.stopPropagation()}>
            {product.colors.slice(0, 6).map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c)}
                className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border transition-all ${
                  selectedColor.name === c.name ? 'ring-1 ring-offset-1 ring-neutral-800 scale-110' : 'border-neutral-300'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
            {product.colors.length > 6 && (
              <span className="text-[9px] sm:text-[10px] text-neutral-500 ml-1">+{product.colors.length - 6}</span>
            )}
          </div>
        )}

        <div className="flex items-baseline justify-between pt-0.5">
          <h3 className="font-serif text-xs xs:text-sm sm:text-[16px] text-[#111111] font-medium tracking-wide group-hover:text-[#C5A880] transition-colors line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-baseline space-x-1.5 ml-1.5 sm:ml-2">
            <span className="text-[11px] sm:text-[13px] tracking-wider text-[#111111] font-semibold whitespace-nowrap">
              {formatPrice(product.priceUSD)}
            </span>
            {product.compareAtPriceUSD && product.compareAtPriceUSD > product.priceUSD && (
              <span className="text-[10px] sm:text-[11px] text-neutral-400 line-through font-serif whitespace-nowrap">
                {formatPrice(product.compareAtPriceUSD)}
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] sm:text-[12px] text-[#78716A] line-clamp-1 font-sans">
          {product.subtitle}
        </p>

        {/* Selected color label & ratings */}
        <div className="flex items-center justify-between text-[9px] sm:text-[11px] text-neutral-500 pt-0.5 sm:pt-1 border-t border-[#EFE8DE]/60">
          <span className="tracking-wider uppercase text-[8px] sm:text-[10px] truncate max-w-[50%]">
            {selectedColor.name}
          </span>
          <span className="text-[8px] sm:text-[10px] tracking-widest text-[#8A7968] whitespace-nowrap">
            ★ {product.rating.toFixed(1)} ({product.reviewsCount})
          </span>
        </div>
      </div>
    </div>
  );
};
