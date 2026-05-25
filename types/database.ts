// Mirror of the Supabase Postgres schema in TypeScript.
// Public-website code imports these types directly so any schema drift surfaces at compile time.

export type SiteSettings = {
  id: string;
  business_name: string;
  logo_url: string | null;
  phone: string;
  email: string;
  whatsapp: string | null;
  address: string | null;
  opening_hours: string | null;
  top_bar_message: string | null;
  top_bar_review_text: string | null;
  top_bar_trust_text: string | null;
  top_bar_payment_text: string | null;
  footer_description: string | null;
  footer_disclaimer: string | null;
  social_links: Record<string, string> | null;
  seo_title: string;
  seo_description: string;
  /**
   * Plain-text disclaimer printed on the Purchase Confirmation & Seller's
   * Disclaimer document. Newlines are preserved when rendered for print.
   */
  purchase_disclaimer_text: string | null;
  updated_at: string;
};

export type HomepageSection = {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  extra: Record<string, unknown> | null;
  display_order: number;
  visible: boolean;
  updated_at: string;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  long_description: string | null;
  icon_key: string | null;
  cta_label: string | null;
  cta_href: string | null;
  pathway: 'sell' | 'buy' | 'general';
  display_order: number;
  visible: boolean;
  updated_at: string;
};

export type ItemWeBuy = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  visible: boolean;
};

export type TrustCard = {
  id: string;
  title: string;
  body: string;
  icon_key: string | null;
  display_order: number;
  visible: boolean;
};

export type Faq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  display_order: number;
  visible: boolean;
};

export type FaqCategory =
  | 'selling_gold'
  | 'selling_jewellery'
  | 'calculator'
  | 'buying_jewellery'
  | 'delivery'
  | 'stock_orders';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category: string | null;
  published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type CalculatorRate = {
  id: string;
  metal_type: 'Gold' | 'Silver' | 'Platinum' | 'Palladium';
  carat_label: string;
  purity_percentage: number;
  price_per_gram: number;
  /**
   * When set, the public calculator derives price_per_gram from live spot
   * × purity × margin / 100. When null, the manual price_per_gram is used.
   */
  margin_percentage: number | null;
  display_order: number;
  visible: boolean;
  admin_notes: string | null;
  updated_at: string;
};

export type ValuationRequestStatus =
  | 'new'
  | 'contacted'
  | 'valued'
  | 'offer_sent'
  | 'booked'
  | 'bought'
  | 'completed'
  | 'rejected';

/** Statuses that still need our attention. Drives the sidebar badge count. */
export const OUTSTANDING_STATUSES: ValuationRequestStatus[] = [
  'new',
  'contacted',
  'valued',
  'offer_sent',
  'booked',
];

/** Ordered pipeline shown to admin for status progression. */
export const VALUATION_PIPELINE: ValuationRequestStatus[] = [
  'new',
  'contacted',
  'offer_sent',
  'booked',
  'bought',
];

/** Pretty labels for the UI. */
export const VALUATION_STATUS_LABELS: Record<ValuationRequestStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  valued: 'Valued',
  offer_sent: 'Valuation Sent',
  booked: 'Booked',
  bought: 'Bought',
  completed: 'Completed',
  rejected: 'Rejected',
};

export type ValuationItemType =
  | 'gold'
  | 'jewellery'
  | 'diamond_ring'
  | 'scrap_gold'
  | 'gold_coins'
  | 'gold_bars'
  | 'branded_jewellery'
  | 'handbags'
  | 'watches'
  | 'other';

export type PreferredContactMethod = 'phone' | 'email' | 'whatsapp';

export type FormVariant = 'metal' | 'jewellery' | 'watch' | 'handbag';

export type ValuationRequest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  item_type: ValuationItemType;
  /** Which branch of the form was submitted. */
  form_variant: FormVariant | null;
  /** Metal branch: Gold | Silver | Platinum */
  metal_type: string | null;
  /** Metal branch: Coins | Bullion | Scrap | Jewellery | Other */
  item_category: string | null;
  /** Jewellery branch: Ring | Necklace | Bracelet | Earrings | Pendant | Other */
  jewellery_type: string | null;
  /** Jewellery branch */
  gemstone: string | null;
  /** Watch + handbag branches */
  brand: string | null;
  /** Watch + handbag branches */
  model: string | null;
  /** Watch + handbag branches: Excellent | Good | Fair | Worn */
  condition: string | null;
  /** Watch + handbag branches: All | Box only | Papers only | Neither */
  box_papers: string | null;
  estimated_value: number | null;
  weight_grams: number | null;
  carat: string | null;
  description: string | null;
  preferred_contact_method: PreferredContactMethod;
  consent_accepted: boolean;
  status: ValuationRequestStatus;
  notes: string | null;
  /** Final figure paid to the customer in GBP. Set once a piece is bought. */
  payment_amount: number | null;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other',
};

export type ValuationRequestImage = {
  id: string;
  valuation_request_id: string;
  image_url: string;
  file_name: string | null;
  display_order: number;
  created_at: string;
};

