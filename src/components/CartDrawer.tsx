import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { BRAND_CONTACT } from '../data/faqs';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    cartSubtotalUSD,
    formatPrice,
    setActiveView,
  } = useShop();

  const [orderNote, setOrderNote] = useState('');
  const [weddingDate, setWeddingDate] = useState('');

  if (!isCartOpen) return null;

  // Free shipping threshold at $300 USD
  const freeShippingThresholdUSD = 300;
  const progressPercent = Math.min(100, (cartSubtotalUSD / freeShippingThresholdUSD) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThresholdUSD - cartSubtotalUSD);

  // Generate WhatsApp prefilled message
  const generateWhatsAppMessage = () => {
    let msg = `Hello Lariel Essentials! I would like to order the following bridal items from my bag:\n\n`;
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.product.name}\n   - Color: ${item.selectedColor.name}\n   - Size: ${item.selectedSize}\n   - Qty: ${item.quantity}\n`;
      if (item.personalisationText) {
        msg += `   - Personalisation: "${item.personalisationText}" (${item.personalisationRole || 'Custom'})\n`;
      }
      msg += `   - Price: ${formatPrice(item.product.priceUSD * item.quantity)}\n\n`;
    });
    msg += `Total Subtotal: ${formatPrice(cartSubtotalUSD)}\n`;
    if (weddingDate) msg += `Wedding Date: ${weddingDate}\n`;
    if (orderNote) msg += `Note: ${orderNote}\n`;
    msg += `\nPlease confirm production availability and shipping delivery to my location.`;
    return encodeURIComponent(msg);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setActiveView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col justify-between border-l border-[#E5DFD7]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E1D7] flex items-center justify-between bg-[#F5EFE6]/50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-[#111111]" />
              <h2 className="font-serif text-lg font-normal text-[#111111]">
                Your Bridal Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-neutral-600 hover:text-neutral-950 transition-colors"
              aria-label="Close Cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress bar */}
          <div className="px-6 py-3 bg-[#F2ECE4] border-b border-[#E8E1D7] text-xs">
            {remainingForFreeShipping > 0 ? (
              <p className="text-neutral-700 text-[11px] mb-1.5 flex items-center">
                Add <span className="font-semibold text-neutral-900 mx-1">{formatPrice(remainingForFreeShipping)}</span> more for{' '}
                <span className="font-bold text-[#A68962] ml-1">Free Worldwide Express Delivery</span>
              </p>
            ) : (
              <p className="text-[#2F6147] font-semibold text-[11px] flex items-center">
                You have unlocked Complimentary Worldwide Express Shipping!
              </p>
            )}
            <div className="w-full bg-[#E5DDD0] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#111111] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#EBE3D8]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#F2ECE4] flex items-center justify-center mb-4">
                  <ShoppingBag className="w-7 h-7 text-neutral-400 stroke-[1.2]" />
                </div>
                <h3 className="font-serif text-xl text-neutral-800 font-medium mb-1">
                  Your bridal bag is empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6 font-sans">
                  Explore our signature bridal robes, bridesmaids collections, and curated getting-ready sets.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setActiveView('collection');
                  }}
                  className="bg-[#111111] text-[#FAF8F5] text-xs tracking-wide px-6 py-3 hover:bg-[#C5A880] transition-colors font-semibold rounded-full font-sans"
                >
                  Shop Bridal Robes
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-4 flex space-x-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-24 bg-[#F2ECE4] shrink-0 overflow-hidden border border-[#E5DDD0] rounded-2xl shadow-xs">
                    <img
                      src={item.product?.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                      alt={item.product?.name || 'Bridal Robe'}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif text-[15px] font-medium text-neutral-900 leading-snug">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-neutral-400 hover:text-red-700 transition-colors ml-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-1 space-y-0.5 text-[11px] text-neutral-600">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-neutral-300 inline-block"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          <span>Color: {item.selectedColor.name}</span>
                        </div>
                        <p>Size: {item.selectedSize}</p>
                        {item.personalisationText && (
                          <p className="text-[#A68962] font-medium">
                            Embroidery: "{item.personalisationText}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-neutral-300 bg-white rounded-full overflow-hidden px-1 py-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="p-1 hover:bg-neutral-100 transition-colors text-neutral-700 rounded-full"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="p-1 hover:bg-neutral-100 transition-colors text-neutral-700 rounded-full"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-neutral-900 tracking-wider">
                        {formatPrice(item.product.priceUSD * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer calculation & CTAs */}
          {cart.length > 0 && (
            <div className="px-6 py-5 border-t border-[#E8E1D7] bg-[#F7F2EB] space-y-4">
              {/* Optional Wedding Date & Notes */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Wedding Date (Optional - e.g. 24 Oct 2025)"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full text-[11px] bg-white border border-neutral-300 px-4 py-2.5 rounded-full focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                <span className="font-serif text-sm text-neutral-700">Subtotal</span>
                <span className="font-serif text-lg font-semibold text-neutral-950">
                  {formatPrice(cartSubtotalUSD)}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 text-left">
                Taxes, customs & priority insurance calculated at checkout. Hand-packaged in luxury Lariel gold-embossed keepsake box.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#111111] text-[#FAF8F5] text-xs tracking-wide py-3.5 px-4 font-semibold hover:bg-[#C5A880] transition-all flex items-center justify-center space-x-2 rounded-full shadow-md font-sans"
                >
                  <span>Proceed To Secure Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* WhatsApp Direct Order Button */}
                <a
                  href={`https://wa.me/2348180306073?text=${generateWhatsAppMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border border-neutral-800 bg-white text-neutral-900 text-xs tracking-wide py-3 px-4 font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors flex items-center justify-center space-x-2 rounded-full shadow-xs font-sans"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Order & Chat Via WhatsApp</span>
                </a>
              </div>

              <div className="flex items-center justify-center space-x-2 text-[10px] text-neutral-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>256-Bit Encrypted · Direct Concierge Support</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
