import { generateMnemonic as genMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { privateKeyToAccount } from "viem/accounts";
import { keyPairFromSeed } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { EVM_HD_PATH, SOLANA_HD_PATH, TON_HD_PATH } from "../config/index.ts";
export interface DerivedWallet {
  address: string;
  privateKey: Uint8Array;
  hdPath: string;
}

/** Generate a BIP39 mnemonic (12 words) */
export function generateMnemonic(): string {
  return genMnemonic(wordlist, 128);
}

/** Derive an EVM wallet from mnemonic at given index */
export function deriveEVMWallet(mnemonic: string, index: number): DerivedWallet {
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    const hdPath = `${EVM_HD_PATH}/${index}`;
    const hdKey = HDKey.fromMasterSeed(seed).derive(hdPath);

    if (!hdKey.privateKey) {
      throw new Error("Failed to derive EVM private key");
    }

    const account = privateKeyToAccount(
      `0x${Buffer.from(hdKey.privateKey).toString("hex")}` as `0x${string}`
    );

    return {
      address: account.address,
      privateKey: hdKey.privateKey,
      hdPath,
    };
  } finally {
    seed.fill(0);
  }
}

/** Derive a TON wallet from mnemonic at given index */
export function deriveTONWallet(mnemonic: string, index: number): DerivedWallet {
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    const hdPath = `${TON_HD_PATH}/${index}'`;
    const derived = derivePath(hdPath, Buffer.from(seed).toString("hex"));
    const keypair = keyPairFromSeed(Buffer.from(derived.key));
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keypair.publicKey });

    return {
      address: wallet.address.toString({ bounceable: false }),
      privateKey: keypair.secretKey,
      hdPath,
    };
  } finally {
    seed.fill(0);
  }
}

/** Derive a Solana wallet from mnemonic at given index */
export function deriveSolanaWallet(mnemonic: string, index: number): DerivedWallet {
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    const hdPath = `${SOLANA_HD_PATH}/${index}'/0'`;
    const derived = derivePath(hdPath, Buffer.from(seed).toString("hex"));
    const keypair = Keypair.fromSeed(derived.key);

    return {
      address: keypair.publicKey.toBase58(),
      privateKey: keypair.secretKey,
      hdPath,
    };
  } finally {
    seed.fill(0);
  }
}
