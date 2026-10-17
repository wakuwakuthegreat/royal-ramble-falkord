/* Head geometry from a genome, following the classic proportions:
 *   - eyes sit halfway down the head
 *   - bottom of the nose ≈ halfway between eyes and chin
 *   - bottom of the lip ≈ halfway between nose and chin
 *   - ears run from the top of the eyes to the bottom of the nose
 * …and then every knob nudges those landmarks, because everyone is a little different. */
(function (PM) {
  'use strict';
  const { curve } = PM;

  PM.CANVAS = { W: 500, H: 625 };

  PM.geometry = function (g, W = PM.CANVAS.W, H = PM.CANVAS.H) {
    const cx = W / 2, cy = 272;
    const hw = 90 * g.faceWidth;          // half width of the skull
    const hh = 126 * g.faceLength;        // half height of the head
    const top = cy - hh, chinY = cy + hh;
    const t = g.turn || 0;                // -1 … 1 : three-quarter turn
    const fx = cx + t * hw * 0.3;         // centre line of the features

    const eyeY = cy + (g.eyeHeight || 0) * hh * 0.08;
    const noseY = eyeY + (chinY - eyeY) * 0.5 * g.noseLength;
    const mouthY = noseY + (chinY - noseY) * 0.42;
    const browY = eyeY - hh * (0.2 + (g.browHeight || 0) * 0.05 + (g.browLift || 0) * 0.075);
    const hairlineY = top + hh * 0.42 * g.forehead;

    // ---- eyes ----
    const ew = hw * 0.38 * g.eyeSize;
    const eh = ew * 0.26;                 // resting eye height: ears, brows, nose and masks measure from this
    const ehOpen = eh * g.eyeOpen * (g.exprOpen != null ? g.exprOpen : 1); // how open they are right now (blinks, shock)
    const dx = hw * 0.41 * g.eyeSpacing;
    const eyes = [-1, 1].map(side => {
      const far = Math.max(0, side * t);                      // this eye is turning away
      return { side, x: fx + side * dx * (1 - far * 0.4), y: eyeY, s: 1 - far * 0.32 };
    });

    // ---- head outline (clockwise from the crown) ----
    const cb = g.cheek, jw = g.jaw, ch = g.chin, sq = g.chinSquare || 0;
    const half = side => {
      const s = side;
      return [
        [cx + s * hw * 0.74, top + hh * 0.13],
        [cx + s * hw * 0.98, top + hh * 0.52],
        [cx + s * hw * cb + t * hw * 0.03, eyeY + hh * 0.2],
        [cx + s * hw * jw + t * hw * 0.12, mouthY + (1 - jw) * hh * 0.12 + sq * hh * 0.04],
        [fx + s * hw * ch + t * hw * 0.06, chinY - hh * (0.07 + sq * 0.04)],
      ];
    };
    const right = half(1), left = half(-1).reverse();
    const headPts = [[cx + t * hw * 0.04, top], ...right, [fx + t * hw * 0.06, chinY], ...left];
    const headDense = curve.closed(headPts, 0.4);

    /** Horizontal extent of the head outline at height y → {l, r}. */
    function widthAt(y) {
      let l = Infinity, r = -Infinity;
      for (let i = 0; i < headDense.length; i++) {
        const a = headDense[i], b = headDense[(i + 1) % headDense.length];
        if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
          const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
          l = Math.min(l, x); r = Math.max(r, x);
        }
      }
      if (l === Infinity) return { l: cx, r: cx };
      return { l, r };
    }

    // ---- ears ----
    const earTop = eyeY - eh * 1.3, earBot = noseY + hh * 0.02;
    // ears hang off the widest part of the face along their span (wide cheeks would hide them otherwise)
    let earL = Infinity, earR = -Infinity;
    for (let i = 0; i <= 8; i++) { const w = widthAt(earTop + (earBot + 6 - earTop) * i / 8); earL = Math.min(earL, w.l); earR = Math.max(earR, w.r); }
    const ears = [-1, 1].map(side => ({
      side,
      x: side < 0 ? earL + 3 : earR - 3,
      top: earTop, bot: earBot,
      hidden: side * t > 0.5,
    }));

    // ---- neck & shoulders ----
    const nw = hw * 0.4 * g.neckWidth;
    const neckX = cx + t * hw * 0.08;
    const neckBase = chinY + 34 * g.neckLength;
    const sw = hw * 1.95 * g.shoulders;
    const bustSide = s => [
      [neckX + s * nw, neckBase - 4],
      [neckX + s * nw * 1.7, neckBase + 10],
      [cx + s * sw * 0.76, neckBase + 22],
      [cx + s * sw * 0.97, neckBase + 56],
      [cx + s * sw * 1.04, H + 30],
    ];
    const bustPts = [[neckX - nw, mouthY], [neckX + nw, mouthY], ...bustSide(1), ...bustSide(-1).reverse()];

    return {
      W, H, cx, cy, hw, hh, top, chinY, t, fx,
      eyeY, noseY, mouthY, browY, hairlineY,
      ew, eh, ehOpen, eyes,
      noseX: fx + t * hw * 0.13,
      mouthX: fx + t * hw * 0.08,
      mw: hw * 0.34 * g.mouthWidth,
      headPts, headDense, widthAt, ears,
      nw, neckX, neckBase, sw, bustPts,
      /** Neckline-aware torso outline: pass the neckline points from left to right. */
      torso(neckline, o = {}) {
        const e = o.expand || 0, w = sw + e;
        const side = s => [
          [neckX + s * nw * 1.95, neckBase + 9 - e * 0.2],
          [cx + s * w * 0.77, neckBase + 21 - e * 0.3],
          [cx + s * w * 0.98, neckBase + 56],
          [cx + s * w * 1.05, H + 30, true],
        ];
        return [...neckline, ...side(1), ...side(-1).reverse()];
      },
    };
  };
})(window.PM = window.PM || {});
