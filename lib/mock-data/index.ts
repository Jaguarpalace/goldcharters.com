import type {
  BlogPost,
  CalculatorRate,
  EmailTemplate,
  Faq,
  HomepageSection,
  ItemWeBuy,
  Product,
  ProductCategory,
  ProductImage,
  Service,
  SiteSettings,
  TrustCard,
} from '@/types/database';

// All mock data is wrapped in pure functions so callers always get a fresh copy
// — no accidental shared state between requests.

export function mockSiteSettings(): SiteSettings {
  return {
    id: 'mock-settings',
    business_name: 'Charters Gold',
    logo_url: null,
    phone: '0800 047 2348',
    email: 'office@chartersgold.co.uk',
    whatsapp: '+44 7700 900123',
    address: 'Avalon House, Unit 7A, Egham Business Village, Crabtree Road, Egham, Surrey, TW20 8RB',
    opening_hours: 'Monday – Saturday · 10:00 – 18:00 · By appointment',
    top_bar_message: 'Discreet UK gold & jewellery specialists',
    top_bar_review_text: 'Excellent client reviews',
    top_bar_trust_text: 'Private valuations · Insured handling',
    top_bar_payment_text: 'Same-day payment available',
    footer_description:
      'Charters Gold is a private valuation house specialising in gold, fine jewellery and antique pieces. We buy from private clients across the United Kingdom and curate a small collection of pieces available to purchase online.',
    footer_disclaimer:
      'Valuations are subject to inspection, item condition, market prices and verification. Offers may vary depending on purity, weight, gemstones, brand, demand and documentation. Calculator prices are guide prices only.',
    social_links: { instagram: '#', facebook: '#' },
    seo_title: 'Charters Gold · Private UK Gold & Jewellery Specialists',
    seo_description:
      'Sell gold, diamonds and fine jewellery to a discreet UK private valuation house, or browse our curated collection of jewellery and gold pieces.',
    updated_at: new Date().toISOString(),
  };
}

export function mockHomepageSections(): HomepageSection[] {
  return [
    {
      id: 'hero',
      section_key: 'hero',
      title: 'Unlock the Value of Gold & Jewellery',
      subtitle:
        'Sell your gold and jewellery with confidence, or discover carefully selected jewellery and gold pieces available to buy online.',
      body: null,
      cta_label: 'Sell Gold & Jewellery',
      cta_href: '/sell-gold',
      image_url: null,
      extra: {
        secondary_cta_label: 'Shop Jewellery',
        secondary_cta_href: '/shop',
        badges: [
          'Same-Day Payment Available',
          'Discreet Valuations',
          'Gold & Jewellery Specialists',
          'Secure UK Service',
          'Based on Live Gold Prices',
        ],
      },
      display_order: 1,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'sell_intro',
      section_key: 'sell_intro',
      title: 'Sell Your Gold With Confidence',
      subtitle: null,
      body: 'Whether you have scrap gold, broken jewellery, coins, bars, chains or rings, our specialists provide fast and professional valuations based on live gold prices.',
      cta_label: 'Sell My Gold',
      cta_href: '/sell-gold',
      image_url: null,
      extra: {
        bullets: [
          'Scrap gold accepted',
          'Broken gold accepted',
          'Coins and bars accepted',
          'Fast valuation',
          'Same-day payment available',
          'Upload multiple photos',
          'Use the gold calculator first',
        ],
      },
      display_order: 2,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'jewellery_intro',
      section_key: 'jewellery_intro',
      title: 'Sell Fine, Antique & Branded Jewellery',
      subtitle: null,
      body: 'From diamond rings and luxury bracelets to inherited jewellery and vintage pieces, receive a discreet valuation from experienced jewellery specialists.',
      cta_label: 'Sell My Jewellery',
      cta_href: '/sell-jewellery',
      image_url: null,
      extra: {
        bullets: [
          'Diamond jewellery',
          'Designer jewellery',
          'Antique pieces',
          'Engagement rings',
          'Inherited jewellery',
          'Branded jewellery',
          'Upload multiple photos',
        ],
      },
      display_order: 3,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'handbag_intro',
      section_key: 'handbag_intro',
      title: 'Sell Designer Handbags',
      subtitle: null,
      body: 'Discreet valuations for pre-loved designer handbags — Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada, Bottega Veneta and other premium houses. Authenticity verified, fair offers, fast settlement.',
      cta_label: 'Sell My Handbag',
      cta_href: '/sell-handbags',
      image_url: null,
      extra: {
        bullets: [
          'Hermès · Birkin, Kelly, Constance',
          'Chanel · Classic Flap, Boy, 2.55',
          'Louis Vuitton · select pieces',
          'Dior, Gucci, Prada, Bottega Veneta',
          'Authenticity verified by specialists',
          'Original box & dustbag enhances offer',
          'Upload multiple photos',
        ],
      },
      display_order: 6,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'watch_intro',
      section_key: 'watch_intro',
      title: 'Sell Luxury Watches',
      subtitle: null,
      body: 'Specialist valuations for fine timepieces — Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier and other premium watchmakers. Movement, condition, papers and box all factored in.',
      cta_label: 'Sell My Watch',
      cta_href: '/sell-watches',
      image_url: null,
      extra: {
        bullets: [
          'Rolex · Submariner, Daytona, GMT, Datejust',
          'Patek Philippe · Nautilus, Calatrava, Aquanaut',
          'Audemars Piguet · Royal Oak',
          'Omega, Cartier, IWC, Jaeger-LeCoultre',
          'Box, papers & service history valued',
          'Vintage pieces welcomed',
          'Upload multiple photos',
        ],
      },
      display_order: 7,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'shop_intro',
      section_key: 'shop_intro',
      title: 'Shop Gold & Jewellery',
      subtitle: null,
      body: 'Browse selected jewellery and gold pieces available to buy online, with clear product details, multiple images and live stock availability.',
      cta_label: 'View Collection',
      cta_href: '/shop',
      image_url: null,
      extra: null,
      display_order: 4,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'valuation_explainer',
      section_key: 'valuation_explainer',
      title: 'How We Value Your Gold & Jewellery',
      subtitle: 'Transparent, considered, market-led.',
      body: 'Every piece is reviewed by a specialist before an offer is made. We assess weight, carat and purity against live gold prices, then consider gemstones, diamond quality, brand provenance, age, rarity, condition and supporting documentation. You are under no obligation to accept the offer.',
      cta_label: null,
      cta_href: null,
      image_url: null,
      extra: {
        criteria: [
          'Gold weight',
          'Carat / purity',
          'Current gold price',
          'Metal type',
          'Gemstones',
          'Diamond quality',
          'Brand or designer value',
          'Age and rarity',
          'Condition',
          'Box, papers or certificates',
          'Market demand',
        ],
      },
      display_order: 5,
      visible: true,
      updated_at: new Date().toISOString(),
    },
  ];
}

