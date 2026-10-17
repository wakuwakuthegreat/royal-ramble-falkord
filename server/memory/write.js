// Write path: one remembered deed becomes a Memory node wired to the people, houses and ruler it concerns.
import { run } from './run.js';

const MERGE_MEMORY = `
MERGE (m:Memory {id: $id})
ON CREATE SET m.text = $text, m.kind = $kind, m.date = $date, m.campaign = $campaign, m.at = $at, m.weight = $weight
RETURN m.id`;

const LINK_PEOPLE = `
MATCH (m:Memory {id: $id})
UNWIND $people AS p
MERGE (c:Character {key: p.key})
ON CREATE SET c.name = p.name, c.house = p.house, c.title = p.title
SET c.title = p.title
MERGE (m)-[:ABOUT]->(c)`;

const LINK_HOUSES = `
MATCH (m:Memory {id: $id})-[:ABOUT]->(c:Character)
WHERE c.house <> ''
MERGE (h:House {name: c.house})
MERGE (c)-[:MEMBER_OF]->(h)
MERGE (m)-[:ABOUT_HOUSE]->(h)`;

// Two houses in one memory = the families are entangled; every further shared memory deepens the bond (or feud).
// Stored in both directions because FalkorDB's shortestPath only walks directed edges.
const LINK_ENTANGLED = `
MATCH (m:Memory {id: $id})-[:ABOUT_HOUSE]->(a:House), (m)-[:ABOUT_HOUSE]->(b:House)
WHERE a.name <> b.name
MERGE (a)-[e:ENTANGLED]->(b)
ON CREATE SET e.n = 1, e.last = $at
ON MATCH SET e.n = e.n + 1, e.last = $at`;

const LINK_RULER = `
MATCH (m:Memory {id: $id})
MERGE (r:Ruler {key: $rkey})
ON CREATE SET r.name = $rname, r.house = $rhouse
MERGE (r)-[:RECORDED]->(m)
WITH r
WHERE r.house <> ''
MERGE (h:House {name: r.house})
MERGE (r)-[:MEMBER_OF]->(h)`;

export async function writeMemory(ns, m) {
  await run(ns, 'remember', MERGE_MEMORY, { id: m.id, text: m.text, kind: m.kind, date: m.date, campaign: m.campaign, at: m.at, weight: m.weight }, { write: true });
  if (m.people.length) {
    await run(ns, 'link-people', LINK_PEOPLE, { id: m.id, people: m.people }, { write: true });
    await run(ns, 'link-houses', LINK_HOUSES, { id: m.id }, { write: true });
    await run(ns, 'link-entangled', LINK_ENTANGLED, { id: m.id, at: m.at }, { write: true });
  }
  if (m.ruler) await run(ns, 'link-ruler', LINK_RULER, { id: m.id, rkey: m.ruler.key, rname: m.ruler.name, rhouse: m.ruler.house }, { write: true });
}
