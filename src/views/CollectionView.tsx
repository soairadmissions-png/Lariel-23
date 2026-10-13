import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { GLOBAL_COLORS } from '../data/currencies';
import { ProductCard } from '../components/ProductCard';
import { CANONICAL_DEFAULTS, getCategoryImage, handleImageError } from '../constants/imageDefaults';

export const CollectionView: React.FC = () => {
  const { selectedCategory, setSelectedCategory, setActiveView, products, categories } = useShop();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Category title and subtitle mapping
  const categoryMeta = useMemo(() => {
    const dynamicCat = categories.find((c) => c.id === selectedCategory);
    if (dynamicCat) {
      return {
        title: dynamicCat.name,
        subtitle: dynamicCat.subtitle || 'Lariel Essentials Haute Couture',
        heroImage: dynamicCat.heroImage || '/uploads/bridal_couch_hero_1788951504284.jpg',
        description: dynamicCat.description || '',
      };
    }
    switch (selectedCategory) {
      case 'bridal':
        return {
          title: 'Bridal Robes',
          subtitle: 'Made for the moment before the dress.',
          heroImage: '/uploads/bridal_couch_hero_1788951504284.jpg',
          description: 'Our signature bridal robes are handcrafted from 22-momme pure Mulberry silk, tiered French illusion tulle, and hand-appliquéd 3D floral petals.',
        };
      case 'bridesmaids':
        return {
          title: 'For Your Girls',
          subtitle: 'Bridesmaids robes & coordinated morning suites.',
          heroImage: '/uploads/regenerated_image_1788954098680.jpg',
          description: 'Featuring our HALO mesh-sleeve robes, Linda ruffle sets, Abiks pearl details, and classic liquid silk styles for your bride tribe.',
        };
      case 'sets':
        return {
          title: 'Bridal Party Sets',
          subtitle: 'Every detail of the morning.',
          heroImage: '/uploads/regenerated_image_1788961847724.jpg',
          description: 'Curated gift sets pairing luxury robes with Mulberry silk bonnets, scrunchies, satin pillowcases, memory-foam slippers, and handheld mini fans.',
        };
      case 'adire':
        return {
          title: 'Rich African Heritage',
          subtitle: 'Adire, reimagined for the modern bride.',
          heroImage: '/uploads/regenerated_image_1788962690479.jpg',
          description: 'Centuries-old Yoruba resist-dyeing traditions meet liquid bridal silk. Handcrafted in Abeokuta and Lagos for unforgettable royal mornings.',
        };
      case 'pyjamas':
        return {
          title: 'Bridal Pyjamas',
          subtitle: 'Feather trim long sets, piped shorts & eve loungewear.',
          heroImage: '/uploads/regenerated_image_1788962695589.png',
          description: 'Slip into cloud-soft Mulberry silk pyjamas with detachable ostrich feathers and custom monogramming for the eve of your celebration.',
        };
      case 'accessories':
        return {
          title: 'Bridal Accessories',
          subtitle: 'Bonnets, pillowcases, flip-flops & suite essentials.',
          heroImage: '/uploads/regenerated_image_1788963974286.jpg',
          description: 'High-protection reversible silk bonnets, lash-setting mini fans, and cushioned flip-flops to ensure flawless ease in the bridal suite.',
        };
      case 'personalised':
        return {
          title: 'Personalised Robes',
          subtitle: 'Custom embroidered surnames, titles & dates.',
          heroImage: '/uploads/regenerated_image_1788963021175.png',
          description: 'Cherish an eternal bridal heirloom with metallic thread monograms across the back or pocket in modern serif or romantic calligraphy.',
        };
      case 'junior':
        return {
          title: 'Junior & Kids Robes',
          subtitle: 'For flower girls and junior bridesmaids.',
          heroImage: '/uploads/regenerated_image_1788965497255.jpg',
          description: 'Delicate matching robes designed for the little princesses participating in your celebration.',
        };
      case 'new':
      default:
        return {
          title: 'New Arrivals',
          subtitle: 'The latest bridal morning couture from Lariel Essentials.',
          heroImage: '/uploads/hero_bridal_bg_1788959544066.jpg',
          description: 'Discover fresh bridal silhouettes, newly released sunset hues, and artisan embellishments.',
        };
    }
  }, [selectedCategory]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Only show published in storefront view
      if (product.status === 'draft' || product.status === 'archived') return false;

      // Category filter
      if (selectedCategory !== 'new' && selectedCategory !== 'all') {
        if (product.category !== selectedCategory) return false;
      }

      // Color filter
      if (selectedColor) {
        const hasColor = product.colors.some(
          (c) => c.name.toLowerCase().includes(selectedColor.toLowerCase())
        );
        if (!hasColor) return false;
      }

      // Style filter
      if (selectedStyle && product.style !== selectedStyle) {
        return false;
      }

      // Collection filter
      if (selectedCollection && !product.collectionName.toLowerCase().includes(selectedCollection.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceUSD - b.priceUSD;
      if (sortBy === 'price-desc') return b.priceUSD - a.priceUSD;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // featured
    });
  }, [selectedCategory, selectedColor, selectedStyle, selectedCollection, sortBy]);

  const activeFiltersCount = (selectedColor ? 1 : 0) + (selectedStyle ? 1 : 0) + (selectedCollection ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedColor(null);
    setSelectedStyle(null);
    setSelectedCollection(null);
  };

  return (
    <div className="w-full bg-[#FAF8F5]">
      {/* Category Hero Banner */}
      <section className="relative w-full py-16 sm:py-24 bg-[#181512] text-[#FAF8F5] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={categoryMeta.heroImage || CANONICAL_DEFAULTS.CATEGORY_BRIDAL}
            alt={categoryMeta.title}
            onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_BRIDAL)}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181512] via-[#181512]/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-3">
          <span className="text-[11px] tracking-wide text-[#E2CFA7] font-medium font-sans block">
            The Global Bridal House
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-[#FAF8F5] font-normal">
            {categoryMeta.title}
          </h1>
          <p className="font-serif italic text-lg sm:text-xl text-[#E5DDD0] font-light">
            {categoryMeta.subtitle}
          </p>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-[#BDB2A4] font-sans pt-2">
            {categoryMeta.description}
          </p>
        </div>
      </section>

      {/* Category Switcher Tabs */}
      <div className="border-b border-[#E8E1D7] bg-[#F7F2EB] sticky top-[73px] z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-6 text-xs tracking-wide font-medium py-3 whitespace-nowrap font-sans">
          {[
            { id: 'bridal', label: 'Bridal Robes' },
            { id: 'bridesmaids', label: 'For Your Girls' },
            { id: 'sets', label: 'Bridal Party Sets' },
            { id: 'adire', label: '✦ Adire Heritage' },
            { id: 'pyjamas', label: 'Pyjamas' },
            { id: 'accessories', label: 'Accessories' },
            { id: 'personalised', label: 'Personalised' },
            { id: 'junior', label: 'Junior / Kids' },
            { id: 'new', label: 'New Arrivals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                clearAllFilters();
                window.scrollTo({ top: 220, behavior: 'smooth' });
              }}
              className={`pb-1 transition-colors ${
                selectedCategory === cat.id
                  ? 'text-[#C5A880] border-b-2 border-[#C5A880] font-semibold'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Control Bar (Filter toggle, count, sorting) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E8E1D7] gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className="flex items-center space-x-2 bg-[#F2ECE4] border border-[#E3D9CC] px-4 py-2 text-xs tracking-wide font-medium hover:bg-[#EAE1D4] transition-colors font-sans"
            >
              <Filter className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#111111] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <span className="text-xs text-neutral-500 tracking-wide font-sans">
              {filteredProducts.length} Pieces
            </span>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#A68962] hover:underline tracking-wide font-sans"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2 text-xs font-sans">
            <span className="text-neutral-500 tracking-wide">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#F2ECE4] border border-[#E3D9CC] px-3 py-1.5 text-xs font-medium focus:outline-none tracking-wide cursor-pointer font-sans"
            >
              <option value="featured">Featured Couture</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {isFilterDrawerOpen && (
          <div className="py-6 border-b border-[#E8E1D7] bg-[#FAF6F0] p-6 mb-8 text-left space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8DFC8]">
              <h4 className="font-serif text-lg font-normal text-neutral-900">
                Refine Collection
              </h4>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="text-xs text-neutral-500 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Filter 1: Colour */}
              <div>
                <span className="text-xs tracking-wide font-semibold text-neutral-800 block mb-2 font-sans">
                  Colour ({selectedColor || 'All'})
                </span>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
                  {GLOBAL_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(selectedColor === c.name ? null : c.name)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs border transition-all ${
                        selectedColor === c.name
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-neutral-300" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 2: Style */}
              <div>
                <span className="text-xs tracking-wide font-semibold text-neutral-800 block mb-2 font-sans">
                  Style / Silhouette
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Silk', 'Tulle', 'Lace', 'Corset', 'Embellished', 'Custom'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStyle(selectedStyle === st ? null : st)}
                      className={`px-3 py-1 text-xs border transition-all ${
                        selectedStyle === st
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 3: Signature Essentials Line */}
              <div>
                <span className="text-xs tracking-wide font-semibold text-neutral-800 block mb-2 font-sans">
                  Signature Line
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Amanda', 'Mercy', 'Classic', 'Sunset', 'Lily', 'Bunmí', 'Sisi Yemi'].map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedCollection(selectedCollection === col ? null : col)}
                      className={`px-3 py-1 text-xs border transition-all ${
                        selectedCollection === col
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <h3 className="font-serif text-2xl text-neutral-800">No pieces match your selected filters</h3>
            <p className="text-xs text-neutral-500 mt-2 font-sans">
              Try adjusting your color, style, or collection filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-6 bg-[#111111] text-[#FAF8F5] text-xs tracking-wide px-6 py-3 font-semibold hover:bg-[#C5A880] transition-colors font-sans"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 xs:gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-10 mt-6 sm:mt-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Custom Order Callout inside Collection */}
        <div className="mt-20 bg-[#F4ECE3] border border-[#E3D9CC] p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] tracking-wide text-[#A68962] font-semibold block font-sans">
            Bespoke Commissions
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-normal">
            Looking for a custom color or cathedral train length?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
            Our master patternmakers and hand-embellishers in Lagos craft one-of-a-kind robes to match your wedding scheme.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setActiveView('custom-design')}
              className="bg-[#111111] text-white text-xs tracking-wide px-6 py-3 font-semibold hover:bg-[#C5A880] transition-colors font-sans"
            >
              Bespoke Studio
            </button>
            <a
              href="https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20I%20would%20like%20to%20inquire%20about%20a%20custom%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-neutral-800 bg-white text-neutral-900 text-xs tracking-wide px-6 py-3 font-medium hover:border-[#25D366] hover:text-[#25D366] transition-colors font-sans"
            >
              WhatsApp Essentials
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
