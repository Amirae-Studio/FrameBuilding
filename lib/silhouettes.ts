import { GetObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";
import { getR2Client, R2_BUCKET } from "./r2";

/**
 * Lineup drawings generated from each building's 3D model by
 * scripts/generate-silhouettes.mts and stored at buildings/silhouettes/<slug>.svg.
 * The SVG viewBox is in metres, so width / top place it on the shared scale.
 */
export type Silhouette = { svg: string; width: number; top: number };

/** Rebuild the markup from just the viewBox and path data, so nothing else in the file reaches the page. */
function clean(raw: string): Silhouette | null {
  const vb = raw.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const paths = [...raw.matchAll(/\sd="([MLZ0-9.\s-]+)"/g)].map((m) => m[1]);
  if (!vb || !paths.length) return null;
  const width = Number(vb[1]);
  const top = Number(vb[2]);
  if (!(width > 0) || !(top > 0)) return null;
  return {
    width,
    top,
    svg:
      `<svg viewBox="0 0 ${width} ${top}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      paths.map((d) => `<path fill="currentColor" fill-rule="evenodd" d="${d}"/>`).join("") +
      `</svg>`,
  };
}

async function load(slug: string): Promise<Silhouette | null> {
  try {
    const res = await getR2Client().send(
      new GetObjectCommand({ Bucket: R2_BUCKET.buildings, Key: `silhouettes/${slug}.svg` })
    );
    return clean(await res.Body!.transformToString());
  } catch (err) {
    // NoSuchKey = no drawing generated yet; the picker falls back to code / generic
    if ((err as { name?: string }).name !== "NoSuchKey") {
      console.error(`[silhouettes] ${slug}:`, (err as Error).message);
    }
    return null;
  }
}

/** slug → silhouette (or null), cached for 5 minutes so the lineup isn't 30 R2 calls per view. */
export const getSilhouettes = unstable_cache(
  async (slugs: string[]): Promise<Record<string, Silhouette | null>> => {
    const entries = await Promise.all(slugs.map(async (s) => [s, await load(s)] as const));
    return Object.fromEntries(entries);
  },
  ["building-silhouettes"],
  { revalidate: 300 }
);
