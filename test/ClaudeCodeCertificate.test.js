const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("ClaudeCodeCertificate", function () {
  // Fixture to deploy the contract and set up test accounts
  async function deployContractFixture() {
    const [deployer, issuer, participant1, participant2, nonIssuer] = await ethers.getSigners();

    const ClaudeCodeCertificate = await ethers.getContractFactory("ClaudeCodeCertificate");
    const certificate = await ClaudeCodeCertificate.deploy();

    const ISSUER_ROLE = await certificate.ISSUER_ROLE();
    const DEFAULT_ADMIN_ROLE = await certificate.DEFAULT_ADMIN_ROLE();

    return {
      certificate,
      deployer,
      issuer,
      participant1,
      participant2,
      nonIssuer,
      ISSUER_ROLE,
      DEFAULT_ADMIN_ROLE,
    };
  }

  describe("Deployment", function () {
    it("Should set the deployer as admin and issuer", async function () {
      const { certificate, deployer, ISSUER_ROLE, DEFAULT_ADMIN_ROLE } = await loadFixture(deployContractFixture);

      expect(await certificate.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await certificate.hasRole(ISSUER_ROLE, deployer.address)).to.be.true;
    });

    it("Should have correct name and symbol", async function () {
      const { certificate } = await loadFixture(deployContractFixture);

      expect(await certificate.name()).to.equal("Claude Code Certificate");
      expect(await certificate.symbol()).to.equal("CCC");
    });
  });

  describe("Participant Registration", function () {
    it("Should allow issuer to register a participant", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await expect(certificate.connect(deployer).registerParticipant(participant1.address, "Alice"))
        .to.emit(certificate, "ParticipantRegistered")
        .withArgs(participant1.address, "Alice", anyValue);

      const participant = await certificate.participants(participant1.address);
      expect(participant.isRegistered).to.be.true;
      expect(participant.name).to.equal("Alice");
    });

    it("Should revert when non-issuer tries to register participant", async function () {
      const { certificate, nonIssuer, participant1 } = await loadFixture(deployContractFixture);

      await expect(
        certificate.connect(nonIssuer).registerParticipant(participant1.address, "Alice")
      ).to.be.reverted;
    });

    it("Should revert when registering same participant twice", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");

      await expect(
        certificate.connect(deployer).registerParticipant(participant1.address, "Alice Again")
      ).to.be.revertedWith("Participant already registered");
    });

    it("Should revert when name is empty", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await expect(
        certificate.connect(deployer).registerParticipant(participant1.address, "")
      ).to.be.revertedWith("Name cannot be empty");
    });
  });

  describe("Certificate Issuance", function () {
    it("Should issue certificate to registered participant", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");

      const tokenURI = "ipfs://QmExample123";
      const contentHash = "sha256:abc123";
      const cohort = "2024-Q1";

      await expect(
        certificate.connect(deployer).issueCertificate(participant1.address, tokenURI, contentHash, cohort)
      )
        .to.emit(certificate, "CertificateIssued")
        .and.to.emit(certificate, "Locked");

      expect(await certificate.ownerOf(1)).to.equal(participant1.address);
      expect(await certificate.tokenURI(1)).to.equal(tokenURI);

      const cert = await certificate.certificates(1);
      expect(cert.recipient).to.equal(participant1.address);
      expect(cert.contentHash).to.equal(contentHash);
      expect(cert.cohort).to.equal(cohort);
      expect(cert.isRevoked).to.be.false;
    });

    it("Should revert when issuing to unregistered participant", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await expect(
        certificate.connect(deployer).issueCertificate(
          participant1.address,
          "ipfs://QmExample",
          "hash",
          "cohort"
        )
      ).to.be.revertedWith("Recipient not registered");
    });

    it("Should revert when non-issuer tries to issue", async function () {
      const { certificate, deployer, nonIssuer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");

      await expect(
        certificate.connect(nonIssuer).issueCertificate(
          participant1.address,
          "ipfs://QmExample",
          "hash",
          "cohort"
        )
      ).to.be.reverted;
    });

    it("Should track participant certificates", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");

      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample1",
        "hash1",
        "cohort1"
      );
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample2",
        "hash2",
        "cohort2"
      );

      const certs = await certificate.getParticipantCertificates(participant1.address);
      expect(certs.length).to.equal(2);
      expect(certs[0]).to.equal(1n);
      expect(certs[1]).to.equal(2n);
    });
  });

  describe("Soulbound Mechanism", function () {
    it("Should prevent certificate transfers", async function () {
      const { certificate, deployer, participant1, participant2 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await expect(
        certificate.connect(participant1).transferFrom(participant1.address, participant2.address, 1)
      ).to.be.revertedWith("Certificates are non-transferable");
    });

    it("Should prevent safeTransferFrom", async function () {
      const { certificate, deployer, participant1, participant2 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await expect(
        certificate.connect(participant1)["safeTransferFrom(address,address,uint256)"](
          participant1.address,
          participant2.address,
          1
        )
      ).to.be.revertedWith("Certificates are non-transferable");
    });

    it("Should return true for locked() on valid tokens (ERC-5192)", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      expect(await certificate.locked(1)).to.be.true;
    });

    it("Should revert locked() for non-existent token", async function () {
      const { certificate } = await loadFixture(deployContractFixture);

      await expect(certificate.locked(999)).to.be.revertedWith("Token does not exist");
    });

    it("Should support ERC-5192 interface", async function () {
      const { certificate } = await loadFixture(deployContractFixture);

      // ERC-5192 interface ID
      expect(await certificate.supportsInterface("0xb45a3c0e")).to.be.true;
    });
  });

  describe("Certificate Revocation", function () {
    it("Should allow issuer to revoke certificate", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await expect(certificate.connect(deployer).revokeCertificate(1))
        .to.emit(certificate, "CertificateRevoked")
        .withArgs(1, anyValue);

      const cert = await certificate.certificates(1);
      expect(cert.isRevoked).to.be.true;
    });

    it("Should revert when revoking non-existent certificate", async function () {
      const { certificate, deployer } = await loadFixture(deployContractFixture);

      await expect(
        certificate.connect(deployer).revokeCertificate(999)
      ).to.be.revertedWith("Certificate does not exist");
    });

    it("Should revert when revoking already revoked certificate", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await certificate.connect(deployer).revokeCertificate(1);

      await expect(
        certificate.connect(deployer).revokeCertificate(1)
      ).to.be.revertedWith("Certificate already revoked");
    });

    it("Should revert when non-issuer tries to revoke", async function () {
      const { certificate, deployer, nonIssuer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await expect(
        certificate.connect(nonIssuer).revokeCertificate(1)
      ).to.be.reverted;
    });
  });

  describe("Certificate Verification", function () {
    it("Should return valid certificate details", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "sha256:abc123",
        "2024-Q1"
      );

      const [isValid, recipient, contentHash, cohort, issuedAt] = await certificate.verifyCertificate(1);

      expect(isValid).to.be.true;
      expect(recipient).to.equal(participant1.address);
      expect(contentHash).to.equal("sha256:abc123");
      expect(cohort).to.equal("2024-Q1");
      expect(issuedAt).to.be.gt(0);
    });

    it("Should return invalid for revoked certificate", async function () {
      const { certificate, deployer, participant1 } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).registerParticipant(participant1.address, "Alice");
      await certificate.connect(deployer).issueCertificate(
        participant1.address,
        "ipfs://QmExample",
        "hash",
        "cohort"
      );

      await certificate.connect(deployer).revokeCertificate(1);

      const [isValid, , , ,] = await certificate.verifyCertificate(1);
      expect(isValid).to.be.false;
    });

    it("Should return invalid for non-existent certificate", async function () {
      const { certificate } = await loadFixture(deployContractFixture);

      const [isValid, recipient, contentHash, cohort, issuedAt] = await certificate.verifyCertificate(999);

      expect(isValid).to.be.false;
      expect(recipient).to.equal(ethers.ZeroAddress);
      expect(contentHash).to.equal("");
      expect(cohort).to.equal("");
      expect(issuedAt).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant ISSUER_ROLE", async function () {
      const { certificate, deployer, issuer, ISSUER_ROLE } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).grantRole(ISSUER_ROLE, issuer.address);

      expect(await certificate.hasRole(ISSUER_ROLE, issuer.address)).to.be.true;
    });

    it("Should allow admin to revoke ISSUER_ROLE", async function () {
      const { certificate, deployer, issuer, ISSUER_ROLE } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).grantRole(ISSUER_ROLE, issuer.address);
      await certificate.connect(deployer).revokeRole(ISSUER_ROLE, issuer.address);

      expect(await certificate.hasRole(ISSUER_ROLE, issuer.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const { certificate, nonIssuer, issuer, ISSUER_ROLE } = await loadFixture(deployContractFixture);

      await expect(
        certificate.connect(nonIssuer).grantRole(ISSUER_ROLE, issuer.address)
      ).to.be.reverted;
    });

    it("Should allow granted issuer to perform issuer actions", async function () {
      const { certificate, deployer, issuer, participant1, ISSUER_ROLE } = await loadFixture(deployContractFixture);

      await certificate.connect(deployer).grantRole(ISSUER_ROLE, issuer.address);

      await expect(
        certificate.connect(issuer).registerParticipant(participant1.address, "Alice")
      ).to.emit(certificate, "ParticipantRegistered");
    });
  });
});
