import { encodeFunctionData } from "viem";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import type { TokenConfig } from "../config/tokens.ts";

/** ERC-20 transfer(address,uint256) ABI fragment */
const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

/** Encode an ERC-20 transfer call for use in an EVM transaction */
export function encodeERC20Transfer(
  recipient: `0x${string}`,
  amount: bigint,
  tokenConfig: TokenConfig
): { to: `0x${string}`; value: string; data: `0x${string}` } {
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [recipient, amount],
  });

  return {
    to: tokenConfig.address as `0x${string}`,
    value: "0",
    data,
  };
}

/** Build SPL token transfer instructions (includes ATA creation if needed) */
export async function buildSPLTransferInstructions(
  senderPubkey: PublicKey,
  recipientPubkey: PublicKey,
  mint: PublicKey,
  amount: bigint,
  createRecipientATA: boolean
): Promise<TransactionInstruction[]> {
  const senderATA = await getAssociatedTokenAddress(
    mint,
    senderPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const recipientATA = await getAssociatedTokenAddress(
    mint,
    recipientPubkey,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const instructions: TransactionInstruction[] = [];

  if (createRecipientATA) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        senderPubkey,
        recipientATA,
        recipientPubkey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  instructions.push(
    createTransferInstruction(
      senderATA,
      recipientATA,
      senderPubkey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return instructions;
}
