# Claude Code Certificate Frontend

A Next.js web application for managing Soulbound NFT certificates on the Paseo Asset Hub testnet.

## Features

- **Verify Certificates** - Look up any certificate by token ID and view its on-chain data and IPFS metadata
- **My Certificates** - View all certificates issued to your connected wallet
- **Register Participants** - Register new participants who can receive certificates (issuer only)
- **Issue Certificates** - Mint new soulbound certificates with IPFS metadata (issuer only)
- **IPFS Upload** - Upload certificate files to IPFS via Pinata
- **Dark/Light Theme** - Toggle between dark and light modes

## Tech Stack

- [Next.js](https://nextjs.org/) 16 with App Router
- [React](https://react.dev/) 19
- [Tailwind CSS](https://tailwindcss.com/) 4
- [ethers.js](https://docs.ethers.org/) 6 for blockchain interactions
- [Talisman Connect](https://docs.talisman.xyz/talisman/build-a-dapp/getting-started) for wallet connections

## Prerequisites

- Node.js 18+
- A Polkadot-compatible wallet (Talisman, SubWallet, or Polkadot.js extension)
- PAS tokens for testnet transactions (available from Paseo faucet)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Network Configuration

The app connects to Paseo Asset Hub testnet:

| Property | Value |
|----------|-------|
| Network | Paseo Asset Hub |
| Chain ID | 420420422 |
| RPC URL | https://testnet-passet-hub-eth-rpc.polkadot.io |
| Block Explorer | https://blockscout-passet-hub.parity-testnet.parity.io |
| Native Currency | PAS |

## Contract

The deployed certificate contract address: `0xC8c1D0AB32eb290D44C6edc60790934518A4a08A`

View on [Blockscout](https://blockscout-passet-hub.parity-testnet.parity.io/address/0xC8c1D0AB32eb290D44C6edc60790934518A4a08A)

## IPFS Upload

To upload certificate files to IPFS:

1. Create a free account at [Pinata](https://app.pinata.cloud/)
2. Generate a JWT token from the [API Keys page](https://app.pinata.cloud/developers/api-keys)
3. Enter your JWT in the "Issue Certificate" tab
4. The JWT is saved in localStorage for convenience

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles and Tailwind config
│   ├── layout.tsx       # Root layout with providers
│   └── page.tsx         # Main page component
├── components/
│   ├── CertificateManager.tsx  # Main certificate UI (tabs, forms)
│   ├── ConnectWallet.tsx       # Wallet connection button
│   ├── Providers.tsx           # Context providers wrapper
│   ├── ThemeToggle.tsx         # Dark/light mode toggle
│   └── WalletModal.tsx         # Wallet selection modal
├── config/
│   ├── chain.ts         # Network configuration
│   └── contract.ts      # Contract ABI and address
├── context/
│   ├── ThemeContext.tsx   # Theme state management
│   └── WalletContext.tsx  # Wallet state management
├── hooks/
│   ├── useContract.ts   # Contract read/write hooks
│   └── useWallet.ts     # Wallet connection hook
└── utils/
    └── ipfs.ts          # Pinata IPFS upload utility
```

## License

MIT
