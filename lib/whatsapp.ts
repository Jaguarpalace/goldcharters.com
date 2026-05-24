/**
 * Shared helpers for building `wa.me` click-to-chat links.
 *
 * Used by:
 *  - The floating WhatsApp pill (desktop)
 *  - The mobile header WhatsApp icon button
 *
 * The pre-filled message is context-aware to the current pathname, so a
 * customer on /sell-watches lands in a WhatsApp chat with "I'd like a
 * valuation for a watch" already typed.
 */

type MessageRule = { match: (pathname: string) => boolean; message: string };

const MESSAGE_RULES: MessageRule[] = [
  {
    match: (p) => p.startsWith('/sell-watches'),
    message: "Hi Charters Gold, I'd like a valuation for a watch.",
  },
  {
    match: (p) => p.startsWith('/sell-handbags'),
    message: "Hi Charters Gold, I'd like a valuation for a designer handbag.",
  },
  {
    match: (p) => p.startsWith('/sell-jewellery'),
    message: "Hi Charters Gold, I'd like a valuation for a piece of jewellery.",
  },
  {
    match: (p) => p.startsWith('/sell-gold'),
    message: "Hi Charters Gold, I'd like a valuation for some gold.",
  },
  {
    match: (p) => p.startsWith('/gold-calculator'),
    message: "Hi Charters Gold, I have some gold I'd like valued — could you help?",
  },
  {
    match: (p) => p.startsWith('/contact'),
    message: 'Hi Charters Gold, I have a question about your service.',
  },
  {
    match: (p) => p.startsWith('/blog'),
    message: "Hi Charters Gold, I just read one of your articles and have a question.",
  },
  {
    match: (p) => p.startsWith('/locations/'),
    message: "Hi Charters Gold, I'd like a private valuation — I'm based in this area.",
  },
];

const DEFAULT_MESSAGE =
  "Hi Charters Gold, I'd like a private valuation. Could you help?";

export function buildWhatsappMessage(pathname: string): string {
  return MESSAGE_RULES.find((r) => r.match(pathname))?.message ?? DEFAULT_MESSAGE;
}

/**
 * Returns a ready-to-use `wa.me` link or `null` if `whatsapp` is empty / not
 * a valid number. Strips spaces, dashes, +, etc. before assembling.
 */
export function buildWhatsappUrl(
  whatsapp: string | null | undefined,
  pathname: string,
): string | null {
  if (!whatsapp) return null;
  const phone = whatsapp.replace(/\D+/g, '');
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsappMessage(pathname))}`;
}
