import React, { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import { PersonalisedRobesFeature } from '../components/PersonalisedRobesFeature';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

type ProductTab =
  | 'all'
  | 'bridal'
  | 'bridesmaids'
  | 'sets'
  | 'adire'
  | 'pyjamas'
  | 'junior';

const normalizeCategory = (cat?: string): string => {
  if (!cat) return '';
  return cat.trim().toLowerCase().replace(/[_\s-]+/g, ' ');
};

const isBridalRobes = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (norm === 'bridal' || norm === 'bridal robes' || norm === 'bridal robe') {
    return true;
  }
  return (
    norm.includes('bridal') &&
    !norm.includes('bridesmaid') &&
    !norm.includes('party') &&
    !norm.includes('pyjama') &&
    !norm.includes('pajama')
  );
};

const isBridesmaids = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (
    norm === 'bridesmaids' ||
    norm === 'bridesmaid' ||
    norm === 'bridesmaids robes' ||
    norm === 'bridesmaid robes'
  ) {
    return true;
  }
  return norm.includes('bridesmaid');
};

const isBridalPartySets = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (
    norm === 'sets' ||
    norm === 'set' ||
    norm === 'bridal party sets' ||
    norm === 'bridal party set' ||
    norm === 'party sets' ||
    norm === 'party set'
  ) {
    return true;
  }
  return (
    (norm.includes('party') && norm.includes('set')) ||
    (norm.includes('bridal') && norm.includes('set'))
  );
};

const isAdire = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (
    norm === 'adire' ||
    norm === 'african heritage' ||
    norm === 'rich african heritage' ||
    norm === 'adire artistry'
  ) {
    return true;
  }
  return norm.includes('adire') || norm.includes('heritage');
};

const isPyjamas = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (
    norm === 'pyjamas' ||
    norm === 'pyjama' ||
    norm === 'bridal pyjamas' ||
    norm === 'pajamas' ||
    norm === 'pajama'
  ) {
    return true;
  }
  return norm.includes('pyjama') || norm.includes('pajama') || norm.includes('pj');
};

const isJuniorRobes = (cat?: string): boolean => {
  const norm = normalizeCategory(cat);
  if (!norm) return false;
  if (
    norm === 'junior' ||
    norm === 'junior robes' ||
    norm === 'junior robe' ||
    norm === 'junior & kids robes' ||
    norm === 'junior and kids robes' ||
    norm === 'kids robes' ||
    norm === 'kids robe'
  ) {
    return true;
  }
  return norm.includes('junior') || norm.includes('kids');
};

