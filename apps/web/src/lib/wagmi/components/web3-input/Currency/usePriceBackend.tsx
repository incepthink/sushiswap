// hooks/usePriceBackend.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Address } from 'viem'

// Supported chains type - using chainId numbers for Sushi API
export type SupportedChain = 1 | 747474 // Ethereum mainnet | Katana

// Sushi API response type
export interface SushiPriceResponse {
  [tokenAddress: string]: number
}

export interface UsePriceBackendOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  retry?: number
}

// Sushi API URL
const SUSHI_API_BASE = 'https://api.sushi.com/price/v1'

// Main fetch function for single token
const fetchTokenPriceSushi = async (
  tokenAddress: Address, 
  chainId: number
): Promise<number | null> => {
  try {
    const { data } = await axios.get(
      `${SUSHI_API_BASE}/${chainId}/${tokenAddress}`,
      {
        timeout: 10000, // 10 second timeout
      }
    )

    console.log("PRICE SUSHI", data);
    
    
    // Sushi API returns an object with token address as key and price as value
    // const price = data[tokenAddress.toLowerCase()]
    return data || null
  } catch (error) {
    console.error('Failed to fetch token price from Sushi API:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Token not found on this network')
      }
      throw new Error(`Sushi API Error: ${error.response?.status} - ${error.response?.statusText || error.message}`)
    }
    
    throw new Error('Failed to fetch token price')
  }
}

// Main hook for single token price
export function usePriceBackend(
  address: Address | undefined,
  compareToAddress?: Address, // This parameter is kept for backward compatibility but not used
  chainId = 1,
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000, // 30 seconds
    staleTime = 15000, // 15 seconds
    retry = 2
  } = options

  const queryKey = ['sushiTokenPrice', address, chainId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTokenPriceSushi(address!, chainId),
    enabled: Boolean(enabled && address),
    staleTime,
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return false
      }
      return failureCount < retry
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  return {
    // Raw data
    data: query.data,
    
    // Individual prices (maintaining backward compatibility)
    tokenPrice: query.data, // Main token price
    compareTokenPrice: undefined, // Not applicable with Sushi API
    ratio: undefined, // Not applicable with single token price
    
    // Chain info (simplified since we just have chainId)
    chain: { id: chainId, name: chainId === 1 ? 'Ethereum' : 'Katana' },
    chainId: chainId,
    chainName: chainId === 1 ? 'Ethereum' : 'Katana',
    
    // Convenience getters (backward compatibility)
    tokenOnePrice: query.data,
    tokenTwoPrice: undefined,
    
    // States
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    
    // Error
    error: query.error,
    
    // Actions
    refetch: query.refetch,
    
    // Query status
    status: query.status,
    fetchStatus: query.fetchStatus,
  }
}

// Hook for comparing two specific tokens (now fetches both separately)
export function usePriceComparison(
  addressOne: Address | undefined,
  addressTwo: Address | undefined,
  chainId: SupportedChain = 1,
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000,
    staleTime = 15000,
    retry = 2
  } = options

  const queryKey = ['sushiTokenComparison', addressOne, addressTwo, chainId]

  // Fetch both tokens separately
  const fetchBothPrices = async () => {
    if (!addressOne || !addressTwo) {
      throw new Error('Both token addresses are required')
    }

    const [priceOne, priceTwo] = await Promise.all([
      fetchTokenPriceSushi(addressOne, chainId),
      fetchTokenPriceSushi(addressTwo, chainId),
    ])

    return {
      tokenOne: priceOne,
      tokenTwo: priceTwo,
      ratio: priceOne && priceTwo ? priceOne / priceTwo : null,
    }
  }

  const query = useQuery({
    queryKey,
    queryFn: fetchBothPrices,
    enabled: Boolean(enabled && addressOne && addressTwo),
    staleTime,
    gcTime: 5 * 60 * 1000,
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return false
      }
      return failureCount < retry
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    // Raw data
    data: query.data,
    
    // Individual prices
    tokenOnePrice: query.data?.tokenOne,
    tokenTwoPrice: query.data?.tokenTwo,
    ratio: query.data?.ratio,
    inverseRatio: query.data?.ratio ? 1 / query.data.ratio : undefined,
    
    // Chain info
    chain: { id: chainId, name: chainId === 1 ? 'Ethereum' : 'Katana' },
    chainId: chainId,
    chainName: chainId === 1 ? 'Ethereum' : 'Katana',
    
    // Comparison helpers
    tokenOneIsHigher: query.data && query.data.tokenOne && query.data.tokenTwo 
      ? query.data.tokenOne > query.data.tokenTwo : undefined,
    priceDifference: query.data && query.data.tokenOne && query.data.tokenTwo 
      ? Math.abs(query.data.tokenOne - query.data.tokenTwo) : undefined,
    
    // States
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    
    // Error
    error: query.error,
    
    // Actions
    refetch: query.refetch,
  }
}

// Hook for manual price fetching (without automatic polling)
export function usePriceBackendManual() {
  const queryClient = useQueryClient()

  const fetchPrice = async (
    address: Address, 
    chainId: SupportedChain = 1
  ) => {
    try {
      const price = await fetchTokenPriceSushi(address, chainId)
      
      // Update the cache
      queryClient.setQueryData(
        ['sushiTokenPrice', address, chainId],
        price
      )
      
      return price
    } catch (error) {
      throw error
    }
  }

  return {
    fetchPrice,
    // Helper to invalidate all price queries
    invalidateAllPrices: () => {
      queryClient.invalidateQueries({
        queryKey: ['sushiTokenPrice']
      })
    },
    // Helper to invalidate prices for specific chain
    invalidateChainPrices: (chainId: SupportedChain) => {
      queryClient.invalidateQueries({
        queryKey: ['sushiTokenPrice'],
        predicate: (query) => query.queryKey[2] === chainId
      })
    },
    // Helper to get cached price data
    getCachedPrice: (address: Address, chainId: SupportedChain = 1) => {
      return queryClient.getQueryData(['sushiTokenPrice', address, chainId])
    }
  }
}

