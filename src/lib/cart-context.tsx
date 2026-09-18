"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, ReactNode } from "react";
import type { BrandSlug } from "@/lib/brands";

export interface CartItem {
  id: string;
  brand: BrandSlug;
  name: string;
  variant?: string;
  priceCents: number;
  quantity: number;
}

interface CartState { items: CartItem[]; }

type CartAction =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "quantity">; quantity?: number }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_QUANTITY"; id: string; quantity: number }
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "CLEAR" };

const STORAGE_KEY = "funkful-cart";
const MAX_QTY = 50;

function sanitiseItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CartItem => {
    if (!item || typeof item !== "object") return false;
    const i = item as Partial<CartItem>;
    return typeof i.id === "string" && typeof i.name === "string" && typeof i.brand === "string" &&
      typeof i.priceCents === "number" && Number.isInteger(i.priceCents) && i.priceCents >= 0 && typeof i.quantity === "number" && Number.isInteger(i.quantity) && i.quantity > 0;
  }).map((item) => ({ ...item, quantity: Math.min(MAX_QTY, item.quantity) }));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE": return { items: sanitiseItems(action.items) };
    case "ADD_ITEM": {
      const qty = Math.min(MAX_QTY, Math.max(1, action.quantity ?? 1));
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return { items: state.items.map((i) => i.id === action.item.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + qty) } : i) };
      }
      return { items: [...state.items, { ...action.item, quantity: qty }] };
    }
    case "SET_QUANTITY":
      return { items: state.items.map((i) => i.id === action.id ? { ...i, quantity: Math.min(MAX_QTY, Math.max(0, action.quantity)) } : i).filter((i) => i.quantity > 0) };
    case "REMOVE_ITEM": return { items: state.items.filter((i) => i.id !== action.id) };
    case "CLEAR": return { items: [] };
    default: return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
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
  const [hydrated, setHydrated] = useReducer(() => true, false);
  const hasHydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", items: JSON.parse(raw) });
    } catch {
      // Ignore malformed or unavailable storage and use an empty cart.
    } finally {
      hasHydrated.current = true;
      setHydrated();
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch { /* best effort */ }
  }, [state.items]);

  const value = useMemo<CartContextValue>(() => ({
    items: state.items,
    hydrated,
    addItem: (item, quantity) => dispatch({ type: "ADD_ITEM", item, quantity }),
    removeItem: (id) => dispatch({ type: "REMOVE_ITEM", id }),
    setQuantity: (id, quantity) => dispatch({ type: "SET_QUANTITY", id, quantity }),
    clear: () => dispatch({ type: "CLEAR" }),
    subtotalCents: state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
  }), [state.items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a <CartProvider>");
  return ctx;
}
