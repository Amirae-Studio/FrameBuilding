(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const OUT = "#241b4f";
  const f = n => +n.toFixed(1);

  /* ---------- data ---------- */
  const COLORS = { ink: "#2f2a55", cream: "#f3e6e3", rose: "#d97f92", violet: "#6468ab", walnut: "#7a4b3c", marble: "#e4e1ee" };
  const SHAPES = { square: "Square", round: "Round", octagon: "Octagon", slanted: "Slanted" };
  const PRESETS = [
    { id: "round", name: "Round pedestal", c: "#d5738b", bases: [{ shape: "round", h: 6, m: 3, color: "cream" }, { shape: "round", h: 14, m: 7, color: "violet" }] },
    { id: "plinth", name: "Museum plinth", c: "#8894e0", bases: [{ shape: "square", h: 4, m: 3, color: "cream" }, { shape: "square", h: 22, m: 5, color: "ink" }] },
    { id: "slanted", name: "Slanted plaque", c: "#8b84cc", bases: [{ shape: "slanted", h: 12, m: 4, color: "ink" }] },
    { id: "octagon", name: "Octagon", c: "#8b84cc", bases: [{ shape: "octagon", h: 10, m: 7, color: "violet" }] },
    { id: "stepped", name: "Stepped tiers", c: "#d5738b", bases: [{ shape: "square", h: 4, m: 3, color: "cream" }, { shape: "square", h: 4, m: 5, color: "rose" }, { shape: "square", h: 4, m: 5, color: "violet" }] },
    { id: "slab", name: "Simple slab", c: "#8894e0", bases: [{ shape: "square", h: 5, m: 6, color: "ink" }] },
  ];
  const PALETTES = {
    sunset: { name: "Sunset", note: "Warm glass", sideTop: ["#9a5ad0", "#ffc69a"], sideBot: ["#3f2f9e", "#e0789c"], top: ["#f0a088", "#ffe4bd"], line: "rgba(255,240,228,.32)", edge: "rgba(36,27,79,.25)" },
    periwinkle: { name: "Periwinkle", note: "Cool stone", sideTop: ["#5a5ec9", "#d4d6ff"], sideBot: ["#34358a", "#9a9ef0"], top: ["#a9abff", "#eef0ff"], line: "rgba(255,255,255,.3)", edge: "rgba(36,27,79,.3)" },
    paper: { name: "Paper", note: "Architect's white", sideTop: ["#b9b3c6", "#ffffff"], sideBot: ["#8a839e", "#efecf4"], top: ["#e4e1ea", "#ffffff"], line: "rgba(36,27,79,.18)", edge: "rgba(36,27,79,.45)" },
    rose: { name: "Rose", note: "Terracotta", sideTop: ["#9c3a62", "#ffc2cf"], sideBot: ["#4e2a7a", "#e0708f"], top: ["#e98aa0", "#ffe0e6"], line: "rgba(255,235,240,.3)", edge: "rgba(36,27,79,.28)" },
  };
  const SCALES = [{ label: "1 : 3000", s: .6 }, { label: "1 : 2500", s: .8 }, { label: "1 : 2000", s: 1 }, { label: "1 : 1600", s: 1.25 }, { label: "1 : 1200", s: 1.6 }];
  const MATERIAL = { PLA: { d: 1.24, speed: 1 }, PETG: { d: 1.27, speed: .85 }, Resin: { d: 1.12, speed: 1.4 } };

  let uid = 0;
  const mkBase = b => ({ id: ++uid, ...b });
  const state = {
    baseOn: true, preset: "plinth",
    bases: PRESETS[1].bases.map(mkBase),
    texts: [],
    theta: -0.62, phi: 0.52, zoom: 1, panX: 0, panY: 0,
    scaleIdx: 2, exag: 1, detail: 2, spire: true, palette: "sunset", stage: "dark",
    material: "PLA", layer: 0.16, infill: 15,
    openBase: null, hoverBase: null, dropBase: null, panelOpen: true, tab: "base", grow: 0,
  };
  state.texts = [
    { id: ++uid, text: "70 Pine Street", baseId: state.bases[1].id, angle: -Math.PI / 2 },
    { id: ++uid, text: "New York · 1932", baseId: null, angle: -Math.PI / 2 },
  ];

  /* ---------- colour helpers ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const lum = h => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* ---------- geometry (millimetres) ---------- */
  const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  const circle = (r, n = 48) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const octagon = (w, d) => { const c = Math.min(w, d) * .29; return [[-w / 2 + c, -d / 2], [w / 2 - c, -d / 2], [w / 2, -d / 2 + c], [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c], [-w / 2, -d / 2 + c]]; };
  const bounds = p => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return { w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) }; };
  const area = p => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  function buildScene() {
    const S = SCALES[state.scaleIdx].s, E = state.exag;
    // model tiers: [w, d, h, topW, topD, kind]
    const tiers = [[52, 46, 14], [40, 34, 92], [34, 28, 22], [28, 22, 16], [20, 16, 12]];
    if (state.spire) tiers.push([14, 12, 10, 8, 7, "crown"], [6, 6, 8], [3, 3, 22, .3, .3, "spire"]);
    const foot = { w: 52 * S, d: 46 * S };

    // bases, listed top to bottom
    const bases = [];
    if (state.baseOn) {
      let cur = { ...foot };
      state.bases.forEach(b => {
        const w = cur.w + 2 * b.m * S, d = cur.d + 2 * b.m * S, h = b.h * S;
        let top, bottom;
        if (b.shape === "round") { top = bottom = circle(Math.max(w, d) / 2 * 1.04); }
        else if (b.shape === "octagon") { top = bottom = octagon(w * 1.06, d * 1.06); }
        else if (b.shape === "slanted") { top = rect(w, d); bottom = rect(w + 1.8 * h, d + 1.8 * h); }
        else { top = bottom = rect(w, d); }
        bases.push({ base: b, top, bottom, h });
        cur = bounds(bottom);
      });
    }
    const solids = [];
    let z = 0;
    for (let i = bases.length - 1; i >= 0; i--) {
      const b = bases[i];
      solids.push({ kind: "base", base: b.base, bottom: b.bottom, top: b.top, z0: z, z1: z + b.h });
      z += b.h;
    }
    const modelZ = z;
    tiers.forEach(t => {
      const [w, d, h, tw = w, td = d, kind = "tier"] = t;
      const hh = h * S * (kind === "spire" ? 1 : E);
      solids.push({ kind: "model", tier: kind, bottom: rect(w * S, d * S), top: rect(tw * S, td * S), z0: z, z1: z + hh });
      z += hh;
    });
    const footprint = bases.length ? bounds(bases[bases.length - 1].bottom) : foot;
    return { solids, height: z, modelZ, footprint };
  }

  /* ---------- projection ---------- */
  const stage = $("#stage"), svg = $("#scene");
  let scene = buildScene(), hits = [], view = null;

  function viewLeft() {
    if (innerWidth <= 760) return 0;
    return state.panelOpen ? 112 + 384 + 20 : 112;
  }
  function makeView(W, H) {
    const th = state.theta, ph = state.phi, c = Math.cos(th), s = Math.sin(th), sp = Math.sin(ph), cp = Math.cos(ph);
    const R = Math.hypot(scene.footprint.w, scene.footprint.d) / 2;
    const left = viewLeft(), avail = W - left;
    const fit = Math.min((H * .66) / (scene.height * cp + 2 * R * sp), (avail * .52) / (2 * R));
    const k = fit * state.zoom;
    const cx = left + avail / 2 + state.panX;
    const cy = H * .56 + (scene.height * k * cp - R * k * sp) / 2 + state.panY;
    const P = (x, y, z) => { const xr = x * c + y * s, yr = x * s - y * c; return [cx + xr * k, cy + yr * k * sp - z * k * cp]; };
    const V = n => (n[0] * s - n[1] * c) * cp + n[2] * sp;           // normal · direction to camera
    // light sits up and to the front-left of the camera
    const Lc = norm([-.55, .5, .75]);
    const L = [Lc[0] * c + Lc[1] * s, Lc[0] * s - Lc[1] * c, Lc[2]];
    stage.style.setProperty("--view-x", (left + avail / 2) + "px");
    return { P, V, L, k, cx, cy, sp, cp, c, s, R };
  }

  function faces(sol, v, g) {
    const n = sol.bottom.length, out = [];
    const z0 = sol.z0 * g, z1 = sol.z1 * g;
    for (let i = 0; i < n; i++) {
      const b0 = sol.bottom[i], b1 = sol.bottom[(i + 1) % n], t0 = sol.top[i], t1 = sol.top[(i + 1) % n];
      const A = [b0[0], b0[1], z0], B = [b1[0], b1[1], z0], C = [t1[0], t1[1], z1], D = [t0[0], t0[1], z1];
      const nn = norm(cross(sub(B, A), sub(D, A)));
      if (v.V(nn) > 0.002) out.push({ q: [A, B, C, D], n: nn, i });
    }
    out.push({ q: sol.top.map(p => [p[0], p[1], z1]), n: [0, 0, 1], top: true });
    return out;
  }
  const ptsStr = (arr, P) => arr.map(p => { const s = P(...p); return f(s[0]) + "," + f(s[1]); }).join(" ");

  /* ---------- render ---------- */
  function render() {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const v = view = makeView(W, H), P = v.P, g = state.grow;
    const pal = PALETTES[state.palette], light = state.stage === "light";
    let defs = `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`;
    let out = "", gid = 0;
    hits = [];
    const I = n => .3 + .7 * Math.max(0, dot(n, v.L));

    // ground plate with grid
    const half = Math.max(v.R * 1.55, 90);
    const plate = { bottom: rect(half * 2, half * 2), top: rect(half * 2, half * 2), z0: -4, z1: 0 };
    const pTop = light ? "#e6e4ef" : "#555a9f", pSide = light ? "#cfcce0" : "#3e4286", grid = light ? "rgba(60,50,90,.1)" : "rgba(255,255,255,.1)";
    faces(plate, v, 1).forEach(fc => { out += `<polygon points="${ptsStr(fc.q, P)}" fill="${fc.top ? pTop : mix(pSide, light ? "#ffffff" : "#5a5fa8", I(fc.n) * .4)}"/>`; });
    for (let x = -half + 15; x < half; x += 15) {
      const a = P(x, -half, 0), b = P(x, half, 0), c2 = P(-half, x, 0), d = P(half, x, 0);
      out += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${grid}"/><line x1="${f(c2[0])}" y1="${f(c2[1])}" x2="${f(d[0])}" y2="${f(d[1])}" stroke="${grid}"/>`;
    }
    // soft contact shadow
    const lowest = scene.solids[0];
    if (lowest && g > 0) out += `<polygon points="${ptsStr(lowest.bottom.map(p => [p[0] + 4, p[1] + 6, 0]), P)}" fill="${light ? "rgba(40,30,80,.25)" : "rgba(20,15,60,.45)"}" filter="url(#soft)"/>`;

    scene.solids.forEach(sol => {
      const fs = faces(sol, v, g);
      if (sol.kind === "base") {
        const col = COLORS[sol.base.color], hl = state.hoverBase === sol.base.id || state.dropBase === sol.base.id;
        const stroke = hl ? `stroke="${"#f29bb7"}" stroke-width="2.4"` : `stroke="rgba(36,27,79,.25)" stroke-width=".7"`;
        fs.forEach(fc => {
          const fill = fc.top ? mix(col, "#ffffff", .1 + .15 * I(fc.n)) : mix(mix(col, "#120c30", .55), col, I(fc.n));
          out += `<polygon points="${ptsStr(fc.q, P)}" fill="${fill}" ${stroke} stroke-linejoin="round"/>`;
          if (!fc.top) hits.push({ baseId: sol.base.id, angle: Math.atan2(fc.n[1], fc.n[0]), poly: fc.q.map(p => P(...p)) });
        });
        out += baseTexts(sol, v, g);
      } else {
        fs.forEach(fc => {
          const i = I(fc.n);
          const scr = fc.q.map(p => P(...p));
          if (fc.top) {
            out += `<polygon points="${scr.map(p => f(p[0]) + "," + f(p[1])).join(" ")}" fill="${mix(pal.top[0], pal.top[1], i)}" stroke="${pal.edge}" stroke-width=".7"/>`;
            return;
          }
          const ys = scr.map(p => p[1]), id = "g" + (gid++);
          defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(Math.min(...ys))}" x2="0" y2="${f(Math.max(...ys))}"><stop offset="0" stop-color="${mix(pal.sideTop[0], pal.sideTop[1], i)}"/><stop offset="1" stop-color="${mix(pal.sideBot[0], pal.sideBot[1], i)}"/></linearGradient>`;
          out += `<polygon points="${scr.map(p => f(p[0]) + "," + f(p[1])).join(" ")}" fill="url(#${id})" stroke="${pal.edge}" stroke-width=".7" stroke-linejoin="round"/>`;
          // facade piers and spandrels
          if (sol.tier === "tier") {
            const [A, B, C, D] = fc.q, wmm = Math.hypot(B[0] - A[0], B[1] - A[1]);
            const n = Math.max(2, Math.round(wmm / [7, 4.5, 2.8][state.detail]));
            for (let j = 1; j < n; j++) {
              const a = P(...lerp3(A, B, j / n)), b = P(...lerp3(D, C, j / n));
              out += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${pal.line}" stroke-width="${state.detail === 2 ? .9 : 1.3}"/>`;
            }
            if (state.detail > 0) {
              const hmm = (sol.z1 - sol.z0) * g, step = state.detail === 2 ? 5 : 9;
              for (let zz = step; zz < hmm - 1; zz += step) {
                const t = zz / hmm, a = P(...lerp3(A, D, t)), b = P(...lerp3(B, C, t));
                out += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${pal.line}" stroke-width=".5" opacity=".6"/>`;
              }
            }
          }
          // highlight top edge
          const a = scr[3], b = scr[2];
          out += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="rgba(255,240,225,.55)" stroke-width=".8"/>`;
        });
      }
    });
    svg.innerHTML = `<defs>${defs}</defs>${out}`;
    renderGizmo(v);
  }

  // texts engraved on the side facet of a base that faces their stored angle
  function baseTexts(sol, v, g) {
    let s = "";
    const mine = state.texts.filter(t => t.baseId === sol.base.id);
    const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < .6;
    mine.forEach(t => {
      // texts sharing a side stack into lines instead of overlapping
      const group = mine.filter(o => near(o.angle, t.angle)), slot = group.indexOf(t), lines = group.length;
      let A, B, C, D, nrm;
      const z0 = sol.z0 * g, z1 = sol.z1 * g;
      if (sol.base.shape === "round") {
        const r = Math.hypot(...sol.bottom[0]), w = .42;
        const p0 = [Math.cos(t.angle - w) * r, Math.sin(t.angle - w) * r], p1 = [Math.cos(t.angle + w) * r, Math.sin(t.angle + w) * r];
        A = [...p0, z0]; B = [...p1, z0]; C = [...p1, z1]; D = [...p0, z1];
        nrm = [Math.cos(t.angle), Math.sin(t.angle), 0];
      } else {
        const n = sol.bottom.length;
        let best = 0, bd = 9;
        for (let i = 0; i < n; i++) {
          const b0 = sol.bottom[i], b1 = sol.bottom[(i + 1) % n], a = Math.atan2(-(b1[0] - b0[0]), b1[1] - b0[1]);
          const d = Math.abs(Math.atan2(Math.sin(a - t.angle), Math.cos(a - t.angle)));
          if (d < bd) { bd = d; best = i; }
        }
        const b0 = sol.bottom[best], b1 = sol.bottom[(best + 1) % n], t0 = sol.top[best], t1 = sol.top[(best + 1) % n];
        A = [b0[0], b0[1], z0]; B = [b1[0], b1[1], z0]; C = [t1[0], t1[1], z1]; D = [t0[0], t0[1], z1];
        nrm = norm(cross(sub(B, A), sub(D, A)));
      }
      if (v.V(nrm) < .05) return;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), h = z1 - z0;
      if (h < .5) return;
      const TL = v.P(...D), TR = v.P(...C), BL = v.P(...A);
      const a = [(TR[0] - TL[0]) / L, (TR[1] - TL[1]) / L], b = [(BL[0] - TL[0]) / h, (BL[1] - TL[1]) / h];
      const fs = Math.min(h * .42 / Math.max(1, lines * .8), L * 1.2 / Math.max(6, t.text.length));
      const ink = lum(COLORS[sol.base.color]) > .6 ? "#2f2a55" : "#f6eaea";
      const cy = h * (slot + .5) / lines;
      s += `<g transform="matrix(${a[0].toFixed(4)},${a[1].toFixed(4)},${b[0].toFixed(4)},${b[1].toFixed(4)},${f(TL[0])},${f(TL[1])})">
        <text x="${(L / 2).toFixed(2)}" y="${(cy + fs * .36).toFixed(2)}" font-size="${fs.toFixed(2)}" text-anchor="middle" font-family="Lexend Exa, sans-serif" letter-spacing="${(fs * .12).toFixed(2)}" fill="${ink}" opacity=".92">${esc(t.text.toUpperCase())}</text></g>`;
    });
    return s;
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderGizmo(v) {
    const L = 26, c0 = [42, 46];
    const axes = [
      { n: "X", d: [v.c, v.s * v.sp], depth: v.s, col: "#f29bb7" },
      { n: "Y", d: [v.s, -v.c * v.sp], depth: -v.c, col: "#a3a6f5" },
      { n: "Z", d: [0, -v.cp], depth: -1, col: "#f6eaea" },
    ].sort((a, b) => a.depth - b.depth);
    const ink = state.stage === "light" ? "#4a4344" : "rgba(255,255,255,.35)";
    let g = `<circle cx="${c0[0]}" cy="${c0[1]}" r="30" fill="none" stroke="${ink}" stroke-dasharray="2 4"/>`;
    axes.forEach(a => {
      const x = c0[0] + a.d[0] * L, y = c0[1] + a.d[1] * L;
      const col = state.stage === "light" && a.n === "Z" ? "#4a4344" : a.col;
      g += `<line x1="${c0[0]}" y1="${c0[1]}" x2="${f(x)}" y2="${f(y)}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="${f(x)}" cy="${f(y)}" r="7.5" fill="${col}" stroke="${OUT}" stroke-width="1.4"/>
        <text x="${f(x)}" y="${f(y + 3)}" font-size="8" text-anchor="middle" font-family="Lexend Exa, sans-serif" fill="${OUT}">${a.n}</text>`;
    });
    $("#gizmoSvg").innerHTML = g + `<circle cx="${c0[0]}" cy="${c0[1]}" r="2.5" fill="${ink}"/>`;
  }

  /* ---------- preset thumbnails ---------- */
  function presetThumb(p) {
    const c = Math.cos(-.62), s = Math.sin(-.62), sp = .5, cp = .866;
    let sols = [], cur = { w: 16, d: 14 }, z = 0;
    const list = p.bases.map(b => {
      const w = cur.w + 2 * b.m * .9, d = cur.d + 2 * b.m * .9, h = b.h * .9;
      let top, bottom;
      if (b.shape === "round") top = bottom = circle(Math.max(w, d) / 2 * 1.04, 32);
      else if (b.shape === "octagon") top = bottom = octagon(w * 1.06, d * 1.06);
      else if (b.shape === "slanted") { top = rect(w, d); bottom = rect(w + 1.8 * h, d + 1.8 * h); }
      else top = bottom = rect(w, d);
      cur = bounds(bottom);
      return { top, bottom, h, color: b.color };
    });
    for (let i = list.length - 1; i >= 0; i--) { sols.push({ ...list[i], z0: z, z1: z + list[i].h }); z += list[i].h; }
    sols.push({ top: rect(12, 10), bottom: rect(12, 10), z0: z, z1: z + 16, model: true });
    const P = (x, y, zz) => { const xr = x * c + y * s, yr = x * s - y * c; return [50 + xr * 1.15, 52 + yr * 1.15 * sp - zz * 1.15 * cp]; };
    const v = { V: n => (n[0] * s - n[1] * c) * cp + n[2] * sp };
    let g = "";
    sols.forEach(sol => {
      faces(sol, v, 1).forEach(fc => {
        const fill = sol.model ? (fc.top ? "#f6eaea" : "#d9cfe6") : (fc.top ? "#fff8f4" : (fc.n[0] * s - fc.n[1] * c > .3 ? "#f3e6e3" : "#ddd0dc"));
        g += `<polygon points="${ptsStr(fc.q, P)}" fill="${fill}" stroke="${OUT}" stroke-width="1.1" stroke-linejoin="round"/>`;
      });
    });
    return `<svg viewBox="0 0 100 66">${g}</svg>`;
  }

  /* ---------- panel: base ---------- */
  const ICON = {
    up: `<svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>`,
    down: `<svg viewBox="0 0 24 24"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>`,
    del: `<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>`,
  };
  function renderPresets() {
    $("#presets").innerHTML = PRESETS.map((p, i) =>
      `<button class="preset ${state.preset === p.id ? "on" : ""}" data-id="${p.id}" style="--c:${p.c}"><span class="n">0${i + 1}</span>${presetThumb(p)}<span>${p.name}</span></button>`).join("");
    const cur = PRESETS.find(p => p.id === state.preset);
    $("#presetMeta").textContent = cur ? cur.name : "Custom";
  }
  const baseMeta = b => `${SHAPES[b.shape]} · ${b.h} mm · +${b.m}`;
  function renderBases() {
    const n = state.bases.length;
    $("#bases").innerHTML = state.bases.map((b, i) => `
      <div class="base-row ${state.openBase === b.id ? "open" : ""}" data-id="${b.id}">
        <div class="base-main">
          <span class="swatch" style="background:${COLORS[b.color]}"></span>
          <div class="base-info"><strong>Base ${i + 1}</strong>${i === 0 ? "<em>Top</em>" : i === n - 1 ? "<em>Bottom</em>" : ""}<small>${baseMeta(b)}</small></div>
          <div class="base-actions">
            <button data-act="up" aria-label="Move up" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
            <button data-act="down" aria-label="Move down" ${i === n - 1 ? "disabled" : ""}>${ICON.down}</button>
            <button data-act="del" aria-label="Delete base" ${n === 1 ? "disabled" : ""}>${ICON.del}</button>
          </div>
        </div>
        <div class="base-edit"><div>
          <div class="ctl"><span class="ctl-label">Shape</span><div class="seg small">${Object.entries(SHAPES).map(([k, l]) => `<button data-shape="${k}" class="${b.shape === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
          <label class="ctl"><span class="ctl-label">Height <b>${b.h} mm</b></span><input type="range" min="2" max="30" value="${b.h}" data-k="h"></label>
          <label class="ctl"><span class="ctl-label">Margin <b>${b.m} mm</b></span><input type="range" min="0" max="20" value="${b.m}" data-k="m"></label>
          <div class="ctl"><span class="ctl-label">Finish</span><div class="swatches">${Object.entries(COLORS).map(([k, c]) => `<button data-color="${k}" class="${b.color === k ? "on" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div></div>
        </div></div>
      </div>`).join("");
    $$("#bases input[type=range]").forEach(paintRange);
    $("#addBase").disabled = n >= 5;
  }
  function renderTexts() {
    $("#texts").innerHTML = state.texts.map(t => {
      const idx = state.bases.findIndex(b => b.id === t.baseId);
      const placed = idx >= 0 && state.baseOn;
      return `<span class="chip ${placed ? "placed" : ""}" draggable="true" data-id="${t.id}"><i></i><span class="t">${esc(t.text)}</span><small>${placed ? "Base " + (idx + 1) : "Unplaced"}</small><button aria-label="Remove text">&times;</button></span>`;
    }).join("");
  }
  function paintRange(r) { r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); }

  function changed({ bases = false, texts = false, presets = false } = {}) {
    scene = buildScene();
    if (presets) renderPresets();
    if (bases) renderBases();
    if (texts || bases) renderTexts();
    renderStats();
    render();
  }
  const markCustom = () => { if (state.preset) { state.preset = null; renderPresets(); } };

  $("#presets").addEventListener("click", e => {
    const btn = e.target.closest(".preset"); if (!btn) return;
    const p = PRESETS.find(x => x.id === btn.dataset.id);
    const oldIdx = new Map(state.texts.map(t => [t.id, state.bases.findIndex(b => b.id === t.baseId)]));
    state.preset = p.id;
    state.bases = p.bases.map(mkBase);
    state.texts.forEach(t => { const i = oldIdx.get(t.id); t.baseId = i >= 0 ? state.bases[Math.min(i, state.bases.length - 1)].id : null; });
    state.openBase = null;
    changed({ bases: true, presets: true });
  });
  $("#bases").addEventListener("click", e => {
    const row = e.target.closest(".base-row"); if (!row) return;
    const id = +row.dataset.id, i = state.bases.findIndex(b => b.id === id), b = state.bases[i];
    const act = e.target.closest("[data-act]"), shape = e.target.closest("[data-shape]"), color = e.target.closest("[data-color]");
    if (act) {
      const a = act.dataset.act;
      if (a === "up" || a === "down") { const j = a === "up" ? i - 1 : i + 1; [state.bases[i], state.bases[j]] = [state.bases[j], state.bases[i]]; }
      if (a === "del") { state.bases.splice(i, 1); state.texts.forEach(t => { if (t.baseId === id) t.baseId = null; }); }
      markCustom(); changed({ bases: true });
    } else if (shape) { b.shape = shape.dataset.shape; markCustom(); changed({ bases: true }); }
    else if (color) { b.color = color.dataset.color; markCustom(); changed({ bases: true }); }
    else if (e.target.closest(".base-main")) { state.openBase = state.openBase === id ? null : id; row.classList.toggle("open", state.openBase === id); $$(".base-row").forEach(r => { if (r !== row) r.classList.remove("open"); }); }
  });
  $("#bases").addEventListener("input", e => {
    const r = e.target; if (r.type !== "range") return;
    const row = r.closest(".base-row"), b = state.bases.find(x => x.id === +row.dataset.id);
    b[r.dataset.k] = +r.value;
    paintRange(r);
    r.parentElement.querySelector("b").textContent = r.value + " mm";
    row.querySelector(".base-info small").textContent = baseMeta(b);
    markCustom(); changed();
  });
  $("#bases").addEventListener("pointerover", e => { const row = e.target.closest(".base-row"); const id = row ? +row.dataset.id : null; if (id !== state.hoverBase) { state.hoverBase = id; render(); } });
  $("#bases").addEventListener("pointerleave", () => { state.hoverBase = null; render(); });
  $("#addBase").addEventListener("click", () => {
    const b = mkBase({ shape: "square", h: 5, m: 5, color: "violet" });
    state.bases.push(b); state.openBase = b.id;
    markCustom(); changed({ bases: true });
  });
  $$("#baseToggle button").forEach(btn => btn.addEventListener("click", () => {
    state.baseOn = btn.dataset.v === "on";
    $$("#baseToggle button").forEach(x => x.classList.toggle("on", x === btn));
    $('[data-pane="base"]').classList.toggle("base-off", !state.baseOn);
    changed({ texts: true });
  }));

  /* ---------- texts: edit + drag onto bases ---------- */
  const textsEl = $("#texts");
  textsEl.addEventListener("click", e => {
    if (!e.target.closest("button")) return;
    const id = +e.target.closest(".chip").dataset.id;
    state.texts = state.texts.filter(t => t.id !== id);
    changed({ texts: true });
  });
  textsEl.addEventListener("dblclick", e => {
    const span = e.target.closest(".t"); if (!span) return;
    editChip(span);
  });
  function editChip(span) {
    const chip = span.closest(".chip");
    chip.draggable = false;
    span.contentEditable = "true"; span.focus();
    document.getSelection().selectAllChildren(span);
    const done = () => {
      span.contentEditable = "false"; chip.draggable = true;
      const t = state.texts.find(x => x.id === +chip.dataset.id);
      t.text = span.textContent.trim().slice(0, 40) || t.text;
      changed({ texts: true });
    };
    span.addEventListener("blur", done, { once: true });
    span.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); span.blur(); } });
  }
  $("#addText").addEventListener("click", () => {
    const t = { id: ++uid, text: "Your text", baseId: null, angle: -Math.PI / 2 };
    state.texts.push(t);
    renderTexts();
    editChip($(`.chip[data-id="${t.id}"] .t`));
  });
  let dragText = null;
  textsEl.addEventListener("dragstart", e => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    dragText = +chip.dataset.id; chip.classList.add("dragging");
    e.dataTransfer.setData("text/plain", String(dragText)); e.dataTransfer.effectAllowed = "move";
  });
  textsEl.addEventListener("dragend", e => { e.target.closest(".chip")?.classList.remove("dragging"); dragText = null; state.dropBase = null; render(); });
  function hitAt(clientX, clientY) {
    const r = stage.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    for (let i = hits.length - 1; i >= 0; i--) {
      const p = hits[i].poly; let inside = false;
      for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
        if ((p[a][1] > y) !== (p[b][1] > y) && x < (p[b][0] - p[a][0]) * (y - p[a][1]) / (p[b][1] - p[a][1]) + p[a][0]) inside = !inside;
      }
      if (inside) return hits[i];
    }
    return null;
  }
  stage.addEventListener("dragover", e => {
    if (dragText == null) return;
    e.preventDefault();
    const h = hitAt(e.clientX, e.clientY), id = h ? h.baseId : null;
    if (id !== state.dropBase) { state.dropBase = id; render(); }
  });
  stage.addEventListener("drop", e => {
    e.preventDefault();
    const h = hitAt(e.clientX, e.clientY), t = state.texts.find(x => x.id === dragText);
    state.dropBase = null;
    if (h && t) { t.baseId = h.baseId; t.angle = h.angle; toast(`“${t.text}” placed on Base ${state.bases.findIndex(b => b.id === h.baseId) + 1}`); }
    else toast("Drop the text onto the side of a base");
    changed({ texts: true });
  });

  /* ---------- panel: building / colours / print ---------- */
  const scaleIn = $("#scaleIn"), exagIn = $("#exagIn"), infillIn = $("#infillIn");
  function syncOutputs() {
    $("#scaleOut").textContent = SCALES[state.scaleIdx].label;
    $("#exagOut").textContent = "× " + state.exag.toFixed(2);
    $("#infillOut").textContent = state.infill + "%";
    [scaleIn, exagIn, infillIn].forEach(paintRange);
  }
  scaleIn.addEventListener("input", () => { state.scaleIdx = +scaleIn.value; syncOutputs(); changed(); });
  exagIn.addEventListener("input", () => { state.exag = exagIn.value / 100; syncOutputs(); changed(); });
  infillIn.addEventListener("input", () => { state.infill = +infillIn.value; syncOutputs(); renderStats(); });
  function seg(id, apply) {
    $$(`#${id} button`).forEach(btn => btn.addEventListener("click", () => {
      $$(`#${id} button`).forEach(x => x.classList.toggle("on", x === btn));
      apply(btn.dataset.v);
    }));
  }
  seg("detailSeg", v => { state.detail = +v; render(); });
  seg("spireToggle", v => { state.spire = v === "on"; changed(); });
  seg("materialSeg", v => { state.material = v; renderStats(); });
  seg("layerSeg", v => { state.layer = +v; renderStats(); });
  seg("stageSeg", v => setStage(v));

  function renderPalettes() {
    $("#palettes").innerHTML = Object.entries(PALETTES).map(([k, p]) =>
      `<button class="palette ${state.palette === k ? "on" : ""}" data-k="${k}"><span class="bar"><span style="background:${p.top[1]}"></span><span style="background:${p.sideTop[1]}"></span><span style="background:${p.sideBot[1]}"></span><span style="background:${p.sideBot[0]}"></span></span><b>${p.name}</b><small>${p.note}</small></button>`).join("");
    $("#paletteMeta").textContent = PALETTES[state.palette].name;
  }
  $("#palettes").addEventListener("click", e => { const b = e.target.closest(".palette"); if (!b) return; state.palette = b.dataset.k; renderPalettes(); render(); });

  function setStage(v) {
    state.stage = v;
    document.body.dataset.stage = v;
    $$("#stageSeg button").forEach(x => x.classList.toggle("on", x.dataset.v === v));
    render();
  }
  $("#themeBtn").addEventListener("click", () => setStage(state.stage === "dark" ? "light" : "dark"));

  function renderStats() {
    const vol = scene.solids.reduce((s, sol) => {
      const a1 = area(sol.bottom), a2 = area(sol.top), h = sol.z1 - sol.z0;
      return s + h / 3 * (a1 + a2 + Math.sqrt(a1 * a2));
    }, 0);
    const m = MATERIAL[state.material];
    const fill = state.material === "Resin" ? .35 : .12 + state.infill / 100 * .88 * .55;
    const grams = vol / 1000 * m.d * fill;
    const hours = state.material === "Resin" ? scene.height / state.layer * 8 / 3600 : grams * .03 * (0.16 / state.layer) / m.speed;
    const fmtH = hours < 1 ? Math.round(hours * 60) + "<small>min</small>" : Math.floor(hours) + "<small>h</small> " + Math.round((hours % 1) * 60) + "<small>m</small>";
    $("#stats").innerHTML = `
      <div class="stat"><b>${Math.round(scene.height)}<small>mm</small></b><span>Total height</span></div>
      <div class="stat"><b>${Math.round(scene.footprint.w)}<small>×</small>${Math.round(scene.footprint.d)}</b><span>Footprint · mm</span></div>
      <div class="stat"><b>${Math.round(grams)}<small>g</small></b><span>${state.material} estimate</span></div>
      <div class="stat"><b>${fmtH}</b><span>Print time</span></div>`;
    $("#stageDims").textContent = `${Math.round(scene.footprint.w)} × ${Math.round(scene.footprint.d)} × ${Math.round(scene.height)} mm · ${SCALES[state.scaleIdx].label}`;
  }

  /* ---------- rail + panel ---------- */
  const main = $("#main");
  function setPanel(open) { state.panelOpen = open; main.classList.toggle("panel-open", open); render(); }
  $$(".rail [data-tab]").forEach(btn => btn.addEventListener("click", () => {
    state.tab = btn.dataset.tab;
    $$(".rail [data-tab]").forEach(x => x.classList.toggle("is-active", x === btn));
    $$(".pane").forEach(p => p.classList.toggle("is-active", p.dataset.pane === state.tab));
    $("#panel").style.setProperty("--strip", $(`.pane[data-pane="${state.tab}"]`).style.getPropertyValue("--strip"));
    if (!state.panelOpen) setPanel(true);
  }));
  $("#panelToggle").addEventListener("click", () => setPanel(!state.panelOpen));
  $$(".pane-close").forEach(b => b.addEventListener("click", () => setPanel(false)));

  /* ---------- orbit / zoom / pan ---------- */
  let drag = null;
  function startDrag(e, mode) {
    drag = { x: e.clientX, y: e.clientY, mode, th: state.theta, ph: state.phi, px: state.panX, py: state.panY };
    stage.classList.add(mode === "pan" ? "panning" : "orbiting");
  }
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest(".stage-tools")) return;
    startDrag(e, e.button === 2 || e.shiftKey ? "pan" : "orbit");
  });
  $("#gizmo").addEventListener("pointerdown", e => { e.stopPropagation(); startDrag(e, "orbit"); });
  stage.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.mode === "orbit") {
      state.theta = drag.th + dx * .009;
      state.phi = Math.max(.18, Math.min(1.1, drag.ph + dy * .005));
    } else { state.panX = drag.px + dx; state.panY = drag.py + dy; }
    render();
  });
  window.addEventListener("pointerup", () => { drag = null; stage.classList.remove("orbiting", "panning"); });
  stage.addEventListener("wheel", e => {
    e.preventDefault();
    state.zoom = Math.max(.45, Math.min(3, state.zoom * Math.exp(-e.deltaY * .0015)));
    render();
  }, { passive: false });
  const animateTo = (target, ms = 600) => {
    const from = { theta: state.theta, phi: state.phi, zoom: state.zoom, panX: state.panX, panY: state.panY }, t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
      Object.keys(target).forEach(k => { state[k] = from[k] + (target[k] - from[k]) * e; });
      render();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $("#zoomIn").addEventListener("click", () => animateTo({ zoom: Math.min(3, state.zoom * 1.25) }, 300));
  $("#zoomOut").addEventListener("click", () => animateTo({ zoom: Math.max(.45, state.zoom / 1.25) }, 300));
  const home = { theta: -0.62, phi: 0.52, zoom: 1, panX: 0, panY: 0 };
  $("#viewReset").addEventListener("click", () => animateTo(home));
  stage.addEventListener("dblclick", () => animateTo(home));
  window.addEventListener("resize", render);

  /* ---------- export: STL + 3MF ---------- */
  function meshes() {
    return scene.solids.map(sol => {
      const n = sol.bottom.length, V = [], T = [];
      sol.bottom.forEach(p => V.push([p[0], p[1], sol.z0]));
      sol.top.forEach(p => V.push([p[0], p[1], sol.z1]));
      for (let i = 1; i < n - 1; i++) { T.push([0, i + 1, i]); T.push([n, n + i, n + i + 1]); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; T.push([i, j, n + j]); T.push([i, n + j, n + i]); }
      return { name: sol.kind === "base" ? "Base " + (state.bases.indexOf(sol.base) + 1) : "Tower " + sol.tier, V, T };
    });
  }
  const r4 = x => +x.toFixed(4);
  function stl() {
    let s = "solid framebuilding_70_pine\n";
    meshes().forEach(m => m.T.forEach(t => {
      const [a, b, c] = t.map(i => m.V[i]), n = norm(cross(sub(b, a), sub(c, a)));
      s += ` facet normal ${n.map(r4).join(" ")}\n  outer loop\n${[a, b, c].map(p => `   vertex ${p.map(r4).join(" ")}\n`).join("")}  endloop\n endfacet\n`;
    }));
    return s + "endsolid framebuilding_70_pine\n";
  }
  function threeMF() {
    const ms = meshes();
    const objects = ms.map((m, i) => `<object id="${i + 1}" name="${esc(m.name)}" type="model"><mesh><vertices>${m.V.map(p => `<vertex x="${r4(p[0])}" y="${r4(p[1])}" z="${r4(p[2])}"/>`).join("")}</vertices><triangles>${m.T.map(t => `<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join("")}</triangles></mesh></object>`).join("");
    const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">70 Pine — FrameBuilding Studio</metadata><resources>${objects}</resources><build>${ms.map((_, i) => `<item objectid="${i + 1}"/>`).join("")}</build></model>`;
    const types = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
    return zip([["[Content_Types].xml", types], ["_rels/.rels", rels], ["3D/3dmodel.model", model]]);
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // minimal store-only zip writer
  function zip(entries) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    entries.forEach(([name, text]) => {
      const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 33, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, nm.length, 2], [28, 0, 2]]
        .forEach(([o, v, s]) => s === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true));
      const ch = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 33, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, nm.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
        .forEach(([o, v, s]) => s === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true));
      parts.push(lh.buffer, nm, data); central.push(ch.buffer, nm);
      offset += 30 + nm.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, entries.length, 2], [10, entries.length, 2], [12, cdSize, 4], [16, offset, 4], [20, 0, 2]]
      .forEach(([o, v, s]) => s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true));
    return new Blob([...parts, ...central, end.buffer], { type: "model/3mf" });
  }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const doExport = fmt => {
    if (fmt === "3mf") download(threeMF(), "70-pine.3mf");
    else download(new Blob([stl()], { type: "model/stl" }), "70-pine.stl");
    toast(`70-pine.${fmt} downloaded · ${Math.round(scene.height)} mm tall`);
  };
  $("#dl3mf").addEventListener("click", () => doExport("3mf"));
  $("#dlStl").addEventListener("click", () => doExport("stl"));
  $$(".fmt-btn").forEach(b => b.addEventListener("click", () => doExport(b.dataset.fmt)));

  /* ---------- connect code ---------- */
  const pop = $("#connectPop"), statusBtn = $("#statusBtn");
  statusBtn.addEventListener("click", e => { e.stopPropagation(); pop.hidden = !pop.hidden; if (!pop.hidden) $("#connectInput").focus(); });
  pop.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => { pop.hidden = true; });
  pop.addEventListener("submit", e => {
    e.preventDefault();
    const code = $("#connectInput").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { toast("Connect codes are 6 letters or numbers"); return; }
    statusBtn.classList.add("is-connected");
    $("#statusText").textContent = "Editing · Connected";
    pop.hidden = true;
    toast("Workspace connected — changes will be saved");
  });

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- boot ---------- */
  $("#userAvatar").innerHTML = `<svg viewBox="24 40 112 112">${window.SidonArt.person({ skin: "#c27a55", hair: "curly", hairColor: "#16102a", shirt: "#e0405e", collar: "crew" })}</svg>`;
  renderPresets(); renderBases(); renderTexts(); renderPalettes(); syncOutputs(); renderStats();
  setPanel(innerWidth > 760);
  setTimeout(() => {
    $("#loading").classList.add("done");
    const t0 = performance.now();
    const grow = now => {
      const t = Math.min(1, (now - t0) / 1100);
      state.grow = 1 - Math.pow(1 - t, 3);
      render();
      if (t < 1) requestAnimationFrame(grow);
    };
    requestAnimationFrame(grow);
  }, 900);
})();
