import React, { useState } from 'react';
import { Heart, BookOpen, Newspaper, HelpCircle, ArrowRight, Star, ChevronDown, ChevronUp, Check, Globe, Sparkles, Award } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { JOURNAL_ARTICLES } from '../data/journal';
import { REAL_BRIDES } from '../data/realBrides';
import { FAQS } from '../data/faqs';
import { JournalArticle } from '../types';
import laidePortraitImg from '../assets/images/laide_founder_portrait_1789650582034.jpg';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const TheLarielWorldView: React.FC = () => {
  const { selectedWorldTab, setSelectedWorldTab, selectedInfoTab, activeView, navigateToCategory, setActiveView, realBrides, siteSettings } = useShop();

  const [activeBrideCategory, setActiveBrideCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<JournalArticle | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isBioExpanded, setIsBioExpanded] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeView === 'information') {
      setSelectedWorldTab('faq');
    }
  }, [activeView, setSelectedWorldTab]);

  const bridesList = realBrides && realBrides.length > 0 ? realBrides : REAL_BRIDES;

  const filteredBrides =
    activeBrideCategory === 'All'
      ? bridesList
      : bridesList.filter((b) => b.category === activeBrideCategory);

  return (
    <div className="w-full bg-[#FAF8F5] text-[#111111]">
      {/* Header Banner */}
      <section className="relative w-full py-20 bg-[#161311] text-[#FAF8F5] text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/uploads/bridal_couch_hero_1788951504284.jpg"
            alt="The Lariel World"
            onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.HERO_MAIN)}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161311] via-[#161311]/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-3">
          <span className="text-[11px] tracking-wide text-[#E2CFA7] font-semibold block font-sans">
            The Global Bridal House
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-wide font-normal">
            The Lariel World
          </h1>
          <p className="font-serif italic text-lg sm:text-xl text-[#E5DDD0]">
            “The art, the heritage, the sisterhood, and the real brides behind our house.”
          </p>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-[#E8E1D7] bg-[#F7F2EB] sticky top-[73px] z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center space-x-8 text-xs font-semibold py-3.5 whitespace-nowrap font-sans">
          {[
            { id: 'story', label: 'Meet Laide (Our Story)' },
            { id: 'real-brides', label: 'Real Brides' },
            { id: 'journal', label: 'The Journal' },
            { id: 'press', label: 'Press & BellaNaija' },
            { id: 'faq', label: 'Client Care & FAQs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedWorldTab(tab.id as any);
                setSelectedArticle(null);
                window.scrollTo({ top: 220, behavior: 'smooth' });
              }}
              className={`pb-1 transition-colors ${
                selectedWorldTab === tab.id
                  ? 'text-[#C5A880] border-b-2 border-[#C5A880]'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OUR STORY & FOUNDER'S LETTER */}
      {selectedWorldTab === 'story' && (
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 text-left space-y-20">
          
          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans uppercase">
              Founded in 2016 · Lagos to the World
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-neutral-900 font-normal leading-tight">
              Before the wedding dress, <br />
              <span className="italic font-light text-[#A68962]">there is a sacred moment.</span>
            </h2>
            <p className="font-serif italic text-lg sm:text-2xl text-[#524B43] leading-relaxed pt-2">
              “That is the moment Lariel was made for. Unforgettable, bespoke, and iconic.”
            </p>
          </div>

          {/* Founder Feature: Letter From Laide (About Laide) */}
          <div id="about-laide" className="bg-[#FAF6F0] border border-[#E5DDD0] rounded-2xl p-4 xs:p-6 sm:p-12 lg:p-14 shadow-[0_10px_40px_rgba(40,32,24,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#F3E9D9]/50 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-12 gap-4 xs:gap-6 sm:gap-10 lg:gap-14 items-center relative z-10">
              {/* Portrait - side by side on all devices */}
              <div className="col-span-5 sm:col-span-5 md:col-span-5 flex justify-center">
                <div className="relative w-full max-w-[340px]">
                  <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-[#E0D5C3] bg-white">
                    <img
                      src={siteSettings?.laidePortraitImage || laidePortraitImg || CANONICAL_DEFAULTS.FOUNDER_PORTRAIT}
                      alt="Laide, Founder of Lariel Essentials"
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.FOUNDER_PORTRAIT)}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[3/4] object-cover object-top filter contrast-[1.02]"
                    />
                  </div>
                  <div className="mt-2 sm:mt-3 text-center">
                    <h3 className="font-serif text-base sm:text-xl font-medium text-neutral-900">Laide</h3>
                    <p className="text-[9px] sm:text-[11px] text-[#A68962] uppercase tracking-wider font-semibold font-sans">
                      Founder & Creative Director
                    </p>
                    <p className="text-[8px] sm:text-[11px] text-neutral-600 font-sans mt-0.5 hidden xs:block">
                      Lariel Essentials · The Global Bridal House
                    </p>
                  </div>
                </div>
              </div>

              {/* The Letter */}
              <div className="col-span-7 sm:col-span-7 md:col-span-7 space-y-2.5 sm:space-y-5 text-xs sm:text-base text-[#4A433B] leading-relaxed font-sans font-light text-left">
                <div className="inline-flex items-center space-x-1.5 sm:space-x-2 text-[9px] sm:text-[11px] uppercase tracking-widest text-[#A68962] font-semibold">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>About Laide · Founder's Letter</span>
                </div>

                <h3 className="font-serif text-lg xs:text-xl sm:text-3xl text-neutral-900 font-normal">
                  “Hi, I'm Laide.”
                </h3>

                <p>
                  I didn’t start Lariel because I wanted to sell robes. I started it because I watched too many Nigerian brides get ready in oversized men’s shirts and cheap shiny robes that didn’t match the luxury and grandeur of their day.
                </p>

                <p className="font-serif italic text-base sm:text-lg text-[#2B2620] bg-white/70 p-3 sm:p-4 rounded-lg border-l-3 border-[#C5A880] shadow-2xs">
                  “Your wedding morning is not a throwaway moment. It’s the first time you get dressed as a wife. It’s the moment your mother zips you, your girls laugh with you, your photographer captures you. It deserves luxury.”
                </p>

                {/* Collapsible Full Biography */}
                {isBioExpanded && (
                  <div className="space-y-2.5 sm:space-y-4 pt-1 transition-all duration-300">
                    <p>
                      Lariel Essentials started in 2016, from a small room in Lagos. Today, I’ve dressed over <strong>2,000 brides in 15+ countries</strong>—from Lagos to London, Houston to Toronto, and across the globe. Featured proudly on <em>BellaNaija Weddings</em>, and loved by brides who wanted soft, bespoke, and classy.
                    </p>

                    <p>
                      I am a graduate of International Relations from Covenant University, with an MSc in Political Science. My academic background taught me diplomacy, precision, and global perspective—the exact values I bring to every robe we create. Every Linda robe, every feather trim, every ruffle is designed by me, hand-sewn by my team of women in Lagos, and made to make you feel like <em>YOU</em>—only softer, more confident, more iconic.
                    </p>

                    <p className="font-medium text-neutral-900">
                      Lariel is not just a robe. It’s your bridal morning, made unforgettable.
                    </p>

                    <p className="pt-1 text-[#6C645C]">
                      Welcome to the global house of getting-ready moments.
                    </p>
                  </div>
                )}

                {/* Read More / Read Less Toggle */}
                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="inline-flex items-center space-x-2 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-[#1E1B18] bg-white border border-[#D5C9B8] hover:border-[#A68962] hover:bg-[#F4ECE1] px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full transition-all duration-200 shadow-2xs group cursor-pointer"
                    aria-expanded={isBioExpanded}
                  >
                    <span>{isBioExpanded ? 'Read Less' : 'Read More · Full Biography'}</span>
                    {isBioExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#A68962] transition-transform duration-200 group-hover:-translate-y-0.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#A68962] transition-transform duration-200 group-hover:translate-y-0.5" />
                    )}
                  </button>
                </div>

                {/* Hand-signed closing */}
                <div className="pt-2 sm:pt-3">
                  <p className="font-serif italic text-2xl sm:text-4xl text-[#A68962] leading-none">
                    With love, <br />
                    Laide
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Pillars */}
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans uppercase">
                The Essentials Standard
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">
                How We Create Unforgettable Moments
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] rounded-xl text-left">
                <span className="font-serif text-2xl text-[#C5A880] font-light block mb-2">01</span>
                <h4 className="font-serif text-lg font-medium text-neutral-900 mb-1.5">Diplomacy & Precision</h4>
                <p className="text-xs text-[#6C645C] leading-relaxed">
                  Academic discipline in International Relations & Political Science brings immaculate precision and global perspective to every stitch.
                </p>
              </div>

              <div className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] rounded-xl text-left">
                <span className="font-serif text-2xl text-[#C5A880] font-light block mb-2">02</span>
                <h4 className="font-serif text-lg font-medium text-neutral-900 mb-1.5">Hand-Sewn by Women</h4>
                <p className="text-xs text-[#6C645C] leading-relaxed">
                  Every Linda robe, feather cuff, and tiered tulle ruffle is designed by Laide and hand-sewn by our passionate team of women in Lagos.
                </p>
              </div>

              <div className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] rounded-xl text-left">
                <span className="font-serif text-2xl text-[#C5A880] font-light block mb-2">03</span>
                <h4 className="font-serif text-lg font-medium text-neutral-900 mb-1.5">Lagos to 15+ Nations</h4>
                <p className="text-xs text-[#6C645C] leading-relaxed">
                  From a small Lagos room in 2016 to over 2,000 brides in London, Houston, Toronto, Dubai, and across North America & Africa.
                </p>
              </div>

              <div className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] rounded-xl text-left">
                <span className="font-serif text-2xl text-[#C5A880] font-light block mb-2">04</span>
                <h4 className="font-serif text-lg font-medium text-neutral-900 mb-1.5">BellaNaija Acclaimed</h4>
                <p className="text-xs text-[#6C645C] leading-relaxed">
                  Celebrated on BellaNaija Weddings and beloved by discerning brides who demand bespoke, classy, and soft bridal mornings.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="text-center pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigateToCategory('bridal')}
              className="bg-[#111111] text-white text-xs tracking-wide px-8 py-4 font-semibold hover:bg-[#C5A880] transition-colors rounded-full font-sans shadow-md"
            >
              Shop Bridal Robes
            </button>
            <button
              onClick={() => navigateToCategory('adire')}
              className="bg-transparent border border-[#C5A880] text-[#111111] text-xs tracking-wide px-8 py-4 font-semibold hover:bg-[#F5ECE0] transition-colors rounded-full font-sans"
            >
              Discover Adire Heritage
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: REAL BRIDES */}
      {selectedWorldTab === 'real-brides' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block mb-1 font-sans">
              Worn by Queens Around the Globe
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal">
              Real Lariel Brides
            </h2>
            <p className="text-xs text-neutral-600 font-sans mt-2">
              Browse authentic wedding morning moments from London to Lagos, Atlanta to Sydney.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12 text-xs">
            {['All', 'Bride', 'Bridesmaids', 'Bridal Party', 'Custom', 'Adire'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveBrideCategory(tab)}
                className={`px-4 py-1.5 uppercase tracking-wider transition-all ${
                  activeBrideCategory === tab
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-[#F2ECE4] text-neutral-700 hover:bg-[#E8E0D5]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBrides.map((bride) => (
              <div key={bride.id} className="bg-[#FAF8F5] border border-[#E5DDD0] overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-[#EBE3D8] overflow-hidden relative">
                  <img
                    src={bride.image || CANONICAL_DEFAULTS.PRODUCT}
                    alt={bride.brideName}
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-[#111111]/85 text-white text-[9px] tracking-widest uppercase px-2.5 py-1">
                    {bride.category} · {bride.location}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-xl text-neutral-900 font-medium">
                      {bride.brideName}
                    </h3>
                    <p className="text-xs text-[#A68962] uppercase tracking-wider font-semibold mt-0.5">
                      {bride.robeWorn}
                    </p>
                    <p className="text-xs text-[#5D554D] italic mt-3 leading-relaxed font-serif">
                      “{bride.quote}”
                    </p>
                  </div>
                  {bride.photographerCredit && (
                    <p className="text-[10px] text-neutral-400 mt-4 border-t border-neutral-200 pt-2 tracking-wider">
                      {bride.photographerCredit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THE LARIEL JOURNAL */}
      {selectedWorldTab === 'journal' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left">
          {selectedArticle ? (
            /* Full Article Reader */
            <div className="max-w-3xl mx-auto bg-[#FAF8F5] p-6 sm:p-10 border border-[#E5DDD0] space-y-6">
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-xs tracking-wider uppercase font-semibold text-[#A68962] hover:underline mb-2 block"
              >
                ← Back to All Articles
              </button>

              <div className="aspect-[16/9] bg-[#EBE3D8] overflow-hidden border border-[#E5DDD0]">
                <img
                  src={selectedArticle.image || CANONICAL_DEFAULTS.PRODUCT}
                  alt={selectedArticle.title}
                  onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#A68962] font-semibold">
                  {selectedArticle.category} · {selectedArticle.readTime}
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal leading-tight">
                  {selectedArticle.title}
                </h1>
                <p className="text-xs text-neutral-500">{selectedArticle.date}</p>
              </div>

              <div className="border-t border-[#E8E1D7] pt-6 space-y-4 text-sm text-[#4E463E] leading-relaxed font-serif">
                <p className="text-lg text-neutral-900 italic">
                  {selectedArticle.excerpt}
                </p>
                <div className="font-sans text-xs sm:text-sm text-neutral-700 leading-loose space-y-4">
                  {Array.isArray(selectedArticle.content)
                    ? selectedArticle.content.map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))
                    : <p>{selectedArticle.content}</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-[#E8E1D7] flex justify-between items-center">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="bg-[#111111] text-white text-xs tracking-widest uppercase px-6 py-3 font-semibold hover:bg-[#C5A880]"
                >
                  Return to Journal
                </button>
                <button
                  onClick={() => navigateToCategory('bridal')}
                  className="text-xs tracking-widest uppercase font-semibold text-[#A68962] hover:underline"
                >
                  Shop Robes Featured in this Story →
                </button>
              </div>
            </div>
          ) : (
            /* Journal Grid */
            <div>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block mb-1 font-sans">
                  Editorial Insights
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal">
                  The Lariel Journal
                </h2>
                <p className="text-xs text-neutral-600 font-sans mt-2">
                  Guidance on bridal morning styling, etiquette, party coordination, and silk garment preservation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {JOURNAL_ARTICLES.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      window.scrollTo({ top: 240, behavior: 'smooth' });
                    }}
                    className="group cursor-pointer bg-[#FAF8F5] border border-[#E5DDD0] p-5 flex flex-col justify-between hover:border-[#C5A880] transition-colors"
                  >
                    <div>
                      <div className="aspect-[16/10] bg-[#EBE3D8] overflow-hidden mb-4">
                        <img
                          src={article.image || CANONICAL_DEFAULTS.PRODUCT}
                          alt={article.title}
                          onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] tracking-wider text-[#A68962] uppercase mb-1 font-sans">
                        <span>{article.category}</span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                      </div>
                      <h3 className="font-serif text-xl text-neutral-900 font-medium group-hover:text-[#C5A880] transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-xs text-[#6B635A] mt-2 line-clamp-3 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#EFE8DE] flex items-center justify-between text-xs font-sans">
                      <span className="text-neutral-500 text-[11px]">{article.date}</span>
                      <span className="font-semibold text-neutral-900 group-hover:text-[#C5A880] transition-colors text-[11px]">
                        Read Full Story →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRESS */}
      {selectedWorldTab === 'press' && (
        <div className="max-w-5xl mx-auto px-6 py-16 text-left space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans">
              Global Recognition
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal">
              Press & Editorial Features
            </h2>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E5DDD0] p-8 sm:p-12 space-y-6">
            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans">
              Featured Publication
            </span>
            <h3 className="font-serif text-3xl sm:text-5xl text-neutral-900 font-normal">
              BellaNaija Weddings
            </h3>
            <p className="text-base sm:text-lg text-[#554E46] italic font-serif leading-relaxed">
              “Lariel Essentials is dominating the bridal morning conversation across Africa and the global diaspora. Through sculptural corset robes, French tulles, and hand-embroidered Adire silks, they have elevated the bridal morning into an iconic ceremony in its own right.”
            </p>
            <div className="pt-4 border-t border-[#E8E1D7] flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
              <span className="text-neutral-600">Bridal Fashion Editorial Spotlight</span>
              <a
                href="https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20I%20saw%20you%20on%20BellaNaija%20Weddings!"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-900 font-semibold hover:text-[#C5A880] underline"
              >
                Inquire via WhatsApp →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FAQS & CLIENT CARE */}
      {selectedWorldTab === 'faq' && (
        <div className="max-w-4xl mx-auto px-6 py-16 text-left space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans">
              Essentials Client Care
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-normal">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-neutral-600 font-sans">
              Find answers to production lead times, international delivery to 15+ countries, and sizing.
            </p>
          </div>

          <div className="divide-y divide-[#E5DDD0] border-y border-[#E5DDD0]">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-5">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center text-left text-base font-serif font-medium text-neutral-900 hover:text-[#C5A880] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-xl ml-4">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans pr-8">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Official Payment Gateway & International Banking Box */}
          <div className="bg-[#FAF6F0] border border-[#E3D9CC] p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3D9CC] pb-4">
              <div>
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#A68962] font-sans block">
                  Global Client Settlement
                </span>
                <h3 className="font-serif text-xl sm:text-2xl text-neutral-900 font-normal">
                  Payment Gateway & Official Bank Accounts
                </h3>
              </div>
              <span className="text-xs bg-[#2F6147]/10 text-[#2F6147] font-semibold px-3 py-1 rounded-full border border-[#2F6147]/30 self-start sm:self-auto">
                Verified Global Gateway
              </span>
            </div>

            <p className="text-xs text-neutral-600 font-sans leading-relaxed">
              International clients can select their preferred global currency and make payment via <strong>Remitly</strong>, <strong>WorldRemit</strong>, <strong>Sendwave</strong>, or <strong>LemFi</strong> financial apps directly into our corporate accounts in Nigeria.
            </p>

            <div className="p-3 bg-[#F2ECE4] border border-[#E0D7CC] rounded text-[11px] text-neutral-700 italic font-sans">
              (Note: These financial institutions are well secured and trusted with over 1000 clients on this platform)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-4 bg-white border border-[#DDD3C5] space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-900 text-[11px] uppercase tracking-wide">
                    Polaris Bank
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Primary</span>
                </div>
                <div className="font-mono text-lg font-bold text-neutral-950 tracking-wider">
                  4091455814
                </div>
                <p className="text-neutral-600">
                  Beneficiary: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                </p>
                <p className="text-[10px] text-neutral-500">Destination Country: Nigeria</p>
              </div>

              <div className="p-4 bg-white border border-[#DDD3C5] space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-900 text-[11px] uppercase tracking-wide">
                    United Bank for Africa (UBA)
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Commercial</span>
                </div>
                <div className="font-mono text-lg font-bold text-neutral-950 tracking-wider">
                  1024663880
                </div>
                <p className="text-neutral-600">
                  Beneficiary: <strong className="text-neutral-900">Lariel Bridal Essential</strong>
                </p>
                <p className="text-[10px] text-neutral-500">Destination Country: Nigeria</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-sans text-neutral-600 border-t border-[#E8DFCFC]">
              <span>Follow our official bridal journeys:</span>
              <div className="flex items-center space-x-4">
                <a
                  href="https://www.instagram.com/larielessentials?stkn=bmtiaXV5MzBjdG4x&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-900 hover:text-[#C5A880] font-semibold"
                >
                  Instagram
                </a>
                <span>·</span>
                <a
                  href="https://www.tiktok.com/@larielessentials?_r=1&_t=ZS-99wUtSkIX49"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-900 hover:text-[#C5A880] font-semibold"
                >
                  TikTok
                </a>
                <span>·</span>
                <a
                  href="https://pin.it/7mAKSzGAM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-900 hover:text-[#C5A880] font-semibold"
                >
                  Pinterest
                </a>
              </div>
            </div>
          </div>

          {/* Need More Assistance Banner */}
          <div className="bg-[#FAF6F0] border border-[#E3D9CC] p-8 text-center space-y-3">
            <h3 className="font-serif text-xl text-neutral-900 font-medium">Still have questions for our bridal concierge?</h3>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              Our bridal stylists in Lagos are on call 7 days a week to guide your palette, measurements, and dispatch dates.
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20I%20have%20a%20question%20about%20ordering"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#111111] text-white px-6 py-3 text-xs tracking-widest uppercase font-semibold hover:bg-[#C5A880]"
              >
                Chat with Concierge on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
