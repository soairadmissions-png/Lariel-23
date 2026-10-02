import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Check,
  Sparkles,
  Layers,
  Palette,
  DollarSign,
  Package,
  FileText,
  Tag,
  Star,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FolderOpen,
  X,
  Search,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { Product, ProductColor } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface AdminProductEditorProps {
  productId?: string | null;
  onBack: () => void;
  onPreview: (product: Product) => void;
}

const PRESET_COLORS: ProductColor[] = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Champagne Gold', hex: '#F7E7CE' },
  { name: 'Blush Pink', hex: '#FFD1DC' },
  { name: 'Rose Gold', hex: '#B76E79' },
  { name: 'Sage Green', hex: '#9CAF88' },
  { name: 'Emerald Green', hex: '#046307' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Midnight Black', hex: '#181614' },
  { name: 'Indigo Adire', hex: '#1F2E54' },
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Custom Fit'];

export const AdminProductEditor: React.FC<AdminProductEditorProps> = ({
  productId,
  onBack,
  onPreview,
}) => {
  const { products, refreshProducts, showToast, categories } = useShop();

  // Find existing product or create default template
  const isEditing = Boolean(productId);
  const existingProduct = products.find((p) => p.id === productId || p.slug === productId);

  // Synchronize formData with existingProduct on initial load or when productId changes
  const initializedProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (productId && products.length > 0) {
      if (initializedProductIdRef.current !== productId) {
        const match = products.find((p) => p.id === productId || p.slug === productId);
        if (match) {
          setFormData(match);
          initializedProductIdRef.current = productId;
        }
      }
    }
  }, [productId, products]);

  const [activeTab, setActiveTab] = useState<
    'basic' | 'pricing' | 'media' | 'variants' | 'craft' | 'merchandising'
  >('basic');

  // Form State
  const [formData, setFormData] = useState<Product>(() => {
    if (existingProduct) {
      return { ...existingProduct };
    }
    return {
      id: `prod-${Date.now()}`,
      name: '',
      slug: '',
      subtitle: '',
      category: 'bridal',
      style: 'Silk',
      collectionName: 'Bridal Morning',
      priceUSD: 195,
      compareAtPriceUSD: undefined,
      description: '',
      details: ['Handcrafted with 22-momme pure Mulberry silk', 'Finished with French couture seams'],
      materials: '100% Pure Mulberry Silk & French illusion lace',
      sizingNotes: 'True to luxury bridal sizing. Relaxed robe silhouette with adjustable silk waist sash.',
      shippingNotes: 'Handcrafted in 7–14 business days. Express worldwide delivery available via DHL Express.',
      careNotes: 'Dry clean only or delicate hand wash in cold water using silk-safe detergent. Iron on reverse cool setting.',
      images: [CANONICAL_DEFAULTS.PRODUCT],
      colors: [{ name: 'Ivory', hex: '#FFFFF0' }, { name: 'Champagne', hex: '#F7E7CE' }],
      sizes: ['S', 'M', 'L', 'XL'],
      isBestSeller: false,
      isNew: true,
      badge: 'New Release',
      rating: 5.0,
      reviewCount: 1,
      status: 'published',
      stockQuantity: 25,
      stockStatus: 'in_stock',
      sku: `LE-BRI-${Math.floor(100 + Math.random() * 900)}`,
      setItems: [],
      crossSellIds: [],
    };
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDetailText, setNewDetailText] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#C5A880');
  const [newCustomSize, setNewCustomSize] = useState('');
  const [newSetItemText, setNewSetItemText] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaLibraryAssets, setMediaLibraryAssets] = useState<{ url: string; fileName: string; size: number }[]>([]);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [uploadAsPrimary, setUploadAsPrimary] = useState(true);

  // Hidden file input ref for replacing individual images
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingImageIndex, setReplacingImageIndex] = useState<number | null>(null);

  const openMediaPicker = async () => {
    setIsMediaPickerOpen(true);
    try {
      setIsLoadingMediaAssets(true);
      const assets = await api.getMedia();
      setMediaLibraryAssets(assets || []);
    } catch (err) {
      console.error('Failed to load media library:', err);
    } finally {
      setIsLoadingMediaAssets(false);
    }
  };

  const handleSelectMediaAsset = async (assetUrl: string, asPrimary: boolean = false) => {
    const currentImages = Array.isArray(formData.images) ? [...formData.images] : [];
    const isPlaceholderOnly =
      currentImages.length === 0 ||
      (currentImages.length === 1 &&
        (currentImages[0] === CANONICAL_DEFAULTS.PRODUCT || currentImages[0].includes('bridal_couch_hero')));

    let nextImages: string[];
    if (isPlaceholderOnly) {
      nextImages = [assetUrl];
    } else if (asPrimary) {
      nextImages = [assetUrl, ...currentImages.filter((img) => img !== assetUrl)];
    } else if (currentImages.includes(assetUrl)) {
      nextImages = currentImages;
    } else {
      nextImages = [...currentImages, assetUrl];
    }

    setFormData((prev) => ({ ...prev, images: nextImages }));

    // Auto-persist immediately to database if editing existing product
    if (isEditing && (existingProduct?.id || productId)) {
      const targetId = existingProduct?.id || productId!;
      try {
        await api.updateProduct(targetId, { images: nextImages });
        await refreshProducts();
        triggerStoreSync();
      } catch (err) {
        console.warn('Auto-save of selected asset failed:', err);
      }
    }

    setIsMediaPickerOpen(false);
    showToast(asPrimary ? 'Selected asset set as primary hero image!' : 'Image added to gallery!');
  };

  // Auto-generate slug and SKU when name changes if creating fresh
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      slug: !isEditing ? slug : prev.slug,
      sku: !isEditing && !prev.sku ? `LE-${name.slice(0, 3).toUpperCase()}-001` : prev.sku,
    }));
  };

  // Image handlers
  const handleAddImageUrl = async () => {
    if (!newImageUrl.trim()) return;
    const urlToAdd = newImageUrl.trim();
    if (urlToAdd.startsWith('blob:')) {
      showToast('Blob URLs are temporary and cannot be saved.');
      return;
    }

    const currentImages = Array.isArray(formData.images) ? [...formData.images] : [];
    const isPlaceholderOnly =
      currentImages.length === 0 ||
      (currentImages.length === 1 &&
        (currentImages[0] === CANONICAL_DEFAULTS.PRODUCT || currentImages[0].includes('bridal_couch_hero')));

    const nextImages = isPlaceholderOnly
      ? [urlToAdd]
      : currentImages.includes(urlToAdd)
        ? currentImages
        : [...currentImages, urlToAdd];

    setFormData((prev) => ({ ...prev, images: nextImages }));
    setNewImageUrl('');

    if (isEditing && (existingProduct?.id || productId)) {
      const targetId = existingProduct?.id || productId!;
      try {
        await api.updateProduct(targetId, { images: nextImages });
        await refreshProducts();
        triggerStoreSync();
        showToast('Image URL added & saved to product');
      } catch {
        showToast('Image URL added to form');
      }
    } else {
      showToast('Image URL added');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Upload directly via binary stream / base64 to persistent disk storage
      const res = await api.uploadFile(file);
      const persistentUrl = res.url; // Guaranteed durable server URL /uploads/...

      const currentImages = Array.isArray(formData.images) ? [...formData.images] : [];
      const isPlaceholderOnly =
        currentImages.length === 0 ||
        (currentImages.length === 1 &&
          (currentImages[0] === CANONICAL_DEFAULTS.PRODUCT ||
           currentImages[0].includes('bridal_couch_hero') ||
           currentImages[0].includes('placeholder')));

      let nextImages: string[];
      if (isPlaceholderOnly || uploadAsPrimary) {
        nextImages = isPlaceholderOnly
          ? [persistentUrl]
          : [persistentUrl, ...currentImages.filter((img) => img !== persistentUrl && !img.includes('bridal_couch_hero') && img !== CANONICAL_DEFAULTS.PRODUCT)];
      } else {
        nextImages = [...currentImages.filter((img) => img !== persistentUrl), persistentUrl];
      }

      if (nextImages.length === 0) {
        nextImages = [persistentUrl];
      }

      setFormData((prev) => ({
        ...prev,
        images: nextImages,
      }));

      // If editing an existing product, immediately persist to database so it survives page refresh
      if (isEditing && (existingProduct?.id || productId)) {
        const targetId = existingProduct?.id || productId!;
        try {
          await api.updateProduct(targetId, { images: nextImages });
          await refreshProducts();
          triggerStoreSync();
          showToast(uploadAsPrimary ? 'Uploaded, set as primary hero & saved permanently!' : 'Image uploaded & saved to product permanently!');
        } catch (dbErr: any) {
          console.error('Auto-save to database failed:', dbErr);
          showToast(`Image uploaded to storage, but saving to product record failed: ${dbErr?.message || 'Server error'}`);
        }
      } else {
        showToast(uploadAsPrimary ? 'Uploaded & set as primary hero image!' : 'Image uploaded & added to gallery!');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (formData.images.length <= 1) {
      showToast('A product must have at least one image');
      return;
    }
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
    }));

    if (isEditing && (existingProduct?.id || productId)) {
      const targetId = existingProduct?.id || productId!;
      try {
        await api.updateProduct(targetId, { images: updatedImages });
        await refreshProducts();
        triggerStoreSync();
      } catch {}
    }
  };

  const handleSetPrimaryImage = async (index: number) => {
    if (index === 0) return;
    const copy = [...formData.images];
    const [moved] = copy.splice(index, 1);
    copy.unshift(moved);

    setFormData((prev) => ({
      ...prev,
      images: copy,
    }));
    showToast('Primary hero image updated');

    if (isEditing && (existingProduct?.id || productId)) {
      const targetId = existingProduct?.id || productId!;
      try {
        await api.updateProduct(targetId, { images: copy });
        await refreshProducts();
        triggerStoreSync();
      } catch {}
    }
  };

  const handleMoveImage = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.images.length) return;

    const copy = [...formData.images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setFormData((prev) => ({
      ...prev,
      images: copy,
    }));

    if (isEditing && (existingProduct?.id || productId)) {
      const targetId = existingProduct?.id || productId!;
      try {
        await api.updateProduct(targetId, { images: copy });
        await refreshProducts();
        triggerStoreSync();
      } catch {}
    }
  };

  const handleReplaceImageClick = (index: number) => {
    setReplacingImageIndex(index);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingImageIndex === null) return;

    const targetIdx = replacingImageIndex;
    setIsUploadingImage(true);
    try {
      const res = await api.uploadFile(file);
      const persistentUrl = res.url;

      const copy = [...formData.images];
      copy[targetIdx] = persistentUrl;

      setFormData((prev) => ({
        ...prev,
        images: copy,
      }));

      if (isEditing && (existingProduct?.id || productId)) {
        const targetId = existingProduct?.id || productId!;
        try {
          await api.updateProduct(targetId, { images: copy });
          await refreshProducts();
          triggerStoreSync();
          showToast('Image replaced and saved permanently!');
        } catch (dbErr: any) {
          console.error('Failed to update product record with replaced image:', dbErr);
          showToast(`Image uploaded, but updating product record failed: ${dbErr?.message || 'Server error'}`);
        }
      } else {
        showToast('Image replaced in editor successfully');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload replacement image');
    } finally {
      setIsUploadingImage(false);
      setReplacingImageIndex(null);
      e.target.value = '';
    }
  };

  const handleReplaceImageUrl = (index: number) => {
    const newUrl = window.prompt('Enter new image URL to replace this image:', formData.images[index]);
    if (newUrl && newUrl.trim()) {
      const copy = [...formData.images];
      copy[index] = newUrl.trim();
      setFormData((prev) => ({
        ...prev,
        images: copy,
      }));

      if (isEditing && (existingProduct?.id || productId)) {
        const targetId = existingProduct?.id || productId!;
        api.updateProduct(targetId, { images: copy })
          .then(() => {
            refreshProducts();
            triggerStoreSync();
          })
          .catch(() => {});
      }
      showToast('Image replaced successfully');
    }
  };

  // Color Swatches handlers
  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      colors: [...prev.colors, { name: newColorName.trim(), hex: newColorHex }],
    }));
    setNewColorName('');
  };

  const handleAddPresetColor = (preset: ProductColor) => {
    if (formData.colors.some((c) => c.name.toLowerCase() === preset.name.toLowerCase())) {
      showToast(`Color "${preset.name}" is already added`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      colors: [...prev.colors, preset],
    }));
  };

  const handleRemoveColor = (index: number) => {
    if (formData.colors.length <= 1) {
      showToast('Product must have at least one color swatch');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  // Sizing handlers
  const handleToggleSize = (size: string) => {
    setFormData((prev) => {
      const exists = prev.sizes.includes(size);
      if (exists) {
        if (prev.sizes.length <= 1) {
          showToast('Product must offer at least one size');
          return prev;
        }
        return { ...prev, sizes: prev.sizes.filter((s) => s !== size) };
      } else {
        return { ...prev, sizes: [...prev.sizes, size] };
      }
    });
  };

  const handleAddCustomSize = () => {
    if (!newCustomSize.trim()) return;
    if (formData.sizes.includes(newCustomSize.trim())) {
      setNewCustomSize('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, newCustomSize.trim()],
    }));
    setNewCustomSize('');
  };

  // Bullet details handlers
  const handleAddDetail = () => {
    if (!newDetailText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      details: [...prev.details, newDetailText.trim()],
    }));
    setNewDetailText('');
  };

  const handleRemoveDetail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index),
    }));
  };

  // Save product
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter a product name');
      setActiveTab('basic');
      return;
    }
    if (!formData.priceUSD || formData.priceUSD <= 0) {
      showToast('Please enter a valid price');
      setActiveTab('pricing');
      return;
    }

    setIsSaving(true);
    try {
      const cleanImages = (Array.isArray(formData.images) ? formData.images : [])
        .filter((img) => typeof img === 'string' && img.trim() !== '' && !img.startsWith('blob:'))
        .map((img) => img.trim());

      const finalImages = cleanImages.length > 0 ? cleanImages : [CANONICAL_DEFAULTS.PRODUCT];

      const finalFormData: Product = {
        ...formData,
        images: finalImages,
        sizingInfo: formData.sizingInfo || 'Standard bridal fit. Consult size guide.',
        shippingInfo: formData.shippingInfo || 'Complimentary worldwide express shipping (DHL 3–5 days).',
        careInstructions: formData.careInstructions || 'Dry clean only. Gentle low-heat steam.',
      };

      const targetId = existingProduct?.id || productId;
      if (isEditing && targetId) {
        await api.updateProduct(targetId, finalFormData);
        showToast(`Product "${finalFormData.name}" updated successfully!`);
      } else {
        await api.createProduct(finalFormData);
        showToast(`Product "${finalFormData.name}" created successfully!`);
      }
      await refreshProducts();
      triggerStoreSync();
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left pb-16">
      {/* 1. Sticky Action Bar */}
      <div className="sticky top-[61px] z-20 bg-[#FAF8F5]/95 backdrop-blur-md border border-[#E0D5C3] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[#DCD1BF] bg-white hover:bg-[#F2ECE4] text-neutral-700 transition-colors"
            title="Back to Products"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#A58860] font-semibold">
              {isEditing ? 'Editing Product' : 'New Product Formulation'}
            </div>
            <h2 className="font-serif text-lg sm:text-xl font-normal text-[#181614] truncate max-w-xs sm:max-w-md">
              {formData.name || 'Untitled Couture Piece'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {/* Status selector */}
          <select
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              formData.status === 'published'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : formData.status === 'archived'
                ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <option value="published">● Published (Live on Store)</option>
            <option value="draft">○ Draft (Hidden from Store)</option>
            <option value="archived">● Archived (Inactive)</option>
          </select>

          {/* Storefront Preview Button */}
          <button
            type="button"
            onClick={() =>
              onPreview({
                ...formData,
                name: formData.name?.trim() || 'Signature Bridal Robe',
                subtitle: formData.subtitle?.trim() || 'Bespoke Luxury Morning Robe',
                priceUSD: typeof formData.priceUSD === 'number' && !isNaN(formData.priceUSD) ? formData.priceUSD : 195,
                images:
                  formData.images && formData.images.filter(Boolean).length > 0
                    ? formData.images.filter(Boolean)
                    : [CANONICAL_DEFAULTS.PRODUCT],
                colors:
                  formData.colors && formData.colors.length > 0
                    ? formData.colors
                    : [{ name: 'Ivory', hex: '#FFFFF0' }],
                sizes:
                  formData.sizes && formData.sizes.length > 0
                    ? formData.sizes
                    : ['S (UK 6/8)', 'M (UK 10/12)', 'L (UK 14/16)', 'XL (UK 18)'],
              })
            }
            className="px-3.5 py-2 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] text-neutral-800 text-xs font-medium rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#C5A880]" />
            <span className="hidden sm:inline">Preview Storefront</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isUploadingImage}
            className="px-5 py-2 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isUploadingImage ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : isUploadingImage ? 'Uploading Image...' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-[#E0D5C3] overflow-x-auto space-x-2 scrollbar-none">
        {[
          { id: 'basic', label: '1. Basic Information', icon: FileText },
          { id: 'pricing', label: '2. Pricing & Stock', icon: DollarSign },
          { id: 'media', label: '3. Imagery & Media', icon: ImageIcon },
          { id: 'variants', label: '4. Colors & Sizing', icon: Palette },
          { id: 'craft', label: '5. Couture Craft & Specs', icon: Sparkles },
          { id: 'merchandising', label: '6. Merchandising & Sets', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-[#181614] text-[#181614] font-semibold bg-white/40 rounded-t-xl'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-6 sm:p-8 rounded-2xl shadow-2xs space-y-6">
        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE3D8] pb-4">
              <h3 className="font-serif text-lg text-[#181614]">Product Identifiers & Core Information</h3>
              <p className="text-xs text-neutral-500">Essential details mapped directly to storefront cards, titles, and breadcrumbs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Amanda 3D Organza Floral Bridal Robe"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="amanda-3d-petals-robe"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Used in SEO and canonical URL references</span>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Product SKU
                </label>
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="LE-BRI-001"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Internal warehouse & inventory tracking code</span>
              </div>

              {/* Subtitle / Tagline */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Subtitle / Editorial Tagline
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g., Hand-appliquéd cascading 3D organza florals with pearl centers"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Appears under the title on Product Detail & Collection cards</span>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Primary Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-800 capitalize"
                >
                  <option value="bridal">Bridal Robes</option>
                  <option value="bridesmaids">Bridesmaids Robes</option>
                  <option value="sets">Bridal Party Sets</option>
                  <option value="adire">African Heritage (Adire)</option>
                  <option value="pyjamas">Bridal Pyjamas</option>
                  <option value="accessories">Accessories</option>
                  <option value="junior">Junior / Kids Robes</option>
                  <option value="personalised">Personalised Robes</option>
                </select>
              </div>

              {/* Style Classification */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Style Silhouettes
                </label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData((prev) => ({ ...prev, style: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-800"
                >
                  <option value="Silk">Silk</option>
                  <option value="Tulle">Tulle</option>
                  <option value="Lace">Lace</option>
                  <option value="Corset">Corset</option>
                  <option value="Embellished">Embellished (3D Petals / Pearls)</option>
                  <option value="Custom">Custom Silhouette</option>
                </select>
              </div>

              {/* Collection Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={formData.collectionName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, collectionName: e.target.value }))}
                  placeholder="e.g., Amanda, Mercy, Heritage Adire"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
              </div>

              {/* Promotional Badge */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Product Card Badge Text
                </label>
                <input
                  type="text"
                  value={formData.badge || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g., Iconic Bestseller, ₦150,000 Special, Limited Edition"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRICING & INVENTORY */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE3D8] pb-4">
              <h3 className="font-serif text-lg text-[#181614]">Pricing, Currencies & Inventory Control</h3>
              <p className="text-xs text-neutral-500">Base USD pricing dynamically converts into NGN (₦), GBP (£), EUR (€), CAD, AUD, and GHS on the storefront.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Regular Price USD */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Selling Price (USD $) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formData.priceUSD}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priceUSD: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                  />
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Storefront preview: ~₦{(formData.priceUSD * 1550).toLocaleString()} NGN · ~£{(formData.priceUSD * 0.79).toFixed(2)} GBP
                </span>
              </div>

              {/* Compare At Price USD */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Compare-At / Original Price (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.compareAtPriceUSD || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, compareAtPriceUSD: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Leave blank for no discount"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                  />
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 block">Displays as strikethrough price when higher than selling price</span>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Stock Units Available
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQuantity ?? 25}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stockQuantity: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Units ≤ 5 trigger low stock warnings</span>
              </div>

              {/* Stock Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Stock Status Override
                </label>
                <select
                  value={formData.stockStatus || 'in_stock'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stockStatus: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-800 capitalize"
                >
                  <option value="in_stock">In Stock (Available)</option>
                  <option value="low_stock">Low Stock (Urgency banner)</option>
                  <option value="out_of_stock">Out of Stock (Disabled cart)</option>
                  <option value="made_to_order">Made to Order (Couture pre-order)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IMAGERY & MEDIA */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE3D8] pb-4">
              <h3 className="font-serif text-lg text-[#181614]">Product Gallery & Visual Assets</h3>
              <p className="text-xs text-neutral-500">The first image is the primary hero visual used on cards and the main zoom canvas.</p>
            </div>

            {/* Add Image Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Upload from Local Device */}
              <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Upload from Device
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">Upload PNG, JPG, or WebP photography directly.</p>
                </div>
                <div className="space-y-2">
                  {isUploadingImage ? (
                    <div className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#FAF8F5] border border-[#C5A880] rounded-xl text-xs font-semibold text-[#8A7968]">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                      <span>Uploading to server...</span>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center space-x-2 px-3 py-2.5 border-2 border-dashed border-[#C5A880] rounded-xl text-xs font-medium text-[#8A7968] hover:bg-[#F5EFE6] cursor-pointer transition-colors bg-[#FAF8F5]">
                      <Upload className="w-4 h-4 text-[#C5A880]" />
                      <span>Choose File to Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {/* Hidden input for replacing individual photos */}
                  <input
                    type="file"
                    ref={replaceFileInputRef}
                    accept="image/*"
                    onChange={handleReplaceFileSelected}
                    className="hidden"
                  />
                  <label className="flex items-center space-x-2 text-[11px] text-neutral-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={uploadAsPrimary}
                      onChange={(e) => setUploadAsPrimary(e.target.checked)}
                      className="rounded text-[#C5A880] focus:ring-[#C5A880]"
                    />
                    <span>Make new upload the Primary Hero image</span>
                  </label>
                </div>
              </div>

              {/* 2. Choose from Media Library */}
              <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Media Library Assets
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">Pick from previously uploaded photos.</p>
                </div>
                <button
                  type="button"
                  onClick={openMediaPicker}
                  className="w-full py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-xl text-xs font-medium text-neutral-800 transition-colors flex items-center justify-center space-x-2"
                >
                  <FolderOpen className="w-4 h-4 text-[#C5A880]" />
                  <span>Browse Media Library</span>
                </button>
              </div>

              {/* 3. Add by URL */}
              <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Add Image by URL
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">Paste a direct image URL or /uploads path.</p>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="/uploads/... or https://..."
                    className="flex-1 px-3 py-2 border border-[#DCD1BF] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-3">
                Current Product Images ({formData.images.length})
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {formData.images.map((imgUrl, index) => (
                  <div
                    key={index}
                    className={`relative rounded-xl overflow-hidden border-2 group bg-white shadow-2xs ${
                      index === 0 ? 'border-[#C5A880] ring-2 ring-[#C5A880]/20' : 'border-[#E0D5C3]'
                    }`}
                  >
                    <img
                      src={imgUrl || CANONICAL_DEFAULTS.PRODUCT}
                      alt={`Product image ${index + 1}`}
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                      className="w-full h-44 object-cover"
                    />

                    <div className="absolute top-2 left-2 flex items-center space-x-1">
                      {index === 0 ? (
                        <span className="bg-[#181614] text-[#C5A880] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
                          Primary Hero
                        </span>
                      ) : (
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Permanent Bottom Action Bar */}
                    <div className="absolute bottom-0 inset-x-0 bg-neutral-900/80 backdrop-blur-xs p-1.5 flex items-center justify-between text-white opacity-90 group-hover:opacity-100 transition-opacity">
                      {/* Move Left */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveImage(index, 'left')}
                        className={`p-1 rounded hover:bg-white/20 transition-colors ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Move Left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Replace */}
                      <button
                        type="button"
                        onClick={() => handleReplaceImageClick(index)}
                        className="p-1 rounded hover:bg-white/20 text-[10px] flex items-center space-x-1 transition-colors"
                        title="Upload replacement photo"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>

                      {/* Set Primary */}
                      {index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(index)}
                          className="px-1.5 py-0.5 bg-[#C5A880] hover:bg-[#b0936b] text-[#181614] text-[9px] font-bold rounded shadow-xs"
                          title="Set as Hero"
                        >
                          Hero
                        </button>
                      ) : (
                        <span className="text-[9px] text-[#C5A880] font-bold px-1">Hero</span>
                      )}

                      {/* Move Right */}
                      <button
                        type="button"
                        disabled={index === formData.images.length - 1}
                        onClick={() => handleMoveImage(index, 'right')}
                        className={`p-1 rounded hover:bg-white/20 transition-colors ${
                          index === formData.images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Move Right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-1 rounded hover:bg-red-600/80 text-red-300 hover:text-white transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COLORS & SIZING */}
        {activeTab === 'variants' && (
          <div className="space-y-8">
            {/* Color Swatches */}
            <div className="space-y-4">
              <div className="border-b border-[#EBE3D8] pb-3">
                <h3 className="font-serif text-lg text-[#181614]">Color Swatches & Shades</h3>
                <p className="text-xs text-neutral-500">Add exact hexadecimal tones and luxury color names for the interactive color picker on the product page.</p>
              </div>

              {/* Current Active Colors */}
              <div className="flex flex-wrap gap-2.5">
                {formData.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-full text-xs shadow-2xs"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="font-medium text-neutral-800">{color.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{color.hex}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(index)}
                      className="text-neutral-400 hover:text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Color */}
              <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-medium text-neutral-700">Hex:</label>
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-[#DCD1BF] cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-20 px-2 py-1.5 border border-[#DCD1BF] rounded-lg text-xs font-mono uppercase"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <input
                    type="text"
                    placeholder="Color Name (e.g., Powder Blue, Sunset Ochre)"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DCD1BF] rounded-lg text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddColor}
                  className="px-3.5 py-1.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs rounded-lg font-medium transition-colors"
                >
                  Add Swatch
                </button>
              </div>

              {/* Quick Presets */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block mb-2">
                  Quick Add Bridal Couture Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPresetColor(preset)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] text-[11px] text-neutral-700 transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-neutral-300"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sizing Selection */}
            <div className="space-y-4 pt-4 border-t border-[#EBE3D8]">
              <div className="border-b border-[#EBE3D8] pb-3">
                <h3 className="font-serif text-lg text-[#181614]">Sizes Offered</h3>
                <p className="text-xs text-neutral-500">Toggle active sizes or add bespoke custom sizes available for this design.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.map((size) => {
                  const isChecked = formData.sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleToggleSize(size)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isChecked
                          ? 'bg-[#181614] text-white shadow-sm'
                          : 'bg-white text-neutral-600 border border-[#DCD1BF] hover:border-neutral-400'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Custom Size */}
              <div className="flex items-center space-x-2 max-w-sm pt-2">
                <input
                  type="text"
                  placeholder="Add custom size (e.g. Standard, Petite)"
                  value={newCustomSize}
                  onChange={(e) => setNewCustomSize(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#DCD1BF] rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="px-3 py-1.5 bg-[#181614] text-white text-xs rounded-lg font-medium"
                >
                  Add Size
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COUTURE CRAFT & EDITORIAL SPECS */}
        {activeTab === 'craft' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE3D8] pb-4">
              <h3 className="font-serif text-lg text-[#181614]">Couture Craftsmanship & Accordion Information</h3>
              <p className="text-xs text-neutral-500">These details power the editorial description, craftsmanship bullet list, materials, and shipping accordions.</p>
            </div>

            {/* Long Editorial Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Editorial Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Write the full narrative description of this couture piece..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#DCD1BF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
              />
            </div>

            {/* Bullet Point Highlights (details) */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Key Craftsmanship Highlights (Bullet Points)
              </label>

              <div className="space-y-2">
                {formData.details.map((detail, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-[#C5A880] text-base">•</span>
                    <input
                      type="text"
                      value={detail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => {
                          const copy = [...prev.details];
                          copy[index] = val;
                          return { ...prev, details: copy };
                        });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#DCD1BF] rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDetail(index)}
                      className="p-1.5 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2 pt-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Add new highlight (e.g., Hundreds of 3D organza petals...)"
                  value={newDetailText}
                  onChange={(e) => setNewDetailText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#DCD1BF] rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="px-3.5 py-2 bg-[#181614] text-white text-xs rounded-lg font-medium"
                >
                  Add Highlight
                </button>
              </div>
            </div>

            {/* Accordion Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#EBE3D8]">
              {/* Materials */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Fabric & Materials Composition
                </label>
                <textarea
                  rows={2}
                  value={formData.materials || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, materials: e.target.value }))}
                  placeholder="e.g., 100% French Silk Organza, tiered illusion tulle, freshwater glass pearls"
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>

              {/* Sizing Silhouette Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Sizing & Silhouette Guide
                </label>
                <textarea
                  rows={2}
                  value={formData.sizingNotes || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sizingNotes: e.target.value }))}
                  placeholder="e.g., True to bridal size. Includes detachable silk sash for adjustable cinch."
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>

              {/* Shipping & Delivery */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Production & Shipping Timeline
                </label>
                <textarea
                  rows={2}
                  value={formData.shippingNotes || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shippingNotes: e.target.value }))}
                  placeholder="e.g., Handcrafted in 7–14 days. Express DHL worldwide delivery."
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>

              {/* Care Instructions */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Care & Preservation Guide
                </label>
                <textarea
                  rows={2}
                  value={formData.careNotes || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, careNotes: e.target.value }))}
                  placeholder="e.g., Dry clean only. Hang in breathable garment bag."
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MERCHANDISING & SETS */}
        {activeTab === 'merchandising' && (
          <div className="space-y-6">
            <div className="border-b border-[#EBE3D8] pb-4">
              <h3 className="font-serif text-lg text-[#181614]">Merchandising, Cross-Sells & Gift Sets</h3>
              <p className="text-xs text-neutral-500">Configure homepage placement, related product recommendations, and included gift set accessories.</p>
            </div>

            {/* Bestseller & New Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-4 bg-white border border-[#DCD1BF] rounded-xl cursor-pointer hover:bg-[#F2ECE4]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isBestSeller}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isBestSeller: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#C5A880] focus:ring-[#C5A880]"
                />
                <div>
                  <div className="text-xs font-semibold text-neutral-800">Featured Bestseller</div>
                  <div className="text-[10px] text-neutral-500">Displays 'Bestseller' badge and prioritizes product in feeds</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 bg-white border border-[#DCD1BF] rounded-xl cursor-pointer hover:bg-[#F2ECE4]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isNew: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#C5A880] focus:ring-[#C5A880]"
                />
                <div>
                  <div className="text-xs font-semibold text-neutral-800">New Arrival</div>
                  <div className="text-[10px] text-neutral-500">Highlights piece in Section 09 New Arrivals carousel</div>
                </div>
              </label>
            </div>

            {/* Gift Set Included Items (Especially relevant for category === 'sets') */}
            <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Set Bundle Contents (If this is a Gift Set / Suite)
              </label>
              <div className="flex flex-wrap gap-2">
                {(formData.setItems || []).map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#F5EFE6] border border-[#DCD1BF] rounded-full text-xs text-neutral-800 font-medium"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          setItems: (prev.setItems || []).filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-neutral-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2 max-w-md">
                <input
                  type="text"
                  placeholder="e.g. Silk Sleep Eye Mask, Silk Scrunchie, Keepsake Box"
                  value={newSetItemText}
                  onChange={(e) => setNewSetItemText(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#DCD1BF] rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSetItemText.trim()) return;
                    setFormData((prev) => ({
                      ...prev,
                      setItems: [...(prev.setItems || []), newSetItemText.trim()],
                    }));
                    setNewSetItemText('');
                  }}
                  className="px-3 py-1.5 bg-[#181614] text-white text-xs rounded-lg font-medium"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Cross-Sell Recommendations */}
            <div className="p-4 bg-white border border-[#DCD1BF] rounded-xl space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Recommended Cross-Sell Products (You May Also Love)
              </label>
              <p className="text-[11px] text-neutral-500">Select catalog products to feature as recommended pairings at the bottom of the product page.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-[#EBE3D8] rounded-xl">
                {products
                  .filter((p) => p.id !== formData.id)
                  .map((prod) => {
                    const isSelected = (formData.crossSellIds || []).includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => {
                            const list = prev.crossSellIds || [];
                            return {
                              ...prev,
                              crossSellIds: isSelected
                                ? list.filter((id) => id !== prod.id)
                                : [...list, prod.id],
                            };
                          });
                        }}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition-colors text-xs ${
                          isSelected
                            ? 'bg-[#181614] text-white border-[#181614]'
                            : 'bg-white hover:bg-neutral-100 border-[#E0D5C3] text-neutral-800'
                        }`}
                      >
                        <img
                          src={prod.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                          alt={prod.name}
                          onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                          className="w-8 h-10 object-cover rounded shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{prod.name}</div>
                          <div className="text-[10px] opacity-70">${prod.priceUSD}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Library Picker Modal */}
      {isMediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#E0D5C3] flex items-center justify-between bg-white">
              <div>
                <h3 className="font-serif text-lg text-neutral-900">Select Asset from Media Library</h3>
                <p className="text-xs text-neutral-500">Pick an uploaded photo to use as the hero thumbnail or gallery asset.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-4 border-b border-[#E0D5C3] bg-[#FAF8F5] flex items-center justify-between gap-3">
              <div className="w-full sm:w-80 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter media files..."
                  value={mediaSearchQuery}
                  onChange={(e) => setMediaSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
                />
              </div>
              <div className="text-xs text-neutral-500">
                {mediaLibraryAssets.length} total files available
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoadingMediaAssets ? (
                <div className="py-16 text-center text-neutral-500 text-xs">
                  Loading media library...
                </div>
              ) : mediaLibraryAssets.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-xs">
                  No uploaded files found in media library yet. Use the upload button above to add photography.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaLibraryAssets
                    .filter((asset) =>
                      asset.fileName.toLowerCase().includes(mediaSearchQuery.toLowerCase()) ||
                      asset.url.toLowerCase().includes(mediaSearchQuery.toLowerCase())
                    )
                    .map((asset, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-[#E0D5C3] rounded-xl overflow-hidden shadow-2xs group flex flex-col justify-between"
                      >
                        <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                          <img
                            src={asset.url}
                            alt={asset.fileName}
                            onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2.5 space-y-2">
                          <div className="text-[11px] font-medium text-neutral-800 truncate" title={asset.fileName}>
                            {asset.fileName}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSelectMediaAsset(asset.url, true)}
                              className="px-2 py-1.5 bg-[#181614] hover:bg-[#C5A880] text-white text-[10px] font-semibold rounded-lg transition-colors"
                            >
                              Set Hero
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectMediaAsset(asset.url, false)}
                              className="px-2 py-1.5 bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#DCD1BF] text-neutral-800 text-[10px] font-semibold rounded-lg transition-colors"
                            >
                              Add Gallery
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E0D5C3] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
