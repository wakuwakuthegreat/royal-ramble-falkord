// The bigger story of war: why a war is fought (conquest, holy war, a claim real or forged, putting an exile back on
// his throne, answering an outrage), who gets pulled in (allies on both sides: a "grand war"), and how realms rise
// and fall (revolts that split a realm in two, rebels who win a throne of their own).
import { RNG, clamp } from './rng.js';
import {
  player, playerRealm, provincesOf, record, addMod, fullName, opinionOf, neighborsOfRealm, atWar, allied, isHumanRealm, forHuman,
  faithOf, FAITHS, REALM_COLORS, refreshRoles, livingCourt, chaosMult, ageOf, makeChar, heirOf, regard,
} from './world.js';
import { realmKindFor, preset } from './cultures.js';
import { declareWar, kill } from './sim.js';
import { queueEvent } from './events.js';
import { ig, news, stain, isKin, exile, closeTo } from './intrigue.js';

const has = (c, t) => !!c && c.traits.includes(t);

// ---------------------------------------------------------------- why wars are fought
export const CB = {
  conquest: { label: 'Conquest', icon: '⚔', desc: 'Land, plain and simple.' },
  holy: { label: 'Holy war', icon: '☩', desc: 'A war of faith. The pious cheer, and co-believers may rally to the banner.' },
  claim: { label: 'A claim', icon: '👑', desc: 'A rightful claim to their land: the war wins more ground.' },
  forged: { label: 'A forged claim', icon: '📜', desc: 'Papers that look real enough. If someone checks the ink, the shame is yours.' },
  restoration: { label: 'Restoration', icon: '🚪', desc: 'Put an exiled ruler back on their throne.' },
  outrage: { label: 'An outrage avenged', icon: '🗡', desc: 'They plotted against us. The world understands.' },
  revolt: { label: 'A revolt', icon: '🔥', desc: 'Rebels against their ruler.' },
  cheese: { label: 'A grievance', icon: '🧀', desc: '' },
  ally: { label: 'A call to arms', icon: '📯', desc: '' },
};
export const cbLabel = w => (CB[w.cb || w.why] || CB.conquest).label;

export function faithName(state, realmId) { const f = FAITHS[faithOf(state, state.realms[realmId])]; return f ? f.label : 'the old ways'; }
export const sameFaith = (state, a, b) => faithOf(state, state.realms[a]) === faithOf(state, state.realms[b]);

/** Why you cannot declare a holy war on this realm now, or null. */
export function holyBlock(state, map, attacker, defender) {
  if (attacker === defender) return 'Not on yourself.';
  if (sameFaith(state, attacker, defender)) return `They follow ${faithName(state, defender)}, as you do.`;
  if (atWar(state, attacker, defender)) return 'Already at war.';
  if (allied(state, attacker, defender)) return 'They are your ally.';
  if (map && !neighborsOfRealm(state, map, attacker).includes(defender)) return 'Only neighbours can be fought for the faith.';
  const last = state.realms[attacker].holyAt;
  if (last != null && state.turn - last < 14) return 'The faithful are weary of crusades. Wait a little.';
  return null;
}

/** The claims a realm holds that it could press: [{claim, why}]. */
export function claimsFor(state, realmId) {
  const out = [];
  for (const c of ig(state).claims) if (c.by === realmId && c.until > state.turn && state.realms[c.over] && state.realms[c.over].alive) out.push({ ...c, label: c.kind === 'forged' ? CB.forged.label : c.kind === 'outrage' ? CB.outrage.label : CB.claim.label });
  return out;
}

/** The exiles at a realm's court who have a claim on another throne. */
export function pretendersAt(state, realmId) {
  return Object.values(state.chars).filter(c => c.alive && c.realm === realmId && c.claims && c.claims.some(r => state.realms[r] && state.realms[r].alive && r !== realmId && state.realms[r].ruler !== c.id));
}

/** Declare a war with a stated reason. Returns the war, or null. */
export function declareWithCause(state, map, attacker, defender, cb, extra = {}) {
  const war = declareWar(state, map, attacker, defender, cb, extra);
  return war;
}

