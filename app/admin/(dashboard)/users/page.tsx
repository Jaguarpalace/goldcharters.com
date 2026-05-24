import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { AdminProfile } from '@/types/database';
import { TeamBoard } from './TeamBoard';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  let teammates: AdminProfile[] = [];
  let currentUserId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id ?? null;
      const { data } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: true });
      teammates = (data as AdminProfile[]) ?? [];
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Access</span>
        <h1 className="font-display text-3xl text-white mt-1">Team</h1>
        <p className="mt-1 text-xs text-warmgrey">
          Invite teammates and set their permissions. Admins can manage everything; staff can edit
          content but cannot invite or remove team members.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Sign-in is required to manage the team.
        </div>
      )}

      <TeamBoard initialTeammates={teammates} currentUserId={currentUserId} />
    </div>
  );
}
