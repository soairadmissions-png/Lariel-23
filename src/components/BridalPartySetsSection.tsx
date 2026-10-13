import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Eye, Heart, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import completeSetImg from '../assets/images/regenerated_image_1788961847724.jpg';
import bridalNightSetImg from '../assets/images/regenerated_image_1788961850105.jpg';
import gettingReadySetImg from '../assets/images/regenerated_image_1788961850750.jpg';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface BridalPartySetsSectionProps {
  products: Product[];
}

export const BridalPartySetsSection: React.FC<BridalPartySetsSectionProps> = ({ products }) => {
  const {
    formatPrice,
    navigateToProduct,
    navigateToCategory,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isWishlisted,
  } = useShop();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Cards defined in prompt:
  // Card 01: The Complete Beauty Set (Robe + Scrunchie + Hair Bonnet + Satin Pillowcase)
  // Card 02: The Bridal Night Set (PJ + Face Mask + Hair Bonnet + Indoor Flip Flop)
  // Card 03: The Get-Ready Set (Robe + Indoor Flip Flop + Hair Bonnet + Mini Fan)
  const setCards = [
    {
      id: 'complete-robe-set',
      title: 'The Complete Beauty Set',
      subtitle: 'Robe + Scrunchie + Hair Bonnet + Satin Pillowcase',
      items: ['Robe', 'Scrunchie', 'Hair Bonnet', 'Satin Pillowcase'],
      priceUSD: 285,
      image: completeSetImg,
      badge: 'Bestselling Box',
      description: 'The complete luxury getting-ready gift box with 100% Mulberry silk essentials to protect hair, skin, and makeup.',
    },
    {
      id: 'bridal-night-set',
      title: 'The Bridal Night Set',
      subtitle: 'PJ + Face Mask + Hair Bonnet + Indoor Flip Flop',
      items: ['PJ Set', 'Face Mask', 'Hair Bonnet', 'Indoor Flip Flop'],
      priceUSD: 245,
      image: bridalNightSetImg,
      badge: 'The Eve Ritual',
      description: 'For the eve before forever. Pure silk pyjamas paired with a plush padded sleep eye mask and cloud slippers.',
    },
    {
      id: 'getting-ready-set',
      title: 'The Get-Ready Set',
      subtitle: 'Robe + Indoor Flip Flop + Hair Bonnet + Mini Fan',
      items: ['Robe', 'Indoor Flip Flop', 'Hair Bonnet', 'Mini Fan'],
      priceUSD: 230,
      image: gettingReadySetImg,
      badge: 'Suite Essential',
      description: 'The bridal suite lifesaver. Keeps your makeup set, provides personal breeze, and guarantees photo elegance.',
    },
  ];

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -380 : 380;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleCardClick = (cardId: string) => {
    navigateToProduct(cardId);
  };

  const handleQuickAdd = (e: React.MouseEvent, card: typeof setCards[0]) => {
    e.stopPropagation();
    const product = products.find((p) => p.id === card.id);
    if (product) {
      addToCart(product, product.colors[0], product.sizes[0] || 'Standard', 1);
    }
  };

  return (
    <section id="section-sets" className="py-16 sm:py-24 bg-[#F7F2EA] text-[#1E1B18] border-b border-[#E8DFCFC] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header - Responsive row matching desktop */}
        <div className="flex flex-row items-end justify-between mb-6 sm:mb-10 lg:mb-12 gap-2 sm:gap-4">
          <div className="space-y-1 sm:space-y-2 text-left max-w-2xl">
            <span className="text-[9px] xs:text-[10px] sm:text-[11px] tracking-wide text-[#A68962] font-medium font-sans block">
              Section 03 · Curated Suite Sets
            </span>
            <h2 className="font-serif text-[clamp(1.25rem,2.8vw,3rem)] font-normal text-[#1E1B18] leading-tight">
              Bridal Party Sets
            </h2>
            <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-sans text-[#6E645A] leading-relaxed">
              Everything you need for the perfect getting-ready moment.
            </p>
          </div>

          {/* Carousel Arrows - Always visible and responsive across all screens */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-[#D8CEBF] text-[#1E1B18] hover:bg-[#FAF8F5] hover:border-[#A68962] disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[1.5]" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-[#D8CEBF] text-[#1E1B18] hover:bg-[#FAF8F5] hover:border-[#A68962] disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Larger Visual Editorial Cards Carousel */}
        <div className="relative -mx-3 xs:-mx-4 sm:-mx-6 lg:-mx-8 px-3 xs:px-4 sm:px-6 lg:px-8">
          <div
            ref={scrollContainerRef}
            className="flex gap-3 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-4 pt-1"
          >
            {setCards.map((card, idx) => {
              const matchedProduct = products.find((p) => p.id === card.id);
              const wishlisted = matchedProduct ? isWishlisted(matchedProduct.id) : false;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className="w-[calc(65%-8px)] xs:w-[calc(55%-10px)] sm:w-[340px] md:w-[380px] lg:w-[calc(33.333%-16px)] shrink-0 snap-start bg-[#FAF8F5] rounded-xl sm:rounded-2xl border border-[#E5DACD] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group cursor-pointer flex flex-col"
                >
                  {/* Image Container with Editorial Aspect */}
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#ECE4D8]">
                    <img
                      src={card.image || CANONICAL_DEFAULTS.CATEGORY_PARTY}
                      alt={card.title}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_PARTY)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span className="bg-[#1A1614] text-[#FAF8F5] text-[9px] tracking-[0.2em] uppercase font-semibold px-3 py-1 rounded-full shadow-xs">
                        {card.badge}
                      </span>
                    </div>

                    {/* Wishlist Button */}
                    {matchedProduct && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(matchedProduct);
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 z-10 shadow-xs ${
                          wishlisted
                            ? 'bg-[#1A1614] text-[#C5A880]'
                            : 'bg-[#FAF8F5]/85 text-neutral-800 hover:bg-[#FAF8F5] hover:text-[#C5A880]'
                        }`}
                        aria-label="Wishlist"
                      >
                        <Heart className={`w-4 h-4 ${wishlisted ? 'fill-[#C5A880]' : ''}`} />
                      </button>
                    )}

                    {/* Quick View overlay */}
                    {matchedProduct && (
                      <div className="absolute inset-x-4 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickViewProduct(matchedProduct);
                          }}
                          className="w-full bg-[#1A1614]/90 backdrop-blur-xs text-[#FAF8F5] text-[10.5px] tracking-[0.2em] uppercase py-2.5 rounded-full hover:bg-[#C5A880] hover:text-[#1A1614] transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Quick View Set</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 xs:p-4 sm:p-6 flex flex-col flex-1 text-left justify-between space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-serif text-base xs:text-lg sm:text-xl text-[#1E1B18] font-normal tracking-wide group-hover:text-[#A68962] transition-colors">
                          {card.title}
                        </h3>
                        <span className="text-xs sm:text-sm font-semibold text-[#1E1B18] whitespace-nowrap">
                          {formatPrice(card.priceUSD)}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-[#6E645A] font-sans leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                    </div>

                    {/* Package Included Items Breakdown */}
                    <div className="space-y-1 sm:space-y-1.5 pt-1.5 sm:pt-2 border-t border-[#EDE4D8]">
                      <span className="text-[8.5px] sm:text-[9.5px] tracking-[0.2em] sm:tracking-[0.25em] uppercase text-[#A68962] font-semibold block">
                        CURATED 4-PIECE BUNDLE:
                      </span>
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {card.items.map((item, i) => (
                          <span
                            key={i}
                            className="bg-[#F2ECE4] text-[#4E453D] text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[#E5DACD] font-medium"
                          >
                            + {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-1.5 sm:pt-2">
                      <button
                        onClick={(e) => handleQuickAdd(e, card)}
                        className="w-full bg-[#1E1B18] text-[#FAF8F5] hover:bg-[#C5A880] hover:text-[#1E1B18] text-[10.5px] sm:text-xs tracking-wide font-medium py-2.5 sm:py-3 rounded-full transition-colors flex items-center justify-center space-x-1.5 sm:space-x-2 shadow-xs font-sans"
                      >
                        <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Add Complete Set To Bag</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 sm:mt-12 text-center">
          <button
            onClick={() => navigateToCategory('sets')}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm tracking-wide font-medium text-[#1E1B18] border-b border-[#A68962]/50 hover:border-[#A68962] hover:text-[#A68962] transition-all group py-2 font-sans"
          >
            <span>Explore Bridal Party Sets</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
