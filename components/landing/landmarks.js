/* Original isometric "landmark island" infographic for the sign-in page:
   famous landmarks on a river island with roads, trees, traffic, clouds and
   labelled call-outs. Deterministic SVG markup, so it renders identically on
   server and client.

   Light comes from the top-left: roofs are lightest, faces turned towards
   +y (screen left) are mid-tone and faces turned towards +x (screen right)
   are darkest. Every face colour is derived from its normal, so chamfers and
   facets shade consistently. */

const S = 14; // px per grid unit
const KX = S * 0.866;
const KY = S * 0.5;
const KZ = S * 0.78; // heights slightly compressed, infographic-style
const OX = 520;
const OY = 360;
// the lake overhangs x = 0 a little, so the view box starts left of it
const VX = -50;
const W = 1140;
const H = 1000;

const f = (n) => +n.toFixed(2);
const P = (x, y, z = 0) => [OX + (x - y) * KX, OY + (x + y) * KY - z * KZ];
const pts = (a) => a.map((p) => f(p[0]) + "," + f(p[1])).join(" ");
const poly = (p, fill, extra = "") => `<polygon points="${pts(p)}" fill="${fill}" ${extra}/>`;
const EDGE = `stroke="rgba(60,50,110,.28)" stroke-width=".7" stroke-linejoin="round"`;
const NS = `vector-effect="non-scaling-stroke"`;

const LAND = ["#cfe8d6", "#9cc9b1", "#86b89f"];
const GOLD = "#d9a640";

/* ---------- colour ---------- */

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))));
  return `rgb(${c.join(",")})`;
}
// colour for a vertical face with outward normal (nx, ny): L at +y, R at +x
function shade(nx, ny, L, R) {
  const t = Math.atan2(nx, ny) / (Math.PI / 2);
  return mix(L, R, Math.max(-0.7, Math.min(1.6, t)));
}

/* ---------- primitives ---------- */

// convex prism over a footprint polygon; only faces turned towards the viewer are drawn
function prism(foot, z0, z1, col, opt = {}) {
  const n = foot.length;
  const cx = foot.reduce((s, p) => s + p[0], 0) / n;
  const cy = foot.reduce((s, p) => s + p[1], 0) / n;
  let g = "";
  for (let i = 0; i < n; i++) {
    const a = foot[i];
    const b = foot[(i + 1) % n];
    let nx = b[1] - a[1];
    let ny = -(b[0] - a[0]);
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (nx + ny <= 1e-6) continue;
    const len = Math.hypot(nx, ny);
    const face = [P(a[0], a[1], z1), P(b[0], b[1], z1), P(b[0], b[1], z0), P(a[0], a[1], z0)];
    g += poly(face, shade(nx / len, ny / len, col[1], col[2]), opt.edge === false ? "" : EDGE);
    if (opt.face) g += opt.face(a, b, z0, z1);
  }
  if (opt.roof !== false) g += poly(foot.map((p) => P(p[0], p[1], z1)), col[0], opt.edge === false ? "" : EDGE);
  return g;
}

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function box(x0, y0, x1, y1, z0, z1, col, opt = {}) {
  let g = prism(rect(x0, y0, x1, y1), z0, z1, col, { ...opt, roof: false });
  if (opt.win) g += onFace(x0, y1, x1, y1, z0, `<rect width="${f(x1 - x0)}" height="${f(z1 - z0)}" fill="url(#${opt.win})"/>`);
  if (opt.win) g += onFace(x1, y0, x1, y1, z0, `<rect width="${f(y1 - y0)}" height="${f(z1 - z0)}" fill="url(#${opt.win})"/>`);
  // catch-light on the front corner
  if (opt.edge !== false) g += line(P(x1, y1, z0), P(x1, y1, z1), "rgba(255,255,255,.55)", 0.8);
  return g + poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col[0], opt.edge === false ? "" : EDGE);
}

// draw SVG in the local frame of a vertical face running from (ax,ay) to (bx,by):
// u = distance along the face, v = height above z0 (up is positive)
function onFace(ax, ay, bx, by, z0, inner) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const o = P(ax, ay, z0);
  return `<g transform="matrix(${f((ux - uy) * KX)},${f((ux + uy) * KY)},0,${f(-KZ)},${f(o[0])},${f(o[1])})">${inner}</g>`;
}

const ellR = (r) => [r * KX * Math.SQRT2, r * KY * Math.SQRT2];

// (tapering) cylinder: body shaded left-to-right, flat top
function cyl(cx, cy, r0, z0, z1, body = "url(#lm-stoneCyl)", top = "#fffaf6", r1 = r0) {
  const a = P(cx, cy, z0);
  const b = P(cx, cy, z1);
  const [ra, rya] = ellR(r0);
  const [rb, ryb] = ellR(r1);
  return (
    `<path d="M${f(b[0] - rb)} ${f(b[1])}L${f(a[0] - ra)} ${f(a[1])}A${f(ra)} ${f(rya)} 0 0 0 ${f(a[0] + ra)} ${f(a[1])}L${f(b[0] + rb)} ${f(b[1])}A${f(rb)} ${f(ryb)} 0 0 1 ${f(b[0] - rb)} ${f(b[1])}Z" fill="${body}" ${EDGE}/>` +
    (top ? `<ellipse cx="${f(b[0])}" cy="${f(b[1])}" rx="${f(rb)}" ry="${f(ryb)}" fill="${top}" ${EDGE}/>` : "")
  );
}

