/**
 * IndexNow: tell Bing (and Yandex, Seznam, Naver) the moment a page changes,
 * instead of waiting for their crawler to come round on its own schedule.
 *
 * Google does NOT support IndexNow, so this affects Bing-family engines only.
 * It changes crawl speed, never rankings. The main practical wins are new
 * blog posts and new location pages appearing in Bing within minutes, and
 * staying fresh in the index that feeds Microsoft Copilot.
 *
 * The key is a public verification token, not a secret: anyone can read it at
 * https://chartersgold.co.uk/<key>.txt. That file MUST exist and MUST contain
 * exactly this string, or every submission is rejected with 403.
 *
 *   Key constant below  <->  public/7701a60d8cd196d09a41cbb3868fb131.txt
 *
 * Change one and you must change the other.
 */

export const INDEXNOW_KEY = '7701a60d8cd196d09a41cbb3868fb131';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

/** Only the live site may submit; a dev/preview host would be rejected anyway. */
function productionHost(): string | null {
  try {
    const host = new URL(SITE_URL).host;
    return host === 'chartersgold.co.uk' ? host : null;
  } catch {
    return null;
  }
}

/**
 * Submit up to 10,000 URLs. Fire-and-forget by design: a search-engine ping
 * must never break an admin save, so every failure is swallowed and logged.
 *
 * Returns the HTTP status when it got that far, or null when it did not run.
 */
export async function pingIndexNow(urls: string[]): Promise<number | null> {
  const host = productionHost();
  if (!host) return null;

  // Keep only absolute URLs on our own host; IndexNow rejects the whole batch
  // with 422 if a single URL belongs somewhere else.
  const urlList = Array.from(
    new Set(
      urls
        .map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? u : `/${u}`}`))
        .filter((u) => {
          try {
            return new URL(u).host === host;
          } catch {
            return false;
          }
        }),
    ),
  ).slice(0, 10000);

  if (urlList.length === 0) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      // Never let a slow endpoint hold up an admin save.
      signal: AbortSignal.timeout(5000),
    });

    // 200 accepted, 202 accepted but key still being validated. Both are fine.
    if (res.status !== 200 && res.status !== 202) {
      console.error('[indexnow] rejected', res.status, await res.text().catch(() => ''));
    }
    return res.status;
  } catch (err) {
    console.error('[indexnow] ping failed', err);
    return null;
  }
}
