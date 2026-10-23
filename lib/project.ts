import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Frame City and Frame Building share one Supabase project. Rows in the shared
 * tables carry a `project` column ('city' | 'building'); profiles.project is an
 * array of every app the user signs in to.
 * See supabase/migrations/20261023_project_split.sql.
 */
export type Project = "city" | "building";

/** This app. */
export const APP_PROJECT: Project = "building";

/** Frame Building access codes look like FB-MA-00. */
export const ACCESS_CODE_PLACEHOLDER = "FB-MA-00";
export const ACCESS_CODE_MAX_LENGTH = ACCESS_CODE_PLACEHOLDER.length;

/**
 * Add this app to profiles.project for the signed-in user. Safe to call on
 * every sign-in. Never throws — a failed tag must not block sign-in.
 */
export async function addProfileProject(
  supabase: SupabaseClient,
  project: Project = APP_PROJECT
): Promise<Project[] | null> {
  try {
    const { data, error } = await supabase.rpc("add_profile_project", { p_project: project });
    if (error) {
      console.warn("add_profile_project failed:", error.message);
      return null;
    }
    return (data as Project[] | null) ?? null;
  } catch (err) {
    console.warn("add_profile_project failed:", err);
    return null;
  }
}
