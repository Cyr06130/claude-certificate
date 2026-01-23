"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Contract, JsonRpcProvider, type InterfaceAbi } from "ethers";
import { useWalletContext } from "@/context/WalletContext";
import { CONTRACT_ADDRESS, CONTRACT_ABI, ISSUER_ROLE } from "@/config/contract";
import { PASEO_ASSET_HUB } from "@/config/chain";

// Read-only provider for queries when wallet not connected
const readOnlyProvider = new JsonRpcProvider(PASEO_ASSET_HUB.rpcUrl);

// Generic contract hook
export function useContract<T extends InterfaceAbi>(
  address: string,
  abi: T
) {
  const { provider, signer } = useWalletContext();

  // Memoize read contract to prevent infinite re-renders
  const readContract = useMemo(
    () => new Contract(address, abi as InterfaceAbi, provider || readOnlyProvider),
    [address, abi, provider]
  );

  // Memoize write contract to prevent infinite re-renders
  const writeContract = useMemo(
    () => (signer ? new Contract(address, abi as InterfaceAbi, signer) : null),
    [address, abi, signer]
  );

  return { readContract, writeContract };
}

// Certificate verification result
export interface CertificateData {
  isValid: boolean;
  recipient: string;
  contentHash: string;
  cohort: string;
  issuedAt: bigint;
}

// Hook for reading certificate data
export function useReadCertificate() {
  const { readContract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);

  const verifyCertificate = useCallback(
    async (tokenId: bigint): Promise<CertificateData | null> => {
      try {
        const result = await readContract.verifyCertificate(tokenId);
        return {
          isValid: result[0],
          recipient: result[1],
          contentHash: result[2],
          cohort: result[3],
          issuedAt: result[4],
        };
      } catch (err) {
        console.error("Failed to verify certificate:", err);
        return null;
      }
    },
    [readContract]
  );

  const getParticipantCertificates = useCallback(
    async (participant: string): Promise<bigint[]> => {
      try {
        const result = await readContract.getParticipantCertificates(participant);
        return result as bigint[];
      } catch (err) {
        console.error("Failed to get participant certificates:", err);
        return [];
      }
    },
    [readContract]
  );

  const hasRole = useCallback(
    async (role: string, account: string): Promise<boolean> => {
      try {
        return await readContract.hasRole(role, account);
      } catch (err) {
        console.error("Failed to check role:", err);
        return false;
      }
    },
    [readContract]
  );

  const getTokenURI = useCallback(
    async (tokenId: bigint): Promise<string | null> => {
      try {
        return await readContract.tokenURI(tokenId);
      } catch (err) {
        console.error("Failed to get token URI:", err);
        return null;
      }
    },
    [readContract]
  );

  return {
    verifyCertificate,
    getParticipantCertificates,
    hasRole,
    getTokenURI,
  };
}

// Transaction state
export interface TransactionState {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash: string | null;
}

const initialTxState: TransactionState = {
  isPending: false,
  isConfirming: false,
  isSuccess: false,
  error: null,
  hash: null,
};

// Hook for writing certificate data
export function useWriteCertificate() {
  const { writeContract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  const [txState, setTxState] = useState<TransactionState>(initialTxState);

  const resetState = useCallback(() => {
    setTxState(initialTxState);
  }, []);

  const registerParticipant = useCallback(
    async (participant: string, name: string): Promise<boolean> => {
      if (!writeContract) {
        setTxState({
          ...initialTxState,
          error: new Error("Wallet not connected"),
        });
        return false;
      }

      setTxState({ ...initialTxState, isPending: true });

      try {
        const tx = await writeContract.registerParticipant(participant, name);
        setTxState((prev) => ({
          ...prev,
          isPending: false,
          isConfirming: true,
          hash: tx.hash,
        }));

        await tx.wait();

        setTxState((prev) => ({
          ...prev,
          isConfirming: false,
          isSuccess: true,
        }));
        return true;
      } catch (err) {
        console.error("Failed to register participant:", err);
        setTxState({
          ...initialTxState,
          error: err instanceof Error ? err : new Error("Transaction failed"),
        });
        return false;
      }
    },
    [writeContract]
  );

  const issueCertificate = useCallback(
    async (
      recipient: string,
      tokenURI: string,
      contentHash: string,
      cohort: string
    ): Promise<boolean> => {
      if (!writeContract) {
        setTxState({
          ...initialTxState,
          error: new Error("Wallet not connected"),
        });
        return false;
      }

      setTxState({ ...initialTxState, isPending: true });

      try {
        const tx = await writeContract.issueCertificate(
          recipient,
          tokenURI,
          contentHash,
          cohort
        );
        setTxState((prev) => ({
          ...prev,
          isPending: false,
          isConfirming: true,
          hash: tx.hash,
        }));

        await tx.wait();

        setTxState((prev) => ({
          ...prev,
          isConfirming: false,
          isSuccess: true,
        }));
        return true;
      } catch (err) {
        console.error("Failed to issue certificate:", err);
        setTxState({
          ...initialTxState,
          error: err instanceof Error ? err : new Error("Transaction failed"),
        });
        return false;
      }
    },
    [writeContract]
  );

  const revokeCertificate = useCallback(
    async (tokenId: bigint): Promise<boolean> => {
      if (!writeContract) {
        setTxState({
          ...initialTxState,
          error: new Error("Wallet not connected"),
        });
        return false;
      }

      setTxState({ ...initialTxState, isPending: true });

      try {
        const tx = await writeContract.revokeCertificate(tokenId);
        setTxState((prev) => ({
          ...prev,
          isPending: false,
          isConfirming: true,
          hash: tx.hash,
        }));

        await tx.wait();

        setTxState((prev) => ({
          ...prev,
          isConfirming: false,
          isSuccess: true,
        }));
        return true;
      } catch (err) {
        console.error("Failed to revoke certificate:", err);
        setTxState({
          ...initialTxState,
          error: err instanceof Error ? err : new Error("Transaction failed"),
        });
        return false;
      }
    },
    [writeContract]
  );

  return {
    registerParticipant,
    issueCertificate,
    revokeCertificate,
    txState,
    resetState,
  };
}

// Hook to check if current user is an issuer
export function useIsIssuer() {
  const { address } = useWalletContext();
  const { hasRole } = useReadCertificate();
  const [isIssuer, setIsIssuer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setIsIssuer(false);
      return;
    }

    setIsLoading(true);
    hasRole(ISSUER_ROLE, address)
      .then(setIsIssuer)
      .finally(() => setIsLoading(false));
  }, [address, hasRole]);

  return { isIssuer, isLoading };
}
