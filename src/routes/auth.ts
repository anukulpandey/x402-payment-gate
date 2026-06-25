import { Router } from 'express';
import { isAddress } from 'viem';
import {
  newSignInMessage,
  verifySignIn,
  issueToken,
  setSessionCookie,
  clearSessionCookie,
  readSession,
} from '../auth.js';

export const authRouter = Router();

// Step 1 — client asks for a message to sign.
authRouter.post('/nonce', (req, res) => {
  const address = req.body?.address;
  if (!address || !isAddress(address)) {
    res.status(400).json({ error: 'A valid wallet address is required.' });
    return;
  }
  res.json({ message: newSignInMessage(address) });
});

// Step 2 — client returns the signed message; server verifies + starts a session.
authRouter.post('/verify', async (req, res) => {
  const { message, signature } = req.body ?? {};
  if (typeof message !== 'string' || typeof signature !== 'string') {
    res.status(400).json({ error: 'message and signature are required.' });
    return;
  }
  const address = await verifySignIn(message, signature as `0x${string}`);
  if (!address) {
    res.status(401).json({ error: 'Signature verification failed.' });
    return;
  }
  setSessionCookie(res, issueToken(address));
  res.json({ address });
});

// Who am I?
authRouter.get('/me', (req, res) => {
  res.json({ address: readSession(req) });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
