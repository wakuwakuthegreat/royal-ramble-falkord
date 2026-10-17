/* Expressions: presets for the Expression dials, plus the bits of drawing that sell them —
 * forehead wrinkles, a knitted brow, blush, tears, a sweat drop, an anger vein and a red flush.
 *
 * Every preset sets the same expression keys (anything it leaves out goes back to neutral),
 * so they never clobber a face's own features. The Atelier's Expression dropdown and the
 * Animator both read this registry — add one and it shows up in both:
 *   PM.define('expressions', 'awe', { label: 'In awe', exprOpen: 1.3, browLift: 0.8, mouthOpen: 0.4 });
 */
(function (PM) {
  'use strict';
  const { lerp, clamp } = PM.math;
  const { color } = PM;

  /** The genome keys an expression controls, with their neutral values. */
  PM.EXPR_KEYS = {
    exprSmile: 0, exprOpen: 1, mouthOpen: 0, browLift: 0, browRaise: 0, browFurrow: 0,
    lidDroop: 0, squint: 0, smirk: 0, lipBite: 0, pupil: 1,
    wrinkle: 0, blushAmt: 0, tears: 0, sweat: 0, vein: 0, flush: 0,
  };
  /** Full set of expression values for a preset id (missing keys → neutral). */
  PM.expressionValues = function (id) {
    const e = PM.get('expressions', id) || {};
    const out = {};
    for (const [k, v] of Object.entries(PM.EXPR_KEYS)) out[k] = e[k] != null ? e[k] : v;
    return out;
  };

  const E = (id, def) => PM.define('expressions', id, def);
  E('neutral', {});
  E('happy', { exprSmile: 0.9, squint: 0.25, browLift: 0.2 });
  E('laughing', { exprSmile: 1.25, mouthOpen: 0.8, squint: 0.65, exprOpen: 0.8, browLift: 0.45, browRaise: 0.25, wrinkle: 0.3 });
  E('smitten', { label: 'Smitten', exprSmile: 0.8, blushAmt: 0.85, browRaise: 0.55, lidDroop: 0.25 });
  E('flirty', { label: 'Flirty (lip bite)', exprSmile: 0.35, smirk: 0.55, lipBite: 1, lidDroop: 0.5, blushAmt: 0.45, browRaise: 0.25, browLift: 0.2 });
  E('smug', { exprSmile: 0.45, smirk: 0.85, lidDroop: 0.45, browLift: 0.15 });
  E('embarrassed', { exprSmile: 0.2, smirk: -0.35, blushAmt: 1, sweat: 0.85, browRaise: 0.8, lidDroop: 0.15 });
  E('thinking', { exprSmile: -0.25, smirk: 0.45, browRaise: 0.45, browFurrow: 0.2, lidDroop: 0.15, wrinkle: 0.2 });
  E('determined', { exprSmile: -0.3, smirk: 0.2, browFurrow: 0.55, browLift: -0.3, squint: 0.35 });
  E('sad', { exprSmile: -1.35, browRaise: 1, browLift: 0.15, lidDroop: 0.38, wrinkle: 0.6, exprOpen: 0.9 });
  E('crying', { exprSmile: -1.35, browRaise: 1, browLift: 0.1, lidDroop: 0.3, wrinkle: 0.7, squint: 0.45, tears: 1, mouthOpen: 0.3, blushAmt: 0.35 });
  E('scared', { exprSmile: -0.65, exprOpen: 1.35, browLift: 0.65, browRaise: 0.95, wrinkle: 0.75, mouthOpen: 0.35, pupil: 0.5, sweat: 1 });
  E('surprised', { exprOpen: 1.4, browLift: 1, wrinkle: 0.85, mouthOpen: 0.65, pupil: 0.8 });
  E('disgusted', { exprSmile: -0.75, smirk: -0.6, browFurrow: 0.6, squint: 0.6, lidDroop: 0.3, wrinkle: 0.2 });
  E('angry', { exprSmile: -0.85, browFurrow: 0.85, browLift: -0.6, lidDroop: 0.18, squint: 0.3 });
  E('rage', { exprSmile: -1.35, browFurrow: 1, browLift: -0.9, mouthOpen: 0.8, exprOpen: 1.2, pupil: 0.45, vein: 1, flush: 0.75, wrinkle: 0.35 });
  E('sleepy', { lidDroop: 0.82, browLift: -0.25, mouthOpen: 0.08 });

  // ------------------------------------------------------------------ drawing
  /** Under the brows (inside the head): flush, blush, wrinkles, the knit between the brows. */
  PM.define('layers', 'expression-skin', {
    z: 58, clip: 'head',
    draw(P, g, geo, C) {
      const { fx, hw, browY, hairlineY, noseY, eh } = geo, ctx = P.ctx;
      if (g.flush > 0.02) {
        ctx.save(); ctx.globalAlpha = 0.38 * g.flush;
        P.fill(geo.headDense, PM.styleSnap(g, '#c8402e'), { dense: true, wob: 0 });
        ctx.restore();
      }
      if (g.blushAmt > 0.02) {
        const col = PM.styleSnap(g, '#d9604a');
        for (const s of [-1, 1]) {
          const x = fx + s * hw * 0.5 * (1 - Math.max(0, s * geo.t) * 0.3), y = noseY - geo.hh * 0.03;
          ctx.save(); ctx.globalAlpha = 0.55 * g.blushAmt; P.ellipse(x, y, 15, 8, col, { stroke: false, wob: 0.4 }); ctx.restore();
          if (g.blushAmt > 0.4) for (let k = -1; k <= 1; k++) P.line([[x + k * 7 - 3, y + 4], [x + k * 7 + 3, y - 4]], { w: 0.4 * g.blushAmt, color: color.mix(col, C.ink, 0.35), wob: 0, taper: 0.3 });
        }
      }
      const w = g.wrinkle || 0, raise = g.browRaise || 0, top = Math.min(browY - 8, lerp(browY, hairlineY, 0.35));
      if (w > 0.05) {
        const rows = w > 0.6 ? 3 : 2;
        for (let i = 0; i < rows; i++) {
          const y = top - i * Math.max(5, (top - hairlineY - 4) / (rows + 0.5)), span = hw * (0.32 - i * 0.04);
          if (y < hairlineY + 2) break;
          // worry lines bow upward in the middle; surprise lines arc with the brows
          const mid = raise > 0.3 ? -raise * 6 : 2;
          P.line([[fx - span, y + (raise > 0.3 ? 3 : 0)], [fx - span * 0.4, y + mid * 0.4], [fx, y + mid], [fx + span * 0.4, y + mid * 0.4], [fx + span, y + (raise > 0.3 ? 3 : 0)]], { w: 0.3 + 0.35 * w, taper: 0.5, wob: 0.2 });
        }
      }
      if ((g.browFurrow || 0) > 0.25) {
        const f = g.browFurrow;
        for (const s of [-1, 1]) P.line([[fx + s * 4, browY - 12], [fx + s * 2.5, browY + 2]], { w: 0.35 + 0.35 * f, taper: 0.5, wob: 0 });
        if (f > 0.7) P.line([[fx - 4, browY + eh * 1.6], [fx, browY + eh * 2.2], [fx + 4, browY + eh * 1.6]], { w: 0.35, taper: 0.4, wob: 0 });
      }
    },
  });

  /** Over the face: tears, a sweat drop and the anime anger vein. */
  PM.define('layers', 'expression-top', {
    z: 74,
    draw(P, g, geo, C) {
      const water = PM.styleSnap(g, '#9fd3ea');
      if (g.tears > 0.05) {
        for (const e of geo.eyes) {
          const x = e.x + e.side * geo.ew * 0.25 * e.s, y = e.y + geo.eh * 0.8, L = 12 + 40 * g.tears;
          P.band([[x, y], [x + e.side * 2, y + L * 0.5], [x + e.side * 1, y + L]], t => 3.4 * (1 - 0.3 * t), water, { w: 0.4, wob: 0.2 });
          P.shape([[x + e.side, y + L - 2], [x + e.side * 4, y + L + 6], [x + e.side, y + L + 9], [x - e.side * 2, y + L + 6]], water, { w: 0.4, wob: 0, tension: 0.4 });
        }
      }
      if (g.sweat > 0.05) {
        const s = g.noseSide > 0 ? -1 : 1, w = geo.widthAt(geo.browY - 10), x = (s > 0 ? w.r : w.l) - s * 10, y = geo.browY - 22, k = 0.6 + 0.4 * g.sweat;
        P.shape([[x, y - 12 * k, true], [x + 6 * k, y + 2], [x, y + 8 * k], [x - 6 * k, y + 2]], water, { w: 0.5, wob: 0, tension: 0.45 });
        P.dot(x - 2 * k, y + 1, 1.2 * k, C.white);
      }
      if (g.vein > 0.05) {
        const s = g.noseSide > 0 ? 1 : -1, x = geo.fx + s * geo.hw * 0.48, y = lerp(geo.hairlineY, geo.browY, 0.35), r = 7 * (0.6 + 0.4 * g.vein), red = PM.styleSnap(g, '#c0392b');
        for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          P.line([[x + ax * r * 0.35, y + ay * r * 1.2], [x + ax * r * 0.35, y + ay * r * 0.35], [x + ax * r * 1.2, y + ay * r * 0.35]], { w: 0.9, color: red, wob: 0, tension: 0.6 });
        }
      }
    },
  });
})(window.PM = window.PM || {});
