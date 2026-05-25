'use client';

import { useState, type ReactNode } from 'react';

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
 *
 * Server-rendered document content is passed in as `children`.
 */
export function PrintShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('classic');

  return (
    <div className={`print-page theme-${theme}`}>
      <style>{PRINT_CSS}</style>

      {/* On-screen only — hidden by print rules below */}
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
        <button type="button" className="print-btn print-btn-ghost" onClick={() => window.close()}>
          Close
        </button>
        <button type="button" className="print-btn print-btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {children}
    </div>
  );
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
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    min-height: 100vh;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-sheet {
    max-width: 720px;
    margin: 0 auto;
    /* These act as the visible margin between paper edge and content. Bigger
       than typical screen padding so the printed document doesn't feel
       cramped against the paper edge. */
    padding: 22mm 18mm 28mm;
  }

  /* ---------- Layout primitives (theme-neutral) ---------- */
  .print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    border-bottom-width: 2px;
    border-bottom-style: solid;
    padding-bottom: 16px;
  }
  .print-logo { width: 96px; height: 96px; object-fit: contain; }
  .print-brand { text-align: right; }
  .print-brand h1 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0;
  }
  .print-brand p { margin: 4px 0 0; font-size: 11px; }

  .print-doc-title { font-size: 22px; font-weight: 700; margin: 28px 0 4px; }
  .print-doc-sub { font-size: 12px; margin: 0 0 24px; }

  .print-section { margin-top: 22px; }
  .print-section h2 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    padding-bottom: 4px;
    margin: 0 0 10px;
  }

  .print-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
    row-gap: 8px;
  }
  .print-field { display: flex; flex-direction: column; }
  .print-field span {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  .print-field strong { font-size: 13px; font-weight: 600; }

  .print-disclaimer { white-space: pre-wrap; font-size: 11.5px; }

  .print-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    margin-top: 36px;
  }
  .print-sig-block {
    border-top-width: 1px;
    border-top-style: solid;
    padding-top: 8px;
  }
  .print-sig-block .label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }
  .print-sig-block .name { font-size: 12px; font-weight: 600; margin-top: 4px; }
  .print-sig-line { display: inline-block; width: 100%; min-height: 28px; }

  .print-foot {
    margin-top: 36px;
    padding-top: 12px;
    border-top-width: 1px;
    border-top-style: solid;
    font-size: 10px;
    text-align: center;
  }

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
