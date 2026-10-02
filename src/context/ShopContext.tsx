import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItem, Currency, ProductColor, BridalPartyMember, OrderRecord, AdminUser, CategoryMeta, SiteSettings, RealBrideStory } from '../types';
import { CURRENCIES, GLOBAL_COLORS } from '../data/currencies';
import { api, getStoredAdminUser, getAdminToken, clearAdminAuth } from '../services/api';
import { REAL_BRIDES } from '../data/realBrides';
import { PRODUCTS } from '../data/products';
import dbData from '../../data/db.json';

export const triggerStoreSync = () => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('lariel_store_sync');
      bc.postMessage({ type: 'SYNC', time: Date.now() });
      setTimeout(() => bc.close(), 100);
    }
    localStorage.setItem('lariel_store_sync_ping', String(Date.now()));
  } catch {
    // ignore
  }
};

interface ShopContextType {
  // Navigation
  activeView: string;
  setActiveView: (view: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedWorldTab: string;
  setSelectedWorldTab: (tab: string) => void;
  selectedInfoTab: string;
  setSelectedInfoTab: (tab: string) => void;
  navigateToProduct: (productId: string) => void;
  navigateToCategory: (category: string) => void;
  navigateToAdmin: () => void;

  // Dynamic Catalog State
  products: Product[];
  refreshProducts: () => Promise<void>;
  categories: CategoryMeta[];
  refreshCategories: () => Promise<void>;

  // Site Settings & Real Brides
  siteSettings: SiteSettings;
  refreshSiteSettings: () => Promise<void>;
  updateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  realBrides: RealBrideStory[];
  refreshRealBrides: () => Promise<void>;
  addRealBride: (story: Partial<RealBrideStory>) => Promise<void>;
  deleteRealBride: (id: string) => Promise<void>;
  triggerSync: () => void;

  // Admin CMS Auth
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  adminLogout: () => void;

  // Currency
  currency: Currency;
  setCurrency: (c: Currency) => void;
  selectedCurrency: any;
  setSelectedCurrency: (c: any) => void;
  formatPrice: (amountUSD: number) => string;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, color: ProductColor, size: string, quantity?: number, personalisation?: { text?: string; role?: string }) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotalUSD: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Wishlist
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;

  // Quick View
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;

  // Search
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Bridal Party Builder
  bridalParty: BridalPartyMember[];
  bridalPartyMembers: BridalPartyMember[];
  addPartyMember: (role?: BridalPartyMember['role']) => void;
  addBridalPartyMember: (memberOrRole: BridalPartyMember | string) => void;
  updatePartyMember: (id: string, updates: Partial<BridalPartyMember>) => void;
  updateBridalPartyMember: (id: string, updates: Partial<BridalPartyMember>) => void;
  removePartyMember: (id: string) => void;
  removeBridalPartyMember: (id: string) => void;
  addBridalPartyToCart: () => void;

  // Orders / Tracking
  orders: OrderRecord[];
  addOrder: (order: OrderRecord) => void;

