import type { ChainType } from "./chain.ts";

export interface Wallet {
  id: string;
  address: string;
  chainType: ChainType;
  chainId: string;
  chainName: string;
  label?: string;
  createdAt: string;
  hdPath: string;
  hdIndex: number;
}

export interface WalletStore {
  wallets: Wallet[];
  nextHdIndex: number;
}
