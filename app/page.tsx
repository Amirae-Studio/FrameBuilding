import { FrameBuildingLanding } from "../components/landing/FrameBuildingLanding";
import { createClient } from "../lib/supabase/server";
import { toNavUser } from "../lib/user";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <FrameBuildingLanding user={toNavUser(user)} />;
}
