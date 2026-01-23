import { ConnectWallet } from "@/components/ConnectWallet";
import { CertificateManager } from "@/components/CertificateManager";
import { CONTRACT_ADDRESS } from "@/config/contract";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-card-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Claude Code Certificate</h1>
              <p className="text-sm text-muted-foreground">Soulbound NFT Certificates on Paseo Asset Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <CertificateManager />

        {/* Contract Info */}
        <div className="mt-8 p-6 bg-card rounded-2xl border border-card-border shadow-sm">
          <div className="font-medium mb-3 text-card-foreground">Contract Information</div>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium text-foreground">Address:</span>
              <a
                href={`https://blockscout-passet-hub.parity-testnet.parity.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-primary hover:underline break-all"
              >
                {CONTRACT_ADDRESS}
              </a>
            </div>
            <div>
              <span className="font-medium text-foreground">Network:</span>{" "}
              Paseo Asset Hub (Chain ID: 420420422)
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Built with Next.js, Talisman Connect, and ethers.js
        </div>
      </footer>
    </div>
  );
}
