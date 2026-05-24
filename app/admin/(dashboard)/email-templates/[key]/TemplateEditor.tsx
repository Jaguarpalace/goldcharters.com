'use client';

import { useMemo, useState, useTransition } from 'react';
import type { EmailTemplate } from '@/types/database';
import { sendTestEmail, updateEmailTemplate } from '@/lib/actions/emailTemplates';

/**
 * Pure client-side variable interpolation — mirrors the server-side
 * `renderTemplate` function so the live preview matches what would actually
 * be sent. Unknown variables render as `{{key}}` so admins spot typos.
 */
function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m,
  );
}

export function TemplateEditor({
  template,
  sampleVariables,
}: {
  template: EmailTemplate;
  sampleVariables: Record<string, string>;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.html_body);
  const [enabled, setEnabled] = useState(template.enabled);
  const [testRecipient, setTestRecipient] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const renderedSubject = useMemo(() => interpolate(subject, sampleVariables), [subject, sampleVariables]);
  const renderedHtml = useMemo(() => interpolate(htmlBody, sampleVariables), [htmlBody, sampleVariables]);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateEmailTemplate({
        key: template.key,
        subject,
        html_body: htmlBody,
        enabled,
      });
      if (result.ok) setFeedback({ kind: 'ok', text: 'Template saved' });
      else setFeedback({ kind: 'err', text: result.error });
    });
  };

  const sendTest = () => {
    setFeedback(null);
    if (!testRecipient.trim()) {
      setFeedback({ kind: 'err', text: 'Enter an email address to send the test to.' });
      return;
    }
    startTransition(async () => {
      const result = await sendTestEmail(template.key, testRecipient.trim());
      if (result.ok) setFeedback({ kind: 'ok', text: `Test email sent to ${testRecipient}` });
      else setFeedback({ kind: 'err', text: result.error });
    });
  };

  const insertVariable = (key: string) => {
    // Inserts {{key}} at current cursor position in whichever field has focus.
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!activeEl || (activeEl.id !== 'subject' && activeEl.id !== 'html_body')) {
      // No focused field — append to body
      setHtmlBody((b) => `${b}{{${key}}}`);
      return;
    }
    const insertion = `{{${key}}}`;
    const before = activeEl.value.slice(0, activeEl.selectionStart ?? activeEl.value.length);
    const after = activeEl.value.slice(activeEl.selectionEnd ?? activeEl.value.length);
    const next = before + insertion + after;
    if (activeEl.id === 'subject') setSubject(next);
    else setHtmlBody(next);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        <section className="gc-card p-6">
          <label htmlFor="subject" className="gc-label">
            Subject
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="gc-input"
            placeholder="e.g. New {{branch_label}} valuation request — {{full_name}}"
          />

          <label htmlFor="html_body" className="gc-label mt-5">
            HTML Body
          </label>
          <textarea
            id="html_body"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={24}
            className="gc-input font-mono text-[12px] leading-relaxed"
            spellCheck={false}
          />

          <label className="mt-4 flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-gold-metallic"
            />
            Active — send this email when its trigger fires
          </label>

          <div className="mt-5 flex items-center justify-between gap-3">
            {feedback ? (
              <p
                className={
                  'text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')
                }
              >
                {feedback.text}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="gc-btn-primary"
            >
              {pending ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </section>

        <section className="gc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
            Live preview
          </h2>
          <p className="mt-2 text-[11px] text-warmgrey">
            Rendered with sample data so you can see exactly how the email will appear to its
            recipient.
          </p>

          <div className="mt-4 rounded-lg border border-gold-metallic/15 bg-ink-950 p-4">
            <p className="text-[10px] uppercase tracking-luxe text-warmgrey">Subject</p>
            <p className="mt-1 text-sm text-white">{renderedSubject}</p>
          </div>

          <div className="mt-4 rounded-lg border border-gold-metallic/15 bg-white p-2">
            <iframe
              title="Email preview"
              srcDoc={renderedHtml}
              sandbox=""
              className="h-[560px] w-full rounded-md border-0"
            />
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <section className="gc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
            Available variables
          </h2>
          <p className="mt-2 text-[11px] text-warmgrey">
            Click any to insert at your cursor.
          </p>
          <ul className="mt-3 space-y-1.5">
            {(template.available_variables ?? []).map((v) => (
              <li key={v.key}>
                <button
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="group flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-1.5 text-left transition hover:bg-ink-800"
                  title={`Example: ${v.example}`}
                >
                  <code className="text-[11px] text-gold-tint group-hover:text-gold-bright">
                    {`{{${v.key}}}`}
                  </code>
                  <span className="text-[10px] text-warmgrey">{v.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="gc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
            Send a test
          </h2>
          <p className="mt-2 text-[11px] text-warmgrey">
            Renders this template with sample data and sends it to any inbox so you can preview the
            final result.
          </p>
          <input
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            type="email"
            placeholder="your@email.com"
            className="gc-input mt-3"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={pending}
            className="gc-btn-secondary mt-3 w-full"
          >
            {pending ? 'Sending…' : 'Send test email'}
          </button>
        </section>
      </aside>
    </div>
  );
}
