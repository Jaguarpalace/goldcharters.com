import type { StockItem } from '@/types/database';

/**
 * Pure arithmetic for split holdings. Lives outside lib/queries so client
 * components can import it without dragging the server Supabase client
 * (and next/headers) into the browser bundle.
 */

/** Grams of a bulk holding already allocated to individual pieces. */
export function allocatedWeight(children: StockItem[]): number {
  return children.reduce((sum, c) => sum + (Number(c.weight_grams) || 0), 0);
}

/**
 * Grams of a bulk holding not yet split out. The split action refuses to
 * over-allocate, so a negative here means a manual weight edit after the
 * fact - the UI flags it rather than hiding it.
 */
export function remainingWeight(parent: StockItem, children: StockItem[]): number {
  return (Number(parent.weight_grams) || 0) - allocatedWeight(children);
}