// front half of a ring at height z
function ring(cx, cy, r, z, stroke, w = 1) {
  const c = P(cx, cy, z);
  const [rx, ry] = ellR(r);
  return `<path d="M${f(c[0] - rx)} ${f(c[1])}A${f(rx)} ${f(ry)} 0 0 0 ${f(c[0] + rx)} ${f(c[1])}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
}

function line(a, b, stroke, w = 1, extra = "") {
  return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
}

// ground shadows are collected while a scene is drawn and painted under every building
let groundShadows = null;

// soft cast shadow: hull of a footprint and the same footprint pushed to screen-right.
// Shadows on the ground (z = 0) are deferred; raised ones (on a plinth) draw in place.
function shadow(foot, h, z = 0) {
  const d = Math.min(h * 0.28, 6);
  const all = [...foot, ...foot.map(([x, y]) => [x + d, y - d * 0.55])].map(([x, y]) => P(x, y, z + 0.07));
  all.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of all) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of all.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const svg = poly(lower.slice(0, -1).concat(upper.slice(0, -1)), "rgba(36,50,90,.16)");
  if (z === 0 && groundShadows) {
    groundShadows.push(svg);
    return "";
  }
  return svg;
}

// pointed (Gothic / Mughal) arch in face coordinates: centre u, base v, width w, height h
const pointedArch = (u, v, w, h) =>
  `M${f(u - w / 2)} ${f(v)}V${f(v + h - w * 0.62)}Q${f(u - w / 2)} ${f(v + h - w * 0.12)} ${f(u)} ${f(v + h)}Q${f(u + w / 2)} ${f(v + h - w * 0.12)} ${f(u + w / 2)} ${f(v + h - w * 0.62)}V${f(v)}Z`;

function tree(x, y, size = 1, cone = false) {
  const base = P(x, y, 0);
  const r = size * S * 0.6;
  const sh = `<ellipse cx="${f(base[0] + r * 0.5)}" cy="${f(base[1])}" rx="${f(r * 0.95)}" ry="${f(r * 0.38)}" fill="rgba(36,70,60,.18)"/>`;
  if (cone) {
    const tip = P(x, y, size * 2.7);
    return (
      sh +
      `<path d="M${f(base[0])} ${f(tip[1])}L${f(base[0] + r)} ${f(base[1] - 2)}L${f(base[0])} ${f(base[1] + 1.5)}Z" fill="#3f936f"/>` +
      `<path d="M${f(base[0])} ${f(tip[1])}L${f(base[0] - r)} ${f(base[1] - 2)}L${f(base[0])} ${f(base[1] + 1.5)}Z" fill="#5fb58a"/>`
    );
  }
  const c = P(x, y, size * 1.35);
  return (
    sh +
    line(base, c, "#7a6a7f", 1.6) +
    `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}" fill="#5fb58a"/>` +
    `<circle cx="${f(c[0] + r * 0.28)}" cy="${f(c[1] + r * 0.2)}" r="${f(r * 0.7)}" fill="#4aa37c"/>` +
    `<circle cx="${f(c[0] - r * 0.3)}" cy="${f(c[1] - r * 0.32)}" r="${f(r * 0.32)}" fill="#86cfa6"/>`
  );
}

function cloud(cx, cy, k = 1) {
  const c = (dx, dy, r) => `<circle cx="${f(cx + dx * k)}" cy="${f(cy + dy * k)}" r="${f(r * k)}"/>`;
  return (
    `<g fill="#fff" opacity=".92">` +
    c(0, 0, 22) + c(26, -10, 28) + c(56, 0, 20) + c(-22, 6, 15) +
    `<rect x="${f(cx - 36 * k)}" y="${f(cy)}" width="${f(108 * k)}" height="${f(20 * k)}" rx="${f(10 * k)}"/></g>`
  );
}

/* ---------- Empire State Building ---------- */

const LIME = ["#f7f2ef", "#e4dce3", "#c8bccd"];
const LIT = ["#ffe9f0", "#f7bccb", "#e597ad"];

function empireState(x0, y0) {
  const cx = x0 + 3.5;
  const cy = y0 + 2.75;
  // centred tier of half-widths (hx, hy)
  const tier = (hx, hy, z0, z1, col = LIME, win = "lm-esb") => box(cx - hx, cy - hy, cx + hx, cy + hy, z0, z1, col, { win });
  let g = shadow(rect(x0, y0, x0 + 7, y0 + 5.5), 24);
  // five-storey base along Fifth Avenue, then the setbacks of the wings
  g += tier(3.5, 2.75, 0, 1.5, LIME, "lm-win");
  g += box(cx - 3.5, cy - 2.75, cx + 3.5, cy + 2.75, 1.5, 1.68, ["#fffaf8", "#efe8ee", "#d8ced9"]);
  g += tier(3, 2.35, 1.68, 3.1);
  g += tier(2.45, 2, 3.1, 4.2);
  g += tier(2.05, 1.8, 4.2, 4.9);
  // main shaft with its projecting central bays
  g += tier(1.75, 1.55, 4.9, 17.6);
  g += box(cx - 0.42, cy + 1.55, cx + 0.42, cy + 1.75, 4.9, 17.9, LIME, { win: "lm-esb" });
  g += box(cx + 1.75, cy - 0.42, cx + 1.95, cy + 0.42, 4.9, 17.9, LIME, { win: "lm-esb" });
  // upper setbacks, observatory and the lit crown
  g += tier(1.45, 1.3, 17.6, 18.5);
  g += tier(1.15, 1.05, 18.5, 19.3);
  g += tier(0.9, 0.85, 19.3, 20.1, LIT, "lm-fins");
  g += tier(0.68, 0.65, 20.1, 20.8, LIT, "lm-fins");
  g += tier(0.48, 0.46, 20.8, 21.4, LIT, "lm-fins");
  // mooring mast and antenna
  g += cyl(cx, cy, 0.3, 21.4, 23.3, "url(#lm-steelCyl)", "#eef1fb", 0.24);
  g += ring(cx, cy, 0.34, 22, "#fff", 1.2) + ring(cx, cy, 0.3, 22.7, "#fff", 1.2);
  g += line(P(cx, cy, 23.3), P(cx, cy, 26.4), "#8d97c9", 1.6);
  g += `<circle cx="${f(P(cx, cy, 26.4)[0])}" cy="${f(P(cx, cy, 26.4)[1])}" r="1.8" fill="#f29bb7"/>`;
  return g;
}

