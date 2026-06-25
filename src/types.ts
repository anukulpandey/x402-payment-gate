export type { PaymentRequirements, PaymentPayload } from 'x402/types';

/** A REST endpoint the user has wrapped behind an x402 payment gate. */
export interface GatedEndpoint {
  id: string;
  /** Lowercased wallet address of the seller who owns this gate. */
  ownerAddress: string;
  name: string;
  /** Upstream REST API that actually serves the response. */
  upstreamUrl: string;
  /** HTTP method to allow, or "ANY". */
  method: string;
  /** Price per call, in USD. */
  priceUsd: number;
  description: string;
  createdAt: number;
  active: boolean;
  /** ERC-8004: only serve agents with a registered on-chain identity. */
  requireIdentity?: boolean;
  /** ERC-8004: minimum agent reputation (number of prior on-chain attestations). */
  minReputation?: number;
}

/** One request that hit a gated endpoint (paid or unpaid). */
export interface CallRecord {
  id: string;
  endpointId: string;
  /** Owner of the gated endpoint (denormalized for per-seller stats). */
  ownerAddress: string;
  endpointName: string;
  ts: number;
  method: string;
  path: string;
  /** Final HTTP status returned to the caller. */
  status: number;
  paid: boolean;
  /** Gross charged for the call, in USD. */
  amountUsd: number;
  platformFeeUsd: number;
  sellerEarningsUsd: number;
  /** Paying agent's address. */
  payer?: string;
  /** Settlement transaction hash. */
  txHash?: string;
  /** ERC-8004 agent identity of the payer (0/undefined = unregistered). */
  agentId?: number;
  /** Payer's ERC-8004 reputation at call time. */
  agentReputation?: number;
  network: string;
  durationMs: number;
}

/** An on-chain payout of a seller's earned USDC to their wallet. */
export interface Withdrawal {
  id: string;
  ownerAddress: string;
  amountUsd: number;
  txHash: string;
  ts: number;
}
