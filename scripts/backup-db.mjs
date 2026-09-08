#!/usr/bin/env node
/**
 * Export every table in the public schema to JSON.
 *
 * Runs locally with the service-role key from .env.local (never deploy this).
 * Discovers the table list from PostgREST's OpenAPI document, so new tables
 * are picked up without editing this file.
 *
 *   node scripts/backup-db.mjs                    # -> ../goldcharters_db_backups/<date>_<label>/
 *   node scripts/backup-db.mjs pre-split          # label the folder
 *   node scripts/backup-db.mjs pre-split --out D:/somewhere
 *
 * One file per table plus _manifest.json with row counts. Storage buckets are
 * not included - those are files, not rows.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith('--')) ?? 'manual';
const outFlag = args.indexOf('--out');
const outRoot =
  outFlag !== -1 && args[outFlag + 1]
    ? resolve(args[outFlag + 1])
    : resolve(process.cwd(), '..', 'goldcharters_db_backups');

// Minimal .env.local loader (no dependency on dotenv).
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const PAGE = 1000;

async function listTables() {
  const res = await fetch(`${url}/rest/v1/`, { headers });
  if (!res.ok) throw new Error(`OpenAPI fetch failed: ${res.status} ${await res.text()}`);
  const doc = await res.json();
  // PostgREST lists every exposed table/view under definitions; paths carry the
  // same names. Views come through too, which is fine for a snapshot.
  return Object.keys(doc.definitions ?? {}).sort();
}

async function dumpTable(name) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${name}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, Prefer: 'count=exact' },
    });
    if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return rows;
}

const stamp = new Date().toISOString().slice(0, 10);
const outDir = join(outRoot, `${stamp}_${label}`);
mkdirSync(outDir, { recursive: true });

const tables = await listTables();
const manifest = { exported_at: new Date().toISOString(), label, tables: {} };
let total = 0;

for (const t of tables) {
  try {
    const rows = await dumpTable(t);
    writeFileSync(join(outDir, `${t}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[t] = rows.length;
    total += rows.length;
    console.log(`${t.padEnd(32)} ${String(rows.length).padStart(6)} rows`);
  } catch (err) {
    manifest.tables[t] = `ERROR: ${err.message}`;
    console.error(`${t.padEnd(32)} FAILED: ${err.message}`);
  }
}

writeFileSync(join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${tables.length} tables, ${total} rows -> ${outDir}`);
