import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/queries/homepage';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { ValuationForm } from '@/components/public/ValuationForm';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/contact');
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <span className="gc-eyebrow">Contact</span>
          <h1 className="gc-heading-xl mt-5">Speak with a Specialist</h1>
          <p className="gc-subhead mt-6 max-w-2xl">
            Telephone, email, WhatsApp or in-person appointment — choose what suits you best.
          </p>
        </div>
      </section>

      <section className="py-6 lg:py-10">
        <div className="gc-container grid gap-10 lg:grid-cols-[1fr,1.4fr]">
          <div className="space-y-6">
            <ContactCard label="Telephone" value={settings.phone} href={`tel:${settings.phone}`} />
            <ContactCard label="Email" value={settings.email} href={`mailto:${settings.email}`} />
            {settings.whatsapp && (
              <ContactCard
                label="WhatsApp"
                value={settings.whatsapp}
                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
              />
            )}
            {settings.address && <ContactCard label="Address" value={settings.address} />}
            {settings.opening_hours && <ContactCard label="Opening Hours" value={settings.opening_hours} />}
          </div>
          <div>
            <ValuationForm variant="metal" />
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div className="gc-card gc-card-gold-edge flex items-start justify-between gap-6 p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-luxe text-gold-metallic">{label}</p>
        <p className="mt-2 text-lg text-white">{value}</p>
      </div>
      {href && (
        <span aria-hidden className="text-gold-metallic">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 7h10M8 3l4 4-4 4" />
          </svg>
        </span>
      )}
    </div>
  );

  return href ? (
    <a href={href} className="block transition-transform hover:-translate-y-0.5">
      {inner}
    </a>
  ) : (
    inner
  );
}
