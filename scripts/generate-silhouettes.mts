/**
 * scripts/generate-silhouettes.mts
 *
 * Builds the Studio lineup drawing for each building straight from its 3D model
 * in R2, so new buildings need no hand-made drawing in code.
 *
 * For every building folder (<city>/<slug>/) in the buildings bucket it:
 *   1. downloads every STL / GLB part (full quality, not preview/),
 *   2. projects them onto the front plane (x across, z up — models are Z-up),
 *   3. rasterises the union and traces its outline,
 *   4. writes an SVG whose viewBox is in metres to silhouettes/<slug>.svg.
 *
 * The model's top is scaled to the building's full height in metres (spire /
 * antenna included). That comes from --top, else TOP_M below, else the
 * buildings.height_m column.
 *
 * Usage:
 *   pnpm silhouettes                      all building folders
 *   pnpm silhouettes trump-tower 70-pine  just these slugs
 *   pnpm silhouettes 70-pine --top 290    override the height in metres
 *   pnpm silhouettes wtc --angle 45       turn the camera (degrees about the vertical)
 *   pnpm silhouettes --dry                write to ./.silhouettes only, no upload
 */

import * as fs from "fs";
import * as path from "path";
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NodeIO } from "@gltf-transform/core";

// Full drawn height (incl. spire / antenna) for buildings whose model includes one.
const TOP_M: Record<string, number> = {
  "70-pine": 290,
  "empire-state-building": 443,
  "one-world-trade-center": 541,
  "trump-tower": 202,
  "world-trade-center": 417, // this model has no antenna
};

// Camera angle (degrees about the vertical) where the default front view hides detail.
const ANGLE_DEG: Record<string, number> = {};

const RES = 1400; // raster rows from ground to top
const EPS_PX = 0.9; // outline simplification tolerance, in raster pixels
const BUCKET = process.env.R2_BUCKET_BUILDINGS ?? "buildings";
const SKIP_PREFIXES = ["preview/", "silhouettes/"];

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const angleArg = args.indexOf("--angle");
const ANGLE = angleArg !== -1 ? Number(args[angleArg + 1]) : null;
const topArg = args.indexOf("--top");
const TOP_OVERRIDE = topArg !== -1 ? Number(args[topArg + 1]) : null;
const SLUGS = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--top" && args[i - 1] !== "--angle");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// ─── R2 ──────────────────────────────────────────────────────────────────────

async function listKeys(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function download(key: string): Promise<Uint8Array> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return new Uint8Array(await res.Body!.transformToByteArray());
}

/** slug → model keys, from <city>/<slug>/<file>.stl|glb */
function groupModels(keys: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const key of keys) {
    if (SKIP_PREFIXES.some((p) => key.startsWith(p)) || !/\.(stl|glb)$/i.test(key)) continue;
    const parts = key.split("/");
    if (parts.length < 3) continue;
    const slug = parts[parts.length - 2];
    out.set(slug, [...(out.get(slug) ?? []), key]);
  }
  return out;
}

// ─── geometry ────────────────────────────────────────────────────────────────

/** Flat xyz triangle soup (9 floats per triangle). */
function parseStl(buf: Uint8Array): Float32Array {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
  if (84 + n * 50 === buf.byteLength) {
    const out = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12; // skip the normal
      for (let j = 0; j < 9; j++) out[i * 9 + j] = dv.getFloat32(o + j * 4, true);
    }
    return out;
  }
  // ASCII STL
  const text = new TextDecoder().decode(buf);
  const nums: number[] = [];
  for (const m of text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) nums.push(+m[1], +m[2], +m[3]);
  return Float32Array.from(nums);
}

async function parseGlb(buf: Uint8Array): Promise<Float32Array> {
  const doc = await new NodeIO().readBinary(buf);
  const nums: number[] = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : pos.getCount();
      const v: number[] = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        pos.getElement(idx ? idx.getScalar(i) : i, v);
        // glTF is Y-up; convert to the Z-up frame the STLs use
        nums.push(v[0], -v[2], v[1]);
      }
    }
  }
  return Float32Array.from(nums);
}

/** Rasterise the projected triangles (u across, z up) into a filled mask. */
function rasterise(tris: Float32Array[], angleDeg: number) {
  let minU = Infinity, maxU = -Infinity, minZ = Infinity, maxZ = -Infinity;
  // camera turned about the vertical: u is the screen-across axis
  const ca = Math.cos((angleDeg * Math.PI) / 180), sa = Math.sin((angleDeg * Math.PI) / 180);
  const U = (t: Float32Array, i: number) => t[i] * ca + t[i + 1] * sa;
  for (const t of tris) {
    for (let i = 0; i < t.length; i += 3) {
      const u = U(t, i), z = t[i + 2];
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  const scale = RES / (maxZ - minZ); // px per model unit
  const W = Math.ceil((maxU - minU) * scale) + 2, H = RES + 2;
  const mask = new Uint8Array(W * H);
  const X = (u: number) => (u - minU) * scale + 1;
  const Y = (z: number) => (maxZ - z) * scale + 1; // y down

  for (const t of tris) {
    for (let i = 0; i < t.length; i += 9) {
      const ax = X(U(t, i)), ay = Y(t[i + 2]);
      const bx = X(U(t, i + 3)), by = Y(t[i + 5]);
      const cx = X(U(t, i + 6)), cy = Y(t[i + 8]);
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-9) continue; // edge-on to the camera
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) {
        const py = y + 0.5;
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5;
          const w0 = (bx - px) * (cy - py) - (by - py) * (cx - px);
          const w1 = (cx - px) * (ay - py) - (cy - py) * (ax - px);
          const w2 = (ax - px) * (by - py) - (ay - py) * (bx - px);
          if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) mask[y * W + x] = 1;
        }
      }
    }
  }
  return { mask, W, H };
}

