import type { ReactNode } from "react";
import Link from "next/link";
import type { StockStatus } from "@/lib/inventory/inventory-shared";

// Shared look for the inventory screens. Inputs are 16px+ so iOS Safari never zooms on focus,
// and every tap target is at least 44px tall for iPad / iPhone use.
export const inputCls =
  "mt-1 w-full min-h-11 rounded-xl border border-black/15 bg-white px-3 py-2 text-base font-normal outline-none focus:border-black/50";
export const labelCls = "block text-sm font-bold";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 py-2 text-sm font-black text-white transition hover:bg-black/85 disabled:opacity-50";
export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-bold transition hover:bg-black/5 disabled:opacity-50";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-black/10 bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function PageHeader({
  eyebrow = "Funkful inventory",
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a4a45]">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black uppercase sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-neutral-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const PILL: Record<StockStatus, { label: string; cls: string }> = {
  ok: { label: "In stock", cls: "bg-[#DDE7D8] text-[#2f5a2a]" },
  low: { label: "Low stock", cls: "bg-[#F6E3B4] text-[#7a5200]" },
  out: { label: "Out of stock", cls: "bg-[#EBC6C2] text-[#8a2f27]" },
};

export function StatusPill({ status }: { status: StockStatus }) {
  const p = PILL[status];
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-black text-center ${p.cls}`}>{p.label}</span>;
}

export function Bar({ pct, status = "ok" }: { pct: number; status?: StockStatus }) {
  const colour = status === "out" ? "#C9574D" : status === "low" ? "#D9A21B" : "#5E8F55";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: colour }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {hint ? <p className="mt-1 text-sm text-neutral-600">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ children, href, cta }: { children: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/20 p-8 text-center text-sm text-neutral-600">
      <p>{children}</p>
      {href && cta ? (
        <Link href={href} className={`${btnPrimary} mt-4`}>
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
}
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" });
}
