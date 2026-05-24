import 'server-only';
import { Resend } from 'resend';

/**
 * SERVER-ONLY Resend client. Lazy-initialised so a missing API key in dev
 * doesn't crash the build — instead, send functions return a no-op and the
 * caller can decide whether to fail or warn.
 */
let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Parse the comma-separated env var into an array of recipients. */
export function getAdminRecipients(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL ?? '';
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

/** The "From" address used on all outbound emails. Must be a verified domain in Resend. */
export function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    'Charters Gold <notifications@chartersgold.co.uk>'
  );
}
