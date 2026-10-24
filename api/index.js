var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/codeSync.ts
var codeSync_exports = {};
__export(codeSync_exports, {
  ensureProductGallery: () => ensureProductGallery,
  generateCategoriesCode: () => generateCategoriesCode,
  generateProductsCode: () => generateProductsCode,
  generateRealBridesCode: () => generateRealBridesCode,
  generateSiteSettingsCode: () => generateSiteSettingsCode,
  getAllEditableImages: () => getAllEditableImages,
  getUpdatedCodeFiles: () => getUpdatedCodeFiles,
  resolveProduct: () => resolveProduct,
  resolveProductIndex: () => resolveProductIndex,
  syncAllCode: () => syncAllCode,
  syncCategoriesCode: () => syncCategoriesCode,
  syncImageDefaultsCode: () => syncImageDefaultsCode,
  syncJournalCode: () => syncJournalCode,
  syncProductsCode: () => syncProductsCode,
  syncRealBridesCode: () => syncRealBridesCode,
  syncSiteSettingsCode: () => syncSiteSettingsCode,
  updateImageDirectlyInCode: () => updateImageDirectlyInCode
});
import fs from "fs";
import path from "path";
function resolveProduct(products, identifier) {
  if (!identifier || !Array.isArray(products)) return void 0;
  const cleanId = String(identifier).trim();
  const byId = products.find((p) => p.id === cleanId);
  if (byId) return byId;
  return products.find((p) => p.slug && p.slug === cleanId);
}
function resolveProductIndex(products, identifier) {
  if (!identifier || !Array.isArray(products)) return -1;
  const cleanId = String(identifier).trim();
  const idxById = products.findIndex((p) => p.id === cleanId);
  if (idxById !== -1) return idxById;
  return products.findIndex((p) => p.slug && p.slug === cleanId);
}
function ensureProductGallery(product) {
  if (!Array.isArray(product.images)) product.images = [];
  product.images = product.images.filter((img) => typeof img === "string" && img.trim() !== "");
  const gallery = [];
  product.images.forEach((url, idx) => {
    const role = idx === 0 ? "primary" : idx === 1 ? "hover" : "gallery";
    const id = idx === 0 ? `${product.id}__primary` : idx === 1 ? `${product.id}__hover` : `${product.id}__gallery_${idx}`;
    gallery.push({
      id,
      url,
      position: idx,
      role,
      updatedAt: product.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  product.imageGallery = gallery;
  return product;
}
function generateProductsCode(products) {
  const normalized = products.map((p) => ensureProductGallery(p));
  return `import { Product } from '../types';

export const PRODUCTS: Product[] = ${JSON.stringify(normalized, null, 2)};
`;
}
function syncProductsCode(products) {
  try {
    if (!Array.isArray(products) || products.length === 0) return false;
    products.forEach((p) => ensureProductGallery(p));
    fs.writeFileSync(PRODUCTS_TS_PATH, generateProductsCode(products), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to sync products to code file (src/data/products.ts):", err);
    return false;
  }
}
function generateCategoriesCode(categories) {
  return `import { CategoryMeta } from '../types';

export const CATEGORIES: CategoryMeta[] = ${JSON.stringify(categories, null, 2)};
`;
}
function syncCategoriesCode(categories) {
  try {
    if (!Array.isArray(categories) || categories.length === 0) return false;
    fs.writeFileSync(CATEGORIES_TS_PATH, generateCategoriesCode(categories), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to sync categories to code file (src/data/categories.ts):", err);
    return false;
  }
}
function generateSiteSettingsCode(settings) {
  return `import { SiteSettings } from '../types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = ${JSON.stringify(settings, null, 2)};
`;
}
function syncSiteSettingsCode(settings) {
  try {
    if (!settings || typeof settings !== "object") return false;
    fs.writeFileSync(SETTINGS_TS_PATH, generateSiteSettingsCode(settings), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to sync site settings to code file (src/data/siteSettings.ts):", err);
    return false;
  }
}
function syncImageDefaultsCode(settings, categories, overrides) {
  try {
    if (!fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) return false;
    let content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, "utf8");
    const storedOverrides = settings?.canonicalOverrides || {};
    const replacements = {
      ...storedOverrides,
      ...overrides || {}
    };
    if (settings?.homeHeroImage) {
      replacements.HERO_MAIN = settings.homeHeroImage;
    }
    if (settings?.laidePortraitImage) {
      replacements.FOUNDER_PORTRAIT = settings.laidePortraitImage;
    }
    if (settings?.adminAvatarImage) {
      replacements.ADMIN_AVATAR = settings.adminAvatarImage;
    }
    if (settings?.brandLogoImage) {
      replacements.LOGO_EMBLEM = settings.brandLogoImage;
    }
    if (settings?.brandWordmarkImage) {
      replacements.LOGO_WORDMARK = settings.brandWordmarkImage;
    }
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.heroImage) continue;
        const norm = cat.id.toLowerCase();
        if (norm === "bridal" || norm === "bridal-robes") replacements.CATEGORY_BRIDAL = cat.heroImage;
        else if (norm === "bridesmaids" || norm === "bridesmaids-robes") replacements.CATEGORY_BRIDESMAIDS = cat.heroImage;
        else if (norm === "sets" || norm === "bridal-party" || norm === "party") {
          replacements.CATEGORY_SETS = cat.heroImage;
          replacements.CATEGORY_PARTY = cat.heroImage;
        } else if (norm === "adire" || norm === "heritage-adire") replacements.CATEGORY_ADIRE = cat.heroImage;
        else if (norm === "pyjamas" || norm === "sleepwear" || norm === "luxury-sleepwear") replacements.CATEGORY_SLEEPWEAR = cat.heroImage;
        else if (norm === "accessories" || norm === "bridal-accessories" || norm === "bonnets") replacements.CATEGORY_ACCESSORIES = cat.heroImage;
        else if (norm === "personalised" || norm === "custom" || norm === "bespoke") replacements.CATEGORY_CUSTOM = cat.heroImage;
        else if (norm === "boudoir") replacements.CATEGORY_BOUDOIR = cat.heroImage;
      }
    }
    for (const [key, val] of Object.entries(replacements)) {
      if (!val || typeof val !== "string") continue;
      const cleanVal = val.trim();
      const reg = new RegExp(`(${key}:\\s*['"])([^'"]*)(['"])`, "g");
      content = content.replace(reg, `$1${cleanVal}$3`);
    }
    fs.writeFileSync(IMAGE_DEFAULTS_TS_PATH, content, "utf8");
    return true;
  } catch (err) {
    console.error("Failed to sync image defaults to code file (src/constants/imageDefaults.ts):", err);
    return false;
  }
}
function generateRealBridesCode(realBrides) {
  return `import { RealBrideStory } from '../types';

export const REAL_BRIDES: RealBrideStory[] = ${JSON.stringify(realBrides || [], null, 2)};
`;
}
function syncRealBridesCode(realBrides) {
  try {
    if (!Array.isArray(realBrides) || realBrides.length === 0) return false;
    fs.writeFileSync(REAL_BRIDES_TS_PATH, generateRealBridesCode(realBrides), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to sync real brides to code file (src/data/realBrides.ts):", err);
    return false;
  }
}
function syncJournalCode(articleId, newUrl) {
  try {
    if (!fs.existsSync(JOURNAL_TS_PATH)) return false;
    let content = fs.readFileSync(JOURNAL_TS_PATH, "utf8");
    const articleRegex = new RegExp(`(id:\\s*['"]${articleId}['"][\\s\\S]*?image:\\s*['"])([^'"]*)(['"])`);
    if (articleRegex.test(content)) {
      content = content.replace(articleRegex, `$1${newUrl}$3`);
      fs.writeFileSync(JOURNAL_TS_PATH, content, "utf8");
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to sync journal image to code file (src/data/journal.ts):", err);
    return false;
  }
}
function getUpdatedCodeFiles(db) {
  const files = [];
  files.push({
    path: "data/db.json",
    content: JSON.stringify(db, null, 2)
  });
  if (db.products && Array.isArray(db.products) && db.products.length > 0) {
    files.push({
      path: "src/data/products.ts",
      content: generateProductsCode(db.products)
    });
  }
  if (db.categories && Array.isArray(db.categories) && db.categories.length > 0) {
    files.push({
      path: "src/data/categories.ts",
      content: generateCategoriesCode(db.categories)
    });
  }
  if (db.settings && typeof db.settings === "object") {
    files.push({
      path: "src/data/siteSettings.ts",
      content: generateSiteSettingsCode(db.settings)
    });
  }
  if (db.realBrides && Array.isArray(db.realBrides) && db.realBrides.length > 0) {
    files.push({
      path: "src/data/realBrides.ts",
      content: generateRealBridesCode(db.realBrides)
    });
  }
  try {
    if (fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) {
      let content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, "utf8");
      const storedOverrides = db.settings?.canonicalOverrides || {};
      const replacements = { ...storedOverrides };
      if (db.settings?.homeHeroImage) {
        replacements.HERO_MAIN = db.settings.homeHeroImage;
      }
      if (db.settings?.laidePortraitImage) {
        replacements.FOUNDER_PORTRAIT = db.settings.laidePortraitImage;
      }
      if (db.settings?.adminAvatarImage) {
        replacements.ADMIN_AVATAR = db.settings.adminAvatarImage;
      }
      if (db.settings?.brandLogoImage) {
        replacements.LOGO_EMBLEM = db.settings.brandLogoImage;
      }
      if (db.settings?.brandWordmarkImage) {
        replacements.LOGO_WORDMARK = db.settings.brandWordmarkImage;
      }
      if (Array.isArray(db.categories)) {
        for (const cat of db.categories) {
          if (!cat.heroImage) continue;
          const norm = cat.id.toLowerCase();
          if (norm === "bridal" || norm === "bridal-robes") replacements.CATEGORY_BRIDAL = cat.heroImage;
          else if (norm === "bridesmaids" || norm === "bridesmaids-robes") replacements.CATEGORY_BRIDESMAIDS = cat.heroImage;
          else if (norm === "sets" || norm === "bridal-party" || norm === "party") {
            replacements.CATEGORY_SETS = cat.heroImage;
            replacements.CATEGORY_PARTY = cat.heroImage;
          } else if (norm === "adire" || norm === "heritage-adire") replacements.CATEGORY_ADIRE = cat.heroImage;
          else if (norm === "pyjamas" || norm === "sleepwear" || norm === "luxury-sleepwear") replacements.CATEGORY_SLEEPWEAR = cat.heroImage;
          else if (norm === "accessories" || norm === "bridal-accessories" || norm === "bonnets") replacements.CATEGORY_ACCESSORIES = cat.heroImage;
          else if (norm === "personalised" || norm === "custom" || norm === "bespoke") replacements.CATEGORY_CUSTOM = cat.heroImage;
          else if (norm === "boudoir") replacements.CATEGORY_BOUDOIR = cat.heroImage;
        }
      }
      for (const [key, val] of Object.entries(replacements)) {
        if (!val || typeof val !== "string") continue;
        const reg = new RegExp(`(${key}:\\s*['"])([^'"]*)(['"])`, "g");
        content = content.replace(reg, `$1${val.trim()}$3`);
      }
      files.push({
        path: "src/constants/imageDefaults.ts",
        content
      });
    }
  } catch {
  }
  return files;
}
function syncAllCode(db) {
  const filesUpdated = [];
  const inMemoryFiles = getUpdatedCodeFiles(db);
  try {
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(db, null, 2), "utf8");
    filesUpdated.push("data/db.json");
  } catch (err) {
  }
  if (db.products && Array.isArray(db.products) && db.products.length > 0) {
    if (syncProductsCode(db.products)) {
      filesUpdated.push("src/data/products.ts");
    }
  }
  if (syncImageDefaultsCode(db.settings, db.categories)) {
    filesUpdated.push("src/constants/imageDefaults.ts");
  }
  if (db.categories && Array.isArray(db.categories) && db.categories.length > 0) {
    if (syncCategoriesCode(db.categories)) {
      filesUpdated.push("src/data/categories.ts");
    }
  }
  if (db.settings && typeof db.settings === "object") {
    if (syncSiteSettingsCode(db.settings)) {
      filesUpdated.push("src/data/siteSettings.ts");
    }
  }
  if (db.realBrides && Array.isArray(db.realBrides) && db.realBrides.length > 0) {
    if (syncRealBridesCode(db.realBrides)) {
      filesUpdated.push("src/data/realBrides.ts");
    }
  }
  return {
    success: filesUpdated.length > 0 || inMemoryFiles.length > 0,
    filesUpdated: filesUpdated.length > 0 ? filesUpdated : inMemoryFiles.map((f) => f.path),
    files: inMemoryFiles,
    timestamp: Date.now()
  };
}
function getCanonicalDefaultsMap() {
  const defaults = {};
  try {
    if (fs.existsSync(IMAGE_DEFAULTS_TS_PATH)) {
      const content = fs.readFileSync(IMAGE_DEFAULTS_TS_PATH, "utf8");
      const matches = content.matchAll(/([A-Z_]+):\s*['"]([^'"]+)['"]/g);
      for (const m of matches) {
        defaults[m[1]] = m[2];
      }
    }
  } catch {
  }
  return defaults;
}
function getAllEditableImages(db) {
  const items = [];
  const canonical = getCanonicalDefaultsMap();
  items.push({
    id: "setting-home-hero",
    name: "Storefront Hero Main Image",
    section: "Hero & Banners",
    type: "setting",
    targetId: "homeHeroImage",
    currentUrl: db.settings?.homeHeroImage || canonical.HERO_MAIN || "/uploads/bridal_couch_hero_1788951504284.jpg",
    codeFile: "src/constants/imageDefaults.ts & data/db.json",
    description: "Primary visual in the Shop Hero header section (bride in satin robe on cream sofa).",
    recommendedAspect: "2:3 or 3:4 portrait"
  });
  items.push({
    id: "canonical-hero-bg",
    name: "Storefront Hero Background Fabric",
    section: "Hero & Banners",
    type: "canonical",
    targetId: "HERO_BACKGROUND",
    currentUrl: canonical.HERO_BACKGROUND || "/uploads/hero_bridal_bg_1788959544066.jpg",
    codeFile: "src/constants/imageDefaults.ts",
    description: "Textured ivory and gold drape backdrop behind the hero headline.",
    recommendedAspect: "16:9 widescreen landscape"
  });
  items.push({
    id: "canonical-hero-portrait",
    name: "Storefront Hero Bride Cutout Portrait",
    section: "Hero & Banners",
    type: "canonical",
    targetId: "HERO_PORTRAIT",
    currentUrl: canonical.HERO_PORTRAIT || "/uploads/bridal_hero_cutout_1788871988678.jpg",
    codeFile: "src/constants/imageDefaults.ts",
    description: "Couture bride silhouette overlay cutout featured in hero editorial composition.",
    recommendedAspect: "3:4 or 4:5 portrait"
  });
  items.push({
    id: "setting-brand-logo",
    name: "Brand Emblem & Crest (Favicon & Touch Icon)",
    section: "Brand Identity",
    type: "setting",
    targetId: "brandLogoImage",
    currentUrl: db.settings?.brandLogoImage || canonical.LOGO_EMBLEM || "/uploads/lariel_brand_logo_1788970256407.jpg",
    codeFile: "src/constants/imageDefaults.ts & data/db.json",
    description: "Emblem used in header navigation, favicon, touch icon, and luxury packaging stamps.",
    recommendedAspect: "1:1 square"
  });
  items.push({
    id: "canonical-logo-wordmark",
    name: "Brand Wordmark Luxury Header",
    section: "Brand Identity",
    type: "canonical",
    targetId: "LOGO_WORDMARK",
    currentUrl: canonical.LOGO_WORDMARK || "/uploads/lariel_wordmark_logo_1788970271070.jpg",
    codeFile: "src/constants/imageDefaults.ts",
    description: "Full typographic wordmark displayed in header and luxury certification cards.",
    recommendedAspect: "4:1 wide banner"
  });
  items.push({
    id: "setting-founder-portrait",
    name: "Founder Portrait (Laide Adeleke)",
    section: "Brand Identity",
    type: "setting",
    targetId: "laidePortraitImage",
    currentUrl: db.settings?.laidePortraitImage || canonical.FOUNDER_PORTRAIT || "/uploads/laide_founder_portrait_1789650582034.jpg",
    codeFile: "src/constants/imageDefaults.ts & data/db.json",
    description: "Featured in Founder Story Section on Home and The Lariel World view.",
    recommendedAspect: "4:5 portrait"
  });
  items.push({
    id: "feature-monogram-detail",
    name: "Bespoke Embroidery Couture Close-up",
    section: "Bespoke Embroidery",
    type: "canonical",
    targetId: "MONOGRAM_DETAIL",
    currentUrl: canonical.MONOGRAM_DETAIL || "/uploads/regenerated_image_1791793258450.jpg",
    codeFile: "src/components/PersonalisedRobesFeature.tsx & imageDefaults.ts",
    description: "Gold-embroidered heirloom monogram close-up photography in Section 08.",
    recommendedAspect: "4:5 portrait"
  });
  items.push({
    id: "canonical-bespoke-swatch",
    name: "Bespoke Couture Silk Swatch",
    section: "Bespoke Embroidery",
    type: "canonical",
    targetId: "BESPOKE_SWATCH",
    currentUrl: canonical.BESPOKE_SWATCH || "/uploads/regenerated_image_1788962692419.jpg",
    codeFile: "src/constants/imageDefaults.ts",
    description: "Lustrous Mulberry silk texture swatch in Custom Design and Monogram suite.",
    recommendedAspect: "1:1 square"
  });
  items.push({
    id: "canonical-fallback",
    name: "Universal Global Fallback Image",
    section: "Bespoke Embroidery",
    type: "canonical",
    targetId: "FALLBACK",
    currentUrl: canonical.FALLBACK || "/uploads/bridal_couch_hero_1788951504284.jpg",
    codeFile: "src/constants/imageDefaults.ts",
    description: "Safety fallback photograph if any remote CDN image ever fails to load.",
    recommendedAspect: "3:4 portrait"
  });
  if (Array.isArray(db.categories)) {
    for (const cat of db.categories) {
      items.push({
        id: `category-${cat.id}`,
        name: `${cat.name} Hero Banner`,
        section: "Categories",
        type: "category",
        targetId: cat.id,
        currentUrl: cat.heroImage || canonical[`CATEGORY_${cat.id.toUpperCase()}`] || "/uploads/bridal_couch_hero_1788951504284.jpg",
        codeFile: "src/constants/imageDefaults.ts & data/db.json",
        description: `Header hero photograph shown at the top of the ${cat.name} collection page.`,
        recommendedAspect: "16:9 or 21:9 banner"
      });
    }
  }
  if (Array.isArray(db.products)) {
    for (const p of db.products) {
      ensureProductGallery(p);
      const primary = p.images?.[0] || "/uploads/bridal_couch_hero_1788951504284.jpg";
      const secondary = p.images?.[1] || primary;
      items.push({
        id: `${p.id}__primary`,
        name: `${p.name} (Primary Photo)`,
        section: "Products",
        type: "product",
        targetId: p.id,
        imageId: `${p.id}__primary`,
        imageRole: "primary",
        imageIndex: 0,
        currentUrl: primary,
        secondaryUrl: secondary,
        codeFile: "src/data/products.ts & data/db.json",
        description: `Default card and detail image for ${p.name} (${p.category} collection).`,
        recommendedAspect: "3:4 editorial portrait"
      });
      if (p.images && p.images.length > 1) {
        items.push({
          id: `${p.id}__hover`,
          name: `${p.name} (Hover / Secondary Photo)`,
          section: "Products",
          type: "product",
          targetId: p.id,
          imageId: `${p.id}__hover`,
          imageRole: "hover",
          imageIndex: 1,
          currentUrl: secondary,
          codeFile: "src/data/products.ts & data/db.json",
          description: `Second photo shown when hovering over ${p.name} card in catalog.`,
          recommendedAspect: "3:4 editorial portrait"
        });
      }
      if (p.images && p.images.length > 2) {
        for (let i = 2; i < p.images.length; i++) {
          items.push({
            id: `${p.id}__gallery_${i}`,
            name: `${p.name} (Gallery Photo #${i + 1})`,
            section: "Products",
            type: "product",
            targetId: p.id,
            imageId: `${p.id}__gallery_${i}`,
            imageRole: "gallery",
            imageIndex: i,
            currentUrl: p.images[i],
            codeFile: "src/data/products.ts & data/db.json",
            description: `Additional gallery detail photograph #${i + 1} for ${p.name}.`,
            recommendedAspect: "3:4 editorial portrait"
          });
        }
      }
    }
  }
  if (Array.isArray(db.realBrides)) {
    for (const b of db.realBrides) {
      items.push({
        id: `bride-${b.id}`,
        name: `Real Bride: ${b.brideName}`,
        section: "Real Brides",
        type: "real-bride",
        targetId: b.id,
        currentUrl: b.image || "/uploads/regenerated_image_1788954098680.jpg",
        codeFile: "src/data/realBrides.ts & data/db.json",
        description: `${b.robeWorn} in ${b.location} (${b.category}).`,
        recommendedAspect: "4:5 or 3:4 portrait"
      });
    }
  }
  try {
    if (fs.existsSync(JOURNAL_TS_PATH)) {
      const journalContent = fs.readFileSync(JOURNAL_TS_PATH, "utf8");
      const articleMatches = [...journalContent.matchAll(/id:\s*['"]([^'"]+)['"][\s\S]*?title:\s*['"]([^'"]+)['"][\s\S]*?image:\s*['"]([^'"]+)['"]/g)];
      for (const m of articleMatches) {
        const aId = m[1];
        const aTitle = m[2];
        const aImg = m[3];
        items.push({
          id: `journal-${aId}`,
          name: `Journal: ${aTitle}`,
          section: "Journal",
          type: "journal",
          targetId: aId,
          currentUrl: aImg,
          codeFile: "src/data/journal.ts",
          description: `Editorial article cover photography for "${aTitle}".`,
          recommendedAspect: "16:9 or 4:3 banner"
        });
      }
    }
  } catch {
  }
  return items;
}
async function updateImageDirectlyInCode(db, params) {
  const { type, targetId, imageId, imageRole, imageIndex, newUrl, persist = true } = params;
  if (!newUrl || typeof newUrl !== "string") {
    throw new Error("Valid new image URL is required.");
  }
  const cleanUrl = newUrl.trim();
  let updatedItem = null;
  if (type === "product") {
    if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
      throw new Error("Target product ID is required.");
    }
    const prod = resolveProduct(db.products, targetId);
    if (!prod) throw new Error(`Product not found with ID or slug "${targetId}"`);
    ensureProductGallery(prod);
    let targetPos = -1;
    if (imageId && typeof imageId === "string" && imageId.trim()) {
      const cleanImgId = imageId.trim();
      if (cleanImgId.includes("__")) {
        const [prefix] = cleanImgId.split("__");
        if (prefix && prefix !== prod.id) {
          throw new Error(
            `Image identifier "${cleanImgId}" belongs to product "${prefix}", not target product "${prod.id}". Update rejected to prevent image crossover.`
          );
        }
      }
      if (cleanImgId === `${prod.id}__primary` || cleanImgId === "primary" || cleanImgId === `${prod.id}_primary`) {
        if (imageRole && imageRole !== "primary") {
          throw new Error(
            `Image role "${imageRole}" conflicts with primary image identifier "${cleanImgId}". Update rejected.`
          );
        }
        targetPos = 0;
      } else if (cleanImgId === `${prod.id}__hover` || cleanImgId === "hover" || cleanImgId === `${prod.id}_hover`) {
        if (imageRole && imageRole !== "hover") {
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
          if (imageRole && imageRole !== "gallery") {
            throw new Error(
              `Image role "${imageRole}" conflicts with gallery image identifier "${cleanImgId}". Update rejected.`
            );
          }
          targetPos = idx;
        } else {
          const found = prod.imageGallery?.findIndex((img) => img.id === cleanImgId);
          if (found !== void 0 && found >= 0) {
            targetPos = found;
          } else {
            throw new Error(
              `Invalid or stale image identifier "${cleanImgId}" for product "${prod.id}". No matching image slot found. Update rejected.`
            );
          }
        }
      }
    } else {
      if (imageRole === "primary") {
        targetPos = 0;
      } else if (imageRole === "hover") {
        targetPos = 1;
      } else if (imageRole === "gallery") {
        if (imageIndex !== void 0 && !isNaN(Number(imageIndex)) && Number(imageIndex) >= 0) {
          const idx = Math.floor(Number(imageIndex));
          if (idx > (prod.images || []).length) {
            targetPos = (prod.images || []).length;
          } else {
            targetPos = idx;
          }
        } else {
          targetPos = (prod.images || []).length;
        }
      } else if (imageIndex !== void 0 && !isNaN(Number(imageIndex)) && Number(imageIndex) >= 0) {
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
    prod.images = prod.images.filter((img) => typeof img === "string" && img.trim() !== "");
    if (targetPos < prod.images.length) {
      prod.images[targetPos] = cleanUrl;
    } else {
      if (prod.images[prod.images.length - 1] !== cleanUrl) {
        prod.images.push(cleanUrl);
      }
      targetPos = prod.images.length - 1;
    }
    if (prod.images[targetPos] !== cleanUrl) {
      throw new Error(
        `Slot assignment verification failed: slot ${targetPos} did not store "${cleanUrl}" on product "${prod.id}".`
      );
    }
    ensureProductGallery(prod);
    prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    updatedItem = prod;
  } else if (type === "category") {
    const cat = db.categories.find((c) => c.id === targetId || c.slug && c.slug === targetId);
    if (!cat) throw new Error(`Category not found with ID ${targetId}`);
    cat.heroImage = cleanUrl;
    updatedItem = cat;
  } else if (type === "setting") {
    if (!db.settings) db.settings = {};
    db.settings[targetId] = cleanUrl;
    if (!db.settings.canonicalOverrides) db.settings.canonicalOverrides = {};
    if (targetId === "homeHeroImage" || targetId === "heroImage") {
      db.settings.homeHeroImage = cleanUrl;
      db.settings.heroImage = cleanUrl;
      db.settings.canonicalOverrides.HERO_MAIN = cleanUrl;
    }
    if (targetId === "laidePortraitImage") {
      db.settings.canonicalOverrides.FOUNDER_PORTRAIT = cleanUrl;
    }
    if (targetId === "adminAvatarImage" || targetId === "adminAvatar") {
      db.settings.adminAvatarImage = cleanUrl;
      db.settings.canonicalOverrides.ADMIN_AVATAR = cleanUrl;
    }
    if (targetId === "brandLogoImage") {
      db.settings.canonicalOverrides.LOGO_EMBLEM = cleanUrl;
    }
    if (targetId === "brandWordmarkImage" || targetId === "wordmark") {
      db.settings.brandWordmarkImage = cleanUrl;
      db.settings.canonicalOverrides.LOGO_WORDMARK = cleanUrl;
    }
    db.siteSettings = { ...db.settings };
    syncImageDefaultsCode(db.settings, db.categories, db.settings.canonicalOverrides);
    updatedItem = db.settings;
  } else if (type === "real-bride") {
    if (!db.realBrides) db.realBrides = [];
    const bride = db.realBrides.find((b) => b.id === targetId);
    if (bride) {
      bride.image = cleanUrl;
      updatedItem = bride;
    } else {
      throw new Error(`Real bride story not found with ID ${targetId}`);
    }
  } else if (type === "canonical") {
    if (!db.settings) db.settings = {};
    if (!db.settings.canonicalOverrides) db.settings.canonicalOverrides = {};
    db.settings.canonicalOverrides[targetId] = cleanUrl;
    if (targetId === "HERO_MAIN") {
      db.settings.homeHeroImage = cleanUrl;
      db.settings.heroImage = cleanUrl;
    }
    if (targetId === "FOUNDER_PORTRAIT") {
      db.settings.laidePortraitImage = cleanUrl;
    }
    if (targetId === "ADMIN_AVATAR") {
      db.settings.adminAvatarImage = cleanUrl;
    }
    if (targetId === "LOGO_EMBLEM") {
      db.settings.brandLogoImage = cleanUrl;
    }
    if (targetId === "LOGO_WORDMARK") {
      db.settings.brandWordmarkImage = cleanUrl;
    }
    db.siteSettings = { ...db.settings };
    syncImageDefaultsCode(db.settings, db.categories, db.settings.canonicalOverrides);
    updatedItem = { key: targetId, url: cleanUrl };
  } else if (type === "journal") {
    syncJournalCode(targetId, cleanUrl);
    updatedItem = { id: targetId, image: cleanUrl };
  }
  let syncResult;
  if (persist) {
    syncResult = syncAllCode(db);
    if (type === "journal" && !syncResult.filesUpdated.includes("src/data/journal.ts")) {
      syncResult.filesUpdated.push("src/data/journal.ts");
    }
  } else {
    syncResult = {
      filesUpdated: [],
      files: getUpdatedCodeFiles(db),
      timestamp: Date.now()
    };
  }
  if (type === "product") {
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
    timestamp: syncResult.timestamp
  };
}
var PRODUCTS_TS_PATH, CATEGORIES_TS_PATH, SETTINGS_TS_PATH, IMAGE_DEFAULTS_TS_PATH, REAL_BRIDES_TS_PATH, JOURNAL_TS_PATH, DB_JSON_PATH;
var init_codeSync = __esm({
  "server/codeSync.ts"() {
    PRODUCTS_TS_PATH = path.join(process.cwd(), "src", "data", "products.ts");
    CATEGORIES_TS_PATH = path.join(process.cwd(), "src", "data", "categories.ts");
    SETTINGS_TS_PATH = path.join(process.cwd(), "src", "data", "siteSettings.ts");
    IMAGE_DEFAULTS_TS_PATH = path.join(process.cwd(), "src", "constants", "imageDefaults.ts");
    REAL_BRIDES_TS_PATH = path.join(process.cwd(), "src", "data", "realBrides.ts");
    JOURNAL_TS_PATH = path.join(process.cwd(), "src", "data", "journal.ts");
    DB_JSON_PATH = path.join(process.cwd(), "data", "db.json");
  }
});

// server/github.ts
var github_exports = {};
__export(github_exports, {
  commitFileToGitHub: () => commitFileToGitHub,
  commitMultipleFilesToGitHub: () => commitMultipleFilesToGitHub,
  commitTreeToGitHub: () => commitTreeToGitHub,
  deleteFileFromGitHub: () => deleteFileFromGitHub,
  generateSafeUniqueFilename: () => generateSafeUniqueFilename,
  getGitHubConfig: () => getGitHubConfig,
  getGitHubDiagnostics: () => getGitHubDiagnostics,
  getGitHubFileSha: () => getGitHubFileSha
});
import path2 from "path";
import crypto from "crypto";
function getGitHubConfig() {
  const token = (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "").trim();
  let owner = (process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER || "").trim();
  let repo = (process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY_NAME || "").trim();
  if (process.env.GITHUB_REPOSITORY && (!owner || !repo)) {
    const parts = process.env.GITHUB_REPOSITORY.split("/");
    if (parts.length === 2) {
      if (!owner) owner = parts[0].trim();
      if (!repo) repo = parts[1].trim();
    }
  }
  const branch = (process.env.GITHUB_BRANCH || process.env.GITHUB_DEFAULT_BRANCH || "main").trim();
  const committerName = (process.env.GITHUB_COMMITTER_NAME || "Lariel Essentials Admin").trim();
  const committerEmail = (process.env.GITHUB_COMMITTER_EMAIL || "admin@larielextravaganza.com").trim();
  const isConfigured = Boolean(token && owner && repo);
  return {
    token,
    owner,
    repo,
    branch,
    committerName,
    committerEmail,
    isConfigured
  };
}
function generateSafeUniqueFilename(originalFilename, fallbackExt = "jpg") {
  const rawExt = path2.extname(originalFilename).replace(".", "").toLowerCase() || fallbackExt;
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const baseName = path2.basename(originalFilename, path2.extname(originalFilename));
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 35) || "image";
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${cleanBase}_${timestamp}_${randomSuffix}.${ext}`;
}
async function getGitHubFileSha(filePath, config) {
  const cleanPath = filePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}?ref=${encodeURIComponent(config.branch)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Lariel-Essentials-App/1.0"
      }
    });
    if (res.status === 200) {
      const data = await res.json();
      return data && typeof data.sha === "string" ? data.sha : null;
    }
    return null;
  } catch {
    return null;
  }
}
async function commitFileToGitHub(options) {
  const config = options.config || getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      path: options.repoPath,
      error: "GitHub storage is not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO."
    };
  }
  const cleanPath = options.repoPath.replace(/^\/+/, "");
  const base64Content = options.buffer.toString("base64");
  const commitMessage = options.message || `feat(media): commit ${path2.basename(cleanPath)} to repository [skip ci]`;
  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;
  let lastError = "";
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const currentSha = await getGitHubFileSha(cleanPath, config);
      const payload = {
        message: commitMessage,
        content: base64Content,
        branch: config.branch,
        committer: {
          name: config.committerName,
          email: config.committerEmail
        }
      };
      if (currentSha) {
        payload.sha = currentSha;
      }
      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${config.token}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "Lariel-Essentials-App/1.0"
        },
        body: JSON.stringify(payload)
      });
      const responseText = await res.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch {
      }
      if (res.status === 409 && attempt <= maxRetries) {
        console.warn(`GitHub commit conflict (409) for ${cleanPath}. Retrying attempt ${attempt}/${maxRetries}...`);
        const delayMs = Math.min(1e3 * Math.pow(2, attempt - 1) + Math.random() * 500, 5e3);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      if (!res.ok) {
        const errorMsg = data?.message || `GitHub API error (HTTP ${res.status}): ${responseText.slice(0, 200)}`;
        lastError = errorMsg;
        if (attempt <= maxRetries && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 1e3 * attempt));
          continue;
        }
        return {
          success: false,
          path: cleanPath,
          error: errorMsg,
          retries: attempt - 1
        };
      }
      const contentSha = data?.content?.sha;
      const commitSha = data?.commit?.sha;
      if (!contentSha && !commitSha) {
        return {
          success: false,
          path: cleanPath,
          error: "GitHub accepted request but did not return confirmation SHA.",
          retries: attempt - 1
        };
      }
      return {
        success: true,
        sha: contentSha,
        commitSha,
        htmlUrl: data?.content?.html_url,
        downloadUrl: data?.content?.download_url,
        path: cleanPath,
        retries: attempt - 1
      };
    } catch (err) {
      lastError = err?.message || String(err);
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1e3 * attempt));
        continue;
      }
    }
  }
}
async function deleteFileFromGitHub(options) {
  const config = options.config || getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "GitHub storage is not configured."
    };
  }
  const cleanPath = options.repoPath.replace(/^\/+/, "");
  try {
    const sha = await getGitHubFileSha(cleanPath, config);
    if (!sha) {
      return { success: true };
    }
    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${cleanPath}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Lariel-Essentials-App/1.0"
      },
      body: JSON.stringify({
        message: options.message || `chore(media): delete ${path2.basename(cleanPath)} [skip ci]`,
        sha,
        branch: config.branch,
        committer: {
          name: config.committerName,
          email: config.committerEmail
        }
      })
    });
    if (res.ok || res.status === 404) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `GitHub delete failed (HTTP ${res.status}): ${errText.slice(0, 150)}` };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}
async function commitTreeToGitHub(options) {
  const config = options.config || getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      filesCommitted: [],
      error: "GitHub is not configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO)."
    };
  }
  const validFiles = options.files.filter((f) => f.buffer || f.content !== void 0);
  if (validFiles.length === 0) {
    return { success: true, filesCommitted: [] };
  }
  const headers = {
    "Authorization": `Bearer ${config.token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "Lariel-Essentials-App/1.0"
  };
  const maxRetries = 3;
  let attempt = 0;
  let lastError = "";
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const refUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/ref/heads/${encodeURIComponent(config.branch)}`;
      const refRes = await fetch(refUrl, { headers });
      if (!refRes.ok) {
        throw new Error(`Failed to get branch ref ${config.branch} (HTTP ${refRes.status})`);
      }
      const refData = await refRes.json();
      const latestCommitSha = refData?.object?.sha;
      if (!latestCommitSha) {
        throw new Error(`Branch ref missing commit sha for ${config.branch}`);
      }
      const commitUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits/${latestCommitSha}`;
      const commitRes = await fetch(commitUrl, { headers });
      if (!commitRes.ok) {
        throw new Error(`Failed to get commit ${latestCommitSha} (HTTP ${commitRes.status})`);
      }
      const commitData = await commitRes.json();
      const baseTreeSha = commitData?.tree?.sha;
      const treeEntries = [];
      for (const file of validFiles) {
        const base64 = file.buffer ? file.buffer.toString("base64") : Buffer.from(file.content || "", "utf8").toString("base64");
        const blobUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs`;
        const blobRes = await fetch(blobUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: base64,
            encoding: "base64"
          })
        });
        if (!blobRes.ok) {
          const blobErr = await blobRes.text();
          throw new Error(`Failed to create blob for ${file.path}: HTTP ${blobRes.status} ${blobErr.slice(0, 100)}`);
        }
        const blobData = await blobRes.json();
        treeEntries.push({
          path: file.path.replace(/^\/+/, ""),
          mode: "100644",
          type: "blob",
          sha: blobData.sha
        });
      }
      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/trees`;
      const treeRes = await fetch(treeUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries
        })
      });
      if (!treeRes.ok) {
        const treeErr = await treeRes.text();
        throw new Error(`Failed to create tree: HTTP ${treeRes.status} ${treeErr.slice(0, 100)}`);
      }
      const treeData = await treeRes.json();
      const newTreeSha = treeData.sha;
      const newCommitUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits`;
      const newCommitRes = await fetch(newCommitUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: options.message,
          tree: newTreeSha,
          parents: [latestCommitSha],
          author: {
            name: config.committerName,
            email: config.committerEmail,
            date: (/* @__PURE__ */ new Date()).toISOString()
          },
          committer: {
            name: config.committerName,
            email: config.committerEmail,
            date: (/* @__PURE__ */ new Date()).toISOString()
          }
        })
      });
      if (!newCommitRes.ok) {
        const commitErr = await newCommitRes.text();
        throw new Error(`Failed to create commit: HTTP ${newCommitRes.status} ${commitErr.slice(0, 100)}`);
      }
      const newCommitData = await newCommitRes.json();
      const newCommitSha = newCommitData.sha;
      const updateRefRes = await fetch(refUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false
        })
      });
      if (!updateRefRes.ok) {
        if (updateRefRes.status === 409 && attempt <= maxRetries) {
          console.warn(`Branch moved during tree commit (409). Retrying attempt ${attempt}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, 1e3 * attempt));
          continue;
        }
        const updateErr = await updateRefRes.text();
        throw new Error(`Failed to update branch ref: HTTP ${updateRefRes.status} ${updateErr.slice(0, 100)}`);
      }
      return {
        success: true,
        commitSha: newCommitSha,
        htmlUrl: newCommitData.html_url || `https://github.com/${config.owner}/${config.repo}/commit/${newCommitSha}`,
        filesCommitted: validFiles.map((f) => f.path)
      };
    } catch (err) {
      lastError = err?.message || String(err);
      if (attempt <= maxRetries && lastError.includes("409")) {
        await new Promise((r) => setTimeout(r, 1e3 * attempt));
        continue;
      }
      break;
    }
  }
  return {
    success: false,
    filesCommitted: [],
    error: lastError || "Tree commit failed after retries"
  };
}
async function commitMultipleFilesToGitHub(files, commitMessagePrefix = "feat(sync): update catalog and media") {
  const config = getGitHubConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      committed: [],
      failed: files.map((f) => f.path),
      errors: ["GitHub is not configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO)."]
    };
  }
  try {
    const treeRes = await commitTreeToGitHub({
      files,
      message: `${commitMessagePrefix} (${files.length} files) [skip ci]`,
      config
    });
    if (treeRes.success && treeRes.commitSha) {
      return {
        success: true,
        committed: treeRes.filesCommitted,
        failed: [],
        errors: [],
        commitSha: treeRes.commitSha,
        htmlUrl: treeRes.htmlUrl
      };
    }
  } catch (treeErr) {
    console.warn("Atomic tree commit failed, falling back to sequential contents API:", treeErr);
  }
  const committed = [];
  const failed = [];
  const errors = [];
  for (const file of files) {
    const buf = file.buffer || (file.content ? Buffer.from(file.content, "utf8") : null);
    if (!buf) {
      failed.push(file.path);
      errors.push(`No content provided for ${file.path}`);
      continue;
    }
    const res = await commitFileToGitHub({
      repoPath: file.path,
      buffer: buf,
      message: `${commitMessagePrefix}: ${path2.basename(file.path)} [skip ci]`,
      config
    });
    if (res.success) {
      committed.push(file.path);
    } else {
      failed.push(file.path);
      if (res.error) errors.push(`${file.path}: ${res.error}`);
    }
  }
  return {
    success: failed.length === 0,
    committed,
    failed,
    errors
  };
}
async function getGitHubDiagnostics() {
  const config = getGitHubConfig();
  const tokenPrefix = config.token ? `${config.token.slice(0, 4)}...${config.token.slice(-4)}` : null;
  const result = {
    isConfigured: config.isConfigured,
    owner: config.owner || null,
    repo: config.repo || null,
    branch: config.branch,
    hasToken: Boolean(config.token),
    tokenPrefix,
    committerName: config.committerName,
    committerEmail: config.committerEmail,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!config.isConfigured) {
    result.error = "GitHub integration is not fully configured (missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO).";
    return result;
  }
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Lariel-Essentials-App/1.0"
      }
    });
    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (limit && remaining) {
      result.rateLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        reset: reset ? Number(reset) : void 0
      };
    }
    if (res.status === 200) {
      const data = await res.json();
      result.apiConnected = true;
      result.repoPermissions = data?.permissions || {};
    } else if (res.status === 401) {
      result.apiConnected = false;
      result.error = "Invalid GitHub Personal Access Token (HTTP 401 Unauthorized).";
    } else if (res.status === 404) {
      result.apiConnected = false;
      result.error = `Repository ${config.owner}/${config.repo} not found (HTTP 404) or token lacks repo read permissions.`;
    } else {
      result.apiConnected = false;
      result.error = `GitHub API returned HTTP ${res.status}`;
    }
  } catch (err) {
    result.apiConnected = false;
    result.error = `Could not reach GitHub API: ${err?.message || err}`;
  }
  return result;
}
var init_github = __esm({
  "server/github.ts"() {
  }
});

