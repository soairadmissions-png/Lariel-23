import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Heart,
  Search,
  Menu,
  X,
  ChevronDown,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Currency } from '../types';
import { CURRENCIES } from '../data/currencies';
import larielLogoSvg from '../assets/images/lariel_logo.svg';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    navigateToCategory,
    selectedWorldTab,
    setSelectedWorldTab,
    setSelectedInfoTab,
    cartCount,
    setIsCartOpen,
    currency,
    setCurrency,
    wishlist,
    setIsWishlistOpen,
    setIsSearchOpen,
    siteSettings,
  } = useShop();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: string, subCategory?: string, worldTab?: string, infoTab?: string) => {
    setIsMobileMenuOpen(false);

    if (view === 'collection' && subCategory) {
      navigateToCategory(subCategory);
    } else if (view === 'the-lariel-world') {
      if (worldTab) setSelectedWorldTab(worldTab);
      setActiveView('the-lariel-world');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'information') {
      if (infoTab) setSelectedInfoTab(infoTab);
      setActiveView('information');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    setIsCurrencyDropdownOpen(false);
    try {
      localStorage.setItem('lariel_currency', newCurrency);
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* MAIN NAVIGATION: LARIEL logo, SHOP, NEW ARRIVALS | Currency, Search, Wishlist, Shopping Bag */}
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 transition-all duration-300">
        <div
          className={`max-w-7xl mx-auto rounded-full bg-[#FAF8F5]/94 backdrop-blur-xl border border-[#E5DACD]/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 px-4 sm:px-6 lg:px-8 flex items-center justify-between ${
            isScrolled ? 'py-2 sm:py-2.5 shadow-[0_10px_35px_rgb(0,0,0,0.1)] bg-[#FAF8F5]/98' : 'py-3 sm:py-3.5'
          }`}
        >
          {/* Left: LARIEL Brand Logo Image */}
          <div className="flex items-center shrink-0">
            <div
              className="flex items-center cursor-pointer group select-none py-0.5 text-left"
              onClick={() => handleNavClick('home')}
            >
              <img
                src={siteSettings?.brandLogoImage || larielLogoSvg || CANONICAL_DEFAULTS.LOGO_WORDMARK}
                alt="Lariel Essentials Bridal"
                onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.LOGO_WORDMARK)}
                className="h-7 xs:h-8 sm:h-10 md:h-12 w-auto object-contain group-hover:scale-[1.02] group-hover:opacity-95 transition-all duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Center: Navigation Links (Shop, Meet Laide, New Arrivals, The World) - visible and responsive across all screens */}
          <nav className="flex items-center space-x-1 xs:space-x-1.5 sm:space-x-3 md:space-x-4 lg:space-x-6 text-[10px] xs:text-[11px] sm:text-xs tracking-wide font-medium font-sans overflow-x-auto scrollbar-none py-0.5">
            {/* 1. Shop */}
            <button
              onClick={() => handleNavClick('home')}
              className={`transition-colors hover:text-[#C5A880] px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full whitespace-nowrap ${
                activeView === 'home' || activeView === 'collection'
                  ? 'text-[#A68962] font-semibold bg-[#F2ECE4]/90'
                  : 'text-[#1E1B18]'
              }`}
            >
              Shop
            </button>

            {/* 2. Meet Laide / Our Story */}
            <button
              onClick={() => handleNavClick('the-lariel-world', undefined, 'story')}
              className={`transition-colors hover:text-[#C5A880] px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full whitespace-nowrap ${
                activeView === 'the-lariel-world' && selectedWorldTab === 'story'
                  ? 'text-[#A68962] font-semibold bg-[#F2ECE4]/90'
                  : 'text-[#1E1B18] hover:bg-[#F2ECE4]/60'
              }`}
            >
              Meet Laide
            </button>

            {/* 3. New Arrivals */}
            <button
              onClick={() => {
                if (activeView === 'home') {
                  const el = document.getElementById('section-new-arrivals');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else handleNavClick('collection', 'new');
                } else {
                  handleNavClick('collection', 'new');
                }
              }}
              className="transition-colors hover:text-[#C5A880] px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full whitespace-nowrap text-[#1E1B18] hover:bg-[#F2ECE4]/60"
            >
              New In
            </button>

            {/* 4. The Lariel World */}
            <button
              onClick={() => handleNavClick('the-lariel-world', undefined, 'real-brides')}
              className={`transition-colors hover:text-[#C5A880] px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full whitespace-nowrap ${
                activeView === 'the-lariel-world' && selectedWorldTab !== 'story'
                  ? 'text-[#A68962] font-semibold bg-[#F2ECE4]/90'
                  : 'text-[#1E1B18] hover:bg-[#F2ECE4]/60'
              }`}
            >
              The World
            </button>
          </nav>

          {/* Right Side: Currency, Concierge, Search, Wishlist, Shopping Bag */}
          <div className="flex items-center space-x-1 xs:space-x-1.5 sm:space-x-2.5 text-[#1E1B18] shrink-0">
            
            {/* Country / Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                className="flex items-center space-x-1.5 text-[#1E1B18] hover:text-[#C5A880] transition-colors py-1.5 px-2.5 sm:px-3 rounded-full bg-[#F5EFE6]/85 hover:bg-[#EFE5D7] border border-[#E8DFCFC] text-[10px] sm:text-[11px] tracking-wider font-medium"
                title="Select Country & Currency"
              >
                <span className="text-xs sm:text-sm">{CURRENCIES[currency]?.flag || '🇳🇬'}</span>
                <span className="hidden xs:inline">{CURRENCIES[currency]?.code || 'NGN'}</span>
                <span className="text-[#A8885D] font-semibold">{CURRENCIES[currency]?.symbol || '₦'}</span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {isCurrencyDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#FAF8F5] text-[#1E1B18] shadow-2xl border border-[#DCD1C0] py-2 z-50 rounded-2xl text-left"
                  onMouseLeave={() => setIsCurrencyDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2 text-[10px] text-[#A8885D] tracking-wide border-b border-[#EADFCF] font-semibold font-sans">
                    Country / Currency Selector
                  </div>
                  {(Object.keys(CURRENCIES) as Currency[]).map((cur) => {
                    const cfg = CURRENCIES[cur];
                    const isSelected = currency === cur;
                    return (
                      <button
                        key={cur}
                        onClick={() => handleCurrencyChange(cur)}
                        className={`w-full text-left px-3.5 py-2 text-[11px] flex items-center justify-between hover:bg-[#F2ECE4] transition-colors ${
                          isSelected ? 'text-[#A8885D] font-semibold bg-[#EADFCF]/50' : 'text-[#5A5046]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{cfg.flag}</span>
                          <span className="font-sans">{cfg.country?.split('&')[0].trim()}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#1E1B18]">
                          {cfg.code} {cfg.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center space-x-1.5 text-xs tracking-wide hover:text-[#C5A880] transition-colors px-3 py-1.5 rounded-full bg-[#F5EFE6]/80 hover:bg-[#EFE5D7] border border-[#E8DFCFC] font-sans"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden md:inline font-medium">Search</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              className="relative p-2 rounded-full hover:bg-[#F2ECE4] hover:text-[#C5A880] transition-colors"
              title="Saved Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-4.5 h-4.5 stroke-[1.4]" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#C5A880] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping Bag */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-[#F2ECE4] hover:text-[#C5A880] transition-colors flex items-center border border-[#D8CEBF]/60 bg-white/80"
              title="Shopping Bag"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-4.5 h-4.5 stroke-[1.4] text-[#1E1B18]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#181614] text-[#FAF8F5] text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-[#C5A880]">
                  {cartCount}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[76px] bg-[#FAF8F5] border-b border-[#E5DACD] shadow-2xl p-6 z-40 max-h-[calc(100vh-80px)] overflow-y-auto text-left">
          <div className="space-y-4">
            
            <div className="space-y-2 border-b border-[#E8E1D7] pb-4">
              <button
                onClick={() => handleNavClick('home')}
                className="block w-full text-left text-sm font-semibold tracking-wide py-2 text-[#181614] hover:text-[#C5A880] font-sans"
              >
                Shop
              </button>
              <button
                onClick={() => handleNavClick('the-lariel-world', undefined, 'story')}
                className="block w-full text-left text-sm font-semibold tracking-wide py-2 text-[#181614] hover:text-[#C5A880] font-sans flex items-center justify-between"
              >
                <span>Meet Laide (Founder's Story)</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#F2ECE4] text-[#A68962] px-2 py-0.5 rounded-full">New</span>
              </button>
              <button
                onClick={() => handleNavClick('the-lariel-world', undefined, 'real-brides')}
                className="block w-full text-left text-sm font-semibold tracking-wide py-2 text-[#181614] hover:text-[#C5A880] font-sans"
              >
                The Lariel World
              </button>
              <button
                onClick={() => {
                  handleNavClick('home');
                  setTimeout(() => {
                    document.getElementById('section-new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
                  }, 200);
                }}
                className="block w-full text-left text-sm font-semibold tracking-wide py-2 text-[#181614] hover:text-[#C5A880] font-sans"
              >
                New Arrivals
              </button>
              <button
                onClick={() => handleNavClick('the-lariel-world', undefined, undefined, 'size-guide')}
                className="block w-full text-left text-sm font-semibold tracking-wide py-2 text-[#181614] hover:text-[#C5A880] font-sans"
              >
                Information
              </button>
            </div>

            {/* Quick Collections Jump */}
            <div className="border-b border-[#E8E1D7] pb-4">
              <span className="text-[10px] tracking-wide text-[#A68962] block mb-3 font-semibold font-sans">
                Major Collections
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => handleNavClick('collection', 'bridal')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Bridal Robes
                </button>
                <button onClick={() => handleNavClick('collection', 'bridesmaids')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Bridesmaids Robes
                </button>
                <button onClick={() => handleNavClick('collection', 'sets')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Bridal Party Sets
                </button>
                <button onClick={() => handleNavClick('collection', 'adire')} className="text-left py-1 text-[#A68962] font-medium">
                  Adire Heritage
                </button>
                <button onClick={() => handleNavClick('collection', 'pyjamas')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Pyjamas
                </button>
                <button onClick={() => handleNavClick('collection', 'accessories')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Accessories
                </button>
                <button onClick={() => handleNavClick('collection', 'junior')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Junior / Kids
                </button>
                <button onClick={() => handleNavClick('product', 'personalised-embroidered-robe')} className="text-left py-1 text-neutral-800 hover:text-[#A68962]">
                  Personalised Robes
                </button>
              </div>
            </div>

            {/* Country Currency Selector for Mobile */}
            <div className="pt-2">
              <span className="text-[10px] tracking-wide text-[#A68962] block mb-2 font-semibold font-sans">
                Currency: {currency} ({CURRENCIES[currency].symbol.trim()})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CURRENCIES) as Currency[]).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => handleCurrencyChange(cur)}
                    className={`px-3 py-1.5 text-[10.5px] rounded-lg border font-medium ${
                      currency === cur
                        ? 'bg-[#1E1B18] text-[#FAF8F5] border-[#1E1B18]'
                        : 'bg-[#F2ECE4] text-[#4E453D] border-[#E0D5C7]'
                    }`}
                  >
                    {CURRENCIES[cur].flag} {cur}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};
