import { Currency, CurrencyConfig } from '../types';

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  NGN: {
    code: 'NGN',
    symbol: '₦',
    flag: '🇳🇬',
    rate: 1000,
    country: 'Nigeria',
    format: (usd) => `₦${Math.round(usd * 1000).toLocaleString('en-NG')}`,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    rate: 1.0,
    country: 'United States & Global',
    format: (usd) => `$${usd.toLocaleString('en-US')}`,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    rate: 0.78,
    country: 'United Kingdom',
    format: (usd) => `£${Math.round(usd * 0.78).toLocaleString('en-GB')}`,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    rate: 0.92,
    country: 'European Union',
    format: (usd) => `€${Math.round(usd * 0.92).toLocaleString('en-DE')}`,
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    flag: '🇨🇦',
    rate: 1.36,
    country: 'Canada',
    format: (usd) => `CA$${Math.round(usd * 1.36).toLocaleString('en-CA')}`,
  },
  AUD: {
    code: 'AUD',
    symbol: 'AU$',
    flag: '🇦🇺',
    rate: 1.52,
    country: 'Australia',
    format: (usd) => `AU$${Math.round(usd * 1.52).toLocaleString('en-AU')}`,
  },
  AED: {
    code: 'AED',
    symbol: 'AED ',
    flag: '🇦🇪',
    rate: 3.67,
    country: 'United Arab Emirates',
    format: (usd) => `AED ${Math.round(usd * 3.67).toLocaleString('en-AE')}`,
  },
};

export const SUPPORTED_CURRENCIES: (CurrencyConfig & { country: string })[] = Object.values(CURRENCIES) as any;

export const GLOBAL_COLORS = [
  { name: 'Ivory', hex: '#FAF5EE' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Beige', hex: '#E2D8CA' },
  { name: 'Nude', hex: '#E7D3C1' },
  { name: 'Champagne Gold', hex: '#E2CFA7' },
  { name: 'Blush Pink', hex: '#F0D2D2' },
  { name: 'Lilac', hex: '#D8CEE3' },
  { name: 'Soft Pink', hex: '#F7D8E2' },
  { name: 'Sky Blue', hex: '#ABC4D8' },
  { name: 'Soft Green', hex: '#C4D6C4' },
  { name: 'Olive Green', hex: '#6F7A56' },
  { name: 'Chocolate Brown', hex: '#442A1D' },
  { name: 'Burnt Orange', hex: '#C25A27' },
  { name: 'Nude Brown', hex: '#9A7864' },
  { name: 'Emerald Green', hex: '#1C4A38' },
  { name: 'Navy Blue', hex: '#1C2951' },
  { name: 'Burgundy', hex: '#631B2A' },
  { name: 'Red', hex: '#9E1A1A' },
];

export const AMANDA_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FAF5EE' },
  { name: 'Champagne Gold', hex: '#E2CFA7' },
  { name: 'Beige', hex: '#E2D8CA' },
  { name: 'Blush Pink', hex: '#F0D2D2' },
];
