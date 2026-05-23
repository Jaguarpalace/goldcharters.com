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
  | 'completed'
  | 'rejected';

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
  created_at: string;
  updated_at: string;
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