export function mockServices(): Service[] {
  return [
    {
      id: 's-sell-gold',
      title: 'Sell Gold',
      slug: 'sell-gold',
      short_description:
        'Turn gold rings, chains, bracelets, coins, bars and scrap gold into a competitive cash offer.',
      long_description: null,
      icon_key: 'bars',
      cta_label: 'Sell Gold',
      cta_href: '/sell-gold',
      pathway: 'sell',
      display_order: 1,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-sell-jewellery',
      title: 'Sell Jewellery',
      slug: 'sell-jewellery',
      short_description:
        'Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery.',
      long_description: null,
      icon_key: 'ring',
      cta_label: 'Sell Jewellery',
      cta_href: '/sell-jewellery',
      pathway: 'sell',
      display_order: 2,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-calculator',
      title: 'Gold Calculator',
      slug: 'gold-calculator',
      short_description:
        'Get an instant guide price by entering item weight and carat, using admin-controlled price-per-gram values.',
      long_description: null,
      icon_key: 'calculator',
      cta_label: 'Open Calculator',
      cta_href: '/gold-calculator',
      pathway: 'sell',
      display_order: 3,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-shop',
      title: 'Shop Jewellery',
      slug: 'shop',
      short_description:
        'Browse jewellery and gold pieces available to buy, with stock-controlled listings and basket functionality.',
      long_description: null,
      icon_key: 'box',
      cta_label: 'View Collection',
      cta_href: '/shop',
      pathway: 'buy',
      display_order: 4,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-gold-valuation',
      title: 'Gold Valuation',
      slug: 'gold-valuation',
      short_description:
        'Your gold is assessed using weight, purity, condition and current market prices.',
      long_description: null,
      icon_key: 'scale',
      cta_label: 'Request Valuation',
      cta_href: '/sell-gold',
      pathway: 'sell',
      display_order: 5,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-handbags',
      title: 'Sell Designer Handbags',
      slug: 'sell-handbags',
      short_description:
        'Hermès, Chanel, Louis Vuitton and other premium houses. Authentication and fair valuation by specialists.',
      long_description: null,
      icon_key: 'handbag',
      cta_label: 'Sell Handbag',
      cta_href: '/sell-handbags',
      pathway: 'sell',
      display_order: 7,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-watches',
      title: 'Sell Luxury Watches',
      slug: 'sell-watches',
      short_description:
        'Rolex, Patek Philippe, Audemars Piguet and other fine timepieces. Movement, papers and provenance assessed.',
      long_description: null,
      icon_key: 'watch',
      cta_label: 'Sell Watch',
      cta_href: '/sell-watches',
      pathway: 'sell',
      display_order: 8,
      visible: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 's-jewellery-valuation',
      title: 'Jewellery Valuation',
      slug: 'jewellery-valuation',
      short_description:
        'Fine jewellery is valued based on metal, gemstones, brand, age, condition and market demand.',
      long_description: null,
      icon_key: 'diamond',
      cta_label: 'Request Valuation',
      cta_href: '/sell-jewellery',
      pathway: 'sell',
      display_order: 6,
      visible: true,
      updated_at: new Date().toISOString(),
    },
  ];
}

