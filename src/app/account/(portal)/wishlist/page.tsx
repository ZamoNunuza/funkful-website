import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, resolveWishlistProducts } from "@/lib/account-server";
import { PageTitle } from "@/components/account/ui";
import WishlistGrid from "./wishlist-grid";

export const metadata = { title: "Wishlist | Funkful" };

export default async function WishlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/wishlist");

  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = await resolveWishlistProducts((data ?? []).map((row) => row.product_id));

  return (
    <div>
      <PageTitle title="Wishlist">Things you&apos;ve saved for later. Personalized items need their options chosen before they go in your bag.</PageTitle>
      <WishlistGrid items={items} />
    </div>
  );
}
