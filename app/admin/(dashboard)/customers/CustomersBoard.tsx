'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { Customer } from '@/types/database';
import { upsertCustomer } from '@/lib/actions/customers';

export function CustomersBoard({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = [c.first_name, c.last_name, c.email, c.phone, c.postcode, c.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customers, search]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr]">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, postcode…"
            className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
          />
          <span className="whitespace-nowrap text-[10px] uppercase tracking-luxe text-gold-tint">
            {filtered.length} of {customers.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
              <tr>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-2 py-2 text-left">Contact</th>
                <th className="px-2 py-2 text-left">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-sm text-warmgrey">
                    {customers.length === 0
                      ? 'No customers yet — add the first one using the form on the right.'
                      : 'No customers match that search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-ink-900/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="block font-medium text-white hover:text-gold-bright"
                      >
                        {c.first_name} {c.last_name}
                      </Link>
                      {(c.city || c.postcode) && (
                        <div className="text-[11px] text-warmgrey">
                          {[c.city, c.postcode].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="text-[12px] text-white">{c.email}</div>
                      {c.phone && (
                        <div className="text-[11px] text-warmgrey">{c.phone}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[11px] text-warmgrey">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <AddCustomerForm
          onAdded={(c) => setCustomers((prev) => [c, ...prev])}
        />
      </aside>
    </div>
  );
}

/* ---------------------------- Add form ----------------------------------- */

function AddCustomerForm({ onAdded }: { onAdded: (c: Customer) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertCustomer({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
      });
      if (result.ok && result.data) {
        onAdded(result.data);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setFeedback({ ok: true, text: 'Customer added.' });
        setTimeout(() => setFeedback(null), 2000);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-gold-metallic/25 bg-ink-900/70 p-5"
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Add customer
      </h2>
      <p className="text-[11px] text-warmgrey">
        Quick add — full address, notes and documents can be filled in on the customer's detail
        page.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Field label="First name" value={firstName} onChange={setFirstName} required />
        <Field label="Last name" value={lastName} onChange={setLastName} required />
      </div>
      <Field label="Email" type="email" value={email} onChange={setEmail} required />
      <Field label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />

      <div className="flex items-center justify-between gap-2 pt-1">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !firstName.trim() || !lastName.trim() || !email.trim()}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
        {!required && <span className="ml-1 text-warmgrey/50">(optional)</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}