export function mockItemsWeBuy(): ItemWeBuy[] {
  const names = [
    'Gold rings',
    'Gold chains',
    'Gold bracelets',
    'Gold earrings',
    'Scrap gold',
    'Broken gold',
    'Gold coins',
    'Sovereigns',
    'Gold bars',
    'Bullion',
    'Diamond rings',
    'Engagement rings',
    'Wedding rings',
    'Antique jewellery',
    'Vintage jewellery',
    'Branded jewellery',
    'Luxury necklaces',
    'Luxury bracelets',
    'Inherited jewellery',
    'Unwanted jewellery',
    'Hermès handbags',
    'Chanel handbags',
    'Louis Vuitton handbags',
    'Designer handbags',
    'Rolex watches',
    'Patek Philippe watches',
    'Audemars Piguet watches',
    'Omega watches',
    'Cartier watches',
    'Luxury watches',
  ];
  return names.map((name, index) => ({
    id: `item-${index}`,
    name,
    description: null,
    image_url: null,
    display_order: index + 1,
    visible: true,
  }));
}

export function mockTrustCards(): TrustCard[] {
  return [
    'Competitive offers',
    'Same-day payment available',
    'Discreet private service',
    'Transparent valuations',
    'Experienced specialists',
    'Secure item handling',
    'No pressure to sell',
    'UK-based service',
    'Clear communication',
    'Professional customer care',
    'Curated jewellery stock',
    'Secure checkout for purchases',
  ].map((title, i) => ({
    id: `trust-${i}`,
    title,
    body: '',
    icon_key: null,
    display_order: i + 1,
    visible: true,
  }));
}

export function mockFaqs(): Faq[] {
  return [
    {
      id: 'faq-1',
      category: 'selling_gold',
      question: 'How is gold valued?',
      answer:
        'Gold is usually valued based on weight, purity, current gold price and condition. Our specialists test purity in person before issuing a final offer.',
      display_order: 1,
      visible: true,
    },
    {
      id: 'faq-2',
      category: 'selling_gold',
      question: 'Can I sell broken gold?',
      answer:
        'Yes. Broken gold, scrap gold and damaged jewellery can still hold significant value. We assess by weight and verified purity.',
      display_order: 2,
      visible: true,
    },
    {
      id: 'faq-3',
      category: 'selling_gold',
      question: 'Do you buy gold coins and bars?',
      answer:
        'Yes. We value gold coins, sovereigns, bullion and gold bars based on weight, purity and current market conditions.',
      display_order: 3,
      visible: true,
    },
    {
      id: 'faq-4',
      category: 'calculator',
      question: 'Is the calculator price guaranteed?',
      answer:
        'No. The calculator provides a guide price only. Final offers depend on inspection, market price, purity verification and item condition.',
      display_order: 4,
      visible: true,
    },
    {
      id: 'faq-5',
      category: 'selling_jewellery',
      question: 'Can I upload multiple photos?',
      answer:
        'Yes. You can upload multiple photos from different angles to help us assess your items — hallmarks, stones, clasps, boxes and certificates where available.',
      display_order: 5,
      visible: true,
    },
    {
      id: 'faq-6',
      category: 'buying_jewellery',
      question: 'Do you sell jewellery online?',
      answer:
        'Yes. Available pieces can be browsed in the shop section and added to the basket for secure checkout.',
      display_order: 6,
      visible: true,
    },
    {
      id: 'faq-7',
      category: 'stock_orders',
      question: 'Are shop products actually in stock?',
      answer:
        'Yes. The website uses live stock status from our admin inventory system. Sold and reserved pieces are automatically marked unavailable.',
      display_order: 7,
      visible: true,
    },
    {
      id: 'faq-8',
      category: 'stock_orders',
      question: 'Can I buy one-off jewellery items?',
      answer:
        'Yes. Many pieces in our collection are unique, so once sold they automatically become unavailable. Reserved items are held briefly during checkout.',
      display_order: 8,
      visible: true,
    },
    {
      id: 'faq-9',
      category: 'selling_gold',
      question: 'Do I need ID when selling?',
      answer:
        'Yes. Valid ID may be required for security, compliance and fraud prevention. This protects both clients and our specialists.',
      display_order: 9,
      visible: true,
    },
    {
      id: 'faq-10',
      category: 'selling_jewellery',
      question: 'Am I under pressure to sell?',
      answer:
        'No. You are under no obligation. Our specialists provide a clear valuation; the decision to accept is entirely yours.',
      display_order: 10,
      visible: true,
    },
    {
      id: 'faq-11',
      category: 'delivery',
      question: 'How are purchased items delivered?',
      answer:
        'Pieces are sent fully insured via tracked, signed-for courier within the UK. Delivery options are confirmed at checkout.',
      display_order: 11,
      visible: true,
    },
  ];
}