/* ---------- One World Trade Center ---------- */

function oneWorldTrade(cx, cy) {
  // real proportions: ~61 m square base, 417 m roof, podium about a seventh of that
  const a = 1.75;
  const z0 = 3.4;
  const z1 = 28.6;
  let g = shadow(rect(cx - a, cy - a, cx + a, cy + a), 30);
  // podium with vertical glass fins
  g += box(cx - a, cy - a, cx + a, cy + a, 0, z0, ["#eef2fb", "#cfd8ec", "#aeb9d6"], { win: "lm-fin" });
  // the tower: a square base becoming a 45°-rotated square at the top,
  // which folds the shaft into eight tall triangles
  const A = (x, y) => P(cx + x, cy + y, z0);
  const T = (x, y) => P(cx + x, cy + y, z1);
  const facet = `stroke="rgba(255,255,255,.6)" stroke-width=".8" stroke-linejoin="round"`;
  const h = z1 - z0;
  // the two upright triangles lie in the podium's own faces, so floors can run across them
  const floors = (fill) => `<path d="M0 0H${f(2 * a)}L${f(a)} ${f(h)}Z" fill="${fill}"/><path d="M0 0H${f(2 * a)}L${f(a)} ${f(h)}Z" fill="url(#lm-floors)"/>`;
  g += poly([A(-a, a), T(-a, 0), T(0, a)], "url(#lm-g1)", facet); // left corner, inverted
  g += onFace(cx - a, cy + a, cx + a, cy + a, z0, floors("url(#lm-g2)")); // front-left
  g += poly([A(-a, a), A(a, a), T(0, a)], "none", facet);
  g += poly([A(a, a), T(0, a), T(a, 0)], "url(#lm-g3)", facet); // front corner, inverted
  g += onFace(cx + a, cy - a, cx + a, cy + a, z0, floors("url(#lm-g4)")); // front-right
  g += poly([A(a, a), A(a, -a), T(a, 0)], "none", facet);
  g += poly([A(a, -a), T(a, 0), T(0, -a)], "url(#lm-g5)", facet); // right corner, inverted
  g += poly([T(-a, 0), T(0, a), T(a, 0), T(0, -a)], "#eef3ff", EDGE);
  // parapet, communications ring and spire
  g += prism([[cx - 0.55, cy], [cx, cy + 0.55], [cx + 0.55, cy], [cx, cy - 0.55]], z1, z1 + 0.35, ["#f7f9ff", "#d5ddf2", "#aab6da"]);
  g += cyl(cx, cy, 0.26, z1 + 0.35, z1 + 0.9, "url(#lm-steelCyl)", "#f2f4fc");
  g += line(P(cx, cy, z1 + 0.9), P(cx, cy, z1 + 7), "#a3abd2", 1.8);
  g += line(P(cx, cy, z1 + 5.2), P(cx, cy, z1 + 7), "#f29bb7", 1.8);
  return g;
}

/* ---------- Big Ben (Elizabeth Tower) ---------- */

const SAND = ["#f8e9c8", "#ecd09b", "#d4ae6c"];
const SLATE = ["#76819f", "#5f6a8c", "#4a5476"];

function bigBen(x0, y0) {
  const x1 = x0 + 2;
  const y1 = y0 + 2;
  const cx = x0 + 1;
  const cy = y0 + 1;
  const wide = (d, z0, z1, col = SAND, win) => box(x0 - d, y0 - d, x1 + d, y1 + d, z0, z1, col, { win });
  let g = shadow(rect(x0, y0, x1, y1), 17);
  g += wide(0.15, 0, 0.6);
  g += wide(0, 0.6, 9.2, SAND, "lm-gothic");
  g += wide(0.12, 9.2, 9.45, ["#fff3d9", "#f1d9a8", "#dcb879"]);
  // clock stage, slightly proud, with a dial on each visible face
  g += wide(0.2, 9.45, 11.5, SAND, "lm-gothic");
  const dial = (u) =>
    `<rect x="${f(u - 0.95)}" y=".18" width="1.9" height="1.7" fill="#f4dfae"/>` +
    `<circle cx="${f(u)}" cy="1.03" r=".74" fill="${GOLD}"/>` +
    `<circle cx="${f(u)}" cy="1.03" r=".63" fill="#fffaf0"/>` +
    `<circle cx="${f(u)}" cy="1.03" r=".5" fill="none" stroke="rgba(60,50,80,.35)" stroke-width=".9" stroke-dasharray="1 2" ${NS}/>` +
    `<path d="M${f(u)} 1.03V1.5M${f(u)} 1.03L${f(u + 0.32)} .86" stroke="#2f2a48" stroke-width="1.4" stroke-linecap="round" ${NS}/>`;
  g += onFace(x0 - 0.2, y1 + 0.2, x1 + 0.2, y1 + 0.2, 9.45, dial(1.2));
  g += onFace(x1 + 0.2, y0 - 0.2, x1 + 0.2, y1 + 0.2, 9.45, dial(1.2));
  g += wide(0.28, 11.5, 11.75, ["#fff3d9", "#f1d9a8", "#dcb879"]);
  // belfry with louvred lancets
  g += wide(0.08, 11.75, 12.9);
  const lancets = pointedArch(0.72, 0.15, 0.42, 0.85) + pointedArch(1.44, 0.15, 0.42, 0.85);
  g += onFace(x0 - 0.08, y1 + 0.08, x1 + 0.08, y1 + 0.08, 11.75, `<path d="${lancets}" fill="#4a5476"/>`);
  g += onFace(x1 + 0.08, y0 - 0.08, x1 + 0.08, y1 + 0.08, 11.75, `<path d="${lancets}" fill="#3d4766"/>`);
  // corner pinnacles
  for (const [px, py] of [[x0 - 0.08, y1 + 0.08], [x1 + 0.08, y1 + 0.08], [x1 + 0.08, y0 - 0.08]]) {
    g += line(P(px, py, 12.9), P(px, py, 13.9), GOLD, 1.6);
  }
  // steep slate spire with gilded ribs and finial
  const apex = P(cx, cy, 16.6);
  const s0 = x0 - 0.05;
  const s1 = x1 + 0.05;
  g += poly([P(s0, y1 + 0.05, 12.9), P(s1, y1 + 0.05, 12.9), apex], SLATE[1], EDGE);
  g += poly([P(s1, y0 - 0.05, 12.9), P(s1, y1 + 0.05, 12.9), apex], SLATE[2], EDGE);
  g += line(P(s1, y1 + 0.05, 12.9), apex, GOLD, 1);
  for (const t of [0.35, 0.65]) {
    const z = 12.9 + (16.6 - 12.9) * t;
    const h = 1.05 * (1 - t);
    g += `<polyline points="${pts([P(cx - h, cy + h, z), P(cx + h, cy + h, z), P(cx + h, cy - h, z)])}" fill="none" stroke="${GOLD}" stroke-width=".9"/>`;
  }
  g += line(apex, P(cx, cy, 17.6), GOLD, 1.6);
  return g;
}

