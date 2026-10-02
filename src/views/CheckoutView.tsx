import React, { useState } from 'react';
import { ShieldCheck, Truck, Lock, ArrowLeft, MessageCircle, Check, ShoppingBag } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotalUSD,
    formatPrice,
    clearCart,
    setActiveView,
    selectedCurrency,
  } = useShop();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [postalCode, setPostalCode] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'whatsapp'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Order state
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Free shipping over $300 USD
  const shippingFeeUSD = cartSubtotalUSD >= 300 || cartSubtotalUSD === 0 ? 0 : 25;
  const totalAmountUSD = cartSubtotalUSD + shippingFeeUSD;

  const generateWhatsAppOrderTranscript = () => {
    let msg = `✨ *LARIEL ESSENTIALS BRIDAL ORDER CONFIRMATION* ✨\n\n`;
    msg += `Client: ${firstName} ${lastName}\n`;
    msg += `Email: ${email}\n`;
    msg += `Phone: ${phone}\n`;
    msg += `Destination: ${address}, ${city}, ${country} (${postalCode})\n`;
    if (weddingDate) msg += `Wedding Date: ${weddingDate}\n`;
    msg += `\n*ORDER ITEMS:*\n`;
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.product.name} (Qty: ${item.quantity})\n`;
      msg += `   - Shade: ${item.selectedColor.name}\n`;
      msg += `   - Size: ${item.selectedSize}\n`;
      if (item.personalisationText) {
        msg += `   - Monogram: "${item.personalisationText}" (${item.personalisationRole || 'Bride'})\n`;
      }
      msg += `   - Price: ${formatPrice(item.product.priceUSD * item.quantity)}\n`;
    });
    msg += `\nSubtotal: ${formatPrice(cartSubtotalUSD)}\n`;
    msg += `Worldwide Priority Delivery: ${shippingFeeUSD === 0 ? 'COMPLIMENTARY' : formatPrice(shippingFeeUSD)}\n`;
    msg += `Total: ${formatPrice(totalAmountUSD)}\n`;
    if (orderNotes) msg += `Notes: ${orderNotes}\n`;
    msg += `\nPlease confirm production dispatch and payment details!`;
    return `https://wa.me/2348180306073?text=${encodeURIComponent(msg)}`;
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'whatsapp') {
      window.open(generateWhatsAppOrderTranscript(), '_blank');
      setOrderNumber(`LE-${Math.floor(100000 + Math.random() * 900000)}`);
      setOrderComplete(true);
      clearCart();
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderNumber(`LE-${Math.floor(100000 + Math.random() * 900000)}`);
      setOrderComplete(true);
      clearCart();
    }, 1200);
  };

  if (orderComplete) {
    return (
      <div className="w-full bg-[#FAF8F5] py-20 px-4 sm:px-6 min-h-[70vh] flex items-center justify-center text-center">
        <div className="bg-[#FAF8F5] border border-[#E5DDD0] max-w-xl w-full p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#F2ECE4] text-[#A68962] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans">
            Order Confirmed · {orderNumber}
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal">
            Your Bridal Morning Awaits.
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 font-sans leading-relaxed">
            Thank you, {firstName || 'Queen'}. Your bespoke Lariel pieces have been queued at our Lagos essentials house. A confirmation invoice and production timeline have been sent to <strong>{email || 'your email'}</strong>.
          </p>

          <div className="p-4 bg-[#F5EFE6] border border-[#E5DDD0] text-xs text-neutral-700 text-left space-y-2">
            <p><strong>Next Steps:</strong></p>
            <p>1. Our essentials master patternmaker reviews all monogram spellings and measurements.</p>
            <p>2. You will receive WhatsApp/Email tracking once DHL Priority Express picks up your keepsake case.</p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setActiveView('home')}
              className="bg-[#111111] text-white text-xs tracking-wide px-8 py-3.5 font-semibold hover:bg-[#C5A880] font-sans"
            >
              Return To Home
            </button>
            <a
              href={`https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20checking%20in%20on%20my%20order%20${orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-neutral-800 bg-white text-neutral-900 text-xs tracking-wide px-6 py-3.5 font-medium hover:border-[#25D366] hover:text-[#25D366] flex items-center justify-center space-x-1.5 font-sans"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Chat With Concierge</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="w-full bg-[#FAF8F5] py-20 px-4 text-center min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-neutral-400 stroke-[1.2]" />
        <h2 className="font-serif text-2xl text-neutral-900">Your bridal bag is empty</h2>
        <p className="text-xs text-neutral-500 max-w-xs font-sans">
          Select your dream robe or curated bridal party suite to proceed to checkout.
        </p>
        <button
          onClick={() => setActiveView('collection')}
          className="bg-[#111111] text-white text-xs tracking-wide px-6 py-3 font-semibold hover:bg-[#C5A880] font-sans"
        >
          Explore Bridal Robes
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAF8F5] text-[#111111] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setActiveView('home')}
          className="inline-flex items-center space-x-1 text-xs tracking-wider uppercase text-neutral-500 hover:text-black mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
          {/* Left: Customer & Shipping Details */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-8">
            {/* Section 1: Contact Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8E1D7]">
                <h2 className="font-serif text-lg text-neutral-900 font-normal">
                  1. Bridal Contact Details
                </h2>
                <span className="text-[10px] text-neutral-500 tracking-wide font-sans">Step 1 of 3</span>
              </div>

              <div>
                <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                  Email Address (For Tracking & Invoice) *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bride@luxuryweddings.com"
                  className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    First Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adeola"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Last / Married Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Balogun"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    WhatsApp Phone (For Courier Dispatch) *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900077"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Wedding Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Shipping Destination */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8E1D7]">
                <h2 className="font-serif text-lg text-neutral-900 font-normal">
                  2. Delivery Address
                </h2>
                <span className="text-[10px] text-neutral-500 tracking-wide font-sans">DHL Priority Express</span>
              </div>

              <div>
                <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                  Country / Region *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none"
                >
                  <option>United Kingdom</option>
                  <option>United States</option>
                  <option>Nigeria</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>United Arab Emirates</option>
                  <option>Ghana</option>
                  <option>Kenya</option>
                  <option>South Africa</option>
                  <option>France</option>
                  <option>Germany</option>
                  <option>Other International</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                  Street Address *
                </label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apartment, suite, unit, building, street"
                  className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    City / Town *
                  </label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="London, New York, Lagos..."
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Postcode / ZIP *
                  </label>
                  <input
                    required
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="SW1A 1AA"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Payment Method */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8E1D7]">
                <h2 className="font-serif text-lg text-neutral-900 font-normal">
                  3. Payment & Concierge Method
                </h2>
                <Lock className="w-4 h-4 text-neutral-400" />
              </div>

              <div className="space-y-3">
                {/* Method 1: Credit / Debit Card */}
                <label
                  className={`flex items-start space-x-3 p-4 border cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-neutral-900 bg-[#FAF6F0]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mt-1"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold uppercase tracking-wider block text-neutral-900">
                      Credit / Debit Card (Global 256-Bit Encrypted)
                    </span>
                    <p className="text-neutral-500 mt-0.5">
                      Visa, Mastercard, American Express, Apple Pay, Google Pay
                    </p>

                    {paymentMethod === 'card' && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-[#E5DDD0]">
                        <div>
                          <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                            Card Number
                          </label>
                          <input
                            type="text"
                            placeholder="4000 1234 5678 9010"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full bg-white border border-neutral-300 px-3 py-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                              Expires (MM/YY)
                            </label>
                            <input
                              type="text"
                              placeholder="12/28"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-white border border-neutral-300 px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                              Security Code (CVC)
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="123"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              className="w-full bg-white border border-neutral-300 px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Method 2: Direct WhatsApp Concierge Checkout */}
                <label
                  className={`flex items-start space-x-3 p-4 border cursor-pointer transition-all ${
                    paymentMethod === 'whatsapp'
                      ? 'border-[#25D366] bg-[#F4FAF6]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'whatsapp'}
                    onChange={() => setPaymentMethod('whatsapp')}
                    className="mt-1"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span className="font-semibold uppercase tracking-wider text-neutral-900">
                        Order & Pay via WhatsApp Concierge
                      </span>
                    </div>
                    <p className="text-neutral-500 mt-0.5">
                      Direct consultation with our Lagos essentials team. Ideal for bank transfers (GBP, USD, EUR, NGN), custom monograms, or expedited wedding dates.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#111111] text-[#FAF8F5] py-4 text-xs tracking-wide font-semibold hover:bg-[#C5A880] transition-colors shadow-sm disabled:opacity-50 font-sans"
            >
              {isProcessing
                ? 'Securing Your Bridal Order...'
                : paymentMethod === 'whatsapp'
                ? `Continue To WhatsApp Concierge · ${formatPrice(totalAmountUSD)}`
                : `Complete Secure Order · ${formatPrice(totalAmountUSD)}`}
            </button>
          </form>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5 bg-[#FAF6F0] border border-[#E3D9CC] p-6 sm:p-8 space-y-6 h-fit">
            <h3 className="font-serif text-xl text-neutral-900 font-normal pb-3 border-b border-[#E3D9CC]">
              Bag Summary ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h3>

            {/* Items */}
            <div className="divide-y divide-[#EAE2D5] max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex space-x-3 text-xs">
                  <div className="w-14 h-18 bg-neutral-200 shrink-0 overflow-hidden border border-[#DFD6C9]">
                    <img
                      src={item.product?.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                      alt={item.product?.name || 'Bridal Robe'}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-serif text-sm font-medium text-neutral-900">
                        {item.product.name}
                      </span>
                      <span className="font-semibold ml-2">
                        {formatPrice(item.product.priceUSD * item.quantity)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      Color: {item.selectedColor.name} · Size: {item.selectedSize} · Qty: {item.quantity}
                    </p>
                    {item.personalisationText && (
                      <p className="text-[10px] text-[#A68962] font-semibold mt-0.5">
                        Embroidery: "{item.personalisationText}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-4 border-t border-[#E3D9CC] text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotalUSD)}</span>
              </div>

              <div className="flex justify-between text-neutral-600">
                <span>Worldwide Express Delivery (DHL)</span>
                <span>
                  {shippingFeeUSD === 0 ? (
                    <span className="text-[#2F6147] font-semibold">Complimentary</span>
                  ) : (
                    formatPrice(shippingFeeUSD)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-serif font-semibold text-neutral-950 pt-3 border-t border-[#E3D9CC]">
                <span>Total ({selectedCurrency.code})</span>
                <span>{formatPrice(totalAmountUSD)}</span>
              </div>
            </div>

            {/* Essentials Guarantee Notice */}
            <div className="bg-[#EFE8DE] p-4 text-[11px] text-neutral-700 space-y-1 border border-[#DFD6C8]">
              <div className="flex items-center space-x-1.5 font-semibold text-neutral-900">
                <ShieldCheck className="w-4 h-4 text-[#A68962]" />
                <span>The Lariel Essentials Guarantee</span>
              </div>
              <p>
                Each piece is carefully inspected in our Lagos essentials house and sealed with tamper-evident golden wax. Delivered directly to your door with priority tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
