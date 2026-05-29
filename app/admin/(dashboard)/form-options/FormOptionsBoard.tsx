'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  FORM_OPTION_SET_KEYS,
  FORM_OPTION_SET_LABELS,
  type FormOption,
  type FormOptionSetKey,
} from '@/types/database';
import {
  deleteFormOption,
  setFormOptionVisible,
  upsertFormOption,
} from '@/lib/actions/formOptions';

export function FormOptionsBoard({ initialRows }: { initialRows: FormOption[] }) {
  const [rows, setRows] = useState<FormOption[]>(initialRows);
  const [expandedSet, setExpandedSet] = useState<FormOptionSetKey | null>(
    FORM_OPTION_SET_KEYS[0],
  );

  // Group by set_key. Each set keeps its rows in display_order.
  const grouped = useMemo(() => {
    const out: Record<FormOptionSetKey, FormOption[]> = Object.fromEntries(
      FORM_OPTION_SET_KEYS.map((k) => [k, [] as FormOption[]]),
    ) as Record<FormOptionSetKey, FormOption[]>;
    for (const row of rows) {
      if ((FORM_OPTION_SET_KEYS as readonly string[]).includes(row.set_key)) {
        out[row.set_key as FormOptionSetKey].push(row);
      }
    }
    for (const k of FORM_OPTION_SET_KEYS) {
      out[k].sort((a, b) => a.display_order - b.display_order);
    }
    return out;
  }, [rows]);

  const upsert = (row: FormOption) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i === -1) return [...prev, row];
      const next = prev.slice();
      next[i] = row;
      return next;
    });
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <ul className="space-y-3">
      {FORM_OPTION_SET_KEYS.map((key) => (
        <SetCard
          key={key}
          setKey={key}
          options={grouped[key]}
          expanded={expandedSet === key}
          onToggle={() => setExpandedSet((c) => (c === key ? null : key))}
          onUpsert={upsert}
          onRemove={remove}
        />
      ))}
    </ul>
  );
}

function SetCard({
  setKey,
  options,
  expanded,
  onToggle,
  onUpsert,
  onRemove,
}: {
  setKey: FormOptionSetKey;
  options: FormOption[];
  expanded: boolean;
  onToggle: () => void;
  onUpsert: (row: FormOption) => void;
  onRemove: (id: string) => void;
}) {
  const visibleCount = options.filter((o) => o.visible).length;

  return (
    <li
      className={
        'overflow-hidden rounded-lg border transition ' +
        (expanded
          ? 'border-gold-metallic/40 bg-ink-900/60'
          : 'border-gold-metallic/15 bg-ink-900/40')
      }
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-ink-900/30"
      >
        <div>
          <div className="font-medium text-white">{FORM_OPTION_SET_LABELS[setKey]}</div>
          <div className="mt-0.5 text-[11px] text-warmgrey">
            <code className="font-mono">{setKey}</code> ·{' '}
            {visibleCount} visible of {options.length}
          </div>
        </div>
        <svg
          className={
            'h-4 w-4 flex-none text-warmgrey transition ' +
            (expanded ? 'rotate-180 text-gold-tint' : '')
          }
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gold-metallic/15 bg-ink-950/60 p-4">
          {/* Plain-English explainer of what the two text columns do.
              Closing the confusion the previous layout caused - the two
              boxes weren't duplicates, they were Value + Label. */}
          <div className="rounded-md border border-gold-metallic/15 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-warmgrey">
            <p>
              <strong className="text-white">How this works.</strong> Each
              row is one dropdown option the customer can pick. Most options
              only need one piece of text - the second box is for the rare
              case where you want the dropdown to <em>display</em> something
              different from what gets <em>saved</em>.
            </p>
            <ul className="mt-2 space-y-0.5">
              <li>
                <strong className="text-gold-tint">Value</strong> - what
                gets stored. Keep it short and stable (renaming this later
                breaks reports).
              </li>
              <li>
                <strong className="text-gold-tint">Label</strong> - what
                the customer sees in the dropdown. Leave it the same as
                Value unless you want a fancier display.
              </li>
              <li>
                <strong className="text-gold-tint">Order</strong> —
                position in the dropdown. Lower numbers appear first.
              </li>
            </ul>
          </div>

          {options.length === 0 ? (
            <p className="text-[12px] text-warmgrey">
              No options yet. Add the first one below.
            </p>
          ) : (
            <>
              {/* Sticky-style column header so the inputs are never
                  unlabelled, even on a long set. */}
              <div className="hidden grid-cols-[100px,1fr,1fr,auto] gap-2 px-1 text-[9px] font-semibold uppercase tracking-luxe text-warmgrey md:grid">
                <span>Order</span>
                <span>Value (stored)</span>
                <span>Label (customer-facing)</span>
                <span className="text-right">Actions</span>
              </div>

              <ul className="space-y-2">
                {options.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    option={opt}
                    onUpdated={onUpsert}
                    onRemoved={() => onRemove(opt.id)}
                  />
                ))}
              </ul>
            </>
          )}

          <AddOptionForm
            setKey={setKey}
            nextOrder={(options[options.length - 1]?.display_order ?? 0) + 10}
            onAdded={onUpsert}
          />
        </div>
      )}
    </li>
  );
}

