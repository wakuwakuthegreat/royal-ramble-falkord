/* Flat textile patterns. Each draws inside an already-clipped box:
 *    draw(P, box, colors, rng, scale)   colors = [base, accent, detail]
 * Used for garments, trims, headwraps, scarves. Add your own with PM.define('patterns', id, {...}). */
(function (PM) {
  'use strict';
  const TAU = Math.PI * 2;

  const fillBox = (P, b, c) => { P.ctx.fillStyle = c; P.ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); };
  const rect = (P, x, y, w, h, c) => { P.ctx.fillStyle = c; P.ctx.fillRect(x, y, w, h); };
  function grid(b, step, fn, stagger = false) {
    let row = 0;
    for (let y = b.y - step; y < b.y + b.h + step; y += step, row++) {
      const off = stagger && row % 2 ? step / 2 : 0;
      for (let x = b.x - step + off; x < b.x + b.w + step; x += step) fn(x, y, row);
    }
  }

  PM.define('patterns', 'plain', { label: 'Plain', draw(P, b, c) { fillBox(P, b, c[0]); } });

  PM.define('patterns', 'stripes', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const h = 9 * s; let i = 0;
      for (let y = b.y; y < b.y + b.h; y += h, i++) {
        if (i % 3 === 1) rect(P, b.x - 2, y, b.w + 4, h * 0.55, c[1]);
        if (i % 3 === 2) rect(P, b.x - 2, y + h * 0.3, b.w + 4, h * 0.25, c[2]);
      }
    },
  });

  PM.define('patterns', 'bold-stripes', {
    label: 'Bold Stripes',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const h = 14 * s;
      for (let y = b.y, i = 0; y < b.y + b.h; y += h, i++) if (i % 2) rect(P, b.x - 2, y, b.w + 4, h, P.ink);
    },
  });

  PM.define('patterns', 'kente', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 22 * s;
      grid(b, S, (x, y, row) => {
        const k = (Math.floor((x - b.x) / S) + row) % 3;
        if (k === 0) { for (let i = 0; i < 4; i++) rect(P, x, y + i * S / 4, S, S / 9, c[1]); }
        else if (k === 1) { rect(P, x, y, S, S, c[1]); for (let i = 0; i < 3; i++) rect(P, x + S * (0.2 + i * 0.25), y + S * 0.15, S * 0.1, S * 0.7, c[2]); }
        else { rect(P, x + S * 0.1, y + S * 0.1, S * 0.35, S * 0.35, c[2]); rect(P, x + S * 0.55, y + S * 0.55, S * 0.35, S * 0.35, c[2]); }
        rect(P, x, y, S, S * 0.06, P.ink);
      });
    },
  });

  PM.define('patterns', 'dots', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      grid(b, 13 * s, (x, y) => P.dot(x, y, 2.6 * s, c[1]), true);
    },
  });

  PM.define('patterns', 'zigzag', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const h = 12 * s, w = 10 * s; let i = 0;
      for (let y = b.y - h; y < b.y + b.h + h; y += h, i++) {
        const pts = [];
        for (let x = b.x - w, k = 0; x < b.x + b.w + w * 2; x += w, k++) pts.push([x, y + (k % 2 ? h * 0.45 : 0)]);
        P.hair(pts, 2.6 * s, i % 2 ? c[1] : c[2], { smooth: false });
      }
    },
  });

  PM.define('patterns', 'tartan', {
    label: 'Plaid / Tartan',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 34 * s, ctx = P.ctx;
      ctx.globalAlpha = 0.55;
      for (let y = b.y; y < b.y + b.h; y += S) rect(P, b.x - 2, y, b.w + 4, S * 0.4, c[1]);
      for (let x = b.x; x < b.x + b.w; x += S) rect(P, x, b.y - 2, S * 0.4, b.h + 4, c[1]);
      ctx.globalAlpha = 1;
      for (let y = b.y + S * 0.7; y < b.y + b.h; y += S) rect(P, b.x - 2, y, b.w + 4, 1.6 * s, c[2]);
      for (let x = b.x + S * 0.7; x < b.x + b.w; x += S) rect(P, x, b.y - 2, 1.6 * s, b.h + 4, c[2]);
    },
  });

  PM.define('patterns', 'keffiyeh', {
    label: 'Fishnet (keffiyeh)',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 9 * s, col = c[1];
      for (let k = -b.h; k < b.w + b.h; k += S) {
        P.hair([[b.x + k, b.y], [b.x + k + b.h, b.y + b.h]], 1.5 * s, col, { smooth: false });
        P.hair([[b.x + k, b.y + b.h], [b.x + k + b.h, b.y]], 1.5 * s, col, { smooth: false });
      }
      grid(b, S * 2, (x, y) => P.dot(x, y, 1.4 * s, col));
    },
  });

  function glyph(P, kind, x, y, R, col, w) {
    if (kind === 0) { P.hair(PM.curve.ellipse(x, y, R, R, 14), w, col); P.dot(x, y, R * 0.3, col); }
    else if (kind === 1) { P.hair(PM.curve.ellipse(x, y, R, R, 14), w, col); P.hair([[x - R, y], [x + R, y]], w, col); P.hair([[x, y - R], [x, y + R]], w, col); }
    else if (kind === 2) { P.hair([[x, y - R], [x + R, y], [x, y + R], [x - R, y], [x, y - R]], w, col, { smooth: false }); P.dot(x, y, R * 0.25, col); }
    else { const pts = []; for (let i = 0; i < 26; i++) { const a = i * 0.45, rr = R * i / 26; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } P.hair(pts, w, col); }
  }
  PM.define('patterns', 'adinkra', {
    label: 'Stamped glyphs',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 26 * s; let i = 0;
      grid(b, S, (x, y) => { glyph(P, (i++) % 4, x + S / 2, y + S / 2, S * 0.3, c[1], 1.8 * s); });
    },
  });

  PM.define('patterns', 'paisley', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 30 * s;
      grid(b, S, (x, y, row) => {
        const flip = row % 2 ? -1 : 1, cx = x + S / 2, cy = y + S / 2, R = S * 0.28;
        const pts = [[cx, cy + R], [cx + R * 0.9, cy + R * 0.2], [cx + R * 0.5, cy - R * 0.6], [cx - R * 0.2 * flip, cy - R * 1.1], [cx - R * 0.6, cy - R * 0.1]];
        P.ctx.fillStyle = c[1]; P.tracePath(PM.curve.closed(pts, 0.4)); P.ctx.fill();
        P.dot(cx + R * 0.15, cy + R * 0.2, R * 0.28, c[2]);
      }, true);
    },
  });

  PM.define('patterns', 'batik', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 28 * s;
      grid(b, S, (x, y) => {
        const cx = x + S / 2, cy = y + S / 2;
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + Math.PI / 4;
          P.ctx.fillStyle = c[1]; P.tracePath(PM.curve.ellipse(cx + Math.cos(a) * S * 0.17, cy + Math.sin(a) * S * 0.17, S * 0.16, S * 0.08, 10, a)); P.ctx.fill();
        }
        P.dot(cx, cy, S * 0.08, c[2]);
        for (let k = 0; k < 4; k++) P.dot(x + r.range(0, S), y + r.range(0, S), 0.9 * s, c[2]);
      }, true);
    },
  });

  PM.define('patterns', 'waves', {
    label: 'Leaf swirls',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 30 * s;
      grid(b, S, (x, y) => {
        const cx = x + r.range(0, S), cy = y + r.range(0, S), a = r.range(0, TAU), L = S * 0.5;
        const pts = [[cx, cy], [cx + Math.cos(a) * L * 0.5 - Math.sin(a) * L * 0.3, cy + Math.sin(a) * L * 0.5 + Math.cos(a) * L * 0.3], [cx + Math.cos(a) * L, cy + Math.sin(a) * L], [cx + Math.cos(a) * L * 0.5 + Math.sin(a) * L * 0.25, cy + Math.sin(a) * L * 0.5 - Math.cos(a) * L * 0.25]];
        P.ctx.fillStyle = c[1]; P.tracePath(PM.curve.closed(pts, 0.4)); P.ctx.fill();
        P.ctx.strokeStyle = P.ink; P.ctx.lineWidth = 1.3 * s; P.ctx.stroke();
      });
    },
  });

  PM.define('patterns', 'ikat', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 30 * s;
      grid(b, S, (x, y, row) => {
        const cx = x + S / 2, cy = y + S / 2, col = row % 2 ? c[1] : c[2];
        const pts = [];
        for (let i = 0; i < 16; i++) {
          const a = i * TAU / 16, rr = (i % 2 ? 0.78 : 1) * S * 0.42 * (1 + r.range(-0.12, 0.12));
          const k = Math.abs(Math.cos(a)) + Math.abs(Math.sin(a));
          pts.push([cx + Math.cos(a) * rr / k * 0.7, cy + Math.sin(a) * rr / k]);
        }
        P.ctx.fillStyle = col; P.tracePath(pts); P.ctx.fill();
        P.dot(cx, cy, S * 0.08, c[0]);
      }, true);
    },
  });

  PM.define('patterns', 'mudcloth', {
    label: 'Mud cloth',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 24 * s, col = c[1]; let row = 0;
      for (let y = b.y; y < b.y + b.h; y += S, row++) {
        P.hair([[b.x - 2, y], [b.x + b.w + 2, y]], 1.6 * s, col, { smooth: false });
        P.hair([[b.x - 2, y + 3 * s], [b.x + b.w + 2, y + 3 * s]], 1.6 * s, col, { smooth: false });
        for (let x = b.x; x < b.x + b.w; x += S * 0.8) {
          const k = (row + Math.round(x / S)) % 3, mx = x + S * 0.4, my = y + S * 0.58;
          if (k === 0) { P.hair([[mx - 4 * s, my - 4 * s], [mx + 4 * s, my + 4 * s]], 1.6 * s, col); P.hair([[mx + 4 * s, my - 4 * s], [mx - 4 * s, my + 4 * s]], 1.6 * s, col); }
          else if (k === 1) P.dot(mx, my, 2.2 * s, col);
          else P.hair([[mx - 6 * s, my + 3 * s], [mx - 2 * s, my - 3 * s], [mx + 2 * s, my + 3 * s], [mx + 6 * s, my - 3 * s]], 1.6 * s, col, { smooth: false });
        }
      }
    },
  });

  PM.define('patterns', 'cross-stitch', {
    label: 'Cross-stitch (tatreez)',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const u = 3.2 * s, S = u * 9;
      const x = (px, py, col) => { P.hair([[px - u / 2, py - u / 2], [px + u / 2, py + u / 2]], 0.9 * s, col, { smooth: false }); P.hair([[px + u / 2, py - u / 2], [px - u / 2, py + u / 2]], 0.9 * s, col, { smooth: false }); };
      grid(b, S, (gx, gy, row) => {
        const cx = gx + S / 2, cy = gy + S / 2;
        for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
          const d = Math.abs(i) + Math.abs(j);
          if (d === 3) x(cx + i * u, cy + j * u, c[1]);
          else if (d === 0 || d === 1) x(cx + i * u, cy + j * u, c[2]);
        }
      }, true);
    },
  });

  PM.define('patterns', 'chevron-bands', {
    label: 'Andean bands',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const h = 16 * s; let i = 0;
      for (let y = b.y; y < b.y + b.h; y += h * 1.6, i++) {
        const col = [c[1], c[2], P.ink][i % 3];
        P.ctx.fillStyle = col;
        for (let x = b.x - h; x < b.x + b.w + h; x += h) { P.ctx.beginPath(); P.ctx.moveTo(x, y + h); P.ctx.lineTo(x + h / 2, y); P.ctx.lineTo(x + h, y + h); P.ctx.fill(); }
        rect(P, b.x - 2, y + h + 1.5 * s, b.w + 4, 2.5 * s, P.ink);
      }
    },
  });

  PM.define('patterns', 'blossoms', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 28 * s;
      grid(b, S, (x, y) => {
        const cx = x + r.range(0, S), cy = y + r.range(0, S), R = S * 0.16;
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5; P.dot(cx + Math.cos(a) * R, cy + Math.sin(a) * R, R * 0.75, c[1]); }
        P.dot(cx, cy, R * 0.45, c[2]);
      });
    },
  });

  PM.define('patterns', 'clouds', {
    label: 'Cloud scrolls',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 34 * s;
      grid(b, S, (x, y) => {
        const cx = x + S / 2, cy = y + S / 2, R = S * 0.18;
        const spiral = side => { const pts = []; for (let i = 0; i < 18; i++) { const a = i * 0.42, rr = R * (1 - i / 22); pts.push([cx + side * R + Math.cos(a) * rr * side, cy + Math.sin(a) * rr]); } return pts; };
        P.hair(spiral(1), 1.8 * s, c[1]); P.hair(spiral(-1), 1.8 * s, c[1]);
        P.hair([[cx - R * 2.2, cy + R * 1.1], [cx, cy + R * 1.3], [cx + R * 2.2, cy + R * 1.1]], 1.8 * s, c[1]);
      }, true);
    },
  });

  PM.define('patterns', 'beadwork', {
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const u = 4 * s, cols = [c[1], c[2], P.ink, c[0]];
      for (let y = b.y, j = 0; y < b.y + b.h; y += u, j++) {
        for (let x = b.x, i = 0; x < b.x + b.w; x += u, i++) {
          const d = Math.abs(((i + Math.floor(j / 4) * 3) % 8) - 4) + (j % 4);
          rect(P, x + 0.4, y + 0.4, u - 0.8, u - 0.8, cols[Math.floor(d / 2) % 4]);
        }
      }
    },
  });

  PM.define('patterns', 'checks', {
    label: 'Gingham',
    draw(P, b, c, r, s) {
      fillBox(P, b, c[0]);
      const S = 12 * s; P.ctx.globalAlpha = 0.5;
      for (let y = b.y; y < b.y + b.h; y += S * 2) rect(P, b.x - 2, y, b.w + 4, S, c[1]);
      for (let x = b.x; x < b.x + b.w; x += S * 2) rect(P, x, b.y - 2, S, b.h + 4, c[1]);
      P.ctx.globalAlpha = 1;
    },
  });
})(window.PM = window.PM || {});
