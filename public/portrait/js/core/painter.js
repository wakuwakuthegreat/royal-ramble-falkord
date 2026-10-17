/* The Painter wraps a canvas context with the "flat painting method":
 *   1. bold, hand-inked black outlines (variable-width brush with a slight wobble)
 *   2. flat fills — no gradients
 *   3. hard-edged features and flat patterns clipped inside shapes
 *
 * Every part draws through a Painter `P`, so changing line weight / wobble / ink colour
 * restyles the whole portrait at once. */
(function (PM) {
  'use strict';
  const { curve, math } = PM;
  const TAU = Math.PI * 2;

  function densifyLinear(pts, closed, step = 6) {
    const out = [];
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let s = 0; s < k; s++) out.push([math.lerp(a[0], b[0], s / k), math.lerp(a[1], b[1], s / k)]);
    }
    if (!closed) out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    return out;
  }

  class Painter {
    /**
     * @param ctx  CanvasRenderingContext2D
     * @param opts { ink, lineWeight, wobble, seed }
     */
    constructor(ctx, opts = {}) {
      this.ctx = ctx;
      this.ink = opts.ink || '#16120f';
      this.lw = opts.lineWeight != null ? opts.lineWeight : 1;
      this.wob = opts.wobble != null ? opts.wobble : 1;
      this.seed = opts.seed != null ? opts.seed : 1;
      this.n = 0;
    }

    /** Deterministic per-call noise stream (same genome → same wobble). */
    noise() { this.n++; return new PM.RNG(PM.hashString(this.seed + '#' + this.n)); }

    // ---------- geometry prep ----------
    dense(pts, closed, o = {}) {
      let d = o.smooth === false ? densifyLinear(pts, closed) : (closed ? curve.closed(pts, o.density || 0.35, o.tension) : curve.open(pts, o.density || 0.35, o.tension));
      const amp = this.wob * (o.wob != null ? o.wob : 1);
      if (amp > 0 && d.length > 3) d = this.wobble(d, closed, amp);
      return d;
    }

    wobble(d, closed, amp) {
      const r = this.noise();
      const n = d.length;
      const cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]));
      const L = cum[n - 1] + (closed ? Math.hypot(d[0][0] - d[n - 1][0], d[0][1] - d[n - 1][1]) : 0) || 1;
      const A = amp * 1.5 * math.clamp(L / 140, 0.2, 1);
      const k1 = closed ? Math.max(1, Math.round(L / 150)) : L / 150;
      const k2 = closed ? Math.max(2, Math.round(L / 50)) : L / 50;
      const p1 = r.range(0, TAU), p2 = r.range(0, TAU);
      return d.map((p, i) => {
        const a = d[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
        const b = d[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const s = cum[i] / L;
        let off = A * (0.65 * Math.sin(TAU * k1 * s + p1) + 0.35 * Math.sin(TAU * k2 * s + p2));
        if (!closed) off *= Math.min(1, s * 8, (1 - s) * 8); // keep stroke endpoints anchored
        return [p[0] - (dy / len) * off, p[1] + (dx / len) * off];
      });
    }

    tracePath(d, closed = true) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(d[0][0], d[0][1]);
      for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]);
      if (closed) ctx.closePath();
    }

    // ---------- ink ----------
    /** Variable-width brush along a dense polyline. Segments of equal width are batched. */
    brush(d, closed, width, color, o = {}) {
      if (width <= 0 || d.length < 2) return;
      const ctx = this.ctx, r = this.noise();
      ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const n = d.length, segs = closed ? n : n - 1;
      const vary = o.vary != null ? o.vary : (closed ? 0.18 : 0.3);
      const taper = o.taper != null ? o.taper : (closed ? 0 : 0.22);
      const f1 = closed ? 2 : 1.3, f2 = closed ? 5 : 3.7;
      const p1 = r.range(0, TAU), p2 = r.range(0, TAU);
      let runW = -1;
      for (let i = 0; i < segs; i++) {
        const a = d[i], b = d[(i + 1) % n];
        const s = i / Math.max(1, segs - 1);
        let w = width * (1 + vary * (0.6 * Math.sin(TAU * f1 * s + p1) + 0.4 * Math.sin(TAU * f2 * s + p2)));
        if (taper > 0) {
          const ts = o.taperStart === false ? 1 : s / taper;
          const te = o.taperEnd === false ? 1 : (1 - s) / taper;
          w *= 0.18 + 0.82 * Math.pow(math.clamp(Math.min(1, ts, te), 0, 1), 0.7);
        }
        const wq = Math.max(0.25, Math.round(w * 4) / 4);
        if (wq !== runW) {
          if (runW > 0) ctx.stroke();
          ctx.beginPath(); ctx.lineWidth = wq; ctx.moveTo(a[0], a[1]); runW = wq;
        }
        ctx.lineTo(b[0], b[1]);
      }
      if (runW > 0) ctx.stroke();
    }

    baseWidth(o) { return 3.1 * this.lw * (o.w != null ? o.w : 1); }

    /** Closed flat shape with ink outline. Returns the dense outline (reuse it for clipping). */
    shape(pts, fill, o = {}) {
      const d = o.dense ? pts : this.dense(pts, true, o);
      const ctx = this.ctx;
      if (fill) { this.tracePath(d); ctx.fillStyle = fill; ctx.fill(); }
      if (o.pattern) this.pattern(d, o.pattern.id, o.pattern.colors, o.pattern);
      if (o.stroke !== false) this.brush(d, true, this.baseWidth(o), o.color || this.ink, o);
      return d;
    }
    fill(pts, color, o = {}) { return this.shape(pts, color, Object.assign({}, o, { stroke: false })); }

    /** Open inked stroke. */
    line(pts, o = {}) {
      const d = o.dense ? pts : this.dense(pts, false, o);
      this.brush(d, false, this.baseWidth(o), o.color || this.ink, o);
      return d;
    }

    /** Thin constant-width stroke without wobble (hair texture, stitching, fine detail). */
    hair(pts, width, color, o = {}) {
      const d = o.smooth === false ? pts : curve.open(pts, 0.25);
      const ctx = this.ctx;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round';
      this.tracePath(d, false); ctx.stroke();
    }

    ellipse(cx, cy, rx, ry, fill, o = {}) {
      return this.shape(curve.ellipse(cx, cy, rx, ry, o.n || 14, o.rot || 0), fill, o);
    }
    circle(cx, cy, r, fill, o = {}) { return this.ellipse(cx, cy, r, r, fill, o); }

    /** Plain filled dot — cheap, for beads, stipple, texture. */
    dot(x, y, r, color) {
      const ctx = this.ctx;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.2, r), 0, TAU); ctx.fillStyle = color; ctx.fill();
    }
    /** Plain dot with an ink ring (beads, pearls). */
    bead(x, y, r, color, ring = 0.9) {
      this.dot(x, y, r, this.ink);
      this.dot(x, y, Math.max(0.2, r - ring * this.lw), color);
    }

    /** Clip subsequent drawing in fn() to a dense closed outline. */
    clip(d, fn) {
      const ctx = this.ctx;
      ctx.save(); this.tracePath(d); ctx.clip(); fn(); ctx.restore();
    }

    /** Fill a dense closed outline with a registered pattern. */
    pattern(d, id, colors, o = {}) {
      const def = PM.get('patterns', id);
      if (!def || !def.draw) return;
      const box = curve.bbox(d);
      const r = this.noise();
      this.clip(d, () => def.draw(this, box, colors, r, o.scale || 1, o));
    }

    /** A ribbon/band along a centre line — collars, sashes, trims, cords. */
    band(center, width, fill, o = {}) {
      const c = curve.open(center, 0.3);
      const half = typeof width === 'function' ? t => width(t) / 2 : width / 2;
      const left = curve.offset(c, half);
      const right = curve.offset(c, typeof half === 'function' ? t => -half(t) : -half).reverse();
      return this.shape(left.concat(right), fill, Object.assign({ smooth: false }, o));
    }

    /** Draw into an offscreen layer (same size/transform), then composite it.
     *  Lets a part erase parts of itself (destination-out) without touching what's below. */
    layer(fn) {
      const src = this.ctx.canvas;
      const off = Painter._off || (Painter._off = document.createElement('canvas'));
      if (off.width !== src.width || off.height !== src.height) { off.width = src.width; off.height = src.height; }
      const octx = off.getContext('2d');
      octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, off.width, off.height);
      octx.setTransform(this.ctx.getTransform());
      const Q = Object.create(this); Q.ctx = octx;
      fn(Q, octx);
      this.n = Q.n;
      this.ctx.save(); this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.drawImage(off, 0, 0); this.ctx.restore();
    }

    /** Erase a closed region inside the current (offscreen) layer. */
    erase(d) {
      const ctx = this.ctx;
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      this.tracePath(d); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    }

    /** Shape with a hole (even-odd), e.g. a hijab framing the face. */
    ring(outer, inner, fill, o = {}) {
      const dO = this.dense(outer, true, o), dI = this.dense(inner, true, o);
      const ctx = this.ctx;
      ctx.beginPath();
      [dO, dI].forEach(d => { ctx.moveTo(d[0][0], d[0][1]); for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]); ctx.closePath(); });
      ctx.fillStyle = fill; ctx.fill('evenodd');
      if (o.pattern) {
        const def = PM.get('patterns', o.pattern.id);
        if (def) {
          ctx.save(); ctx.clip('evenodd');
          def.draw(this, curve.bbox(dO), o.pattern.colors, this.noise(), o.pattern.scale || 1, o.pattern);
          ctx.restore();
        }
      }
      if (o.stroke !== false) {
        this.brush(dO, true, this.baseWidth(o), o.color || this.ink, o);
        this.brush(dI, true, this.baseWidth(o), o.color || this.ink, o);
      }
      return { outer: dO, inner: dI };
    }
  }

  PM.Painter = Painter;
})(window.PM = window.PM || {});
