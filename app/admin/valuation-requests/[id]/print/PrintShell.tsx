'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'classic' | 'blackgold';

/**
 * Client wrapper around the printable Purchase Confirmation document.
 *
 * Owns:
 *   - The theme toggle (Classic ↔ Black Gold) — local state, fresh per print
 *   - The sticky on-screen action bar (Theme, Print, Close) — hidden when
 *     the browser actually prints
 *   - All print-related CSS, scoped by `.theme-classic` / `.theme-blackgold`
 *     so swapping is just a class change
 *   - Fitting the document onto one A4 side (see fitSheetToPage)
 *
 * Server-rendered document content is passed in as `children`.
 */
export function PrintShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('classic');
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => fitSheetToPage(root);
    fit();
    // Measure again once the brand font has loaded, and right before printing.
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener('beforeprint', fit);
    return () => window.removeEventListener('beforeprint', fit);
  }, []);

  return (
    <div ref={rootRef} className={`print-page theme-${theme}`}>
      {/* Injected as markup, not a text node: the CSS contains quotes and
          apostrophes that the server HTML-escapes inside <style>, which made
          React's hydration diff flag a false mismatch in dev. */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* On-screen only - hidden by print rules below */}
      <div className="print-actions">
        <div className="print-theme-toggle" role="group" aria-label="Document theme">
          <button
            type="button"
            onClick={() => setTheme('classic')}
            className={theme === 'classic' ? 'is-active' : ''}
            aria-pressed={theme === 'classic'}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => setTheme('blackgold')}
            className={theme === 'blackgold' ? 'is-active' : ''}
            aria-pressed={theme === 'blackgold'}
          >
            Black Gold
          </button>
        </div>
        <button
          type="button"
          className="print-btn print-btn-ghost"
          onClick={() => {
            // window.close() only works for script-opened tabs; navigating
            // here normally leaves it powerless. Go back to the admin instead.
            if (window.history.length > 1) window.history.back();
            else window.location.href = '/admin/valuation-requests';
          }}
        >
          Back to admin
        </button>
        <button type="button" className="print-btn print-btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {children}
    </div>
  );
}

/* ------------------------------------------------- Fit to one A4 side ---- */
/*
 * A purchase with three, four or five items used to push the signatures and
 * the footnote onto a second page. Before showing and before printing, the
 * sheet is measured at its printed width: if it is taller than one A4 side,
 * the spacing closes up first (--sp), then the type comes down a little
 * (--fs), one step at a time, until it fits. The last step keeps the
 * disclaimer at about 9px. If even that cannot fit (a very long list), the
 * document goes back to full size and runs onto a second page as before.
 */
const FIT_STEPS: ReadonlyArray<readonly [space: number, type: number]> = [
  [1, 1],
  [0.85, 1],
  [0.7, 1],
  [0.6, 0.97],
  [0.5, 0.94],
  [0.45, 0.91],
  [0.4, 0.88],
  [0.35, 0.86],
];

function fitSheetToPage(root: HTMLElement) {
  const sheet = root.querySelector<HTMLElement>('.print-sheet');
  if (!sheet) return;

  // One A4 side in CSS pixels, measured rather than assumed.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:1px;height:297mm;';
  document.body.appendChild(probe);
  const pageHeight = probe.getBoundingClientRect().height;
  probe.remove();

  // Measure at the printed width, whatever the size of the window.
  const width = sheet.style.width;
  const maxWidth = sheet.style.maxWidth;
  sheet.style.width = '210mm';
  sheet.style.maxWidth = 'none';

  const apply = ([space, type]: readonly [number, number]) => {
    root.style.setProperty('--sp', String(space));
    root.style.setProperty('--fs', String(type));
  };
  // The sheet is at least one A4 side tall (min-height), so it only grows
  // past that height when its content runs over.
  const fits = () => sheet.getBoundingClientRect().height <= pageHeight + 0.5;

  let chosen = FIT_STEPS[0];
  for (const step of FIT_STEPS) {
    apply(step);
    chosen = step;
    if (fits()) break;
  }
  if (!fits()) {
    chosen = FIT_STEPS[0];
    apply(chosen);
  }

  sheet.style.width = width;
  sheet.style.maxWidth = maxWidth;
  root.dataset.fit = chosen.join(' / ');
}

/* -------------------------------------------------------- Stylesheet ----- */
/*
 * Both themes are declared side by side. The wrapper className decides which
 * is active. `print-color-adjust: exact` forces background colour fidelity
 * when the Black Gold theme is sent to a printer (browsers strip dark
 * backgrounds by default to save ink, which is exactly what we don't want
 * here).
 */
