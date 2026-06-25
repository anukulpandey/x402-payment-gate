import { platformFeeRate } from './config.js';

/** Round a USD figure to 6 decimal places (USDC's precision). */
export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Split a gross charge into the platform's cut and the seller's earnings. */
export function splitRevenue(amountUsd: number): {
  platformFeeUsd: number;
  sellerEarningsUsd: number;
} {
  const platformFeeUsd = round6(amountUsd * platformFeeRate);
  return { platformFeeUsd, sellerEarningsUsd: round6(amountUsd - platformFeeUsd) };
}
