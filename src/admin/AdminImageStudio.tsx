import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Search,
  Code2,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  FileImage,
  FolderOpen,
  ArrowRight,
  AlertCircle,
  Loader2,
  Plus,
  X,
  ExternalLink,
  Eye,
  Trash2,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { handleImageError } from '../constants/imageDefaults';

interface EditableImageItem {
  id: string;
  name: string;
  section: 'Products' | 'Categories' | 'Hero & Banners' | 'Bespoke Embroidery' | 'Real Brides' | 'Journal' | 'Brand Identity';
  type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
  targetId: string;
  imageId?: string; // Stable unique ID e.g. `${product.id}__primary`
  imageRole?: 'primary' | 'hover' | 'gallery';
  imageIndex?: number;
  currentUrl: string;
  secondaryUrl?: string;
  codeFile: string;
  description: string;
  recommendedAspect?: string;
}

interface ServerMediaAsset {
  url: string;
  fileName: string;
  size: number;
}

export const AdminImageStudio: React.FC = () => {
  const {
    refreshProducts,
    refreshCategories,
    refreshSiteSettings,
    refreshRealBrides,
    showToast,
    products,
  } = useShop();

  const [images, setImages] = useState<EditableImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active item being edited
  const [editingItem, setEditingItem] = useState<EditableImageItem | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ message: string; time: string } | null>(null);

  // Modal tab: 'upload' | 'library' | 'url'
  const [modalTab, setModalTab] = useState<'upload' | 'library' | 'url'>('upload');

  // Media Library in-modal state
  const [mediaAssets, setMediaAssets] = useState<ServerMediaAsset[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaFilterQuery, setMediaFilterQuery] = useState('');

  // File upload state for current edit
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[] | null>(null);
  const [persistenceFeedback, setPersistenceFeedback] = useState<{
    type: 'github' | 'r2' | 'blob' | 'local' | 'ephemeral';
    message: string;
  } | null>(null);
  const [retryData, setRetryData] = useState<{
    url: string;
    fileName: string;
    type: any;
    targetId: string;
    imageId?: string;
    imageRole?: 'primary' | 'hover' | 'gallery';
    imageIndex?: number;
  } | null>(null);
  const [isRetryingSave, setIsRetryingSave] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Add extra image to product modal state
  const [isAddProductPhotoOpen, setIsAddProductPhotoOpen] = useState(false);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');
  const [addPhotoUrl, setAddPhotoUrl] = useState('');
  const [isAddingProductPhoto, setIsAddingProductPhoto] = useState(false);

  // Inline delete confirmation & cache-busting timestamp to prevent loading stale images
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [cacheBustTimestamp, setCacheBustTimestamp] = useState<number>(() => Date.now());

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const res = await api.getImageInventory();
      if (res && Array.isArray(res.images)) {
        setImages(res.images);
      }
    } catch (err: any) {
      console.error('Failed to load image inventory:', err);
      showToast(err.message || 'Failed to load image inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMediaLibrary = async () => {
    try {
      setIsLoadingMedia(true);
      const assets = await api.getMedia();
      setMediaAssets(assets || []);
    } catch (err) {
      console.error('Failed to fetch media assets:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchMediaLibrary();
  }, []);

  const sections = useMemo(() => {
    return [
      'All',
      'Products',
      'Hero & Banners',
      'Categories',
      'Brand Identity',
      'Bespoke Embroidery',
      'Real Brides',
      'Journal',
    ];
  }, []);

  // Section item counts
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: images.length };
    images.forEach((item) => {
      counts[item.section] = (counts[item.section] || 0) + 1;
    });
    return counts;
  }, [images]);

  const filteredImages = useMemo(() => {
    return images.filter((item) => {
      const matchesSection = selectedSection === 'All' || item.section === selectedSection;
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codeFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.currentUrl.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [images, selectedSection, searchQuery]);

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Image URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (item: EditableImageItem) => {
    setEditingItem(item);
    setNewImageUrl(item.currentUrl);
    setUploadProgress(null);
    setUploadWarnings(null);
    setPersistenceFeedback(null);
    setRetryData(null);
    setModalTab('upload');
  };

  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [recentlySavedCardId, setRecentlySavedCardId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    try {
      setIsUploadingFile(true);
      setUploadProgress(`Uploading & writing image directly into codebase (${editingItem.codeFile})...`);
      setUploadWarnings(null);
      setPersistenceFeedback(null);
      setRetryData(null);

      const folder =
        editingItem.type === 'product'
          ? 'products'
          : editingItem.type === 'category'
          ? 'banners'
          : 'gallery';

      const uploadRes = await api.uploadAndSaveToCode(file, {
        type: editingItem.type,
        targetId: editingItem.targetId,
        imageId: editingItem.imageId,
        imageRole: editingItem.imageRole,
        imageIndex: editingItem.imageIndex,
        folder,
      });

      // Strict persistence verification: require confirmed product association
      if (!uploadRes || !uploadRes.codeSaved || (uploadRes.status && uploadRes.status.dbUpdated === false)) {
        throw new Error('Image uploaded to storage, but catalog database save was not confirmed.');
      }

      setNewImageUrl(uploadRes.url);
      const filesList = uploadRes.filesUpdated?.length ? uploadRes.filesUpdated.join(', ') : editingItem.codeFile;
      setUploadProgress(`Image uploaded and confirmed saved to ${filesList}!`);

      // Update cache-bust timestamp so browser immediately displays the new image
      setCacheBustTimestamp(Date.now());

      // Check explicit persistence status
      const pType = uploadRes.status?.persistenceType;
      if (pType === 'permanent_github') {
        const sha = uploadRes.github?.commitSha?.slice(0, 7) || 'main';
        setPersistenceFeedback({
          type: 'github',
          message: `Permanently committed to GitHub repository (${sha}) & updated in catalog.`,
        });
        showToast(`✓ Uploaded & permanently committed to GitHub (${sha})!`);
      } else if (pType === 'permanent_r2') {
        setPersistenceFeedback({
          type: 'r2',
          message: `Permanently stored in Cloudflare R2 bucket & updated in catalog.`,
        });
        showToast(`✓ Uploaded & permanently stored in Cloudflare R2!`);
      } else if (pType === 'permanent_vercel_blob') {
        setPersistenceFeedback({
          type: 'blob',
          message: `Stored in Vercel Blob object storage & updated in catalog.`,
        });
        showToast(`✓ Uploaded to Vercel Blob!`);
      } else if (pType === 'local_only') {
        setPersistenceFeedback({
          type: 'local',
          message: `Saved locally to public/uploads/${uploadRes.fileName} & updated in catalog.`,
        });
        showToast(`✓ Saved to public/uploads/ & updated in catalog!`);
      } else if (pType === 'ephemeral_unpersisted') {
        setPersistenceFeedback({
          type: 'ephemeral',
          message: `Saved to temporary container filesystem. Configure GITHUB_TOKEN or Cloudflare R2 for durable persistence across restarts.`,
        });
        showToast(`⚠️ Saved to container filesystem only. Configure GitHub or R2 for permanent persistence.`);
      }

      // Capture any warnings
      if (uploadRes.warnings && uploadRes.warnings.length > 0) {
        setUploadWarnings(uploadRes.warnings);
      }

      // If GitHub commit failed while configured, retain retry
      if (uploadRes.status && (uploadRes.github && !uploadRes.github.committed)) {
        setRetryData({
          url: uploadRes.url,
          fileName: uploadRes.fileName,
          type: editingItem.type,
          targetId: editingItem.targetId,
          imageId: editingItem.imageId,
          imageRole: editingItem.imageRole,
          imageIndex: editingItem.imageIndex,
        });
      }

      setLastSyncResult({
        message: `Saved directly to ${filesList}`,
        time: new Date().toLocaleTimeString(),
      });

      await fetchMediaLibrary();
      await fetchInventory();
      await refreshProducts();
      await refreshCategories();
      await refreshSiteSettings();
      await refreshRealBrides();
      triggerStoreSync();
    } catch (err: any) {
      console.error('Upload and save to code failed:', err);
      setUploadProgress(null);
      const url = err.url || err.data?.url;
      const fileName = err.fileName || err.data?.fileName || file.name;
      if (url && editingItem) {
        setRetryData({
          url,
          fileName,
          type: editingItem.type,
          targetId: editingItem.targetId,
          imageId: editingItem.imageId,
          imageRole: editingItem.imageRole,
          imageIndex: editingItem.imageIndex,
        });
        setUploadWarnings([
          `Image was uploaded to ${url}, but catalog database update failed: ${err.message}. Click "Retry Record Save" below to complete association without re-uploading.`,
        ]);
      }
      showToast(err.message || 'Upload failed');
    } finally {
      setIsUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRetrySave = async () => {
    if (!retryData) return;
    try {
      setIsRetryingSave(true);
      const res = await api.retrySaveToCode({
        url: retryData.url,
        fileName: retryData.fileName,
        targetType: retryData.type,
        targetId: retryData.targetId,
        imageId: retryData.imageId,
        imageRole: retryData.imageRole,
        imageIndex: retryData.imageIndex,
      });
      if (res.success && res.status?.dbUpdated) {
        setCacheBustTimestamp(Date.now());
        showToast('✓ Successfully retried and saved to catalog & code!');
        setRetryData(null);
        setUploadWarnings(null);
        setPersistenceFeedback(null);
        await fetchInventory();
        await refreshProducts();
        await refreshCategories();
        await refreshSiteSettings();
        await refreshRealBrides();
        triggerStoreSync();
      } else {
        throw new Error('Retry did not confirm database update.');
      }
    } catch (err: any) {
      showToast(err.message || 'Retry failed');
    } finally {
      setIsRetryingSave(false);
    }
  };

  const handleQuickCardUpload = async (item: EditableImageItem, file: File) => {
    try {
      setUploadingCardId(item.id);
      showToast(`Uploading and saving "${item.name}" directly to code...`);
      const folder =
        item.type === 'product'
          ? 'products'
          : item.type === 'category'
          ? 'banners'
          : 'gallery';

      const uploadRes = await api.uploadAndSaveToCode(file, {
        type: item.type,
        targetId: item.targetId,
        imageId: item.imageId,
        imageRole: item.imageRole,
        imageIndex: item.imageIndex,
        folder,
      });

      // Require confirmed product association
      if (!uploadRes || !uploadRes.codeSaved || (uploadRes.status && uploadRes.status.dbUpdated === false)) {
        throw new Error(`File uploaded, but saving to product record "${item.name}" failed.`);
      }

      setCacheBustTimestamp(Date.now());
      const filesList = uploadRes.filesUpdated?.length ? uploadRes.filesUpdated.join(', ') : item.codeFile;
      const pType = uploadRes.status?.persistenceType;

      if (pType === 'permanent_github') {
        showToast(`✓ "${item.name}" permanently committed to GitHub & saved to ${filesList}!`);
        setRecentlySavedCardId(item.id);
        setTimeout(() => setRecentlySavedCardId(null), 3500);
      } else if (pType === 'permanent_r2') {
        showToast(`✓ "${item.name}" permanently stored in Cloudflare R2 & saved to ${filesList}!`);
        setRecentlySavedCardId(item.id);
        setTimeout(() => setRecentlySavedCardId(null), 3500);
      } else if (pType === 'ephemeral_unpersisted') {
        showToast(`⚠️ "${item.name}" saved to container filesystem only (Configure GitHub/R2 for permanent persistence)`);
        // Do NOT mark card as permanently saved when ephemeral
      } else {
        showToast(`✓ Saved "${item.name}" to public/uploads/ & ${filesList}!`);
        setRecentlySavedCardId(item.id);
        setTimeout(() => setRecentlySavedCardId(null), 3500);
      }

      setLastSyncResult({
        message: `Saved ${item.name} to ${filesList}`,
        time: new Date().toLocaleTimeString(),
      });

      await fetchInventory();
      await refreshProducts();
      await refreshCategories();
      await refreshSiteSettings();
      await refreshRealBrides();
      triggerStoreSync();
    } catch (err: any) {
      console.error('Quick card upload failed:', err);
      showToast(err.message || 'Direct code upload failed');
      const url = err.url || err.data?.url;
      if (url) {
        handleOpenEdit(item);
        setRetryData({
          url,
          fileName: err.fileName || err.data?.fileName || file.name,
          type: item.type,
          targetId: item.targetId,
          imageId: item.imageId,
          imageRole: item.imageRole,
          imageIndex: item.imageIndex,
        });
        setUploadWarnings([
          `File was uploaded to storage, but saving to "${item.name}" failed: ${err.message}. Click "Retry Record Save" below.`,
        ]);
      }
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleSaveToCode = async () => {
    if (!editingItem || !newImageUrl.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.editImageInCode({
        type: editingItem.type,
        targetId: editingItem.targetId,
        imageId: editingItem.imageId,
        imageRole: editingItem.imageRole,
        imageIndex: editingItem.imageIndex,
        newUrl: newImageUrl.trim(),
      });

      if (res.success) {
        setCacheBustTimestamp(Date.now());
        setRetryData(null);
        setUploadWarnings(null);
        showToast(`✓ Saved directly to ${res.filesUpdated.join(', ')}`);
        setLastSyncResult({
          message: `Saved directly to ${res.filesUpdated.join(', ')}`,
          time: new Date().toLocaleTimeString(),
        });

        // Immediately refresh state across storefront
        await fetchInventory();
        await refreshProducts();
        await refreshCategories();
        await refreshSiteSettings();
        await refreshRealBrides();
        triggerStoreSync();

        setEditingItem(null);
      }
    } catch (err: any) {
      console.error('Failed to save image to code:', err);
      showToast(err.message || 'Failed to save image to code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncAllToCode = async () => {
    try {
      setIsSyncingAll(true);
      const res = await api.syncAllToCode();
      if (res.success) {
        setCacheBustTimestamp(Date.now());
        showToast(`Synchronized all catalog data directly to code files!`);
        setLastSyncResult({
          message: `Synchronized ${res.filesUpdated.join(', ')}`,
          time: new Date().toLocaleTimeString(),
        });
        await fetchInventory();
        await refreshProducts();
        await refreshCategories();
        await refreshSiteSettings();
        triggerStoreSync();
      }
    } catch (err: any) {
      console.error('Failed to sync all code:', err);
      showToast(err.message || 'Failed to sync to code');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDeleteItem = async (item: EditableImageItem) => {
    if (confirmingDeleteId !== item.id) {
      setConfirmingDeleteId(item.id);
      return;
    }

    try {
      setIsDeletingId(item.id);
      const res = await api.deleteImageFromCode({
        type: item.type,
        targetId: item.targetId,
        imageId: item.imageId,
        imageRole: item.imageRole,
        imageIndex: item.imageIndex,
      });

      showToast(`✓ ${res.message}!`);
      setConfirmingDeleteId(null);
      setCacheBustTimestamp(Date.now());
      await fetchInventory();
      await refreshProducts();
      await refreshCategories();
      await refreshSiteSettings();
      await refreshRealBrides();
      triggerStoreSync();
    } catch (err: any) {
      console.error('Delete image from code failed:', err);
      showToast(err.message || 'Failed to delete image from code');
    } finally {
      setIsDeletingId(null);
    }
  };

  // Add extra gallery image directly to a product
  const handleAddProductPhoto = async () => {
    if (!selectedAddProductId || !addPhotoUrl.trim()) return;

    try {
      setIsAddingProductPhoto(true);
      const targetProd = products.find((p) => p.id === selectedAddProductId);
      if (!targetProd) throw new Error('Product not found');

      // Idempotency: verify this image is not already assigned to the product
      if (Array.isArray(targetProd.images) && targetProd.images.includes(addPhotoUrl.trim())) {
        showToast(`This image is already part of "${targetProd.name}".`);
        setIsAddProductPhotoOpen(false);
        setAddPhotoUrl('');
        return;
      }

      await api.editImageInCode({
        type: 'product',
        targetId: targetProd.id,
        imageRole: 'gallery',
        imageIndex: (targetProd.images || []).length,
        newUrl: addPhotoUrl.trim(),
      });

      setCacheBustTimestamp(Date.now());
      showToast(`✓ Added new photo to "${targetProd.name}" and saved to src/data/products.ts!`);
      await fetchInventory();
      await refreshProducts();
      triggerStoreSync();

      setIsAddProductPhotoOpen(false);
      setAddPhotoUrl('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add image to product');
    } finally {
      setIsAddingProductPhoto(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-left">
      {/* 1. Top Header Card */}
      <div className="bg-[#1C1815] text-[#FAF8F5] p-6 sm:p-8 rounded-2xl shadow-xl border border-[#3A312B] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#C5A880]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-[#C5A880]/20 text-[#C5A880] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5" />
              <span>Direct-to-Code Image Studio</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-normal">
              Edit All Site Images & Save Directly to Code
            </h1>
            <p className="text-xs sm:text-sm text-[#D5C9BD] leading-relaxed font-sans">
              Every image across products, category hero banners, bespoke features, brand identity, real brides, and journal articles can be edited here.
              When you replace or update an image, the change is written directly to{' '}
              <code className="text-[#C5A880] bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs">src/data/products.ts</code>,{' '}
              <code className="text-[#C5A880] bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs">src/constants/imageDefaults.ts</code>,{' '}
              <code className="text-[#C5A880] bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs">src/data/realBrides.ts</code>, and{' '}
              <code className="text-[#C5A880] bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs">data/db.json</code>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (products.length > 0 && !selectedAddProductId) {
                  setSelectedAddProductId(products[0].id);
                }
                setIsAddProductPhotoOpen(true);
              }}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-white/10 hover:bg-white/20 text-[#C5A880] border border-[#C5A880]/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Add Product Photo</span>
            </button>

            <button
              onClick={handleSyncAllToCode}
              disabled={isSyncingAll}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[#C5A880] text-[#141210] rounded-xl text-xs font-semibold hover:bg-[#D5B890] transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSyncingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Syncing Code Files...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span>Sync All to Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {lastSyncResult && (
          <div className="mt-4 pt-4 border-t border-[#3A312B] flex items-center space-x-2 text-xs text-[#A8D5A2]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8CE080]" />
            <span>{lastSyncResult.message} at {lastSyncResult.time}</span>
          </div>
        )}
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8E1D7] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                selectedSection === sec
                  ? 'bg-[#181614] text-white shadow-xs font-semibold'
                  : 'bg-[#FAF8F5] text-[#6E645A] hover:bg-[#F2ECE4]'
              }`}
            >
              <span>{sec}</span>
              {sectionCounts[sec] !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedSection === sec ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {sectionCounts[sec]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, file, or path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5DACD] rounded-lg focus:outline-hidden focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]"
          />
        </div>
      </div>

      {/* 3. Inventory Stats Banner */}
      <div className="flex items-center justify-between text-xs text-[#6E645A] px-1 font-sans">
        <div>
          Showing <span className="font-semibold text-neutral-900">{filteredImages.length}</span> of {images.length} images across all sections
        </div>
        <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>TypeScript Auto-Sync Ready</span>
        </div>
      </div>

      {/* 4. Loading Skeleton & Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-[#E8E1D7] animate-pulse space-y-3">
              <div className="aspect-[4/3] bg-neutral-200 rounded-lg" />
              <div className="h-4 bg-neutral-200 rounded w-2/3" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-[#E8E1D7] text-center space-y-3">
          <ImageIcon className="w-10 h-10 mx-auto text-neutral-300" />
          <h3 className="text-base font-serif text-neutral-800">No images match your search</h3>
          <p className="text-xs text-neutral-500">Try adjusting your search query or switching section tabs.</p>
        </div>
      ) : (
        /* Image Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredImages.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-[#E8E1D7] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Image Preview Container */}
              <div>
                <div className="relative aspect-[4/3] bg-[#F7F4EE] overflow-hidden border-b border-[#E8E1D7]">
                  <img
                    src={`${item.currentUrl}${item.currentUrl.includes('?') ? '&' : '?'}t=${cacheBustTimestamp}`}
                    alt={item.name}
                    data-no-fallback="true"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                    <span className="bg-[#181614]/90 backdrop-blur-xs text-white text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shadow-xs">
                      {item.section}
                    </span>
                    {item.recommendedAspect && (
                      <span className="bg-white/90 backdrop-blur-xs text-neutral-700 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xs">
                        {item.recommendedAspect.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1">
                    <button
                      onClick={() => handleCopyUrl(item.id, item.currentUrl)}
                      className="p-1.5 rounded-full bg-white/90 text-neutral-700 hover:bg-white hover:text-[#181614] shadow-xs transition-all cursor-pointer"
                      title="Copy Image URL"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-2 text-left">
                  <h3 className="font-serif text-sm font-semibold text-neutral-900 leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-[#6E645A] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="pt-2 flex items-center space-x-1.5 text-[10px] text-neutral-500 font-mono">
                    <Code2 className="w-3 h-3 text-[#C5A880] shrink-0" />
                    <span className="truncate" title={item.codeFile}>
                      {item.codeFile}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 space-y-2">
                <div className="flex items-center space-x-2">
                  <label
                    className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs ${
                      uploadingCardId === item.id
                        ? 'bg-[#181614] text-white opacity-70 pointer-events-none'
                        : recentlySavedCardId === item.id
                        ? 'bg-emerald-700 text-white shadow-emerald-900/20'
                        : 'bg-[#181614] hover:bg-[#C5A880] text-white hover:text-[#181614] active:scale-[0.98]'
                    }`}
                    title={`Upload photo and save directly into ${item.codeFile}`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      disabled={uploadingCardId === item.id}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleQuickCardUpload(item, file);
                      }}
                    />
                    {uploadingCardId === item.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A880]" />
                        <span>Saving to Code...</span>
                      </>
                    ) : recentlySavedCardId === item.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Saved to Code!</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload to Code</span>
                      </>
                    )}
                  </label>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="py-2 px-3 bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#181614] border border-[#DCD3C7] rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                    title="Open full editor modal"
                  >
                    <span>More</span>
                  </button>

                  {(item.type === 'product' || item.type === 'real-bride') && (
                    confirmingDeleteId === item.id ? (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-150">
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={isDeletingId === item.id}
                          className="py-2 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                          title="Confirm permanent deletion from code files"
                        >
                          {isDeletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Confirm</span>
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isDeletingId === item.id}
                          className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Cancel deletion"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 bg-white hover:bg-red-50 text-neutral-400 hover:text-red-600 border border-[#DCD3C7] hover:border-red-300 rounded-lg transition-colors cursor-pointer"
                        title={
                          item.type === 'product'
                            ? item.imageIndex && item.imageIndex > 0
                              ? 'Delete this photo from product in code'
                              : 'Delete product throughout website & code'
                            : 'Delete story from code'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Edit Image Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E8E1D7] text-left space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#C5A880] tracking-wider block">
                  {editingItem.section} · Direct Code Update
                </span>
                <h2 className="font-serif text-lg sm:text-xl text-neutral-900 font-semibold">
                  {editingItem.name}
                </h2>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Code File Banner */}
            <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E8E1D7] flex items-center space-x-2 text-xs text-neutral-700">
              <Code2 className="w-4 h-4 text-[#C5A880] shrink-0" />
              <span>Target Source Code File: <strong>{editingItem.codeFile}</strong></span>
            </div>

            {/* Image Preview Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase block mb-1">Current Image</span>
                <div className="aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
                  <img src={`${editingItem.currentUrl}${editingItem.currentUrl.includes('?') ? '&' : '?'}t=${cacheBustTimestamp}`} alt="Current" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-neutral-400 font-mono truncate mt-1">
                  {editingItem.currentUrl}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase block mb-1">New / Preview</span>
                <div className="aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden border-2 border-[#C5A880]">
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    data-no-fallback="true"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] text-neutral-600 font-mono truncate mt-1">
                  {newImageUrl}
                </div>
              </div>
            </div>

            {/* Replace Options Mode Tabs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 border-b border-[#E8E1D7] pb-2">
                <button
                  type="button"
                  onClick={() => setModalTab('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    modalTab === 'upload'
                      ? 'bg-[#181614] text-white'
                      : 'bg-[#FAF8F5] text-neutral-700 hover:bg-[#F2ECE4]'
                  }`}
                >
                  Option 1: Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('library')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    modalTab === 'library'
                      ? 'bg-[#181614] text-white'
                      : 'bg-[#FAF8F5] text-neutral-700 hover:bg-[#F2ECE4]'
                  }`}
                >
                  Option 2: Pick from Library ({mediaAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('url')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    modalTab === 'url'
                      ? 'bg-[#181614] text-white'
                      : 'bg-[#FAF8F5] text-neutral-700 hover:bg-[#F2ECE4]'
                  }`}
                >
                  Option 3: Enter URL / Path
                </button>
              </div>

              {/* Tab 1: Upload File */}
              {modalTab === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 bg-white border border-dashed border-[#C5A880] hover:bg-[#FAF8F5] text-neutral-800 text-xs font-medium rounded-lg flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isUploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
                        <span>Uploading & Writing Directly to Code...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#C5A880]" />
                        <span>Upload Image File — Automatically Saves Directly to Code ({editingItem.codeFile})</span>
                      </>
                    )}
                  </button>

                  {/* Explicit Persistence Outcome Badge */}
                  {persistenceFeedback && (
                    <div className={`p-2.5 rounded-lg mt-2 text-xs flex items-start space-x-2 border ${
                      persistenceFeedback.type === 'github' || persistenceFeedback.type === 'r2'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : persistenceFeedback.type === 'local'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-[10px] block">
                          Persistence Status: {persistenceFeedback.type === 'github' ? 'Permanent GitHub Commit' : persistenceFeedback.type === 'r2' ? 'Permanent Cloudflare R2' : persistenceFeedback.type === 'local' ? 'Local Canonical Storage' : 'Ephemeral Container Storage'}
                        </span>
                        <span>{persistenceFeedback.message}</span>
                      </div>
                    </div>
                  )}

                  {/* Explicit Warnings List */}
                  {uploadWarnings && uploadWarnings.length > 0 && (
                    <div className="p-2.5 rounded-lg mt-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs space-y-1">
                      <div className="font-semibold flex items-center space-x-1.5 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Storage & Sync Notifications:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                        {uploadWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Partial Failure Retry Button */}
                  {retryData && (
                    <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                      <div className="text-xs text-rose-800">
                        <span>Image was uploaded, but catalog record or GitHub commit needs retry.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetrySave}
                        disabled={isRetryingSave}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded cursor-pointer transition-colors flex items-center space-x-1.5"
                      >
                        {isRetryingSave ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Retrying...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry Record Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Pick from Media Library */}
              {modalTab === 'library' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Filter media library..."
                      value={mediaFilterQuery}
                      onChange={(e) => setMediaFilterQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 border border-neutral-200 rounded-lg">
                    {mediaAssets
                      .filter((a) => !mediaFilterQuery || a.fileName.toLowerCase().includes(mediaFilterQuery.toLowerCase()))
                      .map((asset) => (
                        <button
                          key={asset.url}
                          type="button"
                          onClick={() => setNewImageUrl(asset.url)}
                          className={`aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer relative group ${
                            newImageUrl === asset.url ? 'border-[#C5A880] ring-2 ring-[#C5A880]/30' : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          <img
                            src={asset.url}
                            alt={asset.fileName}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e)}
                          />
                          {newImageUrl === asset.url && (
                            <div className="absolute inset-0 bg-[#C5A880]/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white bg-[#181614] rounded-full p-0.5" />
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Tab 3: URL Input */}
              {modalTab === 'url' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">
                    Image File Path or CDN URL:
                  </label>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="/uploads/... or https://..."
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-neutral-300 rounded-lg focus:outline-hidden focus:border-[#C5A880] font-mono"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#E8E1D7]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToCode}
                disabled={isSubmitting || !newImageUrl.trim()}
                className="px-5 py-2.5 bg-[#181614] hover:bg-[#C5A880] text-white hover:text-[#181614] text-xs font-semibold rounded-lg transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Directly to Code...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Directly to Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Extra Photo to Product Modal */}
      {isAddProductPhotoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8E1D7] text-left space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#C5A880] tracking-wider block">
                  Product Catalog
                </span>
                <h2 className="font-serif text-lg text-neutral-900 font-semibold">
                  Add Additional Gallery Photo to Product
                </h2>
              </div>
              <button
                onClick={() => setIsAddProductPhotoOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Target Product:
                </label>
                <select
                  value={selectedAddProductId}
                  onChange={(e) => setSelectedAddProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-neutral-300 rounded-lg font-sans"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category}) - Currently has {p.images?.length || 0} photos
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Upload Image File:
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      showToast('Uploading and adding new photo...');
                      const targetProd = products.find((p) => p.id === selectedAddProductId);
                      if (!targetProd) throw new Error('Target product not found');
                      const nextIndex = (targetProd.images || []).length;
                      const res = await api.uploadAndSaveToCode(
                        file,
                        {
                          type: 'product',
                          targetId: selectedAddProductId,
                          imageRole: 'gallery',
                          imageIndex: nextIndex,
                          folder: 'products',
                        }
                      );
                      if (res && res.codeSaved && (res.status?.dbUpdated !== false)) {
                        setCacheBustTimestamp(Date.now());
                        showToast(`✓ Photo uploaded and added to "${targetProd.name}"!`);
                        await fetchInventory();
                        await refreshProducts();
                        triggerStoreSync();
                        setIsAddProductPhotoOpen(false);
                        setAddPhotoUrl('');
                      } else {
                        throw new Error('Photo was uploaded, but catalog persistence failed.');
                      }
                    } catch (err: any) {
                      showToast(err.message || 'Upload failed');
                    }
                  }}
                  className="w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#181614] file:text-white hover:file:bg-[#C5A880] hover:file:text-[#181614] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Or Paste Photo URL:
                </label>
                <input
                  type="text"
                  value={addPhotoUrl}
                  onChange={(e) => setAddPhotoUrl(e.target.value)}
                  placeholder="/uploads/... or https://..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-neutral-300 rounded-lg font-mono"
                />
              </div>

              {addPhotoUrl && (
                <div className="aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden border border-[#C5A880] max-h-40">
                  <img src={addPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddProductPhotoOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProductPhoto}
                disabled={isAddingProductPhoto || !addPhotoUrl.trim()}
                className="px-5 py-2.5 bg-[#181614] hover:bg-[#C5A880] text-white hover:text-[#181614] text-xs font-semibold rounded-lg transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isAddingProductPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Writing to products.ts...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to src/data/products.ts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
