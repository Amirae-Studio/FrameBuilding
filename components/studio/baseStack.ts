/**
 * Base stack geometry for the Studio.
 *
 * Builds the plates that sit under a model (one below the other, touching —
 * no gaps), each with its own size, thickness, corner roundness and colour,
 * plus any number of text labels attached flush to any face of any plate:
 * raised (emboss) or cut in (engrave, with a coloured inlay on the floor so it
 * still prints in the text's colour).
 *
 * Pure three.js — no React — so the same output is previewed and exported.
 * All geometry is built directly in the city object's local space.
 */
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { baseMargins, type BaseFace, type BaseLayer, type BaseText } from "../../lib/studio";

export type Axis = "x" | "y" | "z";

/** Where the stack hangs from, in the city object's local space. */
export type StackFrame = {
  upAxis: Axis;
  horizAxes: [Axis, Axis]; // [width axis, depth axis]; +depth is the front
  cx: number; // footprint centre along horizAxes[0]
  cz: number; // footprint centre along horizAxes[1]
  topY: number; // top of the first base, along upAxis
  modelW: number; // model footprint along horizAxes[0]
  modelD: number; // model footprint along horizAxes[1]
  unit: number; // object units per centimetre
};

/** Solved size and position of one base. */
export type BaseInfo = {
  index: number;
  id: string;
  halfW: number;
  halfD: number;
  yTop: number;
  yBottom: number;
  radius: number;
};

/** Holes carved through the top base (e.g. where the water shows through). */
export type MaskBox = { a: number; b: number; w: number; d: number };

export type FaceFrame = {
  origin: THREE.Vector3; // centre of the usable area of the face
  U: THREE.Vector3; // reading direction
  V: THREE.Vector3; // "up" for the letters
  N: THREE.Vector3; // outward normal
  hu: number; // usable half-extent along U
  hv: number; // usable half-extent along V
};

export const STACK_GROUP = "bases_group";

const axisVec = (a: Axis) => new THREE.Vector3(a === "x" ? 1 : 0, a === "y" ? 1 : 0, a === "z" ? 1 : 0);

/** Total thickness of the stack in object units. */
export function stackThickness(bases: BaseLayer[], unit: number) {
  return bases.reduce((s, b) => s + Math.max(0.05, b.thickness) * unit, 0);
}

/** Solve every base's footprint and vertical span, top to bottom. */
export function solveBases(frame: StackFrame, bases: BaseLayer[]): BaseInfo[] {
  let y = frame.topY;
  return bases.map((b, index) => {
    const m = baseMargins(b);
    const halfW = frame.modelW / 2 + Math.max(0, m.w) * frame.unit;
    const halfD = frame.modelD / 2 + Math.max(0, m.d) * frame.unit;
    const h = Math.max(0.05, b.thickness) * frame.unit;
    const radius = (Math.min(100, Math.max(0, b.roundness)) / 100) * Math.min(halfW, halfD) * 0.999;
    const info = { index, id: b.id, halfW, halfD, yTop: y, yBottom: y - h, radius };
    y -= h; // the next base starts exactly where this one ends — no gap
    return info;
  });
}