/* ---------- Taj Mahal ---------- */

const MARBLE = ["#fffaf7", "#f2e8ec", "#d9c9d5"];

function tajMahal(x0, y0) {
  const cx = x0 + 5.5;
  const cy = y0 + 5.5;
  let g = "";
  // red sandstone terrace, the reflecting pool, then the marble plinth
  g += box(x0, y0, x0 + 11, y0 + 11, 0, 0.45, ["#f3cdb5", "#e3a98b", "#cf8f78"]);
  g += box(cx - 0.55, y0 + 11, cx + 0.55, y0 + 13.4, 0, 0.12, ["#9cc3f2", "#e3a98b", "#cf8f78"], { edge: false });
  g += box(x0 + 1, y0 + 1, x0 + 10, y0 + 10, 0.45, 1.3, ["#fdf6f3", "#ece0e6", "#d4c4d1"]);
  const niches = (fill) => [1.5, 3, 4.5, 6, 7.5].map((u) => `<path d="${pointedArch(u, 0.12, 0.5, 0.6)}" fill="${fill}"/>`).join("");
  g += onFace(x0 + 1, y0 + 10, x0 + 10, y0 + 10, 0.45, niches("#d6c7d8"));
  g += onFace(x0 + 10, y0 + 1, x0 + 10, y0 + 10, 0.45, niches("#c5b4ca"));
  g += shadow(rect(cx - 3, cy - 3, cx + 3, cy + 3), 9, 1.3);

  const minaret = (mx, my) =>
    cyl(mx, my, 0.34, 1.3, 7.8, "url(#lm-marbleCyl)", null, 0.27) +
    ring(mx, my, 0.4, 3.4, "#fff", 1.6) + ring(mx, my, 0.4, 3.4, "rgba(150,130,165,.45)", 0.6) +
    ring(mx, my, 0.37, 5.6, "#fff", 1.6) + ring(mx, my, 0.37, 5.6, "rgba(150,130,165,.45)", 0.6) +
    cyl(mx, my, 0.4, 7.8, 8.05, "#f2e8ec", "#fffaf7") +
    cyl(mx, my, 0.24, 8.05, 8.5, "#e9dde5", null) +
    onion(mx, my, 0.33, 8.5, 0.75) +
    line(P(mx, my, 9.25), P(mx, my, 9.75), GOLD, 1.3);
  const m0 = x0 + 1.55;
  const m1 = x0 + 9.45;
  g += minaret(m0, y0 + 1.55);
  g += minaret(m1, y0 + 1.55);
  g += minaret(m0, y0 + 9.45);

  // octagonal mausoleum: a square with chamfered corners
  const a = 2.95;
  const c = 0.95;
  const oct = [
    [cx - a + c, cy - a], [cx + a - c, cy - a], [cx + a, cy - a + c], [cx + a, cy + a - c],
    [cx + a - c, cy + a], [cx - a + c, cy + a], [cx - a, cy + a - c], [cx - a, cy - a + c],
  ];
  const zb = 1.3;
  const zt = 5.1;
  const hh = zt - zb;
  g += prism(oct, zb, zt, MARBLE, {
    face: (p, q, z0) => {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const m = len / 2;
      if (len > 3) {
        // main face: raised pishtaq with a tall arched iwan, small arches either side
        const side =
          `<path d="${pointedArch(0.62, 0.2, 0.55, hh * 0.38)}${pointedArch(0.62, hh * 0.5, 0.55, hh * 0.36)}${pointedArch(len - 0.62, 0.2, 0.55, hh * 0.38)}${pointedArch(len - 0.62, hh * 0.5, 0.55, hh * 0.36)}" fill="#cdbdd2"/>`;
        return onFace(p[0], p[1], q[0], q[1], z0,
          side +
          `<rect x="${f(m - 1.15)}" y="0" width="2.3" height="${f(hh + 0.45)}" fill="#fffcfa" stroke="rgba(120,100,140,.35)" stroke-width=".8" ${NS}/>` +
          `<rect x="${f(m - 0.98)}" y="0" width="1.96" height="${f(hh + 0.3)}" fill="none" stroke="#e5d6e2" stroke-width="1.2" ${NS}/>` +
          `<path d="${pointedArch(m, 0, 1.3, hh * 0.86)}" fill="#c7b5cd"/>` +
          `<path d="${pointedArch(m, 0, 0.62, hh * 0.42)}" fill="#a796b3"/>`
        );
      }
      // chamfer: two stacked arched niches
      return onFace(p[0], p[1], q[0], q[1], z0,
        `<path d="${pointedArch(m, 0.2, len * 0.55, hh * 0.38)}${pointedArch(m, hh * 0.5, len * 0.55, hh * 0.36)}" fill="#bfadc6"/>`);
    },
  });

  // corner chhatris, drum and the onion dome with its gilded finial
  const chhatri = (hx, hy) =>
    cyl(hx, hy, 0.55, zt, zt + 0.55, "#f1e7ec", "#fffaf7") + onion(hx, hy, 0.6, zt + 0.55, 0.95);
  g += chhatri(cx - 1.9, cy - 1.9) + chhatri(cx + 1.9, cy - 1.9) + chhatri(cx - 1.9, cy + 1.9);
  g += cyl(cx, cy, 1.45, zt, zt + 1.25, "url(#lm-marbleCyl)", "#fffaf7");
  g += ring(cx, cy, 1.45, zt + 1.05, "rgba(150,130,165,.4)", 0.8);
  g += onion(cx, cy, 1.5, zt + 1.25, 4.4);
  const lotus = P(cx, cy, zt + 5.6);
  g += `<ellipse cx="${f(lotus[0])}" cy="${f(lotus[1])}" rx="4" ry="1.8" fill="#efe3ea"/>`;
  g += line(lotus, P(cx, cy, zt + 6.8), GOLD, 1.8);
  g += `<circle cx="${f(P(cx, cy, zt + 6.2)[0])}" cy="${f(P(cx, cy, zt + 6.2)[1])}" r="1.6" fill="${GOLD}"/>`;
  g += chhatri(cx + 1.9, cy + 1.9);
  g += minaret(m1, y0 + 9.45);
  return g;
}

