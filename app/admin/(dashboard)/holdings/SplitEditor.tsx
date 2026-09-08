'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { StockItem } from '@/types/database';
import {
  removeSplitLine,
  splitStockItem,
  unsplitStockItem,
  updateSplitLine,
} from '@/lib/actions/stockItems';

type NewLine = { description: string; weight_grams: string; item_type: string };
const EMPTY_LINE: NewLine = { description: '', weight_grams: '', item_type: '' };

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const g = (n: number) => `${round3(n).toLocaleString('en-GB', { maximumFractionDigits: 3 })}g`;
const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Split mode: break a bulk holding into the physical pieces that make up
 * its weight. Allocated / remaining update on every keystroke, over-
 * allocation is flagged before save and refused by the server.
 */
export function SplitEditor({
  parent,
  initialChildren,
  onChange,
}: {
  parent: StockItem;
  initialChildren: StockItem[];
  /** Fires after any save so the page can refresh the parent's status. */
  onChange: () => void;
}) {
  const [children, setChildren] = useState<StockItem[]>(initialChildren);
  const [lines, setLines] = useState<NewLine[]>(initialChildren.length === 0 ? [{ ...EMPTY_LINE }] : []);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const original = Number(parent.weight_grams) || 0;
  const paidPerGram = original > 0 ? (Number(parent.acquired_paid_gbp) || 0) / original : 0;
  const saved = children.reduce((sum, c) => sum + (Number(c.weight_grams) || 0), 0);
  const unsaved = lines.reduce((sum, l) => sum + (Number(l.weight_grams) || 0), 0);
  const allocated = saved + unsaved;
  const remaining = original - allocated;
  const over = remaining < -0.0005;
  const complete = Math.abs(remaining) <= 0.0005 && allocated > 0;

  const patchLine = (idx: number, patch: Partial<NewLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const saveNew = () => {
    setFeedback(null);
    const ready = lines.filter((l) => l.description.trim() || l.weight_grams.trim());
    if (ready.length === 0) {
      setFeedback({ ok: false, text: 'Add at least one item with a description and weight.' });
      return;
    }
    startTransition(async () => {
      const result = await splitStockItem(
        parent.id,
        ready.map((l) => ({
          description: l.description,
          weight_grams: Number(l.weight_grams),
          item_type: l.item_type || null,
        })),
      );
      if (result.ok && result.data) {
        setChildren((prev) => [...prev, ...result.data!.children]);
        setLines([]);
        setFeedback({
          ok: true,
          text: `Created ${result.data.children.map((c) => c.stock_number).join(', ')}.`,
        });
        onChange();
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  const undoAll = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await unsplitStockItem(parent.id);
      if (result.ok) {
        setChildren([]);
        setLines([{ ...EMPTY_LINE }]);
        setFeedback({ ok: true, text: 'Split undone - the holding is whole again.' });
        onChange();
      } else setFeedback({ ok: false, text: result.error });
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-gold-metallic/25 bg-ink-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Split mode
          </h2>
          <p className="mt-1 max-w-xl text-[11px] text-warmgrey">
            Enter the individual pieces that make up this {g(original)} holding. Each one gets
            its own CG stock code and stays linked to this purchase. Cost is shared out by weight
            ({gbp(paidPerGram)}/g).
          </p>
        </div>
        {children.length > 0 && (
          <button
            type="button"
            onClick={undoAll}
            disabled={pending}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300 disabled:opacity-50"
          >
            Undo whole split
          </button>
        )}
      </div>

      {/* ------------------------------------------------ Running totals */}
      <div
        className={
          'grid gap-3 rounded-md border p-3 sm:grid-cols-3 ' +
          (over
            ? 'border-red-500/50 bg-red-500/10'
            : complete
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-gold-metallic/20 bg-ink-950/50')
        }
        aria-live="polite"
      >
        <Stat label="Original holding" value={g(original)} />
        <Stat label="Allocated" value={g(allocated)} tone={over ? 'bad' : complete ? 'good' : undefined} />
        <Stat
          label={over ? 'Over by' : 'Remaining'}
          value={g(Math.abs(remaining))}
          tone={over ? 'bad' : complete ? 'good' : undefined}
        />
        <p className="sm:col-span-3 text-[11px]">
          {over ? (
            <span className="text-red-300">
              The split exceeds the original holding by {g(Math.abs(remaining))}. Reduce a weight
              before saving.
            </span>
          ) : complete ? (
            <span className="text-emerald-300">
              {g(allocated)} allocated - {g(0)} remaining. Fully split.
            </span>
          ) : (
            <span className="text-warmgrey">
              {g(allocated)} allocated - {g(remaining)} remaining.
            </span>
          )}
        </p>
      </div>

      {/* ------------------------------------------------ Saved pieces */}
      {children.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-gold-metallic/15">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
              <tr>
                <th className="px-3 py-2 text-left">Stock #</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-right">Weight</th>
                <th className="px-2 py-2 text-right">Cost share</th>
                <th className="px-2 py-2 text-right">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {children.map((c) => (
                <ChildRow
                  key={c.id}
                  child={c}
                  parent={parent}
                  siblingsWeight={saved - (Number(c.weight_grams) || 0) + unsaved}
                  onSaved={(next) => {
                    setChildren((prev) => prev.map((x) => (x.id === next.id ? next : x)));
                    onChange();
                  }}
                  onRemoved={() => {
                    setChildren((prev) => prev.filter((x) => x.id !== c.id));
                    onChange();
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------ New pieces */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-md border border-gold-metallic/15 bg-ink-950/50 p-3 md:grid-cols-[1fr,140px,150px,auto]"
          >
            <Input
              label={`Item ${children.length + idx + 1} description`}
              value={line.description}
              onChange={(v) => patchLine(idx, { description: v })}
              placeholder="e.g. Cuban link chain"
            />
            <Input
              label="Weight (g)"
              type="number"
              step="0.001"
              value={line.weight_grams}
              onChange={(v) => patchLine(idx, { weight_grams: v })}
            />
            <Input
              label="Type"
              value={line.item_type}
              onChange={(v) => patchLine(idx, { item_type: v })}
              placeholder="chain, ring, band…"
            />
            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
              >
                Remove
              </button>
            </div>
            {line.weight_grams && (
              <p className="text-[10px] text-warmgrey/70 md:col-span-4">
                Cost share {gbp(paidPerGram * (Number(line.weight_grams) || 0))}
              </p>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            className="rounded-md border border-gold-metallic/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:border-gold-metallic hover:text-gold-bright"
          >
            + Add item
          </button>
          <div className="flex items-center gap-3">
            {feedback && (
              <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
                {feedback.text}
              </p>
            )}
            {lines.length > 0 && (
              <button
                type="button"
                onClick={saveNew}
                disabled={pending || over}
                className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Saving…' : `Save ${lines.length} piece${lines.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChildRow({
  child,
  parent,
  siblingsWeight,
  onSaved,
  onRemoved,
}: {
  child: StockItem;
  parent: StockItem;
  /** Everything allocated except this row - for the inline over check. */
  siblingsWeight: number;
  onSaved: (next: StockItem) => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(child.description ?? '');
  const [weight, setWeight] = useState(child.weight_grams?.toString() ?? '');
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const sold = child.status === 'sold';
  const room = (Number(parent.weight_grams) || 0) - siblingsWeight;
  const overHere = editing && Number(weight) > room + 0.0005;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSplitLine(child.id, {
        description,
        weight_grams: Number(weight),
        item_type: child.item_type,
        notes: child.notes,
      });
      if (result.ok && result.data) {
        onSaved(result.data);
        setEditing(false);
      } else if (!result.ok) setError(result.error);
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeSplitLine(child.id);
      if (result.ok) onRemoved();
      else {
        setError(result.error);
        setArmed(false);
      }
    });
  };

  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-3 py-2">
        <Link
          href={`/admin/holdings/${child.id}`}
          className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
        >
          {child.stock_number}
        </Link>
      </td>
      <td className="px-2 py-2 text-[12px] text-white">
        {editing ? (
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-2 py-1 text-sm text-white focus:border-gold-metallic focus:outline-none"
          />
        ) : (
          child.description
        )}
        {error && <p className="mt-1 text-[10px] text-amber-400">{error}</p>}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right text-[12px] text-white">
        {editing ? (
          <input
            type="number"
            min="0"
            step="0.001"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={
              'w-24 rounded-md border bg-ink-950/60 px-2 py-1 text-right text-sm text-white focus:outline-none ' +
              (overHere ? 'border-red-500/60' : 'border-gold-metallic/20 focus:border-gold-metallic')
            }
          />
        ) : (
          g(Number(child.weight_grams) || 0)
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right text-[12px] text-warmgrey">
        {gbp(Number(child.acquired_paid_gbp) || 0)}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right text-[10px] uppercase tracking-luxe">
        {sold ? <span className="text-emerald-300">Sold</span> : <span className="text-warmgrey">Held</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right text-[10px] uppercase tracking-luxe">
        {sold ? null : editing ? (
          <span className="inline-flex gap-2">
            <button type="button" onClick={save} disabled={pending || overHere} className="text-gold-tint hover:text-gold-bright disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-warmgrey hover:text-white">
              Cancel
            </button>
          </span>
        ) : armed ? (
          <span className="inline-flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="text-red-300 hover:text-red-200">
              Confirm remove
            </button>
            <button type="button" onClick={() => setArmed(false)} className="text-warmgrey hover:text-white">
              Cancel
            </button>
          </span>
        ) : (
          <span className="inline-flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-gold-metallic/70 hover:text-gold-bright">
              Edit
            </button>
            <button type="button" onClick={() => setArmed(true)} className="text-warmgrey hover:text-red-300">
              Remove
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</div>
      <div
        className={
          'font-display text-lg ' +
          (tone === 'bad' ? 'text-red-300' : tone === 'good' ? 'text-emerald-300' : 'text-white')
        }
      >
        {value}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}
