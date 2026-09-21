import { redirect } from "next/navigation";
import { palette } from "@/lib/brands";
import { getProfile, getSessionUser } from "@/lib/account-server";
import { formatDate } from "@/lib/account-shared";
import { Card, CardTitle, PageTitle } from "@/components/account/ui";
import DetailsForm from "./details-form";
import PasswordForm from "./password-form";

export const metadata = { title: "Account details | Funkful" };

export default async function AccountDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordUpdated?: string }>;
}) {
  const { passwordUpdated } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/details");

  const profile = await getProfile(user.id);

  return (
    <div className="space-y-6">
      <PageTitle title="Account details">Keep your details up to date and manage how you sign in.</PageTitle>

      {passwordUpdated === "1" && (
        <div style={{ background: palette.sage, color: "#1c2617" }} className="rounded-xl p-4 text-sm font-semibold">
          ✓ Your password has been updated.
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <DetailsForm
            initial={{
              firstName: profile?.first_name ?? "",
              lastName: profile?.last_name ?? "",
              phone: profile?.phone ?? "",
            }}
          />

          <Card tint={palette.beige}>
            <CardTitle>Sign-in email</CardTitle>
            <p className="text-sm font-semibold break-all">{user.email}</p>
            <p className="text-xs text-neutral-600 leading-relaxed mt-2">
              This is the email you sign in with and where we send order updates. To change it, get in touch and we&apos;ll
              sort it out for you.
            </p>
            {user.created_at && (
              <p className="text-xs text-neutral-500 mt-4">Member since {formatDate(user.created_at)}</p>
            )}
          </Card>
        </div>

        <PasswordForm />
      </div>
    </div>
  );
}
