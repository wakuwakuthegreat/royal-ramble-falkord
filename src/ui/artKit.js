// Shared bits for the hand-drawn event art: the ink-wash palette and small sketched props.
// Everything draws around the origin with a Pen (see sketch.js); no image assets.

export const WASH = { sky: '#cfd6c6', sky2: '#e8dcb8', hill: '#b9b08a', hill2: '#a2a07a', ground: '#c9b58a', red: '#a8442e', gold: '#d4ac34', blue: '#5d7d8e', green: '#6f8a4a', parch: '#efe3c2', dark: '#5a4630' };

/** A washed, hatched, outlined polygon: the basic building block of every drawing. */
export const shade = (p, pts, color, a = 0.9, gap = 4) => { p.fill(pts, color, a); p.hatch(pts, gap, -0.8, 0.6, 0.35); p.poly(pts, 1.7); };
export const ellipse = (cx, cy, rx, ry, n = 22, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
/** A polygon rotated about (cx, cy), for tilted props. */
export const rot = (pts, cx, cy, a) => pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, c = Math.cos(a), s = Math.sin(a); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; });

export function cloud(p, x, y, r, dark) {
  const g = p.g;
  g.fillStyle = dark ? 'rgba(120,125,120,0.55)' : 'rgba(250,245,230,0.75)';
  for (const [dx, dy, k] of [[-r, 3, 0.7], [0, 0, 1], [r, 4, 0.75], [r * 0.4, -r * 0.4, 0.7]]) { g.beginPath(); g.arc(x + dx, y + dy, r * k, 0, Math.PI * 2); g.fill(); }
  p.curve([[x - r * 1.7, y + 8], [x - r * 1.2, y - r * 0.4], [x - r * 0.3, y - r], [x + r * 0.6, y - r * 0.9], [x + r * 1.5, y - r * 0.2], [x + r * 1.75, y + 7]], 1);
}

/** Heart outline points; s is the half-width. */
export function heartPts(cx, cy, s, t0 = 0, t1 = Math.PI * 2, n = 30) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + (t1 - t0) * i / n;
    return [cx + s * Math.pow(Math.sin(t), 3), cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16];
  });
}
export const heart = (p, cx, cy, s, color = WASH.red) => shade(p, heartPts(cx, cy, s), color, 0.92, 3);

export function starPts(cx, cy, r, spikes = 5) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / spikes, k = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); }
  return pts;
}
export const star = (p, cx, cy, r, color = WASH.gold, spikes = 5) => shade(p, starPts(cx, cy, r, spikes), color, 1, 3);

