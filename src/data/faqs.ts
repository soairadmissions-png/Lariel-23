export interface FAQItem {
  question: string;
  answer: string;
  category: 'Sizing' | 'Colours' | 'Customisation' | 'Production Times' | 'Bridal-Party Orders' | 'Shipping' | 'Returns' | 'International Orders';
}

export const FAQ_DATA: FAQItem[] = [
  {
    category: 'Production Times',
    question: 'How long does production take before my order is dispatched?',
    answer: 'Our production timelines are structured by product tier: (1) Standard Silk & PJ Essentials take 3–4 business days. (2) Bespoke Handcrafted & Monogrammed Robes (e.g. Amanda 3D, Adire, Embellished) take 7–14 business days. (3) Bridal Party / Bulk Suites (3+ robes) require 2–3 weeks (14–21 business days). Express rush production (3–5 days) is available upon request via our WhatsApp concierge.',
  },
  {
    category: 'Sizing',
    question: 'How does Lariel Essentials sizing translate to UK sizing?',
    answer: 'We craft our robes with fluid wrap silhouettes and internal modesty ties that accommodate your natural shape: S corresponds to UK 6 / 8; M corresponds to UK 10 / 12; L corresponds to UK 14 / 16; XL corresponds to UK 18; XXL corresponds to UK 20; and XXXL corresponds to UK 22 / 24. Custom tailored measurements can also be submitted with your order.',
  },
  {
    category: 'Colours',
    question: 'What colours are available and can you match my wedding palette?',
    answer: 'We offer an extensive signature palette including Ivory, White, Beige, Nude, Champagne Gold, Blush Pink, Lilac, Soft Pink, Sky Blue, Soft Green, Olive Green, Chocolate Brown, Burnt Orange, Nude Brown, Emerald Green, Navy Blue, Burgundy, and Red. Custom colour matching is also available for bespoke orders—simply share your fabric swatch or pantone shade with our team.',
  },
  {
    category: 'Customisation',
    question: 'What is the step-by-step ordering process for Lariel robes?',
    answer: 'Our streamlined ordering workflow involves 8 clear steps: 1. Choose your style → 2. Choose your colour → 3. Select sizes for yourself and bridal party → 4. Submit event and order details → 5. Receive your official invoice → 6. Confirm order with a 70% non-refundable deposit → 7. Handcrafted production commences in our Lagos atelier → 8. Final balance is cleared prior to priority courier dispatch.',
  },
  {
    category: 'Bridal-Party Orders',
    question: 'Do you offer special bridal party packages or volume discounts?',
    answer: 'Yes! Our Bridal Party Studio unlocks tiered volume privileges for orders of 3+ pieces, including complimentary luxury keepsake packaging, coordinated bridal party colour palettes, custom role embroidery (Bride, Maid of Honour, Bridesmaid, Mother of the Bride), and synchronized worldwide or Nigeria-wide dispatch.',
  },
  {
    category: 'Shipping',
    question: 'Where do you ship, and who is responsible for customs charges?',
    answer: 'We provide seamless delivery across Nigeria and international priority shipping worldwide to the USA, UK, Canada, Australia, France, Portugal, and global destinations via DHL Express and FedEx. Please note that customs duties and import taxes assessed by destination countries are the responsibility of the customer.',
  },
  {
    category: 'Returns',
    question: 'What is your deposit and cancellation policy?',
    answer: 'Orders require a 70% non-refundable deposit to secure fabrics and commence handcrafted tailoring. Because each piece is cut, sewn, or monogrammed specifically to order, bespoke and personalised pieces cannot be cancelled once production begins. Standard unworn pieces in pristine original packaging are eligible for size exchanges within 7 days of delivery.',
  },
  {
    category: 'International Orders',
    question: 'How do I pay if I am ordering from outside Nigeria?',
    answer: 'International clients can select their preferred global currency (USD, GBP, EUR, CAD, AUD, AED, NGN) at checkout and complete payment via Remitly, WorldRemit, Sendwave, or LemFi directly to our official corporate accounts: Polaris Bank (4091455814) or United Bank for Africa / UBA (1024663880), both registered under "Lariel Bridal Essential". (Note: These financial institutions are well secured and trusted with over 1000 clients on this platform). Payments can also be made via international cards or coordinated directly through our WhatsApp concierge (+234 818 030 6073).',
  },
];

