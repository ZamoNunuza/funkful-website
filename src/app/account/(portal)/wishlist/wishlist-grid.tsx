"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { brands, palette } from "@/lib/brands";
import { formatRands } from "@/lib/account-shared";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import type { WishlistProductView } from "@/lib/account-server";
import {
  EmptyState,
  primaryButtonClass,
  primaryButtonStyle,
  smallOutlineButtonClass,
  smallPrimaryButtonClass,
} from "@/components/account/ui";

export default function WishlistGrid({ items: initialItems }: { items: WishlistProductView[] }) {
  const { addItem } = useCart();
  const { remove } = useWishlist();
  const [items, setItems] = useState(initialItems);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeItem(id: string) {
    setError(null);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id)); // optimistic
    const ok = await remove(id);
    if (!ok) {
      setItems(previous);
      setError("We couldn't remove that item. Please try again.");
    }
  }

  function addToBag(item: WishlistProductView) {
    addItem({ id: item.id, brand: item.brand, name: item.name, priceCents: item.priceCents });
    setJustAdded(item.id);
    window.setTimeout(() => setJustAdded((current) => (current === item.id ? null : current)), 2000);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        action={
          <Link href="/originals" style={primaryButtonStyle} className={primaryButtonClass}>
            Browse Funkful Originals
          </Link>
        }
      >
        Tap the heart on anything you like and it will wait for you here.
      </EmptyState>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="text-xs rounded-xl px-3.5 py-3 mb-5" style={{ background: "#f8e5e2", color: "#8a2f2b" }}>
          {error}
        </p>
      )}

      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((item) => {
          const brand = brands[item.brand];
          return (
            <li key={item.id}>
              <div
                style={{ borderColor: "rgba(17,17,17,0.08)", opacity: item.available ? 1 : 0.75 }}
                className="bg-white border rounded-[20px] overflow-hidden flex flex-col h-full"
              >
                <div style={{ background: item.swatch }} className="relative aspect-[4/3] flex items-center justify-center p-5">
                  {item.badge && (
                    <span
                      style={{ background: palette.cream }}
                      className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                    >
                      {item.badge}
                    </span>
                  )}
                  <Image src={brand.logo} alt="" width={56} height={56} className="object-contain opacity-80" draggable={false} />
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p style={{ color: "#8a4a45" }} className="text-[10px] font-bold uppercase tracking-wide">
                    {brand.name}
                  </p>
                  <h4 className="text-sm font-bold mt-1">{item.name}</h4>
                  {item.available ? (
                    <p className="text-sm font-bold mt-2">{item.canAddDirect ? formatRands(item.priceCents) : `From ${formatRands(item.priceCents)}`}</p>
                  ) : (
                    <p className="text-xs text-neutral-500 mt-2">You can remove it from your list.</p>
                  )}

                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-3">
                    {item.available &&
                      (item.canAddDirect ? (
                        <button type="button" onClick={() => addToBag(item)} style={primaryButtonStyle} className={smallPrimaryButtonClass}>
                          {justAdded === item.id ? "Added ✓" : "Add to bag"}
                        </button>
                      ) : (
                        <Link href={item.href} className={smallOutlineButtonClass}>
                          Choose options
                        </Link>
                      ))}
                    <button type="button" onClick={() => void removeItem(item.id)} className="ghost text-xs font-bold uppercase underline text-neutral-500">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
