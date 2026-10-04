"use client";

// src/lib/wishlist-context.tsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface WishlistContextValue {
  ready: boolean;
  count: number;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Checks whether the browser has a Supabase auth cookie.
 */
function hasAuthCookie() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split("; ")
    .some((cookie) => /^sb-.+-auth-token/.test(cookie));
}

function goToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(
    `/account/login?next=${encodeURIComponent(next)}`
  );
}

export function WishlistProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [ids, setIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const [ready, setReady] = useState(false);

  /**
   * Prevents repeated wishlist loading.
   */
  const loadedRef = useRef(false);

  /**
   * Prevents duplicate requests if React Strict Mode runs the
   * effect more than once during development.
   */
  const loadingRef = useRef(false);

  /**
   * Load the wishlist once when the provider mounts.
   *
   * We intentionally do NOT depend on pathname.
   * Navigation should not trigger another /api/wishlist request.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      if (loadedRef.current || loadingRef.current) {
        return;
      }

      if (!hasAuthCookie()) {
        if (!cancelled) {
          setIds(new Set());
          setReady(true);
        }

        return;
      }

      loadingRef.current = true;

      try {
        const res = await fetch("/api/wishlist", {
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.ok) {
          const data: { ids?: string[] } = await res.json();

          setIds(new Set(data.ids ?? []));
          loadedRef.current = true;
        }
      } catch {
        // Keep the wishlist empty on transient/offline errors.
      } finally {
        loadingRef.current = false;

        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void loadWishlist();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * If the user navigates to a different page after signing out,
   * clear the local wishlist state.
   *
   * This does NOT fetch /api/wishlist again.
   */
  useEffect(() => {
    if (!hasAuthCookie() && loadedRef.current) {
      loadedRef.current = false;
      loadingRef.current = false;
      setIds(new Set());
      setReady(true);
    }
  }, [pathname]);

  const mutate = useCallback(
    async (productId: string, save: boolean): Promise<boolean> => {
      if (!hasAuthCookie()) {
        goToLogin();
        return false;
      }

      const apply = (add: boolean) => {
        setIds((previous) => {
          const next = new Set(previous);

          if (add) {
            next.add(productId);
          } else {
            next.delete(productId);
          }

          return next;
        });
      };

      // Optimistic update.
      apply(save);

      try {
        const res = save
          ? await fetch("/api/wishlist", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId }),
            })
          : await fetch(
              `/api/wishlist?productId=${encodeURIComponent(productId)}`,
              {
                method: "DELETE",
              }
            );

        if (res.status === 401) {
          apply(!save);
          goToLogin();
          return false;
        }

        if (!res.ok) {
          throw new Error(
            `Wishlist request failed (${res.status})`
          );
        }

        return true;
      } catch {
        // Roll back optimistic update.
        apply(!save);
        return false;
      }
    },
    []
  );

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

      remove: (productId) =>
        mutate(productId, false),
    }),
    [ready, ids, toggle, mutate]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);

  if (!ctx) {
    throw new Error(
      "useWishlist must be used within a <WishlistProvider>"
    );
  }

  return ctx;
}