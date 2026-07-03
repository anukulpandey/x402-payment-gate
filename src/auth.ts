import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { verifyMessage, getAddress } from 'viem';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config.js';

/**
 * Sign-In with Ethereum (SIWE-style) auth. The connected wallet IS the account:
 * the user signs a one-time nonce message with MetaMask, the server verifies the
 * signature, and issues a session JWT (httpOnly cookie). No passwords, no email.
 */

const NONCE_TTL_MS = 10 * 60 * 1000;
const COOKIE = 'gk_session';
const nonces = new Map<string, { address: string; message: string; exp: number }>();

function domain(): string {
  try {
    return new URL(config.publicBaseUrl).host;
  } catch {
    return 'gatekeep.app';
  }
}

function buildMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    `${domain()} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to GateKeep — the payment layer for AI agent APIs.',
    '',
    `URI: ${config.publicBaseUrl}`,
    'Version: 1',
    `Chain ID: ${config.chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

/** Create a fresh sign-in message for the given address. */
export function newSignInMessage(address: string): string {
  const addr = getAddress(address);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = buildMessage(addr, nonce, new Date().toISOString());
  nonces.set(nonce, { address: addr.toLowerCase(), message, exp: Date.now() + NONCE_TTL_MS });
  for (const [k, v] of nonces) if (v.exp < Date.now()) nonces.delete(k); // GC
  return message;
}

/** Verify a signed sign-in message; returns the lowercased address or null. */
export async function verifySignIn(message: string, signature: `0x${string}`): Promise<string | null> {
  const m = message.match(/Nonce: ([0-9a-f]{32})/);
  if (!m) return null;
  const rec = nonces.get(m[1]);
  if (!rec || rec.exp < Date.now() || rec.message !== message) return null;
  const valid = await verifyMessage({ address: getAddress(rec.address), message, signature }).catch(() => false);
  if (!valid) return null;
  nonces.delete(m[1]); // one-time use
  return rec.address;
}

export function issueToken(address: string): string {
  return jwt.sign({ sub: address.toLowerCase() }, config.jwtSecret, { expiresIn: '7d' });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: '/' });
}

/** Read the authenticated address from the session cookie, or null. */
export function readSession(req: Request): string | null {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (!token) return null;
  try {
    // Pin the algorithm — never let a tampered token downgrade to `none` or swap
    // to an asymmetric scheme (classic JWT algorithm-confusion attack).
    return (jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as { sub: string }).sub;
  } catch {
    return null;
  }
}

/** Express middleware: require a signed-in wallet; sets req.ownerAddress. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const address = readSession(req);
  if (!address) {
    res.status(401).json({ error: 'Connect and sign in with your wallet to continue.' });
    return;
  }
  (req as Request & { ownerAddress?: string }).ownerAddress = address;
  next();
}

/** Get the authenticated owner address off a request (after requireAuth). */
export function ownerOf(req: Request): string {
  return (req as Request & { ownerAddress?: string }).ownerAddress ?? '';
}
