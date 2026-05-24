'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';

export type TeamRole = 'admin' | 'editor';

const VALID_ROLES = new Set<TeamRole>(['admin', 'editor']);

/**
 * Invite a new teammate. Uses Supabase Auth's invite flow — sends a magic
 * link that lets the user set a password and sign in. The corresponding
 * admin_profiles row is created the moment the auth user is provisioned.
 */
export async function inviteAdminUser(input: {
  email: string;
  full_name: string;
  role: TeamRole;
}): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim().slice(0, 80);
  const role = input.role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please provide a valid email address.' };
  }
  if (!VALID_ROLES.has(role)) {
    return { ok: false, error: 'Unknown role.' };
  }

  // Block duplicate invites — admin_profiles enforces uniqueness via PK,
  // but we want a clean error message rather than a foreign-key trace.
  const { data: existing } = await ctx.admin
    .from('admin_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: 'A teammate with this email is already on the team.' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const { data, error } = await ctx.admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: siteUrl ? `${siteUrl}/admin/login` : undefined,
  });

  if (error) {
    console.error('[admin-users:invite]', error);
    return { ok: false, error: error.message };
  }
  if (!data.user) {
    return { ok: false, error: 'Invite was not created.' };
  }

  const { error: profileError } = await ctx.admin
    .from('admin_profiles')
    .insert({
      id: data.user.id,
      email,
      full_name: fullName || null,
      role,
    });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphan account.
    await ctx.admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    console.error('[admin-users:invite-profile]', profileError);
    return { ok: false, error: profileError.message };
  }

  revalidatePath('/admin/users');
  return { ok: true };
}

/** Change a teammate's role. */
export async function updateAdminUserRole(
  id: string,
  role: TeamRole,
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!VALID_ROLES.has(role)) return { ok: false, error: 'Unknown role.' };

  // Demoting your own admin role is a foot-gun; block it.
  if (id === ctx.userId && role !== 'admin') {
    return { ok: false, error: 'You can’t demote yourself. Ask another admin to do it.' };
  }

  // Protect the last admin from accidental demotion.
  if (role !== 'admin') {
    const { data: target } = await ctx.admin
      .from('admin_profiles')
      .select('role')
      .eq('id', id)
      .maybeSingle();
    if (target?.role === 'admin') {
      const { count } = await ctx.admin
        .from('admin_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return { ok: false, error: 'Cannot demote the last admin.' };
      }
    }
  }

  const { error } = await ctx.admin
    .from('admin_profiles')
    .update({ role })
    .eq('id', id);

  if (error) {
    console.error('[admin-users:role]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/users');
  return { ok: true };
}

/** Remove a teammate from the team and revoke their auth access. */
export async function removeAdminUser(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (id === ctx.userId) {
    return { ok: false, error: 'You can’t remove yourself.' };
  }

  // Don't let the team end up with zero admins.
  const { data: target } = await ctx.admin
    .from('admin_profiles')
    .select('role')
    .eq('id', id)
    .maybeSingle();
  if (target?.role === 'admin') {
    const { count } = await ctx.admin
      .from('admin_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'Cannot remove the last admin.' };
    }
  }

  // Profile first (cascading FK would also do this once auth user is gone,
  // but explicit is clearer and lets us surface profile-level errors).
  const { error: profileError } = await ctx.admin
    .from('admin_profiles')
    .delete()
    .eq('id', id);
  if (profileError) {
    console.error('[admin-users:remove-profile]', profileError);
    return { ok: false, error: profileError.message };
  }

  const { error: authError } = await ctx.admin.auth.admin.deleteUser(id);
  if (authError) {
    // Profile is gone — log but don't fail; the auth user can be cleaned
    // up via the Supabase dashboard if needed.
    console.error('[admin-users:remove-auth]', authError);
  }

  revalidatePath('/admin/users');
  return { ok: true };
}
