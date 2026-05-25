'use client';

/**
 * Sticky action bar shown on screen above the printable sheet. Print rules
 * hide it via CSS so it never appears on paper.
 */
export function PrintActions() {
  return (
    <div className="print-actions">
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#666',
          background: 'transparent',
          border: '1px solid #d6cda5',
          padding: '6px 14px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#1a1a1a',
          background: 'linear-gradient(135deg, #FFD700, #B8860B)',
          border: '1px solid #b8860b',
          padding: '6px 18px',
          borderRadius: 4,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Print
      </button>
    </div>
  );
}
