"use server";

import { listR2Objects, R2_BUCKET } from "../../lib/r2";
import { APP_PROJECT } from "../../lib/project";
import { getAdminClient, getBuildingAccess } from "../../lib/access";
import { inferColorFromName, StudioBuilding, StudioCity } from "../../lib/studio";
import { createClient } from "../../lib/supabase/server";
import { getSilhouettes } from "../../lib/silhouettes";


export type ModelFile = {
  name: string;
  url: string;
  ext?: string;
  layer: string;
  isSubPart: boolean;
  partName?: string;
  partKey?: string;
  colorHint?: string | null;
  /** True for decimated preview GLBs served to view-only users.
   *  The viewer must apply the same Z-up→Y-up rotation as for raw STLs. */
  isPreview?: boolean;
};

/** Map Supabase bucket name → R2 bucket name */
function resolveR2Bucket(bucketName: string): string {
  if (bucketName === "buildings") return R2_BUCKET.buildings;
  return R2_BUCKET.cityModels; // default: city-models
}

const MODEL_EXTENSIONS = /\.(glb|stl)$/i;

/**
 * List every GLB or STL model file in a location folder and mint stream URLs.
 * Defaults to bucket 'city-models', but supports 'buildings' bucket for standalone buildings.
 *
 * Supports sub-part folders for multi-color layers (e.g. main-building/middle-red.stl).
 */
export async function getModelFiles(
  prefix: string,
  bucketName: string = "city-models"
): Promise<ModelFile[]> {
  if (!prefix) return [];

  // Auth check — still via Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch file list from R2
  const r2Bucket = resolveR2Bucket(bucketName);
  console.log(`[R2] listR2Objects bucket="${r2Bucket}" prefix="${prefix}"`);

  // Trailing slash so "paris/tour-eiffel" doesn't also match "paris/tour-eiffel-2/…"
  const folder = prefix.replace(/\/+$/, "");

  let matchedPrefix = `${folder}/`;
  let objects: { key: string; size: number }[] = [];
  try {
    objects = await listR2Objects(r2Bucket, matchedPrefix);

    // Fallback: If 0 objects found, try with double-prefix (e.g. city/city/location) or single-prefix
    if (objects.length === 0 && folder.includes("/")) {
      const parts = folder.split("/");
      if (parts.length === 2 && parts[0] !== parts[1]) {
        const doublePrefix = `${parts[0]}/${parts[0]}/${parts[1]}/`;
        console.log(`[R2] Retrying with double prefix "${doublePrefix}"`);
        const doubleObjects = await listR2Objects(r2Bucket, doublePrefix);
        if (doubleObjects.length > 0) {
          objects = doubleObjects;
          matchedPrefix = doublePrefix;
        }
      }
    }
    console.log(`[R2] found ${objects.length} objects for "${prefix}"`);
  } catch (err) {
    console.error(`[R2] listR2Objects FAILED for bucket="${r2Bucket}" prefix="${prefix}":`, err);
    return [];
  }

  const validObjects = objects.filter((o) => MODEL_EXTENSIONS.test(o.key));
  if (!validObjects.length) {
    console.warn(`[R2] No GLB/STL files found under "${r2Bucket}/${prefix}"`);
    return [];
  }

  // Use /api/r2 stream endpoint so Three.js STLLoader/GLTFLoader bypasses CORS issues.
  // Every signed-in user views the full model; downloading is what needs access
  // (StudioConfigurator.downloadModel + recordDownload).
  const out: ModelFile[] = validObjects.map((obj) => {
    const isStl = obj.key.toLowerCase().endsWith(".stl");
    const streamUrl = `/api/r2/${r2Bucket}/${obj.key}`;

    // Relative path inside the location folder
    let relPath = obj.key;
    if (obj.key.startsWith(matchedPrefix)) {
      relPath = obj.key.slice(matchedPrefix.length);
    } else if (obj.key.includes(folder)) {
      relPath = obj.key.slice(obj.key.indexOf(folder) + folder.length).replace(/^\/+/, "");
    }

    const pathSegments = relPath.split("/").filter(Boolean);
    let layer = "";
    let isSubPart = false;
    let partName = "";
    let partKey = "";
    let colorHint: string | null = null;

    if (pathSegments.length > 1) {
      // Sub-part inside a layer folder (e.g. main-building/middle-red.stl)
      layer = pathSegments[0].replace(/\.(glb|stl)$/i, "");
      const filename = pathSegments[pathSegments.length - 1];
      partName = filename.replace(/\.(glb|stl)$/i, "");
      isSubPart = true;
      partKey = `${layer}/${partName}`;
      colorHint = inferColorFromName(partName);
    } else {
      // Root layer file (e.g. main-building.stl or terrain.stl)
      const filename = pathSegments[0] || obj.key.split("/").pop() || "layer";
      layer = filename.replace(/\.(glb|stl)$/i, "");
      partName = layer;
      isSubPart = false;
      partKey = layer;
      colorHint = inferColorFromName(layer);
    }

    return {
      name: isSubPart ? partName : layer,
      url: streamUrl,
      ext: isStl ? "stl" : "glb",
      layer,
      isSubPart,
      partName,
      partKey,
      colorHint,
    };
  });

  console.log(`[R2] returning ${out.length} model files (subparts: ${out.filter(f => f.isSubPart).length})`);
  return out;
}


