// The undercurrent of the game. Ambition, jealousy, grudges and desire turn into secret SCHEMES (murder, coups, smears,
// seductions, embezzlement, forged claims). Schemes leave SECRETS behind; secrets spread as gossip, get exposed, and
// stain names (SINS). Spies and spymasters find things out. Nothing here is scripted: every character feels the same
// drives, so family dramas, regicides and scandals come out of ordinary traits and ordinary grudges.
//
// World-level state lives in state.ig (shared by every player in a shared world; the server only ever sends a
// player the parts they know about, see igFor). Who knows what is tracked by realm id (`seen`), so it works the
// same for one player and for many.
import { RNG, clamp } from './rng.js';
import {
  player, playerRealm, record, addMod, fullName, ageOf, makeChar, refreshRoles, heirOf, regard, bumpBoth, bumpRegard, lifeNote,
  chaosMult, neighborsOfRealm, atWar, allied, provincesOf, forHuman, isHumanRealm, humanPid, withPlayer, livingCourt, opinionOf,
  SINS, faithOf, council,
} from './world.js';
import { kill } from './sim.js';
import { queueEvent, QUEUE_SOFT } from './events.js';

const has = (c, t) => !!c && c.traits.includes(t);

export const ig = state => { const g = state.ig || (state.ig = { n: 1, schemes: [], secrets: [], spies: [], news: [], claims: [], sweep: {} }); if (!g.watch) g.watch = []; return g; };
/** Courtiers who agreed (in an audience) to keep an eye on someone and report to the ruler. */
export const watchesOf = (state, owner) => ig(state).watch.filter(w => !w.gone && (owner == null || w.owner === owner));
const nid = (state, p) => p + ig(state).n++;
const isRulerChar = (state, c) => { const r = c && state.realms[c.realm]; return !!r && r.ruler === c.id; };
const rulerOf = (state, realmId) => { const r = state.realms[realmId]; return r ? state.chars[r.ruler] : null; };
const roleHolder = (state, realmId, role) => Object.values(state.chars).find(c => c.alive && c.court && c.realm === realmId && c.role === role && !c.imprisoned) || null;
export const isKin = (a, b) => !!a && !!b && a.id !== b.id && ((a.parents || []).includes(b.id) || (b.parents || []).includes(a.id) || !!(a.parents && b.parents && a.parents.some(p => b.parents.includes(p))));
const closeTo = (a, b) => isKin(a, b) || (a && b && a.spouse === b.id);
const short = c => (c ? c.name : '?');

// ---------------------------------------------------------------- what a scheme is
export const SCHEMES = {
  murder: { label: 'Murder', icon: '🗡', speed: 13, cost: 60, sev: 3, maxBackers: 3, rate: 0.16, player: true, sin: true,
    desc: 'Arrange a fatal "accident". Slow and risky; deadly if it works. Killing kin, a spouse or a ruler is far worse in the eyes of the world.',
    verb: t => `have ${t.name} killed` },
  coup: { label: 'Coup', icon: '⚔', speed: 9, cost: 0, sev: 3, maxBackers: 5, rate: 0.2, player: false, sin: true,
    desc: 'Seize the throne with others behind you.', verb: t => `overthrow ${t.name}` },
  smear: { label: 'Smear', icon: '🐍', speed: 22, cost: 25, sev: 1, maxBackers: 2, rate: 0.3, player: true, sin: true,
    desc: 'Ruin a name with rumours: a real secret if you hold one, an invented one if not. A lie can be traced back to you.', verb: t => `ruin the name of ${t.name}` },
  seduce: { label: 'Seduce', icon: '💘', speed: 17, cost: 20, sev: 2, maxBackers: 0, rate: 0.55, player: true, sin: false,
    desc: 'Win someone\'s heart (and perhaps more than that). Marriage vows, family ties and a pious heart all make it harder, and worse if it comes out.', verb: t => `seduce ${t.name}` },
  embezzle: { label: 'Embezzle', icon: '💰', speed: 0, cost: 0, sev: 2, maxBackers: 0, rate: 0.22, player: false, sin: true,
    desc: 'Skim the treasury.', verb: () => 'rob the treasury' },
  forge: { label: 'Forge a claim', icon: '📜', speed: 13, cost: 70, sev: 2, maxBackers: 1, rate: 0.3, player: true, sin: true,
    desc: 'Fake the papers that prove a rightful claim to another realm\'s land: a reason for war. If the forgery is spotted, the shame is yours.', verb: t => `forge a claim to ${t.name}'s lands` },
};
export const PLAYER_SCHEMES = Object.keys(SCHEMES).filter(k => SCHEMES[k].player);

const MURDER_CAUSES = ['poison', 'a suspicious fever', 'a fall from the tower', 'tainted mushrooms', 'a "hunting accident"', 'a knife in the dark'];
const LIES = [
  ['was seen consorting with the realm\'s enemies', 'treason'], ['keeps a secret lover', 'adultery'], ['has been skimming the treasury for years', 'embezzle'],
  ['is not the true child of their parents', null], ['poisoned a rival and laughed about it', 'murder'], ['forged a will', 'forgery'],
  ['has been spreading rumours about the court', 'slander'],
];

// ---------------------------------------------------------------- the ledger of secrets
export function addSecret(state, o) {
  const g = ig(state);
  const sec = {
    id: nid(state, 's'), kind: o.kind, about: o.about, text: o.text, truth: o.truth !== false, sev: o.sev || 1, turn: state.turn,
    known: [...new Set(o.known || [])], seen: [], pub: !!o.pub, scheme: o.scheme || null, by: o.by || null, sin: o.sin || null, hush: 0,
  };
  g.secrets.push(sec);
  if (g.secrets.length > 160) {
    const i = g.secrets.findIndex(x => x.pub || x.dead);
    g.secrets.splice(i >= 0 ? i : 0, 1);
  }
  return sec;
}
export const secretById = (state, id) => ig(state).secrets.find(s => s.id === id) || null;
export const schemeById = (state, id) => ig(state).schemes.find(s => s.id === id) || null;
/** Does this realm (default: the mounted player's) know the secret? Public ones everybody does. */
export const knowsSecret = (state, sec, realmId = state.playerRealm) => !!sec.pub || sec.seen.includes(realmId);

/** A realm learns a secret; the human who rules it gets a notification light. Returns true if it was news. */
export function learn(state, sec, realmId = state.playerRealm) {
  if (realmId == null || realmId < 0 || sec.seen.includes(realmId)) return false;
  sec.seen.push(realmId);
  forHuman(state, realmId, () => { state.flags.igNew = (state.flags.igNew || 0) + 1; });
  return true;
}

export function news(state, o) {
  const g = ig(state);
  g.news.push({ turn: state.turn, kind: o.kind || 'intrigue', icon: o.icon || '🗝', text: o.text, ids: o.ids || [], realms: o.realms || [], pub: o.pub !== false, major: !!o.major });
  if (g.news.length > 80) g.news.shift();
  for (const id of o.ids || []) if (o.note !== false) lifeNote(state, state.chars[id], o.text.slice(0, 140));
}

// ---------------------------------------------------------------- crimes and their stain
export function sinFor(state, doer, victim) {
  if (isRulerChar(state, victim)) return 'regicide';
  if (closeTo(doer, victim)) return 'kinslaying';
  return 'murder';
}

/** A deed is public: the doer carries the mark, everyone who knew them thinks less of them, and the dead person's family never forgives. */
export function stain(state, doer, sin, victim) {
  const S = SINS[sin];
  if (!S || !doer) return;
  doer.marks = doer.marks || [];
  if (!doer.marks.some(m => m.k === sin)) doer.marks.push({ k: sin, y: state.year });
  for (const o of Object.values(state.chars)) {
    if (!o.alive || o.id === doer.id) continue;
    const kin = victim && closeTo(o, victim) && o.id !== doer.id;
    if (o.realm !== doer.realm && !kin) continue;
    let d = S.reg * ((has(o, 'pious') || has(o, 'honest') || has(o, 'kind')) ? 1.5 : (has(o, 'cynical') || has(o, 'cruel') || has(o, 'ambitious')) ? 0.5 : 1);
    if (kin) d = Math.min(d, -60);
    bumpRegard(o, doer, Math.round(d), kin ? 'Blood feud' : undefined);
  }
  const r = state.realms[doer.realm];
  if (r && r.ruler === doer.id) {
    r.unrest = clamp((r.unrest || 0) + S.unrest, 0, 100);
    forHuman(state, r.id, () => { state.prestige += S.prestige; state.stats.sins = (state.stats.sins || 0) + 1; });
  }
}

/** A secret comes out. The truth stains its subject; a plot becomes known to its target; a lie is only a rumour. */
export function reveal(state, sec, how) {
  if (sec.pub) return;
  sec.pub = true;
  const doer = state.chars[sec.about[0]], vic = sec.about[1] ? state.chars[sec.about[1]] : null;
  if (sec.kind === 'plot') {
    const s = schemeById(state, sec.scheme);
    if (s && s.status === 'active') { const t = state.chars[s.target]; if (t) discover(state, null, s, t.realm, how || 'rumour'); }
    return;
  }
  if (!doer) return;
  if (sec.kind === 'affair') {
    // a ruler learns that their own consort is unfaithful
    for (const id of sec.about) {
      const c = state.chars[id], sp = c && c.spouse && state.chars[c.spouse];
      if (sp && sp.alive && isRulerChar(state, sp) && isHumanRealm(state, sp.realm)) {
        const lover = sec.about.find(x => x !== id);
        forHuman(state, sp.realm, () => { if (!state.queue.some(q => q.id === 'affair_found')) queueEvent(state, 'affair_found', { a: c.id, b: lover, secret: sec.id }); });
      }
    }
  }
  if (sec.truth && sec.sin) {
    stain(state, doer, sec.sin, vic);
    news(state, { kind: 'exposed', icon: '🔦', text: `It is out: ${sec.text}.`, ids: sec.about, realms: [doer.realm, vic && vic.realm].filter(x => x != null), major: true });
  } else if (!sec.truth) {
    news(state, { kind: 'rumour', icon: '🗣', text: `Rumour has it that ${doer.name} ${sec.claim || 'has done something shameful'}.`, ids: sec.about, realms: [doer.realm] });
  } else {
    news(state, { kind: 'exposed', icon: '🔦', text: `Word spreads: ${sec.text}.`, ids: sec.about, realms: [doer.realm] });
  }
}

