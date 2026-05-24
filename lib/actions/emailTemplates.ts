'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import { getEmailTemplateByKey } from '@/lib/queries/emailTemplates';
import { renderTemplate, sampleVariablesFor } from '@/lib/email/renderTemplate';
import { getResend, getFromAddress, isEmailConfigured } from '@/lib/email/client';

type UpdateInput = {
  key: string;
  subject: string;
  html_body: string;
  enabled?: boolean;
};

export async function updateEmailTemplate(input: UpdateInput): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!input.subject.trim()) return { ok: false, error: 'Subject is required.' };
  if (!input.html_body.trim()) return { ok: false, error: 'HTML body is required.' };

  const { error } = await ctx.admin
    .from('email_templates')
    .update({
      subject: input.subject.trim().slice(0, 300),
      html_body: input.html_body.slice(0, 100000),
      enabled: input.enabled ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('key', input.key);

  if (error) {
    console.error('[email-templates:update]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/email-templates');
  revalidatePath(`/admin/email-templates/${input.key}`);
  return { ok: true };
}

/**
 * Sends a one-off test email using the current template + sample variable
 * values. Lets admins preview rendered output in their actual inbox.
 */
export async function sendTestEmail(
  key: string,
  recipient: string,
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { ok: false, error: 'Please provide a valid recipient email.' };
  }
  if (!isEmailConfigured()) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  }

  const template = await getEmailTemplateByKey(key);
  if (!template) return { ok: false, error: 'Template not found.' };

  const variables = await sampleVariablesFor(key);
  const rendered = renderTemplate(template, variables);

  const resend = getResend();
  if (!resend) return { ok: false, error: 'Email client unavailable.' };

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });
    if (error) return { ok: false, error: error.message ?? 'Resend rejected the send.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