// ---------------------------------------------------------------- grand wars: allies are pulled in
export function joinAllies(state, map, war) {
  const rng = new RNG(`join:${state.seed}:${war.id}`);
  war.joiners = war.joiners || { a: [], d: [] };
  const A = war.attacker, D = war.defender;
  for (const [leader, side] of [[A, 'a'], [D, 'd']]) {
    const foe = side === 'a' ? D : A;
    const cands = new Map();
    for (const pair of state.alliances) if (pair.includes(leader)) cands.set(pair[0] === leader ? pair[1] : pair[0], 'ally');
    // co-believers rally to a holy war on the attacker's side
    if (war.cb === 'holy' && side === 'a') for (const r of state.realms) if (r.alive && r.id !== A && r.id !== D && sameFaith(state, A, r.id) && !cands.has(r.id) && map && neighborsOfRealm(state, map, D).includes(r.id)) cands.set(r.id, 'faith');
    for (const [id, why] of cands) {
      const R = state.realms[id];
      if (!R || !R.alive || id === foe || allied(state, id, foe) || atWar(state, id, leader)) continue;
      if (isHumanRealm(state, id)) continue; // a human decides for themselves (they get a call to arms)
      const ruler = state.chars[R.ruler];
      const busy = state.wars.some(w => w !== war && (w.attacker === id || w.defender === id)) ? 0.7 : 1;
      const p = clamp((why === 'faith' ? 0.3 : 0.55) + R.aggression * 0.12 + (has(ruler, 'brave') ? 0.1 : 0) - (has(ruler, 'craven') ? 0.2 : 0) + (opinionOf(state, ruler).total > 20 && foe === state.playerRealm ? -0.1 : 0), 0.1, 0.9) * busy;
      if (!rng.chance(p)) continue;
      war.joiners[side].push(id);
      const L = state.realms[leader], F = state.realms[foe];
      const text = why === 'faith' ? `${R.name} rallies to the holy war of ${L.name} against ${F.name}.` : `${R.name} honours its alliance and joins ${L.name} against ${F.name}.`;
      news(state, { kind: 'war', icon: '📯', text, ids: [R.ruler], realms: [id, leader, foe], major: true, note: false });
      for (const rid of [leader, foe]) forHuman(state, rid, () => { record(state, text, { kind: 'war', chars: [R.ruler] }); (state.flags.lastTurnEvents || (state.flags.lastTurnEvents = [])).push({ icon: '📯', text }); });
    }
  }
}

/** Fighting strength of the allies on one side ('a' attacker, 'd' defender). */
export function joinPower(state, war, side) {
  return ((war.joiners && war.joiners[side]) || []).reduce((a, id) => a + (state.realms[id] && state.realms[id].alive ? state.realms[id].levies * 0.45 : 0), 0);
}
export const joinersOf = (state, war, side) => ((war.joiners && war.joiners[side]) || []).map(id => state.realms[id]).filter(r => r && r.alive);

/** Allies bleed a little in every battle too. */
export function bleedJoiners(state, war, winnerSide, rng) {
  for (const side of ['a', 'd']) for (const r of joinersOf(state, war, side)) r.levies = Math.max(20, Math.round(r.levies * (side === winnerSide ? rng.range(0.97, 0.99) : rng.range(0.9, 0.96))));
}

// ---------------------------------------------------------------- how wars end, beyond taking a province
/** A war is won by the attacker. Returns extra text. */
export function warWon(state, map, war) {
  const A = state.realms[war.attacker], D = state.realms[war.defender];
  let text = '';
  if (war.claimant && state.chars[war.claimant] && state.chars[war.claimant].alive) {
    const c = state.chars[war.claimant];
    state.owner[war.target] = war.defender; // restoration takes no land: the claimant takes the throne
    const old = state.chars[D.ruler];
    c.realm = D.id; c.court = false; c.role = 'ruler'; c.claims = (c.claims || []).filter(r => r !== D.id); c.exiled = null;
    if (old && old.id !== c.id) { old.role = 'courtier'; if (old.alive && !old.imprisoned) { old.imprisoned = true; } }
    D.ruler = c.id; D.house = c.house || D.house;
    if (c.spouse && state.chars[c.spouse] && state.chars[c.spouse].alive) { state.chars[c.spouse].realm = D.id; state.chars[c.spouse].role = 'spouse'; }
    refreshRoles(state);
    // the new ruler owes everything to their patron
    state.alliances.push([A.id, D.id]);
    text = ` ${c.name} is restored to the throne of ${D.name} and swears friendship with ${A.name}.`;
    for (const rid of [A.id, D.id]) forHuman(state, rid, () => record(state, text.trim(), { kind: 'reign', chars: [c.id] }));
  } else if ((war.cb === 'claim' || war.cb === 'forged') && A) {
    // a rightful (or well-forged) claim covers a second province next door
    const extra = provincesOf(state, D.id).filter(p => p !== war.target && map.provinces[p].neighbors.some(q => state.owner[q] === A.id || q === war.target)).sort((a, b) => 0)[0];
    if (extra != null && provincesOf(state, D.id).length > 1) {
      state.owner[extra] = A.id;
      text = ` The claim also carries ${map.provinces[extra].name}.`;
    }
  }
  if (war.cb === 'holy') {
    forHuman(state, A.id, () => { state.prestige += 12; for (const c of livingCourt(state, A.id)) if (has(c, 'pious')) addMod(c, 'Won the holy war', 12, 16, 'holywin'); });
    text += ` The faithful of ${A.name} give thanks.`;
  }
  return text;
}

