// What a ruler can DO in the shadows: plot, recruit, spy, gossip, expose, blackmail, shuffle the council, favour an heir.
// Every one of these works from buttons alone; the audience (LLM) only adds a way to ask in words, and goes through the
// very same functions (see intrigueFate / applyIntrigueGrant).
import { RNG, clamp } from './rng.js';
import {
  player, playerRealm, council, record, addMod, fullName, roleLabel, opinionOf, ageOf, regard, bumpRegard, bumpBoth, livingCourt,
  isHumanRealm, COUNCIL, SINS, heirOf, refreshRoles, neighborsOfRealm, allied, atWar, lifeNote,
} from './world.js';
import {
  ig, SCHEMES, PLAYER_SCHEMES, schemeBlock, startScheme, addBacker, backerChance, secretById, schemeById, learn, reveal, stain, spiesOf, discover,
  endScheme, schemeOdds, roleHolder, isKin, isRulerChar, addSecret, news, vigilance, closeTo, knowsSecret, watchesOf,
} from './intrigue.js';

const has = (c, t) => !!c && c.traits.includes(t);
const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra);
const no = msg => ({ ok: false, msg });
let nonce = 0;
const roll = (state, label) => new RNG(`ig:${state.seed}:${state.turn}:${label}:${++nonce}`);
const myScheme = (state, id) => { const s = schemeById(state, id); return s && s.by === state.playerRealm ? s : null; };

// ---------------------------------------------------------------- plots
/** Would `agent` do this for the ruler? */
export function agentWilling(state, agent, kind, target) {
  const pl = player(state);
  if (agent.id === pl.id) return { p: 1, why: 'you' };
  let p = 0.5 + opinionOf(state, agent).total / 140 - regard(agent, target) / 160;
  if (kind === 'murder') p += (has(agent, 'cruel') || has(agent, 'wrathful') ? 0.15 : 0) + (has(agent, 'ambitious') ? 0.08 : 0) - (has(agent, 'kind') ? 0.3 : 0) - (has(agent, 'honest') ? 0.2 : 0) - (has(agent, 'pious') ? 0.15 : 0) - (isKin(agent, target) ? 0.3 : 0);
  if (kind === 'smear' || kind === 'forge') p += (has(agent, 'deceitful') ? 0.15 : 0) - (has(agent, 'honest') ? 0.25 : 0);
  if (agent.role === 'spymaster') p += 0.15;
  return { p: clamp(p, 0.03, 0.95), why: p > 0.6 ? 'willing' : p > 0.35 ? 'might' : 'unlikely' };
}

/** Everyone in the realm who could carry out a scheme for the ruler, with how willing they are. */
export function agentsFor(state, kind, target) {
  const pl = player(state);
  const list = [{ c: pl, p: 1, why: 'yourself' }];
  for (const c of livingCourt(state, state.playerRealm)) {
    if (c.id === pl.id || c.imprisoned || ageOf(state, c) < 16 || c.id === target.id) continue;
    if (!c.court && c.role !== 'spouse' && c.role !== 'heir') continue;
    list.push({ c, ...agentWilling(state, c, kind, target) });
  }
  return list;
}

export function startPlot(state, map, kind, targetId, agentId) {
  const K = SCHEMES[kind], pl = player(state), t = state.chars[targetId];
  if (!K || !K.player) return no('Unknown scheme.');
  if (!t) return no('Nobody there.');
  if (state.players && t.realm !== state.playerRealm && isHumanRealm(state, t.realm)) return no('Not against another player. Write them a letter instead.');
  const agent = agentId && agentId !== pl.id ? state.chars[agentId] : pl;
  if (!agent || (agent.id !== pl.id && agent.realm !== state.playerRealm)) return no('That person is not in your service.');
  const block = schemeBlock(state, map, kind, agent, t);
  if (block) return no(block);
  if (state.gold < K.cost) return no(`${K.label} costs ${K.cost} gold.`);
  if (agent.id !== pl.id) {
    const w = agentWilling(state, agent, kind, t);
    if (!roll(state, `agent:${agent.id}:${t.id}`).chance(w.p)) {
      addMod(agent, 'Asked to do dark deeds', -12, 10, 'darkdeed');
      // an honest refusal may be an honest report
      if ((has(agent, 'honest') || has(agent, 'pious')) && roll(state, 'tell').chance(0.25)) {
        const s = startScheme(state, kind, pl, t, { by: state.playerRealm });
        s.progress = 0; endScheme(state, s, 'failed', 'a servant refused');
        addSecret(state, { kind: 'order', sin: kind === 'murder' ? 'murder' : 'slander', about: [pl.id, t.id], text: `${pl.name} asked ${agent.name} to ${K.verb(t)}`, sev: 2, known: [agent.id] });
        return no(`${agent.name} recoils, and you hear them whisper to a priest as they leave. (That may come back to haunt you.)`);
      }
      return no(`${agent.name} will not do it. You hear no more of it. (They will remember you asked.)`);
    }
  }
  state.gold -= K.cost;
  const s = startScheme(state, kind, agent, t, { by: state.playerRealm, patron: agent.id === pl.id ? null : pl.id });
  return ok(`${agent.id === pl.id ? 'You set' : `${agent.name} sets`} the ${K.label.toLowerCase()} in motion against ${t.name}. Check the Intrigue window.`, { scheme: s.id });
}

