"use client";

import { useActionState, useRef, useState } from "react";
import { extractScanCode, formatQty, type Unit } from "@/lib/inventory/inventory-shared";
import {
  cancelStocktakeAction,
  completeStocktakeAction,
  saveCountAction,
  startStocktakeAction,
  type ActionState,
} from "./actions";
import { FormMessage, QtyInput, SubmitButton } from "./form-bits";
import { ScanButton } from "./scanner";
import { btnGhost, inputCls, labelCls } from "./ui";

export function StartStocktakeForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(startStocktakeAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <label className={labelCls}>
        Name (optional)
        <input name="name" className={inputCls} placeholder="e.g. End of November count" />
      </label>
      <label className={labelCls}>
        What are you counting?
        <select name="category_id" className={inputCls} defaultValue="">
          <option value="">Everything</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} only
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>Start counting</SubmitButton>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export interface CountLine {
  materialId: string;
  code: string;
  barcode: string | null;
  title: string;
  category: string;
  unit: Unit;
  systemQty: number; // expected snapshot for counted lines, live quantity otherwise
  counted: number | null;
}

function CountRow({ stocktakeId, line, highlighted }: { stocktakeId: string; line: CountLine; highlighted: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCountAction, null);
  const variance = line.counted === null ? null : Math.round((line.counted - line.systemQty) * 1000) / 1000;
  return (
    <li
      id={`count-${line.materialId}`}
      className={`rounded-2xl border p-4 ${highlighted ? "border-black bg-[#FFF6DB]" : "border-black/10 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black">{line.title}</p>
          <p className="text-xs text-neutral-600">
            {line.code} · {line.category} · System: {formatQty(line.systemQty, line.unit)}
          </p>
        </div>
        {line.counted !== null ? (
          <p className={`text-sm font-black ${variance === 0 ? "text-green-800" : "text-red-800"}`}>
            Counted {formatQty(line.counted, line.unit)}
            {variance ? ` (${variance > 0 ? "+" : ""}${formatQty(variance, line.unit)})` : " ✓"}
          </p>
        ) : null}
      </div>
      <form action={action} className="mt-3 flex items-start gap-2">
        <input type="hidden" name="stocktake_id" value={stocktakeId} />
        <input type="hidden" name="material_id" value={line.materialId} />
        <div className="flex-1">
          <QtyInput unit={line.unit} name="counted" placeholder="Physical quantity" />
        </div>
        <SubmitButton className="mt-1 inline-flex min-h-11 items-center rounded-xl bg-black px-4 text-sm font-black text-white disabled:opacity-50">
          {line.counted === null ? "Save" : "Update"}
        </SubmitButton>
      </form>
      <div className="mt-2">
        <FormMessage state={state} />
      </div>
    </li>
  );
}

export function CountList({ stocktakeId, lines, open }: { stocktakeId: string; lines: CountLine[]; open: boolean }) {
  const [filter, setFilter] = useState("");
  const [highlight, setHighlight] = useState("");
  const [hideCounted, setHideCounted] = useState(false);
  const [notFound, setNotFound] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const shown = lines.filter((l) => {
    if (hideCounted && l.counted !== null) return false;
    const q = filter.trim().toLowerCase();
    return !q || `${l.title} ${l.code} ${l.category}`.toLowerCase().includes(q);
  });

  function handleScan(raw: string) {
    const code = extractScanCode(raw).toLowerCase();
    const hit = lines.find((l) => l.code.toLowerCase() === code || (l.barcode ?? "").toLowerCase() === code);
    if (!hit) {
      setNotFound(`“${raw.slice(0, 40)}” isn't part of this count.`);
      return;
    }
    setNotFound("");
    setFilter("");
    setHideCounted(false);
    setHighlight(hit.materialId);
    // Wait a frame so the row is rendered before scrolling to and focusing it.
    requestAnimationFrame(() => {
      const row = document.getElementById(`count-${hit.materialId}`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.querySelector<HTMLInputElement>("input[type=number]")?.focus();
    });
  }

  return (
    <div>
      {open ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter this count" className={`${inputCls} mt-0 flex-1`} />
          <ScanButton onCode={handleScan} label="Scan to count" />
          <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={hideCounted} onChange={(e) => setHideCounted(e.target.checked)} />
            Hide counted
          </label>
        </div>
      ) : null}
      {notFound ? <p className="mb-3 text-sm font-bold text-red-800">{notFound}</p> : null}
      <ul ref={listRef} className="space-y-3">
        {open ? (
          shown.map((l) => <CountRow key={l.materialId} stocktakeId={stocktakeId} line={l} highlighted={highlight === l.materialId} />)
        ) : (
          lines.map((l) => (
            <li key={l.materialId} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-black/10 bg-white p-4 text-sm">
              <span className="font-bold">{l.title}</span>
              <span>
                {l.counted === null
                  ? "Not counted"
                  : `System ${formatQty(l.systemQty, l.unit)} → counted ${formatQty(l.counted, l.unit)}`}
              </span>
            </li>
          ))
        )}
      </ul>
      {open && !shown.length ? <p className="py-6 text-center text-sm text-neutral-600">Nothing to show.</p> : null}
    </div>
  );
}

export function FinishStocktake({ stocktakeId, counted, total }: { stocktakeId: string; counted: number; total: number }) {
  const [state, action] = useActionState<ActionState, FormData>(completeStocktakeAction, null);
  const [cancelState, cancelAction] = useActionState<ActionState, FormData>(cancelStocktakeAction, null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        {counted} of {total} materials counted. Materials you haven’t counted are left unchanged. Completing applies each difference as a
        “Stock count correction” in the stock history.
      </p>
      <FormMessage state={state} />
      <FormMessage state={cancelState} />
      <div className="flex flex-wrap gap-3">
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(`Apply ${counted} counted quantities to stock? This can't be undone.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="stocktake_id" value={stocktakeId} />
          <SubmitButton>Complete &amp; apply corrections</SubmitButton>
        </form>
        <form
          action={cancelAction}
          onSubmit={(e) => {
            if (!window.confirm("Cancel this count? Nothing will be changed.")) e.preventDefault();
          }}
        >
          <input type="hidden" name="stocktake_id" value={stocktakeId} />
          <SubmitButton className={btnGhost}>Cancel count</SubmitButton>
        </form>
      </div>
    </div>
  );
}
