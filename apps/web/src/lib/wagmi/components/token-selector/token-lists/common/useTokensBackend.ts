import { useEffect, useState } from 'react'
import axios from 'axios'
import type { EvmChainId } from 'sushi/chain'
import { type Type, Token, Native } from 'sushi/currency'
import { BACKEND_URL } from 'src/ui/swap/simple/ChartSpot'

const KATANA_CHAIN_ID = 747474

interface TokenResponse {
  [address: string]: {
    chainId: number
    symbol: string
    name: string
    address: string
    decimals: number
    logoURI: string
    providers: string[]
    eip2612: boolean
    isFoT: boolean
    tags: string[]
  }
}

interface KatanaTokenListResponse {
  tokens: Array<{
    name: string
    symbol: string
    decimals: number
    chainId: number
    address: string
    originTokenAddress: string
    logoURI?: string
  }>
}

export function useTokensBackend(chainId: EvmChainId) {
  const [tokens, setTokens] = useState<Type[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokens = async () => {
      if (!chainId) return

      setIsLoading(true)
      setError(null)

      try {
        let tokensData: Type[] = []

        if (chainId === KATANA_CHAIN_ID) {
          // Fetch from Katana tokenlist
          const response = await axios.get<KatanaTokenListResponse>(
            'https://raw.githubusercontent.com/katana-network/tokenlist/main/tokenlist.json'
          )
          

          tokensData = response.data.tokens
            .filter(token => token.chainId === chainId)
            .map(token => {
              // const address = token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
              //   ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
              //   : token.address
              
                if (token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                  return Native.onChain(token.chainId as EvmChainId)
                }
              return new Token({
                chainId: token.chainId as EvmChainId,
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoUrl: token.logoURI
              })
            })
        } else {
          // Fetch from 1inch API via backend
          const response = await axios.get<TokenResponse>(
            `${BACKEND_URL}/api/proxy/1inch/tokens`,
            {
              params: { chainId }
            }
          )

          tokensData = Object.values(response.data).map(token => {
            // const address = token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
            //   ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
            //   : token.address

              if (token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                  return Native.onChain(token.chainId as EvmChainId)
                }
            
            return new Token({
              chainId: token.chainId as EvmChainId,
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logoUrl: token.logoURI
            })
          })
        }

        setTokens(tokensData)
      } catch (err) {
        console.error('Error fetching tokens:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens')
        setTokens([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [chainId])

  return {
    tokens,
    isLoading,
    error,
    isError: !!error
  }
}