/** Called as a war begins with a forged claim: someone may look closely at the papers. */
export function checkForgery(state, war, rng) {
  if (war.cb !== 'forged') return null;
  const claim = ig(state).claims.find(c => c.by === war.attacker && c.over === war.defender && c.forged);
  if (claim) claim.until = 0;
  const spy = Object.values(state.chars).find(c => c.alive && c.court && c.realm === war.defender && c.role === 'spymaster' && !c.imprisoned);
  const p = 0.25 + (spy ? spy.stats.int * 0.02 : 0.05);
  if (!rng.chance(clamp(p, 0.1, 0.7))) return null;
  war.exposed = true; war.score = clamp(war.score - 30, -100, 100);
  const author = claim && state.chars[claim.author];
  const ruler = state.chars[state.realms[war.attacker].ruler];
  stain(state, author && author.alive ? author : ruler, 'forgery', state.chars[state.realms[war.defender].ruler]);
  if (author && author.id !== ruler.id) stain(state, ruler, 'forgery', state.chars[state.realms[war.defender].ruler]);
  const text = `The "ancient claim" of ${state.realms[war.attacker].name} on ${state.realms[war.defender].name} was exposed as a forgery. The ink was still wet.`;
  news(state, { kind: 'scandal', icon: '📜', text, ids: [ruler.id], realms: [war.attacker, war.defender], major: true });
  for (const rid of [war.attacker, war.defender]) forHuman(state, rid, () => { record(state, text, { kind: 'scandal', chars: [ruler.id] }); (state.flags.lastTurnEvents || (state.flags.lastTurnEvents = [])).push({ icon: '📜', text }); });
  return text;
}

// ---------------------------------------------------------------- NPC realms choose their own reasons
/** The best reason a ruler has to attack `t`, and any claimant. */
export function cbFor(state, map, attackerId, defenderId, rng) {
  const A = state.realms[attackerId], ruler = state.chars[A.ruler];
  const claims = claimsFor(state, attackerId).filter(c => c.over === defenderId);
  if (claims.length) { const c = claims[0]; return { cb: c.kind === 'forged' ? 'forged' : c.kind === 'outrage' ? 'outrage' : 'claim' }; }
  const exile = pretendersAt(state, attackerId).find(c => c.claims.includes(defenderId));
  if (exile) return { cb: 'restoration', claimant: exile.id };
  if (!sameFaith(state, attackerId, defenderId) && (has(ruler, 'pious') || A.aggression > 1.0) && rng.chance(0.5) && !holyBlock(state, map, attackerId, defenderId)) return { cb: 'holy' };
  return { cb: 'conquest' };
}

