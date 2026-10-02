import React, { useState } from 'react';
import { Instagram, MessageCircle, Check, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const Footer: React.FC = () => {
  const {
    navigateToCategory,
    navigateToAdmin,
    setActiveView,
    setSelectedWorldTab,
    setSelectedInfoTab,
  } = useShop();

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const handleShopLink = (category: string) => {
    navigateToCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWorldLink = (tab: string) => {
    setSelectedWorldTab(tab);
    setActiveView('the-lariel-world');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInfoLink = (tab: string) => {
    setSelectedInfoTab(tab);
    setActiveView('the-lariel-world');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="footer" className="bg-[#1A1614] text-[#FAF8F5] border-t border-[#2F2620]">
      {/* Newsletter Section */}
      <div className="border-b border-[#2C231D] py-16 px-4 sm:px-6 lg:px-8 bg-[#151210]">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-[11px] tracking-wide text-[#C5A880] font-medium font-sans block">
            The Essentials Dispatch
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#FAF8F5] font-normal">
            Join The Lariel World
          </h3>
          <p className="text-xs sm:text-sm text-[#B8AEA3] font-sans max-w-lg mx-auto leading-relaxed">
            Be the first to discover new collections, bridal inspiration and exclusive releases.
          </p>

          {subscribed ? (
            <div className="pt-4 flex items-center justify-center space-x-2 text-xs text-[#C5A880]">
              <Check className="w-4 h-4" />
              <span>Welcome to the sisterhood. Your exclusive invitation is on its way.</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="pt-4 max-w-md mx-auto flex items-center bg-[#241E1A] border border-[#3E322A] p-1.5 rounded-full shadow-inner">
              <input
                type="email"
                required
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 bg-transparent text-xs px-4 py-2.5 text-white placeholder:text-[#8E8378] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#C5A880] text-[#1A1614] px-6 py-2.5 text-xs tracking-wide font-semibold hover:bg-[#E2D8CC] transition-colors rounded-full shadow-xs whitespace-nowrap font-sans"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left">
        {/* Brand Header */}
        <div className="border-b border-[#2C231D] pb-12 mb-12 flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
          <div>
            <span className="font-serif text-4xl sm:text-5xl font-normal text-[#FAF8F5] block">
              Lariel
            </span>
            <p className="font-serif italic text-base text-[#C5A880] mt-1.5">
              “Bridal robes, made for the moments before forever.”
            </p>
          </div>
          <div className="text-[11px] tracking-wide text-[#8E8378] font-sans">
            Lagos · London · New York · Accra · Atlanta
          </div>
        </div>

        {/* 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 font-sans">
          {/* Column 1: Shop */}
          <div className="space-y-4">
            <h4 className="text-xs tracking-wide text-[#C5A880] font-semibold font-sans">
              Shop
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B8AEA3]">
              <li>
                <button onClick={() => handleShopLink('bridal')} className="hover:text-[#C5A880] transition-colors text-left">
                  Bridal Robes
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('bridesmaids')} className="hover:text-[#C5A880] transition-colors text-left">
                  Bridesmaids Robes
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('sets')} className="hover:text-[#C5A880] transition-colors text-left">
                  Bridal Party Sets
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('adire')} className="hover:text-[#C5A880] transition-colors text-left">
                  Adire Robes
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('pyjamas')} className="hover:text-[#C5A880] transition-colors text-left">
                  Pyjamas
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('accessories')} className="hover:text-[#C5A880] transition-colors text-left">
                  Accessories
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('junior')} className="hover:text-[#C5A880] transition-colors text-left">
                  Junior / Kids Robes
                </button>
              </li>
              <li>
                <button onClick={() => handleShopLink('new')} className="hover:text-[#C5A880] transition-colors text-left">
                  New Arrivals
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: The Lariel World */}
          <div className="space-y-4">
            <h4 className="text-xs tracking-wide text-[#C5A880] font-semibold font-sans">
              The Lariel World
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B8AEA3]">
              <li>
                <button onClick={() => handleWorldLink('story')} className="hover:text-[#C5A880] transition-colors text-left font-medium text-white">
                  Meet Laide (Founder's Story)
                </button>
              </li>
              <li>
                <button onClick={() => handleWorldLink('story')} className="hover:text-[#C5A880] transition-colors text-left">
                  Our Story & Lagos Essentials
                </button>
              </li>
              <li>
                <button onClick={() => handleWorldLink('real-brides')} className="hover:text-[#C5A880] transition-colors text-left">
                  Real Brides (2,000+ Worldwide)
                </button>
              </li>
              <li>
                <button onClick={() => handleWorldLink('journal')} className="hover:text-[#C5A880] transition-colors text-left">
                  The Bridal Journal
                </button>
              </li>
              <li>
                <button onClick={() => handleWorldLink('press')} className="hover:text-[#C5A880] transition-colors text-left">
                  BellaNaija Weddings & Press
                </button>
              </li>
              <li>
                <button onClick={() => handleWorldLink('faq')} className="hover:text-[#C5A880] transition-colors text-left">
                  Client Care & Worldwide Shipping
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Information */}
          <div className="space-y-4">
            <h4 className="text-xs tracking-wide text-[#C5A880] font-semibold font-sans">
              Information
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B8AEA3]">
              <li>
                <button onClick={() => handleInfoLink('size-guide')} className="hover:text-[#C5A880] transition-colors text-left">
                  Size Guide
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('colour-guide')} className="hover:text-[#C5A880] transition-colors text-left">
                  Colour Guide
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('how-to-order')} className="hover:text-[#C5A880] transition-colors text-left">
                  How to Order
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('shipping')} className="hover:text-[#C5A880] transition-colors text-left">
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('returns')} className="hover:text-[#C5A880] transition-colors text-left">
                  Returns
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('faqs')} className="hover:text-[#C5A880] transition-colors text-left">
                  FAQs
                </button>
              </li>
              <li>
                <button onClick={() => handleInfoLink('contact')} className="hover:text-[#C5A880] transition-colors text-left">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div className="space-y-4">
            <h4 className="text-xs tracking-wide text-[#C5A880] font-semibold font-sans">
              Connect
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B8AEA3]">
              <li>
                <a
                  href="https://instagram.com/larielessentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A880] transition-colors flex items-center space-x-2"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com/@larielessentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A880] transition-colors flex items-center space-x-2"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-[#C5A880]">TT</span>
                  <span>TikTok</span>
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com/larielessentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A880] transition-colors flex items-center space-x-2"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-[#C5A880]">FB</span>
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a
                  href="https://pinterest.com/larielessentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A880] transition-colors flex items-center space-x-2"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-[#C5A880]">P</span>
                  <span>Pinterest</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20I%20would%20like%20to%20inquire%20about%20bridal%20robes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C5A880] transition-colors flex items-center space-x-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#2C231D] mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E8378] space-y-4 sm:space-y-0">
          <div>
            © {new Date().getFullYear()} LARIEL. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center space-x-6 text-[11px]">
            <button onClick={() => handleInfoLink('faqs')} className="hover:text-[#FAF8F5] transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => handleInfoLink('faqs')} className="hover:text-[#FAF8F5] transition-colors">
              Terms & Conditions
            </button>
            <button onClick={() => handleInfoLink('shipping')} className="hover:text-[#FAF8F5] transition-colors">
              Shipping Policy
            </button>
            <button
              onClick={() => navigateToAdmin()}
              className="hover:text-[#C5A880] transition-colors text-[#A58860] font-medium flex items-center space-x-1"
            >
              <span>Admin CMS</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
