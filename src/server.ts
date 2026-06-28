import { app } from './app.js';
import { config, isLive } from './config.js';
import { addressForKey } from './x402/signer.js';

// Long-running server (local dev / Render / any always-on host). The serverless
// entry (api/index.ts) imports the same `app` without listening.
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
  console.log(`  dashboard:    http://localhost:${config.port}`);

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
        if (bal === 0n) console.log('  ⚠️  agent has 0 USDC — run `npm run fuji:deploy` first.');
        console.log('');
      })
      .catch((err) => console.log(`  ⚠️  chain not reachable: ${err instanceof Error ? err.message : err}\n`));
  } else {
    console.log('');
  }
  /* eslint-enable no-console */
});