export function mockCalculatorRates(): CalculatorRate[] {
  // Indicative guide prices — admin updates these in production.
  const rows: Array<Omit<CalculatorRate, 'id' | 'updated_at' | 'admin_notes' | 'margin_percentage'>> = [
    { metal_type: 'Gold', carat_label: '9ct', purity_percentage: 37.5, price_per_gram: 23.4, display_order: 1, visible: true },
    { metal_type: 'Gold', carat_label: '10ct', purity_percentage: 41.7, price_per_gram: 26.0, display_order: 2, visible: true },
    { metal_type: 'Gold', carat_label: '14ct', purity_percentage: 58.5, price_per_gram: 36.5, display_order: 3, visible: true },
    { metal_type: 'Gold', carat_label: '18ct', purity_percentage: 75.0, price_per_gram: 46.8, display_order: 4, visible: true },
    { metal_type: 'Gold', carat_label: '20ct', purity_percentage: 83.3, price_per_gram: 52.0, display_order: 5, visible: true },
    { metal_type: 'Gold', carat_label: '21ct', purity_percentage: 87.5, price_per_gram: 54.6, display_order: 6, visible: true },
    { metal_type: 'Gold', carat_label: '22ct', purity_percentage: 91.6, price_per_gram: 57.2, display_order: 7, visible: true },
    { metal_type: 'Gold', carat_label: '24ct', purity_percentage: 99.9, price_per_gram: 62.4, display_order: 8, visible: true },
    { metal_type: 'Silver', carat_label: '925', purity_percentage: 92.5, price_per_gram: 0.68, display_order: 9, visible: true },
    { metal_type: 'Silver', carat_label: '999', purity_percentage: 99.9, price_per_gram: 0.74, display_order: 10, visible: true },
    { metal_type: 'Platinum', carat_label: '950', purity_percentage: 95.0, price_per_gram: 22.4, display_order: 11, visible: true },
    { metal_type: 'Palladium', carat_label: '500', purity_percentage: 50.0, price_per_gram: 12.8, display_order: 12, visible: true },
    { metal_type: 'Palladium', carat_label: '950', purity_percentage: 95.0, price_per_gram: 24.6, display_order: 13, visible: true },
  ];
  const now = new Date().toISOString();
  return rows.map((row, i) => ({
    ...row,
    id: `rate-${i}`,
    margin_percentage: null,
    admin_notes: null,
    updated_at: now,
  }));
}

