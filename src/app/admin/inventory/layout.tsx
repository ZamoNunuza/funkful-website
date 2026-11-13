import type { ReactNode } from "react";
import type { Viewport } from "next";
import { palette } from "@/lib/brands";
import InventoryNav from "../../../components/admin/inventory-nav";

export const metadata = {
  title: "Inventory | Funkful admin",
  robots: { index: false, follow: false },
  // Lets "Add to Home Screen" on iPhone/iPad open this as a full-screen app.
  appleWebApp: { capable: true, title: "Funkful Stock", statusBarStyle: "default" as const },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FAF8F4" };

// Admin access is already enforced by src/app/admin/layout.tsx (requireAdmin).
export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen" style={{ background: palette.cream, color: palette.black }}>
      <div className="mx-auto flex max-w-[1280px] flex-col px-5 py-6 pb-28 sm:px-8 md:flex-row md:gap-8 md:py-10">
        <InventoryNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
