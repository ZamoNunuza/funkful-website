"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/inventory", label: "Overview", icon: "▦", exact: true },
  { href: "/admin/inventory/materials", label: "Materials", icon: "◧" },
  { href: "/admin/inventory/stock-in", label: "Stock in", icon: "⬇" },
  { href: "/admin/inventory/stock-out", label: "Stock out", icon: "⬆" },
  { href: "/admin/inventory/stocktaking", label: "Stocktaking", icon: "✓" },
  { href: "/admin/inventory/suppliers", label: "Suppliers", icon: "⌂" },
  { href: "/admin/inventory/history", label: "History", icon: "≡" },
  { href: "/admin/inventory/reports", label: "Reports", icon: "▤" },
  { href: "/admin/inventory/setup", label: "Brands & setup", icon: "⚙" },
];

export default function InventoryNav() {
  const pathname = usePathname();
  const active = (item: (typeof ITEMS)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <>
      {/* Desktop / iPad landscape: sidebar */}
      <nav aria-label="Inventory" className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-6 space-y-1">
          <p className="mb-3 px-3 text-xs font-black uppercase tracking-[0.16em] text-black/45">Funkful inventory</p>
          <p className="mb-3 px-3 text-xs font-bold text-[#2f5a2a]">● Cloud synced</p>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active(item) ? "bg-black text-white" : "hover:bg-black/5"}`}
            >
              <span aria-hidden className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <Link href="/admin" className="mt-4 flex min-h-11 items-center px-3 text-xs font-bold text-neutral-600 underline">
            ← Admin dashboard
          </Link>
        </div>
      </nav>

      {/* iPhone / iPad portrait: scrolling chip bar + floating scan button */}
      <nav aria-label="Inventory" className="-mx-5 mb-5 overflow-x-auto px-5 md:hidden">
        <div className="flex gap-2 pb-1">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item) ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-bold ${active(item) ? "border-black bg-black text-white" : "border-black/15 bg-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <Link
        href="/admin/inventory/scan"
        className="print-hide hidden fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white shadow-lg"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        📷 Scan
      </Link>
    </>
  );
}
