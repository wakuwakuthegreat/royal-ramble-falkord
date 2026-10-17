// Read-only views of a tenant graph, for the /api/memory/* endpoints and the README demo.
import { run } from './run.js';

export async function graphSummary(ns) {
  const nodes = await run(ns, 'count-nodes', 'MATCH (n) RETURN labels(n)[0] AS label, count(n) AS n ORDER BY n DESC');
  const edges = await run(ns, 'count-edges', 'MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS n ORDER BY n DESC');
  return { nodes, edges };
}

/** One node and everything it is joined to, one hop out (what the ledger shows when a dot is clicked). */
export async function nodeNeighbours(ns, id) {
  const [self] = await run(ns, 'node', 'MATCH (n) WHERE id(n) = $id RETURN labels(n)[0] AS label, properties(n) AS props', { id });
  if (!self) return null;
  const links = await run(ns, 'node-neighbours', `MATCH (n)-[r]-(m) WHERE id(n) = $id
    RETURN type(r) AS type, id(startNode(r)) = id(n) AS out, r.n AS n, id(m) AS id, labels(m)[0] AS label, coalesce(m.name, m.kind) AS name, m.text AS text, m.date AS date
    ORDER BY m.at DESC LIMIT 40`, { id });
  return { ...self, links };
}

/** Nodes and edges around the cast, capped, shaped for a force-graph or a table. */
export async function graphSample(ns, limit = 120) {
  const nodes = await run(ns, 'sample-nodes', `MATCH (n) RETURN id(n) AS id, labels(n)[0] AS label, coalesce(n.name, n.kind) AS name, n.text AS text LIMIT $limit`, { limit });
  const edges = await run(ns, 'sample-edges', `MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target, type(r) AS type, r.n AS n LIMIT $limit`, { limit: limit * 3 });
  return { nodes, edges };
}
