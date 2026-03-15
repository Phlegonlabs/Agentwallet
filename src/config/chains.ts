import type { SupportedChain } from "../types/index.ts";

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { name: "Ethereum", id: "ethereum", type: "evm", chainId: 1 },
  { name: "Polygon", id: "polygon", type: "evm", chainId: 137 },
  { name: "BSC", id: "bsc", type: "evm", chainId: 56 },
  { name: "Base", id: "base", type: "evm", chainId: 8453 },
  { name: "Arbitrum", id: "arbitrum", type: "evm", chainId: 42161 },
  { name: "Optimism", id: "optimism", type: "evm", chainId: 10 },
  { name: "Avalanche", id: "avalanche", type: "evm", chainId: 43114 },
  { name: "Fantom", id: "fantom", type: "evm", chainId: 250 },
  { name: "Solana", id: "solana", type: "solana" },
];

export function findChain(id: string): SupportedChain | undefined {
  if (id === "evm") {
    return SUPPORTED_CHAINS.find((c) => c.id === "ethereum");
  }
  return SUPPORTED_CHAINS.find(
    (c) => c.id === id.toLowerCase() || c.name.toLowerCase() === id.toLowerCase()
  );
}

export function getEVMChains(): SupportedChain[] {
  return SUPPORTED_CHAINS.filter((c) => c.type === "evm");
}