// ---------------------------------------------------------------- watching: spymasters, spies, sweeps
export const spiesOf = (state, owner, where) => ig(state).spies.filter(x => !x.gone && (owner == null || x.owner === owner) && (where == null || x.in === where));

/** How closely a realm watches for plots against it, per season. */
export function vigilance(state, realmId) {
  const sp = roleHolder(state, realmId, 'spymaster'), ruler = rulerOf(state, realmId);
  let v = 0.02 + (sp ? sp.stats.int * 0.004 : 0.012) + (has(ruler, 'paranoid') ? 0.03 : 0);
  if ((ig(state).sweep[realmId] || 0) > state.turn) v += 0.18;
  return v;
}

// ---------------------------------------------------------------- schemes
export function schemeBlock(state, map, kind, owner, target) {
  const K = SCHEMES[kind];
  if (!K) return 'Unknown scheme.';
  if (!owner || !owner.alive || !target || !target.alive) return 'Nobody to scheme against.';
  if (owner.id === target.id) return 'Not against oneself.';
  if (owner.imprisoned) return 'Locked in a dungeon.';
  if (ageOf(state, owner) < 16) return 'Too young to scheme.';
  const active = ig(state).schemes.filter(s => s.status === 'active');
  if (active.some(s => s.owner === owner.id)) return `${owner.name} is already busy with a scheme.`;
  const same = owner.realm === target.realm;
  const rulerOwner = isRulerChar(state, owner);
  if (kind === 'coup') { if (!same || !isRulerChar(state, target) || rulerOwner) return 'A coup needs a ruler to overthrow, from within their court.'; }
  else if (kind === 'embezzle') { if (!same || !isRulerChar(state, target) || !['steward', 'banker'].includes(owner.role)) return 'Only a steward or banker can skim the treasury.'; }
  else if (kind === 'forge') { if (!rulerOwner || !isRulerChar(state, target) || same) return 'Only a ruler can forge a claim, on another realm.'; if (allied(state, owner.realm, target.realm)) return 'You do not forge claims on your allies.'; if (ig(state).claims.some(c => c.by === owner.realm && c.over === target.realm && c.until > state.turn)) return 'You already hold a claim there.'; }
  else if (!same) {
    // out of the court's reach: only rulers, and only with a neighbour or a spy to do the work
    const reach = rulerOwner && ((map && neighborsOfRealm(state, map, owner.realm).includes(target.realm)) || spiesOf(state, owner.realm, target.realm).length > 0);
    if (!reach) return 'Out of reach: you need a neighbour\'s border or a spy in their court.';
    if (kind === 'seduce') return 'Too far away to seduce.';
  }
  if (kind === 'seduce') {
    if (owner.sex === target.sex) return 'The priests would not bless it, and neither would the gossips.';
    if (ageOf(state, target) < 16 || ageOf(state, target) > 58 || ageOf(state, owner) > 58) return 'Not a suitable match for a dalliance.';
  }
  return null;
}

export function startScheme(state, kind, owner, target, o = {}) {
  const g = ig(state), K = SCHEMES[kind];
  const s = {
    id: nid(state, 'x'), kind, owner: owner.id, target: target.id, realm: owner.realm, by: o.by == null ? null : o.by, patron: o.patron || null,
    started: state.turn, progress: 0, backers: [], gold: 0, status: 'active', seen: [], why: o.why || '', secret: null, watched: false,
  };
  const sec = addSecret(state, { kind: 'plot', about: [owner.id, target.id], text: `${owner.name} is plotting to ${K.verb(target)}`, sev: K.sev, known: [owner.id, o.patron].filter(Boolean), scheme: s.id });
  s.secret = sec.id;
  g.schemes.push(s);
  if (s.by != null) learn(state, sec, s.by);
  return s;
}

function endScheme(state, s, status, note) {
  s.status = status; s.ended = state.turn; s.note = note || '';
  const sec = secretById(state, s.secret);
  if (sec && status !== 'done') sec.dead = true;
}

export function schemeTarget(state, s) { return state.chars[s.target]; }

export function schemeSpeed(state, s) {
  const o = state.chars[s.owner], K = SCHEMES[s.kind];
  let v = K.speed + o.stats.int * 0.5;
  for (const id of s.backers) { const b = state.chars[id]; if (b && b.alive) v += 2 + b.stats.int * 0.12; }
  return v + Math.min(15, (s.gold || 0) / 8);
}

/** Strength of the plotters and of what stands in their way. */
export function schemeOdds(state, s) {
  const o = state.chars[s.owner], t = state.chars[s.target];
  if (!o || !t) return { chance: 0, A: 0, D: 0 };
  const bs = s.backers.map(id => state.chars[id]).filter(b => b && b.alive);
  const tr = state.realms[t.realm], vig = vigilance(state, t.realm);
  let A, D, chance;
  if (s.kind === 'murder') {
    A = o.stats.int + bs.reduce((a, b) => a + b.stats.int * 0.4, 0) + s.gold / 12 + (has(o, 'deceitful') ? 3 : 0);
    D = 6 + (isRulerChar(state, t) ? 6 : 0) + vig * 60 + (has(t, 'paranoid') ? 6 : 0) + (t.guard > state.turn ? 14 : 0) + t.stats.mar * 0.2 + (t.imprisoned ? -5 : 0) + (o.realm !== t.realm ? 8 : 0) + (s.watched ? 10 : 0);
    chance = 0.32 + (A - D) / 70;
  } else if (s.kind === 'coup') {
    const court = livingCourt(state, o.realm).filter(c => c.id !== o.id && c.id !== t.id);
    const loyal = court.filter(c => regard(c, t) >= 15 && !s.backers.includes(c.id)).length;
    const mar = roleHolder(state, o.realm, 'marshal');
    A = o.stats.mar + bs.reduce((a, b) => a + b.stats.mar * 0.7 + 6, 0) + (tr ? (tr.unrest || 0) / 8 : 0) + (o.claims && o.claims.includes(o.realm) ? 8 : 0);
    D = t.stats.mar + 12 + loyal * 4 + (mar ? mar.stats.mar * 0.5 : 0) + (s.watched ? 10 : 0);
    chance = 0.5 + (A - D) / 50;
  } else if (s.kind === 'smear') {
    A = o.stats.dip * 0.5 + o.stats.int * 0.5 + s.gold / 15 + bs.length * 3;
    D = t.stats.dip * 0.4 + 5 + vig * 40;
    chance = 0.55 + (A - D) / 40;
  } else if (s.kind === 'seduce') {
    A = o.stats.dip * 0.6 + (has(o, 'deceitful') ? 4 : 0) + regard(t, o) / 8 + s.gold / 15;
    D = 6 + (has(t, 'honest') ? 4 : 0) + (has(t, 'pious') ? 6 : 0) + (t.spouse ? 3 : 0) + (isKin(o, t) ? 10 : 0);
    chance = 0.4 + (A - D) / 40;
  } else if (s.kind === 'forge') {
    A = o.stats.int + s.gold / 12 + bs.length * 3;
    D = 5 + vig * 70;
    chance = 0.5 + (A - D) / 45;
  } else { A = 0; D = 0; chance = 0.5; }
  return { chance: clamp(chance, 0.06, 0.92), A: Math.round(A), D: Math.round(D) };
}

/** Would `c` join `s`? A number 0..1, and a short reason. */
export function backerChance(state, s, c) {
  const o = state.chars[s.owner], t = state.chars[s.target];
  if (!c || !c.alive || c.imprisoned || ageOf(state, c) < 16 || c.id === o.id || c.id === t.id || s.backers.includes(c.id)) return { p: 0, why: 'not available' };
  if (c.realm !== o.realm && c.realm !== t.realm) return { p: 0, why: 'too far' };
  let p = 0.22 + regard(c, o) / 120 - regard(c, t) / 140;
  if (s.kind === 'coup') p += (has(c, 'ambitious') ? 0.2 : 0) - (has(c, 'content') ? 0.2 : 0) - (has(c, 'honest') ? 0.12 : 0);
  if (s.kind === 'murder') p += (has(c, 'cruel') || has(c, 'wrathful') ? 0.14 : 0) - (has(c, 'kind') ? 0.25 : 0) - (has(c, 'honest') ? 0.15 : 0) - (has(c, 'pious') ? 0.15 : 0);
  if (s.kind === 'smear' || s.kind === 'forge') p += (has(c, 'deceitful') ? 0.14 : 0) - (has(c, 'honest') ? 0.22 : 0);
  if (has(c, 'craven')) p -= 0.08;
  if (s.patron && isHumanRealm(state, c.realm)) p += opinionOf(state, c).total / 220;
  return { p: clamp(p, 0, 0.9), why: p > 0.5 ? 'eager' : p > 0.3 ? 'persuadable' : 'unlikely' };
}

export function addBacker(state, s, c) {
  if (s.backers.includes(c.id)) return;
  s.backers.push(c.id);
  const sec = secretById(state, s.secret);
  if (sec && !sec.known.includes(c.id)) sec.known.push(c.id);
}

