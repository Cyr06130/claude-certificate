"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { getWallets, type Wallet } from "@talismn/connect-wallets";
import { PASEO_ASSET_HUB } from "@/config/chain";

interface WalletState {
  wallet: Wallet | null;
  address: string | null;
  balance: bigint | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: Error | null;
}

interface WalletContextValue extends WalletState {
  availableWallets: Wallet[];
  connect: (extensionName: string) => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "connected_wallet";
const BALANCE_POLL_INTERVAL = 15000;

// Type for EIP-1193 provider
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

// Type guard to check if object is an EIP-1193 provider
function isEip1193Provider(obj: unknown): obj is Eip1193Provider {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "request" in obj &&
    typeof (obj as Record<string, unknown>).request === "function"
  );
}

// Get EVM provider from wallet extension
function getEvmProvider(wallet: Wallet): Eip1193Provider | null {
  if (typeof window === "undefined") return null;

  const windowAny = window as unknown as Record<string, unknown>;

  // Debug: log what's available
  console.log("getEvmProvider called for:", wallet.extensionName);
  console.log("window.talisman:", windowAny.talisman);
  console.log("window.ethereum:", windowAny.ethereum);

  // Talisman: check multiple locations
  if (wallet.extensionName === "talisman") {
    // 1. Check window.talisman?.ethereum
    const talisman = windowAny.talisman as Record<string, unknown> | undefined;
    console.log("talisman object:", talisman);
    console.log("talisman.ethereum:", talisman?.ethereum);

    if (talisman?.ethereum && isEip1193Provider(talisman.ethereum)) {
      console.log("Found provider at window.talisman.ethereum");
      return talisman.ethereum;
    }

    // 2. Check window.ethereum and its providers array
    const ethereum = windowAny.ethereum as Record<string, unknown> | undefined;
    if (ethereum) {
      console.log("ethereum.isTalisman:", ethereum.isTalisman);
      console.log("ethereum.providers:", ethereum.providers);

      // Check providers array
      const providers = ethereum.providers as Array<Record<string, unknown>> | undefined;
      if (providers && Array.isArray(providers)) {
        const talismanProvider = providers.find((p) => p.isTalisman);
        if (talismanProvider && isEip1193Provider(talismanProvider)) {
          console.log("Found provider in ethereum.providers array");
          return talismanProvider;
        }
      }

      // Check if window.ethereum itself is Talisman
      if (ethereum.isTalisman && isEip1193Provider(ethereum)) {
        console.log("Found provider at window.ethereum (isTalisman)");
        return ethereum;
      }
    }
  }

  // SubWallet: check multiple locations
  if (wallet.extensionName === "subwallet-js") {
    const ethereum = windowAny.ethereum as Record<string, unknown> | undefined;

    if (ethereum) {
      // Check providers array
      const providers = ethereum.providers as Array<Record<string, unknown>> | undefined;
      if (providers && Array.isArray(providers)) {
        const subwalletProvider = providers.find((p) => p.isSubWallet);
        if (subwalletProvider && isEip1193Provider(subwalletProvider)) {
          return subwalletProvider;
        }
      }

      // Check if window.ethereum itself is SubWallet
      if (ethereum.isSubWallet && isEip1193Provider(ethereum)) {
        return ethereum;
      }
    }

    // Check window.SubWallet
    const subWallet = windowAny.SubWallet;
    if (subWallet && isEip1193Provider(subWallet)) {
      return subWallet;
    }
  }

  return null;
}

// Ensure wallet is connected to correct chain
async function ensureCorrectChain(evmProvider: Eip1193Provider): Promise<void> {
  // Get current chain ID
  const chainIdHex = await evmProvider.request({ method: "eth_chainId" }) as string;
  const currentChainId = parseInt(chainIdHex, 16);

  if (currentChainId !== PASEO_ASSET_HUB.chainId) {
    try {
      await evmProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: PASEO_ASSET_HUB.chainIdHex }],
      });
    } catch (switchError: unknown) {
      // Chain not added (error code 4902), try to add it
      if ((switchError as { code?: number })?.code === 4902) {
        await evmProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: PASEO_ASSET_HUB.chainIdHex,
              chainName: PASEO_ASSET_HUB.name,
              nativeCurrency: PASEO_ASSET_HUB.nativeCurrency,
              rpcUrls: [PASEO_ASSET_HUB.rpcUrl],
              blockExplorerUrls: [PASEO_ASSET_HUB.blockExplorerUrl],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    wallet: null,
    address: null,
    balance: null,
    provider: null,
    signer: null,
    isConnecting: false,
    isReconnecting: false,
    error: null,
  });

  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);

  // Discover available wallets on mount
  useEffect(() => {
    const discoverWallets = () => {
      const wallets = getWallets();
      // Filter to EVM-compatible wallets (Talisman and SubWallet)
      const evmWallets = wallets.filter(
        (w) => w.extensionName === "talisman" || w.extensionName === "subwallet-js"
      );
      setAvailableWallets(evmWallets);
    };

    // Initial discovery
    discoverWallets();

    // Retry after a delay (wallets may inject late)
    const timer = setTimeout(discoverWallets, 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!state.provider || !state.address) return;

    try {
      const balance = await state.provider.getBalance(state.address);
      setState((prev) => ({ ...prev, balance }));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [state.provider, state.address]);

  // Poll balance
  useEffect(() => {
    if (!state.provider || !state.address) return;

    // Fetch immediately
    fetchBalance();

    // Poll periodically
    const interval = setInterval(fetchBalance, BALANCE_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.provider, state.address, fetchBalance]);

  // Connect to wallet
  const connect = useCallback(async (extensionName: string) => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const wallet = availableWallets.find((w) => w.extensionName === extensionName);
      if (!wallet) {
        throw new Error(`Wallet ${extensionName} not found`);
      }

      // Get EVM provider (don't call wallet.enable() - that's for Substrate accounts)
      const evmProvider = getEvmProvider(wallet);
      if (!evmProvider) {
        throw new Error(`${wallet.title} EVM provider not found. Please ensure EVM mode is enabled in your wallet settings.`);
      }

      // Request EVM accounts first - this prompts the wallet connection dialog
      const accounts = await evmProvider.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please ensure you have an EVM account in your wallet.");
      }

      // Ensure correct chain
      await ensureCorrectChain(evmProvider);

      // Create ethers provider and signer
      const provider = new BrowserProvider(evmProvider);

      const address = accounts[0];
      const signer = await provider.getSigner();

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, extensionName);

      setState({
        wallet,
        address,
        balance: null,
        provider,
        signer,
        isConnecting: false,
        isReconnecting: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err : new Error("Failed to connect"),
      }));
    }
  }, [availableWallets]);

  // Disconnect
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      wallet: null,
      address: null,
      balance: null,
      provider: null,
      signer: null,
      isConnecting: false,
      isReconnecting: false,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-reconnect from localStorage
  useEffect(() => {
    const savedWallet = localStorage.getItem(STORAGE_KEY);
    if (savedWallet && availableWallets.length > 0 && !state.wallet && !state.isConnecting && !state.isReconnecting) {
      const walletExists = availableWallets.some((w) => w.extensionName === savedWallet);
      if (walletExists) {
        setState((prev) => ({ ...prev, isReconnecting: true }));
        connect(savedWallet).finally(() => {
          setState((prev) => ({ ...prev, isReconnecting: false }));
        });
      }
    }
  }, [availableWallets, state.wallet, state.isConnecting, connect]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        availableWallets,
        connect,
        disconnect,
        clearError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
