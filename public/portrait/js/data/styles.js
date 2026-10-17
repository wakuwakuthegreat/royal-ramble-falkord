/* Paint styles map a genome's "true" colours onto a paint box.
 * A style returns the colour set `C` every part draws with.
 * Limited-palette styles snap clothing to their palette — that's the flat-poster look. */
(function (PM) {
  'use strict';
  const { color } = PM;

  /** Common derivations so new styles only override what they care about. */
  function base(g, s) {
    const skin = s.skin(g);
    const grey = PM.math.smoothstep(0.58, 0.98, g.age || 0) * 0.85;
    const hair = color.mix(s.hair ? s.hair(g) : g.hairColor, s.grey || '#c9c5bd', grey);
    const dark = color.luminance(hair) < 0.18;
    const C = {
      ink: s.ink, paper: s.paper,
      skin,
      skinShade: color.shade(skin, -0.16),
      skinDeep: color.shade(skin, -0.32),
      hair,
      // optional second hair colour for split-dyed / two-tone hair (fiction: Todoroki)
      hair2: g.hairColor2 ? color.mix(s.hair ? s.hair(Object.assign({}, g, { hairColor: g.hairColor2 })) : g.hairColor2, s.grey || '#c9c5bd', grey) : null,
      hairHi: dark ? color.mix(hair, color.mix(s.paper, skin, 0.35), 0.5) : color.shade(hair, -0.4), // soft sheen, not a white stripe
      eyeWhite: color.mix(s.paper, '#ffffff', 0.3),
      iris: s.iris ? s.iris(g) : g.eyeColor,
      lip: s.lip ? s.lip(g, skin) : color.mix(color.shade(skin, -0.3), '#9b3b34', 0.25),
      blush: s.blush ? s.blush(g, skin) : color.mix(skin, '#d9604a', 0.25),
      cloth: [g.cloth1, g.cloth2, g.cloth3].map(c => (s.palette ? color.nearest(c, s.palette) : c)),
      metal: s.metal ? s.metal(g) : g.metal,
      white: s.paper,
    };
    // Keep cloth layers distinguishable after snapping to a small palette.
    if (s.palette && C.cloth[1] === C.cloth[0]) C.cloth[1] = s.palette.find(p => p !== C.cloth[0]);
    if (s.palette && C.cloth[2] === C.cloth[0]) C.cloth[2] = s.palette.find(p => p !== C.cloth[0] && p !== C.cloth[1]);
    return C;
  }
  /** Snap any colour to the active style's palette (identity for full-colour styles). */
  PM.styleSnap = function (g, hex) {
    const s = PM.get('styles', g.style);
    return s && s.palette ? color.nearest(hex, s.palette) : hex;
  };
  PM.styleColors = function (g) {
    const s = PM.get('styles', g.style) || PM.list('styles')[0];
    return s.colors ? s.colors(g, base) : base(g, s);
  };

  // ---------- Ink & Ochre — the reference poster look ----------
  PM.define('styles', 'ink-ochre', {
    label: 'Ink & Ochre',
    ink: '#16120f', paper: '#f1e6cc',
    palette: ['#16120f', '#c99a4b', '#f1e6cc', '#2f5f6e', '#8f6a2c', '#a8462c'],
    skin: g => color.mix('#c99a4f', g.skin, g.toneMix),
    hair(g) {
      const n = color.nearest(g.hairColor, ['#16120f', '#6b4a2a', '#c9a25a', '#9a4a26', '#b9b2a4']);
      return color.mix(n, g.hairColor, g.toneMix * 0.4);
    },
    iris: () => '#16120f',
    lip: (g, skin) => color.mix(skin, '#16120f', 0.72),
    blush: (g, skin) => color.mix(skin, '#e0a63c', 0.45),
    metal: g => color.nearest(g.metal, ['#c99a4b', '#f1e6cc', '#a8462c', '#2f5f6e']),
  });

  // ---------- Natural tones ----------
  PM.define('styles', 'natural', {
    label: 'Natural Tones',
    ink: '#1d1712', paper: '#f3e9d2',
    skin: g => g.skin,
  });

  // ---------- Ink wash — navy brush on paper, yellow cheeks ----------
  PM.define('styles', 'ink-wash', {
    label: 'Ink Wash',
    ink: '#1e2a3c', paper: '#f4ede0',
    palette: ['#1e2a3c', '#f4ede0', '#e8c25a', '#d9783f'],
    skin: g => color.mix('#f4ecdc', g.skin, g.toneMix * 0.7),
    hair: () => '#1e2a3c',
    iris: () => '#1e2a3c',
    lip: (g, skin) => color.mix(skin, '#1e2a3c', 0.6),
    blush: () => '#ecc65a',
    metal: () => '#e8c25a',
  });

  // ---------- Terracotta — earth pigments ----------
  PM.define('styles', 'terracotta', {
    label: 'Terracotta',
    ink: '#2a1a12', paper: '#ecdcbc',
    palette: ['#2a1a12', '#b5532f', '#ecdcbc', '#2f3e6b', '#d49a3a', '#5d6b3a'],
    skin: g => color.mix('#b06a43', g.skin, g.toneMix),
    hair: g => color.mix('#2a1a12', g.hairColor, g.toneMix * 0.5),
    lip: (g, skin) => color.shade(skin, -0.4),
    metal: () => '#d49a3a',
  });

  // ================= Backgrounds =================
  function parchment(P, geo, C, rng, tint) {
    const { ctx } = P, { W, H } = geo;
    ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
    // soft blotches
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = rng.range(0.03, 0.07);
      P.dot(rng.range(0, W), rng.range(0, H), rng.range(40, 160), rng.chance(0.5) ? color.shade(tint, -0.15) : color.shade(tint, 0.25));
    }
    // fibres
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 90; i++) {
      const x = rng.range(0, W), y = rng.range(0, H), a = rng.range(0, Math.PI), l = rng.range(6, 26);
      P.hair([[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 0.6, color.shade(tint, -0.4), { smooth: false });
    }
    // speckle
    for (let i = 0; i < 500; i++) {
      ctx.globalAlpha = rng.range(0.05, 0.2);
      P.dot(rng.range(0, W), rng.range(0, H), rng.range(0.3, 1.1), color.shade(tint, -0.45));
    }
    ctx.globalAlpha = 1;
    // aged edges
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0, 'rgba(120,80,30,0)');
    grad.addColorStop(1, 'rgba(120,80,30,0.28)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }

  PM.define('backgrounds', 'parchment', {
    label: 'Parchment',
    draw(P, g, geo, C, rng) { parchment(P, geo, C, rng, '#efe0bf'); },
  });
  PM.define('backgrounds', 'paper', {
    label: 'Plain paper',
    draw(P, g, geo, C) { P.ctx.fillStyle = C.paper; P.ctx.fillRect(0, 0, geo.W, geo.H); },
  });
  PM.define('backgrounds', 'sun-disc', {
    label: 'Sun disc',
    draw(P, g, geo, C, rng) {
      parchment(P, geo, C, rng, '#efe0bf');
      P.circle(geo.cx, geo.cy - 10, geo.hw * 2.25, C.cloth[1] === C.skin ? C.cloth[2] : C.cloth[1], { w: 0.8, wob: 0.6, n: 28 });
    },
  });
  PM.define('backgrounds', 'arch', {
    label: 'Arch niche',
    draw(P, g, geo, C, rng) {
      parchment(P, geo, C, rng, '#efe0bf');
      const { cx, W, H } = geo, r = geo.hw * 2.1, y = geo.top + 30;
      P.shape([[cx - r, H + 20, true], [cx - r, y + r * 0.2], [cx, y - r * 0.85], [cx + r, y + r * 0.2], [cx + r, H + 20, true]], color.mix(C.cloth[0], C.paper, 0.55), { w: 0.8 });
    },
  });
  PM.define('backgrounds', 'transparent', { label: 'Transparent', draw() {} });
})(window.PM = window.PM || {});