export function recruitBacker(state, map, schemeId, charId) {
  const s = myScheme(state, schemeId), c = state.chars[charId];
  if (!s || s.status !== 'active') return no('No such plot.');
  const K = SCHEMES[s.kind];
  if (s.backers.length >= K.maxBackers) return no('There are enough hands in this already.');
  s.asked = s.asked || {};
  if (s.asked[charId] != null && state.turn - s.asked[charId] < 3) return no(`You asked ${c.name} not long ago.`);
  const w = backerChance(state, s, c);
  if (w.p <= 0) return no(`${c.name} is not available (${w.why}).`);
  s.asked[charId] = state.turn;
  if (roll(state, `recruit:${s.id}:${c.id}`).chance(w.p)) {
    addBacker(state, s, c);
    return ok(`${c.name} is in. One more mouth that can talk.`);
  }
  // refusal: a loose tongue might warn the target
  const t = state.chars[s.target];
  if ((has(c, 'honest') || has(c, 'pious') || regard(c, t) > 30) && roll(state, `warn:${s.id}:${c.id}`).chance(0.35)) {
    discover(state, map, s, t.realm, 'refusal');
    return no(`${c.name} refuses, and goes straight to ${t.name}. The plot is blown.`);
  }
  addMod(c, 'Asked me to join a plot', -8, 8, 'plotask');
  return no(`${c.name} wants no part of it, and says nothing. This time.`);
}

export function fundScheme(state, map, schemeId, amount) {
  const s = myScheme(state, schemeId);
  if (!s || s.status !== 'active') return no('No such plot.');
  amount = clamp(Math.round(+amount || 25), 5, 200);
  if (s.gold >= 200) return no('More gold will not help.');
  if (state.gold < amount) return no('Not enough gold.');
  state.gold -= amount; s.gold += amount;
  return ok(`${amount} gold greases the wheels.`);
}

export function abandonScheme(state, map, schemeId) {
  const s = myScheme(state, schemeId);
  if (!s || s.status !== 'active') return no('No such plot.');
  endScheme(state, s, 'failed', 'abandoned');
  return ok('You call it off. The less said, the better.');
}

// ---------------------------------------------------------------- watching
export function hireSpy(state, map, realmId) {
  const r = state.realms[realmId], g = ig(state);
  if (!r || !r.alive || realmId === state.playerRealm) return no('No such realm.');
  if (state.players && isHumanRealm(state, realmId)) return no('Another player rules there: spying on them is not allowed.');
  const mine = spiesOf(state, state.playerRealm);
  if (mine.length >= 4) return no('Four spies is plenty to feed.');
  if (mine.some(x => x.in === realmId)) return no(`You already have a spy in ${r.name}.`);
  if (state.gold < 40) return no('A spy costs 40 gold to place, and 2 a season to keep.');
  state.gold -= 40;
  const sp = council(state).spymaster;
  g.spies.push({ id: 'y' + g.n++, owner: state.playerRealm, in: realmId, since: state.turn, skill: 8 + (sp ? Math.round(sp.stats.int / 2) : 0) });
  return ok(`A quiet man with a forgettable face sets out for ${r.name}.`);
}

export function dismissSpy(state, map, spyId) {
  const sp = ig(state).spies.find(x => x.id === spyId && x.owner === state.playerRealm && !x.gone);
  if (!sp) return no('No such spy.');
  sp.gone = true;
  return ok('Your agent is recalled, and will never speak of it.');
}

/** The spymaster turns the court upside down: more chance to find plots against you for a few seasons. */
export function sweepCourt(state, map) {
  const g = ig(state), R = playerRealm(state), cn = council(state);
  if (state.gold < 30) return no('A sweep costs 30 gold in bribes and candles.');
  if ((g.sweep[R.id] || 0) > state.turn) return no('Your spymaster is already on it.');
  state.gold -= 30; g.sweep[R.id] = state.turn + 3;
  const sp = cn.spymaster, skill = sp ? sp.stats.int : 4;
  let found = 0;
  for (const s of g.schemes) {
    if (s.status !== 'active' || s.seen.includes(R.id) || s.by === R.id) continue;
    const t = state.chars[s.target];
    if (!t || t.realm !== R.id) continue;
    if (roll(state, `sweep:${s.id}`).chance(0.35 + skill * 0.015)) { discover(state, map, s, R.id, 'sweep'); found++; }
  }
  const court = new Set(livingCourt(state, R.id).map(c => c.id));
  for (const sec of g.secrets) {
    if (sec.pub || sec.dead || sec.seen.includes(R.id) || sec.kind === 'plot' || !sec.about.some(id => court.has(id))) continue;
    if (roll(state, `sweep:${sec.id}`).chance(0.25 + skill * 0.012) && learn(state, sec, R.id)) found++;
  }
  return ok(found ? `${sp ? sp.name : 'Your servants'} turn up ${found} thing${found > 1 ? 's' : ''}. See the Intrigue window.` : 'Nothing found. Either all is well, or someone is very good.');
}

