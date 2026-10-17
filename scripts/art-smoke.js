// Headless check of the event art: draws every motif and scene against a recording stub of the canvas
// context, so a typo, bad coordinate (NaN) or missing helper shows up without opening a browser.
//   node scripts/art-smoke.js
const calls = { n: 0, nan: 0 };
const mkCtx = () => new Proxy({}, {
  get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
    return (...a) => { calls.n++; if (a.some(v => typeof v === 'number' && !Number.isFinite(v))) calls.nan++; };
  },
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document = { createElement: () => ({ getContext: () => mkCtx(), width: 0, height: 0 }) };
const { eventArt, spotArt, sceneOf } = await import('../src/ui/eventArt.js');
const { MOTIFS2 } = await import('../src/ui/artMotifs.js');

const ids = ['horses', 'cheese', 'raise', 'marshal_war', 'birthday', 'heir_gamble', 'envoy', 'bridge', 'egg', 'egg_hatch', 'tithe', 'jester', 'insult_letter', 'treasure', 'plot', 'harvest', 'birth', 'succession', 'war_declared', 'alliance_offer', 'battle', 'promise_due', 'audience_request', 'bankrupt', 'letter', 'envoy_spoke', 'aud_after', 'npc_gift', 'tribute_demand', 'call_to_arms', 'omen', 'unrest', 'festival', 'court_news', 'ig_notice', 'plot_found', 'coup_strike', 'blackmail', 'spy_found', 'poach', 'exile_refuge', 'revolt', 'affair_found', 'nonsense'];
const variants = [
  ...['comet', 'bumper', 'rainbow', 'lightning', 'raven', 'eclipse'].map(omen => ['omen', { omen }]),
  ...['wedding', 'romance', 'feud', 'duel', 'ill', 'talent', 'scandal', 'friends'].map(kind => ['court_news', { kind }]),
  ...['murder', 'coup', 'smear', 'seduce', 'embezzle', 'forge'].map(scheme => ['plot_found', { scheme }]),
  ['aud_after', { mood: 'sour' }], ['ig_notice', { title: 'Your Plot Is Uncovered' }], ['ig_notice', { title: 'A Note Under the Door' }],
  ...['cheese', 'tea', 'pot'].map(food => ['cheese', { food }]),
];
const used = new Set();
let drawn = 0;
for (const [id, x] of [...ids.map(i => [i, {}]), ...variants]) {
  for (const season of [0, 1, 2, 3, undefined]) for (const seed of ['a', 'b', 'c']) { eventArt(id, seed, { ...x, season }); drawn++; }
  used.add(sceneOf(id, x)[0]);
}
for (const m of Object.keys(MOTIFS2)) { spotArt(m, 44); if (!used.has(m)) console.log('motif never used by an event:', m); }
console.log(`drew ${drawn} scenes, ${Object.keys(MOTIFS2).length} new motifs, ${calls.n} canvas calls, ${calls.nan} non-finite args`);
if (calls.nan) process.exit(1);
