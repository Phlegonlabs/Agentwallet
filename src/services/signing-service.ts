import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  serializeTransaction,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  mainnet,
  polygon,
  bsc,
  base,
  arbitrum,
  optimism,
  avalanche,
  fantom,
  xLayer,
  scroll,
} from "viem/chains";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import { WalletContractV4 } from "@ton/ton";
import { keyPairFromSeed } from "@ton/crypto";
import { internal } from "@ton/core";
import { TonClient } from "@ton/ton";
import { listWallets } from "./wallet-service.ts";
import { retrievePrivateKey } from "./vault-service.ts";
import { withSecureScope, toHex } from "../lib/index.ts";
import type {
  Result,
  SignRequest,
  SignResult,
  SignedTransaction,
  UnsignedTransaction,
} from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/** Map chain ID strings to viem chain objects */
const VIEM_CHAINS: Record<string, Chain> = {
  ethereum: mainnet,
  polygon,
  bsc,
  base,
  arbitrum,
  optimism,
  avalanche,
  fantom,
  xlayer: xLayer,
  scroll,
};

/** Solana mainnet RPC */
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/** TON mainnet RPC */
const TON_RPC = "https://toncenter.com/api/v2/jsonRPC";

/**
 * Signing Oracle — the sole module that touches plaintext private keys for signing.
 * Private keys never leave this module; only signed transactions are returned.
 */
export async function signTransaction(
  request: SignRequest
): Promise<Result<SignResult>> {
  const { walletAddress, transaction, masterPassword } = request;

  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === walletAddress.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${walletAddress}`));
  }

  try {
    const signed = await withSecureScope(
      () => retrievePrivateKey(wallet.id, masterPassword).then((r) => {
        if (!r.ok) throw new Error("Wrong password or corrupted vault.");
        return r.value;
      }),
      async (privateKey) => {
        switch (transaction.chainType) {
          case "evm":
            return signEVM(transaction.chainId, transaction, privateKey);
          case "solana":
            return signSolana(transaction, privateKey);
          case "ton":
            return signTON(transaction, privateKey);
          default:
            throw new Error(`Unsupported chain type`);
        }
      }
    );

    return ok({
      signedTransaction: signed,
      from: walletAddress,
    });
  } catch (e) {
    return err(
      new Error(`Signing failed: ${e instanceof Error ? e.message : String(e)}`)
    );
  }
}

/** Sign an EVM transaction — returns serialized signed tx */
async function signEVM(
  chainId: string,
  tx: UnsignedTransaction & { chainType: "evm" },
  privateKey: Uint8Array
): Promise<SignedTransaction> {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) {
    throw new Error(`No RPC config for chain: ${chainId}`);
  }

  const hexKey = `0x${Buffer.from(privateKey).toString("hex")}` as `0x${string}`;
  const account = privateKeyToAccount(hexKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const request = await walletClient.prepareTransactionRequest({
    to: tx.to,
    value: parseEther(tx.value),
    data: tx.data,
  });

  const serialized = await walletClient.signTransaction(request);

  return {
    chainType: "evm",
    chainId,
    serialized,
  };
}

/** Sign a Solana transaction — returns base64 serialized signed tx */
async function signSolana(
  tx: UnsignedTransaction & { chainType: "solana" },
  privateKey: Uint8Array
): Promise<SignedTransaction> {
  const keypair = Keypair.fromSecretKey(privateKey);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(tx.to),
      lamports: tx.lamports,
    })
  );

  transaction.recentBlockhash = tx.recentBlockhash;
  transaction.feePayer = keypair.publicKey;
  transaction.sign(keypair);

  const serialized = transaction
    .serialize()
    .toString("base64");

  return {
    chainType: "solana",
    serialized,
  };
}

/** Sign a TON transfer — returns base64 serialized signed BOC */
async function signTON(
  tx: UnsignedTransaction & { chainType: "ton" },
  privateKey: Uint8Array
): Promise<SignedTransaction> {
  const seed = privateKey.slice(0, 32);
  const keypair = keyPairFromSeed(Buffer.from(seed));

  const walletContract = WalletContractV4.create({
    workchain: 0,
    publicKey: keypair.publicKey,
  });

  const transferCell = walletContract.createTransfer({
    seqno: tx.seqno,
    secretKey: keypair.secretKey,
    messages: [
      internal({
        to: tx.to,
        value: tx.value,
        bounce: tx.bounce,
      }),
    ],
  });

  const serialized = transferCell.toBoc().toString("base64");

  return {
    chainType: "ton",
    serialized,
  };
}
