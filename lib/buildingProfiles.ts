/**
 * Scaled front elevations for the Studio's building lineup.
 *
 * Every drawing is in metres (x centred on 0, z up from the ground), so the
 * lineup can put all buildings on one ground line at one scale. Facts are
 * architectural heights; antennas are drawn but don't count towards `height`.
 * Buildings without a profile fall back to a generic tower.
 */

type Part =
  | { t: "rect"; x?: number; w: number; z0: number; z1: number }
  | { t: "taper"; x?: number; w0: number; w1: number; z0: number; z1: number }
  | { t: "dome"; x?: number; w: number; z0: number; z1: number };

export type BuildingProfile = {
  /** architectural height in metres */
  height: number;
  floors?: number;
  year?: number;
  parts: Part[];
};

/** stacked, centred setback tiers: [width, tier height][] */
function tiers(list: [number, number][], z = 0, x = 0): Part[] {
  return list.map(([w, h]) => {
    const p: Part = { t: "rect", x, w, z0: z, z1: z + h };
    z += h;
    return p;
  });
}

const spire = (z0: number, z1: number, w0: number, w1 = 0.6, x = 0): Part => ({ t: "taper", x, w0, w1, z0, z1 });

export const BUILDING_PROFILES: Record<string, BuildingProfile> = {
  "70-pine": {
    height: 290,
    floors: 67,
    year: 1932,
    parts: [...tiers([[52, 150], [46, 60], [38, 32], [28, 20], [18, 14]]), spire(276, 290, 9)],
  },
  "empire-state-building": {
    height: 381,
    floors: 102,
    year: 1931,
    parts: [
      ...tiers([[129, 24], [86, 40], [72, 22], [60, 234], [46, 24], [34, 20], [22, 17]]),
      { t: "rect", w: 12, z0: 381, z1: 405 },
      spire(405, 443, 6),
    ],
  },
  "one-world-trade-center": {
    height: 541,
    floors: 94,
    year: 2014,
    parts: [
      { t: "rect", w: 61, z0: 0, z1: 56 },
      { t: "taper", w0: 61, w1: 42, z0: 56, z1: 417 },
      { t: "rect", w: 14, z0: 417, z1: 425 },
      spire(425, 541, 3),
    ],
  },
  "trump-tower": {
    height: 202,
    floors: 58,
    year: 1983,
    parts: tiers([[54, 26], [48, 110], [42, 40], [36, 26]]),
  },
  "world-trade-center": {
    height: 417,
    floors: 110,
    year: 1973,
    parts: [
      { t: "rect", x: -37, w: 63.4, z0: 0, z1: 417 },
      spire(417, 527, 3, 0.6, -37),
      { t: "rect", x: 37, w: 63.4, z0: 0, z1: 415 },
    ],
  },
  "taj-mahal": {
    height: 73,
    year: 1653,
    parts: [
      { t: "rect", w: 95, z0: 0, z1: 7 },
      // minarets with their cupolas
      { t: "rect", x: -42, w: 5, z0: 7, z1: 47 },
      { t: "dome", x: -42, w: 7, z0: 47, z1: 52 },
      { t: "rect", x: 42, w: 5, z0: 7, z1: 47 },
      { t: "dome", x: 42, w: 7, z0: 47, z1: 52 },
      // mausoleum, corner chhatris, drum, onion dome and finial
      { t: "rect", w: 57, z0: 7, z1: 33 },
      { t: "rect", x: -20, w: 7, z0: 33, z1: 37 },
      { t: "dome", x: -20, w: 9, z0: 37, z1: 43 },
      { t: "rect", x: 20, w: 7, z0: 33, z1: 37 },
      { t: "dome", x: 20, w: 9, z0: 37, z1: 43 },
      { t: "rect", w: 28, z0: 33, z1: 41 },
      { t: "dome", w: 36, z0: 41, z1: 68 },
      spire(68, 73, 1.6),
    ],
  },
};

const GENERIC: BuildingProfile = {
  height: 120,
  parts: [...tiers([[36, 100], [28, 12]]), spire(112, 120, 4)],
};

export function profileFor(slug: string): { profile: BuildingProfile; known: boolean } {
  const p = BUILDING_PROFILES[slug];
  return p ? { profile: p, known: true } : { profile: GENERIC, known: false };
}

/** Drawing extents in metres: full width and the top of the tallest part. */
export function extents(p: BuildingProfile) {
  let minX = Infinity;
  let maxX = -Infinity;
  let top = 0;
  for (const part of p.parts) {
    const x = part.x ?? 0;
    const half = (part.t === "taper" ? Math.max(part.w0, part.w1) : part.w) / 2;
    minX = Math.min(minX, x - half);
    maxX = Math.max(maxX, x + half);
    top = Math.max(top, part.z1);
  }
  return { minX, maxX, width: maxX - minX, top };
}

/** SVG markup (viewBox in metres, y down) for a profile, filled with currentColor. */
export function elevationSvg(p: BuildingProfile) {
  const { minX, width, top } = extents(p);
  const X = (x: number) => +(x - minX).toFixed(2);
  const Y = (z: number) => +(top - z).toFixed(2);
  const shapes: string[] = [];
  const setbacks: string[] = [];

  for (const part of p.parts) {
    const cx = part.x ?? 0;
    if (part.t === "rect") {
      shapes.push(`<rect x="${X(cx - part.w / 2)}" y="${Y(part.z1)}" width="${part.w}" height="${+(part.z1 - part.z0).toFixed(2)}"/>`);
      if (part.z0 > 0) setbacks.push(`M${X(cx - part.w / 2)} ${Y(part.z0)}H${X(cx + part.w / 2)}`);
    } else if (part.t === "taper") {
      shapes.push(
        `<polygon points="${X(cx - part.w0 / 2)},${Y(part.z0)} ${X(cx + part.w0 / 2)},${Y(part.z0)} ${X(cx + part.w1 / 2)},${Y(part.z1)} ${X(cx - part.w1 / 2)},${Y(part.z1)}"/>`
      );
    } else {
      // onion dome: bulges past its base, then pulls in to a point
      const h = part.z1 - part.z0;
      const b = part.w * 0.39;
      shapes.push(
        `<path d="M${X(cx - b)} ${Y(part.z0)}C${X(cx - part.w * 0.62)} ${Y(part.z0 + h * 0.35)} ${X(cx - part.w * 0.5)} ${Y(part.z0 + h * 0.78)} ${X(cx)} ${Y(part.z1)}C${X(cx + part.w * 0.5)} ${Y(part.z0 + h * 0.78)} ${X(cx + part.w * 0.62)} ${Y(part.z0 + h * 0.35)} ${X(cx + b)} ${Y(part.z0)}Z"/>`
      );
    }
  }

  return {
    width,
    top,
    svg:
      `<svg viewBox="0 0 ${+width.toFixed(2)} ${+top.toFixed(2)}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<g fill="currentColor">${shapes.join("")}</g>` +
      (setbacks.length
        ? `<path d="${setbacks.join("")}" fill="none" stroke="rgba(36,27,79,.28)" stroke-width="1" vector-effect="non-scaling-stroke"/>`
        : "") +
      `</svg>`,
  };
}