export function flame(p, x, y, s = 1) {
  shade(p, [[x, y - 18 * s], [x + 6 * s, y - 7 * s], [x + 6 * s, y + 3 * s], [x, y + 8 * s], [x - 6 * s, y + 3 * s], [x - 6 * s, y - 7 * s]], '#e8742a', 0.95, 3);
  p.fill([[x, y - 8 * s], [x + 3 * s, y], [x, y + 5 * s], [x - 3 * s, y]], '#f4c040', 1);
}
/** A soft light behind something bright. */
export function glow(g, x, y, r, rgb = '255,220,140', a = 0.45) {
  const gl = g.createRadialGradient(x, y, 2, x, y, r);
  gl.addColorStop(0, `rgba(${rgb},${a})`); gl.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gl; g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A bird seen from the front, wings up. */
export function bird(p, x, y, s = 1, color = '#2a1d10', flap = 1) {
  const f = flap;
  p.fill([[x - s, y - s], [x - 8 * s, y - 10 * s * f], [x - 17 * s, y - 6 * s * f], [x - 9 * s, y + s]], color, 0.95);
  p.fill([[x + s, y - s], [x + 8 * s, y - 10 * s * f], [x + 17 * s, y - 6 * s * f], [x + 9 * s, y + s]], color, 0.95);
  p.curve([[x - s, y - s], [x - 8 * s, y - 10 * s * f], [x - 17 * s, y - 6 * s * f]], 1);
  p.curve([[x + s, y - s], [x + 8 * s, y - 10 * s * f], [x + 17 * s, y - 6 * s * f]], 1);
  p.fill(ellipse(x, y, 4 * s, 6 * s, 10), color, 1);
  p.fill([[x - s, y + 4 * s], [x + s, y + 4 * s], [x, y + 8 * s]], '#c98a2a', 1);
}
export function goose(p, x, y, s = 1) {
  shade(p, [[x - 14 * s, y - 2 * s], [x - 22 * s, y - 10 * s], [x - 12 * s, y - 6 * s]], '#efe8d8', 1, 5); // tail
  shade(p, ellipse(x, y, 17 * s, 11 * s, 16), '#f2ecdc', 1, 5);
  p.curve([[x + 11 * s, y - 6 * s], [x + 17 * s, y - 14 * s], [x + 16 * s, y - 24 * s]], 4.2 * s);
  p.curve([[x + 11 * s, y - 6 * s], [x + 17 * s, y - 14 * s], [x + 16 * s, y - 24 * s]], 1);
  p.circle(x + 17 * s, y - 26 * s, 4.5 * s, 1.2, '#f2ecdc');
  p.fill([[x + 21 * s, y - 27 * s], [x + 29 * s, y - 25 * s], [x + 21 * s, y - 23 * s]], '#e08a30', 1);
  p.circle(x + 18.5 * s, y - 27 * s, 1, 0.6, '#2a1d10');
  p.curve([[x - 8 * s, y - 2 * s], [x - 2 * s, y - 8 * s], [x + 8 * s, y - 2 * s]], 1);
  p.line(x - 4 * s, y + 10 * s, x - 4 * s, y + 18 * s, 1.4); p.line(x + 5 * s, y + 10 * s, x + 5 * s, y + 18 * s, 1.4);
}
/** A tied money sack. */
export function sack(p, x, y, s = 1, color = '#b8a070') {
  shade(p, [[x - 14 * s, y + 14 * s], [x - 18 * s, y], [x - 10 * s, y - 12 * s], [x + 10 * s, y - 12 * s], [x + 18 * s, y], [x + 14 * s, y + 14 * s]], color, 1, 4);
  shade(p, [[x - 8 * s, y - 12 * s], [x - 14 * s, y - 24 * s], [x - 4 * s, y - 19 * s], [x, y - 26 * s], [x + 4 * s, y - 19 * s], [x + 14 * s, y - 24 * s], [x + 8 * s, y - 12 * s]], color, 1, 4);
  p.line(x - 9 * s, y - 12 * s, x + 9 * s, y - 12 * s, 1.8);
  const g = p.g; g.font = `bold ${Math.round(16 * s)}px serif`; g.fillStyle = '#2a1d10'; g.textAlign = 'center'; g.fillText('¤', x, y + 7 * s); g.textAlign = 'start';
}
/** A blade along +x from the origin: grip, guard, then the steel. */
export function sword(p, len = 100) {
  shade(p, [[8, -3], [len, -1.6], [len + 7, 0], [len, 1.6], [8, 3]], '#c9cdd0', 1, 4);
  p.line(10, 0, len - 4, 0, 0.7, 1);
  shade(p, [[4, -11], [10, -11], [10, 11], [4, 11]], WASH.gold);
  shade(p, [[-14, -2.6], [4, -2.6], [4, 2.6], [-14, 2.6]], '#5a3a20');
  p.circle(-17, 0, 4, 1.2, WASH.gold);
}
/** A little stick figure with a round head, for crowds and dancers. */
export function folk(p, x, y, s = 1, cloak = WASH.blue, arms = 'down') {
  shade(p, [[x - 7 * s, y], [x - 9 * s, y - 24 * s], [x + 9 * s, y - 24 * s], [x + 7 * s, y]], cloak, 0.95, 4);
  p.circle(x, y - 32 * s, 7 * s, 1.3, '#f0d0b0');
  p.line(x - 4 * s, y, x - 5 * s, y + 14 * s, 1.4); p.line(x + 4 * s, y, x + 5 * s, y + 14 * s, 1.4);
  if (arms === 'up') { p.line(x - 8 * s, y - 22 * s, x - 16 * s, y - 40 * s, 1.4); p.line(x + 8 * s, y - 22 * s, x + 16 * s, y - 40 * s, 1.4); }
  else { p.line(x - 8 * s, y - 22 * s, x - 11 * s, y - 8 * s, 1.4); p.line(x + 8 * s, y - 22 * s, x + 11 * s, y - 8 * s, 1.4); }
}
export function crenel(x, w, top, base = 44) {
  const l = x - w, r = x + w, a = w / 3;
  return [[l, base], [l, top], [l, top - 8], [x - a, top - 8], [x - a, top], [x + a, top], [x + a, top - 8], [r, top - 8], [r, top], [r, base]];
}
export function tower(p, x, w, top, color = WASH.parch, base = 44) {
  shade(p, crenel(x, w, top, base), color);
  p.fill([[x - 2, top + 14], [x - 2, top + 26], [x + 3, top + 26], [x + 3, top + 14]], '#2a1d10', 0.85);
}
