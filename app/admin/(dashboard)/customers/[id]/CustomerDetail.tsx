'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  CUSTOMER_DOCUMENT_TYPE_LABELS,
  CUSTOMER_DOCUMENT_TYPES,
  VALUATION_STATUS_LABELS,
  type Customer,
  type CustomerDocument,
  type CustomerDocumentType,
  type StockItem,
  type ValuationRequest,
} from '@/types/database';
import {
  deleteCustomer,
  deleteCustomerDocument,
  getCustomerDocumentSignedUrl,
  uploadCustomerDocument,
  upsertCustomer,
} from '@/lib/actions/customers';
import { useRouter } from 'next/navigation';

type Tab = 'details' | 'documents' | 'history' | 'holdings';

export function CustomerDetail({
  customer,
  initialDocuments,
  history,
  holdings,
}: {
  customer: Customer;
  initialDocuments: CustomerDocument[];
  history: ValuationRequest[];
  holdings: StockItem[];
}) {
  const [tab, setTab] = useState<Tab>('details');
  const [docs, setDocs] = useState<CustomerDocument[]>(initialDocuments);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gold-metallic/15 pb-2">
        <TabButton active={tab === 'details'} onClick={() => setTab('details')}>
          Details
        </TabButton>
        <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
          Documents{' '}
          <span className="ml-1 text-[10px] text-warmgrey">({docs.length})</span>
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          History{' '}
          <span className="ml-1 text-[10px] text-warmgrey">({history.length})</span>
        </TabButton>
        <TabButton active={tab === 'holdings'} onClick={() => setTab('holdings')}>
          Holdings{' '}
          <span className="ml-1 text-[10px] text-warmgrey">({holdings.length})</span>
        </TabButton>
      </div>

      {tab === 'details' && <DetailsTab customer={customer} />}
      {tab === 'documents' && (
        <DocumentsTab customerId={customer.id} docs={docs} setDocs={setDocs} />
      )}
      {tab === 'history' && <HistoryTab history={history} />}
      {tab === 'holdings' && <HoldingsTab holdings={holdings} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe transition ' +
        (active
          ? 'bg-gold-metallic/15 text-gold-bright shadow-[0_0_8px_rgba(212,175,55,0.25)]'
          : 'text-warmgrey hover:text-gold-tint')
      }
    >
      {children}
    </button>
  );
}

/* --------------------------------- Details -------------------------------- */

