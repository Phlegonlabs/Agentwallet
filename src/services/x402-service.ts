import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { listWallets } from "./wallet-service.ts";
import { signTransaction } from "./signing-service.ts";
import { resolveToken, isNativeToken } from "../config/tokens.ts";
import { encodeERC20Transfer } from "../lib/token-encoding.ts";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/**
 * x402 Payment-Required header fields (subset of the x402 protocol spec).
 * See https://www.x402.org/ for the full specification.
 */
export interface X402PaymentRequired {
  /** Network identifier (e.g. "base", "polygon", "solana") */
  network: string;
  /** Token contract address or "native" / "USDC" / "USDT" */
  token: string;
  /** Amount in smallest unit (e.g. wei, lamports, or token base units) */
  amount: string;
  /** Recipient address for the payment */
  recipient: string;
  /** Optional memo/reference for the payment */
  memo?: string;
  /** Payment scheme version */
  scheme?: string;
}

/** Result of signing an x402 payment */
export interface X402SignResult {
  /** Base64-encoded payment signature for PAYMENT-SIGNATURE header */
  paymentSignature: string;
  /** The wallet address that signed */
  from: string;
  /** The network used */
  network: string;
  /** The amount paid */
  amount: string;
}

/** Solana mainnet RPC */
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/** Map x402 network names to wallet chainId values */
const networkToChain: Record<string, string[]> = {
  ethereum: ["ethereum"],
  base: ["base"],
  polygon: ["polygon"],
  arbitrum: ["arbitrum"],
  optimism: ["optimism"],
  avalanche: ["avalanche"],
  xlayer: ["xlayer"],
  solana: ["solana"],
};

/**
 * Sign an x402 payment.
 * Supports native tokens and ERC-20/SPL stablecoins (USDC, USDT).
 */
export async function signX402Payment(
  walletAddress: string,
  paymentRequired: X402PaymentRequired,
  masterPassword: string
): Promise<Result<X402SignResult>> {
  const wallets = listWallets();
  const wallet = wallets.find(
    (w) => w.address.toLowerCase() === walletAddress.toLowerCase()
  );
  if (!wallet) {
    return err(new Error(`Wallet not found: ${walletAddress}`));
  }

  const validChains = networkToChain[paymentRequired.network];
  if (!validChains || !validChains.includes(wallet.chainId)) {
    return err(
      new Error(
        `Wallet chain ${wallet.chainId} does not match payment network ${paymentRequired.network}`
      )
    );
  }

  const tokenConfig = isNativeToken(paymentRequired.token)
    ? undefined
    : resolveToken(paymentRequired.network, paymentRequired.token);

  if (!isNativeToken(paymentRequired.token) && !tokenConfig) {
    return err(
      new Error(
        `Unsupported token "${paymentRequired.token}" on network "${paymentRequired.network}"`
      )
    );
  }

  try {
    if (wallet.chainType === "evm") {
      return await signEVMPayment(walletAddress, paymentRequired, masterPassword, wallet.chainId, tokenConfig);
    }

    if (wallet.chainType === "solana") {
      return await signSolanaPayment(walletAddress, paymentRequired, masterPassword, tokenConfig);
    }

    return err(new Error(`x402 not supported for chain type: ${wallet.chainType}`));
  } catch (e) {
    return err(
      new Error(`x402 signing failed: ${e instanceof Error ? e.message : String(e)}`)
    );
  }
}

/** Sign an EVM x402 payment (native ETH or ERC-20 stablecoin) */
async function signEVMPayment(
  walletAddress: string,
  paymentRequired: X402PaymentRequired,
  masterPassword: string,
  chainId: string,
  tokenConfig: ReturnType<typeof resolveToken>
): Promise<Result<X402SignResult>> {
  const recipient = paymentRequired.recipient as `0x${string}`;

  const transaction = tokenConfig
    ? {
        chainType: "evm" as const,
        chainId,
        ...encodeERC20Transfer(recipient, BigInt(paymentRequired.amount), tokenConfig),
      }
    : {
        chainType: "evm" as const,
        chainId,
        to: recipient,
        value: paymentRequired.amount,
      };

  const signResult = await signTransaction({
    walletAddress,
    transaction,
    masterPassword,
  });

  if (!signResult.ok) return signResult;

  return ok({
    paymentSignature: Buffer.from(
      signResult.value.signedTransaction.serialized
    ).toString("base64"),
    from: walletAddress,
    network: paymentRequired.network,
    amount: paymentRequired.amount,
  });
}

/** Sign a Solana x402 payment (native SOL or SPL stablecoin) */
async function signSolanaPayment(
  walletAddress: string,
  paymentRequired: X402PaymentRequired,
  masterPassword: string,
  tokenConfig: ReturnType<typeof resolveToken>
): Promise<Result<X402SignResult>> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();

  if (tokenConfig) {
    const mint = new PublicKey(tokenConfig.address);
    const senderPubkey = new PublicKey(walletAddress);
    const recipientPubkey = new PublicKey(paymentRequired.recipient);

    const senderATA = await getAssociatedTokenAddress(
      mint, senderPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const recipientATA = await getAssociatedTokenAddress(
      mint, recipientPubkey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let createRecipientATA = false;
    try {
      await getAccount(connection, recipientATA, "confirmed", TOKEN_PROGRAM_ID);
    } catch {
      createRecipientATA = true;
    }

    const signResult = await signTransaction({
      walletAddress,
      transaction: {
        chainType: "solana",
        to: paymentRequired.recipient,
        lamports: 0,
        recentBlockhash: blockhash,
        feePayer: walletAddress,
        splTransfer: {
          mint: tokenConfig.address,
          amount: paymentRequired.amount,
          decimals: tokenConfig.decimals,
          senderATA: senderATA.toBase58(),
          recipientATA: recipientATA.toBase58(),
          createRecipientATA,
        },
      },
      masterPassword,
    });

    if (!signResult.ok) return signResult;

    return ok({
      paymentSignature: Buffer.from(
        signResult.value.signedTransaction.serialized
      ).toString("base64"),
      from: walletAddress,
      network: paymentRequired.network,
      amount: paymentRequired.amount,
    });
  }

  // Native SOL transfer
  const signResult = await signTransaction({
    walletAddress,
    transaction: {
      chainType: "solana",
      to: paymentRequired.recipient,
      lamports: Number(paymentRequired.amount),
      recentBlockhash: blockhash,
      feePayer: walletAddress,
    },
    masterPassword,
  });

  if (!signResult.ok) return signResult;

  return ok({
    paymentSignature: Buffer.from(
      signResult.value.signedTransaction.serialized
    ).toString("base64"),
    from: walletAddress,
    network: paymentRequired.network,
    amount: paymentRequired.amount,
  });
}