/** Orientation, centre and usable size of one face of one base. */
export function faceFrame(frame: StackFrame, info: BaseInfo, face: BaseFace): FaceFrame {
  const A = axisVec(frame.horizAxes[0]);
  const B = axisVec(frame.horizAxes[1]);
  const UP = axisVec(frame.upAxis);
  const centre = A.clone().multiplyScalar(frame.cx).add(B.clone().multiplyScalar(frame.cz));
  const midY = (info.yTop + info.yBottom) / 2;
  const halfH = (info.yTop - info.yBottom) / 2;
  const flatW = Math.max(info.halfW - info.radius, info.halfW * 0.15);
  const flatD = Math.max(info.halfD - info.radius, info.halfD * 0.15);

  let N: THREE.Vector3;
  let Vd: THREE.Vector3;
  let origin: THREE.Vector3;
  let hu: number;
  let hv: number;
  switch (face) {
    case "top":
      N = UP.clone();
      Vd = B.clone().negate(); // letters read from the front
      origin = centre.clone().add(UP.clone().multiplyScalar(info.yTop));
      // ±100 % reaches (almost) the edge, so labels can sit in the margin ring
      hu = info.halfW * 0.97;
      hv = info.halfD * 0.97;
      break;
    case "front":
      N = B.clone();
      Vd = UP.clone();
      origin = centre.clone().add(B.clone().multiplyScalar(info.halfD)).add(UP.clone().multiplyScalar(midY));
      hu = flatW * 0.96;
      hv = halfH * 0.9;
      break;
    case "back":
      N = B.clone().negate();
      Vd = UP.clone();
      origin = centre.clone().add(B.clone().multiplyScalar(-info.halfD)).add(UP.clone().multiplyScalar(midY));
      hu = flatW * 0.96;
      hv = halfH * 0.9;
      break;
    case "right":
      N = A.clone();
      Vd = UP.clone();
      origin = centre.clone().add(A.clone().multiplyScalar(info.halfW)).add(UP.clone().multiplyScalar(midY));
      hu = flatD * 0.96;
      hv = halfH * 0.9;
      break;
    case "left":
    default:
      N = A.clone().negate();
      Vd = UP.clone();
      origin = centre.clone().add(A.clone().multiplyScalar(-info.halfW)).add(UP.clone().multiplyScalar(midY));
      hu = flatD * 0.96;
      hv = halfH * 0.9;
      break;
  }
  const U = new THREE.Vector3().crossVectors(Vd, N).normalize();
  const V = new THREE.Vector3().crossVectors(N, U).normalize();
  return { origin, U, V, N, hu, hv };
}

/** Which face of a base a surface normal (object space) belongs to. */
export function classifyFace(frame: StackFrame, n: THREE.Vector3): BaseFace | null {
  const up = n.dot(axisVec(frame.upAxis));
  if (up > 0.6) return "top";
  if (up < -0.6) return null; // underside: not a place for text
  const a = n.dot(axisVec(frame.horizAxes[0]));
  const b = n.dot(axisVec(frame.horizAxes[1]));
  if (Math.abs(b) >= Math.abs(a)) return b > 0 ? "front" : "back";
  return a > 0 ? "right" : "left";
}

/** Convert a point on a face to the text's u/v percentages. */
export function pointToUV(ff: FaceFrame, p: THREE.Vector3) {
  const rel = p.clone().sub(ff.origin);
  const clampP = (n: number) => Math.round(Math.max(-100, Math.min(100, n)));
  return {
    u: clampP((rel.dot(ff.U) / (ff.hu || 1)) * 100),
    v: clampP((rel.dot(ff.V) / (ff.hv || 1)) * 100),
  };
}

/* --------------------------------------------------------------- helpers */

/** Flip triangle winding in place (needed after a mirroring basis). */
function flipWinding(g: THREE.BufferGeometry) {
  if (g.index) {
    const idx = g.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
    return;
  }
  for (const name of Object.keys(g.attributes)) {
    const attr = g.attributes[name] as THREE.BufferAttribute;
    const n = attr.itemSize;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < attr.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k];
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k];
        arr[(i + 2) * n + k] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

/** Keep only position + normal so every brush and merge shares one layout. */
function lean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) {
    if (name !== "position" && name !== "normal") out.deleteAttribute(name);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}

function roundedRect(hw: number, hd: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  if (r < 1e-6) {
    s.moveTo(-hw, -hd);
    s.lineTo(hw, -hd);
    s.lineTo(hw, hd);
    s.lineTo(-hw, hd);
    s.closePath();
    return s;
  }
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - r);
  s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hd);
  s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + r);
  s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Map stack-canonical coords (x = width, y = depth, z = up) into object space. */
function canonicalMatrix(frame: StackFrame, yBottom: number) {
  const A = axisVec(frame.horizAxes[0]);
  const B = axisVec(frame.horizAxes[1]);
  const UP = axisVec(frame.upAxis);
  const m = new THREE.Matrix4().makeBasis(A, B, UP);
  m.setPosition(A.clone().multiplyScalar(frame.cx).add(B.clone().multiplyScalar(frame.cz)).add(UP.clone().multiplyScalar(yBottom)));
  return { m, mirrored: m.determinant() < 0 };
}

