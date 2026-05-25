import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';

/** Roles defined on admin_profiles.role. */
export type AdminRole = 'admin' | 'editor';

// Discriminated union return type so callers can do `if ('error' in ctx)`
// and TypeScript narrows ctx.error to a guaranteed string. The optional
// `code` field lines up with SaveErrorCode below so an action that hits
// the guard can propagate the auth failure with the right typed code.
type AdminContext =
  | {
      admin: NonNullable<ReturnType<typeof getAdminSupabase>>;
      userId: string;
      /** Role of the signed-in admin. Drives requireRole gates below. */
      role: AdminRole;
    }
  | { error: string; code?: SaveErrorCode };

/**
 * Guard used at the top of every admin mutation server action.
 * - Confirms Supabase service-role key is configured (so the admin client can write)
 * - Confirms the request comes from a logged-in user
 * - Confirms that user exists in admin_profiles
 *
 * Returns the admin Supabase client when allowed, or an error string when not.
 */
export async function requireAdminContext(): Promise<AdminContext> {
  if (!isSupabaseAdminConfigured()) {
    return { error: 'Supabase is not configured on the server.', code: 'UPSTREAM' };
  }
  const supabase = getServerSupabase();
  if (!supabase) return { error: 'Server error.', code: 'UPSTREAM' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.', code: 'UNAUTHENTICATED' };

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: AdminRole }>();
  if (!profile) return { error: 'Not authorised.', code: 'FORBIDDEN' };

  const admin = getAdminSupabase();
  if (!admin) return { error: 'Server error.', code: 'UPSTREAM' };

  return { admin, userId: user.id, role: profile.role };
}

/**
 * Stricter variant: only admin-role users are allowed through. Editors get
 * a typed FORBIDDEN error suitable for surfacing to the client. Use at the
 * top of irreversible / privileged actions (delete, settings, KYC docs).
 */
export async function requireAdminRole(): Promise<
  AdminContext extends infer T ? T : never
> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx;
  if (ctx.role !== 'admin') {
    return {
      error: 'This action is restricted to admin-role users.',
      code: 'FORBIDDEN',
    };
  }
  return ctx;
}

/**
 * Discriminated union returned by every server action.
 *
 * Clients pattern-match on `ok`:
 *   if (result.ok) { use(result.data); }
 *   else { showError(result.error); maybe react to result.code; }
 *
 * The `code` is optional and additive — older actions that only set
 * `error: string` still satisfy the type. New code should prefer
 * `errResult(...)` below so a stable code is attached for client logic.
 */
export type SaveResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: SaveErrorCode };

/**
 * Stable error codes the UI can branch on without parsing prose. Add new
 * values rather than reusing UNKNOWN — that's the whole point.
 */
export type SaveErrorCode =
  /** Visitor isn't signed in. Client should send them to /admin/login. */
  | 'UNAUTHENTICATED'
  /** Signed in but not an admin. Client should show a polite refusal. */
  | 'FORBIDDEN'
  /** Submitted data failed shape / value validation. Inline form error. */
  | 'VALIDATION'
  /** Referenced row doesn't exist. */
  | 'NOT_FOUND'
  /** Unique-key clash or state conflict (e.g. already-imported, already-sold). */
  | 'CONFLICT'
  /** Underlying service (Supabase, metal-price API, email) failed. */
  | 'UPSTREAM'
  /** Anything that doesn't fit. Use sparingly. */
  | 'UNKNOWN';

/** Convenience constructor for typed failures. */
export function errResult(
  code: SaveErrorCode,
  error: string,
): { ok: false; error: string; code: SaveErrorCode } {
  return { ok: false, error, code };
}

/** Convenience constructor for successes. Mirrors errResult for symmetry. */
export function okResult<T>(data?: T): { ok: true; data?: T } {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function sanitiseText(v: FormDataEntryValue | null | undefined, max = 5000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

export function optionalText(v: FormDataEntryValue | null | undefined, max = 5000): string | null {
  const s = sanitiseText(v, max);
  return s ? s : null;
}

export function asBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'on';
}

export function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
