'use server';

import { requireAdminContext } from './_helpers';

/**
 * Unified result row for the Cmd+K palette. Every searchable entity maps
 * its native shape onto this so the client component renders identically
 * regardless of where the hit came from.
 */
export type SearchHit = {
  entity: 'customer' | 'valuation_request' | 'stock_item' | 'buyer' | 'sale' | 'blog_post' | 'product';
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  meta?: string;
};

/**
 * Run a cross-entity search across the five tables the admin most often
 * needs to jump to by name / email / stock number. Returns at most 8
 * hits per entity to keep the dropdown legible.
 */
export async function globalSearch(rawQuery: string): Promise<SearchHit[]> {
  const query = (rawQuery ?? '').trim();
  if (query.length < 2) return [];

  const ctx = await requireAdminContext();
  if ('error' in ctx) return [];
  const esc = (s: string) => s.replace(/[%_]/g, (m) => `\\${m}`);
  const pat = `%${esc(query)}%`;
  // Stock numbers are stored as CG-000123 but get typed as "CG000123" or
  // "123" - match all three forms.
  const codeMatch = query.match(/^(?:cg-?)?(\d{1,6})$/i);
  const stockPat = codeMatch
    ? `%CG-%${codeMatch[1]}%`
    : pat;
  const invoiceMatch = query.match(/^(?:inv-?)?(\d{1,5})$/i);
  const invoicePat = invoiceMatch ? `%INV-%${invoiceMatch[1]}%` : pat;

  const [customersRes, requestsRes, holdingsRes, buyersRes, salesRes, blogRes, productsRes] = await Promise.all([
    // Customers — name or email (active rows only)
    ctx.admin
      .from('customers')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.${pat},last_name.ilike.${pat},email.ilike.${pat}`)
      .is('deleted_at', null)
      .limit(8),
    // Valuation requests — name, email, brand, model (active rows only)
    ctx.admin
      .from('valuation_requests')
      .select('id, first_name, last_name, email, brand, model, status')
      .or(
        `first_name.ilike.${pat},last_name.ilike.${pat},email.ilike.${pat},brand.ilike.${pat},model.ilike.${pat}`,
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
    // Stock items — stock number or description (active rows only)
    ctx.admin
      .from('stock_items')
      .select('id, stock_number, metal_type, carat, description, status')
      .or(`stock_number.ilike.${stockPat},description.ilike.${pat}`)
      .is('deleted_at', null)
      .order('acquired_at', { ascending: false })
      .limit(8),
    // Buyers — name, contact or email
    ctx.admin
      .from('buyers')
      .select('id, name, contact_name, email, kind')
      .or(`name.ilike.${pat},contact_name.ilike.${pat},email.ilike.${pat}`)
      .is('deleted_at', null)
      .limit(8),
    // Sales — invoice number, or the buyer's name (two steps: PostgREST
    // can't OR across the parent row and an embedded table in one filter)
    (async () => {
      const { data: byBuyer } = await ctx.admin
        .from('buyers')
        .select('id')
        .ilike('name', pat)
        .limit(20);
      const buyerIds = ((byBuyer ?? []) as { id: string }[]).map((b) => b.id);
      const orParts = [`invoice_number.ilike.${invoicePat}`];
      if (buyerIds.length > 0) orParts.push(`buyer_id.in.(${buyerIds.join(',')})`);
      return ctx.admin
        .from('sales')
        .select('id, invoice_number, sold_at, total_gbp, voided_at, buyer:buyers(name)')
        .or(orParts.join(','))
        .order('sold_at', { ascending: false })
        .limit(8);
    })(),
    // Blog posts — title or slug
    ctx.admin
      .from('blog_posts')
      .select('id, title, slug, published')
      .or(`title.ilike.${pat},slug.ilike.${pat}`)
      .limit(8),
    // Products — title or SKU. Best-effort: if BUY_ENABLED is off this
    // table still exists but it's harmless to query.
    ctx.admin
      .from('products')
      .select('id, title, slug, sku, status')
      .or(`title.ilike.${pat},sku.ilike.${pat},slug.ilike.${pat}`)
      .limit(8),
  ]);

  const hits: SearchHit[] = [];

  for (const c of (customersRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>) {
    hits.push({
      entity: 'customer',
      id: c.id,
      href: `/admin/customers/${c.id}`,
      title: `${c.first_name} ${c.last_name}`.trim(),
      subtitle: c.email,
      meta: 'Customer',
    });
  }

  for (const r of (requestsRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    brand: string | null;
    model: string | null;
    status: string;
  }>) {
    const piece = [r.brand, r.model].filter(Boolean).join(' ');
    hits.push({
      entity: 'valuation_request',
      id: r.id,
      href: `/admin/valuation-requests`,
      title: `${r.first_name} ${r.last_name}`.trim() || r.email,
      subtitle: piece || r.email,
      meta: `Valuation · ${r.status}`,
    });
  }

  for (const s of (holdingsRes.data ?? []) as Array<{
    id: string;
    stock_number: string;
    metal_type: string | null;
    carat: string | null;
    description: string | null;
    status: string;
  }>) {
    hits.push({
      entity: 'stock_item',
      id: s.id,
      href: `/admin/holdings/${s.id}`,
      title: s.stock_number,
      subtitle:
        [s.metal_type, s.carat, s.description].filter(Boolean).join(' · ') || undefined,
      meta: `Holding · ${s.status}`,
    });
  }

  for (const b of (buyersRes.data ?? []) as Array<{
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    kind: string;
  }>) {
    hits.push({
      entity: 'buyer',
      id: b.id,
      href: `/admin/buyers/${b.id}`,
      title: b.name,
      subtitle: [b.contact_name, b.email].filter(Boolean).join(' · ') || undefined,
      meta: `Buyer · ${b.kind}`,
    });
  }

  for (const s of (salesRes.data ?? []) as Array<{
    id: string;
    invoice_number: string;
    sold_at: string;
    total_gbp: number;
    voided_at: string | null;
    buyer: { name: string } | { name: string }[] | null;
  }>) {
    const buyerName = Array.isArray(s.buyer) ? s.buyer[0]?.name : s.buyer?.name;
    hits.push({
      entity: 'sale',
      id: s.id,
      href: `/admin/sales/${s.id}`,
      title: s.invoice_number,
      subtitle: `${buyerName ?? 'Unknown buyer'} · £${Number(s.total_gbp).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      meta: s.voided_at ? 'Invoice · voided' : `Invoice · ${new Date(s.sold_at).toLocaleDateString('en-GB')}`,
    });
  }

  for (const p of (blogRes.data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    published: boolean;
  }>) {
    hits.push({
      entity: 'blog_post',
      id: p.id,
      href: `/admin/blog/${p.id}`,
      title: p.title,
      subtitle: `/blog/${p.slug}`,
      meta: p.published ? 'Blog · published' : 'Blog · draft',
    });
  }

  for (const p of (productsRes.data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    sku: string | null;
    status: string;
  }>) {
    hits.push({
      entity: 'product',
      id: p.id,
      href: `/admin/products/${p.id}`,
      title: p.title,
      subtitle: p.sku ? `SKU ${p.sku}` : `/shop/${p.slug}`,
      meta: `Product · ${p.status}`,
    });
  }

  return hits;
}
