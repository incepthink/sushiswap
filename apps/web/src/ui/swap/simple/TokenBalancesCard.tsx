// src/components/TokenBalancesCard.tsx
'use client'

import { useAccount } from 'wagmi'
import { FormattedNumber, classNames } from '@sushiswap/ui'
import { formatPercent, formatUSD } from 'sushi/format'
import { useSpotBalance, type TokenBalance } from './useSpotBalance'

export function TokenBalancesCard() {
  const { address } = useAccount()
  const { data, isLoading, error } = useSpotBalance()

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
              Failed to load token balances: {error.message}
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
                ${data.totalUsd.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                Total Portfolio Value
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
          ) : data && (data.tokens.length > 0 || data.ethBalance.balance > 0) ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {/* ETH Balance Row */}
                    {data.ethBalance.balance > 0 && (
                      <tr className="hover:bg-[rgba(0,245,224,0.1)] transition-colors duration-200 border-b border-[rgba(255,255,255,0.1)]">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3 relative z-50">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">Ξ</span>
                            </div>
                            <div className="relative z-50">
                              <div className="font-medium">ETH</div>
                              <div className="text-xs text-gray-400">Ethereum</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <FormattedNumber number={data.ethBalance.balance.toString()} /> ETH
                        </td>
                        <td className="py-4 pr-4 text-right">
                          {formatUSD(data.ethBalance.price)}
                        </td>
                        <td className="py-4 pr-4 text-right font-medium">
                          {formatUSD(data.ethBalance.usdValue)}
                        </td>
                      </tr>
                    )}

                    {/* Token Rows */}
                    {data.tokens.map((token: TokenBalance) => (
                      <tr
                        key={token.contractAddress}
                        className="hover:bg-[rgba(0,245,224,0.1)] transition-colors duration-200 border-b border-[rgba(255,255,255,0.1)] last:border-b-0"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3 relative z-50">
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-6 h-6 rounded-full"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-6 h-6 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center"
                              style={{ display: token.logo ? 'none' : 'flex' }}
                            >
                              <span className="text-xs font-bold text-white">
                                {token.symbol.charAt(0)}
                              </span>
                            </div>
                            <div className="relative z-50">
                              <div className="font-medium">{token.symbol}</div>
                              <div className="text-xs text-gray-400">{token.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <FormattedNumber number={token.balance.toString()} /> {token.symbol}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          {formatUSD(token.price)}
                        </td>
                        <td className="py-4 pr-4 text-right font-medium">
                          {formatUSD(token.usdValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3 relative z-50">
                {/* ETH Balance Card */}
                {data.ethBalance.balance > 0 && (
                  <div className="bg-[rgba(0,245,224,0.1)] rounded-lg p-4 relative z-50">
                    <div className="flex items-center gap-3 mb-4 relative z-50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">Ξ</span>
                      </div>
                      <div className="flex-1 relative z-50">
                        <div className="font-semibold text-base">ETH</div>
                        <div className="text-xs text-gray-400">Ethereum</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm relative z-50">
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">
                          Balance
                        </div>
                        <div className="font-medium text-white">
                          <FormattedNumber number={data.ethBalance.balance.toString()} /> ETH
                        </div>
                      </div>
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">Price</div>
                        <div className="font-medium text-white">
                          {formatUSD(data.ethBalance.price)}
                        </div>
                      </div>
                      <div className="relative z-50">
                        <div className="text-[#00F5E0] text-xs mb-1">Value</div>
                        <div className="font-medium text-white">
                          {formatUSD(data.ethBalance.usdValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Token Cards */}
                {data.tokens.map((token: TokenBalance) => (
                  <div
                    key={token.contractAddress}
                    className="bg-[rgba(0,245,224,0.1)] rounded-lg p-4 relative z-50"
                  >
                    <div className="flex items-center gap-3 mb-4 relative z-50">
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center"
                        style={{ display: token.logo ? 'none' : 'flex' }}
                      >
                        <span className="text-sm font-bold text-white">
                          {token.symbol.charAt(0)}
                        </span>
                      </div>
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
                          <FormattedNumber number={token.balance.toString()} /> {token.symbol}
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
                          {formatUSD(token.usdValue)}
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
                No tokens found in your wallet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}