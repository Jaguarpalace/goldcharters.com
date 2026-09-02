'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

/**
 * Signs the admin out after 5 minutes of inactivity, with a 30-second
 * on-screen warning first. Activity in ANY admin tab counts (shared via
 * localStorage), so working in one tab never logs out another.
 *
 * Mounted in the (dashboard) layout only - the login page and public site
 * are untouched.
 */
const IDLE_MS = 5 * 60_000;
const WARN_MS = 30_000; // warning appears for the final 30 seconds
const STORAGE_KEY = 'admin-last-activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

function readLast(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? v : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLast(ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    /* storage unavailable - the in-memory ref still works for this tab */
  }
}

export function IdleLogout() {
  const lastRef = useRef<number>(Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const signingOut = useRef(false);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastRef.current = now;
    // Throttle storage writes - once per 5s is plenty for a 5-minute window.
    if (now - readLast() > 5_000) writeLast(now);
  }, []);

  const staySignedIn = useCallback(() => {
    const now = Date.now();
    lastRef.current = now;
    writeLast(now);
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    writeLast(Date.now());
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, recordActivity, { passive: true });
    }

    const tick = window.setInterval(async () => {
      // Cross-tab: the freshest activity wins, wherever it happened.
      const last = Math.max(lastRef.current, readLast());
      const idleFor = Date.now() - last;

      if (idleFor >= IDLE_MS) {
        if (signingOut.current) return;
        signingOut.current = true;
        const supabase = getBrowserSupabase();
        if (supabase) await supabase.auth.signOut();
        window.location.href = '/admin/login?timeout=1';
        return;
      }

      if (idleFor >= IDLE_MS - WARN_MS) {
        setSecondsLeft(Math.max(1, Math.ceil((IDLE_MS - idleFor) / 1000)));
      } else {
        setSecondsLeft((prev) => (prev === null ? prev : null));
      }
    }, 1000);

    return () => {
      window.clearInterval(tick);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, recordActivity);
      }
    };
  }, [recordActivity]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gold-metallic/40 bg-ink-950 p-6 text-center shadow-[0_0_40px_-10px_rgba(212,175,55,0.4)]">
        <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Still there?
        </p>
        <p className="mt-3 text-sm text-white">
          You&rsquo;ll be signed out in{' '}
          <span className="font-mono text-lg font-bold text-gold-bright">{secondsLeft}</span>{' '}
          second{secondsLeft === 1 ? '' : 's'} for security.
        </p>
        <button
          type="button"
          onClick={staySignedIn}
          autoFocus
          className="gc-btn-primary mt-5 w-full"
        >
          I&rsquo;m still here
        </button>
      </div>
    </div>
  );
}
