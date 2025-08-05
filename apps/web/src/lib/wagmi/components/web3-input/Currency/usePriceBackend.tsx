// hooks/usePriceBackend.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Address } from 'viem'
import { BACKEND_URL } from 'src/ui/swap/simple/ChartSpot'

// Supported chains type
export type SupportedChain = 'ethereum' | 'katana'

// Types matching your backend response
export interface PriceResponse {
  status: 'success' | 'error'
  data: {
    tokenOne: number
    tokenTwo: number
    ratio: number
    chain: {
      id: number
      name: string
    }
  }
  msg?: string
}

export interface UsePriceBackendOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  retry?: number
}

// Environment variable for backend URL
// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// Main fetch function
const fetchTokenPrice = async (
  addressOne: Address, 
  addressTwo: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Default to WETH for comparison
  chainId: SupportedChain = 'ethereum'
): Promise<PriceResponse['data']> => {
  try {
    const { data } = await axios.get<PriceResponse>(
      `${BACKEND_URL}/api/tokenPrice`,
      {
        params: { 
          addressOne,
          addressTwo,
          chainId
        },
        timeout: 10000, // 10 second timeout
      }
    )
    
    if (data.status === 'error') {
      throw new Error(data.msg || 'Backend returned error status')
    }
    
    return data.data
  } catch (error) {
    console.error('Failed to fetch token price:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.msg) {
        throw new Error(error.response.data.msg)
      }
      throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText || error.message}`)
    }
    
    throw new Error('Failed to fetch token price')
  }
}

// Main hook for single token price (compared to WETH by default)
export function usePriceBackend(
  address: Address | undefined,
  compareToAddress?: Address,
  chainId: SupportedChain = 'ethereum',
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000, // 30 seconds
    staleTime = 15000, // 15 seconds
    retry = 2
  } = options

  const defaultCompareAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
  const addressTwo = compareToAddress || defaultCompareAddress

  const queryKey = ['tokenPrice', address, addressTwo, chainId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTokenPrice(address!, addressTwo, chainId),
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
    
    // Individual prices
    tokenPrice: query.data?.tokenOne, // Main token price
    compareTokenPrice: query.data?.tokenTwo, // Comparison token price
    ratio: query.data?.ratio, // tokenOne / tokenTwo ratio
    
    // Chain info
    chain: query.data?.chain,
    chainId: query.data?.chain?.id,
    chainName: query.data?.chain?.name,
    
    // Convenience getters
    tokenOnePrice: query.data?.tokenOne,
    tokenTwoPrice: query.data?.tokenTwo,
    
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

// Hook for comparing two specific tokens
export function usePriceComparison(
  addressOne: Address | undefined,
  addressTwo: Address | undefined,
  chainId: SupportedChain = 'ethereum',
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000,
    staleTime = 15000,
    retry = 2
  } = options

  const queryKey = ['tokenComparison', addressOne, addressTwo, chainId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTokenPrice(addressOne!, addressTwo!, chainId),
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
    chain: query.data?.chain,
    chainId: query.data?.chain?.id,
    chainName: query.data?.chain?.name,
    
    // Comparison helpers
    tokenOneIsHigher: query.data ? query.data.tokenOne > query.data.tokenTwo : undefined,
    priceDifference: query.data ? Math.abs(query.data.tokenOne - query.data.tokenTwo) : undefined,
    
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
    addressOne: Address, 
    addressTwo: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    chainId: SupportedChain = 'ethereum'
  ) => {
    try {
      const data = await fetchTokenPrice(addressOne, addressTwo, chainId)
      
      // Update the cache
      queryClient.setQueryData(
        ['tokenPrice', addressOne, addressTwo, chainId],
        data
      )
      
      return data
    } catch (error) {
      throw error
    }
  }

  return {
    fetchPrice,
    // Helper to invalidate all price queries
    invalidateAllPrices: () => {
      queryClient.invalidateQueries({
        queryKey: ['tokenPrice']
      })
    },
    // Helper to invalidate prices for specific chain
    invalidateChainPrices: (chainId: SupportedChain) => {
      queryClient.invalidateQueries({
        queryKey: ['tokenPrice'],
        predicate: (query) => query.queryKey[3] === chainId
      })
    },
    // Helper to get cached price data
    getCachedPrice: (addressOne: Address, addressTwo?: Address, chainId: SupportedChain = 'ethereum') => {
      const compareAddress = addressTwo || '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
      return queryClient.getQueryData(['tokenPrice', addressOne, compareAddress, chainId])
    }
  }
}

// Hook for batch price fetching
export function useBatchPriceBackend(
  tokenPairs: Array<{ 
    addressOne: Address
    addressTwo?: Address
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

  const defaultCompareAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH

  const queryKey = ['batchTokenPrices', tokenPairs]

  const fetchBatchPrices = async () => {
    const results = await Promise.allSettled(
      tokenPairs.map(({ addressOne, addressTwo, chainId }) =>
        fetchTokenPrice(
          addressOne, 
          addressTwo || defaultCompareAddress,
          chainId || 'ethereum'
        )
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
      const chainId = result.pair.chainId || 'ethereum'
      if (!acc[chainId]) acc[chainId] = []
      acc[chainId].push(result)
      return acc
    }, {} as Record<SupportedChain, typeof query.data>) || {},
  }
}

// Hook for multi-chain token comparison
export function useMultiChainPriceComparison(
  address: Address | undefined,
  compareToAddress?: Address,
  chains: SupportedChain[] = ['ethereum', 'katana'],
  options: UsePriceBackendOptions = {}
) {
  const tokenPairs = chains.map(chainId => ({
    addressOne: address!,
    addressTwo: compareToAddress,
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
      if (result.success && result.data && result.pair.chainId) {
        acc[result.pair.chainId] = {
          tokenPrice: result.data.tokenOne,
          chain: result.data.chain,
          ratio: result.data.ratio
        }
      }
      return acc
    }, {} as Record<SupportedChain, { tokenPrice: number; chain: { id: number; name: string }; ratio: number }>),
    
    // Helper to find best price across chains
    bestPrice: batchQuery.data?.reduce((best, result) => {
      if (result.success && result.data) {
        if (!best || result.data.tokenOne > best.price) {
          return {
            price: result.data.tokenOne,
            chain: result.data.chain,
            chainId: result.pair.chainId || 'ethereum'
          }
        }
      }
      return best
    }, null as { price: number; chain: { id: number; name: string }; chainId: SupportedChain } | null),
  }
}

// Utility hook for price formatting
export function usePriceFormatter() {
  const formatPrice = (price: number | undefined, decimals = 2) => {
    if (price === undefined || price === null) return 'N/A'
    
    if (price < 0.01) {
      return `$${price.toExponential(2)}`
    }
    
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }

  const formatRatio = (ratio: number | undefined, decimals = 4) => {
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
  const formatChainPrice = (price: number | undefined, chainName: string, decimals = 2) => {
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
    addressOne: Address, 
    addressTwo: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    chainId: SupportedChain = 'ethereum'
  ) => {
    return queryClient.prefetchQuery({
      queryKey: ['tokenPrice', addressOne, addressTwo, chainId],
      queryFn: () => fetchTokenPrice(addressOne, addressTwo, chainId),
      staleTime: 15000,
    })
  }

  const warmupPricesForChain = async (
    tokenAddresses: Address[],
    chainId: SupportedChain,
    compareToAddress: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  ) => {
    const prefetchPromises = tokenAddresses.map(address =>
      prefetchPrice(address, compareToAddress, chainId)
    )
    
    await Promise.allSettled(prefetchPromises)
  }

  return {
    prefetchPrice,
    warmupPricesForChain,
    clearChainCache: (chainId: SupportedChain) => {
      queryClient.removeQueries({
        queryKey: ['tokenPrice'],
        predicate: (query) => query.queryKey[3] === chainId
      })
    }
  }
}