import { pathToFileURL } from 'node:url';
import { nanoid } from 'nanoid';
import { store } from './store.js';
import type { GatedEndpoint } from './types.js';

/** A few free, key-less public APIs so the dashboard isn't empty on first run. */
const EXAMPLES: Omit<GatedEndpoint, 'id' | 'createdAt' | 'active'>[] = [
  {
    name: 'GitHub Zen',
    upstreamUrl: 'https://api.github.com/zen',
    method: 'GET',
    priceUsd: 0.001,
    description: 'A random piece of engineering wisdom from GitHub.',
  },
  {
    name: 'Random Dog Photo',
    upstreamUrl: 'https://dog.ceo/api/breeds/image/random',
    method: 'GET',
    priceUsd: 0.002,
    description: 'Returns a URL to a random dog image.',
  },
  {
    name: 'BTC Price Oracle',
    upstreamUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    method: 'GET',
    priceUsd: 0.01,
    description: 'Live Bitcoin spot price in USD, sourced from CoinGecko.',
  },
  {
    name: 'Random Joke',
    upstreamUrl: 'https://official-joke-api.appspot.com/random_joke',
    method: 'GET',
    priceUsd: 0.003,
    description: 'A random setup-and-punchline joke.',
  },
];

export function seedExamples(force = false): number {
  const existing = new Set(store.listEndpoints().map((e) => e.name));
  let added = 0;
  for (const ex of EXAMPLES) {
    if (!force && existing.has(ex.name)) continue;
    store.addEndpoint({ id: nanoid(8), createdAt: Date.now() - added * 1000, active: true, ...ex });
    added++;
  }
  return added;
}

export function seedIfEmpty(): void {
  if (store.listEndpoints().length === 0) {
    const n = seedExamples(false);
    if (n) console.log(`[seed] added ${n} example gated endpoints`);
  }
}

// `npm run seed` → force-add any missing examples.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const n = seedExamples(true);
  console.log(`[seed] added ${n} example endpoints`);
}
