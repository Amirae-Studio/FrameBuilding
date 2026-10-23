import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { getBuildingAccess } from "../../../lib/access";
import { fetchStudioBuildings } from "../actions";
import { StudioConfigurator } from "../../../components/studio/StudioConfigurator";
import { toNavUser } from "../../../lib/user";


export const metadata = {
  title: "Configure your building — Heritage",
};

export default async function ConfigurePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; city?: string; location?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio"); // middleware backstop

  const { hasAccess } = await getBuildingAccess(supabase, user.id);

  const params = await searchParams;

  // Heritage is buildings-only: the configurator always runs in building mode.
  const dbBuildings = await fetchStudioBuildings();
  const building = dbBuildings.find(
    (b) => b.slug === params.location && b.available
  );
  if (!building) redirect("/studio");

  return (
    <StudioConfigurator
      type="building"
      city={{ slug: building.city_slug, name: building.city_name }}
      location={{
        slug: building.slug,
        name: building.name,
        area: building.area || "",
        coords: building.coords || "",
        country: building.country || "United States",
      }}
      user={toNavUser(user)}
      hasAccess={hasAccess}
    />
  );
}
