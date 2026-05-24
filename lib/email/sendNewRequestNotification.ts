import 'server-only';
import type { ValuationRequest } from '@/types/database';
import { getAdminRecipients, getFromAddress, getResend, isEmailConfigured } from './client';
import { newRequestHtml, newRequestSubject } from './templates';

/**
 * Send the new-request notification to all configured admin recipients.
 *
 * Fail-soft: any error (no API key, Resend outage, invalid recipients) is
 * logged but does not throw. The customer's form submission must never fail
 * because the email service is having a bad day.
 */
export async function sendNewRequestNotification(
  request: ValuationRequest,
  photoCount = 0,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!isEmailConfigured()) {
    console.info('[email:new-request] Skipped — RESEND_API_KEY not set');
    return { ok: false, skipped: true };
  }

  const recipients = getAdminRecipients();
  if (recipients.length === 0) {
    console.warn('[email:new-request] Skipped — ADMIN_NOTIFICATION_EMAIL empty or invalid');
    return { ok: false, skipped: true };
  }

  const resend = getResend();
  if (!resend) return { ok: false, skipped: true };

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      replyTo: request.email,
      subject: newRequestSubject(request),
      html: newRequestHtml(request, photoCount),
    });
    if (error) {
      console.error('[email:new-request] resend error', error);
      return { ok: false, error: error.message ?? 'unknown' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email:new-request] threw', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
