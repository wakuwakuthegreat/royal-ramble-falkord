// Read path: the graph decides what a character remembers, and says how it got there.
// Every memory comes back with `hop` (how far it sits from the character) and `why` (the path that surfaced it).
import { run } from './run.js';

const COLS = 'm.text AS text, m.kind AS kind, m.date AS date, m.campaign AS campaign, m.at AS at, m.weight AS weight';
const PER_BRANCH = 12;

// Three hops outward from one character, in a single round trip:
//   direct    (Memory)-[:ABOUT]->(Character)
//   families  (Character)-[:MEMBER_OF]->(House)-[:ENTANGLED]->(ruler's House), memories that touch both houses
//   house     (Character)-[:MEMBER_OF]->(House)<-[:ABOUT_HOUSE]-(Memory), what happened to their kin
const CHARACTER = `
MATCH (c:Character {key: $key})<-[:ABOUT]-(m:Memory)
WITH m ORDER BY m.at DESC LIMIT ${PER_BRANCH}
RETURN ${COLS}, 'direct' AS hop, '' AS via, 0 AS n
UNION
MATCH (c:Character {key: $key})-[:MEMBER_OF]->(h:House)-[e:ENTANGLED]->(rh:House {name: $rhouse})
MATCH (m:Memory)-[:ABOUT_HOUSE]->(h), (m)-[:ABOUT_HOUSE]->(rh)
WHERE NOT (m)-[:ABOUT]->(c)
WITH m, rh, e ORDER BY m.at DESC LIMIT ${PER_BRANCH}
RETURN ${COLS}, 'families' AS hop, rh.name AS via, e.n AS n
UNION
MATCH (c:Character {key: $key})-[:MEMBER_OF]->(h:House)<-[:ABOUT_HOUSE]-(m:Memory)
WHERE NOT (m)-[:ABOUT]->(c)
WITH m, h ORDER BY m.at DESC LIMIT ${PER_BRANCH}
RETURN ${COLS}, 'house' AS hop, h.name AS via, 0 AS n`;

// What a line of dialogue stirs: full-text over memories, kept only if they concern this person or their house.
const STIRRED = `
CALL db.idx.fulltext.queryNodes('Memory', $q) YIELD node AS m, score
OPTIONAL MATCH (m)-[:ABOUT]->(c:Character {key: $key})
OPTIONAL MATCH (m)-[:ABOUT_HOUSE]->(h:House {name: $house})
WITH m, score, c, h WHERE c IS NOT NULL OR h IS NOT NULL
RETURN ${COLS}, score, c IS NOT NULL AS direct
ORDER BY score DESC LIMIT $limit`;

const FULLTEXT_ALL = `
CALL db.idx.fulltext.queryNodes('Memory', $q) YIELD node AS m, score
RETURN ${COLS}, score ORDER BY score DESC LIMIT $limit`;

const RECENT = `MATCH (m:Memory) RETURN ${COLS} ORDER BY m.at DESC LIMIT $limit`;

// Graph algorithm as a tool: the shortest chain of entangled families between two houses.
const HOUSE_LINK = `
MATCH (a:House {name: $a}), (b:House {name: $b})
WITH shortestPath((a)-[:ENTANGLED*..4]->(b)) AS p
WHERE p IS NOT NULL
RETURN [x IN nodes(p) | x.name] AS houses, length(p) AS hops`;

const HOP_RANK = { direct: 3, families: 2.2, house: 1.4 };
const STOP = new Set('that this with have from your what when were they them then than will would could should about there their which shall into been being does done just like know tell very much more some your yours'.split(' '));
export const tokens = text => [...new Set(String(text || '').toLowerCase().match(/[a-z]{4,}/g) || [])].filter(w => !STOP.has(w)).slice(0, 6);

const shape = (r, extra) => ({ text: r.text, kind: r.kind, date: r.date, campaign: r.campaign, at: r.at, source: 'graph', ...extra });

/** What this character remembers about the ruler's court: ranked across three hops, oldest first. */
export async function recallCharacter(ns, c, ruler, limit = 10) {
  const key = `${c.name}|${c.house || ''}`;
  const rows = await run(ns, 'recall-character', CHARACTER, { key, rhouse: (ruler && ruler.house) || '' });
  const best = new Map();
  rows.forEach((r, i) => {
    const score = HOP_RANK[r.hop] + 0.35 * r.weight + 0.5 * (r.at / Date.now());
    const why = r.hop === 'direct' ? `Memory —ABOUT→ ${c.name}`
      : r.hop === 'families' ? `Memory —ABOUT_HOUSE→ House ${c.house} —ENTANGLED×${r.n}— House ${r.via}`
        : `Memory —ABOUT_HOUSE→ House ${r.via} ←MEMBER_OF— ${c.name}`;
    const prev = best.get(r.text);
    if (!prev || prev.score < score) best.set(r.text, shape(r, { hop: r.hop, why, score }));
  });
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit).sort((a, b) => a.at - b.at);
}

/** A line of dialogue may stir an old memory. Words are OR-ed; the index stems them (promised ≈ promise). */
export async function recallStirred(ns, c, text, limit = 4) {
  const words = tokens(text);
  if (!words.length) return [];
  const rows = await run(ns, 'recall-stirred', STIRRED, { key: `${c.name}|${c.house || ''}`, house: c.house || '', q: words.join('|'), limit });
  return rows.map(r => shape(r, { hop: r.direct ? 'direct' : 'house', why: `“${words.join(', ')}” matched in the memory index, then ${r.direct ? `—ABOUT→ ${c.name}` : `—ABOUT_HOUSE→ House ${c.house}`}`, score: r.score }));
}

/** Public tales: full-text when there is something to search for, otherwise a spread of recent ones. */
export async function recallWorld(ns, query, limit = 3) {
  const words = tokens(query);
  let rows = words.length ? await run(ns, 'recall-world', FULLTEXT_ALL, { q: words.join('|'), limit }) : [];
  if (!rows.length) {
    const recent = await run(ns, 'recall-recent', RECENT, { limit: 15 });
    rows = recent.sort(() => Math.random() - 0.5).slice(0, limit);
  }
  return rows.map(r => shape(r, { hop: 'world', why: 'Memory in the shared world graph' }));
}

/** Newest first. */
export async function recallRecent(ns, limit = 8) {
  return (await run(ns, 'recall-recent', RECENT, { limit })).map(r => shape(r, { hop: 'world', why: 'Memory in the shared world graph' }));
}

/** "House A → House C → House B", or null when no chain of shared memories connects them. */
export async function houseLink(ns, a, b) {
  if (!a || !b || a === b) return null;
  const rows = await run(ns, 'house-link', HOUSE_LINK, { a, b });
  return rows.length ? { houses: rows[0].houses, hops: rows[0].hops } : null;
}
