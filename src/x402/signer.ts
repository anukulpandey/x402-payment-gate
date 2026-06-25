import { randomBytes } from 'node:crypto';
import { privateKeyToAccount } from 'viem/accounts';
import { toHex } from 'viem';
import type { PaymentRequirements, PaymentPayload } from 'x402/types';
import {
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  eip712Domain,
  X402_VERSION,
} from './protocol.js';

/** Derive the public address for a private key (the agent's wallet). */
export function addressForKey(privateKey: `0x${string}`): string {
  return privateKeyToAccount(privateKey).address;
}

/**
 * Agent-side: produce a signed x402 payment for the given requirements.
 *
 * This signs a real EIP-3009 `transferWithAuthorization` over EIP-712 typed
 * data — exactly what a production x402 client does. In mock mode the resulting
 * signature is cryptographically verified by our facilitator but settlement is
 * simulated; in real mode the same payload is settled on-chain.
 */
export async function signPayment(
  privateKey: `0x${string}`,
  requirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const account = privateKeyToAccount(privateKey);
  const now = Math.floor(Date.now() / 1000);

  const authorization = {
    from: account.address,
    to: requirements.payTo as `0x${string}`,
    value: requirements.maxAmountRequired,
    validAfter: '0',
    validBefore: String(now + requirements.maxTimeoutSeconds),
    nonce: toHex(randomBytes(32)),
  };

  const signature = await account.signTypedData({
    domain: eip712Domain(requirements),
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  });

  return {
    x402Version: X402_VERSION,
    scheme: 'exact',
    network: requirements.network,
    payload: { signature, authorization },
  };
}