export function mockProductCategories(): ProductCategory[] {
  const cats = [
    'Rings',
    'Chains',
    'Bracelets',
    'Earrings',
    'Necklaces',
    'Gold coins',
    'Gold bars',
    'Diamond jewellery',
    'Watches',
    'Antique jewellery',
    'Branded jewellery',
  ];
  return cats.map((name, i) => ({
    id: `cat-${i}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: null,
    display_order: i + 1,
    visible: true,
  }));
}

export function mockProducts(): Product[] {
  const now = new Date().toISOString();
  const baseProducts: Array<Partial<Product> & Pick<Product, 'title' | 'slug' | 'retail_price'>> = [
    {
      title: '18ct Yellow Gold Solitaire Diamond Ring',
      slug: '18ct-yellow-gold-solitaire-diamond-ring',
      description:
        'A classic solitaire featuring a brilliant-cut diamond set in 18ct yellow gold. Includes original presentation box.',
      retail_price: 4850,
      metal_type: 'Gold',
      carat: '18ct',
      weight_grams: 4.2,
      gemstones: '0.75ct brilliant-cut diamond, G colour, VS clarity',
      brand: 'Private collection',
      condition: 'Excellent — preowned',
      certificate_info: 'Independent diamond grading report included',
      box_included: true,
      status: 'active',
      featured: true,
      category_id: 'cat-0',
      sku: 'GC-RNG-0142',
      quantity: 1,
    },
    {
      title: '22ct Gold Curb Link Chain · 56g',
      slug: '22ct-gold-curb-link-chain-56g',
      description:
        'A substantial 22ct yellow gold curb-link chain weighing 56 grams. Solid links, lobster clasp, hallmarked.',
      retail_price: 4290,
      metal_type: 'Gold',
      carat: '22ct',
      weight_grams: 56,
      gemstones: null,
      brand: null,
      condition: 'Very good — preowned',
      box_included: false,
      status: 'active',
      featured: true,
      category_id: 'cat-1',
      sku: 'GC-CHN-0207',
      quantity: 1,
    },
    {
      title: 'Full Gold Sovereign · 2023',
      slug: 'full-gold-sovereign-2023',
      description:
        'A 2023 full gold sovereign in uncirculated condition. 22ct gold, 7.98g gross weight.',
      retail_price: 595,
      metal_type: 'Gold',
      carat: '22ct',
      weight_grams: 7.98,
      gemstones: null,
      brand: 'Royal Mint',
      condition: 'Uncirculated',
      box_included: false,
      status: 'active',
      featured: false,
      category_id: 'cat-5',
      sku: 'GC-COIN-0451',
      quantity: 6,
    },
    {
      title: '1oz Investment Gold Bar · 999.9 Fine',
      slug: '1oz-investment-gold-bar-999-fine',
      description:
        'Investment-grade 1oz gold bar, 999.9 fine. Sealed in original assay card.',
      retail_price: 2150,
      metal_type: 'Gold',
      carat: '24ct',
      weight_grams: 31.1,
      gemstones: null,
      brand: 'LBMA-listed refiner',
      condition: 'Sealed · Mint',
      certificate_info: 'Sealed assay card with serial number',
      box_included: false,
      status: 'active',
      featured: true,
      category_id: 'cat-6',
      sku: 'GC-BAR-1OZ-0019',
      quantity: 3,
    },
    {
      title: 'Antique Edwardian Sapphire & Diamond Cluster Ring',
      slug: 'antique-edwardian-sapphire-diamond-cluster-ring',
      description:
        'A turn-of-the-century cluster ring featuring a central Ceylon sapphire surrounded by old-cut diamonds, in 18ct yellow gold and platinum.',
      retail_price: 3450,
      metal_type: 'Gold & Platinum',
      carat: '18ct',
      weight_grams: 3.6,
      gemstones: 'Ceylon sapphire, old-cut diamonds',
      brand: null,
      condition: 'Excellent — antique',
      box_included: true,
      status: 'reserved',
      featured: false,
      category_id: 'cat-9',
      sku: 'GC-RNG-0188',
      quantity: 1,
    },
    {
      title: '18ct Gold Tennis Bracelet · 3.4ct Total',
      slug: '18ct-gold-tennis-bracelet-3-4ct',
      description:
        'Elegant 18ct yellow gold tennis bracelet with 3.4ct total brilliant-cut diamonds.',
      retail_price: 5950,
      metal_type: 'Gold',
      carat: '18ct',
      weight_grams: 11.2,
      gemstones: '3.4ct brilliant-cut diamonds',
      brand: null,
      condition: 'Excellent — preowned',
      box_included: true,
      status: 'active',
      featured: false,
      category_id: 'cat-2',
      sku: 'GC-BRA-0091',
      quantity: 1,
    },
    {
      title: 'Diamond Stud Earrings · 1.00ct Total',
      slug: 'diamond-stud-earrings-1ct-total',
      description:
        '1.00ct total brilliant-cut diamond stud earrings in 18ct white gold, four-claw setting.',
      retail_price: 2150,
      metal_type: 'Gold',
      carat: '18ct white',
      weight_grams: 1.8,
      gemstones: '1.00ct brilliant-cut diamonds',
      brand: null,
      condition: 'Excellent — preowned',
      box_included: true,
      status: 'active',
      featured: true,
      category_id: 'cat-3',
      sku: 'GC-EAR-0312',
      quantity: 1,
    },
    {
      title: 'Vintage Cartier Style Panther Necklace',
      slug: 'vintage-style-panther-necklace',
      description:
        '18ct yellow gold panther-link necklace, vintage style. Heavy gauge, secure box clasp.',
      retail_price: 6850,
      metal_type: 'Gold',
      carat: '18ct',
      weight_grams: 62,
      gemstones: null,
      brand: null,
      condition: 'Very good — preowned',
      box_included: false,
      status: 'sold',
      featured: false,
      category_id: 'cat-4',
      sku: 'GC-NCK-0027',
      quantity: 0,
      sold_at: now,
    },
  ];

  return baseProducts.map((p, i) => ({
    id: `product-${i}`,
    description: p.description ?? '',
    category_id: p.category_id ?? null,
    sku: p.sku ?? null,
    metal_type: p.metal_type ?? null,
    carat: p.carat ?? null,
    weight_grams: p.weight_grams ?? null,
    gemstones: p.gemstones ?? null,
    brand: p.brand ?? null,
    condition: p.condition ?? null,
    certificate_info: p.certificate_info ?? null,
    box_included: p.box_included ?? false,
    cost_price: null,
    sale_price: null,
    quantity: p.quantity ?? 1,
    status: p.status ?? 'active',
    featured: p.featured ?? false,
    visible: true,
    main_image_url: null,
    seo_title: null,
    seo_description: null,
    created_at: now,
    updated_at: now,
    acquired_at: null,
    sold_at: p.sold_at ?? null,
    ...p,
  } as Product));
}

export function mockBlogPosts(): BlogPost[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'blog-1',
      title: 'How much is 22ct gold worth per gram in the UK today?',
      slug: 'how-much-22ct-gold-worth-per-gram-uk',
      excerpt:
        '22ct gold is the most common form of gold jewellery in the UK. Here is how its price per gram is calculated, and what you can expect when you sell.',
      content: `## What 22ct gold actually is

22ct gold means 22 parts pure gold out of 24, or **91.6% pure**. The remaining 8.4% is alloy — usually copper or silver — added to make the metal hard enough to wear daily.

## How the price per gram is calculated

The starting point is the **24ct (pure) spot price** quoted on the London Bullion Market each weekday. Per gram, you multiply that by the purity:

- 24ct = 99.9% (£X per gram pure)
- 22ct = 91.6% of the pure price
- 18ct = 75.0% of the pure price
- 9ct = 37.5% of the pure price

Then any dealer subtracts a small margin for refining cost and risk. We typically pay between **88% and 95%** of the purity-adjusted spot price for 22ct jewellery, depending on condition and quantity.

## What this means in pounds

If 24ct gold is trading at £62/g on the day you sell, the maths is:

- Pure spot per gram: £62.00
- 22ct equivalent: £62.00 × 91.6% = £56.79
- Our offer at 92% margin: £56.79 × 92% = **£52.25/g**

Bring in a 10g 22ct chain and you'd expect roughly £520, give or take a couple of pounds for the live market.

## What can change the offer

- **Hallmarks** — a stamped piece is faster to verify and gets a better margin
- **Weight** — bigger pieces are cheaper to refine per gram, so larger lots often get slightly better rates
- **Condition** — broken jewellery is fine; what matters is weight and purity, not aesthetics
- **Market movement** — gold prices change minute by minute. We quote based on the price at the moment we make the offer

## Want a live figure?

Use our [gold calculator](/gold-calculator) for an instant guide price across every common carat. Final offers always need an in-person purity check, but the calculator gets you within a few pounds.`,
      featured_image_url: null,
      category: 'Selling Gold',
      published: true,
      seo_title: 'How much is 22ct gold worth per gram in the UK today? | Charters Gold',
      seo_description:
        '22ct gold UK guide price: how the per-gram value is calculated, what we pay, and the factors that move the offer up or down.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'blog-2',
      title: 'Selling a Rolex: what affects the offer most',
      slug: 'selling-rolex-what-affects-offer',
      excerpt:
        'Box and papers matter, but they are not everything. A guide to the four factors that actually drive the value of a pre-owned Rolex on the UK market.',
      content: `## The hierarchy of value

After valuing hundreds of Rolex watches, the same four factors come up every time, in this order:

1. **Model and reference**
2. **Condition of the dial and case**
3. **Box and papers**
4. **Service history**

## 1. Model and reference

Some references trade at a premium to retail — Submariner Date 116610LN, Daytona 116500LN, GMT-Master II "Pepsi" 126710BLRO. Others sit closer to original retail or below. The reference number on the rehaut (the inner ring around the dial) is the single most important piece of information.

## 2. Condition of the dial and case

A heavily polished case loses sharp edges and value. Original, unpolished cases with crisp lugs command 5-15% more than over-polished examples. Dials should be original — refurbished dials drop the value significantly.

## 3. Box and papers

The famous "**full set**" — original box, warranty card with matching serial, service papers — adds **10-25%** depending on the model. For desk-grail references it can mean a difference of several thousand pounds.

## 4. Service history

A service record from Rolex UK or an authorised service centre adds confidence. If the watch has been recently serviced, expect a small premium. If it's overdue, factor in the cost of a service when receiving offers.

## What this means for you

If you have a recent watch with full set and unpolished case, you're in the best position. If you have a vintage piece without box, the value is still strong — just driven mostly by rarity and condition.

[Request a private valuation](/sell-watches) and we'll quote based on the live secondary market.`,
      featured_image_url: null,
      category: 'Selling Watches',
      published: true,
      seo_title: 'Selling a Rolex UK: what affects the offer most | Charters Gold',
      seo_description:
        'A practical guide to the four factors that determine a Rolex valuation in the UK — model, condition, papers and service history.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'blog-3',
      title: 'What is a Hermès Birkin worth on the resale market?',
      slug: 'hermes-birkin-resale-value-uk',
      excerpt:
        'Birkins hold their value better than most luxury bags — but not all Birkins are equal. The leather, the hardware, the year and the condition all change the figure dramatically.',
      content: `## A baseline

In 2026, a **35cm Togo Birkin in a classic colour with palladium hardware** typically resells for between £8,000 and £12,000 depending on condition and provenance. A 30cm in Epsom leather might trade slightly higher; an exotic skin (croc, ostrich) sits in a different bracket entirely — £25,000 and up.

## What moves the price

### Leather
- **Togo / Clemence**: most popular, easy to resell
- **Epsom**: structured, holds shape, slight premium
- **Box calf**: classic but shows scratches — condition-sensitive
- **Exotics (croc, ostrich, lizard)**: 2-5× the price of standard leathers

### Hardware
Palladium and gold-tone are roughly equivalent in value. Permabrass and rose gold sit at a slight premium because they were produced in smaller batches.

### Size
- **25cm**: rare, premium for the diminutive size
- **30cm**: most desirable everyday size
- **35cm**: classic, broad market
- **40cm and up**: harder to resell, lower per-piece value

### Year
Birkins from the 2010-2020 period in mint condition are the sweet spot. Older bags need to be exceptional to fetch top price; very new bags with their original receipt and dustbag command the highest figures.

### Condition + accessories
Original receipt, dustbag, box, rain cover and clochette pouch all add value. A bag with full accessories and minimal wear can be 20-30% more than one without.

## Why a private valuation is worth doing

The resale market for Birkins moves quickly and is brand-sensitive. A model that was hot last year may have softened; a previously slow colourway may now be in demand. We monitor the live secondary market daily.

[Request a private valuation](/sell-handbags) and we'll give you a current figure based on this week's market.`,
      featured_image_url: null,
      category: 'Selling Handbags',
      published: true,
      seo_title: 'Hermès Birkin resale value UK — what determines the price | Charters Gold',
      seo_description:
        'Comprehensive guide to Hermès Birkin resale value in the UK: leather type, hardware, size, year and condition explained.',
      created_at: now,
      updated_at: now,
    },
  ];
}

export function mockEmailTemplates(): EmailTemplate[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'tpl-1',
      key: 'new_request_admin',
      name: 'New valuation request — internal alert',
      description:
        'Internal notification delivered to the team the moment a customer submits a valuation request.',
      subject: 'New {{branch_label}} valuation request — {{full_name}}',
      html_body: DEFAULT_NEW_REQUEST_HTML,
      available_variables: [
        { key: 'full_name', label: 'Customer full name', example: 'Sarah Smith' },
        { key: 'first_name', label: 'Customer first name', example: 'Sarah' },
        { key: 'email', label: 'Customer email', example: 'sarah@example.com' },
        { key: 'phone', label: 'Customer phone (formatted)', example: '07700 900123' },
        { key: 'phone_digits', label: 'Customer phone (digits only)', example: '07700900123' },
        { key: 'branch_label', label: 'Form branch', example: 'Luxury Watch' },
        { key: 'submitted_at', label: 'Submission timestamp', example: '24 May 2026, 14:32' },
        { key: 'details_table', label: 'Auto-built HTML details table', example: '(rendered)' },
        { key: 'description_block', label: 'Customer description block (HTML)', example: '(rendered)' },
        { key: 'admin_url', label: 'Admin requests page link', example: 'https://chartersgold.co.uk/admin/valuation-requests' },
        { key: 'site_url', label: 'Public site URL', example: 'https://chartersgold.co.uk' },
        { key: 'logo_url', label: 'Brand logo URL', example: 'https://chartersgold.co.uk/logo/charters-gold.webp' },
        { key: 'business_name', label: 'Business name', example: 'Charters Gold' },
        { key: 'address', label: 'Business address', example: 'Avalon House, Egham…' },
      ],
      enabled: true,
      updated_at: now,
    },
    {
      id: 'tpl-2',
      key: 'customer_request_confirmation',
      name: 'Valuation request — customer confirmation',
      description:
        'Branded confirmation email sent to the customer the moment they submit a valuation request.',
      subject: 'We’ve received your valuation request — {{business_name}}',
      html_body: DEFAULT_CUSTOMER_CONFIRMATION_HTML,
      available_variables: [
        { key: 'first_name', label: 'Customer first name', example: 'Sarah' },
        { key: 'full_name', label: 'Customer full name', example: 'Sarah Smith' },
        { key: 'branch_label', label: 'What they’re selling', example: 'Luxury Watch' },
        { key: 'submitted_at', label: 'Submission timestamp', example: '24 May 2026, 14:32' },
        { key: 'customer_summary_table', label: 'Auto-built summary of their submission', example: '(rendered)' },
        { key: 'business_name', label: 'Business name', example: 'Charters Gold' },
        { key: 'business_phone', label: 'Business phone (formatted)', example: '0800 047 2348' },
        { key: 'business_phone_digits', label: 'Business phone (digits only)', example: '08000472348' },
        { key: 'business_email', label: 'Business email', example: 'office@chartersgold.co.uk' },
        { key: 'address', label: 'Business address', example: 'Avalon House, Egham…' },
        { key: 'logo_url', label: 'Brand logo URL', example: 'https://chartersgold.co.uk/logo/charters-gold.webp' },
        { key: 'site_url', label: 'Public site URL', example: 'https://chartersgold.co.uk' },
      ],
      enabled: true,
      updated_at: now,
    },
  ];
}

