'use server';

import { requireAdminContext } from './_helpers';

/**
 * Postcode -> list of street addresses, for the admin address forms
 * (walk-in purchase, customer page, buyers).
 *
 * Provider: Ideal Postcodes (Royal Mail address file, pay per lookup). The
 * key lives only in the server env var IDEAL_POSTCODES_API_KEY; until it is
 * set the lookup answers `not_configured` and the forms work as before.
 * Admin-only, so nobody outside the admin can spend lookups.
 */

export type LookupAddress = {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  /** One-line version for the pick list. */
  label: string;
};

export type LookupResult =
  | { ok: true; data: { postcode: string; addresses: LookupAddress[] } }
  | { ok: false; error: 'not_configured' | 'not_found' | 'failed'; message: string };

const UK_POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/;

/** "rg1 2ab" / "RG12AB" -> "RG1 2AB". Null when it is not a full postcode. */
function normalisePostcode(raw: string): string | null {
  const pc = (raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!UK_POSTCODE.test(pc)) return null;
  return `${pc.slice(0, -3)} ${pc.slice(-3)}`;
}

/** Royal Mail post towns come in capitals: "MAIDENHEAD" -> "Maidenhead". */
function townCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/\bUpon\b/g, 'upon')
    .replace(/\bOn\b/g, 'on');
}

type IdealAddress = {
  line_1?: string;
  line_2?: string;
  line_3?: string;
  post_town?: string;
  postcode?: string;
};

export async function lookupPostcode(raw: string): Promise<LookupResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: 'failed', message: ctx.error };

  const postcode = normalisePostcode(raw);
  if (!postcode) {
    return { ok: false, error: 'not_found', message: 'That is not a full UK postcode.' };
  }

  const key = process.env.IDEAL_POSTCODES_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: 'not_configured',
      message: 'Address lookup is not switched on yet. Type the address in.',
    };
  }

  try {
    const res = await fetch(
      `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(
        postcode.replace(' ', ''),
      )}?api_key=${encodeURIComponent(key)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(6000) },
    );
    if (res.status === 404) {
      return { ok: false, error: 'not_found', message: `No addresses found for ${postcode}.` };
    }
    if (!res.ok) {
      // 401 bad key, 402 out of lookups, 429 too many. Never echo the key.
      console.error('[postcode-lookup] provider status', res.status);
      return {
        ok: false,
        error: 'failed',
        message:
          res.status === 402
            ? 'Address lookup has run out of credit. Type the address in.'
            : 'Address lookup is not working right now. Type the address in.',
      };
    }
    const body = (await res.json()) as { result?: IdealAddress[] };
    const addresses = (body.result ?? []).map((a) => {
      const line1 = (a.line_1 ?? '').trim();
      const line2 = [a.line_2, a.line_3].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
      const city = townCase((a.post_town ?? '').trim());
      const pc = (a.postcode ?? postcode).trim();
      return {
        line1,
        line2,
        city,
        postcode: pc,
        label: [line1, line2, city].filter(Boolean).join(', '),
      };
    });
    if (addresses.length === 0) {
      return { ok: false, error: 'not_found', message: `No addresses found for ${postcode}.` };
    }
    return { ok: true, data: { postcode, addresses } };
  } catch (err) {
    console.error('[postcode-lookup]', err instanceof Error ? err.message : err);
    return {
      ok: false,
      error: 'failed',
      message: 'Address lookup is not working right now. Type the address in.',
    };
  }
}
