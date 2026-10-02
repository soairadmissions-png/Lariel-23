import React, { useState, useMemo } from 'react';
import {
  Heart,
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  Ruler,
  ChevronRight,
  Check,
  Star,
  RefreshCw,
  Plus,
  Minus,
  HelpCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductColor, Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface ProductDetailViewProps {
  previewProduct?: Product;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ previewProduct }) => {
  const {
    selectedProductId,
    products,
    formatPrice,
    addToCart,
    toggleWishlist,
    isWishlisted,
    navigateToCategory,
    navigateToProduct,
  } = useShop();

  const product = useMemo(() => {
    if (previewProduct) return previewProduct;
    return products.find((p) => p.id === selectedProductId || p.slug === selectedProductId) || products[0];
  }, [selectedProductId, previewProduct, products]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product?.colors?.[0] || { name: 'Ivory', hex: '#FFFFF0' });
  const [selectedSize, setSelectedSize] = useState<string>(product?.sizes?.[0] || 'Standard');
  const [quantity, setQuantity] = useState(1);

  // Personalisation states
  const [enablePersonalisation, setEnablePersonalisation] = useState(false);
  const [personalisationText, setPersonalisationText] = useState('');
  const [personalisationRole, setPersonalisationRole] = useState('Bride');
  const [fontStyle, setFontStyle] = useState<'Modern Serif' | 'Romantic Script' | 'Royal Monogram'>('Romantic Script');
  const [placement, setPlacement] = useState<'Back' | 'Chest Pocket' | 'Cuff'>('Back');

  // Size Guide Modal state
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  // Active tab inside accordion
  const [activeAccordion, setActiveAccordion] = useState<'details' | 'fabric' | 'shipping' | 'care'>('details');

  const wishlisted = product ? isWishlisted(product.id) : false;

  // Related products
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    // If product has crossSellIds specified in CMS, prioritize those!
    if (product.crossSellIds && product.crossSellIds.length > 0) {
      const crossSells = product.crossSellIds
        .map((cid) => products.find((p) => p.id === cid))
        .filter(Boolean) as Product[];
      if (crossSells.length > 0) return crossSells.slice(0, 4);
    }
    return products
      .filter((p) => p.id !== product.id && (p.category === product.category || p.category === 'sets') && p.status !== 'draft')
      .slice(0, 4);
  }, [product, products]);

  const handleAddToCart = () => {
    addToCart(
      product,
      selectedColor,
      selectedSize,
      quantity,
      enablePersonalisation && personalisationText.trim()
        ? {
            text: personalisationText.trim(),
            role: personalisationRole,
          }
        : undefined
    );
  };

  const generateWhatsAppInquiry = () => {
    let msg = `Hello Lariel Essentials! I am inquiring about the ${product.name}.\n\n`;
    msg += `Color: ${selectedColor.name}\nSize: ${selectedSize}\nQuantity: ${quantity}\n`;
    if (enablePersonalisation && personalisationText.trim()) {
      msg += `Embroidery: "${personalisationText.trim()}" (${personalisationRole}, Placement: ${placement}, Font: ${fontStyle})\n`;
    }
    msg += `Price: ${formatPrice(product.priceUSD * quantity)}\n\nPlease advise on production timing and delivery to my country!`;
    return `https://wa.me/2348180306073?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="w-full bg-[#FAF8F5] text-[#111111]">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-[#EBE3D8] text-xs">
        <div className="flex items-center space-x-2 text-neutral-500">
          <button onClick={() => navigateToCategory('bridal')} className="hover:text-neutral-900 transition-colors">
            Home
          </button>
          <ChevronRight className="w-3 h-3" />
          <button
            onClick={() => navigateToCategory(product.category)}
            className="hover:text-neutral-900 uppercase tracking-wider transition-colors"
          >
            {product.category}
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-900 font-medium truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* Main Product Showcase */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-16">
        <div className="grid grid-cols-12 gap-3 xs:gap-4 sm:gap-8 lg:gap-14 items-start">
          {/* Left: Photography Gallery - Side by side on all devices */}
          <div className="col-span-6 sm:col-span-6 lg:col-span-7 space-y-2 sm:space-y-4">
            <div className="relative aspect-[3/4] bg-[#F2ECE4] overflow-hidden border border-[#E5DDD0] rounded-lg sm:rounded-none">
              <img
                src={product.images?.[selectedImageIndex] || product.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                alt={product.name}
                onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
              />

              {product.badge && (
                <span className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-[#111111] text-[#FAF8F5] text-[8px] xs:text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-sm">
                  {product.badge}
                </span>
              )}

              <button
                onClick={() => toggleWishlist(product)}
                className={`absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 xs:p-2 sm:p-3 rounded-full shadow-md transition-all ${
                  wishlisted
                    ? 'bg-[#111111] text-[#C5A880]'
                    : 'bg-[#FAF8F5]/90 text-neutral-800 hover:bg-[#FAF8F5]'
                }`}
                aria-label="Toggle Wishlist"
              >
                <Heart className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${wishlisted ? 'fill-[#C5A880]' : ''}`} />
              </button>
            </div>

            {/* Thumbnail navigation */}
            <div className="flex space-x-1.5 sm:space-x-3 overflow-x-auto pb-1 sm:pb-2 scrollbar-none">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-10 xs:w-12 sm:w-20 md:w-24 aspect-[3/4] shrink-0 overflow-hidden border-2 transition-all rounded-sm sm:rounded-none ${
                    selectedImageIndex === idx
                      ? 'border-[#111111] opacity-100 scale-102'
                      : 'border-[#E5DDD0] opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img || CANONICAL_DEFAULTS.PRODUCT}
                    alt={`${product.name} angle ${idx + 1}`}
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Essentials trust reassurance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-3 pt-3 sm:pt-6 border-t border-[#E8E1D7] text-left">
              <div className="p-2 sm:p-3 bg-[#F5EFE6] border border-[#E3D9CC] rounded-sm">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A68962] mb-0.5 sm:mb-1" />
                <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider block text-neutral-900">
                  Couture Craftsmanship
                </span>
                <p className="text-[8px] sm:text-[10px] text-neutral-600 mt-0.5 hidden xs:block">Hand-cut & hand-embellished in Lagos.</p>
              </div>

              <div className="p-2 sm:p-3 bg-[#F5EFE6] border border-[#E3D9CC] rounded-sm">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A68962] mb-0.5 sm:mb-1" />
                <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider block text-neutral-900">
                  Worldwide DHL Express
                </span>
                <p className="text-[8px] sm:text-[10px] text-neutral-600 mt-0.5 hidden xs:block">Priority insured door-to-door delivery.</p>
              </div>

              <div className="p-2 sm:p-3 bg-[#F5EFE6] border border-[#E3D9CC] rounded-sm hidden sm:block">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A68962] mb-0.5 sm:mb-1" />
                <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider block text-neutral-900">
                  Keepsake Presentation
                </span>
                <p className="text-[8px] sm:text-[10px] text-neutral-600 mt-0.5">Arrives in gold-foiled rigid gift box.</p>
              </div>
            </div>
          </div>

          {/* Right: Product Purchase Form - Side by side on all devices */}
          <div className="col-span-6 sm:col-span-6 lg:col-span-5 space-y-3 sm:space-y-6 text-left">
            <div>
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-[#A68962] font-semibold block mb-0.5 sm:mb-1">
                {product.collectionName} COLLECTION
              </span>
              <h1 className="font-serif text-[clamp(1.15rem,2.4vw,2.5rem)] text-[#111111] font-medium leading-tight">
                {product.name}
              </h1>
              <p className="text-[10px] xs:text-xs sm:text-sm text-[#736B62] mt-0.5 sm:mt-1 font-sans">
                {product.subtitle}
              </p>

              {/* Price & Reviews */}
              <div className="flex flex-wrap items-center justify-between mt-2 sm:mt-4 pb-2 sm:pb-4 border-b border-[#E8E1D7] gap-2">
                <div className="flex items-baseline space-x-2">
                  <span className="font-serif text-lg xs:text-xl sm:text-3xl font-semibold text-[#111111]">
                    {formatPrice(product.priceUSD)}
                  </span>
                  {product.compareAtPriceUSD && product.compareAtPriceUSD > product.priceUSD && (
                    <>
                      <span className="text-xs xs:text-sm sm:text-base text-neutral-400 line-through font-serif">
                        {formatPrice(product.compareAtPriceUSD)}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        Save {Math.round(((product.compareAtPriceUSD - product.priceUSD) / product.compareAtPriceUSD) * 100)}%
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-[10px] sm:text-xs">
                  <div className="flex text-[#C5A880]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-[#C5A880]" />
                    ))}
                  </div>
                  <span className="text-neutral-600 font-medium ml-1">
                    5.0 ({product.reviewsCount})
                  </span>
                </div>
              </div>
            </div>

            {/* Colour Selector */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                <span className="font-medium tracking-wider uppercase text-neutral-800">
                  COLOUR: <span className="font-semibold text-black">{selectedColor.name}</span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#A68962] hidden xs:inline">{product.colors.length} Luxury Shades</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 rounded-full border transition-all ${
                      selectedColor.name === c.name
                        ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-neutral-900 scale-110'
                        : 'border-neutral-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selector with Size Guide Trigger */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                <span className="font-medium tracking-wider uppercase text-neutral-800">
                  SIZE: <span className="font-semibold text-black">{selectedSize}</span>
                </span>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center space-x-1 text-[#A68962] hover:underline uppercase tracking-wider text-[9px] sm:text-[11px]"
                >
                  <Ruler className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Size Guide</span>
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-2">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-1.5 sm:py-2.5 px-1 sm:px-2 text-center text-[10px] sm:text-xs tracking-wider transition-all border ${
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

            {/* Personalisation & Monogramming Option */}
            <div className="bg-[#F5EFE6] border border-[#E5DDD0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePersonalisation}
                    onChange={(e) => setEnablePersonalisation(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-400 text-neutral-900 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold tracking-wider uppercase text-neutral-900">
                    Add Bespoke Embroidery (+Complimentary)
                  </span>
                </label>
              </div>

              {enablePersonalisation && (
                <div className="pt-2 space-y-3 border-t border-[#E5DDD0] text-xs">
                  <div>
                    <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                      Monogram / Embroidery Text (Max 24 characters)
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      placeholder="e.g. Mrs. Adeyemi, The Bride, 12.12.2025"
                      value={personalisationText}
                      onChange={(e) => setPersonalisationText(e.target.value)}
                      className="w-full bg-white border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                        Bridal Party Role
                      </label>
                      <select
                        value={personalisationRole}
                        onChange={(e) => setPersonalisationRole(e.target.value)}
                        className="w-full bg-white border border-neutral-300 px-2 py-1.5 focus:outline-none"
                      >
                        <option value="Bride">The Bride</option>
                        <option value="Maid of Honour">Maid of Honour</option>
                        <option value="Bridesmaid">Bridesmaid</option>
                        <option value="Mother of the Bride">Mother of the Bride</option>
                        <option value="Mother of the Groom">Mother of the Groom</option>
                        <option value="Flower Girl">Flower Girl</option>
                        <option value="Custom">Custom Text Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                        Placement
                      </label>
                      <select
                        value={placement}
                        onChange={(e) => setPlacement(e.target.value as any)}
                        className="w-full bg-white border border-neutral-300 px-2 py-1.5 focus:outline-none"
                      >
                        <option value="Back">Back Center (Signature)</option>
                        <option value="Chest Pocket">Left Chest</option>
                        <option value="Cuff">Wrist Cuff Detail</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1">
                      Embroidery Typography Style
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {(['Romantic Script', 'Modern Serif', 'Royal Monogram'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setFontStyle(style)}
                          className={`py-1 px-2 border text-[11px] ${
                            fontStyle === style
                              ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                              : 'border-neutral-300 bg-white text-neutral-700'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stock status indicator banners */}
            {(product.stockStatus === 'out_of_stock' || product.stockQuantity === 0) ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs space-y-1">
                <span className="font-semibold block uppercase tracking-wider text-[10px] text-rose-800">
                  Currently Sold Out
                </span>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  This atelier design is currently out of stock. Contact our bridal concierge via WhatsApp below to reserve from our next handcrafted batch.
                </p>
              </div>
            ) : product.stockStatus === 'low_stock' || (product.stockQuantity > 0 && product.stockQuantity <= 5) ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-medium text-[11px]">
                  High Demand Atelier Piece: Only {product.stockQuantity} piece{product.stockQuantity > 1 ? 's' : ''} remaining
                </span>
              </div>
            ) : product.stockStatus === 'made_to_order' ? (
              <div className="p-2.5 bg-[#FAF6F0] border border-[#E0D5C3] text-neutral-800 rounded-xl text-xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#A58860] shrink-0" />
                <span className="font-medium text-[11px]">
                  Handmade Couture Order: Custom made to your measurements in 7–14 days
                </span>
              </div>
            ) : null}

            {/* Quantity Stepper & Add to Bag */}
            <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
              <div className="flex space-x-1.5 sm:space-x-3">
                <div className="flex items-center border border-neutral-300 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stockStatus === 'out_of_stock' || product.stockQuantity === 0}
                    className="px-2 sm:px-3 py-2 sm:py-3 hover:bg-neutral-100 text-neutral-700 disabled:opacity-40"
                  >
                    <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <span className="px-2 sm:px-3 text-xs sm:text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={product.stockStatus === 'out_of_stock' || product.stockQuantity === 0}
                    className="px-2 sm:px-3 py-2 sm:py-3 hover:bg-neutral-100 text-neutral-700 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stockStatus === 'out_of_stock' || product.stockQuantity === 0}
                  className={`flex-1 py-2.5 sm:py-4 px-2 sm:px-4 text-[9px] xs:text-[10px] sm:text-xs tracking-wide font-semibold transition-colors flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-sm font-sans whitespace-nowrap ${
                    product.stockStatus === 'out_of_stock' || product.stockQuantity === 0
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed border border-neutral-300'
                      : 'bg-[#111111] text-[#FAF8F5] hover:bg-[#C5A880]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>
                    {product.stockStatus === 'out_of_stock' || product.stockQuantity === 0
                      ? 'Currently Sold Out'
                      : `Add To Bag · ${formatPrice(product.priceUSD * quantity)}`}
                  </span>
                </button>
              </div>

              {/* WhatsApp Direct Order */}
              <a
                href={generateWhatsAppInquiry()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-neutral-900 bg-white text-neutral-900 py-2 sm:py-3.5 px-2 sm:px-4 text-[9px] xs:text-[10px] sm:text-xs tracking-wide font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors flex items-center justify-center space-x-1.5 sm:space-x-2 font-sans"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25D366]" />
                <span className="truncate">Order & Customise Via WhatsApp</span>
              </a>
            </div>

            {/* Production and Shipping Timeline */}
            <div className="border-t border-[#E8E1D7] pt-4 space-y-2 text-xs text-neutral-600">
              <div className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                <p>
                  <strong>Made to Order:</strong> Standard production takes 5–7 business days. Personalised embroidery orders dispatch within 7–10 days.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Truck className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                <p>
                  <strong>Global Express:</strong> 3–5 business days to UK, USA, Canada, Australia & Europe via DHL Priority Express.
                </p>
              </div>
            </div>

            {/* Accordion Tabs */}
            <div className="border-t border-[#E8E1D7] divide-y divide-[#E8E1D7] pt-2 text-xs">
              <div>
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'details' ? ('' as any) : 'details')}
                  className="w-full py-3.5 flex justify-between items-center text-left font-serif uppercase tracking-widest text-sm font-semibold text-neutral-900"
                >
                  <span>Couture Description & Notes</span>
                  <span>{activeAccordion === 'details' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'details' && (
                  <div className="pb-4 space-y-2 text-neutral-600 leading-relaxed font-sans">
                    <p>{product.description}</p>
                    <p>Designed with generous wrap coverage, inner ties for secure fit, and outer matching sash.</p>
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'fabric' ? ('' as any) : 'fabric')}
                  className="w-full py-3.5 flex justify-between items-center text-left font-serif uppercase tracking-widest text-sm font-semibold text-neutral-900"
                >
                  <span>Fabric & Care Instructions</span>
                  <span>{activeAccordion === 'fabric' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'fabric' && (
                  <div className="pb-4 space-y-2 text-neutral-600 leading-relaxed font-sans">
                    <p><strong>Primary Fabric:</strong> {product.materials || 'Luxury Silk & Fine Embellishments'}</p>
                    <p><strong>Care:</strong> Dry clean recommended. Alternatively, gentle hand wash in lukewarm water with silk-safe detergent. Steam on low silk setting.</p>
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? ('' as any) : 'shipping')}
                  className="w-full py-3.5 flex justify-between items-center text-left font-serif uppercase tracking-widest text-sm font-semibold text-neutral-900"
                >
                  <span>Worldwide Delivery & Returns</span>
                  <span>{activeAccordion === 'shipping' ? ('' as any) : 'shipping'}</span>
                </button>
                {activeAccordion === 'shipping' && (
                  <div className="pb-4 space-y-2 text-neutral-600 leading-relaxed font-sans">
                    <p>Shipped directly from our essentials house in Lagos, Nigeria to over 15 countries worldwide.</p>
                    <p>Complimentary worldwide express shipping on orders over $300 USD.</p>
                    <p>Due to the bespoke nature of our garments and personal embroidery, custom items are non-refundable but covered by our essentials fit guarantee.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real Bride Testimonials for this piece */}
        <div className="mt-20 pt-12 border-t border-[#E5DDD0]">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#A68962] font-semibold block mb-1">
              LOVE NOTES
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-neutral-900 uppercase">
              WHAT OUR BRIDES SAY
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                name: 'Chidinma O.',
                location: 'London, UK',
                text: 'The Amanda robe was pure poetry on my wedding morning. The 3D petals caught the sunrise light during our makeup prep and my photographer could not stop taking pictures!',
                date: 'October 2024',
              },
              {
                name: 'Khadija M.',
                location: 'Dubai, UAE',
                text: 'The weight of the silk is extraordinary. Real luxury fabric, not lightweight polyester. My mother cried when she saw me in my Lariel robe.',
                date: 'January 2025',
              },
              {
                name: 'Vanessa A.',
                location: 'Atlanta, USA',
                text: 'Ordered 8 bridesmaids robes plus my bridal robe. Every single girl loved her fit. The embroidery was crisp and beautiful. Arrived in Atlanta in 4 days!',
                date: 'February 2025',
              },
            ].map((review, i) => (
              <div key={i} className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] flex flex-col justify-between">
                <div>
                  <div className="flex text-[#C5A880] mb-2">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#C5A880]" />
                    ))}
                  </div>
                  <p className="text-xs text-[#524B43] italic font-serif leading-relaxed">
                    “{review.text}”
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#EAE2D6] flex justify-between items-center text-[10px] text-neutral-500">
                  <span className="font-semibold text-neutral-900">{review.name} ({review.location})</span>
                  <span>{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complete the Look / Recommended Pieces */}
        <div className="mt-24 pt-12 border-t border-[#E5DDD0]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">
              Complete The Bridal Morning
            </h3>
            <button
              onClick={() => navigateToCategory('accessories')}
              className="text-xs tracking-wide font-semibold text-[#A68962] hover:underline font-sans"
            >
              View All Accessories →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsSizeGuideOpen(false)}
          />

          <div className="relative bg-[#FAF8F5] max-w-2xl w-full p-6 sm:p-8 border border-[#E5DDD0] shadow-2xl text-left z-10">
            <div className="flex justify-between items-center pb-4 border-b border-[#E8E1D7]">
              <div>
                <h3 className="font-serif text-xl text-neutral-900 font-medium">Lariel Size & Fit Guide</h3>
                <p className="text-xs text-neutral-500 font-sans">Handcrafted with generous luxury drape</p>
              </div>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="text-neutral-500 hover:text-black font-semibold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F2ECE4] text-neutral-900 border-b border-[#E5DDD0]">
                    <th className="p-2.5 text-left font-serif uppercase tracking-wider">Size</th>
                    <th className="p-2.5 text-left font-serif uppercase tracking-wider">Bust (in)</th>
                    <th className="p-2.5 text-left font-serif uppercase tracking-wider">Waist (in)</th>
                    <th className="p-2.5 text-left font-serif uppercase tracking-wider">Hips (in)</th>
                    <th className="p-2.5 text-left font-serif uppercase tracking-wider">UK / US Equivalent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE3D8] text-neutral-700">
                  <tr>
                    <td className="p-2.5 font-semibold">XS</td>
                    <td className="p-2.5">30 – 32"</td>
                    <td className="p-2.5">24 – 26"</td>
                    <td className="p-2.5">34 – 36"</td>
                    <td className="p-2.5">UK 6 / US 2</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">S</td>
                    <td className="p-2.5">33 – 35"</td>
                    <td className="p-2.5">26 – 28"</td>
                    <td className="p-2.5">36 – 38"</td>
                    <td className="p-2.5">UK 8-10 / US 4-6</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">M</td>
                    <td className="p-2.5">36 – 38"</td>
                    <td className="p-2.5">29 – 31"</td>
                    <td className="p-2.5">39 – 41"</td>
                    <td className="p-2.5">UK 12 / US 8</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">L</td>
                    <td className="p-2.5">39 – 41"</td>
                    <td className="p-2.5">32 – 34"</td>
                    <td className="p-2.5">42 – 44"</td>
                    <td className="p-2.5">UK 14 / US 10</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">XL</td>
                    <td className="p-2.5">42 – 45"</td>
                    <td className="p-2.5">35 – 38"</td>
                    <td className="p-2.5">45 – 48"</td>
                    <td className="p-2.5">UK 16-18 / US 12-14</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">XXL</td>
                    <td className="p-2.5">46 – 50"</td>
                    <td className="p-2.5">39 – 43"</td>
                    <td className="p-2.5">49 – 53"</td>
                    <td className="p-2.5">UK 20-22 / US 16-18</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-[#F2ECE4] text-[11px] text-neutral-700">
              <p className="font-semibold text-neutral-900 mb-0.5">Need Bespoke Tailored Measurements?</p>
              <p>
                Select "Custom Size" during checkout or message us on WhatsApp with your exact height, bust, waist, and floor length requirements.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
