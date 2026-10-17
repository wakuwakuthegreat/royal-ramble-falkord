/* Render pipeline. The portrait is a stack of LAYERS drawn in z order.
 * Each layer: { z, draw(P, g, geo, C, ctx), clip? } where ctx = { hair, headwear } defs
 * and clip: 'head' confines the layer to the head outline.
 * Add a layer with PM.define('layers', 'my-layer', { z: 73, draw(P, g, geo, C) {...} }). */
(function (PM) {
  'use strict';
  const F = () => PM.features;
  const none = { hides: { hair: 'none' } };

  // clip: 'head' keeps a layer inside the head outline, so no knob setting can push it past the face.
  const L = (id, z, draw, clip) => PM.define('layers', id, { z, draw, clip });

  L('background', 0, (P, g, geo, C) => {
    const bg = PM.get('backgrounds', g.background);
    if (bg) bg.draw(P, g, geo, C, new PM.RNG(PM.hashString(g.seed + ':paper')));
    if (g.background !== 'transparent') crumple(P, geo, g.crumple);
  });
  L('headwear-back', 5, (P, g, geo, C, x) => x.headwear.back && x.headwear.back(P, g, geo, C));
  L('hair-back', 10, (P, g, geo, C, x) => x.hair && x.hair.back(P, g, geo, C));
  L('neck', 20, (P, g, geo, C) => F().drawNeck(P, g, geo, C));
  L('clothing', 30, (P, g, geo, C) => { const c = PM.get('clothing', g.clothing); if (c) c.draw(P, g, geo, C); });
  L('necklace', 35, (P, g, geo, C) => { const n = PM.get('necklaces', g.necklace); if (n) n.draw(P, g, geo, C); });
  L('extras-body', 37, (P, g, geo, C, x) => extras(P, g, geo, C, x, 'body'));
  L('ears', 40, (P, g, geo, C, x) => { if (!x.headwear.hides.ears) geo.ears.forEach(e => F().drawEar(P, g, geo, C, e)); });
  L('head', 50, (P, g, geo, C) => F().drawHead(P, g, geo, C));
  L('skin-marks', 55, (P, g, geo, C) => marks(P, g, geo, C, 'skin'), 'head');
  L('age-lines', 57, (P, g, geo, C) => F().drawAgeLines(P, g, geo, C), 'head');
  L('brows', 60, (P, g, geo, C) => geo.eyes.forEach(e => F().drawBrow(P, g, geo, C, e)), 'head');
  L('eyes', 62, (P, g, geo, C) => geo.eyes.forEach(e => F().drawEye(P, g, geo, C, e)), 'head');
  L('nose', 64, (P, g, geo, C) => { const n = PM.get('noses', g.noseStyle) || PM.list('noses')[0]; n.draw(P, g, geo, C); }, 'head');
  L('beard-under', 66, (P, g, geo, C) => { const f = PM.get('facialHair', g.facialHair); if (f && f.under) f.under(P, g, geo, C); });
  L('mouth', 68, (P, g, geo, C) => F().drawMouth(P, g, geo, C), 'head');
  L('beard-over', 70, (P, g, geo, C) => { const f = PM.get('facialHair', g.facialHair); if (f && f.over) f.over(P, g, geo, C); });
  L('face-marks', 72, (P, g, geo, C) => marks(P, g, geo, C, 'top'));
  L('eyewear', 75, (P, g, geo, C) => { const e = PM.get('eyewear', g.eyewear); if (e) e.draw(P, g, geo, C); });
  L('extras-face', 77, (P, g, geo, C, x) => extras(P, g, geo, C, x, 'face'));
  L('hair-front', 80, (P, g, geo, C, x) => x.hair && x.hair.front(P, g, geo, C));
  L('headwear', 85, (P, g, geo, C, x) => x.headwear.front && x.headwear.front(P, g, geo, C));
  L('earrings', 90, (P, g, geo, C, x) => { if (!x.headwear.hides.earrings && !x.headwear.hides.ears) { const e = PM.get('earrings', g.earrings); if (e) e.draw(P, g, geo, C); } });
  L('extras-top', 92, (P, g, geo, C, x) => extras(P, g, geo, C, x, 'top'));
  L('headwear-late', 95, (P, g, geo, C, x) => x.headwear.late && x.headwear.late(P, g, geo, C));

  // Crumpled paper over everything — the whole sheet has been folded and smoothed out again.
  L('crumple-over', 99, (P, g, geo) => { if (g.background !== 'transparent') crumple(P, geo, g.crumpleAll); });

  /** Multiply the wrinkled-paper texture (js/data/paper-texture.js) over the canvas. */
  function crumple(P, geo, amount) {
    const img = PM.paperTexture;
    if (!(amount > 0) || !img || !img.complete || !img.naturalWidth) return;
    const { W, H } = geo, k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    const ctx = P.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(1, amount);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.restore();
  }

  function marks(P, g, geo, C, layer) {
    for (const id of g.marks || []) {
      const m = PM.get('marks', id);
      if (m && m.layer === layer && m.draw) m.draw(P, g, geo, C);
    }
  }

  function extras(P, g, geo, C, x, layer) {
    for (const id of g.accessories || []) {
      const a = PM.get('accessories', id);
      if (!a || a.layer !== layer || !a.draw) continue;
      if (a.ears && x.headwear.hides.ears) continue; // tucked behind an ear the hat covers
      a.draw(P, g, geo, C, x);
    }
  }

  /** Fill in anything missing (old saved genomes, new controls) with defaults. */
  PM.complete = function (g) {
    const out = Object.assign({}, g);
    for (const c of PM.controls) if (out[c.id] === undefined) out[c.id] = PM.defaultFor(c);
    if (out.seed == null) out.seed = 1;
    if (out.noseSide == null) out.noseSide = -1;
    return out;
  };

  /**
   * Draw genome g onto a canvas, scaled to fit its pixel size.
   * opts.skip: optional Set of layer ids to skip (e.g. 'background').
   * opts.zMin / opts.zMax: only draw layers in that z range (the Animator caches the rest).
   * opts.noClear: draw on top of what's already on the canvas.
   */
  PM.render = function (canvas, g, opts = {}) {
    g = PM.complete(g);
    const ctx = canvas.getContext('2d');
    const { W, H } = PM.CANVAS, scale = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!opts.noClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const geo = PM.geometry(g, W, H);
    const C = PM.styleColors(g);
    const P = new PM.Painter(ctx, { ink: C.ink, lineWeight: g.lineWeight, wobble: g.wobble, seed: g.seed });
    const headwear = PM.get('headwear', g.headwear) || none;
    headwear.hides = headwear.hides || {};
    geo.hatted = headwear.hides.hair === 'top';
    let hair = headwear.hides.hair === 'all' ? null : PM.get('hair', g.hairStyle) || null;
    if (hair && geo.hatted && hair.hatFallback) hair = PM.get('hair', hair.hatFallback);
    const x = { hair, headwear };

    const skip = opts.skip || new Set();
    for (const layer of PM.list('layers').sort((a, b) => a.z - b.z)) {
      if (skip.has(layer.id)) continue;
      if ((opts.zMin != null && layer.z < opts.zMin) || (opts.zMax != null && layer.z > opts.zMax)) continue;
      ctx.save();
      try {
        if (layer.clip === 'head') { ctx.beginPath(); P.tracePath(geo.headInk || geo.headDense, true); ctx.clip(); }
        layer.draw(P, g, geo, C, x);
      }
      catch (err) { console.warn('[portrait] layer "' + layer.id + '" failed:', err); }
      ctx.restore();
    }
    return { geo, C };
  };
})(window.PM = window.PM || {});