const DEFAULT_NEW_REQUEST_HTML = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>New valuation request</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">
        <tr>
          <td style="padding:32px 24px 20px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
            <img src="{{logo_url}}" alt="{{business_name}}" width="96" height="96" style="display:block; margin:0 auto; border:0;" />
            <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">{{business_name}} · Admin Alert</p>
            <h1 style="margin:10px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:22px; line-height:1.2;">New valuation request</h1>
            <p style="margin:6px 0 0; color:#9a9a9a; font-size:12px;">{{submitted_at}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px 0;">
            <h2 style="margin:0; color:#ffffff; font-family:Georgia, serif; font-size:18px;">{{full_name}}</h2>
            <p style="margin:6px 0 0; font-size:14px;">
              <a href="mailto:{{email}}" style="color:#d4af37; text-decoration:none;">{{email}}</a>
              <span style="color:#5a5a5a;"> · </span>
              <a href="tel:{{phone_digits}}" style="color:#d4af37; text-decoration:none;">{{phone}}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 0;">
            {{details_table}}
            {{description_block}}
          </td>
        </tr>
        <tr>
          <td style="padding:24px; text-align:center;">
            <a href="{{admin_url}}" style="display:inline-block; padding:12px 22px; background:linear-gradient(135deg,#A67C00,#D4AF37 35%,#FFD700 55%,#D4AF37 75%,#B8860B); color:#050505; font-weight:600; text-decoration:none; border-radius:999px; font-size:13px; letter-spacing:0.04em;">View full request →</a>
            <p style="margin:14px 0 0; color:#7a7a7a; font-size:11px;">{{admin_url}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px; background:#050505; border-top:1px solid rgba(212,175,55,0.15); text-align:center;">
            <p style="margin:0; color:#5a5a5a; font-size:11px; letter-spacing:0.06em;">
              {{business_name}} · {{address}}<br />
              Edit this email at <a href="{{site_url}}/admin/email-templates" style="color:#9a9a9a; text-decoration:underline;">admin/email-templates</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const DEFAULT_CUSTOMER_CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your valuation request — {{business_name}}</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">
        <tr>
          <td style="padding:36px 24px 26px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
            <img src="{{logo_url}}" alt="{{business_name}}" width="120" height="120" style="display:block; margin:0 auto; border:0;" />
            <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">{{business_name}}</p>
            <h1 style="margin:14px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:26px; line-height:1.2;">Thank you, {{first_name}}.</h1>
            <p style="margin:10px 0 0; color:#cfcfcf; font-size:14px;">Your valuation request is safely with us.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0; color:#cfcfcf; font-size:14px; line-height:1.7;">
            <p style="margin:0;">A specialist from our team will personally review your {{branch_label}} submission and respond within one business day using your preferred contact method.</p>
            <p style="margin:18px 0 0; color:#9a9a9a; font-size:12px; text-transform:uppercase; letter-spacing:0.18em;">What happens next</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:40px; padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">1</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Review.</strong> Our valuation team examines your photographs and supporting details.
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">2</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Indicative offer.</strong> We come back to you with a guide valuation and any clarifying questions.
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">3</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Final offer &amp; payment.</strong> Once you’re happy, we confirm in person and arrange same-day payment.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0;">
            <p style="margin:0 0 10px; color:#9a9a9a; font-size:10px; text-transform:uppercase; letter-spacing:0.18em;">Your submission</p>
            {{customer_summary_table}}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 4px; text-align:center;">
            <p style="margin:0; color:#9a9a9a; font-size:12px;">Need to reach us sooner?</p>
            <p style="margin:10px 0 0; font-size:14px;">
              <a href="tel:{{business_phone_digits}}" style="color:#d4af37; text-decoration:none; font-weight:600;">{{business_phone}}</a>
              <span style="color:#5a5a5a;"> · </span>
              <a href="mailto:{{business_email}}" style="color:#d4af37; text-decoration:none; font-weight:600;">{{business_email}}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px; background:#050505; border-top:1px solid rgba(212,175,55,0.15); text-align:center;">
            <p style="margin:0; color:#7a7a7a; font-size:11px; line-height:1.7;">
              {{business_name}}<br />
              {{address}}
            </p>
            <p style="margin:14px 0 0; color:#5a5a5a; font-size:10px; line-height:1.6;">
              You’re receiving this confirmation because you submitted a valuation request at <a href="{{site_url}}" style="color:#9a9a9a; text-decoration:underline;">{{site_url}}</a> on {{submitted_at}}.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

export function mockProductImages(): ProductImage[] {
  // Each mock product gets a placeholder; the gallery renders CSS treatments when image_url is empty.
  return mockProducts().map((p, idx) => ({
    id: `pi-${idx}`,
    product_id: p.id,
    image_url: '',
    alt_text: p.title,
    display_order: 1,
    created_at: new Date().toISOString(),
  }));
}
