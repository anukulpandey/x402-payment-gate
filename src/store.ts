import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { GatedEndpoint, CallRecord } from './types.js';

interface DB {
  endpoints: GatedEndpoint[];
  calls: CallRecord[];
}

const dbPath = path.resolve(config.dataDir, 'db.json');
let db: DB = { endpoints: [], calls: [] };

function load() {
  try {
    if (fs.existsSync(dbPath)) {
      const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as Partial<DB>;
      db = { endpoints: parsed.endpoints ?? [], calls: parsed.calls ?? [] };
    }
  } catch (err) {
    console.error('[store] failed to load db, starting fresh:', err);
  }
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
function persist() {
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

load();

// Never lose the last few writes when the process exits.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    flush();
    process.exit(0);
  });
}
process.once('beforeExit', flush);

export const store = {
  listEndpoints(): GatedEndpoint[] {
    return [...db.endpoints].sort((a, b) => b.createdAt - a.createdAt);
  },
  getEndpoint(id: string): GatedEndpoint | undefined {
    return db.endpoints.find((e) => e.id === id);
  },
  addEndpoint(endpoint: GatedEndpoint): GatedEndpoint {
    db.endpoints.unshift(endpoint);
    persist();
    return endpoint;
  },
  updateEndpoint(id: string, patch: Partial<GatedEndpoint>): GatedEndpoint | undefined {
    const e = db.endpoints.find((x) => x.id === id);
    if (!e) return undefined;
    Object.assign(e, patch);
    persist();
    return e;
  },
  deleteEndpoint(id: string): boolean {
    const i = db.endpoints.findIndex((e) => e.id === id);
    if (i < 0) return false;
    db.endpoints.splice(i, 1);
    db.calls = db.calls.filter((c) => c.endpointId !== id);
    persist();
    return true;
  },
  addCall(call: CallRecord): CallRecord {
    db.calls.unshift(call);
    if (db.calls.length > 2000) db.calls.length = 2000;
    persist();
    return call;
  },
  listCalls(limit = 50, endpointId?: string): CallRecord[] {
    const calls = endpointId ? db.calls.filter((c) => c.endpointId === endpointId) : db.calls;
    return calls.slice(0, limit);
  },
  callsForEndpoint(endpointId: string): CallRecord[] {
    return db.calls.filter((c) => c.endpointId === endpointId);
  },
  allCalls(): CallRecord[] {
    return db.calls;
  },
};
