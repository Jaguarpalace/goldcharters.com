import { getServerSupabase } from '@/lib/supabase/server';

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null; // resolved from admin_profiles
  entity_type: string;
  entity_id: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
};

/**
 * Fetch the most recent N audit-log entries with actor emails resolved
 * from admin_profiles. RLS gates the read to admin users.
 */
export async function listAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) return [];

  // Resolve admin emails in one batch query so the table can show
  // "paul@chartersgold.co.uk" instead of a UUID.
  const actorIds = Array.from(
    new Set(
      (rows as Array<{ actor_id: string | null }>)
        .map((r) => r.actor_id)
        .filter((id): id is string => !!id),
    ),
  );
  let emailByActor = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('admin_profiles')
      .select('id, email')
      .in('id', actorIds);
    if (profiles) {
      emailByActor = new Map(
        (profiles as Array<{ id: string; email: string }>).map((p) => [p.id, p.email]),
      );
    }
  }

  return (rows as Array<Omit<AuditLogEntry, 'actor_email'>>).map((r) => ({
    ...r,
    actor_email: r.actor_id ? emailByActor.get(r.actor_id) ?? null : null,
  }));
}
