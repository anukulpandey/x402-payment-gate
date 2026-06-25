/**
 * Deploy the MockUSDC EIP-3009 token to the configured chain and mint test
 * USDC to the demo agent. Idempotent: if the token already exists at the
 * deterministic address it just tops the agent up.
 *
 *   npm run chain:deploy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseUnits,
  formatUnits,
  getContractAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../src/config.js';
import { addressForKey } from '../src/x402/signer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifact = JSON.parse(
  fs.readFileSync(path.join(root, 'contracts/out/MockUSDC.json'), 'utf8'),
) as { abi: unknown[]; bytecode: `0x${string}` };

const chain = defineChain({
  id: config.chainId,
  name: config.network,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

const deployer = privateKeyToAccount(config.facilitatorPrivateKey);
const pub = createPublicClient({ chain, transport: http(config.rpcUrl) });
const wallet = createWalletClient({ account: deployer, chain, transport: http(config.rpcUrl) });

const log = (...a: unknown[]) => console.log(...a); // eslint-disable-line no-console

async function main() {
  log(`\n  Deploying to ${config.network} (chainId ${config.chainId}) via ${config.rpcUrl}`);
  log(`  deployer / facilitator: ${deployer.address}`);

  // Reuse an existing deployment if present (lets you re-run without resetting Anvil).
  let usdc = config.usdcAddress;
  const existing = await pub.getBytecode({ address: usdc }).catch(() => undefined);
  if (existing && existing !== '0x') {
    log(`  MockUSDC already deployed at ${usdc} — reusing.`);
  } else {
    const predicted = getContractAddress({ from: deployer.address, nonce: await pub.getTransactionCount({ address: deployer.address }) });
    const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    usdc = receipt.contractAddress!;
    log(`  MockUSDC deployed at ${usdc}`);
    if (usdc.toLowerCase() !== config.usdcAddress.toLowerCase()) {
      log(`\n  ⚠️  Deployed address ${usdc} != configured USDC_ADDRESS ${config.usdcAddress}`);
      log(`     (predicted ${predicted}). Set USDC_ADDRESS=${usdc} or reset Anvil so this is the first tx.\n`);
    }
  }

  // Mint test USDC to the demo agent.
  const agent = addressForKey(config.agentPrivateKey);
  const mintHash = await wallet.writeContract({
    address: usdc,
    abi: artifact.abi,
    functionName: 'mint',
    args: [agent, parseUnits('1000', config.usdcDecimals)],
  });
  await pub.waitForTransactionReceipt({ hash: mintHash });

  const [agentBal, platformBal] = await Promise.all([
    pub.readContract({ address: usdc, abi: artifact.abi, functionName: 'balanceOf', args: [agent] }) as Promise<bigint>,
    pub.readContract({ address: usdc, abi: artifact.abi, functionName: 'balanceOf', args: [config.platformWallet] }) as Promise<bigint>,
  ]);

  log(`  agent    ${agent}  →  ${formatUnits(agentBal, config.usdcDecimals)} USDC`);
  log(`  platform ${config.platformWallet}  →  ${formatUnits(platformBal, config.usdcDecimals)} USDC`);

  // Persist the deployed token address back into the env file we loaded, so the
  // next `npm run *:start` picks it up with no manual editing.
  const envFile = process.env.DOTENV_CONFIG_PATH;
  if (envFile) {
    const abs = path.isAbsolute(envFile) ? envFile : path.join(root, envFile);
    if (fs.existsSync(abs)) {
      let txt = fs.readFileSync(abs, 'utf8');
      txt = /^USDC_ADDRESS=.*$/m.test(txt)
        ? txt.replace(/^USDC_ADDRESS=.*$/m, `USDC_ADDRESS=${usdc}`)
        : `${txt.trimEnd()}\nUSDC_ADDRESS=${usdc}\n`;
      fs.writeFileSync(abs, txt);
      log(`  wrote USDC_ADDRESS=${usdc} → ${envFile}`);
    }
  }

  log(`\n  ✓ chain ready. Start GateKeep with X402_MODE=chain.\n`);
}

main().catch((err) => {
  console.error('\n  deploy failed:', err instanceof Error ? err.message : err, '\n');
  process.exit(1);
});
