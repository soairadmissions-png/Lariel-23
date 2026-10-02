import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  MoreVertical,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { Product } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface AdminProductsListProps {
  onEditProduct: (productId: string) => void;
  onNewProduct: () => void;
  onPreviewProduct: (product: Product) => void;
}

export const AdminProductsList: React.FC<AdminProductsListProps> = ({
  onEditProduct,
  onNewProduct,
  onPreviewProduct,
}) => {
  const { products, refreshProducts, formatPrice, showToast, categories } = useShop();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [selectedStock, setSelectedStock] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'stock-asc'>('default');

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        const matchesCollection = p.collectionName.toLowerCase().includes(q);
        const matchesSubtitle = p.subtitle.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCollection && !matchesSubtitle) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // 4. Stock filter
      if (selectedStock === 'out_of_stock') {
        if (p.stockStatus !== 'out_of_stock' && p.stockQuantity !== 0) return false;
      } else if (selectedStock === 'low_stock') {
        if (p.stockStatus !== 'low_stock' && !(p.stockQuantity !== undefined && p.stockQuantity > 0 && p.stockQuantity <= 5)) return false;
      } else if (selectedStock === 'in_stock') {
        if (p.stockStatus === 'out_of_stock' || p.stockQuantity === 0) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceUSD - b.priceUSD;
      if (sortBy === 'price-desc') return b.priceUSD - a.priceUSD;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'stock-asc') return (a.stockQuantity || 0) - (b.stockQuantity || 0);
      return 0;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, selectedStock, sortBy]);

  // Paginated products
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Actions
  const handleToggleStatus = async (product: Product) => {
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateProduct(product.id, { status: nextStatus });
      await refreshProducts();
      showToast(`Product "${product.name}" set to ${nextStatus}`);
    } catch (err: any) {
      showToast(err.message || 'Status update failed');
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const duplicateData: Partial<Product> = {
        ...product,
        name: `${product.name} (Copy)`,
        slug: `${product.slug || product.id}-copy-${Date.now().toString().slice(-4)}`,
        sku: `${product.sku || 'LE'}-CPY`,
        status: 'draft',
      };
      // remove id so backend creates new one
      delete (duplicateData as any).id;
      const created = await api.createProduct(duplicateData);
      await refreshProducts();
      triggerStoreSync();
      showToast(`Duplicated as draft: "${created.name}"`);
    } catch (err: any) {
      showToast(err.message || 'Duplicate failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteProduct(id);
      await refreshProducts();
      triggerStoreSync();
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      showToast(`Product "${name}" deleted`);
    } catch (err: any) {
      showToast(err.message || 'Deletion failed');
    }
  };

  // Bulk Operations
  const handleBulkStatusChange = async (status: 'published' | 'draft' | 'archived') => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      await api.bulkUpdateProducts(selectedIds, 'setStatus', status);
      await refreshProducts();
      triggerStoreSync();
      showToast(`Updated ${selectedIds.length} products to ${status}`);
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || 'Bulk update failed');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      return;
    }
    setIsBulkOperating(true);
    try {
      for (const id of selectedIds) {
        await api.deleteProduct(id);
      }
      await refreshProducts();
      triggerStoreSync();
      showToast(`Deleted ${selectedIds.length} products`);
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || 'Bulk delete failed');
    } finally {
      setIsBulkOperating(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header with Title & Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#181614] font-normal">
            Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Manage all robes, sets, pyjamas, styles, inventory, and storefront publication states.
          </p>
        </div>
        <button
          onClick={onNewProduct}
          className="px-4 py-2.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-medium tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* 2. Search, Filter & Sort Controls */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-4 rounded-2xl space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, SKU, collection, or style..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-700 capitalize"
            >
              <option value="all">All Categories ({products.length})</option>
              <option value="bridal">Bridal Robes</option>
              <option value="bridesmaids">Bridesmaids Robes</option>
              <option value="sets">Bridal Party Sets</option>
              <option value="adire">African Heritage (Adire)</option>
              <option value="pyjamas">Bridal Pyjamas</option>
              <option value="accessories">Accessories</option>
              <option value="junior">Junior / Kids</option>
              <option value="personalised">Personalised Robes</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-700"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#DCD1BF] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A880] text-neutral-700"
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Product Name (A-Z)</option>
              <option value="stock-asc">Stock Quantity (Lowest first)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills / Reset */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-[#EBE3D8] text-neutral-600 gap-2">
          <div className="flex items-center space-x-2">
            <span>Showing {filteredProducts.length} of {products.length} products</span>
            {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedStock !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedStock('all');
                  setSortBy('default');
                }}
                className="text-[11px] text-[#A58860] hover:underline font-semibold ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Quick Stock Filters */}
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="text-neutral-400 mr-1">Stock:</span>
            {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setSelectedStock(st);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-md capitalize transition-colors ${
                  selectedStock === st
                    ? 'bg-[#181614] text-white font-medium'
                    : 'bg-white hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bulk Action Floating Toolbar (When items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#181614] text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-3 text-xs">
            <span className="bg-[#C5A880] text-[#181614] font-bold px-2 py-0.5 rounded-full text-[11px]">
              {selectedIds.length}
            </span>
            <span>products selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('published')}
              disabled={isBulkOperating}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors"
            >
              Publish Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('draft')}
              disabled={isBulkOperating}
              className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded-lg font-medium transition-colors"
            >
              Unpublish (Draft)
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg font-medium transition-colors"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-neutral-400 hover:text-white text-xs"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 4. Products Data Table */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F2ECE4] text-[#181614] border-b border-[#E0D5C3] text-[10px] tracking-wider uppercase font-semibold">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedProducts.length > 0 &&
                      paginatedProducts.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-[#DCD1BF] text-[#C5A880] focus:ring-[#C5A880]"
                  />
                </th>
                <th className="py-4 pr-4">Product Details</th>
                <th className="py-4 px-3">Category / Style</th>
                <th className="py-4 px-3">Price</th>
                <th className="py-4 px-3">Inventory</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-3">Highlights</th>
                <th className="py-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DE]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <p className="font-serif text-base text-neutral-700">No products found matching your filters</p>
                    <p className="text-xs mt-1">Try changing your search terms or clearing active filters</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-white/80 transition-colors ${
                        isSelected ? 'bg-[#F2ECE4]/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(product.id)}
                          className="rounded border-[#DCD1BF] text-[#C5A880] focus:ring-[#C5A880]"
                        />
                      </td>

                      {/* Product Name, SKU, Image */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <img
                              src={product.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                              alt={product.name}
                              onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                              className="w-12 h-16 object-cover rounded-lg border border-[#E0D5C3]"
                            />
                            {product.images.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-black/75 text-white text-[9px] px-1 rounded-full">
                                +{product.images.length - 1}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[220px]">
                            <div className="font-medium text-[#181614] text-sm truncate">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              SKU: {product.sku || 'LE-PROD-000'}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {product.collectionName} Collection
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Style */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-white border border-[#E0D5C3] rounded-md text-[11px] capitalize text-neutral-800 font-medium">
                          {product.category}
                        </span>
                        <div className="text-[10px] text-neutral-500 mt-1 capitalize">
                          Style: {product.style}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-medium text-neutral-900">
                        <div>{formatPrice(product.priceUSD)}</div>
                        {product.compareAtPriceUSD && (
                          <div className="text-[10px] line-through text-neutral-400">
                            {formatPrice(product.compareAtPriceUSD)}
                          </div>
                        )}
                      </td>

                      {/* Inventory / Stock */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            product.stockQuantity === 0
                              ? 'bg-red-100 text-red-800'
                              : product.stockQuantity && product.stockQuantity <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {product.stockQuantity === 0
                            ? 'Out of Stock'
                            : `${product.stockQuantity ?? 25} in stock`}
                        </span>
                        <div className="text-[10px] text-neutral-400 mt-0.5 capitalize">
                          {product.stockStatus?.replace('_', ' ') || 'In Stock'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          title="Click to toggle publish status"
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shadow-2xs ${
                            product.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : product.status === 'archived'
                              ? 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {product.status === 'published'
                            ? '● Published'
                            : product.status === 'archived'
                            ? '● Archived'
                            : '○ Draft'}
                        </button>
                      </td>

                      {/* Badges / Merchandising */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {product.isBestSeller && (
                            <span className="px-1.5 py-0.5 bg-[#F2ECE4] border border-[#C5A880] text-[#8A7968] rounded text-[9px] font-medium">
                              Bestseller
                            </span>
                          )}
                          {product.isNew && (
                            <span className="px-1.5 py-0.5 bg-neutral-900 text-white rounded text-[9px] font-medium">
                              New
                            </span>
                          )}
                          {!product.isBestSeller && !product.isNew && (
                            <span className="text-[10px] text-neutral-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onPreviewProduct(product)}
                            title="Preview in Storefront"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(product.id)}
                            title="Edit Product"
                            className="p-1.5 text-[#A58860] hover:text-[#181614] hover:bg-[#F2ECE4] rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(product)}
                            title="Duplicate Product"
                            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-white rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            title="Delete Product"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E0D5C3] bg-[#F2ECE4]/40 flex items-center justify-between text-xs text-neutral-600">
            <div>
              Page {currentPage} of {totalPages} ({filteredProducts.length} items)
            </div>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#DCD1BF] bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium ${
                    currentPage === i + 1
                      ? 'bg-[#181614] text-white'
                      : 'bg-white hover:bg-neutral-100 border border-[#DCD1BF]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#DCD1BF] bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
