// src/app/scoopful/layout.tsx
import { ReactNode } from "react";
import type { Metadata } from "next";
import { brands, palette } from "@/lib/brands";

const brand = brands.scoopful;

// Per-brand metadata — every route nested under /scoopful inherits this
// unless it defines its own.
export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
};

export default function ScoopfulLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={
        {
          // Expose this brand's accent colors as CSS variables so any
          // component under /scoopful can reach for `var(--brand-accent)`
          // instead of importing brands.ts directly. This is what lets a
          // future brand (e.g. Anime Box) get its own layout.tsx that swaps
          // these two lines and nothing else.
          "--brand-accent": brand.accent,
          "--brand-ink": brand.accentInk,
          background: palette.cream,
          color: palette.black,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
