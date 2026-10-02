import React from 'react';
import { ArrowRight, Globe, Award, Sparkles, Heart } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import laidePortraitImg from '../assets/images/laide_founder_portrait_1789650582034.jpg';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const FounderStorySection: React.FC = () => {
  const { setActiveView, setSelectedWorldTab, navigateToCategory, siteSettings } = useShop();

  const handleReadFullStory = () => {
    setSelectedWorldTab('story');
    setActiveView('the-lariel-world');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative w-full py-20 sm:py-24 bg-[#FAF7F2] border-t border-b border-[#EAE2D5] overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#F3E9D9]/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#EDE1D1]/50 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 max-w-[1360px] mx-auto px-3 xs:px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-12 gap-3 xs:gap-4 sm:gap-8 lg:gap-14 items-center">
          
          {/* LEFT: Laide's Editorial Portrait with Luxury Framing - Side by side on all devices */}
          <div className="col-span-5 flex justify-center">
            <div className="relative w-full max-w-[190px] xs:max-w-[220px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[460px]">
              
              {/* Outer decorative gold border offset */}
              <div className="absolute -inset-1.5 xs:-inset-2 sm:-inset-4 border border-[#D9C4A5] rounded-2xl sm:rounded-3xl -rotate-1 pointer-events-none hidden xs:block" />
              
              {/* Main portrait container */}
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_12px_35px_rgba(40,32,24,0.12)] bg-[#F4EDE2] border border-[#E5DDD0]">
                <img
                  src={siteSettings?.laidePortraitImage || laidePortraitImg || CANONICAL_DEFAULTS.FOUNDER_PORTRAIT}
                  alt="Laide, Founder and Creative Director of Lariel Essentials"
                  onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.FOUNDER_PORTRAIT)}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[3/4] object-cover object-top filter contrast-[1.03] transition-transform duration-700 hover:scale-[1.02]"
                />

                {/* Bottom subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1614]/80 via-transparent to-transparent pointer-events-none" />

                {/* Badge Overlay */}
                <div className="absolute bottom-2 xs:bottom-3 sm:bottom-5 left-2 xs:left-3 sm:left-5 right-2 xs:right-3 sm:right-5 text-white text-left">
                  <span className="text-[8px] xs:text-[9px] sm:text-[10px] tracking-widest text-[#E2CFA7] uppercase font-semibold font-sans block mb-0.5 sm:mb-1">
                    Founder & Creative Director
                  </span>
                  <h4 className="font-serif text-lg xs:text-xl sm:text-2xl text-[#FAF8F5] font-normal leading-tight">
                    Laide
                  </h4>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs text-[#E5DDD0] font-sans font-light mt-0.5 hidden xs:block">
                    Lariel Essentials · The Global Bridal House
                  </p>
                </div>
              </div>

              {/* Floating Essentials Provenance Tag */}
              <div className="absolute -bottom-3 xs:-bottom-4 sm:-bottom-6 -right-1 xs:-right-2 sm:-right-6 bg-white/95 backdrop-blur-md border border-[#E0D5C3] p-1.5 xs:p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-lg flex items-center space-x-1.5 sm:space-x-3.5 text-left max-w-[140px] xs:max-w-[160px] sm:max-w-[220px]">
                <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-[#FAF5EC] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#A68962]">
                  <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-wider font-semibold text-[#8C7A65]">Global Footprint</p>
                  <p className="text-[9px] sm:text-xs font-serif font-bold text-[#1E1B18] whitespace-nowrap">2,000+ Brides · 15+ Countries</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Authentic Story & Vision - Side by side on all devices */}
          <div className="col-span-7 text-left space-y-2 xs:space-y-3 sm:space-y-5 lg:space-y-6">
            {/* Section Eyebrow */}
            <div className="inline-flex items-center space-x-2 sm:space-x-3">
              <span className="w-5 sm:w-8 h-px bg-[#C5A880]" />
              <span className="text-[9px] xs:text-[10px] sm:text-xs tracking-wider text-[#A68962] font-semibold uppercase font-sans">
                The Woman Behind The House
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-serif text-[clamp(1.15rem,2.8vw,3rem)] text-[#1E1B18] font-normal leading-[1.18] sm:leading-[1.2]">
              “Your wedding morning is not a throwaway moment.{' '}
              <span className="italic text-[#A68962]">It deserves luxury.”</span>
            </h2>

            {/* Story Text */}
            <div className="space-y-2 sm:space-y-4 text-[10px] xs:text-[11px] sm:text-xs md:text-sm lg:text-base text-[#524B43] leading-relaxed font-sans font-light">
              <p>
                <strong className="font-medium text-[#1E1B18]">“Hi, I'm Laide.</strong> I didn’t start Lariel because I wanted to sell robes. I started it because I watched too many Nigerian brides get ready in oversized men’s shirts and cheap shiny robes that didn’t match the grandeur and luxury of their day.”
              </p>
              
              <p className="italic font-serif text-xs xs:text-sm sm:text-base lg:text-lg text-[#3D362F] pl-2 sm:pl-4 border-l-2 border-[#C5A880] py-0.5 sm:py-1 bg-[#FAF5EC]/60 rounded-r-md">
                “It’s the first time you get dressed as a wife. It’s the moment your mother zips you, your girls laugh with you, your photographer captures you forever.”
              </p>

              <p className="hidden xs:block">
                Started in 2016 from a small room in Lagos, Lariel Essentials has now dressed over <strong>2,000 brides across 15+ countries</strong>—from Lagos to London, Houston to Toronto, and Accra to Atlanta. Featured proudly on <em>BellaNaija Weddings</em>.
              </p>

              <p className="text-[9px] xs:text-[11px] sm:text-xs md:text-sm text-[#6E645A] hidden sm:block">
                With a degree in International Relations from Covenant University and an MSc in Political Science, I bring diplomacy, precision, and a global perspective to every design. Every Linda robe, every feather trim, and every ruffle is designed by me and hand-sewn with love by my team of women in Lagos—made to make you feel like <em>YOU</em>, only softer, more confident, and more iconic.
              </p>
            </div>

            {/* Signature Block */}
            <div className="pt-2 border-t border-[#EAE2D5] flex flex-wrap items-center justify-between gap-3 sm:gap-6">
              <div className="flex flex-col">
                <span className="font-['Runethia',cursive] font-runethia text-2xl xs:text-3xl sm:text-4xl text-[#A68962] leading-none">
                  With love, Laide
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-[#8C7A65] mt-1 font-sans">
                  Founder & Creative Director
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleReadFullStory}
                  className="inline-flex items-center px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 sm:py-3 bg-[#1E1B18] text-[#FAF8F5] text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider hover:bg-[#C5A880] transition-colors rounded-full shadow-xs whitespace-nowrap"
                >
                  <span>Read Full Story</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1.5 sm:ml-2" />
                </button>
                <button
                  onClick={() => navigateToCategory('bridal')}
                  className="inline-flex items-center px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-3 border border-[#C5A880] text-[#1E1B18] text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider hover:bg-[#FAF0E1] transition-colors rounded-full whitespace-nowrap"
                >
                  <span>Shop Signature Robes</span>
                </button>
              </div>
            </div>

            {/* Credibility Micro-Pillars */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-2 sm:pt-4">
              <div className="p-1.5 xs:p-2 sm:p-3 bg-[#FAF5ED] border border-[#E8DFCFC] rounded-lg text-center">
                <p className="font-serif text-sm xs:text-base sm:text-lg lg:text-xl font-bold text-[#1E1B18]">2016</p>
                <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] text-[#7A6E62] uppercase tracking-wider font-semibold">Lagos Essentials</p>
              </div>
              <div className="p-1.5 xs:p-2 sm:p-3 bg-[#FAF5ED] border border-[#E8DFCFC] rounded-lg text-center">
                <p className="font-serif text-sm xs:text-base sm:text-lg lg:text-xl font-bold text-[#1E1B18]">2,000+</p>
                <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] text-[#7A6E62] uppercase tracking-wider font-semibold">Global Brides</p>
              </div>
              <div className="p-1.5 xs:p-2 sm:p-3 bg-[#FAF5ED] border border-[#E8DFCFC] rounded-lg text-center">
                <p className="font-serif text-sm xs:text-base sm:text-lg lg:text-xl font-bold text-[#1E1B18]">15+ Countries</p>
                <p className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] text-[#7A6E62] uppercase tracking-wider font-semibold">BellaNaija Feature</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
