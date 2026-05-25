import { getServerSupabase } from '@/lib/supabase/server';
import {
  BOX_PAPERS_OPTIONS,
  CONDITION_OPTIONS,
  GEMSTONE_OPTIONS,
  GOLD_PURITY,
  HANDBAG_BRANDS,
  ITEM_FORM_OPTIONS,
  JEWELLERY_TYPE_OPTIONS,
  METAL_OPTIONS,
  PLATINUM_PURITY,
  SILVER_PURITY,
  WATCH_BRANDS,
  type PurityOption,
} from '@/lib/schemas/valuationFormOptions';
import type { FormOption, FormOptionSetKey } from '@/types/database';
import { FORM_OPTION_SET_KEYS } from '@/types/database';

export type DisplayOption = { value: string; label: string };
export type FormOptionSets = Record<FormOptionSetKey, DisplayOption[]>;

/**
 * Hardcoded fallback. Reproduces every option list from
 * `lib/schemas/valuationFormOptions.ts` in DisplayOption shape so the
 * public form always has something to render even if Supabase is
 * unreachable or the form_options table is empty.
 */
function fallbackSets(): FormOptionSets {
  const simple = (arr: readonly string[]): DisplayOption[] =>
    arr.map((v) => ({ value: v, label: v }));
  const fromPurity = (arr: readonly PurityOption[]): DisplayOption[] =>
    arr.filter((p) => p.value.length > 0).map((p) => ({ value: p.value, label: p.label }));

  return {
    metal: simple(METAL_OPTIONS),
    item_form: simple(ITEM_FORM_OPTIONS),
    jewellery_type: simple(JEWELLERY_TYPE_OPTIONS),
    gemstone: simple(GEMSTONE_OPTIONS),
    watch_brand: simple(WATCH_BRANDS),
    handbag_brand: simple(HANDBAG_BRANDS),
    condition: simple(CONDITION_OPTIONS),
    box_papers: simple(BOX_PAPERS_OPTIONS),
    purity_gold: fromPurity(GOLD_PURITY),
    purity_silver: fromPurity(SILVER_PURITY),
    purity_platinum: fromPurity(PLATINUM_PURITY),
  };
}

/**
 * Fetch all visible form options for every set in one go.
 * - Server-side (Supabase) is the truth when reachable.
 * - If the query fails or returns nothing for a set, schema constants
 *   from Phase 1 fill that set so the form is always functional.
 *
 * Designed to be called once per server-render of any page that needs
 * the form (sell-X, contact, home). The pages then pass the result
 * down to the client ValuationForm component as a single prop.
 */
export async function getAllFormOptionSets(): Promise<FormOptionSets> {
  const fallback = fallbackSets();
  const supabase = getServerSupabase();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from('form_options')
    .select('set_key, value, label, display_order, visible')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) {
    console.error('[formOptions:fetch]', error);
    return fallback;
  }

  const merged: FormOptionSets = { ...fallback };
  for (const key of FORM_OPTION_SET_KEYS) merged[key] = [];

  for (const row of data as Array<{ set_key: string; value: string; label: string }>) {
    if ((FORM_OPTION_SET_KEYS as readonly string[]).includes(row.set_key)) {
      merged[row.set_key as FormOptionSetKey].push({
        value: row.value,
        label: row.label,
      });
    }
  }

  // Backfill any empty set from the hardcoded fallback so a half-populated
  // table never breaks the form.
  for (const key of FORM_OPTION_SET_KEYS) {
    if (merged[key].length === 0) merged[key] = fallback[key];
  }

  return merged;
}

/**
 * Full row list for /admin/form-options including hidden + sort metadata.
 * Public callers should use getAllFormOptionSets() instead.
 */
export async function listAllFormOptions(): Promise<FormOption[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('form_options')
    .select('*')
    .order('set_key', { ascending: true })
    .order('display_order', { ascending: true });
  if (error || !data) return [];
  return data as FormOption[];
}

/**
 * Allowed values for server-side validation, computed from the same merged
 * source the public form uses. Falls back to schema constants when the DB
 * is unreachable so a submission never gets rejected for a reason the
 * admin can't see.
 */
export async function getAllowedValuesForSet(
  setKey: FormOptionSetKey,
): Promise<Set<string>> {
  const sets = await getAllFormOptionSets();
  return new Set(sets[setKey].map((o) => o.value));
}
