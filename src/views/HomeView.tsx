import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ShopProductCarousel } from '../components/ShopProductCarousel';
import { BridalPartySetsSection } from '../components/BridalPartySetsSection';
import { PersonalisedRobesFeature } from '../components/PersonalisedRobesFeature';
import heroBrideImg from '../assets/images/regenerated_image_1788952915584.png';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const HomeView: React.FC = () => {
  const { navigateToCategory, products, siteSettings } = useShop();

  const published = products.filter((p) => p.status !== 'draft' && p.status !== 'archived');

  // 1. SECTION 01 — BRIDAL ROBES
  const section01Products = published.filter((p) => p.category === 'bridal');

  // 2. SECTION 02 — BRIDESMAIDS ROBES
  const section02Products = published.filter((p) => p.category === 'bridesmaids');

  // 3. SECTION 03 — BRIDAL PARTY SETS (Rendered via BridalPartySetsSection)
  const section03Products = published.filter((p) => p.category === 'sets');

  // 4. SECTION 04 — RICH AFRICAN HERITAGE
  const section04Products = published.filter((p) => p.category === 'adire');

  // 5. SECTION 05 — PYJAMAS
  const section05Products = published.filter((p) => p.category === 'pyjamas');

  // 6. SECTION 06 — COMPLETE THE LOOK
  const section06Products = published.filter((p) => p.category === 'accessories' || p.category === 'personalised');

  // 7. SECTION 07 — JUNIOR / KIDS ROBES
  const section07Products = published.filter((p) => p.category === 'junior');

  // 9. SECTION 09 — NEW ARRIVALS
  const section09Products = published.filter((p) => p.isNew || p.isBestSeller).slice(0, 8);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
              <h1
                className="font-serif font-normal text-[clamp(1.35rem,3.8vw,4.25rem)] text-[#1E1B18] leading-[1.18] sm:leading-[1.25] tracking-normal"
              >
                The Art of the <br className="inline" />
                <span
                  className="text-[#A8885D] font-serif italic font-normal"
                >
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
                  onClick={() => scrollToSection('section-bridal-robes')}
                  className="inline-flex items-center justify-center px-3.5 xs:px-4.5 sm:px-7 md:px-8 py-2 xs:py-2.5 sm:py-3.5 bg-[#181614] text-[#FAF8F5] text-[9px] xs:text-[10px] sm:text-xs tracking-wide font-semibold hover:bg-[#C5A880] transition-all duration-300 shadow-[0_4px_20px_rgba(24,22,20,0.12)] group border border-[#181614] hover:border-[#C5A880] rounded-full whitespace-nowrap"
                >
                  <span>Shop Bridal Robes</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 transition-transform duration-300 group-hover:translate-x-1 text-[#C5A880] group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: Editorial lifestyle photograph */}
            <div className="col-span-5 sm:col-span-6 lg:col-span-7 relative flex items-center justify-end w-full">
              <div className="relative w-full max-w-[200px] xs:max-w-[240px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[480px] xl:max-w-[500px]">
                <div className="relative w-full bg-transparent p-0 overflow-hidden rounded-xl xs:rounded-2xl sm:rounded-3xl group shadow-[0_12px_35px_rgba(40,32,24,0.1)]">
                  <img
                    src={siteSettings?.homeHeroImage || heroBrideImg || CANONICAL_DEFAULTS.HERO_MAIN}
                    alt="Elegant adult bride seated gracefully on a sophisticated cream couch wearing a luxury ivory satin bridal robe with delicate lace detailing and subtle gold Bride embroidery"
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.HERO_MAIN)}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[2/3] object-cover object-center rounded-xl xs:rounded-2xl sm:rounded-3xl transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 01 — BRIDAL ROBES */}
      <ShopProductCarousel
        id="section-bridal-robes"
        eyebrow="Section 01 · For The Queen"
        heading="Bridal Robes"
        subheading="For the bride who deserves an unforgettable beginning."
        products={section01Products}
        ctaText="View All Bridal Robes"
        onCtaClick={() => navigateToCategory('bridal')}
      />

      {/* SECTION 02 — BRIDESMAIDS ROBES */}
      <ShopProductCarousel
        id="section-bridesmaids"
        eyebrow="Section 02 · Sisterhood & Love"
        heading="Bridesmaids Robes"
        subheading="Because your girls deserve to feel just as special."
        products={section02Products}
        ctaText="Shop Bridesmaids"
        onCtaClick={() => navigateToCategory('bridesmaids')}
      />

      {/* SECTION 03 — BRIDAL PARTY SETS */}
      <BridalPartySetsSection products={section03Products} />

      {/* SECTION 04 — RICH AFRICAN HERITAGE */}
      <ShopProductCarousel
        id="section-adire"
        darkTheme={true}
        eyebrow="Section 04 · Yoruba Adire Artistry"
        heading="Rich African Heritage"
        subheading="Where bridal elegance meets African artistry."
        products={section04Products}
        ctaText="Discover The Heritage"
        onCtaClick={() => navigateToCategory('adire')}
      />

      {/* SECTION 05 — PYJAMAS */}
      <ShopProductCarousel
        id="section-pyjamas"
        eyebrow="Section 05 · Loungewear & Eve Ritual"
        heading="Pyjamas"
        subheading="Luxury doesn't stop when the wedding day ends."
        products={section05Products}
        ctaText="Shop Pyjamas"
        onCtaClick={() => navigateToCategory('pyjamas')}
      />

      {/* SECTION 06 — COMPLETE THE LOOK */}
      <ShopProductCarousel
        id="section-accessories"
        eyebrow="Section 06 · Finishing Touches"
        heading="Complete The Look"
        subheading="Beautiful finishing touches for your bridal moments."
        products={section06Products}
        ctaText="Shop Accessories"
        onCtaClick={() => navigateToCategory('accessories')}
      />

      {/* SECTION 07 — JUNIOR / KIDS ROBES */}
      <ShopProductCarousel
        id="section-junior"
        eyebrow="Section 07 · Little Princesses"
        heading="Little Ones, Big Moments"
        subheading="Make every member of the bridal party feel special."
        products={section07Products}
        ctaText="Shop Junior Robes"
        onCtaClick={() => navigateToCategory('junior')}
      />

      {/* SECTION 08 — PERSONALISED ROBES */}
      <PersonalisedRobesFeature />

      {/* SECTION 09 — NEW ARRIVALS */}
      <ShopProductCarousel
        id="section-new-arrivals"
        eyebrow="Section 09 · Fresh From Essentials"
        heading="Just In"
        subheading="Meet the newest pieces from Lariel."
        products={section09Products}
        ctaText="View All New Arrivals"
        onCtaClick={() => navigateToCategory('new')}
      />
    </div>
  );
};
