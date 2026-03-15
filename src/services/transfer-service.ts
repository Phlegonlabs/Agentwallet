import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
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
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { WalletContractV4 } from "@ton/ton";
import { keyPairFromSeed } from "@ton/crypto";
import { internal } from "@ton/core";
import { TonClient } from "@ton/ton";
import { listWallets, exportMnemonic } from "./wallet-service.ts";
import { retrievePrivateKey } from "./vault-service.ts";
import { toHex } from "../lib/index.ts";
import type { Result } from "../types/index.ts";
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

export interface TransferParams {
  /** Sender wallet address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount in human-readable units (e.g. "0.1" = 0.1 ETH/SOL/TON) */
  amount: string;
  /** Master password to decrypt private key */
  masterPassword: string;
}

export interface TransferResult {
  txHash: string;
  chain: string;
  from: string;
  to: string;
  amount: string;
}

/** Transfer native token on any supported chain */
export async function transfer(params: TransferParams): Promise<Result<TransferResult>> {
  const { from, to, amount, masterPassword } = params;

  // Find the wallet
  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === from.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${from}`));
  }

  // Decrypt private key
  const keyResult = await retrievePrivateKey(wallet.id, masterPassword);
  if (!keyResult.ok) {
    return err(new Error("Wrong password or corrupted vault."));
  }

  try {
    switch (wallet.chainType) {
      case "evm":
        return await transferEVM(wallet.chainId, to, amount, keyResult.value);
      case "solana":
        return await transferSolana(to, amount, keyResult.value);
      case "ton":
        return await transferTON(from, to, amount, keyResult.value);
      default:
        return err(new Error(`Unsupported chain type: ${wallet.chainType}`));
    }
  } catch (e) {
    return err(new Error(`Transfer failed: ${e instanceof Error ? e.message : String(e)}`));
  }
}

/** EVM native transfer (ETH, MATIC, BNB, etc.) */
async function transferEVM(
  chainId: string,
  to: string,
  amount: string,
  privateKey: Uint8Array
): Promise<Result<TransferResult>> {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) {
    return err(new Error(`No RPC config for chain: ${chainId}`));
  }

  const hexKey = `0x${Buffer.from(privateKey).toString("hex")}` as `0x${string}`;
  const account = privateKeyToAccount(hexKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const txHash = await walletClient.sendTransaction({
    to: to as `0x${string}`,
    value: parseEther(amount),
  });

  return ok({
    txHash,
    chain: chainId,
    from: account.address,
    to,
    amount,
  });
}

/** Solana native transfer (SOL) */
async function transferSolana(
  to: string,
  amount: string,
  privateKey: Uint8Array
): Promise<Result<TransferResult>> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const keypair = Keypair.fromSecretKey(privateKey);
  const lamports = Math.round(parseFloat(amount) * 1e9);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    })
  );

  const txHash = await sendAndConfirmTransaction(connection, transaction, [keypair]);

  return ok({
    txHash,
    chain: "solana",
    from: keypair.publicKey.toBase58(),
    to,
    amount,
  });
}

/** TON native transfer (TON) */
async function transferTON(
  from: string,
  to: string,
  amount: string,
  privateKey: Uint8Array
): Promise<Result<TransferResult>> {
  const client = new TonClient({ endpoint: TON_RPC });

  // Reconstruct keypair from secret key (first 32 bytes = seed)
  const seed = privateKey.slice(0, 32);
  const keypair = keyPairFromSeed(Buffer.from(seed));

  const walletContract = WalletContractV4.create({ workchain: 0, publicKey: keypair.publicKey });
  const contract = client.open(walletContract);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
    seqno,
    secretKey: keypair.secretKey,
    messages: [
      internal({
        to,
        value: amount,
        bounce: false,
      }),
    ],
  });

  return ok({
    txHash: `ton_seqno_${seqno}`,
    chain: "ton",
    from,
    to,
    amount,
  });
}
