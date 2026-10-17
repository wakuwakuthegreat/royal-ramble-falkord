// The scenes the shadows throw up: a plot uncovered, a coup at the door, a blackmailer's note, a foreign spy, a neighbour
// poaching your chancellor, an exile at your gate, an unfaithful consort. Registered into the event deck by events.js.
import { RNG, clamp } from './rng.js';
import { player, council, record, addMod, fullName, opinionOf, ageOf, regard, bumpRegard, TRAITS, SINS, isHumanRealm } from './world.js';
import {
  ig, SCHEMES, schemeById, secretById, endScheme, jailChar, executeChar, stain, learn, reveal, exile, roleHolder, isRulerChar, closeTo,
  playerCoup, spiesOf, startScheme, schemeBlock, addSecret,
} from './intrigue.js';
import { kill, declareWar as declareWarFn } from './sim.js';
import { splitRealm } from './warplay.js';
import { provincesOf, TAX } from './world.js';

const has = (c, t) => !!c && c.traits.includes(t);
const C = (s, id) => s.chars[id];

function plotLine(s, sc) {
  const o = C(s, sc.owner), t = C(s, sc.target), me = player(s);
  const you = t && t.id === me.id;
  const name = x => (x.id === me.id ? 'you' : x.name);
  switch (sc.kind) {
    case 'murder': return `${o.name} is arranging for ${you ? 'YOU' : t.name} to meet with a fatal accident.`;
    case 'coup': return `${o.name} is gathering men to seize the throne.`;
    case 'smear': return `${o.name} is spreading lies about ${name(t)}.`;
    case 'seduce': return `${o.name} is courting ${you ? 'you, which is impossible, so something else is going on' : t.name} with unusual determination${t.spouse && C(s, t.spouse) && C(s, t.spouse).id === me.id ? ' (your consort!)' : ''}.`;
    case 'embezzle': return `${o.name} has been robbing the treasury, about ${sc.progress} gold so far.`;
    case 'forge': return `${o.name} of ${s.realms[o.realm].name} is forging papers that claim the lands of ${s.realms[t.realm].name} as theirs.`;
    default: return `${o.name} is up to something against ${name(t)}.`;
  }
}

const HOW = {
  spymaster: s => { const sp = council(s).spymaster; return sp ? `${sp.name}, your spymaster, slips in and bolts the door. "Majesty. You should hear this."` : 'A nervous servant has been sent to you with news that cannot wait.'; },
  leak: () => 'One of the conspirators lost their nerve and spoke to a priest, who spoke to you.',
  warning: (s, c) => (c.warner && C(s, c.warner) ? `${C(s, c.warner).name} finds you alone. "I should not be telling you this, Majesty, but I like you too well to be quiet."` : 'A note, unsigned, was pushed under your door.'),
  sweep: () => 'The sweep of the court turned up something.',
  investigation: () => 'Your inquiries have turned up something.',
  gossip: () => 'A loose tongue has given something away.',
  refusal: () => 'Someone approached by the plotters came straight to you.',
  rumour: () => 'It is whispered in the corridors.',
  caught: () => 'The guards caught them in the act!',
  audit: () => 'The steward\'s ledgers do not add up, and now you know why.',
};

