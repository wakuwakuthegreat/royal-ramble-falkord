// The Intrigue window: your schemes, the dossier of secrets, spies, the council and the succession, and the causes you
// could go to war for. Every button here calls the same ACTIONS the audience uses.
import {
  player, playerRealm, council, fullName, roleLabel, opinionOf, ageOf, livingCourt, neighborsOfRealm, COUNCIL, SINS, FAITHS, faithOf, heirOf, regard, allied, atWar, isHumanRealm,
} from '../../shared/world.js';
import { SCHEMES, PLAYER_SCHEMES, schemeOdds, schemeSpeed, schemeBlock, knowsSecret, spiesOf } from '../../shared/intrigue.js';
import { agentsFor, councilWilling, claimsOfMine } from '../../shared/intrigueActions.js';
import { holyBlock, claimsFor, pretendersAt, humanUnrest, faithName, CB } from '../../shared/warplay.js';
import { stillURL, moodExpr } from '../portraits.js';
import { h, esc, tipHTML, toast, opinionBadge } from './dom.js';
import { confirmBox } from './dialog.js';
import { armsEl } from './heraldry.js';
import { draggable } from './drag.js';

const TABS = [['plots', '🗝 Schemes'], ['secrets', '🔦 Secrets'], ['spies', '🕵 Spies'], ['court', '🏛 Court'], ['war', '⚔ Causes']];
const TIPS = { plots: 'Plots you run, and plots you know of.', secrets: 'What you have learned. Expose it, squeeze it, or check it.', spies: 'Eyes in other courts, and your spymaster.', court: 'Council, heir and your good name.', war: 'Faith, claims and exiles: reasons for war.' };
const KIND_ICON = { plot: '🗝', deed: '🩸', affair: '💘', bastard: '👶', rumour: '🗣', order: '📜', authorship: '🐍' };

export const igOf = s => s.ig || { schemes: [], secrets: [], spies: [], claims: [], sweep: {} };
export const mySchemes = s => igOf(s).schemes.filter(x => x.by === s.playerRealm && x.status === 'active');
export const knownPlots = s => igOf(s).schemes.filter(x => x.by !== s.playerRealm && x.status === 'active' && x.seen.includes(s.playerRealm));
export const knownSecrets = s => igOf(s).secrets.filter(x => !x.dead && knowsSecret(s, x) && x.kind !== 'plot');

const medal = (game, c, size = 'sm') => h('div.medal.' + size + (c.alive ? '' : '.dead'), { onclick: e => { e.stopPropagation(); game.selectChar(c.id); document.querySelectorAll('.ig-back').forEach(x => x.remove()); } }, h('img', { src: stillURL(game.state, c, 80, c.id === player(game.state).id ? 'neutral' : moodExpr(opinionOf(game.state, c).total)) }));

