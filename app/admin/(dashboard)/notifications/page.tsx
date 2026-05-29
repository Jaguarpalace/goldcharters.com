import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listNotificationRecipients } from '@/lib/queries/notificationRecipients';
import { isEmailConfigured } from '@/lib/email/client';
import { NotificationsBoard } from './NotificationsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  const recipients = isSupabaseConfigured() ? await listNotificationRecipients() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Alerts</span>
        <h1 className="font-display text-2xl text-white mt-1">Notification Recipients</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          People who receive the internal alert email when a customer submits a valuation request.
          Add as many addresses as you like - they can be staff, shared inboxes (e.g.
          office@chartersgold.co.uk) or your own personal email.
        </p>
      </header>

      {!isEmailConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Email delivery is currently paused. Recipients can be edited; sending resumes once the
          email service is reconnected.
        </div>
      )}

      <NotificationsBoard initialRecipients={recipients} />
    </div>
  );
}