function baseGeometry(frame: StackFrame, info: BaseInfo): THREE.BufferGeometry {
  const h = info.yTop - info.yBottom;
  const g = new THREE.ExtrudeGeometry(roundedRect(info.halfW, info.halfD, info.radius), {
    depth: h,
    bevelEnabled: false,
    curveSegments: 14,
  });
  const { m, mirrored } = canonicalMatrix(frame, info.yBottom);
  g.applyMatrix4(m);
  if (mirrored) flipWinding(g);
  return lean(g);
}

function maskGeometry(frame: StackFrame, info: BaseInfo, box: MaskBox): THREE.BufferGeometry {
  const h = info.yTop - info.yBottom;
  const g = new THREE.BoxGeometry(box.w, box.d, h * 1.6);
  // box is centred at (a, b) relative to the footprint centre, through the plate
  g.translate(box.a - frame.cx, box.b - frame.cz, h / 2);
  const { m, mirrored } = canonicalMatrix(frame, info.yBottom);
  g.applyMatrix4(m);
  if (mirrored) flipWinding(g);
  return lean(g);
}

const ITALIC = new Set(["italic", "boldItalic", "scriptBold"]);

/** Letters for one label, centred on the origin, extruded 0 → depth along +Z. */
function letters(text: string, font: Font, size: number, depth: number, fontKey: string): THREE.BufferGeometry | null {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return null;
  const shear = new THREE.Matrix4().set(1, Math.tan((16 * Math.PI) / 180), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  const parts: THREE.BufferGeometry[] = [];
  lines.forEach((line, i) => {
    const g = new TextGeometry(line, { font, size, depth, curveSegments: 4, bevelEnabled: false });
    if (ITALIC.has(fontKey)) g.applyMatrix4(shear);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-(bb.min.x + bb.max.x) / 2, -i * size * 1.4, 0);
    parts.push(lean(g));
  });
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts);
  if (!merged) return null;
  merged.computeBoundingBox();
  const bb = merged.boundingBox!;
  merged.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
  return merged;
}

/** Place letters on a face: z0 → z1 measured outward from the face. */
function placeOnFace(g: THREE.BufferGeometry, ff: FaceFrame, t: BaseText, z0: number, rotationDeg: number) {
  g.translate(0, 0, z0);
  g.rotateZ((rotationDeg * Math.PI) / 180);
  // keep the whole label on the face: the centre may not come closer to an
  // edge than half the label's own size (a label bigger than the face centres)
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const ex = (bb.max.x - bb.min.x) / 2;
  const ey = (bb.max.y - bb.min.y) / 2;
  const lim = (n: number, half: number, ext: number) => {
    const room = Math.max(0, half - ext);
    return Math.max(-room, Math.min(room, n));
  };
  const pu = lim((t.u / 100) * ff.hu, ff.hu, ex);
  const pv = lim((t.v / 100) * ff.hv, ff.hv, ey);
  const pos = ff.origin
    .clone()
    .add(ff.U.clone().multiplyScalar(pu))
    .add(ff.V.clone().multiplyScalar(pv));
  const m = new THREE.Matrix4().makeBasis(ff.U, ff.V, ff.N).setPosition(pos);
  g.applyMatrix4(m);
  return g;
}

const evaluator = new Evaluator();
evaluator.attributes = ["position", "normal"];
evaluator.useGroups = false;

function subtract(target: THREE.BufferGeometry, cutters: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let current = new Brush(target);
  current.updateMatrixWorld();
  for (const c of cutters) {
    const brush = new Brush(c);
    brush.updateMatrixWorld();
    const next = evaluator.evaluate(current, brush, SUBTRACTION);
    current.geometry.dispose();
    current = next as Brush;
  }
  return current.geometry;
}

/* ----------------------------------------------------------------- build */

