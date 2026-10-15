import Link from 'next/link';
import { listAppointments } from '@/lib/actions/appointments';
import { AppointmentsBoard } from './AppointmentsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminAppointmentsPage() {
  const appointments = await listAppointments();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Pop-Ups</span>
        <h1 className="font-display text-2xl text-white mt-2">Pop-Up Bookings</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Customers who booked a slot at one of your pop-up locations on the public site. Phone
          bookings and valuation requests are not here, they are under Valuation Requests. Update a
          status as you contact, confirm or complete each booking. Manage the locations &amp; dates on the{' '}
          <Link href="/admin/events" className="text-gold-tint underline">Pop-Up Locations</Link> page.
        </p>
      </header>

      <AppointmentsBoard initial={appointments} />
    </div>
  );
}
