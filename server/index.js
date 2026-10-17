// Royal Ramble API: saves, the FalkorDB memory graph, and character audiences (LLM + graph recall).
import 'dotenv/config';
import { mirror, kv, remote, serverless } from './store.js'; // first: restores the data folder from Redis on free hosts
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chatJSON, llmInfo, fallbackInfo } from './llm.js';
import { rememberMany, recallCharacter, recallStirred, recallWorld, houseLink, graphSummary, graphSample, recentTrace, takeUnsent, ready, nsDyn, nsMpDyn, nsRoom, NS_WORLD, memoryStats } from './memory/index.js';
import { listWorlds, createSharedWorld, deleteWorld, publicWorld, join, leave, view, act, withWorldPlayer } from './worlds.js';
import { audienceContext, disposition, applyExchange, finishAudience, ACTIONS } from '../shared/actions.js';
import { opinionOf } from '../shared/world.js';
import { queueEvent } from '../shared/events.js';
import { forHuman } from '../shared/world.js';
import { startChat, getChat, sayChat, endChat, recap } from './proxy.js';

const app = express();
app.use(express.json({ limit: '3mb' }));

const DATA = path.resolve(process.env.DATA_DIR || 'data', 'players');
fs.mkdirSync(DATA, { recursive: true });
const cleanPid = s => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
const pfile = pid => path.join(DATA, `${pid}.json`);
// Serverless has no durable disk: profiles live straight in Redis (the browser also keeps a copy of every save).
const loadProfile = async pid => {
  if (serverless) return remote ? kv.get(`players/${pid}.json`).catch(() => null) : null;
  try { return JSON.parse(fs.readFileSync(pfile(pid), 'utf8')); } catch { return null; }
};
const saveProfile = async (pid, p) => {
  const j = JSON.stringify(p);
  if (serverless) return remote ? kv.set(`players/${pid}.json`, p) : undefined;
  fs.writeFileSync(pfile(pid), j); mirror(`players/${pid}.json`, j);
};

// ---------------------------------------------------------------- rate limits (anti-spam, cost control)
const LIMITS = { msgsPerAudience: 6, freeMsgs: 3, llmPerHour: 80, audiencesPerHour: 20, msgChars: 300 };
const buckets = new Map();
function take(key, max, windowMs = 3600_000) {
  const now = Date.now();
  const b = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (b.length >= max) { buckets.set(key, b); return false; }
  b.push(now); buckets.set(key, b); return true;
}

// ---------------------------------------------------------------- basic endpoints
app.get('/api/health', async (req, res) => { await ready(); res.json({ ok: true, llm: { ...llmInfo(), fallback: (fallbackInfo() || {}).provider || null }, memory: memoryStats(), serverless }); });

// Shared worlds tick on a clock and keep state in memory, so they need the always-on server (Docker, Render, Fly).
if (serverless) app.use(['/api/worlds', '/api/chat', '/api/recap'], (req, res) => res.status(501).json({ error: 'Shared worlds need the always-on server. Single-player works here.' }));

app.get('/api/profile/:pid', async (req, res) => {
  const pid = cleanPid(req.params.pid);
  if (!pid) return res.status(400).json({ error: 'bad pid' });
  res.json(await loadProfile(pid) || { pid, save: null, campaigns: [] });
});

app.post('/api/save', async (req, res) => {
  const pid = cleanPid(req.body.pid);
  if (!pid) return res.status(400).json({ error: 'bad pid' });
  const prof = await loadProfile(pid) || { pid, campaigns: [] };
  prof.save = req.body.state;
  // every game keeps its own slot, so several can be on the go at once
  const st = req.body.state || {};
  if (st.slot) {
    prof.saves = prof.saves || {};
    prof.saves[st.slot] = st;
    const keys = Object.keys(prof.saves).sort((a, b) => (prof.saves[b].lastPlayed || 0) - (prof.saves[a].lastPlayed || 0));
    for (const k of keys.slice(8)) delete prof.saves[k];
  }
  if (req.body.campaignSummary) {
    prof.campaigns = (prof.campaigns || []).filter(c => c.campaign !== req.body.campaignSummary.campaign).concat([req.body.campaignSummary]);
  }
  prof.updated = new Date().toISOString();
  await saveProfile(pid, prof);
  res.json({ ok: true });
});

app.post('/api/save/delete', async (req, res) => {
  const pid = cleanPid(req.body.pid), slot = String(req.body.slot || '');
  const prof = pid && await loadProfile(pid);
  if (!prof) return res.status(404).json({ error: 'nothing saved' });
  if (prof.saves) delete prof.saves[slot];
  if (prof.save && prof.save.slot === slot) prof.save = Object.values(prof.saves || {}).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0] || null;
  await saveProfile(pid, prof);
  res.json({ ok: true });
});

