import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { getComputedEvents } from '@/lib/queries/appointments';
import { getSiteSettings } from '@/lib/queries/homepage';
import { BookingFlow } from '@/components/public/BookingFlow';
import { JsonLd } from '@/lib/seo/JsonLd';
import { appointmentEventSchema } from '@/lib/seo/structuredData';

// Live availability — never cache the slot grid.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/book');
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: { event?: string };
}) {
  const [events, settings] = await Promise.all([getComputedEvents(), getSiteSettings()]);

  return (
    <>
      <JsonLd
        data={events.map((e) =>
          appointmentEventSchema({
            settings,
            title: e.title,
            city: e.city,
            venueName: e.venue_name,
            address: e.address,
            startDate: e.starts_on,
            endDate: e.ends_on,
          }),
        )}
      />

      <section className="py-7 lg:py-14">
        <div className="gc-container">
          <span className="gc-eyebrow">Book An Appointment</span>
          <h1 className="gc-heading-xl mt-5">Reserve a Private Valuation Slot</h1>
          <p className="gc-subhead mt-6 max-w-2xl">
            Choose a location, pick a time that suits you, and meet a specialist in person. Discreet,
            unhurried and with no obligation to sell — at our Egham showroom or a pop-up near you.
          </p>
        </div>
      </section>

      <section className="py-7 lg:py-12">
        <div className="gc-container max-w-5xl">
          <BookingFlow events={events} initialEventId={searchParams.event} />
        </div>
      </section>
    </>
  );
}
