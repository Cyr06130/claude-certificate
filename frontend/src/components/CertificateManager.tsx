"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import {
  useReadCertificate,
  useWriteCertificate,
  useIsIssuer,
  type CertificateData,
} from "@/hooks/useContract";
import { uploadToIPFS } from "@/utils/ipfs";

type Tab = "verify" | "register" | "issue" | "my-certs";

export function CertificateManager() {
  const [activeTab, setActiveTab] = useState<Tab>("verify");
  const { isConnected } = useWallet();
  const { isIssuer } = useIsIssuer();

  const tabs: { id: Tab; label: string; issuerOnly?: boolean }[] = [
    { id: "verify", label: "Verify Certificate" },
    { id: "my-certs", label: "My Certificates" },
    { id: "register", label: "Register Participant", issuerOnly: true },
    { id: "issue", label: "Issue Certificate", issuerOnly: true },
  ];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
        {tabs.map((tab) => {
          if (tab.issuerOnly && !isIssuer) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
        {activeTab === "verify" && <VerifyCertificate />}
        {activeTab === "my-certs" && <MyCertificates />}
        {activeTab === "register" && isIssuer && <RegisterParticipant />}
        {activeTab === "issue" && isIssuer && <IssueCertificate />}
      </div>

      {/* Issuer badge */}
      {isConnected && isIssuer && (
        <div className="mt-6 p-4 bg-success-bg border border-success-border rounded-xl text-success-foreground text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          You have ISSUER_ROLE permissions
        </div>
      )}
    </div>
  );
}

// IPFS metadata structure
interface CertificateMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

// Convert IPFS URI to gateway URL
function ipfsToHttps(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

function VerifyCertificate() {
  const [tokenId, setTokenId] = useState("");
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [metadata, setMetadata] = useState<CertificateMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { verifyCertificate, getTokenURI } = useReadCertificate();

  const handleVerify = useCallback(async () => {
    if (!tokenId) return;

    setIsLoading(true);
    setError(null);
    setCertificate(null);
    setMetadata(null);

    try {
      const result = await verifyCertificate(BigInt(tokenId));
      if (result) {
        setCertificate(result);

        // Fetch IPFS metadata
        setIsLoadingMetadata(true);
        try {
          const uri = await getTokenURI(BigInt(tokenId));
          console.log("Token URI:", uri);
          if (uri) {
            const gatewayUrl = ipfsToHttps(uri);
            console.log("Fetching from:", gatewayUrl);
            const response = await fetch(gatewayUrl);
            console.log("Response status:", response.status, "Content-Type:", response.headers.get("content-type"));

            if (response.ok) {
              const text = await response.text();
              console.log("Response text (first 500 chars):", text.substring(0, 500));

              // Try to parse as JSON
              try {
                const data = JSON.parse(text);
                setMetadata(data);
              } catch {
                // Not JSON - check if URI points to an image
                const contentType = response.headers.get("content-type") || "";
                if (contentType.includes("image/")) {
                  setMetadata({ image: uri });
                } else {
                  console.warn("Could not parse metadata as JSON");
                }
              }
            }
          }
        } catch (metaErr) {
          console.error("Failed to fetch metadata:", metaErr);
        } finally {
          setIsLoadingMetadata(false);
        }
      } else {
        setError("Certificate not found");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Certificate not found or error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, verifyCertificate, getTokenURI]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-card-foreground">Verify Certificate</h2>
      <div className="flex gap-3">
        <input
          type="number"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Enter Token ID"
          className="flex-1 px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={handleVerify}
          disabled={!tokenId || isLoading}
          className="px-6 py-3 font-medium text-white rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all"
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-bg border border-error-border rounded-xl text-error-foreground flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {certificate && (
        <div className="space-y-4">
          {/* Certificate metadata from IPFS */}
          {isLoadingMetadata ? (
            <div className="p-6 rounded-xl border border-card-border bg-background">
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground">Loading certificate data...</span>
              </div>
            </div>
          ) : metadata ? (
            <div className="p-5 rounded-xl border border-card-border bg-background">
              {metadata.image && (
                <div className="mb-4">
                  <img
                    src={ipfsToHttps(metadata.image)}
                    alt={metadata.name || "Certificate"}
                    className="w-full rounded-lg border border-card-border"
                  />
                </div>
              )}
              {metadata.name && (
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{metadata.name}</h3>
              )}
              {metadata.description && (
                <p className="text-muted-foreground text-sm mb-4">{metadata.description}</p>
              )}
              {metadata.attributes && metadata.attributes.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {metadata.attributes.map((attr, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground">{attr.trait_type}</div>
                      <div className="text-sm font-medium text-foreground">{attr.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* On-chain certificate data */}
          <div className={`p-5 rounded-xl border ${certificate.isValid ? "bg-success-bg border-success-border" : "bg-error-bg border-error-border"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${certificate.isValid ? "bg-success/20" : "bg-error/20"}`}>
                {certificate.isValid ? (
                  <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-error" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-lg font-semibold ${certificate.isValid ? "text-success-foreground" : "text-error-foreground"}`}>
                {certificate.isValid ? "Valid Certificate" : "Invalid Certificate (Revoked)"}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-foreground">Recipient:</span>
                <span className="font-mono text-muted-foreground break-all">{certificate.recipient}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Cohort:</span>{" "}
                <span className="text-muted-foreground">{certificate.cohort}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">Content Hash:</span>
                <span className="font-mono text-xs text-muted-foreground break-all">{certificate.contentHash}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Issued:</span>{" "}
                <span className="text-muted-foreground">{certificate.issuedAt ? new Date(Number(certificate.issuedAt) * 1000).toLocaleString() : "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MyCertificates() {
  const { address, isConnected } = useWallet();
  const { getParticipantCertificates } = useReadCertificate();
  const [certIds, setCertIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setCertIds([]);
      return;
    }

    setIsLoading(true);
    getParticipantCertificates(address)
      .then(setCertIds)
      .finally(() => setIsLoading(false));
  }, [address, getParticipantCertificates]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-muted-foreground">Connect your wallet to view your certificates</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading certificates...</p>
      </div>
    );
  }

  if (!certIds || certIds.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground">You don&apos;t have any certificates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-card-foreground">My Certificates</h2>
      <div className="space-y-3">
        {certIds.map((id) => (
          <CertificateCard key={id.toString()} tokenId={id} />
        ))}
      </div>
    </div>
  );
}

function CertificateCard({ tokenId }: { tokenId: bigint }) {
  const { verifyCertificate } = useReadCertificate();
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    verifyCertificate(tokenId).then(setCertificate);
  }, [tokenId, verifyCertificate]);

  if (!certificate) {
    return (
      <div className="p-4 rounded-xl border border-card-border bg-background animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${certificate.isValid ? "bg-background border-card-border" : "bg-error-bg border-error-border"}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-card-foreground">Certificate #{tokenId.toString()}</div>
          <div className="text-sm text-muted-foreground">Cohort: {certificate.cohort}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Issued: {certificate.issuedAt ? new Date(Number(certificate.issuedAt) * 1000).toLocaleDateString() : "N/A"}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${certificate.isValid ? "bg-success-bg text-success-foreground border border-success-border" : "bg-error-bg text-error-foreground border border-error-border"}`}>
          {certificate.isValid ? "Valid" : "Revoked"}
        </span>
      </div>
    </div>
  );
}

function RegisterParticipant() {
  const [participantAddress, setParticipantAddress] = useState("");
  const [name, setName] = useState("");

  const { registerParticipant, txState, resetState } = useWriteCertificate();

  const handleRegister = async () => {
    if (participantAddress && name) {
      const success = await registerParticipant(participantAddress, name);
      if (success) {
        setParticipantAddress("");
        setName("");
      }
    }
  };

  // Reset success state after a delay
  useEffect(() => {
    if (txState.isSuccess) {
      const timer = setTimeout(resetState, 5000);
      return () => clearTimeout(timer);
    }
  }, [txState.isSuccess, resetState]);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-card-foreground">Register Participant</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={participantAddress}
          onChange={(e) => setParticipantAddress(e.target.value)}
          placeholder="Participant Address (0x...)"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Participant Name"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={handleRegister}
          disabled={!participantAddress || !name || txState.isPending || txState.isConfirming}
          className="w-full px-6 py-3 font-medium text-white rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all"
        >
          {txState.isPending ? "Confirming..." : txState.isConfirming ? "Registering..." : "Register Participant"}
        </button>
      </div>

      {txState.error && (
        <div className="p-4 bg-error-bg border border-error-border rounded-xl text-error-foreground flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {txState.error.message}
        </div>
      )}

      {txState.isSuccess && (
        <div className="p-4 bg-success-bg border border-success-border rounded-xl text-success-foreground flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Participant registered successfully!
        </div>
      )}
    </div>
  );
}

function IssueCertificate() {
  const [recipient, setRecipient] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [cohort, setCohort] = useState("");
  const [pinataJwt, setPinataJwt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { issueCertificate, txState, resetState } = useWriteCertificate();

  // Load Pinata JWT from localStorage on mount
  useEffect(() => {
    const savedJwt = localStorage.getItem("pinataJwt");
    if (savedJwt) {
      setPinataJwt(savedJwt);
    }
  }, []);

  // Save Pinata JWT to localStorage when changed
  const handlePinataJwtChange = (value: string) => {
    setPinataJwt(value);
    if (value) {
      localStorage.setItem("pinataJwt", value);
    } else {
      localStorage.removeItem("pinataJwt");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !pinataJwt) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadToIPFS(selectedFile, pinataJwt);
      setTokenURI(result.uri);
      setContentHash(result.hash);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleIssue = async () => {
    if (recipient && tokenURI && contentHash && cohort) {
      const success = await issueCertificate(recipient, tokenURI, contentHash, cohort);
      if (success) {
        setRecipient("");
        setTokenURI("");
        setContentHash("");
        setCohort("");
      }
    }
  };

  // Reset success state after a delay
  useEffect(() => {
    if (txState.isSuccess) {
      const timer = setTimeout(resetState, 5000);
      return () => clearTimeout(timer);
    }
  }, [txState.isSuccess, resetState]);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-card-foreground">Issue Certificate</h2>

      {/* IPFS Upload Section */}
      <div className="p-4 rounded-xl border border-card-border bg-muted/30 space-y-3">
        <h3 className="text-sm font-medium text-card-foreground">Upload Certificate to IPFS</h3>

        {/* Pinata JWT Input */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Pinata JWT Token</label>
          <input
            type="password"
            value={pinataJwt}
            onChange={(e) => handlePinataJwtChange(e.target.value)}
            placeholder="Enter your Pinata JWT..."
            className="w-full px-3 py-2 text-sm bg-background border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your JWT from{" "}
            <a href="https://app.pinata.cloud/developers/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Pinata Dashboard
            </a>
          </p>
        </div>

        {/* File Selection */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="certificate-file"
          />
          <label
            htmlFor="certificate-file"
            className="flex-1 px-4 py-2.5 text-sm text-center border border-dashed border-input-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {selectedFile ? (
              <span className="text-foreground">{selectedFile.name}</span>
            ) : (
              <span className="text-muted-foreground">Click to select a file...</span>
            )}
          </label>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !pinataJwt || isUploading}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              "Upload to IPFS"
            )}
          </button>
        </div>

        {uploadError && (
          <div className="p-2 text-sm bg-error-bg border border-error-border rounded-lg text-error-foreground">
            {uploadError}
          </div>
        )}

        {tokenURI && contentHash && (
          <div className="p-2 text-sm bg-success-bg border border-success-border rounded-lg text-success-foreground">
            File uploaded successfully!
          </div>
        )}
      </div>

      {/* Certificate Details Form */}
      <div className="space-y-4">
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient Address (0x...)"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="text"
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
          placeholder="Token URI (ipfs://...)"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="text"
          value={contentHash}
          onChange={(e) => setContentHash(e.target.value)}
          placeholder="Content Hash (sha256:...)"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <input
          type="text"
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
          placeholder="Cohort (e.g., 2025-Q1)"
          className="w-full px-4 py-3 bg-background border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-input-focus focus:border-transparent text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={handleIssue}
          disabled={!recipient || !tokenURI || !contentHash || !cohort || txState.isPending || txState.isConfirming}
          className="w-full px-6 py-3 font-medium text-white rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all"
        >
          {txState.isPending ? "Confirming..." : txState.isConfirming ? "Issuing..." : "Issue Certificate"}
        </button>
      </div>

      {txState.error && (
        <div className="p-4 bg-error-bg border border-error-border rounded-xl text-error-foreground flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {txState.error.message}
        </div>
      )}

      {txState.isSuccess && (
        <div className="p-4 bg-success-bg border border-success-border rounded-xl text-success-foreground">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Certificate issued successfully!
          </div>
          {txState.hash && (
            <div className="text-xs font-mono break-all opacity-80">Transaction: {txState.hash}</div>
          )}
        </div>
      )}
    </div>
  );
}
