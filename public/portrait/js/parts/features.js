/* Facial features: eye shapes, eyes, brows, noses, mouth, ears, age lines,
 * facial hair and "signature details" (marks). */
(function (PM) {
  'use strict';
  const { lerp, clamp } = PM.math;
  const { curve, color } = PM;

  // =====================================================================
  // Eye shapes — pure parameter sets read by the one eye renderer below.
  //   peak  where the upper lid is highest (0 inner corner … 1 outer)
  //   up/lo upper / lower lid height factors
  //   tilt  extra outer-corner lift (radians-ish)
  //   drop  outer corner drop (downturned)
  //   crease 'line' | 'hood' | 'deep' | 'none'
  //   fold  inner-corner fold (epicanthic) strength 0..1
  // =====================================================================
  PM.define('eyeShapes', 'almond', { up: 1, lo: 0.55, peak: 0.45, crease: 'line' });
  PM.define('eyeShapes', 'round', { up: 1.2, lo: 0.85, peak: 0.5, crease: 'line' });
  PM.define('eyeShapes', 'hooded', { up: 0.8, lo: 0.55, peak: 0.5, crease: 'hood' });
  PM.define('eyeShapes', 'monolid', { up: 0.72, lo: 0.5, peak: 0.55, crease: 'none', fold: 0.7 });
  PM.define('eyeShapes', 'downturned', { up: 0.95, lo: 0.6, peak: 0.42, tilt: -0.1, drop: 0.35, crease: 'line' });
  PM.define('eyeShapes', 'upturned', { up: 0.95, lo: 0.5, peak: 0.55, tilt: 0.16, crease: 'line' });
  PM.define('eyeShapes', 'deep-set', { up: 0.85, lo: 0.6, peak: 0.5, crease: 'deep' });
  PM.define('eyeShapes', 'narrow', { up: 0.62, lo: 0.4, peak: 0.5, crease: 'none', fold: 0.35 });

  const warpSin = (u, peak) => Math.sin(Math.PI * (u < peak ? 0.5 * u / peak : 0.5 + 0.5 * (u - peak) / (1 - peak)));

  /** Local eye frame. u: 0 inner corner → 1 outer corner. v: vertical offset (px). */
  function eyeFrame(e, geo, g) {
    const shape = PM.get('eyeShapes', g.eyeShape) || PM.get('eyeShapes', 'almond');
    const W = geo.ew * e.s, H = geo.ehOpen != null ? geo.ehOpen : geo.eh;
    const ang = g.eyeTilt * 0.17 + (shape.tilt || 0);
    const at = (u, v) => [e.x + e.side * (u - 0.5) * W, e.y + v - (u - 0.5) * W * ang];
    const corner = u => lerp(H * 0.12, -H * 0.05 + (shape.drop || 0) * H, u);
    const upY = u => -H * shape.up * warpSin(u, shape.peak) + corner(u);
    const loY = u => H * shape.lo * Math.pow(Math.sin(Math.PI * u), 0.85) * (1 - 0.15 * u) + corner(u);
    return { shape, W, H, at, upY, loY };
  }
  PM.eyeFrame = eyeFrame;

  function drawEye(P, g, geo, C, e) {
    const f = eyeFrame(e, geo, g), { at, upY, loY, H, W, shape } = f;
    const ups = [0, 0.12, 0.3, shape.peak, 0.72, 0.88, 1].sort((a, b) => a - b);
    const upper = ups.map(u => at(u, upY(u)));
    const lower = [0.85, 0.6, 0.35, 0.15].map(u => at(u, loY(u)));
    const outline = [[...upper[0], true], ...upper.slice(1, -1), [...upper[upper.length - 1], true], ...lower];

    // white + iris + pupil
    const d = P.fill(outline, C.eyeWhite, { wob: 0.25, density: 0.8 });
    const uc = 0.5 + g.gaze * 0.2 * e.side;
    const [ix, iy] = at(uc, H * 0.05);
    const ir = geo.eh * 0.92 * g.irisSize * (0.8 + 0.2 * e.s) * (g.pupil != null ? 0.75 + 0.25 * g.pupil : 1);
    const pr = ir * 0.48 * (g.pupil != null ? g.pupil : 1);
    P.clip(d, () => {
      P.dot(ix, iy, ir, C.iris);
      if (C.iris !== C.ink) P.dot(ix, iy, pr, C.ink);
      else if (g.pupil != null && g.pupil < 0.8) P.dot(ix, iy, ir * 0.62, C.eyeWhite), P.dot(ix, iy, pr * 0.9, C.ink);
      // half-closed lids (smug, flirty, sleepy) and cheeks pushing up (laughing, squinting)
      const droop = g.lidDroop || 0, sq = g.squint || 0;
      if (droop > 0.02) {
        const lid = [0, 0.25, 0.5, 0.75, 1].map(u => at(u, lerp(upY(u), loY(u), droop * 0.62)));
        P.fill([at(-0.1, -H * 3), at(1.1, -H * 3), ...lid.slice().reverse()], C.skin, { smooth: true, wob: 0 });
        P.line(lid, { w: 1.05, taper: 0.2, wob: 0 });
      }
      if (sq > 0.02) {
        const cheek = [0, 0.25, 0.5, 0.75, 1].map(u => at(u, lerp(loY(u), upY(u), sq * 0.5)));
        P.fill([...cheek, at(1.1, H * 3), at(-0.1, H * 3)], C.skin, { wob: 0 });
        P.line(cheek, { w: 0.6, taper: 0.4, wob: 0 });
      }
      P.dot(ix + ir * 0.3, iy - ir * 0.35, Math.max(0.8, ir * 0.18), C.eyeWhite);
    });

    // upper lid — heavy, flicks out at the outer corner
    const kohl = (g.marks || []).includes('kohl');
    const lidPts = [0, 0.15, 0.35, shape.peak, 0.7, 0.9, 1].sort((a, b) => a - b).map(u => at(u, upY(u) - 0.5));
    if (kohl) lidPts.push(at(1.25, -H * 0.45));
    P.line(lidPts, { w: kohl ? 1.6 : 1.15, taper: 0.25, taperEnd: !kohl, wob: 0.3, density: 0.8 });
    // lower lid — light
    P.line([0.92, 0.7, 0.45, 0.2].map(u => at(u, loY(u) + 0.6)), { w: kohl ? 0.8 : 0.42, taper: 0.4, wob: 0.3, density: 0.8 });

    // crease / hood / fold
    if (shape.crease === 'line') P.line([0.18, 0.45, 0.85].map(u => at(u, upY(u) - H * 0.75 - 1)), { w: 0.42, taper: 0.45, wob: 0.3 });
    if (shape.crease === 'hood') P.line([0.05, 0.4, 0.75, 1.05].map(u => at(u, upY(Math.min(1, u)) - H * 0.32 - 1)), { w: 0.55, taper: 0.4, wob: 0.3 });
    if (shape.crease === 'deep') P.line([0.0, 0.4, 0.8, 1.05].map(u => at(u, -H * 1.9 - u * H * 0.2)), { w: 0.6, taper: 0.45, wob: 0.3 });
    if (shape.fold) P.line([at(-0.02, H * 0.05), at(0.1, -H * 0.55 * shape.fold), at(0.3, -H * shape.up * 0.95 - 1)], { w: 0.4, taper: 0.5, wob: 0.2 });

    // lashes
    if (g.lashes > 0.12) {
      const n = Math.round(2 + g.lashes * 4), L = H * (0.4 + g.lashes * 0.6);
      for (let i = 0; i < n; i++) {
        const u = 0.55 + 0.45 * (i / Math.max(1, n - 1));
        const [x, y] = at(u, upY(u) - 0.5);
        const a = -Math.PI / 2 + e.side * (0.25 + u * 0.7);
        P.hair([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1.1 * P.lw, C.ink, { smooth: false });
      }
    }

    // age: under-eye line
    if (g.age > 0.6) P.line([0.25, 0.55, 0.85].map(u => at(u, loY(u) + H * 0.9)), { w: 0.3 * (g.age - 0.3), taper: 0.5, wob: 0.3 });
    if (g.age > 0.72) for (let k = 0; k < 2; k++) P.line([at(1.08, -H * 0.2 + k * H * 0.7), at(1.3, -H * 0.5 + k * H * 0.9)], { w: 0.28, taper: 0.5, wob: 0 });
  }

  function drawBrow(P, g, geo, C, e) {
    const { W } = eyeFrame(e, geo, g), H = geo.eh; // brows don't move when the eyes blink
    const A = H * (0.3 + g.browArch * 1.3);
    const T = (2.2 + 3.6 * g.browThick) * (0.85 + 0.15 * e.s);
    const tilt = g.browTilt * 0.12;
    const raise = g.browRaise || 0, furrow = g.browFurrow || 0;
    const pts = [-0.12, 0.25, 0.62, 0.92, 1.12].map(u => {
      const w = (u + 0.12) / 1.24, inner = clamp(1 - w * 1.5, 0, 1);
      let y = geo.browY - A * warpSin(clamp(w, 0, 1), 0.62) * (u > 1 ? 0.75 : 1) * (1 - 0.6 * Math.max(raise, furrow)) - (u - 0.5) * W * tilt;
      if (u < 0) y += H * 0.2;
      y -= raise * H * 2.3 * inner;                 // worried / sad: inner ends climb
      y += furrow * H * 1.7 * inner;                // angry: inner ends dive …
      y -= furrow * H * 0.6 * clamp(w * 1.4 - 0.4, 0, 1);  // … and the outer ends flare up
      return [e.x + e.side * ((u - 0.5) * W - furrow * 4 * inner), y];
    });
    const col = color.mix(C.hair, C.ink, 0.35);
    P.band(pts, t => T * (1.05 - 0.7 * t), col, { w: 0.45, wob: 0.35, color: col === C.ink ? C.ink : color.mix(col, C.ink, 0.5) });
  }

  // =====================================================================
  // Noses — each registered style is a draw function.
  // =====================================================================
  function noseCtx(g, geo) {
    const t = geo.t, sd = t > 0.06 ? 1 : t < -0.06 ? -1 : (g.noseSide || -1);
    const e = geo.eyes[sd > 0 ? 1 : 0];
    const innerX = e.x - sd * 0.5 * geo.ew * e.s;
    return {
      nx: geo.noseX, ny: geo.noseY, sd,
      nw: geo.hw * 0.2 * g.noseWidth,
      bx: lerp(innerX, geo.fx, 0.35),
      topY: lerp(geo.noseY - geo.hh * 0.24, geo.browY + geo.eh * 1.2, g.noseBridge),
    };
  }
  function nostrils(P, C, n, rx = 2.6) {
    for (const k of [-1, 1]) P.ellipse(n.nx + k * n.nw * 0.32, n.ny - 0.5, rx * (0.6 + n.nw / 30), 1.4, C.ink, { stroke: false, wob: 0, rot: k * 0.3, n: 10 });
  }
  function bridgeShade(P, C, n) {
    P.fill([[n.bx, n.topY + 4], [n.nx + n.sd * n.nw * 0.45, n.ny - 7], [n.nx + n.sd * n.nw * 0.1, n.ny - 9], [n.bx - n.sd * 3, n.topY + 12]], C.skinShade, { wob: 0.3 });
  }

  PM.define('noses', 'line', {
    label: 'Brow line',
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), { nx, ny, sd, nw } = n;
      if (g.noseBridge > 0.35) bridgeShade(P, C, n);
      P.line([[n.bx, n.topY], [nx + sd * nw * 0.22, lerp(n.topY, ny, 0.55)], [nx + sd * nw * 0.58, ny - 5], [nx + sd * nw * 0.38, ny + 2], [nx, ny + 3], [nx - sd * nw * 0.22, ny + 1.5]], { w: 0.85, taper: 0.3 });
      P.line([[nx - sd * nw * 0.62, ny - 5], [nx - sd * nw * 0.58, ny], [nx - sd * nw * 0.32, ny + 1.8]], { w: 0.7, taper: 0.4 });
    },
  });
  PM.define('noses', 'broad', {
    label: 'Broad wings',
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), { nx, ny, nw } = n;
      P.line([[n.bx, lerp(n.topY, ny, 0.25)], [nx + n.sd * nw * 0.3, ny - geo.hh * 0.1]], { w: 0.45, taper: 0.5 });
      for (const k of [-1, 1]) P.line([[nx + k * nw * 0.42, ny - 11], [nx + k * nw * 0.88, ny - 5], [nx + k * nw * 0.8, ny + 1.5], [nx + k * nw * 0.45, ny + 2.5]], { w: 0.8, taper: 0.3 });
      P.line([[nx - nw * 0.36, ny + 3], [nx, ny + 5], [nx + nw * 0.36, ny + 3]], { w: 0.75, taper: 0.4 });
      nostrils(P, C, n, 3);
    },
  });
  PM.define('noses', 'button', {
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), { nx, ny, nw } = n;
      P.line([[nx - nw * 0.45, ny - 1], [nx - nw * 0.2, ny + 3.5], [nx + nw * 0.2, ny + 3.5], [nx + nw * 0.45, ny - 1]], { w: 0.75, taper: 0.4 });
      nostrils(P, C, n, 2.2);
    },
  });
  PM.define('noses', 'aquiline', {
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), { nx, ny, sd, nw } = n;
      bridgeShade(P, C, n);
      P.line([[n.bx, n.topY], [nx + sd * nw * 0.45, lerp(n.topY, ny, 0.45)], [nx + sd * nw * 0.3, ny - 6], [nx + sd * nw * 0.08, ny + 6], [nx - sd * nw * 0.25, ny + 3.5]], { w: 0.85, taper: 0.3 });
      for (const k of [-1, 1]) P.line([[nx + k * nw * 0.65, ny - 4], [nx + k * nw * 0.6, ny + 0.5], [nx + k * nw * 0.32, ny + 2]], { w: 0.6, taper: 0.4 });
    },
  });
  PM.define('noses', 'straight', {
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), { nx, ny, sd, nw } = n;
      if (g.noseBridge > 0.4) bridgeShade(P, C, n);
      P.line([[n.bx, n.topY], [nx + sd * nw * 0.4, ny - 3]], { w: 0.75, taper: 0.35 });
      P.line([[nx - nw * 0.55, ny], [nx - nw * 0.2, ny + 2.5], [nx + nw * 0.2, ny + 2.5], [nx + nw * 0.55, ny]], { w: 0.75, taper: 0.4 });
      nostrils(P, C, n, 2);
    },
  });
  PM.define('noses', 'minimal', {
    label: 'Minimal hook',
    draw(P, g, geo) {
      const n = noseCtx(g, geo), { nx, ny, sd, nw } = n;
      P.line([[n.bx, lerp(n.topY, ny, 0.25)], [nx + sd * nw * 0.35, ny, true], [nx - sd * nw * 0.35, ny + 1.5]], { w: 0.85, taper: 0.3, tension: 0.4 });
    },
  });

  // =====================================================================
  // Mouth
  // =====================================================================
  PM.mouthMetrics = function (g, geo) {
    const m = geo.mw, x0 = geo.mouthX, y0 = geo.mouthY;
    const uT = (2.5 + g.lipFull * 6.5) * (1 - g.age * 0.25), lT = (3 + g.lipFull * 8.5) * (1 - g.age * 0.2);
    const sx = k => 1 - Math.max(0, k * geo.t) * 0.35;
    const smile = clamp((g.smile || 0) + (g.exprSmile || 0), -1.4, 1.4);
    const cy = -smile * 7, sk = (g.smirk || 0) * 5;
    return { m, x0, y0, uT, lT, sx, cy, smile, sk, X: (k, f) => x0 + k * m * f * sx(k) };
  };
  function drawMouth(P, g, geo, C) {
    const M = PM.mouthMetrics(g, geo), { X, y0, uT, lT, cy, sk } = M, cu = g.cupid, sm = M.smile;
    const cL = y0 + cy + sk, cR = y0 + cy - sk;   // smirk lifts one corner
    const line = [[X(-1, 1), cL], [X(-1, 0.5), y0 + 0.8 - sm * 3 + sk * 0.4], [X(0, 0), y0 + 1.4], [X(1, 0.5), y0 + 0.8 - sm * 3 - sk * 0.4], [X(1, 1), cR]];
    const upper = [[X(-1, 1), cL, true], [X(-1, 0.62), y0 - uT * 0.62], [X(-1, 0.25), y0 - uT], [X(0, 0), y0 - uT * (1 - cu * 0.45), cu > 0.4], [X(1, 0.25), y0 - uT], [X(1, 0.62), y0 - uT * 0.62], [X(1, 1), cR, true], ...line.slice(1, -1).reverse()];
    const lower = [[X(1, 1), cR, true], [X(1, 0.6), y0 + lT * 0.78], [X(0, 0), y0 + lT], [X(-1, 0.6), y0 + lT * 0.78], [X(-1, 1), cL, true], ...line.slice(1, -1)];
    const open = Math.max(0, Math.min(1, g.mouthOpen || 0));
    if (open > 0.04) {
      // jaw drops: the lower lip and its line slide down, the mouth interior shows between
      const o = open * (7 + M.m * 0.32), drop = k => o * Math.pow(Math.sin(Math.PI * k), 0.7);
      const ks = [0, 0.18, 0.5, 0.82, 1];
      const lowLine = line.map((p, i) => [p[0], p[1] + drop(ks[i])]);
      const inside = [[...line[0], true], ...line.slice(1, -1), [...line[line.length - 1], true], ...lowLine.slice(1, -1).reverse()];
      const d = P.fill(inside, color.mix(C.ink, C.lip, 0.25), { wob: 0 });
      P.clip(d, () => {
        P.fill([[X(-1, 0.75), y0 - 4], [X(1, 0.75), y0 - 4], [X(1, 0.6), y0 + 0.8 + Math.min(3.2, o * 0.32)], [X(-1, 0.6), y0 + 0.8 + Math.min(3.2, o * 0.32)]], C.eyeWhite, { wob: 0 });
        P.ellipse(geo.mouthX, y0 + o * 0.9, M.m * 0.45, Math.max(1, o * 0.35), color.mix(C.lip, '#c0504a', 0.3), { stroke: false, wob: 0 });
        if ((g.browFurrow || 0) > 0.5 || sm < -0.6) { const by = y0 + o * 0.95; P.fill([[X(-1, 0.7), by + 6], [X(1, 0.7), by + 6], [X(1, 0.55), by - Math.min(3, o * 0.28)], [X(-1, 0.55), by - Math.min(3, o * 0.28)]], C.eyeWhite, { wob: 0 }); }
      });
      const lk = [0, 0.2, 0.5, 0.8, 1, 0.18, 0.5, 0.82];
      P.shape(lower.map((p, i) => [p[0], p[1] + drop(lk[i]), p[2]]), C.lip, { w: 0.5, wob: 0 });
      P.shape(upper, color.shade(C.lip, -0.12), { w: 0.5, wob: 0 });
      P.line(inside.concat([inside[0]]), { w: 0.75, taper: 0.1, wob: 0 });
    } else {
      P.shape(lower, C.lip, { w: 0.5, wob: 0.3 });
      P.shape(upper, color.shade(C.lip, -0.12), { w: 0.5, wob: 0.3 });
      P.line(line, { w: 0.95, taper: 0.3, wob: 0.3 });
    }
    if ((g.lipBite || 0) > 0.05 && open < 0.2) {
      // top teeth resting on the lower lip, a little off-centre
      const b = g.lipBite, bx = geo.mouthX + M.m * 0.12 * (g.noseSide || 1), w = M.m * 0.32, ty = y0 + 1.2;
      P.shape([[bx - w, ty, true], [bx + w, ty, true], [bx + w * 0.9, ty + lT * 0.45 * b + 1.5], [bx, ty + lT * 0.55 * b + 2], [bx - w * 0.9, ty + lT * 0.45 * b + 1.5]], C.eyeWhite, { w: 0.4, wob: 0, tension: 0.3 });
      P.line([[bx, ty + 0.5], [bx, ty + lT * 0.45 * b + 1]], { w: 0.25, wob: 0 });
    }
    if (g.age > 0.55) {
      for (const k of [-1, 1]) P.line([[X(k, 1.25), y0 + cy - 2], [X(k, 1.32), y0 + lT * 0.6]], { w: 0.3 + (g.age - 0.55), taper: 0.5 });
    }
  }

  // =====================================================================
  // Ears, head, neck
  // =====================================================================
  function drawEar(P, g, geo, C, ear) {
    if (ear.hidden) return;
    const s = ear.side, x = ear.x, top = ear.top, bot = ear.bot, h = bot - top, w = Math.min(18, h * 0.42);
    P.shape([[x - s * 3, top + 5], [x + s * w * 0.55, top - 2], [x + s * w, top + h * 0.35], [x + s * w * 0.75, bot - h * 0.25], [x + s * w * 0.3, bot + 2], [x - s * 3, bot - 4]], C.skin, { w: 0.85 });
    P.line([[x + s * w * 0.3, top + h * 0.15], [x + s * w * 0.65, top + h * 0.4], [x + s * w * 0.35, bot - h * 0.3]], { w: 0.5, taper: 0.4 });
  }

  function drawNeck(P, g, geo, C) {
    const bust = P.shape(geo.bustPts, C.skin, { w: 1 });
    const { neckX: x, nw, chinY, neckBase } = geo;
    // the jaw casts its own shape onto the neck: head outline nudged down, kept inside the neck
    const drop = 9 + 4 * g.neckLength;
    P.clip(bust, () => P.fill(geo.headDense.map(([px, py]) => [px + geo.t * 3, py + drop]), C.skinShade, { wob: 0.4, dense: true }));
    // collarbones
    for (const k of [-1, 1]) P.line([[x + k * nw * 0.35, neckBase + 12], [x + k * nw * 1.2, neckBase + 15], [x + k * nw * 2.1, neckBase + 12]], { w: 0.45, taper: 0.5 });
    if (g.gender === 'masc') P.line([[x + 2, chinY + 22], [x + 3, chinY + 28]], { w: 0.4, taper: 0.5 }); // adam's apple hint
  }

  function drawHead(P, g, geo, C) {
    geo.headInk = P.shape(geo.headPts, C.skin, { w: 1.05 });
  }

  function drawAgeLines(P, g, geo) {
    if (g.age < 0.55) return;
    const k = (g.age - 0.55) / 0.45, { fx, hw, hairlineY, browY } = geo;
    const rows = g.age > 0.78 ? 3 : 2;
    for (let i = 0; i < rows; i++) {
      const y = lerp(browY - 10, hairlineY + 6, (i + 0.5) / rows);
      P.line([[fx - hw * 0.35, y + 1], [fx, y - 1], [fx + hw * 0.35, y + 1]], { w: 0.25 + 0.35 * k, taper: 0.5 });
    }
    // smile lines
    const M = PM.mouthMetrics(g, geo);
    for (const s of [-1, 1]) {
      const x = geo.noseX + s * geo.hw * 0.2 * g.noseWidth * 0.95;
      P.line([[x, geo.noseY - 4], [x + s * 6, geo.noseY + 6], [M.X(s, 1.15), M.y0 + 4]], { w: 0.3 + 0.45 * k, taper: 0.45 });
    }
  }

  // =====================================================================
  // Facial hair: `under` draws before the mouth, `over` after it.
  // =====================================================================
  function beardShape(g, geo, o) {
    const M = PM.mouthMetrics(g, geo);
    const y1 = geo.ears[0].top + (geo.ears[0].bot - geo.ears[0].top) * o.start;
    const yEnd = geo.chinY - geo.hh * 0.1;
    const outer = s => {
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const y = lerp(y1, yEnd, i / 5), w = geo.widthAt(y);
        pts.push([(s > 0 ? w.r : w.l) + s * (1 + o.bulk * (i / 5) * 6), y]);
      }
      return pts;
    };
    const chin = geo.chinY + o.bulk * 10 + o.drop;
    const R = outer(1), L = outer(-1).reverse();
    // keep every inner point well inside the head outline, however narrow the face is dialled
    const inside = (x, y, s, m) => { const e = edge(y, s), lim = e - s * m; return s > 0 ? Math.min(x, lim) : Math.max(x, lim); };
    const inner = s => {
      const ym = lerp(y1, M.y0, 0.35), yc = lerp(M.y0, geo.noseY, 0.3);
      return [
        [inside(M.X(s, 1.08) + s * 3, M.y0 + 2, s, 7), M.y0 + 2],
        [inside(M.X(s, 1.45), yc, s, 7), yc],
        [inside(edge(ym, s) - s * (o.side + 8), ym, s, 6), ym],
        [edge(y1, s) - s * o.side * 0.55, y1],
      ];
    };
    const edge = (y, s) => { const w = geo.widthAt(y); return s > 0 ? w.r : w.l; };
    const pts = [...R, [geo.mouthX + geo.hw * 0.3 * (o.drop ? 0.7 : 1), chin - 4], [geo.mouthX, chin + 2], [geo.mouthX - geo.hw * 0.3 * (o.drop ? 0.7 : 1), chin - 4], ...L,
      ...inner(-1).reverse(), [M.X(-1, 0.45), M.y0 + M.lT + 5], [geo.mouthX, M.y0 + M.lT + 7], [M.X(1, 0.45), M.y0 + M.lT + 5], ...inner(1)];
    // inner(1) runs mouth → sideburn, which closes back onto R[0] at the sideburn top.
    return pts;
  }
  function beardTexture(P, g, d, C) {
    P.clip(d, () => {
      const b = curve.bbox(d), r = P.noise();
      const n = Math.round(b.w * b.h / 90);
      for (let i = 0; i < n; i++) {
        const x = r.range(b.x, b.x + b.w), y = r.range(b.y, b.y + b.h);
        if (g.hairTexture >= 3) P.hair(curve.ellipse(x, y, 1.6, 1.6, 6, 0, 0, Math.PI * 1.4), 0.7, C.hairHi);
        else P.hair([[x, y], [x + r.range(-1, 1), y + 4]], 0.7, C.hairHi);
      }
    });
  }
  function mustache(P, g, geo, C) {
    const M = PM.mouthMetrics(g, geo), { X, y0 } = M, ny = geo.noseY, top = lerp(ny, y0 - M.uT, 0.25);
    P.shape([[X(-1, 1.12), y0 + 1, true], [X(-1, 0.75), top + 3], [X(0, 0), top], [X(1, 0.75), top + 3], [X(1, 1.12), y0 + 1, true], [X(1, 0.55), y0 - M.uT * 0.75], [X(0, 0), y0 - M.uT * 0.95], [X(-1, 0.55), y0 - M.uT * 0.75]], C.hair, { w: 0.6 });
  }
  PM.define('facialHair', 'none', { label: 'None' });
  PM.define('facialHair', 'stubble', {
    under(P, g, geo, C) {
      const d = curve.closed(beardShape(g, geo, { start: 0.45, bulk: 0, drop: 0, side: 10 }), 0.35);
      P.clip(geo.headInk || geo.headDense, () => P.clip(d, () => {
        const b = curve.bbox(d), r = P.noise();
        for (let i = 0; i < b.w * b.h / 14; i++) P.dot(r.range(b.x, b.x + b.w), r.range(b.y, b.y + b.h), 0.55, color.mix(C.hair, C.skin, 0.25));
        const M = PM.mouthMetrics(g, geo);
        for (let i = 0; i < 70; i++) P.dot(r.range(M.X(-1, 1), M.X(1, 1)), r.range(geo.noseY + 5, M.y0 - M.uT), 0.55, color.mix(C.hair, C.skin, 0.25));
      }));
    },
  });
  PM.define('facialHair', 'mustache', { over: mustache });
  PM.define('facialHair', 'goatee', {
    under(P, g, geo, C) {
      const M = PM.mouthMetrics(g, geo), { X, y0 } = M;
      const d = P.shape([[X(-1, 0.75), y0 + M.lT + 2], [X(-1, 0.55), geo.chinY - 2], [geo.mouthX, geo.chinY + 6], [X(1, 0.55), geo.chinY - 2], [X(1, 0.75), y0 + M.lT + 2], [geo.mouthX, y0 + M.lT + 5]], C.hair, { w: 0.7 });
      beardTexture(P, g, d, C);
    },
    over: mustache,
  });
  PM.define('facialHair', 'short-beard', {
    under(P, g, geo, C) { const d = P.shape(beardShape(g, geo, { start: 0.45, bulk: 0.4, drop: 0, side: 9 }), C.hair, { w: 0.85 }); beardTexture(P, g, d, C); },
    over: mustache,
  });
  PM.define('facialHair', 'full-beard', {
    under(P, g, geo, C) { const d = P.shape(beardShape(g, geo, { start: 0.3, bulk: 1, drop: 6, side: 11 }), C.hair, { w: 1 }); beardTexture(P, g, d, C); },
    over: mustache,
  });
  PM.define('facialHair', 'long-beard', {
    under(P, g, geo, C) { const d = P.shape(beardShape(g, geo, { start: 0.3, bulk: 1.3, drop: 34 * g.hairLength, side: 11 }), C.hair, { w: 1 }); beardTexture(P, g, d, C); },
    over: mustache,
  });
  PM.define('facialHair', 'chinstrap', {
    under(P, g, geo, C) {
      const L = [], R = [];
      for (let i = 0; i <= 8; i++) {
        const y = lerp(geo.ears[0].bot - 4, geo.chinY - 4, i / 8), w = geo.widthAt(y);
        L.push([w.l + 2, y]); R.push([w.r - 2, y]);
      }
      const pts = L, right = R;
      P.band([...pts, [geo.fx, geo.chinY + 2], ...right.reverse()], 6, C.hair, { w: 0.5 });
    },
  });

  // =====================================================================
  // Signature details ("marks"). layer: 'skin' (before features) or 'top' (after hair)
  // =====================================================================
  function cheekPt(geo, s) { return [geo.fx + s * geo.hw * 0.52 * (1 - Math.max(0, s * geo.t) * 0.3), geo.noseY - geo.hh * 0.06]; }

  PM.define('marks', 'freckles', {
    layer: 'skin',
    draw(P, g, geo, C) {
      const r = P.noise(), col = color.shade(C.skin, -0.35);
      for (const s of [-1, 1]) {
        const [x, y] = cheekPt(geo, s);
        for (let i = 0; i < 16; i++) P.dot(x + r.gauss(0, 9) - s * 6, y + r.gauss(-3, 5), r.range(0.6, 1.3), col);
      }
      for (let i = 0; i < 6; i++) P.dot(geo.noseX + r.gauss(0, 5), geo.noseY - 10 + r.gauss(0, 3), 0.8, col);
    },
  });
  PM.define('marks', 'blush', {
    layer: 'skin',
    draw(P, g, geo, C) { for (const s of [-1, 1]) { const [x, y] = cheekPt(geo, s); P.ellipse(x, y + 3, 11, 7, C.blush, { stroke: false, wob: 0.5 }); } },
  });
  PM.define('marks', 'thanaka', {
    label: 'Thanaka paste',
    layer: 'skin',
    draw(P, g, geo, C) { for (const s of [-1, 1]) { const [x, y] = cheekPt(geo, s); P.ellipse(x, y, 13, 11, PM.styleSnap(g, '#ecdcae'), { stroke: false, wob: 1.6 }); } },
  });
  PM.define('marks', 'beauty-mark', {
    layer: 'top',
    draw(P, g, geo, C) { const M = PM.mouthMetrics(g, geo); P.dot(M.X(g.noseSide > 0 ? 1 : -1, 1.25), M.y0 - 9, 1.5, C.ink); },
  });
  PM.define('marks', 'dimples', {
    layer: 'top',
    draw(P, g, geo) { const M = PM.mouthMetrics(g, geo); for (const s of [-1, 1]) P.line([[M.X(s, 1.32), M.y0 - 4], [M.X(s, 1.4), M.y0 + 1], [M.X(s, 1.32), M.y0 + 5]], { w: 0.4, taper: 0.5 }); },
  });
  PM.define('marks', 'bindi', {
    layer: 'top',
    draw(P, g, geo) { P.circle(geo.fx, geo.browY - geo.eh * 0.6, 2.8, PM.styleSnap(g, '#b02a2a'), { w: 0.3, wob: 0 }); },
  });
  PM.define('marks', 'tilak', {
    layer: 'top',
    draw(P, g, geo) {
      const x = geo.fx, y = geo.browY - 2;
      P.band([[x, y], [x, y - geo.hh * 0.22]], 3.4, PM.styleSnap(g, '#d9822b'), { w: 0.3, wob: 0.2 });
    },
  });
  PM.define('marks', 'kohl', { label: 'Kohl liner', layer: 'none' }); // read by the eye renderer
  PM.define('marks', 'nose-stud', {
    layer: 'top',
    draw(P, g, geo, C) { const n = noseCtx(g, geo); P.circle(n.nx - n.sd * n.nw * 0.62, n.ny - 4, 1.8, C.metal, { w: 0.35, wob: 0 }); },
  });
  PM.define('marks', 'nose-ring', {
    layer: 'top',
    draw(P, g, geo, C) {
      const n = noseCtx(g, geo), x = n.nx - n.sd * n.nw * 0.6, y = n.ny - 2;
      P.ctx.save(); P.ctx.lineWidth = 2.6 * P.lw; P.ctx.strokeStyle = C.ink; P.ctx.beginPath(); P.ctx.arc(x - n.sd * 1, y + 4, 5, -0.4, Math.PI + 0.4); P.ctx.stroke();
      P.ctx.lineWidth = 1.3 * P.lw; P.ctx.strokeStyle = C.metal; P.ctx.stroke(); P.ctx.restore();
    },
  });
  PM.define('marks', 'septum', {
    label: 'Septum ring',
    layer: 'top',
    draw(P, g, geo, C) {
      const { noseX: x, noseY: y } = geo;
      P.ctx.save(); P.ctx.lineWidth = 2.4 * P.lw; P.ctx.strokeStyle = C.ink; P.ctx.beginPath(); P.ctx.arc(x, y + 3, 3.4, 0.1, Math.PI - 0.1); P.ctx.stroke();
      P.ctx.lineWidth = 1.2 * P.lw; P.ctx.strokeStyle = C.metal; P.ctx.stroke(); P.ctx.restore();
    },
  });
  PM.define('marks', 'chin-tattoo', {
    label: 'Chin tattoo',
    layer: 'top',
    draw(P, g, geo) {
      const col = PM.styleSnap(g, '#2b3d5c'), x = geo.mouthX, M = PM.mouthMetrics(g, geo), y0 = M.y0 + M.lT + 5, y1 = geo.chinY - 3;
      P.line([[x, y0], [x, y1]], { w: 0.5, color: col, taper: 0.2, wob: 0.2 });
      for (let i = 0; i < 3; i++) { const y = lerp(y0 + 3, y1 - 2, i / 2); P.line([[x - 4, y - 2], [x, y + 1, true], [x + 4, y - 2]], { w: 0.4, color: col, taper: 0.3, wob: 0 }); }
      P.dot(x, y0 - 2, 1.2, col);
    },
  });
  PM.define('marks', 'cheek-lines', {
    label: 'Cheek lines',
    layer: 'top',
    draw(P, g, geo, C) {
      for (const s of [-1, 1]) {
        const [x, y] = cheekPt(geo, s);
        for (let i = 0; i < 3; i++) P.line([[x + s * 2 - 6, y - 6 + i * 5], [x + s * 2 + 6, y - 4 + i * 5]], { w: 0.5, color: C.skinDeep, taper: 0.4, wob: 0.2 });
      }
    },
  });
  PM.define('marks', 'paint-dots', {
    label: 'Ceremonial dots',
    layer: 'top',
    draw(P, g, geo, C) {
      const col = PM.styleSnap(g, '#f2ead6');
      for (const s of [-1, 1]) {
        const [x, y] = cheekPt(geo, s);
        for (let i = 0; i < 5; i++) P.bead(x + s * (i * 4 - 8), y - 6 + i * 2.5, 1.7, col, 0.5);
      }
    },
  });
  PM.define('marks', 'brow-scar', {
    label: 'Brow scar',
    layer: 'top',
    draw(P, g, geo, C) { const e = geo.eyes[1]; P.line([[e.x - 3, geo.browY - 9], [e.x + 4, geo.browY + 4]], { w: 0.75, color: C.skinDeep, taper: 0.3, wob: 0 }); },
  });

  PM.features = { drawEye, drawBrow, drawMouth, drawEar, drawNeck, drawHead, drawAgeLines };
})(window.PM = window.PM || {});
