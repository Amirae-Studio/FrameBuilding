/* Original SVG illustrations for the Sidon landing page. */
(function () {
  const OUT = "#241b4f";
  const f = n => +n.toFixed(1);
  const pts = arr => arr.map(p => f(p[0]) + "," + f(p[1])).join(" ");
  const poly = (p, fill, extra = "") => `<polygon points="${pts(p)}" fill="${fill}" ${extra}/>`;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Generic iso projector
  function iso(ox, oy, k) {
    const kx = k * 0.866, ky = k * 0.5;
    return (x, y, z = 0) => [ox + (x - y) * kx, oy + (x + y) * ky - z * k];
  }
  function isoBox(P, x0, y0, x1, y1, h, c, stroke = OUT, sw = 1.6, z0 = 0) {
    const top = [P(x0, y0, z0 + h), P(x1, y0, z0 + h), P(x1, y1, z0 + h), P(x0, y1, z0 + h)];
    const right = [P(x1, y0, z0 + h), P(x1, y1, z0 + h), P(x1, y1, z0), P(x1, y0, z0)];
    const left = [P(x0, y1, z0 + h), P(x1, y1, z0 + h), P(x1, y1, z0), P(x0, y1, z0)];
    const s = stroke ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : "";
    return poly(left, c[1], s) + poly(right, c[2], s) + poly(top, c[0], s);
  }

  /* ================= HERO CITY ================= */
  function city() {
    const W = 1200, H = 900;
    const s = 22, kx = s * 0.866, ky = s * 0.5;
    const O = [1262, 40];
    const P = (x, y, z = 0) => [O[0] + (x - y) * kx, O[1] + (x + y) * ky - z * s];
    const r = rng(11);
    const items = [];
    const add = (key, svg) => items.push({ key, svg });
    const visible = (x, y) => { const p = P(x, y); return p[0] > -120 && p[0] < W + 120 && p[1] > -60 && p[1] < H + 500; };

    const defs = `
      <linearGradient id="cTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffdcae"/><stop offset="1" stop-color="#f7a982"/></linearGradient>
      <linearGradient id="cTop2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc4b0"/><stop offset="1" stop-color="#ee8fa0"/></linearGradient>
      <linearGradient id="cL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb889"/><stop offset=".45" stop-color="#f08a92"/><stop offset="1" stop-color="#9654c6"/></linearGradient>
      <linearGradient id="cR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef8f86"/><stop offset=".5" stop-color="#c25aa8"/><stop offset="1" stop-color="#5a3db8"/></linearGradient>
      <linearGradient id="cL2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9a5a0"/><stop offset="1" stop-color="#8a55cf"/></linearGradient>
      <linearGradient id="cR2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b673c9"/><stop offset="1" stop-color="#4c3cb0"/></linearGradient>
      <linearGradient id="spL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf9a"/><stop offset=".5" stop-color="#e2729a"/><stop offset="1" stop-color="#6d44c4"/></linearGradient>
      <linearGradient id="spR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b56cd2"/><stop offset="1" stop-color="#4434ad"/></linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8fe0"/><stop offset="1" stop-color="#7fb0ee"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(220,226,255,.55)"/><stop offset="1" stop-color="rgba(160,170,255,.35)"/></linearGradient>
      <pattern id="win" width=".42" height=".62" patternUnits="userSpaceOnUse"><rect x=".08" y=".1" width=".22" height=".34" fill="rgba(255,240,230,.22)"/></pattern>
      <pattern id="win2" width=".3" height=".34" patternUnits="userSpaceOnUse"><rect x=".04" y=".05" width=".22" height=".2" fill="rgba(60,30,140,.28)"/></pattern>
      <pattern id="stripe" width=".34" height="10" patternUnits="userSpaceOnUse"><rect width=".1" height="10" fill="rgba(255,235,220,.18)"/></pattern>`;

    // land slab
    const X1 = 46, Y0 = -12, Y1 = 92;
    let base = "";
    base += poly([P(0, Y0), P(X1, Y0), P(X1, Y1), P(0, Y1)], "#3b3a90");
    // slab edge along shoreline
    base += poly([P(0, Y0), P(0, Y1), [P(0, Y1)[0], P(0, Y1)[1] + 12], [P(0, Y0)[0], P(0, Y0)[1] + 12]], "#2d2c7a");
    // bay
    const WX = 14, WY = 50;
    base += poly([P(-0.01, WY), P(WX, WY), P(WX, Y1), P(-0.01, Y1)], "url(#water)");
    base += poly([P(-60, WY + 8), P(0, WY + 8), P(0, Y1 + 40), P(-60, Y1 + 40)], "url(#water)", 'opacity=".0"');
    for (let i = 0; i < 70; i++) {
      const x = r() * WX, y = WY + 1 + r() * 40, l = .6 + r() * 1.6;
      const a = P(x, y), b = P(x, y + l);
      base += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="rgba(255,255,255,${(.12 + r() * .2).toFixed(2)})" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    // shore edge along water
    base += `<polyline points="${pts([P(WX, Y1), P(WX, WY), P(0, WY)])}" fill="none" stroke="#2d2c7a" stroke-width="3"/>`;

    // roads: lanes between blocks with dashes
    const step = 5, bw = 4;
    let roads = "";
    for (let x = 0; x <= X1; x += step) {
      const yEnd = x < WX ? WY : Y1;
      const a = P(x + 0.5 - 0.5 + 0.0, Y0), b = P(x, yEnd);
      if (x > 0) roads += `<line x1="${f(P(x - .5, Y0)[0])}" y1="${f(P(x - .5, Y0)[1])}" x2="${f(P(x - .5, yEnd)[0])}" y2="${f(P(x - .5, yEnd)[1])}" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-dasharray="5 7"/>`;
    }
    for (let y = Y0 + step; y <= Y1; y += step) {
      const xs = y > WY ? WX : 0;
      roads += `<line x1="${f(P(xs, y - .5)[0])}" y1="${f(P(xs, y - .5)[1])}" x2="${f(P(X1, y - .5)[0])}" y2="${f(P(X1, y - .5)[1])}" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-dasharray="5 7"/>`;
    }
    base += roads;

    // building helpers
    const face = (x0, y0, x1, y1, z0, h, pat) => {
      // right face (x = x1), left face (y = y1) window overlays via affine transform
      const R = P(x1, y0, z0), L = P(x0, y1, z0);
      return `<rect width="${f(y1 - y0)}" height="${f(h)}" fill="url(#${pat})" transform="matrix(${-kx},${ky},0,${-s},${f(R[0])},${f(R[1])})"/>` +
             `<rect width="${f(x1 - x0)}" height="${f(h)}" fill="url(#${pat})" transform="matrix(${kx},${ky},0,${-s},${f(L[0])},${f(L[1])})"/>`;
    };
    const building = (x0, y0, x1, y1, h, v = 0) => {
      const tops = ["url(#cTop)", "url(#cTop2)"], Ls = ["url(#cL)", "url(#cL2)"], Rs = ["url(#cR)", "url(#cR2)"];
      let g = isoBox(P, x0, y0, x1, y1, h, [tops[v], Ls[v], Rs[v]], null);
      g += face(x0, y0, x1, y1, 0, h, h > 6 && r() > .5 ? "stripe" : "win");
      // roof detail
      if (r() > .45 && x1 - x0 > 1.2) {
        const m = .35;
        g += isoBox(P, x0 + m, y0 + m, x1 - m - (r() * .5), y1 - m, .5 + r() * .8, ["#ffe2b8", "#f59a8f", "#d0709f"], null, 0, h);
      }
      // top edge highlight
      g += `<polyline points="${pts([P(x0, y1, h), P(x1, y1, h), P(x1, y0, h)])}" fill="none" stroke="rgba(255,236,210,.7)" stroke-width=".8"/>`;
      return g;
    };
    const glassBox = (x0, y0, x1, y1, h) => {
      let g = isoBox(P, x0, y0, x1, y1, h, ["rgba(225,230,255,.5)", "url(#glass)", "url(#glass)"], "rgba(240,242,255,.85)", .8);
      for (let z = 1; z < h; z += 1) g += `<polyline points="${pts([P(x0, y1, z), P(x1, y1, z), P(x1, y0, z)])}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".6"/>`;
      return g;
    };
    const crane = (x, y, h) => {
      const b = P(x, y, 0), t = P(x, y, h), j1 = P(x + 5, y, h), j0 = P(x - 1.6, y, h);
      let g = `<g stroke="#f2b544" fill="none" stroke-linecap="round">`;
      g += `<line x1="${f(b[0])}" y1="${f(b[1])}" x2="${f(t[0])}" y2="${f(t[1] - 10)}" stroke-width="5"/>`;
      g += `<line x1="${f(b[0])}" y1="${f(b[1])}" x2="${f(t[0])}" y2="${f(t[1] - 10)}" stroke-width="3" stroke="#d98a1f" stroke-dasharray="2 4"/>`;
      g += `<line x1="${f(j0[0])}" y1="${f(j0[1])}" x2="${f(j1[0])}" y2="${f(j1[1])}" stroke-width="3.5"/>`;
      g += `<line x1="${f(t[0])}" y1="${f(t[1] - 10)}" x2="${f(j1[0])}" y2="${f(j1[1])}" stroke-width="1"/>`;
      g += `<line x1="${f(t[0])}" y1="${f(t[1] - 10)}" x2="${f(j0[0])}" y2="${f(j0[1])}" stroke-width="1"/>`;
      const hk = P(x + 3.6, y, h);
      g += `<line x1="${f(hk[0])}" y1="${f(hk[1])}" x2="${f(hk[0])}" y2="${f(hk[1] + 40)}" stroke="#5b4a8a" stroke-width="1"/>`;
      g += `</g><rect x="${f(hk[0] - 5)}" y="${f(hk[1] + 40)}" width="10" height="7" fill="#7b62c9"/>`;
      g += `<rect x="${f(j0[0] - 6)}" y="${f(j0[1] - 2)}" width="10" height="8" fill="#e09a2a"/>`;
      return g;
    };
    const tree = (x, y) => {
      const p = P(x, y), hgt = 14 + r() * 8;
      return `<path d="M${f(p[0])} ${f(p[1] - hgt)} L${f(p[0] + 5)} ${f(p[1] - 2)} L${f(p[0])} ${f(p[1])} Z" fill="#1d6a6e"/>` +
             `<path d="M${f(p[0])} ${f(p[1] - hgt)} L${f(p[0] - 5)} ${f(p[1] - 2)} L${f(p[0])} ${f(p[1])} Z" fill="#2c8d86"/>`;
    };
    const spire = (cx, cy, half, h) => {
      const a = P(cx - half, cy + half), b = P(cx + half, cy + half), c = P(cx + half, cy - half), apex = P(cx, cy, h);
      let g = poly([a, b, apex], "url(#spL)") + poly([b, c, apex], "url(#spR)");
      // wings
      const w1 = P(cx - half, cy + half * .2), w1t = P(cx - half * .6, cy + half * .2, h * .62);
      g += poly([w1, P(cx - half * .2, cy + half), [w1t[0], w1t[1]]], "#f6a985", 'opacity=".9"');
      g += `<line x1="${f(apex[0])}" y1="${f(apex[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="rgba(255,230,210,.55)" stroke-width="1"/>`;
      for (let i = 1; i < 16; i++) {
        const t = i / 16, pa = [a[0] + (apex[0] - a[0]) * t, a[1] + (apex[1] - a[1]) * t], pb = [b[0] + (apex[0] - b[0]) * t, b[1] + (apex[1] - b[1]) * t];
        g += `<line x1="${f(pa[0])}" y1="${f(pa[1])}" x2="${f(pb[0])}" y2="${f(pb[1])}" stroke="rgba(255,240,230,.18)" stroke-width="1"/>`;
      }
      return g;
    };
    const roundTower = (cx, cy, rad, h) => {
      const c0 = P(cx, cy, 0), c1 = P(cx, cy, h);
      const rx = rad * s * 1.22, ry = rx * .5;
      let g = `<path d="M${f(c0[0] - rx)} ${f(c0[1])} L${f(c1[0] - rx)} ${f(c1[1] + 10)} Q${f(c1[0] - rx * .6)} ${f(c1[1] - ry * 2.6)} ${f(c1[0])} ${f(c1[1] - ry * 2.2)} Q${f(c1[0] + rx * .7)} ${f(c1[1] - ry * 1.6)} ${f(c1[0] + rx)} ${f(c1[1] + 6)} L${f(c0[0] + rx)} ${f(c0[1])} A${f(rx)} ${f(ry)} 0 0 1 ${f(c0[0] - rx)} ${f(c0[1])} Z" fill="url(#cL)"/>`;
      g += `<path d="M${f(c0[0])} ${f(c0[1] + ry)} L${f(c1[0])} ${f(c1[1] - ry * 2.2)} Q${f(c1[0] + rx * .7)} ${f(c1[1] - ry * 1.6)} ${f(c1[0] + rx)} ${f(c1[1] + 6)} L${f(c0[0] + rx)} ${f(c0[1])} A${f(rx)} ${f(ry)} 0 0 1 ${f(c0[0])} ${f(c0[1] + ry)} Z" fill="url(#cR)"/>`;
      for (let i = -4; i <= 4; i++) {
        const xx = c0[0] + (rx * i / 4.6);
        g += `<line x1="${f(xx)}" y1="${f(c0[1] + ry * Math.sqrt(1 - (i / 4.6) ** 2))}" x2="${f(xx)}" y2="${f(c1[1] + 4 - Math.abs(i) * 0)}" stroke="rgba(255,235,215,.22)" stroke-width="1.2"/>`;
      }
      return g;
    };

    // blocks
    const DT = [12.5, 38];
    for (let bx = 0.5; bx < X1; bx += step) {
      for (let by = Y0 + .5; by < Y1; by += step) {
        if (bx < WX && by + bw > WY) continue;
        if (!visible(bx + 2, by + 2) && !visible(bx + 2, by - 8)) continue;
        const residential = by < 16 || bx > 34;
        const d2 = (bx + 2 - DT[0]) ** 2 + (by + 2 - DT[1]) ** 2;
        const key = bx + by;
        const lot = residential ? (r() > .35 ? "#2f8a8c" : "#4a46a8") : "#4a46a8";
        add(key - 100, poly([P(bx, by), P(bx + bw, by), P(bx + bw, by + bw), P(bx, by + bw)], lot));

        // special pieces
        if (bx === 10.5 && by === 33.5) {
          add(key + 2.5, spire(bx + 2, by + 2, 1.6, 21));
          continue;
        }
        if (bx === 15.5 && by === 28.5) {
          add(key + 2, roundTower(bx + 2, by + 2, 1.6, 18));
          continue;
        }
        if ((bx === 5.5 && by === 8.5) || (bx === 25.5 && by === 18.5) || (bx === 20.5 && by === 3.5)) {
          add(key + 1, glassBox(bx + .6, by + .6, bx + 3, by + 3, 6 + (bx % 3)));
          add(key + 1.2, crane(bx + 3.1, by + 1, 10 + (bx % 4)));
          continue;
        }
        if (residential) {
          for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
            const x0 = bx + i * 2 + .25, y0 = by + j * 2 + .25;
            if (r() < .3) { add(x0 + y0 + 1.5, tree(x0 + .8, y0 + .8) + tree(x0 + 1.4, y0 + 1.3)); continue; }
            const h = 1 + r() * 2.6;
            add(x0 + y0 + 2, building(x0, y0, x0 + 1.5, y0 + 1.5, h, r() > .5 ? 1 : 0));
          }
          continue;
        }
        const tall = Math.max(1.6, 15 * Math.exp(-d2 / 95));
        const split = tall > 9 ? (r() > .5 ? 1 : 2) : (r() > .3 ? 4 : 2);
        if (split === 1) {
          const h = tall * (.7 + r() * .5);
          add(key + 2, building(bx + .2, by + .2, bx + 3.8, by + 3.8, h, r() > .7 ? 1 : 0));
        } else if (split === 2) {
          for (let j = 0; j < 2; j++) {
            const y0 = by + j * 2 + .15, h = tall * (.45 + r() * .7);
            add(bx + y0 + 2 + j, building(bx + .2, y0, bx + 3.8, y0 + 1.7, h, r() > .6 ? 1 : 0));
          }
        } else {
          for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
            const x0 = bx + i * 2 + .15, y0 = by + j * 2 + .15, h = tall * (.35 + r() * .8);
            add(x0 + y0 + 1.7, building(x0, y0, x0 + 1.7, y0 + 1.7, h, r() > .6 ? 1 : 0));
          }
        }
      }
    }

    // pier warehouses in the bay
    add(WY + 3, isoBox(P, 1.6, WY + 3, 3.2, WY + 7.5, 1, ["#f08a6c", "#c0566d", "#9a4380"], null));
    add(WY + 6, isoBox(P, 9.5, WY + 3, 11.2, WY + 7.5, .9, ["#ee9a77", "#c25c70", "#9a4380"], null));
    add(WY + 12, isoBox(P, 9.6, WY + 12, 11.2, WY + 16, .8, ["#f2a27c", "#c25c70", "#9a4380"], null));
    // container ship
    add(WY + 10, isoBox(P, 3.2, WY + 11, 4.6, WY + 16, .6, ["#d6dcff", "#8b8fd9", "#6b6fc4"], null) +
      isoBox(P, 3.4, WY + 12, 4.4, WY + 13.5, .5, ["#f4b458", "#d4793b", "#b45d2e"], null, 0, .6) +
      isoBox(P, 3.4, WY + 13.6, 4.4, WY + 15, .5, ["#e8667f", "#c0405f", "#9a3150"], null, 0, .6));

    // bridge along x = 6
    let bridge = "";
    const bx0 = 5.2, bx1 = 6.8, yb0 = WY - .2, yb1 = Y1 + 10, dz = 1.2;
    const towers = [WY + 9, WY + 21];
    const cable = (x) => {
      let d = "";
      const ys = [yb0, ...towers, yb1];
      for (let i = 0; i < ys.length - 1; i++) {
        const a = P(x, ys[i], i === 0 ? dz : 7), b = P(x, ys[i + 1], 7);
        const m = P(x, (ys[i] + ys[i + 1]) / 2, dz + 1.2);
        d += `M${f(a[0])} ${f(a[1])} Q${f(m[0])} ${f(m[1] + 18)} ${f(b[0])} ${f(b[1])} `;
      }
      return `<path d="${d}" fill="none" stroke="#d8473d" stroke-width="2.2"/>`;
    };
    const leg = (x, y) => {
      const a = P(x, y, 0), b = P(x, y, 7.5);
      return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#c63a32" stroke-width="7"/>` +
        `<line x1="${f(a[0] + 2)}" y1="${f(a[1])}" x2="${f(b[0] + 2)}" y2="${f(b[1])}" stroke="#e45a43" stroke-width="2.5"/>`;
    };
    bridge += cable(bx0);
    towers.forEach(y => { bridge += leg(bx0, y); });
    bridge += poly([P(bx0, yb0, dz), P(bx1, yb0, dz), P(bx1, yb1, dz), P(bx0, yb1, dz)], "#6a5b8e");
    bridge += poly([P(bx1, yb0, dz), P(bx1, yb1, dz), P(bx1, yb1, dz - .5), P(bx1, yb0, dz - .5)], "#c63a32");
    bridge += `<line x1="${f(P(6, yb0, dz)[0])}" y1="${f(P(6, yb0, dz)[1])}" x2="${f(P(6, yb1, dz)[0])}" y2="${f(P(6, yb1, dz)[1])}" stroke="rgba(255,255,255,.45)" stroke-dasharray="4 6"/>`;
    towers.forEach(y => {
      bridge += leg(bx1, y);
      const a = P(bx0, y, 7.2), b = P(bx1, y, 7.2), c = P(bx0, y, 4.8), d = P(bx1, y, 4.8);
      bridge += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#c63a32" stroke-width="4"/>`;
      bridge += `<line x1="${f(c[0])}" y1="${f(c[1])}" x2="${f(d[0])}" y2="${f(d[1])}" stroke="#c63a32" stroke-width="3"/>`;
    });
    bridge += cable(bx1);
    // vans on the bridge
    bridge += isoBox(P, 5.5, WY + 4, 6.3, WY + 5.4, .6, ["#fff4ee", "#e6d4e8", "#c9b4d9"], null, 0, dz);
    bridge += isoBox(P, 5.6, WY + 13, 6.4, WY + 14.2, .5, ["#fbe1c9", "#e3a87f", "#c48562"], null, 0, dz);

    items.sort((a, b) => a.key - b.key);
    const body = items.map(i => i.svg).join("");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${base}${body}<g>${bridge}</g></svg>`;
  }

  const droneSVG = `<svg viewBox="0 0 44 22"><g fill="#f3f0ff" stroke="#6a5aa8" stroke-width="1"><ellipse cx="8" cy="7" rx="7" ry="2.6"/><ellipse cx="36" cy="7" rx="7" ry="2.6"/><ellipse cx="14" cy="15" rx="7" ry="2.6"/><ellipse cx="30" cy="15" rx="7" ry="2.6"/><rect x="15" y="8" width="14" height="6" rx="3" fill="#ffffff"/></g><circle cx="22" cy="11" r="1.6" fill="#e86c8f"/></svg>`;

  /* ================= PEOPLE ================= */
  // Bust in a 160x175 space, head centered ~ (80,82)
  function person(o) {
    const sk = o.skin, hc = o.hairColor || "#1d1530", st = `stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
    let back = "", front = "";
    const curls = (cx, cy, list, rr, col) => list.map(([a, d, rad]) => {
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${rad || rr}" fill="${col}" ${st}/>`;
    }).join("");
    switch (o.hair) {
      case "afro": {
        const list = [];
        for (let i = 0; i < 15; i++) { const a = Math.PI * (0.92 + i * 1.16 / 14); list.push([a, 38 + (i % 2) * 6, 15 + (i % 3) * 2]); }
        back += curls(80, 78, list, 15, hc);
        back += `<ellipse cx="80" cy="70" rx="40" ry="34" fill="${hc}"/>`;
        break;
      }
      case "long":
        back += `<path d="M46 80 C42 40 118 40 114 80 L118 140 C110 150 50 150 42 140 Z" fill="${hc}" ${st}/>`;
        break;
      case "hijab":
        back += `<path d="M38 150 C30 110 40 44 80 42 C120 44 130 110 122 150 C112 162 48 162 38 150 Z" fill="${o.scarf}" ${st}/>`;
        break;
    }
    // shirt
    let shirt = `<path d="M14 178 C18 140 44 126 80 124 C116 126 142 140 146 178 Z" fill="${o.shirt}" ${st}/>`;
    if (o.collar === "collar") {
      shirt += `<path d="M66 124 L80 142 L94 124" fill="none" ${st}/><path d="M64 122 L72 140 L80 132 M96 122 L88 140 L80 132" fill="${o.shirt}" ${st}/><line x1="80" y1="140" x2="80" y2="178" ${st}/>`;
      if (o.pocket) shirt += `<rect x="96" y="152" width="22" height="16" fill="none" ${st}/><line x1="106" y1="148" x2="106" y2="160" stroke="${OUT}" stroke-width="4"/>`;
    } else if (o.collar === "v") {
      shirt += `<path d="M64 125 L80 146 L96 125" fill="${sk}" ${st}/>`;
    } else {
      shirt += `<path d="M64 126 Q80 138 96 126" fill="none" ${st}/>`;
    }
    const neck = `<path d="M68 100 L68 128 Q80 136 92 128 L92 100 Z" fill="${sk}" ${st}/><path d="M68 112 Q80 122 92 112 L92 104 L68 104Z" fill="rgba(0,0,0,.12)"/>`;
    const ears = `<ellipse cx="52" cy="86" rx="6" ry="8" fill="${sk}" ${st}/><ellipse cx="108" cy="86" rx="6" ry="8" fill="${sk}" ${st}/>`;
    const head = `<path d="M54 78 C54 52 106 52 106 78 L106 92 C106 112 92 118 80 118 C68 118 54 112 54 92 Z" fill="${sk}" ${st}/>`;
    const face = `<circle cx="70" cy="84" r="2.4" fill="${OUT}"/><circle cx="91" cy="84" r="2.4" fill="${OUT}"/>
      <path d="M65 77 Q70 74 75 77 M86 77 Q91 74 96 77" fill="none" ${st} stroke-width="1.8"/>
      <path d="M81 86 Q76 96 82 97" fill="none" ${st} stroke-width="1.8"/>
      <path d="M71 103 Q81 110 90 103" fill="none" ${st}/>`;
    switch (o.hair) {
      case "afro":
        front += `<path d="M54 80 C52 56 70 50 84 52 C98 52 108 62 106 80 C98 70 88 64 76 64 C66 66 58 72 54 80Z" fill="${hc}"/>`;
        break;
      case "blond": {
        const list = [];
        for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * 0.96 / 8); list.push([a, 26, 10 + (i % 2) * 2]); }
        front += curls(80, 64, list, 10, hc) + `<ellipse cx="80" cy="56" rx="24" ry="12" fill="${hc}"/>`;
        front += curls(80, 50, [[Math.PI * 1.3, 8, 10], [Math.PI * 1.6, 10, 11], [Math.PI * 1.85, 8, 9]], 10, hc);
        break;
      }
      case "curly": {
        const list = [];
        for (let i = 0; i < 8; i++) { const a = Math.PI * (1.05 + i * 0.9 / 7); list.push([a, 24, 8 + (i % 2) * 2]); }
        front += curls(80, 70, list, 8, hc) + `<ellipse cx="80" cy="60" rx="20" ry="9" fill="${hc}"/>`;
        break;
      }
      case "crop":
        front += `<path d="M53 82 C50 52 110 48 107 82 C104 72 100 66 96 64 C84 70 70 70 60 66 C56 70 54 76 53 82Z" fill="${hc}" ${st}/>`;
        break;
      case "long":
        front += `<path d="M54 82 C52 54 70 50 82 50 C100 50 110 62 106 84 C100 72 92 64 84 62 C78 70 66 76 54 82Z" fill="${hc}" ${st}/>`;
        break;
      case "hijab":
        front += `<path d="M52 92 C50 60 62 52 80 52 C98 52 110 60 108 92 C108 70 96 62 80 62 C64 62 52 70 52 92Z" fill="${o.scarf}" ${st}/>`;
        front += `<path d="M56 70 C64 58 96 58 104 70 L102 76 C94 66 66 66 58 76 Z" fill="${o.band}" ${st}/>`;
        front += `<path d="M52 92 C52 120 64 128 80 128 C96 128 108 120 108 92 C108 140 118 150 122 150 L38 150 C42 150 52 140 52 92Z" fill="${o.scarf}" ${st}/>`;
        break;
    }
    let beard = "";
    if (o.beard) beard = `<path d="M54 90 C56 120 72 124 80 124 C88 124 104 120 106 90 C100 100 96 96 90 100 Q81 106 71 100 C64 96 60 100 54 90Z" fill="${hc}" ${st}/><path d="M72 104 Q81 110 89 104" fill="none" stroke="#fff" stroke-width="2"/>`;
    const ear2 = o.earrings ? `<path d="M50 94 a3 4 0 1 0 4 0" fill="none" stroke="#f2c14e" stroke-width="2.2"/><path d="M106 94 a3 4 0 1 0 4 0" fill="none" stroke="#f2c14e" stroke-width="2.2"/>` : "";
    const glasses = o.glasses ? `<g fill="none" ${st} stroke-width="1.8"><circle cx="70" cy="85" r="7"/><circle cx="91" cy="85" r="7"/><path d="M77 85h7"/></g>` : "";
    const hideEars = o.hair === "hijab" || o.hair === "long";
    return back + shirt + neck + (hideEars ? "" : ears) + ear2 + head + face + beard + glasses + front;
  }

  /* ================= PROCESS ICONS ================= */
  function blob(top, side) {
    return `<path d="M24 118 C10 96 30 70 62 64 C88 32 140 34 158 70 C176 92 168 122 140 134 C110 148 52 148 24 118Z" fill="${side}" stroke="${OUT}" stroke-width="2"/>
      <path d="M24 110 C10 88 30 62 62 56 C88 24 140 26 158 62 C176 84 168 114 140 126 C110 140 52 140 24 110Z" fill="${top}" stroke="${OUT}" stroke-width="2"/>`;
  }
  // 01 pick a building: three landmarks, one lifted out of the row
  function pick() {
    const P = iso(92, 102, 9);
    const st = `stroke="${OUT}" stroke-width="2" stroke-linejoin="round"`;
    const tower = (x, y, w, h, c, z0 = 0) => isoBox(P, x, y, x + w, y + w, h, c, OUT, 1.6, z0);
    return `<svg viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
      ${blob("#4a2ea8", "#33208a")}
      ${tower(-4.2, 1.4, 2, 5, ["#c4c6ff", "#9a98f4", "#7d7be8"])}
      ${tower(2.4, -3.6, 2.2, 3.4, ["#f49ad2", "#e0628a", "#b8406a"])}
      <path d="M86 92 v-30" stroke="#f6d77a" stroke-width="2" stroke-dasharray="3 4"/>
      ${tower(-1.1, -1.1, 2.2, 7, ["#ffe4bd", "#f6d77a", "#e8b84a"], 3.4)}
      <path d="M86 18 l0 -12" stroke="${OUT}" stroke-width="2.2"/>
      <path d="M66 112 l-10 10 m10 -10 l4 14 m-4 -14 l12 4" stroke="#f6d77a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="140" cy="54" r="12" fill="#e0405e" ${st}/><path d="M134 54 l4 4 l8 -8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  // 02 style the base: stepped plinth with an engraved plate
  function base() {
    const P = iso(90, 112, 9);
    return `<svg viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
      ${blob("#c41f45", "#9c1735")}
      ${isoBox(P, -4.5, -4.5, 4.5, 4.5, 1.6, ["#6468ab", "#4b4f99", "#3a3d86"])}
      ${isoBox(P, -3.4, -3.4, 3.4, 3.4, 1.4, ["#f3e6e3", "#ddd0dc", "#c6b8cc"], OUT, 1.6, 1.6)}
      ${isoBox(P, -1.4, -1.4, 1.4, 1.4, 8, ["#ffe4bd", "#f6d77a", "#e8b84a"], OUT, 1.6, 3)}
      <path d="M90 22 l0 -12" stroke="${OUT}" stroke-width="2.2"/>
      ${(() => { const a = P(-3.4, 3.4, 2.3), b = P(3.4, 3.4, 2.3); return `<line x1="${f(a[0] + 10)}" y1="${f(a[1] - 5)}" x2="${f(b[0] - 12)}" y2="${f(b[1] + 6)}" stroke="${OUT}" stroke-width="2" stroke-dasharray="4 3"/>`; })()}
      <g transform="translate(130 30)"><rect width="38" height="9" rx="4.5" fill="#fde8e0" stroke="${OUT}" stroke-width="1.6"/><circle cx="26" cy="4.5" r="5.5" fill="#fff" stroke="${OUT}" stroke-width="1.6"/></g>
      <g transform="translate(130 48)"><rect width="38" height="9" rx="4.5" fill="#fde8e0" stroke="${OUT}" stroke-width="1.6"/><circle cx="12" cy="4.5" r="5.5" fill="#fff" stroke="${OUT}" stroke-width="1.6"/></g>
    </svg>`;
  }
  // 03 print: a printer frame laying down the top of a tower
  function print() {
    const P = iso(92, 116, 9);
    const st = `stroke="${OUT}" stroke-width="2" stroke-linejoin="round"`;
    return `<svg viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
      ${blob("#b0b2fa", "#8e90ee")}
      ${isoBox(P, -5, -5, 5, 5, .8, ["#3a2a8a", "#2a1f6a", "#1f174f"])}
      ${isoBox(P, -1.6, -1.6, 1.6, 1.6, 6.4, ["#ffe4bd", "#f6d77a", "#e8b84a"], OUT, 1.6, .8)}
      <path d="M42 120 V30 H142 V120" fill="none" ${st} stroke-width="3"/>
      <path d="M42 30 H142" stroke="#e0405e" stroke-width="5"/>
      <rect x="80" y="40" width="22" height="16" fill="#e0405e" ${st}/><path d="M91 56 l0 8" stroke="${OUT}" stroke-width="3"/>
      <path d="M42 46 H142" stroke="${OUT}" stroke-width="2"/>
      <path d="M96 66 q14 -2 22 6" fill="none" stroke="#f49ad2" stroke-width="2.4" stroke-dasharray="2 4"/>
      <rect x="150" y="70" width="18" height="30" rx="3" fill="#f6d77a" ${st}/><path d="M150 82 h18" stroke="${OUT}" stroke-width="1.6"/>
    </svg>`;
  }

  /* ================= SKYLINES ================= */
  function skyline(kind) {
    const st = `stroke="#2b2a72" stroke-width="1.6" stroke-linejoin="round"`;
    const win = (x, y, w, h, cw, ch, gx = 3, gy = 4) => {
      let s = "";
      for (let yy = y; yy < y + h - ch; yy += ch + gy) for (let xx = x; xx < x + w - cw; xx += cw + gx) s += `<rect x="${xx}" y="${yy}" width="${cw}" height="${ch}" fill="#e6e7ff" stroke="#2b2a72" stroke-width=".8"/>`;
      return s;
    };
    const tower = (x, y, w, fill = "#a9abff") => `<rect x="${x}" y="${y}" width="${w}" height="${195 - y}" fill="${fill}" ${st}/>`;
    let g = "";
    if (kind === "madurai") {
      // stepped gopuram: tiers narrowing upward, a barrel-vault crown and kalasam finials
      const gopuram = (cx, w, tiers, base, fill) => {
        let s = "", y = 195, tw = w;
        const th = (195 - base) / (tiers + 1.6);
        for (let i = 0; i < tiers; i++) {
          s += `<rect x="${f(cx - tw / 2)}" y="${f(y - th)}" width="${f(tw)}" height="${f(th)}" fill="${i % 2 ? "#a9abff" : fill}" ${st}/>`;
          for (let k = 1; k < 5; k++) s += `<line x1="${f(cx - tw / 2 + tw * k / 5)}" y1="${f(y - th + 3)}" x2="${f(cx - tw / 2 + tw * k / 5)}" y2="${f(y - 3)}" stroke="#2b2a72" stroke-width=".8"/>`;
          y -= th; tw *= .82;
        }
        s += `<path d="M${f(cx - tw / 2)} ${f(y)} q0 ${f(-th * 1.4)} ${f(tw / 2)} ${f(-th * 1.4)} q${f(tw / 2)} 0 ${f(tw / 2)} ${f(th * 1.4)} z" fill="#c5c6ff" ${st}/>`;
        for (let k = -1; k <= 1; k++) s += `<path d="M${f(cx + k * tw / 3)} ${f(y - th * 1.2)} v-8" stroke="#2b2a72" stroke-width="2.4" stroke-linecap="round"/><circle cx="${f(cx + k * tw / 3)}" cy="${f(y - th * 1.2 - 9)}" r="2.6" fill="#f6d77a" stroke="#2b2a72" stroke-width="1"/>`;
        return s;
      };
      g += tower(0, 150, 60, "#8f91f0") + win(6, 158, 50, 34, 6, 3, 4, 6);
      g += gopuram(84, 64, 7, 38, "#b8baff");
      g += tower(122, 160, 44, "#9fa1f5") + win(126, 166, 38, 26, 5, 4, 3, 6);
      g += gopuram(206, 92, 9, 8, "#b8baff");
      g += `<path d="M258 195 v-34 h56 v34" fill="#8f91f0" ${st}/>` + `<path d="M262 161 q24 -26 48 0" fill="#a9abff" ${st}/>` + win(266, 170, 46, 22, 6, 12, 5, 4);
      g += gopuram(342, 54, 6, 64, "#a9abff");
      g += tower(372, 128, 44, "#9fa1f5") + win(377, 134, 36, 58, 4, 3, 3, 5);
      g += gopuram(446, 70, 8, 30, "#b8baff");
      g += tower(482, 146, 30, "#8f91f0");
    } else {
      g += tower(6, 120, 70, "#a9abff") + win(10, 126, 64, 66, 6, 6, 3, 3) + `<rect x="18" y="112" width="40" height="10" fill="#b8baff" ${st}/>`;
      g += tower(64, 72, 92, "#b8baff") + win(70, 80, 84, 112, 4, 100, 6, 4);
      g += `<path d="M156 195 V90 L250 66 V195Z" fill="#8f91f0" ${st}/>` + win(180, 100, 70, 90, 12, 4, 3, 5);
      g += tower(250, 58, 70, "#a9abff") + win(256, 64, 62, 126, 6, 14, 4, 4);
      g += tower(290, 36, 60, "#b8baff") + win(294, 44, 52, 148, 8, 20, 3, 4);
      g += tower(330, 70, 52, "#c5c6ff") + `<path d="M336 76 h40 M336 98 h40 M336 120 h40 M336 142 h40 M356 70 v125" stroke="#2b2a72" stroke-width="1"/>`;
      g += `<path d="M380 195 L398 40 L404 0 L410 40 L430 195Z" fill="#8f91f0" ${st}/>`;
      for (let i = 0; i < 12; i++) { const y = 70 + i * 10; const w = 2 + i * 1.4; g += `<rect x="${404 - w}" y="${y}" width="${w * 2}" height="3" fill="#e6e7ff"/>`; }
      g += tower(430, 120, 66, "#a9abff") + win(436, 128, 56, 64, 5, 50, 4, 4) + `<rect x="446" y="106" width="36" height="16" fill="#b8baff" ${st}/>`;
    }
    return `<svg viewBox="0 0 510 195" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><rect width="510" height="195" fill="#5e64a2"/>${g}</svg>`;
  }

  window.SidonArt = {
    city, droneSVG, person,
    pick, base, print,
    madurai: () => skyline("madurai"), sf: () => skyline("sf"),
  };
})();
