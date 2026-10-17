// Every Cypher call goes through here, so the game can show exactly what the graph was asked and what it answered.
import { graphFor } from './connection.js';
import { ensureSchema } from './schema.js';

const TRACE_MAX = 60;
const trace = [];
export const recentTrace = () => trace.slice();

const stats = { writes: 0, reads: 0, failed: 0, readMs: 0 };
export const queryStats = () => ({ ...stats, avgReadMs: stats.reads ? Math.round(stats.readMs / stats.reads) : 0 });

/** Run one named Cypher query against a tenant graph. Reads use GRAPH.RO_QUERY. */
export async function run(ns, label, cypher, params = {}, { write = false } = {}) {
  const t = Date.now();
  try {
    await ensureSchema(ns);
    const g = await graphFor(ns);
    const res = write ? await g.query(cypher, { params }) : await g.roQuery(cypher, { params });
    const rows = res.data || [];
    const ms = Date.now() - t;
    if (write) stats.writes++; else { stats.reads++; stats.readMs += ms; }
    if (!write) { trace.push({ at: new Date().toISOString(), graph: ns, label, cypher: cypher.replace(/\s+/g, ' ').trim(), params, ms, rows: rows.length }); if (trace.length > TRACE_MAX) trace.shift(); }
    return rows;
  } catch (e) {
    stats.failed++;
    throw e;
  }
}
