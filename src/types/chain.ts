export type ChainType = "evm" | "solana";

export interface SupportedChain {
  /** Display name: "Ethereum", "Polygon", "Solana" */
  name: string;
  /** CLI identifier: "ethereum", "polygon", "solana" */
  id: string;
  /** Key type */
  type: ChainType;
  /** EVM chain ID (only for EVM chains) */
  chainId?: number;
}
