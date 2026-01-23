# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soulbound NFT certificate system on Paseo Asset Hub testnet. Monorepo with Solidity smart contract (ERC-721 + AccessControl + ERC-5192) and Next.js frontend.

## Commands

### Smart Contract (root directory)
```bash
npm run compile          # Compile Solidity contracts
npm run test             # Run Hardhat tests
npm run deploy:local     # Deploy to local Hardhat network
npm run deploy:paseo     # Deploy to Paseo testnet
```

### Frontend (frontend/ directory)
```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run lint             # Run ESLint
```

### Single Test
```bash
npx hardhat test --grep "test name pattern"
```

## Architecture

### Smart Contract (`contracts/ClaudeCodeCertificate.sol`)
- ERC-721 NFT with soulbound (non-transferable) mechanics via ERC-5192
- Two roles: `DEFAULT_ADMIN_ROLE` and `ISSUER_ROLE`
- Key structs: `Participant` (registration) and `Certificate` (metadata)
- Transfers blocked via `_beforeTokenTransfer()` override

### Frontend (`frontend/src/`)
- **Context**: `WalletContext.tsx` manages wallet state with Talisman Connect; `ThemeContext.tsx` for dark/light mode
- **Hooks**: `useContract.ts` wraps ethers.js contract calls (read vs write operations); `useWallet.ts` for connection
- **Config**: `chain.ts` has Paseo testnet config; `contract.ts` has ABI and deployed address
- **Utils**: `ipfs.ts` handles Pinata uploads with SHA-256 hashing

### Certificate Workflow
1. Register participant via `registerParticipant(address, name)`
2. Upload metadata to IPFS (Pinata), get URI and content hash
3. Issue certificate via `issueCertificate(recipient, tokenURI, contentHash, cohort)`
4. Verify via `verifyCertificate(tokenId)` - returns validity and metadata

## Network

- **Chain**: Paseo Asset Hub testnet
- **Chain ID**: 420420422
- **RPC**: https://testnet-passet-hub-eth-rpc.polkadot.io
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io
- **Contract**: `0xC8c1D0AB32eb290D44C6edc60790934518A4a08A`

## Environment

Copy `.env.example` to `.env` and set:
- `PRIVATE_KEY` - Deployer private key (no 0x prefix)
- `CONTRACT_ADDRESS` - For `scripts/interact.js`

## Tech Stack

- Solidity 0.8.22, OpenZeppelin 4.9.6, Hardhat
- Next.js 16, React 19, TypeScript 5, Tailwind 4
- ethers.js 6, Talisman Connect
