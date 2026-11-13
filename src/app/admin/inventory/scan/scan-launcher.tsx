"use client";

import { useRouter } from "next/navigation";
import { extractScanCode } from "@/lib/inventory/inventory-shared";
import { ScannerModal } from "../scanner";
import { btnGhost } from "../ui";
import { useState } from "react";

export default function ScanLauncher() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={btnGhost}>📷 Open the camera</button>
      ) : (
        <ScannerModal
          onCode={(raw) => {
            setOpen(false);
            router.push(`/admin/inventory/m/${encodeURIComponent(extractScanCode(raw))}`);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
