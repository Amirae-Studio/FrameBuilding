import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_PROJECT } from "./project";

/**
 * Frame Building access. One login / one profiles row is shared with Frame
 * City, but this app reads ONLY the building_* columns on profiles and only
 * access codes with project = 'building'. profiles.has_access / tier /
 * redeemed_* belong to Frame City — never read them here.
 */

export type Tier = "explorer" | "architect" | "studio" | "merchant";

export type BuildingAccess = {
  hasAccess: boolean;
  tier: Tier | null;
  redeemedCode: string | null;
  redeemedAt: string | null;
  makerworldName: string | null;
  isTempAccess: boolean;
};

const NONE: BuildingAccess = {
  hasAccess: false,
  tier: null,
  redeemedCode: null,
  redeemedAt: null,
  makerworldName: null,
  isTempAccess: false,
};

/** Service-role client for tables clients cannot read (codes, backers). Server-only. */
export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

/**
 * What the user has unlocked in Frame Building.
 * `live: true` re-reads tier / temp flag from the redeemed code, so changing a
 * code in the dashboard takes effect immediately.
 */
export async function getBuildingAccess(
  supabase: SupabaseClient,
  userId: string,
  opts: { live?: boolean } = {}
): Promise<BuildingAccess> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "building_has_access, building_tier, building_redeemed_code, building_redeemed_at, building_makerworld_name, building_is_temp_access"
    )
    .eq("id", userId)
    .maybeSingle();
  if (!data) return NONE;

  const access: BuildingAccess = {
    hasAccess: !!data.building_has_access,
    tier: (data.building_tier as Tier | null) ?? null,
    redeemedCode: data.building_redeemed_code ?? null,
    redeemedAt: data.building_redeemed_at ?? null,
    makerworldName: data.building_makerworld_name ?? null,
    isTempAccess: !!data.building_is_temp_access,
  };

  if (opts.live && access.hasAccess && access.redeemedCode) {
    const admin = getAdminClient();
    if (admin) {
      const { data: code } = await admin
        .from("access_codes")
        .select("tier, temp_access_code")
        .eq("code", access.redeemedCode)
        .eq("project", APP_PROJECT)
        .maybeSingle();
      if (code?.tier) access.tier = code.tier as Tier;
      if (code && typeof code.temp_access_code === "boolean") access.isTempAccess = code.temp_access_code;
    }
  }
  return access;
}
