import { getAllEvents } from '@/lib/queries/appointments';
import { EventsEditor } from './EventsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const events = await getAllEvents();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Appointments</span>
        <h1 className="font-display text-4xl text-white mt-2">Pop-Up Locations & Dates</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Add the places and dates you’ll be available for private appointments - your Egham showroom or
          travelling pop-ups. Each event becomes a bookable calendar on the public{' '}
          <span className="text-gold-tint">/book</span> page automatically.
        </p>
      </header>

      <EventsEditor initial={events} />
    </div>
  );
}
