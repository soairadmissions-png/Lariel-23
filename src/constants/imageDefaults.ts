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
  PRODUCT: '/uploads/bridal_couch_hero_1788951504284.jpg',
  PRODUCT_SECONDARY: '/uploads/regenerated_image_1788954091974.jpg',

  // Category Hero Fallbacks
  CATEGORY_BRIDAL: '/uploads/bridal_couch_hero_1788951504284.jpg',
  CATEGORY_BRIDESMAIDS: '/uploads/regenerated_image_1788961847724.jpg',
  CATEGORY_PARTY: '/uploads/regenerated_image_1788961850105.jpg',
  CATEGORY_ADIRE: '/uploads/regenerated_image_1788962690479.jpg',
  CATEGORY_SLEEPWEAR: '/uploads/regenerated_image_1788963974286.jpg',
  CATEGORY_ACCESSORIES: '/uploads/regenerated_image_1788965491439.jpg',
  CATEGORY_SETS: '/uploads/regenerated_image_1788961850750.jpg',
  CATEGORY_BOUDOIR: '/uploads/regenerated_image_1788954093212.jpg',
  CATEGORY_CUSTOM: '/uploads/regenerated_image_1788963021175.png',

  // Editorial & World Banners
  HERO_MAIN: '/uploads/bridal_couch_hero_1788951504284.jpg',
  HERO_BACKGROUND: '/uploads/hero_bridal_bg_1788959544066.jpg',
  HERO_PORTRAIT: '/uploads/bridal_hero_cutout_1788871988678.jpg',
  FOUNDER_PORTRAIT: '/uploads/laide_founder_portrait_1789650582034.jpg',

  // Bespoke Embroidery & Monogramming
  MONOGRAM_DETAIL: '/uploads/regenerated_image_1788963021175.png',
  BESPOKE_SWATCH: '/uploads/regenerated_image_1788962692419.jpg',

  // Brand Identity
  LOGO_WORDMARK: '/uploads/lariel_wordmark_logo_1788970271070.jpg',
  LOGO_EMBLEM: '/uploads/lariel_brand_logo_1788970256407.jpg',
  ADMIN_AVATAR: '/uploads/laide_founder_portrait_1789650582034.jpg',

  // Universal Fallback
  FALLBACK: '/uploads/bridal_couch_hero_1788951504284.jpg',
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
    case 'party':
    case 'bridal-party':
    case 'bridal-party-sets':
      return CANONICAL_DEFAULTS.CATEGORY_PARTY;
    case 'adire':
    case 'heritage-adire':
      return CANONICAL_DEFAULTS.CATEGORY_ADIRE;
    case 'sleepwear':
    case 'luxury-sleepwear':
      return CANONICAL_DEFAULTS.CATEGORY_SLEEPWEAR;
    case 'accessories':
    case 'bonnets':
    case 'bridal-accessories':
      return CANONICAL_DEFAULTS.CATEGORY_ACCESSORIES;
    case 'boudoir':
      return CANONICAL_DEFAULTS.CATEGORY_BOUDOIR;
    case 'custom':
    case 'bespoke':
      return CANONICAL_DEFAULTS.CATEGORY_CUSTOM;
    default:
      return CANONICAL_DEFAULTS.PRODUCT;
  }
}

/**
 * Global React image error handler that automatically swaps a broken or failed image
 * with an authentic canonical admin upload fallback.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = CANONICAL_DEFAULTS.PRODUCT
) {
  const target = e.currentTarget;
  if (!target.src.endsWith(fallback)) {
    target.onerror = null; // Prevent cycling if fallback itself is unreachable
    target.src = fallback;
  }
}
