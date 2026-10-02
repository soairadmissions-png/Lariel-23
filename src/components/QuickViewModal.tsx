import React, { useState } from 'react';
import { X, ShoppingBag, Heart, MessageCircle, ArrowRight, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductColor } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    formatPrice,
    addToCart,
    toggleWishlist,
    isWishlisted,
    navigateToProduct,
  } = useShop();

  if (!quickViewProduct) return null;

  const defaultColor = quickViewProduct.colors?.[0] || { name: 'Natural', hex: '#FAF5EE' };
  const [selectedColor, setSelectedColor] = useState<ProductColor>(defaultColor);
  const [selectedSize, setSelectedSize] = useState<string>(quickViewProduct.sizes?.[0] || 'Standard');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [personalisation, setPersonalisation] = useState('');

  const wishlisted = isWishlisted(quickViewProduct.id);

  const handleAddToCart = () => {
    addToCart(quickViewProduct, selectedColor || defaultColor, selectedSize || 'Standard', quantity, {
      text: personalisation.trim() || undefined,
      role: 'Bride',
    });
    setQuickViewProduct(null);
  };

  const generateWhatsAppDirectLink = () => {
    const text = `Hello Lariel Essentials! I would like to order:
- Product: ${quickViewProduct.name}
- Color: ${selectedColor.name}
- Size: ${selectedSize}
- Quantity: ${quantity}
${personalisation ? `- Personalisation: "${personalisation}"` : ''}
- Price: ${formatPrice(quickViewProduct.priceUSD * quantity)}

Please let me know how soon this can be delivered!`;
    return `https://wa.me/2348180306073?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      <div className="relative min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative bg-[#FAF8F5] w-full max-w-4xl shadow-2xl p-6 sm:p-8 border border-[#E5DFD7] my-8 text-left">
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-neutral-900 transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="aspect-[3/4] bg-[#F2ECE4] overflow-hidden border border-[#E8E1D7] relative">
                <img
                  src={quickViewProduct.images?.[selectedImageIndex] || quickViewProduct.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                  alt={quickViewProduct.name}
                  onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                  className="w-full h-full object-cover object-top"
                />
                {quickViewProduct.badge && (
                  <span className="absolute top-3 left-3 bg-[#111111] text-[#FAF8F5] text-[9px] tracking-[0.2em] uppercase font-semibold px-2.5 py-1">
                    {quickViewProduct.badge}
                  </span>
                )}
              </div>

              {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {quickViewProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-20 shrink-0 overflow-hidden border transition-all ${
                        selectedImageIndex === idx ? 'border-[#111111] ring-1 ring-[#111111]' : 'border-neutral-300 opacity-70'
                      }`}
                    >
                      <img
                        src={img || CANONICAL_DEFAULTS.PRODUCT}
                        alt="thumbnail"
                        onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                        className="w-full h-full object-cover object-top"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details & Purchase Form */}
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#A68962] font-semibold block mb-1">
                  {quickViewProduct.collectionName} COLLECTION
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-medium leading-tight">
                  {quickViewProduct.name}
                </h2>
                <p className="text-xs text-neutral-600 mt-1 font-sans">
                  {quickViewProduct.subtitle}
                </p>

                <div className="flex items-center justify-between mt-3 pb-3 border-b border-[#E8E1D7]">
                  <span className="font-serif text-xl font-semibold text-neutral-900">
                    {formatPrice(quickViewProduct.priceUSD)}
                  </span>
                  <div className="flex items-center text-xs text-neutral-600">
                    <span className="text-[#C5A880] mr-1">★★★★★</span>
                    <span>5.0 ({quickViewProduct.reviewsCount} reviews)</span>
                  </div>
                </div>

                {/* Colour selection */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-medium tracking-wider uppercase text-neutral-700">
                      Colour: <span className="font-semibold text-neutral-900">{selectedColor.name}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickViewProduct.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all relative ${
                          selectedColor.name === c.name
                            ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                            : 'border-neutral-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Size selection */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-medium tracking-wider uppercase text-neutral-700">
                      Select Size:
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {quickViewProduct.sizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`py-2 px-2 text-center text-xs tracking-wider transition-all border ${
                          selectedSize === sz
                            ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                            : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Personalisation */}
                <div className="mt-4">
                  <label className="block text-xs font-medium tracking-wider uppercase text-neutral-700 mb-1">
                    Complimentary Monogram / Embroidery (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Bride, Mrs. Okafor, 24.10.25"
                    value={personalisation}
                    onChange={(e) => setPersonalisation(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-2">
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#111111] text-[#FAF8F5] py-3.5 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-[#C5A880] transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>ADD TO BAG</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(quickViewProduct)}
                    className={`p-3.5 border border-neutral-300 transition-colors ${
                      wishlisted ? 'bg-neutral-900 text-[#C5A880]' : 'bg-white text-neutral-800 hover:bg-neutral-100'
                    }`}
                    aria-label="Save to Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#C5A880]' : ''}`} />
                  </button>
                </div>

                <a
                  href={generateWhatsAppDirectLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border border-neutral-800 bg-white text-neutral-900 py-3 text-xs tracking-[0.18em] uppercase font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>ORDER VIA WHATSAPP CONCIERGE</span>
                </a>

                <button
                  onClick={() => {
                    const id = quickViewProduct.id;
                    setQuickViewProduct(null);
                    navigateToProduct(id);
                  }}
                  className="w-full text-center text-xs tracking-[0.2em] uppercase text-[#A68962] font-semibold py-2 hover:underline flex items-center justify-center space-x-1"
                >
                  <span>VIEW FULL COUTURE DETAILS & FABRIC SPECS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
