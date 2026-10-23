"use server";

import { createClient } from "../../lib/supabase/server";
import { APP_PROJECT } from "../../lib/project";
import { getAdminClient, getBuildingAccess, type Tier } from "../../lib/access";

/*
 * Download quota for Frame Building. Access and the download log are per app
 * (profiles.building_* / user_downloads with project = 'building'), so a Frame City
 * backer's quota and history never mix with this app's.
 */

const EXPLORER_LIMIT = 25;

export type DownloadResult =
  | {
      ok: true;
      tier: Tier;
      used?: number;
      limit?: number;
      remaining?: number;
      unlimited?: boolean;
    }
  | {
      ok: false;
      /** Machine-readable error code. Use this in conditionals, not `error`. */
      errorCode: "no_access" | "limit_reached" | "temp_access" | "not_authenticated" | "db_error";
      error: string;
      isTempAccess?: boolean;
      tier?: string;
      used?: number;
      limit?: number;
      remaining?: number;
    };

export type UserDownloadStats = {
  hasAccess: boolean;
  isTempAccess?: boolean;
  tier: Tier;
  monthlyCount: number;
  monthlyLimit: number | null; // 25 for explorer, null for architect/studio/merchant
  remaining: number | null;
  resetDate: string; // formatted date the current cycle ends
  recentDownloads: Array<{
    id: string;
    citySlug: string;
    locationSlug: string;
    downloadedAt: string;
  }>;
};

/** Start of the current monthly cycle, counted from when the code was redeemed. */
function cycleStartFrom(redeemedAt: string | null, now = new Date()) {
  const start = new Date(redeemedAt ?? now);
  while (
    new Date(start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()) <= now
  ) {
    start.setMonth(start.getMonth() + 1);
  }
  return start;
}

export async function checkUserTempAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const access = await getBuildingAccess(supabase, user.id, { live: true });
  return access.hasAccess && access.isTempAccess;
}

export async function recordDownload(citySlug: string, locationSlug: string): Promise<DownloadResult> {
  const supabase = await createClient();
  const adminClient = getAdminClient() || supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errorCode: "not_authenticated", error: "Not authenticated" };
  }

  const access = await getBuildingAccess(supabase, user.id, { live: true });
  if (!access.hasAccess) {
    return { ok: false, errorCode: "no_access", error: "You must unlock access with a valid code first." };
  }

  if (access.isTempAccess) {
    return {
      ok: false,
      errorCode: "temp_access",
      error: "Due to security policy not able to download until campaign finish.",
      isTempAccess: true,
    };
  }

  const activeTier: Tier = access.tier || "explorer";
  const logRow = { user_id: user.id, project: APP_PROJECT, city_slug: citySlug, location_slug: locationSlug };

  // Unlimited tiers (architect / merchant / studio): log and allow
  if (activeTier !== "explorer") {
    const { error } = await adminClient.from("user_downloads").insert(logRow);
    if (error) console.warn("Failed to log unlimited tier download:", error.message);
    return { ok: true, tier: activeTier, unlimited: true };
  }

  // Explorer: 25 per cycle, cycle counted from the redemption time
  const cycleStart = cycleStartFrom(access.redeemedAt);
  const { count, error: countErr } = await adminClient
    .from("user_downloads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("project", APP_PROJECT)
    .gte("downloaded_at", cycleStart.toISOString());
  if (countErr) console.error("Error querying user download count:", countErr);

  const used = count || 0;
  if (used >= EXPLORER_LIMIT) {
    return {
      ok: false,
      errorCode: "limit_reached",
      error: "Monthly download limit reached.",
      tier: "explorer",
      used,
      limit: EXPLORER_LIMIT,
      remaining: 0,
    };
  }

  const { error: insertErr } = await adminClient.from("user_downloads").insert(logRow);
  if (insertErr) {
    console.error("Failed to insert user download:", insertErr);
    return { ok: false, errorCode: "db_error", error: "Failed to record download in database." };
  }

  const newUsed = used + 1;
  return {
    ok: true,
    tier: "explorer",
    used: newUsed,
    limit: EXPLORER_LIMIT,
    remaining: Math.max(0, EXPLORER_LIMIT - newUsed),
  };
}

export async function getUserDownloadStats(): Promise<UserDownloadStats | null> {
  const supabase = await createClient();
  const adminClient = getAdminClient() || supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const access = await getBuildingAccess(supabase, user.id, { live: true });
  if (!access.hasAccess || !access.tier) return null;
  const tier = access.tier;

  const now = new Date();
  const cycleStart = cycleStartFrom(access.redeemedAt, now);
  const nextResetDate = new Date(
    cycleStart.getFullYear(),
    cycleStart.getMonth() + 1,
    cycleStart.getDate(),
    cycleStart.getHours(),
    cycleStart.getMinutes()
  );

  const { count } = await adminClient
    .from("user_downloads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("project", APP_PROJECT)
    .gte("downloaded_at", cycleStart.toISOString());

  const monthlyCount = count || 0;
  const monthlyLimit = tier === "explorer" ? EXPLORER_LIMIT : null;
  const remaining = tier === "explorer" ? Math.max(0, EXPLORER_LIMIT - monthlyCount) : null;

  const { data: history } = await supabase
    .from("user_downloads")
    .select("id, city_slug, location_slug, downloaded_at")
    .eq("user_id", user.id)
    .eq("project", APP_PROJECT)
    .order("downloaded_at", { ascending: false })
    .limit(10);

  return {
    hasAccess: true,
    isTempAccess: access.isTempAccess,
    tier,
    monthlyCount,
    monthlyLimit,
    remaining,
    resetDate: nextResetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    recentDownloads: (history || []).map((h) => ({
      id: h.id,
      citySlug: h.city_slug,
      locationSlug: h.location_slug,
      downloadedAt: h.downloaded_at,
    })),
  };
}
