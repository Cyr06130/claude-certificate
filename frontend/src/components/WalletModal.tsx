"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, type WalletInfo } from "@/hooks/useWallet";
import Image from "next/image";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wallet display order and install URLs
const WALLET_CONFIG: Record<string, { order: number; installUrl: string; description: string }> = {
  talisman: {
    order: 1,
    installUrl: "https://talisman.xyz/download",
    description: "The Polkadot & Ethereum super wallet",
  },
  "subwallet-js": {
    order: 2,
    installUrl: "https://www.subwallet.app/download.html",
    description: "Multi-chain wallet for Polkadot & Ethereum",
  },
};

const WALLET_ICONS: Record<string, string> = {
  talisman: "/wallets/talisman.svg",
  "subwallet-js": "/wallets/subwallet.svg",
};

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { installedWallets, connect, isConnected, isConnecting, error, clearError } = useWallet();
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Close modal when connected
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
      setConnectingWallet(null);
    }
  }, [isConnected, isOpen, onClose]);

  // Clear errors when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalError(null);
      clearError();
    }
  }, [isOpen, clearError]);

  const handleConnect = useCallback(async (extensionName: string) => {
    setLocalError(null);
    setConnectingWallet(extensionName);

    try {
      await connect(extensionName);
    } catch (err) {
      console.error("Failed to connect:", err);
      setLocalError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnectingWallet(null);
    }
  }, [connect]);

  const handleInstall = useCallback((installUrl: string) => {
    window.open(installUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleClose = useCallback(() => {
    setConnectingWallet(null);
    setLocalError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const displayError = localError || (error ? error.message : null);

  // Build wallet list - show installed wallets and not-installed wallets
  const walletsToDisplay = Object.entries(WALLET_CONFIG)
    .map(([extensionName, config]) => {
      const installed = installedWallets.find((w) => w.extensionName === extensionName);
      return {
        extensionName,
        title: installed?.title || extensionName.charAt(0).toUpperCase() + extensionName.slice(1).replace("-js", ""),
        icon: installed?.logo?.src || WALLET_ICONS[extensionName] || "",
        isInstalled: !!installed?.installed,
        installUrl: installed?.installUrl || config.installUrl,
        description: config.description,
        order: config.order,
      };
    })
    .sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Connect Wallet</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose a wallet to connect to Polkadot
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {displayError && (
          <div className="mx-5 mt-4 p-3 bg-error-bg border border-error-border rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-error-foreground">{displayError}</p>
            </div>
            <button
              onClick={() => {
                setLocalError(null);
                clearError();
              }}
              className="text-error-foreground hover:text-error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Wallet Options */}
        <div className="p-5 space-y-3">
          {walletsToDisplay.map((wallet) => {
            const isCurrentlyConnecting = connectingWallet === wallet.extensionName && isConnecting;

            return (
              <button
                key={wallet.extensionName}
                onClick={() => wallet.isInstalled ? handleConnect(wallet.extensionName) : handleInstall(wallet.installUrl)}
                disabled={isConnecting}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  wallet.isInstalled
                    ? "border-card-border bg-background hover:bg-secondary hover:border-primary/50"
                    : "border-dashed border-card-border bg-background/50 hover:bg-secondary/50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {/* Wallet Icon */}
                <div className="w-12 h-12 relative flex-shrink-0 rounded-xl overflow-hidden bg-secondary p-2">
                  <Image
                    src={wallet.icon}
                    alt={wallet.title}
                    fill
                    className="object-contain p-1"
                  />
                </div>

                {/* Wallet Info */}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-card-foreground">{wallet.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {wallet.description || (wallet.isInstalled ? "Click to connect" : "Not installed")}
                  </div>
                </div>

                {/* Status / Action */}
                <div className="flex-shrink-0">
                  {isCurrentlyConnecting ? (
                    <div className="flex items-center gap-2 text-primary">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : wallet.isInstalled ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-success-bg text-success-foreground border border-success-border font-medium">
                      Detected
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-card-border font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Install
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-secondary/50 border-t border-card-border">
          <p className="text-center text-sm text-muted-foreground">
            New to Polkadot?{" "}
            <a
              href="https://wiki.polkadot.network/docs/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Learn more
            </a>
            {" "}or{" "}
            <a
              href="https://talisman.xyz/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Get Talisman
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