// bulbous dome over a drum of radius r: swells past the drum, then draws to a point
function onion(cx, cy, r, z0, h) {
  const c = P(cx, cy, z0);
  const [rx, ry] = ellR(r);
  const t = h * KZ;
  return (
    `<path d="M${f(c[0] - rx * 0.86)} ${f(c[1])}C${f(c[0] - rx * 1.38)} ${f(c[1] - t * 0.36)} ${f(c[0] - rx * 0.98)} ${f(c[1] - t * 0.7)} ${f(c[0] - rx * 0.12)} ${f(c[1] - t * 0.9)}Q${f(c[0])} ${f(c[1] - t * 0.95)} ${f(c[0])} ${f(c[1] - t)}Q${f(c[0])} ${f(c[1] - t * 0.95)} ${f(c[0] + rx * 0.12)} ${f(c[1] - t * 0.9)}C${f(c[0] + rx * 0.98)} ${f(c[1] - t * 0.7)} ${f(c[0] + rx * 1.38)} ${f(c[1] - t * 0.36)} ${f(c[0] + rx * 0.86)} ${f(c[1])}A${f(rx * 0.86)} ${f(ry * 0.86)} 0 0 1 ${f(c[0] - rx * 0.86)} ${f(c[1])}Z" fill="url(#lm-dome)" ${EDGE}/>` +
    `<path d="M${f(c[0] - rx * 0.4)} ${f(c[1] - t * 0.42)}Q${f(c[0] - rx * 0.5)} ${f(c[1] - t * 0.75)} ${f(c[0] - rx * 0.12)} ${f(c[1] - t * 0.92)}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.4" stroke-linecap="round"/>`
  );
}

/* ---------- Leaning Tower of Pisa ---------- */

function pisa(cx, cy) {
  const r = 1.45;
  const base = P(cx, cy, 0);
  let g = cyl(cx, cy, r + 0.12, 0, 0.3, "url(#lm-marbleCyl)", "#fffaf5");
  g += cyl(cx, cy, r, 0.3, 3.2, "url(#lm-marbleCyl)", "#fffaf5");
  g += blindArcade(cx, cy, r, 0.5, 2.9, 11);
  let z = 3.2;
  for (let i = 0; i < 6; i++) {
    g += gallery(cx, cy, r, z, z + 1.85, 13);
    z += 1.85;
  }
  // belfry, narrower, with its own arcade
  g += gallery(cx, cy, r * 0.72, z, z + 1.75, 9);
  // the famous lean, pivoting on its foot
  const sh = shadow([[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]], 15);
  return sh + `<g transform="rotate(4.2 ${f(base[0])} ${f(base[1])})">${g}</g>`;
}

// open gallery: dark loggia wall behind a ring of columns and round arches
function gallery(cx, cy, r, z0, z1, n) {
  let g = cyl(cx, cy, r + 0.13, z0, z0 + 0.16, "#efe5ea", "#fffaf5");
  g += cyl(cx, cy, r * 0.84, z0 + 0.16, z1 - 0.3, "url(#lm-loggia)", null);
  const [rx, ry] = ellR(r);
  const lo = P(cx, cy, z0 + 0.16);
  const hi = P(cx, cy, z1 - 0.62);
  const cols = [];
  for (let i = 0; i <= n; i++) {
    const th = -Math.PI / 2 + (Math.PI * i) / n;
    cols.push({ dx: rx * Math.sin(th), dy: ry * Math.cos(th), w: 0.6 + 1.9 * Math.cos(th) });
  }
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i];
    const b = cols[i + 1];
    const ax = hi[0] + a.dx;
    const ay = hi[1] + a.dy;
    const bx = hi[0] + b.dx;
    const by = hi[1] + b.dy;
    const lift = (bx - ax) * 0.55 + 1.5;
    g += `<path d="M${f(ax)} ${f(ay)}Q${f((ax + bx) / 2)} ${f((ay + by) / 2 - lift)} ${f(bx)} ${f(by)}" fill="none" stroke="#fffaf5" stroke-width="1.5"/>`;
  }
  for (const c of cols) {
    g += line([lo[0] + c.dx, lo[1] + c.dy], [hi[0] + c.dx, hi[1] + c.dy], "#fffaf5", c.w);
  }
  // cornice band over the arches
  g += cyl(cx, cy, r, z1 - 0.3, z1, "url(#lm-marbleCyl)", "#fffaf5");
  return g;
}

