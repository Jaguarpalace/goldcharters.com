import { getServerSupabase } from '@/lib/supabase/server';
import {
  mockProductCategories,
  mockProductImages,
  mockProducts,
} from '@/lib/mock-data';
import type {
  Product,
  ProductCategory,
  ProductImage,
} from '@/types/database';
import type { ProductWithGallery } from '@/types/cart';

const PUBLIC_STATUSES: Product['status'][] = ['active', 'reserved', 'sold', 'out_of_stock'];

export async function getProducts(opts?: {
  featuredOnly?: boolean;
  limit?: number;
}): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    let products = mockProducts().filter(
      (p) => p.visible && PUBLIC_STATUSES.includes(p.status),
    );
    if (opts?.featuredOnly) products = products.filter((p) => p.featured);
    if (opts?.limit) products = products.slice(0, opts.limit);
    return products;
  }

  let query = supabase
    .from('products')
    .select('*')
    .eq('visible', true)
    .in('status', PUBLIC_STATUSES)
    .order('created_at', { ascending: false });

  if (opts?.featuredOnly) query = query.eq('featured', true);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error || !data) return mockProducts();
  return data as Product[];
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockProductCategories();

  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockProductCategories();
  return data as ProductCategory[];
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductWithGallery | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const product = mockProducts().find((p) => p.slug === slug);
    if (!product) return null;
    const gallery = mockProductImages().filter((img) => img.product_id === product.id);
    return { ...product, gallery };
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('visible', true)
    .maybeSingle();

  if (error || !product) return null;

  const { data: gallery } = await supabase
    .from('product_images')
    .select('id, image_url, alt_text, display_order')
    .eq('product_id', product.id)
    .order('display_order', { ascending: true });

  return {
    ...(product as Product),
    gallery: (gallery ?? []) as ProductImage[],
  };
}
