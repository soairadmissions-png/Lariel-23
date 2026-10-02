import { Product, CategoryMeta, AdminUser, DashboardStats, OrderRecord, SiteSettings, RealBrideStory } from '../types';
import { DEMO_ADMIN, DEMO_ADMIN_ALT_EMAIL, DEMO_ADMIN_USER } from '../constants/auth';

const TOKEN_KEY = 'lariel_admin_token';
const AUTH_FLAG_KEY = 'admin_authenticated';

export function getAdminToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setAdminAuth(token: string, _user?: AdminUser): void {
  try {
    // Only store temporary session/auth flag; never store credentials in localStorage
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem('lariel_admin_user');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_password');
  } catch {
    // ignore
  }
}

export function getStoredAdminUser(): AdminUser | null {
  try {
    // Credentials are hardcoded in source code; retrieve profile based on session flag
    if (typeof window !== 'undefined') {
      const isAuth =
        localStorage.getItem(AUTH_FLAG_KEY) === 'true' ||
        Boolean(localStorage.getItem(TOKEN_KEY));
      if (isAuth) {
        return DEMO_ADMIN_USER;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAdminAuth(): void {
  try {
    localStorage.removeItem(AUTH_FLAG_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('lariel_admin_user');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_password');
  } catch {
    // ignore
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken() || 'lariel_super_admin_sec_token_2026';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Compresses an image file in the browser before upload:
 * - Resizes so that longest side is at most 2000px (preserving aspect ratio)
 * - Checks for transparency: preserves transparency if the source has it (using WebP)
 * - Exports as JPEG or WebP at quality 0.85 so file is well under Vercel's 4.5 MB limit
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  return new Promise<File>((resolve) => {
    if (typeof window === 'undefined' || !window.Image || !document.createElement) {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const maxDimension = 2000;
      let targetWidth = width;
      let targetHeight = height;

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          targetWidth = maxDimension;
          targetHeight = Math.round((height * maxDimension) / width);
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round((width * maxDimension) / height);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(file);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Check if image has transparency (especially for PNG or WebP)
      let hasTransparency = false;
      if (file.type === 'image/png' || file.type === 'image/webp') {
        try {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
          const len = imgData.length;
          // Step through alpha bytes (index 3, 7, 11...)
          for (let i = 3; i < len; i += 4) {
            if (imgData[i] < 250) {
              hasTransparency = true;
              break;
            }
          }
        } catch {
          // If security restrictions prevent reading canvas, assume PNG has transparency
          if (file.type === 'image/png') {
            hasTransparency = true;
          }
        }
      }

      // If source has transparency, export as WebP (which supports alpha at quality 0.85)
      // Otherwise, export as JPEG (or WebP if source was WebP) at quality 0.85
      let exportType = 'image/jpeg';
      let extension = '.jpg';

      if (hasTransparency) {
        exportType = 'image/webp';
        extension = '.webp';
      } else if (file.type === 'image/webp') {
        exportType = 'image/webp';
        extension = '.webp';
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const outputFilename = `${baseName}${extension}`;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }
          const compressedFile = new File([blob], outputFilename, {
            type: blob.type || exportType,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        exportType,
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AdminUser; token: string }> {
    const inputEmail = (email || '').trim().toLowerCase();
    const inputPassword = (password || '').trim();

    // Validate directly against hardcoded demo admin credentials in source code
    const isDemoMatch =
      (inputEmail === DEMO_ADMIN.email.toLowerCase() && inputPassword === DEMO_ADMIN.password) ||
      (inputEmail === DEMO_ADMIN_ALT_EMAIL.toLowerCase() && inputPassword === DEMO_ADMIN.password);

    if (isDemoMatch) {
      const token = 'lariel_super_admin_sec_token_2026';
      setAdminAuth(token, DEMO_ADMIN_USER);

      // Async notification to server for audit logs without blocking login
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password: inputPassword }),
      }).catch(() => {});

      return {
        success: true,
        user: DEMO_ADMIN_USER,
        token,
      };
    }

    // Try server endpoint fallback for valid server-side admin configurations
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password: inputPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }
      setAdminAuth(data.token, data.user || DEMO_ADMIN_USER);
      return {
        success: true,
        user: data.user || DEMO_ADMIN_USER,
        token: data.token,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Invalid email or password.');
    }
  },

  async getMe(): Promise<{ user: AdminUser }> {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearAdminAuth();
      throw new Error('Session expired');
    }
    return res.json();
  },

  logout(): void {
    clearAdminAuth();
  },

  // Products
  async getProducts(params?: {
    status?: string;
    category?: string;
    search?: string;
    sort?: string;
    scope?: string;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.scope) searchParams.set('scope', params.scope);
    // Anti-caching parameter to ensure persistent server data is always retrieved
    searchParams.set('_t', String(Date.now()));

    const res = await fetch(`/api/products?${searchParams.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    return res.json();
  },

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Product not found');
    }
    return res.json();
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create product');
    }
    return data;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update product');
    }
    return data;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete product');
    }
    return data;
  },

  async duplicateProduct(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to duplicate product');
    }
    return data;
  },

  async bulkUpdateProducts(
    ids: string[],
    action: 'setStatus' | 'setCategory' | 'delete',
    value?: string
  ): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/products/bulk', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, action, value }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Bulk action failed');
    }
    return data;
  },

  // Categories
  async getCategories(): Promise<CategoryMeta[]> {
    const res = await fetch(`/api/categories?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch categories');
    }
    return res.json();
  },

  async createCategory(category: Partial<CategoryMeta>): Promise<CategoryMeta> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create category');
    }
    return data;
  },

  async updateCategory(id: string, updates: Partial<CategoryMeta>): Promise<CategoryMeta> {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update category');
    }
    return data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete category');
    }
    return data;
  },

  // Orders
  async getOrders(): Promise<OrderRecord[]> {
    const res = await fetch('/api/orders', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch orders');
    }
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string): Promise<OrderRecord> {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, trackingNumber }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update order status');
    }
    return data;
  },

  async createOrder(orderData: any): Promise<OrderRecord> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch dashboard statistics');
    }
    return data;
  },

  // Media
  async getMedia(): Promise<{ url: string; fileName: string; size: number; createdAt: string }[]> {
    const res = await fetch(`/api/media?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch media assets');
    }
    return res.json();
  },

  async uploadFile(file: File): Promise<{ url: string; fileName: string; size: number }> {
    // Compress image before upload (max 2000px on longest side, quality 0.85, preserve PNG transparency)
    const fileToUpload = await compressImageIfNeeded(file);

    const token = getAdminToken() || 'lariel_super_admin_sec_token_2026';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(fileToUpload.name)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': fileToUpload.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(fileToUpload.name),
        },
        body: fileToUpload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Map HTTP 413 to "Image is too large"
      if (res.status === 413) {
        throw new Error('Image is too large');
      }

      // Read response body as text first to handle both JSON and HTML error pages safely
      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Not valid JSON (e.g. Vercel 500 HTML error page)
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || (res.status === 413 ? 'Image is too large' : `Upload failed (HTTP ${res.status})`);
        throw new Error(errorMsg);
      }

      if (data && (data.url || data.blob?.url)) {
        return {
          url: data.url || data.blob?.url,
          fileName: data.fileName || fileToUpload.name,
          size: data.size || fileToUpload.size,
        };
      }

      throw new Error(data?.error || 'Invalid response from server');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Upload timed out after 30 seconds. Please check your connection and try again.');
      }
      throw err;
    }
  },

  async uploadImage(base64Data: string, filename?: string): Promise<{ url: string; fileName: string; size?: number }> {
    // If it's already a persistent URL, return it immediately
    if (typeof base64Data === 'string' && (base64Data.startsWith('/uploads/') || base64Data.startsWith('http://') || base64Data.startsWith('https://'))) {
      return { url: base64Data, fileName: filename || 'image.jpg', size: 0 };
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data: base64Data, filename }),
    });

    const responseText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {}

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('Image too large. Please select a photo under 4.5 MB.');
      }
      throw new Error(data?.error || data?.message || 'Failed to upload image');
    }
    return data;
  },

  // Site Settings
  async getSettings(): Promise<SiteSettings> {
    const res = await fetch(`/api/settings?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch site settings');
    }
    return res.json();
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update site settings');
    }
    return data;
  },

  // Real Brides
  async getRealBrides(): Promise<RealBrideStory[]> {
    const res = await fetch('/api/real-brides');
    if (!res.ok) {
      throw new Error('Failed to fetch real brides');
    }
    return res.json();
  },

  async createRealBride(story: Partial<RealBrideStory>): Promise<RealBrideStory> {
    const res = await fetch('/api/real-brides', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(story),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save real bride story');
    }
    return data;
  },

  async deleteRealBride(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/real-brides/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete real bride story');
    }
    return data;
  },
};