/** NPC realms that hold a claim or shelter an exile press them. Wars on a human are rolled in that human's own phase. */
export function warMotives(state, map, rng, forHumanRealm) {
  const ch = chaosMult(state);
  for (const R of state.realms) {
    if (!R.alive || isHumanRealm(state, R.id)) continue;
    if (state.wars.some(w => w.attacker === R.id || w.defender === R.id)) continue;
    const ns = neighborsOfRealm(state, map, R.id).filter(n => !allied(state, n, R.id));
    if (!ns.length) continue;
    const ruler = state.chars[R.ruler];
    const claims = claimsFor(state, R.id).filter(c => ns.includes(c.over));
    const exiles = pretendersAt(state, R.id).filter(c => c.claims.some(r => ns.includes(r)));
    const holy = ns.filter(n => !sameFaith(state, R.id, n) && !holyBlock(state, map, R.id, n)).filter(n => has(ruler, 'pious') || R.aggression > 1.3);
    const humanTarget = id => isHumanRealm(state, id);
    // pick one candidate reason
    const opts = [];
    for (const c of claims) opts.push([{ cb: c.kind === 'forged' ? 'forged' : c.kind === 'outrage' ? 'outrage' : 'claim', over: c.over }, 1.2]);
    for (const e of exiles) for (const r of e.claims.filter(r => ns.includes(r))) opts.push([{ cb: 'restoration', claimant: e.id, over: r }, 1.0]);
    for (const n of holy) opts.push([{ cb: 'holy', over: n }, 0.22]);
    if (!opts.length) continue;
    const pick = rng.weighted(opts);
    if (humanTarget(pick.over) !== (forHumanRealm != null)) continue; // each phase rolls its own targets
    if (forHumanRealm != null && pick.over !== forHumanRealm) continue;
    const weight = opts.reduce((a, o) => a + o[1], 0);
    if (!rng.chance(0.045 * R.aggression * ch * Math.min(1, weight))) continue;
    const w = declareWar(state, map, R.id, pick.over, pick.cb, { claimant: pick.claimant || null });
    if (!w) continue;
    if (pick.cb === 'holy') R.holyAt = state.turn;
    state.flags.mapDirty = true;
    if (pick.cb === 'forged') checkForgery(state, w, rng);
    const text = `${R.name} declared war on ${state.realms[pick.over].name} (${(CB[pick.cb] || CB.conquest).label.toLowerCase()}).`;
    news(state, { kind: 'war', icon: '⚔', text, ids: [R.ruler], realms: [R.id, pick.over], major: true, note: false });
    if (humanTarget(pick.over)) {
      record(state, `${fullName(state, ruler)} of ${R.name} declared war on us: ${(CB[pick.cb] || CB.conquest).label.toLowerCase()}.`, { kind: 'war', chars: [ruler.id] });
      queueEvent(state, 'war_declared', { a: ruler.id, realm: R.id, war: w.id });
    }
  }
}

// ---------------------------------------------------------------- rises and falls
function farthestFrom(map, provs, from) {
  const [cx, cy] = map.provinces[from].center;
  return provs.slice().sort((a, b) => Math.hypot(map.provinces[b].center[0] - cx, map.provinces[b].center[1] - cy) - Math.hypot(map.provinces[a].center[0] - cx, map.provinces[a].center[1] - cy));
}

/** A new realm is born from the old: the rebels take a region far from the capital, with a leader at their head. */
export function splitRealm(state, map, R, leader, share = 0.35) {
  const provs = provincesOf(state, R.id);
  if (provs.length < 4 || !leader || !leader.alive) return null;
  const want = Math.max(1, Math.min(provs.length - 2, Math.round(provs.length * share)));
  const far = farthestFrom(map, provs.filter(p => p !== R.capital), R.capital);
  const seed = far[0];
  // grow the rebel region outward from its seed, through the old realm's own provinces
  const take = [seed], seen = new Set(take);
  for (let i = 0; i < take.length && take.length < want; i++) for (const q of map.provinces[take[i]].neighbors) if (state.owner[q] === R.id && q !== R.capital && !seen.has(q) && take.length < want) { seen.add(q); take.push(q); }
  const id = state.realms.length;
  const rng = new RNG(`split:${state.seed}:${state.turn}:${R.id}`);
  const nr = {
    id, name: map.provinces[seed].name, kind: realmKindFor(R.heritage, take.length, !!preset(state.preset).silly, rng), color: REALM_COLORS[(id + 5) % REALM_COLORS.length], heritage: R.heritage, capital: seed,
    house: leader.house || R.house, ruler: leader.id, levies: Math.round(R.levies * share), aggression: clamp(R.aggression * rng.range(0.8, 1.3), 0.4, 1.8), alive: true, faith: faithOf(state, R), rebelOf: R.id, born: state.year,
  };
  state.realms.push(nr);
  for (const p of take) state.owner[p] = id;
  R.levies = Math.max(60, Math.round(R.levies * (1 - share)));
  const move = c => { c.realm = id; c.court = false; c.role = c.id === leader.id ? 'ruler' : (c.role === 'spouse' ? 'spouse' : 'courtier'); c.imprisoned = false; };
  move(leader); leader.claims = (leader.claims || []).filter(r => r !== id);
  if (leader.spouse && state.chars[leader.spouse] && state.chars[leader.spouse].alive) { move(state.chars[leader.spouse]); state.chars[leader.spouse].role = 'spouse'; }
  for (const kid of leader.children || []) { const k = state.chars[kid]; if (k && k.alive && k.realm === R.id) { k.realm = id; k.court = false; } }
  refreshRoles(state);
  state.flags.mapDirty = true;
  return nr;
}

