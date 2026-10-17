/* Headwear. Each def may provide:
 *   hides: { hair: 'all' | 'top' | 'none', ears: bool, earrings: bool }
 *     'top' squashes hair volume so the hat sits on the head; 'all' skips hair entirely.
 *   back(P, g, geo, C)   drawn behind the head (drapes, knots)
 *   front(P, g, geo, C)  drawn over the hair
 *   late(P, g, geo, C)   drawn after jewellery (veils)
 */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;

  const edge = (geo, y, s) => { const w = geo.widthAt(y); return s > 0 ? w.r : w.l; };
  const fabric = (g, C, id) => ({ id: id || g.pattern, colors: [C.cloth[1], C.cloth[2], C.cloth[0]], scale: g.patternScale * 0.8 });
  const hRng = (g, k) => new PM.RNG(PM.hashString(g.seed + ':hw:' + k));
  const hairTop = (geo, g) => geo.top - 6 * g.hairVolume;

  PM.define('headwear', 'none', { label: 'None', hides: { hair: 'none' } });

  PM.define('headwear', 'gele', {
    label: 'Gele (sculpted wrap)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, r = hRng(g, 'gele'), s = g.hairPart >= 0 ? 1 : -1, H = 70 + 30 * g.hairVolume;
      const fan = [
        [cx - s * hw * 1.18, hl - 4], [cx - s * hw * 1.5, top - H * 0.25], [cx - s * hw * 1.05, top - H * 0.8], [cx - s * hw * 0.15, top - H],
        [cx + s * hw * 0.75, top - H * 0.9], [cx + s * hw * 1.55, top - H * 0.45], [cx + s * hw * 1.32, hl - 2],
      ];
      const band = [[cx + s * hw * 1.03, geo.ears[0].top + 2], [cx + s * hw * 0.55, hl + 9], [cx, hl + 11], [cx - s * hw * 0.55, hl + 9], [cx - s * hw * 1.03, geo.ears[0].top + 2]];
      const pts = s > 0 ? [...fan, ...band] : [...fan, ...band].map(p => p); // already mirrored by s
      const d = P.shape(pts, C.cloth[1], { pattern: fabric(g, C) });
      // pleats radiate from the knot
      const kx = cx + s * hw * 0.25, ky = hl - 4;
      P.clip(d, () => {
        for (let i = 0; i < 9; i++) {
          const a = lerp(-Math.PI + 0.25, -0.15, (i + r.range(0.2, 0.8)) / 9);
          P.line([[kx, ky], [kx + Math.cos(a) * H * 0.7, ky + Math.sin(a) * H * 0.9], [kx + Math.cos(a) * H * 1.6, ky + Math.sin(a) * H * 1.6]], { w: 0.55, taper: 0.4 });
        }
      });
      P.line([[cx - hw * 0.95, hl + 1], [cx, hl - 3], [cx + hw * 0.95, hl + 1]], { w: 0.6, taper: 0.3 });
    },
  });

  PM.define('headwear', 'headwrap', {
    label: 'Headwrap',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, T = 22 + 14 * g.hairVolume;
      const pts = [[cx - hw * 1.04, geo.ears[0].top], [cx - hw * 1.14, top + 20], [cx - hw * 0.82, top - T], [cx, top - T - 8], [cx + hw * 0.82, top - T], [cx + hw * 1.14, top + 20], [cx + hw * 1.04, geo.ears[0].top],
        [cx + hw * 0.7, hl + 9], [cx, hl + 12], [cx - hw * 0.7, hl + 9]];
      const d = P.shape(pts, C.cloth[1], { pattern: fabric(g, C) });
      P.clip(d, () => {
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P.line([[cx + s * hw * 1.1, top + 26 - i * 16], [cx + s * hw * 0.5, top - 4 - i * 10], [cx - s * hw * 0.05, top - T * 0.55 - i * 4]], { w: 0.55, taper: 0.4 });
      });
      P.shape([[cx - 9, top - T * 0.45], [cx - 5, top - T - 6], [cx + 6, top - T - 4], [cx + 10, top - T * 0.4], [cx, top - T * 0.2]], C.cloth[1], { w: 0.8, pattern: fabric(g, C) });
    },
  });

  PM.define('headwear', 'fila', {
    label: 'Fila (soft cap)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, s = g.hairPart >= 0 ? 1 : -1, y0 = hl - 4;
      const pts = [[cx - s * hw * 1.0, y0 + 4], [cx - s * hw * 1.04, top + 4], [cx - s * hw * 0.3, top - 26], [cx + s * hw * 0.85, top - 30], [cx + s * hw * 1.45, top - 2], [cx + s * hw * 1.08, top + 14], [cx + s * hw * 1.0, y0 + 4], [cx, y0 + 7]];
      const d = P.shape(pts, C.cloth[1], { pattern: fabric(g, C) });
      P.clip(d, () => P.line([[cx + s * hw * 0.2, top - 20], [cx + s * hw * 0.9, top - 4], [cx + s * hw * 1.08, top + 14]], { w: 0.6 }));
    },
  });

  PM.define('headwear', 'turban', {
    label: 'Turban (peaked)',
    hides: { hair: 'top', ears: false },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, T = 40;
      const pts = [[cx - hw * 1.08, geo.ears[0].top - 4], [cx - hw * 1.16, top + 14], [cx - hw * 0.86, top - T * 0.65], [cx, top - T, true], [cx + hw * 0.86, top - T * 0.65], [cx + hw * 1.16, top + 14], [cx + hw * 1.08, geo.ears[0].top - 4],
        [cx + hw * 0.55, hl + 4], [cx, hl + 14, true], [cx - hw * 0.55, hl + 4]];
      const d = P.shape(pts, C.cloth[1]);
      P.clip(d, () => {
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
          const k = i * 13;
          P.line([[cx + s * hw * 1.2, geo.ears[0].top - 10 - k], [cx + s * hw * 0.6, top + 4 - k * 0.8], [cx, hl + 12 - k * 1.1]], { w: 0.6, taper: 0.4 });
        }
      });
    },
  });

  PM.define('headwear', 'hijab', {
    hides: { hair: 'all', ears: true, earrings: true },
    front(P, g, geo, C) {
      const { cx, hw, hh, top, eyeY, mouthY, chinY, fx, neckX, nw, neckBase, sw, H } = geo;
      const side = s => [[cx + s * hw * 1.2, top + hh * 0.3], [cx + s * hw * 1.24, eyeY + 10], [cx + s * hw * 1.12, chinY + 4], [neckX + s * nw * 2.5, neckBase + 4], [cx + s * sw * 0.98, neckBase + 42], [cx + s * sw * 1.08, H + 30, true]];
      const outer = [[cx, top - 15], ...side(1), ...side(-1).reverse()];
      const opening = [[fx, geo.hairlineY - 4], [cx + hw * 0.84, geo.hairlineY + hh * 0.12], [edge(geo, eyeY, 1) - 3, eyeY], [edge(geo, mouthY, 1) - 2, mouthY], [fx + hw * 0.3, chinY + 1], [fx, chinY + 5],
        [fx - hw * 0.3, chinY + 1], [edge(geo, mouthY, -1) + 2, mouthY], [edge(geo, eyeY, -1) + 3, eyeY], [cx - hw * 0.84, geo.hairlineY + hh * 0.12]];
      P.ring(outer, opening, C.cloth[1], { pattern: g.pattern === 'plain' ? null : fabric(g, C) });
      for (const s of [-1, 1]) {
        P.line([[fx + s * hw * 0.35, chinY + 10], [neckX + s * nw * 1.6, neckBase], [cx + s * sw * 0.6, H - 20]], { w: 0.5, taper: 0.5 });
        P.line([[cx + s * hw * 1.0, eyeY + 30], [cx + s * hw * 1.05, chinY + 18]], { w: 0.45, taper: 0.5 });
      }
    },
  });

  PM.define('headwear', 'keffiyeh', {
    label: 'Keffiyeh & agal',
    hides: { hair: 'all', ears: true, earrings: true },
    front(P, g, geo, C) {
      const { cx, hw, hh, top, eyeY, chinY, neckX, nw, neckBase, sw, H, hairlineY: hl } = geo;
      const outer = s => [[cx + s * hw * 1.14, top + hh * 0.3], [cx + s * hw * 1.24, eyeY + 14], [cx + s * hw * 1.34, chinY + 4], [cx + s * sw * 0.92, neckBase + 34], [cx + s * sw * 0.98, H + 30, true]];
      const inner = s => [[neckX + s * nw * 2.3, H + 30, true], [neckX + s * nw * 1.5, neckBase + 8], [edge(geo, chinY - hh * 0.18, s) + s * 5, chinY - hh * 0.18], [edge(geo, eyeY, s) + s * 2, eyeY], [cx + s * hw * 0.86, hl + 2]];
      const pts = [[cx, top - 12], ...outer(1), ...inner(1), [cx, hl - 4], ...inner(-1).reverse(), ...outer(-1).reverse()];
      const red = PM.hashString(g.seed + 'kef') % 2 ? PM.styleSnap(g, '#a8302a') : C.ink;
      P.shape(pts, C.white, { pattern: { id: 'keffiyeh', colors: [C.white, red], scale: 1 } });
      for (const k of [0, 8]) P.band([[cx - hw * 1.16, top + hh * 0.42 - k], [cx, top + hh * 0.14 - k], [cx + hw * 1.16, top + hh * 0.42 - k]], 6, C.ink, { w: 0.4 });
    },
  });

  function cap(P, g, geo, C, o) {
    const { cx, hw, hh, top } = geo, y1 = top + hh * (o.depth || 0.32), lift = o.lift || 12, w = o.width || 0.95;
    const pts = [[cx - hw * w, y1, true], [cx - hw * (w - 0.06), top - lift * 0.5, o.square], [cx, top - lift], [cx + hw * (w - 0.06), top - lift * 0.5, o.square], [cx + hw * w, y1, true], [cx, y1 + 7]];
    const d = P.shape(pts, o.fill, { pattern: o.pattern });
    if (o.trim) P.clip(d, () => P.band([[cx - hw * 1.1, y1 - 2], [cx, y1 + 4], [cx + hw * 1.1, y1 - 2]], 9, C.cloth[2], { w: 0.5, pattern: { id: o.trim, colors: [C.cloth[2], C.cloth[1], C.ink], scale: 0.5 } }));
    return d;
  }
  PM.define('headwear', 'kufi', {
    label: 'Kufi / taqiyah',
    hides: { hair: 'top' },
    front(P, g, geo, C) { cap(P, g, geo, C, { fill: C.cloth[1], pattern: fabric(g, C), trim: g.trim }); },
  });
  PM.define('headwear', 'doppa', {
    label: 'Doppa (square cap)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const d = cap(P, g, geo, C, { fill: C.ink, square: true, lift: 14, depth: 0.28 });
      const { cx, hw, top } = geo;
      for (const x of [-0.55, 0, 0.55]) P.ellipse(cx + x * hw, top + 4, 5, 9, C.white, { stroke: false, rot: x * 0.6, wob: 0.2 });
      return d;
    },
  });
  PM.define('headwear', 'pakol', {
    label: 'Pakol (rolled cap)',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hh } = geo, wool = PM.styleSnap(g, '#b59a73'), y1 = top + hh * 0.3;
      P.shape([[cx - hw * 1.05, y1 - 6], [cx - hw * 1.08, top - 22], [cx, top - 27], [cx + hw * 1.08, top - 22], [cx + hw * 1.05, y1 - 6]], wool);
      P.band([[cx - hw * 1.08, y1 - 4], [cx, y1 + 3], [cx + hw * 1.08, y1 - 4]], 15, color.shade(wool, -0.1), { w: 0.9 });
    },
  });
  PM.define('headwear', 'kippah', {
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw } = geo, y = hairTop(geo, g) + 3;
      P.shape([[cx - hw * 0.45, y + 6], [cx - hw * 0.3, y - 3], [cx, y - 6], [cx + hw * 0.3, y - 3], [cx + hw * 0.45, y + 6], [cx, y + 8]], C.cloth[1], { w: 0.8, pattern: { id: g.trim, colors: [C.cloth[1], C.cloth[2], C.ink], scale: 0.5 } });
    },
  });
  PM.define('headwear', 'conical-hat', {
    label: 'Conical hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl, chinY, fx } = geo, straw = PM.styleSnap(g, '#d8b56a'), y = hl + 4, R = hw * 1.95;
      for (const s of [-1, 1]) P.line([[cx + s * hw * 0.9, y + 4], [fx + s * hw * 0.55, chinY - 4], [fx, chinY + 4]], { w: 0.4, taper: 0.1 });
      const d = P.shape([[cx, top - 92, true], [cx + R, y - 2, true], [cx, y + 8], [cx - R, y - 2, true]], straw, { tension: 0.4 });
      P.clip(d, () => { for (let i = -6; i <= 6; i++) P.line([[cx, top - 92], [cx + i * R / 6.3, y + 4]], { w: 0.3, taper: 0.6, wob: 0.2 }); });
      P.line([[cx - R, y - 2], [cx, y + 8], [cx + R, y - 2]], { w: 1.1 });
    },
  });
  PM.define('headwear', 'fur-hat', {
    label: 'Fur-trimmed hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl - 6;
      P.shape([[cx - hw * 0.95, y], [cx - hw * 0.7, top - 34], [cx, top - 52, true], [cx + hw * 0.7, top - 34], [cx + hw * 0.95, y]], C.cloth[1], { pattern: fabric(g, C, g.trim) });
      const fur = PM.styleSnap(g, '#7a5634'), pts = [];
      const n = 14;
      for (let i = 0; i <= n; i++) { const x = lerp(cx - hw * 1.25, cx + hw * 1.25, i / n); pts.push([x, y - 18 - (i % 2 ? 4 : 0) - Math.sin(Math.PI * i / n) * 8]); }
      for (let i = n; i >= 0; i--) { const x = lerp(cx - hw * 1.18, cx + hw * 1.18, i / n); pts.push([x, y + 8 + (i % 2 ? 3 : 0) - Math.sin(Math.PI * i / n) * 4]); }
      const d = P.shape(pts, fur);
      P.clip(d, () => { const r = hRng(g, 'fur'); for (let i = 0; i < 40; i++) { const x = r.range(cx - hw * 1.2, cx + hw * 1.2), yy = r.range(y - 22, y + 6); P.hair([[x, yy], [x + r.range(-2, 2), yy + 5]], 0.8, color.shade(fur, -0.35)); } });
    },
  });
  PM.define('headwear', 'chullo', {
    hides: { hair: 'top', ears: true, earrings: true },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl, ears, mouthY } = geo, pat = { id: 'chevron-bands', colors: [C.cloth[1], C.cloth[2], C.cloth[0]], scale: g.patternScale * 0.7 };
      for (const s of [-1, 1]) {
        const x = cx + s * hw * 1.02;
        P.shape([[x - s * 8, ears[0].top - 8], [x + s * 10, ears[0].top - 6], [x + s * 8, ears[0].bot + 8], [x, ears[0].bot + 14], [x - s * 10, ears[0].bot]], C.cloth[1], { pattern: pat });
        P.line([[x, ears[0].bot + 14], [x + s * 4, mouthY + 50]], { w: 0.6, taper: 0.1 });
        P.circle(x + s * 4, mouthY + 54, 5, C.cloth[2], { w: 0.6 });
      }
      P.shape([[cx - hw * 1.1, ears[0].top - 4], [cx - hw * 1.12, top - 6], [cx, top - 28], [cx + hw * 1.12, top - 6], [cx + hw * 1.1, ears[0].top - 4], [cx + hw * 0.6, hl + 2], [cx, hl + 4], [cx - hw * 0.6, hl + 2]], C.cloth[1], { pattern: pat });
      P.circle(cx, top - 32, 9, C.cloth[2], { w: 0.8 });
    },
  });
  PM.define('headwear', 'beanie', {
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl - 2;
      P.shape([[cx - hw * 1.05, y], [cx - hw * 1.05, top - 4], [cx, top - 30], [cx + hw * 1.05, top - 4], [cx + hw * 1.05, y]], C.cloth[1]);
      const d = P.band([[cx - hw * 1.12, y - 4], [cx, y + 2], [cx + hw * 1.12, y - 4]], 15, C.cloth[1]);
      P.clip(d, () => { for (let x = cx - hw * 1.1; x < cx + hw * 1.1; x += 5) P.hair([[x, y - 14], [x, y + 10]], 0.8, C.ink); });
    },
  });
  PM.define('headwear', 'headscarf', {
    label: 'Headscarf (tied)',
    hides: { hair: 'top', ears: true },
    back(P, g, geo, C) {
      const s = g.hairPart >= 0 ? 1 : -1, { cx, hw, eyeY, hh } = geo, x = cx + s * hw * 1.12, y = eyeY + hh * 0.42;
      P.shape([[x, y], [x + s * 14, y + 30], [x + s * 2, y + 52], [x - s * 6, y + 12]], C.cloth[1], { pattern: fabric(g, C) });
    },
    front(P, g, geo, C) {
      const { cx, hw, hh, top, eyeY, hairlineY: hl } = geo, yb = eyeY + hh * 0.42;
      const pts = [[cx - hw * 1.1, yb], [cx - hw * 1.2, top + hh * 0.3], [cx, top - 14], [cx + hw * 1.2, top + hh * 0.3], [cx + hw * 1.1, yb],
        [edge(geo, yb, 1) - 1, yb, true], [edge(geo, eyeY - hh * 0.1, 1) - 1, eyeY - hh * 0.1], [cx + hw * 0.75, hl + 4], [cx, hl - 2], [cx - hw * 0.75, hl + 4], [edge(geo, eyeY - hh * 0.1, -1) + 1, eyeY - hh * 0.1], [edge(geo, yb, -1) + 1, yb, true]];
      P.shape(pts, C.cloth[1], { pattern: fabric(g, C) });
    },
  });
  PM.define('headwear', 'tagelmust', {
    label: 'Tagelmust (veil)',
    hides: { hair: 'all', ears: true, earrings: true },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl, ears } = geo, indigo = PM.styleSnap(g, '#2b3a67');
      P.shape([[cx - hw * 1.12, ears[0].bot], [cx - hw * 1.2, top + 10], [cx - hw * 0.85, top - 34], [cx, top - 40], [cx + hw * 0.85, top - 34], [cx + hw * 1.2, top + 10], [cx + hw * 1.12, ears[0].bot],
        [cx + hw * 0.8, hl + 16], [cx, hl + 20], [cx - hw * 0.8, hl + 16]], indigo);
      for (let i = 0; i < 3; i++) P.line([[cx - hw * 1.1, top + 18 - i * 14], [cx, top - 6 - i * 10], [cx + hw * 1.1, top + 18 - i * 14]], { w: 0.5, taper: 0.4 });
    },
    late(P, g, geo, C) {
      const { cx, hw, eyeY, eh, chinY, neckX, nw, neckBase, ears } = geo, indigo = PM.styleSnap(g, '#2b3a67'), y = eyeY + eh * 2.6;
      P.shape([[cx - hw * 1.14, ears[0].top + 4], [cx - hw * 0.6, y + 2], [geo.fx, y - 1], [cx + hw * 0.6, y + 2], [cx + hw * 1.14, ears[0].top + 4], [cx + hw * 1.2, chinY], [neckX + nw * 1.9, neckBase + 18], [neckX - nw * 1.9, neckBase + 18], [cx - hw * 1.2, chinY]], indigo);
      P.line([[cx - hw * 0.9, y + 22], [geo.fx, y + 18], [cx + hw * 0.9, y + 22]], { w: 0.45, taper: 0.4 });
    },
  });
  PM.define('headwear', 'coin-band', {
    label: 'Coin headband',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl } = geo, pts = [[cx - hw * 1.02, hl + 22], [cx - hw * 0.55, hl + 3], [cx, hl - 1], [cx + hw * 0.55, hl + 3], [cx + hw * 1.02, hl + 22]];
      const d = P.band(pts, 5, C.metal, { w: 0.6 });
      const c = curve.open(pts, 0.3);
      for (let i = 1; i < 14; i++) { const p = curve.at(c, i / 14); P.ctx.lineWidth = 0.8; P.hair([[p.x, p.y], [p.x, p.y + 5]], 0.8, C.ink); P.circle(p.x, p.y + 8, 3.2, C.metal, { w: 0.4, wob: 0, n: 10 }); }
      return d;
    },
  });
  PM.define('headwear', 'bead-band', {
    label: 'Beaded headband',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl } = geo, pts = [[cx - hw * 1.03, hl + 20], [cx - hw * 0.5, hl + 1], [cx, hl - 3], [cx + hw * 0.5, hl + 1], [cx + hw * 1.03, hl + 20]];
      P.band(pts, 9, C.cloth[1], { w: 0.7, pattern: { id: 'beadwork', colors: [C.cloth[1], C.cloth[2], C.metal], scale: 0.6 } });
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const x = cx + s * (hw * 1.0 + k * 3), y = hl + 22;
        for (let j = 0; j < 7; j++) P.bead(x, y + j * 5, 2.2, [C.cloth[2], C.metal, C.white][(j + k) % 3], 0.5);
      }
    },
  });
  PM.define('headwear', 'jasmine', {
    label: 'Jasmine string',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const s = g.hairPart >= 0 ? -1 : 1, { cx, hw, top, ears, chinY } = geo, white = PM.styleSnap(g, '#f7f1e3');
      const path = curve.open([[cx + s * hw * 0.5, top + 2], [cx + s * hw * 1.15, ears[0].top], [cx + s * hw * 1.25, chinY + 20]], 0.3);
      for (let i = 0; i < 16; i++) { const p = curve.at(path, i / 15); P.ellipse(p.x + (i % 2 ? 3 : -3), p.y, 3.4, 2.4, white, { w: 0.4, wob: 0, rot: i, n: 8 }); }
    },
  });
  PM.define('headwear', 'flower-crown', {
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw } = geo, y = hairTop(geo, g) + 14, r = hRng(g, 'flowers');
      for (let i = 0; i < 7; i++) {
        const u = i / 6 - 0.5, x = cx + u * hw * 2.1, yy = y + Math.pow(Math.abs(u) * 2, 2) * 22, R = r.range(5, 8), col = [C.cloth[1], C.cloth[2], C.white][i % 3];
        for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; P.circle(x + Math.cos(a) * R * 0.75, yy + Math.sin(a) * R * 0.75, R * 0.6, col, { w: 0.4, wob: 0, n: 8 }); }
        P.dot(x, yy, R * 0.35, C.metal);
      }
    },
  });
  PM.define('headwear', 'crown', {
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw } = geo, y = hairTop(geo, g) + 10, w = hw * 0.75, h = 28;
      const pts = [[cx - w, y + 6, true], [cx - w, y - h, true], [cx - w * 0.5, y - h * 0.45, true], [cx, y - h * 1.25, true], [cx + w * 0.5, y - h * 0.45, true], [cx + w, y - h, true], [cx + w, y + 6, true], [cx, y + 10]];
      P.shape(pts, C.metal, { tension: 0.3 });
      for (const k of [-0.5, 0, 0.5]) P.bead(cx + k * w * 1.2, y - 2, 3.2, C.cloth[1]);
      for (const [x, yy] of [[cx - w, y - h], [cx, y - h * 1.25], [cx + w, y - h]]) P.bead(x, yy, 2.8, C.white);
    },
  });
})(window.PM = window.PM || {});
