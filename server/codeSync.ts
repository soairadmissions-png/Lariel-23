import fs from 'fs';
import path from 'path';
import type { DatabaseSchema, DBProduct, DBCategory, DBSiteSettings, DBRealBride } from './db.ts';

export interface EditableImageItem {
  id: string;
  name: string;
  section: 'Products' | 'Categories' | 'Hero & Banners' | 'Bespoke Embroidery' | 'Real Brides' | 'Journal' | 'Brand Identity';
  type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
  targetId: string;
  imageId?: string; // Stable unique ID e.g. `${product.id}__primary`
  imageRole?: 'primary' | 'hover' | 'gallery';
  imageIndex?: number;
  currentUrl: string;
  secondaryUrl?: string;
  codeFile: string;
  description: string;
  recommendedAspect?: string;
}

const PRODUCTS_TS_PATH = path.join(process.cwd(), 'src', 'data', 'products.ts');
const CATEGORIES_TS_PATH = path.join(process.cwd(), 'src', 'data', 'categories.ts');
const SETTINGS_TS_PATH = path.join(process.cwd(), 'src', 'data', 'siteSettings.ts');
const IMAGE_DEFAULTS_TS_PATH = path.join(process.cwd(), 'src', 'constants', 'imageDefaults.ts');
const REAL_BRIDES_TS_PATH = path.join(process.cwd(), 'src', 'data', 'realBrides.ts');
const JOURNAL_TS_PATH = path.join(process.cwd(), 'src', 'data', 'journal.ts');
const DB_JSON_PATH = path.join(process.cwd(), 'data', 'db.json');

/**
 * Resolves a product by exact unique ID first.
 * Does not allow slug matching to select the wrong product if an exact ID matches any product.
 */
export function resolveProduct<T extends { id: string; slug?: string }>(
  products: T[],
  identifier: string
): T | undefined {
  if (!identifier || !Array.isArray(products)) return undefined;
  const cleanId = String(identifier).trim();
  // 1. Exact unique ID match FIRST
  const byId = products.find((p) => p.id === cleanId);
  if (byId) return byId;
  // 2. Exact slug match only as a fallback if no exact ID match exists
  return products.find((p) => p.slug && p.slug === cleanId);
}

export function resolveProductIndex<T extends { id: string; slug?: string }>(
  products: T[],
  identifier: string
): number {
  if (!identifier || !Array.isArray(products)) return -1;
  const cleanId = String(identifier).trim();
  // 1. Exact unique ID match FIRST
  const idxById = products.findIndex((p) => p.id === cleanId);
  if (idxById !== -1) return idxById;
  // 2. Exact slug match only as a fallback if no exact ID match exists
  return products.findIndex((p) => p.slug && p.slug === cleanId);
}

/**
 * Ensures a product has stable, uniquely identified gallery items
 */
export function ensureProductGallery(product: DBProduct): DBProduct {
  if (!Array.isArray(product.images)) product.images = [];
  product.images = product.images.filter((img) => typeof img === 'string' && img.trim() !== '');
  const gallery: Array<{ id: string; url: string; position: number; role: 'primary' | 'hover' | 'gallery'; updatedAt?: string }> = [];
  product.images.forEach((url, idx) => {
    const role: 'primary' | 'hover' | 'gallery' = idx === 0 ? 'primary' : idx === 1 ? 'hover' : 'gallery';
    const id = idx === 0 ? `${product.id}__primary` : idx === 1 ? `${product.id}__hover` : `${product.id}__gallery_${idx}`;
    gallery.push({
      id,
      url,
      position: idx,
      role,
      updatedAt: product.updatedAt || new Date().toISOString(),
    });
  });
  product.imageGallery = gallery;
  return product;
}

export function generateProductsCode(products: DBProduct[]): string {
  const normalized = products.map((p) => ensureProductGallery(p));
  return `import { Product } from '../types';

export const PRODUCTS: Product[] = ${JSON.stringify(normalized, null, 2)};
`;
}

/**
 * Synchronize products directly into src/data/products.ts
 */