export const BRAND_CONTACT = {
  name: 'Lariel Essentials',
  descriptor: 'The Global Bridal House',
  tagline: 'The Art of the Bridal Morning',
  established: 'Est. 2016',
  founder: 'Laide',
  stats: '2,000+ Brides | 15+ Countries',
  press: 'Featured on BellaNaija Weddings',
  phone: '+234 818 030 6073',
  phoneFormatted: '+234 818 030 6073',
  whatsappRaw: '2348180306073',
  email: 'larielessentials@gmail.com',
  complaintsEmail: 'larielessentials@gmail.com',
  whatsappUrl: 'https://wa.me/2348180306073?text=Hello%20Lariel%20Essentials,%20I%20am%20inquiring%20about%20a%20luxury%20bridal%20order',
  instagram: 'larielessentials',
  instagramUrl: 'https://www.instagram.com/larielessentials?stkn=bmtiaXV5MzBjdG4x&utm_source=qr',
  tiktok: 'larielessentials',
  tiktokUrl: 'https://www.tiktok.com/@larielessentials?_r=1&_t=ZS-99wUtSkIX49',
  pinterest: 'larielessentials',
  pinterestUrl: 'https://pin.it/7mAKSzGAM',
  address: 'Block 1, FAAN Beesam Complex, Ikeja Airport Road, Lagos, Nigeria',
  headquarters: 'Block 1, FAAN Beesam Complex, Ikeja Airport Road, Lagos, Nigeria • Serving Brides Worldwide',
};

export const ORDERING_STEPS = [
  { step: 1, title: 'Choose Style', description: 'Select your signature bridal, bridesmaid, Adire, or pyjama silhouette.' },
  { step: 2, title: 'Choose Colour', description: 'Pick from our 18 signature shades or request custom wedding palette matching.' },
  { step: 3, title: 'Select Sizes', description: 'Match with Lariel sizes (S through XXXL / UK 6 to 24) or input custom measurements.' },
  { step: 4, title: 'Submit Event Details', description: 'Provide wedding date, monogramming preferences, and shipping destination.' },
  { step: 5, title: 'Receive Invoice', description: 'Receive an itemized official invoice detailing production milestones.' },
  { step: 6, title: '70% Deposit', description: 'Confirm your order with a 70% non-refundable deposit to commence production.' },
  { step: 7, title: 'Artisan Production', description: 'Handcrafted in Lagos by our master seamstresses (3–4 days standard, 7–14 days bespoke, 2–3 weeks bulk).' },
  { step: 8, title: 'Balance & Dispatch', description: 'Balance paid before priority tracked courier dispatch to Nigeria or worldwide.' },
];

export const FAQS = FAQ_DATA.map((item) => ({
  q: item.question,
  a: item.answer,
  category: item.category,
}));

export const SIZE_CHART = [
  { size: 'S', uk: 'UK 6 / 8', us: 'US 2 / 4', bust: '82-88 cm (32-34")', waist: '62-68 cm (24-27")', hips: '88-94 cm (34-37")' },
  { size: 'M', uk: 'UK 10 / 12', us: 'US 6 / 8', bust: '90-96 cm (35-38")', waist: '70-76 cm (27-30")', hips: '96-102 cm (38-40")' },
  { size: 'L', uk: 'UK 14 / 16', us: 'US 10 / 12', bust: '98-104 cm (38-41")', waist: '78-84 cm (31-33")', hips: '104-110 cm (41-43")' },
  { size: 'XL', uk: 'UK 18', us: 'US 14', bust: '106-112 cm (42-44")', waist: '86-92 cm (34-36")', hips: '112-118 cm (44-46")' },
  { size: 'XXL', uk: 'UK 20', us: 'US 16', bust: '114-120 cm (45-47")', waist: '94-100 cm (37-39")', hips: '120-126 cm (47-50")' },
  { size: 'XXXL', uk: 'UK 22 / 24', us: 'US 18 / 20', bust: '122-130 cm (48-51")', waist: '102-110 cm (40-43")', hips: '128-136 cm (50-54")' },
];
