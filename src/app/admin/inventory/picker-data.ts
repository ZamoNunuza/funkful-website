import type { Material } from "@/lib/inventory/inventory";
import { materialTitle } from "@/lib/inventory/inventory-shared";
import type { PickerMaterial } from "./material-picker";

export const toPicker = (m: Material): PickerMaterial => ({
  id: m.id,
  code: m.code,
  barcode: m.external_barcode,
  title: materialTitle(m),
  category: m.category?.name ?? "",
  unit: m.unit,
  onHand: m.quantity_on_hand,
  lastCostCents: m.last_cost_cents,
});