function blindArcade(cx, cy, r, z0, z1, n) {
  const [rx, ry] = ellR(r);
  const lo = P(cx, cy, z0);
  const hi = P(cx, cy, z1 - 0.5);
  let g = "";
  for (let i = 0; i < n; i++) {
    const t0 = -Math.PI / 2 + (Math.PI * (i + 0.18)) / n;
    const t1 = -Math.PI / 2 + (Math.PI * (i + 0.82)) / n;
    const ax = hi[0] + rx * Math.sin(t0);
    const bx = hi[0] + rx * Math.sin(t1);
    const ay = hi[1] + ry * Math.cos(t0);
    const by = hi[1] + ry * Math.cos(t1);
    const lift = (bx - ax) * 0.55 + 1;
    g += `<path d="M${f(lo[0] + rx * Math.sin(t0))} ${f(lo[1] + ry * Math.cos(t0))}L${f(ax)} ${f(ay)}Q${f((ax + bx) / 2)} ${f((ay + by) / 2 - lift)} ${f(bx)} ${f(by)}L${f(lo[0] + rx * Math.sin(t1))} ${f(lo[1] + ry * Math.cos(t1))}" fill="rgba(160,140,175,.18)" stroke="rgba(150,130,165,.45)" stroke-width=".7"/>`;
  }
  return g;
}

/* ---------- Pyramids of Giza ---------- */

function pyramid(x0, y0, size, h) {
  const x1 = x0 + size;
  const y1 = y0 + size;
  const apex = P(x0 + size / 2, y0 + size / 2, h);
  let g = shadow(rect(x0, y0, x1, y1), h * 1.4);
  g += poly([P(x0, y1), P(x1, y1), apex], "url(#lm-sandL)", EDGE);
  g += poly([P(x1, y0), P(x1, y1), apex], "url(#lm-sandR)", EDGE);
  // stone courses
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    const lerp = (x, y) => P(x + (x0 + size / 2 - x) * t, y + (y0 + size / 2 - y) * t, h * t);
    g += `<polyline points="${pts([lerp(x0, y1), lerp(x1, y1), lerp(x1, y0)])}" fill="none" stroke="rgba(150,105,50,.22)" stroke-width=".8"/>`;
  }
  // capstone catching the light
  const t = 0.88;
  const lerp = (x, y) => P(x + (x0 + size / 2 - x) * t, y + (y0 + size / 2 - y) * t, h * t);
  g += poly([lerp(x0, y1), lerp(x1, y1), apex], "#fbe7b4") + poly([lerp(x1, y0), lerp(x1, y1), apex], "#ecc982");
  g += line(P(x1, y1), apex, "rgba(255,250,235,.7)", 0.9);
  return g;
}

/* ---------- small city pieces ---------- */

function block(x0, y0, x1, y1, h, col, win) {
  return shadow(rect(x0, y0, x1, y1), h) + box(x0, y0, x1, y1, 0, h, col, { win }) +
    box(x0 + 0.3, y0 + 0.3, x0 + 0.9, y0 + 0.9, h, h + 0.4, ["#f4f1f7", "#d9d3e2", "#c3bbd0"]);
}

function vehicle(x0, y0, len, col, cabin) {
  let g = box(x0, y0, x0 + len, y0 + 0.9, 0.12, 0.75, col, { edge: false });
  if (cabin) g += box(x0 + len * 0.25, y0 + 0.1, x0 + len * 0.75, y0 + 0.8, 0.75, 1.2, cabin, { edge: false });
  else g += onFace(x0, y0 + 0.9, x0 + len, y0 + 0.9, 0.12, `<rect x=".25" y=".32" width="${f(len - 0.5)}" height=".28" fill="url(#lm-bus)"/>`);
  return g;
}

// Traffic drives along the x axis from x = 0 to x = 40 and loops, fading in
// and out at the island's edge. Each car gets its own keyframes because the
// distance it travels depends on where it is drawn.
const drives = [];
function driving(svg, x0, len, { dir = 1, secs = 16, delay = 0 } = {}) {
  const id = `lm-drive${drives.length}`;
  // distance (in grid units) from the drawn position to each end of the road
  const back = dir > 0 ? x0 + len : 40 - x0;
  const ahead = dir > 0 ? 40 - x0 : x0 + len;
  const at = (u) => `translate(${f(u * dir * KX)}px,${f(u * dir * KY)}px)`;
  drives.push(
    `@keyframes ${id}{0%{transform:${at(-back)};opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:${at(ahead)};opacity:0}}` +
      `.${id}{animation:${id} ${secs}s linear ${-delay}s infinite}`
  );
  return `<g class="lm-anim ${id}">${svg}</g>`;
}

/* ---------- call-outs ---------- */

// label card; the dashed leader runs straight to the card's nearest edge
function callout(anchor, lx, ly, title, sub, align = "left") {
  const w = Math.max(title.length * 7.2 + 28, sub.length * 5.6 + 28);
  const h = 38;
  const x = align === "left" ? lx : lx - w;
  const tx = Math.min(Math.max(anchor[0], x), x + w);
  const ty = anchor[1] < ly ? ly : anchor[1] > ly + h ? ly + h : anchor[1];
  return (
    line(anchor, [tx, ty], "#241b4f", 1, `stroke-dasharray="2 3" opacity=".55"`) +
    `<circle cx="${f(anchor[0])}" cy="${f(anchor[1])}" r="3.4" fill="#d97f92" stroke="#fff" stroke-width="1.5"/>` +
    `<rect x="${f(x)}" y="${f(ly)}" width="${f(w)}" height="${h}" fill="#fff" opacity=".95"/>` +
    `<rect x="${f(x)}" y="${f(ly)}" width="3" height="${h}" fill="#d97f92"/>` +
    `<text x="${f(x + 13)}" y="${f(ly + 16)}" fill="#241b4f" style="font-family:var(--font-lexend-exa),sans-serif;font-size:8.5px;letter-spacing:.14em">${title}</text>` +
    `<text x="${f(x + 13)}" y="${f(ly + 30)}" fill="#5d5758" style="font-family:var(--font-newsreader),serif;font-size:12px">${sub}</text>`
  );
}

