import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Copy,
  Check,
  Search,
  ExternalLink,
  Plus,
  Loader2,
  FileImage,
  FolderOpen,
  Sparkles,
  ShoppingBag,
  FolderTree,
  Home,
  Heart,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface ServerMediaItem {
  url: string;
  fileName: string;
  size: number;
  createdAt: string;
}

interface MediaItem {
  url: string;
  title: string;
  category: string;
  source: 'upload' | 'catalog';
  size?: number;
}

export const AdminMediaLibrary: React.FC = () => {
  const {
    products,
    refreshProducts,
    categories,
    refreshCategories,
    siteSettings,
    refreshSiteSettings,
    realBrides,
    refreshRealBrides,
    showToast,
  } = useShop();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [serverMedia, setServerMedia] = useState<ServerMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Use in Store" Apply Modal State
  const [applyModalItem, setApplyModalItem] = useState<MediaItem | null>(null);
  const [applyTab, setApplyTab] = useState<'product' | 'category' | 'home' | 'real-bride'>('product');
  const [isApplying, setIsApplying] = useState(false);

  // Apply to Product state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productApplyMode, setProductApplyMode] = useState<'primary' | 'gallery'>('primary');

  // Apply to Category state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('bridal');

  // Apply to Real Bride state
  const [brideName, setBrideName] = useState('');
  const [brideLocation, setBrideLocation] = useState('Lagos, Nigeria');
  const [brideCategory, setBrideCategory] = useState<'Bride' | 'Bridesmaids' | 'Bridal Party' | 'Custom' | 'Adire'>('Bride');
  const [brideDate, setBrideDate] = useState('October 2024');
  const [brideRobeWorn, setBrideRobeWorn] = useState('The Crown Jewel Bridal Robe');
  const [brideQuote, setBrideQuote] = useState('');

  const fetchServerMedia = async () => {
    try {
      setIsLoadingMedia(true);
      const res = await fetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        setServerMedia(data);
      }
    } catch (err) {
      console.error('Failed to load media assets:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchServerMedia();
  }, []);

  // Set default product selection when products load or modal opens
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.uploadFile(file);
      if (res && res.url) {
        showToast(`Uploaded ${res.fileName || 'asset'} successfully!`);
        await fetchServerMedia();

        // Automatically open the "Use in Store" modal for this newly uploaded asset
        const newItem: MediaItem = {
          url: res.url,
          title: res.fileName || file.name,
          category: 'Admin Upload',
          source: 'upload',
          size: file.size,
        };
        setApplyModalItem(newItem);
        setApplyTab('product');
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Combine server uploads and catalog product photos
  const mediaList = useMemo(() => {
    const list: MediaItem[] = [];
    const seen = new Set<string>();

    // First add server uploaded media
    serverMedia.forEach((sm) => {
      seen.add(sm.url);
      list.push({
        url: sm.url,
        title: sm.fileName,
        category: 'Admin Upload',
        source: 'upload',
        size: sm.size,
      });
    });

    // Then add unique images from products not already present
    products.forEach((p) => {
      p.images.forEach((img) => {
        if (!seen.has(img)) {
          seen.add(img);
          list.push({
            url: img,
            title: p.name,
            category: p.category,
            source: 'catalog',
          });
        }
      });
    });

    return list;
  }, [serverMedia, products]);

  const filteredMedia = mediaList.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.url.toLowerCase().includes(q);
  });

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    showToast('Image URL copied to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 1. Apply to Product Handler
  const handleApplyToProduct = async () => {
    if (!applyModalItem || !selectedProductId) return;
    const targetProduct = products.find((p) => p.id === selectedProductId);
    if (!targetProduct) return;

    setIsApplying(true);
    try {
      let updatedImages: string[];
      if (productApplyMode === 'primary') {
        updatedImages = [applyModalItem.url, ...targetProduct.images.filter((img) => img !== applyModalItem.url)];
      } else {
        if (targetProduct.images.includes(applyModalItem.url)) {
          updatedImages = targetProduct.images;
        } else {
          updatedImages = [...targetProduct.images, applyModalItem.url];
        }
      }

      await api.updateProduct(targetProduct.id, { images: updatedImages });
      await refreshProducts();
      triggerStoreSync();
      showToast(
        productApplyMode === 'primary'
          ? `Set as Primary Hero Image for "${targetProduct.name}"!`
          : `Added to gallery of "${targetProduct.name}"!`
      );
      setApplyModalItem(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update product');
    } finally {
      setIsApplying(false);
    }
  };

  // 2. Apply as Category Banner Handler
  const handleApplyToCategory = async () => {
    if (!applyModalItem || !selectedCategoryId) return;
    const targetCat = categories.find((c) => c.id === selectedCategoryId);
    if (!targetCat) return;

    setIsApplying(true);
    try {
      await api.updateCategory(targetCat.id, { heroImage: applyModalItem.url });
      await refreshCategories();
      triggerStoreSync();
      showToast(`Updated "${targetCat.name}" category hero banner!`);
      setApplyModalItem(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update category');
    } finally {
      setIsApplying(false);
    }
  };

  // 3. Apply as Homepage Hero Handler
  const handleApplyToHomeHero = async () => {
    if (!applyModalItem) return;

    setIsApplying(true);
    try {
      await api.updateSettings({ homeHeroImage: applyModalItem.url });
      await refreshSiteSettings();
      triggerStoreSync();
      showToast('Homepage Hero photograph updated live on storefront!');
      setApplyModalItem(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update home hero');
    } finally {
      setIsApplying(false);
    }
  };

  // 4. Publish as Real Bride Story
  const handlePublishRealBride = async () => {
    if (!applyModalItem) return;
    if (!brideName.trim()) {
      showToast('Please enter the Bride Name');
      return;
    }

    setIsApplying(true);
    try {
      await api.createRealBride({
        brideName: brideName.trim(),
        location: brideLocation.trim(),
        weddingDate: brideDate.trim() || '2024',
        category: brideCategory,
        robeWorn: brideRobeWorn.trim() || 'Bespoke Silk Robe',
        image: applyModalItem.url,
        quote: brideQuote.trim() || 'Our wedding morning was elevated with timeless luxury and unforgettable intimacy.',
      });
      await refreshRealBrides();
      triggerStoreSync();
      showToast(`Real Bride story for "${brideName}" published live in The Lariel World!`);
      setApplyModalItem(null);
      setBrideName('');
      setBrideQuote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish real bride');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#181614] font-normal">
            Media & Photography Library
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Upload high-resolution photography and apply assets directly to Products, Categories, Homepage Hero, or Real Bride stories.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photography</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by file name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-4 text-xs text-neutral-500">
          <span>{serverMedia.length} administrative uploads</span>
          <span>•</span>
          <span>Showing {filteredMedia.length} of {mediaList.length} total assets</span>
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E0D5C3] rounded-2xl text-neutral-500 text-sm">
          <FolderOpen className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
          No visual assets matched your search query.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((media, idx) => {
            const isCopied = copiedUrl === media.url;
            return (
              <div
                key={idx}
                className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl overflow-hidden shadow-2xs group flex flex-col justify-between"
              >
                <div
                  className="relative h-48 bg-neutral-100 cursor-pointer overflow-hidden"
                  onClick={() => setSelectedPreviewImage(media.url)}
                >
                  <img
                    src={media.url}
                    alt={media.title}
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[11px] font-medium bg-black/60 px-2 py-1 rounded-md">
                      Click to Zoom
                    </span>
                  </div>
                  {media.size && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                      {formatBytes(media.size)}
                    </span>
                  )}
                </div>

                <div className="p-3 text-xs space-y-2.5">
                  <div>
                    <div className="font-medium text-neutral-900 truncate text-[11px]" title={media.title}>
                      {media.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate font-mono">
                      {media.url}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyModalItem(media);
                        setApplyTab('product');
                      }}
                      className="w-full py-1.5 px-2 bg-[#181614] hover:bg-[#C5A880] text-white rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3 text-[#C5A880] group-hover:text-white" />
                      <span>Use in Store...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(media.url)}
                      className="w-full py-1 px-2 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-lg text-[10px] font-medium text-neutral-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied URL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-400" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Zoom Modal */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 relative">
            <img
              src={selectedPreviewImage}
              alt="Zoomed preview"
              onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* "USE IN STORE" APPLY MODAL */}
      {applyModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E0D5C3] flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#DCD1BF] bg-neutral-100 shrink-0">
                  <img
                    src={applyModalItem.url}
                    alt={applyModalItem.title}
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-serif text-base text-neutral-900">Apply Asset to Storefront</h3>
                  <p className="text-[11px] text-neutral-500 truncate max-w-xs">{applyModalItem.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalItem(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Destination Navigation Tabs */}
            <div className="flex border-b border-[#E0D5C3] bg-[#F4EFEA] px-4 pt-2 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setApplyTab('product')}
                className={`px-3 py-2 text-xs font-medium rounded-t-xl transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  applyTab === 'product'
                    ? 'bg-white text-neutral-900 border-t border-x border-[#E0D5C3]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Product</span>
              </button>

              <button
                type="button"
                onClick={() => setApplyTab('category')}
                className={`px-3 py-2 text-xs font-medium rounded-t-xl transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  applyTab === 'category'
                    ? 'bg-white text-neutral-900 border-t border-x border-[#E0D5C3]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Category Banner</span>
              </button>

              <button
                type="button"
                onClick={() => setApplyTab('home')}
                className={`px-3 py-2 text-xs font-medium rounded-t-xl transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  applyTab === 'home'
                    ? 'bg-white text-neutral-900 border-t border-x border-[#E0D5C3]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Home Hero</span>
              </button>

              <button
                type="button"
                onClick={() => setApplyTab('real-bride')}
                className={`px-3 py-2 text-xs font-medium rounded-t-xl transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                  applyTab === 'real-bride'
                    ? 'bg-white text-neutral-900 border-t border-x border-[#E0D5C3]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Real Bride</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#FAF8F5] space-y-4">
              {/* TAB 1: PRODUCT */}
              {applyTab === 'product' && (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-600">
                    Attach this photography directly to an existing product in the catalog.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Select Target Product
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.priceUSD}) — [{p.category}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Placement on Product
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          productApplyMode === 'primary'
                            ? 'bg-white border-[#C5A880] ring-2 ring-[#C5A880]/20'
                            : 'bg-white border-[#DCD1BF] text-neutral-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="productMode"
                          checked={productApplyMode === 'primary'}
                          onChange={() => setProductApplyMode('primary')}
                          className="hidden"
                        />
                        <div className="font-semibold text-xs text-neutral-900">Primary Hero Thumbnail</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Shows on collection cards, product list, and main zoom image.
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          productApplyMode === 'gallery'
                            ? 'bg-white border-[#C5A880] ring-2 ring-[#C5A880]/20'
                            : 'bg-white border-[#DCD1BF] text-neutral-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="productMode"
                          checked={productApplyMode === 'gallery'}
                          onChange={() => setProductApplyMode('gallery')}
                          className="hidden"
                        />
                        <div className="font-semibold text-xs text-neutral-900">Add to Gallery</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Adds as an additional look angle in the product gallery.
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyToProduct}
                      disabled={isApplying}
                      className="w-full py-2.5 px-4 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isApplying ? 'Applying to Product...' : 'Apply Image to Product'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CATEGORY BANNER */}
              {applyTab === 'category' && (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-600">
                    Set this photography as the hero editorial banner for a category page.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Select Target Category
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — ({c.subtitle || c.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyToCategory}
                      disabled={isApplying}
                      className="w-full py-2.5 px-4 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isApplying ? 'Updating Banner...' : 'Set as Category Hero Banner'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: HOMEPAGE HERO */}
              {applyTab === 'home' && (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-600">
                    Set this photography as the primary bridal portrait featured on the homepage hero section ("The Art of the Bridal Morning").
                  </p>

                  <div className="rounded-xl overflow-hidden border border-[#DCD1BF] h-40 relative">
                    <img
                      src={applyModalItem.url}
                      alt="Home hero preview"
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.HERO_MAIN)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <span className="text-white text-xs font-medium">Live Homepage Hero Preview</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyToHomeHero}
                      disabled={isApplying}
                      className="w-full py-2.5 px-4 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isApplying ? 'Updating Homepage...' : 'Set as Main Storefront Hero Photography'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: REAL BRIDE STORY */}
              {applyTab === 'real-bride' && (
                <div className="space-y-3.5">
                  <p className="text-xs text-neutral-600">
                    Publish this photography as a Real Bride feature story in The Lariel World.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Bride Name(s) *
                      </label>
                      <input
                        type="text"
                        value={brideName}
                        onChange={(e) => setBrideName(e.target.value)}
                        placeholder="e.g. Tolu & Femi"
                        className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Wedding Location
                      </label>
                      <input
                        type="text"
                        value={brideLocation}
                        onChange={(e) => setBrideLocation(e.target.value)}
                        placeholder="e.g. Lagos, Nigeria"
                        className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Category Tag
                      </label>
                      <select
                        value={brideCategory}
                        onChange={(e) => setBrideCategory(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                      >
                        <option value="Bride">Bride</option>
                        <option value="Bridesmaids">Bridesmaids</option>
                        <option value="Bridal Party">Bridal Party</option>
                        <option value="Custom">Custom</option>
                        <option value="Adire">Adire</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Wedding Date
                      </label>
                      <input
                        type="text"
                        value={brideDate}
                        onChange={(e) => setBrideDate(e.target.value)}
                        placeholder="October 2024"
                        className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Robe Worn
                    </label>
                    <input
                      type="text"
                      value={brideRobeWorn}
                      onChange={(e) => setBrideRobeWorn(e.target.value)}
                      placeholder="e.g. The Crown Jewel Bridal Robe"
                      className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Bride Quote / Story Excerpt
                    </label>
                    <textarea
                      rows={2}
                      value={brideQuote}
                      onChange={(e) => setBrideQuote(e.target.value)}
                      placeholder="My bespoke robe was the highlight of our bridal suite morning..."
                      className="w-full px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handlePublishRealBride}
                      disabled={isApplying}
                      className="w-full py-2.5 px-4 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isApplying ? 'Publishing Story...' : 'Publish to Real Brides in The Lariel World'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#E0D5C3] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setApplyModalItem(null)}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
