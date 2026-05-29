import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listLegalPages } from '@/lib/queries/legalPages';
import { LegalBoard } from './LegalBoard';

export const dynamic = 'force-dynamic';

export default async function AdminLegalPage() {
  const rows = isSupabaseConfigured() ? await listLegalPages() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Legal</span>
        <h1 className="mt-1 font-display text-3xl text-white">Legal Pages</h1>
        <p className="mt-1 max-w-3xl text-xs text-warmgrey">
          Edit the cosmetic copy on the Terms, Privacy and Cookie pages, and bump the
          "Last updated" stamp after a legal review. The numbered clauses themselves are kept
          in code, version-controlled and peer-reviewed before merge - a deliberate safeguard
          for the legal substance of these documents.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to manage live legal page metadata.
        </div>
      )}

      <LegalBoard initialRows={rows} />
    </div>
  );
}