export type BuildOptions = {
  fonts: Map<string, Font>; // loaded typefaces, keyed by font key
  colors: boolean; // filament colours on → bases use their colour
  defaultText: string; // used when a label's text is empty
  maskBoxes?: MaskBox[]; // carved through the top base
  /** quick preview: skip carving engraved letters (shown flush instead) */
  fast?: boolean;
};

export type StackResult = { group: THREE.Group; bases: BaseInfo[] };

const NEUTRAL = "#e9e6df";

export function buildBaseStack(
  frame: StackFrame,
  bases: BaseLayer[],
  texts: BaseText[],
  opts: BuildOptions
): StackResult {
  const group = new THREE.Group();
  group.name = STACK_GROUP;
  const infos = solveBases(frame, bases);
  const byId = new Map(infos.map((i) => [i.id, i]));

  // letters first: engraved ones become cutters for their base
  const cutters = new Map<string, THREE.BufferGeometry[]>();
  const textMeshes: THREE.Mesh[] = [];
  const mm = frame.unit / 10;

  texts.forEach((t, ti) => {
    const info = byId.get(t.baseId);
    const font = opts.fonts.get(t.font) || opts.fonts.get("sans-serif");
    if (!info || !font) return;
    const content = t.text.trim() ? t.text : opts.defaultText;
    const ff = faceFrame(frame, info, t.face);
    const size = Math.max(0.5, t.size) * mm;
    const depth = Math.max(0.2, t.depth) * mm;
    const overlap = 0.15 * mm; // sink 0.15 mm into the plate so nothing floats

    let solid: THREE.BufferGeometry | null;
    if (t.mode === "engrave" && opts.fast) {
      // preview while dragging: the letters sit flush in the face, no carving yet
      solid = letters(content, font, size, depth + 0.05 * mm, t.font);
      if (solid) placeOnFace(solid, ff, t, -depth, t.rotation);
    } else if (t.mode === "engrave") {
      const cut = letters(content, font, size, depth + 0.3 * mm, t.font);
      if (cut) {
        placeOnFace(cut, ff, t, -depth, t.rotation);
        const list = cutters.get(info.id) || [];
        list.push(cut);
        cutters.set(info.id, list);
      }
      // a coloured inlay lining the floor of the cut, so it prints in colour
      const inlay = Math.min(0.6 * mm, depth * 0.5);
      solid = letters(content, font, size, inlay, t.font);
      if (solid) placeOnFace(solid, ff, t, -depth, t.rotation);
    } else {
      solid = letters(content, font, size, depth + overlap, t.font);
      if (solid) placeOnFace(solid, ff, t, -overlap, t.rotation);
    }
    if (!solid) return;
    const mesh = new THREE.Mesh(
      solid,
      new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.5, metalness: 0.1 })
    );
    mesh.name = `text-${ti + 1}`;
    mesh.castShadow = true;
    mesh.userData.textId = t.id;
    mesh.userData.isBaseText = true;
    mesh.userData.carved = t.mode === "engrave" && !opts.fast;
    textMeshes.push(mesh);
  });

  infos.forEach((info, i) => {
    let g = baseGeometry(frame, info);
    const cuts: THREE.BufferGeometry[] = [];
    if (i === 0 && opts.maskBoxes?.length) cuts.push(...opts.maskBoxes.map((b) => maskGeometry(frame, info, b)));
    cuts.push(...(cutters.get(info.id) || []));
    if (cuts.length) {
      try {
        g = subtract(g, cuts);
      } catch (err) {
        console.warn("Base carving failed; showing the plate uncut.", err);
      }
      cuts.forEach((c) => c.dispose());
    }
    g.computeBoundingBox();
    const mesh = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color: opts.colors ? bases[i].color : NEUTRAL,
        roughness: 0.65,
        metalness: 0.05,
      })
    );
    mesh.name = `base-${i + 1}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.baseId = info.id;
    mesh.userData.isBase = true;
    group.add(mesh);
  });

  textMeshes.forEach((m) => group.add(m));
  group.userData.stack = { frame, bases: infos };
  return { group, bases: infos };
}

/** Free GPU memory of a previously built stack. */
export function disposeStack(group: THREE.Object3D) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => mt?.dispose());
    }
  });
}
