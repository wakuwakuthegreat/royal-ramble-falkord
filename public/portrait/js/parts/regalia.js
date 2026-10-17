/* Regalia & work wear: royal and occupational headwear, garments, necklaces and eyewear.
 * Same contracts as headwear.js / clothing.js / jewelry.js — this file only adds entries,
 * which the Role presets (js/data/roles.js) then draw on. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;

  const hRng = (g, k) => new PM.RNG(PM.hashString(g.seed + ':regalia:' + k));
  const hairTop = (geo, g) => geo.top - 6 * g.hairVolume;
  const hatY = geo => geo.top + geo.hh * 0.32;   // lower edge of a hat sitting on the head
  const snap = (g, hex) => PM.styleSnap(g, hex);
  const shine = C => color.mix(C.ink, C.paper, 0.4);

  /** A brim: a band along a gentle curve whose ends can turn up. */
  function brim(P, geo, y, w, thick, fill, o = {}) {
    const { cx } = geo, up = o.up || 0, droop = o.droop != null ? o.droop : 6;
    return P.band([[cx - w, y - up], [cx - w * 0.62, y + droop * 0.4], [cx, y + droop], [cx + w * 0.62, y + droop * 0.4], [cx + w, y - up]], thick, fill, { w: 0.9, pattern: o.pattern });
  }
  /** Ermine: white fur with little black tails. */
  function ermine(P, d, C, r) {
    P.clip(d, () => {
      const b = curve.bbox(d);
      for (let y = b.y + 6, row = 0; y < b.y + b.h; y += 14, row++) {
        for (let x = b.x + (row % 2 ? 12 : 4); x < b.x + b.w; x += 17) {
          const px = x + r.range(-2, 2), py = y + r.range(-2, 2);
          P.fill([[px, py - 3.5, true], [px + 1.8, py + 3, true], [px - 1.8, py + 3, true]], C.ink, { wob: 0, smooth: false });
          P.dot(px, py - 3, 1.1, C.ink);
        }
      }
    });
  }
  /** A gem: ink-ringed bead with a highlight. */
  function gem(P, x, y, r, col, C) { P.bead(x, y, r, col, 0.7); P.dot(x - r * 0.3, y - r * 0.3, Math.max(0.6, r * 0.22), C.white); }

  // =================================================================== ROYAL HEADWEAR
  PM.define('headwear', 'tiara', {
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw } = geo, y = hairTop(geo, g) + 16, w = hw * 0.66, n = 10, top = [];
      const yb = u => y + u * u * 12;
      for (let i = 0; i <= n; i++) {
        const u = i / n * 2 - 1, peak = i % 2 === 0, h = peak ? 7 + 17 * Math.pow(1 - Math.abs(u), 1.4) : 3;
        top.push([cx + u * w, yb(u) - h, peak]);
      }
      const pts = [...top, [cx + w + 2, yb(1) + 4, true], [cx, y + 5], [cx - w - 2, yb(-1) + 4, true]];
      P.shape(pts, C.metal, { w: 0.8, tension: 0.35 });
      for (let i = 0; i <= n; i += 2) { const [x, yy] = top[i]; gem(P, x, yy + 1, i === n / 2 ? 4 : 2.3, i === n / 2 ? C.cloth[1] : C.white, C); }
      gem(P, cx, y - 6, 3, C.cloth[2], C);
    },
  });

  PM.define('headwear', 'imperial-crown', {
    label: 'Imperial crown',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = top + geo.hh * 0.2, w = hw * 0.92, velvet = C.cloth[1];
      // velvet cap
      P.shape([[cx - w * 0.96, y1 - 10], [cx - w * 1.04, y1 - 42], [cx - w * 0.6, y1 - 74], [cx, y1 - 84], [cx + w * 0.6, y1 - 74], [cx + w * 1.04, y1 - 42], [cx + w * 0.96, y1 - 10]], velvet);
      // arches
      for (const s of [-1, 1]) P.band([[cx + s * w * 0.95, y1 - 12], [cx + s * w * 0.9, y1 - 50], [cx + s * w * 0.45, y1 - 80], [cx, y1 - 86]], 6, C.metal, { w: 0.6 });
      P.band([[cx, y1 - 12], [cx, y1 - 86]], 6, C.metal, { w: 0.6 });
      for (const [u, v] of [[-0.7, 0.62], [0.7, 0.62], [0, 0.5]]) gem(P, cx + u * w * (u ? 0.95 : 1), y1 - 86 * v, 2.2, C.white, C);
      // orb on top
      P.circle(cx, y1 - 95, 8, C.metal, { w: 0.7 });
      P.line([[cx - 8, y1 - 95], [cx + 8, y1 - 95]], { w: 0.4, wob: 0 });
      P.circle(cx, y1 - 106, 3.2, C.metal, { w: 0.5, wob: 0 });
      // jewelled band
      const band = P.shape([[cx - w, y1 - 16, true], [cx, y1 - 20], [cx + w, y1 - 16, true], [cx + w, y1 + 4, true], [cx, y1 + 8], [cx - w, y1 + 4, true]], C.metal, { w: 0.9 });
      for (let i = -3; i <= 3; i++) gem(P, cx + i * w * 0.27, y1 - 5 + Math.abs(i) * 0.6, i % 2 ? 2.6 : 3.8, i % 2 ? C.white : (i === 0 ? C.cloth[2] : C.cloth[1]), C);
      // ermine rim
      const rim = P.band([[cx - w * 1.04, y1 + 6], [cx, y1 + 13], [cx + w * 1.04, y1 + 6]], 11, C.white, { w: 0.8 });
      ermine(P, rim, C, hRng(g, 'crown-ermine'));
      return band;
    },
  });

  PM.define('headwear', 'circlet', {
    label: 'Circlet',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl, fx } = geo;
      P.band([[cx - hw * 1.04, hl + 24], [cx - hw * 0.55, hl + 8], [fx, hl + 4], [cx + hw * 0.55, hl + 8], [cx + hw * 1.04, hl + 24]], 4.2, C.metal, { w: 0.55 });
      P.shape([[fx, hl - 2, true], [fx + 4.5, hl + 6], [fx, hl + 15, true], [fx - 4.5, hl + 6]], C.cloth[1], { w: 0.6, wob: 0 });
      P.dot(fx - 1, hl + 4, 1.1, C.white);
    },
  });

  PM.define('headwear', 'laurel', {
    label: 'Golden laurel',
    hides: { hair: 'none' },
    front(P, g, geo, C) {
      const { cx, hw, hairlineY: hl } = geo, y = hairTop(geo, g);
      for (const s of [-1, 1]) {
        const path = curve.open([[cx + s * hw * 1.05, hl + 16], [cx + s * hw * 0.95, y + 30], [cx + s * hw * 0.5, y + 6], [cx + s * 10, y + 2]], 0.3);
        P.line(path, { w: 0.5, dense: true, wob: 0 });
        for (let i = 0; i < 11; i++) {
          const p = curve.at(path, (i + 0.5) / 11), k = i % 2 ? 1 : -1, a = Math.atan2(p.ty, p.tx) + k * 0.7;
          P.ellipse(p.x + p.nx * k * 4, p.y + p.ny * k * 4, 6.5, 2.6, C.metal, { rot: a, w: 0.45, wob: 0, n: 10 });
        }
      }
    },
  });

  PM.define('headwear', 'kokoshnik', {
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl + 2;
      const d = P.shape([[cx - hw * 1.0, y + 10, true], [cx - hw * 1.08, top - 10], [cx - hw * 0.6, top - 56], [cx, top - 72], [cx + hw * 0.6, top - 56], [cx + hw * 1.08, top - 10], [cx + hw * 1.0, y + 10, true], [cx + hw * 0.6, y], [cx, y - 3], [cx - hw * 0.6, y]], C.cloth[1],
        { pattern: { id: g.trim === 'plain' ? 'blossoms' : g.trim, colors: [C.cloth[1], C.metal, C.cloth[2]], scale: 0.6 } });
      const edge = curve.open([[cx - hw * 1.0, y + 8], [cx - hw * 1.06, top - 8], [cx - hw * 0.6, top - 52], [cx, top - 67], [cx + hw * 0.6, top - 52], [cx + hw * 1.06, top - 8], [cx + hw * 1.0, y + 8]], 0.4);
      for (let i = 0; i <= 30; i++) { const p = curve.at(edge, i / 30); P.bead(p.x, p.y, 2.1, C.white, 0.5); }
      // pearl fringe over the brow
      for (let i = -6; i <= 6; i++) { const x = cx + i * hw * 0.12, yy = y + 1 + Math.abs(i) * 0.5; for (let k = 0; k < 3; k++) P.bead(x, yy + k * 4.2, 1.7, C.white, 0.45); }
      return d;
    },
  });

  PM.define('headwear', 'jewelled-turban', {
    label: 'Jewelled turban (sarpech)',
    hides: { hair: 'top', ears: false },
    front(P, g, geo, C) {
      const base = PM.get('headwear', 'turban'); if (base) base.front(P, g, geo, C);
      const { cx, hairlineY: hl } = geo, x = cx + 4, y = hl - 8;
      // feather plume
      P.shape([[x, y - 20], [x + 8, y - 48], [x + 24, y - 78], [x + 18, y - 52], [x + 6, y - 22]], C.white, { w: 0.6 });
      P.line([[x + 2, y - 22], [x + 12, y - 52], [x + 22, y - 74]], { w: 0.35, wob: 0 });
      // jewel aigrette + pearl strings
      P.shape([[x, y - 32, true], [x + 8, y - 14], [x, y + 2, true], [x - 8, y - 14]], C.metal, { w: 0.7, wob: 0 });
      gem(P, x, y - 14, 4, C.cloth[2], C);
      for (const s of [-1, 1]) for (let i = 1; i <= 7; i++) P.bead(x + s * (6 + i * 9), y + 2 + Math.sin(i / 7 * Math.PI) * 6 - i * 0.4, 2, C.white, 0.45);
    },
  });

  // =================================================================== WORK HATS
  PM.define('headwear', 'chef-toque', {
    label: "Chef's toque",
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 6, w = hw * 0.94, bt = y1 - 26;
      const puff = P.shape([[cx - w * 0.98, bt + 6], [cx - w * 1.22, top - 50], [cx - w * 0.82, top - 92], [cx - w * 0.25, top - 84], [cx + w * 0.2, top - 102], [cx + w * 0.8, top - 88], [cx + w * 1.24, top - 52], [cx + w * 0.98, bt + 6]], C.white);
      P.clip(puff, () => { for (const u of [-0.55, -0.15, 0.25, 0.62]) P.line([[cx + u * w, bt], [cx + u * w * 1.2, top - 60]], { w: 0.4, taper: 0.5 }); });
      const band = P.shape([[cx - w, bt, true], [cx, bt - 4], [cx + w, bt, true], [cx + w, y1, true], [cx, y1 + 5], [cx - w, y1, true]], C.white);
      P.clip(band, () => { for (let i = -6; i <= 6; i++) P.line([[cx + i * w / 6.5, bt - 6], [cx + i * w / 6.5, y1 + 6]], { w: 0.3, wob: 0 }); });
    },
  });

  function hardHat(P, g, geo, C, col) {
    const { cx, hw, top } = geo, y1 = hatY(geo) + 4, w = hw * 1.02;
    const dome = P.shape([[cx - w, y1, true], [cx - w * 0.96, top - 14], [cx - w * 0.5, top - 34], [cx, top - 38], [cx + w * 0.5, top - 34], [cx + w * 0.96, top - 14], [cx + w, y1, true]], col);
    P.clip(dome, () => { P.band([[cx, y1], [cx, top - 40]], 14, color.shade(col, -0.12), { w: 0.6 }); P.hair(curve.ellipse(cx - w * 0.45, top - 6, w * 0.25, 16, 10, 0, -2.6, -1.4), 3 * P.lw, color.mix(col, C.white, 0.55)); });
    brim(P, geo, y1, w * 1.24, 9, col, { up: 2, droop: 7 });
    return y1;
  }
  PM.define('headwear', 'hard-hat', {
    label: 'Hard hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) { hardHat(P, g, geo, C, snap(g, '#e3b52e')); },
  });
  PM.define('headwear', 'miner-helmet', {
    label: "Miner's lamp helmet",
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const y1 = hardHat(P, g, geo, C, snap(g, '#d9d2bf')), { cx } = geo;
      P.band([[cx - 12, y1 - 24], [cx + 12, y1 - 24]], 12, C.ink, { w: 0.4 });
      P.circle(cx, y1 - 25, 10, C.metal, { w: 0.8 });
      P.circle(cx, y1 - 25, 6, snap(g, '#fff6c8'), { w: 0.5, wob: 0 });
    },
  });
  PM.define('headwear', 'fire-helmet', {
    label: 'Fire helmet',
    hides: { hair: 'top', ears: false },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 6, w = hw * 1.04, red = snap(g, '#b3302a');
      P.band([[cx - w * 1.5, y1 + 30], [cx - w * 1.18, y1 + 8], [cx, y1 - 2], [cx + w * 1.18, y1 + 8], [cx + w * 1.5, y1 + 30]], 12, red, { w: 0.9 });
      const dome = P.shape([[cx - w, y1 + 2, true], [cx - w * 0.98, top - 12], [cx - w * 0.5, top - 36], [cx, top - 42], [cx + w * 0.5, top - 36], [cx + w * 0.98, top - 12], [cx + w, y1 + 2, true]], red);
      P.clip(dome, () => { for (const u of [-0.55, 0, 0.55]) P.line([[cx + u * w * 0.4, top - 42], [cx + u * w * 1.1, y1 + 4]], { w: 0.45, taper: 0.3 }); });
      P.shape([[cx - 15, y1 - 6, true], [cx - 17, y1 - 34], [cx, y1 - 42], [cx + 17, y1 - 34], [cx + 15, y1 - 6, true], [cx, y1 - 1]], C.metal, { w: 0.8 });
      P.circle(cx, y1 - 22, 6, red, { w: 0.5, wob: 0 });
      brim(P, geo, y1 + 2, w * 0.75, 6, red, { droop: 5 });
    },
  });

  function peakedCap(P, g, geo, C, o = {}) {
    const { cx, hw, top } = geo, y1 = hatY(geo) + 10, w = hw * 1.02, crownCol = o.crown || C.cloth[0];
    P.shape([[cx - w, y1 - 12, true], [cx - w * 1.22, top - 12], [cx - w * 0.6, top - 24], [cx, top - 26], [cx + w * 0.6, top - 24], [cx + w * 1.22, top - 12], [cx + w, y1 - 12, true]], crownCol);
    P.shape([[cx - w, y1 - 14, true], [cx + w, y1 - 14, true], [cx + w * 0.98, y1 + 2, true], [cx, y1 + 4], [cx - w * 0.98, y1 + 2, true]], o.band || C.ink, { w: 0.8 });
    P.shape([[cx - w * 0.9, y1, true], [cx, y1 - 2], [cx + w * 0.9, y1, true], [cx + w * 0.6, y1 + 13], [cx, y1 + 17], [cx - w * 0.6, y1 + 13]], C.ink, { w: 0.8 });
    P.hair([[cx - w * 0.45, y1 + 9], [cx + w * 0.1, y1 + 11]], 1.6 * P.lw, shine(C));
    if (o.braid) P.band([[cx - w * 0.8, y1 + 3], [cx, y1 + 7], [cx + w * 0.8, y1 + 3]], 3.2, C.metal, { w: 0.4 });
    // badge
    P.shape([[cx, y1 - 30, true], [cx + 9, y1 - 20], [cx + 6, y1 - 8, true], [cx - 6, y1 - 8, true], [cx - 9, y1 - 20]], C.metal, { w: 0.6, wob: 0 });
    P.dot(cx, y1 - 18, 2.4, o.band || C.ink);
  }
  PM.define('headwear', 'peaked-cap', {
    label: 'Peaked cap (uniform)',
    hides: { hair: 'top' },
    front(P, g, geo, C) { peakedCap(P, g, geo, C, { braid: g.gender !== 'fem' || g.age > 0.4 }); },
  });
  PM.define('headwear', 'captain-cap', {
    label: "Captain's cap",
    hides: { hair: 'top' },
    front(P, g, geo, C) { peakedCap(P, g, geo, C, { crown: C.white, band: C.ink, braid: true }); },
  });

  PM.define('headwear', 'beret', {
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, s = g.hairPart >= 0 ? 1 : -1, y = hl - 6;
      const d = P.shape([[cx - s * hw * 0.98, y + 2], [cx - s * hw * 1.12, top + 8], [cx - s * hw * 0.5, top - 22], [cx + s * hw * 0.5, top - 26], [cx + s * hw * 1.32, top - 2], [cx + s * hw * 1.18, top + 22], [cx + s * hw * 0.96, y + 4], [cx, y + 8]], C.cloth[1]);
      P.band([[cx - s * hw * 1.0, y], [cx, y + 6], [cx + s * hw * 0.98, y + 1]], 6, C.cloth[1], { w: 0.6 });
      P.line([[cx - s * 2, top - 23], [cx + s * 3, top - 31]], { w: 1, wob: 0 });
      if (g.role === 'officer' || g.role === 'soldier') P.circle(cx + s * hw * 0.55, y - 14, 6, C.metal, { w: 0.6 });
      return d;
    },
  });

  PM.define('headwear', 'mortarboard', {
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, eyeY } = geo, y1 = hatY(geo) + 4, cap = C.ink, s = g.hairPart >= 0 ? 1 : -1;
      P.shape([[cx - hw * 0.96, y1, true], [cx - hw * 0.98, top - 2], [cx + hw * 0.98, top - 2], [cx + hw * 0.96, y1, true], [cx, y1 + 5]], cap);
      P.shape([[cx - hw * 1.5, top - 4, true], [cx, top - 24, true], [cx + hw * 1.5, top - 4, true], [cx, top + 12, true]], cap, { w: 0.9 });
      P.line([[cx - hw * 1.2, top - 3], [cx, top + 7]], { w: 0.4, color: shine(C), wob: 0 });
      P.circle(cx, top - 6, 3.4, C.metal, { w: 0.4, wob: 0 });
      const end = [cx + s * hw * 1.32, eyeY - 30];
      P.line([[cx, top - 6], [cx + s * hw * 1.0, top - 2], [cx + s * hw * 1.3, top + 4], end], { w: 0.5, color: C.metal, wob: 0 });
      P.shape([[end[0] - 4, end[1], true], [end[0] + 4, end[1], true], [end[0] + 6, end[1] + 22, true], [end[0] - 6, end[1] + 22, true]], C.metal, { w: 0.6, wob: 0 });
    },
  });

  PM.define('headwear', 'top-hat', {
    label: 'Top hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = top + geo.hh * 0.22, w = hw * 0.78, H = 104, hat = C.ink;
      P.shape([[cx - w * 0.92, y1 - 4, true], [cx - w, y1 - H, true], [cx + w, y1 - H, true], [cx + w * 0.92, y1 - 4, true]], hat, { tension: 0.25 });
      P.shape(curve.ellipse(cx, y1 - H, w, 9, 18), color.mix(hat, C.paper, 0.22), { w: 0.8, dense: true });
      P.band([[cx - w * 0.93, y1 - 16], [cx + w * 0.93, y1 - 16]], 13, C.cloth[1], { w: 0.6 });
      P.hair([[cx - w * 0.55, y1 - H + 14], [cx - w * 0.55, y1 - 28]], 2.4 * P.lw, shine(C));
      brim(P, geo, y1, hw * 1.32, 9, hat, { up: 10, droop: 5 });
    },
  });

  function crownBrim(P, g, geo, C, col, o) {
    const { cx, hw, top } = geo, y1 = hatY(geo) + (o.down || 0), w = hw * 0.9, T = o.tall || 40;
    P.shape([[cx - w, y1, true], [cx - w * 1.02, top - T * 0.75], [cx - w * 0.4, top - T, true], [cx, top - T + 8, true], [cx + w * 0.4, top - T, true], [cx + w * 1.02, top - T * 0.75], [cx + w, y1, true]], col);
    P.band([[cx - w * 1.0, y1 - 6], [cx, y1 - 4], [cx + w * 1.0, y1 - 6]], 10, o.band || C.ink, { w: 0.6 });
    brim(P, geo, y1 + 2, hw * (o.brimW || 1.42), 9, col, { up: o.up || 4, droop: o.droop != null ? o.droop : 9 });
  }
  PM.define('headwear', 'fedora', {
    hides: { hair: 'top' },
    front(P, g, geo, C) { crownBrim(P, g, geo, C, snap(g, '#6b5a44'), { tall: 40, band: C.ink }); },
  });
  PM.define('headwear', 'cowboy-hat', {
    label: 'Wide-brim stockman hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) { crownBrim(P, g, geo, C, snap(g, '#9a7448'), { tall: 48, band: color.shade(snap(g, '#9a7448'), -0.3), brimW: 1.75, up: 26, droop: 7 }); },
  });
  PM.define('headwear', 'straw-hat', {
    label: 'Straw sun hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 2, straw = snap(g, '#d8b56a');
      const b = brim(P, geo, y1 + 2, hw * 1.9, 14, straw, { up: -4, droop: 10 });
      const c = P.shape([[cx - hw * 0.88, y1 + 2, true], [cx - hw * 0.9, top - 26], [cx, top - 34], [cx + hw * 0.9, top - 26], [cx + hw * 0.88, y1 + 2, true]], straw);
      for (const d of [b, c]) P.clip(d, () => { const bb = curve.bbox(d); for (let x = bb.x; x < bb.x + bb.w; x += 6) P.hair([[x, bb.y], [x + 4, bb.y + bb.h]], 0.6, color.shade(straw, -0.25)); });
      P.band([[cx - hw * 0.9, y1 - 6], [cx, y1 - 4], [cx + hw * 0.9, y1 - 6]], 8, C.cloth[1], { w: 0.5 });
    },
  });
  PM.define('headwear', 'bowler', {
    label: 'Bowler hat',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 2, hat = C.ink;
      P.shape([[cx - hw * 0.9, y1, true], [cx - hw * 0.95, top - 20], [cx - hw * 0.5, top - 44], [cx, top - 48], [cx + hw * 0.5, top - 44], [cx + hw * 0.95, top - 20], [cx + hw * 0.9, y1, true]], hat);
      P.hair(curve.ellipse(cx - hw * 0.35, top - 18, hw * 0.3, 18, 10, 0, -2.7, -1.6), 2.4 * P.lw, shine(C));
      P.band([[cx - hw * 0.92, y1 - 7], [cx, y1 - 5], [cx + hw * 0.92, y1 - 7]], 7, color.mix(hat, C.paper, 0.15), { w: 0.5 });
      brim(P, geo, y1 + 1, hw * 1.2, 7, hat, { up: 8, droop: 5 });
    },
  });
  PM.define('headwear', 'baseball-cap', {
    label: 'Baseball cap',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 6, w = hw * 1.03;
      const d = P.shape([[cx - w, y1, true], [cx - w * 0.98, top - 6], [cx - w * 0.5, top - 24], [cx, top - 27], [cx + w * 0.5, top - 24], [cx + w * 0.98, top - 6], [cx + w, y1, true], [cx, y1 + 4]], C.cloth[1]);
      P.clip(d, () => { for (const u of [-0.45, 0.45]) P.line([[cx, top - 27], [cx + u * w * 0.9, top - 4], [cx + u * w * 1.3, y1]], { w: 0.4, taper: 0.4 }); });
      P.circle(cx, top - 26, 3.2, C.cloth[1], { w: 0.5, wob: 0 });
      P.circle(cx, y1 - 22, 9, C.cloth[2], { w: 0.5, wob: 0.1 });
      P.shape([[cx - w * 0.92, y1 - 2, true], [cx, y1 - 4], [cx + w * 0.92, y1 - 2, true], [cx + w * 0.7, y1 + 14], [cx, y1 + 20], [cx - w * 0.7, y1 + 14]], C.cloth[2], { w: 0.9 });
    },
  });
  PM.define('headwear', 'flat-cap', {
    label: 'Flat cap',
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) + 6, tweed = snap(g, '#7d6a4f');
      P.shape([[cx - hw * 1.04, y1, true], [cx - hw * 1.1, top + 2], [cx - hw * 0.4, top - 18], [cx + hw * 0.7, top - 16], [cx + hw * 1.22, top + 4], [cx + hw * 1.04, y1, true]], tweed,
        { pattern: { id: 'checks', colors: [tweed, color.shade(tweed, -0.2), C.cloth[2]], scale: 0.45 } });
      P.shape([[cx - hw * 0.86, y1 - 2, true], [cx, y1 - 5], [cx + hw * 0.86, y1 - 2, true], [cx + hw * 0.55, y1 + 9], [cx, y1 + 12], [cx - hw * 0.55, y1 + 9]], color.shade(tweed, -0.12), { w: 0.8 });
      P.circle(cx + hw * 0.1, top - 12, 3, tweed, { w: 0.4, wob: 0 });
    },
  });
  PM.define('headwear', 'scrub-cap', {
    label: 'Scrub cap',
    hides: { hair: 'top', ears: false },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, y = hl - 2;
      P.shape([[cx - hw * 1.03, y + 10, true], [cx - hw * 1.06, top + 4], [cx - hw * 0.6, top - 18], [cx, top - 22], [cx + hw * 0.6, top - 18], [cx + hw * 1.06, top + 4], [cx + hw * 1.03, y + 10, true], [cx, y + 4]], C.cloth[0],
        { pattern: g.pattern === 'plain' ? null : { id: g.pattern, colors: [C.cloth[0], C.cloth[2], C.white], scale: g.patternScale * 0.5 } });
      P.band([[cx - hw * 1.04, y + 6], [cx, y], [cx + hw * 1.04, y + 6]], 6, C.cloth[0], { w: 0.5 });
    },
  });
  PM.define('headwear', 'sailor-cap', {
    label: "Sailor's cap",
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top } = geo, y1 = hatY(geo) - 2, s = g.hairPart >= 0 ? 1 : -1, w = hw * 0.8;
      P.shape([[cx - w, y1, true], [cx - w * 0.82, top - 28], [cx + w * 0.82, top - 30], [cx + w, y1, true]], C.white, { tension: 0.35 });
      P.band([[cx - w * 1.12, y1 - 4 + s * 3], [cx, y1 - 2], [cx + w * 1.12, y1 - 4 - s * 3]], 13, C.white, { w: 0.8 });
    },
  });
  PM.define('headwear', 'bandana', {
    hides: { hair: 'top' },
    front(P, g, geo, C) {
      const { cx, hw, top, hairlineY: hl } = geo, s = g.hairPart >= 0 ? 1 : -1, y = hl - 2, pat = { id: 'paisley', colors: [C.cloth[1], C.white, C.cloth[2]], scale: 0.55 };
      P.shape([[cx - hw * 1.02, y + 8, true], [cx - hw * 1.06, top + 2], [cx - hw * 0.5, top - 16], [cx + hw * 0.5, top - 16], [cx + hw * 1.06, top + 2], [cx + hw * 1.02, y + 8, true], [cx, y + 4]], C.cloth[1], { pattern: pat });
      const kx = cx + s * hw * 1.04, ky = y - 4;
      P.shape([[kx, ky], [kx + s * 22, ky + 10], [kx + s * 14, ky + 26]], C.cloth[1], { pattern: pat, w: 0.8 });
      P.shape([[kx, ky + 2], [kx + s * 10, ky + 34], [kx - s * 2, ky + 30]], C.cloth[1], { pattern: pat, w: 0.8 });
      P.circle(kx, ky + 2, 5, C.cloth[1], { pattern: pat, w: 0.8 });
    },
  });

  // =================================================================== GARMENTS
  const N = () => PM.necklines;
  const fabric = (g, C) => ({ id: g.pattern, colors: [C.cloth[0], C.cloth[1], C.cloth[2]], scale: g.patternScale });
  function body(P, g, geo, C, neckline, o = {}) {
    return P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { pattern: o.plain ? null : fabric(g, C), w: 1 });
  }
  /** Shirt V, collar points and (optionally) a tie, for jackets and coats. */
  function shirtFront(P, g, geo, C, depth, o = {}) {
    const { neckX: x, nw, neckBase: b } = geo, shirt = o.shirt || C.white;
    P.fill([[x - nw * 1.2, b - 4], [x, b + depth, true], [x + nw * 1.2, b - 4]], shirt);
    P.shape([[x - nw * 1.15, b - 6, true], [x, b + 14, true], [x + nw * 1.15, b - 6, true], [x + nw * 1.2, b + 6], [x, b + 16], [x - nw * 1.2, b + 6]], shirt, { w: 0.6, tension: 0.3 });
    for (const s of [-1, 1]) P.shape([[x + s * 2, b + 15, true], [x + s * nw * 1.2, b + 3, true], [x + s * nw * 0.9, b + 18, true]], shirt, { w: 0.6 });
    if (o.tie) P.shape([[x - 4, b + 16, true], [x + 4, b + 16, true], [x + 6, b + depth - 10], [x, b + depth - 2, true], [x - 6, b + depth - 10]], o.tie, { w: 0.6, tension: 0.3 });
  }
  function pocket(P, x, y, w, h, fill, o = {}) {
    P.shape([[x, y, true], [x + w, y, true], [x + w, y + h, true], [x, y + h, true]], fill, { w: 0.55, tension: 0.15 });
    if (o.flap) P.shape([[x - 1, y - 2, true], [x + w + 1, y - 2, true], [x + w + 1, y + 8, true], [x + w / 2, y + 11], [x - 1, y + 8, true]], o.flap, { w: 0.55, tension: 0.15 });
    if (o.pens) for (const [k, col] of o.pens.entries()) { const px = x + 5 + k * 6; P.band([[px, y - 14], [px, y + 4]], 3.4, col, { w: 0.4, wob: 0 }); }
  }

  PM.define('clothing', 'royal-robe', {
    label: 'Royal robe & ermine',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      body(P, g, geo, C, N().round(geo, 16, 1.3));
      for (const s of [-1, 1]) P.shape([[x + s * nw * 1.9, b + 8], [cx + s * sw * 0.8, b + 19], [cx + s * sw * 1.0, b + 56], [cx + s * sw * 1.07, H + 30, true], [cx + s * sw * 0.42, H + 30, true], [cx + s * sw * 0.36, b + 96], [x + s * nw * 1.5, b + 34]], C.cloth[1], { w: 0.9 });
      const pts = [[x - nw * 1.3, b - 2], [x, b + 14], [x + nw * 1.3, b - 2], [cx + sw * 0.8, b + 17], [cx + sw * 1.0, b + 50, true]];
      const n = 10;
      for (let i = 0; i <= n; i++) { const u = 1 - (i / n) * 2; pts.push([cx + u * sw * 0.98, b + 62 + (1 - u * u) * 8 + (i % 2 ? 7 : 0), i % 2 === 0]); }
      pts.push([cx - sw * 1.0, b + 50, true], [cx - sw * 0.8, b + 17]);
      const cape = P.shape(pts, C.white);
      ermine(P, cape, C, hRng(g, 'robe-ermine'));
      P.band([[x - nw * 1.5, b + 26], [x, b + 34], [x + nw * 1.5, b + 26]], 3, C.metal, { w: 0.4 });
      gem(P, x, b + 32, 5, C.cloth[2], C);
    },
  });

  PM.define('clothing', 'ruff', {
    label: 'Doublet & ruff',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, chinY } = geo;
      const d = body(P, g, geo, C, N().round(geo, 6, 1.2));
      P.clip(d, () => { for (let i = 0; i < 6; i++) P.bead(x, b + 30 + i * 24, 3, C.metal); P.line([[x, b + 18], [x, geo.H + 10]], { w: 0.5 }); });
      const cy = (chinY + b) / 2 + 8, rx = nw * 2.7, ry = 24, pts = [], m = 28;
      for (let i = 0; i < m; i++) { const a = (i / m) * Math.PI * 2, k = i % 2 ? 0.86 : 1; pts.push([x + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, i % 2 === 1]); }
      const ruff = P.shape(pts, C.white, { w: 0.8 });
      P.clip(ruff, () => { for (let i = 1; i < m; i += 2) { const a = (i / m) * Math.PI * 2; P.line([[x + Math.cos(a) * rx * 0.4, cy + Math.sin(a) * ry * 0.4], [x + Math.cos(a) * rx * 0.86, cy + Math.sin(a) * ry * 0.86]], { w: 0.35, wob: 0 }); } });
    },
  });

  PM.define('clothing', 'military-tunic', {
    label: 'Dress uniform',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo;
      body(P, g, geo, C, N().round(geo, 6, 1.15), { plain: true });
      P.line([[x, b + 10], [x, H + 10]], { w: 0.5 });
      for (let i = 0; i < 5; i++) P.bead(x + 5, b + 26 + i * 26, 3.2, C.metal, 0.6);
      for (const s of [-1, 1]) pocket(P, s < 0 ? x - nw * 2.5 : x + nw * 1.1, b + 44, nw * 1.4, 26, C.cloth[0], { flap: C.cloth[0] });
      P.shape([[x - nw * 1.2, b - 9, true], [x - nw * 1.16, b + 6], [x, b + 11], [x + nw * 1.16, b + 6], [x + nw * 1.2, b - 9, true], [x, b - 2]], C.cloth[0], { w: 0.7 });
      P.band([[x - nw * 1.17, b + 4], [x, b + 9], [x + nw * 1.17, b + 4]], 2.6, C.metal, { w: 0.3 });
      for (const s of [-1, 1]) P.dot(x + s * nw * 0.8, b + 1, 2.2, C.metal);
    },
  });

  PM.define('clothing', 'uniform-shirt', {
    label: 'Uniform shirt & tie',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      body(P, g, geo, C, N().v(geo, 34, 1.2), { plain: true });
      shirtFront(P, g, geo, C, 40, { shirt: C.cloth[0], tie: C.cloth[2] });
      P.line([[x + 1, b + 40], [x + 1, H + 10]], { w: 0.45 });
      for (let i = 0; i < 4; i++) P.bead(x + 6, b + 52 + i * 26, 2.2, C.white, 0.5);
      for (const s of [-1, 1]) {
        pocket(P, s < 0 ? x - nw * 2.6 : x + nw * 1.2, b + 48, nw * 1.4, 28, C.cloth[0], { flap: C.cloth[0] });
        P.band([[cx + s * sw * 0.42, b + 13], [cx + s * sw * 0.74, b + 21]], 8, C.cloth[0], { w: 0.5 });
      }
    },
  });

  PM.define('clothing', 'lab-coat', {
    label: 'Lab coat',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, coat = C.white;
      body(P, g, geo, C, N().v(geo, 92, 1.25), { fill: coat, plain: true });
      shirtFront(P, g, geo, C, 92, { shirt: C.cloth[1], tie: g.gender !== 'fem' ? C.cloth[2] : null });
      for (const s of [-1, 1]) P.shape([[x + s * nw * 1.3, b - 3, true], [x + s * nw * 2.25, b + 18], [x + s * nw * 1.25, b + 46, true], [x + s * 4, b + 94, true], [x + s * nw * 0.75, b + 22]], coat, { w: 0.8, tension: 0.3 });
      pocket(P, x + nw * 1.6, b + 72, nw * 1.3, 30, coat, { pens: [C.ink, C.cloth[2]] });
    },
  });

  PM.define('clothing', 'chef-jacket', {
    label: "Chef's whites",
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo, white = C.white;
      body(P, g, geo, C, N().round(geo, 4, 1.15), { fill: white, plain: true });
      P.line([[x - nw * 0.9, b + 8], [x + nw * 1.5, b + 46], [x + nw * 1.7, H + 10]], { w: 0.6 });
      for (let i = 0; i < 4; i++) for (const off of [-nw * 0.6, nw * 2.6]) P.bead(x + off, b + 34 + i * 30, 3.4, white, 0.8);
      P.band([[x - nw * 1.2, b - 3], [x, b + 5], [x + nw * 1.2, b - 3]], 11, white, { w: 0.7 });
    },
  });

  PM.define('clothing', 'scrubs', {
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, nl = N().v(geo, 44, 1.25);
      body(P, g, geo, C, nl, { plain: true });
      P.band(nl.map(p => [p[0], p[1] + 3]), 5, C.cloth[0], { w: 0.5 });
      pocket(P, x - nw * 2.8, b + 50, nw * 1.3, 28, C.cloth[0], { pens: [C.ink] });
    },
  });

  PM.define('clothing', 'apron', {
    label: 'Shirt & apron',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo, apron = C.cloth[0];
      body(P, g, geo, C, N().round(geo, 10, 1.2), { fill: C.cloth[1], plain: g.pattern === 'plain' });
      P.shape([[x - nw * 1.7, b + 44, true], [x + nw * 1.7, b + 44, true], [x + nw * 2.1, H + 30, true], [x - nw * 2.1, H + 30, true]], apron, { w: 0.9 });
      for (const s of [-1, 1]) P.band([[x + s * nw * 1.55, b + 46], [x + s * nw * 1.25, b + 12], [x + s * nw * 0.95, b - 6]], 6, apron, { w: 0.5 });
      pocket(P, x - nw * 1.1, b + 108, nw * 2.2, 30, apron);
      P.line([[x, b + 108], [x, b + 138]], { w: 0.35, wob: 0 });
    },
  });

  PM.define('clothing', 'overalls', {
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo, denim = C.cloth[0];
      body(P, g, geo, C, N().round(geo, 10, 1.2), { fill: C.cloth[1], plain: true });
      P.shape([[x - nw * 2.0, b + 70, true], [x + nw * 2.0, b + 70, true], [x + nw * 2.3, H + 30, true], [x - nw * 2.3, H + 30, true]], denim, { w: 0.9 });
      for (const s of [-1, 1]) {
        P.band([[x + s * nw * 1.7, b + 72], [cx + s * sw * 0.5, b + 30], [cx + s * sw * 0.62, b + 14]], 13, denim, { w: 0.6 });
        P.bead(x + s * nw * 1.6, b + 78, 4, C.metal, 0.7);
      }
      pocket(P, x - nw * 1.0, b + 92, nw * 2.0, 30, denim);
    },
  });

  PM.define('clothing', 'fire-coat', {
    label: 'Turnout coat',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw } = geo, refl = snap(g, '#e3c94a');
      const d = body(P, g, geo, C, N().round(geo, 4, 1.25), { plain: true, expand: 6 });
      P.clip(d, () => {
        for (const y of [b + 78, b + 136]) { P.band([[cx - sw * 1.2, y], [cx + sw * 1.2, y]], 16, refl, { w: 0.6, wob: 0 }); P.band([[cx - sw * 1.2, y], [cx + sw * 1.2, y]], 5, C.white, { w: 0.3, wob: 0 }); }
        P.line([[x + 3, b + 12], [x + 3, geo.H + 10]], { w: 0.6 });
        for (let i = 0; i < 4; i++) P.band([[x - 6, b + 34 + i * 40], [x + 12, b + 34 + i * 40]], 4, C.metal, { w: 0.4, wob: 0 });
      });
      P.shape([[x - nw * 1.35, b - 14, true], [x - nw * 1.3, b + 10], [x, b + 14], [x + nw * 1.3, b + 10], [x + nw * 1.35, b - 14, true], [x, b - 6]], C.cloth[0], { w: 0.8 });
    },
  });

  PM.define('clothing', 'hi-vis', {
    label: 'Hi-vis vest',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo, vest = snap(g, '#e8762b');
      body(P, g, geo, C, N().round(geo, 10, 1.2), { fill: C.cloth[1], plain: true });
      for (const s of [-1, 1]) {
        const panel = P.shape([[x + s * nw * 1.15, b + 2], [cx + s * sw * 0.5, b + 14], [cx + s * sw * 0.86, b + 40], [cx + s * sw * 0.95, H + 30, true], [x + s * 3, H + 30, true], [x + s * 3, b + 60]], vest, { w: 0.9 });
        P.clip(panel, () => { for (const y of [b + 96, b + 140]) { P.band([[cx - sw, y], [cx + sw, y]], 13, C.white, { w: 0.5, wob: 0 }); } P.band([[cx + s * sw * 0.42, b + 6], [cx + s * sw * 0.36, H + 30]], 11, C.white, { w: 0.5, wob: 0 }); });
      }
    },
  });

  PM.define('clothing', 'academic-gown', {
    label: 'Academic gown',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, H } = geo;
      body(P, g, geo, C, N().v(geo, 70, 1.3), { fill: C.ink, plain: true });
      shirtFront(P, g, geo, C, 70, { tie: g.gender !== 'fem' ? C.cloth[2] : null });
      for (const s of [-1, 1]) P.band([[x + s * nw * 1.35, b - 4], [x + s * nw * 0.7, b + 60], [x + s * nw * 1.0, H + 20]], 14, C.cloth[1], { w: 0.6 });
      P.band([[x - nw * 2.4, b + 8], [x - nw * 1.4, b - 4], [x, b - 8], [x + nw * 1.4, b - 4], [x + nw * 2.4, b + 8]], 8, C.cloth[2], { w: 0.6 });
    },
  });

  PM.define('clothing', 'sailor-collar', {
    label: 'Sailor collar',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw } = geo, navy = C.cloth[1];
      body(P, g, geo, C, N().v(geo, 54, 1.25), { fill: C.white, plain: true });
      P.fill([[x - nw * 1.2, b - 4], [x, b + 54, true], [x + nw * 1.2, b - 4]], C.cloth[0]);
      for (const s of [-1, 1]) {
        const flap = P.shape([[x + s * nw * 1.25, b - 6], [cx + s * sw * 0.66, b + 14], [cx + s * sw * 0.66, b + 58, true], [x + s * nw * 0.6, b + 46], [x + s * 3, b + 54, true]], navy, { w: 0.8 });
        P.clip(flap, () => P.line([[cx + s * sw * 0.6, b + 18], [cx + s * sw * 0.6, b + 52], [x + s * nw * 0.7, b + 40]], { w: 0.5, color: C.white, wob: 0 }));
      }
      P.shape([[x - 8, b + 48, true], [x + 8, b + 48, true], [x + 12, b + 74, true], [x, b + 68], [x - 12, b + 74, true]], C.cloth[2], { w: 0.6 });
    },
  });

  PM.define('clothing', 'hoodie', {
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      body(P, g, geo, C, N().round(geo, 10, 1.2), { plain: g.pattern !== 'stripes' });
      P.shape([[x - nw * 1.15, b - 6], [x - nw * 2.7, b], [x - nw * 2.5, b + 30], [x, b + 40], [x + nw * 2.5, b + 30], [x + nw * 2.7, b], [x + nw * 1.15, b - 6], [x + nw * 0.9, b + 14], [x, b + 18], [x - nw * 0.9, b + 14]], C.cloth[0], { w: 0.9 });
      for (const s of [-1, 1]) { const px = x + s * nw * 0.55; P.line([[px, b + 26], [px + s * 2, b + 70], [px - s * 1, b + 92]], { w: 0.45, wob: 0.3 }); P.band([[px - s * 1, b + 90], [px - s * 1, b + 100]], 3.4, C.cloth[2], { w: 0.35, wob: 0 }); }
    },
  });

  // =================================================================== NECKLACES
  function uPath(geo, drop, spread, rise) {
    const { neckX: x, nw, neckBase: b } = geo;
    return curve.open([[x - nw * spread, b - rise], [x - nw * spread * 0.85, b + drop * 0.45], [x, b + drop], [x + nw * spread * 0.85, b + drop * 0.45], [x + nw * spread, b - rise]], 0.5);
  }
  PM.define('necklaces', 'chain-of-office', {
    label: 'Chain of office',
    draw(P, g, geo, C) {
      const path = uPath(geo, 74, 2.6, -8), n = 22;
      for (let i = 0; i <= n; i++) { const p = curve.at(path, i / n); P.ellipse(p.x, p.y, i % 2 ? 4.6 : 3.4, 2.6, C.metal, { rot: Math.atan2(p.ty, p.tx), w: 0.5, wob: 0, n: 10 }); }
      const e = curve.at(path, 0.5);
      P.circle(e.x, e.y + 14, 13, C.metal, { w: 0.9 });
      P.circle(e.x, e.y + 14, 8, C.cloth[1], { w: 0.5, wob: 0 });
      P.dot(e.x - 2, e.y + 11, 1.6, C.white);
    },
  });
  PM.define('necklaces', 'locket', {
    draw(P, g, geo, C) {
      const path = uPath(geo, 40, 1.15, 12);
      P.line(path, { w: 0.3, color: C.metal, dense: true, wob: 0 });
      const e = curve.at(path, 0.5);
      P.ellipse(e.x, e.y + 7, 5.6, 7, C.metal, { w: 0.6, wob: 0 });
      P.ellipse(e.x, e.y + 7, 2.6, 3.6, null, { w: 0.3, wob: 0 });
    },
  });
  PM.define('necklaces', 'dog-tags', {
    label: 'Ball chain & tags',
    draw(P, g, geo, C) {
      const path = uPath(geo, 46, 1.2, 12), L = 30;
      for (let i = 0; i <= L; i++) { const p = curve.at(path, i / L); P.dot(p.x, p.y, 1.1, C.metal); }
      const e = curve.at(path, 0.5);
      for (const [dx, rot] of [[-3, -0.15], [4, 0.2]]) P.ellipse(e.x + dx, e.y + 10, 5.5, 9, C.metal, { rot, w: 0.55, wob: 0 });
    },
  });

  // =================================================================== EYEWEAR
  const lenses = geo => geo.eyes.map(e => ({ x: e.x, y: e.y - 1, s: e.s, side: e.side }));
  function arms(P, geo, L, R) {
    for (const l of L) { const ear = geo.ears.find(e => e.side === l.side); if (ear && !ear.hidden) P.line([[l.x + l.side * R * l.s, l.y - 2], [ear.x, ear.top + 6]], { w: 0.7, taper: 0.1, wob: 0 }); }
  }
  function bridge(P, L, R, dy = -3) {
    const [a, b] = L;
    P.line([[a.x + R * a.s * 0.95, a.y + dy], [(a.x + b.x) / 2, a.y + dy - 3], [b.x - R * b.s * 0.95, b.y + dy]], { w: 0.8, taper: 0.1, wob: 0 });
  }
  PM.define('eyewear', 'aviators', {
    draw(P, g, geo, C) {
      const L = lenses(geo), R = geo.ew * 0.74, tint = color.mix(C.ink, C.metal, 0.25);
      arms(P, geo, L, R);
      for (const l of L) {
        const w = R * l.s, s = l.side;
        P.shape([[l.x - s * w * 0.95, l.y - R * 0.6], [l.x + s * w, l.y - R * 0.72], [l.x + s * w * 0.9, l.y + R * 0.45], [l.x + s * w * 0.1, l.y + R * 1.05], [l.x - s * w * 0.85, l.y + R * 0.35]], tint, { w: 0.6, wob: 0.1 });
        P.hair([[l.x - s * w * 0.5, l.y - R * 0.3], [l.x - s * w * 0.1, l.y + R * 0.4]], 1.8 * P.lw, color.mix(tint, C.paper, 0.45));
      }
      bridge(P, L, R, -R * 0.6); bridge(P, L, R, -R * 0.62 + 5);
    },
  });
  PM.define('eyewear', 'half-moon', {
    label: 'Half-moon readers',
    draw(P, g, geo, C) {
      const L = lenses(geo).map(l => Object.assign(l, { y: l.y + geo.eh * 2.2 })), R = geo.ew * 0.56;
      arms(P, geo, L, R);
      for (const l of L) P.shape([[l.x - R * l.s, l.y - 1, true], [l.x + R * l.s, l.y - 1, true], [l.x + R * l.s * 0.8, l.y + R * 0.6], [l.x, l.y + R * 0.75], [l.x - R * l.s * 0.8, l.y + R * 0.6]], null, { w: 0.8, wob: 0.1 });
      bridge(P, L, R, 0);
    },
  });
  PM.define('eyewear', 'monocle', {
    draw(P, g, geo, C) {
      const e = geo.eyes[g.noseSide > 0 ? 1 : 0], R = geo.ew * 0.6;
      P.ellipse(e.x, e.y - 1, R * e.s, R, null, { w: 1, wob: 0, n: 18 });
      P.line([[e.x + e.side * R * 0.3, e.y + R], [e.x + e.side * R * 0.9, e.y + R * 3.4], [e.x + e.side * geo.hw * 0.55, geo.neckBase + 30]], { w: 0.35, color: C.metal, wob: 0.2 });
    },
  });
  PM.define('eyewear', 'goggles', {
    label: 'Safety goggles',
    draw(P, g, geo, C) {
      const L = lenses(geo), R = geo.ew * 0.78, { cx, hw } = geo, y = L[0].y;
      P.band([[cx - hw * 1.08, y - 3], [cx, y - 6], [cx + hw * 1.08, y - 3]], 7, C.ink, { w: 0.5 });
      P.shape([[L[0].x - R * 1.15, y - R * 0.85, true], [L[1].x + R * 1.15, y - R * 0.85, true], [L[1].x + R * 1.2, y + R * 0.75, true], [(L[0].x + L[1].x) / 2 + 6, y + R * 0.85], [(L[0].x + L[1].x) / 2, y + R * 0.35], [(L[0].x + L[1].x) / 2 - 6, y + R * 0.85], [L[0].x - R * 1.2, y + R * 0.75, true]],
        color.mix(C.white, C.cloth[0], 0.25), { w: 0.9, tension: 0.3 });
      for (const l of L) P.hair([[l.x - R * 0.6, y - R * 0.45], [l.x - R * 0.1, y + R * 0.3]], 2 * P.lw, C.white);
    },
  });
  PM.define('eyewear', 'loupe', {
    label: "Jeweller's loupe",
    draw(P, g, geo, C) {
      const e = geo.eyes[g.noseSide > 0 ? 0 : 1], R = geo.ew * 0.62;
      P.shape([[e.x - R, e.y - R * 0.95, true], [e.x + R, e.y - R * 0.95, true], [e.x + R * 0.8, e.y + R * 0.95, true], [e.x - R * 0.8, e.y + R * 0.95, true]], C.ink, { w: 0.8, tension: 0.3 });
      P.ellipse(e.x, e.y, R * 0.62, R * 0.62, color.mix(C.white, C.cloth[0], 0.2), { w: 0.6, wob: 0 });
      P.dot(e.x - R * 0.2, e.y - R * 0.2, 1.4, C.white);
    },
  });
  PM.define('eyewear', 'eyepatch', {
    label: 'Eye patch',
    draw(P, g, geo, C) {
      const e = geo.eyes[g.noseSide > 0 ? 1 : 0], R = geo.ew * 0.62, { cx, hw, top } = geo;
      P.line([[cx - e.side * hw * 0.9, top + geo.hh * 0.3], [e.x, e.y - R * 0.6], [cx + e.side * hw * 1.02, e.y + R * 1.4]], { w: 0.7, wob: 0.2 });
      P.shape([[e.x - R, e.y - R * 0.8], [e.x + R, e.y - R * 0.9], [e.x + R * 0.8, e.y + R * 0.7], [e.x, e.y + R * 1.05], [e.x - R * 0.85, e.y + R * 0.6]], C.ink, { w: 0.7 });
    },
  });
})(window.PM = window.PM || {});
