// FalkorDB connection. One server, many graphs: every tenant (a player's dynasty, a shared room, the world)
// is its own graph, so memories can never leak between players and a whole dynasty can be dropped in one call.
import { FalkorDB } from 'falkordb';

const URL = process.env.FALKORDB_URL || 'falkor://localhost:6379';
let dbPromise = null;
let lastError = null;

export function connect() {
  if (!dbPromise) {
    dbPromise = FalkorDB.connect({
      url: URL,
      username: process.env.FALKORDB_USERNAME || undefined,
      password: process.env.FALKORDB_PASSWORD || undefined,
      socket: { reconnectStrategy: n => Math.min(n * 500, 5000) },
    }).then(db => { lastError = null; console.log(`[falkordb] connected to ${URL.replace(/\/\/.*@/, '//')}`); return db; })
      .catch(e => { lastError = e.message; dbPromise = null; throw e; });
  }
  return dbPromise;
}

export async function graphFor(name) {
  return (await connect()).selectGraph(name);
}

export async function listGraphs() {
  return (await connect()).list();
}

export const lastConnectionError = () => lastError;
