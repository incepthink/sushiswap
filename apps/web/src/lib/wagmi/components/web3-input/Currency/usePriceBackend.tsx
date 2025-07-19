// hooks/usePriceBackend.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Address } from 'viem'
import { BACKEND_URL } from 'src/ui/swap/simple/ChartSpot'

// Types matching your backend response
export interface PriceResponse {
  status: 'success' | 'error'
  data: {
    tokenOne: number
    tokenTwo: number
    ratio: number
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
  addressTwo: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // Default to WETH for comparison
): Promise<PriceResponse['data']> => {
  try {
    const { data } = await axios.get<PriceResponse>(
      `${BACKEND_URL}/api/tokenPrice`,
      {
        params: { 
          addressOne,
          addressTwo
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

  const queryKey = ['tokenPrice', address, addressTwo]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTokenPrice(address!, addressTwo),
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
  options: UsePriceBackendOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000,
    staleTime = 15000,
    retry = 2
  } = options

  const queryKey = ['tokenComparison', addressOne, addressTwo]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTokenPrice(addressOne!, addressTwo!),
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
    addressTwo: Address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  ) => {
    try {
      const data = await fetchTokenPrice(addressOne, addressTwo)
      
      // Update the cache
      queryClient.setQueryData(
        ['tokenPrice', addressOne, addressTwo],
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
    // Helper to get cached price data
    getCachedPrice: (addressOne: Address, addressTwo?: Address) => {
      const compareAddress = addressTwo || '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
      return queryClient.getQueryData(['tokenPrice', addressOne, compareAddress])
    }
  }
}

// Hook for batch price fetching
export function useBatchPriceBackend(
  tokenPairs: Array<{ addressOne: Address; addressTwo?: Address }>,
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
      tokenPairs.map(({ addressOne, addressTwo }) =>
        fetchTokenPrice(addressOne, addressTwo || defaultCompareAddress)
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

  return {
    formatPrice,
    formatRatio,
    formatPercentageChange,
  }
}