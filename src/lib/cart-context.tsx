"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { BrandSlug } from "@/lib/brands";

export interface CartItem {
  id: string;
  brand: BrandSlug;
  name: string;
  variant?: string;
  priceCents: number;
  quantity: number;
  productType?: "made-to-order" | "personalize" | "mystery" | "addon";
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | {
      type: "ADD_ITEM";
      item: Omit<CartItem, "quantity">;
      quantity?: number;
    }
  | {
      type: "REMOVE_ITEM";
      id: string;
    }
  | {
      type: "SET_QUANTITY";
      id: string;
      quantity: number;
    }
  | {
      type: "HYDRATE";
      items: CartItem[];
    }
  | {
      type: "CLEAR";
    };

const STORAGE_KEY = "funkful-cart";
const MAX_QTY = 50;

function sanitiseItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validItems = value.filter((item): item is CartItem => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const i = item as Partial<CartItem>;

    return (
      typeof i.id === "string" &&
      i.id.length > 0 &&
      typeof i.name === "string" &&
      i.name.length > 0 &&
      typeof i.brand === "string" &&
      typeof i.priceCents === "number" &&
      Number.isInteger(i.priceCents) &&
      i.priceCents >= 0 &&
      typeof i.quantity === "number" &&
      Number.isInteger(i.quantity) &&
      i.quantity > 0
    );
  });

  /*
   * Remove duplicate entries with the same cart ID.
   *
   * If the same ID appears more than once in localStorage,
   * combine the quantities instead of displaying duplicate rows.
   */
  const merged = new Map<string, CartItem>();

  for (const item of validItems) {
    const existing = merged.get(item.id);

    if (existing) {
      merged.set(item.id, {
        ...existing,
        quantity: Math.min(
          MAX_QTY,
          existing.quantity + item.quantity
        ),
      });
    } else {
      merged.set(item.id, {
        ...item,
        quantity: Math.min(MAX_QTY, item.quantity),
      });
    }
  }

  return Array.from(merged.values());
}

function cartReducer(
  state: CartState,
  action: CartAction
): CartState {
  switch (action.type) {
    case "HYDRATE":
      return {
        items: sanitiseItems(action.items),
      };

    case "ADD_ITEM": {
      const qty = Math.min(
        MAX_QTY,
        Math.max(1, action.quantity ?? 1)
      );

      const existing = state.items.find(
        (item) => item.id === action.item.id
      );

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === action.item.id
              ? {
                  ...item,
                  quantity: Math.min(
                    MAX_QTY,
                    item.quantity + qty
                  ),
                }
              : item
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            ...action.item,
            quantity: qty,
          },
        ],
      };
    }

    case "SET_QUANTITY":
      return {
        items: state.items
          .map((item) =>
            item.id === action.id
              ? {
                  ...item,
                  quantity: Math.min(
                    MAX_QTY,
                    Math.max(0, action.quantity)
                  ),
                }
              : item
          )
          .filter((item) => item.quantity > 0),
      };

    case "REMOVE_ITEM":
      return {
        items: state.items.filter(
          (item) => item.id !== action.id
        ),
      };

    case "CLEAR":
      return {
        items: [],
      };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number
  ) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
  itemCount: number;
}

const CartContext =
  createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
  });

  const [hydrated, setHydrated] = useState(false);

  /*
   * Load the cart exactly once when the client mounts.
   */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        dispatch({
          type: "HYDRATE",
          items: sanitiseItems(parsed),
        });
      } else {
        dispatch({
          type: "HYDRATE",
          items: [],
        });
      }
    } catch {
      /*
       * If localStorage is unavailable or contains malformed data,
       * start with an empty cart.
       */
      dispatch({
        type: "HYDRATE",
        items: [],
      });
    } finally {
      setHydrated(true);
    }
  }, []);

  /*
   * Persist ONLY after hydration has completed.
   *
   * This prevents the initial [] state from overwriting
   * an existing cart before localStorage has been loaded.
   */
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      const cleanItems = sanitiseItems(state.items);

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cleanItems)
      );
    } catch {
      // Best effort only.
    }
  }, [state.items, hydrated]);

  /*
   * Keep multiple browser tabs/windows in sync.
   *
   * The "storage" event fires in other tabs when localStorage
   * changes.
   */
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      try {
        const parsed: unknown = event.newValue
          ? JSON.parse(event.newValue)
          : [];

        dispatch({
          type: "HYDRATE",
          items: sanitiseItems(parsed),
        });
      } catch {
        dispatch({
          type: "HYDRATE",
          items: [],
        });
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      hydrated,

      addItem: (item, quantity) => {
        dispatch({
          type: "ADD_ITEM",
          item,
          quantity,
        });
      },

      removeItem: (id) => {
        dispatch({
          type: "REMOVE_ITEM",
          id,
        });
      },

      setQuantity: (id, quantity) => {
        dispatch({
          type: "SET_QUANTITY",
          id,
          quantity,
        });
      },

      clear: () => {
        dispatch({
          type: "CLEAR",
        });
      },

      subtotalCents: state.items.reduce(
        (sum, item) =>
          sum + item.priceCents * item.quantity,
        0
      ),

      itemCount: state.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    }),
    [state.items, hydrated]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error(
      "useCart must be used within a <CartProvider>"
    );
  }

  return ctx;
}