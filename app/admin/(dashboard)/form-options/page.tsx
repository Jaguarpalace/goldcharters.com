import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listAllFormOptions } from '@/lib/queries/formOptions';
import { FormOptionsBoard } from './FormOptionsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminFormOptionsPage() {
  const rows = isSupabaseConfigured() ? await listAllFormOptions() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Public form</span>
        <h1 className="mt-1 font-display text-3xl text-white">Form Options</h1>
        <p className="mt-1 max-w-3xl text-xs text-warmgrey">
          Manage every dropdown shown on the public valuation form. Add, rename, reorder, or
          hide an option without a code change. The public form and the server-side validator
          both read from this list — anything you save here takes effect within seconds.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to manage live form options.
        </div>
      )}

      <FormOptionsBoard initialRows={rows} />
    </div>
  );
}