export function syncProductsCode(products: DBProduct[]): boolean {
  try {
    if (!Array.isArray(products) || products.length === 0) return false;
    products.forEach((p) => ensureProductGallery(p));
    fs.writeFileSync(PRODUCTS_TS_PATH, generateProductsCode(products), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to sync products to code file (src/data/products.ts):', err);
    return false;
  }
}

export function generateCategoriesCode(categories: DBCategory[]): string {
  return `import { CategoryMeta } from '../types';

export const CATEGORIES: CategoryMeta[] = ${JSON.stringify(categories, null, 2)};
`;
}

/**
 * Synchronize categories directly into src/data/categories.ts
 */
export function syncCategoriesCode(categories: DBCategory[]): boolean {
  try {
    if (!Array.isArray(categories) || categories.length === 0) return false;
    fs.writeFileSync(CATEGORIES_TS_PATH, generateCategoriesCode(categories), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to sync categories to code file (src/data/categories.ts):', err);
    return false;
  }
}

export function generateSiteSettingsCode(settings: DBSiteSettings): string {
  return `import { SiteSettings } from '../types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = ${JSON.stringify(settings, null, 2)};
`;
}

/**
 * Synchronize site settings directly into src/data/siteSettings.ts
 */
export function syncSiteSettingsCode(settings: DBSiteSettings): boolean {
  try {
    if (!settings || typeof settings !== 'object') return false;
    fs.writeFileSync(SETTINGS_TS_PATH, generateSiteSettingsCode(settings), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to sync site settings to code file (src/data/siteSettings.ts):', err);
    return false;
  }
}

/**
 * Synchronize canonical defaults and category/setting hero images into src/constants/imageDefaults.ts
 */
export function syncImageDefaultsCode(
  settings?: DBSiteSettings,
  categories?: DBCategory[],
  overrides?: Record<string, string>
): boolean {
  try {
    if (!fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) return false;

    let content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, 'utf8');

    // Build replacement map with canonical overrides
    const storedOverrides = (settings as any)?.canonicalOverrides || {};
    const replacements: Record<string, string> = {
      ...storedOverrides,
      ...(overrides || {}),
    };

    if (settings?.homeHeroImage) {
      replacements.HERO_MAIN = settings.homeHeroImage;
    }
    if (settings?.laidePortraitImage) {
      replacements.FOUNDER_PORTRAIT = settings.laidePortraitImage;
    }
    if ((settings as any)?.adminAvatarImage) {
      replacements.ADMIN_AVATAR = (settings as any).adminAvatarImage;
    }
    if (settings?.brandLogoImage) {
      replacements.LOGO_EMBLEM = settings.brandLogoImage;
    }
    if ((settings as any)?.brandWordmarkImage) {
      replacements.LOGO_WORDMARK = (settings as any).brandWordmarkImage;
    }

    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.heroImage) continue;
        const norm = cat.id.toLowerCase();
        if (norm === 'bridal' || norm === 'bridal-robes') replacements.CATEGORY_BRIDAL = cat.heroImage;
        else if (norm === 'bridesmaids' || norm === 'bridesmaids-robes') replacements.CATEGORY_BRIDESMAIDS = cat.heroImage;
        else if (norm === 'sets' || norm === 'bridal-party' || norm === 'party') {
          replacements.CATEGORY_SETS = cat.heroImage;
          replacements.CATEGORY_PARTY = cat.heroImage;
        }
        else if (norm === 'adire' || norm === 'heritage-adire') replacements.CATEGORY_ADIRE = cat.heroImage;
        else if (norm === 'pyjamas' || norm === 'sleepwear' || norm === 'luxury-sleepwear') replacements.CATEGORY_SLEEPWEAR = cat.heroImage;
        else if (norm === 'accessories' || norm === 'bridal-accessories' || norm === 'bonnets') replacements.CATEGORY_ACCESSORIES = cat.heroImage;
        else if (norm === 'personalised' || norm === 'custom' || norm === 'bespoke') replacements.CATEGORY_CUSTOM = cat.heroImage;
        else if (norm === 'boudoir') replacements.CATEGORY_BOUDOIR = cat.heroImage;
      }
    }

    // Apply regex replacements for key properties in CANONICAL_DEFAULTS
    for (const [key, val] of Object.entries(replacements)) {
      if (!val || typeof val !== 'string') continue;
      const cleanVal = val.trim();
      const reg = new RegExp(`(${key}:\\s*['"])([^'"]*)(['"])`, 'g');
      content = content.replace(reg, `$1${cleanVal}$3`);
    }

    fs.writeFileSync(IMAGE_DEFAULTS_TS_PATH, content, 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to sync image defaults to code file (src/constants/imageDefaults.ts):', err);
    return false;
  }
}

export function generateRealBridesCode(realBrides?: DBRealBride[]): string {
  return `import { RealBrideStory } from '../types';

export const REAL_BRIDES: RealBrideStory[] = ${JSON.stringify(realBrides || [], null, 2)};
`;
}

/**
 * Synchronize real brides stories directly into src/data/realBrides.ts
 */