/**
 * Fetch all cities and their places directly from Supabase database tables (`cities` and `places`).
 */
export async function fetchStudioCities(): Promise<StudioCity[]> {
  const supabase = await createClient();

  const { data: dbCities, error: cErr } = await supabase
    .from("cities")
    .select("*")
    .order("display_order", { ascending: true });

  if (cErr || !dbCities) {
    console.error("Error fetching cities from DB:", cErr);
    return [];
  }

  const { data: dbPlaces, error: pErr } = await supabase
    .from("places")
    .select("*")
    .order("display_order", { ascending: true });

  if (pErr) {
    console.error("Error fetching places from DB:", pErr);
  }

  const places = dbPlaces || [];

  return dbCities.map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country || "Other",
    available: !!c.available,
    locations: places
      .filter((p) => p.city_slug === c.slug)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        area: p.area || "",
        coords: p.coords || "",
        completed: !!p.completed,
      })),
  }));
}

/**
 * Fetch all individual landmark buildings from Supabase table (`buildings`) or return initial seed list.
 */
export async function fetchStudioBuildings(): Promise<StudioBuilding[]> {
  const supabase = await createClient();

  // The picker sorts client-side (height / name); the table has no display_order column.
  const { data: dbBuildings, error } = await supabase
    .from("buildings")
    .select("*")
    .order("name", { ascending: true });

  if (error) console.error("Error fetching buildings from DB — using seed list:", error);

  if (!error && dbBuildings && dbBuildings.length > 0) {
    return dbBuildings.map((b) => ({
      slug: b.slug,
      name: b.name,
      country: b.country || "United States",
      city_slug: b.city_slug || "new-york",
      city_name: b.city_name || "New York",
      area: b.area || "",
      coords: b.coords || "",
      available: !!b.available,
      height_m: b.height_m != null ? Number(b.height_m) : null,
      floors: b.floors ?? null,
      year_built: b.year_built ?? null,
    }));
  }

  // Seed / default fallback list of landmark buildings matching bucket structure
  return [
    {
      slug: "70-pine",
      name: "70 Pine",
      country: "United States",
      city_slug: "new-york",
      city_name: "New York",
      area: "Financial District · Wall St",
      coords: "40.7064° N, 74.0084° W",
      available: true,
    },
    {
      slug: "empire-state-building",
      name: "Empire State Building",
      country: "United States",
      city_slug: "new-york",
      city_name: "New York",
      area: "Midtown Manhattan",
      coords: "40.7484° N, 73.9857° W",
      available: true,
    },
    {
      slug: "one-world-trade-center",
      name: "One World Trade Center",
      country: "United States",
      city_slug: "new-york",
      city_name: "New York",
      area: "Lower Manhattan",
      coords: "40.7127° N, 74.0134° W",
      available: true,
    },
    {
      slug: "trump-tower",
      name: "Trump Tower",
      country: "United States",
      city_slug: "new-york",
      city_name: "New York",
      area: "Fifth Avenue",
      coords: "40.7624° N, 73.9738° W",
      available: true,
    },
    {
      slug: "world-trade-center",
      name: "World Trade Center",
      country: "United States",
      city_slug: "new-york",
      city_name: "New York",
      area: "Financial District",
      coords: "40.7118° N, 74.0131° W",
      available: true,
    },
  ];
}

