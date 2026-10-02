import React, { useState } from 'react';
import { MessageCircle, Check, Scissors, Clock, Truck, ShieldCheck, Heart } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { BRAND_CONTACT } from '../data/faqs';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const CustomDesignView: React.FC = () => {
  const { formatPrice } = useShop();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    weddingDate: '',
    country: 'Nigeria',
    silhouette: 'Cathedral Train (2-meter)',
    fabric: '22-Momme Mulberry Silk + 3D Floral Lace',
    colorScheme: 'Ivory & Champagne',
    embellishments: ['3D Hand-Cut Petals', 'Pearl Embellishments'],
    budgetTier: '$350 - $600 USD',
    visionNotes: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const toggleEmbellishment = (emb: string) => {
    setFormData((prev) => ({
      ...prev,
      embellishments: prev.embellishments.includes(emb)
        ? prev.embellishments.filter((e) => e !== emb)
        : [...prev.embellishments, emb],
    }));
  };

  const generateWhatsAppBespoke = () => {
    let msg = `✨ *BESPOKE BRIDAL ROBE COMMISSION INQUIRY* ✨\n\n`;
    msg += `Name: ${formData.name || 'Bride'}\n`;
    msg += `Wedding Date: ${formData.weddingDate || 'Upcoming'}\n`;
    msg += `Destination: ${formData.country}\n`;
    msg += `Silhouette: ${formData.silhouette}\n`;
    msg += `Fabric: ${formData.fabric}\n`;
    msg += `Palette: ${formData.colorScheme}\n`;
    msg += `Embellishments: ${formData.embellishments.join(', ') || 'Clean Minimalist'}\n`;
    msg += `Budget Tier: ${formData.budgetTier}\n`;
    if (formData.visionNotes) {
      msg += `Vision: "${formData.visionNotes}"\n`;
    }
    msg += `\nI would love to schedule a bespoke bridal consultation with the Lariel essentials team!`;
    return `https://wa.me/2348180306073?text=${encodeURIComponent(msg)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full bg-[#FAF8F5] text-[#111111]">
      {/* Hero */}
      <section className="relative w-full py-20 bg-[#161311] text-[#FAF8F5] overflow-hidden text-center">
        <div className="absolute inset-0 z-0">
          <img
            src="/uploads/regenerated_image_1788952915584.png"
            alt="Bespoke Bridal Couture"
            onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_CUSTOM)}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161311] via-[#161311]/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-4">
          <span className="text-[11px] tracking-wide text-[#E2CFA7] font-semibold block font-sans">
            Essentials Bespoke Services
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-wide font-normal">
            Custom Bridal Designs
          </h1>
          <p className="font-serif italic text-lg sm:text-xl text-[#E5DDD0]">
            “Your vision. Handcrafted by our master artisans in Lagos.”
          </p>
          <p className="text-xs sm:text-sm text-[#BDB1A2] font-sans max-w-xl mx-auto leading-relaxed pt-2">
            Whether you desire a two-meter cathedral tulle train, custom dyed Adire silks, or an intricately boned corset robe, we make your dream bridal morning reality.
          </p>
        </div>
      </section>

      {/* 4-Step Bespoke Process */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block mb-1 font-sans">
            The Essentials Journey
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">
            How Bespoke Commissions Work
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {[
            {
              step: '01',
              title: 'Private Consultation',
              desc: 'Share your wedding theme, silhouette vision, and preferred bridal aesthetic directly with our lead designer.',
              icon: Scissors,
            },
            {
              step: '02',
              title: 'Fabric & Embellishment',
              desc: 'Select from 22-momme pure silk, French chantilly lace, ostrich feathers, hand-cut 3D florals, or authentic Adire.',
              icon: Heart,
            },
            {
              step: '03',
              title: 'Essentials Crafting',
              desc: 'Our master patternmakers and tailors handcraft and sculpt your robe to your bespoke body measurements.',
              icon: Clock,
            },
            {
              step: '04',
              title: 'Worldwide Express Delivery',
              desc: 'Packaged in a gold-embossed keepsake heirloom case and rushed to your doorstep via DHL Priority Express.',
              icon: Truck,
            },
          ].map((s) => (
            <div key={s.step} className="p-6 bg-[#FAF6F0] border border-[#E5DDD0] flex flex-col justify-between">
              <div>
                <span className="font-serif text-2xl text-[#C5A880] font-light block mb-3">{s.step}</span>
                <h3 className="font-serif text-lg font-medium text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-xs text-[#6B635A] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bespoke Request Form & WhatsApp Direct */}
      <section className="py-16 bg-[#F5EFE6] border-y border-[#E5DDD0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#FAF8F5] border border-[#DFD5C7] p-8 sm:p-12 shadow-sm text-left">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block mb-1 font-sans">
                Commission Inquiry
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">
                Commission Your Dream Robe
              </h2>
              <p className="text-xs text-neutral-500 font-sans mt-1">
                Fill in your initial design specifications or chat with us directly via WhatsApp.
              </p>
            </div>

            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#EFE8DE] flex items-center justify-center mx-auto text-[#C5A880]">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl text-neutral-900 font-medium">
                  Thank You, Queen!
                </h3>
                <p className="text-xs text-neutral-600 max-w-md mx-auto">
                  Our lead essentials bridal consultant has received your custom inquiry and will reach out via WhatsApp/Email within 24 hours.
                </p>
                <div className="pt-4">
                  <a
                    href={generateWhatsAppBespoke()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-[#111111] text-white px-6 py-3 text-xs tracking-widest uppercase font-semibold hover:bg-[#C5A880]"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span>Chat Instantly on WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Omolara Adebayo"
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. bride@gmail.com"
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 / +44 / +1 ..."
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Wedding Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.weddingDate}
                      onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Shipping Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Nigeria, UK, USA, etc."
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                {/* Silhouette & Fabric Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Desired Silhouette
                    </label>
                    <select
                      value={formData.silhouette}
                      onChange={(e) => setFormData({ ...formData, silhouette: e.target.value })}
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none"
                    >
                      <option>Cathedral Train (2-meter)</option>
                      <option>Royal Sweeping Train (1-meter)</option>
                      <option>Corset Bodice Robe</option>
                      <option>Halter Neck Open Back</option>
                      <option>Extra Full Layered Tulle</option>
                      <option>Traditional Kimono Silhouette</option>
                      <option>Mini Bridal Dress / Romper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                      Fabric Focus
                    </label>
                    <select
                      value={formData.fabric}
                      onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                      className="w-full bg-white border border-neutral-300 px-3 py-2.5 focus:outline-none"
                    >
                      <option>22-Momme Mulberry Silk + 3D Floral Lace</option>
                      <option>French Illusion Tulle Layers</option>
                      <option>Hand-Dyed Yoruba Adire Silk</option>
                      <option>Liquid Heavyweight Satin</option>
                      <option>Ostrich Feather Trim Silk</option>
                    </select>
                  </div>
                </div>

                {/* Embellishments Checklist */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-2">
                    Special Handcrafted Embellishments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '3D Hand-Cut Petals',
                      'Pearl Embellishments',
                      'Swarovski Crystal Accents',
                      'Detachable Ostrich Feathers',
                      'Hand-Embroidered Surname & Crest',
                      'Illusion Corsetry Boning',
                      'Detachable Sleeve Accents',
                    ].map((emb) => {
                      const isSelected = formData.embellishments.includes(emb);
                      return (
                        <button
                          key={emb}
                          type="button"
                          onClick={() => toggleEmbellishment(emb)}
                          className={`px-3 py-1.5 border transition-all text-xs ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {emb}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vision Notes */}
                <div>
                  <label className="block text-[10px] tracking-wider uppercase font-semibold text-neutral-700 mb-1">
                    Describe Your Bridal Vision & Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.visionNotes}
                    onChange={(e) => setFormData({ ...formData, visionNotes: e.target.value })}
                    placeholder="Tell us about your wedding dress, morning setting, mood board ideas, or specific color tones..."
                    className="w-full bg-white border border-neutral-300 p-3 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                {/* CTAs */}
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="submit"
                    className="bg-[#111111] text-[#FAF8F5] py-4 text-xs tracking-wide font-semibold hover:bg-[#C5A880] transition-colors shadow-sm font-sans"
                  >
                    Submit Bespoke Inquiry
                  </button>

                  <a
                    href={generateWhatsAppBespoke()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-neutral-800 bg-white text-neutral-900 py-4 text-xs tracking-wide font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors flex items-center justify-center space-x-2 font-sans"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span>Consult On WhatsApp Directly</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