function discover(state, map, s, realmId, how) {
  if (s.seen.includes(realmId) || s.status !== 'active') return;
  s.seen.push(realmId);
  const sec = secretById(state, s.secret);
  if (sec) learn(state, sec, realmId);
  if (isHumanRealm(state, realmId)) {
    forHuman(state, realmId, () => { if (!state.queue.some(q => q.id === 'plot_found' && q.cast.scheme === s.id)) queueEvent(state, 'plot_found', { a: s.owner, b: s.target, scheme: s.id, how }); });
  } else crackdown(state, map, s, realmId);
}
export { discover };

/** An NPC ruler learns of a plot against their house: they act at once, in character. */
function crackdown(state, map, s, realmId) {
  const rng = new RNG(`crack:${state.seed}:${state.turn}:${s.id}`);
  const R = state.realms[realmId], ruler = state.chars[R.ruler], o = state.chars[s.owner], t = state.chars[s.target];
  if (!o || !o.alive) return endScheme(state, s, 'failed', 'dead');
  if (ruler.id === o.id) { bumpRegard(t, o, -50, 'Would-be killer'); return; } // the ruler's own scheme: nobody above them to answer to
  const ownerBy = s.by != null ? s.by : null;
  endScheme(state, s, 'failed', 'foiled');
  if (o.realm === realmId) {
    // a traitor in the court: prison, the block, or exile, as the ruler's nature dictates
    const harsh = (has(ruler, 'cruel') ? 0.3 : 0) + (has(ruler, 'wrathful') ? 0.25 : 0) + (SCHEMES[s.kind].sev >= 3 ? 0.25 : 0) - (has(ruler, 'kind') ? 0.3 : 0) - (has(ruler, 'patient') ? 0.1 : 0);
    const roll = rng.next();
    if (roll < 0.15 + harsh) {
      news(state, { kind: 'justice', icon: '🪓', text: `${fullName(state, ruler)} had ${o.name} executed for plotting to ${SCHEMES[s.kind].verb(t)}.`, ids: [ruler.id, o.id], realms: [realmId], major: true });
      if (closeTo(ruler, o)) stain(state, ruler, 'kinslaying', o);
      kill(state, map, o, 'execution');
    } else if (roll < 0.65 + harsh / 2) {
      o.imprisoned = true;
      news(state, { kind: 'justice', icon: '⛓', text: `${o.name} was caught plotting to ${SCHEMES[s.kind].verb(t)} and thrown into the dungeon.`, ids: [ruler.id, o.id], realms: [realmId], major: true });
    } else {
      exile(state, map, o, rng);
      news(state, { kind: 'justice', icon: '🚪', text: `${o.name} was caught plotting to ${SCHEMES[s.kind].verb(t)} and driven from ${R.name}.`, ids: [o.id], realms: [realmId], major: true });
    }
    for (const id of s.backers) { const b = state.chars[id]; if (b && b.alive && !isRulerChar(state, b) && rng.chance(0.5)) { b.imprisoned = true; lifeNote(state, b, 'Thrown in the dungeon as a conspirator.'); } }
    stain(state, o, 'treason', ruler);
  } else {
    // a foreign hand: the insult is remembered, and may be answered
    bumpBoth(ruler, o, -60, 'Would-be killer');
    ig(state).claims.push({ by: realmId, over: o.realm, kind: 'outrage', forged: false, until: state.turn + 14, why: `${o.name}'s plot against ${t.name}` });
    news(state, { kind: 'justice', icon: '🕵', text: `${t.name}'s court uncovered a plot by ${fullName(state, o)} of ${state.realms[o.realm].name}.`, ids: [o.id, t.id], realms: [realmId, o.realm], major: true });
    if (ownerBy != null) forHuman(state, ownerBy, () => {
      addMod(ruler, 'Plotted against me', -55, 40, 'plotted'); ruler.mods[ruler.mods.length - 1].inherit = true;
      state.prestige -= 8;
      record(state, `The plot against ${t.name} of ${R.name} was uncovered. ${fullName(state, ruler)} will not forget.`, { kind: 'intrigue', chars: [ruler.id] });
      queueEvent(state, 'ig_notice', { a: ruler.id, icon: '🕵', title: 'Your Plot Is Uncovered', text: `Agents of ${R.name} found out about your plot against ${t.name}. ${ruler.name} is furious, and the whole court of ${R.name} knows whose hand it was (−8 prestige).` });
    });
  }
}

/** Move a character to a neighbouring court, with a claim on what they lost. */
export function exile(state, map, c, rng, opts = {}) {
  const R = state.realms[c.realm];
  const ns = map && R ? neighborsOfRealm(state, map, R.id) : [];
  if (!ns.length) { c.imprisoned = true; return null; }
  const to = state.realms[rng.pick(ns)];
  const was = R.id;
  if (opts.claim !== false) c.claims = [...new Set([...(c.claims || []), was])];
  c.exiled = { from: was, turn: state.turn };
  const move = x => { x.realm = to.id; x.court = false; x.role = 'courtier'; x.imprisoned = false; };
  move(c);
  const sp = c.spouse && state.chars[c.spouse];
  if (sp && sp.alive && !isRulerChar(state, sp)) move(sp);
  lifeNote(state, c, `Fled to ${to.name}.`);
  if (isHumanRealm(state, to.id)) forHuman(state, to.id, () => queueEvent(state, 'exile_refuge', { a: c.id, realm: was }));
  return to;
}

// ---------------------------------------------------------------- resolving a scheme
function resolveScheme(state, map, s, rng) {
  const o = state.chars[s.owner], t = state.chars[s.target];
  const { chance } = schemeOdds(state, s);
  const win = rng.chance(chance);
  const K = SCHEMES[s.kind];
  const bs = s.backers.map(id => state.chars[id]).filter(b => b && b.alive);
  const patron = s.patron ? state.chars[s.patron] : null;
  if (s.kind === 'murder') {
    if (!win) return caught(state, map, s, rng, `${o.name}'s plot against ${t.name} came to nothing.`);
    const sin = sinFor(state, patron || o, t);
    const cause = rng.pick(MURDER_CAUSES);
    const deed = addSecret(state, { kind: 'deed', sin, about: [(patron || o).id, t.id], text: `${(patron || o).name} had ${t.name} killed${patron && patron !== o ? ` (through ${o.name})` : ''}`, sev: 3, known: [o.id, ...(patron ? [patron.id] : []), ...bs.map(b => b.id)] });
    endScheme(state, s, 'done', 'success');
    const tRealm = t.realm;
    kill(state, map, t, cause);
    // whispers: sometimes the right name, sometimes a convenient wrong one
    if (rng.chance(0.25 + vigilance(state, tRealm))) {
      const court = livingCourt(state, tRealm).filter(c => c.id !== t.id && c.id !== o.id && ageOf(state, c) >= 16);
      const wrong = court.length && rng.chance(0.4) ? rng.pick(court) : null;
      const who = wrong || (patron || o);
      const rum = addSecret(state, { kind: 'rumour', about: [who.id, t.id], text: `${who.name} is said to have had ${t.name} killed`, claim: `had ${t.name} killed`, truth: !wrong, sev: 2, sin: wrong ? null : sin, known: [], pub: false });
      rum.suspect = who.id; rum.of = deed.id;
      for (const r of [tRealm, o.realm]) if (r != null && state.realms[r]) rum.seen.push(r);
      news(state, { kind: 'rumour', icon: '🗣', text: `Whispers blame ${who.name} for the death of ${t.name}.`, ids: [who.id, t.id], realms: [tRealm] });
    }
    return;
  }
  if (s.kind === 'coup') return resolveCoup(state, map, s, rng, win);
  if (s.kind === 'smear') {
    if (!win) {
      bumpBoth(o, t, -25);
      endScheme(state, s, 'failed', 'smear fizzled');
      news(state, { kind: 'scandal', icon: '🤭', text: `${o.name}'s whispering campaign against ${t.name} was laughed off.`, ids: [o.id, t.id], realms: [o.realm] });
      reportHuman(state, s, '🐍', 'Your Smear Fizzles', `Nobody believed your whispers about ${t.name}. They know who is behind it now.`);
      return;
    }
    return smearHits(state, map, s, rng);
  }
  if (s.kind === 'seduce') return seduceResult(state, s, rng, win);
  if (s.kind === 'forge') {
    if (!win) return caught(state, map, s, rng, `${o.name}'s forged papers on ${state.realms[t.realm].name} were spotted.`);
    ig(state).claims.push({ by: o.realm, over: t.realm, forged: true, kind: 'forged', until: state.turn + 20, author: o.id });
    endScheme(state, s, 'done', 'success');
    reportHuman(state, s, '📜', 'The Papers Are Ready', `Your forged claim to the lands of ${state.realms[t.realm].name} is ready. It will pass for real, probably. Press it in a war, and pray nobody inspects the ink.`);
    if (!isHumanRealm(state, o.realm)) news(state, { kind: 'claim', icon: '📜', text: `${state.realms[o.realm].name} has "discovered" an ancient claim to the lands of ${state.realms[t.realm].name}.`, ids: [o.id], realms: [o.realm, t.realm] });
    return;
  }
}