/** Dig into one person: spymaster, spies, and a little gold. */
export function investigate(state, map, charId) {
  const c = state.chars[charId], R = playerRealm(state), g = ig(state);
  if (!c || !c.alive) return no('Nobody to investigate.');
  if (state.gold < 20) return no('Investigating costs 20 gold.');
  const key = 'inv' + charId;
  if (state.flags[key] != null && state.turn - state.flags[key] < 3) return no('You have only just looked into them.');
  const near = c.realm === R.id || spiesOf(state, R.id, c.realm).length > 0 || (map && neighborsOfRealm(state, map, R.id).includes(c.realm));
  if (!near) return no('Too far away. A spy in their court would help.');
  state.gold -= 20; state.flags[key] = state.turn;
  const sp = council(state).spymaster;
  const power = 0.28 + (sp ? sp.stats.int * 0.014 : 0) + (spiesOf(state, R.id, c.realm).length ? 0.2 : 0) + (c.realm === R.id ? 0.1 : 0);
  const pool = g.secrets.filter(s => !s.dead && !s.pub && !s.seen.includes(R.id) && s.about.includes(c.id));
  let found = 0;
  for (const sec of pool) {
    if (!roll(state, `inv:${sec.id}`).chance(power)) continue;
    if (sec.kind === 'plot') { const s = schemeById(state, sec.scheme); if (s && s.status === 'active') { const t = state.chars[s.target]; discover(state, map, s, t.realm, 'investigation'); found++; continue; } }
    if (learn(state, sec, R.id)) { sec.confirmed = true; found++; }
  }
  return found ? ok(`Your people find ${found} thing${found > 1 ? 's' : ''} about ${c.name}.`) : ok(`${c.name} seems clean, or careful. (You found nothing.)`);
}

/** Check a rumour: true, or an invention? */
export function verifyRumour(state, map, secretId) {
  const sec = secretById(state, secretId), R = playerRealm(state);
  if (!sec || !knowsSecret(state, sec)) return no('No such secret.');
  if (sec.confirmed || sec.debunked) return no('Already checked.');
  if (state.gold < 15) return no('Checking costs 15 gold.');
  const sp = council(state).spymaster;
  state.gold -= 15;
  if (!roll(state, `verify:${sec.id}`).chance(0.45 + (sp ? sp.stats.int * 0.018 : 0))) return ok('Your people could not settle it either way.');
  if (sec.truth) { sec.confirmed = true; return ok('Confirmed: it is true.'); }
  sec.debunked = true;
  const auth = ig(state).secrets.find(x => x.kind === 'authorship' && x.of === sec.id);
  if (auth && roll(state, `author:${sec.id}`).chance(0.5)) { learn(state, auth, R.id); return ok('It is a lie, and your people traced it to its author.'); }
  return ok('It is a lie. Nobody can say whose.');
}

// ---------------------------------------------------------------- gossip, exposure, blackmail
export function askGossip(state, map, charId) {
  const c = state.chars[charId], R = playerRealm(state), g = ig(state);
  if (!c || !c.alive || c.id === player(state).id) return no('Nobody to ask.');
  const key = 'gos' + charId;
  if (state.flags[key] === state.turn) return no(`${c.name} has told you all they will this season.`);
  const o = opinionOf(state, c).total;
  const gossipy = c.quirk && /gossip/.test(c.quirk);
  const eager = (c.role === 'spymaster' || c.role === 'priest' || c.role === 'jester' ? 12 : 0) + (gossipy ? 20 : 0) + (has(c, 'deceitful') ? 6 : 0);
  if (o + eager < 8) return no(`${c.name} gives you a look. "I wouldn't know anything about that." (They do not like you enough.)`);
  state.flags[key] = state.turn;
  const pool = g.secrets.filter(s => !s.dead && !s.pub && !s.seen.includes(R.id) && s.known.includes(c.id) && !s.about.slice(0, 1).includes(c.id));
  // they will not sell out the people they love
  const fair = pool.filter(s => !s.about.some(id => state.chars[id] && regard(c, state.chars[id]) >= 35 && !has(c, 'deceitful')));
  if (fair.length) {
    const sec = roll(state, `gossip:${c.id}`).pick(fair);
    if (sec.kind === 'plot') { const s = schemeById(state, sec.scheme); if (s && s.status === 'active') { discover(state, map, s, state.chars[s.target].realm, 'gossip'); return ok(`${c.name} lowers their voice. A plot! See the Intrigue window.`); } }
    learn(state, sec, R.id);
    return ok(`${c.name} leans in: "${sec.text}."`);
  }
  // nothing real to share: a deceitful talker invents something
  if (has(c, 'deceitful') && roll(state, `lie:${c.id}`).chance(0.5)) {
    const targets = livingCourt(state, R.id).filter(x => x.id !== c.id && x.id !== player(state).id);
    if (targets.length) {
      const t = roll(state, `lie2:${c.id}`).pick(targets);
      const claim = roll(state, `lie3:${c.id}`).pick(['has been seen at night with a stranger in a hood', 'is skimming the treasury', 'speaks ill of you when you leave the room', 'is not at all what they seem']);
      const rum = addSecret(state, { kind: 'rumour', about: [t.id], text: `${t.name} ${claim}`, claim, truth: false, sev: 1, known: [c.id], by: c.id });
      learn(state, rum, R.id);
      return ok(`${c.name} whispers: "${rum.text}." (Unverified. ${c.name} has a reputation.)`);
    }
  }
  return ok(`${c.name} shrugs. "Nothing you haven't heard."`);
}

