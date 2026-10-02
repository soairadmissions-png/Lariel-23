import React, { useEffect } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { QuickViewModal } from './components/QuickViewModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ToastNotification } from './components/ToastNotification';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

import { HomeView } from './views/HomeView';
import { CollectionView } from './views/CollectionView';
import { ProductDetailView } from './views/ProductDetailView';
import { BridalPartyBuilderView } from './views/BridalPartyBuilderView';
import { CustomDesignView } from './views/CustomDesignView';
import { TheLarielWorldView } from './views/TheLarielWorldView';
import { CheckoutView } from './views/CheckoutView';
import { AdminView } from './admin/AdminView';

const MainAppContent: React.FC = () => {
  const { activeView, setActiveView, isAdminAuthenticated, adminUser } = useShop();

  // Convert any 'all caps' text nodes to 'first letter capital' (Title Case)
  useEffect(() => {
    const toTitle = (text: string) => {
      return text.replace(/\b[A-Z]{2,}\b/g, (match) => {
        if (
          match === 'DHL' ||
          match === 'UK' ||
          match === 'USA' ||
          match === 'UBA' ||
          match === 'NGN' ||
          match === 'USD' ||
          match === 'GBP' ||
          match === 'EUR' ||
          match === 'CAD' ||
          match === 'AUD' ||
          match === 'AED'
        ) {
          return match;
        }
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
    };

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const val = node.nodeValue;
        if (/[A-Z]{2,}/.test(val)) {
          const parent = node.parentElement;
          if (parent && !['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) {
            const transformed = toTitle(val);
            if (transformed !== val) {
              node.nodeValue = transformed;
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (!['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE'].includes(el.tagName)) {
          for (let i = 0; i < el.childNodes.length; i++) {
            processNode(el.childNodes[i]);
          }
        }
      }
    };

    processNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(processNode);
        } else if (m.type === 'characterData') {
          processNode(m.target);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [activeView]);

  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-[#F7F4EE]">
        <AdminView />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111111] font-sans antialiased selection:bg-[#C5A880] selection:text-white">
      {/* Admin Storefront Preview Floating Banner */}
      {isAdminAuthenticated && (
        <aside aria-label="Admin Storefront Preview Bar" className="bg-[#141210] text-[#FAF8F5] px-4 py-2 text-xs flex items-center justify-between border-b border-[#C5A880]/30 sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-serif tracking-wide text-[#C5A880] uppercase text-[10px] font-semibold">
              Live Storefront Preview
            </span>
            <span className="text-neutral-400 hidden sm:inline">
              · Signed in as {adminUser?.name || 'Administrator'}
            </span>
          </div>
          <button
            onClick={() => setActiveView('admin')}
            className="px-3 py-1 bg-[#C5A880] hover:bg-[#d4b78e] text-[#141210] font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin CMS</span>
          </button>
        </aside>
      )}

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
