import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config, isLive } from './config.js';
import { apiRouter } from './routes/api.js';
import { gatewayRouter } from './routes/gateway.js';
import { facilitatorRouter } from './routes/facilitator.js';
import { seedIfEmpty } from './seed.js';
import { addressForKey } from './x402/signer.js';

const app = express();
app.disable('x-powered-by');
app.use(
  cors({
    exposedHeaders: ['X-PAYMENT-RESPONSE', 'X-Gatekeep-Charged', 'X-Gatekeep-Tx'],
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true, mode: config.mode }));

// The gateway proxies arbitrary upstreams, so it needs the raw request body
// (mounted before any JSON parser).
app.use('/g', express.raw({ type: '*/*', limit: '5mb' }), gatewayRouter);

// JSON control-plane APIs.
app.use('/api', express.json({ limit: '1mb' }), apiRouter);
app.use('/facilitator', express.json({ limit: '1mb' }), facilitatorRouter);

// Serve the built dashboard in production; in dev Vite serves it on :5173.
const distDir = path.resolve('web/dist');
const hasDist = fs.existsSync(distDir);
if (hasDist) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/g') ||
      req.path.startsWith('/facilitator')
    ) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) =>
    res.json({
      service: 'GateKeep',
      tagline: 'Stripe for AI agent API calls',
      mode: config.mode,
      dashboard: 'run `npm run dev`, then open http://localhost:5173',
    }),
  );
}

seedIfEmpty();

app.listen(config.port, () => {
  const fee = config.platformFeeBps / 100;
  /* eslint-disable no-console */
  console.log('\n  GateKeep — Stripe for AI agent API calls');
  console.log('  ─────────────────────────────────────────');
  console.log(
    `  mode:         ${config.mode}${
      config.mode === 'mock'
        ? '  (real signatures · simulated settlement)'
        : '  (real on-chain settlement)'
    }`,
  );
  console.log(`  network:      ${config.network}`);
  console.log(`  platform fee: ${fee}%  →  ${config.platformWallet}`);
  console.log(`  agent wallet: ${addressForKey(config.agentPrivateKey)}`);
  console.log(`  api + gates:  http://localhost:${config.port}`);
  console.log(
    `  dashboard:    ${
      hasDist ? `http://localhost:${config.port}` : 'http://localhost:5173  (run: npm run dev)'
    }`,
  );

  if (isLive) {
    // Surface the chain wiring (and agent's USDC balance) so a misconfigured
    // RPC / token / unfunded agent is obvious at boot.
    void import('./x402/chain.js')
      .then(async ({ facilitatorAddress, usdcBalanceOf }) => {
        console.log(`  chain:        ${config.network} (chainId ${config.chainId}) @ ${config.rpcUrl}`);
        console.log(`  USDC token:   ${config.usdcAddress}`);
        console.log(`  facilitator:  ${facilitatorAddress()} (pays gas)`);
        const bal = await usdcBalanceOf(addressForKey(config.agentPrivateKey));
        console.log(`  agent USDC:   ${Number(bal) / 10 ** config.usdcDecimals}`);
        if (bal === 0n) console.log('  ⚠️  agent has 0 USDC — run `npm run chain:deploy` first.');
        console.log('');
      })
      .catch((err) => console.log(`  ⚠️  chain not reachable: ${err instanceof Error ? err.message : err}\n`));
  } else {
    console.log('');
  }
  /* eslint-enable no-console */
});
