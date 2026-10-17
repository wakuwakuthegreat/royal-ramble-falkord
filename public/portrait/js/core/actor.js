/* Actor: one living portrait, with no UI attached. It blinks, talks, eases between expressions,
 * looks around, nods and shakes, all by re-rendering the genome's "performance" values each frame,
 * so any part, style or extension animates for free. The Animator tab uses it, and so can a game:
 *
 *   const a = new PM.Actor(genome, { width: 250 });   // a.cv is the canvas it draws on
 *   a.setExpr('angry'); a.say('You dare?'); a.act('shake');
 *   every frame: a.update(dt); a.draw();             // dt in seconds
 *
 * Needs util, registry, painter, geometry, the parts (incl. expressions.js) and render.js loaded first. */
(function (PM) {
  'use strict';
  const { clamp } = PM.math;
  const W = PM.CANVAS.W, H = PM.CANVAS.H;
  const KEYS = () => Object.keys(PM.EXPR_KEYS);
  const RATE = { mouthOpen: 22, exprSmile: 7, gaze: 9, exprOpen: 9, browLift: 8, browRaise: 8, browFurrow: 8, turn: 3.5, bob: 12 };

  /** g: a genome. opts.width: canvas width in px (default 500; height keeps the 4:5 ratio).
   *  opts.side: -1 left actor, 1 right actor, 0 alone (used by the Animator's duets). */
  function Actor(g, opts) {
    opts = typeof opts === 'number' ? { side: opts } : (opts || {});
    this.g = PM.complete(g);
    this.side = opts.side || 0;
    const base = { gaze: 0, turn: this.g.turn, bob: 0 };
    for (const k of KEYS()) base[k] = this.g[k] != null ? this.g[k] : PM.EXPR_KEYS[k];
    this.p = Object.assign({}, base); this.t = Object.assign({}, base);
    this.talk = null; this.blinkT = 1 + Math.random() * 3; this.blink = 0; this.expr = this.g.expression || 'neutral'; this.baseMouth = base.mouthOpen;
    this.line = null; this.lineT = null;
    this.timers = [];
    const w = Math.round(opts.width || W);
    this.w = w; this.h = Math.round(w * H / W);
    this.cv = document.createElement('canvas'); this.cv.width = this.w; this.cv.height = this.h;
    this.cache = new Map();
  }

  /** Draw this frame onto this.cv. Only the face (z 51–79) changes with expressions, so everything behind it
   *  (paper, body, clothes, back hair, head) and in front of it (front hair, hats, earrings) is
   *  rendered once per head angle and reused — that's what keeps several actors smooth. */
  Actor.prototype.draw = function () {
    const g = this.genome(), key = (Math.round(g.turn * 50) / 50).toFixed(2);
    g.turn = +key;
    let c = this.cache.get(key);
    if (!c) {
      const mk = () => { const x = document.createElement('canvas'); x.width = this.w; x.height = this.h; return x; };
      c = { under: mk(), over: mk() };
      PM.render(c.under, g, { zMax: 50 });
      PM.render(c.over, g, { zMin: 80, zMax: 98 });
      this.cache.set(key, c);
      if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value);
    }
    const ctx = this.cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.w, this.h); ctx.drawImage(c.under, 0, 0);
    PM.render(this.cv, g, { zMin: 51, zMax: 79, noClear: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c.over, 0, 0);
    PM.render(this.cv, g, { zMin: 99, noClear: true });
    return this.cv;
  };

  /** Ease toward an expression preset (see js/parts/expressions.js). gaze: optional -1..1. */
  Actor.prototype.setExpr = function (name, gaze) {
    if (!PM.get('expressions', name)) name = 'neutral';
    const v = PM.expressionValues(name);
    this.expr = name;
    for (const k of KEYS()) this.t[k] = v[k];
    this.baseMouth = v.mouthOpen;
    if (name === 'thinking' && gaze == null) this.t.gaze = Math.random() < 0.5 ? -0.85 : 0.85;
    if (name === 'embarrassed' && gaze == null) this.t.gaze = -(this.face || 0.6);
    if (gaze != null) this.t.gaze = gaze;
  };

  /** Flap the mouth for about as long as the line takes to read. this.line holds the text meanwhile. */
  Actor.prototype.say = function (text, speed) {
    speed = speed || 1;
    this.talk = { left: Math.max(0.9, text.length * 0.055) / speed, syl: 0 };
    this.line = text; this.lineT = this.talk.left + 0.6;
  };

  /** A small gesture: 'look left' | 'look right' | 'look center' | 'look away' | 'nod' | 'shake' | 'blink'. */
  Actor.prototype.act = function (name) {
    const later = (ms, fn) => this.timers.push(setTimeout(fn, ms));
    if (name === 'look left') this.t.gaze = -0.9;
    else if (name === 'look right') this.t.gaze = 0.9;
    else if (name === 'look center' || name === 'look centre') { this.t.gaze = 0; this.t.turn = this.g.turn; }
    else if (name === 'look away') this.t.gaze = this.face ? -this.face : (Math.random() < 0.5 ? -0.9 : 0.9);
    else if (name === 'nod') { this.t.bob = 9; later(220, () => (this.t.bob = 0)); later(440, () => (this.t.bob = 7)); later(640, () => (this.t.bob = 0)); }
    else if (name === 'shake') { const t0 = this.g.turn; [0.2, -0.2, 0.15, -0.1, 0].forEach((d, k) => later(k * 160, () => (this.t.turn = t0 + d))); }
    else if (name === 'blink') this.blink = 0.15;
  };

  /** Advance dt seconds: talking, blinking and easing toward the targets in this.t. */
  Actor.prototype.update = function (dt, speed) {
    speed = speed || 1;
    const p = this.p, t = this.t;
    if (this.talk) {
      this.talk.left -= dt; this.talk.syl -= dt;
      if (this.talk.syl <= 0) { this.talk.syl = (0.07 + Math.random() * 0.1) / speed; t.mouthOpen = Math.max(this.baseMouth * 0.5, Math.random() < 0.25 ? 0.04 : 0.2 + Math.random() * 0.75); }
      if (this.talk.left <= 0) { this.talk = null; t.mouthOpen = this.baseMouth; }
    } else t.mouthOpen = this.baseMouth;
    if (this.lineT != null) { this.lineT -= dt; if (this.lineT <= 0) { this.line = null; this.lineT = null; } }
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = 1.8 + Math.random() * 4; }
    if (this.blink > 0) this.blink -= dt;
    for (const k of Object.keys(t)) p[k] += (t[k] - p[k]) * (1 - Math.exp(-dt * (RATE[k] || 7) * speed));
  };

  /** The genome for this instant (base genome + current performance values). */
  Actor.prototype.genome = function () {
    const out = Object.assign({}, this.g);
    for (const k of KEYS()) out[k] = this.p[k];
    out.mouthOpen = clamp(this.p.mouthOpen, 0, 1);
    out.gaze = clamp(this.p.gaze, -1, 1);
    out.turn = clamp(this.p.turn, -1, 1);
    if (this.blink > 0) out.exprOpen = 0.08;
    return out;
  };

  /** Stop pending gestures and free cached layers (call when the portrait leaves the screen). */
  Actor.prototype.destroy = function () {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.cache.clear();
  };

  /** Vertical head-bob offset in canvas px at this actor's size (nods); offset your sprite by it. */
  Actor.prototype.bob = function () { return this.p.bob * this.w / W; };

  PM.Actor = Actor;
})(window.PM = window.PM || {});