export const HomeView: React.FC = () => {
  const { products, siteSettings } = useShop();
  const [activeTab, setActiveTab] = useState<ProductTab>('all');

  // Filter to only products eligible for storefront display (published)
  const publishedProducts = useMemo(() => {
    return products.filter((p) => p.status !== 'draft' && p.status !== 'archived');
  }, [products]);

  // Tab definitions and counts for all 7 required tabs
  const tabs = useMemo(() => {
    return [
      { id: 'all' as ProductTab, label: 'ALL', count: publishedProducts.length },
      {
        id: 'bridal' as ProductTab,
        label: 'BRIDAL ROBES',
        count: publishedProducts.filter((p) => isBridalRobes(p.category)).length,
      },
      {
        id: 'bridesmaids' as ProductTab,
        label: 'BRIDESMAIDS',
        count: publishedProducts.filter((p) => isBridesmaids(p.category)).length,
      },
      {
        id: 'sets' as ProductTab,
        label: 'BRIDAL PARTY SETS',
        count: publishedProducts.filter((p) => isBridalPartySets(p.category)).length,
      },
      {
        id: 'adire' as ProductTab,
        label: 'ADIRE',
        count: publishedProducts.filter((p) => isAdire(p.category)).length,
      },
      {
        id: 'pyjamas' as ProductTab,
        label: 'PYJAMAS',
        count: publishedProducts.filter((p) => isPyjamas(p.category)).length,
      },
      {
        id: 'junior' as ProductTab,
        label: 'JUNIOR ROBES',
        count: publishedProducts.filter((p) => isJuniorRobes(p.category)).length,
      },
    ];
  }, [publishedProducts]);

  // Dynamically filtered products for the active tab
  const displayedProducts = useMemo(() => {
    if (activeTab === 'bridal') {
      return publishedProducts.filter((p) => isBridalRobes(p.category));
    }
    if (activeTab === 'bridesmaids') {
      return publishedProducts.filter((p) => isBridesmaids(p.category));
    }
    if (activeTab === 'sets') {
      return publishedProducts.filter((p) => isBridalPartySets(p.category));
    }
    if (activeTab === 'adire') {
      return publishedProducts.filter((p) => isAdire(p.category));
    }
    if (activeTab === 'pyjamas') {
      return publishedProducts.filter((p) => isPyjamas(p.category));
    }
    if (activeTab === 'junior') {
      return publishedProducts.filter((p) => isJuniorRobes(p.category));
    }
    // 'all' tab: Displays every eligible homepage product
    return publishedProducts;
  }, [publishedProducts, activeTab]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHeroShopBridalClick = () => {
    setActiveTab('bridal');
    scrollToSection('section-bridal-robes');
  };

  return (
    <div className="w-full bg-[#FAF8F5] text-[#1E1B18] font-sans">
      {/* SHOP HERO */}
      <section
        id="shop-hero"
        className="relative w-full overflow-hidden bg-[#FAF7F2] py-6 sm:py-8 lg:py-10 border-b border-[#E8DFCF]"
      >
        {/* Soft champagne & golden radiance glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FAF1E3] rounded-full blur-3xl opacity-60 pointer-events-none z-0" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-[#EFE5D5]/50 rounded-full blur-3xl opacity-50 pointer-events-none z-0" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-3 xs:px-4 sm:px-8 lg:px-12 xl:px-16 w-full">
          <div className="grid grid-cols-12 gap-3 xs:gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center sm:items-end">
            {/* LEFT SIDE: Eyebrow, Title, Description & CTA */}
            <div className="col-span-7 sm:col-span-6 lg:col-span-5 flex flex-col justify-end items-start text-left space-y-2 xs:space-y-3 sm:space-y-5 lg:pb-3">
              {/* Eyebrow */}
              <div className="inline-flex items-center space-x-2 sm:space-x-3">
                <span className="w-4 xs:w-5 sm:w-7 h-px bg-[#C5A880]" />
                <span className="text-[9px] xs:text-[10px] sm:text-xs tracking-wider text-[#9E7D52] font-semibold font-sans uppercase">
                  The Lariel Essentials
                </span>
              </div>

              {/* Headline with responsive fluid typography */}
              <h1 className="font-serif font-normal text-[clamp(1.35rem,3.8vw,4.25rem)] text-[#1E1B18] leading-[1.18] sm:leading-[1.25] tracking-normal">
                The Art of the <br className="inline" />
                <span className="text-[#A8885D] font-serif italic font-normal">
                  Bridal Morning.
                </span>
              </h1>

              {/* Supporting text */}
              <p className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm lg:text-[16px] text-[#5A524A] font-light leading-relaxed max-w-md font-sans">
                Luxury bridal robes and getting-ready essentials, thoughtfully made for unforgettable wedding mornings.
              </p>

              {/* CTA: “Shop Bridal Robes” */}
              <div className="pt-1 sm:pt-2 flex items-center w-auto">
                <button
                  onClick={handleHeroShopBridalClick}
                  className="inline-flex items-center justify-center px-3.5 xs:px-4.5 sm:px-7 md:px-8 py-2 xs:py-2.5 sm:py-3.5 bg-[#181614] text-[#FAF8F5] text-[9px] xs:text-[10px] sm:text-xs tracking-wide font-semibold hover:bg-[#C5A880] transition-all duration-300 shadow-[0_4px_20px_rgba(24,22,20,0.12)] group border border-[#181614] hover:border-[#C5A880] rounded-full whitespace-nowrap cursor-pointer"
                >
                  <span>Shop Bridal Robes</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 transition-transform duration-300 group-hover:translate-x-1 text-[#C5A880] group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: Editorial lifestyle photograph */}
            <div className="col-span-5 sm:col-span-6 lg:col-span-7 relative flex items-center justify-end w-full">
              <div className="relative w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[480px] xl:max-w-[500px]">
                <div className="relative w-full bg-transparent p-0 overflow-visible group">
                  <img
                    src={siteSettings?.homeHeroImage || CANONICAL_DEFAULTS.HERO_MAIN}
                    alt="Elegant adult bride seated gracefully on a sophisticated cream couch wearing a luxury ivory satin bridal robe with delicate lace detailing and subtle gold Bride embroidery"
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.HERO_MAIN)}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[2/3] object-contain object-bottom bg-transparent drop-shadow-[0_16px_30px_rgba(40,32,24,0.12)] transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UNIFIED PRODUCT COLLECTION SECTION WITH CATEGORY TABS */}
      <section
        id="section-bridal-robes"
        className="py-14 sm:py-20 lg:py-24 border-b border-[#EDE6DC] bg-[#FAF8F5] transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading / introductory content */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2 sm:space-y-3">
            <span className="text-[9px] xs:text-[10px] sm:text-[11px] tracking-wider text-[#A68962] font-semibold font-sans uppercase block">
              The Signature Collection
            </span>
            <h2 className="font-serif text-[clamp(1.5rem,3.2vw,3rem)] font-normal text-[#1E1B18] leading-tight">
              The Bridal House Collection
            </h2>
            <p className="text-[11px] xs:text-xs sm:text-sm font-sans text-[#6E645A] leading-relaxed">
              Luxury robes and morning essentials, thoughtfully designed for the unforgettable bride and her bridal party. Handcrafted in 22-momme liquid silk, French illusion tulle, and bespoke artisanal finishes.
            </p>
          </div>

          {/* Category Tabs: ALL | BRIDAL ROBES | BRIDESMAIDS | BRIDAL PARTY SETS | ADIRE | PYJAMAS | JUNIOR ROBES */}
          <div className="flex items-center justify-start lg:justify-center overflow-x-auto scrollbar-none mb-8 sm:mb-12 py-1 max-w-full">
            <div className="inline-flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 p-1 sm:p-1.5 bg-[#F2ECE4]/80 border border-[#E3D9CC] rounded-full shrink-0 shadow-2xs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 xs:px-4 sm:px-5 py-2 xs:py-2.5 sm:py-3 text-[10px] xs:text-[11px] sm:text-xs tracking-[0.12em] sm:tracking-[0.16em] font-semibold rounded-full border transition-all duration-300 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#181614] text-[#FAF8F5] border-[#181614] shadow-sm'
                        : 'bg-transparent text-[#5A524A] border-transparent hover:text-[#181614] hover:bg-white/60'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`ml-1.5 text-[9px] xs:text-[10px] ${
                        isActive ? 'text-[#C5A880]' : 'text-neutral-400'
                      }`}
                    >
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product grid */}
          {displayedProducts.length === 0 ? (
            <div className="py-16 text-center bg-[#F7F2EB] border border-[#E8DFCF] rounded-2xl max-w-md mx-auto p-8">
              <h3 className="font-serif text-lg text-[#1E1B18]">No pieces currently available</h3>
              <p className="text-xs text-[#78716A] mt-1 font-sans">
                Please check back soon or browse our other categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 xs:gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-10">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PROMOTIONAL SECTION: PERSONALISED ROBES EMBROIDERY */}
      <PersonalisedRobesFeature />
    </div>
  );
};
