#!/usr/bin/env node
/**
 * Break-glass: remove two-factor authentication from an admin account.
 *
 * Use when a phone is lost and the account can no longer pass the 2FA step.
 * Runs locally with the service-role key from .env.local (never deploy this).
 *
 *   node scripts/reset-2fa.mjs someone@example.com          # list factors
 *   node scripts/reset-2fa.mjs someone@example.com --remove # remove them all
 *
 * After --remove, the account signs in with password only and can re-enable
 * 2FA from /admin/security with the new phone.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , email, flag] = process.argv;
if (!email) {
  console.error('Usage: node scripts/reset-2fa.mjs <email> [--remove]');
  process.exit(1);
}

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

const usersRes = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers });
const { users = [] } = await usersRes.json();
const user = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user with email ${email}`);
  process.exit(1);
}

const factorsRes = await fetch(`${url}/auth/v1/admin/users/${user.id}/factors`, { headers });
const factors = await factorsRes.json();
if (!Array.isArray(factors) || factors.length === 0) {
  console.log(`${email}: no 2FA factors enrolled - password-only sign-in already.`);
  process.exit(0);
}

console.log(`${email}: ${factors.length} factor(s)`);
for (const f of factors) console.log(`  ${f.id}  ${f.factor_type}  ${f.status}  ${f.friendly_name ?? ''}`);

if (flag !== '--remove') {
  console.log('\nRe-run with --remove to delete them and restore password-only sign-in.');
  process.exit(0);
}

for (const f of factors) {
  const del = await fetch(`${url}/auth/v1/admin/users/${user.id}/factors/${f.id}`, {
    method: 'DELETE',
    headers,
  });
  console.log(`  removed ${f.id}: HTTP ${del.status}`);
}
console.log(`\nDone. ${email} can now sign in with password only and re-enable 2FA from /admin/security.`);