// The game's outbox: chronicle entries worth remembering → nodes and edges in the FalkorDB graph.
app.post('/api/memory', async (req, res) => {
  const pid = cleanPid(req.body.pid);
  const entries = (req.body.entries || []).slice(0, 60);
  if (!pid) return res.status(400).json({ error: 'bad pid' });
  const items = entries.filter(e => e && e.text).map(e => ({ ...e, ns: e.scope === 'world' ? NS_WORLD : nsDyn(pid) }));
  res.json(await rememberMany(items));
});

app.get('/api/rumours', async (req, res) => {
  try {
    const r = await recallWorld(NS_WORLD, String(req.query.q || ''), 8);
    res.json({ rumours: r.map(x => x.text.replace(/^\[Tales from afar\]\s*/, '')) });
  } catch (e) { res.json({ rumours: [], error: e.message }); }
});

// Proof the graph is doing the work: what it holds for a player, and the last Cypher queries it answered.
app.get('/api/memory/graph', async (req, res) => {
  const pid = cleanPid(req.query.pid);
  if (!pid) return res.status(400).json({ error: 'bad pid' });
  try {
    const ns = req.query.world ? NS_WORLD : nsDyn(pid);
    const sample = req.query.sample ? await graphSample(ns) : null;
    res.json({ graph: ns, ...(await graphSummary(ns)), ...(sample && { sampleNodes: sample.nodes, sampleEdges: sample.edges }) });
  } catch (e) { res.status(502).json({ error: e.message }); }
});
app.get('/api/memory/trace', async (req, res) => {
  const n = Math.min(60, +req.query.n || 20);
  try { res.json({ trace: serverless && remote ? await kv.list('trace', n) : recentTrace().slice(-n) }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});
// Serverless: hand this request's queries to Redis before answering, or the next function instance would never see them.
if (serverless && remote) app.use('/api', (req, res, next) => {
  if (req.path === '/memory/trace') return next();
  const json = res.json.bind(res);
  res.json = body => { const t = takeUnsent(); (t.length ? kv.push('trace', t, 60) : Promise.resolve()).catch(() => { }).finally(() => json(body)); return res; };
  next();
});

// ---------------------------------------------------------------- shared worlds
const wrap = fn => (req, res) => { try { res.json(fn(req)); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } };
app.get('/api/worlds', wrap(req => ({ worlds: listWorlds(cleanPid(req.query.pid)) })));
app.post('/api/worlds', wrap(req => {
  const pid = cleanPid(req.body.pid);
  if (!pid) throw new Error('bad pid');
  if (!take('mkworld:' + pid, 12)) throw Object.assign(new Error('You have founded enough worlds for one hour.'), { status: 429 });
  return createSharedWorld(req.body, pid);
}));
app.post('/api/worlds/:id/delete', wrap(req => deleteWorld(req.params.id, cleanPid(req.body.pid))));
app.get('/api/worlds/:id/public', wrap(req => publicWorld(req.params.id)));
app.post('/api/worlds/:id/join', wrap(req => join(req.params.id, cleanPid(req.body.pid), req.body.realm, req.body.name)));
app.post('/api/worlds/:id/leave', wrap(req => leave(req.params.id, cleanPid(req.body.pid))));
app.get('/api/worlds/:id/view', wrap(req => view(req.params.id, cleanPid(req.query.pid), req.query.v, req.query.busy === '1')));
app.post('/api/worlds/:id/act', wrap(req => {
  const pid = cleanPid(req.body.pid);
  if (!take('act:' + pid, 240, 60_000)) throw Object.assign(new Error('Slow down, your majesty.'), { status: 429 });
  return act(req.params.id, pid, String(req.body.action), Array.isArray(req.body.args) ? req.body.args.slice(0, 4) : []);
}));

// live chats between two online players (server/proxy.js)
app.post('/api/worlds/:id/chat', wrap(req => startChat(req.params.id, cleanPid(req.body.pid), req.body.charId)));
app.get('/api/chat/:cid', wrap(req => getChat(req.params.cid, cleanPid(req.query.pid), req.query.since)));
app.post('/api/chat/:cid/say', wrap(req => {
  const pid = cleanPid(req.body.pid);
  if (!take('chat:' + pid, 30, 60_000)) throw Object.assign(new Error('Catch your breath, your majesty.'), { status: 429 });
  return sayChat(req.params.cid, pid, req.body.text);
}));
app.post('/api/chat/:cid/end', wrap(req => endChat(req.params.cid, cleanPid(req.body.pid))));

// "while you were away": a short paragraph from the chronicle entries since the player left
app.post('/api/recap', async (req, res) => {
  const pid = cleanPid(req.body.pid);
  if (!pid || !take('recap:' + pid, 12)) return res.status(429).json({ error: 'Later.' });
  try { res.json(await recap({ ruler: String(req.body.ruler || 'The ruler').slice(0, 80), realm: String(req.body.realm || '').slice(0, 60), entries: Array.isArray(req.body.entries) ? req.body.entries : [], awayMs: req.body.awayMs })); }
  catch (e) { res.status(502).json({ error: e.message.slice(0, 120) }); }
});

// ---------------------------------------------------------------- audiences
// Live audiences: in memory on an always-on server; in Redis (1 h TTL) on serverless, where the next message may
// reach a different function instance. `set` is called after every change so both stores behave the same.
const live = new Map(); // id → { pid, ctx, fate, transcript, memories, msgs, created }
if (!serverless) setInterval(() => { const now = Date.now(); for (const [k, a] of live) if (now - a.created > 3600_000) live.delete(k); }, 600_000);
const audiences = {
  get: async id => (serverless ? (remote && id ? kv.get('aud/' + id).catch(() => null) : null) : live.get(id)),
  set: async (id, a) => { if (serverless) { if (remote) await kv.set('aud/' + id, a, 3600); } else live.set(id, a); },
  delete: async id => { if (serverless) { if (remote) await kv.del('aud/' + id).catch(() => { }); } else live.delete(id); },
};

const EXPRESSIONS = ['neutral', 'happy', 'laughing', 'smitten', 'flirty', 'smug', 'embarrassed', 'thinking', 'determined', 'sad', 'crying', 'scared', 'surprised', 'disgusted', 'angry', 'rage', 'sleepy'];

function memLine(text) {
  // strip our bookkeeping so the LLM sees clean, dated memories
  return text.replace(/\s*\(Player ruler:[^)]*\)\.?$/, '').replace(/\[campaign (\d+)\]/, 'c$1').slice(0, 400);
}

// What this character remembers, by walking the graph: the memories about them, about their kin, and about the
// families they share a history with; plus how their house links to the ruler's through other families.
async function gatherMemories(dynNs, ctx, extra = {}) {
  const c = ctx.char;
  const me = { name: c.name, house: c.house || '' };
  const safe = p => Promise.resolve(p).catch(e => { console.warn('[falkordb] recall failed:', e.message); return []; });
  const [mine, room, proxy, world, link] = await Promise.all([
    safe(recallCharacter(dynNs, me, ctx.ruler, 10)),
    // shared worlds: what OTHER players did to this character
    extra.room ? safe(recallCharacter(extra.room, me, ctx.ruler, 5)) : [],
    // talking to another player's ruler: what that player's dynasty remembers about you
    extra.proxyNs ? safe(recallCharacter(extra.proxyNs, { name: ctx.ruler.shortName, house: ctx.ruler.house }, { house: c.house }, 6)) : [],
    safe(recallWorld(NS_WORLD, '', 3)),
    safe(houseLink(dynNs, c.house, ctx.ruler.house)),
  ]);
  const seen = new Set();
  const relevant = [];
  for (const m of mine.concat(room, proxy)) {
    if (seen.has(m.text)) continue;
    seen.add(m.text);
    relevant.push(m);
  }
  return { relevant: relevant.slice(0, 10), world: world.slice(0, 3), link: link && link.hops >= 2 ? link : null };
}

function systemPrompt(ctx, fate, mem) {
  const c = ctx.char, r = ctx.ruler;
  const memories = mem.relevant.length
    ? mem.relevant.map(m => `- ${memLine(m.text)}`).join('\n')
    : '- (Nothing notable yet. This may be your first real conversation with this ruler.)';
  const setting = ctx.setting ? `
SETTING: ${ctx.setting}. Your court: ${ctx.culture && ctx.culture.court}. Use fitting titles, food, customs and proverbs naturally. The comedy comes from personalities and situations; never mock or stereotype any culture.` : (ctx.culture && ctx.culture.court ? `
Your court: ${ctx.culture.court}.` : '');
  return `You are roleplaying ${c.name}${c.house ? ' of House ' + c.house : ''}, ${c.title}, ${c.sex === 'f' ? 'a woman' : 'a man'} of ${c.age}${ctx.culture && ctx.culture.label ? ` (${ctx.culture.label})` : ''}, in "Royal Ramble", a lighthearted medieval court game (Crusader Kings meets Monty Python; PG, witty, warm, a bit absurd).${setting}

STYLE: Stay fully in character. Reply in 1–3 short sentences (under 60 words). Vivid, funny, period-flavoured but easy to read. Never mention AI, games, numbers, stats, "opinion" or "memory systems". Use the ruler's title when addressing them.

WHO YOU ARE:
- Traits: ${c.traits.join('; ')}
- Quirk: ${c.name} ${c.quirk}
- Realm: ${c.realm}. ${c.relationship.join(' ')}
- Your feeling toward the ruler: ${c.opinion} on a scale of -100 (loathing) to +100 (adoration). Reasons: ${c.opinionReasons.join(', ') || 'none in particular'}.

THE RULER BEFORE YOU: ${r.name} of House ${r.house}, ${r.sex === 'f' ? 'a WOMAN (she/her; address her as "Your Majesty", "Your Grace" or "my lady"; NEVER call her "man", "sir", "lord", "king" or "he")' : 'a MAN (he/him; "Your Majesty", "my lord", "sire")'}, age ${r.age}, ruling ${r.realm} since ${r.reignStart}. ${r.heir ? 'Their heir is ' + r.heir + '. ' : ''}Treasury ${r.gold} gold, ${r.levies} soldiers, ${r.provinces} provinces. The people are ${r.mood || 'content'} (${r.tax || 'fair'} taxes).${r.wars.length ? ' At war with: ' + r.wars.join(', ') + '.' : ''}
${r.omens && r.omens.length ? 'REAL OMENS RIGHT NOW (these genuinely affect the realm; you may mention them): ' + r.omens.join('; ') + '.' : 'There are NO omens or portents at present: never claim to have seen comets, signs or prophecies (a quirk about omens is just a quirk).'}
Their reputation this reign: ${r.reputation.promisesKept} promises kept, ${r.reputation.promisesBroken} broken, ${r.reputation.insults} insults, ${r.reputation.wars} wars started.${r.previousRulers.length ? '\nPrevious rulers of this dynasty: ' + r.previousRulers.join('; ') + '.' : ''}

WHAT YOU REMEMBER (real past events, oldest first; "cN" = campaign N. Bring these up NATURALLY when relevant: promises owed, broken promises, debts, insults, kindnesses. Deeds of earlier rulers belong to "your late father/mother/predecessor"; memories from earlier campaigns are old family tales):
${memories}
${mem.link ? `HOW THE FAMILIES CONNECT: House ${c.house} and House ${r.house} are tied through shared history: ${mem.link.houses.map(h => 'House ' + h).join(' → ')}. Mention it only if it fits.` : ''}
${r.infamy && r.infamy.length ? `THE RULER'S DARK REPUTATION (publicly known, the court whispers it): ${r.infamy.join('; ')}. React in character: the pious are horrified, the honest wary, the cynical or ambitious merely impressed, the kin of victims hostile.` : ''}
${c.infamy && c.infamy.length ? `You yourself are publicly known as: ${c.infamy.join(', ')}. Your own feelings about that are up to your nature.` : ''}
${c.relations && c.relations.length ? 'YOUR RELATIONSHIPS (regard −100..100; mention naturally, never as numbers): ' + c.relations.join(' | ') : ''}
MONEY SCALE: gold is precious. 25 gold is a month's wages for a whole garrison, a real sum, never a 'pittance' or 'crumbs' unless you are a wealthy ruler being offered it as a bribe for something huge. Your own means: ${c.wealth || 'comfortable'}. A modest or comfortable person is moved by 25+ gold; even the wealthy respect 100+. React to the AMOUNT and to what it is for, not with reflex mockery.
${c.lately && c.lately.length ? 'WHAT HAS HAPPENED TO YOU LATELY: ' + c.lately.join(' | ') : ''}
${ctx.promises.length ? 'PROMISES THE RULER MADE YOU: ' + ctx.promises.join('; ') : 'THE RULER HAS MADE YOU NO PROMISES. If they ask what they promised, or you are tempted to claim a promise (tribute, gold, titles), there is none: say you recall no such promise.'}
A promise marked "kept" was ALREADY honoured and is settled: never demand it again. Only promises marked "open" are still owed.
PROMISES AND DEMANDS ARE ONLY REAL IF LISTED ABOVE OR IN YOUR MEMORIES. Never invent a past promise, debt or tribute.
${ctx.openPromises && ctx.openPromises.length ? 'OPEN PROMISES (numbered): ' + ctx.openPromises.map(p => `#${p.n} "${p.text}"`).join('; ') : ''}
${mem.world.length ? 'GOSSIP FROM DISTANT LANDS (only mention if it fits): ' + mem.world.map(m => memLine(m.text).replace(/^\[Tales from afar\]\s*/, '')).join(' | ') : ''}

${c.proxy ? `YOU SPEAK FOR A ROYAL HOUSE RULED BY ANOTHER PLAYER (${c.proxy.name}), who is away. Speak as their ruler would, guided by what their dynasty remembers.${c.proxy.guide ? ` What ${c.proxy.name} told their stand-in (follow it): "${c.proxy.guide}".` : ''} Make no binding promises on their behalf; say you will "put it to the council".\n\n` : ''}YOUR FATE THIS AUDIENCE (decided already; never contradict it, never describe it as rules):
${fate.fate.join('\n') || '- Nothing special.'}

DEEDS: you can only truly DO what your fate above lists. If the ruler asks for something concrete that your fate does not cover (kill or ruin someone, spy, report, appoint, pay, march), do NOT say "consider it done" or "I shall whisper to the men": say, in character, that it is beyond you or that you refuse. If your fate says WILL AGREE, agree AND fill "granted" in the same reply, so it really happens. If the ruler names a relative ("your brother", "your father"), they mean YOUR relative from YOUR RELATIONSHIPS above: use that person's name.
INTRIGUE: plots, murders, affairs and secrets are REAL only when your fate above names them. Never invent a plot, a poisoning or a scandal that is not in your fate or your memories. Keep dark topics in the game's lighthearted PG spirit (suspicious mushrooms, a cousin with a knife, wine that tastes odd), never graphic.

Respond with JSON only:
{"line": "what you say", "expression": one of ${JSON.stringify(EXPRESSIONS)}, "gesture": "nod" | "shake" | "look away" | "none",
 "opinion_delta": integer -12..8 (how this exchange changes your feeling; flattery/gifts/apology/keeping word = up, insults/threats/lies/broken promises = down; usually -3..3),
 "player_promise": null OR {"text": "the ruler's commitment as a short first-person quote, e.g. 'I will pay you 50 gold by winter'", "kind": "gold" | "war" | "vague", "amount": number or null, "target": "realm name or null", "deadline_seasons": 1-12},
 "granted": null OR {"type": "gold" | "alliance" | "peace" | "troops" | "secret" | "warn" | "confess" | "join_plot" | "council" | "plot" | "watch" | "heir", "amount": number or null, "role": "chancellor"|"marshal"|"steward"|"spymaster"|"priest" or null (only for "council"), "target": a person's name or null (only for "plot" and "watch"), "kind": "murder"|"smear" or null (only for "plot")} (ONLY if you agree to it in THIS line AND your fate allows it. "secret": you tell the secret named in your fate. "warn": you warn of the plot named in your fate. "confess": you break down and confess. "join_plot": you agree to join the ruler's scheme. "council": you accept the office. "plot": you agree to arrange the death or ruin the ruler asked for. "watch": you agree to keep watch on the named person and report to the ruler. "heir": you accept being named the ruler's heir),
 "kept_promise": null OR the number of an OPEN promise that the ruler fulfils RIGHT NOW in their message (e.g. hands over the promised gold, or says they have done what they promised). Thank them warmly if so, and NEVER complain in the same line that it is still owed. If a promise is listed as already kept, it is settled: believe the ruler and thank them,
 "ends_audience": true if you storm off or the conversation is clearly over}
Only fill player_promise when the RULER (not you) explicitly commits to a concrete future action. Pleasantries are not promises.`;
}

app.post('/api/audience/start', async (req, res) => {
  const pid = cleanPid(req.body.pid);
  let { ctx, fate, reason } = req.body;
  const worldId = req.body.worldId ? String(req.body.worldId) : null;
  if (!pid || (!worldId && (!ctx || !fate))) return res.status(400).json({ error: 'missing fields' });
  if (!take('aud:' + pid, LIMITS.audiencesPerHour)) return res.status(429).json({ error: 'The court is weary. Too many audiences this hour.' });
  if (!take('llm:' + pid, LIMITS.llmPerHour)) return res.status(429).json({ error: 'Rate limited' });
  let world = null;
  if (worldId) {
    // shared world: the server owns the state, so it spends the bell and rolls the fate itself
    try {
      const charId = String(req.body.charId);
      const r = withWorldPlayer(worldId, pid, (s, m) => {
        const spent = ACTIONS.audience(s, m, charId, !!req.body.free);
        if (!spent.ok) return { error: spent.msg };
        const c = s.chars[charId];
        return { ctx: audienceContext(s, m, c), fate: disposition(s, c, `${s.seed}:${s.turn}:${charId}:${Date.now()}`) };
      });
      if (r.error) return res.status(400).json({ error: r.error });
      ({ ctx, fate } = r);
      world = { id: worldId, charId };
    } catch (e) { return res.status(e.status || 400).json({ error: e.message }); }
  }
  const dynNs = world ? nsMpDyn(world.id, pid) : nsDyn(pid);
  const proxy = ctx.char && ctx.char.proxy;
  try {
    const mem = await gatherMemories(dynNs, ctx, world ? { room: nsRoom(world.id), proxyNs: proxy ? nsMpDyn(world.id, proxy.pid) : null } : {});
    const id = crypto.randomUUID();
    const sys = systemPrompt(ctx, fate, mem);
    const opener = `[The ruler has summoned you to a private audience${reason ? ' (' + reason + ')' : ''}. Greet them in character. If you remember something important about them (a promise, a grudge, a kindness, a debt, something their predecessor did), you may open with it.]`;
    const out = await chatJSON([{ role: 'system', content: sys }, { role: 'user', content: opener }]);
    // a free audience (offered by an event) is a short chat; a bell buys the full one
    const limit = Math.max(2, Math.min(req.body.free ? LIMITS.freeMsgs : LIMITS.msgsPerAudience, +fate.patience || LIMITS.msgsPerAudience));
    const a = { pid, ctx, fate, sys, mem, msgs: 0, limit, ledgerKey: ledgerKeyOf({ promises: ctx.promises, open: ctx.openPromises }), created: Date.now(), world, dynNs, aud: { id, delta: 0, used: {}, promises: 0, fate }, transcript: [{ role: 'user', content: opener }, { role: 'assistant', content: JSON.stringify({ line: out.line }) }], lines: [{ who: 'them', text: out.line }] };
    await audiences.set(id, a);
    res.json({ id, reply: sanitize(out), memories: mem.relevant.map(m => ({ text: memLine(m.text), source: m.source, why: m.why })), link: mem.link && mem.link.houses, rumours: mem.world.map(m => memLine(m.text)), limit, opinion: ctx.char.opinion, fate: world ? fate : undefined });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'The character is lost for words. (' + e.message.slice(0, 120) + ')' });
  }
});

app.post('/api/audience/say', async (req, res) => {
  const a = await audiences.get(req.body.id);
  if (!a || a.pid !== cleanPid(req.body.pid)) return res.status(404).json({ error: 'No such audience' });
  if (a.msgs >= a.limit || a.walked) return res.status(429).json({ error: 'The audience is over.', over: true });
  if (!take('llm:' + a.pid, LIMITS.llmPerHour)) return res.status(429).json({ error: 'Rate limited' });
  const msg = String(req.body.message || '').slice(0, LIMITS.msgChars).trim();
  if (!msg) return res.status(400).json({ error: 'Say something' });
  a.msgs++;
  try {
    // targeted recall: does this message stir anything specific?
    const extra = await recallStirred(a.dynNs, a.ctx.char, msg, 4).catch(e => { console.warn('[falkordb] stir failed:', e.message); return []; });
    const known = new Set(a.mem.relevant.map(m => m.text));
    const fresh = extra.filter(m => !known.has(m.text));
    fresh.forEach(m => a.mem.relevant.push(m));
    const left = a.limit - a.msgs;
    // promises change during a talk (you pay, you promise): tell them the ledger as it stands now
    let ledger = null;
    if (a.world) {
      try { ledger = withWorldPlayer(a.world.id, a.pid, (s, m) => { const x = audienceContext(s, m, s.chars[a.world.charId]); return { promises: x.promises, open: x.openPromises }; }); } catch { }
    } else if (req.body.ledger && Array.isArray(req.body.ledger.promises) && Array.isArray(req.body.ledger.open)) {
      ledger = { promises: req.body.ledger.promises.slice(0, 12).map(x => String(x).slice(0, 200)), open: req.body.ledger.open.slice(0, 8).map(p => ({ n: +p.n || 0, text: String(p.text || '').slice(0, 160) })) };
    }
    let ledgerNote = '';
    if (ledger) {
      const key = ledgerKeyOf(ledger);
      if (key !== a.ledgerKey) {
        ledgerNote = `\n[LEDGER UPDATE (the lists in your instructions are now out of date; trust this): promises the ruler made you: ${ledger.promises.join('; ') || 'none'}. STILL OWED (open, numbered for "kept_promise"): ${ledger.open.map(p => '#' + p.n + ' "' + p.text + '"').join('; ') || 'nothing'}.]`;
        a.ledgerKey = key;
      }
    }
    const note = (ledgerNote || '') + (fresh.length ? `\n[This reminds you of: ${fresh.map(m => memLine(m.text)).join(' | ')}]` : '');
    const wrap = left === 0 ? '\n[This is the last exchange; wrap up the audience naturally.]' : '';
    a.transcript.push({ role: 'user', content: `The ruler says: "${msg}"${note}${wrap}` });
    const out = await chatJSON([{ role: 'system', content: a.sys }, ...a.transcript.slice(-12)]);
    a.transcript.push({ role: 'assistant', content: JSON.stringify({ line: out.line }) });
    a.lines.push({ who: 'ruler', text: msg }, { who: 'them', text: out.line });
    const reply = sanitize(out);
    reply.said = msg;
    if (reply.ends_audience) a.walked = a.aud.walked = true;
    let notes, opinion;
    if (a.world) {
      try {
        ({ notes, opinion } = withWorldPlayer(a.world.id, a.pid, (s, m) => {
          const c = s.chars[a.world.charId];
          const n = applyExchange(s, c, a.aud, reply, m);
          return { notes: n, opinion: opinionOf(s, c).total };
        }));
      } catch (e) { notes = []; }
    }
    await audiences.set(req.body.id, a);
    res.json({ reply, stirred: fresh.map(m => ({ text: memLine(m.text), source: m.source, why: m.why })), left, notes, opinion });
  } catch (e) {
    console.error(e);
    a.msgs--;
    if (a.transcript.length && a.transcript[a.transcript.length - 1].role === 'user') a.transcript.pop(); // so a retry is not said twice
    await audiences.set(req.body.id, a).catch(() => { });
    res.status(502).json({ error: 'The character stares blankly. (' + e.message.slice(0, 120) + ')' });
  }
});

app.post('/api/audience/end', async (req, res) => {
  const a = await audiences.get(req.body.id);
  if (!a || a.pid !== cleanPid(req.body.pid)) return res.status(404).json({ error: 'No such audience' });
  await audiences.delete(req.body.id);
  if (a.world) {
    try { withWorldPlayer(a.world.id, a.pid, (s, m) => finishAudience(s, m, s.chars[a.world.charId], a.aud)); } catch { }
  }
  if (a.msgs === 0) return res.json({ notes: [] });
  const c = a.ctx.char;
  try {
    const transcript = a.lines.map(l => `${l.who === 'ruler' ? a.ctx.ruler.name : c.name}: ${l.text}`).join('\n');
    const out = await chatJSON([
      { role: 'system', content: 'You write short memory notes for characters in a medieval court game. Output JSON only.' },
      { role: 'user', content: `Conversation (${a.ctx.date}) between ${a.ctx.ruler.name} (the ruler) and ${c.name} of House ${c.house || '—'}, ${c.title}:\n${transcript}\n\nWrite 1–3 memory notes capturing what ${c.name} would remember later: promises or commitments, requests made or refused, insults, flattery, apologies, gifts, revelations, how the ruler treated them. Each note: one sentence, past tense, naming both people, specific. Also give ${c.name}'s overall feeling as one word.\nJSON: {"notes": ["..."], "feeling": "..."}` },
    ], { temperature: 0.3, max_tokens: 300 });
    const notes = (out.notes || []).slice(0, 3).map(n => String(n).slice(0, 300));
    const fullRuler = `(Player ruler: ${a.ctx.ruler.name} of House ${a.ctx.ruler.house}.)`;
    const memText = n => `[${a.ctx.date}, campaign ${a.ctx.campaign}] [audience] ${n} — involves: ${c.name} of House ${c.house || '—'} (${c.title}); feeling afterwards: ${out.feeling || 'mixed'}. ${fullRuler}`;
    // the conversation partners are linked as nodes: the character, and the ruler who spoke to them
    const link = { kind: 'audience', date: a.ctx.date, campaign: a.ctx.campaign, ruler: { name: a.ctx.ruler.shortName, house: a.ctx.ruler.house }, people: [{ name: c.name, house: c.house || '', title: c.title }, { name: a.ctx.ruler.shortName, house: a.ctx.ruler.house, title: 'Ruler' }] };
    const items = notes.map(n => ({ ...link, ns: a.dynNs, text: memText(n) }));
    if (a.world && c.realm !== a.ctx.ruler.realm) items.push(...notes.map(n => ({ ...link, ns: nsRoom(a.world.id), text: memText(n) })));
    if (a.world && c.proxy) {
      // the other player's dynasty remembers what was said in their name, and hears about it
      items.push(...notes.map(n => ({ ...link, ns: nsMpDyn(a.world.id, c.proxy.pid), text: memText(n) })));
      try {
        withWorldPlayer(a.world.id, c.proxy.pid, s => {
          const me = Object.values(s.chars).find(x => x.alive && s.realms[x.realm] && s.realms[x.realm].ruler === x.id && s.realms[x.realm].name === a.ctx.ruler.realm);
          if (me) queueEvent(s, 'envoy_spoke', { a: me.id, notes: notes.join(' ') });
        });
      } catch { }
    }
    await rememberMany(items);
    res.json({ notes, feeling: out.feeling });
  } catch (e) {
    console.error(e);
    res.json({ notes: [], error: e.message });
  }
});