// Hook for batch price fetching
export function useBatchPriceBackend(
  tokenPairs: Array<{ 
    addressOne: Address
    addressTwo?: Address // Not used with Sushi API, kept for compatibility
    chainId?: SupportedChain 
  }>,
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000,
    staleTime = 15000,
    retry = 2
  } = options

  const queryKey = ['sushiBatchTokenPrices', tokenPairs]

  const fetchBatchPrices = async () => {
    const results = await Promise.allSettled(
      tokenPairs.map(({ addressOne, chainId }) =>
        fetchTokenPriceSushi(addressOne, chainId || 1)
      )
    )

    return results.map((result, index) => ({
      pair: tokenPairs[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }))
  }

  const query = useQuery({
    queryKey,
    queryFn: fetchBatchPrices,
    enabled: Boolean(enabled && tokenPairs.length > 0),
    staleTime,
    gcTime: 5 * 60 * 1000,
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: false,
    retry,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    
    // Helper to get successful results only
    successfulResults: query.data?.filter(result => result.success) || [],
    
    // Helper to get failed results
    failedResults: query.data?.filter(result => !result.success) || [],
    
    // Helper to group results by chain
    resultsByChain: query.data?.reduce((acc, result) => {
      const chainId = result.pair.chainId || 1
      if (!acc[chainId]) acc[chainId] = []
      acc[chainId].push(result)
      return acc
    }, {} as Record<SupportedChain, typeof query.data>) || {},
  }
}

// Hook for multi-chain token comparison
export function useMultiChainPriceComparison(
  address: Address | undefined,
  compareToAddress?: Address, // Not used with Sushi API
  chains: SupportedChain[] = [1, 747474],
  options: UsePriceBackendOptions = {}
) {
  const tokenPairs = chains.map(chainId => ({
    addressOne: address!,
    chainId
  }))

  const batchQuery = useBatchPriceBackend(
    address ? tokenPairs : [],
    options
  )

  return {
    ...batchQuery,
    
    // Helper to get price on specific chain
    getPriceOnChain: (chainId: SupportedChain) => {
      return batchQuery.data?.find(result => result.pair.chainId === chainId)?.data
    },
    
    // Helper to compare prices across chains
    priceComparison: batchQuery.data?.reduce((acc, result) => {
      if (result.success && result.data !== null && result.pair.chainId) {
        acc[result.pair.chainId] = {
          tokenPrice: result.data,
          chain: { id: result.pair.chainId, name: result.pair.chainId === 1 ? 'Ethereum' : 'Katana' },
          ratio: 1 // Not applicable for single token prices
        }
      }
      return acc
    }, {} as Record<SupportedChain, { tokenPrice: number; chain: { id: number; name: string }; ratio: number }>),
    
    // Helper to find best price across chains
    bestPrice: batchQuery.data?.reduce((best, result) => {
      if (result.success && result.data !== null) {
        if (!best || result.data > best.price) {
          return {
            price: result.data,
            chain: { id: result.pair.chainId || 1, name: (result.pair.chainId || 1) === 1 ? 'Ethereum' : 'Katana' },
            chainId: result.pair.chainId || 1
          }
        }
      }
      return best
    }, null as { price: number; chain: { id: number; name: string }; chainId: SupportedChain } | null),
  }
}

// Utility hook for price formatting
export function usePriceFormatter() {
  const formatPrice = (price: number | undefined | null, decimals = 2) => {
    if (price === undefined || price === null) return 'N/A'
    
    if (price < 0.01) {
      return `$${price.toExponential(2)}`
    }
    
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }

  const formatRatio = (ratio: number | undefined | null, decimals = 4) => {
    if (ratio === undefined || ratio === null) return 'N/A'
    
    return ratio.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatPercentageChange = (oldPrice: number, newPrice: number) => {
    if (!oldPrice || !newPrice) return 'N/A'
    
    const change = ((newPrice - oldPrice) / oldPrice) * 100
    const sign = change >= 0 ? '+' : ''
    
    return `${sign}${change.toFixed(2)}%`
  }

  // Format chain-specific prices
  const formatChainPrice = (price: number | undefined | null, chainName: string, decimals = 2) => {
    const formattedPrice = formatPrice(price, decimals)
    return `${formattedPrice} (${chainName})`
  }

  return {
    formatPrice,
    formatRatio,
    formatPercentageChange,
    formatChainPrice,
  }
}

// Hook for chain-aware price caching
export function useChainPriceCache() {
  const queryClient = useQueryClient()

  const prefetchPrice = (
    address: Address, 
    chainId: SupportedChain = 1
  ) => {
    return queryClient.prefetchQuery({
      queryKey: ['sushiTokenPrice', address, chainId],
      queryFn: () => fetchTokenPriceSushi(address, chainId),
      staleTime: 15000,
    })
  }

  const warmupPricesForChain = async (
    tokenAddresses: Address[],
    chainId: SupportedChain
  ) => {
    const prefetchPromises = tokenAddresses.map(address =>
      prefetchPrice(address, chainId)
    )
    
    await Promise.allSettled(prefetchPromises)
  }

  return {
    prefetchPrice,
    warmupPricesForChain,
    clearChainCache: (chainId: SupportedChain) => {
      queryClient.removeQueries({
        queryKey: ['sushiTokenPrice'],
        predicate: (query) => query.queryKey[2] === chainId
      })
    }
  }
}