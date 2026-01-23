# Claude Code Certificate

A soulbound NFT certificate system built on Paseo Asset Hub testnet. Issue non-transferable credentials that are permanently bound to recipient wallets.

## Features

- **Soulbound NFTs** - Certificates cannot be transferred once issued (ERC-5192)
- **Role-Based Access** - Admin and Issuer roles control certificate management
- **IPFS Metadata** - Certificate files stored on IPFS via Pinata
- **On-Chain Verification** - Anyone can verify certificate authenticity
- **Revocation Support** - Issuers can revoke certificates when needed

## Project Structure

```
├── contracts/           # Solidity smart contract
├── frontend/            # Next.js web application
├── ignition/            # Hardhat Ignition deployment modules
├── scripts/             # CLI interaction scripts
└── test/                # Contract test suite
```

## Quick Start

### Prerequisites

- Node.js 18+
- A Polkadot-compatible wallet (Talisman, SubWallet, or Polkadot.js)
- PAS tokens for testnet transactions

### Installation

```bash
# Install root dependencies (contracts)
npm install

# Install frontend dependencies
cd frontend && npm install
```

### Run Tests

```bash
npm run test
```

### Deploy Contract

```bash
# Copy environment file and add your private key
cp .env.example .env

# Deploy to Paseo testnet
npm run deploy:paseo
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract

### ClaudeCodeCertificate.sol

An ERC-721 NFT with soulbound mechanics:

| Function | Access | Description |
|----------|--------|-------------|
| `registerParticipant(address, name)` | Issuer | Register address to receive certificates |
| `issueCertificate(address, tokenURI, contentHash, cohort)` | Issuer | Mint soulbound certificate |
| `revokeCertificate(tokenId)` | Issuer | Revoke a certificate |
| `verifyCertificate(tokenId)` | Public | Verify certificate validity |
| `getParticipantCertificates(address)` | Public | Get all certificates for an address |

### Roles

- `DEFAULT_ADMIN_ROLE` - Can grant/revoke roles
- `ISSUER_ROLE` - Can register participants, issue and revoke certificates

## Network Configuration

| Property | Value |
|----------|-------|
| Network | Paseo Asset Hub |
| Chain ID | 420420422 |
| RPC URL | https://testnet-passet-hub-eth-rpc.polkadot.io |
| Block Explorer | https://blockscout-passet-hub.parity-testnet.parity.io |
| Currency | PAS |

### Deployed Contract

`0xC8c1D0AB32eb290D44C6edc60790934518A4a08A` - [View on Blockscout](https://blockscout-passet-hub.parity-testnet.parity.io/address/0xC8c1D0AB32eb290D44C6edc60790934518A4a08A)

## Usage

### Certificate Workflow

1. **Register Participant** - Issuer registers wallet address with participant name
2. **Upload to IPFS** - Upload certificate file to Pinata, receive URI and content hash
3. **Issue Certificate** - Issuer mints soulbound NFT with metadata
4. **Verify** - Anyone can verify certificate by token ID

### IPFS Setup (Pinata)

1. Create account at [Pinata](https://app.pinata.cloud/)
2. Generate JWT from [API Keys](https://app.pinata.cloud/developers/api-keys)
3. Enter JWT in the frontend's "Issue Certificate" tab

### CLI Interaction

```bash
# Set contract address in .env
CONTRACT_ADDRESS=0xC8c1D0AB32eb290D44C6edc60790934518A4a08A

# Run interaction script
npx hardhat run scripts/interact.js --network paseo
```

## Tech Stack

### Smart Contract
- Solidity 0.8.22
- OpenZeppelin Contracts 4.9.6
- Hardhat + Hardhat Ignition

### Frontend
- Next.js 16 / React 19
- TypeScript 5
- Tailwind CSS 4
- ethers.js 6
- Talisman Connect

## Available Scripts

### Root (Contracts)

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run test suite |
| `npm run deploy:local` | Deploy to local Hardhat network |
| `npm run deploy:paseo` | Deploy to Paseo testnet |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## License

MIT
