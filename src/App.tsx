import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { QuickViewModal } from './components/QuickViewModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ToastNotification } from './components/ToastNotification';

import { HomeView } from './views/HomeView';
import { CollectionView } from './views/CollectionView';
import { ProductDetailView } from './views/ProductDetailView';
import { BridalPartyBuilderView } from './views/BridalPartyBuilderView';
import { CustomDesignView } from './views/CustomDesignView';
import { TheLarielWorldView } from './views/TheLarielWorldView';
import { CheckoutView } from './views/CheckoutView';
import { AdminView } from './admin/AdminView';

const MainAppContent: React.FC = () => {
  const { activeView } = useShop();

  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-[#F7F4EE]">
        <AdminView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111111] font-sans antialiased selection:bg-[#C5A880] selection:text-white">
      {/* Sticky Header & Mega Menu */}
      <Header />

      {/* Dynamic View Engine */}
      <main className="flex-1">
        {activeView === 'collection' ? (
          <CollectionView />
        ) : activeView === 'product' ? (
          <ProductDetailView />
        ) : activeView === 'build-bridal-party' ? (
          <BridalPartyBuilderView />
        ) : activeView === 'custom-design' ? (
          <CustomDesignView />
        ) : activeView === 'the-lariel-world' ? (
          <TheLarielWorldView />
        ) : activeView === 'checkout' ? (
          <CheckoutView />
        ) : (
          <HomeView />
        )}
      </main>

      {/* Global Brand Authority Footer */}
      <Footer />

      {/* Slide-over Drawers & Modals */}
      <CartDrawer />
      <WishlistDrawer />
      <SearchModal />
      <QuickViewModal />
      <FloatingWhatsApp />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <MainAppContent />
    </ShopProvider>
  );
}