/** Buildings plus their R2 lineup drawing (buildings/silhouettes/<slug>.svg), for the Studio picker. */
export async function fetchStudioLineup(): Promise<StudioBuilding[]> {
  const buildings = await fetchStudioBuildings();
  const silhouettes = await getSilhouettes(buildings.map((b) => b.slug));
  return buildings.map((b) => ({ ...b, silhouette: silhouettes[b.slug] ?? null }));
}

export type BackerTier = "merchant" | "architect" | "explorer";

/**
 * Normalizes backer reward tier names into one of the three core platform tiers:
 * - 'Patron' or 'Merchant...' -> 'merchant'
 * - 'Architect...' -> 'architect'
 * - 'Explorer...' -> 'explorer'
 */
function normalizeRewardTier(rawTier: string | null | undefined): BackerTier {
  if (!rawTier) return "explorer";
  const lower = rawTier.toLowerCase();
  if (lower.includes("patron") || lower.includes("merchant")) {
    return "merchant";
  }
  if (lower.includes("architect")) {
    return "architect";
  }
  if (lower.includes("explorer")) {
    return "explorer";
  }
  return "explorer";
}

/**
 * Verify if a MakerWorld username is a backer of this campaign (`building_customers`)
 * and retrieve their normalized tier from the `reward_tier` or `tier` column.
 */
export async function verifyMakerWorldUsername(
  username: string
): Promise<{
  ok: boolean;
  cleanName?: string;
  tier?: BackerTier;
  rawTier?: string;
  error?: string;
}> {
  const cleanName = cleanUsername(username);
  if (!cleanName) {
    return { ok: false, error: "Please enter your MakerWorld username." };
  }

  const admin = getAdminClient();
  if (!admin) {
    console.error("[verifyMakerWorldUsername] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
    return { ok: false, error: "Server configuration error. Please contact support." };
  }

  // Frame Building backers only (Frame City's are in `customers`).
  // ilike makes the match case-insensitive; `_`, `%` and `\` are escaped so they
  // match literally, and the JS filter below keeps only exact names.
  const pattern = cleanName.replace(/[\\%_]/g, "\\$&");
  const [bare, prefixed] = await Promise.all([
    admin.from("building_customers").select("*").ilike("makerworld_username", pattern).limit(20),
    admin.from("building_customers").select("*").ilike("makerworld_username", "@" + pattern).limit(20),
  ]);

  const dbError = bare.error || prefixed.error;
  if (dbError) {
    console.error("[verifyMakerWorldUsername] building_customers query failed:", dbError.message);
    return { ok: false, error: "Couldn't reach the backer database. Please try again shortly." };
  }

  const wanted = cleanName.toLowerCase();
  const customer = [...(bare.data ?? []), ...(prefixed.data ?? [])].find(
    (c) => cleanUsername(c.makerworld_username ?? "").toLowerCase() === wanted
  );

  if (!customer) {
    return {
      ok: false,
      error: `MakerWorld username "@${cleanName}" was not found in the backer database.`,
    };
  }

  const rawTier = customer.tier || customer.reward_tier || "";
  return {
    ok: true,
    cleanName: cleanUsername(customer.makerworld_username) || cleanName,
    tier: normalizeRewardTier(rawTier),
    rawTier,
  };
}

/** Trim and drop a leading "@". Every other character (`_`, `.`, `-`…) is kept. */
function cleanUsername(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/^@/, "").trim();
}

