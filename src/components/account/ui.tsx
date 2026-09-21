// src/components/account/ui.tsx
//
// Small presentational building blocks shared by the account pages. No hooks
// and no server-only imports, so it works from both server and client files.

import type { CSSProperties, ReactNode } from "react";
import { palette } from "@/lib/brands";
import type { StatusTone } from "@/lib/account-shared";

export const inputStyle: CSSProperties = { borderColor: "rgba(17,17,17,0.2)", background: palette.cream };
export const inputClass = "w-full border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";
export const primaryButtonStyle: CSSProperties = { background: palette.black, color: palette.cream };
export const primaryButtonClass =
  "font-extrabold text-xs uppercase tracking-wide px-6 py-3.5 rounded-full disabled:opacity-60 inline-flex items-center justify-center";
export const outlineButtonClass =
  "font-extrabold text-xs uppercase tracking-wide px-6 py-3 rounded-full border-2 border-black inline-flex items-center justify-center";

export const smallPrimaryButtonClass =
  "font-extrabold text-[11.5px] uppercase tracking-wide px-5 py-2.5 rounded-full disabled:opacity-60 inline-flex items-center justify-center";
export const smallOutlineButtonClass =
  "font-extrabold text-[11.5px] uppercase tracking-wide px-5 py-2 rounded-full border-2 border-black inline-flex items-center justify-center";

export function Card({
  children,
  className = "",
  tint,
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  /** Use a brand tint (e.g. palette.beige) instead of white. */
  tint?: string;
  /** Tighter padding for list rows. */
  compact?: boolean;
}) {
  return (
    <div
      style={{ background: tint ?? "white", borderColor: "rgba(17,17,17,0.08)" }}
      className={`border rounded-[22px] ${compact ? "p-5 sm:p-6" : "p-6 sm:p-7"} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl sm:text-3xl font-black uppercase">{title}</h2>
      {children && <p className="text-sm text-neutral-600 leading-relaxed mt-2 max-w-xl">{children}</p>}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-extrabold uppercase mb-4">{children}</h3>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ color: "#6a6458" }} className="text-[11.5px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

const toneStyles: Record<StatusTone, CSSProperties> = {
  success: { background: palette.sage, color: "#1c2617" },
  info: { background: palette.lavender, color: "#241a45" },
  warning: { background: palette.gold, color: "#3e2f0d" },
  danger: { background: "#f8e5e2", color: "#8a2f2b" },
  neutral: { background: palette.beige, color: "#4a4438" },
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      style={toneStyles[tone]}
      className="inline-flex items-center rounded-full px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wide whitespace-nowrap"
    >
      {label}
    </span>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="text-xs rounded-xl px-3.5 py-3" style={{ background: "#f8e5e2", color: "#8a2f2b" }}>
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-xs font-semibold rounded-xl px-3.5 py-3" style={{ background: palette.sage, color: "#1c2617" }}>
        {success}
      </p>
    );
  }
  return null;
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ background: palette.beige }} className="rounded-[22px] p-8 sm:p-10 text-center">
      <h3 className="text-base font-black uppercase mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto mb-6">{children}</p>
      {action}
    </div>
  );
}