/** Pixel-boundary loops around filled regions (filled on the left), as point lists. */
function traceLoops(mask: Uint8Array, W: number, H: number): [number, number][][] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
  // directed edges keyed by start vertex; vertices are pixel corners
  const next = new Map<number, number[]>();
  const key = (x: number, y: number) => y * (W + 1) + x;
  const addEdge = (x0: number, y0: number, x1: number, y1: number) => {
    const k = key(x0, y0);
    const list = next.get(k);
    if (list) list.push(key(x1, y1)); else next.set(k, [key(x1, y1)]);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) addEdge(x + 1, y, x, y); // top edge, heading left
      if (!at(x, y + 1)) addEdge(x, y + 1, x + 1, y + 1); // bottom, heading right
      if (!at(x - 1, y)) addEdge(x, y, x, y + 1); // left, heading down
      if (!at(x + 1, y)) addEdge(x + 1, y + 1, x + 1, y); // right, heading up
    }
  }
  const loops: [number, number][][] = [];
  for (const [start] of next) {
    while (next.get(start)?.length) {
      const loop: [number, number][] = [];
      let k = start;
      do {
        loop.push([k % (W + 1), Math.floor(k / (W + 1))]);
        const list = next.get(k)!;
        const n = list.pop()!;
        if (!list.length) next.delete(k);
        k = n;
      } while (k !== start && next.has(k));
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/** Douglas–Peucker on a closed loop. */
function simplify(loop: [number, number][], eps: number): [number, number][] {
  const dp = (pts: [number, number][]): [number, number][] => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > worst) { worst = d; idx = i; }
    }
    if (worst <= eps) return [pts[0], pts[pts.length - 1]];
    return [...dp(pts.slice(0, idx + 1)).slice(0, -1), ...dp(pts.slice(idx))];
  };
  // split the ring at its farthest-apart point so DP has two real ends
  let far = 0, fd = 0;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = dp(loop.slice(0, far + 1));
  const b = dp([...loop.slice(far), loop[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function toSvg(loops: [number, number][][], W: number, H: number, topM: number, slug: string) {
  const m = topM / (H - 2); // metres per pixel
  const n = (v: number) => +(v * m).toFixed(2);
  const d = loops
    .map((l) => simplify(l, EPS_PX))
    .filter((l) => l.length >= 3)
    .map((l) => "M" + l.map(([x, y]) => `${n(x - 1)} ${n(y - 1)}`).join("L") + "Z")
    .join("");
  const widthM = n(W - 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthM} ${topM}" data-slug="${slug}" data-top-m="${topM}">` +
    `<path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

async function heightFromDb(slug: string): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/buildings?slug=eq.${encodeURIComponent(slug)}&select=height_m`, { headers: { apikey: key } });
    const rows = res.ok ? await res.json() : [];
    return rows[0]?.height_m ? Number(rows[0].height_m) : null;
  } catch {
    return null;
  }
}

const models = groupModels(await listKeys());
const slugs = SLUGS.length ? SLUGS : [...models.keys()];
const outDir = path.resolve(".silhouettes");
fs.mkdirSync(outDir, { recursive: true });

for (const slug of slugs) {
  const keys = models.get(slug);
  if (!keys?.length) {
    console.warn(`✗ ${slug}: no STL/GLB under */${slug}/`);
    continue;
  }
  const topM = TOP_OVERRIDE ?? TOP_M[slug] ?? (await heightFromDb(slug));
  if (!topM) {
    console.warn(`✗ ${slug}: no height — pass --top <metres> or set buildings.height_m`);
    continue;
  }
  const tris: Float32Array[] = [];
  for (const key of keys) {
    const buf = await download(key);
    tris.push(/\.glb$/i.test(key) ? await parseGlb(buf) : parseStl(buf));
  }
  const { mask, W, H } = rasterise(tris, ANGLE ?? ANGLE_DEG[slug] ?? 0);
  const svg = toSvg(traceLoops(mask, W, H), W, H, topM, slug);
  fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);
  if (!DRY) {
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `silhouettes/${slug}.svg`,
      Body: svg,
      ContentType: "image/svg+xml",
      CacheControl: "public, max-age=300",
    }));
  }
  const tCount = tris.reduce((s, t) => s + t.length / 9, 0);
  console.log(`✓ ${slug}: ${keys.length} part(s), ${tCount} tris → ${(svg.length / 1024).toFixed(1)} KB, ${topM} m tall${DRY ? " (dry)" : ` → ${BUCKET}/silhouettes/${slug}.svg`}`);
}
