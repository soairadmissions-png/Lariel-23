import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  FolderTree,
  PackageCheck,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Bell,
  Eye,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CANONICAL_DEFAULTS, handleImageError } from '../constants/imageDefaults';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'new-product'
  | 'edit-product'
  | 'categories'
  | 'orders'
  | 'media';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  children: React.ReactNode;
  onOpenStorefrontPreview?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
  onOpenStorefrontPreview,
}) => {
  const { adminUser, adminLogout, setActiveView, products, categories, orders, toastMessage, showToast, siteSettings } = useShop();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      count: null,
    },
    {
      id: 'products' as AdminTab,
      label: 'Catalog & Products',
      icon: ShoppingBag,
      count: products.length,
    },
    {
      id: 'new-product' as AdminTab,
      label: 'Add Product',
      icon: PlusCircle,
      count: null,
    },
    {
      id: 'categories' as AdminTab,
      label: 'Categories',
      icon: FolderTree,
      count: categories.length || 9,
    },
    {
      id: 'orders' as AdminTab,
      label: 'Customer Orders',
      icon: PackageCheck,
      count: orders.length || 3,
    },
    {
      id: 'media' as AdminTab,
      label: 'Media Library',
      icon: ImageIcon,
      count: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex text-[#181614] font-sans antialiased">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#141210] text-[#FAF8F5] shrink-0 border-r border-[#2C2723] justify-between">
        <div>
          {/* Brand Monogram Header */}
          <div className="p-6 border-b border-[#2C2723] flex items-center space-x-3 text-left">
            {siteSettings?.brandLogoImage ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#C5A880]/30 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md">
                <img
                  src={siteSettings.brandLogoImage}
                  alt="Lariel Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C5A880] to-[#9C7F58] flex items-center justify-center text-[#141210] font-serif font-bold text-lg shadow-md shrink-0">
                L
              </div>
            )}
            <div>
              <div className="font-serif text-lg tracking-wide font-normal text-white">
                Lariel CMS
              </div>
              <div className="text-[10px] tracking-widest text-[#C5A880] uppercase font-semibold">
                Haute Couture Suite
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-left">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === 'products' && currentTab === 'edit-product');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#C5A880] text-[#141210] shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-[#141210] text-[#C5A880]'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#2C2723] space-y-3 text-left">
          {/* Live Storefront Preview Quick Action */}
          <button
            onClick={() => {
              if (onOpenStorefrontPreview) {
                onOpenStorefrontPreview();
              } else {
                setActiveView('home');
              }
            }}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#C5A880] text-xs font-medium tracking-wide transition-colors border border-[#C5A880]/30"
          >
            <Eye className="w-4 h-4" />
            <span>View Live Storefront</span>
            <ExternalLink className="w-3 h-3 text-neutral-400 ml-auto" />
          </button>

          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#C5A880]/30 border border-[#C5A880] text-[#C5A880] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                <img
                  src={siteSettings?.laidePortraitImage || adminUser?.avatar || CANONICAL_DEFAULTS.ADMIN_AVATAR}
                  alt="Admin"
                  onError={(e) => handleImageError(e, CANONICAL_DEFAULTS.ADMIN_AVATAR)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {adminUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-[#C5A880] truncate">
                  {adminUser?.role || 'Super Admin'}
                </div>
              </div>
            </div>
            <button
              onClick={adminLogout}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Drawer Navigation */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative w-64 bg-[#141210] text-[#FAF8F5] flex flex-col justify-between p-4 z-10 text-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#2C2723]">
                <div className="font-serif text-lg text-white">Lariel Admin</div>
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium tracking-wide ${
                        isActive
                          ? 'bg-[#C5A880] text-[#141210] font-semibold'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#2C2723] space-y-2">
              <button
                onClick={() => setActiveView('home')}
                className="w-full py-2 px-3 bg-white/5 text-[#C5A880] text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                <span>View Storefront</span>
              </button>
              <button
                onClick={adminLogout}
                className="w-full py-2 px-3 bg-red-950/40 text-red-300 text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FAF8F5] border-b border-[#E5DAC8] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#DCD1BF] text-neutral-700 hover:bg-[#F2ECE4]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-left">
              <div className="text-[10px] tracking-widest text-[#8A7968] uppercase font-semibold">
                Admin Console
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-normal text-[#181614] capitalize">
                {currentTab.replace('-', ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Link to Storefront */}
            <button
              onClick={() => setActiveView('home')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#DCD1BF] bg-white hover:bg-[#F5EFE6] text-xs font-medium text-neutral-800 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Exit to Store</span>
            </button>

            {/* Quick Status Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Sync Active</span>
            </div>

            {/* Admin Avatar */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[#E5DAC8]">
              <div className="w-7 h-7 rounded-full bg-[#181614] text-[#C5A880] flex items-center justify-center font-bold text-xs">
                L
              </div>
              <span className="hidden sm:inline text-xs font-medium text-neutral-700">
                Laide
              </span>
            </div>
          </div>
        </header>

        {/* Child View Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Global Admin Toast Feedback: show errors in red with an X icon, and success in green with a check */}
        {toastMessage && (() => {
          const isError =
            toastMessage.toLowerCase().includes('fail') ||
            toastMessage.toLowerCase().includes('error') ||
            toastMessage.toLowerCase().includes('must') ||
            toastMessage.toLowerCase().includes('too large') ||
            toastMessage.toLowerCase().includes('invalid') ||
            toastMessage.toLowerCase().includes('unauthorized') ||
            toastMessage.toLowerCase().includes('timed out');

          return (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md pointer-events-auto transition-all duration-300 ease-out"
            >
              <div
                className={`flex items-start gap-3 p-4 rounded-xl shadow-xl backdrop-blur-md border ${
                  isError
                    ? 'bg-red-50 border-red-300 text-red-950 shadow-red-950/10'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-950/10'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isError ? (
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <div className={`flex-1 text-xs sm:text-sm font-medium leading-relaxed ${isError ? 'text-red-900' : 'text-emerald-900'}`}>
                  {toastMessage}
                </div>
                <button
                  onClick={() => showToast('')}
                  className={`shrink-0 p-1 -mr-1 rounded-md transition-colors ${
                    isError
                      ? 'text-red-400 hover:text-red-800 hover:bg-red-100'
                      : 'text-emerald-400 hover:text-emerald-800 hover:bg-emerald-100'
                  }`}
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
