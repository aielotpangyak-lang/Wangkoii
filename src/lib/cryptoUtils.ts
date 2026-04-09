/**
 * Utilities for End-to-End Encryption using Web Crypto API (ECDH + AES-GCM)
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(text: string, sharedKey: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    encoded
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

export async function decryptMessage(encryptedBase64: string, ivBase64: string, sharedKey: CryptoKey): Promise<string> {
  const encrypted = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

// Helper to store/retrieve private key from localStorage (for demo purposes)
// In a real app, this should be protected by a password-derived key or stored more securely.
export async function getStoredKeyPair(): Promise<CryptoKeyPair | null> {
  const stored = localStorage.getItem('e2ee_keys');
  if (!stored) return null;
  
  const { privateKey, publicKey } = JSON.parse(stored);
  
  // Import private key
  const privBinary = atob(privateKey);
  const privBytes = new Uint8Array(privBinary.length);
  for (let i = 0; i < privBinary.length; i++) privBytes[i] = privBinary.charCodeAt(i);
  
  const privKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  // Import public key
  const pubKey = await importPublicKey(publicKey);
  
  return { privateKey: privKey, publicKey: pubKey };
}

export async function saveKeyPair(keys: CryptoKeyPair) {
  const pubBase64 = await exportPublicKey(keys.publicKey);
  
  const privExported = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey);
  const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExported)));
  
  localStorage.setItem('e2ee_keys', JSON.stringify({
    privateKey: privBase64,
    publicKey: pubBase64
  }));
}
