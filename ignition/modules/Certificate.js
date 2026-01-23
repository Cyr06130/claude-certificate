const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * Deployment module for ClaudeCodeCertificate contract
 * Deployer automatically receives DEFAULT_ADMIN_ROLE and ISSUER_ROLE
 */
module.exports = buildModule("CertificateModule", (m) => {
  // Deploy the certificate contract
  // No constructor parameters needed - deployer gets admin role automatically
  const certificate = m.contract("ClaudeCodeCertificate");

  return { certificate };
});
