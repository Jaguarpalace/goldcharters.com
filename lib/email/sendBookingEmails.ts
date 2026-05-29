import 'server-only';
import type { Appointment, AppointmentEvent } from '@/types/database';
import { getAdminRecipients, getFromAddress, getResend, isEmailConfigured } from './client';
import { getSiteSettings } from '@/lib/queries/homepage';
import { formatSlotLong } from '@/lib/appointments/slots';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function locationLine(event: AppointmentEvent): string {
  return [event.venue_name, event.address].filter(Boolean).join(' · ') || event.city;
}

/**
 * Fire the customer confirmation + internal alert for a new booking.
 * Fully fail-soft: any error is logged, never thrown — a booking must always
 * succeed regardless of email status. No-ops cleanly when Resend isn't set up.
 */
export async function sendBookingEmails(
  appointment: Appointment,
  event: AppointmentEvent,
  photoCount = 0,
): Promise<void> {
  if (!isEmailConfigured()) {
    console.info('[email:booking] skipped - RESEND_API_KEY not set');
    return;
  }
  const resend = getResend();
  if (!resend) return;

  const settings = await getSiteSettings();
  const businessName = settings.business_name;
  const logoUrl = `${SITE_URL}/logo/charters_gold_true_transparent.png`;
  const when = formatSlotLong(appointment.starts_at);
  const where = locationLine(event);
  const cancelUrl = `${SITE_URL}/appointments/cancel?token=${appointment.cancel_token}`;

  await Promise.all([
    sendCustomerConfirmation(resend, {
      to: appointment.email,
      firstName: appointment.first_name,
      businessName,
      logoUrl,
      eventTitle: event.title,
      city: event.city,
      when,
      where,
      service: appointment.service_type,
      cancelUrl,
      phone: settings.phone,
      email: settings.email,
      address: settings.address ?? '',
    }),
    sendAdminAlert(resend, {
      appointment,
      event,
      businessName,
      logoUrl,
      when,
      where,
      photoCount,
    }),
  ]).catch((err) => console.error('[email:booking] threw', err));
}

async function sendCustomerConfirmation(
  resend: NonNullable<ReturnType<typeof getResend>>,
  v: {
    to: string;
    firstName: string;
    businessName: string;
    logoUrl: string;
    eventTitle: string;
    city: string;
    when: string;
    where: string;
    service: string | null;
    cancelUrl: string;
    phone: string;
    email: string;
    address: string;
  },
): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b0b0b;border:1px solid rgba(243,204,15,0.25);border-radius:12px;overflow:hidden;">
  <tr><td style="padding:34px 24px 24px;border-bottom:1px solid rgba(243,204,15,0.15);text-align:center;background:#000;">
    <img src="${v.logoUrl}" alt="${esc(v.businessName)}" width="110" height="110" style="display:block;margin:0 auto;border:0;" />
    <p style="margin:14px 0 0;color:#f3cc0f;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">Appointment Confirmed</p>
    <h1 style="margin:12px 0 0;color:#fff;font-family:Georgia,serif;font-size:25px;line-height:1.2;">You're booked in, ${esc(v.firstName)}.</h1>
  </td></tr>
  <tr><td style="padding:26px 28px 0;color:#cfcfcf;font-size:14px;line-height:1.7;">
    <p style="margin:0;">Thank you for booking a private appointment with ${esc(v.businessName)}. Here are your details:</p>
  </td></tr>
  <tr><td style="padding:18px 28px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(243,204,15,0.18);border-radius:10px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(243,204,15,0.12);">
        <p style="margin:0;color:#9a9a9a;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;">When</p>
        <p style="margin:4px 0 0;color:#fff;font-size:15px;font-weight:600;">${esc(v.when)}</p>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid rgba(243,204,15,0.12);">
        <p style="margin:0;color:#9a9a9a;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;">Where</p>
        <p style="margin:4px 0 0;color:#fff;font-size:15px;font-weight:600;">${esc(v.eventTitle)} - ${esc(v.city)}</p>
        <p style="margin:4px 0 0;color:#cfcfcf;font-size:13px;">${esc(v.where)}</p>
      </td></tr>
      ${
        v.service
          ? `<tr><td style="padding:14px 16px;"><p style="margin:0;color:#9a9a9a;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;">Bringing</p><p style="margin:4px 0 0;color:#fff;font-size:15px;font-weight:600;">${esc(v.service)}</p></td></tr>`
          : ''
      }
    </table>
  </td></tr>
  <tr><td style="padding:22px 28px 0;color:#9a9a9a;font-size:13px;line-height:1.7;">
    <p style="margin:0;">Please bring valid photo ID. There's no obligation to sell - the decision is always yours.</p>
  </td></tr>
  <tr><td style="padding:22px 28px 4px;text-align:center;">
    <p style="margin:0;color:#9a9a9a;font-size:12px;">Need to change or cancel?</p>
    <p style="margin:10px 0 0;"><a href="${v.cancelUrl}" style="color:#f3cc0f;text-decoration:underline;font-size:13px;">Cancel this appointment</a></p>
    <p style="margin:14px 0 0;font-size:14px;">
      <a href="tel:${v.phone.replace(/\s+/g, '')}" style="color:#f3cc0f;text-decoration:none;font-weight:600;">${esc(v.phone)}</a>
      <span style="color:#5a5a5a;"> · </span>
      <a href="mailto:${esc(v.email)}" style="color:#f3cc0f;text-decoration:none;font-weight:600;">${esc(v.email)}</a>
    </p>
  </td></tr>
  <tr><td style="padding:24px 28px;background:#050505;border-top:1px solid rgba(243,204,15,0.15);text-align:center;">
    <p style="margin:0;color:#7a7a7a;font-size:11px;line-height:1.7;">${esc(v.businessName)}<br />${esc(v.address)}</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: [v.to],
      subject: `Your appointment is confirmed - ${v.businessName}`,
      html,
    });
    if (error) console.error('[email:booking-customer] resend error', error);
  } catch (err) {
    console.error('[email:booking-customer] threw', err);
  }
}

