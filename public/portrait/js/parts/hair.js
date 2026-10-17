/* Hair.
 *
 * Most styles are described declaratively and drawn by one generic renderer:
 *   silhouette(geo, g) → control points of the whole hair mass
 *   hole(geo, g)       → options for the face "hole" cut out of the front layer
 *                        { cover, bangs, line, square, shoulders: 'behind' }
 *   texture            'auto' (from the Texture knob) | 'flow' | 'coil' | 'none' | fn
 *   strands(geo, g)    → options for braids / locs / twists hanging from the scalp
 *   backExtra / frontExtra(P, g, geo, C) → buns, ponytails, plaits, beads …
 *
 * The mass is drawn twice: once behind the head ("back") and once in front of everything
 * with the face cut out ("front") — so long hair falls over shoulders but never over the face.
 * Fully custom styles can instead provide back(P,g,geo,C) / front(P,g,geo,C) directly. */
(function (PM) {
  'use strict';
  const { lerp, clamp } = PM.math;
  const { curve, color } = PM;
  const TAU = Math.PI * 2;

  const edge = (geo, y, s) => { const w = geo.widthAt(y); return s > 0 ? w.r : w.l; };
  const texRng = (g, k) => new PM.RNG(PM.hashString(g.seed + ':hair:' + k));
  const vol = (g, geo, v) => v * g.hairVolume * (geo.hatted ? 0.25 : 1);
  const crownX = (geo, g) => geo.cx + g.hairPart * geo.hw * 0.08 + geo.t * geo.hw * 0.04;

  // =================== silhouettes ===================
  function capSil(geo, g, o = {}) {
    const { cx, hw, hh, top } = geo;
    const v = vol(g, geo, o.vol != null ? o.vol : 7), sv = o.side != null ? o.side * g.hairVolume : v * 0.55;
    const sideY = o.sideY != null ? o.sideY : geo.ears[0].top + 2;
    const side = s => [
      [cx + s * (hw * 0.74 + v * 0.8), top + hh * 0.12 - v * 0.62],
      [cx + s * (hw * 1.0 + sv), top + hh * 0.5],
      [edge(geo, sideY, s) + s * (sv * 0.7 + 1), sideY, true],
    ];
    return [[crownX(geo, g), top - v], ...side(1), ...side(-1).reverse()];
  }

  function longSil(geo, g, o = {}) {
    const { cx, hw, hh, top, eyeY, chinY } = geo;
    const v = vol(g, geo, o.vol != null ? o.vol : 9), sv = (o.side != null ? o.side : 11) * g.hairVolume, fl = (o.flare != null ? o.flare : 9) * g.hairVolume;
    const bottom = o.bottom != null ? o.bottom : chinY + (o.len != null ? o.len : 95) * g.hairLength;
    const wave = o.wave != null ? o.wave : (g.hairTexture - 1) * 2.4;
    const jag = o.jag != null ? o.jag : 4 + (g.hairTexture - 1) * 2;
    const outerX = s => cx + s * (hw * 0.95 + sv + fl * 1.05);
    const side = s => {
      const pts = [[cx + s * (hw * 0.74 + v * 0.8), top + hh * 0.12 - v * 0.62], [cx + s * (hw * 1.0 + sv), top + hh * 0.48]];
      const y0 = eyeY - hh * 0.15, n = Math.max(2, Math.round((bottom - y0) / 24));
      for (let i = 1; i < n; i++) {
        const k = i / n, y = lerp(y0, bottom - 8, k);
        const base = Math.max(s * (edge(geo, Math.min(y, chinY - 8), s) - cx) + sv + 2, hw * 0.98 + sv);
        pts.push([cx + s * (base + fl * k + (i % 2 ? wave : -wave)), y]);
      }
      return pts;
    };
    // ragged ends across the bottom (mostly hidden behind the neck, visible on the shoulders)
    const r = texRng(g, 'ends'), ends = [], x0 = outerX(1), x1 = outerX(-1), n = Math.max(4, Math.round((x0 - x1) / 11));
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n), edgeK = i === 0 || i === n;
      ends.push([x, bottom + (edgeK ? -4 : (i % 2 ? jag : -jag * 0.4) + r.range(-jag, jag) * 0.4), jag > 2 && !edgeK && i % 2 === 1]);
    }
    return [[crownX(geo, g), top - v], ...side(1), ...ends, ...side(-1).reverse()];
  }

  function cloudSil(cx, cy, rx, ry, bumps, amt, r) {
    const pts = [], n = bumps * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2, k = i % 2 ? 1 - amt : 1 + amt * 0.4;
      const j = r ? 1 + r.range(-0.03, 0.03) : 1;
      pts.push([cx + Math.cos(a) * rx * k * j, cy + Math.sin(a) * ry * k * j]);
    }
    return pts;
  }

  // =================== the face hole ===================
  function faceHole(geo, g, o = {}) {
    const { cx, hw, hh, eyeY, mouthY, chinY, neckX, nw, H } = geo;
    const cover = o.cover || 0;
    const recede = g.gender === 'masc' && g.age > 0.6 ? (g.age - 0.6) * hh * 0.55 : 0;
    const hl = (o.hairlineY != null ? o.hairlineY : geo.hairlineY) - recede * 0.5;
    const templeY = hl + hh * 0.16 + recede * 0.4;
    const gap = o.neckGap || 0;
    const side = s => {
      const pts = [
        [cx + s * hw * 0.86, templeY],
        [edge(geo, eyeY - hh * 0.1, s) + s * (2 - cover * 0.6), eyeY - hh * 0.1],
        [edge(geo, mouthY, s) + s * (2 - cover), mouthY],
        [neckX + s * (nw + 2 + gap), chinY + 6],
      ];
      if (o.shoulders === 'behind') pts.push([neckX + s * (nw + 2), geo.neckBase - 6], [cx + s * geo.sw * 1.3, geo.neckBase + 8], [cx + s * geo.sw * 1.3, H + 60, true]);
      else pts.push([neckX + s * (nw + 2 + gap), H + 60, true]);
      return pts;
    };
    let line;
    if (o.line) line = o.line;
    else if (o.bangs != null) line = [[cx + hw * 0.9, o.bangs - 2, true], [cx + hw * 0.4, o.bangs + 1], [cx - hw * 0.4, o.bangs + 1], [cx - hw * 0.9, o.bangs - 2, true]];
    else if (o.square) line = [[cx + hw * 0.72, hl + 2, true], [cx, hl], [cx - hw * 0.72, hl + 2, true]];
    else {
      const px = cx + g.hairPart * hw * 0.45;
      const mid = Math.abs(g.hairPart) > 0.15 && !o.noPart ? [[px + 4, hl + 1], [px, hl - 3, true], [px - 4, hl + 1]] : [[cx, hl]];
      line = [[cx + hw * 0.52, hl + 3 + recede * 0.6], ...mid, [cx - hw * 0.52, hl + 3 + recede * 0.6]];
    }
    return [...side(1).reverse(), ...line, ...side(-1)];
  }

  // =================== textures ===================
  function flow(P, g, geo, C, r, o = {}) {
    const ox = geo.cx + g.hairPart * geo.hw * 0.45, oy = geo.top + geo.hh * 0.06;
    const n = Math.round((o.count || 36) * (0.7 + g.hairVolume * 0.3)), wavy = g.hairTexture >= 2;
    for (let i = 0; i < n; i++) {
      const a = lerp(-Math.PI + 0.2, -0.2, (i + r.next()) / n), r0 = r.range(3, 44);
      let x = ox + Math.cos(a) * r0, y = oy + Math.sin(a) * r0 * 0.6;
      let dx = Math.cos(a), dy = Math.sin(a) * 0.35 + 0.15;
      const pts = [[x, y]], steps = r.int(6, o.maxSteps || 30), ph = r.range(0, TAU);
      for (let k = 0; k < steps; k++) {
        dy += 0.2; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
        x += dx * 9; y += dy * 9;
        const w = wavy ? Math.sin(k * 0.9 + ph) * (g.hairTexture - 1) * 1.6 : 0;
        pts.push([x - dy * w, y + dx * w]);
      }
      P.hair(pts, 0.9 * P.lw, C.hairHi);
    }
  }
  function curls(P, g, geo, C, r, box, tex) {
    const n = Math.round(box.w * box.h / (tex >= 4 ? 150 : 190));
    for (let i = 0; i < n; i++) {
      const x = r.range(box.x, box.x + box.w), y = r.range(box.y, box.y + box.h);
      const R = tex >= 4 ? r.range(1.4, 2.4) : r.range(2.6, 4.4), a = r.range(0, TAU);
      P.hair(curve.ellipse(x, y, R, R, 7, 0, a, a + (tex >= 4 ? 4.6 : 4)), 1 * P.lw, C.hairHi);
    }
  }
  function drawTexture(P, g, geo, C, def, d) {
    const mode = def.texture || 'auto';
    if (mode === 'none') return;
    const r = texRng(g, def.id), box = curve.bbox(d);
    P.clip(d, () => {
      if (typeof mode === 'function') return mode(P, g, geo, C, r, box);
      const tex = mode === 'coil' ? Math.max(3, g.hairTexture) : mode === 'flow' ? Math.min(2, g.hairTexture) : g.hairTexture;
      if (tex >= 3) curls(P, g, geo, C, r, box, tex); else flow(P, g, geo, C, r, def.flow);
    });
  }

  // =================== strands: braids, locs, twists ===================
  function strandPaths(geo, g, o) {
    const { cx, hw, hh, top, eyeY, chinY } = geo, r = texRng(g, 'strands' + o.kind);
    const bottom = o.bottom != null ? o.bottom : chinY + (o.len != null ? o.len : 90) * g.hairLength;
    const n = Math.max(3, Math.round((o.count || 8) * (0.75 + g.hairVolume * 0.25)));
    const out = [], v = vol(g, geo, 6);
    for (const s of [-1, 1]) {
      for (let i = n - 1; i >= 0; i--) {
        const k = (i + 0.5) / n;
        const sx = cx + g.hairPart * hw * 0.3 + s * hw * 0.85 * Math.pow(k, 0.8);
        const sy = top - v * 0.6 + hh * 0.55 * k * k;
        const out1 = hw * 0.98 + 2 + k * (16 + (o.spread || 0)) * g.hairVolume;
        const end = bottom + r.range(-14, 10) - (o.shortFront ? (1 - k) * (bottom - chinY) * 0.6 : 0);
        out.push({ s, k, pts: [[sx, sy], [cx + s * out1, lerp(sy, eyeY, 0.7)], [cx + s * (out1 + 3 + (o.flare || 10) * k * 1.4), lerp(eyeY, end, 0.55)], [cx + s * (out1 + 4 + (o.flare || 10) * 2.2 * k) + r.range(-5, 5), end]] });
      }
    }
    return out;
  }
  function drawStrand(P, C, pts, w, kind, r) {
    const d = curve.open(pts, 0.25);
    P.hair(d, w + 2.4 * P.lw, P.ink);
    P.hair(d, w, C.hair);
    const L = curve.length(d), step = kind === 'loc' ? 9 : 5;
    for (let s = step; s < L - 3; s += step) {
      const p = curve.at(d, s / L), h = w * 0.42;
      if (kind === 'braid') P.hair([[p.x + p.nx * h, p.y + p.ny * h], [p.x + p.tx * 2.5, p.y + p.ty * 2.5], [p.x - p.nx * h, p.y - p.ny * h]], 0.9 * P.lw, C.hairHi);
      else if (kind === 'twist') P.hair([[p.x + p.nx * h - p.tx * 2, p.y + p.ny * h - p.ty * 2], [p.x - p.nx * h + p.tx * 2, p.y - p.ny * h + p.ty * 2]], 0.9 * P.lw, C.hairHi, { smooth: false });
      else if (r.chance(0.6)) P.hair([[p.x - p.tx * 3 + p.nx * r.range(-1, 1), p.y - p.ty * 3], [p.x + p.tx * 3, p.y + p.ty * 3]], 0.9 * P.lw, C.hairHi);
    }
    return d;
  }
  function drawStrands(P, g, geo, C, def) {
    const o = def.strands(geo, g), r = texRng(g, 'strandtex');
    const w = (o.width || 7) * (0.85 + g.hairVolume * 0.15);
    for (const s of strandPaths(geo, g, o)) {
      const d = drawStrand(P, C, s.pts, w, o.kind, r);
      if (o.beads && r.chance(o.beads)) { const e = d[d.length - 1]; P.bead(e[0], e[1] + 2, w * 0.55, r.chance(0.5) ? C.metal : C.cloth[1]); }
    }
  }

  /** A plait: overlapping lobes along a path (two-braids, single braid, fulani side braids). */
  function plait(P, C, pts, w, o = {}) {
    const d = curve.open(pts, 0.3), L = curve.length(d), step = w * 0.62;
    for (let s = 0, i = 0; s < L; s += step, i++) {
      const p = curve.at(d, s / L), side = i % 2 ? 1 : -1, ww = w * (1 - 0.35 * (s / L));
      const a = Math.atan2(p.ty, p.tx) + side * 0.55;
      P.ellipse(p.x + p.nx * side * ww * 0.16, p.y + p.ny * side * ww * 0.16, ww * 0.6, ww * 0.42, C.hair, { rot: a, w: 0.55, wob: 0.15, n: 10 });
    }
    const e = curve.at(d, 1);
    if (o.tie !== false) P.band([[e.x - e.tx * 2, e.y - e.ty * 2], [e.x + e.tx * 3, e.y + e.ty * 3]], w * 0.7, o.tieColor || C.cloth[1], { w: 0.5 });
    if (o.tuft !== false) P.shape([[e.x - w * 0.35, e.y + 3], [e.x + w * 0.35, e.y + 3], [e.x + w * 0.45, e.y + w * 1.2], [e.x, e.y + w * 1.5], [e.x - w * 0.45, e.y + w * 1.2]], C.hair, { w: 0.55 });
    if (o.bead) P.bead(e.x, e.y + w * 0.9, w * 0.45, o.bead);
  }

  // =================== cornrows ===================
  function rows(P, g, geo, C, n) {
    const { cx, hw, top, hairlineY } = geo, r = texRng(g, 'rows');
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5, x0 = cx + u * hw * 1.75, y0 = hairlineY + Math.pow(Math.abs(u) * 2, 2) * geo.hh * 0.22;
      const pts = [[x0, y0 + 4], [cx + u * hw * 1.5, lerp(y0, top, 0.55)], [cx + u * hw * 0.7, top - 6], [cx + u * hw * 0.3, top - 30]];
      drawStrand(P, C, pts, Math.max(5, hw * 1.6 / n - 2.5), 'braid', r);
    }
  }

  // =================== generic renderer ===================
  function generic(phase) {
    return function (P, g, geo, C) {
      const def = this;
      const fill = def.fill ? def.fill(C, g) : C.hair;
      const ow = def.outline != null ? def.outline : 1;
      if (phase === 'back') {
        if (def.backExtra) def.backExtra(P, g, geo, C);
        const d = P.dense(def.silhouette(geo, g), true);
        geo.hairDense = d;
        P.shape(d, fill, { dense: true, w: ow });
        twoTone(P, g, geo, C, d, ow);
        drawTexture(P, g, geo, C, def, d);
        if (def.strands) drawStrands(P, g, geo, C, def);
        return;
      }
      const d = geo.hairDense || P.dense(def.silhouette(geo, g), true);
      const hole = P.dense(faceHole(geo, g, def.hole ? def.hole(geo, g) : {}), true, { wob: 0.4 });
      P.layer(Q => {
        Q.shape(d, fill, { dense: true, w: ow });
        twoTone(Q, g, geo, C, d, ow);
        drawTexture(Q, g, geo, C, def, d);
        if (def.strands) drawStrands(Q, g, geo, C, def);
        if (def.frontInLayer) def.frontInLayer(Q, g, geo, C, d);
        Q.erase(hole);
        Q.clip(d, () => Q.clip(geo.headDense, () => Q.brush(hole, true, Q.baseWidth({ w: 0.95 }), Q.ink)));
      });
      if (def.frontExtra) def.frontExtra(P, g, geo, C);
    };
  }

  /** Split-dyed hair: the viewer's right half in the second colour. */
  function twoTone(P, g, geo, C, d, ow) {
    if (!C.hair2) return;
    const x = geo.cx + g.hairPart * geo.hw * 0.45;
    P.clip(d, () => P.fill([[x, geo.top - 300], [geo.W + 50, geo.top - 300], [geo.W + 50, geo.H + 50], [x, geo.H + 50]], C.hair2, { smooth: false, wob: 0 }));
    P.brush(d, true, P.baseWidth({ w: ow }), P.ink, {});
  }

  /** Register a style using the generic renderer (custom back/front still win). */
  function hairStyle(id, def) {
    return PM.define('hair', id, Object.assign({ back: generic('back'), front: generic('front') }, def));
  }

  // ======================================================================
  //                                STYLES
  // ======================================================================
  PM.define('hair', 'bald', { label: 'Bald / shaved', back() {}, front() {} });

  hairStyle('buzz', {
    label: 'Buzz cut',
    silhouette: (geo, g) => capSil(geo, g, { vol: 1.5, side: 0.5 }),
    fill: C => color.mix(C.hair, C.skin, 0.45),
    outline: 0.55,
    texture(P, g, geo, C, r, box) { for (let i = 0; i < box.w * box.h / 9; i++) P.dot(r.range(box.x, box.x + box.w), r.range(box.y, box.y + box.h), 0.6, C.hair); },
    hole: () => ({ square: true }),
  });

  hairStyle('short-crop', {
    label: 'Short crop',
    silhouette: (geo, g) => capSil(geo, g, { vol: 7 }),
    hole: (geo, g) => ({ square: g.hairTexture >= 4 }),
    flow: { count: 26, maxSteps: 8 },
  });

  hairStyle('side-part', {
    label: 'Side part swoop',
    silhouette: (geo, g) => capSil(geo, g, { vol: 13 }),
    hole(geo, g) {
      const { cx, hw, hairlineY: hl } = geo, ps = g.hairPart >= 0 ? 1 : -1, px = cx + ps * hw * 0.5;
      const line = ps > 0
        ? [[cx + hw * 0.62, hl + 3], [px, hl - 3, true], [cx, hl + 9], [cx - hw * 0.6, hl + 14]]
        : [[cx + hw * 0.6, hl + 14], [cx, hl + 9], [px, hl - 3, true], [cx - hw * 0.62, hl + 3]];
      return { line };
    },
    texture: 'flow', flow: { count: 30, maxSteps: 12 },
  });

  hairStyle('slicked-back', {
    silhouette: (geo, g) => capSil(geo, g, { vol: 5 }),
    hole: geo => ({ noPart: true, hairlineY: geo.hairlineY - 4 }),
    texture(P, g, geo, C, r) {
      for (let i = 0; i < 16; i++) {
        const u = (i + 0.5) / 16 - 0.5, x0 = geo.cx + u * geo.hw * 1.8;
        P.hair([[x0, geo.hairlineY + 6], [geo.cx + u * geo.hw * 1.5, lerp(geo.hairlineY, geo.top, 0.6)], [geo.cx + u * geo.hw * 0.9, geo.top - 12]], 1.05 * P.lw, C.hairHi);
      }
    },
  });

  hairStyle('high-top', {
    hatFallback: 'short-crop',
    label: 'High-top fade',
    silhouette(geo, g) {
      const { cx, hw, hh, top } = geo, h = 34 * g.hairVolume * (geo.hatted ? 0.2 : 1), sideY = geo.ears[0].top + 2;
      const side = s => [[cx + s * hw * 0.84, top - h + 2], [cx + s * hw * 0.97, top + hh * 0.05], [cx + s * hw * 1.0, top + hh * 0.5], [edge(geo, sideY, s) + s * 1.5, sideY, true]];
      return [[cx, top - h - 1], ...side(1), ...side(-1).reverse()];
    },
    hole: () => ({ square: true }),
    texture: 'coil',
    frontInLayer(Q, g, geo, C, d) {
      Q.clip(d, () => Q.fill([[geo.cx - geo.hw * 1.5, geo.top + geo.hh * 0.42], [geo.cx + geo.hw * 1.5, geo.top + geo.hh * 0.42], [geo.cx + geo.hw * 1.5, geo.eyeY], [geo.cx - geo.hw * 1.5, geo.eyeY]], color.mix(C.hair, C.skin, 0.5), { smooth: false, wob: 0 }));
    },
  });

  hairStyle('afro', {
    hatFallback: 'short-crop',
    silhouette(geo, g) {
      const v = g.hairVolume * (geo.hatted ? 0.6 : 1);
      return cloudSil(geo.cx + geo.t * 4, geo.top + geo.hh * 0.45, geo.hw * (1.0 + 0.5 * v), geo.hh * (0.6 + 0.48 * v), 13, 0.05, texRng(g, 'cloud'));
    },
    texture: 'coil',
    hole: () => ({ noPart: true }),
  });

  hairStyle('curly-shoulder', {
    hatFallback: 'shoulder',
    label: 'Curly, shoulder length',
    silhouette(geo, g) {
      const v = g.hairVolume, L = g.hairLength;
      return cloudSil(geo.cx + geo.t * 4, geo.eyeY - geo.hh * 0.05 + 18 * (L - 1), geo.hw * (1.15 + 0.35 * v), geo.hh * (1.12 + 0.12 * v) + 18 * (L - 1), 15, 0.06, texRng(g, 'cloud'));
    },
    texture: 'coil',
  });

  hairStyle('afro-puffs', {
    hatFallback: 'short-crop',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    hole: () => ({ noPart: true }),
    texture: 'coil',
    backExtra(P, g, geo, C) {
      for (const s of [-1, 1]) {
        const R = geo.hw * 0.48 * g.hairVolume, d = P.shape(cloudSil(geo.cx + s * geo.hw * 0.78, geo.top + geo.hh * 0.05, R, R * 0.92, 9, 0.07), C.hair);
        P.clip(d, () => curls(P, g, geo, C, texRng(g, 'puff' + s), curve.bbox(d), Math.max(3, g.hairTexture)));
      }
    },
  });

  hairStyle('long', {
    label: 'Long, loose',
    silhouette: (geo, g) => longSil(geo, g, {}),
  });

  hairStyle('shoulder', {
    label: 'Shoulder length',
    silhouette: (geo, g) => longSil(geo, g, { len: 32, flare: 8 }),
  });

  hairStyle('bob', {
    silhouette: (geo, g) => longSil(geo, g, { bottom: geo.mouthY + 26 * g.hairLength, flare: 4, wave: 0, side: 9, jag: 0 }),
    hole: () => ({ cover: 5 }),
  });

  hairStyle('fringe', {
    label: 'Long with bangs',
    silhouette: (geo, g) => longSil(geo, g, { len: 70 }),
    hole: geo => ({ bangs: geo.browY - geo.eh * 1.4, cover: 2 }),
    texture: 'flow',
  });

  hairStyle('bob-bangs', {
    label: 'Bob with bangs',
    silhouette: (geo, g) => longSil(geo, g, { bottom: geo.mouthY + 22 * g.hairLength, flare: 3, wave: 0, side: 9, jag: 0 }),
    hole: geo => ({ bangs: geo.browY - geo.eh * 1.6, cover: 5 }),
    texture: 'flow',
  });

  hairStyle('bun-top', {
    label: 'Top knot / bun',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    texture: 'flow', flow: { count: 22, maxSteps: 10 },
    backExtra(P, g, geo, C) {
      if (geo.hatted) return;
      const R = geo.hw * 0.36 * g.hairVolume, x = geo.cx + g.hairPart * 6, y = geo.top - R * 0.55;
      const d = P.circle(x, y, R, C.hair, { n: 16 });
      P.clip(d, () => { for (let i = 0; i < 5; i++) P.hair(curve.ellipse(x, y, R * (0.3 + i * 0.13), R * (0.25 + i * 0.12), 12, 0, 0.5 + i, 3.5 + i), 1 * P.lw, C.hairHi); });
    },
  });

  hairStyle('bun-low', {
    label: 'Low side bun',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    texture: 'flow', flow: { count: 22, maxSteps: 10 },
    backExtra(P, g, geo, C) {
      const s = g.hairPart >= 0 ? 1 : -1, R = geo.hw * 0.33 * g.hairVolume;
      const x = geo.cx + s * geo.hw * 1.02, y = geo.eyeY + geo.hh * 0.18;
      const d = P.circle(x, y, R, C.hair, { n: 16 });
      P.clip(d, () => { for (let i = 0; i < 4; i++) P.hair(curve.ellipse(x, y, R * (0.35 + i * 0.16), R * (0.3 + i * 0.15), 12, 0, i, 3 + i), 1 * P.lw, C.hairHi); });
    },
  });

  hairStyle('ponytail', {
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    texture: 'flow', flow: { count: 22, maxSteps: 10 },
    backExtra(P, g, geo, C) {
      if (geo.hatted) return;
      const s = g.hairPart >= 0 ? 1 : -1, { cx, hw, top, hh, chinY } = geo, L = 70 * g.hairLength, V = g.hairVolume;
      const pts = [[cx + s * hw * 0.45, top + hh * 0.25], [cx + s * hw * (0.98 + 0.08 * V), top + hh * 0.5], [cx + s * hw * (1.12 + 0.1 * V), geo.eyeY + hh * 0.2], [cx + s * hw * (1.08 + 0.08 * V), chinY + L * 0.55], [cx + s * hw * 0.9, chinY + L], [cx + s * hw * 0.82, chinY + L * 0.3], [cx + s * hw * 0.7, top + hh * 0.7]];
      const d = P.shape(pts, C.hair);
      P.clip(d, () => flow(P, g, geo, C, texRng(g, 'tail'), { count: 30, maxSteps: 30 }));
      P.band([[cx + s * hw * 0.88, top + hh * 0.42], [cx + s * hw * 1.02, top + hh * 0.55]], 7, C.cloth[1], { w: 0.6 });
    },
  });

  hairStyle('cornrows', {
    silhouette: (geo, g) => capSil(geo, g, { vol: 3, side: 2 }),
    hole: () => ({ noPart: true }),
    texture: (P, g, geo, C) => rows(P, g, geo, C, 7),
  });

  hairStyle('fulani-braids', {
    label: 'Fulani braids',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3, side: 2 }),
    hole: () => ({ noPart: true }),
    texture: (P, g, geo, C) => rows(P, g, geo, C, 6),
    frontExtra(P, g, geo, C) {
      for (const s of [-1, 1]) {
        const x = geo.cx + s * geo.hw * 0.92, y = geo.ears[0].top - 4;
        plait(P, C, [[x, y], [x + s * 4, geo.chinY - 10], [x + s * 2, geo.chinY + 35 * g.hairLength]], 8, { tie: false, tuft: false, bead: C.metal });
      }
      P.bead(geo.cx, geo.hairlineY + 2, 4, C.cloth[1]);
    },
  });

  hairStyle('box-braids', {
    label: 'Box braids',
    silhouette: (geo, g) => capSil(geo, g, { vol: 6 }),
    texture(P, g, geo, C, r, box) {
      for (let y = box.y + 6; y < box.y + box.h; y += 10) P.hair([[box.x, y], [box.x + box.w, y + 4]], 0.8 * P.lw, C.hairHi);
    },
    strands: () => ({ kind: 'braid', count: 9, width: 6, len: 110, beads: 0.35 }),
  });

  hairStyle('locs', {
    silhouette: (geo, g) => capSil(geo, g, { vol: 8 }),
    texture: 'coil',
    strands: () => ({ kind: 'loc', count: 7, width: 8.5, len: 80, flare: 14 }),
  });

  hairStyle('twists', {
    label: 'Short twists',
    silhouette: (geo, g) => capSil(geo, g, { vol: 8 }),
    texture: 'coil',
    strands: geo => ({ kind: 'twist', count: 7, width: 7.5, bottom: geo.mouthY + 10, flare: 6, shortFront: true }),
  });

  /** Where a side plait comes out from behind the ear: below the lobe, clear of the jaw. */
  function braidStart(geo, s, w) {
    const ear = geo.ears.find(e => e.side === s) || geo.ears[0], y = ear.bot + 4;
    const out = edge(geo, y + 8, s) + s * (w * 0.55 + 2);
    return [s > 0 ? Math.max(ear.x + s * 6, out) : Math.min(ear.x + s * 6, out), y];
  }
  /** The part of the plait hidden behind the head and ear. */
  function braidRoot(P, g, geo, C, s, w) {
    if (geo.hatted) return;
    const [x, y] = braidStart(geo, s, w);
    P.band([[geo.cx + s * geo.hw * 0.8, geo.top + geo.hh * 0.45], [x - s * 2, (geo.top + geo.hh * 0.45 + y) / 2], [x, y + 6]], w * 0.9, C.hair, { w: 0.8 });
  }
  hairStyle('two-braids', {
    label: 'Two plaits',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    texture: 'flow', flow: { count: 22, maxSteps: 12 },
    // plaits start behind the ears and hang outside the jaw — never across the cheeks
    backExtra(P, g, geo, C) { for (const s of [-1, 1]) braidRoot(P, g, geo, C, s, 17 * g.hairVolume); },
    frontExtra(P, g, geo, C) {
      for (const s of [-1, 1]) {
        const [x, y] = braidStart(geo, s, 17 * g.hairVolume);
        plait(P, C, [[x, y], [x + s * 5, geo.chinY + 14], [x + s * 4, geo.chinY + 80 * g.hairLength]], 17 * g.hairVolume);
      }
    },
  });

  hairStyle('single-braid', {
    label: 'Single plait',
    silhouette: (geo, g) => capSil(geo, g, { vol: 3 }),
    texture: 'flow', flow: { count: 22, maxSteps: 12 },
    backExtra(P, g, geo, C) { braidRoot(P, g, geo, C, g.hairPart >= 0 ? 1 : -1, 19 * g.hairVolume); },
    frontExtra(P, g, geo, C) {
      const s = g.hairPart >= 0 ? 1 : -1, [x, y] = braidStart(geo, s, 19 * g.hairVolume);
      plait(P, C, [[x, y], [x + s * 4, geo.chinY + 10], [Math.max(x * s, (geo.cx + s * geo.nw * 1.9) * s) * s, geo.chinY + 90 * g.hairLength]], 19 * g.hairVolume);
    },
  });

  // Kit exported for your own styles (see README).
  PM.hairKit = { capSil, longSil, cloudSil, faceHole, flow, curls, plait, rows, drawStrand, hairStyle, generic, texRng };
})(window.PM = window.PM || {});
