import { createPublicClient, http, formatEther, type Chain } from "viem";
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
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TonClient } from "@ton/ton";
import { Address as TonAddress } from "@ton/core";
import { listWallets } from "./wallet-service.ts";
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

/** Native token symbols per chain */
const CHAIN_SYMBOLS: Record<string, string> = {
  ethereum: "ETH",
  polygon: "MATIC",
  bsc: "BNB",
  base: "ETH",
  arbitrum: "ETH",
  optimism: "ETH",
  avalanche: "AVAX",
  fantom: "FTM",
  xlayer: "OKB",
  scroll: "ETH",
  solana: "SOL",
  ton: "TON",
};

/** Solana mainnet RPC */
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/** TON mainnet RPC */
const TON_RPC = "https://toncenter.com/api/v2/jsonRPC";

export interface BalanceResult {
  balance: string;
  symbol: string;
  address: string;
  chainId: string;
}

/** Query balance for a wallet address. No private keys needed. */
export async function getBalance(address: string): Promise<Result<BalanceResult>> {
  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${address}`));
  }

  try {
    switch (wallet.chainType) {
      case "evm":
        return await getEVMBalance(wallet.address, wallet.chainId);
      case "solana":
        return await getSolanaBalance(wallet.address);
      case "ton":
        return await getTONBalance(wallet.address);
      default:
        return err(new Error(`Unsupported chain type: ${wallet.chainType}`));
    }
  } catch (e) {
    return err(
      new Error(
        `Balance query failed: ${e instanceof Error ? e.message : String(e)}`
      )
    );
  }
}

/** Get native EVM balance */
async function getEVMBalance(
  address: string,
  chainId: string
): Promise<Result<BalanceResult>> {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) {
    return err(new Error(`No RPC config for chain: ${chainId}`));
  }

  const client = createPublicClient({ chain, transport: http() });
  const balance = await client.getBalance({
    address: address as `0x${string}`,
  });

  return ok({
    balance: formatEther(balance),
    symbol: CHAIN_SYMBOLS[chainId] ?? "ETH",
    address,
    chainId,
  });
}

/** Get SOL balance */
async function getSolanaBalance(
  address: string
): Promise<Result<BalanceResult>> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);

  return ok({
    balance: (lamports / LAMPORTS_PER_SOL).toString(),
    symbol: "SOL",
    address,
    chainId: "solana",
  });
}

/** Get TON balance */
async function getTONBalance(
  address: string
): Promise<Result<BalanceResult>> {
  const client = new TonClient({ endpoint: TON_RPC });
  const tonAddress = TonAddress.parse(address);
  const balance = await client.getBalance(tonAddress);

  // TON balance is in nanotons (1 TON = 10^9 nanotons)
  const tonBalance = Number(balance) / 1e9;

  return ok({
    balance: tonBalance.toString(),
    symbol: "TON",
    address,
    chainId: "ton",
  });
}
