/* Superheroes and Avatar-style bits: cowl with lenses, domino mask, hero suit with emblem,
 * cape, arrow tattoo, Kyoshi warrior paint, hair loopies and a wolf tail.
 * Genome extras these read (set them from a fiction `look`): emblem ('circle' | 'star' | 'bolt' | 'i'),
 * capeColor, maskColor. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;
  const K = PM.hairKit;
  const N = () => PM.necklines;
  const body = (P, g, geo, C, neckline, o = {}) => P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { w: 1 });

  /** Even-odd fill: an outer shape with holes punched through (eye holes in masks). */
  function holed(P, outer, holes, fill, o = {}) {
    const dO = P.dense(outer, true, o), dH = holes.map(h => P.dense(h, true, { wob: 0 }));
    const ctx = P.ctx;
    ctx.beginPath();
    for (const d of [dO, ...dH]) { ctx.moveTo(d[0][0], d[0][1]); for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]); ctx.closePath(); }
    ctx.fillStyle = fill; ctx.fill('evenodd');
    P.brush(dO, true, P.baseWidth(o), P.ink, o);
    for (const d of dH) P.brush(d, true, P.baseWidth({ w: 0.7 }), P.ink, {});
    return dO;
  }
  const eyeHole = (geo, e, k = 1) => curve.ellipse(e.x, e.y - 1, geo.ew * 0.68 * e.s * k, geo.eh * 2.3 * k, 16);

  // =================================================================== MASKS
  PM.define('headwear', 'cowl', {
    label: 'Superhero cowl (lenses)',
    hides: { hair: 'all', ears: true, earrings: true },
    front(P, g, geo, C) {
      const { cx, hw, top, eyeY, eh, fx, noseY, hh } = geo, low = eyeY + eh * 3.6;
      const outer = [[cx - hw * 1.06, low, true], [cx - hw * 1.12, top + hh * 0.4], [cx - hw * 0.9, top + 2], [cx, top - 10], [cx + hw * 0.9, top + 2], [cx + hw * 1.12, top + hh * 0.4], [cx + hw * 1.06, low, true],
        [cx + hw * 0.7, low - 2], [fx + hw * 0.2, noseY - hh * 0.14], [fx, noseY - hh * 0.06, true], [fx - hw * 0.2, noseY - hh * 0.14], [cx - hw * 0.7, low - 2]];
      P.shape(outer, g.maskColor || C.cloth[1], { w: 1 });
      for (const e of geo.eyes) {
        const s = e.side, w = geo.ew * 0.95 * e.s, h = eh * 2.5;
        P.shape([[e.x - s * w, e.y + h * 0.3, true], [e.x - s * w * 0.3, e.y - h], [e.x + s * w, e.y - h * 0.8, true], [e.x + s * w * 0.4, e.y + h * 0.7]], C.white, { w: 0.9, wob: 0, tension: 0.35 });
      }
    },
  });
  PM.define('eyewear', 'domino-mask', {
    label: 'Domino mask',
    draw(P, g, geo, C) {
      const { cx, hw, eyeY, eh, fx } = geo;
      const outer = [[cx - hw * 0.92, eyeY - eh * 1.2], [cx - hw * 0.6, eyeY - eh * 3.2], [fx, eyeY - eh * 2.2], [cx + hw * 0.6, eyeY - eh * 3.2], [cx + hw * 0.92, eyeY - eh * 1.2], [cx + hw * 0.62, eyeY + eh * 2.8], [fx, eyeY + eh * 1.2], [cx - hw * 0.62, eyeY + eh * 2.8]];
      holed(P, outer, geo.eyes.map(e => eyeHole(geo, e, 0.85)), g.maskColor || C.ink, { w: 0.8 });
    },
  });

  // =================================================================== SUIT & CAPE
  PM.define('clothing', 'hero-suit', {
    label: 'Superhero suit',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, chinY } = geo;
      const d = body(P, g, geo, C, N().round(geo, -6, 1.12));
      // two-tone yoke over the shoulders and a high neck
      P.clip(d, () => {
        P.fill([[cx - sw * 1.3, b - 30], [cx + sw * 1.3, b - 30], [cx + sw * 1.3, b + 60], [cx + sw * 0.62, b + 52], [x + nw * 0.9, b + 80], [x, b + 96, true], [x - nw * 0.9, b + 80], [cx - sw * 0.62, b + 52], [cx - sw * 1.3, b + 60]], C.cloth[1], { wob: 0.3 });
        for (const k of [-1, 1]) P.line([[cx + k * sw * 0.95, b + 70], [cx + k * sw * 0.86, geo.H + 10]], { w: 0.6 });
      });
      P.shape([[x - nw * 1.08, b + 2, true], [x - nw * 1.04, chinY + 16], [x, chinY + 20], [x + nw * 1.04, chinY + 16], [x + nw * 1.08, b + 2, true], [x, b + 8]], C.cloth[1], { w: 0.8 });
      const em = g.emblem || 'none', ey = b + 118;
      if (em === 'circle') { P.circle(x, ey, 22, C.cloth[2], { w: 0.8 }); P.circle(x, ey, 11, C.cloth[0], { w: 0.5 }); }
      else if (em === 'star') { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; pts.push([x + Math.cos(a) * r, ey + Math.sin(a) * r, true]); } P.shape(pts, C.cloth[2], { smooth: false, w: 0.7 }); }
      else if (em === 'bolt') P.shape([[x - 6, ey - 24, true], [x + 12, ey - 24, true], [x + 2, ey - 2, true], [x + 14, ey - 2, true], [x - 10, ey + 26, true], [x - 2, ey + 4, true], [x - 14, ey + 4, true]], C.cloth[2], { smooth: false, w: 0.7 });
      else if (em === 'i') { P.circle(x, ey, 20, C.cloth[1], { w: 0.8 }); P.band([[x, ey - 11], [x, ey + 11]], 6, C.cloth[0], { w: 0.4, wob: 0 }); }
    },
  });
  PM.define('accessories', 'cape', {
    layer: 'body',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo, col = g.capeColor || C.cloth[2];
      for (const s of [-1, 1]) P.shape([[x + s * nw * 1.05, b - 2], [cx + s * sw * 0.7, b + 12], [cx + s * sw * 1.1, b + 50], [cx + s * sw * 1.22, H + 30, true], [cx + s * sw * 1.02, H + 30, true], [cx + s * sw * 0.95, b + 60], [cx + s * sw * 0.55, b + 26], [x + s * nw * 1.2, b + 10]], col, { w: 0.9 });
      for (const s of [-1, 1]) P.circle(x + s * nw * 1.5, b + 12, 5, C.metal, { w: 0.6, wob: 0 });
    },
  });

  // =================================================================== AVATAR-STYLE MARKS & HAIR
  PM.define('marks', 'air-arrow', {
    label: 'Arrow tattoo', layer: 'skin',
    draw(P, g, geo) {
      const { cx, top, fx, browY, hairlineY } = geo, blue = PM.styleSnap(g, '#3a74c6'), tipY = browY - 4, baseY = lerp(hairlineY, browY, 0.45);
      P.band([[cx, top - 4], [lerp(cx, fx, 0.6), lerp(top, baseY, 0.6)], [fx, baseY]], 9, blue, { w: 0.4, wob: 0.1 });
      P.shape([[fx - 13, baseY - 2, true], [fx + 13, baseY - 2, true], [fx, tipY + 6, true]], blue, { w: 0.4, smooth: false, wob: 0 });
    },
  });
  PM.define('marks', 'kyoshi-paint', {
    label: 'Kyoshi warrior paint', layer: 'skin',
    draw(P, g, geo) {
      const ctx = P.ctx, red = PM.styleSnap(g, '#b3302a');
      ctx.save(); ctx.globalAlpha = 0.92;
      P.clip(geo.headInk || geo.headDense, () => P.fill([[0, geo.hairlineY - 4], [geo.W, geo.hairlineY - 4], [geo.W, geo.H], [0, geo.H]], PM.styleSnap(g, '#f4f0ea'), { smooth: false, wob: 0 }));
      ctx.restore();
      for (const e of geo.eyes) {
        const s = e.side, w = geo.ew * e.s, h = geo.eh;
        P.fill([[e.x - s * w * 0.55, e.y - h * 0.3], [e.x - s * w * 0.3, e.y - h * 3.4], [e.x + s * w * 0.9, e.y - h * 3.8], [e.x + s * w * 1.2, e.y - h * 0.6], [e.x + s * w * 0.6, e.y + h * 0.9]], red, { wob: 0.3 });
      }
    },
  });
  K.hairStyle('loopies', {
    label: 'Long with hair loopies',
    silhouette: (geo, g) => K.longSil(geo, g, {}),
    hole: () => ({ noPart: true }),
    frontExtra(P, g, geo, C) {
      for (const s of [-1, 1]) {
        const x = geo.cx + s * geo.hw * 0.72, y = geo.hairlineY + 8;
        P.band([[x, y], [x + s * 16, geo.eyeY + 4], [x + s * 10, geo.eyeY + 34], [x + s * 2, geo.eyeY + 10]], 6, C.hair, { w: 0.6 });
        P.bead(x + s * 2, y + 4, 3.2, C.cloth[1], 0.6);
      }
    },
  });
  K.hairStyle('wolf-tail', {
    label: 'Wolf tail (shaved sides)',
    silhouette: (geo, g) => K.capSil(geo, g, { vol: 3, side: 0.5 }),
    hole: () => ({ square: true }),
    fill: C => color.mix(C.hair, C.skin, 0.35),
    texture(P, g, geo, C, r, box) { for (let i = 0; i < box.w * box.h / 10; i++) P.dot(r.range(box.x, box.x + box.w), r.range(box.y, box.y + box.h), 0.6, C.hair); },
    frontExtra(P, g, geo, C) {
      if (geo.hatted) return;
      const { cx, top } = geo;
      P.shape([[cx - 10, top + 6], [cx - 8, top - 10], [cx, top - 22], [cx + 8, top - 10], [cx + 10, top + 6]], C.hair, { w: 0.8 });
      P.band([[cx - 9, top + 2], [cx + 9, top + 2]], 4, C.cloth[2], { w: 0.4, wob: 0 });
    },
  });
})(window.PM = window.PM || {});
