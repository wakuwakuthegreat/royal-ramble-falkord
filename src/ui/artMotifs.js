// More hand-drawn motifs for the event art (see eventArt.js for the older ones). Each draws around (0,0),
// roughly x ±130, y -75..48, with the same sketchy Pen: wash, hatch, wobbly ink.
import { WASH, shade, ellipse, cloud, heart, heartPts, star, flame, glow, bird, goose, sack, sword, folk, tower } from './artKit.js';

const INK = '#2a1d10';
const letters = 'ABCDEGHILMNORSTW';

export const MOTIFS2 = {
  // ------------------------------------------------------------ omens
  comet(g, p, rng) {
    glow(g, 52, -34, 70, '255,240,190', 0.5);
    const tail = [[52, -44], [-104, -76], [-72, -54], [-116, -50], [-76, -34], [-104, -20], [52, -22]];
    p.fill(tail, '#f3e6b4', 0.55); p.hatch(tail, 4, -0.2, 0.5, 0.25);
    for (let i = 0; i < 7; i++) p.line(40, -33 + rng.range(-8, 8), -60 - rng.range(0, 50), -40 - i * 5 + rng.range(-6, 6), 0.7, 1);
    p.circle(52, -33, 13, 1.6, '#f7ecc4'); p.circle(52, -33, 6, 0.8, '#fff8dc');
    for (let i = 0; i < 9; i++) star(p, rng.range(-120, 120), rng.range(-76, -10), rng.range(2.5, 4.5), '#f3e8c0', 4);
    tower(p, -86, 18, 0, WASH.parch);
    shade(p, [[-110, 44], [-86, -18], [-62, 44]], WASH.hill2);
    p.line(-86, 0, -86, -14, 1.2);
    // an astronomer pointing
    folk(p, 40, 44, 0.9, WASH.blue, 'down'); p.line(48, 18, 70, -6, 1.6);
  },
  rainbow(g, p, rng) {
    const cols = ['#c4513a', '#e08a3a', '#e6c24a', '#7fa050', '#5d86a0', '#7a6aa0'];
    g.save(); g.lineCap = 'butt';
    cols.forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.82; g.lineWidth = 7; g.beginPath(); g.arc(0, 40, 96 - i * 6.5, Math.PI, 0); g.stroke(); });
    g.restore();
    p.curve(ellipse(0, 40, 99.5, 99.5, 26, Math.PI, Math.PI * 2), 1.3); p.curve(ellipse(0, 40, 60, 60, 20, Math.PI, Math.PI * 2), 1.1);
    cloud(p, -100, 30, 16); cloud(p, 98, 28, 14);
    // the pot at the end of it
    shade(p, [[92, 42], [86, 26], [104, 26], [124, 26], [118, 42]], '#4a3a2a');
    for (let i = 0; i < 6; i++) p.circle(92 + i * 6, 24 - (i % 2) * 3, 4, 1, WASH.gold);
    p.line(86, 26, 124, 26, 1.6);
    bird(p, -30, -62, 0.8); bird(p, -12, -70, 0.6);
  },
  lightning(g, p, rng) {
    glow(g, 0, -36, 120, '255,250,210', 0.6);
    shade(p, [[-50, 44], [-50, 2], [50, 2], [50, 44]], '#cbb488');
    shade(p, [[-72, 4], [0, -30], [72, 4]], '#8a5a3a');
    shade(p, [[-13, 44], [-13, 16], [13, 16], [13, 44]], '#5a4630');
    p.line(0, -30, 0, -40, 1.6);
    shade(p, [[12, -78], [-6, -52], [4, -52], [-9, -32], [20, -58], [9, -58], [24, -78]], '#fff2a0', 1, 3);
    // smoke from the scorched roof, and a monk running off
    p.curve([[-22, -22], [-30, -34], [-20, -46], [-30, -58]], 0.9);
    folk(p, 96, 44, 0.9, '#8a6a3a', 'up');
    p.curve([[84, 4], [78, -6]], 0.8); p.curve([[104, 6], [112, -4]], 0.8);
    cloud(p, -90, -52, 20, true); cloud(p, 92, -56, 18, true);
  },
  raven(g, p, rng) {
    tower(p, -78, 22, -36, '#d8cfb4');
    shade(p, [[-100, -36], [-56, -36], [-78, -64]], '#6a5a4a');
    p.line(-78, -64, -78, -78, 1.4);
    for (let i = 0; i < 7; i++) bird(p, 6 + i * 22 + rng.range(-6, 6), -50 + i * 5 + rng.range(-8, 8), rng.range(0.8, 1.15), '#2a1d10', rng.range(0.7, 1.1));
    // the one that stayed
    bird(p, -78, -70, 0.6, '#2a1d10', 0.2);
    for (let i = 0; i < 5; i++) { const x = rng.range(-30, 120), y = rng.range(-4, 40); p.line(x, y, x + 5, y - 3, 0.7, 1); }
    cloud(p, 70, -66, 16, true);
  },
  eclipse(g, p, rng) {
    g.save(); g.strokeStyle = 'rgba(212,172,52,0.75)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r0 = 36, r1 = 46 + rng.range(0, 18); g.beginPath(); g.moveTo(Math.cos(a) * r0, -24 + Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, -24 + Math.sin(a) * r1); g.stroke(); }
    g.restore();
    p.circle(0, -24, 36, 2, '#2a2420');
    p.curve(ellipse(0, -24, 33, 33, 14, -0.9, 0.5), 2.4);
    for (const x of [-84, 84]) {
      shade(p, [[x - 30, 44], [x - 30, 20], [x + 30, 20], [x + 30, 44]], '#b89a68');
      for (let i = 0; i < 4; i++) shade(p, [[x - 30 + i * 15, 6], [x - 15 + i * 15, 6], [x - 15 + i * 15, 20], [x - 30 + i * 15, 20]], i % 2 ? WASH.parch : WASH.red, 0.9, 5);
      p.line(x - 30, 6, x - 36, 20, 1.2); p.line(x + 30, 6, x + 36, 20, 1.2);
      p.line(x - 30, 6, x - 30, 44, 1.4); p.line(x + 30, 6, x + 30, 44, 1.4);
      shade(p, [[x - 12, 30], [x + 12, 30], [x + 12, 40], [x - 12, 40]], WASH.parch, 1, 6); p.line(x - 8, 32, x + 8, 38, 1.2); p.line(x + 8, 32, x - 8, 38, 1.2);
    }
    for (let i = 0; i < 14; i++) star(p, rng.range(-120, 120), rng.range(-76, -50), rng.range(1.5, 3), '#f3e8c0', 4);
  },
  bumper(g, p, rng) {
    glow(g, 0, 40, 120, '255,225,140', 0.55);
    shade(p, ellipse(0, 40, 40, 40, 20, Math.PI, Math.PI * 2), '#f0c24a', 0.95, 4);
    g.save(); g.strokeStyle = '#d4ac34'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 13; i++) { const a = Math.PI + (i + 0.5) / 13 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 48, 40 + Math.sin(a) * 48); g.lineTo(Math.cos(a) * (62 + (i % 2) * 10), 40 + Math.sin(a) * (62 + (i % 2) * 10)); g.stroke(); }
    g.restore();
    goose(p, -88, 32, 1.1); goose(p, 92, 34, 1.5); goose(p, -50, 40, 0.7);
    for (let i = -2; i <= 2; i++) { p.curve([[i * 5 + 56, 44], [i * 5 + 58, 22], [i * 8 + 58, 6]], 1.1); shade(p, ellipse(i * 8 + 58, 4, 2.4, 5, 8), '#d4ac34', 1, 3); }
  },

  // ------------------------------------------------------------ the court's news
  wedding(g, p, rng) {
    for (const x of [-66, 66]) p.line(x, 46, x, -26, 3.2);
    const arc = ellipse(0, -26, 66, 44, 22, Math.PI, Math.PI * 2);
    p.curve(arc, 3);
    arc.forEach(([x, y], i) => { if (i % 2 === 0) { p.circle(x, y, rng.range(4, 6.5), 1, rng.pick(['#d98aa0', WASH.red, '#f2e8d0', WASH.gold])); } else shade(p, ellipse(x, y + 4, 6, 2.6, 8), WASH.green, 0.9, 3); });
    for (const [cx, col] of [[-12, WASH.gold], [12, '#e6c24a']]) {
      g.save(); g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(cx, 22, 13, 0, Math.PI * 2); g.stroke(); g.restore();
      p.circle(cx, 22, 16.5, 1.1); p.circle(cx, 22, 9.5, 0.9);
    }
    // bouquet
    for (let i = 0; i < 5; i++) p.circle(-100 + rng.range(-10, 10), 22 + rng.range(-10, 6), 6, 1, rng.pick(['#d98aa0', '#f2e8d0', WASH.red]));
    shade(p, [[-110, 30], [-94, 30], [-100, 46]], WASH.green, 1, 4);
    // confetti
    for (let i = 0; i < 14; i++) p.fill(ellipse(rng.range(-110, 110), rng.range(-70, 4), 2, 1.2, 4), rng.pick(['#d98aa0', WASH.gold, '#f2e8d0', WASH.blue]), 0.9);
  },
  romance(g, p, rng) {
    heart(p, 0, -4, 50);
    p.curve(heartPts(-8, -12, 22, 0.9, 2.3, 8), 1.2);
    // an arrow straight through
    p.line(-84, 36, 76, -48, 2.4);
    shade(p, [[76, -48], [58, -52], [66, -38]], '#c9cdd0', 1, 4);
    shade(p, [[-84, 36], [-98, 32], [-90, 24]], '#efe8d8', 1, 5); shade(p, [[-92, 44], [-104, 40], [-98, 32]], '#efe8d8', 1, 5);
    heart(p, -92, -34, 11, '#d98aa0'); heart(p, 96, 14, 9, '#d98aa0'); heart(p, 80, -50, 7, WASH.red); heart(p, -70, 4, 7, '#d98aa0');
    // a rose
    p.curve([[104, 44], [110, 26], [108, 10]], 1.8);
    shade(p, ellipse(106, 36, 7, 3, 8), WASH.green, 1, 3);
    p.circle(108, 6, 9, 1.4, WASH.red); p.curve(ellipse(108, 6, 5, 5, 10, 0.5, 5), 1);
  },
  feud(g, p, rng) {
    for (const [x, col, s] of [[-100, WASH.red, -1], [100, WASH.blue, 1]]) {
      shade(p, [[x - 30, -42], [x + 30, -42], [x + 30, -2], [x, 32], [x - 30, -2]], col, 0.92, 4);
      p.line(x, -42, x, 32, 1); p.line(x - 30, -14, x + 30, -14, 1);
      p.circle(x, -14, 7, 1.2, WASH.gold);
      // a crack running through each
      p.curve([[x + s * 10, -42], [x + s * 4, -26], [x + s * 14, -12], [x + s * 6, 6], [x + s * 16, 20]], 1);
    }
    g.save(); g.rotate(-0.28);
    const glove = '#c4ac78';
    shade(p, [[-20, 22], [-22, -8], [22, -8], [24, 22]], glove);
    for (let i = 0; i < 4; i++) { const x = -22 + i * 11.5, h = 14 + (i === 1 || i === 2 ? 7 : 0); shade(p, [[x, -8], [x + 1, -8 - h], [x + 10, -8 - h], [x + 10.5, -8]], glove, 1, 4); }
    shade(p, [[-22, 2], [-38, -6], [-33, -17], [-20, -8]], glove);
    shade(p, [[-24, 22], [-24, 36], [26, 36], [26, 22]], WASH.red);
    g.restore();
    for (const [x, y] of [[-44, -42], [48, -50], [-30, 30], [40, 34]]) { p.line(x - 6, y, x + 6, y, 1.2, 1); p.line(x, y - 6, x, y + 6, 1.2, 1); }
  },
  duel(g, p, rng) {
    glow(g, 0, 44, 130, '255,200,120', 0.55);
    shade(p, ellipse(0, 44, 46, 46, 20, Math.PI, Math.PI * 2), '#f0b050', 0.9, 4);
    g.save(); g.translate(-122, 14); g.rotate(-0.05); sword(p, 112); g.restore();
    g.save(); g.translate(122, 8); g.scale(-1, 1); g.rotate(0.05); sword(p, 112); g.restore();
    // the glove that started it
    g.save(); g.translate(0, 38); g.rotate(0.3); shade(p, [[-10, 6], [-11, -4], [10, -4], [11, 6]], '#c4ac78'); for (let i = 0; i < 4; i++) shade(p, [[-11 + i * 5.5, -4], [-10.5 + i * 5.5, -13], [-6.5 + i * 5.5, -13], [-6 + i * 5.5, -4]], '#c4ac78', 1, 3); g.restore();
    for (let i = 0; i < 12; i++) { const y = rng.range(-30, 40); g.globalAlpha = 0.5; p.line(-130 + rng.range(0, 40), y, -90 + rng.range(0, 160), y, 0.6, 1); g.globalAlpha = 1; }
    p.curve([[-4, -4], [0, -14], [4, -4]], 1.4);
  },
  ill(g, p, rng) {
    shade(p, [[-100, 44], [-100, -22], [-86, -22], [-86, 44]], '#8a5a2a');
    shade(p, [[86, 44], [86, 2], [100, 2], [100, 44]], '#8a5a2a');
    shade(p, [[-92, 24], [92, 24], [92, 36], [-92, 36]], '#f4efe0', 1, 7);
    shade(p, ellipse(-64, 14, 24, 9, 12), '#fffaf0', 1, 8);
    shade(p, [[-52, 24], [-52, 6], [90, 6], [90, 24]], '#7f9aa0', 0.92, 4);
    p.curve([[-40, 12], [-10, 18], [30, 10], [70, 16]], 0.9);
    p.circle(-64, 2, 12, 1.4, '#e8d0b8');
    shade(p, [[-76, 0], [-68, -26], [-48, -10], [-52, 0]], WASH.red); p.circle(-68, -27, 4, 1, '#f2e8d0');
    p.line(-69, 1, -63, 3, 1.2, 1); p.line(-61, 1, -55, 3, 1.2, 1); p.curve([[-66, 9], [-62, 7], [-58, 9]], 1);
    for (const [x, y] of [[-46, -8], [-44, -14]]) p.fill(ellipse(x, y, 1.5, 2.4, 6), '#7fa0c0', 1);
    for (let i = 0; i < 3; i++) p.curve([[-90 + i * 8, -40 - i * 4], [-82 + i * 8, -50], [-92 + i * 8, -58]], 0.8);
    // the bedside: bowl and bottle
    shade(p, [[106, 44], [106, 14], [132, 14], [132, 44]], '#a8743a');
    shade(p, [[110, 14], [112, 6], [128, 6], [130, 14]], '#efe8d8', 1, 4);
    shade(p, [[116, 6], [116, -6], [112, -12], [112, -20], [122, -20], [122, -12], [120, -6], [120, 6]], WASH.green, 0.95, 3);
    for (let i = 0; i < 2; i++) p.curve([[112 + i * 6, 1], [110 + i * 6, -6]], 0.7);
  },
  talent(g, p, rng) {
    glow(g, 0, -4, 90, '255,235,170', 0.5);
    for (const s of [-1, 1]) for (let i = 0; i < 10; i++) {
      const th = Math.PI * (0.56 + i / 9 * 0.9), cx = Math.cos(th) * 50, y = -4 + Math.sin(th) * 50;
      g.save(); g.translate(s < 0 ? cx : -cx, y); g.rotate(s < 0 ? th + Math.PI / 2 : Math.PI / 2 - th); shade(p, ellipse(0, 0, 11, 4.5, 8), i % 2 ? WASH.green : '#8aa05a', 0.95, 3); g.restore();
    }
    shade(p, [[-26, -36], [26, -36], [22, -8], [8, 4], [-8, 4], [-22, -8]], WASH.gold, 1, 4);
    p.curve([[-26, -30], [-42, -28], [-40, -10], [-22, -8]], 3); p.curve([[26, -30], [42, -28], [40, -10], [22, -8]], 3);
    shade(p, [[-4, 4], [4, 4], [5, 20], [-5, 20]], WASH.gold, 1, 4);
    shade(p, [[-18, 20], [18, 20], [20, 32], [-20, 32]], '#8a6a3a');
    star(p, 0, -18, 9, '#fff2a0');
    for (let i = 0; i < 16; i++) { const x = rng.range(-116, 116), y = rng.range(-72, -30); g.save(); g.translate(x, y); g.rotate(rng.range(0, 6)); shade(p, [[-3, -1.5], [3, -1.5], [3, 1.5], [-3, 1.5]], rng.pick([WASH.red, WASH.blue, WASH.gold, '#d98aa0']), 1, 99); g.restore(); }
  },
  scandal(g, p, rng) {
    shade(p, [[-36, 46], [-36, -54], [36, -54], [36, 46]], '#8a5a2a', 1, 5);
    for (const y of [-30, 8]) shade(p, [[-26, y], [26, y], [26, y + 28], [-26, y + 28]], '#9a6a3a', 0.9, 6);
    p.circle(0, -10, 9, 1.4, INK); p.fill([[-4, -4], [4, -4], [8, 20], [-8, 20]], INK, 1);
    // an eye at the keyhole
    g.save(); g.translate(0, -66);
    shade(p, ellipse(0, 0, 22, 11, 16), '#fffaf0', 1, 9); p.circle(0, 1, 7, 1.2, WASH.blue); p.circle(0, 1, 3, 0.8, INK);
    for (let i = -3; i <= 3; i++) p.line(i * 6, -9 + Math.abs(i), i * 7, -16 + Math.abs(i) * 1.5, 0.9, 1);
    g.restore();
    for (const [x, y, w, f] of [[-92, -32, 34, -1], [92, -6, 38, 1]]) {
      shade(p, ellipse(x, y, w, 20, 18), '#fffaf0', 1, 99);
      shade(p, [[x + f * 8, y + 17], [x + f * 22, y + 34], [x + f * 22, y + 12]], '#fffaf0', 1, 99);
      for (let i = -1; i <= 1; i++) p.circle(x + i * 12, y, 2.6, 0.8, INK);
    }
  },
  friends(g, p, rng) {
    p.line(-120, 44, 120, 44, 1.8);
    const mug = (x, a, flip) => {
      g.save(); g.translate(x, 10); g.rotate(a);
      shade(p, [[-17, -24], [17, -24], [14, 30], [-14, 30]], '#c89a52', 1, 4);
      for (const y of [-12, 14]) p.line(-16, y, 16, y, 1.6);
      p.curve([[flip * 16, -14], [flip * 34, -14], [flip * 34, 14], [flip * 14, 16]], 4.5);
      p.curve([[flip * 16, -14], [flip * 34, -14], [flip * 34, 14], [flip * 14, 16]], 1);
      for (const [dx, dy, r] of [[-9, -28, 8], [3, -31, 9], [11, -26, 7]]) p.circle(dx, dy, r, 1.1, '#faf4e4');
      g.restore();
    };
    mug(-30, 0.42, -1); mug(30, -0.42, 1);
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.34; p.fill(ellipse(Math.cos(a) * rng.range(14, 30), -42 + Math.sin(a) * rng.range(8, 24), 2.2, 3, 6), '#e6c070', 0.95); }
    star(p, 0, -34, 9, '#fff2a0', 8);
    // toasting hands, or at least a bread and a cheese
    shade(p, ellipse(-100, 38, 18, 6), '#c9a06a'); shade(p, [[80, 44], [96, 26], [118, 44]], '#e8c870', 1, 5);
  },
  festival(g, p, rng) {
    const sag = t => -66 + 4 * 28 * t * (1 - t);
    const line = Array.from({ length: 9 }, (_, i) => [-130 + i * 32.5, sag(i / 8)]);
    p.curve(line, 1.2);
    const cols = [WASH.red, WASH.gold, WASH.blue, WASH.green, '#d98aa0'];
    for (let i = 1; i < 14; i++) { const t = i / 14, x = -130 + 260 * t, y = sag(t); shade(p, [[x - 7, y], [x + 7, y], [x, y + 15]], cols[i % 5], 0.95, 4); }
    p.line(0, 46, 0, -36, 3.4);
    star(p, 0, -42, 8, WASH.gold, 6);
    cols.slice(0, 4).forEach((c, k) => {
      g.save(); g.strokeStyle = c; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -34); g.bezierCurveTo(-36 + k * 24, -14, 30 - k * 20, 14, (k - 1.5) * 30, 44); g.stroke(); g.restore();
    });
    folk(p, -78, 40, 1, WASH.green, 'up'); folk(p, 78, 40, 1, WASH.red, 'up');
    // the man wearing a cheese
    const cx = 78, cy = 40 - 32;
    shade(p, [[cx - 11, cy - 4], [cx + 11, cy - 4], [cx + 6, cy - 22], [cx - 6, cy - 22]], '#f0d070', 1, 99);
    for (const [dx, dy] of [[-3, -10], [4, -15], [5, -7]]) p.circle(cx + dx, cy + dy, 1.8, 0.7, '#c9a64a');
    p.line(cx - 11, cy - 4, cx + 11, cy - 4, 1.4);
    for (const x of [-124, 124]) { p.line(x, 44, x, -4, 1.6); p.circle(x, -10, 8, 1.2, '#e9b050'); }
  },
  unrest(g, p, rng) {
    for (let i = 0; i < 3; i++) {
      const x = -92 + i * 36, lean = (i - 1) * 7;
      p.line(x, 44, x + lean, -50, 2.2);
      p.curve([[x + lean - 12, -54], [x + lean - 12, -36], [x + lean + 12, -36], [x + lean + 12, -54]], 2);
      for (const dx of [-12, 0, 12]) p.line(x + lean + dx, -36, x + lean + dx, -62, 1.6);
    }
    for (const x of [48, 100]) {
      p.line(x, 44, x + 6, -22, 2.4);
      glow(g, x + 6, -34, 46, '255,190,90', 0.5);
      flame(p, x + 6, -34, 1.5);
    }
    // a hand-lettered sign
    shade(p, [[10, -12], [60, -16], [62, 4], [12, 8]], '#d8c79c', 1, 7);
    g.font = 'bold 13px serif'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('BREAD!', 36, 0); g.textAlign = 'start';
    p.line(34, 8, 36, 44, 2);
    for (let i = -9; i <= 9; i++) p.circle(i * 14 + rng.range(-2, 2), 42 + (i % 2) * 4, 8, 1.2, i % 3 ? '#6a5a44' : '#4a3a2a');
  },
  herald(g, p, rng) {
    shade(p, [[-80, 4], [34, -20], [34, -12], [-80, 14]], WASH.gold);
    shade(p, [[34, -20], [66, -46], [72, -22], [34, -12]], WASH.gold, 1, 3);
    p.circle(-84, 9, 6, 1.4, WASH.gold);
    shade(p, [[-46, 0], [-20, -6], [-20, 34], [-33, 26], [-46, 34]], WASH.red); p.circle(-33, 8, 5, 1, WASH.gold);
    for (let i = 0; i < 3; i++) p.curve(ellipse(72, -34, 12 + i * 11, 12 + i * 11, 8, -1.2, 0.6), 0.9);
    g.font = 'bold 26px serif'; g.fillStyle = INK; g.fillText('♪', 94, -50); g.font = 'bold 20px serif'; g.fillText('♫', 100, -22); g.fillText('♪', 80, -66);
    shade(p, [[-110, 44], [-110, 22], [-76, 22], [-76, 44]], WASH.parch, 1, 8);
    for (let i = 0; i < 3; i++) p.line(-104, 28 + i * 6, -82, 28 + i * 6, 0.7, 1);
    p.circle(-93, 40, 4, 1, WASH.red);
  },

  // ------------------------------------------------------------ intrigue
  ledger(g, p, rng) {
    shade(p, [[-84, 32], [-3, 24], [-3, -42], [-84, -36]], WASH.parch, 1, 9);
    shade(p, [[3, 24], [84, 32], [84, -36], [3, -42]], WASH.parch, 1, 9);
    p.line(0, 24, 0, -42, 2);
    for (let i = 0; i < 8; i++) {
      p.line(-76, -26 + i * 7.4, -10, -29 + i * 7.4, 0.6, 1); p.line(10, -29 + i * 7.4, 76, -26 + i * 7.4, 0.6, 1);
      p.curve([[-72, -29 + i * 7.4], [-62, -25 + i * 7.4], [-52, -29 + i * 7.4], [-40, -26 + i * 7.4]], 0.7);
      p.curve([[40, -29 + i * 7.4], [48, -26 + i * 7.4], [56, -29 + i * 7.4]], 0.7);
    }
    p.line(24, -29 + 7.4 * 3, 70, -26 + 7.4 * 3, 1.6, 1);
    g.save(); g.translate(30, -4); g.rotate(-0.25); g.font = 'bold 44px serif'; g.fillStyle = 'rgba(168,68,46,0.85)'; g.fillText('?', 0, 0); g.restore();
    sack(p, 112, 22, 1.1);
    for (const [x, y] of [[64, 40], [82, 44], [96, 40]]) p.circle(x, y, 4, 1, WASH.gold);
    p.curve([[-112, 40], [-100, 12], [-84, -16]], 1.6); shade(p, [[-86, -14], [-82, -40], [-70, -50], [-78, -20]], '#efe8d8', 1, 5);
  },
  forge(g, p, rng) {
    for (const [x, a, seal] of [[-54, -0.1, false], [34, 0.08, true]]) {
      g.save(); g.translate(x, -2); g.rotate(a);
      shade(p, [[-44, -42], [44, -42], [44, 40], [-44, 40]], WASH.parch, 1, 9);
      for (let i = 0; i < 6; i++) p.line(-34, -28 + i * 9, 34 - (i === 5 ? 20 : 0), -28 + i * 9, 0.7, 1);
      p.curve([[-34, 28], [-24, 22], [-14, 30], [0, 24]], 1);
      if (seal) { p.circle(24, 26, 12, 1.6, WASH.red); p.circle(24, 26, 7, 0.9); }
      g.restore();
    }
    g.font = 'bold 22px serif'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('=', -10, 6); g.textAlign = 'start';
    // the stamp
    shade(p, [[92, -12], [118, -12], [118, 6], [92, 6]], '#8a5a2a'); shade(p, [[102, -12], [108, -12], [108, -40], [102, -40]], '#a8743a');
    p.circle(105, -46, 7, 1.4, '#8a5a2a'); p.circle(105, 12, 11, 1.2, WASH.red);
    shade(p, ellipse(-104, 40, 12, 6), '#3a2a1a'); p.curve([[-104, 34], [-100, 10], [-86, -24]], 1.6); shade(p, [[-88, -22], [-84, -48], [-72, -56], [-80, -26]], '#efe8d8', 1, 5);
  },
  keyhole(g, p, rng) {
    const door = [...ellipse(-30, -10, 44, 44, 14, Math.PI, Math.PI * 2), [14, 44], [-74, 44]];
    shade(p, door, '#7a5230', 1, 5);
    for (const x of [-52, -30, -8]) p.line(x, -52 + Math.abs(x + 30) * 0.5, x, 44, 0.8, 1);
    p.circle(-30, 4, 9, 1.4, INK); p.fill([[-35, 8], [-25, 8], [-21, 34], [-39, 34]], INK, 1);
    p.circle(-4, 14, 4, 1.2, WASH.gold);
    glow(g, -30, 20, 36, '255,210,120', 0.35);
    // a hooded figure with a lantern, listening
    shade(p, [[60, 46], [66, -2], [74, -22], [92, -22], [100, -2], [106, 46]], '#3a3a44', 0.97, 3);
    p.fill(ellipse(83, -8, 8, 10, 10), '#14100a', 1);
    p.circle(80, -8, 1.6, 0.5, '#f2e8d0'); p.circle(87, -8, 1.6, 0.5, '#f2e8d0');
    p.line(62, 8, 40, 14, 1.6); glow(g, 36, 22, 40, '255,210,120', 0.6);
    shade(p, [[30, 14], [42, 14], [42, 30], [30, 30]], '#f0c060', 1, 99); p.line(36, 14, 36, 8, 1.2);
    for (const [x, y] of [[-100, -50], [118, -52], [118, -20]]) star(p, x, y, 3, '#f3e8c0', 4);
  },
  gate(g, p, rng) {
    shade(p, [[-120, 44], [-120, -34], [-96, -34], [-96, -42], [-86, -42], [-86, -34], [-70, -34], [-70, -42], [-60, -42], [-60, -34], [-20, -34], [-20, 44]], '#d0c09a');
    shade(p, [[-20, 44], [-20, -46], [-12, -46], [-12, -54], [-2, -54], [-2, -46], [14, -46], [14, -54], [24, -54], [24, -46], [60, -46], [60, 44]], '#d8c8a2');
    const arch = [[-22, 44], [-22, -6], ...ellipse(10, -6, 32, 30, 12, Math.PI, Math.PI * 2), [42, 44]];
    p.fill(arch, '#3a2e22', 0.9);
    for (let x = -12; x <= 36; x += 10) p.line(x, -20 + Math.abs(x - 18) * 0.5, x, 44, 1.2, 1);
    for (let y = -10; y <= 30; y += 14) p.line(-22, y, 42, y, 1.2, 1);
    // a traveller leaving with a bundle on a stick
    folk(p, 98, 44, 1.1, '#6a5a44', 'down');
    shade(p, [[90, 8], [98, -8], [110, 8]], '#6a5a44', 1, 4);
    p.line(86, 6, 118, -22, 1.6); p.circle(118, -26, 8, 1.2, '#b8a070');
    for (let i = 0; i < 4; i++) p.fill(ellipse(70 - i * 6, 46 - i % 2 * 2, 2.6, 1.4, 6), '#6a5a44', 0.9);
  },
  burningcastle(g, p, rng) {
    glow(g, 0, -10, 140, '255,150,60', 0.5);
    tower(p, -62, 20, -14); tower(p, 62, 20, -14); tower(p, 0, 34, -34);
    shade(p, [[-42, 44], [-42, 0], [42, 0], [42, 44]], '#d8cba4');
    shade(p, ellipse(0, 44, 13, 22, 12, Math.PI, Math.PI * 2).concat([[13, 44]]), '#2a1d10');
    for (const [x, y, s] of [[-62, -22, 1.6], [62, -22, 1.6], [0, -42, 2.2], [-20, -26, 1.1], [24, -22, 1.2]]) flame(p, x, y, s);
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(70,60,55,${0.35 - i * 0.05})`; g.beginPath(); g.arc(-10 + i * 12 + rng.range(-4, 4), -62 - i * 8, 12 + i * 4, 0, 6.3); g.fill(); }
    for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(255,170,60,0.9)'; g.fillRect(rng.range(-80, 80), rng.range(-76, -20), 1.6, 1.6); }
    p.line(-100, 44, -100, -10, 1.8); shade(p, [[-100, -10], [-84, -6], [-100, 2]], WASH.red, 1);
    folk(p, 100, 44, 0.9, WASH.green, 'up');
  },
  throne(g, p, rng) {
    shade(p, [[-32, 40], [-36, -48], [-22, -64], [0, -72], [22, -64], [36, -48], [32, 40]], '#7a2a40', 1, 4);
    shade(p, [[-22, 30], [-24, -42], [-14, -54], [0, -60], [14, -54], [24, -42], [22, 30]], '#9a3a52', 0.9, 6);
    p.curve([[-28, 38], [-31, -44], [-18, -60], [0, -68], [18, -60], [31, -44], [28, 38]], 1.2);
    shade(p, [[-44, 18], [44, 18], [48, 32], [-48, 32]], '#8a5a2a'); shade(p, [[-38, 8], [38, 8], [44, 18], [-44, 18]], '#b04860', 1, 5);
    for (const x of [-44, 44]) shade(p, [[x - 4, 32], [x + 4, 32], [x + 4, 46], [x - 4, 46]], '#8a5a2a');
    // the dagger in the headrest, and the crown that fell
    g.save(); g.translate(0, -34); g.rotate(0.5); shade(p, [[-3, -2], [3, -2], [2, 30], [-2, 30]], '#c9cdd0', 1, 4); shade(p, [[-8, -4], [8, -4], [8, 0], [-8, 0]], WASH.gold); shade(p, [[-2.5, -4], [2.5, -4], [2.5, -18], [-2.5, -18]], '#5a3a20'); g.restore();
    g.save(); g.translate(92, 36); g.rotate(0.7);
    shade(p, [[-18, 8], [-20, -14], [-9, -2], [0, -18], [9, -2], [20, -14], [18, 8]], WASH.gold, 1, 4); g.restore();
    for (const [x, y] of [[-96, -30], [-110, -4], [100, -40], [112, -12]]) { p.line(x - 5, y, x + 5, y, 1.2, 1); p.line(x, y - 5, x, y + 5, 1.2, 1); }
  },
  ransom(g, p, rng) {
    shade(p, [[-74, -42], [58, -42], [58, 38], [-74, 38]], WASH.parch, 1, 9);
    for (let row = 0; row < 3; row++) {
      let x = -66;
      while (x < 46) {
        const w = rng.range(11, 19), h = rng.range(13, 20);
        g.save(); g.translate(x + w / 2, -28 + row * 24 + rng.range(-3, 3)); g.rotate(rng.range(-0.18, 0.18));
        p.fill([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], rng.pick(['#fffaf0', '#e6d6a8', '#c9d2d0', '#d9a9a0']), 1);
        p.poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 0.8);
        g.font = `bold ${rng.int(11, 15)}px ${rng.pick(['serif', 'sans-serif', 'monospace'])}`; g.fillStyle = rng.chance(0.2) ? WASH.red : INK; g.textAlign = 'center'; g.fillText(letters[rng.int(0, letters.length - 1)], 0, 5); g.textAlign = 'start';
        g.restore();
        x += w + rng.range(1, 4);
      }
    }
    sack(p, 100, 24, 1.15);
    for (const [x, y] of [[78, 44], [124, 44]]) p.circle(x, y, 4.5, 1, WASH.gold);
    // scissors
    p.line(-110, 40, -84, 6, 1.8); p.line(-92, 40, -100, 6, 1.8); p.circle(-112, 44, 6, 1.4); p.circle(-90, 44, 6, 1.4);
  },
  brokenheart(g, p, rng) {
    const r = heartPts(0, -4, 50, 0, Math.PI), l = heartPts(0, -4, 50, Math.PI, Math.PI * 2);
    g.save(); g.translate(8, 2); g.rotate(0.12); shade(p, r, WASH.red, 0.95, 3); g.restore();
    g.save(); g.translate(-8, 2); g.rotate(-0.12); shade(p, l, '#b8524a', 0.95, 3); g.restore();
    p.curve([[0, -22], [-5, -10], [4, 0], [-4, 14], [2, 30]], 1.4);
    // ring left on the floor, petals, a tear
    g.save(); g.strokeStyle = WASH.gold; g.lineWidth = 5; g.beginPath(); g.ellipse(96, 38, 14, 6, 0, 0, 6.3); g.stroke(); g.restore();
    p.curve(ellipse(96, 38, 17, 8, 14), 1); p.curve(ellipse(96, 38, 10, 4, 12), 0.8);
    star(p, 96, 28, 5, '#fff2a0', 4);
    for (let i = 0; i < 8; i++) p.fill(ellipse(rng.range(-110, -50), rng.range(-30, 44), 4, 2.4, 6), rng.pick(['#d98aa0', WASH.red]), 0.9);
    p.fill([[-70, 0], [-74, 8], [-70, 12], [-66, 8]], '#7fa0c0', 1);
    for (let i = 0; i < 3; i++) p.curve([[-4 + i * 6, 48], [-2 + i * 6, 40]], 0.8);
  },
  bait(g, p, rng) {
    const water = [[-140, -6], [140, -6], [140, 52], [-140, 52]];
    p.fill(water, '#7f9aa0', 0.6); p.hatch(water, 5, 0, 0.6, 0.35);
    p.curve([[-140, -6], [-100, -9], [-60, -5], [-20, -9], [20, -5], [60, -9], [100, -5], [140, -8]], 1.3);
    p.line(-118, 32, -34, -72, 2.4);
    p.curve([[-34, -72], [-24, -40], [-6, -18], [4, 8]], 0.8);
    p.curve([[4, 8], [4, 22], [-6, 26], [-8, 18]], 1.6);
    sack(p, 4, 6, 0.55);
    // a fish in a chain of office, looking tempted
    shade(p, ellipse(64, 24, 34, 17, 18), '#8aa0a4', 0.95, 4);
    shade(p, [[94, 24], [116, 8], [116, 40]], '#8aa0a4', 0.95, 4);
    p.circle(44, 20, 4, 1.2, '#fffaf0'); p.circle(43, 20, 1.6, 0.6, INK);
    p.curve([[30, 28], [38, 34], [46, 30]], 1.2); p.curve([[54, 14], [58, 24], [54, 34]], 1);
    shade(p, [[44, 8], [44, -2], [50, 4], [56, -4], [60, 6], [66, -2], [68, 8]], WASH.gold, 1, 4);
    for (let i = 0; i < 4; i++) p.circle(24 - i * 4, 12 - i * 8, 2.4 + i * 0.6, 0.7);
  },
  caravan(g, p, rng) {
    p.line(-130, 38, 130, 38, 1.4); p.line(-130, 44, 130, 44, 0.8, 1);
    shade(p, [[-64, 18], [-64, -14], [44, -14], [44, 18]], '#9a6a3a');
    for (const x of [-40, -16, 8, 28]) p.line(x, -14, x, 18, 0.8, 1);
    const cover = ellipse(-10, -14, 56, 34, 18, Math.PI, Math.PI * 2).concat([[46, -14]]);
    shade(p, cover, WASH.parch, 1, 7);
    for (let i = 1; i < 4; i++) p.curve(ellipse(-10, -14, 56, 34, 10, Math.PI + i * 0.7 - 0.7, Math.PI + i * 0.7 + 0.01), 0.7);
    sack(p, -74, 6, 0.8); sack(p, -68, 18, 0.6, '#a08a5a');
    for (const x of [-38, 22]) {
      p.circle(x, 24, 16, 2, '#8a5a2a'); p.circle(x, 24, 4, 1.2, '#2a1d10');
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; p.line(x - Math.cos(a) * 15, 24 - Math.sin(a) * 15, x + Math.cos(a) * 15, 24 + Math.sin(a) * 15, 1.2, 1); }
    }
    p.line(44, 6, 78, 18, 2.4);
    p.line(8, -48, 8, -70, 1.4); shade(p, [[8, -70], [30, -64], [8, -58]], WASH.red, 1);
    for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(190,170,130,${0.4 - i * 0.07})`; g.beginPath(); g.arc(-90 - i * 14, 38 - i * 2, 7 + i * 3, 0, 6.3); g.fill(); }
    shade(p, ellipse(110, 22, 24, 16, 14), '#a8743a'); p.line(110, 38, 110, 44, 1.6);
    for (let i = 0; i < 3; i++) p.circle(100 + i * 10, 14, 5, 1, WASH.gold);
  },
  horn(g, p, rng) {
    for (const [x, c] of [[-104, WASH.red], [104, WASH.blue]]) { p.line(x, 46, x, -56, 2.2); shade(p, [[x, -52], [x + (x < 0 ? 28 : -28), -46], [x, -26]], c, 0.9); }
    const n = 24, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, cx = -88 + 176 * t, cy = 24 - 58 * Math.sin(t * Math.PI * 0.95) + t * 12, w = 3.5 + 20 * t * t;
      const nx = 0.55 + t * 0.3, ny = 1;
      top.push([cx - nx * w * 0.5, cy - ny * w * 0.5]); bot.push([cx + nx * w * 0.5, cy + ny * w * 0.5]);
    }
    const horn = top.concat(bot.reverse());
    shade(p, horn, '#d8c8a0', 1, 3);
    for (const i of [6, 12, 17]) { const a = top[i], b = bot[bot.length - 1 - i]; p.line(a[0], a[1], b[0], b[1], 2.8); }
    const m = horn[n]; p.fill(ellipse(m[0] + 4, m[1] + 8, 8, 14, 10), '#2a1d10', 0.9);
    shade(p, [[-92, 22], [-82, 18], [-80, 28], [-92, 30]], WASH.gold);
    for (let i = 0; i < 3; i++) p.curve(ellipse(m[0] + 10, m[1] + 8, 12 + i * 11, 18 + i * 12, 8, -1.1, 1.1), 0.9);
  },
  warmap(g, p, rng) {
    const sheet = [[-104, -40], [100, -52], [106, 32], [-98, 38]];
    shade(p, sheet, WASH.parch, 1, 9);
    p.curve([[-92, -4], [-70, -26], [-48, -10], [-24, -30], [4, -12], [30, -26], [60, -8], [90, -18]], 1.5);
    p.curve([[-92, 18], [-60, 6], [-30, 20], [0, 8], [40, 24], [90, 14]], 1);
    for (const [x, y] of [[-70, -34], [-60, -30], [-52, -36], [34, -38], [44, -36]]) { p.line(x - 5, y + 4, x, y - 4, 1, 1); p.line(x, y - 4, x + 5, y + 4, 1, 1); }
    // armies as little blocks, and a bold arrow
    for (const [x, y, c] of [[-62, -4, WASH.red], [-50, 2, WASH.red], [-56, 10, WASH.red], [56, 12, WASH.blue], [68, 6, WASH.blue]]) shade(p, [[x - 6, y - 5], [x + 6, y - 5], [x + 6, y + 5], [x - 6, y + 5]], c, 1, 99);
    g.save(); g.strokeStyle = WASH.red; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-40, -4); g.bezierCurveTo(-10, -30, 10, -10, 40, 4); g.stroke(); g.restore();
    shade(p, [[48, 8], [32, 0], [38, 12]], WASH.red, 1, 99);
    p.line(-86, 34, -86, 10, 1.4); shade(p, [[-86, 10], [-70, 14], [-86, 20]], WASH.blue, 1, 99);
    // the goblet and the splash of wine
    shade(p, [[112, 10], [128, 10], [124, 24], [116, 24]], WASH.gold, 1, 3); p.line(120, 24, 120, 36, 1.6); p.line(112, 36, 128, 36, 1.6);
    p.fill(ellipse(-20, 30, 10, 3, 8), '#8a2a3a', 0.6);
    p.line(-130, 44, 130, 44, 1.4);
  },
};
