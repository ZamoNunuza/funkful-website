// Client-safe types and helpers for the delivery options shown at checkout.
// Nothing in here touches the server, secrets or Supabase, so both the checkout
// page and the API routes can import it.

export type DeliveryBadge = "cheapest" | "fastest";

export type DeliveryOption = {
 rateId: number;
  serviceCode: string;
  serviceName: string;
  courierName: string | null;
  providerSlug: string | null;
  serviceLevelCode: string | null;
  description: string | null;
  priceCents: number;
  minDeliveryDate: string | null;
  maxDeliveryDate: string | null;
  badges: DeliveryBadge[];
};

/** What the browser sends back to /api/checkout to say which option was chosen. */
export type SelectedShippingQuote = {
  rateId?: number;
  serviceCode?: string;
  serviceName?: string;
  totalPriceCents?: number;
};

/**
 * Finds the customer's chosen option inside a freshly fetched list.
 * Service-level code and name identify the selected courier option. Price is checked by the caller.
 */
export function findSelectedOption(options: DeliveryOption[], selection: SelectedShippingQuote | null | undefined) {
  if (!selection) return null;
  if (Number.isInteger(selection.rateId)) {
    const byId = options.find((option) => option.rateId === selection.rateId);
    if (byId) return byId;
  }
  if (selection.serviceCode && selection.serviceName) {
    const code = selection.serviceCode.toLowerCase();
    const name = selection.serviceName.toLowerCase();
    return options.find((option) => option.serviceCode.toLowerCase() === code && option.serviceName.toLowerCase() === name) ?? null;
  }
  return null;
}

const dateFormatter = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

/** "Tue, 24 Nov – Thu, 26 Nov", "Tue, 24 Nov", or null when the courier API provides no dates. */
export function formatDeliveryWindow(min: string | null | undefined, max: string | null | undefined) {
  const from = min ? formatDate(min) : null;
  const to = max ? formatDate(max) : null;
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from ?? to ?? null;
}
