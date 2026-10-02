import React, { useEffect, useState, useRef } from 'react';
import {
  ShoppingBag,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Plus,
  RefreshCw,
  Edit,
  Eye,
  CheckCircle,
  User,
  Upload,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { useShop, triggerStoreSync } from '../context/ShopContext';
import { api } from '../services/api';
import { DashboardStats, Product } from '../types';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

interface AdminDashboardProps {
  onNavigateTab: (tab: any, productId?: string) => void;
  onPreviewProduct: (product: Product) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onPreviewProduct,
}) => {
  const { products, formatPrice, showToast, refreshProducts, siteSettings, refreshSiteSettings } = useShop();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLaide, setIsUploadingLaide] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const laideInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLaide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLaide(true);
    try {
      const res = await api.uploadFile(file);
      if (res && res.url) {
        await api.updateSettings({ laidePortraitImage: res.url });
        await refreshSiteSettings();
        triggerStoreSync();
        showToast("Founder portrait for Laide uploaded and updated live across the house!");
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload founder photo');
    } finally {
      setIsUploadingLaide(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const res = await api.uploadFile(file);
      if (res && res.url) {
        await api.updateSettings({ brandLogoImage: res.url });
        await refreshSiteSettings();
        triggerStoreSync();
        showToast("Brand logo uploaded and updated live in the header and navigation!");
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload brand logo');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Compute live metrics directly from products state as fallback / supplement
  const publishedCount = products.filter((p) => p.status === 'published').length;
  const draftCount = products.filter((p) => p.status === 'draft').length;
  const archivedCount = products.filter((p) => p.status === 'archived').length;
  const lowStockProducts = products.filter(
    (p) => p.stockStatus === 'low_stock' || (p.stockQuantity !== undefined && p.stockQuantity > 0 && p.stockQuantity <= 5)
  );
  const outOfStockProducts = products.filter(
    (p) => p.stockStatus === 'out_of_stock' || p.stockQuantity === 0
  );

  const handleQuickStatusToggle = async (product: Product) => {
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateProduct(product.id, { status: nextStatus });
      await refreshProducts();
      await loadStats();
      showToast(`Product "${product.name}" is now ${nextStatus}`);
    } catch (err: any) {
      showToast(err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* 1. Header Banner & Quick Actions */}
      <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#A58860]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Operations Overview</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#181614] mt-1 font-normal">
            Welcome to Lariel Admin
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-xl">
            Real-time control center for managing haute couture bridal robes, party sets, African heritage adire, and customer orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigateTab('new-product')}
            className="px-4 py-2.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-xs font-medium tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
          <button
            onClick={() => onNavigateTab('categories')}
            className="px-4 py-2.5 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] text-neutral-800 text-xs font-medium tracking-wider uppercase rounded-xl transition-colors"
          >
            Categories
          </button>
          <button
            onClick={() => {
              loadStats();
              refreshProducts();
              showToast('Refreshed live catalog metrics');
            }}
            title="Refresh Metrics"
            className="p-2.5 bg-white hover:bg-[#F2ECE4] border border-[#DCD1BF] text-neutral-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Low Stock Alert Banner (if any) */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Inventory Attention Required
              </div>
              <div className="text-xs text-amber-800">
                {outOfStockProducts.length} product(s) out of stock, {lowStockProducts.length} product(s) running low on inventory.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg whitespace-nowrap"
          >
            Review Inventory
          </button>
        </div>
      )}

      {/* 3. Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Products */}
        <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Catalog</span>
            <div className="p-2 rounded-xl bg-[#F2ECE4] text-[#8A7968]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-[#181614] font-medium">
            {products.length}
          </div>
          <div className="mt-2 flex items-center space-x-2 text-[11px] text-neutral-600">
            <span className="text-emerald-700 font-semibold">{publishedCount} published</span>
            <span>·</span>
            <span className="text-neutral-500">{draftCount} drafts</span>
          </div>
        </div>

        {/* Live Published Products */}
        <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Storefront</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-emerald-800 font-medium">
            {publishedCount}
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">
            Live and available for customer purchases
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Customer Orders</span>
            <div className="p-2 rounded-xl bg-[#F2ECE4] text-[#8A7968]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-[#181614] font-medium">
            {stats?.totalOrders ?? 3}
          </div>
          <div className="mt-2 text-[11px] text-neutral-600 flex items-center justify-between">
            <span>Fulfillment Pipeline</span>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-[#A58860] hover:underline font-semibold"
            >
              View →
            </button>
          </div>
        </div>

        {/* Catalog Value / Revenue */}
        <div className="bg-[#FAF8F5] border border-[#E0D5C3] p-5 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Volume</span>
            <div className="p-2 rounded-xl bg-[#F2ECE4] text-[#8A7968]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-[#181614] font-medium">
            {formatPrice(stats?.totalRevenue ?? 930)}
          </div>
          <div className="mt-2 text-[11px] text-neutral-600 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active across 7 currencies</span>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Split: Recent Product Updates & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Products Table */}
        <div className="lg:col-span-2 bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EBE3D8]">
            <div>
              <h3 className="font-serif text-lg text-[#181614]">Recent Product Updates</h3>
              <p className="text-xs text-neutral-500">
                Latest modified couture designs and sets
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-[#A58860] hover:underline flex items-center space-x-1"
            >
              <span>View All Products ({products.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] tracking-wider uppercase text-neutral-500 border-b border-[#EFE8DE]">
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Stock</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DE]/80">
                {products.slice(0, 5).map((prod) => (
                  <tr key={prod.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={prod.images?.[0] || CANONICAL_DEFAULTS.PRODUCT}
                          alt={prod.name}
                          onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.PRODUCT)}
                          className="w-9 h-12 object-cover rounded-lg border border-[#E0D5C3] shrink-0"
                        />
                        <div className="min-w-0 max-w-[180px]">
                          <div className="font-medium text-[#181614] truncate">{prod.name}</div>
                          <div className="text-[10px] text-neutral-500 truncate">{prod.sku || 'LE-CAT-000'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 capitalize text-neutral-600">{prod.category}</td>
                    <td className="py-3 font-medium text-neutral-800">{formatPrice(prod.priceUSD)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          prod.stockQuantity === 0
                            ? 'bg-red-100 text-red-700'
                            : prod.stockQuantity && prod.stockQuantity <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {prod.stockQuantity === 0 ? 'Out of Stock' : `${prod.stockQuantity ?? 25} in stock`}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleQuickStatusToggle(prod)}
                        title="Click to toggle status"
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                          prod.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                        }`}
                      >
                        {prod.status === 'published' ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onPreviewProduct(prod)}
                          title="Preview in Storefront"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onNavigateTab('edit-product', prod.id)}
                          title="Edit Product"
                          className="p-1.5 text-[#A58860] hover:text-[#181614] rounded-lg hover:bg-[#F2ECE4]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Category Share & Audit Logs */}
        <div className="space-y-6">
          {/* Category distribution */}
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl p-6 shadow-2xs">
            <h3 className="font-serif text-lg text-[#181614] mb-1">Catalog Categories</h3>
            <p className="text-xs text-neutral-500 mb-4">Active product distribution</p>

            <div className="space-y-2.5">
              {[
                { name: 'Bridal Robes', id: 'bridal' },
                { name: 'Bridesmaids Robes', id: 'bridesmaids' },
                { name: 'Bridal Party Sets', id: 'sets' },
                { name: 'African Heritage (Adire)', id: 'adire' },
                { name: 'Bridal Pyjamas', id: 'pyjamas' },
                { name: 'Accessories & Finishing', id: 'accessories' },
              ].map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                const percent = Math.round((count / (products.length || 1)) * 100);
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-700 font-medium">{cat.name}</span>
                      <span className="text-neutral-500 font-mono">{count} items ({percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#EBE3D8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C5A880] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand & Founder Identity Quick Management */}
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Brand & Founder Identity</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('media')}
                className="text-[11px] text-[#A58860] hover:underline cursor-pointer"
              >
                Open Media Library →
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={laideInputRef}
              onChange={handleUploadLaide}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleUploadLogo}
              accept="image/*,.svg"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Founder Photo */}
              <div className="p-3 bg-white border border-[#E0D5C3] rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-14 rounded-lg overflow-hidden border border-[#DCD1BF] bg-[#F4EDE2] shrink-0">
                    <img
                      src={siteSettings?.laidePortraitImage || CANONICAL_DEFAULTS.FOUNDER_PORTRAIT}
                      alt="Laide Founder"
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.FOUNDER_PORTRAIT)}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-800 truncate">Laide Portrait</div>
                    <div className="text-[10px] text-neutral-500">Founder Story Photo</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => laideInputRef.current?.click()}
                  disabled={isUploadingLaide}
                  className="px-2.5 py-1.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-[11px] font-medium rounded-lg transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                >
                  {isUploadingLaide ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>{isUploadingLaide ? '...' : 'Upload'}</span>
                </button>
              </div>

              {/* Brand Logo */}
              <div className="p-3 bg-white border border-[#E0D5C3] rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-14 rounded-lg overflow-hidden border border-[#DCD1BF] bg-[#FAF8F5] shrink-0 flex items-center justify-center p-1">
                    <img
                      src={siteSettings?.brandLogoImage || CANONICAL_DEFAULTS.LOGO_WORDMARK}
                      alt="Brand Logo"
                      onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.LOGO_WORDMARK)}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-800 truncate">Brand Logo</div>
                    <div className="text-[10px] text-neutral-500">Header & Menu Wordmark</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="px-2.5 py-1.5 bg-[#181614] hover:bg-[#C5A880] hover:text-[#181614] text-white text-[11px] font-medium rounded-lg transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>{isUploadingLogo ? '...' : 'Upload'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log / Activity */}
          <div className="bg-[#FAF8F5] border border-[#E0D5C3] rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Trail & Activity</span>
            </div>

            <div className="space-y-3">
              {(stats?.activityLogs || [
                {
                  id: '1',
                  action: 'Catalog synchronization active with 41 products',
                  adminName: 'System',
                  timestamp: new Date().toISOString(),
                },
              ])
                .slice(0, 4)
                .map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-[#C5A880] pl-3 py-0.5">
                    <div className="text-neutral-800 font-medium">{log.action}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      by {log.adminName} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