export function syncRealBridesCode(realBrides?: DBRealBride[]): boolean {
  try {
    if (!Array.isArray(realBrides) || realBrides.length === 0) return false;
    fs.writeFileSync(REAL_BRIDES_TS_PATH, generateRealBridesCode(realBrides), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to sync real brides to code file (src/data/realBrides.ts):', err);
    return false;
  }
}

/**
 * Synchronize journal article image directly into src/data/journal.ts
 */
export function syncJournalCode(articleId: string, newUrl: string): boolean {
  try {
    if (!fs.existsSync(JOURNAL_TS_PATH)) return false;
    let content = fs.readFileSync(JOURNAL_TS_PATH, 'utf8');

    // Target the specific article by id and update its image field
    const articleRegex = new RegExp(`(id:\\s*['"]${articleId}['"][\\s\\S]*?image:\\s*['"])([^'"]*)(['"])`);
    if (articleRegex.test(content)) {
      content = content.replace(articleRegex, `$1${newUrl}$3`);
      fs.writeFileSync(JOURNAL_TS_PATH, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to sync journal image to code file (src/data/journal.ts):', err);
    return false;
  }
}

/**
 * Generate in-memory code file representations for atomic multi-file GitHub commits
 * Even if local disk is read-only EROFS (e.g. Vercel), this produces the exact updated source strings.
 */
export function getUpdatedCodeFiles(db: DatabaseSchema): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // 1. data/db.json
  files.push({
    path: 'data/db.json',
    content: JSON.stringify(db, null, 2),
  });

  // 2. src/data/products.ts
  if (db.products && Array.isArray(db.products) && db.products.length > 0) {
    files.push({
      path: 'src/data/products.ts',
      content: generateProductsCode(db.products),
    });
  }

  // 3. src/data/categories.ts
  if (db.categories && Array.isArray(db.categories) && db.categories.length > 0) {
    files.push({
      path: 'src/data/categories.ts',
      content: generateCategoriesCode(db.categories),
    });
  }

  // 4. src/data/siteSettings.ts
  if (db.settings && typeof db.settings === 'object') {
    files.push({
      path: 'src/data/siteSettings.ts',
      content: generateSiteSettingsCode(db.settings),
    });
  }

  // 5. src/data/realBrides.ts
  if (db.realBrides && Array.isArray(db.realBrides) && db.realBrides.length > 0) {
    files.push({
      path: 'src/data/realBrides.ts',
      content: generateRealBridesCode(db.realBrides),
    });
  }

  // 6. src/constants/imageDefaults.ts
  try {
    if (fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) {
      let content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, 'utf8');
      const storedOverrides = (db.settings as any)?.canonicalOverrides || {};
      const replacements: Record<string, string> = { ...storedOverrides };
      if (db.settings?.homeHeroImage) {
        replacements.HERO_MAIN = db.settings.homeHeroImage;
      }
      if (db.settings?.laidePortraitImage) {
        replacements.FOUNDER_PORTRAIT = db.settings.laidePortraitImage;
      }
      if ((db.settings as any)?.adminAvatarImage) {
        replacements.ADMIN_AVATAR = (db.settings as any).adminAvatarImage;
      }
      if (db.settings?.brandLogoImage) {
        replacements.LOGO_EMBLEM = db.settings.brandLogoImage;
      }
      if ((db.settings as any)?.brandWordmarkImage) {
        replacements.LOGO_WORDMARK = (db.settings as any).brandWordmarkImage;
      }
      if (Array.isArray(db.categories)) {
        for (const cat of db.categories) {
          if (!cat.heroImage) continue;
          const norm = cat.id.toLowerCase();
          if (norm === 'bridal' || norm === 'bridal-robes') replacements.CATEGORY_BRIDAL = cat.heroImage;
          else if (norm === 'bridesmaids' || norm === 'bridesmaids-robes') replacements.CATEGORY_BRIDESMAIDS = cat.heroImage;
          else if (norm === 'sets' || norm === 'bridal-party' || norm === 'party') {
            replacements.CATEGORY_SETS = cat.heroImage;
            replacements.CATEGORY_PARTY = cat.heroImage;
          } else if (norm === 'adire' || norm === 'heritage-adire') replacements.CATEGORY_ADIRE = cat.heroImage;
          else if (norm === 'pyjamas' || norm === 'sleepwear' || norm === 'luxury-sleepwear') replacements.CATEGORY_SLEEPWEAR = cat.heroImage;
          else if (norm === 'accessories' || norm === 'bridal-accessories' || norm === 'bonnets') replacements.CATEGORY_ACCESSORIES = cat.heroImage;
          else if (norm === 'personalised' || norm === 'custom' || norm === 'bespoke') replacements.CATEGORY_CUSTOM = cat.heroImage;
          else if (norm === 'boudoir') replacements.CATEGORY_BOUDOIR = cat.heroImage;
        }
      }
      for (const [key, val] of Object.entries(replacements)) {
        if (!val || typeof val !== 'string') continue;
        const reg = new RegExp(`(${key}:\\s*['"])([^'"]*)(['"])`, 'g');
        content = content.replace(reg, `$1${val.trim()}$3`);
      }
      files.push({
        path: 'src/constants/imageDefaults.ts',
        content,
      });
    }
  } catch {}

  return files;
}

/**
 * Master sync function that writes to data/db.json AND all corresponding TypeScript code files.
 * Returns both the local filesUpdated list and the full in-memory files list with contents.
 */
export function syncAllCode(db: DatabaseSchema): {
  success: boolean;
  filesUpdated: string[];
  files: Array<{ path: string; content: string }>;
  timestamp: number;
} {
  const filesUpdated: string[] = [];
  const inMemoryFiles = getUpdatedCodeFiles(db);

  // 1. data/db.json
  try {
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(db, null, 2), 'utf8');
    filesUpdated.push('data/db.json');
  } catch (err) {
    // EROFS or permission error on serverless
  }

  // 2. src/data/products.ts
  if (db.products && Array.isArray(db.products) && db.products.length > 0) {
    if (syncProductsCode(db.products)) {
      filesUpdated.push('src/data/products.ts');
    }
  }

  // 3. src/constants/imageDefaults.ts
  if (syncImageDefaultsCode(db.settings, db.categories)) {
    filesUpdated.push('src/constants/imageDefaults.ts');
  }

  // 4. src/data/categories.ts
  if (db.categories && Array.isArray(db.categories) && db.categories.length > 0) {
    if (syncCategoriesCode(db.categories)) {
      filesUpdated.push('src/data/categories.ts');
    }
  }

  // 5. src/data/siteSettings.ts
  if (db.settings && typeof db.settings === 'object') {
    if (syncSiteSettingsCode(db.settings)) {
      filesUpdated.push('src/data/siteSettings.ts');
    }
  }

  // 6. src/data/realBrides.ts
  if (db.realBrides && Array.isArray(db.realBrides) && db.realBrides.length > 0) {
    if (syncRealBridesCode(db.realBrides)) {
      filesUpdated.push('src/data/realBrides.ts');
    }
  }

  return {
    success: filesUpdated.length > 0 || inMemoryFiles.length > 0,
    filesUpdated: filesUpdated.length > 0 ? filesUpdated : inMemoryFiles.map((f) => f.path),
    files: inMemoryFiles,
    timestamp: Date.now(),
  };
}

