// Exercises every player-facing intrigue action headlessly: node scripts/intrigue-actions-smoke.js
import { createWorld, player, council, neighborsOfRealm, livingCourt, opinionOf, fullName, COUNCIL, heirOf } from '../shared/world.js';
import { endSeason } from '../shared/sim.js';
import { ACTIONS, disposition, audienceContext, applyExchange } from '../shared/actions.js';
import { ig, schemeById, secretById, addSecret, SCHEMES } from '../shared/intrigue.js';
import { agentsFor, claimsOfMine } from '../shared/intrigueActions.js';
import { eventView, resolveEvent } from '../shared/events.js';
import { claimsFor, holyBlock, pretendersAt } from '../shared/warplay.js';

const { state, map } = createWorld('actig', { preset: 'world', settings: { entropy: 60 } });
for (let i = 0; i < 6; i++) { endSeason(state, map); state.queue = []; }
state.gold = 900; state.audiences = 3;
const show = (n, r) => console.log(n.padEnd(16), r && r.ok ? 'ok ' : 'no ', r && r.msg);
let pl = player(state);
const mineNow = () => livingCourt(state, state.playerRealm).filter(c => c.id !== player(state).id);
let mine = mineNow();
console.log('court:', mine.map(c => `${c.name}(${c.role})`).join(', '));

// --- council
const cn = council(state);
const cand = mine.find(c => c.role === 'courtier') || null;
if (cand) show('appoint', ACTIONS.appoint(state, map, 'marshal', cand.id));
const foreign = Object.values(state.chars).find(c => c.alive && c.realm !== state.playerRealm && c.role === 'courtier' && !state.realms[c.realm].ruler === c.id);
if (foreign) show('invite', ACTIONS.appoint(state, map, 'steward', foreign.id));
console.log('council now:', Object.entries(council(state)).map(([r, c]) => `${r}:${c.name}`).join(' '));

// --- spies / sweeps / investigation
const nb = neighborsOfRealm(state, map, state.playerRealm)[0];
show('spy', ACTIONS.spy(state, map, nb));
show('spy again', ACTIONS.spy(state, map, nb));
show('sweep', ACTIONS.sweep(state, map));
const ruler = state.chars[state.realms[nb].ruler];
show('investigate', ACTIONS.investigate(state, map, ruler.id));

// --- plotting
const victim = ruler;
const agents = agentsFor(state, 'murder', victim);
console.log('agents for murder:', agents.map(a => `${a.c.name}:${a.why}`).join(', '));
show('plot murder', ACTIONS.plot(state, map, 'murder', victim.id, null));
show('plot smear', ACTIONS.plot(state, map, 'smear', victim.id, null));
const myPlots = ig(state).schemes.filter(s => s.by === state.playerRealm && s.status === 'active');
console.log('my plots:', myPlots.map(s => `${s.kind}->${state.chars[s.target].name}`).join(', '));
if (myPlots[0]) {
  show('fund', ACTIONS.fund(state, map, myPlots[0].id, 80));
  const helper = mine.find(c => c.id !== myPlots[0].owner);
  if (helper) show('recruit', ACTIONS.recruit(state, map, myPlots[0].id, helper.id));
  show('abandon', ACTIONS.abandon(state, map, myPlots[0].id));
}
// local scheme against someone in court, via the spymaster
const sp = council(state).spymaster, local = mine.find(c => c.role === 'courtier' && c.id !== (sp && sp.id));
if (local && sp) { show('plot via spy', ACTIONS.plot(state, map, 'smear', local.id, sp.id)); }
for (let i = 0; i < 12; i++) { endSeason(state, map); for (const q of state.queue.slice()) { const v = eventView(state, map, q); const o = v ? v.options.filter(x => !x.talk && !x.disabled && !x.reply) : []; resolveEvent(state, map, q, o.length ? o[0].key : '__drop'); state.queue = state.queue.filter(x => x !== q); } }
console.log('after 12 seasons: schemes', ig(state).schemes.map(s => `${s.kind}:${s.status}`).join(' '), '| secrets known:', ig(state).secrets.filter(s => s.seen.includes(state.playerRealm) || s.pub).length);

pl = player(state); mine = mineNow();
// --- gossip, exposure, blackmail on a seeded secret
const gossiper = mine.find(c => c.role === 'priest' || c.role === 'jester' || c.role === 'spymaster') || mine[0];
const sec = addSecret(state, { kind: 'deed', sin: 'embezzle', about: [(local && local.alive ? local : mine[1]).id, pl.id], text: `${local ? local.name : mine[1].name} has been robbing the treasury`, sev: 2, known: [gossiper.id] });
state.flags['gos' + gossiper.id] = undefined; sec.seen.push(state.playerRealm);
gossiper.mods.push({ key: 'x', label: 'Fond', value: 60, left: 10 });
show('gossip', ACTIONS.gossip(state, map, gossiper.id));
show('blackmail', ACTIONS.blackmail(state, map, sec.id));
show('expose', ACTIONS.expose(state, map, sec.id));
const lie = addSecret(state, { kind: 'rumour', about: [mine[0].id], text: `${mine[0].name} eats babies`, claim: 'eats babies', truth: false, known: [] });
lie.seen.push(state.playerRealm);
show('verify', ACTIONS.verify(state, map, lie.id));
show('expose lie', ACTIONS.expose(state, map, lie.id));

// --- family
const kids = (pl.children || []).map(id => state.chars[id]).filter(k => k && k.alive);
console.log('kids:', kids.map(k => `${k.name}(${k.role},${k.born})`).join(', '));
if (kids[1]) show('name heir', ACTIONS.heir(state, map, kids[kids.length - 1].id));
console.log('heir now:', heirOf(state, pl) && heirOf(state, pl).name);
show('guard', ACTIONS.guard(state, map, pl.id));
show('atone (none)', ACTIONS.atone(state));
pl.marks = [{ k: 'kinslaying', y: state.year }];
show('atone', ACTIONS.atone(state));

// --- wars with a reason
const tgt = neighborsOfRealm(state, map, state.playerRealm).find(n => !holyBlock(state, map, state.playerRealm, n));
console.log('holy-able neighbour:', tgt != null ? state.realms[tgt].name : 'none');
if (tgt != null) show('holy war', ACTIONS.holyWar(state, map, tgt));
show('claim war (none)', ACTIONS.claimWar(state, map, nb));

// --- audience hooks
const talker = mine.find(c => c.role === 'courtier') || mine[0];
const f = disposition(state, talker, 'seed1');
console.log('fate lines:', f.fate.length, '| intrigue data:', JSON.stringify(f.intrigue || null).slice(0, 220));
const ctx = audienceContext(state, map, talker);
console.log('ctx infamy:', JSON.stringify(ctx.ruler.infamy), JSON.stringify(ctx.char.infamy));
const aud = { id: 'a', delta: 0, used: {}, promises: 0, fate: f };
if (f.intrigue && f.intrigue.council) console.log('council grant:', applyExchange(state, talker, aud, { opinion_delta: 1, granted: { type: 'council', role: 'chancellor' }, line: 'Very well.' }));
console.log('claims', claimsOfMine(state).length, claimsFor(state, state.playerRealm).length, pretendersAt(state, state.playerRealm).length);
console.log('OK');