function DetailsTab({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone: customer.phone ?? '',
    address_line1: customer.address_line1 ?? '',
    address_line2: customer.address_line2 ?? '',
    city: customer.city ?? '',
    postcode: customer.postcode ?? '',
    country: customer.country ?? '',
    notes: customer.notes ?? '',
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertCustomer({ id: customer.id, ...form });
      if (result.ok) {
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result.ok) {
        router.push('/admin/customers');
        router.refresh();
      } else {
        setFeedback({ ok: false, text: result.error });
        setDeleteArmed(false);
      }
    });
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="First name" value={form.first_name} onChange={update('first_name')} required />
        <TextField label="Last name" value={form.last_name} onChange={update('last_name')} required />
        <TextField label="Email" type="email" value={form.email} onChange={update('email')} required />
        <TextField label="Phone" value={form.phone} onChange={update('phone')} />
      </div>

      <fieldset className="space-y-3 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
        <legend className="px-1 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Address
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Line 1" value={form.address_line1} onChange={update('address_line1')} />
          <TextField label="Line 2" value={form.address_line2} onChange={update('address_line2')} />
          <TextField label="City" value={form.city} onChange={update('city')} />
          <TextField label="Postcode" value={form.postcode} onChange={update('postcode')} />
          <TextField label="Country" value={form.country} onChange={update('country')} />
        </div>
      </fieldset>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">Notes</span>
        <textarea
          value={form.notes}
          onChange={update('notes')}
          rows={4}
          placeholder="Internal notes — anything useful to remember about this customer."
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-metallic/15 pt-4">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          {feedback && (
            <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
              {feedback.text}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {deleteArmed ? (
            <>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
              >
                {pending ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteArmed(false)}
                disabled={pending}
                className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteArmed(true)}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
            >
              Delete customer
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
        {!required && <span className="ml-1 text-warmgrey/50">(optional)</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

/* -------------------------------- Documents ------------------------------- */

function DocumentsTab({
  customerId,
  docs,
  setDocs,
}: {
  customerId: string;
  docs: CustomerDocument[];
  setDocs: React.Dispatch<React.SetStateAction<CustomerDocument[]>>;
}) {
  return (
    <div className="space-y-5">
      <UploadForm
        customerId={customerId}
        onUploaded={(d) => setDocs((prev) => [d, ...prev])}
      />

      <div className="rounded-lg border border-gold-metallic/15">
        {docs.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-warmgrey">
            No documents yet. Upload an ID, driving licence or proof of address above.
          </p>
        ) : (
          <ul className="divide-y divide-gold-metallic/10">
            {docs.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                onRemoved={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UploadForm({
  customerId,
  onUploaded,
}: {
  customerId: string;
  onUploaded: (d: CustomerDocument) => void;
}) {
  const [docType, setDocType] = useState<CustomerDocumentType>('id');
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setFeedback(null);
    const fd = new FormData();
    fd.append('customer_id', customerId);
    fd.append('doc_type', docType);
    fd.append('file', file);

    startTransition(async () => {
      const result = await uploadCustomerDocument(fd);
      if (result.ok && result.data) {
        onUploaded(result.data);
        setFile(null);
        // Reset the file input by way of the form element.
        (e.target as HTMLFormElement).reset();
        setFeedback({ ok: true, text: 'Uploaded.' });
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
        Upload document
      </h2>
      <p className="text-[11px] text-warmgrey">
        PDF, JPG, PNG, WEBP or HEIC — up to 15MB. Documents are stored privately and only viewable
        by signed-in admins via short-lived links.
      </p>

      <div className="grid gap-3 md:grid-cols-[180px,1fr]">
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            Type
          </span>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as CustomerDocumentType)}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
          >
            {CUSTOMER_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CUSTOMER_DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            File
          </span>
          <input
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-gold-metallic/15 file:px-3 file:py-1 file:text-[11px] file:font-semibold file:uppercase file:tracking-luxe file:text-gold-tint hover:file:bg-gold-metallic/25"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !file}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}

function DocumentRow({
  doc,
  onRemoved,
}: {
  doc: CustomerDocument;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const view = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await getCustomerDocumentSignedUrl(doc.id);
      if (result.ok && result.data) {
        window.open(result.data.url, '_blank', 'noopener,noreferrer');
      } else if (!result.ok) {
        setFeedback(result.error);
      }
    });
  };

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteCustomerDocument(doc.id);
      if (result.ok) onRemoved();
      else {
        setFeedback(result.error);
        setConfirming(false);
      }
    });
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-gold-metallic/30 bg-ink-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            {CUSTOMER_DOCUMENT_TYPE_LABELS[doc.doc_type]}
          </span>
          <span className="text-sm text-white">{doc.file_name ?? doc.storage_path}</span>
        </div>
        <div className="mt-1 text-[11px] text-warmgrey">
          {new Date(doc.uploaded_at).toLocaleString('en-GB')}
          {doc.size_bytes != null && ` · ${formatBytes(doc.size_bytes)}`}
          {doc.mime_type && ` · ${doc.mime_type}`}
        </div>
        {feedback && <div className="mt-1 text-[11px] text-amber-400">{feedback}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={view}
          disabled={pending}
          className="rounded-md border border-gold-metallic/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50"
        >
          {pending ? '…' : 'View'}
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
            >
              {pending ? 'Removing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/* --------------------------------- History -------------------------------- */

function HistoryTab({ history }: { history: ValuationRequest[] }) {
  if (history.length === 0) {
    return (
      <p className="rounded-lg border border-gold-metallic/15 px-3 py-10 text-center text-sm text-warmgrey">
        No enquiries match this email yet. When this customer submits a valuation form, it'll
        appear here automatically.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {history.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-gold-metallic/30 bg-ink-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
                  {r.form_variant ?? r.item_type}
                </span>
                <span className="text-[11px] uppercase tracking-luxe text-warmgrey">
                  {new Date(r.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
              <h3 className="mt-2 text-sm text-white">{summariseRequest(r)}</h3>
              {r.description && (
                <p className="mt-1 line-clamp-2 text-[12px] text-warmgrey">{r.description}</p>
              )}
            </div>
            <span className="rounded-full bg-ink-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              {VALUATION_STATUS_LABELS[r.status]}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-[12px] text-warmgrey md:grid-cols-3">
            {r.estimated_value != null && (
              <Stat label="Estimate" value={`£${r.estimated_value.toLocaleString('en-GB')}`} />
            )}
            {r.payment_amount != null && (
              <Stat
                label="Paid"
                value={`£${r.payment_amount.toLocaleString('en-GB')}`}
                emphasis
              />
            )}
            {r.weight_grams != null && <Stat label="Weight" value={`${r.weight_grams}g`} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</div>
      <div className={emphasis ? 'text-sm text-gold-bright' : 'text-sm text-white'}>{value}</div>
    </div>
  );
}

function summariseRequest(r: ValuationRequest): string {
  const bits = [r.brand, r.model, r.metal_type, r.jewellery_type, r.item_category].filter(
    Boolean,
  );
  return bits.length > 0 ? bits.join(' · ') : 'Valuation enquiry';
}

/* --------------------------------- Holdings ------------------------------- */

function HoldingsTab({ holdings }: { holdings: StockItem[] }) {
  if (holdings.length === 0) {
    return (
      <p className="rounded-lg border border-gold-metallic/15 px-3 py-10 text-center text-sm text-warmgrey">
        Nothing in the holdings ledger from this customer yet. When you import a paid valuation
        request into the ledger, it'll appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
          <tr>
            <th className="px-3 py-2 text-left">Stock #</th>
            <th className="px-2 py-2 text-left">Item</th>
            <th className="px-2 py-2 text-right">Paid</th>
            <th className="px-2 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gold-metallic/10">
          {holdings.map((h) => (
            <tr key={h.id} className="align-top hover:bg-ink-900/40">
              <td className="whitespace-nowrap px-3 py-2.5">
                <Link
                  href={`/admin/holdings/${h.id}`}
                  className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
                >
                  {h.stock_number}
                </Link>
                <div className="text-[10px] text-warmgrey">
                  {new Date(h.acquired_at).toLocaleDateString('en-GB')}
                </div>
              </td>
              <td className="px-2 py-2.5">
                <div className="text-[12px] text-white">
                  {[h.metal_type, h.carat, h.item_type].filter(Boolean).join(' · ') || 'Item'}
                </div>
                {h.description && (
                  <div className="line-clamp-1 text-[11px] text-warmgrey">{h.description}</div>
                )}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
                £{Number(h.acquired_paid_gbp).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-2.5">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe ' +
                    (h.status === 'sold'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : h.status === 'written_off'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-ink-950 text-gold-tint')
                  }
                >
                  {h.status === 'held' ? 'Held' : h.status === 'sold' ? 'Sold' : 'Written off'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
