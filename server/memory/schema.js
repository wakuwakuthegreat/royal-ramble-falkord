// Graph data model (one graph per tenant):
//
//   (:Ruler {key,name,house})-[:RECORDED]->(:Memory {id,text,kind,date,campaign,at,weight})
//   (:Memory)-[:ABOUT]->(:Character {key,name,house,title})
//   (:Memory)-[:ABOUT_HOUSE]->(:House {name})
//   (:Character)-[:MEMBER_OF]->(:House)
//   (:Ruler)-[:MEMBER_OF]->(:House)
//   (:House)-[:ENTANGLED {n,last}]->(:House)      two families that share a memory; n counts how often (stored both ways)
//
// The shared "world" graph holds only Memory nodes (public tales have no cast list).
import { graphFor } from './connection.js';

const ready = new Map(); // graph name → Promise, so each graph is prepared once per process

const STATEMENTS = [
  'CREATE INDEX FOR (m:Memory) ON (m.id)',
  'CREATE INDEX FOR (c:Character) ON (c.key)',
  'CREATE INDEX FOR (h:House) ON (h.name)',
  'CREATE INDEX FOR (r:Ruler) ON (r.key)',
  "CALL db.idx.fulltext.createNodeIndex('Memory', 'text')",
];

export function ensureSchema(name) {
  if (!ready.has(name)) {
    ready.set(name, (async () => {
      const g = await graphFor(name);
      for (const q of STATEMENTS) {
        try { await g.query(q); } catch (e) { if (!/already indexed|already exists/i.test(e.message)) console.warn(`[falkordb] schema "${q}" on ${name}:`, e.message); }
      }
    })().catch(e => { ready.delete(name); throw e; }));
  }
  return ready.get(name);
}
