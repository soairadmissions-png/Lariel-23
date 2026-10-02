import React, { useState, useEffect, useCallback } from 'react';
import { useShop } from '../context/ShopContext';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { AdminProductsList } from './AdminProductsList';
import { AdminProductEditor } from './AdminProductEditor';
import { AdminCategories } from './AdminCategories';
import { AdminOrders } from './AdminOrders';
import { AdminMediaLibrary } from './AdminMediaLibrary';
import { AdminLivePreviewModal } from './AdminLivePreviewModal';
import { Product } from '../types';

const parseAdminUrl = (pathname: string): { tab: AdminTab; productId: string | null } => {
  if (pathname === '/admin/products/new') {
    return { tab: 'new-product', productId: null };
  }
  const editMatch = pathname.match(/^\/admin\/products\/([^/]+)/);
  if (editMatch && editMatch[1] && editMatch[1] !== 'new') {
    return { tab: 'edit-product', productId: decodeURIComponent(editMatch[1]) };
  }
  if (pathname.startsWith('/admin/products')) {
    return { tab: 'products', productId: null };
  }
  if (pathname.startsWith('/admin/categories')) {
    return { tab: 'categories', productId: null };
  }
  if (pathname.startsWith('/admin/orders')) {
    return { tab: 'orders', productId: null };
  }
  if (pathname.startsWith('/admin/media')) {
    return { tab: 'media', productId: null };
  }
  return { tab: 'dashboard', productId: null };
};

export const AdminView: React.FC = () => {
  const { isAdminAuthenticated, setActiveView, navigateToProduct } = useShop();

  const initialRoute = typeof window !== 'undefined'
    ? parseAdminUrl(window.location.pathname)
    : { tab: 'dashboard' as AdminTab, productId: null };

  const [currentTab, setCurrentTab] = useState<AdminTab>(initialRoute.tab);
  const [editingProductId, setEditingProductId] = useState<string | null>(initialRoute.productId);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Sync browser URL whenever tab or editingProductId changes
  const updateAdminUrl = useCallback((tab: AdminTab, prodId?: string | null) => {
    if (typeof window === 'undefined') return;
    let path = '/admin';
    if (tab === 'products') path = '/admin/products';
    else if (tab === 'new-product') path = '/admin/products/new';
    else if (tab === 'edit-product' && prodId) path = `/admin/products/${prodId}`;
    else if (tab === 'categories') path = '/admin/categories';
    else if (tab === 'orders') path = '/admin/orders';
    else if (tab === 'media') path = '/admin/media';

    if (window.location.pathname !== path) {
      window.history.pushState({ tab, prodId }, '', path);
    }
  }, []);

  // Handle browser back and forward within admin
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAdminUrl(window.location.pathname);
      setCurrentTab(parsed.tab);
      setEditingProductId(parsed.productId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If not logged in, show Login Screen
  if (!isAdminAuthenticated) {
    return <AdminLogin onSuccess={() => {
      setCurrentTab('dashboard');
      updateAdminUrl('dashboard');
    }} />;
  }

  const handleSelectTab = (tab: AdminTab) => {
    if (tab === 'new-product') {
      setEditingProductId(null);
    }
    setCurrentTab(tab);
    updateAdminUrl(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setCurrentTab('edit-product');
    updateAdminUrl('edit-product', productId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewProduct = () => {
    setEditingProductId(null);
    setCurrentTab('new-product');
    updateAdminUrl('new-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEditor = () => {
    setEditingProductId(null);
    setCurrentTab('products');
    updateAdminUrl('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <AdminLayout
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenStorefrontPreview={() => setActiveView('home')}
      >
        {currentTab === 'dashboard' && (
          <AdminDashboard
            onNavigateTab={(tab, productId) => {
              if (productId) {
                handleEditProduct(productId);
              } else {
                handleSelectTab(tab);
              }
            }}
            onPreviewProduct={(product) => setPreviewProduct(product)}
          />
        )}

        {currentTab === 'products' && (
          <AdminProductsList
            onEditProduct={handleEditProduct}
            onNewProduct={handleNewProduct}
            onPreviewProduct={(product) => setPreviewProduct(product)}
          />
        )}

        {(currentTab === 'new-product' || currentTab === 'edit-product') && (
          <AdminProductEditor
            productId={editingProductId}
            onBack={handleCloseEditor}
            onPreview={(product) => setPreviewProduct(product)}
          />
        )}

        {currentTab === 'categories' && <AdminCategories />}

        {currentTab === 'orders' && <AdminOrders />}

        {currentTab === 'media' && <AdminMediaLibrary />}
      </AdminLayout>

      {/* Live Storefront Preview Modal */}
      {previewProduct && (
        <AdminLivePreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onNavigateToStorefront={(prodId) => {
            setPreviewProduct(null);
            navigateToProduct(prodId);
          }}
        />
      )}
    </>
  );
};
