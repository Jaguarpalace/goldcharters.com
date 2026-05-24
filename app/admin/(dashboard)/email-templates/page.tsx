import Link from 'next/link';
import { getEmailTemplates } from '@/lib/queries/emailTemplates';
import { isEmailConfigured } from '@/lib/email/client';

export const dynamic = 'force-dynamic';

export default async function AdminEmailTemplatesPage() {
  const templates = await getEmailTemplates();

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-4xl text-white mt-2">Email Templates</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Every transactional email the system sends — admin alerts, customer auto-replies — is
          rendered from a template stored here. Edit subject, HTML body and which variables to use.
        </p>
      </header>

      {!isEmailConfigured() && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Resend not connected.</strong> Templates can be edited and previewed, but emails
          won&apos;t actually send until <code className="text-amber-100">RESEND_API_KEY</code> is set
          in environment variables.
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <li key={t.id}>
            <Link
              href={`/admin/email-templates/${t.key}`}
              className="gc-card group block h-full p-6 transition hover:bg-ink-800/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                  {t.key}
                </span>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ' +
                    (t.enabled
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-ink-800 text-warmgrey')
                  }
                >
                  {t.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h2 className="mt-2 font-display text-lg font-semibold text-white">{t.name}</h2>
              {t.description && (
                <p className="mt-2 text-xs text-warmgrey">{t.description}</p>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-luxe text-warmgrey/70">
                Updated {new Date(t.updated_at).toLocaleDateString('en-GB')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
