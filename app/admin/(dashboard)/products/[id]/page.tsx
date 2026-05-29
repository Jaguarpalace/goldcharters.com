import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { mockProducts } from '@/lib/mock-data';
import { ProductEditor } from './ProductEditor';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

async function loadProduct(id: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return mockProducts().find((p) => p.id === id) ?? null;
  }
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  return (data as Product) ?? null;
}

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
  const product = await loadProduct(params.id);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Edit Product</span>
        <h1 className="font-display text-2xl text-white mt-2">{product.title}</h1>
        <p className="mt-2 text-sm text-warmgrey">Status: {product.status} · SKU {product.sku ?? '—'}</p>
      </header>

      <ProductEditor mode="edit" product={product} />
    </div>
  );
}
