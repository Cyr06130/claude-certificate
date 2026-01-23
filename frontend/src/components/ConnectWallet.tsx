"use client";

import { useState } from "react";
import { useWallet, formatBalance } from "@/hooks/useWallet";
import { WalletModal } from "./WalletModal";
import Image from "next/image";

export function ConnectWallet() {
  const {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    walletName,
    walletIcon,
    balance,
    balanceDecimals,
    balanceSymbol,
    isBalanceLoading,
    disconnect,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        {/* Connected Wallet Display */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2.5 bg-card border border-card-border rounded-xl hover:bg-secondary transition-colors"
        >
          {/* Wallet Icon */}
          {walletIcon && (
            <div className="w-6 h-6 relative flex-shrink-0">
              <Image
                src={walletIcon}
                alt={walletName || "Wallet"}
                fill
                className="object-contain"
              />
            </div>
          )}

          {/* Account Info */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-card-foreground">
                {formatAddress(address)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-primary border border-primary/20">
                EVM
              </span>
            </div>
            {/* Balance */}
            <div className="text-xs text-muted-foreground">
              {isBalanceLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <span>
                  {formatBalance(balance, balanceDecimals)} {balanceSymbol || "PAS"}
                </span>
              )}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-card-border rounded-xl shadow-lg z-50 overflow-hidden">
              {/* Wallet Info */}
              <div className="p-4 border-b border-card-border">
                <div className="flex items-center gap-3">
                  {walletIcon && (
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={walletIcon}
                        alt={walletName || "Wallet"}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-card-foreground">{walletName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{formatAddress(address)}</div>
                  </div>
                </div>
                {/* Full Balance */}
                <div className="mt-3 p-2 bg-secondary rounded-lg">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="text-lg font-semibold text-card-foreground">
                    {isBalanceLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      <>
                        {formatBalance(balance, balanceDecimals)}{" "}
                        <span className="text-sm text-muted-foreground">{balanceSymbol || "PAS"}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                {/* Copy Address */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-card-foreground">Copy Address</span>
                </button>

                {/* Switch Wallet */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setIsModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="text-sm text-card-foreground">Switch Wallet</span>
                </button>

                {/* Divider */}
                <div className="my-2 border-t border-card-border" />

                {/* Disconnect */}
                <button
                  onClick={() => {
                    disconnect();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error-bg transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm text-error">Disconnect</span>
                </button>
              </div>
            </div>
          </>
        )}

        <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  // Disconnected state
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isConnecting || isReconnecting}
        className="flex items-center gap-2 px-5 py-2.5 font-medium text-white rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isConnecting || isReconnecting ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