// ---------------------------------------------------------------- the advisor
// A plain helper chatbot (no graph memory): the client sends the question plus pre-ranked candidate
// lists it computed from the game state; the LLM picks from those lists by ref and explains why.
const RULES = `HOW THE GAME WORKS (explain simply if asked):
- Each "season" is one turn. Press End Season (bottom right) to pass it: gold and soldiers come in, you get one audience bell, and events, battles, births and deaths happen.
- Talking to a character costs one audience bell (max 3; +1 each season). Audiences offered by events are free but short (3 exchanges). Characters remember what you say (their memories live in a graph database) and some storm out if insulted.
- Click any realm on the map or any name to see that character. Gifts raise opinion. Alliances need opinion 30+.
- War: only on neighbours. Each season brings one battle; you choose Charge / Hold / Flank. Victories push the war score; at +100 you take the province, at -100 you lose. Offer peace at +60 to take it early, or a white peace near 0.
- Promises get deadlines and characters collect. Breaking them makes enemies.
- Marriage: propose to an unmarried adult (not a ruler) for yourself or your children; foreign matches warm their ruler.
- Intrigue (the 🗝 button): people scheme in secret (murder, coups, smears, seductions, embezzling, forged claims). Your spymaster and spies find plots; secrets can be exposed, used for blackmail, or checked. You can scheme too, through yourself or an agent. Public sins (kinslaying, regicide, incest, forgery...) stain a name until you do penance.
- Wars have reasons: conquest, holy war (different faith), a claim (real or forged), or putting an exile back on a throne. Allies on both sides join in. Unrest can split a realm in two.
- The council can be reshuffled: appoint any courtier, or invite one from abroad. You can name a younger child as heir (the eldest will resent it).
- Shared worlds: seasons turn by themselves on a real-time clock (30 s to 5 min); the founder can hurry it.`;

