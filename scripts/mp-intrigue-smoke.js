// Two players in one world: intrigue must run for both, per-player knowledge must not leak, and nothing may throw.
import { createWorld, joinRealm, withPlayer, player, fullName, provincesOf, neighborsOfRealm, livingCourt } from '../shared/world.js';
import { endSeason } from '../shared/sim.js';
import { eventView } from '../shared/events.js';
import { ACTIONS } from '../shared/actions.js';
import { ig, igFor } from '../shared/intrigue.js';
import { RNG } from '../shared/rng.js';

const { state, map } = createWorld('mpig', { preset: 'world', noPlayer: true, settings: { entropy: 70 } });
const r = new RNG(11);
const realms = state.realms.filter(x => x.alive).sort((a, b) => provincesOf(state, b.id).length - provincesOf(state, a.id).length);
const A = realms[2].id, B = neighborsOfRealm(state, map, A)[0];
joinRealm(state, 'alice', A, 'Alice');
joinRealm(state, 'bob', B, 'Bob');
const bad = [];
const act = (pid, name, ...args) => withPlayer(state, pid, () => { try { return ACTIONS[name](state, map, ...args); } catch (e) { bad.push(`${pid} ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); return null; } });
withPlayer(state, 'alice', () => { state.gold = 500; });
withPlayer(state, 'bob', () => { state.gold = 500; });

for (let t = 0; t < 70; t++) {
  try { endSeason(state, map); } catch (e) { bad.push(`season ${t}: ${e.stack.split('\n').slice(0, 5).join(' | ')}`); break; }
  for (const pid of ['alice', 'bob']) {
    withPlayer(state, pid, () => {
      let n = 0;
      while (state.queue.length && n++ < 8) {
        const item = state.queue[0];
        let v = null;
        try { v = eventView(state, map, item); } catch (e) { bad.push(`view ${item.id}: ${e.message}`); }
        const opts = v ? v.options.filter(o => !o.talk && !o.disabled && !o.reply) : [];
        try { ACTIONS.resolve(state, map, item.uid, opts.length ? r.pick(opts).key : '__drop'); } catch (e) { bad.push(`resolve ${item.id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); state.queue = state.queue.filter(q => q !== item); }
      }
      state.gold = Math.max(state.gold, 300);
    });
    if (t % 4 === 1) {
      const other = pid === 'alice' ? B : A;
      act(pid, 'spy', pid === 'alice' ? B : A);
      act(pid, 'sweep');
      const court = withPlayer(state, pid, () => livingCourt(state, state.playerRealm).filter(c => c.id !== player(state).id && c.role === 'courtier'));
      if (court[0]) act(pid, 'investigate', court[0].id);
      void other;
    }
  }
  // what each client would be sent: no foreign plots, no unseen secrets
  for (const [pid, realm] of [['alice', A], ['bob', B]]) {
    const v = withPlayer(state, pid, () => igFor(state, state.playerRealm));
    for (const s of v.secrets) if (!s.pub && !s.seen.includes(realm)) bad.push(`leak: ${pid} sees unseen secret ${s.id}`);
    for (const s of v.schemes) if (s.by !== realm && !s.seen.includes(realm)) bad.push(`leak: ${pid} sees unknown scheme ${s.id}`);
    for (const sp of v.spies) if (sp.owner !== realm && !(sp.in === realm && sp.found)) bad.push(`leak: ${pid} sees a spy`);
  }
}
for (const pid of ['alice', 'bob']) withPlayer(state, pid, () => console.log(pid, state.year, fullName(state, player(state)), 'gold', state.gold, 'chron', state.chronicle.length, 'gameOver', !!state.gameOver));
console.log('schemes', ig(state).schemes.length, 'secrets', ig(state).secrets.length, 'spies', ig(state).spies.length, 'realms', state.realms.length, 'KB', Math.round(JSON.stringify(state).length / 1024));
console.log(bad.length ? 'PROBLEMS:\n' + bad.join('\n') : 'no problems');