/** A failed plot: exposure, and the consequences for the schemer and anyone behind them. */
function caught(state, map, s, rng, text) {
  const o = state.chars[s.owner], t = state.chars[s.target], patron = s.patron ? state.chars[s.patron] : null;
  endScheme(state, s, 'failed', 'caught');
  const sec = secretById(state, s.secret);
  if (sec) { learn(state, sec, t.realm); if (!isHumanRealm(state, t.realm)) { sec.pub = true; } }
  news(state, { kind: 'justice', icon: '🕵', text, ids: [o.id, t.id], realms: [o.realm, t.realm], major: true });
  if (isHumanRealm(state, t.realm) && s.by !== t.realm) {
    // your own people caught someone: they are in your hands
    if (o.realm === t.realm) o.imprisoned = true;
    s.seen.push(t.realm);
    forHuman(state, t.realm, () => queueEvent(state, 'plot_found', { a: s.owner, b: s.target, scheme: s.id, how: 'caught', foiled: true }));
  } else if (!isHumanRealm(state, t.realm)) {
    s.seen.push(t.realm);
    crackdownAfterFail(state, map, s, rng, o, t, patron);
  }
  if (s.by != null) forHuman(state, s.by, () => {
    queueEvent(state, 'ig_notice', { a: t.id, icon: '🕵', title: 'Your Plot Has Failed', text: `${text} ${patron && patron !== o ? `${o.name} is in the hands of ${state.realms[t.realm].name}, and may talk.` : 'Your name is mud.'}` });
    record(state, text, { kind: 'intrigue', chars: [o.id, t.id] });
  });
  // the one behind it may be named
  if (patron && patron.id !== o.id && rng.chance(0.5)) {
    const order = addSecret(state, { kind: 'order', sin: SCHEMES[s.kind].sin ? (s.kind === 'murder' ? sinFor(state, patron, t) : s.kind === 'smear' ? 'slander' : s.kind === 'forge' ? 'forgery' : 'treason') : null, about: [patron.id, t.id], text: `${patron.name} ordered the plot against ${t.name}`, sev: 2, known: [o.id, ...s.backers] });
    order.leaky = true;
  }
}

function crackdownAfterFail(state, map, s, rng, o, t, patron) {
  const tr = state.realms[t.realm], ruler = state.chars[tr.ruler];
  if (o.realm === t.realm) {
    const roll = rng.next(), harsh = (has(ruler, 'cruel') ? 0.3 : 0) + (has(ruler, 'wrathful') ? 0.2 : 0) - (has(ruler, 'kind') ? 0.3 : 0);
    if (roll < 0.25 + harsh && !isRulerChar(state, o)) { news(state, { kind: 'justice', icon: '🪓', text: `${o.name} was executed for plotting against ${t.name}.`, ids: [o.id], realms: [o.realm], major: true }); kill(state, map, o, 'execution'); }
    else if (!isRulerChar(state, o)) { o.imprisoned = true; }
  } else {
    bumpBoth(ruler, o, -60, 'Would-be killer');
    ig(state).claims.push({ by: t.realm, over: o.realm, kind: 'outrage', forged: false, until: state.turn + 14, why: `${o.name}'s plot against ${t.name}` });
  }
  stain(state, o, 'treason', t);
}

function reportHuman(state, s, icon, title, text) {
  if (s.by == null) return;
  forHuman(state, s.by, () => {
    queueEvent(state, 'ig_notice', { a: s.target, icon, title, text });
    record(state, text, { kind: 'intrigue', chars: [s.owner, s.target] });
  });
}

// ---- smear
const FAB = ['was seen consorting with the realm\'s enemies', 'keeps a secret lover', 'has been skimming the treasury for years', 'poisoned a rival and laughed about it', 'forged a will', 'mocked the faith in private'];
function smearHits(state, map, s, rng) {
  const o = state.chars[s.owner], t = state.chars[s.target];
  const real = ig(state).secrets.find(x => !x.pub && x.truth && x.sin && x.about[0] === t.id && x.known.includes(o.id) && x.kind !== 'plot');
  endScheme(state, s, 'done', 'success');
  let rumour;
  if (real) { reveal(state, real, 'smear'); rumour = real; }
  else {
    const [claim, sin] = rng.pick(LIES.slice(0, 6));
    rumour = addSecret(state, { kind: 'rumour', about: [t.id], text: `${t.name} ${claim}`, claim, truth: false, sev: 2, sin, known: [o.id, ...s.backers], pub: true, by: o.id });
    addSecret(state, { kind: 'authorship', sin: 'slander', about: [o.id, t.id], text: `${o.name} invented the rumour that ${t.name} ${claim}`, sev: 1, known: [o.id, ...s.backers], truth: true, of: rumour.id });
    const S = SINS[sin] || SINS.slander;
    for (const x of livingCourt(state, t.realm)) {
      if (x.id === t.id || ageOf(state, x) < 14) continue;
      const credulous = has(x, 'trusting') ? 1.3 : has(x, 'paranoid') ? 1.1 : has(x, 'cynical') ? 0.8 : 1;
      bumpRegard(x, t, Math.round(S.reg * 0.35 * credulous));
    }
    const r = state.realms[t.realm];
    if (r && r.ruler === t.id) {
      r.unrest = clamp((r.unrest || 0) + 3, 0, 100);
      forHuman(state, r.id, () => { state.prestige -= 4; for (const c of livingCourt(state, r.id)) if (c.id !== t.id) addMod(c, 'Heard slander about me', -5, 8, 'slander'); });
    }
    news(state, { kind: 'rumour', icon: '🗣', text: `Rumour has it that ${t.name} ${claim}.`, ids: [t.id], realms: [t.realm], major: false });
  }
  reportHuman(state, s, '🐍', 'The Whispers Take Hold', `Your campaign against ${t.name} worked: ${real ? 'a true secret is out, and ' + t.name + ' is shamed' : 'the lie is on every tongue'}.${real ? '' : ' If anyone traces it back to you, you are the slanderer.'}`);
}

// ---- seduction
function seduceResult(state, s, rng, win) {
  const o = state.chars[s.owner], t = state.chars[s.target];
  if (!win) {
    bumpBoth(o, t, -22);
    endScheme(state, s, 'failed', 'rebuffed');
    if (has(t, 'honest') || has(t, 'pious') || rng.chance(0.3)) {
      news(state, { kind: 'scandal', icon: '🤭', text: `${t.name} indignantly rebuffed the advances of ${o.name}. The whole court knows.`, ids: [o.id, t.id], realms: [t.realm] });
    }
    reportHuman(state, s, '💔', 'Rebuffed', `${t.name} turned you down. Rather firmly.`);
    return;
  }
  endScheme(state, s, 'done', 'success');
  bumpBoth(o, t, 30, 'Lover');
  const blood = isKin(o, t), married = !!((o.spouse && state.chars[o.spouse] && state.chars[o.spouse].alive) || (t.spouse && state.chars[t.spouse] && state.chars[t.spouse].alive));
  if (!blood && !married) {
    bumpBoth(o, t, 15, 'Sweetheart');
    news(state, { kind: 'romance', icon: '💕', text: `${o.name} and ${t.name} have been seen walking together, suspiciously close.`, ids: [o.id, t.id], realms: [o.realm] });
    reportHuman(state, s, '💕', 'Love Blooms', `${t.name} is yours, and nobody will mind.`);
    return;
  }
  const sin = blood ? 'incest' : 'adultery';
  addSecret(state, { kind: 'affair', sin, about: [o.id, t.id], text: `${o.name} and ${t.name} are lovers${blood ? ', and kin' : ''}`, sev: blood ? 3 : 2, known: [o.id, t.id, ...(s.patron ? [s.patron] : [])] });
  reportHuman(state, s, '💘', 'A Secret Affair', `${t.name} has succumbed. ${blood ? 'The priests would be horrified.' : 'It must stay secret.'} Secrets like this have a way of getting out.`);
}

// ---- coups
function resolveCoup(state, map, s, rng, win) {
  const o = state.chars[s.owner], t = state.chars[s.target], R = state.realms[t.realm];
  const bs = s.backers.map(id => state.chars[id]).filter(b => b && b.alive);
  if (isHumanRealm(state, R.id)) {
    // the ruler gets one chance to act: the event settles it
    s.status = 'striking';
    forHuman(state, R.id, () => queueEvent(state, 'coup_strike', { a: o.id, b: t.id, scheme: s.id }));
    return;
  }
  if (!win) {
    endScheme(state, s, 'failed', 'crushed');
    if (rng.chance(0.55) || has(t, 'cruel')) {
      news(state, { kind: 'justice', icon: '🪓', text: `${o.name}'s coup against ${fullName(state, t)} was crushed. ${o.name} lost their head.`, ids: [o.id, t.id], realms: [R.id], major: true });
      kill(state, map, o, 'execution');
    } else { o.imprisoned = true; news(state, { kind: 'justice', icon: '⛓', text: `${o.name}'s coup against ${fullName(state, t)} was crushed. ${o.name} rots in the dungeon.`, ids: [o.id, t.id], realms: [R.id], major: true }); }
    for (const b of bs) if (rng.chance(0.6)) { b.imprisoned = true; }
    stain(state, o, 'treason', t);
    R.unrest = clamp((R.unrest || 0) - 6, 0, 100);
    return;
  }
  endScheme(state, s, 'done', 'success');
  const dead = deposeRuler(state, map, R, t, o, rng);
  for (const b of bs) { bumpBoth(o, b, 20); lifeNote(state, b, `Helped ${o.name} seize the crown.`); }
  news(state, { kind: 'coup', icon: '👑', text: `Coup in ${R.name}! ${o.name} has seized the throne from ${fullName(state, t)}${dead ? ', who is dead' : ''}.`, ids: [o.id, t.id], realms: [R.id], major: true });
}