export function openIntrigue(game, tab = 'plots') {
  document.querySelectorAll('.ig-back').forEach(e => e.remove());
  const s0 = game.state;
  game.igSeen = (s0.flags && s0.flags.igNew) || 0;
  const cb = document.getElementById('btn-intrigue'); if (cb) cb.classList.remove('unread');
  const pages = h('div.pages.single'), tabs = h('div.tabs');
  const back = h('div.modal-back.dismissable.ig-back', { onclick: e => { if (e.target === back) close(); } }, h('div.panel.book', null,
    h('div.titlebar', null, 'Intrigue', h('button.x', { onclick: () => close(), 'data-tip': 'Close' }, '✕')), tabs, pages));
  const close = () => { game.igRedraw = null; back.remove(); };
  const act = async (name, ...args) => { const r = await game.action(name, ...args); draw(); return r; };
  const L = (t, ids) => game.link(t, ids);

  function draw() {
    if (!back.isConnected) { game.igRedraw = null; return; }
    const s = game.state;
    tabs.innerHTML = '';
    for (const [k, label] of TABS) tabs.append(h('div.tab' + (k === tab ? '.on' : ''), { onclick: () => { tab = k; draw(); }, 'data-tip': tipHTML(label.slice(2).trim(), TIPS[k]) }, label));
    const keepScroll = pages.scrollTop;
    pages.innerHTML = '';
    ({ plots, secrets, spies, court, war })[tab](s);
    pages.scrollTop = keepScroll;
  }
  game.igRedraw = draw;

  // ---------------------------------------------------------------- schemes
  function schemeCard(sc, s) {
    const o = s.chars[sc.owner], t = s.chars[sc.target], K = SCHEMES[sc.kind], pl = player(s);
    const odds = schemeOdds(s, sc), rate = schemeSpeed(s, sc);
    const left = sc.kind === 'embezzle' ? null : Math.max(1, Math.ceil((100 - sc.progress) / Math.max(4, rate)));
    const via = o.id !== pl.id ? ` (through ${o.name})` : '';
    const backers = sc.backers.map(id => s.chars[id]).filter(Boolean);
    return h('div.ig-card', null,
      h('div.ig-head', null, h('span.ig-ic', null, K.icon), h('div', { style: { flex: 1 } }, h('b', null, `${K.label}: `), L(`${t.name}`, [t.id, o.id]), via, h('div.muted', { style: { fontSize: '13px' } }, K.desc)), h('div.ig-odds', { 'data-tip': tipHTML('Odds if it struck now', `Your side ${odds.A} against ${odds.D}. More backers, gold and a clever schemer help. Good watchmen hurt.`) }, Math.round(odds.chance * 100) + '%')),
      h('div.ig-bar', { 'data-tip': tipHTML('Progress', left ? `About ${left} season(s) to go.` : '') }, h('i', { style: { width: Math.min(100, sc.progress) + '%' } })),
      h('div.ig-meta', null, left ? `~${left} season${left > 1 ? 's' : ''} to go` : '', sc.watched ? ' · watched' : '', sc.gold ? ` · ${sc.gold} gold spent` : '', sc.seen.includes(t.realm) && t.realm !== s.playerRealm ? ' · ⚠ they may know' : ''),
      h('div.ig-backers', null, backers.length ? backers.map(b => medal(game, b)) : h('span.muted', null, 'No backers yet'), h('span.muted', { style: { marginLeft: '6px' } }, `${backers.length}/${K.maxBackers}`)),
      h('div.ig-acts', null,
        K.maxBackers > backers.length ? h('button.btn.small', { 'data-tip': tipHTML('Recruit a backer', 'More hands, more power, more chances to leak.'), onclick: () => recruitBox(sc) }, '🤝 Recruit') : null,
        h('button.btn.small', { disabled: s.gold < 25, 'data-tip': tipHTML('Pour in gold', '25 gold quickens it and strengthens the blow.'), onclick: () => act('fund', sc.id, 25) }, '💰 +25'),
        h('button.btn.small', { 'data-tip': 'Call it off', onclick: async () => { if (await confirmBox({ title: 'Call it off?', icon: '✖', text: 'The scheme stops. What is done stays done.', ok: 'Call it off', cancel: 'Carry on' })) act('abandon', sc.id); } }, '✖ Call off')));
  }
  function plots(s) {
    const mine = mySchemes(s), known = knownPlots(s);
    pages.append(h('div.row', { style: { justifyContent: 'space-between', alignItems: 'center' } }, h('h4.ig-h', null, 'Your schemes'), h('button.btn.dark.small', { onclick: () => schemeBox(game, null, draw), 'data-tip': tipHTML('Begin a scheme', 'Murder, a smear, a seduction, a forged claim.') }, '＋ New scheme')));
    if (!mine.length) pages.append(h('p.muted', null, 'You are scheming against nobody. A page on someone also has a 🗝 Scheme button.'));
    for (const sc of mine) pages.append(schemeCard(sc, s));
    pages.append(h('h4.ig-h', null, 'Plots you know of'));
    if (!known.length) pages.append(h('p.muted', null, 'None. That means nothing was found, not that nothing is happening. Your spymaster can sweep the court.'));
    for (const sc of known) {
      const o = s.chars[sc.owner], t = s.chars[sc.target], K = SCHEMES[sc.kind];
      const mineOwner = o.realm === s.playerRealm && !o.imprisoned && o.id !== player(s).id;
      pages.append(h('div.ig-card.threat', null,
        h('div.ig-head', null, medal(game, o), h('div', { style: { flex: 1 } }, h('b', null, `${K.icon} ${K.label}`), ' by ', L(o.name, [o.id]), ' against ', L(t.name, [t.id]), h('div.muted', { style: { fontSize: '13px' } }, `Progress unknown · ${sc.backers && sc.backers.length ? sc.backers.length + ' known helper(s)' : 'helpers unknown'}`))),
        h('div.ig-acts', null,
          mineOwner ? h('button.btn.small', { 'data-tip': tipHTML('Arrest', 'Into the dungeon. Their family will resent it.'), onclick: async () => { if (await confirmBox({ title: `Arrest ${o.name}?`, icon: '⛓', text: 'They will hate you for years, but the plot dies with them.', ok: 'Arrest', cancel: 'Wait', danger: true })) act('imprison', o.id); } }, '⛓ Arrest') : null,
          t.realm === s.playerRealm ? h('button.btn.small', { disabled: s.gold < 40, 'data-tip': tipHTML('Guard them (40 gold)', 'Much harder to kill for a few seasons.'), onclick: () => act('guard', t.id) }, '🛡 Guard · 40💰') : null,
          h('button.btn.small', { disabled: s.gold < 20, 'data-tip': tipHTML('Investigate (20 gold)', 'Look for the helpers and the proof.'), onclick: () => act('investigate', o.id) }, '🔎 Investigate · 20💰'),
          h('button.btn.small', { onclick: () => { close(); game.selectChar(o.id); }, 'data-tip': 'Open their page' }, 'See ›'))));
    }
  }

  function recruitBox(sc) {
    const s = game.state, pl = player(s);
    const rows = livingCourt(s, s.playerRealm).filter(c => c.id !== pl.id && c.id !== sc.owner && c.id !== sc.target && !sc.backers.includes(c.id) && ageOf(s, c) >= 16 && !c.imprisoned);
    const list = h('div.ig-pick');
    const dlg = h('div.modal-back.ig-sub', { onclick: e => { if (e.target === dlg) dlg.remove(); } }, h('div.panel.dialog.ig-dlg', null, ['tl', 'tr', 'bl', 'br'].map(c => h('i.corner.' + c)), h('div.titlebar', null, 'Who might join?', h('button.x', { onclick: () => dlg.remove() }, '✕')), list));
    for (const c of rows) {
      const p = backerGuess(s, sc, c);
      list.append(h('div.court-row', { onclick: async () => { dlg.remove(); await act('recruit', sc.id, c.id); } }, medal(game, c), h('div.who', null, c.name, h('br'), h('small', null, roleLabel(s, c))), h('span.muted', null, p), opinionBadge(opinionOf(s, c).total)));
    }
    if (!rows.length) list.append(h('p.muted', null, 'Nobody else is close enough.'));
    document.body.append(dlg);
  }

  // ---------------------------------------------------------------- secrets
  function secretCard(sec, s) {
    const pl = player(s), about = sec.about.map(id => s.chars[id]).filter(Boolean);
    const unverified = sec.kind === 'rumour' && !sec.confirmed && !sec.debunked;
    const badge = sec.debunked ? '✖ debunked' : sec.confirmed ? '✔ confirmed' : unverified ? '❓ unverified' : sec.viaSpy ? '🕵 from a spy' : sec.kind === 'deed' || sec.kind === 'affair' || sec.kind === 'bastard' || sec.kind === 'order' ? '🔒 reliable' : '';
    const mineAbout = sec.about[0] === pl.id;
    return h('div.ig-card' + (sec.pub ? '.pub' : ''), null,
      h('div.ig-head', null, h('span.ig-ic', null, KIND_ICON[sec.kind] || '🗝'), h('div', { style: { flex: 1 } }, L(sec.text + '.', sec.about), h('div.muted', { style: { fontSize: '13px' } }, [badge, sec.pub ? '🌐 everyone knows' : 'private'].filter(Boolean).join(' · ')))),
      h('div.ig-backers', null, about.slice(0, 2).map(c => medal(game, c))),
      sec.pub || sec.debunked ? null : h('div.ig-acts', null,
        !mineAbout ? h('button.btn.small', { 'data-tip': tipHTML('Expose', unverified ? 'It might be a lie. A false rumour spread under your name backfires.' : 'Tell the world. The truth stains them for good; they will never forgive you.'), onclick: async () => { if (await confirmBox({ title: 'Expose it?', icon: '📢', text: unverified ? 'This is only a rumour. If it is false you pay for it.' : 'Once it is out, it is out.', ok: 'Expose', cancel: 'Keep it', danger: true })) act('expose', sec.id); } }, '📢 Expose') : null,
        !mineAbout && !unverified && sec.about[0] !== pl.id ? h('button.btn.small', { 'data-tip': tipHTML('Blackmail', 'Squeeze gold out of them. The proud and honest may hit back.'), onclick: () => act('blackmail', sec.id) }, '🤫 Blackmail') : null,
        unverified ? h('button.btn.small', { disabled: s.gold < 15, 'data-tip': tipHTML('Verify (15 gold)', 'True, or an invention? A good spymaster helps.'), onclick: () => act('verify', sec.id) }, '🔍 Verify · 15💰') : null));
  }
  function secrets(s) {
    const sp = council(s).spymaster, list = knownSecrets(s).slice().reverse();
    pages.append(h('div.row', { style: { justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
      h('h4.ig-h', null, 'Dossier'),
      h('button.btn.small', { disabled: s.gold < 30, 'data-tip': tipHTML('Sweep the court (30 gold)', `${sp ? esc(sp.name) : 'Your servants'} turn everything over for a few seasons: plots against you are likelier to be found.`), onclick: () => act('sweep') }, '🧹 Sweep the court · 30💰')));
    if (!list.length) pages.append(h('p.muted', null, 'Nothing yet. Ask around (🗣 Gossip on someone\'s page), place a spy, or sweep the court.'));
    for (const sec of list) pages.append(secretCard(sec, s));
  }

  // ---------------------------------------------------------------- spies
  function spies(s) {
    const sp = council(s).spymaster, mine = spiesOf(s, s.playerRealm), foreign = igOf(s).spies.filter(x => x.in === s.playerRealm && x.owner !== s.playerRealm && x.found && !x.gone);
    pages.append(h('h4.ig-h', null, 'Spymaster'));
    pages.append(sp ? h('div.court-row', { onclick: () => { close(); game.selectChar(sp.id); } }, medal(game, sp), h('div.who', null, fullName(s, sp), h('br'), h('small', null, `Intrigue ${sp.stats.int} · ${sp.stats.int >= 14 ? 'sharp' : sp.stats.int >= 9 ? 'able' : 'dull'}`)), opinionBadge(opinionOf(s, sp).total)) : h('p.muted', null, 'No spymaster. Appoint one under 🏛 Court: it matters.'));
    pages.append(h('h4.ig-h', null, `Your spies (${mine.length}/4)`));
    if (!mine.length) pages.append(h('p.muted', null, 'None. A spy costs 40 gold to place and 2 a season. They report secrets and plots, and may be caught.'));
    for (const x of mine) {
      const r = s.realms[x.in];
      pages.append(h('div.court-row', { onclick: () => game.goToRealm(r.id) }, armsEl(r), h('div.who', null, r.name, h('br'), h('small', null, `since ${x.since != null ? 'season ' + x.since : 'long ago'}`)), h('button.btn.small', { onclick: e => { e.stopPropagation(); act('unspy', x.id); }, 'data-tip': 'Recall them' }, 'Recall')));
    }
    const inf = (igOf(s).watch || []).filter(w => !w.gone && w.owner === s.playerRealm && s.chars[w.by] && s.chars[w.on]);
    pages.append(h('h4.ig-h', null, `Informants (${inf.length}/4)`));
    if (!inf.length) pages.append(h('p.muted', null, 'None. Ask a courtier you trust, in an audience, to keep watch on someone. It costs nothing, but they are only as good as their word.'));
    for (const w of inf) {
      const by = s.chars[w.by], on = s.chars[w.on];
      pages.append(h('div.court-row', { onclick: () => { close(); game.selectChar(on.id); } }, medal(game, by), h('div.who', null, L(`${by.name} watches ${on.name}`, [by.id, on.id]), h('br'), h('small', null, `until season ${w.until}`)), h('button.btn.small', { onclick: e => { e.stopPropagation(); act('unwatch', w.id); }, 'data-tip': 'Tell them to stop' }, 'Stop')));
    }
    if (foreign.length) { pages.append(h('h4.ig-h', null, 'Spies you found')); for (const x of foreign) pages.append(h('div.muted', null, `A spy of ${s.realms[x.owner].name} sits in your court.`)); }
    pages.append(h('h4.ig-h', null, 'Place a spy'));
    const ns = new Set(neighborsOfRealm(s, game.map, s.playerRealm));
    const cand = s.realms.filter(r => r.alive && r.id !== s.playerRealm && !(s.humans && s.humans[r.id]) && !mine.some(x => x.in === r.id)).sort((a, b) => (ns.has(b.id) ? 1 : 0) - (ns.has(a.id) ? 1 : 0));
    for (const r of cand.slice(0, 12)) pages.append(h('div.court-row', null, armsEl(r), h('div.who', null, r.name, h('br'), h('small', null, `${ns.has(r.id) ? 'neighbour · ' : ''}${r.levies} men`)), h('button.btn.small', { disabled: s.gold < 40 || mine.length >= 4, onclick: () => act('spy', r.id), 'data-tip': 'Send a spy (40 gold)' }, 'Send (40)')));
  }

  // ---------------------------------------------------------------- court
  function candidateRows(s, role) {
    const pl = player(s), held = council(s)[role], stat = { chancellor: 'dip', marshal: 'mar', steward: 'stw', spymaster: 'int', priest: 'dip' }[role];
    const home = livingCourt(s, s.playerRealm).filter(c => c.id !== pl.id && ageOf(s, c) >= 16 && !c.imprisoned && !['spouse', 'heir', 'child'].includes(c.role) && (!held || c.id !== held.id) && ['courtier', ...COUNCIL, 'banker', 'jester'].includes(c.role));
    const abroad = Object.values(s.chars).filter(c => c.alive && c.realm !== s.playerRealm && s.realms[c.realm] && s.realms[c.realm].alive && s.realms[c.realm].ruler !== c.id && c.court !== undefined && ageOf(s, c) >= 18 && !c.imprisoned && !['spouse', 'heir', 'child'].includes(c.role) && !(s.humans && s.humans[c.realm]) && neighborsOfRealm(s, game.map, s.playerRealm).includes(c.realm)).slice(0, 10);
    return { home: home.sort((a, b) => b.stats[stat] - a.stats[stat]), abroad: abroad.sort((a, b) => b.stats[stat] - a.stats[stat]), stat };
  }
  function appointBox(role) {
    const s = game.state, { home, abroad, stat } = candidateRows(s, role);
    const list = h('div.ig-pick');
    const dlg = h('div.modal-back.ig-sub', { onclick: e => { if (e.target === dlg) dlg.remove(); } }, h('div.panel.dialog.ig-dlg', null, ['tl', 'tr', 'bl', 'br'].map(c => h('i.corner.' + c)), h('div.titlebar', null, `Name a ${role}`, h('button.x', { onclick: () => dlg.remove() }, '✕')), list));
    const row = (c, extra) => h('div.court-row', { onclick: async () => { dlg.remove(); await act('appoint', role, c.id); } }, medal(game, c), h('div.who', null, c.name + (c.house ? ' ' + c.house : ''), h('br'), h('small', null, `${roleLabel(s, c)} · skill ${c.stats[stat]}`)), extra, opinionBadge(opinionOf(s, c).total));
    list.append(h('h4.ig-h', null, 'At your court'));
    if (!home.length) list.append(h('p.muted', null, 'Nobody suitable.'));
    for (const c of home) list.append(row(c, null));
    list.append(h('h4.ig-h', null, 'From a neighbour\'s court'));
    if (!abroad.length) list.append(h('p.muted', null, 'Nobody to lure away.'));
    for (const c of abroad) { const w = councilWilling(s, c, role); list.append(row(c, h('span.muted', { 'data-tip': 'Chance they accept. Their ruler will resent it.' }, Math.round(w.p * 100) + '%'))); }
    document.body.append(dlg);
  }
  function court(s) {
    const pl = player(s), cn = council(s);
    pages.append(h('h4.ig-h', null, 'Council'));
    for (const role of COUNCIL) {
      const c = cn[role];
      pages.append(h('div.court-row', { onclick: c ? () => { close(); game.selectChar(c.id); } : null }, c ? medal(game, c) : h('div.medal.sm', null, '—'),
        h('div.who', null, h('b', null, role[0].toUpperCase() + role.slice(1)), c ? ` ${c.name}` : ' (vacant)', h('br'), h('small', null, c ? `${{ chancellor: 'Diplomacy', marshal: 'Martial', steward: 'Stewardship', spymaster: 'Intrigue', priest: 'Diplomacy' }[role]} ${c.stats[{ chancellor: 'dip', marshal: 'mar', steward: 'stw', spymaster: 'int', priest: 'dip' }[role]]}` : 'a replacement is found next season')),
        c ? opinionBadge(opinionOf(s, c).total) : null,
        h('button.btn.small', { onclick: e => { e.stopPropagation(); appointBox(role); }, 'data-tip': tipHTML(c ? 'Replace' : 'Appoint', 'Pick anyone from your court, or lure one from abroad.') }, c ? 'Replace' : 'Appoint')));
    }
    const heir = heirOf(s, pl), kids = (pl.children || []).map(id => s.chars[id]).filter(k => k && k.alive);
    pages.append(h('h4.ig-h', null, 'Succession'));
    if (!kids.length) pages.append(h('p.muted', null, 'You have no living children. A distant cousin would turn up.'));
    for (const k of kids) {
      pages.append(h('div.court-row', { onclick: () => { close(); game.selectChar(k.id); } }, medal(game, k), h('div.who', null, k.name, k.bastard ? ' (illegitimate)' : '', h('br'), h('small', null, `${ageOf(s, k)} · ${heir && heir.id === k.id ? 'heir' : 'child'}`)),
        k.bastard && !k.legit ? h('button.btn.small', { disabled: s.gold < 40, onclick: e => { e.stopPropagation(); act('legitimise', k.id); }, 'data-tip': tipHTML('Legitimise (40 gold)', 'A lawful child, in line to inherit.') }, 'Legitimise · 40💰')
          : heir && heir.id === k.id ? h('span.muted', null, '👑') : h('button.btn.small', { onclick: async e => { e.stopPropagation(); if (await confirmBox({ title: `Name ${k.name} heir?`, icon: '👑', text: heir ? `${heir.name} will be passed over, and will not forget it.` : 'So be it.', ok: 'Name them', cancel: 'Not yet' })) act('heir', k.id); }, 'data-tip': tipHTML('Name as heir', 'A favoured younger child over the eldest breeds jealousy.') }, 'Name heir')));
    }
    pages.append(h('h4.ig-h', null, 'Your name'));
    const marks = pl.marks || [];
    if (!marks.length) pages.append(h('p.muted', null, 'No stain the world knows of.'));
    for (const m of marks) pages.append(h('div.entry', { 'data-tip': SINS[m.k] ? esc(SINS[m.k].gloss) : '' }, `${SINS[m.k] ? SINS[m.k].icon : ''} Known as a ${SINS[m.k] ? SINS[m.k].label.toLowerCase() : m.k} since ${m.y}.`));
    if (marks.length) pages.append(h('button.btn.small', { disabled: s.gold < (cn.priest ? 70 : 120), onclick: () => act('atone'), 'data-tip': tipHTML('Do penance', `${cn.priest ? 70 : 120} gold and a barefoot walk. Fades the oldest stain.`) }, `🙏 Do penance · ${cn.priest ? 70 : 120}💰`));
  }

  // ---------------------------------------------------------------- causes of war
  function war(s) {
    const pr = playerRealm(s), ns = neighborsOfRealm(s, game.map, s.playerRealm).filter(id => s.realms[id].alive);
    const f = FAITHS[faithOf(s, pr)];
    pages.append(h('h4.ig-h', null, `${f.icon} Your faith: ${f.label}`));
    const holy = ns.filter(id => !holyBlock(s, game.map, s.playerRealm, id));
    pages.append(holy.length ? holy.map(id => { const r = s.realms[id]; return h('div.court-row', { onclick: () => game.goToRealm(id) }, armsEl(r), h('div.who', null, r.name, h('br'), h('small', null, `follows ${faithName(s, id)} · ${r.levies} men`)), h('button.btn.small', { onclick: async e => { e.stopPropagation(); if (await confirmBox({ title: 'A holy war?', icon: '☩', danger: true, text: `On ${r.name}, for the faith. The pious cheer, co-believers may march with you, and your allies and theirs will be drawn in.`, ok: 'Raise the banner', cancel: 'Not now' })) { close(); game.action('holyWar', id); } } }, '☩ Holy war')); }) : h('p.muted', null, 'No neighbour of another faith is open to a holy war right now.'));
    pages.append(h('h4.ig-h', null, 'Claims you hold'));
    const claims = claimsFor(s, s.playerRealm);
    if (!claims.length) pages.append(h('p.muted', null, 'None. A 🗝 Forge a claim scheme makes one (risky), and an outrage against you can give you the right to answer.'));
    for (const c of claims) { const r = s.realms[c.over]; pages.append(h('div.court-row', null, armsEl(r), h('div.who', null, `${CB[c.kind === 'forged' ? 'forged' : c.kind === 'outrage' ? 'outrage' : 'claim'].label} on ${r.name}`, h('br'), h('small', null, c.why || (c.forged ? 'If checked, it may be exposed as a forgery.' : ''))), h('button.btn.small', { disabled: !!atWar(s, r.id, s.playerRealm) || allied(s, r.id, s.playerRealm) || !ns.includes(r.id), onclick: () => { close(); game.action('claimWar', c.over); }, 'data-tip': ns.includes(r.id) ? 'Declare war on this claim' : 'They do not border you' }, '👑 Press it'))); }
    pages.append(h('h4.ig-h', null, 'Exiles at your court'));
    const ex = pretendersAt(s, s.playerRealm);
    if (!ex.length) pages.append(h('p.muted', null, 'None. Deposed rulers may seek shelter with a neighbour.'));
    for (const c of ex) for (const rid of c.claims.filter(r => s.realms[r] && s.realms[r].alive && r !== s.playerRealm)) { const r = s.realms[rid]; pages.append(h('div.court-row', null, medal(game, c), h('div.who', null, `${c.name}, rightful ruler of ${r.name}`, h('br'), h('small', null, 'Win, and they rule there as your grateful ally.')), h('button.btn.small', { disabled: !ns.includes(rid) || !!atWar(s, rid, s.playerRealm), onclick: () => { close(); game.action('restoreWar', rid, c.id); }, 'data-tip': ns.includes(rid) ? 'War to put them back on the throne' : 'Their realm does not border you' }, '🚪 Restore them'))); }
    pages.append(h('h4.ig-h', null, 'Unrest in your realm'));
    const u = Math.round(humanUnrest(s));
    pages.append(h('div.ig-bar.warn', { 'data-tip': tipHTML('Unrest', 'Tyranny, crushing taxes, bloodshed and a gloomy people feed it. At about 45 a revolt may come.') }, h('i', { style: { width: Math.min(100, u) + '%' } })), h('div.ig-meta', null, `${u}/100 · ${u < 25 ? 'calm' : u < 42 ? 'uneasy' : 'dangerous'}`));
  }

  document.body.append(back);
  draggable(back.firstChild, { handle: back.firstChild.querySelector('.titlebar') });
  draw();
}

function backerGuess(s, sc, c) {
  const t = s.chars[sc.target];
  let p = 0.22 + regard(c, s.chars[sc.owner]) / 120 - regard(c, t) / 140;
  if (c.traits.includes('honest')) p -= 0.15;
  if (c.traits.includes('kind') && sc.kind === 'murder') p -= 0.25;
  if (c.traits.includes('ambitious') && sc.kind === 'coup') p += 0.2;
  return p > 0.5 ? 'eager' : p > 0.3 ? 'maybe' : 'unlikely';
}

/** Begin a scheme: pick the kind, the target, and who does the dirty work. */
export function schemeBox(game, preTarget, onDone) {
  const s = game.state, pl = player(s);
  let kind = preTarget ? (PLAYER_SCHEMES.includes('murder') ? 'murder' : PLAYER_SCHEMES[0]) : 'murder', target = preTarget || null, agent = pl.id;
  const body = h('div.ig-wiz');
  const dlg = h('div.modal-back.ig-sub', { onclick: e => { if (e.target === dlg) dlg.remove(); } }, h('div.panel.dialog.ig-dlg.wide', null, ['tl', 'tr', 'bl', 'br'].map(c => h('i.corner.' + c)), h('div.titlebar', null, 'A scheme', h('button.x', { onclick: () => dlg.remove() }, '✕')), body));
  function targets() {
    const court = livingCourt(s, s.playerRealm).filter(c => c.id !== pl.id && ageOf(s, c) >= 6);
    const ns = neighborsOfRealm(s, game.map, s.playerRealm);
    const rulers = s.realms.filter(r => r.alive && r.id !== s.playerRealm && (ns.includes(r.id) || spiesOf(s, s.playerRealm, r.id).length) && !(s.humans && s.humans[r.id])).map(r => s.chars[r.ruler]);
    if (kind === 'forge') return rulers;
    if (kind === 'seduce') return court;
    return court.concat(rulers);
  }
  function render() {
    body.innerHTML = '';
    body.append(h('div.ig-kinds', null, PLAYER_SCHEMES.map(k => h('button.btn.small' + (k === kind ? '.on' : ''), { 'data-tip': tipHTML(SCHEMES[k].label, esc(SCHEMES[k].desc) + `<br>Cost ${SCHEMES[k].cost} gold.`), onclick: () => { kind = k; if (target && !targets().some(c => c.id === target.id)) target = null; agent = k === 'seduce' ? pl.id : agent; render(); } }, `${SCHEMES[k].icon} ${SCHEMES[k].label}`))));
    body.append(h('p.muted', { style: { margin: '4px 2px 8px' } }, SCHEMES[kind].desc));
    const list = h('div.ig-pick');
    for (const c of targets()) {
      const r = s.realms[c.realm];
      const note = kind === 'seduce' ? [c.spouse && s.chars[c.spouse] && s.chars[c.spouse].alive ? 'married' : '', isKinOf(pl, c) ? 'kin!' : ''].filter(Boolean).join(' · ') : '';
      list.append(h('div.court-row' + (target && target.id === c.id ? '.on' : ''), { onclick: () => { target = c; render(); } }, medal(game, c), h('div.who', null, c.name + (c.house ? ' ' + c.house : ''), h('br'), h('small', null, `${roleLabel(s, c)}${note ? ' · ' + note : ''}`)), opinionBadge(opinionOf(s, c).total)));
    }
    body.append(h('div.ig-cols', null, h('div', null, h('h4.ig-h', null, 'Against whom'), list)));
    if (target) {
      const ags = agentsFor(s, kind, target);
      const alist = h('div.ig-pick');
      for (const a of ags) alist.append(h('div.court-row' + (agent === a.c.id ? '.on' : ''), { onclick: () => { agent = a.c.id; render(); } }, medal(game, a.c), h('div.who', null, a.c.id === pl.id ? 'You, yourself' : a.c.name, h('br'), h('small', null, a.c.id === pl.id ? 'if it comes out, it is your name' : roleLabel(s, a.c))), h('span.muted', null, a.why)));
      body.append(h('h4.ig-h', null, 'Who does it'), alist);
    }
    const ag = s.chars[agent], block = target && ag ? schemeBlock(s, game.map, kind, ag, target) : (target ? null : 'Pick a target.');
    body.append(h('div.row', { style: { justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' } }, h('span.muted', null, block || `Costs ${SCHEMES[kind].cost} gold. Secrets like this have a way of getting out.`),
      h('button.btn.dark', { disabled: !!block || s.gold < SCHEMES[kind].cost, onclick: async () => { dlg.remove(); await game.action('plot', kind, target.id, agent === pl.id ? null : agent); onDone && onDone(); if (game.igRedraw) game.igRedraw(); }, 'data-tip': s.gold < SCHEMES[kind].cost ? 'Not enough gold' : null }, 'Begin')));
  }
  document.body.append(dlg);
  draggable(dlg.firstChild, { handle: dlg.firstChild.querySelector('.titlebar') });
  render();
}
const isKinOf = (a, b) => !!(a.parents && b.parents && a.parents.some(p => b.parents.includes(p))) || (a.parents || []).includes(b.id) || (b.parents || []).includes(a.id);
void toast; void claimsOfMine; void isHumanRealm;
