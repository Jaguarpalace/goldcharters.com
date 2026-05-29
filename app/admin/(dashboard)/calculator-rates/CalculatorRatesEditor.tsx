'use client';

import { useState, useTransition } from 'react';
import type { CalculatorRate } from '@/types/database';
import { updateCalculatorRate } from '@/lib/actions/calculatorRates';

type LocalRate = CalculatorRate & { _dirty?: boolean };

export function CalculatorRatesEditor({ initialRates }: { initialRates: CalculatorRate[] }) {
  const [rates, setRates] = useState<LocalRate[]>(initialRates);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const update = (id: string, patch: Partial<LocalRate>) => {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, _dirty: true } : r)));
  };

  const save = (rate: LocalRate) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateCalculatorRate(rate.id, {
        price_per_gram: rate.price_per_gram,
        margin_percentage: rate.margin_percentage,
        visible: rate.visible,
        display_order: rate.display_order,
        admin_notes: rate.admin_notes,
      });
      if (result.ok) {
        setRates((rs) =>
          rs.map((r) =>
            r.id === rate.id ? { ...r, _dirty: false, updated_at: new Date().toISOString() } : r,
          ),
        );
        setFeedback(`Saved ${rate.metal_type} ${rate.carat_label}`);
      } else {
        setFeedback(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <p className="rounded-lg border border-gold-metallic/30 bg-ink-900/80 px-4 py-3 text-sm text-gold-tint">
          {feedback}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-gold-metallic/15">
        <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
          <thead className="bg-ink-900/80 text-left text-[11px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-4 py-3">Metal</th>
              <th className="px-4 py-3">Carat</th>
              <th className="px-4 py-3">Purity %</th>
              <th className="px-4 py-3">Manual £/g</th>
              <th className="px-4 py-3">Auto · margin %</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {rates.map((rate) => (
              <tr key={rate.id} className={rate._dirty ? 'bg-amber-500/5' : ''}>
                <td className="px-4 py-3 text-white">{rate.metal_type}</td>
                <td className="px-4 py-3 text-white">{rate.carat_label}</td>
                <td className="px-4 py-3 text-warmgrey">{rate.purity_percentage}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={rate.price_per_gram}
                    onChange={(e) =>
                      update(rate.id, { price_per_gram: parseFloat(e.target.value) || 0 })
                    }
                    disabled={rate.margin_percentage != null && rate.margin_percentage > 0}
                    title={
                      rate.margin_percentage
                        ? 'Auto mode is on - manual price is ignored. Clear margin to edit.'
                        : 'Manual price per gram.'
                    }
                    className="w-28 rounded border border-gold-metallic/25 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="200"
                    value={rate.margin_percentage ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      update(rate.id, {
                        margin_percentage: e.target.value === '' ? null : parseFloat(e.target.value),
                      })
                    }
                    title="Set a margin % to compute price live from spot. e.g. 92 = pay 92% of purity-adjusted spot. Leave blank for manual mode."
                    className="w-24 rounded border border-gold-metallic/25 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={rate.display_order}
                    onChange={(e) =>
                      update(rate.id, { display_order: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-20 rounded border border-gold-metallic/25 bg-ink-950 px-2 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rate.visible}
                      onChange={(e) => update(rate.id, { visible: e.target.checked })}
                      className="h-4 w-4 accent-gold-metallic"
                    />
                  </label>
                </td>
                <td className="px-4 py-3 text-xs text-warmgrey">
                  {new Date(rate.updated_at).toLocaleString('en-GB')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={!rate._dirty || pending}
                    onClick={() => save(rate)}
                    className="gc-btn-ghost"
                  >
                    {rate._dirty ? 'Save' : 'Saved'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-warmgrey">
        Changes are saved per-row to keep the audit trail clean. Public calculator pages re-fetch on next
        request (ISR revalidation every 60 seconds, or on demand).
      </p>
    </div>
  );
}
