import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { toTitleCase } from '../utils/text';

interface ShopProductCarouselProps {
  id?: string;
  heading: string;
  subheading?: string;
  eyebrow?: string;
  products: Product[];
  ctaText?: string;
  onCtaClick?: () => void;
  darkTheme?: boolean;
}

export const ShopProductCarousel: React.FC<ShopProductCarouselProps> = ({
  id,
  heading,
  subheading,
  eyebrow,
  products,
  ctaText,
  onCtaClick,
  darkTheme = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));
    }
  }, []);

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
  }, [checkScroll, products]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(':scope > div')?.offsetWidth || 300;
    const scrollAmount = direction === 'left' ? -(cardWidth + 24) * 2 : (cardWidth + 24) * 2;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 50) {
      scroll('right');
    } else if (diff < -50) {
      scroll('left');
    }
    touchStartX.current = null;
  };

  return (
    <section
      id={id}
      className={`py-16 sm:py-24 border-b ${
        darkTheme
          ? 'bg-[#2B1B17] text-[#FAF7F2] border-[#3D261C]'
          : 'bg-[#FAF8F5] text-[#1E1B18] border-[#EDE6DC]'
      } transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Responsive Row matching desktop */}
        <div className="flex flex-row items-end justify-between mb-6 sm:mb-10 lg:mb-12 gap-2 sm:gap-4">
          <div className="space-y-1 sm:space-y-2 text-left max-w-2xl">
            {eyebrow && (
              <span
                className={`text-[9px] xs:text-[10px] sm:text-[11px] tracking-wide font-medium font-sans block ${
                  darkTheme ? 'text-[#D4AF37]' : 'text-[#A68962]'
                }`}
              >
                {toTitleCase(eyebrow)}
              </span>
            )}
            <h2
              className={`font-serif text-[clamp(1.25rem,2.8vw,3rem)] font-normal leading-tight ${
                darkTheme ? 'text-[#FAF7F2]' : 'text-[#1E1B18]'
              }`}
            >
              {toTitleCase(heading)}
            </h2>
            {subheading && (
              <p
                className={`text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-sans leading-relaxed ${
                  darkTheme ? 'text-[#D2C5B8]' : 'text-[#6E645A]'
                }`}
              >
                {subheading}
              </p>
            )}
          </div>

          {/* Carousel Arrows Controls - Always visible and responsive across all screens */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border ${
                darkTheme
                  ? 'border-[#5A3A2E] text-[#FAF7F2] hover:bg-[#3D261C] disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'border-[#D8CEBF] text-[#1E1B18] hover:bg-[#F2ECE4] hover:border-[#A68962] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-[#D8CEBF]'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[1.5]" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border ${
                darkTheme
                  ? 'border-[#5A3A2E] text-[#FAF7F2] hover:bg-[#3D261C] disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'border-[#D8CEBF] text-[#1E1B18] hover:bg-[#F2ECE4] hover:border-[#A68962] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-[#D8CEBF]'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative -mx-3 xs:-mx-4 sm:-mx-6 lg:-mx-8 px-3 xs:px-4 sm:px-6 lg:px-8">
          <div
            ref={scrollContainerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-2.5 xs:gap-3 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-4 pt-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[calc(48%-6px)] xs:w-[calc(44%-8px)] sm:w-[calc(33.333%-14px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0 snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Progress Bar (Mobile/Tablet and Desktop feedback) */}
        <div className="mt-4 sm:mt-6 flex items-center justify-between">
          <div className="w-32 sm:w-48 h-1 bg-[#E8DFCFC] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                darkTheme ? 'bg-[#D4AF37]' : 'bg-[#A68962]'
              }`}
              style={{ width: `${Math.max(15, scrollProgress * 100)}%` }}
            />
          </div>

          {/* Swipe indicator hint for mobile */}
          <div className="text-[11px] tracking-wide sm:hidden text-neutral-400 font-sans">
            Swipe To Explore →
          </div>
        </div>

        {/* Bottom CTA */}
        {ctaText && (
          <div className="mt-10 sm:mt-12 text-center">
            <button
              onClick={onCtaClick}
              className={`inline-flex items-center space-x-2 text-xs sm:text-sm tracking-wide font-semibold transition-all group py-2 border-b ${
                darkTheme
                  ? 'text-[#FAF7F2] border-[#D4AF37]/50 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                  : 'text-[#1E1B18] border-[#A68962]/50 hover:border-[#A68962] hover:text-[#A68962]'
              }`}
            >
              <span>{toTitleCase(ctaText)}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