/** The old ruler is gone (killed, or driven out with a claim); `o` takes the crown. */
export function deposeRuler(state, map, R, old, o, rng) {
  const doom = old && (regard(o, old) <= -35 && (has(o, 'cruel') || has(o, 'wrathful') || has(o, 'ambitious')) && rng.chance(0.4));
  let dead = false;
  if (old) {
    if (doom) {
      const sin = closeTo(o, old) ? 'kinslaying' : 'regicide';
      const kids = old.children.map(id => state.chars[id]).filter(k => k && k.alive);
      addSecret(state, { kind: 'deed', sin, about: [o.id, old.id], text: `${o.name} had ${old.name} killed to take the crown`, sev: 3, known: [o.id] });
      R.ruler = o.id; o.role = 'ruler'; o.court = false;
      kill(state, map, old, rng.pick(MURDER_CAUSES));
      dead = true;
      void kids;
    } else {
      R.ruler = o.id; o.role = 'ruler'; o.court = false;
      old.role = 'courtier'; old.court = false;
      exile(state, map, old, rng);
    }
  }
  R.ruler = o.id; o.role = 'ruler'; o.court = false;
  const widow = old && old.spouse && state.chars[old.spouse];
  if (widow && widow.alive && widow.role === 'spouse') widow.role = 'courtier';
  if (o.spouse && state.chars[o.spouse] && state.chars[o.spouse].alive) state.chars[o.spouse].role = 'spouse';
  for (const id of (old && old.children) || []) { const k = state.chars[id]; if (k && k.alive && (k.role === 'heir')) k.role = 'child'; }
  R.house = o.house || R.house;
  R.unrest = clamp((R.unrest || 0) * 0.5, 0, 100);
  refreshRoles(state);
  return dead;
}

/** What the human ruler's choice in a coup does. `how`: 'fight' | 'bargain' | 'flee'. */
export function playerCoup(state, map, s, how, rng) {
  const o = state.chars[s.owner], t = state.chars[s.target], R = state.realms[t.realm];
  const bs = s.backers.map(id => state.chars[id]).filter(b => b && b.alive);
  const odds = schemeOdds(state, s);
  const guards = council(state).marshal ? council(state).marshal.stats.mar * 0.5 : 4;
  if (how === 'bargain') {
    endScheme(state, s, 'failed', 'bought off');
    return { won: true, text: `${o.name} lowers the knife, for a price. The coup dissolves, and ${o.name} is now very rich and very quiet.` };
  }
  let defend = how === 'fight' ? 1 - odds.chance + guards / 90 + 0.1 : 0.25;
  if (state.gold < 0) defend -= 0.1;
  const held = rng.chance(clamp(defend, 0.1, 0.9));
  if (held) {
    endScheme(state, s, 'failed', 'crushed');
    o.imprisoned = true;
    for (const b of bs) b.imprisoned = true;
    state.prestige += 10; state.stats.coupsCrushed = (state.stats.coupsCrushed || 0) + 1;
    stain(state, o, 'treason', t);
    return { won: true, text: `The guards hold the corridor. ${o.name}${bs.length ? ' and ' + bs.length + ' conspirator' + (bs.length > 1 ? 's' : '') : ''} are in irons. (+10 prestige)` };
  }
  endScheme(state, s, 'done', 'success');
  // the ruler falls; the crown passes by the usual rules (to the heir, who may well be the plotter)
  addSecret(state, { kind: 'deed', sin: closeTo(o, t) ? 'kinslaying' : 'regicide', about: [o.id, t.id], text: `${o.name} led the coup that ended ${t.name}`, sev: 3, known: [o.id, ...bs.map(b => b.id)] });
  news(state, { kind: 'coup', icon: '👑', text: `${o.name} led a palace coup against ${fullName(state, t)} of ${R.name}.`, ids: [o.id, t.id], realms: [R.id], major: true, note: false });
  kill(state, map, t, 'a palace coup');
  return { won: false, text: 'The doors burst open. It is over.' };
}

// ---------------------------------------------------------------- the season's tick (world phase)
function byRealm(state) {
  const out = {};
  for (const c of Object.values(state.chars)) if (c.alive && state.realms[c.realm] && state.realms[c.realm].alive) (out[c.realm] = out[c.realm] || []).push(c);
  return out;
}

export function intrigueWorld(state, map, rng) {
  const g = ig(state), ch = chaosMult(state);
  const groups = byRealm(state);
  for (const s of g.schemes.slice()) advance(state, map, s, rng, ch);
  g.schemes = g.schemes.filter(s => s.status === 'active' || s.status === 'striking' || state.turn - (s.ended || 0) < 10);
  g.claims = g.claims.filter(c => c.until > state.turn);
  secretsTick(state, map, rng, ch);
  affairsTick(state, map, rng, ch);
  arrivals(state, rng, groups, ch);
  generate(state, map, rng, groups, null, ch);
  spyWar(state, map, rng, ch);
  unrestTick(state, map, rng, ch);
}

function advance(state, map, s, rng, ch) {
  if (s.status !== 'active') return;
  const o = state.chars[s.owner], t = state.chars[s.target];
  if (!o || !o.alive) return endScheme(state, s, 'failed', 'the schemer died');
  if (!t || !t.alive) return endScheme(state, s, 'done', 'moot');
  if (o.imprisoned) return endScheme(state, s, 'failed', 'imprisoned');
  s.backers = s.backers.filter(id => state.chars[id] && state.chars[id].alive && !state.chars[id].imprisoned);
  const K = SCHEMES[s.kind];
  // NPC schemers recruit helpers
  if (s.by == null && K.maxBackers > s.backers.length && rng.chance(0.4)) {
    const pool = Object.values(state.chars).filter(c => c.alive && (c.realm === o.realm) && backerChance(state, s, c).p > 0);
    if (pool.length) { const c = rng.pick(pool); if (rng.chance(backerChance(state, s, c).p)) addBacker(state, s, c); }
  }
  if (s.kind === 'embezzle') return embezzleTick(state, map, s, rng);
  let v = schemeSpeed(state, s);
  // a coup waits for friends
  const R = state.realms[t.realm];
  const need = s.kind === 'coup' ? Math.min(2, Math.max(0, livingCourt(state, o.realm).length - 3)) : 0;
  if (s.kind === 'coup' && s.backers.length < need) v = Math.min(v, Math.max(0, 55 - s.progress));
  s.progress = Math.min(100, s.progress + v);
  // being found out
  const tr = state.realms[t.realm];
  const vig = vigilance(state, t.realm) + 0.012 * s.backers.length + (s.progress > 70 ? 0.03 : 0) + (s.watched ? 0.12 : 0);
  if (!s.seen.includes(tr.id) && rng.chance(vig * (o.realm === t.realm ? 1 : 0.7))) return discover(state, map, s, tr.id, 'spymaster');
  if (!s.seen.includes(tr.id) && s.backers.length && rng.chance(0.008 * s.backers.length * ch)) return discover(state, map, s, tr.id, 'leak');
  if (s.progress >= 100) resolveScheme(state, map, s, rng);
  void R;
}

function embezzleTick(state, map, s, rng) {
  const o = state.chars[s.owner], t = state.chars[s.target], R = state.realms[t.realm];
  const take = Math.round(2 + o.stats.stw * 0.25 + (has(o, 'greedy') ? 2 : 0));
  s.progress += take;
  forHuman(state, R.id, () => { state.gold -= take; });
  const vig = vigilance(state, R.id) + 0.04;
  if (rng.chance(vig)) {
    const sec = ig(state).secrets.find(x => x.scheme === s.id && x.kind === 'plot');
    const deed = addSecret(state, { kind: 'deed', sin: 'embezzle', about: [o.id, t.id], text: `${o.name} has been robbing the treasury of ${R.name}`, sev: 2, known: [o.id] });
    if (sec) sec.dead = true;
    s.seen.push(R.id);
    if (isHumanRealm(state, R.id)) {
      learn(state, deed, R.id);
      forHuman(state, R.id, () => queueEvent(state, 'plot_found', { a: s.owner, b: s.target, scheme: s.id, how: 'audit', deed: deed.id }));
    } else {
      endScheme(state, s, 'failed', 'audited');
      reveal(state, deed, 'audit');
      if (t.id !== o.id) { o.imprisoned = true; }
    }
  }
}

// ---- who starts scheming, and why
const GRUDGE_TARGET_MIN = 30;