function OptionRow({
  option,
  onUpdated,
  onRemoved,
}: {
  option: FormOption;
  onUpdated: (row: FormOption) => void;
  onRemoved: () => void;
}) {
  const [value, setValue] = useState(option.value);
  const [label, setLabel] = useState(option.label);
  const [order, setOrder] = useState(option.display_order.toString());
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dirty =
    value !== option.value ||
    label !== option.label ||
    Number(order) !== option.display_order;

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertFormOption({
        id: option.id,
        set_key: option.set_key as FormOptionSetKey,
        value,
        label,
        display_order: Number(order || 0),
        visible: option.visible,
      });
      if (result.ok && result.data) {
        onUpdated(result.data);
      } else if (!result.ok) {
        setFeedback(result.error);
      }
    });
  };

  const toggleVisible = () => {
    setFeedback(null);
    const next = !option.visible;
    startTransition(async () => {
      const result = await setFormOptionVisible(option.id, next);
      if (result.ok) {
        onUpdated({ ...option, visible: next });
      } else {
        setFeedback(result.error);
      }
    });
  };

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteFormOption(option.id);
      if (result.ok) onRemoved();
      else {
        setFeedback(result.error);
        setConfirmDelete(false);
      }
    });
  };

  return (
    <li className="grid items-start gap-2 rounded-md border border-gold-metallic/15 bg-ink-900/40 p-3 md:grid-cols-[100px,1fr,1fr,auto]">
      {/* Mobile-only micro-label (the desktop grid has its own column header) */}
      <label className="block md:contents">
        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-luxe text-warmgrey md:hidden">
          Order
        </span>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          aria-label="Display order"
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <label className="block md:contents">
        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-luxe text-warmgrey md:hidden">
          Value (stored)
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Value stored when this option is selected"
          placeholder="e.g. Gold"
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <label className="block md:contents">
        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-luxe text-warmgrey md:hidden">
          Label (customer-facing)
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label="Label the customer sees in the dropdown"
          placeholder="e.g. Gold"
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={toggleVisible}
          disabled={pending}
          title={option.visible ? 'Hide from public form' : 'Show on public form'}
          className={
            'rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe transition ' +
            (option.visible
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-warmgrey/30 text-warmgrey hover:border-gold-metallic hover:text-gold-bright')
          }
        >
          {option.visible ? 'Visible' : 'Hidden'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-md border border-gold-metallic/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-30"
        >
          {pending ? '…' : 'Save'}
        </button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Delete
          </button>
        )}
      </div>
      {feedback && (
        <p className="text-[11px] text-amber-400 md:col-span-4">{feedback}</p>
      )}
    </li>
  );
}

function AddOptionForm({
  setKey,
  nextOrder,
  onAdded,
}: {
  setKey: FormOptionSetKey;
  nextOrder: number;
  onAdded: (row: FormOption) => void;
}) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [order, setOrder] = useState(nextOrder.toString());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertFormOption({
        set_key: setKey,
        value,
        label: label || value,
        display_order: Number(order || 0),
        visible: true,
      });
      if (result.ok && result.data) {
        onAdded(result.data);
        setValue('');
        setLabel('');
        setOrder((Number(order) + 10).toString());
      } else if (!result.ok) {
        setFeedback(result.error);
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="grid items-end gap-2 rounded-md border border-gold-metallic/25 bg-ink-900/70 p-3 md:grid-cols-[100px,1fr,1fr,auto]"
    >
      <label className="block">
        <span className="text-[10px] uppercase tracking-luxe text-warmgrey">Order</span>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="mt-0.5 w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-luxe text-warmgrey">Value</span>
        <input
          required
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Tanzanite"
          className="mt-0.5 w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-luxe text-warmgrey">
          Label <span className="text-warmgrey/50">(falls back to value)</span>
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Tanzanite"
          className="mt-0.5 w-full rounded-md border border-gold-metallic/20 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add option'}
      </button>
      {feedback && (
        <p className="text-[11px] text-amber-400 md:col-span-4">{feedback}</p>
      )}
    </form>
  );
}
