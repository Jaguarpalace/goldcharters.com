'use client';

import { useEffect, useRef, useState } from 'react';
import { lookupPostcode, type LookupAddress } from '@/lib/actions/addressLookup';

/**
 * Sits under an address block. As soon as the postcode field holds a full
 * UK postcode, the street addresses for it are fetched and shown in a pick
 * list; choosing one fills line 1, line 2, city and postcode via `onPick`.
 *
 * A postcode that was already there when the form opened, or that arrived
 * with a returning customer, is not looked up: only one that is typed.
 */

const FULL_POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
const squash = (s: string) => (s ?? '').toUpperCase().replace(/\s+/g, '');

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; postcode: string }
  | { kind: 'found'; postcode: string; addresses: LookupAddress[] }
  | { kind: 'message'; text: string; warn: boolean };

export function PostcodeFinder({
  postcode,
  onPick,
}: {
  postcode: string;
  onPick: (address: LookupAddress) => void;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  // Postcodes already looked up (or present on open), so picking an
  // address - which rewrites the postcode field - does not fetch again.
  const seen = useRef(new Set<string>([squash(postcode)]));
  const requestId = useRef(0);

  useEffect(() => {
    const pc = squash(postcode);
    if (!FULL_POSTCODE.test(pc)) {
      if (!pc) setState({ kind: 'idle' });
      return;
    }
    if (seen.current.has(pc)) return;
    // Only a postcode being typed (or pasted) into its own box. One filled
    // in from a returning customer's record already has its address.
    const active = document.activeElement as HTMLInputElement | null;
    if (active?.tagName !== 'INPUT' || squash(active.value) !== pc) return;
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      seen.current.add(pc);
      setState({ kind: 'loading', postcode: `${pc.slice(0, -3)} ${pc.slice(-3)}` });
      const result = await lookupPostcode(pc);
      if (id !== requestId.current) return;
      if (result.ok) {
        setState({ kind: 'found', postcode: result.data.postcode, addresses: result.data.addresses });
      } else {
        setState({ kind: 'message', text: result.message, warn: result.error === 'failed' });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [postcode]);

  if (state.kind === 'idle') return null;

  if (state.kind === 'loading') {
    return <p className="text-[11px] text-warmgrey">Finding addresses for {state.postcode}…</p>;
  }

  if (state.kind === 'message') {
    return (
      <p className={'text-[11px] ' + (state.warn ? 'text-amber-400' : 'text-warmgrey')}>{state.text}</p>
    );
  }

  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-gold-tint">
        Pick the address ({state.addresses.length} found for {state.postcode})
      </span>
      <select
        defaultValue=""
        onChange={(e) => {
          const picked = state.addresses[Number(e.target.value)];
          if (!picked) return;
          onPick(picked);
          setState({ kind: 'idle' });
        }}
        className="mt-1 w-full rounded-md border border-gold-metallic/40 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
      >
        <option value="" disabled className="bg-ink-950">
          Choose from the list, or type the address in yourself
        </option>
        {state.addresses.map((a, i) => (
          <option key={`${a.label}-${i}`} value={i} className="bg-ink-950">
            {a.label}
          </option>
        ))}
      </select>
    </label>
  );
}
