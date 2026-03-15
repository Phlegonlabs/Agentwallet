import sodium from "libsodium-wrappers-sumo";

/** Zero out a Uint8Array to prevent private key leakage */
export async function zeroize(buffer: Uint8Array): Promise<void> {
  await sodium.ready;
  sodium.memzero(buffer);
}

/**
 * Execute an operation with a sensitive key, ensuring cleanup in finally block.
 * The key is obtained lazily and zeroized after the operation completes (or fails).
 */
export async function withSecureScope<T>(
  getKey: () => Promise<Uint8Array>,
  operation: (key: Uint8Array) => Promise<T>
): Promise<T> {
  const key = await getKey();
  try {
    return await operation(key);
  } finally {
    await zeroize(key);
  }
}

/** Encode a Uint8Array to hex string */
export function toHex(data: Uint8Array): string {
  return Buffer.from(data).toString("hex");
}

/** Encode a Uint8Array to base58 (for Solana keys) */
export function toBase58(data: Uint8Array): string {
  const bs58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt("0x" + Buffer.from(data).toString("hex"));
  const result: string[] = [];
  while (num > 0n) {
    const remainder = Number(num % 58n);
    result.unshift(bs58Alphabet[remainder]!);
    num = num / 58n;
  }
  // Handle leading zeros
  for (const byte of data) {
    if (byte === 0) result.unshift("1");
    else break;
  }
  return result.join("");
}