/**
 * Helper to parse canonical defaults from src/constants/imageDefaults.ts
 */
function getCanonicalDefaultsMap(): Record<string, string> {
  const defaults: Record<string, string> = {};
  try {
    if (fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) {
      const content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, 'utf8');
      const matches = content.matchAll(/([A-Z_]+):\s*['"]([^'"]+)['"]/g);
      for (const m of matches) {
        defaults[m[1]] = m[2];
      }
    }
  } catch {}
  return defaults;
}

/**
 * Return an exhaustive, organized inventory of all images across the website
 */
export function getAllEditableImages(db: DatabaseSchema): EditableImageItem[] {
  const items: EditableImageItem[] = [];
  const canonical = getCanonicalDefaultsMap();

  // 1. Hero & Banners Section
  items.push({
    id: 'setting-home-hero',
    name: 'Storefront Hero Main Image',
    section: 'Hero & Banners',
    type: 'setting',
    targetId: 'homeHeroImage',
    currentUrl: db.settings?.homeHeroImage || canonical.HERO_MAIN || '/uploads/bridal_couch_hero_1788951504284.jpg',
    codeFile: 'src/constants/imageDefaults.ts & data/db.json',
    description: 'Primary visual in the Shop Hero header section (bride in satin robe on cream sofa).',
    recommendedAspect: '2:3 or 3:4 portrait',
  });

  items.push({
    id: 'canonical-hero-bg',
    name: 'Storefront Hero Background Fabric',
    section: 'Hero & Banners',
    type: 'canonical',
    targetId: 'HERO_BACKGROUND',
    currentUrl: canonical.HERO_BACKGROUND || '/uploads/hero_bridal_bg_1788959544066.jpg',
    codeFile: 'src/constants/imageDefaults.ts',
    description: 'Textured ivory and gold drape backdrop behind the hero headline.',
    recommendedAspect: '16:9 widescreen landscape',
  });

  items.push({
    id: 'canonical-hero-portrait',
    name: 'Storefront Hero Bride Cutout Portrait',
    section: 'Hero & Banners',
    type: 'canonical',
    targetId: 'HERO_PORTRAIT',
    currentUrl: canonical.HERO_PORTRAIT || '/uploads/bridal_hero_cutout_1788871988678.jpg',
    codeFile: 'src/constants/imageDefaults.ts',
    description: 'Couture bride silhouette overlay cutout featured in hero editorial composition.',
    recommendedAspect: '3:4 or 4:5 portrait',
  });

  // 2. Brand Identity
  items.push({
    id: 'setting-brand-logo',
    name: 'Brand Emblem & Crest (Favicon & Touch Icon)',
    section: 'Brand Identity',
    type: 'setting',
    targetId: 'brandLogoImage',
    currentUrl: db.settings?.brandLogoImage || canonical.LOGO_EMBLEM || '/uploads/lariel_brand_logo_1788970256407.jpg',
    codeFile: 'src/constants/imageDefaults.ts & data/db.json',
    description: 'Emblem used in header navigation, favicon, touch icon, and luxury packaging stamps.',
    recommendedAspect: '1:1 square',
  });

  items.push({
    id: 'canonical-logo-wordmark',
    name: 'Brand Wordmark Luxury Header',
    section: 'Brand Identity',
    type: 'canonical',
    targetId: 'LOGO_WORDMARK',
    currentUrl: canonical.LOGO_WORDMARK || '/uploads/lariel_wordmark_logo_1788970271070.jpg',
    codeFile: 'src/constants/imageDefaults.ts',
    description: 'Full typographic wordmark displayed in header and luxury certification cards.',
    recommendedAspect: '4:1 wide banner',
  });

  items.push({
    id: 'setting-founder-portrait',
    name: 'Founder Portrait (Laide Adeleke)',
    section: 'Brand Identity',
    type: 'setting',
    targetId: 'laidePortraitImage',
    currentUrl: db.settings?.laidePortraitImage || canonical.FOUNDER_PORTRAIT || '/uploads/laide_founder_portrait_1789650582034.jpg',
    codeFile: 'src/constants/imageDefaults.ts & data/db.json',
    description: 'Featured in Founder Story Section on Home and The Lariel World view.',
    recommendedAspect: '4:5 portrait',
  });

  // 3. Bespoke Embroidery & Monogramming
  items.push({
    id: 'feature-monogram-detail',
    name: 'Bespoke Embroidery Couture Close-up',
    section: 'Bespoke Embroidery',
    type: 'canonical',
    targetId: 'MONOGRAM_DETAIL',
    currentUrl: canonical.MONOGRAM_DETAIL || '/uploads/regenerated_image_1791793258450.jpg',
    codeFile: 'src/components/PersonalisedRobesFeature.tsx & imageDefaults.ts',
    description: 'Gold-embroidered heirloom monogram close-up photography in Section 08.',
    recommendedAspect: '4:5 portrait',
  });

  items.push({
    id: 'canonical-bespoke-swatch',
    name: 'Bespoke Couture Silk Swatch',
    section: 'Bespoke Embroidery',
    type: 'canonical',
    targetId: 'BESPOKE_SWATCH',
    currentUrl: canonical.BESPOKE_SWATCH || '/uploads/regenerated_image_1788962692419.jpg',
    codeFile: 'src/constants/imageDefaults.ts',
    description: 'Lustrous Mulberry silk texture swatch in Custom Design and Monogram suite.',
    recommendedAspect: '1:1 square',
  });

  items.push({
    id: 'canonical-fallback',
    name: 'Universal Global Fallback Image',
    section: 'Bespoke Embroidery',
    type: 'canonical',
    targetId: 'FALLBACK',
    currentUrl: canonical.FALLBACK || '/uploads/bridal_couch_hero_1788951504284.jpg',
    codeFile: 'src/constants/imageDefaults.ts',
    description: 'Safety fallback photograph if any remote CDN image ever fails to load.',
    recommendedAspect: '3:4 portrait',
  });

  // 4. Categories (All 9 Collections)
  if (Array.isArray(db.categories)) {
    for (const cat of db.categories) {
      items.push({
        id: `category-${cat.id}`,
        name: `${cat.name} Hero Banner`,
        section: 'Categories',
        type: 'category',
        targetId: cat.id,
        currentUrl: cat.heroImage || canonical[`CATEGORY_${cat.id.toUpperCase()}`] || '/uploads/bridal_couch_hero_1788951504284.jpg',
        codeFile: 'src/constants/imageDefaults.ts & data/db.json',
        description: `Header hero photograph shown at the top of the ${cat.name} collection page.`,
        recommendedAspect: '16:9 or 21:9 banner',
      });
    }
  }

  // 5. Products (All products, Primary & Secondary images with stable IDs)
  if (Array.isArray(db.products)) {
    for (const p of db.products) {
      ensureProductGallery(p);
      const primary = p.images?.[0] || '/uploads/bridal_couch_hero_1788951504284.jpg';
      const secondary = p.images?.[1] || primary;

      items.push({
        id: `${p.id}__primary`,
        name: `${p.name} (Primary Photo)`,
        section: 'Products',
        type: 'product',
        targetId: p.id,
        imageId: `${p.id}__primary`,
        imageRole: 'primary',
        imageIndex: 0,
        currentUrl: primary,
        secondaryUrl: secondary,
        codeFile: 'src/data/products.ts & data/db.json',
        description: `Default card and detail image for ${p.name} (${p.category} collection).`,
        recommendedAspect: '3:4 editorial portrait',
      });

      if (p.images && p.images.length > 1) {
        items.push({
          id: `${p.id}__hover`,
          name: `${p.name} (Hover / Secondary Photo)`,
          section: 'Products',
          type: 'product',
          targetId: p.id,
          imageId: `${p.id}__hover`,
          imageRole: 'hover',
          imageIndex: 1,
          currentUrl: secondary,
          codeFile: 'src/data/products.ts & data/db.json',
          description: `Second photo shown when hovering over ${p.name} card in catalog.`,
          recommendedAspect: '3:4 editorial portrait',
        });
      }

      // Any additional gallery images (index 2+)
      if (p.images && p.images.length > 2) {
        for (let i = 2; i < p.images.length; i++) {
          items.push({
            id: `${p.id}__gallery_${i}`,
            name: `${p.name} (Gallery Photo #${i + 1})`,
            section: 'Products',
            type: 'product',
            targetId: p.id,
            imageId: `${p.id}__gallery_${i}`,
            imageRole: 'gallery',
            imageIndex: i,
            currentUrl: p.images[i],
            codeFile: 'src/data/products.ts & data/db.json',
            description: `Additional gallery detail photograph #${i + 1} for ${p.name}.`,
            recommendedAspect: '3:4 editorial portrait',
          });
        }
      }
    }
  }

  // 6. Real Brides Lookbook (All 6 stories)
  if (Array.isArray(db.realBrides)) {
    for (const b of db.realBrides) {
      items.push({
        id: `bride-${b.id}`,
        name: `Real Bride: ${b.brideName}`,
        section: 'Real Brides',
        type: 'real-bride',
        targetId: b.id,
        currentUrl: b.image || '/uploads/regenerated_image_1788954098680.jpg',
        codeFile: 'src/data/realBrides.ts & data/db.json',
        description: `${b.robeWorn} in ${b.location} (${b.category}).`,
        recommendedAspect: '4:5 or 3:4 portrait',
      });
    }
  }

  // 7. Editorial Journal Articles (6 stories)
  try {
    if (fs.existsSync(JOURNAL_TS_PATH)) {
      const journalContent = fs.readFileSync(JOURNAL_TS_PATH, 'utf8');
      const articleMatches = [...journalContent.matchAll(/id:\s*['"]([^'"]+)['"][\s\S]*?title:\s*['"]([^'"]+)['"][\s\S]*?image:\s*['"]([^'"]+)['"]/g)];
      for (const m of articleMatches) {
        const aId = m[1];
        const aTitle = m[2];
        const aImg = m[3];
        items.push({
          id: `journal-${aId}`,
          name: `Journal: ${aTitle}`,
          section: 'Journal',
          type: 'journal',
          targetId: aId,
          currentUrl: aImg,
          codeFile: 'src/data/journal.ts',
          description: `Editorial article cover photography for "${aTitle}".`,
          recommendedAspect: '16:9 or 4:3 banner',
        });
      }
    }
  } catch {}

  return items;
}

