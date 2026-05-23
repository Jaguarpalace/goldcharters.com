'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartSnapshot } from '@/types/cart';

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  snapshot: () => CartSnapshot;
  setHydrated: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      add: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          const desiredQty = newItem.quantity ?? 1;

          if (existing) {
            const capped = Math.min(existing.quantity + desiredQty, existing.maxQuantity);
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId ? { ...i, quantity: capped } : i,
              ),
            };
          }

          const initialQty = Math.min(desiredQty, newItem.maxQuantity);
          return {
            items: [...state.items, { ...newItem, quantity: Math.max(1, initialQty) }],
          };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),

      snapshot: () => {
        const items = get().items;
        const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
        return { items, subtotal, itemCount };
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'gc-cart-v1',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