export function exposeSecret(state, map, secretId) {
  const sec = secretById(state, secretId), pl = player(state);
  if (!sec || !knowsSecret(state, sec) || sec.pub) return no('That is not yours to reveal.');
  const subj = state.chars[sec.about[0]];
  if (sec.about.includes(pl.id) && sec.truth) return no('Revealing it would ruin you.');
  if (!sec.truth) {
    // a lie goes out under your name
    state.prestige -= 6;
    if (subj) { addMod(subj, 'Spread lies about me', -35, 30, 'liedabout'); }
    sec.pub = true;
    const slander = !sec.debunked ? 'It was only a rumour, and it blows up in your face (−6 prestige).' : 'You knew it was false, and everyone can tell (−6 prestige).';
    record(state, `${fullName(state, pl)} spread a rumour about ${subj ? subj.name : 'someone'} that turned out to be false.`, { kind: 'intrigue', chars: sec.about, mem: false });
    return no(slander);
  }
  reveal(state, sec, 'exposed');
  if (subj && subj.realm === state.playerRealm || (subj && isRulerChar(state, subj))) addMod(subj, 'Exposed my secret', -45, 40, 'exposed');
  state.prestige += 2;
  record(state, `${fullName(state, pl)} made public that ${sec.text}.`, { kind: 'intrigue', chars: sec.about });
  return ok(`The word is out. ${subj ? subj.name + ' will not forgive it.' : ''}`);
}

export function blackmail(state, map, secretId) {
  const sec = secretById(state, secretId), pl = player(state);
  if (sec && sec.kind === 'rumour' && !sec.confirmed) return no('A rumour is not proof. Verify it first.');
  if (!sec || !knowsSecret(state, sec) || sec.pub || !sec.truth) return no('You need a true, private secret to hold over someone.');
  const subj = state.chars[sec.about[0]];
  if (!subj || !subj.alive || subj.id === pl.id) return no('Nobody to squeeze.');
  if (sec.confirmed === false) return no('Verify it first.');
  if ((sec.bm || 0) >= 3) return no('They have been squeezed dry.');
  let p = 0.72 - (sec.bm || 0) * 0.2 - (has(subj, 'honest') ? 0.25 : 0) - (has(subj, 'proud') ? 0.15 : 0) + (has(subj, 'craven') ? 0.2 : 0) + sec.sev * 0.05 - (has(subj, 'wrathful') ? 0.1 : 0);
  p = clamp(p, 0.1, 0.92);
  sec.bm = (sec.bm || 0) + 1;
  const wealthy = isRulerChar(state, subj) || ['banker', 'steward'].includes(subj.role);
  if (roll(state, `bm:${sec.id}`).chance(p)) {
    const amt = Math.round((25 + 25 * sec.sev) * (wealthy ? 1.8 : 1));
    state.gold += amt; sec.hush = state.turn + 10;
    addMod(subj, 'Blackmailed me', -30, 36, 'blackmailed'); subj.mods[subj.mods.length - 1].inherit = true;
    return ok(`${subj.name} pays ${amt} gold, white-faced. They will not forget.`);
  }
  addMod(subj, 'Tried to blackmail me', -40, 40, 'blackmailed');
  const out = [];
  if ((has(subj, 'wrathful') || has(subj, 'proud') || has(subj, 'cruel')) && !subj.imprisoned) {
    const block = schemeBlock(state, map, 'murder', subj, pl);
    if (!block) { startScheme(state, 'murder', subj, pl, { why: 'blackmail' }); out.push('They go very still, and leave. You have made an enemy who knows how to hurt you.'); }
  }
  if (!out.length) out.push(`${subj.name} laughs it off, or pretends to.`);
  return no(out[0]);
}

