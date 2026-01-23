// IPFS upload utilities using Pinata

const PINATA_API_URL = "https://api.pinata.cloud";

export interface IPFSUploadResult {
  uri: string;
  hash: string;
  cid: string;
}

// Compute SHA-256 hash of file content
async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

// Upload file to IPFS via Pinata
export async function uploadToIPFS(
  file: File,
  pinataJwt: string
): Promise<IPFSUploadResult> {
  // Create form data for Pinata
  const formData = new FormData();
  formData.append("file", file);

  // Optional: Add metadata
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  // Upload to Pinata
  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to IPFS: ${error}`);
  }

  const result = await response.json();
  const cid = result.IpfsHash;

  // Compute content hash
  const hash = await computeSHA256(file);

  return {
    uri: `ipfs://${cid}`,
    hash,
    cid,
  };
}

// Upload JSON metadata to IPFS via Pinata
export async function uploadMetadataToIPFS(
  metadata: Record<string, unknown>,
  pinataJwt: string
): Promise<IPFSUploadResult> {
  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload metadata to IPFS: ${error}`);
  }

  const result = await response.json();
  const cid = result.IpfsHash;

  // Compute hash of the JSON content
  const jsonString = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    uri: `ipfs://${cid}`,
    hash: `sha256:${hashHex}`,
    cid,
  };
}
