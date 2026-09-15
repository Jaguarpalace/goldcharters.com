'use client';

import { useEffect } from 'react';
import { markInternalDevice } from '@/lib/analytics/internal';

/** Renders nothing; flags this browser as a staff device on first admin visit. */
export function MarkInternalDevice() {
  useEffect(() => {
    markInternalDevice();
  }, []);
  return null;
}