type AccessCodeRow = {
  code: string;
  tier: string | null;
  is_active: boolean;
  uses: number;
  max_uses: number;
};

/** This app's access code (project = building), looked up with the service role. */
async function fetchBuildingCode(
  code: string
): Promise<{ row: AccessCodeRow | null; error?: string }> {
  const admin = getAdminClient();
  if (!admin) return { row: null, error: "Server database configuration error." };

  const { data, error } = await admin
    .from("access_codes")
    .select("code, tier, is_active, uses, max_uses")
    .eq("code", code)
    .eq("project", APP_PROJECT)
    .maybeSingle();

  if (error) {
    console.error("[fetchBuildingCode] access_codes query failed:", error.message);
    return { row: null, error: "Couldn't reach the access code database. Please try again shortly." };
  }
  return { row: data as AccessCodeRow | null };
}

/** Normalise a typed access code: uppercase, no spaces. */
function cleanCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Write the building_* profile columns with the service role. */
async function patchBuildingProfile(userId: string, fields: Record<string, unknown>) {
  const admin = getAdminClient();
  if (!admin) return;
  const { error } = await admin.from("profiles").update(fields).eq("id", userId);
  if (error) console.error("Error updating building profile columns:", error.message);
}

/**
 * Redeem an access code for an authenticated user, verifying:
 * 1. Backer exists in `building_customers` and getting their reward tier
 * 2. Access code exists in `access_codes` with project = 'building' and getting its tier
 * 3. Checking that the access code tier matches the customer's reward tier
 * 4. Redeeming code and setting profile access and tier
 */
export async function redeemBackerAccessCode(
  rawCode: string,
  rawUsername: string
): Promise<{ ok: boolean; tier?: BackerTier; error?: string; errorCode?: string }> {
  const code = cleanCode(rawCode);
  const username = cleanUsername(rawUsername);

  // Check username first — it's the first field in the UI flow.
  if (!username) {
    return { ok: false, error: "Please enter your MakerWorld username." };
  }
  if (!code) {
    return { ok: false, error: "Please enter an access code." };
  }

  // 1. Verify user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated. Please log in first." };
  }

  // 2. Verify MakerWorld customer & tier from `building_customers`
  const verifyRes = await verifyMakerWorldUsername(username);
  if (!verifyRes.ok || !verifyRes.cleanName || !verifyRes.tier) {
    return {
      ok: false,
      error: verifyRes.error || "MakerWorld username could not be verified in backer list.",
    };
  }

  const verifiedUsername = verifyRes.cleanName;
  const customerTier = verifyRes.tier;

  // 3. Fetch this app's access code (project = building) to check validity and code tier
  const { row: codeRecord, error: codeError } = await fetchBuildingCode(code);
  if (codeError) return { ok: false, error: codeError };
  if (!codeRecord) {
    return { ok: false, errorCode: "invalid_code", error: "That access code is not valid." };
  }
  if (!codeRecord.is_active) {
    return { ok: false, error: "This access code is inactive or has been disabled." };
  }
  if (codeRecord.uses >= codeRecord.max_uses) {
    return { ok: false, error: "That access code has already been redeemed." };
  }

  // 4. Check if access code tier matches customer table tier!
  const codeTier = normalizeRewardTier(codeRecord.tier || "explorer");
  if (codeTier !== customerTier) {
    const codeTierName = codeTier.charAt(0).toUpperCase() + codeTier.slice(1);
    const customerTierName = customerTier.charAt(0).toUpperCase() + customerTier.slice(1);
    return {
      ok: false,
      error: `Tier mismatch: This access code is for the ${codeTierName} Tier, but your MakerWorld backer reward is for the ${customerTierName} Tier.`,
    };
  }

  // 5. Redeem code atomically via RPC — only codes with project = 'building'
  const { data, error } = await supabase.rpc("redeem_building_code", {
    p_code: code,
    p_makerworld_name: verifiedUsername,
  });

  if (error) {
    console.error("Redeem code error:", error);
    return { ok: false, error: error.message || "Failed to redeem access code." };
  }

  if (!data?.ok) {
    const isInvalidCode = data?.error === "invalid_code" || data?.error === "code_already_used";
    return {
      ok: false,
      errorCode: isInvalidCode ? "invalid_code" : "redeem_failed",
      error: isInvalidCode
        ? "That code isn't valid or has already been used."
        : "Couldn't redeem the code — please try again.",
    };
  }

  // 6. Store the backer's exact tier + MakerWorld name in the building_* profile columns
  await patchBuildingProfile(user.id, {
    building_tier: customerTier,
    building_makerworld_name: verifiedUsername,
  });

  return { ok: true, tier: customerTier };
}

