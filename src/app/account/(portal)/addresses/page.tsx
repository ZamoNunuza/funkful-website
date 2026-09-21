import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/account-server";
import { ADDRESS_COLUMNS, MAX_ADDRESSES, type AddressRow } from "@/lib/account-shared";
import { PageTitle } from "@/components/account/ui";
import AddressManager from "./address-manager";

export const metadata = { title: "Addresses | Funkful" };

export default async function AddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/addresses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select(ADDRESS_COLUMNS)
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const addresses = (data ?? []) as AddressRow[];

  return (
    <div>
      <PageTitle title="Addresses">
        Save the places you send parcels to. Your default address is filled in for you at checkout.
      </PageTitle>
      <AddressManager addresses={addresses} maxAddresses={MAX_ADDRESSES} />
    </div>
  );
}
