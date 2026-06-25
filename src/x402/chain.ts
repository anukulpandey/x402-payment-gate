import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  parseAbi,
  recoverTypedDataAddress,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';
import type { PaymentRequirements, PaymentPayload } from '../types.js';
import { TRANSFER_WITH_AUTHORIZATION_TYPES, eip712Domain } from './protocol.js';
import type { VerifyResult, SettleResult } from './facilitator.js';

/** Minimal slice of the EIP-3009 USDC interface we rely on. */
const USDC_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function authorizationState(address,bytes32) view returns (bool)',
  'function transfer(address to,uint256 value) returns (bool)',
  'function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,bytes signature)',
]);

interface ExactEvmInner {
  signature: `0x${string}`;
  authorization: {
    from: `0x${string}`;
    to: `0x${string}`;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: `0x${string}`;
  };
}

// Lazily built so importing this module in mock mode never touches the network.
let clients: { pub: PublicClient; wallet: WalletClient; facilitator: string } | null = null;
function getClients() {
  if (!clients) {
    const chain = defineChain({
      id: config.chainId,
      name: config.network,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });
    const account = privateKeyToAccount(config.facilitatorPrivateKey);
    clients = {
      pub: createPublicClient({ chain, transport: http(config.rpcUrl) }),
      wallet: createWalletClient({ account, chain, transport: http(config.rpcUrl) }),
      facilitator: account.address,
    };
  }
  return clients;
}

export function facilitatorAddress(): string {
  return getClients().facilitator;
}

// Platform wallet client — signs seller payout (withdrawal) transfers. It holds
// the gross USDC collected from settlements and pays out each seller's share.
let platformWallet: WalletClient | null = null;
function getPlatformWallet(): WalletClient {
  if (!config.platformPrivateKey) {
    throw new Error('PLATFORM_PRIVATE_KEY is not set — withdrawals are disabled.');
  }
  if (!platformWallet) {
    const chain = defineChain({
      id: config.chainId,
      name: config.network,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });
    platformWallet = createWalletClient({
      account: privateKeyToAccount(config.platformPrivateKey),
      chain,
      transport: http(config.rpcUrl),
    });
  }
  return platformWallet;
}

/** Pay out USDC from the platform wallet to a seller's wallet. Returns the tx hash. */
export async function payoutUsdc(to: string, atomic: bigint): Promise<`0x${string}`> {
  const wallet = getPlatformWallet();
  const { pub } = getClients();
  const hash = await wallet.writeContract({
    address: config.usdcAddress,
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [to as `0x${string}`, atomic],
    chain: null,
    account: wallet.account ?? null,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('payout transfer reverted');
  return hash;
}

/** Read an account's USDC balance (atomic units). */
export async function usdcBalanceOf(address: string): Promise<bigint> {
  const { pub } = getClients();
  return pub.readContract({
    address: config.usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  }) as Promise<bigint>;
}

function messageOf(auth: ExactEvmInner['authorization']) {
  return {
    from: auth.from,
    to: auth.to,
    value: BigInt(auth.value),
    validAfter: BigInt(auth.validAfter),
    validBefore: BigInt(auth.validBefore),
    nonce: auth.nonce,
  };
}

/**
 * Verify a payment off-chain (signature + recipient + amount + expiry) AND
 * on-chain (sufficient balance, nonce not already used).
 */
export async function chainVerify(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<VerifyResult> {
  try {
    if (payload.scheme !== req.scheme) return { isValid: false, invalidReason: 'invalid_scheme' };
    const inner = payload.payload as unknown as ExactEvmInner;
    const auth = inner.authorization;
    if (!auth || !inner.signature) return { isValid: false, invalidReason: 'invalid_payload' };

    const now = Math.floor(Date.now() / 1000);
    if (now > Number(auth.validBefore)) return { isValid: false, invalidReason: 'payment_expired' };
    if (now < Number(auth.validAfter)) {
      return { isValid: false, invalidReason: 'invalid_exact_evm_payload_authorization_valid_after' };
    }
    if (getAddress(auth.to) !== getAddress(req.payTo)) {
      return { isValid: false, invalidReason: 'invalid_exact_evm_payload_recipient_mismatch' };
    }
    if (BigInt(auth.value) < BigInt(req.maxAmountRequired)) {
      return { isValid: false, invalidReason: 'invalid_exact_evm_payload_authorization_value' };
    }

    const recovered = await recoverTypedDataAddress({
      domain: eip712Domain(req),
      types: TRANSFER_WITH_AUTHORIZATION_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: messageOf(auth),
      signature: inner.signature,
    });
    if (getAddress(recovered) !== getAddress(auth.from)) {
      return { isValid: false, invalidReason: 'invalid_exact_evm_payload_signature' };
    }

    const { pub } = getClients();
    const [used, balance] = await Promise.all([
      pub.readContract({ address: config.usdcAddress, abi: USDC_ABI, functionName: 'authorizationState', args: [auth.from, auth.nonce] }) as Promise<boolean>,
      usdcBalanceOf(auth.from),
    ]);
    if (used) return { isValid: false, invalidReason: 'duplicate_settlement' };
    if (balance < BigInt(req.maxAmountRequired)) return { isValid: false, invalidReason: 'insufficient_funds' };

    return { isValid: true, payer: getAddress(auth.from) };
  } catch (err) {
    return { isValid: false, invalidReason: err instanceof Error ? `verify_error:${err.message.slice(0, 80)}` : 'unexpected_verify_error' };
  }
}

/** Settle by submitting the EIP-3009 transfer on-chain (facilitator pays gas). */
export async function chainSettle(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<SettleResult> {
  const inner = payload.payload as unknown as ExactEvmInner;
  const auth = inner.authorization;
  try {
    const { pub, wallet } = getClients();
    const hash = await wallet.writeContract({
      address: config.usdcAddress,
      abi: USDC_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        auth.from,
        auth.to,
        BigInt(auth.value),
        BigInt(auth.validAfter),
        BigInt(auth.validBefore),
        auth.nonce,
        inner.signature,
      ],
      chain: null,
      account: wallet.account ?? null,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    return {
      success: receipt.status === 'success',
      error: receipt.status === 'success' ? undefined : 'settlement_reverted',
      transaction: hash,
      network: req.network,
      payer: getAddress(auth.from),
      simulated: false,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 160) : 'unexpected_settle_error',
      network: req.network,
      payer: getAddress(auth.from),
      simulated: false,
    };
  }
}
