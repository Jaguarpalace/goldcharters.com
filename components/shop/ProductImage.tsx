import type { Product } from '@/types/database';

/**
 * Fallback "jewellery box" tile used when no Supabase image_url is set.
 * Generates a deterministic gradient from the product id so each tile looks distinct.
 */
function gradientFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 30 + 35; // 35-65: warm/gold range
  return `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${hue + 8} 60% 30%), hsl(${hue + 14} 80% 40%))`;
}

export function ProductImage({
  product,
  className = '',
  imageUrl,
}: {
  product: Product;
  className?: string;
  imageUrl?: string | null;
}) {
  const url = imageUrl ?? product.main_image_url;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={product.title} className={className} loading="lazy" />;
  }

  return (
    <div
      className={className}
      style={{
        background: gradientFromId(product.id),
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label={product.title}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 40% at 50% 30%, rgba(255,215,0,0.25), transparent 60%), radial-gradient(50% 30% at 50% 90%, rgba(5,5,5,0.6), transparent 60%)',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'conic-gradient(from 200deg, #A67C00, #D4AF37, #FFD700, #D4AF37, #B8860B, #A67C00)',
          mask: 'radial-gradient(circle, transparent 45%, #000 47%, #000 53%, transparent 55%)',
          WebkitMask:
            'radial-gradient(circle, transparent 45%, #000 47%, #000 53%, transparent 55%)',
          opacity: 0.95,
        }}
      />
      <div className="absolute left-1/2 top-[42%] h-2 w-2 -translate-x-1/2 rotate-45 bg-white shadow-[0_0_16px_4px_rgba(255,255,255,0.6)]" />
    </div>
  );
}
