// Every Cypher call goes through here, so the game can show exactly what the graph was asked and what it answered.
import { graphFor } from './connection.js';
import { ensureSchema } from './schema.js';

const TRACE_MAX = 60;
const trace = [];
let seq = 0, sent = 0;
export const recentTrace = () => trace.slice();
/** Entries not yet handed on (serverless keeps the trace in Redis, because the next request may land on a fresh function). */
export function takeUnsent() {
  const out = trace.filter(t => t.seq > sent);
  if (out.length) sent = out[out.length - 1].seq;
  return out;
}

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
    // Params are only named, never stored: the trace is public and they hold what players said. Graph names are masked for the same reason.
    trace.push({ seq: ++seq, at: new Date().toISOString(), kind: write ? 'write' : 'read', graph: ns.replace(/^(rr-dyn-.{4}).*$/, '$1…'), label, cypher: cypher.replace(/\s+/g, ' ').trim(), params: Object.keys(params), ms, rows: rows.length });
    if (trace.length > TRACE_MAX) trace.shift();
    return rows;
  } catch (e) {
    stats.failed++;
    throw e;
  }
}
