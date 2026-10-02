export interface BankAccount {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  country: string;
  badge?: string;
  sortCode?: string;
}

export interface RemittanceApp {
  id: 'remitly' | 'worldremit' | 'sendwave' | 'lemfi';
  name: string;
  tagline: string;
  websiteUrl: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  supportedRegions: string;
  speed: string;
  instructions: string[];
}

export const OFFICIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: 'Polaris Bank',
    accountNumber: '4091455814',
    accountName: 'Lariel Bridal Essential',
    currency: 'NGN / Global Remittance',
    country: 'Nigeria',
    badge: 'Primary Account',
  },
  {
    bankName: 'United Bank for Africa (UBA)',
    accountNumber: '1024663880',
    accountName: 'Lariel Bridal Essential',
    currency: 'NGN / Pan-African & Global Remittance',
    country: 'Nigeria',
    badge: 'Verified Commercial Bank',
  },
];

export const REMITTANCE_APPS: RemittanceApp[] = [
  {
    id: 'remitly',
    name: 'Remitly',
    tagline: 'Fast, secure transfers with guaranteed delivery times',
    websiteUrl: 'https://www.remitly.com',
    supportedRegions: 'UK, USA, Europe, Canada, Australia',
    speed: 'Instant to 5 minutes',
    instructions: [
      'Open the Remitly App or website and select "Nigeria" as the recipient country.',
      'Enter the amount matching your bridal order converted to NGN or USD.',
      'Select delivery method: "Bank Deposit".',
      'Choose either Polaris Bank (Account: 4091455814) or United Bank for Africa (UBA) (Account: 1024663880).',
      'Recipient Name: Lariel Bridal Essential.',
      'Submit payment and send your transfer receipt to our bridal concierge on WhatsApp.',
    ],
  },
  {
    id: 'worldremit',
    name: 'WorldRemit',
    tagline: 'Trusted international money transfer service',
    websiteUrl: 'https://www.worldremit.com',
    supportedRegions: '130+ countries worldwide',
    speed: 'Instant transfer to bank accounts',
    instructions: [
      'Log into WorldRemit and select send to "Nigeria".',
      'Select "Bank Transfer" as the receive option.',
      'Choose Polaris Bank (4091455814) or United Bank for Africa / UBA (1024663880).',
      'Recipient Name: Lariel Bridal Essential.',
      'Review exchange rate, pay with your local card or bank, and keep your transfer reference.',
    ],
  },
  {
    id: 'sendwave',
    name: 'Sendwave',
    tagline: 'Fee-free money transfers directly to bank accounts',
    websiteUrl: 'https://www.sendwave.com',
    supportedRegions: 'USA, UK, Canada, France, Italy, Spain, Ireland',
    speed: 'Instant within seconds',
    instructions: [
      'Open the Sendwave App and choose Nigeria as the destination.',
      'Tap "Send to a Bank Account".',
      'Select Polaris Bank or United Bank for Africa (UBA).',
      'Input account number 4091455814 (Polaris) or 1024663880 (UBA). Account Name: Lariel Bridal Essential.',
      'Confirm send and share the transaction code with our team.',
    ],
  },
  {
    id: 'lemfi',
    name: 'LemFi',
    tagline: 'Zero-fee, best-rate international money app for Africans in diaspora',
    websiteUrl: 'https://lemfi.com',
    supportedRegions: 'UK, USA, Canada, Europe',
    speed: 'Instant deposit to Nigerian banks',
    instructions: [
      'Open LemFi and choose "Send to Nigeria".',
      'Enter recipient bank details: Polaris Bank (4091455814) or United Bank for Africa - UBA (1024663880).',
      'Recipient name will automatically verify as "Lariel Bridal Essential".',
      'Complete transfer instantly and notify concierge.',
    ],
  },
];

export const PAYMENT_GATEWAY_NOTE =
  '(Note: These financial institutions are well secured and trusted with over 1000 clients on this platform)';

export const OFFICIAL_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/larielessentials?stkn=bmtiaXV5MzBjdG4x&utm_source=qr',
  tiktok: 'https://www.tiktok.com/@larielessentials?_r=1&_t=ZS-99wUtSkIX49',
  pinterest: 'https://pin.it/7mAKSzGAM',
};
