"use client";

import { useEffect, useRef, useState } from "react";
import { btnGhost } from "./ui";

/**
 * Camera scanner for QR codes and barcodes. Uses html5-qrcode because Safari on iPhone/iPad does not
 * implement the browser BarcodeDetector API. The camera needs HTTPS (funkful.co.za is) and the user's permission.
 */
export function ScannerModal({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("inv-scanner");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (text) => {
            if (done.current) return;
            done.current = true;
            onCode(text);
          },
          () => {},
        );
      } catch (e) {
        console.error("Scanner failed to start:", e);
        setError("Couldn't open the camera. Allow camera access for this site in Safari settings, then try again.");
      }
    })();

    return () => {
      cancelled = true;
      const s = scanner;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
    // onCode is intentionally read once; the scan result is delivered a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Scan a label">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Scan a label</h2>
          <button type="button" onClick={onClose} className={btnGhost}>
            Close
          </button>
        </div>
        <div id="inv-scanner" className="overflow-hidden rounded-2xl bg-black/5" />
        {error ? <p className="mt-3 text-sm font-bold text-red-800">{error}</p> : <p className="mt-3 text-sm text-neutral-600">Point the camera at a Funkful QR label or a manufacturer barcode.</p>}
      </div>
    </div>
  );
}

export function ScanButton({ onCode, label = "Scan" }: { onCode: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnGhost}>
        📷 {label}
      </button>
      {open ? (
        <ScannerModal
          onCode={(code) => {
            setOpen(false);
            onCode(code);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
