// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ClaudeCodeCertificate
 * @dev Soulbound NFT certificate system for Claude Code training completion.
 * Implements ERC-721 with soulbound (non-transferable) mechanics and ERC-5192.
 */
contract ClaudeCodeCertificate is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Token counter
    Counters.Counter private _tokenIdCounter;

    // Participant information
    struct Participant {
        string name;
        uint256 registeredAt;
        bool isRegistered;
    }

    // Certificate information
    struct Certificate {
        address recipient;
        string contentHash;
        string cohort;
        uint256 issuedAt;
        bool isRevoked;
    }

    // Mappings
    mapping(address => Participant) public participants;
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) private _participantCertificates;

    // Events
    event ParticipantRegistered(address indexed participant, string name, uint256 timestamp);
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        string cohort,
        string contentHash,
        uint256 timestamp
    );
    event CertificateRevoked(uint256 indexed tokenId, uint256 timestamp);

    // ERC-5192 Soulbound event
    event Locked(uint256 tokenId);

    /**
     * @dev Constructor - sets up the certificate system
     * Deployer receives DEFAULT_ADMIN_ROLE and ISSUER_ROLE
     */
    constructor() ERC721("Claude Code Certificate", "CCC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    /**
     * @dev Register a participant for certificate eligibility
     * @param participant Address of the participant
     * @param name Name of the participant
     */
    function registerParticipant(address participant, string calldata name) external onlyRole(ISSUER_ROLE) {
        require(!participants[participant].isRegistered, "Participant already registered");
        require(bytes(name).length > 0, "Name cannot be empty");

        participants[participant] = Participant({
            name: name,
            registeredAt: block.timestamp,
            isRegistered: true
        });

        emit ParticipantRegistered(participant, name, block.timestamp);
    }

    /**
     * @dev Issue a certificate to a registered participant
     * @param recipient Address of the certificate recipient
     * @param tokenURI IPFS URI for the certificate metadata
     * @param contentHash Hash of the certificate content for verification
     * @param cohort Training cohort identifier
     * @return tokenId The ID of the minted certificate
     */
    function issueCertificate(
        address recipient,
        string calldata tokenURI,
        string calldata contentHash,
        string calldata cohort
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(participants[recipient].isRegistered, "Recipient not registered");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        certificates[tokenId] = Certificate({
            recipient: recipient,
            contentHash: contentHash,
            cohort: cohort,
            issuedAt: block.timestamp,
            isRevoked: false
        });

        _participantCertificates[recipient].push(tokenId);

        emit CertificateIssued(tokenId, recipient, cohort, contentHash, block.timestamp);
        emit Locked(tokenId);

        return tokenId;
    }

    /**
     * @dev Revoke a certificate
     * @param tokenId ID of the certificate to revoke
     */
    function revokeCertificate(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        require(_exists(tokenId), "Certificate does not exist");
        require(!certificates[tokenId].isRevoked, "Certificate already revoked");

        certificates[tokenId].isRevoked = true;

        emit CertificateRevoked(tokenId, block.timestamp);
    }

    /**
     * @dev Verify if a certificate is valid (exists and not revoked)
     * @param tokenId ID of the certificate to verify
     * @return isValid Whether the certificate is valid
     * @return recipient The certificate recipient address
     * @return contentHash The certificate content hash
     * @return cohort The training cohort
     * @return issuedAt The issuance timestamp
     */
    function verifyCertificate(uint256 tokenId) external view returns (
        bool isValid,
        address recipient,
        string memory contentHash,
        string memory cohort,
        uint256 issuedAt
    ) {
        if (!_exists(tokenId)) {
            return (false, address(0), "", "", 0);
        }

        Certificate memory cert = certificates[tokenId];
        isValid = !cert.isRevoked;
        recipient = cert.recipient;
        contentHash = cert.contentHash;
        cohort = cert.cohort;
        issuedAt = cert.issuedAt;
    }

    /**
     * @dev Get all certificate IDs for a participant
     * @param participant Address of the participant
     * @return Array of certificate token IDs
     */
    function getParticipantCertificates(address participant) external view returns (uint256[] memory) {
        return _participantCertificates[participant];
    }

    /**
     * @dev ERC-5192: Returns the locked status of a token
     * All certificates are permanently locked (soulbound)
     * @param tokenId ID of the token to check
     * @return True if the token is locked
     */
    function locked(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return true;
    }

    /**
     * @dev Override to prevent transfers (soulbound implementation)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        // Allow minting (from == address(0)) but prevent transfers
        require(from == address(0), "Certificates are non-transferable");
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage, AccessControl) returns (bool) {
        // ERC-5192 interface ID: 0xb45a3c0e
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
