import * as Crypto from "expo-crypto";

/**
 * Password hashing version.
 * Increment this if you ever change the hashing algorithm.
 */
const HASH_VERSION = "v1";

/**
 * Application pepper.
 * This is NOT a secret like a server-side key,
 * but it adds another layer beyond the user's password.
 */
const PEPPER = "EzDocs_2026";

/**
 * Creates a SHA-256 hash for storing passwords.
 */
export async function hashPassword(
  password: string
): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${password}:${PEPPER}`
  );

  return `${HASH_VERSION}:${hash}`;
}

/**
 * Verifies a password against the stored hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }

  const [version, hash] = storedHash.split(":");

  switch (version) {
    case "v1": {
      const newHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${password}:${PEPPER}`
      );

      return hash === newHash;
    }

    default:
      return false;
  }
}