/* Example extension — every extension point in one file. Copy this file, rename it,
 * add a <script> tag for it in index.html (after render.js, before the ui scripts), done.
 * Nothing in the core needs to change. */
(function (PM) {
  'use strict';
  const { lerp } = PM.math;

  // ------------------------------------------------------------------
  // 1. A new KNOB + a new LAYER that reads it.
  //    The knob appears in the "Head" panel automatically and is rolled by the generator.
  // ------------------------------------------------------------------
  PM.controls.push({ id: 'shade', type: 'knob', group: 'Head', label: 'Side shade', min: 0, max: 1, step: 0.01, def: 0, roll: [0, 0.45] });

  PM.define('layers', 'flat-shade', {
    z: 56, // after the head + skin marks, before brows/eyes
    draw(P, g, geo, C) {
      if (!(g.shade > 0.12)) return;
      const s = geo.t >= 0 ? -1 : 1;               // shade the side turning away
      const { cx, hw, top, chinY, hh } = geo, w = hw * (0.15 + 0.35 * g.shade);
      P.clip(geo.headDense, () => {
        P.fill([[cx + s * (hw * 1.2), top], [cx + s * (hw - w), top + hh * 0.35], [cx + s * (hw - w * 1.2), geo.eyeY], [cx + s * (hw - w), geo.mouthY], [geo.fx + s * hw * 0.2, chinY + 4], [cx + s * hw * 1.3, chinY]], C.skinShade, { wob: 0.6 });
      });
    },
  });

  // ------------------------------------------------------------------
  // 2. A new HAIRSTYLE using the hair kit (silhouette + face hole + texture come for free).
  // ------------------------------------------------------------------
  PM.hairKit.hairStyle('mohawk', {
    label: 'Mohawk / crest',
    hatFallback: 'buzz',
    silhouette(geo, g) {
      const { cx, hw, hh, top } = geo, H = 40 * g.hairVolume, w = hw * 0.32;
      return [[cx - w, geo.hairlineY + 4, true], [cx - w * 1.1, top - H * 0.5], [cx, top - H], [cx + w * 1.1, top - H * 0.5], [cx + w, geo.hairlineY + 4, true], [cx, geo.hairlineY + 8]];
    },
    hole: geo => ({ hairlineY: geo.hairlineY + 2, noPart: true }),
    texture: 'flow',
    // shaved sides: stipple on the scalp
    backExtra(P, g, geo, C) {},
    frontExtra(P, g, geo, C) {
      const r = PM.hairKit.texRng(g, 'mohawk-sides');
      P.clip(geo.headDense, () => {
        for (let i = 0; i < 260; i++) {
          const x = geo.cx + r.range(-geo.hw, geo.hw), y = r.range(geo.top, geo.hairlineY + 6);
          if (Math.abs(x - geo.cx) > geo.hw * 0.34) P.dot(x, y, 0.55, PM.color.mix(C.hair, C.skin, 0.3));
        }
      });
    },
  });

  // ------------------------------------------------------------------
  // 3. A new PATTERN — draw inside the (already clipped) box.
  // ------------------------------------------------------------------
  PM.define('patterns', 'sunburst', {
    draw(P, b, c, rng, s) {
      P.ctx.fillStyle = c[0]; P.ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      const S = 40 * s;
      for (let y = b.y; y < b.y + b.h + S; y += S) for (let x = b.x; x < b.x + b.w + S; x += S) {
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          P.hair([[x + Math.cos(a) * S * 0.12, y + Math.sin(a) * S * 0.12], [x + Math.cos(a) * S * 0.36, y + Math.sin(a) * S * 0.36]], 2 * s, c[1]);
        }
        P.dot(x, y, S * 0.08, c[2]);
      }
    },
  });

  // ------------------------------------------------------------------
  // 4. A new SIGNATURE DETAIL (appears as a chip under Adornment).
  // ------------------------------------------------------------------
  PM.define('marks', 'gold-cuff', {
    label: 'Ear cuff',
    layer: 'top',
    draw(P, g, geo, C) {
      const ear = geo.ears.find(e => !e.hidden); if (!ear) return;
      const x = ear.x + ear.side * 9, y = lerp(ear.top, ear.bot, 0.35);
      P.band([[x - ear.side * 2, y - 5], [x + ear.side * 3, y], [x - ear.side * 1, y + 6]], 3.2, C.metal, { w: 0.5, wob: 0 });
    },
  });

  // ------------------------------------------------------------------
  // 5. A SUB-HERITAGE that inherits from an existing archetype and overrides a few tables.
  //    (Volume II of the guide has dozens of these: Yoruba, Igbo, Habesha, Tamil, Ainu …)
  // ------------------------------------------------------------------
  const wa = PM.get('archetypes', 'west-african');
  PM.define('archetypes', 'yoruba', Object.assign({}, wa, {
    label: 'Yoruba (sub-group example)',
    groups: ['african', 'west-african'],   // so culture-specific roles (royalty, griots …) apply
    notes: 'Iro and buba, sculptural gele, aso-oke and indigo adire cloth, coral beads for royalty. Defined in js/extensions/example.js by extending "West African".',
    headwear: { fem: { gele: 6, none: 2, headwrap: 1 }, masc: { fila: 4, none: 3 } },
    clothing: { fem: { wrap: 3, boubou: 2, dashiki: 1 }, masc: { boubou: 3, dashiki: 2 } },
    patterns: { mudcloth: 2, kente: 1, sunburst: 1, batik: 2 },
    order: wa.order + 0.5, // sit right after West African in the dropdown
  }));
})(window.PM = window.PM || {});
