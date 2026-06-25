export type { PaymentRequirements, PaymentPayload } from 'x402/types';

/** A REST endpoint the user has wrapped behind an x402 payment gate. */
export interface GatedEndpoint {
  id: string;
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
}

/** One request that hit a gated endpoint (paid or unpaid). */
export interface CallRecord {
  id: string;
  endpointId: string;
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
  network: string;
  durationMs: number;
}
