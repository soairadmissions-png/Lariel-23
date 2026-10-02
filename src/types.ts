export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'AED';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  flag?: string;
  rate: number; // relative to USD as base 1.0
  country?: string;
  format: (amountUSD: number) => string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  priceUSD: number;
  compareAtPriceUSD?: number;
  category: 'bridal' | 'bridesmaids' | 'sets' | 'adire' | 'pyjamas' | 'accessories' | 'personalised' | 'junior' | 'new';
  style: 'Silk' | 'Tulle' | 'Lace' | 'Corset' | 'Embellished' | 'Custom';
  collectionName: string;
  description: string;
  details: string[];
  materials: string;
  fabric?: string;
  sizingInfo?: string;
  sizingNotes?: string;
  productionTime?: string;
  shippingInfo?: string;
  shippingNotes?: string;
  careInstructions?: string;
  careNotes?: string;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  reviewsCount?: number;
  reviewCount?: number;
  rating: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  crossSellIds: string[];
  badge?: string;
  setItems?: string[];
  status?: 'published' | 'draft' | 'archived';
  stockQuantity?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'made_to_order';
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  heroImage: string;
  badge?: string;
  isVisible?: boolean;
  order?: number;
  itemCount?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Product Manager' | 'Content Manager';
  avatar: string;
  token?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  adminName: string;
  timestamp: string;
}

export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCategories: number;
  totalOrders: number;
  totalRevenue: number;
  categoryBreakdown: { name: string; id: string; count: number }[];
  recentProducts: Product[];
  recentOrders: OrderRecord[];
  activityLogs: ActivityLog[];
}

export interface CartItem {
  id: string;
  product: Product;
  selectedColor: ProductColor;
  selectedSize: string;
  personalisationText?: string;
  personalisationRole?: string;
  quantity: number;
}

export interface WishlistItem {
  product: Product;
  addedAt: string;
}

export interface BridalPartyMember {
  id: string;
  role: 'Bride' | 'Maid of Honour' | 'Bridesmaid' | 'Mother of the Bride' | 'Mother of the Groom' | 'Flower Girl' | 'Junior Bridesmaid' | string;
  name: string;
  robeProductId?: string;
  color?: string;
  size?: string;
  personalisationText?: string;
  includeSet?: boolean;
  selectedProduct?: Product;
  selectedColor?: ProductColor;
  selectedSize?: string;
  monogramText?: string;
  includeMatchingBonnet?: boolean;
  includeFlipFlops?: boolean;
}

export interface JournalArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  readTime: string;
  date: string;
  category: string;
  image: string;
  excerpt: string;
  content: string[];
}

export interface RealBrideStory {
  id: string;
  brideName: string;
  location: string;
  weddingDate: string;
  category: 'Bride' | 'Bridesmaids' | 'Bridal Party' | 'Custom' | 'Adire';
  robeWorn: string;
  image: string;
  quote: string;
  photographerCredit?: string;
}

export interface OrderItem {
  productName: string;
  color?: string;
  size?: string;
  selectedColor?: any;
  selectedSize?: any;
  quantity: number;
  priceFormatted?: string;
  unitPriceUSD?: number;
  productImage?: string;
  monogramText?: string;
  monogramRole?: string;
}

export interface OrderRecord {
  orderId?: string;
  id?: string;
  date?: string;
  createdAt?: string;
  status: 'Processing' | 'In Production' | 'Shipped' | 'Delivered' | 'delivered' | 'shipped' | 'in_production';
  items: OrderItem[];
  totalFormatted?: string;
  totalUSD?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: {
    name?: string;
    country?: string;
    city?: string;
    street?: string;
    address?: string;
  };
  trackingNumber?: string;
}

export interface SiteSettings {
  homeHeroImage?: string;
  homeHeroTitle?: string;
  homeHeroSubtitle?: string;
  announcement?: string;
}

declare global {
  interface Window {
    __LARIEL_INITIAL_PRODUCTS__?: Product[];
    __LARIEL_INITIAL_CATEGORIES__?: CategoryMeta[];
    __LARIEL_INITIAL_SETTINGS__?: Partial<SiteSettings> | null;
  }
}