/** All the things `a` might be moved to do this season, with how strongly. */
function motives(state, map, a, R, court, rng, mode) {
  const out = [];
  const T = t => has(a, t);
  const ruler = state.chars[R.ruler];
  const heir = heirOf(state, ruler);
  const humanRealm = isHumanRealm(state, R.id);
  const mounted = mode && mode.player; // called from the human's own phase, so opinions of the ruler are real
  const ownerIsRuler = ruler.id === a.id;
  const feel = t => (mounted && t.id === ruler.id ? clamp(opinionOf(state, a).total, -100, 100) : regard(a, t));
  const rivals = new Map();
  const add = t => { if (t && t.alive && t.id !== a.id && ageOf(state, t) >= 14) rivals.set(t.id, t); };
  if (!ownerIsRuler) { add(ruler); add(heir); }
  add(a.spouse && state.chars[a.spouse]);
  for (const id of a.parents || []) add(state.chars[id]);
  for (const x of court) if (isKin(a, x) || (a.rel && a.rel[x.id] && a.rel[x.id].v <= -GRUDGE_TARGET_MIN)) add(x);
  for (const t of rivals.values()) {
    if (humanRealm && t.id === ruler.id && !mounted) continue;   // the human ruler is only ever a target in their own phase
    if (humanRealm && mounted && t.id !== ruler.id) continue;    // ...and then only the ruler
    const f = feel(t);
    const g = Math.max(0, -f - 10) / 100;
    // murder
    let sc = g * 0.9;
    sc += ((T('wrathful') ? 0.12 : 0) + (T('cruel') ? 0.1 : 0) + (T('proud') ? 0.08 : 0)) * (g > 0.1 ? 1 : 0.35);
    if (t.id === ruler.id && heir && heir.id === a.id) sc += (T('ambitious') ? 0.35 : 0.04) + (ageOf(state, ruler) > 58 ? 0.07 : 0) + (f < 0 ? 0.08 : 0);
    else if (t.id === ruler.id && (T('ambitious') || (a.claims && a.claims.includes(R.id)))) sc += 0.18;
    if (heir && t.id === heir.id && a.parents && ruler.children.includes(a.id)) sc += (T('ambitious') ? 0.3 : 0.03) + (T('proud') ? 0.05 : 0) + (ruler.heirPick === heir.id && a.born < heir.born ? 0.25 : 0);
    sc -= (T('kind') ? 0.25 : 0) + (T('honest') ? 0.12 : 0) + (T('content') ? 0.1 : 0) + (T('pious') ? 0.12 : 0) + (T('craven') ? 0.1 : 0) + (T('patient') ? 0.04 : 0);
    if (closeTo(a, t)) sc -= (T('cruel') || T('ambitious')) ? 0.04 : 0.22;
    if (f > 40) sc -= 0.3;
    if (sc > 0.08) out.push({ kind: 'murder', t, score: sc });
    // smear
    if (g > 0.15) {
      const sm = g * 0.55 + (T('deceitful') ? 0.14 : 0) + (T('witty') ? 0.03 : 0) + (T('craven') ? 0.06 : 0) - (T('honest') ? 0.2 : 0) - (T('kind') ? 0.08 : 0);
      if (sm > 0.1) out.push({ kind: 'smear', t, score: sm });
    }
  }
  // a coup
  if (!ownerIsRuler && !(humanRealm && !mounted)) {
    const f = feel(ruler);
    const friends = court.filter(x => x.id !== a.id && x.id !== ruler.id && regard(x, a) >= 5 && (mounted ? opinionOf(state, x).total <= 0 : regard(x, ruler) <= 5)).length;
    const unrest = humanRealm ? Math.max(0, 40 - (state.mood == null ? 60 : state.mood)) : (R.unrest || 0) * 0.5;
    let sc = (T('ambitious') ? 0.3 : 0) + (heir && heir.id === a.id ? 0.08 : 0) + (a.claims && a.claims.includes(R.id) ? 0.35 : 0) + (a.bastard ? 0.1 : 0)
      + Math.min(0.25, friends * 0.08) + unrest / 160 + (f < -20 ? 0.12 : 0) + ((ruler.marks || []).length * 0.07)
      - (T('content') ? 0.15 : 0) - (T('honest') ? 0.05 : 0) - (T('craven') ? 0.1 : 0) - (f > 30 ? 0.25 : 0);
    if (sc > 0.18 && (friends > 0 || (a.claims && a.claims.length) || unrest > 18)) out.push({ kind: 'coup', t: ruler, score: sc });
  }
  // a thief at the treasury
  if (!ownerIsRuler && (a.role === 'steward' || a.role === 'banker') && a.court && (!humanRealm || mounted)) {
    const sc = (T('greedy') ? 0.35 : 0.05) + (T('deceitful') ? 0.12 : 0) - (T('honest') ? 0.3 : 0) - (T('charitable') ? 0.1 : 0) - (T('pious') ? 0.1 : 0) - (feel(ruler) > 40 ? 0.1 : 0);
    if (sc > 0.15) out.push({ kind: 'embezzle', t: ruler, score: sc });
  }
  // a lover
  if (!(humanRealm && mounted) && ageOf(state, a) >= 16 && ageOf(state, a) <= 55 && !a.imprisoned) {
    const sp = a.spouse && state.chars[a.spouse];
    const base = 0.05 + (T('deceitful') ? 0.05 : 0) + (T('witty') || T('proud') ? 0.04 : 0) + (T('gluttonous') ? 0.03 : 0) + (sp && sp.alive && regard(a, sp) < 5 ? 0.09 : 0) - (sp && sp.alive && regard(a, sp) >= 25 ? 0.04 : 0) - (T('pious') ? 0.1 : 0) - (T('honest') ? 0.04 : 0) - (T('content') ? 0.03 : 0);
    if (base > 0.06) {
      const lovers = court.filter(x => x.id !== a.id && x.sex !== a.sex && ageOf(state, x) >= 16 && ageOf(state, x) <= 55 && !x.imprisoned && !(humanRealm && x.id === ruler.id));
      for (const t of rng.shuffle(lovers).slice(0, 3)) {
        let sc = base + regard(a, t) / 400;
        if (t.spouse && state.chars[t.spouse] && state.chars[t.spouse].alive) sc *= 0.7;
        if (isKin(a, t)) sc *= (T('cynical') || T('proud') || T('cruel')) ? 0.2 : 0.07;
        if (a.rel && a.rel[t.id] && a.rel[t.id].tag === 'Sweetheart') continue; // they will simply marry
        if (sc > 0.05) out.push({ kind: 'seduce', t, score: sc });
      }
    }
  }
  // a ruler with eyes on a neighbour's land
  if (ownerIsRuler && !humanRealm && map) {
    const ns = neighborsOfRealm(state, map, R.id).filter(n => !allied(state, n, R.id) && !atWar(state, n, R.id));
    if (ns.length) {
      const sc = R.aggression * 0.1 + (T('deceitful') ? 0.2 : 0) + (T('ambitious') ? 0.1 : 0) - (T('honest') ? 0.25 : 0) - (T('content') ? 0.1 : 0);
      if (sc > 0.15) { const tgt = ns.map(n => state.realms[n]).sort((x, y) => x.levies - y.levies)[0]; out.push({ kind: 'forge', t: state.chars[tgt.ruler], score: sc }); }
    }
  }
  return out;
}

function generate(state, map, rng, groups, onlyRealm, ch, mounted) {
  const g = ig(state);
  const busy = new Set(g.schemes.filter(s => s.status === 'active' || s.status === 'striking').map(s => s.owner));
  const live = g.schemes.filter(s => s.status === 'active' && s.by == null).length;
  if (!mounted && live >= 4 + Math.floor(state.realms.length / 3)) return;
  let started = 0;
  for (const R of state.realms) {
    if (!R.alive || (onlyRealm != null && R.id !== onlyRealm)) continue;
    const court = (groups[R.id] || []).filter(c => ageOf(state, c) >= 14);
    if (court.length < 2) continue;
    for (const a of court) {
      if (busy.has(a.id) || a.imprisoned || ageOf(state, a) < 16) continue;
      if (!mounted && isHumanRealm(state, R.id) && R.ruler === a.id) continue;
      if (mounted && a.id === R.ruler) continue;
      const cands = motives(state, map, a, R, court, rng, { player: !!mounted });
      if (!cands.length) continue;
      const best = cands.reduce((m, c) => (c.score * SCHEMES[c.kind].rate > m.score * SCHEMES[m.kind].rate ? c : m), cands[0]);
      const p = clamp(best.score, 0, 1) ** 2 * SCHEMES[best.kind].rate * ch * (mounted ? 1.0 : 1.0);
      if (!rng.chance(p)) continue;
      const pick = rng.weighted(cands.map(c => [c, Math.max(0.01, c.score * SCHEMES[c.kind].rate) ** 2]));
      if (schemeBlock(state, map, pick.kind, a, pick.t)) continue;
      startNpcScheme(state, pick, a);
      busy.add(a.id);
      if (++started >= 3) return;
    }
  }
}

function startNpcScheme(state, pick, a) {
  const s = startScheme(state, pick.kind, a, pick.t, { why: pick.kind });
  return s;
}

/** Grudge plots against the human ruler by their own court, and hostile rulers abroad (needs a spy on the inside). */
export function intrigueAgainstPlayer(state, map, rng) {
  const ch = chaosMult(state), R = playerRealm(state);
  if (!R || state.gameOver) return;
  generate(state, map, rng, byRealm(state), R.id, ch, true);
  // rulers who hate you, with a man inside your court
  const spies = spiesOf(state, null, R.id).filter(x => x.owner !== R.id);
  const g = ig(state);
  for (const sp of spies) {
    const r = state.realms[sp.owner];
    if (!r || !r.alive || isHumanRealm(state, r.id)) continue;
    const ruler = state.chars[r.ruler];
    if (g.schemes.some(s => s.status === 'active' && (s.owner === ruler.id))) continue;
    const o = opinionOf(state, ruler).total;
    const hostile = (o < -25 ? 0.12 : 0) + (atWar(state, r.id, R.id) ? 0.12 : 0) + (has(ruler, 'cruel') ? 0.04 : 0) + (has(ruler, 'deceitful') ? 0.05 : 0) - (has(ruler, 'honest') ? 0.12 : 0) - (allied(state, r.id, R.id) ? 0.2 : 0);
    if (hostile > 0.1 && rng.chance(hostile * 0.55 * ch)) {
      const kind = rng.weighted([['murder', 1.2], ['smear', 1.2], ['forge', 1]]);
      const tgt = kind === 'forge' ? state.chars[R.ruler] : state.chars[R.ruler];
      const own = ruler;
      if (kind === 'forge' ? !schemeBlock(state, map, 'forge', own, tgt) : !schemeBlock(state, map, kind, own, tgt)) { startScheme(state, kind, own, tgt, { why: 'hostile' }); break; }
    }
  }
}

/** NPC rulers put spies in the courts of neighbours they distrust (or covet). */
function spyWar(state, map, rng, ch) {
  const g = ig(state);
  for (const R of state.realms) {
    if (!R.alive || isHumanRealm(state, R.id) || !map) continue;
    if (!rng.chance(0.03 * R.aggression * ch)) continue;
    const ns = neighborsOfRealm(state, map, R.id).filter(n => !allied(state, n, R.id) && !g.spies.some(x => !x.gone && x.owner === R.id && x.in === n));
    if (!ns.length) continue;
    const to = rng.pick(ns);
    g.spies.push({ id: nid(state, 'y'), owner: R.id, in: to, since: state.turn, skill: rng.int(6, 16), hidden: true });
  }
}

