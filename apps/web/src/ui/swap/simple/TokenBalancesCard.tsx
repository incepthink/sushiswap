// src/components/TokenBalancesCard.tsx
'use client'

import { useAccount } from 'wagmi'
import { getPortfolioWallet, type PortfolioWalletToken } from '@sushiswap/graph-client/data-api'
import { FormattedNumber, classNames } from '@sushiswap/ui'
import { formatPercent, formatUSD } from 'sushi/format'
import type { EvmChainId } from 'sushi/chain'
import { Address } from 'viem'
import { useQuery } from '@tanstack/react-query'

function usePortfolioWallet(
  address: Address | undefined,
  refetchInterval = 600_000,
) {
  return useQuery({
    queryKey: ['portfolio-wallet', address],
    queryFn: async () => {
      const id = address as string
      const data = await getPortfolioWallet({ id })
      return data
    },
    enabled: !!address,
    refetchInterval,
  })
}

interface PortfolioData {
  amountUSD24Change: number
  percentageChange24h: number
  tokens: PortfolioWalletToken[]
  totalUSD: number
}

export function TokenBalancesCard() {
  const { address } = useAccount()
  const { data, isLoading, error } = usePortfolioWallet(address)

  // Filter tokens to show only Ethereum tokens (chainId === 1)
  const ethereumTokens = data?.tokens.filter(token => token.chainId === 1) || []

  if (!address) {
    return (
      <div className="w-full relative z-50">
        <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
          <div className="text-center py-8 relative z-50">
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to view your token balances
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full relative z-50">
        <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
          <div className="text-lg sm:text-xl font-semibold mb-4">
            Token Balances
          </div>
          <div className="text-center py-8 relative z-50">
            <div className="text-red-400 text-sm">
              Failed to load token balances
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative z-50">
      <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0 relative z-50">
          <div className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            Token Balances
          </div>
          
          {/* Portfolio Summary */}
          {data && (
            <div className="text-right relative z-50">
              <div className="text-xl font-bold">
                ${data.totalUSD.toFixed(2)}
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                data.percentageChange24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                <span>
                  {data.percentageChange24h >= 0 ? '+' : ''}
                  ${data.amountUSD24Change.toFixed(2)} ({(data.percentageChange24h * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="w-full relative z-50">
          {isLoading ? (
            <div className="w-full flex justify-center py-8 relative z-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F5E0]"></div>
            </div>
          ) : data && ethereumTokens.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block relative z-50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-base font-semibold">
                      <th className="text-left font-medium pb-3 text-[#00F5E0]">
                        Token
                      </th>
                      <th className="text-right font-medium pb-3 text-[#00F5E0]">
                        Balance
                      </th>
                      <th className="text-right font-medium pb-3 text-[#00F5E0]">
                        Price
                      </th>
                      <th className="text-right font-medium pb-3 text-[#00F5E0]">
                        Value
                      </th>
                      <th className="text-right font-medium pb-3 text-[#00F5E0]">
                        24h Change
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ethereumTokens.map((token) => (
                      <tr
                        key={`${token.chainId}-${token.id}`}
                        className="hover:bg-[rgba(0,245,224,0.1)] transition-colors duration-200 border-b border-[rgba(255,255,255,0.1)] last:border-b-0"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3 relative z-50">
                            <img
                              src={token.logoUrl}
                              alt={token.symbol}
                              className="w-6 h-6 rounded-full"
                            />
                            <div className="relative z-50">
                              <div className="font-medium">{token.symbol}</div>
                              <div className="text-xs text-gray-400">{token.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <FormattedNumber number={token.amount.toString()} /> {token.symbol}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          {formatUSD(token.price)}
                        </td>
                        <td className="py-4 pr-4 text-right font-medium">
                          {formatUSD(token.amountUSD)}
                        </td>
                        <td className="py-4 text-right">
                          <span className={classNames(
                            'text-sm',
                            token.price24hChange > 0
                              ? 'text-green-400'
                              : token.price24hChange < 0
                                ? 'text-red-400'
                                : 'text-gray-400',
                          )}>
                            {`${token.price24hChange > 0 ? '+' : ''}${formatPercent(token.price24hChange)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3 relative z-50">
                {ethereumTokens.map((token) => (
                  <div
                    key={`${token.chainId}-${token.id}`}
                    className="bg-[rgba(0,245,224,0.1)] rounded-lg p-4 relative z-50"
                  >
                    <div className="flex items-center gap-3 mb-4 relative z-50">
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 relative z-50">
                        <div className="font-semibold text-base">{token.symbol}</div>
                        <div className="text-xs text-gray-400">{token.name}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm relative z-50">
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">
                          Balance
                        </div>
                        <div className="font-medium text-white">
                          <FormattedNumber number={token.amount.toString()} /> {token.symbol}
                        </div>
                      </div>
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">Price</div>
                        <div className="font-medium text-white">
                          {formatUSD(token.price)}
                        </div>
                      </div>
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">Value</div>
                        <div className="font-medium text-white">
                          {formatUSD(token.amountUSD)}
                        </div>
                      </div>
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">24h Change</div>
                        <div className={classNames(
                          'font-medium',
                          token.price24hChange > 0
                            ? 'text-green-400'
                            : token.price24hChange < 0
                              ? 'text-red-400'
                              : 'text-gray-400',
                        )}>
                          {`${token.price24hChange > 0 ? '+' : ''}${formatPercent(token.price24hChange)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 relative z-50">
              <div className="text-gray-400 text-sm">
                No Ethereum tokens found in your wallet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}