// server/vercel.ts
import express2 from "express";

// server/api.ts
import express from "express";
import path7 from "path";

// server/db.ts
init_codeSync();
import fs2 from "fs";
import path3 from "path";
var bundledDbData = null;
try {
  const candidatePaths = [
    path3.join(process.cwd(), "data", "db.json"),
    path3.join("/tmp", "db.json")
  ];
  for (const p of candidatePaths) {
    if (fs2.existsSync(p)) {
      bundledDbData = JSON.parse(fs2.readFileSync(p, "utf8"));
      break;
    }
  }
} catch (err) {
}
var dbMutationQueue = Promise.resolve();
function withDatabaseMutation(operation) {
  const run = async () => {
    return await operation();
  };
  const result = dbMutationQueue.then(run, run);
  dbMutationQueue = result.then(() => {
  }, () => {
  });
  return result;
}
var DB_PATH = path3.join(process.cwd(), "data", "db.json");
var TMP_DB_PATH = path3.join("/tmp", "db.json");
var memoryDatabase = null;
var isSyncingFromBlob = false;
var lastRemoteSyncTime = 0;
var lastDiskMtime = 0;
var REMOTE_SYNC_TTL_MS = 3e3;
async function syncDatabaseFromRemote(force = false) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memoryDatabase;
  const now = Date.now();
  if (!force && isSyncingFromBlob) return memoryDatabase;
  if (!force && memoryDatabase && now - lastRemoteSyncTime < REMOTE_SYNC_TTL_MS) {
    return memoryDatabase;
  }
  try {
    isSyncingFromBlob = true;
    const { list: list2 } = await import("@vercel/blob");
    const res = await list2({
      prefix: "database/db.json",
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    const blobItem = res.blobs.find((b) => b.pathname === "database/db.json");
    if (blobItem && blobItem.url) {
      const response = await fetch(`${blobItem.url}?_t=${now}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
      });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && Array.isArray(remoteData.products) && remoteData.products.length > 0) {
          const localDb = getDatabase();
          const currentVersion = Math.max(Number(memoryDatabase?.version) || 0, Number(localDb?.version) || 0);
          const remoteVersion = Number(remoteData.version) || 0;
          if (remoteVersion <= currentVersion && currentVersion > 0) {
            console.warn(`[db-sync] Remote Vercel Blob database is not newer (remote v${remoteVersion} <= local v${currentVersion}). Ignoring remote snapshot.`);
            lastRemoteSyncTime = Date.now();
            return memoryDatabase || localDb;
          }
          memoryDatabase = remoteData;
          lastRemoteSyncTime = Date.now();
          try {
            syncAllCode(remoteData);
            fs2.writeFileSync(DB_PATH, JSON.stringify(remoteData, null, 2), "utf8");
            lastDiskMtime = fs2.statSync(DB_PATH).mtimeMs;
          } catch {
          }
          try {
            fs2.writeFileSync(TMP_DB_PATH, JSON.stringify(remoteData, null, 2), "utf8");
          } catch {
          }
          return memoryDatabase;
        }
      }
    }
  } catch (err) {
    console.warn("Could not sync remote database from Vercel Blob:", err);
  } finally {
    isSyncingFromBlob = false;
  }
  return memoryDatabase;
}
async function getDatabaseAsync(force = false) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const now = Date.now();
    if (force || !memoryDatabase || now - lastRemoteSyncTime >= REMOTE_SYNC_TTL_MS) {
      await syncDatabaseFromRemote(force);
    }
  }
  return getDatabase();
}
function getDatabase() {
  try {
    if (fs2.existsSync(DB_PATH)) {
      const stat = fs2.statSync(DB_PATH);
      if (!memoryDatabase || stat.mtimeMs > lastDiskMtime) {
        const data = fs2.readFileSync(DB_PATH, "utf8");
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          const diskVersion = Number(parsed.version) || 0;
          const memVersion = Number(memoryDatabase?.version) || 0;
          if (!memoryDatabase || diskVersion >= memVersion) {
            memoryDatabase = parsed;
            lastDiskMtime = stat.mtimeMs;
            if (memoryDatabase.settings && !memoryDatabase.siteSettings) {
              memoryDatabase.siteSettings = memoryDatabase.settings;
            } else if (memoryDatabase.siteSettings && !memoryDatabase.settings) {
              memoryDatabase.settings = memoryDatabase.siteSettings;
            }
            try {
              fs2.writeFileSync(TMP_DB_PATH, JSON.stringify(memoryDatabase, null, 2), "utf8");
            } catch {
            }
            return memoryDatabase;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading bundled database:", err);
  }
  if (memoryDatabase) {
    return memoryDatabase;
  }
  try {
    if (fs2.existsSync(TMP_DB_PATH)) {
      const data = fs2.readFileSync(TMP_DB_PATH, "utf8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        memoryDatabase = parsed;
        return memoryDatabase;
      }
    }
  } catch {
  }
  if (!fs2.existsSync(DB_PATH) && !fs2.existsSync(TMP_DB_PATH)) {
    if (bundledDbData && Array.isArray(bundledDbData.products) && bundledDbData.products.length > 0) {
      memoryDatabase = JSON.parse(JSON.stringify(bundledDbData));
      return memoryDatabase;
    }
  }
  return {
    products: [],
    categories: [],
    orders: [],
    admins: [],
    activityLogs: []
  };
}
async function saveDatabase(data) {
  data.version = Math.max(Number(data.version) || 0, Number(memoryDatabase?.version) || 0) + 1;
  if (data.settings && !data.siteSettings) {
    data.siteSettings = { ...data.settings };
  } else if (data.siteSettings && !data.settings) {
    data.settings = { ...data.siteSettings };
  } else if (data.settings && data.siteSettings) {
    const unified = { ...data.siteSettings, ...data.settings };
    data.settings = unified;
    data.siteSettings = unified;
  }
  memoryDatabase = data;
  bundledDbData = JSON.parse(JSON.stringify(data));
  lastRemoteSyncTime = Date.now();
  try {
    syncAllCode(data);
  } catch (syncErr) {
    console.warn("Could not sync to source code files:", syncErr);
  }
  const jsonStr = JSON.stringify(data, null, 2);
  try {
    const dir = path3.dirname(DB_PATH);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = path3.join(dir, `.db.json.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);
    fs2.writeFileSync(tmpFile, jsonStr, "utf8");
    fs2.renameSync(tmpFile, DB_PATH);
    try {
      lastDiskMtime = fs2.statSync(DB_PATH).mtimeMs;
    } catch {
    }
  } catch (err) {
    try {
      fs2.writeFileSync(DB_PATH, jsonStr, "utf8");
      try {
        lastDiskMtime = fs2.statSync(DB_PATH).mtimeMs;
      } catch {
      }
    } catch {
    }
  }
  try {
    fs2.writeFileSync(TMP_DB_PATH, jsonStr, "utf8");
  } catch (tmpErr) {
    console.warn("Could not write to /tmp/db.json:", tmpErr);
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put: put2 } = await import("@vercel/blob");
      await put2("database/db.json", JSON.stringify(data, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } catch (blobErr) {
      console.error("Failed to write database to Vercel Blob (database/db.json):", blobErr);
      throw new Error(`Failed to write database to Vercel Blob: ${blobErr?.message || blobErr}`);
    }
  }
  try {
    const { getGitHubConfig: getGitHubConfig2, commitMultipleFilesToGitHub: commitMultipleFilesToGitHub2 } = await Promise.resolve().then(() => (init_github(), github_exports));
    const ghConfig = getGitHubConfig2();
    if (ghConfig.isConfigured) {
      const { getUpdatedCodeFiles: getUpdatedCodeFiles2 } = await Promise.resolve().then(() => (init_codeSync(), codeSync_exports));
      const filesToCommit = getUpdatedCodeFiles2(data);
      if (filesToCommit.length > 0) {
        commitMultipleFilesToGitHub2(
          filesToCommit,
          `chore(catalog): synchronize products and media directly to code files`
        ).catch((ghErr) => {
          console.warn("Background GitHub commit warning:", ghErr);
        });
      }
    }
  } catch {
  }
}
async function updateProductAtomically(productId, updater) {
  return withDatabaseMutation(async () => {
    const db = getDatabase();
    const index = resolveProductIndex(db.products, productId);
    if (index === -1) {
      throw new Error(`Product not found with ID or slug "${productId}"`);
    }
    const existing = db.products[index];
    const updated = await updater(existing);
    updated.id = existing.id;
    ensureProductGallery(updated);
    db.products[index] = updated;
    await saveDatabase(db);
    return updated;
  });
}
async function logActivity(action, adminName = "Admin") {
  const db = getDatabase();
  const newLog = {
    id: `log-${Date.now()}`,
    action,
    adminName,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.activityLogs = [newLog, ...db.activityLogs || []].slice(0, 50);
  await saveDatabase(db);
}

// server/storage.ts
import fs3 from "fs";
import path5 from "path";
import { put, del, list } from "@vercel/blob";

// server/r2.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto2 from "crypto";
import path4 from "path";
function getR2Config() {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "").trim();
  const endpoint = (process.env.R2_ENDPOINT || "").trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").trim();
  const isConfigured = Boolean(
    accessKeyId && secretAccessKey && bucketName && (endpoint || accountId)
  );
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicBaseUrl,
    isConfigured
  };
}
var cachedS3Client = null;
var lastClientEndpoint = "";
function getR2Client() {
  const config = getR2Config();
  if (!config.isConfigured) return null;
  if (!cachedS3Client || lastClientEndpoint !== config.endpoint) {
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    lastClientEndpoint = config.endpoint;
  }
  return cachedS3Client;
}
var PERMITTED_FOLDERS = [
  "products",
  "collections",
  "banners",
  "gallery",
  "editorial"
];
var PERMITTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif"
];
var MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES) || 15 * 1024 * 1024;
function validateImageBuffer(buffer, declaredMime) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file buffer provided." };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit of ${maxMb}MB.`
    };
  }
  const headerText = buffer.slice(0, 1024).toString("utf8").toLowerCase();
  if (headerText.includes("<script") || headerText.includes("<?php") || headerText.includes("<html") || headerText.includes("<!doctype") || headerText.includes("<svg")) {
    return {
      valid: false,
      error: "Unsafe file format detected. HTML, scripts, and SVG files are not permitted for security reasons."
    };
  }
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { valid: true, detectedMime: "image/jpeg", detectedExt: "jpg" };
  }
  if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10) {
    return { valid: true, detectedMime: "image/png", detectedExt: "png" };
  }
  if (buffer.length >= 6 && buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 56 && (buffer[4] === 55 || buffer[4] === 57) && buffer[5] === 97) {
    return { valid: true, detectedMime: "image/gif", detectedExt: "gif" };
  }
  if (buffer.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return { valid: true, detectedMime: "image/webp", detectedExt: "webp" };
  }
  if (buffer.length >= 12) {
    const ftyp = buffer.slice(4, 12).toString("ascii");
    if (ftyp.includes("ftypavif") || ftyp.includes("ftypavis")) {
      return { valid: true, detectedMime: "image/avif", detectedExt: "avif" };
    }
  }
  return {
    valid: false,
    error: "Unsupported image format. Only JPEG, PNG, WebP, AVIF, and GIF formats are allowed."
  };
}
function getPublicUrl(key) {
  const config = getR2Config();
  const cleanKey = key.replace(/^\//, "");
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, "")}/${cleanKey}`;
  }
  if (config.bucketName && config.accountId) {
    return `https://${config.bucketName}.${config.accountId}.r2.dev/${cleanKey}`;
  }
  return `/api/media/file/${cleanKey}`;
}
function generateObjectKey(originalFilename, folder = "products", forcedExt, contentHash) {
  const safeFolder = PERMITTED_FOLDERS.includes(folder.toLowerCase()) ? folder.toLowerCase() : "products";
  const rawExt = forcedExt || path4.extname(originalFilename).replace(".", "").toLowerCase() || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const baseName = path4.basename(originalFilename, path4.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) || "media";
  const suffix = contentHash ? contentHash.slice(0, 10) : `${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
  return `${safeFolder}/${cleanName}_${suffix}.${ext}`;
}
async function uploadToR2(buffer, originalFilename, contentType, folder = "products") {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
    );
  }
  const validation = validateImageBuffer(buffer, contentType);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid image buffer.");
  }
  const mime = validation.detectedMime || contentType || "image/jpeg";
  const ext = validation.detectedExt || "jpg";
  const fileSha256 = crypto2.createHash("sha256").update(buffer).digest("hex");
  const objectKey = generateObjectKey(originalFilename, folder, ext, fileSha256);
  const cleanOriginalName = path4.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: mime,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sha256: fileSha256,
      sourceSha256: fileSha256
    }
  });
  await client.send(command);
  const url = getPublicUrl(objectKey);
  return {
    url,
    key: objectKey,
    fileName: path4.basename(objectKey),
    size: buffer.length,
    contentType: mime,
    sha256: fileSha256
  };
}
async function getPresignedUploadUrl(filename, contentType, folder = "products", expiresInSeconds = 300) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  if (!PERMITTED_MIME_TYPES.includes(contentType)) {
    throw new Error(
      `Unsupported MIME type "${contentType}". Only JPEG, PNG, WebP, AVIF, and GIF are allowed.`
    );
  }
  const objectKey = generateObjectKey(filename, folder);
  const cleanOriginalName = path4.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: contentType,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds
  });
  const publicUrl = getPublicUrl(objectKey);
  return {
    uploadUrl,
    publicUrl,
    key: objectKey,
    expiresIn: expiresInSeconds
  };
}
async function deleteFromR2(keyOrUrl) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured || !keyOrUrl) return false;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    try {
      const u = new URL(keyOrUrl);
      key = u.pathname.replace(/^\//, "");
    } catch {
      key = keyOrUrl;
    }
  }
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key
      })
    );
    return true;
  } catch (err) {
    console.warn(`Could not delete object "${key}" from Cloudflare R2:`, err);
    return false;
  }
}
async function listR2Objects(prefix = "") {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) return [];
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix || void 0,
      MaxKeys: 1e3
    });
    const res = await client.send(command);
    const results = [];
    if (res.Contents) {
      for (const obj of res.Contents) {
        if (!obj.Key) continue;
        results.push({
          url: getPublicUrl(obj.Key),
          fileName: path4.basename(obj.Key),
          size: obj.Size || 0,
          createdAt: obj.LastModified?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
          key: obj.Key
        });
      }
    }
    return results;
  } catch (err) {
    console.error("Failed to list objects from Cloudflare R2:", err);
    return [];
  }
}
async function getR2Object(key) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key
    });
    return await client.send(command);
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

// server/storage.ts
init_github();
function getStorageProvider() {
  if (getGitHubConfig().isConfigured || process.env.STORAGE_PROVIDER === "github") {
    return "github";
  }
  if (getR2Config().isConfigured || process.env.STORAGE_PROVIDER === "cloudflare-r2") {
    return "cloudflare-r2";
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel-blob";
  }
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return "cloudinary";
  }
  return "local";
}
async function uploadPersistentMedia(buffer, originalFilename, contentType, folder = "products") {
  const fileName = generateSafeUniqueFilename(originalFilename);
  const rawExt = path5.extname(fileName).replace(".", "").toLowerCase() || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const mime = contentType || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg");
  const warnings = [];
  const canonicalLocalDir = path5.join(process.cwd(), "public", "uploads");
  const canonicalFilePath = path5.join(canonicalLocalDir, fileName);
  let localSaved = false;
  try {
    if (!fs3.existsSync(canonicalLocalDir)) {
      fs3.mkdirSync(canonicalLocalDir, { recursive: true });
    }
    fs3.writeFileSync(canonicalFilePath, buffer);
    localSaved = true;
  } catch (localWriteErr) {
    warnings.push(`Local filesystem write failed: ${localWriteErr?.message || localWriteErr}`);
  }
  const githubConfig = getGitHubConfig();
  let githubResult = void 0;
  let remoteConfirmed = false;
  if (githubConfig.isConfigured) {
    try {
      const repoPath = `public/uploads/${fileName}`;
      const commitRes = await commitFileToGitHub({
        repoPath,
        buffer,
        message: `feat(media): upload ${fileName} to ${repoPath} [skip ci]`,
        config: githubConfig
      });
      if (commitRes.success) {
        githubResult = {
          committed: true,
          sha: commitRes.sha,
          commitSha: commitRes.commitSha,
          htmlUrl: commitRes.htmlUrl,
          path: repoPath
        };
        remoteConfirmed = true;
        console.log(`Successfully committed image ${fileName} to GitHub repository (${githubConfig.owner}/${githubConfig.repo}@${githubConfig.branch})`);
      } else {
        githubResult = {
          committed: false,
          path: repoPath,
          error: commitRes.error
        };
        warnings.push(`GitHub repository commit failed: ${commitRes.error}`);
        console.warn(`GitHub repository commit failed for ${fileName}:`, commitRes.error);
      }
    } catch (gitErr) {
      const errMsg = gitErr?.message || String(gitErr);
      warnings.push(`GitHub repository commit error: ${errMsg}`);
      console.warn(`GitHub repository commit error for ${fileName}:`, errMsg);
      githubResult = {
        committed: false,
        error: errMsg
      };
    }
  }
  const provider = getStorageProvider();
  let r2Result = null;
  if (getR2Config().isConfigured || provider === "cloudflare-r2") {
    try {
      const res = await uploadToR2(buffer, originalFilename, contentType, folder);
      r2Result = {
        url: res.url,
        fileName: res.fileName,
        size: res.size,
        key: res.key,
        sha256: res.sha256
      };
      remoteConfirmed = true;
    } catch (err) {
      if (process.env.STORAGE_PROVIDER === "cloudflare-r2" || process.env.NODE_ENV === "production" && provider === "cloudflare-r2") {
        throw err;
      }
      warnings.push(`Cloudflare R2 upload warning: ${err?.message || err}`);
      console.warn("Cloudflare R2 upload warning:", err?.message || err);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `${folder}/${fileName}`;
      await put(blobPath, buffer, {
        access: "public",
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      remoteConfirmed = true;
    } catch (err) {
      warnings.push(`Vercel Blob upload warning: ${err?.message || err}`);
      console.warn("Vercel Blob upload warning:", err?.message || err);
    }
  }
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.STORAGE_PROVIDER === "cloudflare-r2";
  let persistenceType = "local_only";
  if (githubResult?.committed) {
    persistenceType = "permanent_github";
  } else if (r2Result) {
    persistenceType = "permanent_r2";
  } else if (process.env.BLOB_READ_WRITE_TOKEN && remoteConfirmed) {
    persistenceType = "permanent_vercel_blob";
  } else if (isProduction) {
    persistenceType = "ephemeral_unpersisted";
    warnings.push(
      "Production server is operating on ephemeral container storage without confirmed remote persistence (GitHub PAT or Cloudflare R2). Upload will be lost upon serverless container termination."
    );
  }
  const codeUrl = `/uploads/${fileName}`;
  return {
    url: r2Result?.url && !r2Result.url.startsWith("/api/") ? r2Result.url : codeUrl,
    fileName,
    size: buffer.length,
    key: r2Result?.key,
    sha256: r2Result?.sha256,
    localSaved,
    localPath: `public/uploads/${fileName}`,
    remoteConfirmed,
    persistenceType,
    warnings: warnings.length > 0 ? warnings : void 0,
    github: githubResult
  };
}
var TOMBSTONES_FILE = path5.join(process.cwd(), "data", "deleted-media-tombstones.json");
function getTombstones() {
  try {
    if (fs3.existsSync(TOMBSTONES_FILE)) {
      const data = JSON.parse(fs3.readFileSync(TOMBSTONES_FILE, "utf8"));
      if (Array.isArray(data)) return new Set(data);
    }
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function addTombstone(fileName) {
  if (!fileName || fileName === "." || fileName === "/") return;
  try {
    const tombstones = getTombstones();
    tombstones.add(fileName);
    const dir = path5.dirname(TOMBSTONES_FILE);
    if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
    fs3.writeFileSync(TOMBSTONES_FILE, JSON.stringify([...tombstones], null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to save tombstone:", err);
  }
}
async function deletePersistentMedia(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== "string") {
    return { success: false, deletedLocations: [] };
  }
  const deletedLocations = [];
  const cleanUrl = urlOrKey.trim();
  const rawPath = cleanUrl.split("?")[0];
  const fileName = path5.basename(rawPath);
  if (fileName && fileName !== "." && fileName !== "/") {
    addTombstone(fileName);
    const localDirs = [
      path5.join(process.cwd(), "public", "uploads"),
      path5.join(process.cwd(), "src", "assets", "images"),
      path5.join(process.cwd(), "dist", "uploads"),
      path5.join(process.cwd(), "public", "images", "products"),
      path5.join("/tmp", "uploads")
    ];
    for (const dir of localDirs) {
      try {
        const fullPath = path5.join(dir, fileName);
        if (fs3.existsSync(fullPath)) {
          fs3.unlinkSync(fullPath);
          deletedLocations.push(fullPath);
        }
      } catch (err) {
        console.warn(`Failed to delete local file in ${dir}:`, err);
      }
    }
    try {
      const brainDir = path5.join(process.cwd(), ".aistudio", "artifacts", "brain");
      if (fs3.existsSync(brainDir)) {
        const brainSubdirs = fs3.readdirSync(brainDir);
        for (const sub of brainSubdirs) {
          const brainSubPath = path5.join(brainDir, sub);
          const tempPath = path5.join(brainSubPath, ".tempmediaStorage", fileName);
          if (fs3.existsSync(tempPath)) {
            try {
              fs3.unlinkSync(tempPath);
              deletedLocations.push(tempPath);
            } catch {
            }
          }
          const directBrainPath = path5.join(brainSubPath, fileName);
          if (fs3.existsSync(directBrainPath)) {
            try {
              fs3.unlinkSync(directBrainPath);
              deletedLocations.push(directBrainPath);
            } catch {
            }
          }
        }
      }
    } catch {
    }
    try {
      const descPath = path5.join(process.cwd(), "data", "image-descriptions.json");
      if (fs3.existsSync(descPath)) {
        const descData = JSON.parse(fs3.readFileSync(descPath, "utf8"));
        if (descData && typeof descData === "object" && descData[fileName]) {
          delete descData[fileName];
          fs3.writeFileSync(descPath, JSON.stringify(descData, null, 2), "utf8");
          deletedLocations.push(`descriptions:${fileName}`);
        }
      }
    } catch {
    }
    try {
      const clientDescPath = path5.join(process.cwd(), "data", "client_bridal_descriptions.json");
      if (fs3.existsSync(clientDescPath)) {
        const clientDescData = JSON.parse(fs3.readFileSync(clientDescPath, "utf8"));
        if (clientDescData && typeof clientDescData === "object" && clientDescData[fileName]) {
          delete clientDescData[fileName];
          fs3.writeFileSync(clientDescPath, JSON.stringify(clientDescData, null, 2), "utf8");
          deletedLocations.push(`client-descriptions:${fileName}`);
        }
      }
    } catch {
    }
  }
  const ghConfig = getGitHubConfig();
  if (ghConfig.isConfigured && fileName) {
    try {
      const ghRes = await deleteFileFromGitHub({
        repoPath: `public/uploads/${fileName}`,
        message: `chore(media): permanently delete ${fileName} [skip ci]`,
        config: ghConfig
      });
      if (ghRes.success) {
        deletedLocations.push(`github:public/uploads/${fileName}`);
      }
    } catch (gitErr) {
      console.warn(`Failed to delete ${fileName} from GitHub:`, gitErr);
    }
  }
  const r2Config = getR2Config();
  const isR2Url = r2Config.publicBaseUrl && cleanUrl.startsWith(r2Config.publicBaseUrl) || cleanUrl.includes("r2.cloudflarestorage.com") || cleanUrl.includes("r2.dev") || cleanUrl.startsWith("/api/media/file/");
  if ((isR2Url || r2Config.isConfigured) && r2Config.isConfigured) {
    try {
      let key = cleanUrl;
      if (cleanUrl.startsWith("/api/media/file/")) {
        key = cleanUrl.replace("/api/media/file/", "");
      } else if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        try {
          const u = new URL(cleanUrl);
          key = u.pathname.replace(/^\//, "");
        } catch {
        }
      } else if (cleanUrl.startsWith("/uploads/")) {
        key = `products/${fileName}`;
      }
      await deleteFromR2(key);
      deletedLocations.push(`r2:${key}`);
    } catch (r2Err) {
      console.warn(`Failed to delete ${cleanUrl} from R2:`, r2Err);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN && cleanUrl.includes("blob.vercel-storage.com")) {
    try {
      await del(cleanUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      deletedLocations.push(`vercel-blob:${cleanUrl}`);
    } catch (blobErr) {
      console.warn(`Failed to delete ${cleanUrl} from Vercel Blob:`, blobErr);
    }
  }
  console.log(`Deleted media asset ${fileName} from:`, deletedLocations);
  return { success: deletedLocations.length > 0 || true, deletedLocations };
}
function getStorageDiagnostics() {
  const provider = getStorageProvider();
  const r2Config = getR2Config();
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.STORAGE_PROVIDER === "cloudflare-r2";
  const githubConfig = getGitHubConfig();
  return {
    activeProvider: provider,
    isProduction,
    exclusiveDestination: isProduction ? githubConfig.isConfigured ? "github" : "cloudflare-r2" : provider,
    github: {
      isConfigured: githubConfig.isConfigured,
      owner: githubConfig.owner || null,
      repo: githubConfig.repo || null,
      branch: githubConfig.branch,
      hasToken: Boolean(githubConfig.token),
      tokenPrefix: githubConfig.token ? `${githubConfig.token.slice(0, 4)}...${githubConfig.token.slice(-4)}` : null,
      committerName: githubConfig.committerName,
      committerEmail: githubConfig.committerEmail
    },
    r2: {
      isConfigured: r2Config.isConfigured,
      bucketName: r2Config.bucketName || null,
      endpointConfigured: Boolean(r2Config.endpoint),
      endpointHost: r2Config.endpoint ? new URL(r2Config.endpoint).host : null,
      publicBaseUrl: r2Config.publicBaseUrl || null,
      hasAccountId: Boolean(r2Config.accountId),
      hasAccessKeyId: Boolean(r2Config.accessKeyId),
      hasSecretAccessKey: Boolean(r2Config.secretAccessKey)
    },
    legacy: {
      vercelBlobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY
      )
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function listPersistentMedia() {
  const provider = getStorageProvider();
  const results = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const tombstones = getTombstones();
  if (provider === "cloudflare-r2" || getR2Config().isConfigured) {
    try {
      const r2Items = await listR2Objects();
      for (const item of r2Items) {
        if (!seenUrls.has(item.url) && !tombstones.has(item.fileName)) {
          seenUrls.add(item.url);
          results.push({
            ...item,
            source: "cloudflare-r2"
          });
        }
      }
    } catch (err) {
      console.warn("Could not list media from Cloudflare R2:", err);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const response = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      for (const blob of response.blobs) {
        const fileName = path5.basename(blob.pathname);
        if (!seenUrls.has(blob.url) && !tombstones.has(fileName)) {
          seenUrls.add(blob.url);
          results.push({
            url: blob.url,
            fileName,
            size: blob.size,
            createdAt: blob.uploadedAt.toISOString(),
            source: "vercel-blob"
          });
        }
      }
    } catch (err) {
      console.warn("Could not list media from Vercel Blob:", err);
    }
  }
  const scanDir = (dir) => {
    if (fs3.existsSync(dir)) {
      try {
        const files = fs3.readdirSync(dir);
        for (const file of files) {
          const url = `/uploads/${file}`;
          if (!seenUrls.has(url) && !tombstones.has(file) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
            seenUrls.add(url);
            const fullPath = path5.join(dir, file);
            let size = 0;
            let mtime = (/* @__PURE__ */ new Date()).toISOString();
            try {
              const stat = fs3.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime.toISOString();
            } catch {
            }
            results.push({
              url,
              fileName: file,
              size,
              createdAt: mtime,
              source: "local"
            });
          }
        }
      } catch {
      }
    }
  };
  scanDir(path5.join(process.cwd(), "public", "uploads"));
  if (fs3.existsSync(path5.join("/tmp", "uploads"))) {
    scanDir(path5.join("/tmp", "uploads"));
  }
  return results;
}

// server/auth.ts
import crypto3 from "crypto";
var SESSION_SECRET = (process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "").trim() || "lariel_bridal_prod_session_secret_2026_secured";
var TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var REVOKED_LEGACY_TOKENS = /* @__PURE__ */ new Set([
  "lariel_super_admin_sec_token_2026",
  "demo-admin-token",
  "admin-token",
  "token123"
]);
function generateAdminSessionToken(admin) {
  const now = Date.now();
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    iat: now,
    exp: now + TOKEN_TTL_MS
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto3.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}
function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Authorization token missing." };
  }
  if (REVOKED_LEGACY_TOKENS.has(token.trim())) {
    return { valid: false, error: "Legacy token has been revoked. Re-authentication required." };
  }
  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid token format." };
  }
  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto3.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto3.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Invalid token signature." };
  }
  try {
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (!payload.sub || !payload.exp) {
      return { valid: false, error: "Malformed token payload." };
    }
    const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1e3;
    const isExpired = Date.now() > payload.exp;
    const isPastGrace = Date.now() > payload.exp + GRACE_PERIOD_MS;
    if (isPastGrace) {
      return { valid: false, error: "Token has expired. Please log in again." };
    }
    return {
      valid: true,
      adminId: payload.sub,
      payload,
      needsRefresh: isExpired
    };
  } catch {
    return { valid: false, error: "Failed to decode token payload." };
  }
}
function verifyAdminCredentials(email, pass) {
  if (!email || !pass) {
    return { success: false, error: "Email and password are required." };
  }
  const cleanEmail = email.trim().toLowerCase();
  const db = getDatabase();
  const admins = db.admins || [];
  const admin = admins.find(
    (a) => a.email.toLowerCase() === cleanEmail || cleanEmail === "admin@larielessentials.com" && a.email.toLowerCase() === "admin@larielextravaganza.com"
  );
  if (!admin) {
    return { success: false, error: "Administrator account not found." };
  }
  const envPassword = (process.env.ADMIN_PASSWORD || "").trim();
  if (envPassword && pass === envPassword) {
    return { success: true, admin };
  }
  if (admin.passwordHash && admin.passwordSalt) {
    const calculatedHash = crypto3.pbkdf2Sync(pass, admin.passwordSalt, 1e4, 64, "sha512").toString("hex");
    if (calculatedHash === admin.passwordHash) {
      return { success: true, admin };
    }
    return { success: false, error: "Invalid password." };
  }
  const acceptedInitialPasswords = ["admin123", "lariel2026"];
  if (acceptedInitialPasswords.includes(pass)) {
    return { success: true, admin };
  }
  return { success: false, error: "Invalid credentials." };
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: Authorization header required." });
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return res.status(401).json({ error: "Unauthorized: Bearer token format required." });
  }
  const token = match[1].trim();
  const verification = verifyAdminSessionToken(token);
  if (!verification.valid || !verification.adminId) {
    return res.status(401).json({ error: `Unauthorized: ${verification.error || "Invalid session token."}` });
  }
  const db = getDatabase();
  const admins = db.admins || [];
  const admin = admins.find((a) => a.id === verification.adminId);
  if (!admin) {
    return res.status(403).json({ error: "Forbidden: Admin user record not found." });
  }
  req.adminUser = admin;
  if (verification.needsRefresh) {
    try {
      const freshToken = generateAdminSessionToken(admin);
      res.setHeader("X-Refreshed-Token", freshToken);
      res.setHeader("Access-Control-Expose-Headers", "X-Refreshed-Token");
    } catch {
    }
  }
  return next();
}

// server/api.ts
init_codeSync();
init_github();

// server/migration.ts
import fs4 from "fs";
import path6 from "path";
init_github();
init_codeSync();
function scanForVercelBlobs(db) {
  const items = [];
  const isMigratableUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    const clean = url.trim().toLowerCase();
    return clean.includes("blob.vercel-storage.com") || clean.includes(".vercel-storage.com") || clean.startsWith("http") && !clean.includes("larielextravaganza.com") && !clean.includes("localhost") && !clean.includes("127.0.0.1");
  };
  if (Array.isArray(db.products)) {
    for (const p of db.products) {
      if (Array.isArray(p.images)) {
        p.images.forEach((img, idx) => {
          if (isMigratableUrl(img)) {
            items.push({
              id: `product-${p.id}-${idx}`,
              type: "product",
              targetId: p.id,
              imageIndex: idx,
              originalUrl: img,
              status: "PENDING"
            });
          }
        });
      }
    }
  }
  if (Array.isArray(db.categories)) {
    for (const c of db.categories) {
      if (c.heroImage && isMigratableUrl(c.heroImage)) {
        items.push({
          id: `category-${c.id}`,
          type: "category",
          targetId: c.id,
          originalUrl: c.heroImage,
          status: "PENDING"
        });
      }
    }
  }
  if (db.settings) {
    const s = db.settings;
    if (s.homeHeroImage && isMigratableUrl(s.homeHeroImage)) {
      items.push({
        id: "setting-homeHeroImage",
        type: "setting",
        targetId: "homeHeroImage",
        originalUrl: s.homeHeroImage,
        status: "PENDING"
      });
    }
    if (s.laidePortraitImage && isMigratableUrl(s.laidePortraitImage)) {
      items.push({
        id: "setting-laidePortraitImage",
        type: "setting",
        targetId: "laidePortraitImage",
        originalUrl: s.laidePortraitImage,
        status: "PENDING"
      });
    }
    if (s.brandLogoImage && isMigratableUrl(s.brandLogoImage)) {
      items.push({
        id: "setting-brandLogoImage",
        type: "setting",
        targetId: "brandLogoImage",
        originalUrl: s.brandLogoImage,
        status: "PENDING"
      });
    }
  }
  if (Array.isArray(db.realBrides)) {
    for (const b of db.realBrides) {
      if (b.image && isMigratableUrl(b.image)) {
        items.push({
          id: `real-bride-${b.id}`,
          type: "real-bride",
          targetId: b.id,
          originalUrl: b.image,
          status: "PENDING"
        });
      }
    }
  }
  return items;
}
async function migrateVercelBlobsToGitHub(options) {
  const dryRun = Boolean(options.dryRun);
  const db = getDatabase();
  const items = scanForVercelBlobs(db);
  const githubConfig = getGitHubConfig();
  const report = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    dryRun,
    totalFound: items.length,
    migratedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    githubConfigured: githubConfig.isConfigured,
    items
  };
  if (items.length === 0) {
    console.log("No legacy Vercel Blob or external URLs found needing migration.");
    return report;
  }
  const uploadDirs = [
    path6.join(process.cwd(), "public", "uploads")
  ];
  for (const dir of uploadDirs) {
    if (!fs4.existsSync(dir)) {
      fs4.mkdirSync(dir, { recursive: true });
    }
  }
  let dbModified = false;
  for (const item of items) {
    if (dryRun) {
      item.status = "SKIPPED";
      report.skippedCount++;
      continue;
    }
    try {
      const response = await fetch(item.originalUrl, {
        headers: { "User-Agent": "Lariel-Migration-Tool/1.0" }
      });
      if (!response.ok) {
        throw new Error(`Failed to download image (HTTP ${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const validation = validateImageBuffer(buffer);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.error}`);
      }
      let originalName = "migrated_image.jpg";
      try {
        const u = new URL(item.originalUrl);
        originalName = path6.basename(u.pathname) || "migrated_image.jpg";
      } catch {
      }
      const fileName = generateSafeUniqueFilename(originalName, validation.detectedExt || "jpg");
      item.fileName = fileName;
      item.size = buffer.length;
      for (const dir of uploadDirs) {
        try {
          fs4.writeFileSync(path6.join(dir, fileName), buffer);
        } catch {
        }
      }
      const localUrl = `/uploads/${fileName}`;
      item.migratedUrl = localUrl;
      if (githubConfig.isConfigured) {
        const repoPath = `public/uploads/${fileName}`;
        const commitRes = await commitFileToGitHub({
          repoPath,
          buffer,
          message: `chore(migration): migrate ${fileName} from Vercel Blob [skip ci]`,
          config: githubConfig
        });
        if (commitRes.success) {
          item.githubCommitted = true;
          item.githubSha = commitRes.sha;
        } else {
          item.githubCommitted = false;
          item.error = `Saved locally, but GitHub commit failed: ${commitRes.error}`;
        }
      }
      if (item.type === "product") {
        const prod = db.products.find((p) => p.id === item.targetId);
        if (prod && Array.isArray(prod.images) && item.imageIndex !== void 0) {
          prod.images[item.imageIndex] = localUrl;
          dbModified = true;
        }
      } else if (item.type === "category") {
        const cat = db.categories.find((c) => c.id === item.targetId);
        if (cat) {
          cat.heroImage = localUrl;
          dbModified = true;
        }
      } else if (item.type === "setting") {
        if (db.settings) {
          db.settings[item.targetId] = localUrl;
          dbModified = true;
        }
      } else if (item.type === "real-bride") {
        const bride = db.realBrides?.find((b) => b.id === item.targetId);
        if (bride) {
          bride.image = localUrl;
          dbModified = true;
        }
      }
      item.status = "MIGRATED";
      report.migratedCount++;
    } catch (err) {
      item.status = "FAILED";
      item.error = err.message || String(err);
      report.failedCount++;
    }
  }
  if (dbModified && !dryRun) {
    await saveDatabase(db);
    syncAllCode(db);
    if (githubConfig.isConfigured) {
      try {
        const filesToSync = [
          { path: "data/db.json", content: JSON.stringify(db, null, 2) },
          { path: "src/data/products.ts", content: fs4.readFileSync(path6.join(process.cwd(), "src", "data", "products.ts"), "utf8") }
        ];
        await commitMultipleFilesToGitHub(filesToSync, "chore(migration): sync database state after blob migration");
      } catch (syncErr) {
        console.warn("Could not commit migrated db to GitHub:", syncErr);
      }
    }
  }
  try {
    const manifestDir = path6.join(process.cwd(), "data");
    if (!fs4.existsSync(manifestDir)) fs4.mkdirSync(manifestDir, { recursive: true });
    fs4.writeFileSync(
      path6.join(manifestDir, "github-migration-manifest.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
  } catch {
  }
  return report;
}

// server/api.ts
var router = express.Router();
router.use(express.raw({ type: ["image/*", "application/octet-stream"], limit: "50mb" }));
router.use(express.json({ limit: "50mb" }));
router.use(express.urlencoded({ extended: true, limit: "50mb" }));
router.use(async (_req, _res, next) => {
  try {
    await getDatabaseAsync();
  } catch {
  }
  next();
});
router.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", platform: "vercel", time: (/* @__PURE__ */ new Date()).toISOString() });
});
router.get("/bootstrap", (_req, res) => {
  const db = getDatabase();
  res.json({
    products: db.products || [],
    categories: db.categories || [],
    settings: db.settings || null,
    timestamp: Date.now()
  });
});
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const verification = verifyAdminCredentials(email, password);
  if (!verification.success || !verification.admin) {
    return res.status(401).json({
      error: verification.error || "Invalid administrator email or password."
    });
  }
  const admin = verification.admin;
  const token = generateAdminSessionToken(admin);
  await logActivity(`Admin logged in: ${admin.name} (${admin.email})`, admin.name);
  return res.json({
    success: true,
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar
    }
  });
});
router.get("/auth/me", requireAdmin, (req, res) => {
  const admin = req.adminUser;
  res.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar
    }
  });
});
router.get(["/admin/storage/diagnostics", "/storage/diagnostics"], requireAdmin, (_req, res) => {
  const diagnostics = getStorageDiagnostics();
  res.json(diagnostics);
});
router.get("/products", (req, res) => {
  const db = getDatabase();
  let products = [...db.products];
  const { status, category, search, sort, scope } = req.query;
  if (scope === "storefront") {
    products = products.filter((p) => p.status === "published");
  } else if (status && status !== "all") {
    products = products.filter((p) => p.status === status);
  }
  if (category && category !== "all" && category !== "new") {
    products = products.filter((p) => p.category === category);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.collectionName?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }
  if (sort) {
    if (sort === "price-asc") products.sort((a, b) => a.priceUSD - b.priceUSD);
    else if (sort === "price-desc") products.sort((a, b) => b.priceUSD - a.priceUSD);
    else if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else if (sort === "name") products.sort((a, b) => a.name.localeCompare(b.name));
  }
  res.json(products);
});
router.get("/products/:id", (req, res) => {
  const db = getDatabase();
  const product = resolveProduct(db.products, req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});
router.post("/products", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const data = req.body;
  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    return res.status(400).json({ error: "Product name is required." });
  }
  if (data.priceUSD === void 0 || isNaN(Number(data.priceUSD)) || Number(data.priceUSD) < 0) {
    return res.status(400).json({ error: "A valid price in USD is required." });
  }
  if (!data.category) {
    return res.status(400).json({ error: "Product category is required." });
  }
  const baseSlug = data.slug ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (db.products.some((p) => p.slug === uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }
  const id = data.id || uniqueSlug;
  const sku = data.sku || `LE-${String(data.category).toUpperCase().slice(0, 3)}-${String(db.products.length + 1).padStart(3, "0")}`;
  const newProduct = {
    id,
    name: data.name.trim(),
    slug: uniqueSlug,
    subtitle: data.subtitle || "",
    priceUSD: Number(data.priceUSD),
    compareAtPriceUSD: data.compareAtPriceUSD ? Number(data.compareAtPriceUSD) : void 0,
    category: data.category,
    style: data.style || "Silk",
    collectionName: data.collectionName || "Signature",
    description: data.description || "",
    details: Array.isArray(data.details) ? data.details : [data.details].filter(Boolean),
    materials: data.materials || "100% Pure Mulberry Silk",
    sizingInfo: data.sizingInfo || "Standard bridal fit. Consult size guide.",
    productionTime: data.productionTime || "Handcrafted in 7\u201314 working days.",
    shippingInfo: data.shippingInfo || "Complimentary worldwide express shipping (DHL 3\u20135 days).",
    careInstructions: data.careInstructions || "Dry clean only. Gentle low-heat steam.",
    images: (() => {
      if (Array.isArray(data.images)) {
        const clean = data.images.filter((img) => typeof img === "string" && img.trim() !== "" && !img.startsWith("blob:")).map((img) => img.trim());
        if (clean.length > 0) return clean;
      }
      return [];
    })(),
    colors: Array.isArray(data.colors) && data.colors.length > 0 ? data.colors : [
      { name: "Ivory", hex: "#FFFFF0" },
      { name: "Champagne Gold", hex: "#EED9B3" }
    ],
    sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : [
      "S (UK 6/8)",
      "M (UK 10/12)",
      "L (UK 14/16)",
      "XL (UK 18)",
      "Custom Measurements"
    ],
    reviewsCount: Number(data.reviewsCount) || 12,
    rating: Number(data.rating) || 5,
    isNew: Boolean(data.isNew),
    isBestSeller: Boolean(data.isBestSeller),
    crossSellIds: Array.isArray(data.crossSellIds) ? data.crossSellIds : [],
    badge: data.badge || "",
    setItems: Array.isArray(data.setItems) ? data.setItems : void 0,
    status: data.status || "published",
    stockQuantity: data.stockQuantity !== void 0 ? Number(data.stockQuantity) : 25,
    stockStatus: data.stockStatus || (Number(data.stockQuantity) === 0 ? "out_of_stock" : "in_stock"),
    sku,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  ensureProductGallery(newProduct);
  db.products.unshift(newProduct);
  await saveDatabase(db);
  await logActivity(`Created product "${newProduct.name}" (${newProduct.sku})`);
  res.status(201).json(newProduct);
});
function isImageReferencedInDb(db, url, currentProductId) {
  if (!url) return false;
  if (db.products?.some((p) => p.id !== currentProductId && p.images?.includes(url))) {
    return true;
  }
  if (db.categories?.some((c) => c.heroImage === url)) {
    return true;
  }
  if (db.settings) {
    if (db.settings.homeHeroImage === url || db.settings.laidePortraitImage === url || db.settings.brandLogoImage === url) {
      return true;
    }
  }
  if (db.realBrides?.some((b) => b.image === url)) {
    return true;
  }
  return false;
}
function isDeletableMediaUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  const clean = url.trim();
  if (clean.startsWith("/uploads/") || clean.includes("/uploads/")) return true;
  if (clean.includes("r2.cloudflarestorage.com") || clean.includes(".r2.dev") || clean.startsWith("/api/media/file/")) return true;
  if (clean.includes("blob.vercel-storage.com")) return true;
  const r2 = getR2Config();
  if (r2.publicBaseUrl && clean.startsWith(r2.publicBaseUrl)) return true;
  return false;
}
router.put("/products/:id", requireAdmin, async (req, res) => {
  const updates = req.body;
  if (updates.name && !updates.name.trim()) {
    return res.status(400).json({ error: "Product name cannot be empty." });
  }
  if (updates.priceUSD !== void 0 && (isNaN(Number(updates.priceUSD)) || Number(updates.priceUSD) < 0)) {
    return res.status(400).json({ error: "Invalid price." });
  }
  try {
    const updatedProduct = await updateProductAtomically(req.params.id, async (existing) => {
      let finalImages = existing.images || [];
      if (updates.images !== void 0) {
        const rawList = Array.isArray(updates.images) ? updates.images : [updates.images];
        const sanitized = rawList.filter((img) => typeof img === "string" && img.trim() !== "" && !img.startsWith("blob:")).map((img) => img.trim());
        if (sanitized.length > 0) {
          finalImages = sanitized;
        } else if (rawList.length === 0) {
          finalImages = [];
        }
      }
      const merged = {
        ...existing,
        ...updates,
        id: existing.id,
        // Strictly preserve original immutable ID
        images: finalImages,
        priceUSD: updates.priceUSD !== void 0 ? Number(updates.priceUSD) : existing.priceUSD,
        compareAtPriceUSD: updates.compareAtPriceUSD !== void 0 ? updates.compareAtPriceUSD ? Number(updates.compareAtPriceUSD) : void 0 : existing.compareAtPriceUSD,
        stockQuantity: updates.stockQuantity !== void 0 ? Number(updates.stockQuantity) : existing.stockQuantity,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (merged.stockQuantity === 0 && merged.stockStatus === "in_stock") {
        merged.stockStatus = "out_of_stock";
      } else if (merged.stockQuantity > 0 && merged.stockStatus === "out_of_stock") {
        merged.stockStatus = "in_stock";
      }
      return merged;
    });
    await logActivity(`Updated product "${updatedProduct.name}"`);
    return res.json(updatedProduct);
  } catch (err) {
    if (err?.message?.includes("Product not found")) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err?.message || "Failed to update product." });
  }
});
router.delete("/products/:id", requireAdmin, async (req, res) => {
  return withDatabaseMutation(async () => {
    const db = getDatabase();
    const product = resolveProduct(db.products, req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (isDeletableMediaUrl(img)) {
          const isReferencedElsewhere = isImageReferencedInDb(db, img, product.id);
          if (!isReferencedElsewhere) {
            try {
              await deletePersistentMedia(img);
            } catch (delErr) {
              console.warn(`Failed to delete media for deleted product: ${img}`, delErr);
            }
          }
        }
      }
    }
    db.products = db.products.filter((p) => p.id !== product.id);
    await saveDatabase(db);
    await logActivity(`Deleted product "${product.name}" (${product.sku})`);
    return res.json({ success: true, id: product.id });
  });
});
router.post("/products/:id/duplicate", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }
  const timestamp = Date.now();
  const newId = `${product.id}-copy-${timestamp}`;
  const newSlug = `${product.slug}-copy-${timestamp}`;
  const duplicated = {
    ...product,
    id: newId,
    name: `${product.name} (Copy)`,
    slug: newSlug,
    sku: `LE-CPY-${String(db.products.length + 1).padStart(3, "0")}`,
    status: "draft",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.products.unshift(duplicated);
  await saveDatabase(db);
  await logActivity(`Duplicated product "${product.name}" as "${duplicated.name}"`);
  res.status(201).json(duplicated);
});
router.patch("/products/bulk", requireAdmin, async (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Array of product IDs required." });
  }
  const db = getDatabase();
  let affectedCount = 0;
  if (action === "delete") {
    const toDelete = db.products.filter((p) => ids.includes(p.id));
    for (const prod of toDelete) {
      if (Array.isArray(prod.images)) {
        for (const img of prod.images) {
          if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
            try {
              await deletePersistentMedia(img);
            } catch (err) {
              console.warn(`Failed to delete media for product ${prod.id}:`, err);
            }
          }
        }
      }
    }
    const initialCount = db.products.length;
    db.products = db.products.filter((p) => !ids.includes(p.id));
    affectedCount = initialCount - db.products.length;
    await logActivity(`Bulk deleted ${affectedCount} products`);
  } else if (action === "setStatus") {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          status: value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return p;
    });
    await logActivity(`Bulk updated status to "${value}" for ${affectedCount} products`);
  } else if (action === "setCategory") {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          category: value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return p;
    });
    await logActivity(`Bulk changed category to "${value}" for ${affectedCount} products`);
  }
  await saveDatabase(db);
  res.json({ success: true, count: affectedCount });
});
router.get("/categories", (req, res) => {
  const db = getDatabase();
  const categoriesWithCounts = db.categories.map((cat) => {
    const count = db.products.filter((p) => p.category === cat.id && p.status === "published").length;
    return {
      ...cat,
      itemCount: count
    };
  });
  res.json(categoriesWithCounts);
});
router.post("/categories", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const { name, subtitle, description, heroImage, badge, slug } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required." });
  }
  const catId = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (db.categories.some((c) => c.id === catId)) {
    return res.status(400).json({ error: "A category with this identifier already exists." });
  }
  const newCategory = {
    id: catId,
    name: name.trim(),
    slug: catId,
    subtitle: subtitle || "",
    description: description || "",
    heroImage: heroImage || "",
    badge: badge || "",
    isVisible: true,
    order: db.categories.length + 1
  };
  db.categories.push(newCategory);
  await saveDatabase(db);
  await logActivity(`Created category "${newCategory.name}"`);
  res.status(201).json(newCategory);
});
router.put("/categories/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const index = db.categories.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Category not found." });
  }
  const existing = db.categories[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id
  };
  db.categories[index] = updated;
  await saveDatabase(db);
  await logActivity(`Updated category "${updated.name}"`);
  res.json(updated);
});
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    return res.status(404).json({ error: "Category not found." });
  }
  if (cat.heroImage && isDeletableMediaUrl(cat.heroImage) && !isImageReferencedInDb(db, cat.heroImage)) {
    try {
      await deletePersistentMedia(cat.heroImage);
    } catch {
    }
  }
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted category "${cat.name}"`);
  res.json({ success: true, id: req.params.id });
});
router.get("/orders", requireAdmin, (req, res) => {
  const db = getDatabase();
  res.json(db.orders || []);
});
router.post("/orders", async (req, res) => {
  const db = getDatabase();
  const orderData = req.body;
  const newOrder = {
    orderId: orderData.orderId || `LE-${Math.floor(1e4 + Math.random() * 9e4)}`,
    date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: "Processing",
    customerName: orderData.customerName || orderData.shippingAddress?.name || "Guest Client",
    customerEmail: orderData.customerEmail || "",
    customerPhone: orderData.customerPhone || "",
    shippingAddress: orderData.shippingAddress || {
      name: "Client",
      city: "London",
      country: "United Kingdom",
      street: "42 Belgrave Square"
    },
    items: orderData.items || [],
    totalFormatted: orderData.totalFormatted || "$0",
    totalUSD: Number(orderData.totalUSD) || 0,
    trackingNumber: "PENDING-DISPATCH"
  };
  db.orders.unshift(newOrder);
  await saveDatabase(db);
  await logActivity(`New order placed #${newOrder.orderId} by ${newOrder.customerName} (${newOrder.totalFormatted})`);
  res.status(201).json(newOrder);
});
router.patch("/orders/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const order = db.orders.find((o) => o.orderId === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }
  if (req.body.status) order.status = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
  await saveDatabase(db);
  await logActivity(`Updated order #${order.orderId} status to "${order.status}"`);
  res.json(order);
});
router.get("/dashboard/stats", requireAdmin, (req, res) => {
  const db = getDatabase();
  const products = db.products;
  const totalProducts = products.length;
  const publishedProducts = products.filter((p) => p.status === "published").length;
  const draftProducts = products.filter((p) => p.status === "draft").length;
  const archivedProducts = products.filter((p) => p.status === "archived").length;
  const lowStockCount = products.filter(
    (p) => p.stockStatus === "low_stock" || p.stockQuantity > 0 && p.stockQuantity <= 5
  ).length;
  const outOfStockCount = products.filter(
    (p) => p.stockStatus === "out_of_stock" || p.stockQuantity === 0
  ).length;
  const totalOrders = db.orders.length;
  const totalRevenue = db.orders.reduce((sum, o) => sum + (o.totalUSD || 0), 0);
  const categoryBreakdown = db.categories.map((c) => ({
    name: c.name,
    id: c.id,
    count: products.filter((p) => p.category === c.id).length
  }));
  const recentProducts = [...products].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 5);
  res.json({
    totalProducts,
    publishedProducts,
    draftProducts,
    archivedProducts,
    lowStockCount,
    outOfStockCount,
    totalCategories: db.categories.length,
    totalOrders,
    totalRevenue,
    categoryBreakdown,
    recentProducts,
    recentOrders: db.orders.slice(0, 5),
    activityLogs: (db.activityLogs || []).slice(0, 10)
  });
});
router.post("/upload/presign", requireAdmin, async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { filename, contentType, folder, size } = req.body || {};
    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "Filename is required for presigned upload." });
    }
    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({ error: "Content-Type is required for presigned upload." });
    }
    if (size && Number(size) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File size exceeds maximum permitted limit of ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`
      });
    }
    const safeFolder = folder && PERMITTED_FOLDERS.includes(folder.toLowerCase()) ? folder.toLowerCase() : "products";
    const presigned = await getPresignedUploadUrl(filename, contentType, safeFolder, 300);
    await logActivity(`Generated presigned R2 upload URL for ${filename}`);
    return res.status(200).json(presigned);
  } catch (err) {
    console.error("Presigned upload generation error:", err);
    return res.status(500).json({ error: err?.message || "Failed to generate presigned upload URL." });
  }
});
router.post(["/upload", "/upload-raw", "/upload-and-save-to-code"], requireAdmin, async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const rawFilename = req.query.filename || req.headers["x-filename"] || req.body?.filename || req.body?.name || `media_${Date.now()}.jpg`;
    let decodedFilename = "image.jpg";
    try {
      decodedFilename = decodeURIComponent(rawFilename);
    } catch {
      decodedFilename = rawFilename;
    }
    const cleanFilename = path7.basename(decodedFilename).replace(/[^a-zA-Z0-9._-]/g, "_") || `media_${Date.now()}.jpg`;
    const folderParam = req.query.folder || req.headers["x-folder"] || req.body?.folder || "products";
    const safeFolder = PERMITTED_FOLDERS.includes(folderParam.toLowerCase()) ? folderParam.toLowerCase() : "products";
    const targetType = req.query.targetType || req.headers["x-target-type"] || req.body?.targetType;
    let targetId = req.query.targetId || req.headers["x-target-id"] || req.body?.targetId;
    const imageId = req.query.imageId || req.headers["x-image-id"] || req.body?.imageId;
    const imageRole = req.query.imageRole || req.headers["x-image-role"] || req.body?.imageRole;
    const imageIndex = req.query.imageIndex !== void 0 ? Number(req.query.imageIndex) : req.headers["x-image-index"] !== void 0 ? Number(req.headers["x-image-index"]) : req.body?.imageIndex !== void 0 ? Number(req.body?.imageIndex) : 0;
    if (targetType === "product") {
      if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
        return res.status(400).json({ error: "Target product ID is required." });
      }
      const db = getDatabase();
      const targetProd = resolveProduct(db.products, targetId);
      if (!targetProd) {
        return res.status(404).json({
          error: `Target product not found with ID "${targetId}". Upload aborted to prevent image misassignment.`
        });
      }
      targetId = targetProd.id;
      ensureProductGallery(targetProd);
      if (imageId && typeof imageId === "string" && imageId.trim()) {
        const cleanImgId = imageId.trim();
        if (cleanImgId.includes("__")) {
          const [prefix] = cleanImgId.split("__");
          if (prefix && prefix !== targetProd.id) {
            return res.status(400).json({
              error: `Image identifier "${cleanImgId}" belongs to product "${prefix}", not target product "${targetProd.id}". Upload rejected.`
            });
          }
        }
        if (cleanImgId === `${targetProd.id}__primary` || cleanImgId === "primary" || cleanImgId === `${targetProd.id}_primary`) {
          if (imageRole && imageRole !== "primary") {
            return res.status(400).json({
              error: `Image role "${imageRole}" conflicts with primary image identifier "${cleanImgId}".`
            });
          }
        } else if (cleanImgId === `${targetProd.id}__hover` || cleanImgId === "hover" || cleanImgId === `${targetProd.id}_hover`) {
          if (imageRole && imageRole !== "hover") {
            return res.status(400).json({
              error: `Image role "${imageRole}" conflicts with hover image identifier "${cleanImgId}".`
            });
          }
        } else {
          const gm = cleanImgId.match(/__gallery_(\d+)$/);
          if (gm) {
            const idx = Number(gm[1]);
            if (idx > (targetProd.images || []).length) {
              return res.status(400).json({
                error: `Stale or out-of-bounds gallery slot index ${idx} in identifier "${cleanImgId}". Product currently has ${targetProd.images?.length || 0} images.`
              });
            }
            if (imageRole && imageRole !== "gallery") {
              return res.status(400).json({
                error: `Image role "${imageRole}" conflicts with gallery image identifier "${cleanImgId}".`
              });
            }
          } else {
            const found = targetProd.imageGallery?.findIndex((img) => img.id === cleanImgId);
            if (found === void 0 || found === -1) {
              return res.status(400).json({
                error: `Image identifier "${cleanImgId}" is invalid or does not exist on product "${targetProd.id}". Upload rejected.`
              });
            }
          }
        }
      }
    }
    let contentType = req.headers["content-type"] || "image/jpeg";
    let fileBuffer = null;
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
    } else if (typeof req.body === "string" && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body);
    } else if (req.body && req.body.data) {
      const dataStr = req.body.data;
      if (typeof dataStr === "string" && (dataStr.startsWith("http://") || dataStr.startsWith("https://") || dataStr.startsWith("/uploads/"))) {
        let codeResult2 = null;
        if (targetType && targetId) {
          await withDatabaseMutation(async () => {
            const db = getDatabase();
            codeResult2 = await updateImageDirectlyInCode(db, {
              type: targetType,
              targetId,
              imageId,
              imageRole,
              imageIndex: Number(imageIndex) || 0,
              newUrl: dataStr
            });
            await saveDatabase(db);
          });
        }
        if (targetType && targetId && (!codeResult2 || !codeResult2.success)) {
          return res.status(500).json({
            error: `Failed to save image URL to ${targetType}:${targetId}`,
            url: dataStr
          });
        }
        return res.status(200).json({
          url: dataStr,
          fileName: cleanFilename,
          size: 0,
          codeSaved: Boolean(codeResult2?.success),
          filesUpdated: codeResult2?.filesUpdated || [],
          item: codeResult2?.item
        });
      }
      const matches = dataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1];
        fileBuffer = Buffer.from(matches[2], "base64");
      } else {
        fileBuffer = Buffer.from(dataStr, "base64");
      }
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No image file provided for upload." });
    }
    const validation = validateImageBuffer(fileBuffer, contentType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || "Invalid or unsupported image file." });
    }
    const validatedMime = validation.detectedMime || contentType || "image/jpeg";
    const result = await uploadPersistentMedia(
      fileBuffer,
      cleanFilename,
      validatedMime,
      safeFolder
    );
    const provider = getStorageProvider();
    await logActivity(`Uploaded media file [${provider}]: ${result.fileName}`);
    let codeResult = null;
    let ghCommitResult = null;
    let codeUpdateError = null;
    if (targetType && targetId) {
      try {
        await withDatabaseMutation(async () => {
          const db = getDatabase();
          codeResult = await updateImageDirectlyInCode(db, {
            type: targetType,
            targetId,
            imageId,
            imageRole,
            imageIndex: Number(imageIndex) || 0,
            newUrl: result.url
          });
          await saveDatabase(db);
        });
        await logActivity(`Saved uploaded image [${result.fileName}] directly to code: ${codeResult.filesUpdated.join(", ")}`);
        const ghConfig = getGitHubConfig();
        if (ghConfig.isConfigured && Array.isArray(codeResult?.files) && codeResult.files.length > 0) {
          try {
            const allFilesToCommit = [
              {
                path: `public/uploads/${result.fileName}`,
                buffer: fileBuffer
              },
              ...codeResult.files
            ];
            ghCommitResult = await commitMultipleFilesToGitHub(
              allFilesToCommit,
              `feat(media): upload ${result.fileName} and update code for ${targetType}:${targetId}`
            );
            if (ghCommitResult.success) {
              await logActivity(`Committed uploaded image and code to GitHub (${ghCommitResult.commitSha || "success"})`);
            } else {
              console.warn("GitHub commit warnings:", ghCommitResult.errors);
            }
          } catch (gitCodeErr) {
            console.warn("Failed to prepare GitHub code commit:", gitCodeErr);
            ghCommitResult = { success: false, errors: [gitCodeErr?.message || String(gitCodeErr)] };
          }
        }
      } catch (codeErr) {
        codeUpdateError = codeErr?.message || String(codeErr);
        console.error("Failed to directly apply uploaded image to code:", codeErr);
      }
    }
    if (targetType && targetId && (!codeResult || !codeResult.success || codeUpdateError)) {
      return res.status(500).json({
        error: `Image was uploaded, but failed to save to product record: ${codeUpdateError || "Catalog database save failure"}`,
        url: result.url,
        fileName: result.fileName,
        targetType,
        targetId,
        imageId,
        imageRole,
        imageIndex,
        dbUpdated: false,
        codeSaved: false,
        status: {
          validated: true,
          localSaved: result.localSaved,
          remoteConfirmed: result.remoteConfirmed,
          dbUpdated: false,
          persistenceType: result.persistenceType
        }
      });
    }
    if (!result.localSaved && !result.remoteConfirmed) {
      return res.status(500).json({
        error: "Image upload failed: Durable file persistence failed.",
        url: result.url
      });
    }
    const finalGithub = ghCommitResult ? {
      committed: Boolean(ghCommitResult.success),
      commitSha: ghCommitResult.commitSha || result.github?.commitSha,
      htmlUrl: ghCommitResult.htmlUrl || result.github?.htmlUrl,
      path: `public/uploads/${result.fileName}`,
      error: ghCommitResult.errors?.join("; ") || result.github?.error
    } : result.github;
    const responseStatus = {
      validated: true,
      localSaved: result.localSaved,
      localPath: result.localPath,
      remoteConfirmed: result.remoteConfirmed,
      remoteProvider: result.github?.committed || ghCommitResult?.success ? "github" : result.key ? "cloudflare-r2" : process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "none",
      dbUpdated: Boolean(codeResult?.success),
      filesUpdated: codeResult?.filesUpdated || [],
      github: finalGithub,
      persistenceType: result.persistenceType
    };
    const warnings = [...result.warnings || []];
    if (finalGithub && !finalGithub.committed && getGitHubConfig().isConfigured) {
      warnings.push(`GitHub commit did not complete: ${finalGithub.error || "Check repository permissions"}`);
    }
    return res.status(200).json({
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      key: result.key,
      status: responseStatus,
      warnings: warnings.length > 0 ? warnings : void 0,
      blob: { url: result.url },
      // Backward-compatibility
      codeSaved: Boolean(codeResult?.success),
      filesUpdated: codeResult?.filesUpdated || [],
      item: codeResult?.item,
      github: finalGithub
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: err?.message || "Image upload failed." });
  }
});
router.post("/upload/retry-save", requireAdmin, async (req, res) => {
  try {
    const { url, fileName, targetType, targetId, imageId, imageRole, imageIndex } = req.body || {};
    if (!url || !targetType || !targetId) {
      return res.status(400).json({ error: "url, targetType, and targetId are required for retry-save." });
    }
    let codeResult = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      if (targetType === "product") {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          throw new Error(`Product not found with ID "${targetId}"`);
        }
      }
      codeResult = await updateImageDirectlyInCode(db, {
        type: targetType,
        targetId,
        imageId,
        imageRole,
        imageIndex: Number(imageIndex) || 0,
        newUrl: url
      });
      await saveDatabase(db);
    });
    if (!codeResult || !codeResult.success) {
      return res.status(500).json({ error: "Failed to save image to product record on retry." });
    }
    let ghCommitResult = null;
    const ghConfig = getGitHubConfig();
    if (ghConfig.isConfigured && Array.isArray(codeResult?.files) && codeResult.files.length > 0) {
      try {
        ghCommitResult = await commitMultipleFilesToGitHub(
          codeResult.files,
          `fix(media): retry code update for ${targetType}:${targetId}`
        );
      } catch (err) {
        ghCommitResult = { success: false, errors: [err?.message || String(err)] };
      }
    }
    return res.json({
      success: true,
      url,
      fileName,
      status: {
        dbUpdated: true,
        filesUpdated: codeResult.filesUpdated,
        github: ghCommitResult ? {
          committed: Boolean(ghCommitResult.success),
          commitSha: ghCommitResult.commitSha,
          error: ghCommitResult.errors?.join("; ")
        } : void 0
      },
      item: codeResult.item,
      filesUpdated: codeResult.filesUpdated
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to retry saving to code." });
  }
});
router.get(["/github/status", "/github/diagnostics"], requireAdmin, async (_req, res) => {
  try {
    const diagnostics = await getGitHubDiagnostics();
    res.json(diagnostics);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to retrieve GitHub diagnostics" });
  }
});
router.post("/github/migrate", requireAdmin, async (req, res) => {
  try {
    const { dryRun } = req.body || {};
    const report = await migrateVercelBlobsToGitHub({ dryRun: Boolean(dryRun) });
    await logActivity(`Executed Vercel Blob to GitHub migration: ${report.migratedCount} migrated, ${report.failedCount} failed`);
    res.json(report);
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: err?.message || "Migration execution failed" });
  }
});
router.get("/media/file/:key(*)", async (req, res) => {
  const key = req.params.key;
  if (!key) {
    return res.status(400).json({ error: "Media object key required." });
  }
  try {
    const obj = await getR2Object(key);
    if (!obj || !obj.Body) {
      return res.status(404).json({ error: "Object not found in Cloudflare R2." });
    }
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    if (obj.ContentLength) res.setHeader("Content-Length", obj.ContentLength);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (typeof obj.Body.pipe === "function") {
      obj.Body.pipe(res);
    } else {
      const bytes = await obj.Body.transformToByteArray();
      res.end(Buffer.from(bytes));
    }
  } catch (err) {
    console.error(`Error streaming R2 media [${key}]:`, err);
    return res.status(404).json({ error: "Failed to retrieve media file." });
  }
});
router.get("/media", async (_req, res) => {
  try {
    const media = await listPersistentMedia();
    res.json(media);
  } catch (err) {
    console.error("Fetch media error:", err);
    res.status(500).json({ error: "Failed to read media library" });
  }
});
router.delete("/media", requireAdmin, async (req, res) => {
  try {
    const targetUrl = req.body?.url || req.query.url || req.body?.key || req.query.key;
    const force = req.body?.force !== void 0 ? Boolean(req.body.force) : true;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ error: "Target media URL or key is required for deletion." });
    }
    const db = getDatabase();
    const isReferenced = isImageReferencedInDb(db, targetUrl);
    if (isReferenced && !force) {
      return res.status(409).json({
        error: "Cannot delete media: asset is currently referenced by products or site settings.",
        referenced: true
      });
    }
    const deleteResult = await deletePersistentMedia(targetUrl);
    if (Array.isArray(db.products)) {
      for (const prod of db.products) {
        if (Array.isArray(prod.images) && prod.images.includes(targetUrl)) {
          prod.images = prod.images.filter((img) => img !== targetUrl);
          ensureProductGallery(prod);
          prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
    }
    if (Array.isArray(db.categories)) {
      for (const cat of db.categories) {
        if (cat.heroImage === targetUrl) {
          cat.heroImage = "";
        }
      }
    }
    if (db.settings) {
      if (db.settings.homeHeroImage === targetUrl) {
        delete db.settings.homeHeroImage;
      }
      if (db.settings.heroImage === targetUrl) {
        delete db.settings.heroImage;
      }
      if (db.settings.laidePortraitImage === targetUrl) {
        delete db.settings.laidePortraitImage;
      }
      if (db.settings.brandLogoImage === targetUrl) {
        delete db.settings.brandLogoImage;
      }
      if (db.settings.adminAvatarImage === targetUrl) {
        delete db.settings.adminAvatarImage;
      }
      if (db.settings.canonicalOverrides) {
        for (const [k, v] of Object.entries(db.settings.canonicalOverrides)) {
          if (v === targetUrl) {
            delete db.settings.canonicalOverrides[k];
          }
        }
      }
      db.siteSettings = { ...db.settings };
    }
    if (Array.isArray(db.realBrides)) {
      for (const b of db.realBrides) {
        if (b.image === targetUrl) {
          b.image = "";
        }
      }
    }
    await saveDatabase(db);
    const adminUser = req.adminUser;
    await logActivity(`Permanently deleted media asset: ${path7.basename(targetUrl)}`, adminUser?.name);
    return res.status(200).json({
      success: true,
      deleted: targetUrl,
      deletedLocations: deleteResult.deletedLocations
    });
  } catch (err) {
    console.error("Delete media error:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete media asset." });
  }
});
router.get("/settings", (req, res) => {
  const db = getDatabase();
  res.json(
    db.settings || {
      homeHeroImage: "/uploads/regenerated_image_1788952915584.png",
      homeHeroTitle: "The Morning Before Forever",
      homeHeroSubtitle: "Hand-appliqu\xE9d 3D florals, French chantilly laces & 100% pure Mulberry liquid silks for the discerning global bride.",
      announcement: "Complimentary worldwide express courier delivery on all bridal suite commissions.",
      laidePortraitImage: "/uploads/laide_founder_portrait_1789650582034.jpg",
      brandLogoImage: "/uploads/lariel_brand_logo_1788970256407.jpg"
    }
  );
});
router.put("/settings", requireAdmin, async (req, res) => {
  const db = getDatabase();
  db.settings = {
    ...db.settings || {},
    ...req.body
  };
  await saveDatabase(db);
  await logActivity("Updated site settings and hero imagery");
  res.json(db.settings);
});
router.get("/real-brides", (req, res) => {
  const db = getDatabase();
  res.json(db.realBrides || []);
});
router.post("/real-brides", requireAdmin, async (req, res) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  const { id, brideName, location, weddingDate, category, robeWorn, image, quote, photographerCredit } = req.body;
  if (!brideName || !image) {
    return res.status(400).json({ error: "Bride name and image are required." });
  }
  const brideStory = {
    id: id || `bride-${Date.now()}`,
    brideName,
    location: location || "Global Bride",
    weddingDate: weddingDate || (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    category: category || "Bride",
    robeWorn: robeWorn || "Lariel Bridal Robe",
    image,
    quote: quote || "The moment before forever was pure luxury.",
    photographerCredit: photographerCredit || "Featured Bride",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const existingIdx = db.realBrides.findIndex((b) => b.id === brideStory.id);
  if (existingIdx >= 0) {
    db.realBrides[existingIdx] = { ...db.realBrides[existingIdx], ...brideStory };
  } else {
    db.realBrides.unshift(brideStory);
  }
  await saveDatabase(db);
  await logActivity(`Published Real Bride feature: "${brideName}"`);
  res.json(brideStory);
});
router.delete("/real-brides/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  const bride = db.realBrides.find((b) => b.id === req.params.id);
  if (bride && bride.image && isDeletableMediaUrl(bride.image) && !isImageReferencedInDb(db, bride.image)) {
    try {
      await deletePersistentMedia(bride.image);
    } catch {
    }
  }
  db.realBrides = db.realBrides.filter((b) => b.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted Real Bride feature with id "${req.params.id}"`);
  res.json({ success: true, id: req.params.id });
});
router.get("/images/inventory", requireAdmin, (req, res) => {
  const db = getDatabase();
  const inventory = getAllEditableImages(db);
  res.json({
    total: inventory.length,
    images: inventory
  });
});
router.put("/images/edit", requireAdmin, async (req, res) => {
  try {
    let { type, targetId, imageId, imageRole, imageIndex, newUrl } = req.body || {};
    if (!type || !targetId || !newUrl) {
      return res.status(400).json({ error: "Missing type, targetId, or newUrl in edit request." });
    }
    let result = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      if (type === "product") {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          throw new Error(`Product not found with ID "${targetId}"`);
        }
        targetId = prod.id;
      }
      result = await updateImageDirectlyInCode(db, {
        type,
        targetId,
        imageId,
        imageRole,
        imageIndex: Number(imageIndex) || 0,
        newUrl
      });
      await saveDatabase(db);
    });
    if (!result || !result.success) {
      return res.status(500).json({ error: "Failed to update image in database." });
    }
    await logActivity(`Edited image for [${type}:${targetId}] -> saved directly to code: ${result.filesUpdated.join(", ")}`);
    return res.json({
      success: true,
      message: `Image updated and saved directly to ${result.filesUpdated.join(", ")}`,
      filesUpdated: result.filesUpdated,
      timestamp: result.timestamp,
      item: result.item
    });
  } catch (err) {
    console.error("Direct code image edit error:", err);
    const status = err?.message?.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err?.message || "Failed to edit image in code." });
  }
});
router.post("/images/sync-all", requireAdmin, async (req, res) => {
  try {
    let result = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      result = syncAllCode(db);
      await saveDatabase(db);
    });
    await logActivity(`Synchronized entire database state directly into code files: ${result.filesUpdated.join(", ")}`);
    return res.json({
      success: true,
      message: `All catalog and image data synchronized directly to code files.`,
      filesUpdated: result.filesUpdated,
      timestamp: result.timestamp
    });
  } catch (err) {
    console.error("Sync all to code error:", err);
    return res.status(500).json({ error: err?.message || "Failed to sync to code." });
  }
});
router.post(["/images/delete", "/images/delete-from-code"], requireAdmin, async (req, res) => {
  try {
    const { type, targetId, imageId, imageRole, imageIndex } = req.body;
    if (!type || !targetId) {
      return res.status(400).json({ error: "type and targetId are required for deletion." });
    }
    return await withDatabaseMutation(async () => {
      const db = getDatabase();
      let action = "deleted";
      let message = "Image deleted from code";
      let filesUpdated = [];
      if (type === "product") {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          return res.status(404).json({ error: `Product not found with ID ${targetId}` });
        }
        if (!Array.isArray(prod.images)) prod.images = [];
        let targetPos = -1;
        if (imageId) {
          if (imageId === `${prod.id}__primary` || imageId === "primary" || imageId.endsWith("__primary")) {
            targetPos = 0;
          } else if (imageId === `${prod.id}__hover` || imageId === "hover" || imageId.endsWith("__hover")) {
            targetPos = 1;
          } else {
            const found = prod.imageGallery?.findIndex((img) => img.id === imageId);
            if (found !== void 0 && found >= 0) {
              targetPos = found;
            } else {
              const m = imageId.match(/__gallery_(\d+)/);
              if (m) {
                targetPos = Number(m[1]);
              }
            }
          }
        }
        if (targetPos === -1 && imageIndex !== void 0) {
          targetPos = Number(imageIndex);
        }
        if (targetPos >= 0 && targetPos < prod.images.length) {
          if (prod.images.length <= 1 && targetPos === 0) {
            const removedImages = [...prod.images];
            db.products = db.products.filter((p) => p.id !== prod.id);
            action = "deleted_product";
            message = `Deleted product "${prod.name}" and updated src/data/products.ts`;
            for (const img of removedImages) {
              if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
                try {
                  await deletePersistentMedia(img);
                } catch {
                }
              }
            }
          } else {
            const removedUrl = prod.images.splice(targetPos, 1)[0];
            ensureProductGallery(prod);
            prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
            action = "removed_image";
            message = `Deleted image #${targetPos + 1} from "${prod.name}" and updated src/data/products.ts`;
            if (isDeletableMediaUrl(removedUrl) && !isImageReferencedInDb(db, removedUrl)) {
              try {
                await deletePersistentMedia(removedUrl);
              } catch {
              }
            }
          }
        } else {
          const removedImages = [...prod.images];
          db.products = db.products.filter((p) => p.id !== prod.id);
          action = "deleted_product";
          message = `Deleted product "${prod.name}" and updated src/data/products.ts`;
          for (const img of removedImages) {
            if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
              try {
                await deletePersistentMedia(img);
              } catch {
              }
            }
          }
        }
        if (action !== "deleted_product") {
          prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
      } else if (type === "real-bride") {
        db.realBrides = (db.realBrides || []).filter((b) => b.id !== targetId);
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
        message = `Deleted Real Bride story and updated src/data/realBrides.ts`;
      } else if (type === "category") {
        const cat = db.categories.find((c) => c.id === targetId);
        if (cat) {
          cat.heroImage = "";
          const syncRes = syncAllCode(db);
          await saveDatabase(db);
          filesUpdated = syncRes.filesUpdated;
          message = `Cleared hero image for category "${cat.name}" in code`;
        }
      } else if (type === "setting" || type === "canonical") {
        if (db.settings) {
          delete db.settings[targetId];
          if (db.settings.canonicalOverrides) {
            delete db.settings.canonicalOverrides[targetId];
          }
          db.siteSettings = { ...db.settings };
        }
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
        message = `Reset setting image "${targetId}" in code`;
      }
      await logActivity(`Deleted image for [${type}:${targetId}] -> updated code: ${filesUpdated.join(", ")}`);
      return res.json({
        success: true,
        action,
        message,
        filesUpdated,
        timestamp: Date.now()
      });
    });
  } catch (err) {
    console.error("Delete image from code error:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete image from code." });
  }
});
router.use((err, _req, res, _next) => {
  console.error("API Error:", err);
  res.setHeader("Content-Type", "application/json");
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  if (status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: "Image is too large" });
  }
  return res.status(status).json({ error: err?.message || "Internal server error" });
});
var api_default = router;

// server/vercel.ts
var app = express2();
app.use(express2.raw({ type: ["image/*", "application/octet-stream"], limit: "50mb" }));
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: true, limit: "50mb" }));
app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ status: "ok", platform: "vercel", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", api_default);
app.use("/", api_default);
app.use((err, _req, res, _next) => {
  console.error("Vercel server error:", err);
  res.setHeader("Content-Type", "application/json");
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  if (status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: "Image is too large" });
  }
  return res.status(status).json({ error: err?.message || "Internal server error" });
});
var vercel_default = app;
export {
  vercel_default as default
};
