"use client";

import type { CSSProperties } from "react";
import { useWishlist } from "@/lib/wishlist-context";

const SAVED_COLOR = "#8a4a45";

function Heart({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

interface WishlistButtonProps {
  productId: string;
  /** Used in the accessible label, e.g. "Save Sunburst Ceramic Mug to wishlist". */
  productName?: string;
  /** "icon" is a round heart for card corners; "labelled" is a pill for product pages. */
  variant?: "icon" | "labelled";
  /** Extra classes for positioning, e.g. "absolute top-3.5 right-3.5 z-10". */
  className?: string;
}

export default function WishlistButton({ productId, productName, variant = "icon", className = "" }: WishlistButtonProps) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(productId);
  const label = saved
    ? `Remove ${productName ?? "item"} from wishlist`
    : `Save ${productName ?? "item"} to wishlist`;
  const color = saved ? SAVED_COLOR : "#111111";
  // The site-wide button:hover rule recolours buttons, so keep our own hover colour.
  const style = { color, "--ghost-hover": color } as CSSProperties;

  if (variant === "labelled") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        aria-label={label}
        onClick={() => void toggle(productId)}
        style={style}
        className={`ghost inline-flex items-center gap-2 rounded-full border-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wide ${className}`}
      >
        <Heart filled={saved} size={16} />
        {saved ? "Saved" : "Save for later"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved to wishlist" : "Save to wishlist"}
      onClick={() => void toggle(productId)}
      style={style}
      className={`ghost ${className}`}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
        style={{ boxShadow: "0 1px 4px rgba(17,17,17,0.18)" }}
      >
        <Heart filled={saved} size={18} />
      </span>
    </button>
  );
}
