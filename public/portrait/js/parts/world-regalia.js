/* Court and traditional dress from around the world, used by the culture-specific
 * variants of the Roles (js/data/roles.js). Royal regalia here is the public, courtly kind —
 * crowns, diadems and robes of state. Sacred and ceremonial items are deliberately left out. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;
  const snap = (g, hex) => PM.styleSnap(g, hex);
  const gem = (P, x, y, r, col, C) => { P.bead(x, y, r, col, 0.7); P.dot(x - r * 0.3, y - r * 0.3, Math.max(0.6, r * 0.22), C.white); };
  const hatY = geo => geo.top + geo.hh * 0.32;

  // =================================================================== HEADWEAR
  PM.define('headwear', 'gold-diadem', {
    label: 'Gold diadem (Akan court)',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl } = geo, y = hl - 4;
      const pts = [[cx - hw * 1.04, y + 16], [cx - hw * 0.55, y + 2], [cx, y - 3], [cx + hw * 0.55, y + 2], [cx + hw * 1.04, y + 16]];
      P.band(pts, 12, C.metal, { w: 0.8 });
      const path = curve.open(pts, 0.3);
      for (let i = 1; i < 8; i++) {
        const p = curve.at(path, i / 8), big = i === 4;
        P.shape([[p.x - (big ? 9 : 5), p.y - 4], [p.x, p.y - (big ? 26 : 15), true], [p.x + (big ? 9 : 5), p.y - 4]], C.metal, { w: 0.6, wob: 0 });
        if (big) { P.circle(p.x, p.y - 12, 5, C.metal, { w: 0.5, wob: 0 }); P.circle(p.x, p.y - 12, 2.4, C.cloth[1], { w: 0.3, wob: 0 }); }
        else P.dot(p.x, p.y, 1.6, C.ink);
      }
    },
  });

  PM.define('headwear', 'phoenix-crown', {
    label: 'Phoenix crown',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl;
      const d = P.shape([[cx - hw * 1.04, y + 4, true], [cx - hw * 1.14, top - 10], [cx - hw * 0.7, top - 40], [cx, top - 50], [cx + hw * 0.7, top - 40], [cx + hw * 1.14, top - 10], [cx + hw * 1.04, y + 4, true], [cx, y - 2]], C.cloth[1], { pattern: { id: 'clouds', colors: [C.cloth[1], C.metal, C.cloth[2]], scale: 0.45 } });
      // phoenixes: swept wings of gold either side
      for (const s of [-1, 1]) {
        const bx = cx + s * hw * 0.55, by = top - 20;
        P.shape([[bx, by], [bx + s * 30, by - 22], [bx + s * 48, by - 10], [bx + s * 30, by - 4], [bx + s * 52, by + 8], [bx + s * 22, by + 6]], C.metal, { w: 0.6 });
        for (let k = 0; k < 4; k++) { const x = cx + s * hw * (1.08 + k * 0.02), yy = y - 6 - k * 14; P.line([[x, yy], [x + s * 4, yy + 26]], { w: 0.3, color: C.metal, wob: 0 }); P.bead(x + s * 4, yy + 28, 2.2, C.white, 0.5); }
      }
      P.shape([[cx, top - 62, true], [cx + 8, top - 48], [cx, top - 36, true], [cx - 8, top - 48]], C.metal, { w: 0.6, wob: 0 });
      gem(P, cx, top - 48, 3.4, C.cloth[2], C);
      for (let i = -5; i <= 5; i++) { const x = cx + i * hw * 0.17; for (let k = 0; k < 2; k++) P.bead(x, y + 3 + k * 4 + Math.abs(i) * 0.4, 1.6, C.white, 0.4); }
      return d;
    },
  });

  PM.define('headwear', 'topknot-crown', {
    label: 'Topknot crown (guan)',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, top } = geo, y = top - 6 * g.hairVolume;
      P.circle(cx, y - 8, 15, C.hair, { w: 0.8 });
      P.shape([[cx - 15, y - 2, true], [cx - 17, y - 22], [cx, y - 30], [cx + 17, y - 22], [cx + 15, y - 2, true]], C.metal, { w: 0.8 });
      P.band([[cx - 36, y - 12], [cx + 36, y - 16]], 3.4, C.metal, { w: 0.4 });
      gem(P, cx + 36, y - 16, 3, C.cloth[1], C);
    },
  });

  PM.define('headwear', 'gat', {
    label: 'Gat (horsehair hat)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 2, sheer = color.mix(C.ink, C.paper, 0.55);
      P.shape([[cx - hw * 0.5, y1 - 2, true], [cx - hw * 0.48, top - 52, true], [cx + hw * 0.48, top - 52, true], [cx + hw * 0.5, y1 - 2, true]], sheer, { tension: 0.2, w: 0.8 });
      P.shape(curve.ellipse(cx, top - 52, hw * 0.48, 6, 16), color.mix(C.ink, C.paper, 0.35), { w: 0.6, dense: true });
      P.band([[cx - hw * 0.5, y1 - 8], [cx + hw * 0.5, y1 - 8]], 6, C.ink, { w: 0.4 });
      P.shape(curve.ellipse(cx, y1, hw * 1.65, 9, 22), sheer, { w: 0.8, dense: true });
      for (const s of [-1, 1]) { const x = cx + s * hw * 0.9; P.line([[x, y1 + 4], [x - s * 6, geo.chinY + 8]], { w: 0.3, wob: 0 }); }
      for (let i = 0; i < 9; i++) P.bead(geo.fx + Math.sin(i / 8 * Math.PI) * 4 - 2 + (i - 4) * 1.5, geo.chinY + 10 + i * 5, 2, C.cloth[2], 0.4);
    },
  });

  PM.define('headwear', 'futou', {
    label: 'Futou (winged court cap)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 4, cap = C.ink;
      for (const s of [-1, 1]) P.band([[cx + s * hw * 0.7, top - 14], [cx + s * hw * 1.9, top - 20]], 8, cap, { w: 0.5 });
      P.shape([[cx - hw * 0.98, y1, true], [cx - hw * 0.96, top - 6], [cx - hw * 0.55, top - 18], [cx - hw * 0.45, top - 38], [cx, top - 44], [cx + hw * 0.45, top - 38], [cx + hw * 0.55, top - 18], [cx + hw * 0.96, top - 6], [cx + hw * 0.98, y1, true], [cx, y1 + 4]], cap);
      P.line([[cx - hw * 0.55, top - 16], [cx + hw * 0.55, top - 16]], { w: 0.5, color: color.mix(cap, C.paper, 0.3), wob: 0 });
    },
  });

  PM.define('headwear', 'maang-tikka', {
    label: 'Maang tikka',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl, fx } = geo, px = cx + g.hairPart * hw * 0.45 * 0.5;
      const chain = curve.open([[px, top - 2], [lerp(px, fx, 0.5), lerp(top, hl, 0.5)], [fx, hl + 8]], 0.3);
      for (let i = 0; i <= 14; i++) { const p = curve.at(chain, i / 14); P.dot(p.x, p.y, 1.3, C.metal); }
      P.shape([[fx, hl + 8, true], [fx + 7, hl + 15], [fx, hl + 27, true], [fx - 7, hl + 15]], C.metal, { w: 0.6, wob: 0 });
      gem(P, fx, hl + 16, 3.2, C.cloth[1], C);
      for (const k of [-4, 0, 4]) P.bead(fx + k, hl + 30 + Math.abs(k) * -0.5, 1.6, C.white, 0.4);
    },
  });

  PM.define('headwear', 'spire-crown', {
    label: 'Chada (spire crown)',
    hides: { hair: 'all', ears: false },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl + 2;
      const d = P.shape([[cx - hw * 1.0, y + 6, true], [cx - hw * 1.04, top + 10], [cx - hw * 0.7, top - 20], [cx - hw * 0.32, top - 60], [cx - hw * 0.12, top - 120], [cx, top - 150, true], [cx + hw * 0.12, top - 120], [cx + hw * 0.32, top - 60], [cx + hw * 0.7, top - 20], [cx + hw * 1.04, top + 10], [cx + hw * 1.0, y + 6, true], [cx, y]], C.metal);
      P.clip(d, () => {
        for (let k = 0; k < 6; k++) { const yy = top - k * 24; P.band([[cx - hw * 1.2, yy + 6], [cx, yy - 4], [cx + hw * 1.2, yy + 6]], 5, color.shade(C.metal, -0.15), { w: 0.4 }); }
        for (let k = 0; k < 7; k++) gem(P, cx + (k % 2 ? 6 : -6), top - 10 - k * 18, 2.2, k % 2 ? C.cloth[1] : C.white, C);
      });
      for (const s of [-1, 1]) P.shape([[cx + s * hw * 0.95, y - 10], [cx + s * hw * 1.4, y - 30, true], [cx + s * hw * 1.3, y + 8], [cx + s * hw * 1.0, y + 12]], C.metal, { w: 0.6 });
      P.band([[cx - hw * 1.0, y + 2], [cx, y - 2], [cx + hw * 1.0, y + 2]], 8, C.cloth[1], { w: 0.6, pattern: { id: 'beadwork', colors: [C.cloth[1], C.metal, C.white], scale: 0.45 } });
    },
  });

  PM.define('headwear', 'fur-crown', {
    label: 'Fur-rimmed crown',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = top + geo.hh * 0.22;
      const d = P.shape([[cx - hw * 0.85, y1 - 8, true], [cx - hw * 0.82, top - 28], [cx - hw * 0.4, top - 52], [cx, top - 58], [cx + hw * 0.4, top - 52], [cx + hw * 0.82, top - 28], [cx + hw * 0.85, y1 - 8, true]], C.metal);
      P.clip(d, () => { for (const u of [-0.5, 0, 0.5]) P.line([[cx + u * hw * 0.8, y1], [cx + u * hw * 0.3, top - 56]], { w: 0.5, wob: 0 }); for (let i = 0; i < 6; i++) gem(P, cx + (i - 2.5) * hw * 0.28, top - 18 - (i % 2) * 14, 2.6, [C.cloth[1], C.cloth[2], C.white][i % 3], C); });
      P.line([[cx, top - 58], [cx, top - 74]], { w: 0.6, wob: 0 });
      P.circle(cx, top - 76, 4.5, C.metal, { w: 0.5, wob: 0 });
      const fur = snap(g, '#6b4a2e'), rim = P.band([[cx - hw * 1.08, y1 - 6], [cx, y1 - 2], [cx + hw * 1.08, y1 - 6]], 20, fur, { w: 0.9 });
      const r = new PM.RNG(PM.hashString(g.seed + 'furcrown'));
      P.clip(rim, () => { for (let i = 0; i < 50; i++) { const x = r.range(cx - hw * 1.1, cx + hw * 1.1), yy = r.range(y1 - 16, y1 + 4); P.hair([[x, yy], [x + r.range(-2, 2), yy + 5]], 0.8, color.shade(fur, -0.35)); } });
    },
  });

  PM.define('headwear', 'fringe-band', {
    label: 'Royal fringe headband (Andean)',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl, fx } = geo, y = hl + 2;
      P.band([[cx - hw * 1.04, y + 16], [cx - hw * 0.5, y + 1], [cx, y - 2], [cx + hw * 0.5, y + 1], [cx + hw * 1.04, y + 16]], 9, C.cloth[1], { w: 0.7, pattern: { id: 'chevron-bands', colors: [C.cloth[1], C.cloth[2], C.metal], scale: 0.4 } });
      const red = snap(g, '#a8302a');
      for (let i = -5; i <= 5; i++) { const x = fx + i * 3.6; P.band([[x, y + 3], [x, y + 22 - Math.abs(i) * 0.6]], 3.6, red, { w: 0.35, wob: 0 }); }
      P.shape([[fx - 18, y + 1], [fx - 18, y - 22, true], [fx, y - 10], [fx + 18, y - 22, true], [fx + 18, y + 1]], C.metal, { w: 0.6, wob: 0 });
    },
  });

  // =================================================================== CLOTHING
  const N = () => PM.necklines;
  const fabric = (g, C) => ({ id: g.pattern, colors: [C.cloth[0], C.cloth[1], C.cloth[2]], scale: g.patternScale });
  function body(P, g, geo, C, neckline, o = {}) {
    return P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { pattern: o.plain ? null : fabric(g, C), w: 1 });
  }

  PM.define('clothing', 'agbada', {
    label: 'Agbada (grand robe)',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      body(P, g, geo, C, N().round(geo, 10, 1.2), { expand: 30 });
      P.shape([[x - nw * 1.25, b - 2, true], [x - nw * 0.9, b + 10], [x, b + 14], [x + nw * 0.9, b + 10], [x + nw * 1.25, b - 2, true], [x + nw * 2.0, b + 30], [x + nw * 1.6, b + 120, true], [x, b + 140], [x - nw * 1.6, b + 120, true], [x - nw * 2.0, b + 30]], C.cloth[1],
        { w: 0.8, pattern: { id: g.trim, colors: [C.cloth[1], C.metal, C.cloth[2]], scale: 0.55 } });
      for (let i = 0; i < 3; i++) P.line([[x - nw * (1.1 - i * 0.2), b + 34 + i * 26], [x, b + 46 + i * 26], [x + nw * (1.1 - i * 0.2), b + 34 + i * 26]], { w: 0.4, color: C.metal, wob: 0.2 });
    },
  });

  PM.define('clothing', 'bisht', {
    label: 'Thobe & bisht cloak',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      body(P, g, geo, C, N().round(geo, 6, 1.15), { fill: C.white, plain: true });
      P.line([[x, b + 8], [x, b + 70]], { w: 0.4 });
      for (const s of [-1, 1]) {
        P.shape([[x + s * nw * 1.4, b - 2], [cx + s * sw * 0.8, b + 18], [cx + s * sw * 1.02, b + 56], [cx + s * sw * 1.1, H + 30, true], [x + s * nw * 2.0, H + 30, true], [x + s * nw * 1.7, b + 40]], C.cloth[0], { w: 0.9 });
        P.band([[x + s * nw * 1.45, b - 2], [x + s * nw * 1.75, b + 40], [x + s * nw * 2.05, H + 20]], 8, C.metal, { w: 0.5, pattern: { id: 'cross-stitch', colors: [C.metal, C.cloth[0], C.ink], scale: 0.35 } });
      }
    },
  });

  PM.define('clothing', 'sherwani', {
    label: 'Sherwani',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo;
      body(P, g, geo, C, N().round(geo, 4, 1.15));
      P.shape([[x - nw * 1.18, b - 10, true], [x - nw * 1.15, b + 6], [x, b + 10], [x + nw * 1.15, b + 6], [x + nw * 1.18, b - 10, true], [x, b - 3]], C.cloth[1], { w: 0.7, pattern: { id: g.trim, colors: [C.cloth[1], C.metal, C.cloth[2]], scale: 0.4 } });
      P.band([[x + 4, b + 10], [x + 4, H + 20]], 9, C.cloth[1], { w: 0.5, pattern: { id: g.trim, colors: [C.cloth[1], C.metal, C.cloth[2]], scale: 0.4 } });
      for (let i = 0; i < 6; i++) P.bead(x + 4, b + 22 + i * 22, 2.6, C.metal, 0.5);
    },
  });
})(window.PM = window.PM || {});
