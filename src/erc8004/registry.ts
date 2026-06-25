import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  zeroHash,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';

/** Minimal slices of the ERC-8004 Identity + Reputation registry interfaces. */
const IDENTITY_ABI = parseAbi([
  'function agentByWallet(address) view returns (uint256)',
  'function agentURI(uint256) view returns (string)',
  'function ownerOf(uint256) view returns (address)',
  'function register(string uri) returns (uint256)',
  'function setAgentWallet(uint256 agentId, address wallet)',
]);
const REPUTATION_ABI = parseAbi([
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
  'function getSummary(uint256 agentId, address[] clients, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
]);

export interface AgentIdentity {
  agentId: number;
  agentURI: string;
  /** Number of on-chain feedback attestations (our reputation signal). */
  reputation: number;
  /** Average feedback score (0–100). */
  score: number;
}

let clients: { pub: PublicClient; platform: WalletClient } | null = null;
function getClients() {
  if (!clients) {
    const chain = defineChain({
      id: config.chainId,
      name: config.network,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });
    const pub = createPublicClient({ chain, transport: http(config.rpcUrl) });
    const platform = createWalletClient({
      account: config.platformPrivateKey ? privateKeyToAccount(config.platformPrivateKey) : undefined,
      chain,
      transport: http(config.rpcUrl),
    });
    clients = { pub, platform };
  }
  return clients;
}

/** Resolve a paying wallet to its ERC-8004 agent identity + reputation, or null. */
export async function resolveAgent(wallet: string): Promise<AgentIdentity | null> {
  const { pub } = getClients();
  try {
    const agentId = (await pub.readContract({
      address: config.identityRegistry as `0x${string}`,
      abi: IDENTITY_ABI,
      functionName: 'agentByWallet',
      args: [wallet as `0x${string}`],
    })) as bigint;
    if (agentId === 0n) return null;

    const [agentURI, summary] = await Promise.all([
      pub.readContract({ address: config.identityRegistry as `0x${string}`, abi: IDENTITY_ABI, functionName: 'agentURI', args: [agentId] }) as Promise<string>,
      pub.readContract({
        address: config.reputationRegistry as `0x${string}`,
        abi: REPUTATION_ABI,
        functionName: 'getSummary',
        args: [agentId, [], '', ''],
      }) as Promise<[bigint, bigint, number]>,
    ]);
    return { agentId: Number(agentId), agentURI, reputation: Number(summary[0]), score: Number(summary[1]) };
  } catch {
    return null;
  }
}

/** Post on-chain feedback about an agent (the gate attesting a paid interaction). */
export async function giveFeedback(agentId: number, value: number, tag: string, endpoint: string): Promise<`0x${string}` | null> {
  if (!config.platformPrivateKey) return null;
  const { pub, platform } = getClients();
  try {
    const hash = await platform.writeContract({
      address: config.reputationRegistry as `0x${string}`,
      abi: REPUTATION_ABI,
      functionName: 'giveFeedback',
      args: [BigInt(agentId), BigInt(value), 0, tag, '', endpoint, '', zeroHash],
      chain: null,
      account: platform.account ?? null,
    });
    await pub.waitForTransactionReceipt({ hash });
    return hash;
  } catch {
    return null;
  }
}
