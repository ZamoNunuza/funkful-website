"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { palette } from "@/lib/brands";

const items = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Account details", href: "/account/details" },
];

function isActive(pathname: string, href: string) {
  return href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical list on desktop, horizontally scrollable pills on mobile. */
export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 lg:overflow-visible">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={
              active
                ? { background: palette.black, color: palette.cream, borderColor: palette.black }
                : { borderColor: "rgba(17,17,17,0.14)", color: palette.black }
            }
            className="shrink-0 text-xs font-bold uppercase tracking-wide px-4 py-3 rounded-full border whitespace-nowrap"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