/**
 * Upgrade tier for an existing logged-in user with full DB check on this app's codes and backers.
 */
export async function upgradeUserTier(
  rawCode: string,
  optionalUsername?: string
): Promise<{ ok: boolean; tier?: BackerTier; error?: string }> {
  const code = cleanCode(rawCode);

  if (!code) {
    return { ok: false, error: "Please enter an access code." };
  }

  // 1. Verify user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated. Please log in first." };
  }

  // 2. Current Frame Building access (Frame City's is separate)
  const current = await getBuildingAccess(supabase, user.id);

  const effectiveUsername =
    cleanUsername(optionalUsername) || cleanUsername(current.makerworldName);

  // 3. Query this app's codes (project = building) using service role
  const { row: codeRecord, error: codeError } = await fetchBuildingCode(code);
  if (codeError) return { ok: false, error: codeError };
  if (!codeRecord) {
    return { ok: false, error: "This access code is invalid or does not exist." };
  }
  if (!codeRecord.is_active) {
    return { ok: false, error: "This access code has been deactivated." };
  }
  if (codeRecord.uses >= codeRecord.max_uses) {
    return { ok: false, error: "This access code has already reached its maximum redemptions." };
  }

  const newTier = normalizeRewardTier(codeRecord.tier || "explorer");

  // 4. Optional / Backer verification if username is present
  if (effectiveUsername) {
    const verifyRes = await verifyMakerWorldUsername(effectiveUsername);
    // If customer exists in DB, ensure code tier matches the backer's reward
    if (verifyRes.ok && verifyRes.tier && verifyRes.tier !== newTier) {
      const codeTierName = newTier.charAt(0).toUpperCase() + newTier.slice(1);
      const customerTierName = verifyRes.tier.charAt(0).toUpperCase() + verifyRes.tier.slice(1);
      return {
        ok: false,
        error: `Tier mismatch: Code is for ${codeTierName} tier, but MakerWorld backer reward is for ${customerTierName} tier.`,
      };
    }
  }

  // 5. Redeem atomically — only codes with project = 'building'
  const { data, error } = await supabase.rpc("redeem_building_code", {
    p_code: code,
    p_makerworld_name: effectiveUsername || null,
  });
  if (error || !data?.ok) {
    const errorMsg = data?.error || error?.message;
    if (errorMsg === "invalid_code" || errorMsg === "code_already_used") {
      return { ok: false, error: "This access code is invalid or already used." };
    }
    return { ok: false, error: errorMsg || "Failed to redeem upgrade code." };
  }

  // 6. Store the normalised tier in the building_* profile columns
  await patchBuildingProfile(user.id, {
    building_tier: newTier,
    ...(effectiveUsername ? { building_makerworld_name: effectiveUsername } : {}),
  });

  return { ok: true, tier: newTier };
}
