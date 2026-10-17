/* Core utilities: seeded randomness, colour maths, curve sampling.
 * Everything hangs off the global `PM` namespace so the app works from file:// with no build step. */
(function (PM) {
  'use strict';

  // ---------- Seeded RNG ----------
  function hashString(str) {
    str = String(str);
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      this.seed = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
      this._r = mulberry32(this.seed);
    }
    next() { return this._r(); }
    range(a, b) { return a + (b - a) * this._r(); }
    /** Softer distribution inside [a,b] — average of two uniforms, peaks in the middle. */
    soft(a, b) { return a + (b - a) * (this._r() + this._r()) / 2; }
    int(a, b) { return Math.floor(this.range(a, b + 1)); }
    chance(p) { return this._r() < p; }
    pick(arr) { return arr[Math.floor(this._r() * arr.length)]; }
    sign() { return this._r() < 0.5 ? -1 : 1; }
    gauss(mean = 0, sd = 1) {
      const u = 1 - this._r(), v = this._r();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    /** Weighted pick. Accepts {key: weight} or [[key, weight], ...]. Returns null if empty. */
    weighted(table) {
      const entries = Array.isArray(table) ? table : Object.entries(table || {});
      let total = 0;
      for (const [, w] of entries) total += Math.max(0, w);
      if (total <= 0) return null;
      let r = this._r() * total;
      for (const [k, w] of entries) { r -= Math.max(0, w); if (r <= 0) return k; }
      return entries[entries.length - 1][0];
    }
    /** Independent sub-stream: changing one part of a portrait doesn't reshuffle the others. */
    fork(label) { return new RNG(hashString(this.seed + ':' + label)); }
  }

  // ---------- Maths ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ---------- Colour ----------
  function hexToRgb(hex) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex([r, g, b]) {
    const h = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  }
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb([h, s, l]) {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  const color = {
    hexToRgb, rgbToHex,
    mix(a, b, t) {
      const A = hexToRgb(a), B = hexToRgb(b);
      return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
    },
    /** amt in -1..1: negative darkens, positive lightens (in HSL lightness). */
    shade(hex, amt) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      const nl = amt < 0 ? l * (1 + amt) : l + (1 - l) * amt;
      return rgbToHex(hslToRgb([h, s, nl]));
    },
    saturate(hex, amt) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      return rgbToHex(hslToRgb([h, clamp(s * (1 + amt), 0, 1), l]));
    },
    hueShift(hex, deg) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      return rgbToHex(hslToRgb([(h + deg / 360 + 1) % 1, s, l]));
    },
    luminance(hex) {
      const [r, g, b] = hexToRgb(hex);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    },
    /** Small natural variation for a picked tone. */
    jitter(hex, rng, amount = 0.04) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      return rgbToHex(hslToRgb([
        (h + rng.range(-amount, amount) * 0.25 + 1) % 1,
        clamp(s + rng.range(-amount, amount), 0, 1),
        clamp(l + rng.range(-amount, amount), 0, 1),
      ]));
    },
    /** Nearest colour from a list, weighting hue + lightness (used by limited-palette styles). */
    nearest(hex, list) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      let best = list[0], bd = Infinity;
      for (const c of list) {
        const [h2, s2, l2] = rgbToHsl(hexToRgb(c));
        let dh = Math.abs(h - h2); dh = Math.min(dh, 1 - dh);
        const d = (l - l2) ** 2 * 2.2 + (dh * Math.min(s, s2)) ** 2 * 3 + (s - s2) ** 2 * 0.6;
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
  };

  // ---------- Curves ----------
  // Points are [x, y] or [x, y, true] — the trailing `true` marks a sharp corner.
  function hermite(p0, p1, m0, m1, t) {
    const t2 = t * t, t3 = t2 * t;
    const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
    return [a * p0[0] + b * m0[0] + c * p1[0] + d * m1[0], a * p0[1] + b * m0[1] + c * p1[1] + d * m1[1]];
  }
  function tangents(pts, closed, tension) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      if (pts[i][2]) { out.push([0, 0]); continue; }
      let prev = pts[i - 1], next = pts[i + 1];
      if (closed) { prev = pts[(i - 1 + n) % n]; next = pts[(i + 1) % n]; }
      if (!prev) prev = pts[i];
      if (!next) next = pts[i];
      out.push([(next[0] - prev[0]) * tension, (next[1] - prev[1]) * tension]);
    }
    return out;
  }
  function sample(pts, closed, density = 0.5, tension = 0.5) {
    if (pts.length < 2) return pts.map(p => [p[0], p[1]]);
    const m = tangents(pts, closed, tension), out = [];
    const segs = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(2, Math.ceil(len * density));
      for (let s = 0; s < steps; s++) out.push(hermite(a, b, m[i], m[(i + 1) % pts.length], s / steps));
    }
    if (!closed) { const l = pts[pts.length - 1]; out.push([l[0], l[1]]); }
    return out;
  }
  const curve = {
    closed: (pts, density, tension) => sample(pts, true, density, tension),
    open: (pts, density, tension) => sample(pts, false, density, tension),
    length(pts, closed) {
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (closed && pts.length > 2) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
      return L;
    },
    bbox(pts) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    },
    ellipse(cx, cy, rx, ry, n = 16, rot = 0, a0 = 0, a1 = Math.PI * 2) {
      const out = [], full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
      const steps = full ? n : n - 1;
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      return out;
    },
    /** Point + unit normal at fraction t (0..1) along a polyline. */
    at(pts, t) {
      const L = curve.length(pts, false); let target = clamp(t, 0, 1) * L;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (target <= d || i === pts.length - 1) {
          const k = d ? Math.min(1, target / d) : 0;
          const tx = d ? (b[0] - a[0]) / d : 1, ty = d ? (b[1] - a[1]) / d : 0;
          return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), nx: -ty, ny: tx, tx, ty };
        }
        target -= d;
      }
      const p = pts[0]; return { x: p[0], y: p[1], nx: 0, ny: -1, tx: 1, ty: 0 };
    },
    /** Offset an open polyline sideways by d (positive = left of travel direction). */
    offset(pts, d) {
      return pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const dd = typeof d === 'function' ? d(i / (pts.length - 1)) : d;
        return [p[0] - (dy / L) * dd, p[1] + (dx / L) * dd];
      });
    },
    mirrorX(pts, cx) { return pts.map(p => [2 * cx - p[0], p[1], p[2]]); },
  };

  PM.RNG = RNG;
  PM.hashString = hashString;
  PM.math = { clamp, lerp, smoothstep };
  PM.color = color;
  PM.curve = curve;
})(window.PM = window.PM || {});
