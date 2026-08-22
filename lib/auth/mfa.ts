import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Two-factor (TOTP) state for the current session.
 *
 * Supabase expresses this as an "authenticator assurance level":
 *   - nextLevel === 'aal2'    → the user has a verified authenticator enrolled,
 *                               so 2FA is REQUIRED for this account
 *   - currentLevel === 'aal2' → this session has already passed the 2FA step
 *
 * 2FA is opt-in per account: a user with no enrolled authenticator is never
 * challenged. That is the lockout safety net - nobody can be locked out of an
 * account that has not deliberately enabled 2FA on a working phone.
 */
export type MfaState = {
  /** Account has a verified authenticator → 2FA is required to enter the admin. */
  enrolled: boolean;
  /** This session has completed the 2FA step (always true when not enrolled). */
  verified: boolean;
};

type AuthOnly = { auth: SupabaseClient['auth'] };

export async function getMfaState(supabase: AuthOnly): Promise<MfaState> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      // Fail open rather than strand a legitimate admin on a transient auth
      // API error. Password auth has already been checked by the caller.
      console.error('[mfa] assurance-level check failed', error);
      return { enrolled: false, verified: true };
    }
    const enrolled = data.nextLevel === 'aal2';
    const verified = data.currentLevel === 'aal2';
    return { enrolled, verified: enrolled ? verified : true };
  } catch (err) {
    console.error('[mfa] assurance-level check threw', err);
    return { enrolled: false, verified: true };
  }
}

/** True when the session may enter the admin (no 2FA enrolled, or 2FA passed). */
export function mfaSatisfied(state: MfaState): boolean {
  return !state.enrolled || state.verified;
}
