"use client";

import { useMemo, useState } from "react";
import { extractScanCode, formatQty, type Unit } from "@/lib/inventory/inventory-shared";
import { ScanButton } from "./scanner";
import { inputCls } from "./ui";

export interface PickerMaterial {
  id: string;
  code: string;
  barcode: string | null;
  title: string;
  category: string;
  unit: Unit;
  onHand: number;
  lastCostCents: number;
}

/** Search-or-scan material chooser. Renders a hidden `name` input carrying the chosen material id. */
export function MaterialPicker({
  materials,
  name = "material_id",
  selectedId,
  onSelect,
  label = "Material",
}: {
  materials: PickerMaterial[];
  name?: string;
  selectedId: string;
  onSelect: (m: PickerMaterial | null) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState("");
  const selected = materials.find((m) => m.id === selectedId) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return materials
      .filter((m) => `${m.title} ${m.code} ${m.category} ${m.barcode ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [materials, query]);

  function handleScan(raw: string) {
    const code = extractScanCode(raw).toLowerCase();
    const hit = materials.find((m) => m.code.toLowerCase() === code || (m.barcode ?? "").toLowerCase() === code);
    if (hit) {
      setNotFound("");
      setQuery("");
      onSelect(hit);
    } else {
      setNotFound(`No material matches “${raw.slice(0, 40)}”.`);
    }
  }

  return (
    <div>
      <span className="block text-sm font-bold">{label}</span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-black/15 bg-[#FAF8F4] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{selected.title}</p>
            <p className="text-xs text-neutral-600">
              {selected.code} · {formatQty(selected.onHand, selected.unit)} in stock
            </p>
          </div>
          <button type="button" onClick={() => onSelect(null)} className="min-h-11 px-2 text-sm font-bold underline">
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="mt-1 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, colour or code"
              className={`${inputCls} mt-0`}
              autoComplete="off"
            />
            <ScanButton onCode={handleScan} />
          </div>
          {notFound ? <p className="mt-2 text-sm font-bold text-red-800">{notFound}</p> : null}
          {matches.length ? (
            <ul className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onSelect(m);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-black/5 px-3 py-2 text-left last:border-0 hover:bg-black/5"
                  >
                    <span className="truncate font-bold">{m.title}</span>
                    <span className="shrink-0 text-xs text-neutral-600">{formatQty(m.onHand, m.unit)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query ? (
            <p className="mt-2 text-sm text-neutral-600">No matches.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
