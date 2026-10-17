// Headless check that things agreed in conversation become real: spies/informants, naming an heir, plots against anyone.
//   node scripts/chat-grants-smoke.js
import { createWorld, player, livingCourt, heirOf } from '../shared/world.js';
import { endSeason } from '../shared/sim.js';
import { disposition, applyExchange } from '../shared/actions.js';
import { ig, watchesOf } from '../shared/intrigue.js';
import { findPerson } from '../shared/intrigueActions.js';

const bad = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) bad.push(what); };

const { state, map } = createWorld('chatgrants', { preset: 'world', settings: { entropy: 30 } });
const pl = player(state);
state.gold = 1000;
const court = livingCourt(state, state.playerRealm).filter(c => c.id !== pl.id && c.alive && c.court && !c.imprisoned);
check(court.length >= 3, 'court has people');

// find a courtier the dice allow, by scanning seeds (the fate is pre-rolled per audience)
function fateWith(c, key, val) {
  for (let i = 0; i < 80; i++) {
    const f = disposition(state, c, 'seed' + i);
    if (f.intrigue && f.intrigue[key] && (val === undefined || f.intrigue[key].will === val || f.intrigue[key] === val)) return f;
  }
  return null;
}
const aud = f => ({ id: 'a', delta: 0, used: {}, promises: 0, fate: f });

// 1. watch: a courtier agrees to report on another
const watcher = court.find(c => fateWith(c, 'watch', true));
const subject = court.find(c => c !== watcher);
check(!!watcher, 'someone is willing to watch');
if (watcher) {
  const f = fateWith(watcher, 'watch', true);
  const notes = applyExchange(state, watcher, aud(f), { opinion_delta: 1, line: 'I will watch.', granted: { type: 'watch', target: subject.name } }, map);
  check(notes.some(n => /will watch/.test(n)), 'watch note: ' + notes.join(' | '));
  check(watchesOf(state, state.playerRealm).length === 1, 'informant recorded');
  const bef = state.flags.igNew || 0;
  check(bef > 0, 'intrigue light lit');
  for (let i = 0; i < 6; i++) { endSeason(state, map); state.queue.length = 0; }
  console.log('   informant still active:', watchesOf(state, state.playerRealm).length, '| ledger watch entries:', ig(state).watch.length);
}

// 2. plot: a non-assassin-type courtier who WILL AGREE can now be asked, naming any person
const agent = court.find(c => fateWith(c, 'assassin', true));
check(!!agent, 'someone is willing to arrange a plot');
if (agent) {
  const target = court.find(c => c !== agent) || subject;
  const f = fateWith(agent, 'assassin', true);
  const before = state.gold, nSchemes = ig(state).schemes.length;
  const notes = applyExchange(state, agent, aud(f), { opinion_delta: 0, line: 'Consider it done.', granted: { type: 'plot', kind: 'smear', target: target.name } }, map);
  console.log('   notes:', notes.join(' | '));
  check(ig(state).schemes.length === nSchemes + 1 || notes.some(n => n.startsWith('✖')), 'a scheme exists or a reason is shown');
  check(state.gold <= before, 'gold spent when it started');
  // unknown name: a visible failure, not silence
  const f2 = fateWith(agent, 'assassin', true);
  const n2 = applyExchange(state, agent, aud(f2), { opinion_delta: 0, line: 'Done.', granted: { type: 'plot', kind: 'smear', target: 'Nobody Atall' } }, map);
  check(n2.some(n => n.startsWith('✖')), 'unknown target gives a visible failure: ' + n2.join(' | '));
}

// 3. heir
const heirs = (pl.children || []).map(id => state.chars[id]).filter(c => c && c.alive);
console.log('   children:', heirs.map(c => c.name).join(', ') || 'none');
check(findPerson(state, court[0].name) != null, 'findPerson resolves a courtier by name');
if (heirs.length) {
  const kid = heirs.find(k => { const cur = heirOf(state, pl); return !cur || cur.id !== k.id; });
  if (kid) {
    for (let y = 0; y < 60 && (state.year - kid.born) < 13; y++) { endSeason(state, map); state.queue.length = 0; }
    const f = disposition(state, kid, 'heirseed');
    if (f.intrigue.heir) {
      const notes = applyExchange(state, kid, aud(f), { opinion_delta: 2, line: 'I accept!', granted: { type: 'heir' } }, map);
      check(heirOf(state, pl) && heirOf(state, pl).id === kid.id, 'heir changed: ' + notes.join(' | '));
    } else console.log('   (child not eligible yet; skipped)');
  }
}

console.log(bad.length ? 'PROBLEMS: ' + bad.join('; ') : 'OK');
process.exit(bad.length ? 1 : 0);
