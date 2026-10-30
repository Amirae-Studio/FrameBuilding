import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { APP_PROJECT, addProfileProject } from "../../lib/project";
import { getBuildingAccess } from "../../lib/access";
import { fetchStudioBuildings } from "./actions";
import { PageHeader } from "../../components/PageHeader";
import { SignOutButton } from "../../components/SignOutButton";
import { StudioPicker } from "../../components/studio/StudioPicker";


export const metadata = {
  title: "The Studio — FrameBuilding",
};

export default async function StudioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio"); // middleware backstop

  const { data: profile } = await supabase
    .from("profiles")
    .select("project")
    .eq("id", user.id)
    .single();

  // sessions that predate project tagging never passed through /auth/callback
  if (!profile?.project?.includes(APP_PROJECT)) await addProfileProject(supabase);

  const email = user.email ?? "your account";
  const { hasAccess } = await getBuildingAccess(supabase, user.id);
  const buildings = await fetchStudioBuildings();

  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <PageHeader>
        <span className="hidden max-w-[220px] truncate font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a8492] md:inline">
          {email}
        </span>
        <SignOutButton />
      </PageHeader>

      <main className="flex flex-1 flex-col">
        <StudioPicker
          initialBuildings={buildings}
          hasAccess={hasAccess}
          email={email}
        />
      </main>
    </div>
  );
}
