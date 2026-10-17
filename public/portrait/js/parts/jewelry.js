/* Jewellery & eyewear: earrings, necklaces, glasses. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;

  const lobe = (geo, ear) => {
    const h = ear.bot - ear.top, w = Math.min(18, h * 0.42), y = ear.bot + 1;
    // never let the lobe (and what hangs from it) sit on the cheek
    const e = geo.widthAt(y + 6), out = ear.side > 0 ? e.r + 3 : e.l - 3;
    const x = ear.x + ear.side * w * 0.32;
    return [ear.side > 0 ? Math.max(x, out) : Math.min(x, out), y];
  };
  function ringStroke(P, x, y, rx, ry, col, wIn = 1.6) {
    const ctx = P.ctx;
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = (wIn + 2.2) * P.lw; ctx.strokeStyle = P.ink; ctx.stroke();
    ctx.lineWidth = wIn * P.lw; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
  }
  function eachEar(geo, fn) { for (const ear of geo.ears) if (!ear.hidden) fn(ear, ...lobe(geo, ear)); }

  // ============================ EARRINGS ============================
  PM.define('earrings', 'none', { label: 'None', draw() {} });
  PM.define('earrings', 'studs', { draw(P, g, geo, C) { eachEar(geo, (e, x, y) => P.circle(x, y - 1, 2.6, C.metal, { w: 0.4, wob: 0 })); } });
  PM.define('earrings', 'hoops', {
    draw(P, g, geo, C) { eachEar(geo, (e, x, y) => { const R = 11 + 5 * g.hairVolume * 0.5; ringStroke(P, x + e.side * 2, y + R - 1, R * 0.8, R, C.metal, 2.2); }); },
  });
  PM.define('earrings', 'big-disc', {
    label: 'Bold discs',
    draw(P, g, geo, C) { eachEar(geo, (e, x, y) => { P.circle(x, y + 7, 7, C.ink, { w: 0.4, wob: 0.2 }); P.dot(x - 2, y + 5, 1.4, C.metal); }); },
  });
  PM.define('earrings', 'patterned-hoop', {
    label: 'Patterned disc hoop',
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => {
        const R = 14, cy = y + R + 1;
        P.ring(curve.ellipse(x, cy, R, R, 18), curve.ellipse(x, cy, R * 0.55, R * 0.55, 14), C.metal, { w: 0.6, wob: 0.2, pattern: { id: 'stripes', colors: [C.metal, C.ink, C.cloth[2]], scale: 0.45 } });
      });
    },
  });
  PM.define('earrings', 'drops', {
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => {
        P.hair([[x, y], [x, y + 9]], 1, C.ink);
        P.shape([[x, y + 8], [x + 4, y + 16], [x, y + 21], [x - 4, y + 16]], C.cloth[2] === C.ink ? C.metal : C.cloth[2], { w: 0.5, wob: 0 });
      });
    },
  });
  PM.define('earrings', 'jhumka', {
    label: 'Jhumka bells',
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => {
        P.circle(x, y, 2.6, C.metal, { w: 0.4, wob: 0 });
        P.shape([[x, y + 4], [x + 7, y + 15], [x - 7, y + 15]], C.metal, { w: 0.5, wob: 0, tension: 0.6 });
        for (let i = -3; i <= 3; i++) P.bead(x + i * 2.2, y + 18, 1.2, C.metal, 0.4);
      });
    },
  });
  PM.define('earrings', 'geometric', {
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => {
        P.shape([[x - 3, y], [x + 3, y], [x + 3, y + 6], [x - 3, y + 6]], C.metal, { w: 0.5, smooth: false, wob: 0 });
        P.shape([[x - 5, y + 8], [x + 5, y + 8], [x + 1, y + 22], [x - 1, y + 22]], C.metal, { w: 0.5, smooth: false, wob: 0 });
      });
    },
  });
  PM.define('earrings', 'beaded-loops', {
    label: 'Beaded lobe loops',
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => {
        for (let i = 0; i < 9; i++) { const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7; P.bead(x + Math.cos(a) * 6 * e.side * -1 + e.side * 1, y + Math.sin(a) * 16, 2, [C.cloth[1], C.cloth[2], C.white][i % 3], 0.5); }
      });
    },
  });
  PM.define('earrings', 'coins', {
    draw(P, g, geo, C) {
      eachEar(geo, (e, x, y) => { P.hair([[x, y], [x, y + 6]], 0.9, C.ink); for (const [dx, dy] of [[0, 9], [-4, 15], [4, 15]]) P.circle(x + dx, y + dy, 3.4, C.metal, { w: 0.4, wob: 0, n: 10 }); });
    },
  });

  // ============================ NECKLACES ============================
  /** U-shaped necklace path around the neck. drop = how far below the neck base. */
  function uPath(geo, drop, spread = 1.05, rise = 14) {
    const { neckX: x, nw, neckBase: b } = geo;
    return curve.open([[x - nw * spread, b - rise], [x - nw * spread * 0.85, b + drop * 0.45], [x, b + drop], [x + nw * spread * 0.85, b + drop * 0.45], [x + nw * spread, b - rise]], 0.5);
  }
  function beadsAlong(P, path, r, cols, gap = 2.1) {
    const L = curve.length(path), n = Math.floor(L / (r * gap));
    for (let i = 0; i <= n; i++) { const p = curve.at(path, i / n); P.bead(p.x, p.y, r, cols[i % cols.length], 0.6); }
  }

  PM.define('necklaces', 'none', { label: 'None', draw() {} });
  PM.define('necklaces', 'beads', { label: 'Bead strand', draw(P, g, geo, C) { beadsAlong(P, uPath(geo, 24), 2.6, [C.cloth[1], C.metal]); } });
  PM.define('necklaces', 'pearls', { draw(P, g, geo, C) { beadsAlong(P, uPath(geo, 30, 1.1), 2.8, [C.white], 1.9); } });
  PM.define('necklaces', 'layered', {
    label: 'Layered strands',
    draw(P, g, geo, C) {
      beadsAlong(P, uPath(geo, 16, 1.0), 2.2, [C.white, C.ink]);
      beadsAlong(P, uPath(geo, 30, 1.15, 10), 2.4, [C.cloth[1], C.metal, C.white]);
      beadsAlong(P, uPath(geo, 46, 1.3, 6), 2.6, [C.metal, C.cloth[2]]);
    },
  });
  PM.define('necklaces', 'bead-collar', {
    label: 'Flat bead collar',
    draw(P, g, geo, C) {
      const cols = [C.cloth[1], C.white, C.cloth[2], C.metal, C.ink];
      for (let i = 4; i >= 0; i--) {
        const path = uPath(geo, 16 + i * 9, 1.2 + i * 0.32, 10 - i * 2);
        const d = P.band(path, 9, cols[i], { w: 0.5, wob: 0.15 });
        if (i % 2 === 0) P.clip(d, () => { const L = curve.length(path); for (let s = 0; s < L; s += 7) { const p = curve.at(path, s / L); P.dot(p.x, p.y, 1.3, cols[(i + 2) % 5]); } });
      }
    },
  });
  PM.define('necklaces', 'broad-collar', {
    label: 'Broad segmented collar',
    draw(P, g, geo, C) {
      const inner = uPath(geo, 12, 1.12, 8), outer = uPath(geo, 46, 2.3, 2);
      P.shape([...outer, ...inner.slice().reverse()], C.metal, { smooth: false, w: 0.8, wob: 0.2 });
      for (const k of [0.33, 0.66]) {
        const mid = inner.map((p, i) => { const q = outer[Math.round(i * (outer.length - 1) / (inner.length - 1))]; return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; });
        P.line(mid, { w: 0.5, taper: 0.1, wob: 0, smooth: false });
      }
      const L = curve.length(outer);
      for (let s = 4; s < L; s += 6) { const p = curve.at(outer, s / L); P.bead(p.x, p.y + 2, 2, C.cloth[1], 0.5); }
    },
  });
  PM.define('necklaces', 'choker', {
    draw(P, g, geo, C) {
      const { neckX: x, nw, chinY, neckBase: b } = geo, y = lerp(chinY + 12, b, 0.55);
      P.band([[x - nw * 1.02, y - 2], [x, y + 4], [x + nw * 1.02, y - 2]], 6, C.ink, { w: 0.4 });
      P.circle(x, y + 9, 3.2, C.metal, { w: 0.5, wob: 0 });
    },
  });
  PM.define('necklaces', 'medallion', {
    draw(P, g, geo, C) {
      const path = uPath(geo, 46, 1.0, 14);
      P.hair(path, 1.1 * P.lw, C.metal); P.hair(path, 0.5, C.ink);
      const e = curve.at(path, 0.5);
      P.circle(e.x, e.y + 8, 7.5, C.metal, { w: 0.7, wob: 0.1 });
      P.circle(e.x, e.y + 8, 3.5, C.cloth[2], { w: 0.4, wob: 0 });
    },
  });
  PM.define('necklaces', 'cross-pendant', {
    label: 'Ornate cross pendant',
    draw(P, g, geo, C) {
      const path = uPath(geo, 44, 1.0, 14);
      P.hair(path, 1.4 * P.lw, C.ink);
      const e = curve.at(path, 0.5), x = e.x, y = e.y + 14, a = 9;
      P.shape([[x - 2, y - a, true], [x + 2, y - a, true], [x + 2, y - 2, true], [x + a, y - 2, true], [x + a, y + 2, true], [x + 2, y + 2, true], [x + 2, y + a, true], [x - 2, y + a, true], [x - 2, y + 2, true], [x - a, y + 2, true], [x - a, y - 2, true], [x - 2, y - 2, true]], C.metal, { w: 0.5, wob: 0 });
      for (const [dx, dy] of [[0, -a], [a, 0], [0, a], [-a, 0]]) P.circle(x + dx, y + dy, 2.4, C.metal, { w: 0.4, wob: 0, n: 8 });
    },
  });
  PM.define('necklaces', 'coins', {
    label: 'Coin necklace',
    draw(P, g, geo, C) {
      const path = uPath(geo, 30, 1.2, 8);
      P.hair(path, 1.4 * P.lw, C.ink);
      for (let i = 1; i < 12; i++) { const p = curve.at(path, i / 12); P.circle(p.x, p.y + 6, 4, C.metal, { w: 0.4, wob: 0, n: 10 }); }
    },
  });
  PM.define('necklaces', 'torc', {
    draw(P, g, geo, C) {
      const path = uPath(geo, 18, 1.15, 10), L = path.length;
      const open = path.slice(0, Math.floor(L * 0.42)).concat([null]).concat(path.slice(Math.ceil(L * 0.58)));
      const a = open.slice(0, open.indexOf(null)), b = open.slice(open.indexOf(null) + 1);
      for (const seg of [a, b]) { P.band(seg, 6, C.metal, { w: 0.6, wob: 0 }); }
      P.circle(a[a.length - 1][0], a[a.length - 1][1], 5, C.metal, { w: 0.6, wob: 0 });
      P.circle(b[0][0], b[0][1], 5, C.metal, { w: 0.6, wob: 0 });
    },
  });
  PM.define('necklaces', 'cowrie', {
    label: 'Cowrie shells',
    draw(P, g, geo, C) {
      const path = uPath(geo, 28, 1.15, 10), white = C.white;
      P.hair(path, 1.2 * P.lw, C.ink);
      for (let i = 1; i < 10; i++) {
        const p = curve.at(path, i / 10);
        P.ellipse(p.x, p.y + 4, 3.4, 5, white, { w: 0.5, wob: 0, rot: Math.atan2(p.ty, p.tx), n: 10 });
        P.hair([[p.x, p.y + 1], [p.x, p.y + 7]], 0.8, C.ink);
      }
    },
  });
  PM.define('necklaces', 'chunky-beads', {
    label: 'Turquoise & coral',
    draw(P, g, geo, C) {
      beadsAlong(P, uPath(geo, 34, 1.15, 10), 4.4, [PM.styleSnap(g, '#3aa6a0'), PM.styleSnap(g, '#d0553e'), C.metal], 2.0);
    },
  });

  // ============================ EYEWEAR ============================
  function lensCentres(geo) { return geo.eyes.map(e => ({ x: e.x, y: e.y - 1, s: e.s, side: e.side })); }
  function arms(P, geo, lenses, R) {
    for (const l of lenses) {
      const ear = geo.ears.find(e => e.side === l.side);
      if (!ear || ear.hidden) continue;
      P.line([[l.x + l.side * R * l.s, l.y - 2], [ear.x, ear.top + 6]], { w: 0.7, taper: 0.1, wob: 0 });
    }
  }
  function bridge(P, geo, lenses, R) {
    const [a, b] = lenses;
    P.line([[a.x + R * a.s * 0.95, a.y - 3], [(a.x + b.x) / 2, a.y - 6], [b.x - R * b.s * 0.95, b.y - 3]], { w: 0.8, taper: 0.1, wob: 0 });
  }
  PM.define('eyewear', 'none', { label: 'None', draw() {} });
  PM.define('eyewear', 'round-glasses', {
    label: 'Round glasses',
    draw(P, g, geo, C) {
      const L = lensCentres(geo), R = geo.ew * 0.62;
      arms(P, geo, L, R); bridge(P, geo, L, R);
      for (const l of L) P.ellipse(l.x, l.y, R * l.s, R, null, { w: 0.8, wob: 0.15, n: 18 });
    },
  });
  PM.define('eyewear', 'sunglasses', {
    draw(P, g, geo, C) {
      const L = lensCentres(geo), R = geo.ew * 0.72;
      arms(P, geo, L, R); bridge(P, geo, L, R);
      for (const l of L) {
        P.ellipse(l.x, l.y + 1, R * l.s, R * 0.92, C.ink, { w: 1, wob: 0.15, n: 18 });
        P.hair(curve.ellipse(l.x, l.y + 1, R * l.s * 0.62, R * 0.6, 10, 0, -2.6, -1.6), 1.6 * P.lw, color.mix(C.ink, C.paper, 0.45));
      }
    },
  });
  PM.define('eyewear', 'square-glasses', {
    label: 'Square glasses',
    draw(P, g, geo, C) {
      const L = lensCentres(geo), R = geo.ew * 0.64;
      arms(P, geo, L, R); bridge(P, geo, L, R);
      for (const l of L) { const w = R * l.s, h = R * 0.72; P.shape([[l.x - w, l.y - h], [l.x + w, l.y - h], [l.x + w, l.y + h], [l.x - w, l.y + h]], null, { w: 0.85, tension: 0.18, wob: 0.15 }); }
    },
  });
  PM.define('eyewear', 'cat-eye', {
    label: 'Cat-eye',
    draw(P, g, geo, C) {
      const L = lensCentres(geo), R = geo.ew * 0.66;
      arms(P, geo, L, R); bridge(P, geo, L, R);
      for (const l of L) {
        const w = R * l.s, s = l.side;
        P.shape([[l.x - s * w * 0.9, l.y - R * 0.55], [l.x + s * w * 1.25, l.y - R * 0.95, true], [l.x + s * w * 0.9, l.y + R * 0.55], [l.x - s * w * 0.7, l.y + R * 0.6]], null, { w: 1.1, wob: 0.15 });
      }
    },
  });
})(window.PM = window.PM || {});
