import Link from 'next/link';
import { listAppointments } from '@/lib/actions/appointments';
import { AppointmentsBoard } from './AppointmentsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminAppointmentsPage() {
  const appointments = await listAppointments();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Appointments</span>
        <h1 className="font-display text-4xl text-white mt-2">Booked Appointments</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Every slot booked from the public site. Update a status as you contact, confirm or complete each
          appointment. Manage the locations &amp; dates on the{' '}
          <Link href="/admin/events" className="text-gold-tint underline">Pop-Up Locations</Link> page.
        </p>
      </header>

      <AppointmentsBoard initial={appointments} />
    </div>
  );
}
