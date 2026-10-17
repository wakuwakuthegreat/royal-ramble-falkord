/* Extras: small props layered over the portrait — sashes, medals, stethoscopes, pencils …
 * Each: { label, layer: 'body' | 'face' | 'top', draw(P, g, geo, C, x) }
 *   body → over the clothes and necklace     face → over the eyewear
 *   top  → over hats and earrings
 * They appear as chips under Adornment → Extras, and Roles switch them on. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;
  const snap = (g, hex) => PM.styleSnap(g, hex);
  const A = (id, def) => PM.define('accessories', id, def);
  const visibleEar = (geo, prefer) => geo.ears.find(e => !e.hidden && e.side === prefer) || geo.ears.find(e => !e.hidden);

  function star(P, x, y, R, n, fill, o = {}) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? R * 0.45 : R; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, true]); }
    return P.shape(pts, fill, Object.assign({ w: 0.6, wob: 0, smooth: false }, o));
  }
  /** A cord: an ink line with a coloured core. */
  function cord(P, pts, col, w = 2.2) {
    const d = curve.open(pts, 0.3);
    P.hair(d, (w + 2) * P.lw, P.ink, { smooth: false });
    P.hair(d, w * P.lw, col, { smooth: false });
    return d;
  }

  // ------------------------------------------------------------------ body
  A('royal-sash', {
    label: 'Royal sash',
    layer: 'body',
    draw(P, g, geo, C) {
      const { cx, sw, neckX: x, neckBase: b, H } = geo, s = -1;
      const path = [[cx + s * sw * 0.6, b + 12], [x - s * 6, b + 92], [cx - s * sw * 0.9, H + 20]];
      P.band(path, 26, C.metal, { w: 0.8 });
      P.band(path, 17, C.cloth[1], { w: 0.4 });
      const p = curve.at(curve.open(path, 0.3), 0.72);
      star(P, p.x, p.y, 13, 8, C.metal);
      P.circle(p.x, p.y, 4.5, C.cloth[2], { w: 0.5, wob: 0 });
    },
  });
  A('medals', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      for (let i = 0; i < 3; i++) {
        const px = x + nw * 1.5 + i * 13, py = b + 56 + i * 1.5;
        P.shape([[px - 5, py, true], [px + 5, py, true], [px + 5, py + 14, true], [px - 5, py + 14, true]], [C.cloth[1], C.cloth[2], C.white][i], { w: 0.5, wob: 0, smooth: false });
        P.line([[px, py], [px, py + 14]], { w: 0.4, color: C.metal, wob: 0 });
        if (i === 1) star(P, px, py + 22, 7, 5, C.metal); else P.circle(px, py + 21, 5.5, C.metal, { w: 0.6, wob: 0 });
      }
    },
  });
  A('epaulettes', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { cx, sw, neckBase: b } = geo;
      for (const s of [-1, 1]) {
        P.band([[cx + s * sw * 0.46, b + 13], [cx + s * sw * 0.84, b + 25]], 13, C.metal, { w: 0.6 });
        for (let k = 0; k < 7; k++) {
          const fx = cx + s * sw * (0.72 + k * 0.035), fy = b + 25 + k * 0.6, seg = [[fx, fy], [fx + s * 1, fy + 15]];
          P.hair(seg, 2.8 * P.lw, C.ink, { smooth: false }); P.hair(seg, 1.4 * P.lw, C.metal, { smooth: false });
        }
      }
    },
  });
  A('badge', {
    label: 'Badge',
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, px = x + nw * 2.1, py = b + 62;
      P.shape([[px - 10, py - 12, true], [px, py - 15], [px + 10, py - 12, true], [px + 9, py + 4], [px, py + 15, true], [px - 9, py + 4]], C.metal, { w: 0.7, wob: 0 });
      star(P, px, py, 6, 5, C.white, { w: 0.4 });
    },
  });
  A('stethoscope', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, tube = snap(g, '#2b2b2b');
      cord(P, [[x - nw * 1.2, b - 10], [x - nw * 1.55, b + 26], [x - nw * 1.0, b + 70], [x - nw * 0.1, b + 88]], tube, 2.6);
      cord(P, [[x + nw * 1.2, b - 10], [x + nw * 1.45, b + 24], [x + nw * 1.25, b + 50]], tube, 2.6);
      P.circle(x + nw * 0.1, b + 92, 7.5, C.metal, { w: 0.7, wob: 0 });
      P.circle(x + nw * 0.1, b + 92, 3.5, color.shade(C.metal, -0.2), { w: 0.3, wob: 0 });
      P.bead(x + nw * 1.25, b + 53, 3, C.metal, 0.6);
    },
  });
  A('necktie', {
    label: 'Necktie',
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, neckBase: b } = geo;
      P.shape([[x - 5, b + 2, true], [x + 5, b + 2, true], [x + 4, b + 12, true], [x - 4, b + 12, true]], C.cloth[2], { w: 0.6, smooth: false, wob: 0 });
      P.shape([[x - 4, b + 12, true], [x + 4, b + 12, true], [x + 8, b + 84], [x, b + 94, true], [x - 8, b + 84]], C.cloth[2], { w: 0.6, tension: 0.3, pattern: { id: 'stripes', colors: [C.cloth[2], C.cloth[1], C.ink], scale: 0.4 } });
    },
  });
  A('bow-tie', {
    label: 'Bow tie',
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, neckBase: b } = geo, y = b + 4;
      for (const s of [-1, 1]) P.shape([[x, y, true], [x + s * 15, y - 8, true], [x + s * 17, y + 1], [x + s * 15, y + 9, true]], C.cloth[2], { w: 0.6, tension: 0.3 });
      P.shape([[x - 4, y - 5, true], [x + 4, y - 5, true], [x + 4, y + 5, true], [x - 4, y + 5, true]], C.cloth[2], { w: 0.6, smooth: false, wob: 0 });
    },
  });
  A('name-tag', {
    label: 'Name tag',
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, px = x - nw * 2.9, py = b + 46;
      P.shape([[px, py, true], [px + 34, py, true], [px + 34, py + 15, true], [px, py + 15, true]], C.white, { w: 0.55, smooth: false, wob: 0.1 });
      P.fill([[px, py, true], [px + 34, py, true], [px + 34, py + 4.5, true], [px, py + 4.5, true]], C.cloth[1], { smooth: false, wob: 0 });
      P.line([[px + 5, py + 10], [px + 27, py + 10]], { w: 0.35, wob: 0.3 });
    },
  });
  A('id-lanyard', {
    label: 'ID lanyard',
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, cy = b + 96;
      for (const s of [-1, 1]) cord(P, [[x + s * nw * 1.1, b - 8], [x + s * nw * 1.0, b + 40], [x + s * 4, cy - 12]], C.cloth[1], 2.6);
      P.shape([[x - 14, cy - 12, true], [x + 14, cy - 12, true], [x + 14, cy + 22, true], [x - 14, cy + 22, true]], C.white, { w: 0.6, smooth: false, wob: 0 });
      P.fill([[x - 9, cy - 6, true], [x + 1, cy - 6, true], [x + 1, cy + 6, true], [x - 9, cy + 6, true]], C.cloth[2], { smooth: false, wob: 0 });
      for (const k of [0, 5]) P.line([[x - 9, cy + 11 + k], [x + 9, cy + 11 + k]], { w: 0.3, wob: 0 });
    },
  });
  A('camera', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, cy = b + 104;
      for (const s of [-1, 1]) cord(P, [[x + s * nw * 1.15, b - 8], [x + s * nw * 1.6, b + 50], [x + s * 26, cy - 8]], C.ink, 2.4);
      P.shape([[x - 30, cy - 14, true], [x + 30, cy - 14, true], [x + 30, cy + 18, true], [x - 30, cy + 18, true]], C.ink, { w: 0.6, tension: 0.15 });
      P.shape([[x - 22, cy - 20, true], [x - 8, cy - 20, true], [x - 8, cy - 13, true], [x - 22, cy - 13, true]], C.ink, { w: 0.5, smooth: false, wob: 0 });
      P.fill([[x - 30, cy - 4, true], [x + 30, cy - 4, true], [x + 30, cy + 8, true], [x - 30, cy + 8, true]], color.mix(C.ink, C.paper, 0.25), { smooth: false, wob: 0 });
      P.circle(x + 4, cy + 2, 13, C.metal, { w: 0.7, wob: 0 });
      P.circle(x + 4, cy + 2, 8, C.ink, { w: 0.4, wob: 0 });
      P.dot(x + 1, cy - 1, 2, C.white);
    },
  });
  A('whistle', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, wy = b + 74;
      for (const s of [-1, 1]) cord(P, [[x + s * nw * 1.1, b - 8], [x + s * nw * 0.9, b + 36], [x + 4 + s * 3, wy - 6]], C.cloth[1], 1.8);
      P.shape([[x - 4, wy - 6, true], [x + 18, wy - 6, true], [x + 18, wy + 1, true], [x + 9, wy + 1], [x + 10, wy + 8], [x - 2, wy + 9], [x - 7, wy + 2]], C.metal, { w: 0.6, tension: 0.3, wob: 0 });
    },
  });
  A('brooch', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, px = x + nw * 1.8, py = b + 34;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; P.circle(px + Math.cos(a) * 6.5, py + Math.sin(a) * 6.5, 3.4, C.white, { w: 0.4, wob: 0, n: 8 }); }
      P.circle(px, py, 5.2, C.metal, { w: 0.5, wob: 0 });
      P.bead(px, py, 3.2, C.cloth[1], 0.5);
    },
  });

  // ------------------------------------------------------------------ face
  A('paint-smudges', {
    label: 'Paint smudges',
    layer: 'face',
    draw(P, g, geo, C) {
      const r = new PM.RNG(PM.hashString(g.seed + ':smudge')), cols = [C.cloth[1], C.cloth[2], snap(g, '#2f5f6e')];
      const spots = [[geo.fx + geo.hw * 0.5 * (g.noseSide || 1), geo.noseY - 4], [geo.fx - geo.hw * 0.35, geo.hairlineY + 22], [geo.mouthX + geo.hw * 0.3, geo.chinY - 16]];
      P.clip(geo.headInk || geo.headDense, () => spots.forEach(([x, y], i) => {
        const pts = []; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; pts.push([x + Math.cos(a) * r.range(4, 9), y + Math.sin(a) * r.range(2, 5)]); }
        P.fill(pts, cols[i % cols.length], { wob: 0.6 });
      }));
    },
  });
  A('mask-down', {
    label: 'Mask (pulled down)',
    layer: 'face',
    draw(P, g, geo, C) {
      const { fx, hw, chinY, mouthY } = geo, mask = snap(g, '#a9c6cf'), y0 = lerp(mouthY, chinY, 0.62);
      for (const e of geo.ears) if (!e.hidden) P.line([[fx + e.side * hw * 0.78, y0 + 4], [e.x + e.side * 4, e.top + 10]], { w: 0.4, wob: 0.2 });
      const d = P.shape([[fx - hw * 0.78, y0 + 2, true], [fx, y0 - 4], [fx + hw * 0.78, y0 + 2, true], [fx + hw * 0.62, chinY + 14], [fx, chinY + 22], [fx - hw * 0.62, chinY + 14]], mask, { w: 0.8 });
      P.clip(d, () => { for (const k of [0, 9, 18]) P.line([[fx - hw * 0.8, y0 + 6 + k], [fx, y0 + 2 + k], [fx + hw * 0.8, y0 + 6 + k]], { w: 0.35, wob: 0 }); });
    },
  });

  // ------------------------------------------------------------------ top (ears & over the hat)
  A('pencil-ear', {
    label: 'Pencil behind ear',
    layer: 'top',
    ears: true,
    draw(P, g, geo, C) {
      const ear = visibleEar(geo, g.noseSide > 0 ? -1 : 1); if (!ear) return;
      const s = ear.side, y = ear.top + 4, x0 = ear.x - s * 6, x1 = ear.x + s * 26, wood = snap(g, '#e3c08a');
      P.band([[x0, y + 3], [x1, y - 7]], 6, snap(g, '#e3b52e'), { w: 0.5, wob: 0 });
      P.shape([[x1, y - 10, true], [x1 + s * 10, y - 9, true], [x1, y - 4, true]], wood, { w: 0.5, smooth: false, wob: 0 });
      P.dot(x1 + s * 9, y - 9, 1.1, C.ink);
    },
  });
  A('flower-ear', {
    label: 'Flower behind ear',
    layer: 'top',
    ears: true,
    draw(P, g, geo, C) {
      const ear = visibleEar(geo, g.hairPart >= 0 ? 1 : -1); if (!ear) return;
      const x = ear.x + ear.side * 8, y = ear.top - 2, col = C.cloth[1];
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - 0.3; P.ellipse(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6.5, 4.2, col, { rot: a, w: 0.5, wob: 0, n: 10 }); }
      P.circle(x, y, 3.4, C.metal, { w: 0.4, wob: 0 });
    },
  });
  A('headphones', {
    layer: 'top',
    draw(P, g, geo, C) {
      const { cx, hw, top, ears } = geo, y0 = (ears[0].top + ears[0].bot) / 2, crown = top - 7 * g.hairVolume * (geo.hatted ? 0.25 : 1) + 3;
      P.band([[cx - hw * 1.1, y0 - 10], [cx - hw * 1.14, top + 10], [cx - hw * 0.6, crown + 2], [cx, crown - 2], [cx + hw * 0.6, crown + 2], [cx + hw * 1.14, top + 10], [cx + hw * 1.1, y0 - 10]], 7, C.ink, { w: 0.4 });
      for (const s of [-1, 1]) {
        const x = cx + s * hw * 1.1;
        P.shape([[x - 9, y0 - 18, true], [x + 9, y0 - 18, true], [x + 9, y0 + 18, true], [x - 9, y0 + 18, true]], C.cloth[1], { w: 0.8, tension: 0.35 });
        P.band([[x - s * 9, y0 - 14], [x - s * 9, y0 + 14]], 5, C.ink, { w: 0.4, wob: 0 });
      }
    },
  });
  A('headset', {
    label: 'Headset & mic',
    layer: 'top',
    draw(P, g, geo, C) {
      const { cx, hw, top, ears } = geo, s = -1, y0 = (ears[0].top + ears[0].bot) / 2, M = PM.mouthMetrics(g, geo);
      P.band([[cx + s * hw * 1.08, y0 - 8], [cx + s * hw * 1.1, top + 10], [cx, top - 7 * g.hairVolume * (geo.hatted ? 0.25 : 1) + 3], [cx - s * hw * 1.1, top + 10], [cx - s * hw * 1.06, y0 - 14]], 4.5, C.ink, { w: 0.35 });
      const x = cx + s * hw * 1.08;
      P.circle(x, y0, 11, C.ink, { w: 0.6, wob: 0 });
      P.circle(x, y0, 5, C.metal, { w: 0.3, wob: 0 });
      P.line([[x - s * 4, y0 + 8], [x - s * 6, M.y0 + 6], [M.X(s, 1.3), M.y0 + 2]], { w: 0.7, wob: 0 });
      P.ellipse(M.X(s, 1.3), M.y0 + 2, 5, 4, C.ink, { w: 0.4, wob: 0 });
    },
  });
})(window.PM = window.PM || {});
