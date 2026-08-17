// src/lib/cart-context.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode } from "react";
import type { BrandSlug } from "@/lib/brands";

export interface CartItem {
  /** Stable id per line item, e.g. "scoopful-lucky-scoop-classic" */
  id: string;
  brand: BrandSlug;
  name: string;
  variant?: string;
  /** Price in cents (ZAR) — matches the unit Yoco's API expects, avoids float math */
  priceCents: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "quantity">; quantity?: number }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_QUANTITY"; id: string; quantity: number }
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "CLEAR" };

const STORAGE_KEY = "funkful-cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items };

    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, quantity: i.quantity + (action.quantity ?? 1) } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, quantity: action.quantity ?? 1 }] };
    }

    case "SET_QUANTITY":
      return {
        items: state.items
          .map((i) => (i.id === action.id ? { ...i, quantity: action.quantity } : i))
          .filter((i) => i.quantity > 0),
      };

    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.id !== action.id) };

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage once, client-side only (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", items: JSON.parse(raw) });
    } catch {
      // corrupt or inaccessible storage — start with an empty cart
    }
  }, []);

  // Persist on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // private browsing / quota exceeded — cart just won't survive a refresh
    }
  }, [state.items]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      items: state.items,
      addItem: (item, quantity) => dispatch({ type: "ADD_ITEM", item, quantity }),
      removeItem: (id) => dispatch({ type: "REMOVE_ITEM", id }),
      setQuantity: (id, quantity) => dispatch({ type: "SET_QUANTITY", id, quantity }),
      clear: () => dispatch({ type: "CLEAR" }),
      subtotalCents,
      itemCount,
    };
  }, [state.items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a <CartProvider>");
  return ctx;
}