/** Who might lead a revolt in this realm: an ambitious kinsman, a claimant at court, or a noble nobody had noticed. */
function pickRebel(state, R, rng) {
  const ruler = state.chars[R.ruler];
  const pool = livingCourt(state, R.id).filter(c => c.id !== R.ruler && ageOf(state, c) >= 18 && !c.imprisoned && !(isHumanRealm(state, R.id) && (c.id === (ruler.spouse || '')))).sort((a, b) => ((has(b, 'ambitious') ? 3 : 0) + (b.claims && b.claims.includes(R.id) ? 4 : 0) + (b.bastard ? 1 : 0) + b.stats.mar / 10 - regard(b, ruler) / 40) - ((has(a, 'ambitious') ? 3 : 0) + (a.claims && a.claims.includes(R.id) ? 4 : 0) + (a.bastard ? 1 : 0) + a.stats.mar / 10 - regard(a, ruler) / 40));
  if (pool.length) return pool[0];
  const c = makeChar(state, rng, { realm: R.id, heritage: R.heritage, house: R.house, role: 'courtier', age: rng.int(24, 46), court: true });
  if (!c.traits.includes('ambitious')) { c.traits.push('ambitious'); }
  return c;
}

/** Unrest boils over in an NPC realm: part of it breaks away under a rebel leader, and the old realm tries to take it back. */
export function revoltNpc(state, map, R, rng) {
  const leader = pickRebel(state, R, rng);
  const was = R.name;
  const nr = splitRealm(state, map, R, leader, rng.range(0.28, 0.42));
  if (!nr) return null;
  R.unrest = Math.round((R.unrest || 0) * 0.45);
  const war = declareWar(state, map, R.id, nr.id, 'revolt');
  const text = `Revolt! ${fullName(state, leader)} has raised the banner of rebellion and broken ${nr.name} away from ${was}.`;
  news(state, { kind: 'revolt', icon: '🔥', text, ids: [leader.id, R.ruler], realms: [R.id, nr.id], major: true });
  void war;
  return nr;
}

export function revoltTick(state, map, rng) {
  const ch = chaosMult(state);
  for (const R of state.realms.slice()) {
    if (!R.alive || isHumanRealm(state, R.id)) continue;
    const u = R.unrest || 0;
    if (u < 26 || provincesOf(state, R.id).length < 5 || state.realms.length >= 44) continue;
    if (state.wars.some(w => (w.attacker === R.id || w.defender === R.id) && w.why === 'revolt')) continue;
    if (!rng.chance((0.05 + (u - 26) / 250) * ch)) continue;
    revoltNpc(state, map, R, rng);
  }
}

/** Revolt against a human ruler: the event offers choices; these are the pieces it uses. */
export function revoltLeader(state, rng) { return pickRebel(state, playerRealm(state), rng); }
export function humanUnrest(state) { const R = playerRealm(state); return (R.unrest || 0) + Math.max(0, 40 - (state.mood == null ? 60 : state.mood)) * 0.8 + (state.tax === 'crushing' ? 8 : state.tax === 'high' ? 3 : 0); }

void player; void heirOf; void isKin; void exile; void closeTo; void kill; void ageOf;

/** A human ruler's realm boils over: the event offers choices. */
export function humanRevolt(state, map, rng) {
  if (state.gameOver) return;
  if (state.queue.some(q => q.id === 'revolt')) return;
  const last = state.flags.lastRevolt;
  if (last != null && state.turn - last < 10) return;
  const u = humanUnrest(state);
  if (u < 42 || !rng.chance((0.05 + (u - 42) / 500) * chaosMult(state))) return;
  const leader = pickRebel(state, playerRealm(state), rng);
  state.flags.lastRevolt = state.turn;
  queueEvent(state, 'revolt', { a: leader.id, unrest: Math.round(u) });
}
