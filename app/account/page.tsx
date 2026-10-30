import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { toNavUser } from "../../lib/user";
import { getBuildingAccess } from "../../lib/access";
import { getUserDownloadStats } from "../actions/downloads";
import { AccountView } from "../../components/AccountView";


export const metadata = {
  title: "Your account — FrameBuilding",
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account"); // middleware backstop

  const nav = toNavUser(user)!;

  // Frame Building access only — Frame City access on the same login is separate
  const access = await getBuildingAccess(supabase, user.id, { live: true });
  const profile = { redeemed_code: access.redeemedCode, redeemed_at: access.redeemedAt };

  const hasAccess = access.hasAccess;
  const tierKey = access.tier;


  const redeemedOn = profile?.redeemed_at
    ? new Date(profile.redeemed_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const stats = hasAccess ? await getUserDownloadStats() : null;

  return (
    <AccountView
      user={nav}
      hasAccess={hasAccess}
      tierKey={tierKey}
      redeemedCode={profile.redeemed_code}
      redeemedOn={redeemedOn}
      stats={stats}
    />
  );
}