// ---- leaks and gossip
function secretsTick(state, map, rng, ch) {
  const g = ig(state);
  for (const sec of g.secrets.slice()) {
    if (sec.pub || sec.dead || sec.hush > state.turn) continue;
    if (sec.kind === 'rumour' || sec.kind === 'authorship' && false) continue;
    const knowers = sec.known.map(id => state.chars[id]).filter(c => c && c.alive);
    if (!knowers.length) continue;
    const subj = state.chars[sec.about[0]];
    for (const k of knowers) {
      const gossip = k.quirk && /gossip/.test(k.quirk) ? 3 : 1;
      if (rng.chance(0.012 * ch * gossip * (has(k, 'deceitful') ? 0.6 : 1))) {
        const friends = Object.entries(k.rel || {}).filter(([id, e]) => e.v >= 15 && state.chars[id] && state.chars[id].alive && !sec.known.includes(id)).map(([id]) => id);
        if (friends.length) sec.known.push(rng.pick(friends));
      }
      if (subj && k.id !== subj.id && regard(k, subj) <= -30 && rng.chance(0.02 * ch)) { reveal(state, sec, 'spite'); break; }
      if (sec.sev >= 2 && (has(k, 'honest') || has(k, 'pious')) && !(subj && k.id === subj.id) && !(sec.kind === 'plot' && s_backer(state, sec, k)) && rng.chance(0.012 * ch)) { reveal(state, sec, 'conscience'); break; }
    }
    if (!sec.pub && sec.known.length >= 5 && rng.chance(0.08)) reveal(state, sec, 'loose lips');
  }
  // a rumour that has made the rounds may be traced to its author
  for (const sec of g.secrets) {
    if (sec.kind !== 'authorship' || sec.pub || sec.dead) continue;
    const t = state.chars[sec.about[1]];
    if (t && t.alive && rng.chance(vigilance(state, t.realm) * 0.3)) reveal(state, sec, 'traced');
  }
}
const s_backer = (state, sec, k) => { const s = schemeById(state, sec.scheme); return !!s && (s.owner === k.id || s.backers.includes(k.id)); };

/** Lovers conceive. Children of affairs are born illegitimate; children of kin carry the family's weakness. */
function affairsTick(state, map, rng, ch) {
  const g = ig(state);
  for (const sec of g.secrets) {
    if (sec.kind !== 'affair' || sec.dead) continue;
    const [a, b] = sec.about.map(id => state.chars[id]);
    if (!a || !b || !a.alive || !b.alive) { sec.dead = true; continue; }
    const mother = a.sex === 'f' ? a : b, father = mother === a ? b : a;
    if (ageOf(state, mother) < 16 || ageOf(state, mother) > 42 || !rng.chance(0.045 * ch)) continue;
    if ((mother.children || []).filter(id => state.chars[id] && state.chars[id].alive).length >= 6) continue;
    const kid = makeChar(state, rng, { realm: mother.realm, heritage: mother.heritage, house: father.house, role: 'child', age: 0, parents: [father.id, mother.id] });
    kid.bastard = true; kid.legit = false;
    if (sec.sin === 'incest') { kid.born_of = 'incest'; for (const k of Object.keys(kid.stats)) kid.stats[k] = Math.max(1, kid.stats[k] - 3); }
    father.children.push(kid.id); mother.children.push(kid.id);
    const hush = addSecret(state, { kind: 'bastard', sin: sec.sin, about: [father.id, kid.id], text: `${father.name} is the true father of ${mother.name}'s child ${kid.name}`, sev: sec.sev, known: [father.id, mother.id], of: sec.id });
    news(state, { kind: 'birth', icon: '👶', text: `${mother.name} has had a child, ${kid.name}.`, ids: [mother.id, kid.id], realms: [mother.realm], note: false });
    void hush;
  }
}

/** New faces turn up at NPC courts, so there are always ambitious people about. */
function arrivals(state, rng, groups, ch) {
  for (const R of state.realms) {
    if (!R.alive || isHumanRealm(state, R.id)) continue;
    const court = groups[R.id] || [];
    if (court.length >= 7 || !rng.chance(0.035 * ch)) continue;
    const her = rng.chance(0.8) ? R.heritage : R.heritage;
    const c = makeChar(state, rng, { realm: R.id, heritage: her, house: R.house, role: 'courtier', age: rng.int(18, 46), court: true });
    c.op0 = c.opinion = rng.int(-10, 20);
    (groups[R.id] = groups[R.id] || []).push(c);
    lifeNote(state, c, `Joined the court of ${R.name}.`);
  }
}

/** Tyranny and loss breed unrest; unrest is what coups feed on. It ebbs by itself. */
function unrestTick(state, map, rng, ch) {
  for (const R of state.realms) {
    if (!R.alive) continue;
    const u = R.unrest || 0;
    const wars = state.wars.filter(w => w.attacker === R.id || w.defender === R.id);
    const losing = wars.filter(w => (w.attacker === R.id ? w.score : -w.score) < -30).length;
    const ruler = state.chars[R.ruler];
    const heir = ruler && heirOf(state, ruler);
    // a bad harvest, a grasping steward, a hated tax: every realm has bad seasons, the badly ruled have more of them
    let add = rng.range(0, 1.2) * ch + wars.length * 0.7 + losing * 3 + (!heir ? 0.5 : 0) + (has(ruler, 'cruel') ? 0.3 : 0) + (ruler && ageOf(state, ruler) > 66 ? 0.3 : 0) + (R.levies < 80 ? 0.7 : 0) - (has(ruler, 'kind') ? 0.3 : 0);
    if (isHumanRealm(state, R.id)) add = 0; // a human realm's unrest comes from what the human does (see humanUnrest)
    R.unrest = clamp(u * 0.9 + Math.max(0, add), 0, 100);
  }
}

/** The best heir an NPC realm can find when the ruler leaves none: kin first, then the ablest adult at court. */
export function successorFor(state, realm, dead) {
  const kin = Object.values(state.chars).filter(c => c.alive && c.realm === realm.id && c.id !== dead.id && ageOf(state, c) >= 16 && !(c.bastard && !c.legit) && !c.imprisoned);
  const score = c => (isKin(c, dead) ? 30 : 0) + (c.spouse === dead.id ? 10 : 0) + c.stats.mar + c.stats.dip - ageOf(state, c) * 0.1 - (c.sex === 'f' ? 0 : 0);
  kin.sort((a, b) => score(b) - score(a));
  return kin[0] || null;
}

// ---------------------------------------------------------------- the human's phase
export function intriguePlayer(state, map, rng) {
  if (state.gameOver) return;
  const R = playerRealm(state), g = ig(state), ch = chaosMult(state);
  intrigueAgainstPlayer(state, map, rng);
  deliverNews(state, map);
  sweepAndWarnings(state, map, rng, ch);
  spyIntel(state, map, rng);
  blackmailTick(state, map, rng, ch);
  poachTick(state, map, rng, ch);
  void R; void g;
}

function deliverNews(state, map) {
  const me = state.playerRealm, near = new Set(neighborsOfRealm(state, map, me));
  const spyIn = new Set(spiesOf(state, me).map(x => x.in));
  const fl = state.flags;
  let shown = 0;
  for (const n of ig(state).news) {
    if (n.turn !== state.turn || !n.pub) continue;
    const here = (n.realms || []).some(r => r === me || near.has(r) || allied(state, r, me) || !!atWar(state, r, me) || spyIn.has(r)) || (n.ids || []).some(id => state.chars[id] && state.chars[id].realm === me);
    if (!here) continue;
    record(state, n.text, { kind: 'intrigue', chars: n.ids, mem: n.major });
    if (shown++ < 3) (fl.lastTurnEvents || (fl.lastTurnEvents = [])).push({ icon: n.icon, text: n.text });
  }
}

/** The spymaster hears things; friends warn you. */
function sweepAndWarnings(state, map, rng, ch) {
  const R = playerRealm(state), g = ig(state), pl = player(state);
  const sp = roleHolder(state, R.id, 'spymaster');
  const court = new Set(livingCourt(state, R.id).map(c => c.id));
  for (const sec of g.secrets) {
    if (sec.pub || sec.dead || sec.seen.includes(R.id)) continue;
    const mineAbout = sec.about.some(id => court.has(id)) || (sec.kind === 'plot' && (schemeById(state, sec.scheme) || {}).target === pl.id);
    if (!mineAbout) continue;
    // the spymaster picks it up
    if (sp && rng.chance(0.025 + sp.stats.int * 0.004)) {
      if (sec.kind === 'plot') { const s = schemeById(state, sec.scheme); if (s && s.status === 'active') { const t = state.chars[s.target]; if (t) { discover(state, map, s, t.realm, 'spymaster'); continue; } } }
      if (learn(state, sec, R.id)) state.flags.lastTurnEvents.push({ icon: '🗝', text: `${sp.name} whispers: ${sec.text}.` });
      continue;
    }
    // a friend warns you
    if (sec.kind === 'plot') {
      const s = schemeById(state, sec.scheme);
      if (s && s.status === 'active' && s.target === pl.id) {
        const friend = sec.known.map(id => state.chars[id]).find(k => k && k.alive && k.realm === R.id && k.id !== s.owner && opinionOf(state, k).total >= 35 && !s.backers.includes(k.id));
        if (friend && rng.chance(0.1 + (has(friend, 'honest') ? 0.08 : 0))) { discover(state, map, s, R.id, 'warning'); const e = state.queue[state.queue.length - 1]; if (e && e.cast) e.cast.warner = friend.id; }
      }
    }
  }
}

