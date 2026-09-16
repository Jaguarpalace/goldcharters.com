/**
 * Submit every public URL to IndexNow (Bing, Yandex, Seznam, Naver).
 *
 * Reads the live sitemap so it always matches exactly what is published, with
 * no dependency on the app's internals. Google ignores IndexNow, so this only
 * speeds up crawling on the Bing family.
 *
 * Use it for the first bulk submission, and after a batch of page edits that
 * did not go through the admin (location pages, terms, metadata rewrites).
 *
 *   node scripts/indexnow-submit.mjs
 *   node scripts/indexnow-submit.mjs --dry            # list URLs, submit nothing
 *   node scripts/indexnow-submit.mjs /locations/slough /blog   # just these
 */

const KEY = '7701a60d8cd196d09a41cbb3868fb131';
const SITE = 'https://chartersgold.co.uk';
const HOST = new URL(SITE).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const explicit = args.filter((a) => !a.startsWith('--'));

async function urlsFromSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  // Confirm the key file is live first. Without it every submission is a 403.
  const keyRes = await fetch(`${SITE}/${KEY}.txt`, { cache: 'no-store' });
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (keyBody !== KEY) {
    console.error(`Key file check FAILED: ${SITE}/${KEY}.txt returned ${keyRes.status} "${keyBody}"`);
    console.error('Deploy the key file before submitting, or IndexNow will reject everything.');
    // A dry run is still useful before the key is live, so only hard-stop a real submit.
    if (!dry) process.exit(1);
  } else {
    console.log(`Key file OK at ${SITE}/${KEY}.txt`);
  }

  const urlList = (
    explicit.length > 0
      ? explicit.map((p) => (p.startsWith('http') ? p : `${SITE}${p.startsWith('/') ? p : `/${p}`}`))
      : await urlsFromSitemap()
  ).filter((u) => {
    try {
      return new URL(u).host === HOST;
    } catch {
      return false;
    }
  });

  console.log(`${urlList.length} URL(s) to submit:`);
  for (const u of urlList) console.log('  ' + u);

  if (dry) {
    console.log('\n--dry set, nothing submitted.');
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  });

  const body = await res.text().catch(() => '');
  if (res.status === 200 || res.status === 202) {
    console.log(`\nAccepted (${res.status}). 202 means the key is still being validated, which is normal on the first run.`);
  } else {
    console.error(`\nRejected (${res.status}). ${body}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
