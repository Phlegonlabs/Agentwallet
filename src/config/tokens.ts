/** Token configuration for ERC-20 and SPL stablecoins */
export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

/**
 * Stablecoin registry for x402-supported chains.
 * Only includes chains supported by the x402 protocol (CDP core + reference + ThirdWeb).
 */
export const TOKEN_REGISTRY: Record<string, Record<string, TokenConfig>> = {
  ethereum: {
    USDC: { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    USDT: { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  },
  base: {
    USDC: { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    USDT: { symbol: "USDT", address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6 },
  },
  polygon: {
    USDC: { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
    USDT: { symbol: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  },
  optimism: {
    USDC: { symbol: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
    USDT: { symbol: "USDT", address: "0x94b008aA00579c1307B0EF2c499aD98a8cE58e58", decimals: 6 },
  },
  arbitrum: {
    USDC: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    USDT: { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
  },
  avalanche: {
    USDC: { symbol: "USDC", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
    USDT: { symbol: "USDT", address: "0xc7198437980c041c805A1EDcbA50c1Ce5dB95118", decimals: 6 },
  },
  xlayer: {
    USDC: { symbol: "USDC", address: "0x74b7f16337b8972027f6196a17a631ac6de26d22", decimals: 6 },
    USDT: { symbol: "USDT", address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d", decimals: 6 },
  },
  solana: {
    USDC: { symbol: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    USDT: { symbol: "USDT", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  },
};

/** Resolve a token config by network and symbol (case-insensitive) */
export function resolveToken(network: string, token: string): TokenConfig | undefined {
  const chain = TOKEN_REGISTRY[network.toLowerCase()];
  if (!chain) return undefined;
  return chain[token.toUpperCase()] ?? chain[token];
}

/** Check if a token identifier represents the native chain token */
export function isNativeToken(token: string): boolean {
  return token === "native" || token === "";
}
