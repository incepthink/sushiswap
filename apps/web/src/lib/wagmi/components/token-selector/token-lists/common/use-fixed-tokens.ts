// hooks/use-fixed-tokens.ts
import { useMemo } from 'react'
import { Native, Token, type Type } from 'sushi/currency'
import type { EvmChainId } from 'sushi/chain'
import type { Address } from 'viem'

// Define the token config type to match your structure
interface TokenConfig {
  ticker: string
  img: string
  name: string
  address: string
  decimals: number
}

// Use specific EVM chain IDs
const ETHEREUM_CHAIN_ID = 1 as EvmChainId

// Your fixed token list
export const TOKENS: TokenConfig[] = [
  {
    ticker: "ETH",
    img: "https://cdn.moralis.io/eth/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
    name: "Ethereum",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // standard native ETH placeholder
    decimals: 18,
  },
  {
    ticker: "USDC",
    img: "https://cdn.moralis.io/eth/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
    name: "USD Coin",
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
  },
  {
    ticker: "USDT",
    img: "https://cdn.moralis.io/eth/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
    name: "Tether USD",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    decimals: 6,
  },
  {
    ticker: "WETH",
    img: "https://cdn.moralis.io/eth/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
    name: "Wrapped Ethereum",
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    decimals: 18,
  },
  {
    ticker: "WBTC",
    img: "https://cdn.moralis.io/eth/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
    name: "Wrapped Bitcoin",
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    decimals: 8,
  },
]

// Map your tokens to different chains if needed
export const FIXED_TOKENS_CONFIG: Partial<Record<EvmChainId, TokenConfig[]>> = {
  [ETHEREUM_CHAIN_ID]: TOKENS,
  // Add other chains if needed
}

interface UseFixedTokensParams {
  chainId: EvmChainId
  includeNative?: boolean
}

interface UseFixedTokensReturn {
  tokens: Type[]
  balanceMap: Map<string, any> // We'll set this to empty since we're not fetching real balances
  isLoading: boolean
  isError: boolean
}

// Helper function to check if a chainId is valid EVM chain
function isValidEvmChainId(chainId: any): chainId is EvmChainId {
  return typeof chainId === 'number' && chainId > 0
}

export function useFixedTokens({ 
  chainId, 
  includeNative = true 
}: UseFixedTokensParams): UseFixedTokensReturn {
  
  const tokens = useMemo(() => {
    // Check if chainId is valid EVM chain
    if (!isValidEvmChainId(chainId)) {
      console.warn('Invalid EVM chain ID:', chainId)
      return []
    }

    const tokenConfigs = FIXED_TOKENS_CONFIG[chainId] || []
    const tokens: Type[] = []
    
    // Add configured tokens
    tokenConfigs.forEach((config: TokenConfig) => {
      try {
        // Handle ETH specially (native token)
        if (config.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
          if (includeNative) {
            tokens.push(Native.onChain(chainId))
          }
        } else {
          // Create regular tokens
          const token = new Token({
            chainId: chainId,
            address: config.address as Address,
            decimals: config.decimals,
            symbol: config.ticker,
            name: config.name,
          })
          tokens.push(token)
        }
      } catch (error) {
        console.warn('Failed to create token:', config, error)
      }
    })
    
    return tokens
  }, [chainId, includeNative])

  // Create empty balance map since we're not fetching real balances
  const balanceMap = useMemo(() => new Map(), [])

  return {
    tokens,
    balanceMap,
    isLoading: false,
    isError: false,
  }
}

// Alternative version if you want to fetch balances for the fixed tokens
export function useFixedTokensWithBalances({ 
  chainId, 
  includeNative = true,
  account
}: UseFixedTokensParams & { account?: Address }): UseFixedTokensReturn {
  
  const { tokens } = useFixedTokens({ chainId, includeNative })
  
  // Here you could use your existing balance fetching logic
  // For now, returning empty balances
  const balanceMap = useMemo(() => new Map(), [])

  return {
    tokens,
    balanceMap,
    isLoading: false,
    isError: false,
  }
}