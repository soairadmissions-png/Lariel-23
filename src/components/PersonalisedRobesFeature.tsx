import React, { useState } from 'react';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import personalisedRobeImg from '../assets/images/regenerated_image_1788963021175.png';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const PersonalisedRobesFeature: React.FC = () => {
  const { navigateToProduct, setActiveView } = useShop();

  const [activeSample, setActiveSample] = useState<'Bride' | 'Mrs.' | 'Bride’s Name'>('Mrs.');
  const [customText, setCustomText] = useState('Mrs. Adeleke');
  const [threadColor, setThreadColor] = useState<'gold' | 'champagne' | 'rose-gold' | 'white'>('gold');
  const [embroideryStyle, setEmbroideryStyle] = useState<'script' | 'serif'>('serif');

  const handleSampleClick = (sample: 'Bride' | 'Mrs.' | 'Bride’s Name') => {
    setActiveSample(sample);
    if (sample === 'Bride') setCustomText('The Bride');
    if (sample === 'Mrs.') setCustomText('Mrs. Adeleke');
    if (sample === 'Bride’s Name') setCustomText('Chidinma');
  };

  const handleCta = () => {
    navigateToProduct('personalised-embroidered-robe');
  };

  return (
    <section id="section-personalised" className="py-20 sm:py-28 bg-[#231A15] text-[#FAF7F2] border-b border-[#3D2C23] relative overflow-hidden">
      {/* Subtle background ambient texture */}
      <div className="absolute inset-0 bg-radial from-[#3A2920]/40 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-12 gap-3 xs:gap-4 sm:gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Editorial & Bespoke Narrative */}
          <div className="col-span-7 sm:col-span-7 lg:col-span-6 space-y-3 sm:space-y-6 text-left">
            <div className="space-y-1 sm:space-y-3">
              <span className="text-[9px] xs:text-[10px] sm:text-[11px] tracking-wide text-[#C5A880] font-medium font-sans block">
                Section 08 · Bespoke Embroidery Essentials
              </span>
              <h2 className="font-serif text-[clamp(1.2rem,2.6vw,3rem)] font-normal text-[#FAF7F2] leading-tight">
                Make It Yours
              </h2>
              <p className="font-serif italic text-sm xs:text-base sm:text-xl text-[#C5A880]">
                “Your name. Your moment. Your robe.”
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[#D5C9BD] font-sans leading-relaxed max-w-xl">
              An heirloom crafted to outlast the wedding day. Each personalised Lariel robe is individually stitched by our master artisans using lustrous metallic German threads across sweeping back panels or delicate lapel pockets.
            </p>

            {/* Subtle examples of personalised names */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] tracking-wide text-[#A89886] font-medium font-sans block">
                Popular Monogram Commissions:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {(['Bride', 'Mrs.', 'Bride’s Name'] as const).map((nameSample) => (
                  <button
                    key={nameSample}
                    onClick={() => handleSampleClick(nameSample)}
                    className={`px-4 py-2 text-xs tracking-wide font-medium rounded-full transition-all duration-200 border font-sans ${
                      activeSample === nameSample
                        ? 'bg-[#C5A880] text-[#1A1614] border-[#C5A880] font-semibold shadow-md'
                        : 'bg-[#2E221B] text-[#D8CCC0] border-[#4A372C] hover:border-[#C5A880] hover:text-[#FAF7F2]'
                    }`}
                  >
                    {nameSample}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Essentials Preview Card */}
            <div className="bg-[#1C1410] border border-[#3D2C23] p-2.5 xs:p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-2.5 sm:space-y-4">
              <div className="flex items-center justify-between text-[10px] xs:text-xs border-b border-[#2F2119] pb-2 sm:pb-3">
                <span className="text-[10px] sm:text-[11px] tracking-wide text-[#C5A880] font-medium font-sans">
                  Bespoke Thread Simulation
                </span>
                <span className="text-[9px] sm:text-[11px] text-[#A89886] tracking-wide font-sans hidden xs:inline">
                  Handcrafted in Essentials
                </span>
              </div>

              {/* Thread & Font Selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="text-[10px] sm:text-[11px] tracking-wide text-[#A89886] font-sans">Thread:</span>
                  {(['gold', 'champagne', 'rose-gold', 'white'] as const).map((color) => (
                    <button
                      key={color}
                      onClick={() => setThreadColor(color)}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform ${
                        threadColor === color ? 'ring-2 ring-offset-1 ring-[#C5A880] scale-110' : 'opacity-70'
                      }`}
                      style={{
                        backgroundColor:
                          color === 'gold'
                            ? '#D4AF37'
                            : color === 'champagne'
                            ? '#E2CFA7'
                            : color === 'rose-gold'
                            ? '#DFA599'
                            : '#FAF8F5',
                      }}
                      title={color}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs tracking-wide font-sans">
                  <button
                    onClick={() => setEmbroideryStyle('serif')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-colors ${
                      embroideryStyle === 'serif' ? 'bg-[#3A2920] text-[#C5A880]' : 'text-[#8E8072]'
                    }`}
                  >
                    Playfair Serif
                  </button>
                  <button
                    onClick={() => setEmbroideryStyle('script')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-colors ${
                      embroideryStyle === 'script' ? 'bg-[#3A2920] text-[#C5A880]' : 'text-[#8E8072]'
                    }`}
                  >
                    Script Monogram
                  </button>
                </div>
              </div>

              {/* Monogram Display on Ivory Satin Swatch */}
              <div className="relative aspect-[16/7] w-full bg-[#FAF5EE] rounded-lg sm:rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-2.5 sm:p-4 border border-[#D8CEBF]">
                <div className="text-[8px] sm:text-[10px] tracking-wide text-[#9C8C7D] font-medium absolute top-1.5 xs:top-3 left-2 xs:left-4 font-sans">
                  Rear Embroidery · 25cm Span
                </div>

                <div
                  className={`text-center transition-all duration-300 px-2 line-clamp-1 ${
                    embroideryStyle === 'script' ? 'font-serif italic text-[clamp(1.1rem,2.8vw,2.25rem)]' : 'font-serif text-[clamp(1.1rem,2.8vw,2.25rem)] font-normal'
                  }`}
                  style={{
                    color:
                      threadColor === 'gold'
                        ? '#A68434'
                        : threadColor === 'champagne'
                        ? '#A88D56'
                        : threadColor === 'rose-gold'
                        ? '#9B5B53'
                        : '#3A332C',
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  {customText || 'The Bride'}
                </div>

                <div className="text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#A89886] mt-1 sm:mt-2">
                  Lustrous Satin Stitch · 22-Momme Pure Silk
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter custom bridal name..."
                  maxLength={24}
                  className="flex-1 bg-[#261A13] border border-[#3E2B20] text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[#FAF7F2] placeholder:text-[#7A6A5E] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-1 sm:pt-2">
              <button
                onClick={handleCta}
                className="inline-flex items-center space-x-2 sm:space-x-3 bg-[#C5A880] text-[#1A1614] hover:bg-white text-[9px] xs:text-[10px] sm:text-xs md:text-sm tracking-wide font-semibold py-2 xs:py-2.5 sm:py-4 px-3 xs:px-4 sm:px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group font-sans whitespace-nowrap"
              >
                <span>Personalise Your Robe</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Close-up Editorial Photography - side by side on all devices */}
          <div className="col-span-5 sm:col-span-5 lg:col-span-6">
            <div className="relative">
              {/* Primary Close-up Image */}
              <div className="aspect-[4/5] rounded-xl sm:rounded-3xl overflow-hidden border border-[#4A372C] shadow-2xl bg-[#18110D]">
                <img
                  src={personalisedRobeImg || CANONICAL_DEFAULTS.MONOGRAM_DETAIL}
                  alt="Personalised bridal robe embroidery close-up"
                  onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.MONOGRAM_DETAIL)}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#18110D]/90 via-transparent to-transparent" />
                
                {/* Overlay Badge & Story */}
                <div className="absolute bottom-6 inset-x-6 text-left space-y-1.5">
                  <span className="bg-[#C5A880] text-[#18110D] text-[10px] tracking-wide font-semibold px-3 py-1 rounded-full shadow-md inline-block font-sans">
                    Couture Finish
                  </span>
                  <p className="font-serif text-base sm:text-lg text-white">
                    Gold-embroidered heirloom monogram for wedding morning portraits.
                  </p>
                </div>
              </div>

              {/* Inset Secondary Detail Card */}
              <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center space-x-3 bg-[#1C1410]/95 backdrop-blur-md border border-[#4A372C] p-4 rounded-2xl shadow-xl max-w-xs">
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#C5A880]/40">
                  <img
                    src="/uploads/regenerated_image_1788963021175.png"
                    alt="Stitching detail"
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.MONOGRAM_DETAIL)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left text-xs">
                  <span className="text-[#C5A880] font-medium text-[11px] tracking-wide block font-sans">
                    Madeira Metallic
                  </span>
                  <span className="text-[#D5C9BD] text-[11px] leading-snug block">
                    Tarnish-resistant thread with gentle skin-soft backing.
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