app.post('/api/advisor', async (req, res) => {
  const pid = cleanPid(req.body.pid);
  if (!pid) return res.status(400).json({ error: 'bad pid' });
  if (!take('adv:' + pid, 60)) return res.status(429).json({ error: 'Your advisor needs a nap. Try again later.' });
  const q = String(req.body.question || '').slice(0, 300).trim();
  const facts = req.body.facts || {};
  if (!q) return res.status(400).json({ error: 'Ask something' });
  const refs = new Set();
  const lists = facts.lists && typeof facts.lists === 'object' ? facts.lists : {};
  for (const k of Object.keys(lists)) if (Array.isArray(lists[k])) lists[k] = lists[k].slice(0, 10).map(x => { if (x && x.ref) refs.add(String(x.ref)); return x; });
  const history = (Array.isArray(req.body.history) ? req.body.history : []).slice(-4).map(h => [{ role: 'user', content: String(h.q || '').slice(0, 300) }, { role: 'assistant', content: JSON.stringify({ line: String(h.a || '').slice(0, 400) }) }]).flat();
  const sys = `You are ${String(facts.advisor || 'the royal advisor').slice(0, 80)}, a loyal, dry-witted advisor to ${String(facts.ruler || 'the ruler').slice(0, 80)} in a lighthearted medieval court game.${facts.setting ? ' Setting: ' + String(facts.setting).slice(0, 200) : ''}
Help the ruler find things and decide. Reply in 1–3 short sentences (under 70 words), warm and a little funny. If the request does not fully apply (e.g. they are already married), say so cheerfully and help anyway.
When the ruler asks you to find, suggest, rank or list something, choose 1–4 entries ONLY from the lists below, by their exact "ref". Never invent refs or names. Give each a short reason (under 14 words) based on the facts given.
Each card you pick has buttons that DO things (declare war, propose an alliance, propose marriage, keep a promise, give a gift, talk). When the ruler asks you to DO something ("keep my promise to X", "ally with Y", "attack Z"), pick the matching card and tell them to press its button. Promises are refs starting "p:".
${RULES}

THE STATE OF THE REALM:
${JSON.stringify(facts.realm || {}).slice(0, 1500)}

CANDIDATE LISTS (pick from these):
${JSON.stringify(lists).slice(0, 6000)}

Respond with JSON only: {"line": "what you say", "picks": [{"ref": "...", "why": "..."}]}`;
  try {
    const out = await chatJSON([{ role: 'system', content: sys }, ...history, { role: 'user', content: q }], { temperature: 0.6, max_tokens: 400 });
    const picks = (Array.isArray(out.picks) ? out.picks : []).filter(p => p && refs.has(String(p.ref))).slice(0, 4).map(p => ({ ref: String(p.ref), why: String(p.why || '').slice(0, 140) }));
    res.json({ line: String(out.line || 'Hmm.').slice(0, 500), picks });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Your advisor mumbles something about the weather. (' + e.message.slice(0, 100) + ')' });
  }
});

