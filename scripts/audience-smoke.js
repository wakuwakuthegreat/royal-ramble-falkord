// End-to-end: play a few seasons, send the outbox to the graph, talk to a character twice and check the
// second audience recalls the first (with the graph path that surfaced it). Needs the server + FalkorDB + a Groq key.
//   PORT=8787 node server/index.js   then   BASE=http://localhost:8787 node scripts/audience-smoke.js
import { createWorld, player } from '../shared/world.js';
import { endSeason } from '../shared/sim.js';
import { canTalk, audienceContext, disposition } from '../shared/actions.js';

const BASE = process.env.BASE || 'http://localhost:8787';
const pid = 'smoke-' + Date.now().toString(36);
const post = async (url, body) => {
  const r = await fetch(BASE + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid, ...body }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${url}: ${j.error}`);
  return j;
};

const { state, map } = createWorld('smoke', { preset: 'world' });
for (let t = 0; t < 6 && !state.gameOver; t++) { endSeason(state, map); state.queue.length = 0; }
const chars = Object.values(state.chars).filter(c => c.alive && c.house && canTalk(state, c));
const target = chars.find(c => state.outbox.some(o => (o.people || []).some(p => p.name === c.name))) || chars[0];
console.log('outbox', state.outbox.length, 'entries; talking to', target.name, 'of House', target.house);
console.log(await post('/api/memory', { entries: state.outbox }));

const talk = async (say) => {
  const ctx = audienceContext(state, map, target);
  const start = await post('/api/audience/start', { ctx, fate: disposition(state, target, 'smoke:' + say), reason: 'smoke test' });
  console.log('\nremembers:', start.memories.map(m => `\n  - ${m.text.slice(0, 90)}\n      ↳ ${m.why}`).join('') || ' nothing');
  console.log(`${target.name}: ${start.reply.line}`);
  const r = await post('/api/audience/say', { id: start.id, message: say });
  console.log(`${target.name}: ${r.reply.line}`);
  const end = await post('/api/audience/end', { id: start.id });
  console.log('notes:', end.notes);
  return start;
};

await talk('I promise to send you 80 gold by the next winter, my friend.');
await new Promise(r => setTimeout(r, 1500));
const second = await talk('About that gold I promised you...');
const ok = second.memories.some(m => /80 gold|gold/i.test(m.text) && m.why);
console.log(ok ? '\nOK: the second audience recalled the first through the graph' : '\nFAIL: promise not recalled');
const g = await (await fetch(`${BASE}/api/memory/graph?pid=${pid}`)).json();
console.log(JSON.stringify(g));
process.exit(ok ? 0 : 1);
