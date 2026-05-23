/**
 * Shown automatically by Next.js while a server component is fetching data.
 * Matches the dark theme so the page never flashes white.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden
          className="relative inline-flex h-10 w-10 items-center justify-center"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, #A67C00 0deg, #FFD700 180deg, transparent 270deg)',
              animation: 'spin 1.2s linear infinite',
              mask: 'radial-gradient(circle, transparent 55%, #000 57%)',
              WebkitMask: 'radial-gradient(circle, transparent 55%, #000 57%)',
            }}
          />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Loading
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