// ---------------------------------------------------------------- court and succession
export function appointCouncil(state, map, role, charId) {
  const c = state.chars[charId], pl = player(state), R = playerRealm(state);
  if (!COUNCIL.includes(role)) return no('No such office.');
  if (!c || !c.alive || ageOf(state, c) < 16) return no('They cannot hold office.');
  if (c.id === pl.id || isRulerChar(state, c) || c.imprisoned) return no('Not them.');
  if (c.role === role && c.court && c.realm === R.id) return no('They already hold that office.');
  if (['spouse', 'heir', 'child'].includes(c.role) && c.realm === R.id) return no('Family cannot sit on the council.');
  if (state.players && isRulerChar(state, c)) return no('Not another player.');
  const foreign = c.realm !== R.id;
  if (foreign) {
    const w = councilWilling(state, c, role);
    if (!roll(state, `invite:${c.id}`).chance(w.p)) { addMod(c, 'Offered a post, declined', -3, 6, 'invite'); return no(`${c.name} politely declines. (${Math.round(w.p * 100)}% chance, ${w.why})`); }
    const home = state.realms[c.realm];
    if (home && state.chars[home.ruler]) addMod(state.chars[home.ruler], 'Took my courtier', -12, 20, 'poached');
  }
  const prev = Object.values(state.chars).find(x => x.alive && x.court && x.realm === R.id && x.role === role && x.id !== c.id);
  if (prev) {
    prev.role = 'courtier';
    addMod(prev, 'Replaced me on the council', -22, 24, 'replaced'); prev.mods[prev.mods.length - 1].inherit = true;
    if (has(prev, 'proud') || has(prev, 'ambitious')) bumpRegard(prev, c, -25);
  }
  const from = state.realms[c.realm];
  c.realm = R.id; c.court = true; c.role = role;
  addMod(c, 'Granted an office', has(c, 'ambitious') ? 28 : 18, 20, 'office');
  refreshRoles(state);
  record(state, `${fullName(state, pl)} named ${c.name} ${roleLabel(state, c).split(' of ')[0].toLowerCase()}${prev ? `, replacing ${prev.name}` : ''}${foreign && from ? ` (lured away from ${from.name})` : ''}.`, { kind: 'court', chars: prev ? [c.id, prev.id] : [c.id] });
  return ok(`${c.name} takes the ${role} seat.${prev ? ` ${prev.name} is not delighted.` : ''}`);
}

/** Would this foreign courtier join your council? */
export function councilWilling(state, c, role) {
  let p = 0.2 + opinionOf(state, c).total / 170 + (has(c, 'ambitious') ? 0.22 : 0) - (has(c, 'content') ? 0.12 : 0) - (has(c, 'proud') ? 0.04 : 0);
  const st = { chancellor: 'dip', marshal: 'mar', steward: 'stw', spymaster: 'int', priest: 'dip' }[role];
  if (st && c.stats[st] >= 14) p += 0.08;
  if (state.prestige > 80) p += 0.06;
  p = clamp(p, 0.04, 0.9);
  return { p, why: p > 0.55 ? 'keen' : p > 0.3 ? 'tempted' : 'unlikely' };
}

export function designateHeir(state, map, charId) {
  const pl = player(state), c = state.chars[charId];
  if (!c || !c.alive || !(pl.children || []).includes(c.id)) return no('Only your own children can be named.');
  if (c.bastard && !c.legit) return no('Legitimise them first.');
  if (c.realm !== state.playerRealm) return no('They are not at your court.');
  const cur = heirOf(state, pl);
  if (cur && cur.id === c.id) return no('They are already your heir.');
  if (ageOf(state, c) < 12) return no('Too young to be named.');
  pl.heirPick = c.id;
  if (cur) {
    addMod(cur, 'Passed over as heir', -45, 60, 'passedover'); cur.mods[cur.mods.length - 1].inherit = true;
    bumpRegard(cur, c, -35, 'Usurper');
    bumpRegard(c, cur, -10);
  }
  state.prestige -= 2;
  refreshRoles(state);
  record(state, `${fullName(state, pl)} named ${c.name} heir${cur ? ', passing over ' + cur.name : ''}.`, { kind: 'family', chars: cur ? [c.id, cur.id] : [c.id] });
  return ok(`${c.name} is your heir now.${cur ? ` ${cur.name} will not take it well.` : ''}`);
}

export function legitimise(state, map, charId) {
  const pl = player(state), c = state.chars[charId];
  if (!c || !c.alive || !c.bastard || c.legit) return no('Nobody to legitimise.');
  if (!(pl.children || []).includes(c.id)) return no('Only your own children.');
  if (state.gold < 40) return no('The priests want 40 gold for the paperwork.');
  state.gold -= 40; c.legit = true; state.prestige -= 3;
  refreshRoles(state);
  record(state, `${fullName(state, pl)} legitimised ${c.name}.`, { kind: 'family', chars: [c.id] });
  return ok(`${c.name} is now your lawful child, and in line to inherit.`);
}

/** Pay the priests to scrub the stain away. */
export function atone(state) {
  const pl = player(state);
  if (!(pl.marks || []).length) return no('You are not stained by anything the world knows of.');
  const priest = council(state).priest;
  const cost = priest ? 70 : 120;
  if (state.gold < cost) return no(`Penance costs ${cost} gold.`);
  state.gold -= cost;
  const m = pl.marks.shift();
  const label = (SINS[m.k] && SINS[m.k].label) || 'sinner';
  state.prestige += 4;
  record(state, `${fullName(state, pl)} did penance for the sin of being called ${label.toLowerCase()}.`, { kind: 'court', chars: [pl.id] });
  return ok(`You walk barefoot to the shrine. "${label}" fades from some lips (not all).`);
}

export function guardPerson(state, map, charId) {
  const c = state.chars[charId];
  if (!c || !c.alive || (c.realm !== state.playerRealm)) return no('Only people at your court.');
  if (state.gold < 40) return no('Guards cost 40 gold for a few seasons.');
  if (c.guard > state.turn) return no('They are already guarded.');
  state.gold -= 40; c.guard = state.turn + 5;
  return ok(`${c.name} gets a shadow of armed men for a few seasons.`);
}

