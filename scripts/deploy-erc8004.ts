/**
 * Deploy the ERC-8004 Identity + Reputation registries, register the demo agent,
 * and bind its payment wallet — so gates can require a verified identity and
 * gate by reputation.
 *
 *   npm run fuji:erc8004
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../src/config.js';
import { addressForKey } from '../src/x402/signer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identityArt = JSON.parse(fs.readFileSync(path.join(root, 'contracts/out/IdentityRegistry.json'), 'utf8'));
const reputationArt = JSON.parse(fs.readFileSync(path.join(root, 'contracts/out/ReputationRegistry.json'), 'utf8'));

const chain = defineChain({
  id: config.chainId,
  name: config.network,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});
const pub = createPublicClient({ chain, transport: http(config.rpcUrl) });
const facilitator = privateKeyToAccount(config.facilitatorPrivateKey);
const deployer = createWalletClient({ account: facilitator, chain, transport: http(config.rpcUrl) });

const log = (...a: unknown[]) => console.log(...a); // eslint-disable-line no-console

function envGet(key: string): string {
  return process.env[key] ?? '';
}
function writeEnv(updates: Record<string, string>) {
  const file = process.env.DOTENV_CONFIG_PATH;
  if (!file) return;
  const abs = path.isAbsolute(file) ? file : path.join(root, file);
  if (!fs.existsSync(abs)) return;
  let txt = fs.readFileSync(abs, 'utf8');
  for (const [k, v] of Object.entries(updates)) {
    txt = new RegExp(`^${k}=.*$`, 'm').test(txt) ? txt.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : `${txt.trimEnd()}\n${k}=${v}\n`;
  }
  fs.writeFileSync(abs, txt);
}

async function deploy(art: { abi: unknown[]; bytecode: `0x${string}` }, args: unknown[] = []) {
  const hash = await deployer.deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  return receipt.contractAddress!;
}

async function main() {
  log(`\n  ERC-8004 on ${config.network} (chainId ${config.chainId})`);

  // 1. Registries (reuse if already set + code present).
  let identity = config.identityRegistry as `0x${string}` | '';
  let reputation = config.reputationRegistry as `0x${string}` | '';
  const haveCode = identity && (await pub.getBytecode({ address: identity }).catch(() => undefined));
  if (identity && reputation && haveCode && haveCode !== '0x') {
    log(`  reusing registries: identity ${identity}`);
  } else {
    identity = await deploy(identityArt);
    reputation = await deploy(reputationArt, [identity]);
    writeEnv({ IDENTITY_REGISTRY: identity, REPUTATION_REGISTRY: reputation });
    log(`  IdentityRegistry   ${identity}`);
    log(`  ReputationRegistry ${reputation}`);
  }

  // 2. Register the demo agent + bind its payment wallet.
  const agentKey = config.agentPrivateKey;
  const agentAddr = addressForKey(agentKey);
  const idAbi = identityArt.abi;

  const existing = (await pub.readContract({ address: identity, abi: idAbi, functionName: 'agentByWallet', args: [agentAddr] })) as bigint;
  if (existing > 0n) {
    log(`  demo agent already registered as agentId ${existing} (${agentAddr})`);
    log(`\n  ✓ ERC-8004 ready.\n`);
    return;
  }

  // The agent needs a little AVAX to send its own register/setWallet txs.
  const bal = await pub.getBalance({ address: agentAddr });
  if (bal < parseEther('0.02')) {
    const fundHash = await deployer.sendTransaction({ to: agentAddr, value: parseEther('0.05'), chain: null, account: facilitator });
    await pub.waitForTransactionReceipt({ hash: fundHash });
    log(`  funded agent with 0.05 AVAX for registration (was ${formatEther(bal)})`);
  }

  const agentWallet = createWalletClient({ account: privateKeyToAccount(agentKey), chain, transport: http(config.rpcUrl) });
  const agentURI = `${config.publicBaseUrl}/.well-known/agents/${agentAddr}.json`;

  const regHash = await agentWallet.writeContract({ address: identity, abi: idAbi, functionName: 'register', args: [agentURI], chain: null, account: privateKeyToAccount(agentKey) });
  await pub.waitForTransactionReceipt({ hash: regHash });
  const agentId = (await pub.readContract({ address: identity, abi: idAbi, functionName: 'totalAgents' })) as bigint;

  const setHash = await agentWallet.writeContract({ address: identity, abi: idAbi, functionName: 'setAgentWallet', args: [agentId, agentAddr], chain: null, account: privateKeyToAccount(agentKey) });
  await pub.waitForTransactionReceipt({ hash: setHash });

  log(`  registered demo agent → agentId ${agentId}, wallet ${agentAddr}`);
  log(`\n  ✓ ERC-8004 ready. Gates can now require identity / reputation.\n`);
}

main().catch((err) => {
  console.error('\n  deploy-erc8004 failed:', err instanceof Error ? err.message : err, '\n');
  process.exit(1);
});
