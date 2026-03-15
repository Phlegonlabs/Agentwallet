import { deriveEVMWallet, deriveSolanaWallet, deriveTONWallet } from "../lib/index.ts";
import type { DerivedWallet } from "../lib/index.ts";
import type { SupportedChain } from "../types/index.ts";

/** Generate a wallet for the given chain */
export function generateWallet(
  chain: SupportedChain,
  mnemonic: string,
  hdIndex: number
): DerivedWallet {
  switch (chain.type) {
    case "evm":
      return deriveEVMWallet(mnemonic, hdIndex);
    case "solana":
      return deriveSolanaWallet(mnemonic, hdIndex);
    case "ton":
      return deriveTONWallet(mnemonic, hdIndex);
    default:
      throw new Error(`Unsupported chain type: ${chain.type}`);
  }
}
