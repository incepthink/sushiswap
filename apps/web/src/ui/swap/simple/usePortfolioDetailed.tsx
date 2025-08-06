import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import axios from 'axios'
import { BACKEND_URL } from './ChartSpot'

export interface PortfolioToken {
  chain_id: number
  contract_address: string
  name: string
  symbol: string
  amount: number
  price_to_usd: number
  value_usd: number
  abs_profit_usd: number
  roi: number
  status: number
}

export interface PortfolioDetailedResponse {
  result: PortfolioToken[]
}

export interface UsePortfolioDetailedResult {
  data: PortfolioToken[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  totalValue: number
  totalPnL: number
  totalROI: number
}

export function usePortfolioDetailed() {
  const { address } = useAccount()
  
  const [data, setData] = useState<PortfolioToken[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPortfolioDetailed = async () => {
    if (!address) {
      setData(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.get<PortfolioDetailedResponse>(
        `${BACKEND_URL}/api/proxy/1inch/profile/detailed-overview`,
        {
          params: {
            addresses: address
          },
          timeout: 10000 // 10 second timeout
        }
      )



      if (response.data && response.data.result) {
        console.log("RES", response.data);
        
        // Filter out tokens with zero or very small amounts
        const filteredTokens = response.data.result.filter(
          token => token.amount > 0.000001 && token.value_usd > 0.01
        )
        
        // Sort by value_usd descending
        const sortedTokens = filteredTokens.sort((a, b) => b.value_usd - a.value_usd)
        
        setData(sortedTokens)
      } else {
        setData([])
      }
    } catch (err) {
      console.error('Error fetching portfolio detailed:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch portfolio data'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals
  const totalValue = data?.reduce((sum, token) => sum + token.value_usd, 0) || 0
  const totalPnL = data?.reduce((sum, token) => sum + token.abs_profit_usd, 0) || 0
  const totalROI = totalValue > 0 ? totalPnL / (totalValue - totalPnL) : 0

  useEffect(() => {
    fetchPortfolioDetailed()
  }, [address])

  return {
    data,
    isLoading,
    error,
    refetch: fetchPortfolioDetailed,
    totalValue,
    totalPnL,
    totalROI
  }
}