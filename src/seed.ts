import { pathToFileURL } from 'node:url';
import type { GatedEndpoint } from './types.js';

/** A few free, key-less public APIs offered as one-click examples in the dashboard. */
export const EXAMPLES: Omit<GatedEndpoint, 'id' | 'ownerAddress' | 'createdAt' | 'active'>[] = [
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

// Examples are now created per-seller via the dashboard ("Load examples") or the
// POST /api/examples endpoint — there is no global seed.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  console.log('Examples are created per account. Sign in and click "Load examples" in the dashboard,');
  console.log('or POST /api/examples while authenticated.');
}
