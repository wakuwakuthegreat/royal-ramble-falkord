// FalkorDB memory layer. Two kinds of tenant, each its own graph:
//   rr-dyn-<player>  everything the world remembers about one dynasty, across reigns and campaigns
//   rr-world         public deeds of every dynasty, shared by all players ("tales from afar")
// The graph IS the memory: with FalkorDB down, characters simply remember nothing (the game keeps running).
import { normalize } from './normalize.js';
import { writeMemory } from './write.js';
import { connect, lastConnectionError, listGraphs } from './connection.js';
import { queryStats, recentTrace, takeUnsent } from './run.js';

export { recallCharacter, recallStirred, recallWorld, recallRecent, houseLink } from './recall.js';
export { graphSummary, graphSample, nodeNeighbours } from './inspect.js';
export { recentTrace, takeUnsent, listGraphs };

export const nsDyn = pid => `rr-dyn-${pid}`;
export const nsMpDyn = (worldId, pid) => `rr-dyn-${pid}-${worldId}`;
export const nsRoom = worldId => `rr-room-${worldId}`;
export const NS_WORLD = 'rr-world';

const stats = { written: 0, failed: 0 };
let up = false;
/** Resolves true once FalkorDB answers (the first call after a serverless cold start waits for it). */
export const ready = () => connect().then(() => (up = true)).catch(e => { console.warn('[falkordb] not reachable yet:', e.message); return false; });
ready();

export const memoryStats = () => ({ ...stats, ...queryStats(), enabled: up, error: up ? null : lastConnectionError() });

// Writes to one graph are queued so a flood of deeds lands in order and never blocks the game.
const chains = new Map();
function enqueue(ns, fn) {
  const next = (chains.get(ns) || Promise.resolve()).then(fn).catch(() => { });
  chains.set(ns, next);
  next.then(() => { if (chains.get(ns) === next) chains.delete(ns); });
  return next;
}

/** items: [{ ns, text, kind?, date?, campaign?, people?: [{name, house, title}], ruler?: {name, house} }] */
export async function rememberMany(items) {
  let queued = 0;
  for (const it of items) {
    const m = normalize(it.ns, it);
    if (!m) continue;
    queued++;
    enqueue(it.ns, async () => {
      try { await writeMemory(it.ns, m); stats.written++; }
      catch (e) { stats.failed++; console.warn('[falkordb] remember failed:', e.message); }
    });
  }
  // a serverless function may freeze the moment it responds, so there the writes must land first
  if (process.env.VERCEL) await flush();
  return { queued, graph: true };
}

/** Resolves when every queued write has landed (used by tests and the demo script). */
export const flush = () => Promise.all([...chains.values()]);
