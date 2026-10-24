import React from 'react';

/**
 * CANONICAL DEFAULT & FALLBACK IMAGES
 * 
 * All default, placeholder, and fallback visuals across LARIEL Couture
 * are authentic admin-uploaded assets residing in /uploads/.
 * External third-party placeholder sources (e.g. Unsplash) are strictly prohibited.
 */
export const CANONICAL_DEFAULTS = {
  // Primary Product Default & Image Fallback
  PRODUCT: '/uploads/client_bridal_09_2e0e485f.jpg',
  PRODUCT_SECONDARY: '/uploads/client_bridal_06_d5b1c862.jpg',

  // Category Hero Fallbacks
  CATEGORY_BRIDAL: '/uploads/1000863672_1792569460768_005529.jpg',
  CATEGORY_BRIDESMAIDS: '/uploads/1000863952_1792570551063_d65956.jpg',
  CATEGORY_PARTY: '/uploads/client_bridal_27_3212c639.jpg',
  CATEGORY_ADIRE: '/uploads/1000863775_1792570090079_54d384.jpg',
  CATEGORY_SLEEPWEAR: '/uploads/client_bridal_23_3749ee64.jpg',
  CATEGORY_ACCESSORIES: '/uploads/client_bridal_29_330e5a9d.jpg',
  CATEGORY_SETS: '/uploads/client_bridal_27_3212c639.jpg',
  CATEGORY_BOUDOIR: '/uploads/whatsapp_image_2026_09_14_at_15_08__1792584858532_c8d517.jpg',
  CATEGORY_CUSTOM: '/uploads/client_bridal_27_3212c639.jpg',

  // Editorial & World Banners
  HERO_MAIN: '/uploads/hero_bridal_transparent.webp',
  HERO_BACKGROUND: '/uploads/hero_bridal_bg_1788959544066.jpg',
  HERO_PORTRAIT: '/uploads/1000863672_1792569460768_005529.jpg',
  FOUNDER_PORTRAIT: '/uploads/laide_founder_portrait_1789650582034.jpg',

  // Bespoke Embroidery & Monogramming
  MONOGRAM_DETAIL: '/uploads/client_bridal_30_d10b4dc0.jpg',
  BESPOKE_SWATCH: '/uploads/1000863775_1792570090079_54d384.jpg',

  // Brand Identity
  LOGO_WORDMARK: '/uploads/lariel_brand_logo_1788970256407.jpg',
  LOGO_EMBLEM: '/uploads/lariel_brand_logo_1788970256407.jpg',
  ADMIN_AVATAR: '/uploads/test_avatar_1792680834562.jpg',

  // Universal Fallback
  FALLBACK: '/uploads/client_bridal_09_2e0e485f.jpg',
} as const;

/**
 * Returns a guaranteed valid image URL for any product with canonical fallback.
 */
export function getProductImage(
  product?: { images?: string[] } | null,
  index = 0,
  fallback = CANONICAL_DEFAULTS.PRODUCT
): string {
  if (
    product &&
    Array.isArray(product.images) &&
    product.images[index] &&
    typeof product.images[index] === 'string' &&
    product.images[index].trim() !== ''
  ) {
    return product.images[index].trim();
  }
  return fallback;
}

/**
 * Returns a category image with the category-specific canonical admin upload fallback.
 */
export function getCategoryImage(
  categorySlug?: string,
  providedImage?: string | null
): string {
  if (providedImage && typeof providedImage === 'string' && providedImage.trim() !== '') {
    return providedImage.trim();
  }

  switch (categorySlug?.toLowerCase()) {
    case 'bridal':
    case 'bridal-robes':
      return CANONICAL_DEFAULTS.CATEGORY_BRIDAL;
    case 'bridesmaids':
    case 'bridesmaids-robes':
      return CANONICAL_DEFAULTS.CATEGORY_BRIDESMAIDS;
    case 'sets':
    case 'party':
    case 'bridal-party':
    case 'bridal-party-sets':
      return CANONICAL_DEFAULTS.CATEGORY_SETS || CANONICAL_DEFAULTS.CATEGORY_PARTY;
    case 'adire':
    case 'heritage-adire':
      return CANONICAL_DEFAULTS.CATEGORY_ADIRE;
    case 'pyjamas':
    case 'sleepwear':
    case 'luxury-sleepwear':
      return CANONICAL_DEFAULTS.CATEGORY_SLEEPWEAR;
    case 'accessories':
    case 'bonnets':
    case 'bridal-accessories':
      return CANONICAL_DEFAULTS.CATEGORY_ACCESSORIES;
    case 'boudoir':
      return CANONICAL_DEFAULTS.CATEGORY_BOUDOIR;
    case 'personalised':
    case 'custom':
    case 'bespoke':
      return CANONICAL_DEFAULTS.CATEGORY_CUSTOM;
    case 'junior':
    case 'kids':
      return '/uploads/regenerated_image_1788965491439.jpg';
    case 'new':
      return CANONICAL_DEFAULTS.CATEGORY_BRIDAL;
    default:
      return CANONICAL_DEFAULTS.PRODUCT;
  }
}

/**
 * Global React image error handler that gracefully swaps a broken image
 * with a canonical fallback ONLY if the image actually failed and hasn't already fallen back.
 * Never overrides images that have data-no-fallback="true" (such as admin studios or previews).
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = CANONICAL_DEFAULTS.PRODUCT
) {
  const target = e.currentTarget;
  if (!target) return;

  // Respect explicit opt-out (e.g. in admin image editors/previews)
  if (target.dataset.noFallback === 'true' || target.dataset.fallbackApplied === 'true') {
    return;
  }

  try {
    const currentUrl = new URL(target.src, window.location.href);
    const fallbackUrl = new URL(fallback, window.location.href);

    // If current src already matches fallback pathname, stop to prevent loops
    if (currentUrl.pathname === fallbackUrl.pathname) {
      target.dataset.fallbackApplied = 'true';
      return;
    }
  } catch {}

  target.dataset.fallbackApplied = 'true';
  target.onerror = null;
  target.src = fallback;
}
