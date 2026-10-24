import { Product, CategoryMeta, AdminUser, DashboardStats, OrderRecord, SiteSettings, RealBrideStory } from '../types';
import { DEMO_ADMIN, DEMO_ADMIN_ALT_EMAIL, DEMO_ADMIN_USER } from '../constants/auth';

const TOKEN_KEY = 'lariel_admin_token';
const AUTH_FLAG_KEY = 'admin_authenticated';

export function isTokenExpired(token: string | null): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 2) return true;
    const jsonStr = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return true;
    const expMs = payload.exp > 100000000000 ? payload.exp : payload.exp * 1000;
    // Allow a 30-day grace period since the server auto-refreshes valid tokens in grace period
    const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() >= expMs + GRACE_PERIOD_MS;
  } catch {
    return false;
  }
}

export function handleAuthExpired(message?: string): void {
  clearAdminAuth();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lariel_admin_expired', {
        detail: { message: message || 'Your session has expired. Please log in again.' },
      })
    );
  }
}

export function getAdminToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (isTokenExpired(token)) {
      clearAdminAuth();
      return null;
    }
    return token;
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
    if (typeof window !== 'undefined') {
      const token = getAdminToken();
      if (!token) {
        return null;
      }
      return DEMO_ADMIN_USER;
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

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getAdminToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });

  // Automatically capture refreshed token if provided by server
  const refreshedToken = res.headers.get('x-refreshed-token');
  if (refreshedToken) {
    setAdminAuth(refreshedToken);
  }

  if (res.status === 401) {
    let errMsg = 'Unauthorized: Token has expired. Please log in again.';
    try {
      const clone = res.clone();
      const data = await clone.json();
      if (data?.error) errMsg = data.error;
    } catch {}
    handleAuthExpired(errMsg);
  }

  return res;
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      // High-res retina optimization (1600px max side keeps luxury crispness while keeping payload ~200-450KB)
      const maxDimension = 1600;
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
          if (file.type === 'image/png') {
            hasTransparency = true;
          }
        }
      }

      let exportType = 'image/jpeg';
      let extension = '.jpg';

      if (hasTransparency) {
        exportType = 'image/webp';
        extension = '.webp';
      } else if (file.type === 'image/webp') {
        exportType = 'image/webp';
        extension = '.webp';
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const outputFilename = `${baseName || 'image'}${extension}`;

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
        0.80
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AdminUser; token: string }> {
    const inputEmail = (email || '').trim().toLowerCase();
    const inputPassword = (password || '').trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password: inputPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid administrator email or password.');
      }
      setAdminAuth(data.token, data.user);
      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Invalid administrator credentials.');
    }
  },

  async getMe(): Promise<{ user: AdminUser }> {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
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
    const res = await authFetch('/api/orders');
    if (!res.ok) {
      throw new Error('Failed to fetch orders');
    }
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string): Promise<OrderRecord> {
    const res = await authFetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
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
    const res = await authFetch('/api/dashboard/stats');
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

  async deleteMedia(url: string, force: boolean = true): Promise<{ success: boolean; deleted: string; deletedLocations?: string[] }> {
    const res = await authFetch('/api/media', {
      method: 'DELETE',
      body: JSON.stringify({ url, force }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete media asset');
    }
    return data;
  },

  async uploadFile(
    file: File,
    folder: string = 'products',
    targetOptions?: {
      type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
      targetId: string;
      imageId?: string;
      imageRole?: 'primary' | 'hover' | 'gallery';
      imageIndex?: number;
    }
  ): Promise<{
    url: string;
    fileName: string;
    size: number;
    status?: {
      validated: boolean;
      localSaved: boolean;
      localPath?: string;
      remoteConfirmed: boolean;
      remoteProvider?: 'github' | 'cloudflare-r2' | 'vercel-blob' | 'none';
      dbUpdated: boolean;
      filesUpdated: string[];
      github?: {
        committed: boolean;
        sha?: string;
        commitSha?: string;
        htmlUrl?: string;
        path?: string;
        error?: string;
      };
      persistenceType: 'permanent_github' | 'permanent_r2' | 'permanent_vercel_blob' | 'local_only' | 'ephemeral_unpersisted';
    };
    warnings?: string[];
    codeSaved?: boolean;
    filesUpdated?: string[];
    item?: any;
    github?: {
      committed: boolean;
      sha?: string;
      commitSha?: string;
      htmlUrl?: string;
      path?: string;
      error?: string;
    };
  }> {
    // Compress image before upload (max 2000px on longest side, quality 0.85, preserve PNG transparency)
    const fileToUpload = await compressImageIfNeeded(file);

    const token = getAdminToken();
    if (!token) {
      throw new Error('Unauthorized: Active administrator session required for uploads. Please log in.');
    }

    // Build URL query parameters for server routing
    const queryParams = new URLSearchParams({
      filename: fileToUpload.name,
      folder,
    });
    if (targetOptions?.type) queryParams.set('targetType', targetOptions.type);
    if (targetOptions?.targetId) queryParams.set('targetId', targetOptions.targetId);
    if (targetOptions?.imageId) queryParams.set('imageId', targetOptions.imageId);
    if (targetOptions?.imageRole) queryParams.set('imageRole', targetOptions.imageRole);
    if (targetOptions?.imageIndex !== undefined) queryParams.set('imageIndex', String(targetOptions.imageIndex));

    // Convert file to Base64 data URL for universal compatibility across all browser iframes and proxies
    const base64Data = await fileToBase64(fileToUpload);

    const payload = {
      data: base64Data,
      filename: fileToUpload.name,
      folder,
      targetType: targetOptions?.type,
      targetId: targetOptions?.targetId,
      imageId: targetOptions?.imageId,
      imageRole: targetOptions?.imageRole,
      imageIndex: targetOptions?.imageIndex,
    };

    const targetUrl = `/api/upload?${queryParams.toString()}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Resilient fetch execution with 1 automatic retry on transient proxy / server restart blips
    const maxAttempts = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Map HTTP 413 to "Image is too large"
        if (res.status === 413) {
          throw new Error('Image is too large. Please select a photo under 5MB.');
        }

        // Read response body safely
        const responseText = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(responseText);
        } catch {
          // Non-JSON response
        }

        if (!res.ok) {
          const errorMsg =
            data?.error ||
            data?.message ||
            (res.status === 413 ? 'Image is too large' : `Upload failed (HTTP ${res.status})`);
          const err = new Error(errorMsg) as Error & { data?: any; url?: string; fileName?: string; status?: any };
          err.data = data;
          err.url = data?.url;
          err.fileName = data?.fileName || fileToUpload.name;
          err.status = data?.status;
          throw err;
        }

        if (data && (data.url || data.blob?.url)) {
          // If target options were provided, require confirmed database persistence
          if (targetOptions?.type && targetOptions?.targetId) {
            if (data.codeSaved === false || (data.status && data.status.dbUpdated === false)) {
              const err = new Error(
                data.error || 'Image file uploaded, but saving to product record failed.'
              ) as Error & { data?: any; url?: string; fileName?: string; status?: any };
              err.data = data;
              err.url = data.url;
              err.fileName = data.fileName || fileToUpload.name;
              err.status = data.status;
              throw err;
            }
          }

          return {
            url: data.url || data.blob?.url,
            fileName: data.fileName || fileToUpload.name,
            size: data.size || fileToUpload.size,
            status: data.status,
            warnings: data.warnings,
            codeSaved: Boolean(data.codeSaved),
            filesUpdated: data.filesUpdated || [],
            item: data.item,
            github: data.github,
          };
        }

        throw new Error(data?.error || 'Invalid response from server');
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          throw new Error('Upload timed out. Please check your network and try again.');
        }

        // Do not retry if server returned a 4xx client validation error or partial upload with response data
        if (err.data || (err.message && err.message.includes('belongs to product'))) {
          throw err;
        }

        // If it was a network error and we have attempts remaining, wait 450ms and retry
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }
      }
    }

    if (lastError?.message && lastError.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to upload server. Please try again.');
    }
    throw lastError || new Error('Upload failed');
  },

  async uploadAndSaveToCode(
    file: File,
    target: {
      type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
      targetId: string;
      imageId?: string;
      imageRole?: 'primary' | 'hover' | 'gallery';
      imageIndex?: number;
      folder?: string;
    }
  ): Promise<{
    url: string;
    fileName: string;
    size: number;
    status?: any;
    warnings?: string[];
    codeSaved: boolean;
    filesUpdated: string[];
    item: any;
    github?: any;
  }> {
    const res = await this.uploadFile(file, target.folder || 'products', {
      type: target.type,
      targetId: target.targetId,
      imageId: target.imageId,
      imageRole: target.imageRole,
      imageIndex: target.imageIndex,
    });
    if (!res.codeSaved || (res.status && res.status.dbUpdated === false)) {
      const err = new Error(
        res.warnings?.[0] || 'Image was uploaded to storage, but failed to save to product record.'
      ) as Error & { data?: any; url?: string; fileName?: string; status?: any };
      err.data = res;
      err.url = res.url;
      err.fileName = res.fileName;
      err.status = res.status;
      throw err;
    }
    return {
      url: res.url,
      fileName: res.fileName,
      size: res.size,
      status: res.status,
      warnings: res.warnings,
      codeSaved: true,
      filesUpdated: res.filesUpdated || [],
      item: res.item,
      github: res.github,
    };
  },

  async retrySaveToCode(payload: {
    url: string;
    fileName: string;
    targetType: string;
    targetId: string;
    imageId?: string;
    imageRole?: 'primary' | 'hover' | 'gallery';
    imageIndex?: number;
  }): Promise<{ success: boolean; url: string; fileName: string; status: any; item: any; filesUpdated: string[] }> {
    const res = await authFetch('/api/upload/retry-save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Retry save failed');
    }
    return data;
  },

  async uploadMediaFile(file: File, folder: string = 'products'): Promise<{ url: string; fileName: string; size: number }> {
    return this.uploadFile(file, folder);
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

  // Direct-to-Code Image Editing & Inventory
  async getImageInventory(): Promise<{
    total: number;
    images: {
      id: string;
      name: string;
      section: 'Products' | 'Categories' | 'Hero & Banners' | 'Bespoke Embroidery' | 'Real Brides' | 'Journal' | 'Brand Identity';
      type: 'product' | 'category' | 'setting' | 'real-bride' | 'canonical' | 'journal';
      targetId: string;
      imageId?: string;
      imageRole?: 'primary' | 'hover' | 'gallery';
      imageIndex?: number;
      currentUrl: string;
      secondaryUrl?: string;
      codeFile: string;
      description: string;
      recommendedAspect?: string;
    }[];
  }> {
    const res = await fetch(`/api/images/inventory?_t=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to load image inventory');
    }
    return res.json();
  },

  async editImageInCode(payload: {
    type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
    targetId: string;
    imageId?: string;
    imageRole?: 'primary' | 'hover' | 'gallery';
    imageIndex?: number;
    newUrl: string;
  }): Promise<{ success: boolean; message: string; filesUpdated: string[]; timestamp: number; item: any }> {
    const res = await authFetch('/api/images/edit', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to edit image in code');
    }
    return data;
  },

  async deleteImageFromCode(payload: {
    type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
    targetId: string;
    imageId?: string;
    imageRole?: 'primary' | 'hover' | 'gallery';
    imageIndex?: number;
  }): Promise<{ success: boolean; action: string; message: string; filesUpdated: string[]; timestamp: number }> {
    const res = await authFetch('/api/images/delete-from-code', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete image from code');
    }
    return data;
  },

  async syncAllToCode(): Promise<{ success: boolean; message: string; filesUpdated: string[]; timestamp: number }> {
    const res = await authFetch('/api/images/sync-all', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sync to code');
    }
    return data;
  },

  // GitHub Storage & Migration
  async getGitHubStatus(): Promise<{
    isConfigured: boolean;
    owner: string | null;
    repo: string | null;
    branch: string;
    hasToken: boolean;
    tokenPrefix: string | null;
    committerName: string;
    committerEmail: string;
    apiConnected?: boolean;
    repoPermissions?: {
      push?: boolean;
      pull?: boolean;
      admin?: boolean;
    };
    error?: string;
    timestamp: string;
  }> {
    const res = await authFetch(`/api/github/status?_t=${Date.now()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch GitHub diagnostics');
    }
    return res.json();
  },

  async migrateVercelBlobs(dryRun: boolean = false): Promise<{
    timestamp: string;
    dryRun: boolean;
    totalFound: number;
    migratedCount: number;
    failedCount: number;
    skippedCount: number;
    githubConfigured: boolean;
    items: any[];
  }> {
    const res = await authFetch('/api/github/migrate', {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Migration failed');
    }
    return data;
  },
};
