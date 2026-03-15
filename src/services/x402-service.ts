import { listWallets } from "./wallet-service.ts";
import { signTransaction } from "./signing-service.ts";
import type { Result } from "../types/index.ts";
import { ok, err } from "../types/index.ts";

/**
 * x402 Payment-Required header fields (subset of the x402 protocol spec).
 * See https://www.x402.org/ for the full specification.
 */
export interface X402PaymentRequired {
  /** Network identifier (e.g. "base", "polygon", "solana") */
  network: string;
  /** Token contract address or "native" */
  token: string;
  /** Amount in smallest unit (e.g. wei, lamports) */
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

/**
 * Sign an x402 payment.
 * Parses the PAYMENT-REQUIRED header, constructs a native transfer,
 * and signs it via the signing oracle.
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

  // Validate network matches wallet chain
  const networkToChain: Record<string, string[]> = {
    ethereum: ["ethereum"],
    base: ["base"],
    polygon: ["polygon"],
    arbitrum: ["arbitrum"],
    optimism: ["optimism"],
    solana: ["solana"],
  };

  const validChains = networkToChain[paymentRequired.network];
  if (!validChains || !validChains.includes(wallet.chainId)) {
    return err(
      new Error(
        `Wallet chain ${wallet.chainId} does not match payment network ${paymentRequired.network}`
      )
    );
  }

  // Only support native token payments for now
  if (paymentRequired.token !== "native" && paymentRequired.token !== "") {
    return err(
      new Error("Only native token payments are supported. ERC-20/SPL support coming soon.")
    );
  }

  // Build and sign a native transfer to the payment recipient
  // For x402, we construct a minimal transfer transaction
  try {
    if (wallet.chainType === "evm") {
      // EVM: Build a simple ETH transfer
      const signResult = await signTransaction({
        walletAddress,
        transaction: {
          chainType: "evm",
          chainId: wallet.chainId,
          to: paymentRequired.recipient as `0x${string}`,
          value: paymentRequired.amount,
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

    if (wallet.chainType === "solana") {
      return err(
        new Error("x402 Solana payment signing requires SPL USDC support (not yet implemented)")
      );
    }

    return err(new Error(`x402 not supported for chain type: ${wallet.chainType}`));
  } catch (e) {
    return err(
      new Error(`x402 signing failed: ${e instanceof Error ? e.message : String(e)}`)
    );
  }
}
