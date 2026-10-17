/* Garments. Each is draw(P, g, geo, C) and usually starts from geo.torso(neckline),
 * which wraps a neckline (left → right) into a full bust silhouette. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;
  const { curve, color } = PM;

  const fabric = (g, C) => ({ id: g.pattern, colors: [C.cloth[0], C.cloth[1], C.cloth[2]], scale: g.patternScale });
  const trim = (g, C, base) => ({ id: g.trim, colors: [base || C.cloth[2], base === C.cloth[1] ? C.cloth[2] : C.cloth[1], C.ink], scale: g.patternScale * 0.55 });

  // ---- necklines (left → right) ----
  const N = {
    round: (geo, depth = 10, w = 1.15) => { const { neckX: x, nw, neckBase: b } = geo; return [[x - nw * w, b - 4, true], [x - nw * w * 0.6, b + depth * 0.8], [x, b + depth], [x + nw * w * 0.6, b + depth * 0.8], [x + nw * w, b - 4, true]]; },
    v: (geo, depth = 50, w = 1.15) => { const { neckX: x, nw, neckBase: b } = geo; return [[x - nw * w, b - 5, true], [x - nw * w * 0.4, b + depth * 0.5], [x, b + depth, true], [x + nw * w * 0.4, b + depth * 0.5], [x + nw * w, b - 5, true]]; },
    straight: (geo, y) => [[geo.cx - geo.sw * 0.7, y, true], [geo.cx, y + 3], [geo.cx + geo.sw * 0.7, y, true]],
  };
  PM.necklines = N;

  function body(P, g, geo, C, neckline, o = {}) {
    return P.shape(geo.torso(neckline, o), o.fill || C.cloth[0], { pattern: o.plain ? null : fabric(g, C), w: 1 });
  }
  function trimAlong(P, g, geo, C, pts, width, base) {
    return P.band(pts, width, base || C.cloth[2], { w: 0.6, pattern: trim(g, C, base || C.cloth[2]) });
  }

  PM.define('clothing', 'bare', {
    label: 'Bare shoulders',
    draw(P, g, geo, C) {
      const y = geo.neckBase + 78;
      body(P, g, geo, C, [[geo.cx - geo.sw * 1.0, y + 10, true], [geo.cx, y + 4], [geo.cx + geo.sw * 1.0, y + 10, true]]);
    },
  });

  PM.define('clothing', 'crew', {
    label: 'Crew neck',
    draw(P, g, geo, C) {
      const nl = N.round(geo, 12, 1.2);
      body(P, g, geo, C, nl);
      P.band(nl.map(p => [p[0], p[1] + 3]), 6, C.cloth[0], { w: 0.6 });
    },
  });

  PM.define('clothing', 'vneck', {
    label: 'V-neck',
    draw(P, g, geo, C) {
      const nl = N.v(geo, 58, 1.3);
      body(P, g, geo, C, nl);
      const { neckX: x, nw, neckBase: b } = geo;
      for (const s of [-1, 1]) P.band([[x + s * nw * 1.25, b + 1], [x + s * 3, b + 56]], 5, C.cloth[1], { w: 0.5 });
    },
  });

  PM.define('clothing', 'turtleneck', {
    draw(P, g, geo, C) {
      body(P, g, geo, C, N.round(geo, 4, 1.2));
      const { neckX: x, nw, neckBase: b, chinY } = geo;
      const d = P.shape([[x - nw * 1.12, b + 4, true], [x - nw * 1.06, chinY + 14], [x, chinY + 18], [x + nw * 1.06, chinY + 14], [x + nw * 1.12, b + 4, true], [x, b + 8]], C.cloth[0], { pattern: fabric(g, C) });
      P.clip(d, () => { for (let y = chinY + 24; y < b; y += 9) P.line([[x - nw * 1.1, y], [x, y + 3], [x + nw * 1.1, y]], { w: 0.45, taper: 0.3 }); });
    },
  });

  PM.define('clothing', 'suit', {
    label: 'Shirt & jacket',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo, shirt = C.white;
      body(P, g, geo, C, N.v(geo, 75, 1.25), { plain: true });
      P.fill([[x - nw * 1.2, b - 4], [x, b + 76, true], [x + nw * 1.2, b - 4]], shirt);
      P.shape([[x - nw * 1.15, b - 6, true], [x, b + 14, true], [x + nw * 1.15, b - 6, true], [x + nw * 1.2, b + 6], [x, b + 16], [x - nw * 1.2, b + 6]], shirt, { w: 0.6, tension: 0.3 });
      for (const s of [-1, 1]) P.shape([[x + s * 2, b + 15, true], [x + s * nw * 1.2, b + 3, true], [x + s * nw * 0.9, b + 18, true]], shirt, { w: 0.6 });
      if (g.gender !== 'fem') P.shape([[x - 4, b + 16, true], [x + 4, b + 16, true], [x + 6, b + 64], [x, b + 72, true], [x - 6, b + 64]], C.cloth[2], { w: 0.6, tension: 0.3, pattern: trim(g, C) });
      for (const s of [-1, 1]) P.shape([[x + s * nw * 1.3, b - 3, true], [x + s * nw * 2.0, b + 16], [x + s * nw * 1.05, b + 36, true], [x + s * 3, b + 78, true], [x + s * nw * 0.7, b + 18]], C.cloth[0], { w: 0.8, tension: 0.3 });
    },
  });

  PM.define('clothing', 'wrap', {
    label: 'Shoulder wrap / toga',
    draw(P, g, geo, C) {
      const { cx, sw, neckX: x, nw, neckBase: b, H } = geo, s = g.hairPart >= 0 ? -1 : 1;
      const edgeLine = [[x + s * nw * 1.4, b - 2], [x - s * nw * 0.6, b + 55], [cx - s * sw * 1.05, b + 135]];
      P.shape([[cx + s * sw * 1.06, H + 30, true], [cx + s * sw * 0.98, b + 55], [cx + s * sw * 0.76, b + 21], [x + s * nw * 1.95, b + 9], ...edgeLine, [cx - s * sw * 1.06, H + 30, true]], C.cloth[0], { pattern: fabric(g, C) });
      trimAlong(P, g, geo, C, edgeLine.map(p => [p[0] + s * 4, p[1] + 3]), 9);
    },
  });

  PM.define('clothing', 'boubou', {
    label: 'Boubou / agbada',
    draw(P, g, geo, C) {
      const nl = N.round(geo, 16, 1.55);
      body(P, g, geo, C, nl, { plain: true, fill: C.cloth[0], expand: 10 });
      const { neckX: x, nw, neckBase: b } = geo;
      const yoke = [[x - nw * 1.55, b - 4], [x - nw * 1.3, b + 22], [x, b + 32], [x + nw * 1.3, b + 22], [x + nw * 1.55, b - 4]];
      trimAlong(P, g, geo, C, yoke.map(p => [p[0], p[1] + 6]), 12);
      trimAlong(P, g, geo, C, [[x, b + 36], [x, b + 120]], 14);
    },
  });

  PM.define('clothing', 'dashiki', {
    draw(P, g, geo, C) {
      body(P, g, geo, C, N.round(geo, 10, 1.15), { plain: true });
      const { neckX: x, nw, neckBase: b } = geo;
      const panel = [[x - nw * 1.15, b - 4, true], [x - nw * 2.6, b + 18, true], [x, b + 88, true], [x + nw * 2.6, b + 18, true], [x + nw * 1.15, b - 4, true], [x + nw * 0.7, b + 8], [x, b + 10], [x - nw * 0.7, b + 8]];
      P.shape(panel, C.cloth[1], { pattern: trim(g, C, C.cloth[1]), w: 0.8, tension: 0.35 });
    },
  });

  function crossCollar(P, g, geo, C, o = {}) {
    const { neckX: x, nw, neckBase: b } = geo;
    body(P, g, geo, C, N.v(geo, 70, 1.2), { plain: o.plain });
    P.fill([[x - nw * 1.2, b - 5], [x, b + 70, true], [x + nw * 1.2, b - 5]], C.white);
    const under = [[x - nw * 1.2, b - 6], [x + nw * 0.2, b + 46]];
    const over = [[x + nw * 1.2, b - 6], [x + nw * 0.2, b + 34], [x - nw * 1.2, b + 78]];
    P.band(under, 12, o.collar || C.cloth[2], { w: 0.7, pattern: o.trimmed ? trim(g, C) : null });
    P.band(over, 13, o.collar || C.cloth[2], { w: 0.8, pattern: o.trimmed ? trim(g, C) : null });
    if (o.bow) {
      const bx = x - nw * 0.6, by = b + 60;
      P.shape([[bx, by], [bx - 18, by - 8], [bx - 20, by + 6]], C.cloth[1], { w: 0.6 });
      P.shape([[bx, by], [bx + 4, by + 50], [bx - 6, by + 52]], C.cloth[1], { w: 0.6 });
      P.shape([[bx, by], [bx - 10, by + 40], [bx - 18, by + 38]], C.cloth[1], { w: 0.6 });
    }
  }
  PM.define('clothing', 'cross-collar', { label: 'Cross collar (kimono / hanfu)', draw(P, g, geo, C) { crossCollar(P, g, geo, C, { trimmed: false }); } });
  PM.define('clothing', 'hanbok', { label: 'Jeogori with ribbon', draw(P, g, geo, C) { crossCollar(P, g, geo, C, { plain: true, collar: C.white, bow: true }); } });

  PM.define('clothing', 'deel', {
    label: 'Deel / side-closing robe',
    draw(P, g, geo, C) {
      body(P, g, geo, C, N.round(geo, 2, 1.12));
      const { neckX: x, nw, neckBase: b, cx, sw } = geo;
      P.band([[x - nw * 1.12, b - 6], [x - nw * 1.1, b - 22], [x + nw * 1.1, b - 22], [x + nw * 1.12, b - 6]], 7, C.cloth[2], { w: 0.6, pattern: trim(g, C) });
      const edgeL = [[x + nw * 0.3, b + 1], [x - nw * 0.8, b + 26], [cx - sw * 0.78, b + 58]];
      trimAlong(P, g, geo, C, edgeL, 10);
      for (let i = 0; i < 3; i++) { const p = curve.at(curve.open(edgeL), 0.25 + i * 0.3); P.bead(p.x, p.y + 9, 2.4, C.metal); }
    },
  });

  PM.define('clothing', 'mandarin', {
    label: 'Mandarin / high collar',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      body(P, g, geo, C, N.round(geo, 2, 1.12));
      P.shape([[x - nw * 1.12, b - 2, true], [x - nw * 1.05, b - 22], [x - 2, b - 20, true], [x - 2, b - 2, true]], C.cloth[0], { w: 0.7, pattern: fabric(g, C) });
      P.shape([[x + 2, b - 2, true], [x + 2, b - 20, true], [x + nw * 1.05, b - 22], [x + nw * 1.12, b - 2, true]], C.cloth[0], { w: 0.7, pattern: fabric(g, C) });
      if (g.gender !== 'masc') {
        P.line([[x, b - 2], [x + nw * 1.0, b + 12], [x + nw * 2.2, b + 20]], { w: 0.6, taper: 0.2 });
        for (const k of [0.3, 0.65, 1]) P.bead(x + nw * 2.2 * k, b - 2 + 22 * k * 0.95, 2.4, C.cloth[2]);
      } else for (let i = 0; i < 4; i++) P.bead(x, b + 6 + i * 18, 2.4, C.metal);
    },
  });

  PM.define('clothing', 'kurta', {
    label: 'Kurta / thobe',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      const nl = N.round(geo, 6, 1.1);
      body(P, g, geo, C, nl);
      P.band(nl.map(p => [p[0], p[1] + 2]), 6, C.cloth[0], { w: 0.6 });
      P.band([[x, b + 4], [x, b + 82]], 10, C.cloth[0], { w: 0.6 });
      for (let i = 0; i < 4; i++) P.bead(x, b + 14 + i * 18, 2, C.metal);
    },
  });

  PM.define('clothing', 'embroidered-tunic', {
    label: 'Embroidered tunic',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw } = geo;
      body(P, g, geo, C, N.round(geo, 8, 1.15), { plain: true, fill: C.white });
      for (const s of [-1, 1]) {
        trimAlong(P, g, geo, C, [[x + s * nw * 0.7, b + 10], [x + s * nw * 0.75, b + 110]], 12);
        trimAlong(P, g, geo, C, [[cx + s * sw * 0.72, b + 20], [cx + s * sw * 0.95, b + 64]], 13);
      }
      P.line([[x, b + 8], [x, b + 48]], { w: 0.7 });
    },
  });

  PM.define('clothing', 'huipil', {
    label: 'Huipil (square yoke)',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      body(P, g, geo, C, [[x - nw * 1.2, b - 4, true], [x - nw * 1.0, b + 14, true], [x + nw * 1.0, b + 14, true], [x + nw * 1.2, b - 4, true]], { plain: true, fill: C.white });
      const sq = [[x - nw * 2.6, b + 4, true], [x - nw * 2.6, b + 64, true], [x + nw * 2.6, b + 64, true], [x + nw * 2.6, b + 4, true], [x + nw * 1.0, b + 14, true], [x - nw * 1.0, b + 14, true]];
      P.shape([[x - nw * 2.6, b + 2, true], [x - nw * 2.6, b + 64, true], [x + nw * 2.6, b + 64, true], [x + nw * 2.6, b + 2, true], [x + nw * 1.22, b - 2, true], [x + nw * 1.02, b + 15, true], [x - nw * 1.02, b + 15, true], [x - nw * 1.22, b - 2, true]], C.cloth[1], { pattern: trim(g, C, C.cloth[1]), w: 0.8, smooth: false });
      return sq;
    },
  });

  PM.define('clothing', 'poncho', {
    draw(P, g, geo, C) {
      const nl = N.round(geo, 8, 1.15);
      body(P, g, geo, C, nl, { expand: 18 });
      P.band(nl.map(p => [p[0], p[1] + 3]), 7, C.cloth[2], { w: 0.6 });
    },
  });

  PM.define('clothing', 'scarf', {
    label: 'Shirt & scarf',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, chinY } = geo;
      body(P, g, geo, C, N.v(geo, 30, 1.2), { plain: true });
      const pat = { id: g.pattern === 'plain' ? 'waves' : g.pattern, colors: [C.cloth[1], C.cloth[2], C.cloth[0]], scale: g.patternScale * 0.7 };
      P.shape([[x - nw * 1.35, b + 6], [x - nw * 1.3, chinY + 18], [x, chinY + 24], [x + nw * 1.3, chinY + 18], [x + nw * 1.35, b + 6], [x + nw * 0.6, b + 22], [x - nw * 0.6, b + 22]], C.cloth[1], { pattern: pat });
      P.shape([[x - 2, b + 12], [x + nw * 0.9, b + 18], [x + nw * 1.0, b + 82], [x + nw * 0.2, b + 76]], C.cloth[1], { pattern: pat, w: 0.9 });
      P.circle(x + 2, b + 16, 8, C.cloth[1], { pattern: pat, w: 0.9 });
    },
  });

  PM.define('clothing', 'sari', {
    label: 'Sari with pallu',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b, cx, sw, H } = geo;
      body(P, g, geo, C, N.round(geo, 22, 1.4), { plain: true, fill: C.cloth[1] });
      const top = [[cx + sw * 1.07, b + 70], [cx + sw * 0.82, b + 18], [x + nw * 1.7, b + 8]];
      const lower = [[x + nw * 0.6, b + 30], [cx - sw * 0.3, b + 120], [cx - sw * 0.5, H + 30]];
      const pts = [[cx + sw * 1.1, H + 30, true], ...top, [x + nw * 1.25, b + 10], ...lower, [cx + sw * 0.2, H + 30, true]];
      P.shape(pts, C.cloth[0], { pattern: fabric(g, C) });
      trimAlong(P, g, geo, C, [[x + nw * 1.4, b + 6], ...lower.map(p => [p[0] + 4, p[1] + 2])], 11, C.metal);
    },
  });

  PM.define('clothing', 'fur-collar', {
    label: 'Coat with fur collar',
    draw(P, g, geo, C) {
      const { neckX: x, nw, neckBase: b } = geo;
      body(P, g, geo, C, N.v(geo, 50, 1.2));
      P.fill([[x - nw * 1.2, b - 5], [x, b + 50, true], [x + nw * 1.2, b - 5]], C.cloth[1]);
      const fur = PM.styleSnap(g, '#8a6a46'), r = new PM.RNG(PM.hashString(g.seed + 'furc'));
      for (const s of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([x + s * lerp(nw * 1.1, 3, k) + s * (i % 2 ? 4 : 0), lerp(b - 8, b + 56, k)]); }
        for (let i = 8; i >= 0; i--) { const k = i / 8; pts.push([x + s * lerp(nw * 2.9, nw * 1.0, k) + s * (i % 2 ? 4 : -2), lerp(b + 8, b + 70, k)]); }
        const d = P.shape(pts, fur);
        P.clip(d, () => { for (let i = 0; i < 20; i++) { const px = x + s * r.range(2, nw * 2.8), py = r.range(b - 6, b + 70); P.hair([[px, py], [px + s * 2, py + 5]], 0.8, color.shade(fur, -0.35)); } });
      }
    },
  });
})(window.PM = window.PM || {});