export type ProductStatus =
  | 'draft'
  | 'active'
  | 'hidden'
  | 'reserved'
  | 'sold'
  | 'out_of_stock';

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  sku: string | null;
  metal_type: string | null;
  carat: string | null;
  weight_grams: number | null;
  gemstones: string | null;
  brand: string | null;
  condition: string | null;
  certificate_info: string | null;
  box_included: boolean | null;
  cost_price: number | null;
  retail_price: number;
  sale_price: number | null;
  quantity: number;
  status: ProductStatus;
  featured: boolean;
  visible: boolean;
  main_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  acquired_at: string | null;
  sold_at: string | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  created_at: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  visible: boolean;
};

export type StockMovementType =
  | 'stock_added'
  | 'stock_adjusted'
  | 'reserved'
  | 'sold'
  | 'returned'
  | 'hidden'
  | 'damaged'
  | 'manual_adjustment';

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'dispatched'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: string;
  delivery_address: string;
  delivery_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_title: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export type AdminProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'editor';
  created_at: string;
};

export type CustomerDocumentType =
  | 'id'
  | 'passport'
  | 'driving_licence'
  | 'proof_of_address'
  | 'other';

export const CUSTOMER_DOCUMENT_TYPES: CustomerDocumentType[] = [
  'id',
  'passport',
  'driving_licence',
  'proof_of_address',
  'other',
];

export const CUSTOMER_DOCUMENT_TYPE_LABELS: Record<CustomerDocumentType, string> = {
  id: 'ID Card',
  passport: 'Passport',
  driving_licence: 'Driving Licence',
  proof_of_address: 'Proof of Address',
  other: 'Other',
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerDocument = {
  id: string;
  customer_id: string;
  doc_type: CustomerDocumentType;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type StockItemStatus = 'held' | 'sold' | 'written_off';

export const STOCK_ITEM_STATUS_LABELS: Record<StockItemStatus, string> = {
  held: 'Held',
  sold: 'Sold',
  written_off: 'Written off',
};

/**
 * One physical piece we have actually bought from a seller. Spot price is
 * frozen at acquisition / sale time so margins don't drift as live spot
 * moves later — live portfolio value is computed at read time.
 */
export type StockItem = {
  id: string;
  stock_number: string;
  valuation_request_id: string | null;
  customer_id: string | null;

  // Frozen item snapshot
  item_type: string | null;
  description: string | null;
  metal_type: string | null;
  carat: string | null;
  purity_percentage: number | null;
  weight_grams: number | null;

  // Acquisition
  acquired_at: string;
  acquired_paid_gbp: number;
  acquired_spot_gbp_per_g: number | null;

  // Lifecycle
  status: StockItemStatus;

  // Sale (null until sold)
  sold_at: string | null;
  sold_to_name: string | null;
  sold_to_email: string | null;
  sold_amount_gbp: number | null;
  sold_spot_gbp_per_g: number | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRecipient = {
  id: string;
  email: string;
  label: string | null;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type UploadedImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  bucket: string;
  created_by: string | null;
  created_at: string;
};

export type EmailTemplateVariable = {
  key: string;
  label: string;
  example: string;
};

/**
 * Per-route SEO metadata override. Keyed by the route slug (e.g. '/sell-gold').
 * Edited from /admin/seo. Pages call `getPageSeo(slug)` during
 * `generateMetadata` and fall back to a hardcoded default when the row is
 * absent, so the public site is never broken by a missing CMS entry.
 */
export type FormOption = {
  id: string;
  set_key: string;
  value: string;
  label: string;
  display_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
};

export const FORM_OPTION_SET_KEYS = [
  'metal',
  'item_form',
  'jewellery_type',
  'gemstone',
  'watch_brand',
  'handbag_brand',
  'condition',
  'box_papers',
  'purity_gold',
  'purity_silver',
  'purity_platinum',
] as const;

export type FormOptionSetKey = (typeof FORM_OPTION_SET_KEYS)[number];

export const FORM_OPTION_SET_LABELS: Record<FormOptionSetKey, string> = {
  metal: 'Metal',
  item_form: 'Item form (Coins, Bullion, …)',
  jewellery_type: 'Jewellery type',
  gemstone: 'Gemstone',
  watch_brand: 'Watch brand',
  handbag_brand: 'Handbag brand',
  condition: 'Condition',
  box_papers: 'Box / papers',
  purity_gold: 'Purity — Gold',
  purity_silver: 'Purity — Silver',
  purity_platinum: 'Purity — Platinum',
};

/**
 * Tiny CMS layer over the legal pages. Body prose stays in code (high-stakes
 * legal text reviewed by counsel); only cosmetic surfaces are editable.
 */
export type LegalPage = {
  slug: string;
  eyebrow: string | null;
  title: string | null;
  intro: string | null;
  last_reviewed_at: string;
  updated_at: string;
};

export type PageSeo = {
  slug: string;
  title: string;
  description: string;
  keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  html_body: string;
  available_variables: EmailTemplateVariable[] | null;
  enabled: boolean;
  updated_at: string;
};
