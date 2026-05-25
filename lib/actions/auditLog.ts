'use server';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Entity types referenced by the audit log. Free-text in the column itself
 * (so adding a new entity doesn't need a migration), but typed here so
 * call sites can't accidentally mistype "valuationreq" or "customers".
 */
export type AuditEntityType =
  | 'valuation_request'
  | 'stock_item'
  | 'customer'
  | 'customer_document'
  | 'page_seo'
  | 'legal_page'
  | 'form_option'
  | 'site_settings'
  | 'homepage_section';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'mark_reviewed'
  | 'record_sale'
  | 'unmark_sale'
  | 'change_status'
  | 'upload_document'
  | 'delete_document'
  | 'add_to_holdings'
  | 'walk_in_purchase';

export type LogAdminActionInput = {
  /** Admin client from requireAdminContext. Required for the write. */
  admin: SupabaseClient;
  /** Acting admin's auth.users.id, from requireAdminContext. */
  actorId: string;
  entity_type: AuditEntityType;
  entity_id?: string | null;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  /** Short human-readable summary; surfaces in the audit-log UI. */
  note?: string | null;
};

/**
 * Fire-and-forget audit-trail write. Best-effort by design: a failure to
 * log MUST NOT block the underlying business action, otherwise an audit
 * outage would brick the admin. Errors are console-logged for postmortem.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const { error } = await input.admin.from('admin_audit_log').insert({
      actor_id: input.actorId,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      action: input.action,
      before: input.before === undefined ? null : (input.before as object | null),
      after: input.after === undefined ? null : (input.after as object | null),
      note: input.note ?? null,
    });
    if (error) {
      console.error('[audit:log]', error);
    }
  } catch (e) {
    console.error('[audit:log]', e);
  }
}

/**
 * Diff utility — returns the subset of `after` whose values differ from
 * `before`. Lets call sites pass `await logAdminAction({ ..., before: diff(before, after), after: diff(after, before) })`
 * so the audit row is minimal and human-readable rather than dumping the
 * whole record on every update.
 */
export function diff<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined,
): Partial<T> {
  if (!before || !after) return (after ?? {}) as Partial<T>;
  const out: Partial<T> = {};
  for (const key of Object.keys(after) as Array<keyof T>) {
    const a = after[key];
    const b = before[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      (out as Record<keyof T, unknown>)[key] = a;
    }
  }
  return out;
}
