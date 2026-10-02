import React, { useState } from 'react';
import {
  FolderTree,
  Edit,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  ExternalLink,
  Layers,
  Trash2,
  Upload,
  FolderOpen,
  Search,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { CategoryMeta } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export const AdminCategories: React.FC = () => {
  const { categories, refreshCategories, products, showToast, navigateToCategory } = useShop();
  const [editingCategory, setEditingCategory] = useState<CategoryMeta | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaLibraryAssets, setMediaLibraryAssets] = useState<{ url: string; fileName: string }[]>([]);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');

  const openMediaPicker = async () => {
    setIsMediaPickerOpen(true);
    try {
      setIsLoadingMediaAssets(true);
      const assets = await api.getMedia();
      setMediaLibraryAssets(assets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMediaAssets(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadFile(file);
      setFormCategory((prev) => ({ ...prev, heroImage: res.url }));
      showToast('Category banner uploaded and applied!');
    } catch (err: any) {
      showToast(err.message || 'Banner upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const assignedProducts = products.filter((p) => p.category === catId);
    let confirmMsg = `Are you sure you want to delete the category "${catName}"?`;
    if (assignedProducts.length > 0) {
      confirmMsg += `\nWarning: There are ${assignedProducts.length} products currently assigned to this category.`;
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteCategory(catId);
      showToast(`Category "${catName}" deleted`);
      await refreshCategories();
      triggerStoreSync();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category');
    }
  };

  const [formCategory, setFormCategory] = useState<CategoryMeta>({
    id: '',
    name: '',
    slug: '',
    subtitle: '',
    description: '',
    heroImage: '/uploads/bridal_couch_hero_1788951504284.jpg',
    badge: '',
  });

  const handleStartEdit = (cat: CategoryMeta) => {
    setEditingCategory(cat);
    setFormCategory({ ...cat });
    setIsCreating(false);
  };

  const handleStartNew = () => {
    setIsCreating(true);
    setEditingCategory(null);
    setFormCategory({
      id: `cat-${Date.now()}`,
      name: '',
      slug: '',
      subtitle: '',
      description: '',
      heroImage: '/uploads/bridal_couch_hero_1788951504284.jpg',
      badge: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory.name.trim()) {
      showToast('Category name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await api.createCategory(formCategory);
        showToast(`Category "${formCategory.name}" created`);
      } else if (editingCategory) {
        await api.updateCategory(editingCategory.id, formCategory);
        showToast(`Category "${formCategory.name}" updated`);
      }
      await refreshCategories();
      triggerStoreSync();
      setEditingCategory(null);
      setIsCreating(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#181614] font-normal">
            Category Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Configure editorial titles, subtitles, hero banner photography, and descriptions for all collection landing pages.
          </p>
        </div>
        <button
          onClick={handleStartNew}
          className="px-4 py-2.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-medium tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const productCount = products.filter(
            (p) => p.category === cat.id && p.status !== 'draft'
          ).length;

          return (
            <div
              key={cat.id}
              className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Hero Banner Thumbnail */}
                <div className="h-36 relative overflow-hidden bg-neutral-200">
                  <img
                    src={cat.heroImage || CANONICAL_DEFAULTS.CATEGORY_BRIDAL}
                    alt={cat.name}
                    onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_BRIDAL)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#C5A880]">
                      ID: {cat.id}
                    </span>
                    <h3 className="font-serif text-lg text-white font-normal truncate">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2 text-xs">
                  {cat.subtitle && (
                    <div className="text-neutral-700 italic font-serif">
                      "{cat.subtitle}"
                    </div>
                  )}
                  {cat.description && (
                    <p className="text-neutral-500 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                  <div className="pt-2 flex items-center justify-between text-neutral-600 border-t border-[#EBE3D8]">
                    <span className="text-[11px] font-medium">
                      Live Catalog Products:
                    </span>
                    <span className="font-mono font-semibold text-neutral-900 bg-white border border-[#DCD1BF] px-2 py-0.5 rounded-full text-[10px]">
                      {productCount} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-[#EBE3D8]/50 mt-2">
                <button
                  onClick={() => navigateToCategory(cat.id)}
                  className="text-xs text-[#A58860] hover:underline flex items-center space-x-1"
                >
                  <span>View in Store</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="px-3 py-1.5 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-lg text-xs font-medium text-neutral-800 transition-colors flex items-center space-x-1.5"
                  >
                    <Edit className="w-3 h-3 text-[#A58860]" />
                    <span>Edit Category</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Modal Dialog */}
      {(editingCategory || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              setEditingCategory(null);
              setIsCreating(false);
            }}
          />
          <div className="relative w-full max-w-xl bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl shadow-xl overflow-hidden z-10">
            <div className="px-6 py-4 bg-[#181614] text-white flex items-center justify-between">
              <h3 className="font-serif text-lg font-normal">
                {isCreating ? 'Create New Category' : `Edit Category: ${formCategory.name}`}
              </h3>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsCreating(false);
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormCategory((prev) => ({
                      ...prev,
                      name,
                      slug: isCreating ? name.toLowerCase().replace(/\s+/g, '-') : prev.slug,
                      id: isCreating ? name.toLowerCase().replace(/\s+/g, '-') : prev.id,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Category ID / Slug
                </label>
                <input
                  type="text"
                  disabled={!isCreating}
                  value={formCategory.id}
                  onChange={(e) => setFormCategory((prev) => ({ ...prev, id: e.target.value, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-100 border border-[#DCD1BF] rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Editorial Subtitle
                </label>
                <input
                  type="text"
                  value={formCategory.subtitle || ''}
                  onChange={(e) => setFormCategory((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Made for the moment before the dress."
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Hero Banner Photography
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formCategory.heroImage || ''}
                      onChange={(e) => setFormCategory((prev) => ({ ...prev, heroImage: e.target.value }))}
                      placeholder="/uploads/bridal_couch_hero_1788951504284.jpg"
                      className="flex-1 px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                    />
                    <label className="px-3 py-2 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-xl text-xs font-medium text-neutral-800 transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={openMediaPicker}
                      className="px-3 py-2 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] rounded-xl text-xs font-medium text-neutral-800 transition-colors flex items-center space-x-1.5 shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Library</span>
                    </button>
                  </div>

                  {formCategory.heroImage && (
                    <div className="mt-2 h-28 rounded-xl overflow-hidden border border-[#DCD1BF] relative group">
                      <img
                        src={formCategory.heroImage || CANONICAL_DEFAULTS.CATEGORY_BRIDAL}
                        alt="Banner Preview"
                        onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_BRIDAL)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                        Current Banner Preview
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Category Overview Description
                </label>
                <textarea
                  rows={3}
                  value={formCategory.description || ''}
                  onChange={(e) => setFormCategory((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-[#EBE3D8] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Media Library Picker Modal for Category */}
      {isMediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E0D5C3] flex items-center justify-between bg-white">
              <div>
                <h3 className="font-serif text-lg text-neutral-900">Select Banner from Media Library</h3>
                <p className="text-xs text-neutral-500">Pick an uploaded photo to use as this category's hero banner.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoadingMediaAssets ? (
                <div className="py-16 text-center text-neutral-500 text-xs">
                  Loading media library...
                </div>
              ) : mediaLibraryAssets.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-xs">
                  No uploaded files found in media library.
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
                        <div className="relative aspect-video bg-neutral-100 overflow-hidden">
                          <img
                            src={asset.url}
                            alt={asset.fileName}
                            onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.CATEGORY_BRIDAL)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2.5 space-y-2">
                          <div className="text-[11px] font-medium text-neutral-800 truncate" title={asset.fileName}>
                            {asset.fileName}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormCategory((prev) => ({ ...prev, heroImage: asset.url }));
                              setIsMediaPickerOpen(false);
                              showToast('Banner applied from Media Library!');
                            }}
                            className="w-full py-1.5 bg-[#181614] hover:bg-[#C5A880] text-white text-[10px] font-semibold rounded-lg transition-colors text-center"
                          >
                            Use as Banner
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

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
