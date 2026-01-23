/**
 * Helper script for interacting with the deployed ClaudeCodeCertificate contract
 *
 * Usage (via environment variables):
 *   CMD=register ADDR=0x... NAME="Alice" npx hardhat run scripts/interact.js --network paseo
 *   CMD=issue ADDR=0x... URI="ipfs://..." HASH="sha256:..." COHORT="2024-Q1" npx hardhat run scripts/interact.js --network paseo
 *   CMD=verify TOKEN_ID=1 npx hardhat run scripts/interact.js --network paseo
 */

const hre = require("hardhat");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

async function getContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS environment variable not set. Add it to .env file.");
  }
  const ClaudeCodeCertificate = await hre.ethers.getContractFactory("ClaudeCodeCertificate");
  return ClaudeCodeCertificate.attach(CONTRACT_ADDRESS);
}

/**
 * Add a new issuer to the certificate system
 */
async function addIssuer(issuerAddress) {
  const certificate = await getContract();
  const ISSUER_ROLE = await certificate.ISSUER_ROLE();

  console.log(`Granting ISSUER_ROLE to ${issuerAddress}...`);
  const tx = await certificate.grantRole(ISSUER_ROLE, issuerAddress);
  await tx.wait();
  console.log(`ISSUER_ROLE granted. Transaction: ${tx.hash}`);
}

/**
 * Register a participant for certificate eligibility
 */
async function registerParticipant(participantAddress, name) {
  const certificate = await getContract();

  console.log(`Registering participant ${name} (${participantAddress})...`);
  const tx = await certificate.registerParticipant(participantAddress, name);
  await tx.wait();
  console.log(`Participant registered. Transaction: ${tx.hash}`);
}

/**
 * Issue a certificate to a registered participant
 */
async function issueCertificate(recipientAddress, tokenURI, contentHash, cohort) {
  const certificate = await getContract();

  console.log(`Issuing certificate to ${recipientAddress}...`);
  const tx = await certificate.issueCertificate(recipientAddress, tokenURI, contentHash, cohort);
  const receipt = await tx.wait();

  // Find the CertificateIssued event to get the token ID
  const event = receipt.logs.find(
    (log) => log.fragment && log.fragment.name === "CertificateIssued"
  );
  const tokenId = event ? event.args[0] : "unknown";

  console.log(`Certificate issued. Token ID: ${tokenId}, Transaction: ${tx.hash}`);
  return tokenId;
}

/**
 * Verify a certificate
 */
async function verifyCertificate(tokenId) {
  const certificate = await getContract();

  console.log(`Verifying certificate ${tokenId}...`);
  const [isValid, recipient, contentHash, cohort, issuedAt] = await certificate.verifyCertificate(tokenId);

  console.log("Certificate Details:");
  console.log(`  Valid: ${isValid}`);
  console.log(`  Recipient: ${recipient}`);
  console.log(`  Content Hash: ${contentHash}`);
  console.log(`  Cohort: ${cohort}`);
  console.log(`  Issued At: ${new Date(Number(issuedAt) * 1000).toISOString()}`);

  return { isValid, recipient, contentHash, cohort, issuedAt };
}

/**
 * Get all certificates for a participant
 */
async function getParticipantCertificates(participantAddress) {
  const certificate = await getContract();

  console.log(`Getting certificates for ${participantAddress}...`);
  const tokenIds = await certificate.getParticipantCertificates(participantAddress);

  console.log(`Found ${tokenIds.length} certificate(s): ${tokenIds.join(", ")}`);
  return tokenIds;
}

/**
 * Revoke a certificate
 */
async function revokeCertificate(tokenId) {
  const certificate = await getContract();

  console.log(`Revoking certificate ${tokenId}...`);
  const tx = await certificate.revokeCertificate(tokenId);
  await tx.wait();
  console.log(`Certificate revoked. Transaction: ${tx.hash}`);
}

/**
 * Check if an address has the issuer role
 */
async function checkIssuerRole(address) {
  const certificate = await getContract();
  const ISSUER_ROLE = await certificate.ISSUER_ROLE();

  const hasRole = await certificate.hasRole(ISSUER_ROLE, address);
  console.log(`${address} has ISSUER_ROLE: ${hasRole}`);
  return hasRole;
}

// Export functions for programmatic use
module.exports = {
  addIssuer,
  registerParticipant,
  issueCertificate,
  verifyCertificate,
  getParticipantCertificates,
  revokeCertificate,
  checkIssuerRole,
};

// CLI interface using environment variables
async function main() {
  const command = process.env.CMD;

  switch (command) {
    case "add-issuer":
      if (!process.env.ADDR) throw new Error("ADDR is required");
      await addIssuer(process.env.ADDR);
      break;
    case "register":
      if (!process.env.ADDR || !process.env.NAME) throw new Error("ADDR and NAME are required");
      await registerParticipant(process.env.ADDR, process.env.NAME);
      break;
    case "issue":
      if (!process.env.ADDR || !process.env.URI || !process.env.HASH || !process.env.COHORT) {
        throw new Error("ADDR, URI, HASH, and COHORT are required");
      }
      await issueCertificate(process.env.ADDR, process.env.URI, process.env.HASH, process.env.COHORT);
      break;
    case "verify":
      if (!process.env.TOKEN_ID) throw new Error("TOKEN_ID is required");
      await verifyCertificate(process.env.TOKEN_ID);
      break;
    case "certificates":
      if (!process.env.ADDR) throw new Error("ADDR is required");
      await getParticipantCertificates(process.env.ADDR);
      break;
    case "revoke":
      if (!process.env.TOKEN_ID) throw new Error("TOKEN_ID is required");
      await revokeCertificate(process.env.TOKEN_ID);
      break;
    case "check-issuer":
      if (!process.env.ADDR) throw new Error("ADDR is required");
      await checkIssuerRole(process.env.ADDR);
      break;
    default:
      console.log(`
ClaudeCodeCertificate Interaction Script
========================================

Usage: CMD=<command> [PARAMS] npx hardhat run scripts/interact.js --network paseo

Commands:
  CMD=add-issuer ADDR=<address>
    Grant ISSUER_ROLE to an address

  CMD=register ADDR=<address> NAME="<name>"
    Register a participant for certificate eligibility

  CMD=issue ADDR=<address> URI="<tokenURI>" HASH="<contentHash>" COHORT="<cohort>"
    Issue a certificate to a registered participant

  CMD=verify TOKEN_ID=<id>
    Verify a certificate and show details

  CMD=certificates ADDR=<address>
    Get all certificates for a participant

  CMD=revoke TOKEN_ID=<id>
    Revoke a certificate

  CMD=check-issuer ADDR=<address>
    Check if an address has the ISSUER_ROLE

Examples:
  CMD=register ADDR=0x1234...abcd NAME="Alice" npx hardhat run scripts/interact.js --network paseo
  CMD=verify TOKEN_ID=1 npx hardhat run scripts/interact.js --network paseo
      `);
  }
}

// Run if called directly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
