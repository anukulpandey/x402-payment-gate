import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createWalletClient, custom, getAddress } from 'viem';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Eth = {
  request: (args: { method: string; params?: any }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
};

function getEthereum(): Eth | null {
  if (typeof window === 'undefined') return null;
  return ((window as any).ethereum as Eth) ?? null;
}

const FUJI = {
  chainId: '0xa869', // 43113
  chainName: 'Avalanche Fuji C-Chain',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io'],
};

interface WalletState {
  address: string | null;
  chainId: number | null;
  hasProvider: boolean;
  connecting: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
  ensureChain: (chainId: number) => Promise<void>;
  signMessage: (message: string) => Promise<`0x${string}`>;
}

const Ctx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWallet must be used within <WalletProvider>');
  return c;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const eth = getEthereum();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!eth) return;
    // Restore an existing connection on load (no popup).
    eth.request({ method: 'eth_accounts' })
      .then((accts: string[]) => accts?.[0] && setAddress(getAddress(accts[0])))
      .catch(() => undefined);
    eth.request({ method: 'eth_chainId' })
      .then((cid: string) => setChainId(parseInt(cid, 16)))
      .catch(() => undefined);

    const onAccts = (accts: string[]) => setAddress(accts?.[0] ? getAddress(accts[0]) : null);
    const onChain = (cid: string) => setChainId(parseInt(cid, 16));
    eth.on?.('accountsChanged', onAccts);
    eth.on?.('chainChanged', onChain);
    return () => {
      eth.removeListener?.('accountsChanged', onAccts);
      eth.removeListener?.('chainChanged', onChain);
    };
  }, [eth]);

  const connect = useCallback(async () => {
    if (!eth) throw new Error('No Ethereum wallet found. Install MetaMask to continue.');
    setConnecting(true);
    try {
      const accts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const addr = getAddress(accts[0]);
      setAddress(addr);
      const cid: string = await eth.request({ method: 'eth_chainId' });
      setChainId(parseInt(cid, 16));
      return addr;
    } finally {
      setConnecting(false);
    }
  }, [eth]);

  const disconnect = useCallback(() => setAddress(null), []);

  const ensureChain = useCallback(
    async (target: number) => {
      if (!eth) return;
      const hex = `0x${target.toString(16)}`;
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
      } catch (err: any) {
        if (err?.code === 4902 && target === 43113) {
          await eth.request({ method: 'wallet_addEthereumChain', params: [FUJI] });
        } else {
          throw err;
        }
      }
    },
    [eth],
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!eth || !address) throw new Error('Wallet not connected.');
      const client = createWalletClient({ transport: custom(eth) });
      return client.signMessage({ account: address as `0x${string}`, message });
    },
    [eth, address],
  );

  return (
    <Ctx.Provider
      value={{ address, chainId, hasProvider: !!eth, connecting, connect, disconnect, ensureChain, signMessage }}
    >
      {children}
    </Ctx.Provider>
  );
}
