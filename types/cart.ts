import type { Product } from './database';

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  maxQuantity: number; // products with quantity 1 stay capped at 1
  sku: string | null;
};

export type CartSnapshot = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

export type ProductWithGallery = Product & {
  gallery: { id: string; image_url: string; alt_text: string | null }[];
};
