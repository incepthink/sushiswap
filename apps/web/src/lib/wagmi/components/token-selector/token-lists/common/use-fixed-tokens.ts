// hooks/use-fixed-tokens.ts
import { useMemo, useEffect, useState } from 'react'
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

// Katana token list types
interface KatanaToken {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface KatanaTokenList {
  name: string
  version: {
    major: number
    minor: number
    patch: number
  }
  tokens: KatanaToken[]
}

// Use specific EVM chain IDs
const ETHEREUM_CHAIN_ID = 1 as EvmChainId
const KATANA_CHAIN_ID = 747474 as EvmChainId

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

// Fetch Katana token list
async function fetchKatanaTokenList(): Promise<KatanaToken[]> {
  try {
    const response = await fetch('https://raw.githubusercontent.com/katana-network/tokenlist/main/tokenlist.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const tokenList: KatanaTokenList = await response.json()
    return tokenList.tokens.filter(token => token.chainId === KATANA_CHAIN_ID)
  } catch (error) {
    console.error('Failed to fetch Katana token list:', error)
    return []
  }
}

// Convert Katana token to TokenConfig format
function convertKatanaTokenToConfig(katanaToken: KatanaToken): TokenConfig {
  return {
    ticker: katanaToken.symbol,
    img: katanaToken.logoURI || `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${katanaToken.address}/logo.png`,
    name: katanaToken.name,
    address: katanaToken.address,
    decimals: katanaToken.decimals,
  }
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
  
  const [katanaTokens, setKatanaTokens] = useState<KatanaToken[]>([])
  const [isLoadingKatana, setIsLoadingKatana] = useState(false)
  const [katanaError, setKatanaError] = useState(false)

  // Fetch Katana tokens when chainId is Katana
  useEffect(() => {
    if (chainId === KATANA_CHAIN_ID) {
      setIsLoadingKatana(true)
      setKatanaError(false)
      
      fetchKatanaTokenList()
        .then((tokens) => {
          setKatanaTokens(tokens)
          setKatanaError(false)
        })
        .catch((error) => {
          console.error('Error fetching Katana tokens:', error)
          setKatanaError(true)
          setKatanaTokens([])
        })
        .finally(() => {
          setIsLoadingKatana(false)
        })
    } else {
      // Reset Katana state for other chains
      setKatanaTokens([])
      setIsLoadingKatana(false)
      setKatanaError(false)
    }
  }, [chainId])
  
  const tokens = useMemo(() => {
    // Check if chainId is valid EVM chain
    if (!isValidEvmChainId(chainId)) {
      console.warn('Invalid EVM chain ID:', chainId)
      return []
    }

    const tokens: Type[] = []
    
    // Handle Katana chain specially
    if (chainId === KATANA_CHAIN_ID) {
      // Add native ETH first if requested
      if (includeNative) {
        tokens.push(Native.onChain(chainId))
      }
      
      // Add Katana tokens from the fetched list
      katanaTokens.forEach((katanaToken: KatanaToken) => {
        try {
          // Skip if this is the native token placeholder
          if (katanaToken.address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
            return
          }
          
          const token = new Token({
            chainId: chainId,
            address: katanaToken.address as Address,
            decimals: katanaToken.decimals,
            symbol: katanaToken.symbol,
            name: katanaToken.name,
          })
          tokens.push(token)
        } catch (error) {
          console.warn('Failed to create Katana token:', katanaToken, error)
        }
      })
      
      return tokens
    }
    
    // For other chains, use the fixed token config
    const tokenConfigs = FIXED_TOKENS_CONFIG[chainId] || []
    
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
  }, [chainId, includeNative, katanaTokens])

  // Create empty balance map since we're not fetching real balances
  const balanceMap = useMemo(() => new Map(), [])

  // Determine loading and error states
  const isLoading = chainId === KATANA_CHAIN_ID ? isLoadingKatana : false
  const isError = chainId === KATANA_CHAIN_ID ? katanaError : false

  return {
    tokens,
    balanceMap,
    isLoading,
    isError,
  }
}

// Alternative version if you want to fetch balances for the fixed tokens
export function useFixedTokensWithBalances({ 
  chainId, 
  includeNative = true,
  account
}: UseFixedTokensParams & { account?: Address }): UseFixedTokensReturn {
  
  const { tokens, isLoading, isError } = useFixedTokens({ chainId, includeNative })
  
  // Here you could use your existing balance fetching logic
  // For now, returning empty balances
  const balanceMap = useMemo(() => new Map(), [])

  return {
    tokens,
    balanceMap,
    isLoading,
    isError,
  }
}

// Utility function to get Katana tokens (can be used elsewhere)
export async function getKatanaTokens(): Promise<TokenConfig[]> {
  const katanaTokens = await fetchKatanaTokenList()
  return katanaTokens.map(convertKatanaTokenToConfig)
}