import 'server-only';
import { Resend } from 'resend';
import { getEnabledRecipientEmails } from '@/lib/queries/notificationRecipients';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolve who receives transactional admin alerts (new valuation requests,
 * etc.). Reads the admin-editable notification_recipients table first; only
 * falls back to the ADMIN_NOTIFICATION_EMAIL env var when the table is empty
 * or unavailable, so existing deployments keep working until the admin
 * populates the table from /admin/notifications.
 */
export async function getAdminRecipients(): Promise<string[]> {
  try {
    const fromDb = await getEnabledRecipientEmails();
    const valid = fromDb.filter((e) => EMAIL_RE.test(e));
    if (valid.length > 0) return valid;
  } catch (err) {
    console.warn('[email:recipients] DB read failed, falling back to env', err);
  }

  const raw = process.env.ADMIN_NOTIFICATION_EMAIL ?? '';
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter((email) => EMAIL_RE.test(email));
}

/** The "From" address used on all outbound emails. Must be a verified domain in Resend. */
export function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    'Charters Gold <notifications@chartersgold.co.uk>'
  );
}
