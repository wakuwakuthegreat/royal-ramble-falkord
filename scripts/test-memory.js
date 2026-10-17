// Smoke test for the FalkorDB memory graph: write a few deeds, then recall them through each hop.
// Needs FalkorDB running (docker compose up falkordb). Uses throwaway graphs and deletes them afterwards.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { rememberMany, flush, recallCharacter, recallStirred, recallWorld, houseLink, graphSummary } from '../server/memory/index.js';
import { connect } from '../server/memory/connection.js';

const ns = 'rr-test-' + Date.now(), world = ns + '-world';
const ruler = { name: 'Ysolde Wolfe', house: 'Wolfe' };
const bob = { name: 'Bobo', house: 'Stag', title: 'Chancellor' }, ann = { name: 'Anselm', house: 'Stag', title: 'Cousin' };
const dag = { name: 'Dagny', house: 'Raven', title: 'Duchess' }, ode = { name: 'Odo', house: 'Moth', title: 'Baron' };
const e = (text, kind, people) => ({ ns, text, kind, date: 'Spring 1100', campaign: 1, people, ruler });

await rememberMany([
  e('Ysolde promised Bobo 50 gold by winter.', 'promise', [bob]),
  e('Ysolde insulted Anselm at the feast.', 'insult', [ann]),
  e('Ysolde and Dagny signed an alliance against the Stags.', 'diplomacy', [dag, bob]),
  e('Dagny sent a gift of wine to Odo.', 'gift', [dag, ode]),
  { ns: world, text: '[Tales from afar] A queen gave away her crown for a wheel of cheese.', kind: 'cheese' },
]);
await flush();

const direct = await recallCharacter(ns, bob, ruler);
console.log(direct.map(m => `${m.hop.padEnd(8)} ${m.text}\n         ↳ ${m.why}`).join('\n'));
assert(direct.some(m => m.hop === 'direct' && /50 gold/.test(m.text)), 'direct memory about Bobo');
assert(direct.some(m => m.hop === 'house' && /Anselm/.test(m.text)), 'a kinsman’s memory reaches Bobo through House Stag');

const stirred = await recallStirred(ns, bob, 'Did you forget the gold you promised?');
assert(stirred.some(m => /50 gold/.test(m.text)), 'full-text stir');

const link = await houseLink(ns, 'Moth', 'Stag');
console.log('house link Moth → Stag:', link && link.houses.join(' → '));
assert(link && link.hops === 2, 'Moth–Raven–Stag chain');

const tales = await recallWorld(world, 'queen crown cheese');
assert(tales.length === 1, 'world tale');
console.log(await graphSummary(ns));

const db = await connect();
for (const g of [ns, world]) await db.selectGraph(g).delete();
await db.close();
console.log('memory graph OK');
process.exit(0);