export function interrogate(state, map, charId) {
  const c = state.chars[charId], R = playerRealm(state), g = ig(state);
  if (!c || !c.alive || !c.imprisoned || c.realm !== R.id) return no('Only your prisoners.');
  if (state.flags['intr' + charId] === state.turn) return no('Not again so soon.');
  state.flags['intr' + charId] = state.turn;
  let found = 0;
  for (const sec of g.secrets) {
    if (sec.dead || sec.pub || sec.seen.includes(R.id) || !sec.known.includes(c.id) || sec.about[0] === player(state).id) continue;
    if (!roll(state, `intr:${sec.id}`).chance(0.55 + (has(c, 'craven') ? 0.25 : 0) - (has(c, 'proud') ? 0.15 : 0) - (has(c, 'brave') ? 0.15 : 0))) continue;
    if (sec.kind === 'plot') { const s = schemeById(state, sec.scheme); if (s) { for (const id of s.backers) { const b = state.chars[id]; if (b) lifeNote(state, b, 'Named as a conspirator.'); } } }
    if (learn(state, sec, R.id)) found++;
  }
  addMod(c, 'Questioned in the dungeon', -15, 24, 'questioned');
  state.prestige -= 1;
  return found ? ok(`${c.name} talks. ${found} secret${found > 1 ? 's' : ''} for your dossier.`) : ok(`${c.name} says nothing useful, loudly.`);
}

// ---------------------------------------------------------------- claims & casus belli
export function claimsOfMine(state) {
  return ig(state).claims.filter(c => c.by === state.playerRealm && c.until > state.turn);
}

