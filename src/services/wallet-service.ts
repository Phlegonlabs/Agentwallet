import { randomUUID } from "node:crypto";
import { generateMnemonic, zeroize, toHex, toBase58 } from "../lib/index.ts";
import { secureWrite, secureRead, secureDelete, exists } from "../lib/index.ts";
import { getWalletsPath, getKeyFilePath, WALLETS_FILE_MODE } from "../config/index.ts";
import { findChain, SUPPORTED_CHAINS } from "../config/index.ts";
import { generateWallet } from "./chain-service.ts";
import {
  isVaultInitialized,
  storeMnemonic,
  retrieveMnemonic,
  storePrivateKey,
  retrievePrivateKey,
} from "./vault-service.ts";
import type { Wallet, WalletStore, Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Load wallet store from disk */
function loadWalletStore(): WalletStore {
  const result = secureRead(getWalletsPath());
  if (!result.ok) {
    return { wallets: [], nextHdIndex: 0 };
  }
  return JSON.parse(result.value) as WalletStore;
}

/** Save wallet store to disk */
function saveWalletStore(store: WalletStore): void {
  secureWrite(getWalletsPath(), JSON.stringify(store, null, 2), WALLETS_FILE_MODE);
}

/** Create a wallet for a specific chain */
export async function createWallet(
  chainId: string,
  masterPassword: string
): Promise<Result<Wallet>> {
  if (!isVaultInitialized()) {
    return err(new Error("Vault not initialized. Run 'agentwallet init' first."));
  }

  const chain = findChain(chainId);
  if (!chain) {
    const available = SUPPORTED_CHAINS.map((c) => c.id).join(", ");
    return err(new Error(`Unknown chain "${chainId}". Available: ${available}`));
  }

  const store = loadWalletStore();

  // Get or create mnemonic
  let mnemonic: string;
  const mnemonicResult = await retrieveMnemonic(masterPassword);
  if (mnemonicResult.ok) {
    mnemonic = mnemonicResult.value;
  } else if (store.wallets.length === 0) {
    // First wallet — generate new mnemonic
    mnemonic = generateMnemonic();
    const storeResult = await storeMnemonic(mnemonic, masterPassword);
    if (!storeResult.ok) return storeResult;
  } else {
    return err(new Error("Wrong password or corrupted vault."));
  }

  // Derive wallet
  const hdIndex = store.nextHdIndex;
  const derived = generateWallet(chain, mnemonic, hdIndex);

  // Store encrypted private key
  const walletId = randomUUID();
  const keyResult = await storePrivateKey(walletId, derived.privateKey, masterPassword);
  if (!keyResult.ok) return keyResult;

  // Create wallet record
  const wallet: Wallet = {
    id: walletId,
    address: derived.address,
    chainType: chain.type,
    chainId: chain.id,
    chainName: chain.name,
    createdAt: new Date().toISOString(),
    hdPath: derived.hdPath,
    hdIndex,
  };

  store.wallets.push(wallet);
  store.nextHdIndex = hdIndex + 1;
  saveWalletStore(store);

  // Zeroize sensitive data
  await zeroize(derived.privateKey);

  return ok(wallet);
}

/** Create wallets for all supported chains */
export async function createAllWallets(
  masterPassword: string
): Promise<Result<Wallet[]>> {
  const wallets: Wallet[] = [];
  for (const chain of SUPPORTED_CHAINS) {
    const result = await createWallet(chain.id, masterPassword);
    if (!result.ok) return result;
    wallets.push(result.value);
  }
  return ok(wallets);
}

/** List all wallets */
export function listWallets(): Wallet[] {
  const store = loadWalletStore();
  return store.wallets;
}

/** Export a wallet's private key */
export async function exportPrivateKey(
  address: string,
  masterPassword: string
): Promise<Result<string>> {
  const store = loadWalletStore();
  const wallet = store.wallets.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${address}`));
  }

  const result = await retrievePrivateKey(wallet.id, masterPassword);
  if (!result.ok) return result;

  let privateKey: string;
  if (wallet.chainType === "solana") {
    privateKey = toBase58(result.value);
  } else if (wallet.chainType === "ton") {
    privateKey = toHex(result.value);
  } else {
    privateKey = `0x${toHex(result.value)}`;
  }

  await zeroize(result.value);
  return ok(privateKey);
}

/** Get the mnemonic */
export async function exportMnemonic(
  masterPassword: string
): Promise<Result<string>> {
  return retrieveMnemonic(masterPassword);
}

/** Set a label on a wallet */
export function labelWallet(address: string, label: string): Result<Wallet> {
  const store = loadWalletStore();
  const wallet = store.wallets.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${address}`));
  }
  wallet.label = label;
  saveWalletStore(store);
  return ok(wallet);
}

/** Delete a wallet securely */
export function deleteWallet(address: string): Result<void> {
  const store = loadWalletStore();
  const index = store.wallets.findIndex(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (index === -1) {
    return err(new Error(`Wallet not found: ${address}`));
  }

  const wallet = store.wallets[index]!;
  // Securely delete the key file
  secureDelete(getKeyFilePath(wallet.id));
  // Remove from store
  store.wallets.splice(index, 1);
  saveWalletStore(store);
  return ok(undefined);
}
