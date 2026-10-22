import { FAQ } from "../components/FAQ";
import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import { Process } from "../components/Process";
import { HeritageStory } from "../components/world/HeritageStory";
import { createClient } from "../lib/supabase/server";
import { toNavUser } from "../lib/user";


export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative">
      <Nav initialUser={toNavUser(user)} />
      <main>
        <HeritageStory />
        {/* soft hand-off from the cave back to the page surface */}
        <div className="h-24 bg-gradient-to-b from-[#0d0820] to-base" />
        <Process />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
