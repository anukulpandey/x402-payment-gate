import { Buffer } from 'node:buffer';
import { getDefaultAsset, getNetworkId } from 'x402/shared';
import type { Network } from 'x402/types';
import type { PaymentRequirements, PaymentPayload } from 'x402/types';
import { config, isLive } from '../config.js';

/** The x402 protocol version we speak. */
export const X402_VERSION = 1;

/**
 * EIP-712 typed-data structure for an EIP-3009 `transferWithAuthorization`,
 * which is how `exact`-scheme USDC payments are signed in x402.
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export interface ResolvedAsset {
  address: string;
  decimals: number;
  eip712: { name: string; version: string };
  chainId: number;
}

/**
 * The settlement asset (USDC), resolved once at startup.
 *  - chain mode: taken from config (the deployed token + the RPC's chain id),
 *    so the EIP-712 domain the agent signs matches the on-chain contract.
 *  - mock mode: the canonical x402 default asset for the network label.
 */
export const ASSET: ResolvedAsset = isLive
  ? {
      address: config.usdcAddress,
      decimals: config.usdcDecimals,
      eip712: { name: config.usdcName, version: config.usdcVersion },
      chainId: config.chainId,
    }
  : (() => {
      const a = getDefaultAsset(config.network as Network);
      return {
        address: typeof a.address === 'string' ? a.address : String(a.address),
        decimals: a.decimals,
        eip712: a.eip712 as { name: string; version: string },
        chainId: getNetworkId(config.network as Network),
      };
    })();

/** Convert a USD price into atomic token units (e.g. USDC has 6 decimals). */
export function usdToAtomic(usd: number, decimals: number): bigint {
  // Work in integer math to avoid binary-float drift on prices like $0.001.
  return BigInt(Math.round(usd * 10 ** decimals));
}

/**
 * Build the x402 `PaymentRequirements` an agent must satisfy to call a gated
 * resource. This is the body of the HTTP 402 response.
 */
export function buildPaymentRequirements(opts: {
  priceUsd: number;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds?: number;
}): PaymentRequirements {
  // A positive price must always quote at least 1 atomic unit, never 0.
  const atomic = usdToAtomic(opts.priceUsd, ASSET.decimals);
  const maxAmountRequired = (opts.priceUsd > 0 && atomic < 1n ? 1n : atomic).toString();
  return {
    scheme: 'exact',
    network: config.network as Network,
    maxAmountRequired,
    resource: opts.resource,
    description: opts.description,
    mimeType: 'application/json',
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 120,
    asset: ASSET.address,
    extra: ASSET.eip712, // { name, version } — the USDC EIP-712 domain.
  };
}

/** Encode a payment payload into the base64 `X-PAYMENT` header value. */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

/** Decode an `X-PAYMENT` header value back into a payment payload. */
export function decodePaymentHeader(header: string): PaymentPayload {
  return JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as PaymentPayload;
}

/** The EIP-712 domain for the USDC contract named in the requirements. */
export function eip712Domain(requirements: PaymentRequirements) {
  const extra = (requirements.extra ?? {}) as { name?: string; version?: string };
  return {
    name: extra.name ?? ASSET.eip712.name,
    version: extra.version ?? ASSET.eip712.version,
    chainId: ASSET.chainId,
    verifyingContract: requirements.asset as `0x${string}`,
  } as const;
}
