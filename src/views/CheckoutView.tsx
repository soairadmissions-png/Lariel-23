import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  Lock,
  ArrowLeft,
  MessageCircle,
  Check,
  ShoppingBag,
  Globe,
  Copy,
  CheckCheck,
  ExternalLink,
  CreditCard,
  Building2,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';
import { CURRENCIES } from '../data/currencies';
import { Currency } from '../types';
import {
  OFFICIAL_BANK_ACCOUNTS,
  REMITTANCE_APPS,
  PAYMENT_GATEWAY_NOTE,
  RemittanceApp,
} from '../data/paymentConfig';
import { BRAND_CONTACT } from '../data/faqs';

export const CheckoutView: React.FC = () => {
  const {
    cart,
    cartSubtotalUSD,
    formatPrice,
    clearCart,
    setActiveView,
    currency,
    setCurrency,
    addOrder,
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

  // Payment method options: 'remittance' (Remitly, WorldRemit, Sendwave, LemFi) | 'bank_transfer' (Polaris & UBA) | 'card' | 'whatsapp'
  const [paymentMethod, setPaymentMethod] = useState<'remittance' | 'bank_transfer' | 'card' | 'whatsapp'>('remittance');

  // Remittance specific state
  const [selectedRemittanceApp, setSelectedRemittanceApp] = useState<'remitly' | 'worldremit' | 'sendwave' | 'lemfi'>('remitly');
  const [selectedBankDestination, setSelectedBankDestination] = useState<string>('POLARIS Bank');
  const [transferReference, setTransferReference] = useState<string>('');
  const [senderAccountName, setSenderAccountName] = useState<string>('');

  // Card specific state
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Copy feedback state
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  // Order completion state
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmedPaymentDetails, setConfirmedPaymentDetails] = useState<{
    method: string;
    subApp?: string;
    reference?: string;
    totalFormatted: string;
    currencyCode: string;
  } | null>(null);

  // Free shipping over $300 USD
  const shippingFeeUSD = cartSubtotalUSD >= 300 || cartSubtotalUSD === 0 ? 0 : 25;
  const totalAmountUSD = cartSubtotalUSD + shippingFeeUSD;

  const currentCurrencyConfig = CURRENCIES[currency] || CURRENCIES.USD;
  const activeRemittanceConfig = REMITTANCE_APPS.find((app) => app.id === selectedRemittanceApp) || REMITTANCE_APPS[0];

  const handleCopyText = (text: string, identifier: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedBank(identifier);
      setTimeout(() => setCopiedBank(null), 2500);
    } catch {
      // fallback
    }
  };

  const generateWhatsAppOrderTranscript = (generatedOrderNum: string, customMethodTitle?: string) => {
    let msg = `✨ *LARIEL ESSENTIALS BRIDAL ORDER CONFIRMATION* ✨\n`;
    msg += `Order Reference: #${generatedOrderNum}\n\n`;
    msg += `*Client Details:*\n`;
    msg += `Name: ${firstName} ${lastName}\n`;
    msg += `Email: ${email}\n`;
    msg += `Phone: ${phone}\n`;
    msg += `Destination: ${address}, ${city}, ${country} (${postalCode})\n`;
    if (weddingDate) msg += `Wedding Date: ${weddingDate}\n`;
    msg += `\n*PAYMENT METHOD & GATEWAY:*\n`;
    msg += `Method: ${customMethodTitle || (
      paymentMethod === 'remittance'
        ? `International Remittance (${activeRemittanceConfig.name}) → ${selectedBankDestination}`
        : paymentMethod === 'bank_transfer'
        ? `Direct Bank Transfer (${selectedBankDestination})`
        : paymentMethod === 'card'
        ? `Credit/Debit Card`
        : `WhatsApp Concierge`
    )}\n`;
    msg += `Selected Currency: ${currentCurrencyConfig.code} (${currentCurrencyConfig.symbol})\n`;
    if (transferReference) msg += `Transfer Reference / Code: ${transferReference}\n`;
    if (senderAccountName) msg += `Sender Name: ${senderAccountName}\n`;
    msg += `\n*BENEFICIARY ACCOUNT:*\n`;
    msg += `Beneficiary: Lariel Bridal Essential\n`;
    msg += `POLARIS Bank: 4091455814\n`;
    msg += `United Bank for Africa (UBA): 1024663880\n`;
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
    msg += `Total Amount: ${formatPrice(totalAmountUSD)} (${currentCurrencyConfig.code})\n`;
    if (orderNotes) msg += `\nClient Notes: ${orderNotes}\n`;
    msg += `\nI have submitted my bridal order through the Lariel Essentials platform. Please confirm receipt and queue my handcrafted production!`;
    return `https://wa.me/${BRAND_CONTACT.whatsappRaw}?text=${encodeURIComponent(msg)}`;
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const genOrderNum = `LE-${Math.floor(100000 + Math.random() * 900000)}`;
    const formattedTotal = formatPrice(totalAmountUSD);

    const paymentSummary = {
      method:
        paymentMethod === 'remittance'
          ? `Remittance (${activeRemittanceConfig.name})`
          : paymentMethod === 'bank_transfer'
          ? `Direct Bank Transfer (${selectedBankDestination})`
          : paymentMethod === 'card'
          ? 'Credit / Debit Card'
          : 'WhatsApp Concierge',
      subApp: paymentMethod === 'remittance' ? activeRemittanceConfig.name : undefined,
      reference: transferReference || undefined,
      totalFormatted: formattedTotal,
      currencyCode: currentCurrencyConfig.code,
    };

    if (paymentMethod === 'whatsapp') {
      window.open(generateWhatsAppOrderTranscript(genOrderNum, 'WhatsApp Concierge Checkout'), '_blank');
      setOrderNumber(genOrderNum);
      setConfirmedPaymentDetails(paymentSummary);
      setOrderComplete(true);
      clearCart();
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderNumber(genOrderNum);
      setConfirmedPaymentDetails(paymentSummary);
      setOrderComplete(true);

      // Save order to history if helper is present
      if (addOrder) {
        addOrder({
          id: genOrderNum,
          orderId: genOrderNum,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: 'Processing',
          customerName: `${firstName} ${lastName}`.trim(),
          customerEmail: email,
          customerPhone: phone,
          totalUSD: totalAmountUSD,
          totalFormatted: formattedTotal,
          items: cart.map((i) => ({
            productName: i.product.name,
            quantity: i.quantity,
            color: i.selectedColor.name,
            size: i.selectedSize,
            monogramText: i.personalisationText,
            monogramRole: i.personalisationRole,
            priceFormatted: formatPrice(i.product.priceUSD * i.quantity),
          })),
          shippingAddress: {
            name: `${firstName} ${lastName}`.trim(),
            street: address,
            city,
            country,
          },
        });
      }

      clearCart();
    }, 1000);
  };

  // ORDER COMPLETE CONFIRMATION VIEW
  if (orderComplete) {
    return (
      <div className="w-full bg-[#FAF8F5] py-16 sm:py-24 px-4 sm:px-6 min-h-[75vh] flex items-center justify-center text-center">
        <div className="bg-[#FAF8F5] border border-[#E5DDD0] max-w-2xl w-full p-6 sm:p-12 shadow-md space-y-6 text-left">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#2F6147]/10 text-[#2F6147] flex items-center justify-center mx-auto border border-[#2F6147]/30">
              <Check className="w-8 h-8" />
            </div>

            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans uppercase">
              Order Confirmed · Reference #{orderNumber}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl text-neutral-950 font-normal">
              Your Bridal Order is Reserved.
            </h1>

            <p className="text-xs sm:text-sm text-neutral-600 font-sans leading-relaxed max-w-lg mx-auto">
              Thank you, {firstName || 'Queen'}. Your bespoke Lariel pieces have been queued at our Lagos bridal atelier. An official confirmation invoice has been generated for <strong>{email || 'your email'}</strong>.
            </p>
          </div>

          {/* Payment Gateway Specific Instructions Box */}
          <div className="bg-[#F7F2EA] border border-[#E0D5C3] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D5C3]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A68962] block font-sans">
                  Payment Gateway Selection
                </span>
                <h4 className="font-serif text-base font-medium text-neutral-900">
                  {confirmedPaymentDetails?.method || 'Direct Corporate Settlement'}
                </h4>
              </div>
              <span className="font-serif text-lg font-semibold text-neutral-900">
                {confirmedPaymentDetails?.totalFormatted}
              </span>
            </div>

            {/* Official Accounts Recipient Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-800">
                  Official Beneficiary Bank Accounts (Nigeria):
                </p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                  Verified Corporate Account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Polaris Bank Card */}
                <div className="p-3.5 bg-white border border-[#D9CEBF] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900 uppercase tracking-wide text-[11px]">
                      POLARIS BANK
                    </span>
                    <button
                      onClick={() => handleCopyText('4091455814', 'polaris_complete')}
                      className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                    >
                      {copiedBank === 'polaris_complete' ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-semibold tracking-wider text-neutral-950">
                    4091455814
                  </div>
                  <p className="text-[11px] text-neutral-600 font-sans">
                    Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                  </p>
                </div>

                {/* UBA Card */}
                <div className="p-3.5 bg-white border border-[#D9CEBF] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900 uppercase tracking-wide text-[11px]">
                      UNITED BANK FOR AFRICA (UBA)
                    </span>
                    <button
                      onClick={() => handleCopyText('1024663880', 'uba_complete')}
                      className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                    >
                      {copiedBank === 'uba_complete' ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-semibold tracking-wider text-neutral-950">
                    1024663880
                  </div>
                  <p className="text-[11px] text-neutral-600 font-sans">
                    Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                  </p>
                </div>
              </div>

              {/* Note requested by user */}
              <p className="text-[10px] text-neutral-500 italic pt-1">
                {PAYMENT_GATEWAY_NOTE}
              </p>
            </div>
          </div>

          {/* Next Steps Notification */}
          <div className="p-4 bg-[#FAF6F0] border border-[#E5DDD0] text-xs text-neutral-700 space-y-2 font-sans">
            <p className="font-semibold text-neutral-900">Immediate Next Step:</p>
            <p>
              Please send a screenshot or transaction code of your payment via <strong>Remitly, WorldRemit, Sendwave, LemFi</strong>, or bank transfer directly to our WhatsApp Concierge so our patternmaker immediately locks your wedding date and starts tailoring.
            </p>
          </div>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <a
              href={generateWhatsAppOrderTranscript(orderNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs tracking-wide py-3.5 px-6 font-semibold flex items-center justify-center space-x-2 transition-colors shadow-xs font-sans rounded-none"
            >
              <MessageCircle className="w-4 h-4 fill-white text-transparent" />
              <span>Send Receipt on WhatsApp (+234 818 030 6073)</span>
            </a>

            <button
              onClick={() => setActiveView('home')}
              className="border border-neutral-900 bg-white text-neutral-900 text-xs tracking-wide px-8 py-3.5 font-semibold hover:bg-neutral-900 hover:text-white transition-colors font-sans"
            >
              Return To Boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY BAG STATE
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
    <div className="w-full bg-[#FAF8F5] py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb / Top Return */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center space-x-1.5 text-xs text-neutral-600 hover:text-black font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>

          <span className="text-[11px] uppercase tracking-widest text-[#A68962] font-semibold font-sans">
            Secure Bridal Checkout · DHL Express Worldwide
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Form: Details & Payment Gateway (7 Cols) */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-8 text-left">
            
            {/* Section 1: Contact Information */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline pb-2 border-b border-[#E8E1D7]">
                <h2 className="font-serif text-lg text-neutral-900 font-normal">
                  1. Contact Information
                </h2>
                <span className="text-[10px] text-neutral-500 tracking-wide font-sans">Step 1 of 3</span>
              </div>

              <div>
                <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bride@example.com"
                  className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    First Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Amara"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Adeyemi"
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7123 456789 or +234..."
                    className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Wedding / Event Date (Optional)
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

            {/* Section 2: Delivery Destination */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline pb-2 border-b border-[#E8E1D7]">
                <h2 className="font-serif text-lg text-neutral-900 font-normal">
                  2. Delivery Address
                </h2>
                <span className="text-[10px] text-neutral-500 tracking-wide font-sans">DHL Priority Express Worldwide</span>
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
                  <option>Ireland</option>
                  <option>Italy</option>
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

            {/* Section 3: GLOBAL CLIENT PAYMENT GATEWAY */}
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-[#E8E1D7]">
                <div>
                  <h2 className="font-serif text-lg text-neutral-900 font-normal">
                    3. Client Payment Gateway
                  </h2>
                  <p className="text-[11px] text-neutral-500 font-sans">
                    Select your preferred global currency & payment financial institution
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-medium text-[10px] tracking-wide">256-Bit Encrypted</span>
                </div>
              </div>

              {/* CURRENCY TOGGLE SELECTOR */}
              <div className="bg-[#FAF6F0] border border-[#E3D9CC] p-3 sm:p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-[#A68962]" />
                    <span className="text-xs font-semibold text-neutral-900 font-sans">
                      Select Preferred Global Currency:
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-600 font-sans">
                    Current Rate: 1 USD = {currentCurrencyConfig.rate} {currentCurrencyConfig.code}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                  {(Object.keys(CURRENCIES) as Currency[]).map((cur) => {
                    const cfg = CURRENCIES[cur];
                    const isSelected = currency === cur;
                    return (
                      <button
                        type="button"
                        key={cur}
                        onClick={() => setCurrency(cur)}
                        className={`px-2 py-2 text-center rounded border transition-all text-xs font-sans ${
                          isSelected
                            ? 'bg-[#181614] text-[#FAF8F5] border-[#181614] shadow-xs'
                            : 'bg-white text-neutral-800 border-[#DDD3C5] hover:bg-[#F2ECE4]'
                        }`}
                      >
                        <div className="text-sm">{cfg.flag}</div>
                        <div className="font-bold text-[10.5px] mt-0.5">{cfg.code}</div>
                        <div className="text-[9.5px] opacity-75">{cfg.symbol}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAYMENT METHOD SELECTION LIST */}
              <div className="space-y-3.5">
                
                {/* 1. International Remittance Apps (Remitly, WorldRemit, Sendwave, LemFi) */}
                <div
                  className={`border transition-all ${
                    paymentMethod === 'remittance'
                      ? 'border-neutral-900 bg-[#FAF7F2] shadow-sm'
                      : 'border-neutral-300 bg-white hover:border-neutral-400'
                  }`}
                >
                  <label className="flex items-start space-x-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_main_method"
                      checked={paymentMethod === 'remittance'}
                      onChange={() => setPaymentMethod('remittance')}
                      className="mt-1 text-black focus:ring-black"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold uppercase tracking-wider text-xs text-neutral-900 font-sans flex items-center space-x-1.5">
                          <span>International Remittance Apps</span>
                          <span className="text-[10px] bg-[#C5A880]/20 text-[#8B6D45] px-2 py-0.5 rounded-full font-bold uppercase">
                            Recommended for Abroad
                          </span>
                        </span>
                        <div className="flex items-center space-x-1 text-[10px] font-semibold text-neutral-600">
                          <span>Remitly</span> · <span>WorldRemit</span> · <span>Sendwave</span> · <span>LemFi</span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 font-sans">
                        Pay in your local currency ({currentCurrencyConfig.code}) from the UK, USA, Europe, Canada, Australia or worldwide directly into our corporate accounts in Nigeria.
                      </p>
                    </div>
                  </label>

                  {/* Expanded Remittance Panel */}
                  {paymentMethod === 'remittance' && (
                    <div className="px-4 pb-5 pt-1 border-t border-[#E8DFCFC] space-y-4">
                      
                      {/* App Selector Tabs */}
                      <div>
                        <label className="block text-[10.5px] uppercase font-bold tracking-wider text-neutral-700 mb-2">
                          1. Choose Your Financial Remittance App:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {REMITTANCE_APPS.map((app) => {
                            const isChosen = selectedRemittanceApp === app.id;
                            return (
                              <button
                                type="button"
                                key={app.id}
                                onClick={() => setSelectedRemittanceApp(app.id)}
                                className={`p-2.5 text-left border rounded transition-all ${
                                  isChosen
                                    ? 'bg-[#181614] text-white border-[#181614] shadow-xs'
                                    : 'bg-white text-neutral-900 border-[#DDD3C5] hover:bg-[#F2ECE4]'
                                }`}
                              >
                                <div className="font-bold text-xs flex items-center justify-between">
                                  <span>{app.name}</span>
                                  {isChosen && <Check className="w-3 h-3 text-[#C5A880]" />}
                                </div>
                                <div className={`text-[10px] mt-0.5 truncate ${isChosen ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                  {app.speed}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Official Verified Bank Accounts Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10.5px] uppercase font-bold tracking-wider text-neutral-700">
                            2. Beneficiary Bank Accounts for {activeRemittanceConfig.name}:
                          </label>
                          <span className="text-[10px] text-emerald-800 font-medium">Recipient Country: Nigeria</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Polaris Bank */}
                          <div
                            onClick={() => setSelectedBankDestination('POLARIS Bank')}
                            className={`p-3.5 border cursor-pointer transition-all ${
                              selectedBankDestination === 'POLARIS Bank'
                                ? 'bg-white border-neutral-900 ring-1 ring-neutral-900'
                                : 'bg-[#FAF8F5] border-[#D9CEBF] hover:bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-neutral-900 text-[11px] uppercase tracking-wide">
                                POLARIS BANK
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText('4091455814', 'polaris_remit');
                                }}
                                className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                              >
                                {copiedBank === 'polaris_remit' ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Number</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="font-mono text-base font-bold text-neutral-950 tracking-wider">
                              4091455814
                            </div>
                            <p className="text-[11px] text-neutral-600 font-sans mt-0.5">
                              Account Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                            </p>
                          </div>

                          {/* United Bank for Africa (UBA) */}
                          <div
                            onClick={() => setSelectedBankDestination('United Bank for Africa (UBA)')}
                            className={`p-3.5 border cursor-pointer transition-all ${
                              selectedBankDestination === 'United Bank for Africa (UBA)'
                                ? 'bg-white border-neutral-900 ring-1 ring-neutral-900'
                                : 'bg-[#FAF8F5] border-[#D9CEBF] hover:bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-neutral-900 text-[11px] uppercase tracking-wide">
                                UNITED BANK FOR AFRICA (UBA)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText('1024663880', 'uba_remit');
                                }}
                                className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                              >
                                {copiedBank === 'uba_remit' ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Number</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="font-mono text-base font-bold text-neutral-950 tracking-wider">
                              1024663880
                            </div>
                            <p className="text-[11px] text-neutral-600 font-sans mt-0.5">
                              Account Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                            </p>
                          </div>
                        </div>

                        {/* Mandatory Note specified by user */}
                        <div className="p-2.5 bg-[#F2ECE4] border border-[#E0D7CC] rounded text-[11px] text-neutral-700 italic font-sans flex items-center space-x-2">
                          <ShieldCheck className="w-4 h-4 text-[#A68962] shrink-0" />
                          <span>{PAYMENT_GATEWAY_NOTE}</span>
                        </div>
                      </div>

                      {/* Step by step instructions for chosen app */}
                      <div className="bg-white p-3.5 border border-[#E0D7CC] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900 font-sans">
                            How to complete with {activeRemittanceConfig.name}:
                          </span>
                          <a
                            href={activeRemittanceConfig.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#A68962] hover:text-black font-semibold text-[11px] flex items-center space-x-1"
                          >
                            <span>Open {activeRemittanceConfig.name} Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-neutral-600 text-[11.5px] leading-relaxed">
                          {activeRemittanceConfig.instructions.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      {/* Optional transfer details input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                            {activeRemittanceConfig.name} Transfer Ref / Code (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. REF-982341"
                            value={transferReference}
                            onChange={(e) => setTransferReference(e.target.value)}
                            className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                            Sender Account Name (As shown in app)
                          </label>
                          <input
                            type="text"
                            placeholder="Your name on the app"
                            value={senderAccountName}
                            onChange={(e) => setSenderAccountName(e.target.value)}
                            className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                          />
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* 2. Direct Nigerian Bank Transfer (POLARIS Bank & UBA) */}
                <div
                  className={`border transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-neutral-900 bg-[#FAF7F2] shadow-sm'
                      : 'border-neutral-300 bg-white hover:border-neutral-400'
                  }`}
                >
                  <label className="flex items-start space-x-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_main_method"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="mt-1 text-black focus:ring-black"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-xs text-neutral-900 font-sans flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#A68962]" />
                          <span>Direct Bank Transfer (Nigeria / NGN)</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">Polaris & UBA</span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 font-sans">
                        Instant domestic bank transfer via your Nigerian banking app or USSD into our corporate accounts.
                      </p>
                    </div>
                  </label>

                  {paymentMethod === 'bank_transfer' && (
                    <div className="px-4 pb-5 pt-1 border-t border-[#E8DFCFC] space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Polaris Bank */}
                        <div className="p-3.5 bg-white border border-[#D9CEBF] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-neutral-900 uppercase text-[11px]">
                              POLARIS BANK
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText('4091455814', 'polaris_direct')}
                              className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                            >
                              {copiedBank === 'polaris_direct' ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="font-mono text-base font-bold text-neutral-950 tracking-wider">
                            4091455814
                          </div>
                          <p className="text-[11px] text-neutral-600">
                            Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                          </p>
                        </div>

                        {/* UBA */}
                        <div className="p-3.5 bg-white border border-[#D9CEBF] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-neutral-900 uppercase text-[11px]">
                              UNITED BANK FOR AFRICA (UBA)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText('1024663880', 'uba_direct')}
                              className="text-[10px] text-[#A68962] hover:text-black flex items-center space-x-1 font-semibold"
                            >
                              {copiedBank === 'uba_direct' ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="font-mono text-base font-bold text-neutral-950 tracking-wider">
                            1024663880
                          </div>
                          <p className="text-[11px] text-neutral-600">
                            Name: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#FAF6F0] border border-[#E3D9CC] text-[11px] text-neutral-600">
                        Transfer amount: <strong className="text-neutral-900">{formatPrice(totalAmountUSD)}</strong>. Use your name or order reference as narration.
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Credit / Debit Card (Global 256-Bit Encrypted) */}
                <div
                  className={`border transition-all ${
                    paymentMethod === 'card'
                      ? 'border-neutral-900 bg-[#FAF7F2] shadow-sm'
                      : 'border-neutral-300 bg-white hover:border-neutral-400'
                  }`}
                >
                  <label className="flex items-start space-x-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_main_method"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="mt-1 text-black focus:ring-black"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-xs text-neutral-900 font-sans flex items-center space-x-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-[#A68962]" />
                          <span>Credit / Debit Card (Global 256-Bit Encrypted)</span>
                        </span>
                        <div className="text-[10px] text-neutral-500">Visa · Mastercard · Amex</div>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 font-sans">
                        Instant international card processing in {currentCurrencyConfig.code} ({currentCurrencyConfig.symbol}).
                      </p>
                    </div>
                  </label>

                  {paymentMethod === 'card' && (
                    <div className="px-4 pb-5 pt-1 border-t border-[#E8DFCFC] space-y-3">
                      <div>
                        <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder="Name as it appears on card"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                            Expires (MM/YY)
                          </label>
                          <input
                            type="text"
                            placeholder="12/28"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-600 mb-1">
                            Security Code (CVC)
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full text-xs bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Direct WhatsApp Concierge Checkout */}
                <div
                  className={`border transition-all ${
                    paymentMethod === 'whatsapp'
                      ? 'border-[#25D366] bg-[#F4FAF6] shadow-sm'
                      : 'border-neutral-300 bg-white hover:border-neutral-400'
                  }`}
                >
                  <label className="flex items-start space-x-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_main_method"
                      checked={paymentMethod === 'whatsapp'}
                      onChange={() => setPaymentMethod('whatsapp')}
                      className="mt-1 text-[#25D366] focus:ring-[#25D366]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span className="font-semibold uppercase tracking-wider text-xs text-neutral-900 font-sans">
                          Order & Pay via WhatsApp Concierge
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 font-sans">
                        Instant consultation with our Lagos bridal team. Send itemized manifest directly to WhatsApp (+234 818 030 6073).
                      </p>
                    </div>
                  </label>
                </div>

              </div>
            </div>

            {/* Client Notes */}
            <div>
              <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                Special Bridal Notes / Urgent Dispatch Request
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Specific wedding date requirements, express rush, or custom notes..."
                className="w-full text-xs bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#111111] hover:bg-[#C5A880] text-[#FAF8F5] py-4 text-xs tracking-wider uppercase font-semibold transition-all shadow-md disabled:opacity-50 font-sans cursor-pointer flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <span>Securing Your Bridal Order...</span>
              ) : paymentMethod === 'whatsapp' ? (
                <>
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span>Continue To WhatsApp Concierge · {formatPrice(totalAmountUSD)}</span>
                </>
              ) : paymentMethod === 'remittance' ? (
                <>
                  <Send className="w-4 h-4 text-[#C5A880]" />
                  <span>
                    Lock Order Via {activeRemittanceConfig.name} · {formatPrice(totalAmountUSD)}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#C5A880]" />
                  <span>Complete Secure Order · {formatPrice(totalAmountUSD)}</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 bg-[#FAF6F0] border border-[#E3D9CC] p-6 sm:p-8 space-y-6 h-fit text-left">
            <div className="flex justify-between items-baseline pb-3 border-b border-[#E3D9CC]">
              <h3 className="font-serif text-xl text-neutral-900 font-normal">
                Bag Summary ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h3>
              <span className="text-xs font-semibold text-[#A68962] font-mono">
                {currentCurrencyConfig.code} ({currentCurrencyConfig.symbol})
              </span>
            </div>

            {/* Items List */}
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
                    <p className="text-[11px] text-neutral-600 mt-0.5 font-sans">
                      Shade: {item.selectedColor.name} · Size: {item.selectedSize} · Qty: {item.quantity}
                    </p>
                    {item.personalisationText && (
                      <p className="text-[10px] text-[#A68962] font-semibold mt-0.5 font-sans">
                        Monogram: "{item.personalisationText}" ({item.personalisationRole || 'Bride'})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-4 border-t border-[#E3D9CC] text-xs font-sans">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-medium text-neutral-900">{formatPrice(cartSubtotalUSD)}</span>
              </div>

              <div className="flex justify-between text-neutral-600">
                <span>Worldwide Priority Delivery (DHL Express)</span>
                <span>
                  {shippingFeeUSD === 0 ? (
                    <span className="text-[#2F6147] font-semibold uppercase tracking-wider text-[11px]">
                      Complimentary (Orders $300+)
                    </span>
                  ) : (
                    <span className="font-medium text-neutral-900">{formatPrice(shippingFeeUSD)}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-serif font-semibold text-neutral-950 pt-3 border-t border-[#E3D9CC]">
                <span>Total ({currentCurrencyConfig.code})</span>
                <span className="text-lg text-neutral-950">{formatPrice(totalAmountUSD)}</span>
              </div>
            </div>

            {/* Quick Banking Overview Card */}
            <div className="p-4 bg-white border border-[#DDD3C5] space-y-2 text-xs font-sans">
              <div className="flex items-center justify-between text-neutral-900 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#A68962]" />
                  <span>Official Corporate Accounts</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-normal">Polaris & UBA</span>
              </div>
              <div className="text-[11px] text-neutral-600 space-y-1">
                <div className="flex justify-between">
                  <span>POLARIS Bank:</span>
                  <span className="font-mono font-semibold text-neutral-900">4091455814</span>
                </div>
                <div className="flex justify-between">
                  <span>UBA Bank:</span>
                  <span className="font-mono font-semibold text-neutral-900">1024663880</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-100 text-[10px]">
                  <span>Account Name:</span>
                  <span className="font-semibold text-neutral-800">Lariel Bridal Essential</span>
                </div>
              </div>
            </div>

            {/* Essentials Guarantee Notice */}
            <div className="bg-[#EFE8DE] p-4 text-[11px] text-neutral-700 space-y-1 border border-[#DFD6C8] font-sans">
              <div className="flex items-center space-x-1.5 font-semibold text-neutral-900">
                <ShieldCheck className="w-4 h-4 text-[#A68962]" />
                <span>The Lariel Essentials Guarantee</span>
              </div>
              <p className="leading-relaxed">
                Each piece is carefully inspected in our Lagos atelier and sealed with tamper-evident golden wax. Delivered directly to your door with priority DHL Express tracking.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
