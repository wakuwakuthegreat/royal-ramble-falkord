/* Modern streetwear & hair, plus the outfits for rockstars, paupers, jesters and knights.
 * Same contracts as the other part files — this file only adds registry entries. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;
  const K = PM.hairKit;
  const snap = (g, hex) => PM.styleSnap(g, hex);
  const edge = (geo, y, s) => { const w = geo.widthAt(y); return s > 0 ? w.r : w.l; };
  const rng = (g, k) => new PM.RNG(PM.hashString(g.seed + ':modern:' + k));

  // =================================================================== HAIR
  /** Fill the lower sides of the hair mass with a skin-tinted "faded" band. */
  function fadeSides(Q, g, geo, C, d, from, amount = 0.55) {
    const { cx, hw } = geo;
    Q.clip(d, () => {
      Q.fill([[cx - hw * 1.6, from], [cx + hw * 1.6, from], [cx + hw * 1.6, geo.eyeY + 10], [cx - hw * 1.6, geo.eyeY + 10]], color.mix(C.hair, C.skin, amount), { smooth: false, wob: 0 });
      const r = K.texRng(g, 'fade');
      for (let i = 0; i < 160; i++) { const x = r.range(cx - hw * 1.3, cx + hw * 1.3), y = r.range(from - 6, geo.eyeY); Q.dot(x, y, 0.5, C.hair); }
    });
  }

  K.hairStyle('fade', {
    label: 'Fade',
    silhouette: (geo, g) => K.capSil(geo, g, { vol: g.hairTexture >= 3 ? 9 : 8, side: 1.5 }),
    hole: (geo, g) => ({ square: g.hairTexture >= 3 }),
    flow: { count: 22, maxSteps: 8 },
    frontInLayer(Q, g, geo, C, d) { fadeSides(Q, g, geo, C, d, geo.hairlineY - geo.hh * 0.06); },
  });

  K.hairStyle('waves', {
    label: '360 waves',
    silhouette: (geo, g) => K.capSil(geo, g, { vol: 2.5, side: 1 }),
    hole: () => ({ square: true }),
    texture(P, g, geo, C, r, box) {
      const ox = geo.cx + g.hairPart * 6, oy = geo.top + geo.hh * 0.22;
      for (let R = 6; R < geo.hw * 1.4; R += 6.5) {
        const pts = [];
        for (let a = Math.PI * 0.95; a <= Math.PI * 2.05; a += 0.12) { const rr = R + Math.sin(a * 9 + R) * 1.4; pts.push([ox + Math.cos(a) * rr * 1.15, oy + Math.sin(a) * rr * 0.9]); }
        P.hair(pts, 1.1 * P.lw, C.hairHi);
      }
    },
    frontInLayer(Q, g, geo, C, d) { fadeSides(Q, g, geo, C, d, geo.hairlineY + 4, 0.45); },
  });

  K.hairStyle('pixie', {
    label: 'Pixie cut',
    silhouette: (geo, g) => K.capSil(geo, g, { vol: 9, side: 3 }),
    hole(geo, g) {
      const { cx, hw, hairlineY: hl } = geo, s = g.hairPart >= 0 ? 1 : -1;
      const line = [[cx + hw * 0.86, hl + 26], [cx + hw * 0.35, hl + 15], [cx - hw * 0.25, hl + 7], [cx - hw * 0.8, hl + 4]].map(([x, y]) => [cx + s * (x - cx), y]);
      return { line: s > 0 ? line : line.reverse() };
    },
    texture: 'flow', flow: { count: 30, maxSteps: 10 },
  });

  K.hairStyle('quiff', {
    label: 'Quiff / pompadour',
    silhouette: (geo, g) => K.capSil(geo, g, { vol: 7, side: 1.5 }),
    hole: () => ({ square: true }),
    flow: { count: 20, maxSteps: 9 },
    frontInLayer(Q, g, geo, C, d) { fadeSides(Q, g, geo, C, d, geo.hairlineY - 2, 0.4); },
    frontExtra(P, g, geo, C) {
      if (geo.hatted) return;
      const { cx, hw, top, hairlineY: hl } = geo, V = g.hairVolume, s = g.hairPart >= 0 ? 1 : -1;
      const pts = [[cx - s * hw * 0.62, hl + 2], [cx - s * hw * 0.66, top - 6 * V], [cx - s * hw * 0.2, top - 26 * V], [cx + s * hw * 0.35, top - 30 * V], [cx + s * hw * 0.78, top - 12 * V], [cx + s * hw * 0.7, hl], [cx, hl + 4]];
      const d = P.shape(pts, C.hair, { w: 0.9 });
      P.clip(d, () => { for (let i = 0; i < 9; i++) { const u = i / 8 - 0.5; P.hair([[cx + u * hw * 1.2, hl + 2], [cx + u * hw * 0.9 + s * 8, top - 6], [cx + u * hw * 0.5 + s * 22, top - 26 * V]], 1 * P.lw, C.hairHi); } });
    },
  });

  K.hairStyle('undercut', {
    silhouette: (geo, g) => K.capSil(geo, g, { vol: 9, side: 1 }),
    hole: geo => ({ noPart: true, hairlineY: geo.hairlineY - 3 }),
    texture(P, g, geo, C) {
      for (let i = 0; i < 14; i++) {
        const u = (i + 0.5) / 14 - 0.5, x0 = geo.cx + u * geo.hw * 1.3;
        P.hair([[x0, geo.hairlineY + 4], [geo.cx + u * geo.hw * 1.1, lerp(geo.hairlineY, geo.top, 0.6)], [geo.cx + u * geo.hw * 0.7, geo.top - 10]], 1.05 * P.lw, C.hairHi);
      }
    },
    frontInLayer(Q, g, geo, C, d) {
      const { cx, hw } = geo, y0 = geo.top + geo.hh * 0.22;
      Q.clip(d, () => { for (const s of [-1, 1]) Q.fill([[cx + s * hw * 0.64, y0], [cx + s * hw * 1.6, y0 - 10], [cx + s * hw * 1.6, geo.eyeY + 10], [cx + s * hw * 0.64, geo.eyeY + 10]], color.mix(C.hair, C.skin, 0.62), { smooth: false, wob: 0 }); });
    },
  });

  K.hairStyle('mullet', {
    silhouette: (geo, g) => K.longSil(geo, g, { vol: 7, len: 26, side: 5, flare: 3 }),
    hole: () => ({ square: true }),
    hatFallback: 'mullet',
  });

  K.hairStyle('half-up', {
    label: 'Half-up, half-down',
    silhouette: (geo, g) => K.longSil(geo, g, { vol: 5 }),
    hole: () => ({ noPart: true }),
    backExtra(P, g, geo, C) {
      if (geo.hatted) return;
      const R = geo.hw * 0.25 * g.hairVolume, x = geo.cx + g.hairPart * 5, y = geo.top - R * 0.2;
      const d = P.circle(x, y, R, C.hair, { n: 14 });
      P.clip(d, () => { for (let i = 0; i < 4; i++) P.hair(curve.ellipse(x, y, R * (0.3 + i * 0.17), R * (0.25 + i * 0.15), 12, 0, 0.5 + i, 3.5 + i), 1 * P.lw, C.hairHi); });
    },
  });

  // =================================================================== HEADWEAR
  PM.define('headwear', 'durag', {
    label: 'Durag',
    hides: { hair: 'top' },
    back(P, g, geo, C) {
      const s = g.hairPart >= 0 ? 1 : -1, { cx, hw, eyeY } = geo, x = cx + s * hw * 0.95;
      for (let k = 0; k < 2; k++) P.shape([[x, eyeY - 30 + k * 8], [x + s * (16 + k * 6), eyeY + 40 + k * 20], [x + s * (6 + k * 6), eyeY + 74 + k * 18], [x - s * 6, eyeY + 10]], C.cloth[1], { w: 0.8 });
    },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl - 1;
      const d = P.shape([[cx - hw * 1.02, y + 12, true], [cx - hw * 1.05, top + 6], [cx - hw * 0.5, top - 12], [cx, top - 15], [cx + hw * 0.5, top - 12], [cx + hw * 1.05, top + 6], [cx + hw * 1.02, y + 12, true], [cx, y + 2]], C.cloth[1]);
      P.clip(d, () => { P.line([[cx, top - 16], [cx, y + 2]], { w: 0.5 }); P.hair(curve.ellipse(cx - hw * 0.45, top + 10, hw * 0.25, 18, 10, 0, -2.6, -1.5), 3 * P.lw, color.mix(C.cloth[1], C.white, 0.45)); });
      P.band([[cx - hw * 1.03, y + 8], [cx, y + 1], [cx + hw * 1.03, y + 8]], 5, C.cloth[1], { w: 0.5 });
    },
  });

  PM.define('headwear', 'jester-cap', {
    label: "Jester's cap",
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl - 2;
      // one solid outline: crown + three drooping horns, so nothing shows through between them
      const X = k => cx + hw * k;
      const pts = [
        [X(-1.06), y + 4, true], [X(-1.1), top + 18],
        [X(-1.45), top + 6], [X(-1.75), top + 16], [X(-1.92), top + 36, true],                    // left horn, lower edge → tip
        [X(-1.86), top - 4], [X(-1.45), top - 30], [X(-0.95), top - 28], [X(-0.42), top - 24, true],  // upper edge → valley
        [X(-0.4), top - 58], [X(-0.12), top - 92], [X(0.28), top - 106, true],                    // centre horn → tip
        [X(0.22), top - 78], [X(0.2), top - 48], [X(0.42), top - 24, true],
        [X(0.95), top - 28], [X(1.45), top - 30], [X(1.86), top - 4], [X(1.92), top + 36, true],    // right horn → tip
        [X(1.75), top + 16], [X(1.45), top + 6], [X(1.1), top + 18], [X(1.06), y + 4, true], [cx, y],
      ];
      const cap = P.shape(pts, C.cloth[1], { tension: 0.45 });
      // centre panel in the second colour — the classic two-tone motley
      const panel = [[X(-0.42), top - 24], [X(-0.7), top - 150], [X(0.7), top - 150], [X(0.42), top - 24], [X(0.16), y + 6], [X(-0.16), y + 6]];
      P.clip(cap, () => {
        P.fill(panel, C.cloth[2], { smooth: false, wob: 0 });
        P.line([panel[0], panel[5]], { w: 0.5, wob: 0.2 });
        P.line([panel[3], panel[4]], { w: 0.5, wob: 0.2 });
      });
      P.brush(cap, true, P.baseWidth({}), P.ink, {}); // re-ink the outline over the panel
      for (const [tx, ty] of [[X(-1.92), top + 36], [X(0.28), top - 106], [X(1.92), top + 36]]) {
        P.circle(tx, ty + 6, 6, C.metal, { w: 0.6, wob: 0 });
        P.line([[tx - 2, ty + 7], [tx + 2, ty + 7]], { w: 0.3, wob: 0 });
      }
      P.band([[X(-1.06), y + 4], [cx, y - 2], [X(1.06), y + 4]], 12, C.cloth[0], { w: 0.7, pattern: { id: 'harlequin', colors: [C.cloth[0], C.cloth[2], C.ink], scale: 0.5 } });
    },
  });

  // =================================================================== PATTERNS
  PM.define('patterns', 'harlequin', {
    draw(P, b, c, r, s) {
      P.ctx.fillStyle = c[0]; P.ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      const W = 26 * s, H = 36 * s;
      for (let y = b.y - H, row = 0; y < b.y + b.h + H; y += H / 2, row++) {
        for (let x = b.x - W + (row % 2 ? W / 2 : 0); x < b.x + b.w + W; x += W) {
          if ((Math.round(x / W) + row) % 2) P.fill([[x, y - H / 2, true], [x + W / 2, y, true], [x, y + H / 2, true], [x - W / 2, y, true]], c[1], { smooth: false, wob: 0 });
        }
      }
    },
  });

  // =================================================================== CLOTHING
  const N = () => PM.necklines;
  const fabric = (g, C) => ({ id: g.pattern, colors: [C.cloth[0], C.cloth[1], C.cloth[2]], scale: g.patternScale });
  function body(P, g, geo, C, neckline, o = {}) {
    return P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { pattern: o.plain ? null : (o.pattern || fabric(g, C)), w: 1 });
  }

  PM.define('clothing', 'graphic-tee', {
    label: 'Graphic tee',
    draw(P, g, geo, C) {
      const { neckX: x, neckBase: b } = geo, nl = N().round(geo, 12, 1.2), r = rng(g, 'tee');
      body(P, g, geo, C, nl, { plain: true });
      P.band(nl.map(p => [p[0], p[1] + 3]), 6, C.cloth[0], { w: 0.6 });
      const cx = x + r.range(-6, 6), cy = b + 92, kind = r.int(0, 3);
      if (kind === 0) { P.circle(cx, cy, 26, C.cloth[1], { w: 0.8 }); P.circle(cx, cy, 13, C.cloth[2], { w: 0.6 }); }
      else if (kind === 1) { P.shape([[cx - 8, cy - 30, true], [cx + 14, cy - 30, true], [cx + 2, cy - 4, true], [cx + 16, cy - 4, true], [cx - 12, cy + 30, true], [cx - 2, cy + 2, true], [cx - 16, cy + 2, true]], C.cloth[1], { smooth: false, w: 0.7 }); }
      else if (kind === 2) { for (let i = 0; i < 3; i++) P.band([[cx - 34, cy - 18 + i * 14], [cx + 34, cy - 18 + i * 14]], 8, [C.cloth[1], C.cloth[2], C.white][i], { w: 0.5, wob: 0.2 }); }
      else { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? 12 : 28; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, true]); } P.shape(pts, C.cloth[1], { smooth: false, w: 0.7 }); }
    },
  });

  function jacket(P, g, geo, C, col, o = {}) {
    const { neckX: x, nw, neckBase: b } = geo;
    for (const s of [-1, 1]) {
      const off = o.zipOffset && s > 0 ? o.zipOffset : 0;
      P.shape([[x + s * nw * 1.25, b - 4, true], [geo.cx + s * geo.sw * 0.76, b + 21], [geo.cx + s * geo.sw * 0.98, b + 56], [geo.cx + s * geo.sw * 1.05, geo.H + 30, true], [x + s * (o.gap || 18) + off, geo.H + 30, true], [x + s * (o.gap || 18) * 0.8 + off, b + (o.open || 40)]], col, { w: 0.9 });
      if (o.collar) P.shape([[x + s * nw * 1.25, b - 8, true], [x + s * nw * 2.5, b + 6], [x + s * nw * 1.9, b + 36, true], [x + s * (o.gap || 18) * 0.8 + off, b + (o.open || 40)], [x + s * nw * 1.05, b + 10]], o.collarCol || col, { w: 0.8, tension: 0.3 });
    }
  }
  PM.define('clothing', 'denim-jacket', {
    label: 'Denim jacket',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, denim = snap(g, '#4a6a96');
      body(P, g, geo, C, N().round(geo, 12, 1.2), { fill: C.cloth[1], plain: true });
      jacket(P, g, geo, C, denim, { collar: true, gap: 22 });
      for (const s of [-1, 1]) {
        const px = x + s * nw * 2.4;
        P.shape([[px - 14, b + 60, true], [px + 14, b + 60, true], [px + 14, b + 72, true], [px, b + 76], [px - 14, b + 72, true]], denim, { w: 0.6, tension: 0.2 });
        P.bead(px, b + 70, 2.2, C.metal, 0.5);
        P.line([[x + s * 22, b + 100], [geo.cx + s * geo.sw * 0.95, b + 92]], { w: 0.35, color: color.mix(denim, C.white, 0.5), wob: 0.2 });
      }
    },
  });
  PM.define('clothing', 'leather-jacket', {
    label: 'Leather biker jacket',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, leather = C.ink, sheen = color.mix(C.ink, C.paper, 0.3);
      body(P, g, geo, C, N().round(geo, 12, 1.2), { fill: C.cloth[1], plain: true });
      jacket(P, g, geo, C, leather, { collar: true, collarCol: leather, gap: 16, open: 36, zipOffset: 10 });
      P.line([[x + 26, b + 40], [x + 22, geo.H + 10]], { w: 0.5, color: C.metal, wob: 0.1 });
      for (const s of [-1, 1]) { P.hair([[x + s * nw * 2.2, b + 30], [x + s * nw * 2.6, b + 80]], 1.6 * P.lw, sheen); P.line([[x + s * nw * 1.6, b + 96], [x + s * nw * 2.8, b + 90]], { w: 0.45, color: C.metal, wob: 0 }); }
      for (const s of [-1, 1]) P.bead(x + s * nw * 2.3, b + 6, 2.2, C.metal, 0.5);
    },
  });
  PM.define('clothing', 'open-vest', {
    label: 'Open vest',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      for (const s of [-1, 1]) P.shape([[x + s * nw * 1.15, b - 2], [cx + s * sw * 0.76, b + 20], [cx + s * sw * 0.98, b + 56], [cx + s * sw * 1.05, H + 30, true], [x + s * nw * 1.6, H + 30, true], [x + s * nw * 1.5, b + 60]], C.cloth[0], { w: 0.9, pattern: g.pattern === 'plain' ? null : fabric(g, C) });
    },
  });
  PM.define('clothing', 'rags', {
    label: 'Patched rags',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw } = geo, r = rng(g, 'rags'), cloth = color.mix(C.cloth[0], '#8a7a5a', 0.5);
      const nl = [], n = 9;
      for (let i = 0; i <= n; i++) { const k = i / n, xx = lerp(x - nw * 1.4, x + nw * 1.4, k); nl.push([xx, b - 2 + Math.sin(Math.PI * k) * 18 + (i % 2 ? r.range(2, 6) : 0), i % 2 === 1]); }
      const d = body(P, g, geo, C, nl, { fill: cloth, plain: true });
      P.clip(d, () => {
        for (let i = 0; i < 4; i++) {
          const px = cx + r.range(-sw * 0.7, sw * 0.7), py = b + r.range(40, 160), w = r.range(18, 30), h = r.range(16, 26), col = [C.cloth[1], C.cloth[2], color.shade(cloth, -0.15)][i % 3];
          const pd = P.shape([[px, py, true], [px + w, py + r.range(-3, 3), true], [px + w + r.range(-3, 3), py + h, true], [px + r.range(-2, 2), py + h, true]], col, { w: 0.5, smooth: false });
          P.clip(pd, () => { for (let k = 3; k < w; k += 5) { P.line([[px + k, py - 2], [px + k, py + 3]], { w: 0.3, wob: 0 }); P.line([[px + k, py + h - 3], [px + k, py + h + 2]], { w: 0.3, wob: 0 }); } });
        }
        for (let i = 0; i < 5; i++) { const px = cx + r.range(-sw, sw), py = b + r.range(30, 180); P.line([[px, py], [px + r.range(-12, 12), py + r.range(10, 26)]], { w: 0.35, taper: 0.5 }); }
      });
      P.band([[cx - sw * 1.1, b + 150], [cx, b + 156], [cx + sw * 1.1, b + 150]], 6, snap(g, '#a68a5a'), { w: 0.5 });
    },
  });
  PM.define('clothing', 'motley', {
    label: "Jester's motley",
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, H } = geo;
      const d = body(P, g, geo, C, N().round(geo, 8, 1.2), { plain: true, fill: C.cloth[1] });
      P.clip(d, () => P.fill([[cx, b - 20], [cx + 400, b - 20], [cx + 400, H + 40], [cx, H + 40]], C.cloth[2], { smooth: false, wob: 0 }));
      const pts = [], n = 12, R = nw * 3.1;
      for (let i = 0; i <= n; i++) { const a = Math.PI * (1 - i / n), k = i % 2 ? 1 : 0.55; pts.push([x - Math.cos(a) * R * k, b + 4 + Math.sin(a) * 34 * k, i % 2 === 1]); }
      const collar = P.shape([[x - nw * 1.2, b - 4], ...pts, [x + nw * 1.2, b - 4]], C.cloth[0], { w: 0.8, pattern: { id: 'harlequin', colors: [C.cloth[0], C.cloth[1], C.ink], scale: 0.45 } });
      for (let i = 1; i <= n; i += 2) P.circle(pts[i][0], pts[i][1] + 5, 4, C.metal, { w: 0.5, wob: 0 });
      return collar;
    },
  });
  PM.define('clothing', 'armour', {
    label: 'Plate armour',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo, steel = snap(g, '#a9adb1'), dark = color.shade(steel, -0.25);
      body(P, g, geo, C, N().round(geo, 6, 1.2), { fill: C.cloth[1], plain: true });
      const plate = P.shape([[x - nw * 2.3, b + 18], [x, b + 10], [x + nw * 2.3, b + 18], [x + nw * 2.6, H + 30, true], [x - nw * 2.6, H + 30, true]], steel, { w: 1 });
      P.clip(plate, () => { P.line([[x, b + 14], [x, H + 20]], { w: 0.5 }); P.hair([[x - nw * 1.4, b + 40], [x - nw * 1.1, b + 140]], 4 * P.lw, color.mix(steel, C.white, 0.5)); });
      for (const s of [-1, 1]) {
        for (let k = 2; k >= 0; k--) P.shape([[cx + s * sw * (0.45 + k * 0.08), b + 8 + k * 14], [cx + s * sw * (0.85 + k * 0.05), b + 14 + k * 14], [cx + s * sw * (1.06 + k * 0.02), b + 44 + k * 14], [cx + s * sw * (0.62 + k * 0.08), b + 40 + k * 14]], k ? dark : steel, { w: 0.8 });
        P.bead(cx + s * sw * 0.66, b + 26, 2.2, C.metal, 0.5);
      }
      P.shape([[x - nw * 1.3, b - 10, true], [x + nw * 1.3, b - 10, true], [x + nw * 1.5, b + 16], [x, b + 22], [x - nw * 1.5, b + 16]], steel, { w: 0.8 });
      P.line([[x - nw * 1.4, b + 4], [x, b + 10], [x + nw * 1.4, b + 4]], { w: 0.4, wob: 0 });
    },
  });

  // =================================================================== NECKLACE & EXTRAS
  PM.define('necklaces', 'chain-link', {
    label: 'Chunky chain',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      const path = curve.open([[x - nw * 1.15, b - 12], [x - nw * 1.0, b + 14], [x, b + 30], [x + nw * 1.0, b + 14], [x + nw * 1.15, b - 12]], 0.5), n = 18;
      for (let i = 0; i <= n; i++) { const p = curve.at(path, i / n); P.ellipse(p.x, p.y, 4.4, 2.8, C.metal, { rot: Math.atan2(p.ty, p.tx) + (i % 2 ? 0.9 : 0), w: 0.5, wob: 0, n: 10 }); }
    },
  });
  PM.define('accessories', 'guitar-strap', {
    label: 'Guitar strap',
    layer: 'body',
    draw(P, g, geo, C) {
      const { cx, sw, neckX: x, neckBase: b, H } = geo;
      const path = [[cx - sw * 0.62, b + 12], [x + 10, b + 80], [cx + sw * 0.75, H + 20]];
      P.band(path, 16, C.cloth[2], { w: 0.7, pattern: { id: 'zigzag', colors: [C.cloth[2], C.cloth[1], C.ink], scale: 0.4 } });
    },
  });
  PM.define('accessories', 'grime', {
    label: 'Dirt smudges',
    layer: 'face',
    draw(P, g, geo, C) {
      const r = rng(g, 'grime'), col = color.mix(C.skin, '#3b2f25', 0.45);
      P.clip(geo.headInk || geo.headDense, () => {
        for (const [x, y] of [[geo.fx - geo.hw * 0.5, geo.noseY], [geo.fx + geo.hw * 0.42, geo.mouthY + 8], [geo.fx + geo.hw * 0.15, geo.hairlineY + 16]]) {
          for (let i = 0; i < 22; i++) P.dot(x + r.gauss(0, 6), y + r.gauss(0, 3.5), r.range(0.5, 1.6), col);
        }
      });
    },
  });
})(window.PM = window.PM || {});
