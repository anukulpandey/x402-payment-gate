import { recoverTypedDataAddress, keccak256, toBytes, getAddress } from 'viem';
import type { PaymentRequirements, PaymentPayload } from 'x402/types';
import { isLive } from '../config.js';
import { TRANSFER_WITH_AUTHORIZATION_TYPES, eip712Domain } from './protocol.js';

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface SettleResult {
  success: boolean;
  error?: string;
  transaction?: string;
  network: string;
  payer?: string;
  /** True when settlement was simulated rather than broadcast on-chain. */
  simulated?: boolean;
}

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

// ─────────────────────────────────────────────────────────────────────────
//  Mock facilitator — REAL signature verification, SIMULATED settlement.
//  Verifies the EIP-712 signature cryptographically (recovers the signer and
//  checks recipient, amount, and expiry) but does not broadcast on-chain, so
//  the whole flow runs offline with zero funds.
// ─────────────────────────────────────────────────────────────────────────

// On-chain, an EIP-3009 nonce can only be used once; the USDC contract enforces
// it. In mock mode there's no chain, so we track settled nonces ourselves to
// reject a captured X-PAYMENT being replayed.
const settledNonces = new Set<string>();

async function mockVerify(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<VerifyResult> {
  try {
    if (payload.scheme !== req.scheme) return { isValid: false, invalidReason: 'invalid_scheme' };
    if (payload.network !== req.network) return { isValid: false, invalidReason: 'invalid_network' };

    const inner = payload.payload as unknown as ExactEvmInner;
    const auth = inner.authorization;
    if (!auth || !inner.signature) return { isValid: false, invalidReason: 'invalid_payload' };

    if (settledNonces.has(auth.nonce.toLowerCase())) {
      return { isValid: false, invalidReason: 'duplicate_settlement' };
    }

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
      message: {
        from: auth.from,
        to: auth.to,
        value: BigInt(auth.value),
        validAfter: BigInt(auth.validAfter),
        validBefore: BigInt(auth.validBefore),
        nonce: auth.nonce,
      },
      signature: inner.signature,
    });
    if (getAddress(recovered) !== getAddress(auth.from)) {
      return { isValid: false, invalidReason: 'invalid_exact_evm_payload_signature' };
    }

    return { isValid: true, payer: getAddress(auth.from) };
  } catch {
    return { isValid: false, invalidReason: 'invalid_payload' };
  }
}

async function mockSettle(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<SettleResult> {
  const inner = payload.payload as unknown as ExactEvmInner;
  const auth = inner.authorization;
  // Burn the nonce so this authorization can't be settled twice.
  settledNonces.add(auth.nonce.toLowerCase());
  // Derive a realistic-looking 32-byte tx hash from the signature + nonce so
  // the same authorization always maps to the same "transaction".
  const transaction = keccak256(toBytes(inner.signature + auth.nonce.slice(2)));
  return {
    success: true,
    transaction,
    network: req.network,
    payer: getAddress(auth.from),
    simulated: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Public API — dispatches to the active settlement mode.
//  (chain.ts is imported lazily so mock mode never loads viem chain clients.)
// ─────────────────────────────────────────────────────────────────────────

export async function verifyPayment(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<VerifyResult> {
  if (!isLive) return mockVerify(payload, req);
  const { chainVerify } = await import('./chain.js');
  return chainVerify(payload, req);
}

export async function settlePayment(
  payload: PaymentPayload,
  req: PaymentRequirements,
): Promise<SettleResult> {
  if (!isLive) return mockSettle(payload, req);
  const { chainSettle } = await import('./chain.js');
  return chainSettle(payload, req);
}
