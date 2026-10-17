// Headless run of the intrigue layer: many seasons across several worlds, counting what the drives produce.
//   node scripts/intrigue-smoke.js [worlds] [seasons]
import { createWorld, player, fullName, SINS } from '../shared/world.js';
import { endSeason } from '../shared/sim.js';
import { eventView, resolveEvent } from '../shared/events.js';
import { ig, SCHEMES } from '../shared/intrigue.js';
import { RNG } from '../shared/rng.js';

const worlds = +process.argv[2] || 6, seasons = +process.argv[3] || 80;
const tally = { wars: {}, joined: 0, splits: 0, started: {}, status: {}, events: {}, sins: {}, secrets: {}, pub: 0, deaths: {}, coups: 0, spies: 0, bastards: 0, exiles: 0, bad: [] };
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
for (let w = 0; w < worlds; w++) {
  const { state, map } = createWorld('ig' + w, { preset: ['world', 'europe', 'nigeria'][w % 3], settings: { entropy: 50 } });
  const r = new RNG('pick' + w);
  const seen = new Set();
  for (let t = 0; t < seasons && !state.gameOver; t++) {
    try { endSeason(state, map); } catch (e) { tally.bad.push(`world ${w} turn ${t}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); break; }
    let n = 0;
    while (state.queue.length && n++ < 12) {
      const item = state.queue[0];
      bump(tally.events, item.id);
      let v;
      try { v = eventView(state, map, item); } catch (e) { tally.bad.push(`view ${item.id}: ${e.message}`); state.queue.shift(); continue; }
      if (!v) { state.queue.shift(); continue; }
      const opts = v.options.filter(o => !o.talk && !o.disabled && !o.reply);
      try { resolveEvent(state, map, item, opts.length ? r.pick(opts).key : '__drop'); } catch (e) { tally.bad.push(`resolve ${item.id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); state.queue = state.queue.filter(q => q !== item); }
    }
    for (const s of ig(state).schemes) if (!seen.has(s.id)) { seen.add(s.id); bump(tally.started, s.kind); }
    for (const w of state.wars) if (!seen.has(w.id)) { seen.add(w.id); bump(tally.wars, w.cb || w.why); tally.joined += (w.joiners ? w.joiners.a.length + w.joiners.d.length : 0); }
  }
  for (const s of ig(state).schemes) bump(tally.status, s.kind + ':' + s.status);
  for (const c of Object.values(state.chars)) {
    for (const m of c.marks || []) bump(tally.sins, m.k);
    if (!c.alive && /execution|poison|fever|tower|mushroom|hunting|knife|coup/.test(c.cause || '')) bump(tally.deaths, c.cause);
    if (c.bastard) tally.bastards++;
    if (c.exiled) tally.exiles++;
  }
  for (const sec of ig(state).secrets) { bump(tally.secrets, sec.kind + (sec.pub ? ':pub' : '')); }
  tally.spies += ig(state).spies.length;
  tally.splits += state.realms.filter(r => r.rebelOf != null).length;
  console.log(`world ${w}: ${state.year} chars ${Object.keys(state.chars).length} schemes ${ig(state).schemes.length} secrets ${ig(state).secrets.length} KB ${Math.round(JSON.stringify(state).length / 1024)} chron ${state.chronicle.length}`);
}
console.log(JSON.stringify(tally, null, 1));