/* ---------- scene ---------- */

function motion() {
  // one dash cycle of the river current is 48 px, so it loops seamlessly
  return (
    drives.join("") +
    `@keyframes lm-flow{to{stroke-dashoffset:-48}}.lm-current{animation:lm-flow 2.6s linear infinite}.lm-current-slow{animation-duration:4.2s}` +
    `@keyframes lm-bob{0%,100%{transform:translate(0,0);opacity:.25}50%{transform:translate(${f(KX * 0.6)}px,${f(KY * 0.6)}px);opacity:.9}}` +
    `.lm-wave{animation:lm-bob 4s ease-in-out infinite}` +
    `@media (prefers-reduced-motion:reduce){.lm-anim{animation:none!important}}`
  );
}

export function landmarkIsland() {
  const vgrad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const hgrad = (id, stops) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  const defs =
    vgrad("lm-g1", "#e4edff", "#b9cdf5") +
    vgrad("lm-g2", "#c7d7fa", "#8eaae9") +
    vgrad("lm-g3", "#b3c8f5", "#7d99e0") +
    vgrad("lm-g4", "#8ea8e6", "#5e78c9") +
    vgrad("lm-g5", "#7088cf", "#4d64b2") +
    vgrad("lm-sandL", "#f8dea0", "#ecc47c") +
    vgrad("lm-sandR", "#e4b96e", "#c9984f") +
    vgrad("lm-water", "#8fbaf2", "#6c9be6") +
    hgrad("lm-dome", [[0, "#ffffff"], [0.5, "#f5edf1"], [1, "#cdbcd0"]]) +
    hgrad("lm-marbleCyl", [[0, "#fffcf9"], [0.55, "#f1e7ec"], [1, "#cbbbcf"]]) +
    hgrad("lm-stoneCyl", [[0, "#fbf6f2"], [0.55, "#ebe2e8"], [1, "#c9bccd"]]) +
    hgrad("lm-steelCyl", [[0, "#f4f6fd"], [0.6, "#cfd6ec"], [1, "#9aa4c8"]]) +
    hgrad("lm-loggia", [[0, "#d9cdd8"], [0.6, "#c2b3c6"], [1, "#9f8fab"]]) +
    `<pattern id="lm-win" width="1" height="1.2" patternUnits="userSpaceOnUse"><rect x=".25" y=".3" width=".5" height=".55" fill="rgba(100,104,171,.34)"/></pattern>` +
    `<pattern id="lm-esb" width=".42" height=".9" patternUnits="userSpaceOnUse"><rect x=".12" y=".18" width=".18" height=".62" fill="rgba(86,90,160,.3)"/></pattern>` +
    `<pattern id="lm-fins" width=".3" height="10" patternUnits="userSpaceOnUse"><rect x=".1" width=".1" height="10" fill="rgba(255,255,255,.55)"/></pattern>` +
    `<pattern id="lm-floors" width="10" height=".55" patternUnits="userSpaceOnUse"><rect y=".5" width="10" height=".05" fill="rgba(255,255,255,.4)"/></pattern>` +
    `<pattern id="lm-fin" width=".36" height="10" patternUnits="userSpaceOnUse"><rect x=".14" width=".08" height="10" fill="rgba(255,255,255,.75)"/></pattern>` +
    `<pattern id="lm-gothic" width=".34" height="1.15" patternUnits="userSpaceOnUse"><rect x=".12" y=".12" width=".1" height=".85" fill="rgba(150,110,50,.28)"/><rect y="1.05" width=".34" height=".05" fill="rgba(150,110,50,.2)"/></pattern>` +
    `<pattern id="lm-bus" width=".7" height="1" patternUnits="userSpaceOnUse"><rect x=".08" width=".52" height="1" fill="#3d3f7a"/></pattern>`;

  groundShadows = [];
  drives.length = 0;
  let base = "";
  // lake the island sits in
  base += box(-3, -3, 43, 43, -1.6, -0.9, ["url(#lm-water)", "#5a86d4", "#4a73c2"], { edge: false });
  for (let i = 0; i < 30; i++) {
    const x = -2.5 + ((i * 7.3) % 44);
    const y = -2.5 + ((i * 11.7) % 44);
    if (x > -0.5 && x < 40.5 && y > -0.5 && y < 40.5 && !(y > 17.4 && y < 20.6)) continue;
    base += line(P(x, y, -0.9), P(x + 1.4, y, -0.9), "rgba(255,255,255,.45)", 1.4, `class="lm-anim lm-wave" style="animation-delay:${-((i * 0.7) % 4).toFixed(1)}s"`);
  }
  // two banks with the river between them
  base += box(0, 0, 40, 17, -1.6, 0, LAND);
  base += box(0, 21, 40, 40, -1.6, 0, LAND);
  base += line(P(0, 18.2, -0.9), P(40, 18.2, -0.9), "rgba(255,255,255,.5)", 1.4, `class="lm-anim lm-current" stroke-dasharray="14 34"`);
  base += line(P(0, 19.5, -0.9), P(40, 19.5, -0.9), "rgba(255,255,255,.35)", 1.2, `class="lm-anim lm-current lm-current-slow" stroke-dasharray="8 40" stroke-dashoffset="20"`);
  // piazza, desert and lawns
  base += box(3.5, 25, 13.5, 34.5, 0, 0.06, ["#eef7f0", "#cfe8d6", "#cfe8d6"], { edge: false });
  base += box(24.8, 24.6, 39.6, 39.6, 0, 0.06, ["#f3e1b6", "#e8cf98", "#dcc088"], { edge: false });
  // roads
  const road = (x0, y0, x1, y1) => box(x0, y0, x1, y1, 0, 0.08, ["#e8e6ef", "#d3d0de", "#c6c2d4"], { edge: false });
  base += road(0, 13.8, 40, 15.8);
  base += road(0, 22.2, 40, 24.2);
  base += road(14.6, 24.2, 16.6, 40);
  for (let x = 1; x < 40; x += 2.6) base += line(P(x, 14.8, 0.09), P(x + 1.2, 14.8, 0.09), "#fff", 1.4);
  for (let x = 1; x < 40; x += 2.6) base += line(P(x, 23.2, 0.09), P(x + 1.2, 23.2, 0.09), "#fff", 1.4);
  for (let y = 25; y < 40; y += 2.6) base += line(P(15.6, y, 0.09), P(15.6, y + 1.2, 0.09), "#fff", 1.4);

  const items = [];
  const add = (key, svg) => items.push({ key, svg });

  // north bank
  add(12, oneWorldTrade(5.5, 6.5));
  add(19.5, empireState(10.6, 2.5));
  add(27, bigBen(21.6, 4.6));
  add(33.5, tajMahal(27.5, 0.2));
  [[2.5, 11.8], [9.5, 11.6], [19.5, 11.2], [24.5, 10.2], [1.4, 2.6], [1.8, 7.6], [25.8, 1.6], [20.2, 1.5]].forEach(([x, y], i) =>
    add(x + y, tree(x, y, 0.9 + (i % 3) * 0.15, i % 4 === 3))
  );
  const TAXI = [["#f7c64a", "#e0a92e", "#c98f1f"], ["#fff1c8", "#3d3f7a", "#34366b"]];
  const CAR = [["#f6b4c4", "#e38ea4", "#c97389"], ["#fff3f6", "#3d3f7a", "#34366b"]];
  const VAN = [["#ffffff", "#e3e0ec", "#c9c4d8"], ["#f4f2f8", "#3d3f7a", "#34366b"]];
  // north road: taxi heading east (screen right-down), a car heading west
  add(36.9, driving(vehicle(20.5, 14.1, 1.8, ...TAXI), 20.5, 1.8, { secs: 15, delay: 6 }));
  add(36.95, driving(vehicle(8, 14.95, 1.7, ...CAR), 8, 1.7, { dir: -1, secs: 19, delay: 3 }));
  // bridge over the river
  add(41, box(22, 15.8, 24.6, 22.2, 0, 0.7, ["#f1edf5", "#d8d1e2", "#c4bcd4"]) +
    line(P(22, 15.8, 1.4), P(22, 22.2, 1.4), "#d97f92", 1.6) + line(P(24.6, 15.8, 1.4), P(24.6, 22.2, 1.4), "#d97f92", 1.6) +
    [17, 19, 20.8].map((y) => line(P(22, y, 0.7), P(22, y, 1.4), "#d97f92", 1.4) + line(P(24.6, y, 0.7), P(24.6, y, 1.4), "#d97f92", 1.4)).join(""));

  // south bank
  add(44, pisa(8.5, 29.5));
  add(46, block(17.8, 26, 20.8, 29, 4.2, ["#fdf8f6", "#ece4ee", "#d4c8de"], "lm-win"));
  add(50, block(21.4, 25.6, 23.6, 28.2, 6.4, ["#fdf8f6", "#ece4ee", "#d4c8de"], "lm-win"));
  add(53, block(18, 30.4, 22.4, 33, 2.6, ["#ffe2cf", "#f6b29a", "#e08d8a"], "lm-win"));
  add(56, pyramid(31.2, 25.4, 6, 6.6));
  add(63, pyramid(25.8, 30.6, 7.2, 8));
  add(71, pyramid(35, 34, 3.4, 3.7));
  [[4.5, 36.2], [8, 37.4], [11.8, 36], [2.6, 27], [19.5, 36.5], [23, 38.2], [12.4, 25.8], [5, 33]].forEach(([x, y], i) =>
    add(x + y + 0.5, tree(x, y, 0.85 + (i % 3) * 0.12, i % 4 === 1))
  );
  // south road: bus heading west, a van heading east; drawn after the bridge, before Pisa
  add(42, driving(vehicle(3.5, 23.25, 4, ["#6cc28a", "#4cae6e", "#3f9a5e"]), 3.5, 4, { dir: -1, secs: 26, delay: 18 }));
  add(42.1, driving(vehicle(30, 22.4, 1.9, ...VAN), 30, 1.9, { secs: 17, delay: 2 }));

  items.sort((a, b) => a.key - b.key);
  const buildings = items.map((i) => i.svg).join("");
  const shadows = groundShadows.join("");
  groundShadows = null;

  const sky = cloud(300, 250, 0.85) + cloud(900, 110, 0.8) + cloud(985, 320, 0.6) + cloud(240, 96, 0.55);
  const pisaTop = P(8.5, 29.5, 16.4);
  const labels =
    callout(P(5.5, 6.5, 35.6), 490, 36, "ONE WORLD TRADE CENTER", "New York · 2014", "right") +
    callout(P(14.1, 5.25, 26.4), 640, 140, "EMPIRE STATE BUILDING", "New York · 1931") +
    callout(P(22.6, 5.6, 17.6), 760, 250, "BIG BEN", "London · 1859") +
    callout(P(33, 5.7, 11.9), 1080, 400, "TAJ MAHAL", "Agra · 1653", "right") +
    callout([pisaTop[0] + 13, pisaTop[1] + 1], 250, 420, "LEANING TOWER OF PISA", "Pisa · 1372", "right") +
    callout(P(29.4, 34.2, 8), 420, 640, "GREAT PYRAMID OF GIZA", "Giza · c. 2560 BC", "right");

  return (
    `<svg viewBox="${VX} 0 ${W} ${H}" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Isometric illustration of famous landmarks on an island">` +
    `<defs>${defs}</defs><style>${motion()}</style>${sky}${base}${shadows}${buildings}${labels}</svg>`
  );
}