// ---------------------------------------------------------------- speaking of it in audiences
/** What this character will and won't do about the shadowy business, as lines for the LLM's fate plus data for applyIntrigueGrant. */
export function intrigueFate(state, c, rng) {
  const lines = [], data = {};
  const g = ig(state), R = playerRealm(state), pl = player(state), o = opinionOf(state, c).total;
  const mySide = c.realm === R.id;
  // their own secret business
  const own = g.schemes.find(s => s.status === 'active' && s.owner === c.id && s.by == null);
  if (own) {
    const t = state.chars[own.target], K = SCHEMES[own.kind];
    lines.push(`YOUR SECRET: you are plotting to ${K.verb(t)}${t.id === pl.id ? ' (that means the ruler before you!)' : ''}. NEVER admit it unless the ruler confronts you with proof. Deflect, flatter, change the subject; a faint nervousness or a double-edged remark is fine. You may only drop dark hints if your opinion of the ruler is low.`);
    if (g.schemes.some(s => s.id === own.id && s.seen.includes(R.id))) {
      data.confess = own.id;
      const breaks = has(c, 'craven') || has(c, 'kind') || has(c, 'honest') || rng.chance(0.15);
      data.confessWill = breaks;
      lines.push(`THE RULER KNOWS about your plot. If they confront you with it (accuse you directly): ${breaks ? 'you BREAK DOWN and CONFESS, begging for mercy' : 'you DENY everything coolly'}.`);
    }
  }
  const back = g.schemes.find(s => s.status === 'active' && s.backers.includes(c.id) && s.by == null);
  if (back && !own) lines.push(`YOUR SECRET: you are helping ${state.chars[back.owner].name} in a plot to ${SCHEMES[back.kind].verb(state.chars[back.target])}. Never admit it.`);
  // a friendly soul who knows of a plot against the ruler
  const against = g.schemes.find(s => s.status === 'active' && s.target === pl.id && s.owner !== c.id && !s.backers.includes(c.id) && s.by == null && !s.seen.includes(R.id) && secretById(state, s.secret) && secretById(state, s.secret).known.includes(c.id));
  if (against && o >= 25) {
    data.warn = against.id;
    lines.push(`YOU KNOW that ${state.chars[against.owner].name} is plotting to ${SCHEMES[against.kind].verb(pl)}. You like the ruler: WARN them discreetly, naming ${state.chars[against.owner].name}, within your first two replies, even if it frightens you.`);
  }
  // gossip: real secrets are on offer
  const pool = g.secrets.filter(s => !s.dead && !s.pub && !s.seen.includes(R.id) && s.known.includes(c.id) && s.about[0] !== c.id && s.id !== (against && against.secret) && s.kind !== 'plot');
  const gossipy = c.quirk && /gossip/.test(c.quirk);
  if (pool.length && (o >= 5 || gossipy || c.role === 'spymaster')) {
    const sec = rng.pick(pool);
    data.secret = sec.id;
    lines.push(`If asked for secrets or gossip about the court: WILL SHARE this TRUE secret: "${sec.text}". Tell it in your own words (sly, careful).`);
  }
  // asked to join the council
  const free = c.role === 'courtier' || (!c.court && c.id !== pl.id) ;
  if (free && !isRulerChar(state, c) && c.role !== 'spouse' && c.role !== 'heir' && c.role !== 'child' && ageOf(state, c) >= 16 && !c.imprisoned) {
    const w = councilWilling(state, c, 'chancellor'), will = mySide ? o > -20 || has(c, 'ambitious') : rng.chance(w.p);
    data.council = will;
    lines.push(`If invited to join the ruler's council in some office (chancellor, marshal, steward, spymaster or chaplain): WILL ${will ? 'ACCEPT (name the office they offered)' : 'REFUSE politely'}.`);
  }
  // asked to join a plot of the ruler's
  const mine = g.schemes.find(s => s.status === 'active' && s.by === R.id);
  if (mine && mine.owner !== c.id && !mine.backers.includes(c.id)) {
    const w = backerChance(state, mine, c);
    if (w.p > 0) {
      data.join = mine.id; data.joinWill = rng.chance(w.p);
      lines.push(`If the ruler asks you to join their secret scheme against ${state.chars[mine.target].name}: WILL ${data.joinWill ? 'AGREE, in whispers' : 'REFUSE, uneasy'}.`);
    }
  }
  // asked to arrange a death or a smear: anyone at court may be asked, and says yes or no by their nature
  if (mySide && !c.imprisoned && !isRulerChar(state, c) && ageOf(state, c) >= 16) {
    const kinds = ['smear'].concat(has(c, 'kind') || has(c, 'honest') ? [] : ['murder']);
    const probe = plotTargets(state, c)[0];
    const p = probe ? agentWilling(state, c, kinds.includes('murder') ? 'murder' : 'smear', probe).p : 0;
    const will = o >= 5 && rng.chance(p);
    data.assassin = { kinds, will };
    lines.push(`If the ruler asks you to arrange the ${kinds.includes('murder') ? 'death or ruin' : 'ruin (by rumour)'} of someone: ${will ? `WILL AGREE only if they clearly mean it (grant type "plot", kind ${kinds.includes('murder') ? '"murder" or "smear"' : '"smear"'}, target = that person's name; it costs the ruler gold and they will be told)` : 'WILL REFUSE, in character (shocked, afraid, loyal, or simply not your kind of work)'}. Never say "consider it done" about this unless you grant it.`);
  }
  // asked to keep an eye on someone and report back
  if (mySide && !c.imprisoned && !isRulerChar(state, c) && ageOf(state, c) >= 16 && c.id !== pl.id) {
    const will = watchesOf(state, R.id).length < 4 && (o >= 10 || c.role === 'spymaster' || (has(c, 'deceitful') && o >= 0));
    data.watch = { will };
    lines.push(`If the ruler asks you to keep watch on a named person and report to them: ${will ? 'WILL AGREE (grant type "watch", target = that person\'s name). You will bring them news in the coming seasons' : 'WILL REFUSE (too risky, too busy, or too loyal to the person)'}.`);
  }
  // named heir
  if (mySide && (pl.children || []).includes(c.id) && ageOf(state, c) >= 12 && !(c.bastard && !c.legit)) {
    const cur = heirOf(state, pl);
    if (!cur || cur.id !== c.id) {
      data.heir = true;
      lines.push(`If the ruler tells you that you are now their HEIR (or will inherit/rule after them): ACCEPT with feeling (grant type "heir").${cur ? ` (${cur.name} is the heir right now and will be passed over.)` : ''}`);
    }
  }
  return { lines, data };
}

/** The LLM said it granted something intrigue-shaped: check it against the fate and do it. Returns a note or null. */
export function applyIntrigueGrant(state, map, c, aud, g) {
  const d = (aud.fate && aud.fate.intrigue) || {}, pl = player(state), R = playerRealm(state);
  const gr = ig(state);
  const lit = () => { state.flags.igNew = (state.flags.igNew || 0) + 1; };
  if (g.type === 'watch' && d.watch && d.watch.will) {
    const t = findPerson(state, g.target);
    if (!t) return `✖ ${c.name} does not know whom you mean. Name the person plainly.`;
    if (t.id === c.id || t.id === pl.id) return null;
    if (watchesOf(state, R.id).some(w => w.by === c.id && w.on === t.id)) return null;
    gr.watch.push({ id: 'w' + gr.n++, owner: R.id, by: c.id, on: t.id, since: state.turn, until: state.turn + 10 });
    lit();
    return `${c.name} will watch ${t.name} and report (see Intrigue ▸ Spies).`;
  } else if (g.type === 'heir' && d.heir) {
    const r = designateHeir(state, map, c.id);
    return r.ok ? r.msg : '✖ ' + r.msg;
  } else if (g.type === 'secret' && d.secret) {
    const sec = secretById(state, d.secret);
    if (sec && learn(state, sec, R.id)) return `Secret learned: ${sec.text}`;
  } else if (g.type === 'warn' && d.warn) {
    const s = schemeById(state, d.warn);
    if (s && s.status === 'active') { discover(state, map, s, R.id, 'warning'); const e = state.queue[state.queue.length - 1]; if (e && e.cast) e.cast.warner = c.id; return `${c.name} warns you of a plot.`; }
  } else if (g.type === 'confess' && d.confess && d.confessWill) {
    const s = schemeById(state, d.confess);
    if (s && s.status === 'active') {
      s.confessed = true;
      const patron = s.patron && state.chars[s.patron];
      for (const id of s.backers) { const b = state.chars[id]; if (b) { const sec = secretById(state, s.secret); if (sec && !sec.known.includes(id)) sec.known.push(id); } }
      addMod(c, 'Confessed to me', -10, 12, 'confessed');
      return `${c.name} confesses. Dealing with them is up to you (see the Intrigue window).${patron ? '' : ''}`;
    }
  } else if (g.type === 'join_plot' && d.join && d.joinWill) {
    const s = schemeById(state, d.join);
    if (s && s.status === 'active' && s.by === R.id && s.backers.length < SCHEMES[s.kind].maxBackers) { addBacker(state, s, c); return `${c.name} joins your scheme.`; }
  } else if (g.type === 'council' && typeof d.council === 'boolean' && d.council) {
    const role = COUNCIL.includes(String(g.role)) ? String(g.role) : null;
    if (role) { const r = appointCouncil(state, map, role, c.id); if (r.ok) return `${c.name} joins your council as ${role}.`; }
  } else if (g.type === 'plot' && d.assassin && d.assassin.will) {
    const target = findPerson(state, g.target);
    const kind = d.assassin.kinds.includes(g.kind) ? g.kind : 'smear';
    if (!target) return `✖ ${c.name} does not know whom you mean. Name the person plainly.`;
    if (target.id === c.id || target.id === pl.id) return null;
    if (state.players && isHumanRealm(state, target.realm)) return `✖ ${c.name} will not act against another player's house.`;
    if (!(aud.used && aud.used.plot)) {
      const K = SCHEMES[kind];
      const block = schemeBlock(state, map, kind, c, target);
      if (block) return `✖ ${c.name} thinks better of it: ${block}`;
      if (state.gold < K.cost) return `✖ ${K.label} costs ${K.cost} gold, and your purse is too light.`;
      state.gold -= K.cost;
      startScheme(state, kind, c, target, { by: R.id, patron: pl.id });
      lit();
      return `${c.name} agrees to ${K.verb(target)}. (−${K.cost} gold; see Intrigue ▸ Schemes.)`;
    }
  }
  return null;
}

/** Who could the ruler mean by this name? The living only; your own court first. */
export function findPerson(state, name) {
  const n = String(name || '').toLowerCase().trim();
  if (n.length < 2) return null;
  const full = x => `${x.name} ${x.house || ''}`.trim().toLowerCase();
  const hits = Object.values(state.chars).filter(x => x.alive && (x.name.toLowerCase() === n || full(x) === n || (n.length > 3 && full(x).includes(n))));
  hits.sort((a, b) => (a.realm === state.playerRealm ? 0 : 1) - (b.realm === state.playerRealm ? 0 : 1));
  return hits[0] || null;
}

/** Courtiers the ruler might want removed (used only for the pre-roll; any named person is accepted later). */
function plotTargets(state, c) {
  const pl = player(state);
  return livingCourt(state, state.playerRealm).filter(x => x.id !== pl.id && x.id !== c.id).sort((a, b) => opinionOf(state, a).total - opinionOf(state, b).total);
}

export const INTRIGUE_GRANTS = ['secret', 'warn', 'confess', 'join_plot', 'council', 'plot', 'watch', 'heir'];

// the table the game's ACTIONS merges in
export const INTRIGUE_ACTIONS = {
  plot: (s, m, kind, targetId, agentId) => startPlot(s, m, String(kind), String(targetId), agentId ? String(agentId) : null),
  recruit: (s, m, schemeId, charId) => recruitBacker(s, m, String(schemeId), String(charId)),
  fund: (s, m, schemeId, amount) => fundScheme(s, m, String(schemeId), amount),
  abandon: (s, m, schemeId) => abandonScheme(s, m, String(schemeId)),
  spy: (s, m, realmId) => hireSpy(s, m, +realmId),
  unspy: (s, m, spyId) => dismissSpy(s, m, String(spyId)),
  sweep: (s, m) => sweepCourt(s, m),
  investigate: (s, m, charId) => investigate(s, m, String(charId)),
  verify: (s, m, secretId) => verifyRumour(s, m, String(secretId)),
  gossip: (s, m, charId) => askGossip(s, m, String(charId)),
  expose: (s, m, secretId) => exposeSecret(s, m, String(secretId)),
  blackmail: (s, m, secretId) => blackmail(s, m, String(secretId)),
  appoint: (s, m, role, charId) => appointCouncil(s, m, String(role), String(charId)),
  heir: (s, m, charId) => designateHeir(s, m, String(charId)),
  legitimise: (s, m, charId) => legitimise(s, m, String(charId)),
  atone: s => atone(s),
  guard: (s, m, charId) => guardPerson(s, m, String(charId)),
  interrogate: (s, m, charId) => interrogate(s, m, String(charId)),
  unwatch: (s, m, watchId) => { const w = ig(s).watch.find(x => x.id === String(watchId) && x.owner === s.playerRealm && !x.gone); if (!w) return no('No such informant.'); w.gone = true; return ok('You tell them to stop.'); },
};
export { PLAYER_SCHEMES, SCHEMES, schemeOdds, roleHolder, vigilance, stain, news, closeTo, bumpBoth, allied, atWar };
