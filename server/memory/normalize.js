// Turns a raw outbox entry into the structured record the graph stores.
import crypto from 'node:crypto';

// How much a kind of event weighs when the court decides what to bring up first.
const KIND_WEIGHT = {
  promise: 3, murder: 3, plot: 3, execution: 3, coup: 3, scandal: 3, betray: 3, imprison: 2.5, war: 2.5, insult: 2.5, outrage: 2.5,
  audience: 2, gift: 2, gold: 2, marriage: 2, diplomacy: 2, justice: 2, intrigue: 2, exposed: 2, forged: 2, forge: 2, smear: 2, seduce: 2, romance: 2,
  death: 2, revolt: 2, embezzle: 2, rumour: 1.5, reign: 1.5, family: 1.5, birth: 1.5, court: 1, letter: 1, deed: 1, event: 1, life: 1, omen: 1, cheese: 1,
};
const str = (v, n) => (v == null ? '' : String(v)).slice(0, n).trim();
const personKey = (name, house) => `${name}|${house || ''}`;

function person(p) {
  const name = str(p && p.name, 80);
  if (!name) return null;
  const house = str(p.house, 60);
  return { key: personKey(name, house), name, house, title: str(p.title, 60) };
}

/** @returns {{id,text,kind,date,campaign,people,ruler,at,weight}|null} */
export function normalize(ns, e) {
  const text = str(e && e.text, 900);
  if (!text) return null;
  const kind = str(e.kind, 20).toLowerCase() || 'deed';
  const people = [];
  for (const p of (Array.isArray(e.people) ? e.people : []).slice(0, 8)) {
    const x = person(p);
    if (x && !people.some(y => y.key === x.key)) people.push(x);
  }
  const r = person(e.ruler);
  return {
    id: crypto.createHash('sha1').update(ns + '\n' + text).digest('hex').slice(0, 20), // same deed sent twice = one memory
    text, kind,
    date: str(e.date, 40), campaign: Math.max(0, Math.floor(+e.campaign || 0)),
    people, ruler: r,
    at: Date.now(), weight: KIND_WEIGHT[kind] || 1,
  };
}
