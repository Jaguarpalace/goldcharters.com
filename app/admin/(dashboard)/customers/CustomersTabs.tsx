'use client';

import { useState } from 'react';
import type { Customer } from '@/types/database';
import type { CustomerMapPoint } from '@/lib/queries/customers';
import { CustomersBoard } from './CustomersBoard';
import { CustomerMap } from './CustomerMap';

type Tab = 'list' | 'map';

/** List / Map switch for the Customers page. The map only mounts when shown. */
export function CustomersTabs({
  customers,
  mapPoints,
  shop,
  initialTab = 'list',
}: {
  customers: Customer[];
  mapPoints: CustomerMapPoint[];
  shop: { lat: number; lng: number; label: string };
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const mapped = mapPoints.filter((p) => p.latitude != null && p.longitude != null).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gold-metallic/15" role="tablist">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>
          List <span className="ml-1 text-[10px] text-warmgrey">({customers.length})</span>
        </TabButton>
        <TabButton active={tab === 'map'} onClick={() => setTab('map')}>
          Map <span className="ml-1 text-[10px] text-warmgrey">({mapped})</span>
        </TabButton>
      </div>

      {tab === 'list' ? (
        <CustomersBoard initialCustomers={customers} />
      ) : (
        <CustomerMap points={mapPoints} shop={shop} />
      )}
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        '-mb-px border-b-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe transition ' +
        (active
          ? 'border-gold-metallic text-gold-bright'
          : 'border-transparent text-warmgrey hover:text-gold-tint')
      }
    >
      {children}
    </button>
  );
}
