"use client";

// src/lib/wishlist-context.tsx
//
// Client-side wishlist state, mirroring lib/cart-context.tsx. The list lives
// in Supabase (public.wishlist_items) and is fetched once per visit for
// signed-in customers; hearts update optimistically and roll back on failure.
//
// Visitors who aren't signed in are sent to the login page when they tap a
// heart, then land back where they were.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface WishlistContextValue {
  /** True once we know whether the visitor has a saved list (or is signed out). */
  ready: boolean;
  count: number;
  isSaved: (productId: string) => boolean;
  /** Save or unsave. Sends signed-out visitors to the login page. */
  toggle: (productId: string) => Promise<void>;
  /** Unsave (used by the wishlist page). Resolves to true on success. */
  remove: (productId: string) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Supabase keeps its session in a cookie named sb-<project>-auth-token
 * (chunked as .0, .1 … for long sessions). Checking for it lets signed-out
 * visitors skip the API call entirely.
 */
function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) => /^sb-.+-auth-token/.test(cookie));
}

function goToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/account/login?next=${encodeURIComponent(next)}`);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  // Load the list once we see a session; re-check on navigation while signed
  // out (so the hearts fill in right after login) and clear it after sign-out.
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!hasAuthCookie()) {
        if (loadedRef.current) {
          loadedRef.current = false;
          if (!cancelled) setIds(new Set());
        }
        if (!cancelled) setReady(true);
        return;
      }
      if (loadedRef.current) return;

      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data: { ids?: string[] } = await res.json();
          loadedRef.current = true;
          setIds(new Set(data.ids ?? []));
        }
      } catch {
        // Offline or a transient error — hearts simply stay empty until the next navigation.
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const mutate = useCallback(async (productId: string, save: boolean) => {
    if (!hasAuthCookie()) {
      goToLogin();
      return false;
    }

    const apply = (add: boolean) =>
      setIds((previous) => {
        const next = new Set(previous);
        if (add) next.add(productId);
        else next.delete(productId);
        return next;
      });

    apply(save); // optimistic

    try {
      const res = save
        ? await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          })
        : await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });

      if (res.status === 401) {
        apply(!save);
        goToLogin();
        return false;
      }
      if (!res.ok) throw new Error(`Wishlist request failed (${res.status})`);
      return true;
    } catch {
      apply(!save); // roll back
      return false;
    }
  }, []);

  const toggle = useCallback(
    async (productId: string) => {
      await mutate(productId, !ids.has(productId));
    },
    [ids, mutate]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      ready,
      count: ids.size,
      isSaved: (productId) => ids.has(productId),
      toggle,
      remove: (productId) => mutate(productId, false),
    }),
    [ready, ids, toggle, mutate]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a <WishlistProvider>");
  return ctx;
}