  // Toast notification
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

function parseCurrentRoute(): {
  view: string;
  category?: string;
  productId?: string;
} {
  if (typeof window === 'undefined') return { view: 'home' };
  const pathname = window.location.pathname;

  if (pathname.startsWith('/admin')) {
    return { view: 'admin' };
  }
  const prodMatch = pathname.match(/^\/products?\/([^/]+)/);
  if (prodMatch && prodMatch[1]) {
    return { view: 'product', productId: decodeURIComponent(prodMatch[1]) };
  }
  const catMatch = pathname.match(/^\/(?:collections?|category)\/([^/]+)/);
  if (catMatch && catMatch[1]) {
    return { view: 'collection', category: decodeURIComponent(catMatch[1]) };
  }
  if (pathname === '/checkout') return { view: 'checkout' };
  if (pathname === '/build-bridal-party' || pathname === '/bridal-party') return { view: 'build-bridal-party' };
  if (pathname === '/custom-design') return { view: 'custom-design' };
  if (pathname === '/the-lariel-world') return { view: 'the-lariel-world' };

  return { view: 'home' };
}

const getInitialProducts = (): Product[] => {
  // 1. Check server-injected bootstrap data from persistent data/db.json
  if (
    typeof window !== 'undefined' &&
    Array.isArray(window.__LARIEL_INITIAL_PRODUCTS__) &&
    window.__LARIEL_INITIAL_PRODUCTS__.length > 0
  ) {
    return window.__LARIEL_INITIAL_PRODUCTS__;
  }
  // 2. Bundled persistent database fallback
  if (dbData && Array.isArray((dbData as any).products) && (dbData as any).products.length > 0) {
    return (dbData as any).products;
  }
  return PRODUCTS;
};

const getInitialCategories = (): CategoryMeta[] => {
  // 1. Check server-injected bootstrap data from persistent data/db.json
  if (
    typeof window !== 'undefined' &&
    Array.isArray(window.__LARIEL_INITIAL_CATEGORIES__) &&
    window.__LARIEL_INITIAL_CATEGORIES__.length > 0
  ) {
    return window.__LARIEL_INITIAL_CATEGORIES__;
  }
  // 2. Bundled persistent database fallback
  if (dbData && Array.isArray((dbData as any).categories) && (dbData as any).categories.length > 0) {
    return (dbData as any).categories;
  }
  return [];
};

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRoute = parseCurrentRoute();
  const [activeView, setActiveViewRaw] = useState<string>(initialRoute.view);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialRoute.category || 'bridal');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialRoute.productId || null);
  const [selectedWorldTab, setSelectedWorldTab] = useState<string>('story');
  const [selectedInfoTab, setSelectedInfoTab] = useState<string>('faqs');

  // URL pushState sync for views
  const setActiveView = useCallback((view: string) => {
    setActiveViewRaw(view);
    if (typeof window !== 'undefined') {
      let targetPath = '/';
      if (view === 'admin') {
        targetPath = window.location.pathname.startsWith('/admin') ? window.location.pathname : '/admin';
      }
      else if (view === 'checkout') targetPath = '/checkout';
      else if (view === 'build-bridal-party') targetPath = '/build-bridal-party';
      else if (view === 'custom-design') targetPath = '/custom-design';
      else if (view === 'the-lariel-world') targetPath = '/the-lariel-world';
      else if (view === 'collection') targetPath = `/collections/${selectedCategory}`;
      else if (view === 'product' && selectedProductId) targetPath = `/products/${selectedProductId}`;

      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
    }
  }, [selectedCategory, selectedProductId]);

  // Handle browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseCurrentRoute();
      setActiveViewRaw(parsed.view);
      if (parsed.category) setSelectedCategory(parsed.category);
      if (parsed.productId) setSelectedProductId(parsed.productId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Dynamic Catalog State
  const [products, setProducts] = useState<Product[]>(getInitialProducts);
  const [categories, setCategories] = useState<CategoryMeta[]>(getInitialCategories);

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredAdminUser());
  const isAdminAuthenticated = Boolean(adminUser && getAdminToken());

  const refreshProducts = useCallback(async () => {
    try {
      const liveProducts = await api.getProducts();
      if (Array.isArray(liveProducts) && liveProducts.length > 0) {
        setProducts(liveProducts);
      }
    } catch (err) {
      console.warn('Could not refresh products from server:', err);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const liveCats = await api.getCategories();
      if (Array.isArray(liveCats) && liveCats.length > 0) {
        setCategories(liveCats);
      }
    } catch (err) {
      console.warn('Could not refresh categories from server:', err);
    }
  }, []);

  // Site Settings & Real Brides state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    homeHeroImage: '/uploads/regenerated_image_1788952915584.png',
    homeHeroTitle: 'The Morning Before Forever',
    homeHeroSubtitle: 'Hand-appliquéd 3D florals, French chantilly laces & 100% pure Mulberry liquid silks for the discerning global bride.',
    announcement: 'Complimentary worldwide express courier delivery on all bridal suite commissions.',
  });
  const [realBrides, setRealBrides] = useState<RealBrideStory[]>(() => REAL_BRIDES);

  const refreshSiteSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      if (data && typeof data === 'object') {
        setSiteSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn('Could not load site settings:', err);
    }
  }, []);

  const updateSiteSettings = useCallback(async (settings: Partial<SiteSettings>) => {
    try {
      const data = await api.updateSettings(settings);
      setSiteSettings((prev) => ({ ...prev, ...data }));
      triggerStoreSync();
    } catch (err) {
      console.error('Failed to update site settings:', err);
      throw err;
    }
  }, []);

  const refreshRealBrides = useCallback(async () => {
    try {
      const data = await api.getRealBrides();
      if (Array.isArray(data) && data.length > 0) {
        setRealBrides(data);
      }
    } catch (err) {
      console.warn('Could not load real brides:', err);
    }
  }, []);

  const addRealBride = useCallback(async (story: Partial<RealBrideStory>) => {
    try {
      await api.createRealBride(story);
      await refreshRealBrides();
      triggerStoreSync();
    } catch (err) {
      console.error('Failed to save real bride:', err);
      throw err;
    }
  }, [refreshRealBrides]);

  const deleteRealBride = useCallback(async (id: string) => {
    try {
      await api.deleteRealBride(id);
      await refreshRealBrides();
      triggerStoreSync();
    } catch (err) {
      console.error('Failed to delete real bride:', err);
      throw err;
    }
  }, [refreshRealBrides]);

  // Initial load & legacy cache cleanup
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lariel_catalog_cache');
        localStorage.removeItem('lariel_categories_cache');
      }
    } catch {}
    refreshProducts();
    refreshCategories();
    refreshSiteSettings();
    refreshRealBrides();
  }, [refreshProducts, refreshCategories, refreshSiteSettings, refreshRealBrides]);

  // Cross-tab and live sync listener
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('lariel_store_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC') {
            refreshProducts();
            refreshCategories();
            refreshSiteSettings();
            refreshRealBrides();
          }
        };
      }
    } catch {
      // Ignore
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lariel_store_sync_ping') {
        refreshProducts();
        refreshCategories();
        refreshSiteSettings();
        refreshRealBrides();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshProducts, refreshCategories, refreshSiteSettings, refreshRealBrides]);

  const adminLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.login(email, pass);
      if (res.success && res.user) {
        setAdminUser(res.user);
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const adminLogout = () => {
    clearAdminAuth();
    setAdminUser(null);
    setActiveView('home');
  };

  // Currency
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('lariel_currency');
      return (saved as Currency) || 'NGN';
    } catch {
      return 'NGN';
    }
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lariel_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Wishlist
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('lariel_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);

  // Quick View & Search
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bridal Party Builder Initial Setup
  const [bridalParty, setBridalParty] = useState<BridalPartyMember[]>([
    {
      id: 'party-1',
      role: 'Bride',
      name: 'The Bride',
      robeProductId: 'amanda-3d-petals-robe',
      selectedSize: 'M (UK 10-12)',
      color: 'Ivory',
      size: 'M (UK 10-12)',
      personalisationText: 'The Bride',
      monogramText: 'The Bride',
      includeSet: true,
      includeMatchingBonnet: true,
    },
    {
      id: 'party-2',
      role: 'Maid of Honour',
      name: 'Sister / Best Friend',
      robeProductId: 'abiks-bridesmaids-robe',
      selectedSize: 'S (UK 8)',
      color: 'Champagne Gold',
      size: 'S (UK 8)',
      personalisationText: 'Maid of Honour',
      monogramText: 'Maid of Honour',
      includeSet: true,
      includeMatchingBonnet: true,
    },
    {
      id: 'party-3',
      role: 'Bridesmaid',
      name: 'Bridesmaid 1',
      robeProductId: 'halo-bridesmaids-robe',
      selectedSize: 'M/L (UK 12-16)',
      color: 'Champagne Gold',
      size: 'M/L (UK 12-16)',
      personalisationText: 'Bridesmaid',
      monogramText: 'Bridesmaid',
      includeSet: false,
      includeMatchingBonnet: true,
    },
  ]);

  // Synchronize bridal party members when dynamic catalog loads
  useEffect(() => {
    if (products.length > 0) {
      setBridalParty((prev) =>
        prev.map((m) => {
          const prod = m.selectedProduct || products.find((p) => p.id === m.robeProductId) || products[0];
          const colorObj = m.selectedColor || prod?.colors?.find((c) => c.name.toLowerCase().includes((m.color || '').toLowerCase())) || prod?.colors?.[0] || GLOBAL_COLORS[0];
          return {
            ...m,
            selectedProduct: prod,
            selectedColor: colorObj,
          };
        })
      );
    }
  }, [products]);

  // Order history
  const [orders, setOrders] = useState<OrderRecord[]>([
    {
      orderId: 'LE-94821',
      date: 'Aug 14, 2024',
      status: 'Delivered',
      items: [
        {
          productName: 'Amanda 3D Petals Robe',
          color: 'Ivory',
          size: 'M (UK 10-12)',
          quantity: 1,
          priceFormatted: '$420',
        },
        {
          productName: 'Reversible Mulberry Silk Hair Bonnet',
          color: 'Ivory / Champagne',
          size: 'Universal',
          quantity: 1,
          priceFormatted: '$45',
        },
      ],
      totalFormatted: '$465',
      shippingAddress: {
        name: 'Chioma Adeyemi',
        city: 'Kensington, London',
        country: 'United Kingdom',
        street: '42 Holland Park Gardens',
      },
      trackingNumber: 'DHL-EX-9928374182',
    },
  ]);

  // Synchronize cart and wishlist items with latest authoritative persistent server products
  useEffect(() => {
    if (products.length > 0) {
      setCart((prevCart) => {
        let changed = false;
        const updated = prevCart.map((item) => {
          const fresh = products.find((p) => p.id === item.product.id || p.slug === item.product.id);
          if (
            fresh &&
            (JSON.stringify(fresh.images) !== JSON.stringify(item.product.images) ||
              fresh.name !== item.product.name ||
              fresh.priceUSD !== item.product.priceUSD)
          ) {
            changed = true;
            return { ...item, product: fresh };
          }
          return item;
        });
        return changed ? updated : prevCart;
      });

      setWishlist((prevWishlist) => {
        let changed = false;
        const updated = prevWishlist.map((item) => {
          const fresh = products.find((p) => p.id === item.id || p.slug === item.id);
          if (fresh && JSON.stringify(fresh.images) !== JSON.stringify(item.images)) {
            changed = true;
            return fresh;
          }
          return item;
        });
        return changed ? updated : prevWishlist;
      });
    }
  }, [products]);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('lariel_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Save wishlist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('lariel_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const formatPrice = (amountUSD: number) => {
    const config = CURRENCIES[currency] || CURRENCIES.USD;
    return config.format(amountUSD);
  };

  const navigateToProduct = (productId: string) => {
    setSelectedProductId(productId);
    setActiveViewRaw('product');
    if (typeof window !== 'undefined' && window.location.pathname !== `/products/${productId}`) {
      window.history.pushState({ view: 'product', productId }, '', `/products/${productId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategory = (category: string) => {
    setSelectedCategory(category);
    setActiveViewRaw('collection');
    if (typeof window !== 'undefined' && window.location.pathname !== `/collections/${category}`) {
      window.history.pushState({ view: 'collection', category }, '', `/collections/${category}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (
    product: Product,
    color: ProductColor,
    size: string,
    quantity: number = 1,
    personalisation?: { text?: string; role?: string }
  ) => {
    const id = `${product.id}-${color.name}-${size}-${personalisation?.text || 'none'}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id,
          product,
          selectedColor: color,
          selectedSize: size,
          personalisationText: personalisation?.text,
          personalisationRole: personalisation?.role,
          quantity,
        },
      ];
    });
    showToast(`Added "${product.name}" to your shopping bag`);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotalUSD = cart.reduce((acc, item) => acc + item.product.priceUSD * item.quantity, 0);

  const toggleWishlist = (product: Product) => {
    const exists = wishlist.some((p) => p.id === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`Removed from your wishlist`);
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast(`Saved "${product.name}" to your wishlist`);
    }
  };

  const isWishlisted = (productId: string) => {
    return wishlist.some((p) => p.id === productId);
  };

  // Bridal Party Builder helpers
  const addPartyMember = (role: BridalPartyMember['role'] = 'Bridesmaid') => {
    const defaultProduct = products.find((p) => p.category === 'sets' || p.category === 'bridesmaids') || products[0];
    const newMember: BridalPartyMember = {
      id: `party-${Date.now()}`,
      role,
      name: `${role} ${bridalParty.length + 1}`,
      robeProductId: defaultProduct?.id || 'halo-bridesmaids-robe',
      selectedProduct: defaultProduct,
      selectedColor: defaultProduct?.colors?.[0] || GLOBAL_COLORS[0],
      selectedSize: 'M (UK 10-12)',
      color: 'Champagne Gold',
      size: 'M (UK 10-12)',
      personalisationText: role,
      monogramText: role,
      includeSet: false,
      includeMatchingBonnet: true,
    };
    setBridalParty((prev) => [...prev, newMember]);
    showToast(`Added ${role} to your bridal party`);
  };

  const addBridalPartyMember = (memberOrRole: BridalPartyMember | string) => {
    if (typeof memberOrRole === 'object' && memberOrRole !== null) {
      setBridalParty((prev) => [...prev, memberOrRole]);
      showToast(`Added ${memberOrRole.name} to your bridal party`);
    } else {
      addPartyMember(memberOrRole as any);
    }
  };

  const updatePartyMember = (id: string, updates: Partial<BridalPartyMember>) => {
    setBridalParty((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const removePartyMember = (id: string) => {
    if (bridalParty.length <= 1) {
      showToast("Your bridal party must have at least one queen");
      return;
    }
    setBridalParty((prev) => prev.filter((m) => m.id !== id));
  };

  const addBridalPartyToCart = () => {
    bridalParty.forEach((member) => {
      const prod = member.selectedProduct || products.find((p) => p.id === member.robeProductId) || products[0];
      if (!prod) return;
      const colorObj = member.selectedColor || prod.colors?.find((c) => c.name.toLowerCase().includes((member.color || '').toLowerCase())) || prod.colors?.[0] || GLOBAL_COLORS[0];
      addToCart(prod, colorObj, member.selectedSize || member.size || 'M', 1, {
        text: member.monogramText || member.personalisationText,
        role: member.role,
      });
    });
    showToast(`Added all ${bridalParty.length} bridal party robes to bag!`);
    setIsCartOpen(true);
  };

  const navigateToAdmin = () => {
    setActiveView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addOrder = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <ShopContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedCategory,
        setSelectedCategory,
        selectedProductId,
        setSelectedProductId,
        selectedWorldTab,
        setSelectedWorldTab,
        selectedInfoTab,
        setSelectedInfoTab,
        navigateToProduct,
        navigateToCategory,
        navigateToAdmin,

        products,
        refreshProducts,
        categories,
        refreshCategories,

        siteSettings,
        refreshSiteSettings,
        updateSiteSettings,
        realBrides,
        refreshRealBrides,
        addRealBride,
        deleteRealBride,
        triggerSync: triggerStoreSync,

        adminUser,
        isAdminAuthenticated,
        adminLogin,
        adminLogout,

        currency,
        setCurrency,
        selectedCurrency: CURRENCIES[currency],
        setSelectedCurrency: (c: any) => setCurrency(c?.code || 'USD'),
        formatPrice,

        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotalUSD,
        isCartOpen,
        setIsCartOpen,

        wishlist,
        toggleWishlist,
        isWishlisted,
        isWishlistOpen,
        setIsWishlistOpen,

        quickViewProduct,
        setQuickViewProduct,

        isSearchOpen,
        setIsSearchOpen,
        searchQuery,
        setSearchQuery,

        bridalParty,
        bridalPartyMembers: bridalParty,
        addPartyMember,
        addBridalPartyMember,
        updatePartyMember,
        updateBridalPartyMember: updatePartyMember,
        removePartyMember,
        removeBridalPartyMember: removePartyMember,
        addBridalPartyToCart,

        orders,
        addOrder,

        toastMessage,
        showToast,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
