"use client";

import { useMemo } from "react";
import { useWalletContext } from "@/context/WalletContext";
import { PASEO_ASSET_HUB } from "@/config/chain";

export interface WalletAccount {
  address: string;
  name: string;
  source: string;
  isEvm: boolean;
}

export interface ConnectedWallet {
  account: WalletAccount;
  balance?: bigint;
  balanceDecimals?: number;
  balanceSymbol?: string;
}

export interface WalletInfo {
  extensionName: string;
  title: string;
  logo: { src: string };
  installed: boolean | undefined;
  installUrl: string;
}

export interface UseWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  address: string | undefined;

  // Wallet info
  connectedWallet: ConnectedWallet | null;
  walletName: string | undefined;
  walletIcon: string | null;

  // Balance
  balance: bigint | undefined;
  balanceDecimals: number | undefined;
  balanceSymbol: string | undefined;
  isBalanceLoading: boolean;

  // Actions
  connect: (walletKey: string) => Promise<void>;
  disconnect: () => void;

  // Wallet detection
  installedWallets: WalletInfo[];

  // Error handling
  error: Error | null;
  clearError: () => void;
}

const WALLET_ICONS: Record<string, string> = {
  talisman: "/wallets/talisman.svg",
  "subwallet-js": "/wallets/subwallet.svg",
};

export function useWallet(): UseWalletReturn {
  const {
    wallet,
    address,
    balance,
    isConnecting,
    isReconnecting,
    error,
    availableWallets,
    connect,
    disconnect,
    clearError,
  } = useWalletContext();

  const isConnected = !!address && !!wallet;

  // Get wallet icon
  const walletIcon = useMemo(() => {
    if (!wallet) return null;
    return WALLET_ICONS[wallet.extensionName] || wallet.logo?.src || null;
  }, [wallet]);

  // Build connected wallet info
  const connectedWallet = useMemo<ConnectedWallet | null>(() => {
    if (!isConnected || !address) return null;

    return {
      account: {
        address,
        name: wallet?.title || "Unknown",
        source: wallet?.extensionName || "unknown",
        isEvm: true,
      },
      balance: balance ?? undefined,
      balanceDecimals: PASEO_ASSET_HUB.nativeCurrency.decimals,
      balanceSymbol: PASEO_ASSET_HUB.nativeCurrency.symbol,
    };
  }, [isConnected, address, wallet, balance]);

  // Map available wallets to the expected format
  const installedWallets = useMemo<WalletInfo[]>(() => {
    return availableWallets.map((w) => ({
      extensionName: w.extensionName,
      title: w.title,
      logo: w.logo || { src: WALLET_ICONS[w.extensionName] || "" },
      installed: w.installed,
      installUrl: w.installUrl,
    }));
  }, [availableWallets]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    isReconnecting,
    address: address ?? undefined,

    // Wallet info
    connectedWallet,
    walletName: wallet?.title,
    walletIcon,

    // Balance
    balance: balance ?? undefined,
    balanceDecimals: PASEO_ASSET_HUB.nativeCurrency.decimals,
    balanceSymbol: PASEO_ASSET_HUB.nativeCurrency.symbol,
    isBalanceLoading: isConnected && balance === null,

    // Actions
    connect,
    disconnect,

    // Wallet detection
    installedWallets,

    // Error handling
    error,
    clearError,
  };
}

// Format address for display
export function formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

// Format balance for display (converts bigint to readable string)
export function formatBalance(value: bigint | undefined, decimals: number = 18, displayDecimals = 4): string {
  if (!value) return "0";
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  // Convert fractional part to string with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0").slice(0, displayDecimals);

  const num = parseFloat(`${integerPart}.${fractionalStr}`);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(displayDecimals);
}