export function registerIntrigueEvents(def) {
  def('ig_notice', {
    title: (s, m, c) => c.title || 'Word From the Shadows', icon: '🗝', auto: 'ok',
    text: (s, m, c) => c.text || '',
    options: (s, m, c) => {
      const o = [{ key: 'ok', label: c.ok || 'I see.' }];
      if (c.a && C(s, c.a) && C(s, c.a).alive && ageOf(s, C(s, c.a)) >= 6 && c.talk !== false) o.push({ key: 'talk', label: `Speak with ${C(s, c.a).name}`, talk: c.a });
      return o;
    },
  });

  def('plot_found', {
    title: (s, m, c) => { const sc = schemeById(s, c.scheme); return sc ? (sc.kind === 'embezzle' ? 'The Books Do Not Balance' : sc.kind === 'coup' ? 'A Conspiracy!' : sc.kind === 'forge' ? 'Forged Papers' : 'A Plot Uncovered') : 'A Plot Uncovered'; },
    icon: '🗝', auto: 'watch',
    text: (s, m, c) => {
      const sc = schemeById(s, c.scheme);
      if (!sc) return 'The matter has resolved itself.';
      const how = (HOW[c.how] || HOW.rumour)(s, c);
      return `${how}\n\n${plotLine(s, sc)}${c.foiled ? ` ${C(s, sc.owner).name} is in your hands.` : ''}`;
    },
    options: (s, m, c) => {
      const sc = schemeById(s, c.scheme);
      if (!sc) return [{ key: 'ok', label: 'Noted.' }];
      const o = C(s, sc.owner), t = C(s, sc.target), me = player(s), K = SCHEMES[sc.kind];
      const mine = o.realm === s.playerRealm && o.id !== me.id;
      const live = sc.status === 'active';
      const opts = [];
      const finish = (s2, text) => { if (sc.status === 'active') endScheme(s2, sc, 'failed', 'foiled'); return text; };
      if (mine && !o.imprisoned && o.alive) {
        opts.push({ key: 'arrest', label: `Arrest ${o.name}`, tip: 'Into the dungeon, with whoever they name. Their family will resent it.', run: (s2, m2, cast, rng) => {
          jailChar(s2, o);
          const named = [];
          for (const id of sc.backers) { const b = C(s2, id); if (b && b.alive && b.realm === s2.playerRealm && !b.imprisoned && rng.chance(0.55)) { jailChar(s2, b); named.push(b.name); } }
          stain(s2, o, 'treason', t);
          record(s2, `${fullName(s2, me)} arrested ${o.name} for plotting against ${t.id === me.id ? 'the crown' : t.name}${named.length ? `, and ${named.join(' and ')}` : ''}.`, { kind: 'imprison', chars: [o.id, ...sc.backers.slice(0, 2)] });
          return finish(s2, `${o.name} is dragged off${named.length ? `, and so ${named.length > 1 ? 'are' : 'is'} ${named.join(' and ')}` : ''}.`);
        } });
      }
      if (c.foiled && o.imprisoned && o.realm === s.playerRealm && o.alive) {
        opts.push({ key: 'execute', label: `Execute ${o.name}`, tip: 'Final. Their kin will never forgive it.', run: (s2, m2) => { executeChar(s2, m2, o); return finish(s2, `${o.name} meets the headsman.`); } });
        opts.push({ key: 'mercy', label: `Show mercy to ${o.name}`, tip: 'Banish them with their lives. They will hold a grudge, and a claim.', run: (s2, m2, cast, rng) => { exile(s2, m2, o, rng); stain(s2, o, 'treason', t); return finish(s2, `${o.name} is sent out of the realm, alive and bitter.`); } });
      } else if (mine && o.alive && !o.imprisoned) {
        opts.push({ key: 'exile', label: `Banish ${o.name}`, tip: 'Out of your court, into a neighbour\'s. They keep a grudge and a claim.', run: (s2, m2, cast, rng) => { exile(s2, m2, o, rng); addMod(o, 'Banished me', -55, 60, 'banished'); return finish(s2, `${o.name} is escorted to the border.`); } });
      }
      if (live && sc.kind !== 'embezzle') {
        opts.push({ key: 'watch', label: 'Let it ripen, and watch', tip: 'Your spymaster follows every step. You will be ready: it gets much harder for them, and you may catch the others.', run: s2 => { sc.watched = true; return 'The watch is doubled in silence. When the blow comes, you will be ready.'; } });
        const cost = 30 + 25 * SCHEMES[sc.kind].sev;
        opts.push({ key: 'buy', label: `Buy ${o.name} off (−${cost} gold)`, disabled: s.gold < cost, tip: 'The greedy are tempted; the ambitious and the angry are not. If it fails, the money is gone.', run: (s2, m2, cast, rng) => {
          s2.gold -= cost;
          const p = 0.3 + (has(o, 'greedy') ? 0.3 : 0) + (has(o, 'craven') ? 0.15 : 0) - (has(o, 'ambitious') ? 0.2 : 0) - (has(o, 'wrathful') ? 0.15 : 0) - (has(o, 'honest') ? 0.05 : 0) + opinionOf(s2, o).total / 300;
          if (rng.chance(clamp(p, 0.05, 0.85))) { endScheme(s2, sc, 'failed', 'bought off'); addMod(o, 'Bought my silence', 8, 10, 'bought'); return `${o.name} pockets the gold and finds the plan less appealing.`; }
          return `${o.name} takes the money, thanks you, and carries on. (They now know you know.)`;
        } });
      }
      if (live && (sc.kind === 'murder' || sc.kind === 'coup') && (t.id === me.id || t.realm === s.playerRealm)) {
        opts.push({ key: 'guard', label: sc.kind === 'coup' ? 'Pay off the guard captains (−30 gold)' : `Double ${t.id === me.id ? 'your' : t.name + '\'s'} guard (−30 gold)`, disabled: s.gold < 30, tip: sc.kind === 'coup' ? 'Slows the conspirators.' : 'Much harder to kill.', run: s2 => {
          s2.gold -= 30; if (sc.kind === 'coup') sc.progress = Math.max(0, sc.progress - 28); else t.guard = s2.turn + 6; return 'Loyal men are posted at every door.';
        } });
      }
      if (sc.kind === 'embezzle') {
        opts.push({ key: 'fine', label: 'Recover what was stolen and dismiss them', tip: `Take back ${sc.progress} gold; they lose their post and keep their head.`, run: s2 => {
          s2.gold += sc.progress; o.court = false; o.role = 'courtier'; addMod(o, 'Dismissed me', -30, 30, 'dismissed');
          const deed = c.deed && secretById(s2, c.deed); if (deed) reveal(s2, deed, 'audit');
          return finish(s2, `${sc.progress} gold returns to the treasury. ${o.name} leaves their post.`);
        } });
      }
      if (sc.kind === 'forge') {
        opts.push({ key: 'protest', label: 'Send a furious letter', tip: 'They will know that you know. It cools their enthusiasm, a little.', run: s2 => { const r = C(s2, s2.realms[o.realm].ruler); addMod(r, 'Accused of forgery', -12, 12, 'forgery'); sc.progress = Math.max(0, sc.progress - 30); return 'The letter is read aloud at their court, to much coughing.'; } });
      }
      opts.push({ key: 'talk', label: `Confront ${o.name}`, talk: o.id });
      opts.push({ key: 'ignore', label: live ? 'Wave it away' : 'Noted', run: s2 => { if (c.warner && C(s2, c.warner)) addMod(C(s2, c.warner), 'Ignored my warning', -8, 8, 'ignored'); return live ? 'You wave it away. It does not go away.' : ''; } });
      void K;
      return opts;
    },
  });

  def('coup_strike', {
    title: 'Steel in the Corridor', icon: '⚔', auto: 'fight',
    text: (s, m, c) => { const sc = schemeById(s, c.scheme); const o = C(s, c.a); return `A scream, then boots on the stairs. ${o.name} has the conspirators ready${sc && sc.backers.length ? ` (${sc.backers.map(id => C(s, id).name).slice(0, 3).join(', ')} among them)` : ''} and the doors of your chamber are shaking. This is the moment.`; },
    options: (s, m, c) => {
      const o = C(s, c.a);
      return [
        { key: 'fight', label: 'Rally the guards and fight', tip: 'Your marshal and your loyal men decide it.', run: (s2, m2, cast, rng) => { const sc = schemeById(s2, c.scheme); if (!sc) return ''; const r = playerCoup(s2, m2, sc, 'fight', rng); record(s2, r.text, { kind: 'intrigue', chars: [o.id] }); return r.text; } },
        { key: 'bargain', label: `Bargain with ${o.name} (−60 gold)`, disabled: s.gold < 60, tip: 'Everyone has a price, and it is usually less than a crown.', run: (s2, m2, cast, rng) => { const sc = schemeById(s2, c.scheme); if (!sc) return ''; s2.gold -= 60; addMod(o, 'Bought off in a coup', 12, 12, 'bargain'); const r = playerCoup(s2, m2, sc, 'bargain', rng); record(s2, r.text, { kind: 'intrigue', chars: [o.id] }); return r.text; } },
        { key: 'hide', label: 'Slip out by the servants\' stair', tip: 'You will probably live. The crown, perhaps not.', run: (s2, m2, cast, rng) => { const sc = schemeById(s2, c.scheme); if (!sc) return ''; const r = playerCoup(s2, m2, sc, 'flee', rng); record(s2, r.text, { kind: 'intrigue', chars: [o.id] }); return r.text; } },
      ];
    },
  });

  def('blackmail', {
    title: 'A Note Under the Door', icon: '✉', auto: 'pay',
    text: (s, m, c) => { const sec = secretById(s, c.secret), b = C(s, c.a); return `${b.name} stops you in a doorway, smiling too hard. "Majesty, I happen to know that ${sec ? sec.text : 'something that would ruin you'}. I would hate for that to get around. A small token of discretion, ${c.amount} gold, would help me forget."`; },
    options: (s, m, c) => {
      const b = C(s, c.a);
      const spy = roleHolder(s, s.playerRealm, 'spymaster');
      return [
        { key: 'pay', label: `Pay ${c.amount} gold`, disabled: s.gold < c.amount, tip: 'It buys a few seasons. Blackmailers come back.', run: s2 => { s2.gold -= c.amount; const sec = secretById(s2, c.secret); if (sec) sec.hush = s2.turn + 8; addMod(b, 'Paid my silence', 6, 8, 'paid'); return 'The smile widens. "A pleasure doing business."'; } },
        { key: 'refuse', label: 'Refuse', tip: 'They may talk. Then everyone will know.', run: (s2, m2, cast, rng) => {
          addMod(b, 'Refused my price', -25, 20, 'refused'); const sec = secretById(s2, c.secret);
          if (sec && rng.chance(0.6)) { reveal(s2, sec, 'blackmailer'); return `${b.name} shrugs and tells everyone. It is all over the court by supper.`; }
          return `${b.name} bows stiffly and leaves. The secret stays a secret, for now.`;
        } },
        { key: 'silence', label: spy ? `Have ${spy.name} silence them (−60 gold)` : 'Have them silenced (no spymaster)', disabled: s.gold < 60 || !spy, tip: 'A darker road. If it fails, you have made the worst kind of enemy.', run: (s2, m2) => {
          s2.gold -= 60;
          const t = C(s2, c.a), me = player(s2);
          const block = schemeBlock(s2, m2, 'murder', spy, t);
          if (block) return block;
          startScheme(s2, 'murder', spy, t, { by: s2.playerRealm, patron: me.id });
          return `${spy.name} nods. "Leave it with me, Majesty." (A plot has begun; see the Intrigue window.)`;
        } },
        { key: 'talk', label: `Speak with ${b.name}`, talk: b.id },
      ];
    },
  });

  def('spy_found', {
    title: 'A Spy in the House', icon: '🕵', auto: 'expel',
    text: (s, m, c) => { const r = s.realms[c.realm]; return `Your spymaster has caught a quiet little man copying letters in the east wing. He is in the pay of ${C(s, c.a).name} of ${r.name}, and was reporting on your court. He is, at the moment, dangling by the ankles.`; },
    options: (s, m, c) => {
      const r = s.realms[c.realm], ruler = C(s, c.a);
      const sp = ig(s).spies.find(x => x.id === c.spy);
      const done = () => { if (sp) sp.gone = true; };
      return [
        { key: 'turn', label: 'Turn him (−20 gold)', disabled: s.gold < 20, tip: 'Pay him better. He now spies on them for you, if he is as venal as he looks.', run: (s2, m2, cast, rng) => {
          s2.gold -= 20; done();
          if (rng.chance(0.55 + (has(C(s2, c.a), 'paranoid') ? 0 : 0.1))) { ig(s2).spies.push({ id: 'y' + ig(s2).n++, owner: s2.playerRealm, in: c.realm, since: s2.turn, skill: 12 }); return `He cries, he swears, he takes the money. You now have a spy in ${r.name}.`; }
          return 'He takes your money and disappears before dawn. Whose spy he is now, nobody knows.';
        } },
        { key: 'execute', label: 'Hang him on the gate', tip: `A message for ${ruler.name}. They will take it as an insult, and a warning.`, run: s2 => { done(); addMod(ruler, 'Hanged my spy', -18, 20, 'hangspy'); s2.prestige += 2; return 'He is hanged where all can see. The envoys from the east look away.'; } },
        { key: 'expel', label: 'Send him home with a message', tip: 'Polite. Mildly insulting.', run: s2 => { done(); addMod(ruler, 'Caught my spy', -6, 10, 'spyexpel'); return 'He goes home on foot, with your compliments.'; } },
        { key: 'ignore', label: 'Feed him false news', tip: 'He keeps spying. You choose what he sees.', run: s2 => { if (sp) { sp.found = false; sp.fed = true; } return 'You let him go on; you will be careful what you say near him.'; } },
      ];
    },
  });

  def('poach', {
    title: 'An Offer for Your Councillor', icon: '🕊',
    text: (s, m, c) => { const a = C(s, c.a), r = s.realms[c.realm]; return `A rider from ${r.name} was caught leaving ${a.name}'s rooms. ${C(s, c.b).name}, whose court needs a ${a.role}, has offered ${a.name} a grander post, a bigger house and a very large hat.`; },
    auto: 'counter',
    options: (s, m, c) => {
      const a = C(s, c.a);
      return [
        { key: 'counter', label: 'Counter-offer (−40 gold)', disabled: s.gold < 40, tip: 'Money talks. They will stay, and like you better.', run: s2 => { s2.gold -= 40; addMod(a, 'Valued by my ruler', 22, 20, 'valued'); return `${a.name} bows. "I am yours, Majesty. Mostly."`; } },
        { key: 'release', label: 'Let them go', tip: 'The office falls vacant. Someone else will fill it next season.', run: s2 => {
          const r = s2.realms[c.realm]; a.realm = r.id; a.court = false; a.role = 'courtier';
          record(s2, `${a.name} left for the court of ${r.name}.`, { kind: 'court', chars: [a.id] }); return `${a.name} departs with a wave, and a sigh of relief.`;
        } },
        { key: 'forbid', label: '"You are going nowhere."', tip: 'They stay, and sulk. An ambitious one will remember it.', run: s2 => { addMod(a, 'Forbidden to leave', -28, 24, 'forbid'); return `${a.name} stays, and glowers.`; } },
        { key: 'talk', label: `Speak with ${a.name}`, talk: a.id },
      ];
    },
  });

  def('exile_refuge', {
    title: 'An Exile at the Gate', icon: '🚪', auto: 'refuse',
    text: (s, m, c) => { const a = C(s, c.a), r = s.realms[c.realm]; return `${fullName(s, a)}, lately of ${r.name}, arrives at your gate with a few servants and a long story about a coup. They ask for shelter, and for your help getting their rightful place back. The new ${r.name} regime will not be amused if you say yes.`; },
    options: (s, m, c) => {
      const a = C(s, c.a), r = s.realms[c.realm], usurper = C(s, r.ruler);
      return [
        { key: 'shelter', label: `Grant ${a.name} asylum`, tip: 'A loyal friend, and a claim you could press one day. Their usurper will not forgive it.', run: s2 => {
          a.realm = s2.playerRealm; a.court = true; a.role = 'courtier'; addMod(a, 'Gave me shelter', 38, 40, 'shelter'); addMod(usurper, 'Sheltered my enemy', -26, 24, 'shelterenemy');
          record(s2, `${fullName(s2, player(s2))} gave shelter to ${fullName(s2, a)}, exiled from ${r.name}.`, { kind: 'diplomacy', chars: [a.id, usurper.id] });
          return `${a.name} bows to the floor. "I will not forget this."`;
        } },
        { key: 'refuse', label: 'Send them away', tip: 'They go elsewhere. Nobody is offended.', run: () => `${a.name} leaves with dignity, mostly.` },
        { key: 'hand', label: `Hand them to ${usurper.name} (+50 gold)`, tip: 'The usurper pays well. The exile will not survive it.', run: s2 => {
          s2.gold += 50; addMod(usurper, 'Delivered my enemy', 22, 24, 'delivered'); kill(s2, null, a, 'execution'); s2.prestige -= 3;
          record(s2, `${fullName(s2, player(s2))} handed the exile ${a.name} to ${fullName(s2, usurper)} for gold.`, { kind: 'diplomacy', chars: [a.id, usurper.id] });
          return `${a.name} is led away in chains. The gold is counted twice.`;
        } },
      ];
    },
  });

  def('revolt', {
    title: 'The Realm Boils Over', icon: '🔥', auto: 'crush',
    text: (s, m, c) => { const a = C(s, c.a); return `Pitchforks, torches and one very large banner. ${a.name} has put themselves at the head of the discontented, and the crowd at the gates is bigger than the guard. The talk in the taverns is about taxes, tyranny and ${s.stats.executions ? 'the headsman' : 'your hat'}. (Unrest: ${c.unrest}.)`; },
    options: (s, m, c) => {
      const a = C(s, c.a), R = s.realms[s.playerRealm];
      return [
        { key: 'concede', label: 'Hear their grievances (−50 gold)', disabled: s.gold < 50, tip: 'Lower the taxes, feed the hungry. Lose a little face, keep the whole realm.', run: s2 => { s2.gold -= 50; s2.tax = 'low'; s2.mood = Math.min(100, (s2.mood == null ? 60 : s2.mood) + 16); R.unrest = Math.max(0, (R.unrest || 0) - 22); s2.prestige -= 4; addMod(a, 'Heard my grievances', 18, 16, 'heard'); record(s2, `${fullName(s2, player(s2))} met the rebels' demands to avoid a civil war.`, { kind: 'deed', chars: [a.id] }); return 'The crowd cheers. It is a very large, slightly alarming cheer.'; } },
        { key: 'crush', label: 'Send in the army', tip: 'Win, and the throne is safer. Lose, and part of the realm breaks away.', run: (s2, m2, cast, rng) => {
          const mar = council(s2).marshal;
          const ours = R.levies * (1 + (mar ? mar.stats.mar : 8) / 30), theirs = R.levies * 0.45 * (1 + a.stats.mar / 40) * (1 + (R.unrest || 0) / 150);
          const p = clamp(ours / (ours + theirs) + 0.05, 0.25, 0.85);
          if (rng.chance(p)) { R.unrest = Math.max(0, (R.unrest || 0) - 18); s2.mood = Math.max(0, (s2.mood == null ? 60 : s2.mood) - 6); s2.prestige += 5; R.levies = Math.round(R.levies * 0.9); jailChar(s2, a); record(s2, `${fullName(s2, player(s2))} crushed a revolt led by ${a.name}.`, { kind: 'war', chars: [a.id] }); return `The revolt is crushed. ${a.name} is in chains, and the town is very quiet. (−10% levies)`; }
          R.levies = Math.round(R.levies * 0.75);
          const nr = provincesOf(s2, R.id).length >= 4 ? splitRealm(s2, m2, R, a, 0.35) : null;
          if (nr) { R.unrest = Math.round((R.unrest || 0) * 0.5); const w = declareWarLazy(s2, m2, R.id, nr.id); s2.flags.mapDirty = true; record(s2, `A revolt led by ${a.name} split ${nr.name} from ${R.name}.`, { kind: 'war', chars: [a.id], world: `Rebels led by ${a.name} broke ${nr.name} away from ${R.name}.` }); return `The army is routed. ${a.name} declares the new realm of ${nr.name}${w ? ', and your war to take it back begins' : ''}.`; }
          s2.mood = Math.max(0, (s2.mood == null ? 60 : s2.mood) - 10);
          return 'Your army is beaten back. The rebels burn a few barns and go home, for now.';
        } },
        { key: 'bribe', label: 'Buy off the leaders (−80 gold)', disabled: s.gold < 80, tip: 'Cheaper than a war. Sometimes.', run: (s2, m2, cast, rng) => {
          s2.gold -= 80;
          if (rng.chance(0.62)) { R.unrest = Math.max(0, (R.unrest || 0) - 14); addMod(a, 'Bought off', 14, 14, 'bribed'); return `${a.name} takes the purse and discovers a deep love of peace.`; }
          R.unrest = Math.max(0, (R.unrest || 0) - 4);
          return `${a.name} takes the purse, thanks you warmly, and is back at the barricades by evening.`;
        } },
        { key: 'talk', label: `Parley with ${a.name}`, talk: a.id },
      ];
    },
  });

  def('affair_found', {
    title: 'An Unfaithful Heart', icon: '💔', auto: 'forgive',
    text: (s, m, c) => { const a = C(s, c.a), b = C(s, c.b), sec = secretById(s, c.secret); return `The rumour was true. ${a.name} and ${b ? b.name : 'a lover'} have been meeting in secret${sec && sec.sin === 'incest' ? ', and they are kin, which makes it a scandal as well as a heartbreak' : ''}. The court is watching to see what you do.`; },
    options: (s, m, c) => {
      const a = C(s, c.a), b = C(s, c.b), me = player(s);
      const spouse = me.spouse && C(s, me.spouse);
      const culprit = spouse && (spouse.id === a.id ? a : b && spouse.id === b.id ? b : a);
      const lover = culprit === a ? b : a;
      const opts = [{ key: 'forgive', label: 'Rise above it', tip: 'The court whispers; your consort is relieved.', run: s2 => { s2.prestige -= 3; if (culprit) addMod(culprit, 'Forgave my affair', 14, 14, 'forgave'); return 'You say nothing. The silence at dinner is very loud.'; } }];
      if (lover && lover.alive && !lover.imprisoned && lover.realm === s.playerRealm) opts.push({ key: 'jail', label: `Throw ${lover.name} in the dungeon`, tip: 'The lover pays for it. Their family will remember.', run: s2 => { jailChar(s2, lover); if (culprit) bumpRegard(culprit, me, -20); return `${lover.name} is taken from the table in front of everyone.`; } });
      if (culprit && culprit.alive) opts.push({ key: 'punish', label: `Confine ${culprit.name} to their rooms`, tip: 'Your consort is furious, and so is their family.', run: s2 => { addMod(culprit, 'Confined me to my rooms', -35, 30, 'confined'); s2.prestige += 1; return `${culprit.name} is escorted to their chambers with six guards and a very stiff back.`; } });
      opts.push({ key: 'talk', label: `Speak with ${culprit ? culprit.name : a.name}`, talk: (culprit || a).id });
      return opts;
    },
  });
}
void RNG; void regard; void TRAITS; void SINS; void isHumanRealm; void learn; void isRulerChar; void closeTo; void spiesOf; void addSecret; void ageOf;

function declareWarLazy(s2, m2, a, b) { return declareWarFn(s2, m2, a, b, 'revolt'); }