const PRINT_CSS = `
  /* No @page margin — the page background needs to bleed to the very edge of
     the paper. The visible "margin" lives inside .print-sheet so the dark
     theme prints as a full-bleed gilt document, not a coloured rectangle on
     a white border. */
  @page { size: A4; margin: 0; }

  .print-page {
    /* The site's self-hosted Manrope (next/font sets --font-manrope on
       <html>), so the document prints in the brand face on every machine -
       naming 'Manrope' alone only worked where the font happened to be
       installed, which is why one PC printed in a fallback. */
    font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
    /* Fit-to-page scales, set by fitSheetToPage: --sp spacing, --fs type. */
    --sp: 1;
    --fs: 1;
    font-size: calc(12.5px * var(--fs));
    line-height: calc(1.3 + 0.15 * var(--sp));
    min-height: 100vh;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-sheet {
    max-width: 210mm;
    /* One A4 side, edge to edge: the sheet is the page, so the footnote
       sits at the foot of the paper and nothing else shows beneath it. */
    min-height: 297mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    /* These act as the visible margin between paper edge and content. Bigger
       than typical screen padding so the printed document doesn't feel
       cramped against the paper edge. */
    padding: max(9mm, calc(14mm * var(--sp))) 16mm max(8mm, calc(12mm * var(--sp)));
  }

  /* ---------- Layout primitives (theme-neutral) ---------- */
  .print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    border-bottom-width: 2px;
    border-bottom-style: solid;
    padding-bottom: calc(10px * var(--sp));
  }
  .print-logo { width: calc(56px + 16px * var(--sp)); height: calc(56px + 16px * var(--sp)); object-fit: contain; }
  .print-brand { text-align: right; }
  .print-brand h1 {
    font-size: calc(21px * var(--fs));
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0;
  }
  .print-brand p { margin: calc(5px * var(--sp)) 0 0; font-size: calc(12px * var(--fs)); }

  .print-doc-title { font-size: calc(22px * var(--fs)); font-weight: 700; margin: calc(16px * var(--sp)) 0 calc(3px * var(--sp)); }
  .print-doc-sub { font-size: calc(12px * var(--fs)); margin: 0 0 calc(14px * var(--sp)); }

  .print-section { margin-top: calc(16px * var(--sp)); }
  .print-section h2 {
    font-size: calc(12px * var(--fs));
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    padding-bottom: calc(4px * var(--sp));
    margin: 0 0 calc(9px * var(--sp));
  }

  .print-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
    row-gap: calc(7px * var(--sp));
  }
  .print-field { display: flex; flex-direction: column; }
  .print-field span {
    font-size: calc(9.5px * var(--fs));
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  .print-field strong { font-size: calc(13px * var(--fs)); font-weight: 600; }

  .print-disclaimer { white-space: pre-wrap; font-size: calc(10.5px * var(--fs)); line-height: calc(1.3 + 0.15 * var(--sp)); }

  /* Itemised purchase lines */
  .print-items { width: 100%; border-collapse: collapse; font-size: calc(12px * var(--fs)); }
  .print-items th {
    text-align: left;
    font-size: calc(9.5px * var(--fs));
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 600;
    padding: max(2px, calc(5px * var(--sp))) 8px max(2px, calc(5px * var(--sp))) 0;
    border-bottom: 1px solid rgba(128, 128, 128, 0.55);
  }
  .print-items td {
    padding: max(2.5px, calc(6px * var(--sp))) 8px max(2.5px, calc(6px * var(--sp))) 0;
    border-bottom: 1px solid rgba(128, 128, 128, 0.3);
    vertical-align: top;
  }
  .print-items .num { text-align: right; white-space: nowrap; }
  .print-items tfoot td {
    border-bottom: none;
    border-top: 2px solid rgba(128, 128, 128, 0.55);
    font-weight: 700;
    padding-top: max(4px, calc(8px * var(--sp)));
  }
  .print-items .muted { font-size: calc(11.5px * var(--fs)); opacity: 0.75; }

  .print-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: calc(26px * var(--sp));
  }
  .print-sig-block {
    border-top-width: 1px;
    border-top-style: solid;
    padding-top: calc(9px * var(--sp));
  }
  .print-sig-block .label {
    font-size: calc(10px * var(--fs));
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  .print-sig-block .name { font-size: calc(13.5px * var(--fs)); font-weight: 600; margin-top: calc(5px * var(--sp)); }
  .print-sig-line { display: inline-block; width: 100%; min-height: max(18px, calc(26px * var(--sp))); }

  .print-foot {
    /* Pushed to the foot of the sheet by the flex column, never closer than
       36px to the signatures. */
    margin-top: auto;
    padding-top: calc(10px * var(--sp));
    border-top-width: 1px;
    border-top-style: solid;
    font-size: calc(9.5px * var(--fs));
    text-align: center;
  }
  .print-signatures { margin-bottom: max(14px, calc(36px * var(--sp))); }

  /* ---------- Classic (white + black + gold accent) ---------- */
  .print-page.theme-classic { background: #ffffff; color: #111111; }
  .theme-classic .print-header { border-bottom-color: #b8860b; }
  .theme-classic .print-brand h1 { color: #b8860b; }
  .theme-classic .print-brand p { color: #555; }
  .theme-classic .print-doc-title { color: #111; }
  .theme-classic .print-doc-sub { color: #555; }
  .theme-classic .print-section h2 { color: #b8860b; border-bottom-color: #e6dcc1; }
  .theme-classic .print-field span { color: #999; }
  .theme-classic .print-field strong { color: #111; }
  .theme-classic .print-disclaimer { color: #1a1a1a; }
  .theme-classic .print-sig-block { border-top-color: #111; }
  .theme-classic .print-sig-block .label { color: #777; }
  .theme-classic .print-sig-block .name { color: #111; }
  .theme-classic .print-foot { color: #777; border-top-color: #e6dcc1; }

  /* ---------- Black Gold (dark luxe) ---------- */
  .print-page.theme-blackgold { background: #0a0a0a; color: #e8dca8; }
  .theme-blackgold .print-header { border-bottom-color: #d4af37; }
  .theme-blackgold .print-logo {
    /* Logos shipped on dark backgrounds usually carry their own glow.
       A soft gold drop-shadow lifts the crest off the page nicely. */
    filter: drop-shadow(0 0 6px rgba(212,175,55,0.35));
  }
  .theme-blackgold .print-brand h1 {
    /* Gold gradient title — same treatment as the public hero. */
    background: linear-gradient(135deg, #a67c00 0%, #d4af37 35%, #ffd700 55%, #d4af37 75%, #b8860b 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .theme-blackgold .print-brand p { color: rgba(232,220,168,0.7); }
  .theme-blackgold .print-doc-title {
    background: linear-gradient(135deg, #a67c00 0%, #d4af37 35%, #ffd700 55%, #d4af37 75%, #b8860b 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .theme-blackgold .print-doc-sub { color: rgba(232,220,168,0.7); }
  .theme-blackgold .print-section h2 {
    color: #f5d96a;
    border-bottom-color: rgba(212,175,55,0.35);
  }
  .theme-blackgold .print-field span { color: rgba(232,220,168,0.55); }
  .theme-blackgold .print-field strong { color: #fff5d6; }
  .theme-blackgold .print-disclaimer { color: #f0e4b8; }
  .theme-blackgold .print-sig-block { border-top-color: #d4af37; }
  .theme-blackgold .print-sig-block .label { color: rgba(232,220,168,0.6); }
  .theme-blackgold .print-sig-block .name { color: #fff5d6; }
  .theme-blackgold .print-foot { color: rgba(232,220,168,0.55); border-top-color: rgba(212,175,55,0.25); }

  /* ---------- Sticky action bar (screen only) ---------- */
  .print-actions {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    background: #f6f3eb;
    border-bottom: 1px solid #e6dcc1;
    padding: 10px 24px;
  }
  .theme-blackgold .print-actions {
    background: #181410;
    border-bottom: 1px solid rgba(212,175,55,0.3);
  }

  .print-theme-toggle {
    display: inline-flex;
    border: 1px solid rgba(184,134,11,0.35);
    border-radius: 4px;
    overflow: hidden;
    margin-right: auto;
  }
  .print-theme-toggle button {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 6px 14px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b6453;
    cursor: pointer;
  }
  .theme-blackgold .print-theme-toggle button { color: rgba(232,220,168,0.7); }
  .print-theme-toggle button.is-active {
    background: linear-gradient(135deg, #FFD700, #B8860B);
    color: #1a1a1a;
    font-weight: 700;
  }

  .print-btn {
    appearance: none;
    border-radius: 4px;
    padding: 6px 18px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    border: 1px solid;
  }
  .print-btn-ghost {
    color: #666;
    background: transparent;
    border-color: #d6cda5;
  }
  .theme-blackgold .print-btn-ghost {
    color: rgba(232,220,168,0.7);
    border-color: rgba(212,175,55,0.35);
  }
  .print-btn-primary {
    color: #1a1a1a;
    background: linear-gradient(135deg, #FFD700, #B8860B);
    border-color: #b8860b;
    font-weight: 700;
  }

  /* ---------- Print rules — kill the action bar and lock colours ---------- */
  @media print {
    /* Zero out the browser/body chrome so .print-page can paint the entire
       paper. Without this, html/body's default white shows through and the
       dark theme prints with a stubborn white frame. */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }
    .print-actions { display: none !important; }
    .print-page {
      min-height: 0 !important;
    }
    .print-page.theme-classic { background: #ffffff !important; }
    .print-page.theme-blackgold { background: #0a0a0a !important; }
  }
`;
