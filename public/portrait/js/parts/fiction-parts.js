/* Parts that fictional characters lean on: anime spikes, ninja headbands, blindfolds,
 * whisker marks, scars, school and field uniforms. They are ordinary registry entries,
 * so anyone can also pick them in the Atelier. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;
  const K = PM.hairKit;
  const snap = (g, hex) => PM.styleSnap(g, hex);

  // =================================================================== SPIKY HAIR
  /** Spikes fanned around the crown. o: n, len, up (0 outward … 1 straight up), lean, jitter, round. */
  function spikes(geo, g, o = {}) {
    const { cx, hw, hh, top } = geo, r = K.texRng(g, 'spikes' + (o.key || ''));
    const V = g.hairVolume * (geo.hatted ? 0.25 : 1), n = o.n || 9, L = (o.len || 28) * V;
    const ecy = top + hh * 0.55, a0 = Math.PI * (o.from || 1.02), a1 = Math.PI * (o.to || 1.98);
    const sideY = geo.ears[0].top + 4, pts = [], tips = [];
    const at = a => [cx + Math.cos(a) * hw * 1.02, ecy + Math.sin(a) * hh * 0.6];
    pts.push([geo.widthAt(sideY).l - 2, sideY, true]);
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      const [bx, by] = at(a);
      let dx = Math.cos(a), dy = Math.sin(a);
      dx = lerp(dx, 0, o.up || 0); dy = lerp(dy, -1, o.up || 0);
      const lean = (o.lean || 0) + r.range(-0.15, 0.15) * (o.jitter != null ? o.jitter : 1);
      const ca = Math.cos(lean), sa = Math.sin(lean), ddx = dx * ca - dy * sa, ddy = dx * sa + dy * ca, dl = Math.hypot(ddx, ddy);
      const len = L * (0.75 + r.next() * 0.5) * (1 - 0.35 * Math.pow(Math.abs(i / n - 0.5) * 2, 2) * (o.taperSides != null ? o.taperSides : 1));
      const tip = [bx + ddx / dl * len, by + ddy / dl * len, !o.round];
      if (i > 0) { const [vx, vy] = at(a - (a1 - a0) / n / 2); pts.push([vx + Math.cos(a) * 2, vy + Math.sin(a) * 2, !o.round]); }
      pts.push(tip); tips.push({ base: [bx, by], tip });
    }
    pts.push([geo.widthAt(sideY).r + 2, sideY, true]);
    return { pts, tips };
  }
  /** Jagged anime bangs across the forehead (right → left, as faceHole expects). */
  function spikyBangs(geo, g, o = {}) {
    const { cx, hw, hairlineY: hl } = geo, n = o.n || 7, line = [], depth = (o.depth || 22) * g.hairLength;
    for (let i = 0; i <= n * 2; i++) {
      const k = i / (n * 2), x = cx + hw * 0.92 - k * hw * 1.84 + (o.lean || 0) * 14 * (i % 2);
      const y = i % 2 ? hl + depth * (0.6 + 0.4 * Math.sin(Math.PI * k)) + (o.lean || 0) * (k - 0.5) * 20 : hl + 2;
      line.push([x, y, true]);
    }
    return line;
  }
  function spikeTexture(o) {
    return function (P, g, geo, C) {
      for (const s of spikes(geo, g, o).tips) P.hair([[lerp(s.base[0], s.tip[0], 0.15), lerp(s.base[1], s.tip[1], 0.15)], [lerp(s.base[0], s.tip[0], 0.7), lerp(s.base[1], s.tip[1], 0.7)]], 1.3 * P.lw, C.hairHi);
    };
  }
  function spikyStyle(id, label, o, bangs) {
    K.hairStyle(id, {
      label,
      hatFallback: 'short-crop',
      silhouette: (geo, g) => spikes(geo, g, o).pts,
      hole: (geo, g) => (bangs ? { line: spikyBangs(geo, g, bangs) } : { square: true }),
      texture: spikeTexture(o),
    });
  }
  spikyStyle('spiky', 'Spiky (anime)', { n: 9, len: 30, up: 0.15 }, { n: 6, depth: 20 });
  spikyStyle('spiky-up', 'Spiked up', { n: 11, len: 34, up: 0.55, jitter: 0.6 }, null);
  spikyStyle('swept-spikes', 'Swept spikes', { n: 8, len: 40, up: 0.35, lean: 0.55, jitter: 0.5, key: 'swept' }, { n: 5, depth: 16, lean: 1 });
  spikyStyle('wild-spikes', 'Wild spikes (big)', { n: 12, len: 52, up: 0.2, jitter: 1.3, key: 'wild' }, { n: 6, depth: 24 });

  K.hairStyle('messy', {
    label: 'Messy curls (anime)',
    hatFallback: 'short-crop',
    silhouette: (geo, g) => spikes(geo, g, { n: 13, len: 18, up: 0.1, round: true, jitter: 1.6, key: 'messy' }).pts,
    hole: (geo, g) => ({ line: spikyBangs(geo, g, { n: 5, depth: 18 }).map(p => [p[0], p[1], false]) }),
    texture: 'coil',
  });

  // =================================================================== HEADWEAR & EYEWEAR
  PM.define('headwear', 'forehead-protector', {
    label: 'Ninja headband',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl, fx } = geo, y = hl + 6, s = g.hairPart >= 0 ? 1 : -1;
      P.band([[cx - hw * 1.05, y + 10], [cx - hw * 0.5, y + 1], [fx, y - 1], [cx + hw * 0.5, y + 1], [cx + hw * 1.05, y + 10]], 13, C.cloth[2], { w: 0.7 });
      for (let k = 0; k < 2; k++) P.band([[cx + s * hw * 1.0, y + 8], [cx + s * hw * (1.25 + k * 0.1), y + 26 + k * 16], [cx + s * hw * (1.35 + k * 0.15), y + 52 + k * 18]], 8, C.cloth[2], { w: 0.6 });
      const plate = P.shape([[fx - 26, y - 9, true], [fx + 26, y - 9, true], [fx + 26, y + 10, true], [fx - 26, y + 10, true]], snap(g, '#b9bec4'), { w: 0.8, tension: 0.15 });
      P.clip(plate, () => { P.hair(curve.ellipse(fx - 2, y, 6, 5, 14, 0, 0.3, 5.6), 1.4 * P.lw, C.ink); P.hair([[fx + 3, y + 3], [fx + 10, y + 7], [fx + 12, y - 2]], 1.4 * P.lw, C.ink); });
      for (const k of [-1, 1]) P.dot(fx + k * 21, y, 1.4, C.ink);
    },
  });
  PM.define('eyewear', 'blindfold', {
    draw(P, g, geo, C) {
      const { cx, hw, eyeY, eh } = geo, band = C.ink;
      const d = P.shape([[cx - hw * 1.06, eyeY - eh * 2.4], [geo.fx, eyeY - eh * 2.8], [cx + hw * 1.06, eyeY - eh * 2.4], [cx + hw * 1.06, eyeY + eh * 2.0], [geo.fx, eyeY + eh * 1.7], [cx - hw * 1.06, eyeY + eh * 2.0]], band, { w: 0.7 });
      P.clip(d, () => P.line([[cx - hw * 0.9, eyeY], [geo.fx, eyeY - 2], [cx + hw * 0.9, eyeY]], { w: 0.3, color: color.mix(band, C.paper, 0.3), wob: 0.2 }));
    },
  });
  PM.define('accessories', 'mask-up', {
    label: 'Face mask (up)',
    layer: 'face',
    draw(P, g, geo, C) {
      const { cx, hw, noseY, chinY, neckX, nw, neckBase: b, eyeY, eh, fx } = geo, mask = C.cloth[2] || C.ink;
      const top = lerp(eyeY + eh * 2, noseY, 0.25);
      const L = geo.widthAt(top), M = geo.widthAt(geo.mouthY);
      P.shape([[L.l - 1, top + 6], [fx, top - 2, true], [L.r + 1, top + 6], [M.r + 1, geo.mouthY], [neckX + nw * 1.2, b], [neckX - nw * 1.2, b], [M.l - 1, geo.mouthY]], mask, { w: 0.9 });
      P.line([[fx, top], [geo.noseX + 2, noseY + 2]], { w: 0.4, taper: 0.5 });
      P.line([[geo.mouthX - hw * 0.25, chinY + 2], [geo.mouthX, chinY + 6], [geo.mouthX + hw * 0.25, chinY + 2]], { w: 0.35, taper: 0.5 });
    },
  });

  // =================================================================== MARKS
  PM.define('marks', 'whiskers', {
    label: 'Whisker marks', layer: 'top',
    draw(P, g, geo, C) {
      for (const s of [-1, 1]) { const x = geo.fx + s * geo.hw * 0.52, y = geo.noseY - 4; for (let i = 0; i < 3; i++) P.line([[x - s * 10, y - 6 + i * 6], [x + s * 10, y - 8 + i * 7.5]], { w: 0.55, taper: 0.4, wob: 0.1 }); }
    },
  });
  PM.define('marks', 'cheek-scar', {
    label: 'Scar under the eye', layer: 'top',
    draw(P, g, geo, C) { const e = geo.eyes[0]; const y = e.y + geo.eh * 3.2; P.line([[e.x - 8, y], [e.x, y + 1.5], [e.x + 8, y]], { w: 0.6, wob: 0 }); for (const k of [-4, 0, 4]) P.line([[e.x + k, y - 3], [e.x + k + 0.5, y + 4]], { w: 0.4, wob: 0 }); },
  });
  PM.define('marks', 'burn-scar', {
    label: 'Burn scar', layer: 'skin',
    draw(P, g, geo, C) {
      const s = g.scarSide != null ? g.scarSide : 1, { fx, hw, eyeY, mouthY } = geo, col = color.mix(C.skin, '#a8462c', 0.3), r = new PM.RNG(PM.hashString(g.seed + 'burn'));
      const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([fx + s * hw * 0.55 + Math.cos(a) * hw * r.range(0.28, 0.4), lerp(eyeY, mouthY, 0.5) + Math.sin(a) * hw * r.range(0.4, 0.55)]); }
      const d = P.fill(pts, col, { wob: 1.2 });
      P.clip(d, () => { for (let i = 0; i < 8; i++) { const y = eyeY - 10 + i * 9; P.line([[fx + s * hw * 0.3, y], [fx + s * hw * 0.9, y + r.range(-4, 4)]], { w: 0.3, color: C.skinDeep, taper: 0.5 }); } });
    },
  });
  PM.define('marks', 'tear-lines', {
    label: 'Tear-trough lines', layer: 'top',
    draw(P, g, geo) { for (const e of geo.eyes) { const x = e.x - e.side * geo.ew * 0.32 * e.s; P.line([[x, e.y + geo.eh * 1.2], [x + e.side * 3, e.y + geo.eh * 4.4]], { w: 0.5, taper: 0.4, wob: 0 }); } },
  });

  // =================================================================== CLOTHING
  const N = () => PM.necklines;
  function body(P, g, geo, C, neckline, o = {}) { return P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { pattern: null, w: 1 }); }

  PM.define('clothing', 'gakuran', {
    label: 'High-collar uniform',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo;
      body(P, g, geo, C, N().round(geo, 4, 1.15));
      P.shape([[x - nw * 1.2, b - 18, true], [x - nw * 1.18, b + 6], [x, b + 10], [x + nw * 1.18, b + 6], [x + nw * 1.2, b - 18, true], [x, b - 10]], C.cloth[0], { w: 0.8 });
      P.line([[x, b + 10], [x, H + 10]], { w: 0.5 });
      for (let i = 0; i < 5; i++) P.bead(x, b + 26 + i * 26, 3, C.metal, 0.6);
    },
  });
  PM.define('clothing', 'track-jacket', {
    label: 'Track jacket',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      const d = body(P, g, geo, C, N().round(geo, 2, 1.2));
      P.clip(d, () => { for (const s of [-1, 1]) P.fill([[x + s * nw * 1.2, b - 20], [cx + s * sw * 1.2, b - 20], [cx + s * sw * 1.2, b + 64], [x + s * nw * 2.4, b + 40]], C.cloth[1], { smooth: false, wob: 0.3 }); });
      P.shape([[x - nw * 1.25, b - 16, true], [x - nw * 1.2, b + 8], [x, b + 12], [x + nw * 1.2, b + 8], [x + nw * 1.25, b - 16, true], [x, b - 8]], C.cloth[1], { w: 0.8 });
      P.line([[x + 2, b + 10], [x + 2, H + 10]], { w: 0.5 });
      P.band([[x + 2, b + 12], [x + 2, b + 24]], 4, C.metal, { w: 0.4, wob: 0 });
      P.circle(x + nw * 2.4, b + 72, 9, C.white, { w: 0.6 });
      P.hair(curve.ellipse(x + nw * 2.4, b + 72, 4.5, 4.5, 12, 0, 0.4, 5.6), 1.4 * P.lw, C.cloth[0]);
    },
  });
  PM.define('clothing', 'field-jacket', {
    label: 'Field jacket & harness',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      body(P, g, geo, C, N().v(geo, 30, 1.2), { fill: C.white });
      P.shape([[x - nw * 1.15, b - 6, true], [x, b + 12, true], [x + nw * 1.15, b - 6, true], [x + nw * 1.2, b + 6], [x, b + 14], [x - nw * 1.2, b + 6]], C.white, { w: 0.6, tension: 0.3 });
      for (const s of [-1, 1]) {
        P.shape([[x + s * nw * 1.3, b - 3, true], [cx + s * sw * 0.78, b + 20], [cx + s * sw * 0.99, b + 56], [cx + s * sw * 1.05, b + 150, true], [x + s * nw * 2.2, b + 150, true], [x + s * nw * 1.6, b + 40]], C.cloth[0], { w: 0.9 });
        P.band([[x + s * nw * 1.4, b + 6], [x + s * nw * 1.9, b + 90], [x + s * nw * 1.7, H + 20]], 7, C.ink, { w: 0.4 });
        P.line([[cx + s * sw * 0.9, b + 150], [cx + s * sw * 0.98, H + 10]], { w: 0.4 });
      }
      P.band([[x - nw * 1.9, b + 92], [x + nw * 1.9, b + 92]], 6, C.ink, { w: 0.4, wob: 0 });
      for (const s of [-1, 1]) P.bead(x + s * nw * 1.85, b + 92, 3, C.metal, 0.5);
    },
  });
})(window.PM = window.PM || {});
