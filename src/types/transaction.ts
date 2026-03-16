import type { ChainType } from "./chain.ts";

/** EVM unsigned transaction */
export interface EVMUnsignedTransaction {
  chainType: "evm";
  chainId: string;
  to: `0x${string}`;
  value: string;
  valueUnit?: "human" | "base";
  data?: `0x${string}`;
  nonce?: number;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/** Solana unsigned transaction */
export interface SolanaUnsignedTransaction {
  chainType: "solana";
  to: string;
  lamports: number;
  recentBlockhash: string;
  feePayer: string;
  /** Optional SPL token transfer (when present, lamports is ignored) */
  splTransfer?: {
    mint: string;
    amount: string;
    decimals: number;
    senderATA: string;
    recipientATA: string;
    createRecipientATA: boolean;
  };
}

/** TON unsigned transaction */
export interface TONUnsignedTransaction {
  chainType: "ton";
  to: string;
  value: string;
  bounce: boolean;
  seqno: number;
}

/** Discriminated union of all unsigned transaction types */
export type UnsignedTransaction =
  | EVMUnsignedTransaction
  | SolanaUnsignedTransaction
  | TONUnsignedTransaction;

/** Signed transaction ready for broadcast */
export interface SignedTransaction {
  chainType: ChainType;
  chainId?: string;
  serialized: string;
}

/** Request to sign a transaction */
export interface SignRequest {
  walletAddress: string;
  transaction: UnsignedTransaction;
  password: string;
}

/** Result of a signing operation */
export interface SignResult {
  signedTransaction: SignedTransaction;
  from: string;
}
