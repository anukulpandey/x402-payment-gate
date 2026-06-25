import { Router } from 'express';
import { config } from '../config.js';
import { verifyPayment, settlePayment } from '../x402/facilitator.js';
import { ASSET } from '../x402/protocol.js';

/**
 * GateKeep exposes its own x402-compatible facilitator HTTP surface. Any x402
 * resource server can point at `${PUBLIC_BASE_URL}/facilitator` to verify and
 * settle payments. In mock mode these verify signatures cryptographically and
 * simulate settlement; in real mode they proxy the configured facilitator.
 */
export const facilitatorRouter = Router();

facilitatorRouter.get('/supported', (_req, res) => {
  res.json({
    kinds: [{ x402Version: 1, scheme: 'exact', network: config.network }],
  });
});

facilitatorRouter.post('/verify', async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body ?? {};
  if (!paymentPayload || !paymentRequirements) {
    res.status(400).json({ isValid: false, invalidReason: 'invalid_payment_requirements' });
    return;
  }
  const result = await verifyPayment(paymentPayload, paymentRequirements);
  res.json(result);
});

facilitatorRouter.post('/settle', async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body ?? {};
  if (!paymentPayload || !paymentRequirements) {
    res.status(400).json({ success: false, error: 'invalid_payment_requirements', network: config.network });
    return;
  }
  const result = await settlePayment(paymentPayload, paymentRequirements);
  res.json(result);
});

// Convenience: which token/asset this facilitator settles in.
facilitatorRouter.get('/asset', (_req, res) => {
  res.json({ network: config.network, ...ASSET });
});
