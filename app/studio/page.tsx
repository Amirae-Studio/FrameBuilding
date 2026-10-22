import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { fetchStudioBuildings } from "./actions";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SignOutButton } from "../../components/SignOutButton";
import { StudioPicker } from "../../components/studio/StudioPicker";


export const metadata = {
  title: "The Studio — Heritage",
};

export default async function StudioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio"); // middleware backstop

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access")
    .eq("id", user.id)
    .single();

  const email = user.email ?? "your account";
  const hasAccess = Boolean(profile?.has_access);
  const buildings = await fetchStudioBuildings();

  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-cream/[0.09] bg-base/70 px-6 py-[14px] backdrop-blur-xl md:px-[52px]">
        <Link href="/" className="inline-flex no-underline">
          <Logo className="text-[20px]" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] text-cream/40 sm:inline">
            {email}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

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