function spyIntel(state, map, rng) {
  const me = state.playerRealm, g = ig(state), R = playerRealm(state);
  const mySp = roleHolder(state, me, 'spymaster');
  for (const sp of g.spies.slice()) {
    if (sp.gone) continue;
    if (sp.owner === me) {
      const target = state.realms[sp.in];
      if (!target || !target.alive) { sp.gone = true; continue; }
      const tsm = roleHolder(state, target.id, 'spymaster');
      const caught = clamp(0.05 + (tsm ? tsm.stats.int * 0.004 : 0.02) - (mySp ? mySp.stats.int * 0.003 : 0), 0.02, 0.3);
      if (rng.chance(caught)) {
        sp.gone = true; sp.caught = true;
        const ruler = state.chars[target.ruler];
        addMod(ruler, 'Caught your spy', -18, 16, 'spycaught');
        record(state, `Your spy in ${target.name} was caught. ${fullName(state, ruler)} is not pleased.`, { kind: 'intrigue', chars: [ruler.id] });
        state.flags.lastTurnEvents.push({ icon: '🕵', text: `Your spy in ${target.name} was caught!` });
        continue;
      }
      if (!rng.chance(0.55)) continue;
      reportFromSpy(state, map, rng, sp, target);
    } else if (sp.in === me && !sp.found) {
      const detect = clamp(0.03 + (mySp ? mySp.stats.int * 0.007 : 0.01) + ((g.sweep[me] || 0) > state.turn ? 0.2 : 0), 0, 0.5);
      if (rng.chance(detect) && state.queue.length < QUEUE_SOFT + 1) {
        sp.found = true;
        queueEvent(state, 'spy_found', { a: state.realms[sp.owner].ruler, realm: sp.owner, spy: sp.id });
      }
    }
  }
  informants(state, rng);
  void R;
}

/** Courtiers asked in an audience to watch someone: now and then they bring you something. */
function informants(state, rng) {
  const me = state.playerRealm, g = ig(state);
  for (const w of g.watch) {
    if (w.gone) continue;
    const by = state.chars[w.by], on = state.chars[w.on];
    if (!by || !on || !by.alive || !on.alive || by.realm !== me || by.imprisoned || state.turn >= w.until) { w.gone = true; continue; }
    if (!rng.chance(0.45)) continue;
    const pool = g.secrets.filter(x => !x.pub && !x.dead && !x.seen.includes(me) && x.about.includes(on.id));
    if (pool.length && rng.chance(0.7)) {
      const sec = rng.pick(pool);
      if (sec.kind === 'plot') { const s = schemeById(state, sec.scheme); if (s && s.status === 'active') { discover(state, null, s, me, 'informant'); continue; } }
      learn(state, sec, me); sec.viaSpy = true;
      state.flags.lastTurnEvents.push({ icon: '🕵', text: `${by.name} reports on ${on.name}: ${sec.text}.` });
    } else if (rng.chance(0.4)) {
      const l = (on.log || []).slice(-1)[0];
      state.flags.lastTurnEvents.push({ icon: '🕵', text: `${by.name} reports on ${on.name}: ${l ? l.t : 'nothing out of the ordinary, so far.'}` });
    }
  }
}

function reportFromSpy(state, map, rng, sp, target) {
  const me = state.playerRealm, g = ig(state);
  const pool = g.secrets.filter(x => !x.pub && !x.dead && !x.seen.includes(me) && x.about.some(id => state.chars[id] && state.chars[id].realm === target.id));
  const fl = state.flags;
  if (pool.length && rng.chance(0.65)) {
    const sec = rng.pick(pool);
    learn(state, sec, me);
    sec.viaSpy = true;
    fl.lastTurnEvents.push({ icon: '🕵', text: `Your spy in ${target.name} reports: ${sec.text}.` });
    return;
  }
  const ruler = state.chars[target.ruler];
  const w = state.wars.find(x => x.attacker === target.id || x.defender === target.id);
  const line = w ? `${target.name} is at war with ${state.realms[w.attacker === target.id ? w.defender : w.attacker].name}; ${target.levies} men under arms.`
    : `${target.name} keeps ${target.levies} men under arms. ${fullName(state, ruler)} seems ${opinionOf(state, ruler).total < -10 ? 'unfriendly' : 'calm'}.`;
  fl.lastTurnEvents.push({ icon: '🕵', text: `Your spy in ${target.name}: ${line}` });
}

/** Someone who knows a real secret of yours asks for money. */
function blackmailTick(state, map, rng, ch) {
  if (state.queue.length >= QUEUE_SOFT || !rng.chance(0.2)) return;
  const g = ig(state), pl = player(state), me = state.playerRealm;
  const mine = g.secrets.filter(x => !x.pub && !x.dead && x.truth && x.about[0] === pl.id && x.sin && x.hush <= state.turn);
  if (!mine.length) return;
  const sec = rng.pick(mine);
  const who = sec.known.map(id => state.chars[id]).filter(c => c && c.alive && c.id !== pl.id && c.realm === me && !c.imprisoned && (has(c, 'greedy') || has(c, 'deceitful') || has(c, 'ambitious') || opinionOf(state, c).total < -10));
  if (!who.length || state.queue.some(q => q.id === 'blackmail')) return;
  const c = rng.pick(who);
  queueEvent(state, 'blackmail', { a: c.id, secret: sec.id, amount: clamp(Math.round(state.gold * 0.3 / 5) * 5, 30, 150) });
  void ch; void map;
}

/** Neighbouring rulers court your councillors. */
function poachTick(state, map, rng, ch) {
  if (state.queue.length >= QUEUE_SOFT || !rng.chance(0.05 * ch)) return;
  const me = state.playerRealm;
  const cn = Object.values(council(state)).filter(c => c.court && !c.imprisoned && ['chancellor', 'marshal', 'steward', 'spymaster', 'priest'].includes(c.role) && opinionOf(state, c).total < 30);
  const ns = neighborsOfRealm(state, map, me).filter(n => !isHumanRealm(state, n) && !allied(state, n, me));
  if (!cn.length || !ns.length) return;
  const c = rng.pick(cn), r = state.realms[rng.pick(ns)];
  queueEvent(state, 'poach', { a: c.id, b: r.ruler, realm: r.id });
}

// ---------------------------------------------------------------- what a client may see (shared worlds)
/** The intrigue ledger as one realm may see it. Secrets and plots you do not know of never leave the server. */
export function igFor(state, realmId) {
  const g = ig(state);
  const secrets = g.secrets.filter(s => s.pub || s.seen.includes(realmId));
  const schemes = g.schemes.filter(s => s.by === realmId || s.seen.includes(realmId));
  const ids = new Set();
  for (const s of secrets) { for (const i of s.about) ids.add(i); }
  for (const s of schemes) { ids.add(s.owner); ids.add(s.target); }
  return {
    n: g.n,
    // a rumour you have not checked might be a lie: the client is not told which
    secrets: secrets.map(s => ({ ...s, truth: s.kind === 'rumour' && !s.confirmed && !s.debunked ? null : s.truth, known: s.known.length, seen: s.seen.filter(r => r === realmId) })),
    schemes: schemes.map(s => ({ ...s, backers: s.by === realmId ? s.backers : [], seen: s.seen.filter(r => r === realmId) })),
    spies: g.spies.filter(x => !x.gone && (x.owner === realmId || (x.in === realmId && x.found))),
    watch: g.watch.filter(w => !w.gone && w.owner === realmId),
    claims: g.claims.filter(c => c.by === realmId || c.over === realmId),
    sweep: { [realmId]: g.sweep[realmId] || 0 },
    news: [],
  };
}

// ---- justice, for events (kept here so events need not import the big actions module)
export function jailChar(state, c) {
  c.imprisoned = true;
  state.stats.imprisoned = (state.stats.imprisoned || 0) + 1;
  addMod(c, 'Imprisoned me', -60, 60, 'jailed'); c.mods[c.mods.length - 1].inherit = true;
  for (const o of Object.values(council(state))) addMod(o, 'Fears the dungeon', -5, 8, 'fear');
}
export function executeChar(state, map, c) {
  const kin = Object.values(state.chars).filter(o => o.alive && o.id !== c.id && o.realm === state.playerRealm && closeTo(o, c));
  record(state, `${fullName(state, player(state))} had ${c.name} executed.`, { kind: 'execution', chars: [c.id] });
  kill(state, map, c, 'execution');
  state.stats.executions = (state.stats.executions || 0) + 1;
  for (const o of Object.values(council(state))) addMod(o, 'Fears the headsman', -10, 14, 'fear');
  for (const k of kin) { addMod(k, 'Executed my kin', -70, 80, 'executed:' + c.id); k.mods[k.mods.length - 1].inherit = true; }
  state.mood = Math.max(0, (state.mood == null ? 60 : state.mood) - 6);
  state.prestige -= 4;
}

// helpers used by events and actions
export { roleHolder, isRulerChar, closeTo, endScheme, caught, rulerOf, byRealm };
export const secretLabel = sec => (sec.kind === 'plot' ? 'A plot' : sec.kind === 'deed' ? 'A crime' : sec.kind === 'affair' ? 'An affair' : sec.kind === 'bastard' ? 'A bastard' : sec.kind === 'rumour' ? 'A rumour' : sec.kind === 'order' ? 'An order' : sec.kind === 'authorship' ? 'A lie\'s author' : 'A secret');
export { faithOf, withPlayer, humanPid, provincesOf, regard, short };