async function sendAdminAlert(
  resend: NonNullable<ReturnType<typeof getResend>>,
  v: {
    appointment: Appointment;
    event: AppointmentEvent;
    businessName: string;
    logoUrl: string;
    when: string;
    where: string;
    photoCount: number;
  },
): Promise<void> {
  const recipients = await getAdminRecipients();
  if (recipients.length === 0) return;

  const a = v.appointment;
  const html = `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b0b0b;border:1px solid rgba(243,204,15,0.25);border-radius:12px;overflow:hidden;">
  <tr><td style="padding:28px 24px 18px;border-bottom:1px solid rgba(243,204,15,0.15);text-align:center;background:#000;">
    <p style="margin:0;color:#f3cc0f;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">New Appointment Booked</p>
    <h1 style="margin:10px 0 0;color:#fff;font-family:Georgia,serif;font-size:21px;">${esc(v.event.title)} - ${esc(v.event.city)}</h1>
    <p style="margin:6px 0 0;color:#9a9a9a;font-size:13px;">${esc(v.when)}</p>
  </td></tr>
  <tr><td style="padding:18px 24px 0;">
    <h2 style="margin:0;color:#fff;font-family:Georgia,serif;font-size:18px;">${esc(a.first_name)} ${esc(a.last_name)}</h2>
    <p style="margin:6px 0 0;font-size:14px;">
      <a href="mailto:${esc(a.email)}" style="color:#f3cc0f;text-decoration:none;">${esc(a.email)}</a>
      <span style="color:#5a5a5a;"> · </span>
      <a href="tel:${a.phone.replace(/\s+/g, '')}" style="color:#f3cc0f;text-decoration:none;">${esc(a.phone)}</a>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;">
      <tr><td style="padding:6px 12px 6px 0;color:#9a9a9a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Where</td><td style="padding:6px 0;color:#f6f6f6;font-size:14px;">${esc(v.where)}</td></tr>
      ${a.service_type ? `<tr><td style="padding:6px 12px 6px 0;color:#9a9a9a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Bringing</td><td style="padding:6px 0;color:#f6f6f6;font-size:14px;">${esc(a.service_type)}</td></tr>` : ''}
      <tr><td style="padding:6px 12px 6px 0;color:#9a9a9a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Preferred contact</td><td style="padding:6px 0;color:#f6f6f6;font-size:14px;">${esc(a.preferred_contact_method)}</td></tr>
      ${v.photoCount > 0 ? `<tr><td style="padding:6px 12px 6px 0;color:#9a9a9a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Photos</td><td style="padding:6px 0;color:#f6f6f6;font-size:14px;">${v.photoCount} attached - view in admin</td></tr>` : ''}
    </table>
    ${a.notes ? `<p style="margin:14px 0 0;color:#cfcfcf;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(a.notes)}</p>` : ''}
  </td></tr>
  <tr><td style="padding:24px;text-align:center;">
    <a href="${SITE_URL}/admin/appointments" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#A67C00,#D4AF37 35%,#FFD700 55%,#D4AF37 75%,#B8860B);color:#050505;font-weight:600;text-decoration:none;border-radius:999px;font-size:13px;">View in admin →</a>
  </td></tr>
</table>
</td></tr></table></body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      replyTo: a.email,
      subject: `New appointment - ${a.first_name} ${a.last_name} · ${v.event.city}`,
      html,
    });
    if (error) console.error('[email:booking-admin] resend error', error);
  } catch (err) {
    console.error('[email:booking-admin] threw', err);
  }
}
