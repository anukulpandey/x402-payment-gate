import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { GatedEndpoint, CallRecord, Withdrawal } from './types.js';

interface DB {
  endpoints: GatedEndpoint[];
  calls: CallRecord[];
  withdrawals: Withdrawal[];
}

const empty = (): DB => ({ endpoints: [], calls: [], withdrawals: [] });
let db: DB = empty();

// O(1) endpoint lookup for the hot gateway path (every /g/:id request hits it).
// Rebuilt on load; kept in sync by add/delete (update mutates in place, so the
// Map entry stays valid).
let endpointIndex = new Map<string, GatedEndpoint>();
function reindex() {
  endpointIndex = new Map(db.endpoints.map((e) => [e.id, e]));
}

// ── backend selection ───────────────────────────────────────────────────────
// Redis (Upstash) when configured — for stateless/serverless hosts (Vercel)
// where the filesystem is read-only and each request is a fresh instance.
// Otherwise a local JSON file — for the long-running server (local / Render).
const useRedis = !!config.redisUrl && !!config.redisToken;

function normalize(parsed: Partial<DB> | null | undefined): DB {
  return {
    endpoints: parsed?.endpoints ?? [],
    calls: parsed?.calls ?? [],
    withdrawals: parsed?.withdrawals ?? [],
  };
}

// ── Redis backend ────────────────────────────────────────────────────────────
// The whole DB is stored as one JSON blob under a single key. Reads reload it
// at the start of each request (see `store.load()`); mutations write it back and
// are awaited so a serverless function can't freeze before the write lands.
// NOTE: whole-blob writes mean concurrent mutations on different instances can
// clobber one another. Fine for a demo; a high-write deployment would shard keys.
const REDIS_KEY = 'gatekeep:db';
type RedisClient = { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<unknown> };
let redis: RedisClient | null = null;

async function getRedis(): Promise<RedisClient | null> {
  if (!useRedis) return null;
  if (redis) return redis;
  const { Redis } = await import('@upstash/redis');
  redis = new Redis({ url: config.redisUrl, token: config.redisToken }) as unknown as RedisClient;
  return redis;
}

async function loadRedis() {
  const r = await getRedis();
  if (!r) return;
  try {
    const raw = await r.get(REDIS_KEY);
    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<DB> | null;
    db = normalize(parsed);
    reindex();
  } catch (err) {
    console.error('[store] redis load failed:', err);
  }
}

async function saveRedis() {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(REDIS_KEY, db);
  } catch (err) {
    console.error('[store] redis save failed:', err);
  }
}

// ── File backend ─────────────────────────────────────────────────────────────
const dbPath = path.resolve(config.dataDir, 'db.json');

function loadFile() {
  try {
    if (fs.existsSync(dbPath)) {
      db = normalize(JSON.parse(fs.readFileSync(dbPath, 'utf8')) as Partial<DB>);
    }
  } catch (err) {
    console.error('[store] failed to load db, starting fresh:', err);
  }
  reindex();
}

function writeNow() {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    // Atomic write: serialize to a temp file then rename, so a crash mid-write
    // can never leave a half-written (corrupt) db.json.
    const tmp = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dbPath);
  } catch (err) {
    console.error('[store] failed to persist db:', err);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistFile() {
  // Debounce disk writes so a burst of calls doesn't thrash the filesystem.
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeNow();
  }, 50);
}

/** Flush any pending debounced write immediately (used on shutdown). */
function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  writeNow();
}

// ── unified persistence ──────────────────────────────────────────────────────
async function save() {
  if (useRedis) await saveRedis();
  else persistFile();
}

if (useRedis) {
  // Data is loaded per-request via store.load() (each invocation is fresh).
  console.log('[store] using Redis (Upstash) backend');
} else {
  loadFile();
  // Never lose the last few writes when the long-running process exits.
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      flush();
      process.exit(0);
    });
  }
  process.once('beforeExit', flush);
}

export const store = {
  /**
   * Load the latest snapshot from the backing store. No-op for the file backend
   * (already resident in memory); fetches the blob from Redis for the serverless
   * backend. Call once at the start of each request before any read.
   */
  async load(): Promise<void> {
    if (useRedis) await loadRedis();
  },

  listEndpoints(owner?: string): GatedEndpoint[] {
    const list = owner ? db.endpoints.filter((e) => e.ownerAddress === owner) : db.endpoints;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  },
  getEndpoint(id: string): GatedEndpoint | undefined {
    return endpointIndex.get(id);
  },
  async addEndpoint(endpoint: GatedEndpoint): Promise<GatedEndpoint> {
    db.endpoints.unshift(endpoint);
    endpointIndex.set(endpoint.id, endpoint);
    await save();
    return endpoint;
  },
  async updateEndpoint(id: string, patch: Partial<GatedEndpoint>): Promise<GatedEndpoint | undefined> {
    const e = db.endpoints.find((x) => x.id === id);
    if (!e) return undefined;
    Object.assign(e, patch);
    await save();
    return e;
  },
  async deleteEndpoint(id: string): Promise<boolean> {
    const i = db.endpoints.findIndex((e) => e.id === id);
    if (i < 0) return false;
    db.endpoints.splice(i, 1);
    endpointIndex.delete(id);
    db.calls = db.calls.filter((c) => c.endpointId !== id);
    await save();
    return true;
  },
  async addCall(call: CallRecord): Promise<CallRecord> {
    db.calls.unshift(call);
    if (db.calls.length > 2000) db.calls.length = 2000;
    await save();
    return call;
  },
  /**
   * Insert many records at once (demo-data seeding). NOT a loop over addCall —
   * these records carry historical timestamps, and unshifting them would break
   * the newest-first invariant that /api/calls and analytics rely on. One
   * re-sort, one cap, one save.
   */
  async addCallsBulk(calls: CallRecord[]): Promise<number> {
    db.calls = [...db.calls, ...calls].sort((a, b) => b.ts - a.ts);
    if (db.calls.length > 2000) db.calls.length = 2000;
    await save();
    return calls.length;
  },
  /** Purge one owner's synthetic demo records (see POST /api/demo-data). */
  async removeDemoCalls(owner: string): Promise<number> {
    const before = db.calls.length;
    db.calls = db.calls.filter((c) => !(c.demo && c.ownerAddress === owner));
    if (before !== db.calls.length) await save();
    return before - db.calls.length;
  },
  listCalls(limit = 50, endpointId?: string): CallRecord[] {
    const calls = endpointId ? db.calls.filter((c) => c.endpointId === endpointId) : db.calls;
    return calls.slice(0, limit);
  },
  callsForEndpoint(endpointId: string): CallRecord[] {
    return db.calls.filter((c) => c.endpointId === endpointId);
  },
  callsForOwner(owner: string, limit?: number): CallRecord[] {
    const list = db.calls.filter((c) => c.ownerAddress === owner);
    return limit ? list.slice(0, limit) : list;
  },
  allCalls(): CallRecord[] {
    return db.calls;
  },
  async addWithdrawal(w: Withdrawal): Promise<Withdrawal> {
    db.withdrawals.unshift(w);
    await save();
    return w;
  },
  withdrawalsForOwner(owner: string): Withdrawal[] {
    return db.withdrawals.filter((w) => w.ownerAddress === owner);
  },
  withdrawnUsdForOwner(owner: string): number {
    return db.withdrawals.filter((w) => w.ownerAddress === owner).reduce((s, w) => s + w.amountUsd, 0);
  },
};
