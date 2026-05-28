'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cancelAppointmentByToken } from '@/lib/actions/appointments';

export function CancelClient({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'done'; when: string; city: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const onCancel = () => {
    startTransition(async () => {
      const res = await cancelAppointmentByToken(token);
      if (res.ok) setResult({ kind: 'done', when: res.when, city: res.city });
      else setResult({ kind: 'error', message: res.error });
    });
  };

  if (result.kind === 'done') {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Appointment cancelled</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">
          Your appointment{result.city ? ` in ${result.city}` : ''} on {result.when} has been cancelled.
          You’re welcome to book again any time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/book" className="gc-btn-primary">Book a new appointment</Link>
          <Link href="/" className="gc-btn-ghost">Back to home</Link>
        </div>
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">We couldn’t cancel that</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">{result.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="gc-btn-primary">Contact us</Link>
          <Link href="/book" className="gc-btn-ghost">Book an appointment</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">Cancel your appointment?</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">
        This will release your slot so someone else can book it. If you’d prefer to rearrange, you can
        cancel here and book a new time.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onCancel} disabled={pending} className="gc-btn-primary disabled:opacity-50">
          {pending ? 'Cancelling…' : 'Yes, cancel my appointment'}
        </button>
        <Link href="/" className="gc-btn-ghost">Keep my appointment</Link>
      </div>
    </div>
  );
}