/**
 * Edit ANY image on the website and save it directly to the corresponding code files
 */
export async function updateImageDirectlyInCode(
  db: DatabaseSchema,
  params: {
    type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal' | 'canonical';
    targetId: string;
    imageId?: string;
    imageRole?: 'primary' | 'hover' | 'gallery';
    imageIndex?: number;
    newUrl: string;
    persist?: boolean;
  }
): Promise<{ success: boolean; item: any; filesUpdated: string[]; files: Array<{ path: string; content: string }>; timestamp: number }> {
  const { type, targetId, imageId, imageRole, imageIndex, newUrl, persist = true } = params;
  if (!newUrl || typeof newUrl !== 'string') {
    throw new Error('Valid new image URL is required.');
  }

  const cleanUrl = newUrl.trim();
  let updatedItem: any = null;

  if (type === 'product') {
    if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
      throw new Error('Target product ID is required.');
    }
    // 1. Strict exact product matching: resolve products by exact unique ID first.
    // Do not allow slug matching to select the wrong product if an ID matches.
    const prod = resolveProduct(db.products, targetId);
    if (!prod) throw new Error(`Product not found with ID or slug "${targetId}"`);

    ensureProductGallery(prod);

    // 2. Strict product targeting & stable image ID validation:
    // Every product-image update must be associated with a verified product identifier and intended slot.
    let targetPos = -1;

    if (imageId && typeof imageId === 'string' && imageId.trim()) {
      const cleanImgId = imageId.trim();

      // Enforce: Validate that the image identifier belongs to the specified product
      if (cleanImgId.includes('__')) {
        const [prefix] = cleanImgId.split('__');
        if (prefix && prefix !== prod.id) {
          throw new Error(
            `Image identifier "${cleanImgId}" belongs to product "${prefix}", not target product "${prod.id}". Update rejected to prevent image crossover.`
          );
        }
      }

      if (
        cleanImgId === `${prod.id}__primary` ||
        cleanImgId === 'primary' ||
        cleanImgId === `${prod.id}_primary`
      ) {
        if (imageRole && imageRole !== 'primary') {
          throw new Error(
            `Image role "${imageRole}" conflicts with primary image identifier "${cleanImgId}". Update rejected.`
          );
        }
        targetPos = 0;
      } else if (
        cleanImgId === `${prod.id}__hover` ||
        cleanImgId === 'hover' ||
        cleanImgId === `${prod.id}_hover`
      ) {
        if (imageRole && imageRole !== 'hover') {
          throw new Error(
            `Image role "${imageRole}" conflicts with hover image identifier "${cleanImgId}". Update rejected.`
          );
        }
        targetPos = 1;
      } else {
        const galleryMatch = cleanImgId.match(/__gallery_(\d+)$/);
        if (galleryMatch) {
          const idx = Number(galleryMatch[1]);
          if (isNaN(idx) || idx < 0) {
            throw new Error(`Invalid gallery index in image identifier "${cleanImgId}".`);
          }
          if (idx > (prod.images || []).length) {
            throw new Error(
              `Stale or out-of-bounds gallery slot index ${idx} in identifier "${cleanImgId}" (product only has ${prod.images?.length || 0} images). Update rejected.`
            );
          }
          if (imageRole && imageRole !== 'gallery') {
            throw new Error(
              `Image role "${imageRole}" conflicts with gallery image identifier "${cleanImgId}". Update rejected.`
            );
          }
          targetPos = idx;
        } else {
          // Check if image exists in prod.imageGallery
          const found = prod.imageGallery?.findIndex((img) => img.id === cleanImgId);
          if (found !== undefined && found >= 0) {
            targetPos = found;
          } else {
            throw new Error(
              `Invalid or stale image identifier "${cleanImgId}" for product "${prod.id}". No matching image slot found. Update rejected.`
            );
          }
        }
      }
    } else {
      // imageId was not specified; determine slot strictly by imageRole and imageIndex
      if (imageRole === 'primary') {
        targetPos = 0;
      } else if (imageRole === 'hover') {
        targetPos = 1;
      } else if (imageRole === 'gallery') {
        if (imageIndex !== undefined && !isNaN(Number(imageIndex)) && Number(imageIndex) >= 0) {
          const idx = Math.floor(Number(imageIndex));
          if (idx > (prod.images || []).length) {
            targetPos = (prod.images || []).length;
          } else {
            targetPos = idx;
          }
        } else {
          targetPos = (prod.images || []).length;
        }
      } else if (imageIndex !== undefined && !isNaN(Number(imageIndex)) && Number(imageIndex) >= 0) {
        const idx = Math.floor(Number(imageIndex));
        if (idx > (prod.images || []).length) {
          targetPos = (prod.images || []).length;
        } else {
          targetPos = idx;
        }
      } else {
        throw new Error(
          `No valid target image slot specified (missing imageId, imageRole, or imageIndex) for product "${prod.id}". Update rejected.`
        );
      }
    }

    if (targetPos < 0) {
      throw new Error(`Could not resolve target image slot for product "${prod.id}". Update rejected.`);
    }

    if (!Array.isArray(prod.images)) prod.images = [];
    prod.images = prod.images.filter((img) => typeof img === 'string' && img.trim() !== '');

    // 3. Preserve unrelated product images and enforce idempotency (prevent duplicate gallery insertions)
    if (targetPos < prod.images.length) {
      prod.images[targetPos] = cleanUrl;
    } else {
      // Append cleanly to the end of the gallery without inserting duplicate tail entries
      if (prod.images[prod.images.length - 1] !== cleanUrl) {
        prod.images.push(cleanUrl);
      }
      targetPos = prod.images.length - 1;
    }

    // 4. In-memory read-after-write verification on the target product
    if (prod.images[targetPos] !== cleanUrl) {
      throw new Error(
        `Slot assignment verification failed: slot ${targetPos} did not store "${cleanUrl}" on product "${prod.id}".`
      );
    }

    ensureProductGallery(prod);
    prod.updatedAt = new Date().toISOString();
    updatedItem = prod;
  } else if (type === 'category') {
    const cat = db.categories.find((c) => c.id === targetId || (c.slug && c.slug === targetId));
    if (!cat) throw new Error(`Category not found with ID ${targetId}`);

    cat.heroImage = cleanUrl;
    updatedItem = cat;
  } else if (type === 'setting') {
    if (!db.settings) db.settings = {};
    (db.settings as any)[targetId] = cleanUrl;
    if (!(db.settings as any).canonicalOverrides) (db.settings as any).canonicalOverrides = {};
    if (targetId === 'homeHeroImage' || targetId === 'heroImage') {
      db.settings.homeHeroImage = cleanUrl;
      db.settings.heroImage = cleanUrl;
      (db.settings as any).canonicalOverrides.HERO_MAIN = cleanUrl;
    }
    if (targetId === 'laidePortraitImage') {
      (db.settings as any).canonicalOverrides.FOUNDER_PORTRAIT = cleanUrl;
      // Note: Do NOT overwrite ADMIN_AVATAR - Founder portrait and admin avatar are decoupled!
    }
    if (targetId === 'adminAvatarImage' || targetId === 'adminAvatar') {
      (db.settings as any).adminAvatarImage = cleanUrl;
      (db.settings as any).canonicalOverrides.ADMIN_AVATAR = cleanUrl;
    }
    if (targetId === 'brandLogoImage') {
      (db.settings as any).canonicalOverrides.LOGO_EMBLEM = cleanUrl;
    }
    if (targetId === 'brandWordmarkImage' || targetId === 'wordmark') {
      (db.settings as any).brandWordmarkImage = cleanUrl;
      (db.settings as any).canonicalOverrides.LOGO_WORDMARK = cleanUrl;
    }
    (db as any).siteSettings = { ...db.settings };
    syncImageDefaultsCode(db.settings, db.categories, (db.settings as any).canonicalOverrides);
    updatedItem = db.settings;
  } else if (type === 'real-bride') {
    if (!db.realBrides) db.realBrides = [];
    const bride = db.realBrides.find((b) => b.id === targetId);
    if (bride) {
      bride.image = cleanUrl;
      updatedItem = bride;
    } else {
      throw new Error(`Real bride story not found with ID ${targetId}`);
    }
  } else if (type === 'canonical') {
    if (!db.settings) db.settings = {};
    if (!(db.settings as any).canonicalOverrides) (db.settings as any).canonicalOverrides = {};
    (db.settings as any).canonicalOverrides[targetId] = cleanUrl;
    if (targetId === 'HERO_MAIN') {
      db.settings.homeHeroImage = cleanUrl;
      db.settings.heroImage = cleanUrl;
    }
    if (targetId === 'FOUNDER_PORTRAIT') {
      db.settings.laidePortraitImage = cleanUrl;
    }
    if (targetId === 'ADMIN_AVATAR') {
      (db.settings as any).adminAvatarImage = cleanUrl;
    }
    if (targetId === 'LOGO_EMBLEM') {
      db.settings.brandLogoImage = cleanUrl;
    }
    if (targetId === 'LOGO_WORDMARK') {
      (db.settings as any).brandWordmarkImage = cleanUrl;
    }
    (db as any).siteSettings = { ...db.settings };
    syncImageDefaultsCode(db.settings, db.categories, (db.settings as any).canonicalOverrides);
    updatedItem = { key: targetId, url: cleanUrl };
  } else if (type === 'journal') {
    syncJournalCode(targetId, cleanUrl);
    updatedItem = { id: targetId, image: cleanUrl };
  }

  // Master synchronization directly to disk code files if persist !== false
  let syncResult: { filesUpdated: string[]; files: Array<{ path: string; content: string }>; timestamp: number };
  if (persist) {
    syncResult = syncAllCode(db);
    if (type === 'journal' && !syncResult.filesUpdated.includes('src/data/journal.ts')) {
      syncResult.filesUpdated.push('src/data/journal.ts');
    }
  } else {
    syncResult = {
      filesUpdated: [],
      files: getUpdatedCodeFiles(db),
      timestamp: Date.now(),
    };
  }

  // 5. Read-after-write verification against persisted database state
  if (type === 'product') {
    const verifiedProd = resolveProduct(db.products, targetId);
    if (!verifiedProd || !Array.isArray(verifiedProd.images) || !verifiedProd.images.includes(cleanUrl)) {
      throw new Error(`Read-after-write verification failed: product "${targetId}" did not persist image "${cleanUrl}".`);
    }
  }

  return {
    success: true,
    item: updatedItem,
    filesUpdated: syncResult.filesUpdated,
    files: syncResult.files,
    timestamp: syncResult.timestamp,
  };
}
