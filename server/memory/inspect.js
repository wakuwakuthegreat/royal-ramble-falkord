// Read-only views of a tenant graph, for the /api/memory/* endpoints and the README demo.
import { run } from './run.js';

export async function graphSummary(ns) {
  const nodes = await run(ns, 'count-nodes', 'MATCH (n) RETURN labels(n)[0] AS label, count(n) AS n ORDER BY n DESC');
  const edges = await run(ns, 'count-edges', 'MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS n ORDER BY n DESC');
  return { nodes, edges };
}

/** Nodes and edges around the cast, capped, shaped for a force-graph or a table. */
export async function graphSample(ns, limit = 120) {
  const nodes = await run(ns, 'sample-nodes', `MATCH (n) RETURN id(n) AS id, labels(n)[0] AS label, coalesce(n.name, n.kind) AS name, n.text AS text LIMIT $limit`, { limit });
  const edges = await run(ns, 'sample-edges', `MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target, type(r) AS type, r.n AS n LIMIT $limit`, { limit: limit * 3 });
  return { nodes, edges };
}
