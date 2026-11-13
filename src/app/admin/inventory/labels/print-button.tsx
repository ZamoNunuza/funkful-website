"use client";

import { btnPrimary } from "../ui";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btnPrimary}>
      Print labels
    </button>
  );
}
