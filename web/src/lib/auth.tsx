import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useWallet } from './wallet';
import { api } from './api';

interface AuthState {
  /** The signed-in seller's wallet address, or null. */
  address: string | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within <AuthProvider>');
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an existing session on load.
  useEffect(() => {
    api.me()
      .then((r) => setAddress(r.address))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      const addr = wallet.address ?? (await wallet.connect());
      // Best-effort: nudge the wallet onto the app's chain (sign-in itself is chain-agnostic).
      try {
        const cfg = await api.config();
        if (cfg.chainId) await wallet.ensureChain(cfg.chainId);
      } catch {
        /* user may decline the network switch — sign-in still works */
      }
      const { message } = await api.nonce(addr);
      const signature = await wallet.signMessage(message);
      const { address: verified } = await api.verify(message, signature);
      setAddress(verified);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      setError(msg);
      throw e;
    } finally {
      setSigningIn(false);
    }
  }, [wallet]);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setAddress(null);
    wallet.disconnect();
  }, [wallet]);

  return (
    <Ctx.Provider value={{ address, loading, signingIn, error, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
