import { createHash } from "node:crypto";
import {
  createPublicClient,
  http,
  type Chain,
} from "viem";
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
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TonClient } from "@ton/ton";
import { Address as TonAddress } from "@ton/core";
import { listWallets } from "./wallet-service.ts";
import { signTransaction } from "./signing-service.ts";
import { checkTransferAllowed, recordTransfer } from "./guard-service.ts";
import { logAudit } from "../lib/index.ts";
import type {
  Result,
  UnsignedTransaction,
  SignedTransaction,
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

export interface TransferParams {
  /** Sender wallet address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount in human-readable units (e.g. "0.1" = 0.1 ETH/SOL/TON) */
  amount: string;
  /** Password/recovery key to decrypt private key */
  password: string;
}

export interface TransferResult {
  chain: string;
  from: string;
  to: string;
  amount: string;
  status: "broadcasted";
  submissionId: string;
  txHash?: string;
}

export interface BroadcastResult {
  status: "broadcasted";
  submissionId: string;
  txHash?: string;
}

/**
 * Build an unsigned transaction for a native token transfer.
 * This step queries on-chain data (nonce, blockhash, seqno) but
 * never touches private keys.
 */
export async function buildTransaction(
  from: string,
  to: string,
  amount: string
): Promise<Result<UnsignedTransaction>> {
  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === from.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${from}`));
  }

  try {
    switch (wallet.chainType) {
      case "evm":
        return ok({
          chainType: "evm",
          chainId: wallet.chainId,
          to: to as `0x${string}`,
          value: amount,
          valueUnit: "human",
        });
      case "solana": {
        const connection = new Connection(SOLANA_RPC, "confirmed");
        const blockhash = await connection.getLatestBlockhash();
        const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL);
        return ok({
          chainType: "solana",
          to,
          lamports,
          recentBlockhash: blockhash.blockhash,
          feePayer: from,
        });
      }
      case "ton": {
        const client = new TonClient({ endpoint: TON_RPC });
        const tonAddress = TonAddress.parse(from);
        // We need to get seqno from the contract — requires opening the wallet
        // For now, we fetch it using generic getSeqno approach
        const contractState = await client.runMethod(tonAddress, "seqno");
        const seqno = contractState.stack.readNumber();
        return ok({
          chainType: "ton",
          to,
          value: amount,
          bounce: false,
          seqno,
        });
      }
      default:
        return err(new Error(`Unsupported chain type: ${wallet.chainType}`));
    }
  } catch (e) {
    return err(
      new Error(
        `Failed to build transaction: ${e instanceof Error ? e.message : String(e)}`
      )
    );
  }
}

/**
 * Broadcast a signed transaction to the network.
 * No private keys involved — only the serialized signed tx.
 */
export async function broadcastTransaction(
  signed: SignedTransaction
): Promise<Result<BroadcastResult>> {
  try {
    switch (signed.chainType) {
      case "evm": {
        const chain = VIEM_CHAINS[signed.chainId!];
        if (!chain) {
          return err(new Error(`No RPC config for chain: ${signed.chainId}`));
        }
        const client = createPublicClient({ chain, transport: http() });
        const txHash = await client.sendRawTransaction({
          serializedTransaction: signed.serialized as `0x${string}`,
        });
        return ok({
          status: "broadcasted",
          submissionId: txHash,
          txHash,
        });
      }
      case "solana": {
        const connection = new Connection(SOLANA_RPC, "confirmed");
        const txBuffer = Buffer.from(signed.serialized, "base64");
        const txHash = await connection.sendRawTransaction(txBuffer);
        return ok({
          status: "broadcasted",
          submissionId: txHash,
          txHash,
        });
      }
      case "ton": {
        const client = new TonClient({ endpoint: TON_RPC });
        const boc = Buffer.from(signed.serialized, "base64");
        await client.sendFile(boc);
        return ok({
          status: "broadcasted",
          submissionId: `boc_${createHash("sha256").update(boc).digest("hex")}`,
        });
      }
      default:
        return err(new Error(`Unsupported chain type: ${signed.chainType}`));
    }
  } catch (e) {
    return err(
      new Error(
        `Broadcast failed: ${e instanceof Error ? e.message : String(e)}`
      )
    );
  }
}

/**
 * High-level transfer: build → sign → broadcast.
 * transfer-service no longer touches private keys directly.
 */
export async function transfer(
  params: TransferParams
): Promise<Result<TransferResult>> {
  const { from, to, amount, password } = params;

  // Step 0: Guard check — limits, whitelist, rate
  const guardResult = checkTransferAllowed(to, amount);
  if (!guardResult.ok) {
    logAudit("TRANSFER_BLOCKED", "failure", {
      from,
      to,
      amount,
      reason: guardResult.error.message,
    });
    return guardResult;
  }

  // Step 1: Build unsigned transaction
  const buildResult = await buildTransaction(from, to, amount);
  if (!buildResult.ok) return buildResult;

  // Step 2: Sign via signing oracle
  const signResult = await signTransaction({
    walletAddress: from,
    transaction: buildResult.value,
    password,
  });
  if (!signResult.ok) return signResult;

  // Step 3: Broadcast
  const broadcastResult = await broadcastTransaction(
    signResult.value.signedTransaction
  );
  if (!broadcastResult.ok) return broadcastResult;

  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === from.toLowerCase()
  );

  // Record successful transfer for daily/hourly tracking
  recordTransfer(amount);

  return ok({
    chain: wallet?.chainId ?? "unknown",
    from,
    to,
    amount,
    status: broadcastResult.value.status,
    submissionId: broadcastResult.value.submissionId,
    txHash: broadcastResult.value.txHash,
  });
}