/** A comparable fingerprint of what the ruler owes a character. */
const ledgerKeyOf = l => JSON.stringify([(l.promises || []).map(String), (l.open || []).map(p => [+p.n || 0, String(p.text || '')])]);

function sanitize(out) {
  const o = out || {};
  return {
    line: String(o.line || '…').slice(0, 500),
    expression: EXPRESSIONS.includes(o.expression) ? o.expression : 'neutral',
    gesture: ['nod', 'shake', 'look away'].includes(o.gesture) ? o.gesture : 'none',
    opinion_delta: Number.isFinite(+o.opinion_delta) ? +o.opinion_delta : 0,
    player_promise: o.player_promise && o.player_promise.text ? o.player_promise : null,
    granted: o.granted && o.granted.type ? o.granted : null,
    ends_audience: !!o.ends_audience,
    kept_promise: Number.isFinite(+o.kept_promise) && +o.kept_promise > 0 ? Math.round(+o.kept_promise) : null,
  };
}

// ---------------------------------------------------------------- static (production)
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

export default app; // Vercel imports this (api/index.js); everywhere else we listen below

const PORT = process.env.PORT || 8787;
if (!serverless) app.listen(PORT, () => console.log(`[royal-ramble] api on :${PORT} · llm ${llmInfo().provider}/${llmInfo().model} · falkordb memory ${memoryStats().enabled ? 'on' : 'connecting…'}`));
