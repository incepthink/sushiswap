'use client'

import { useAccount } from 'wagmi'
import { FormattedNumber } from '@sushiswap/ui'
import { formatPercent, formatUSD } from 'sushi/format'
import { usePortfolioDetailed, type PortfolioToken } from 'src/ui/swap/simple/usePortfolioDetailed'
import { useKatanaPortfolio, type KatanaPortfolioToken } from './useKatanaPortfolio'
import { useEntryPrices } from './useEntryPrices'
import { EditablePrice } from './EditablePrice'
import { PortfolioSummary } from './PortfolioSummary'
import { useBatchPriceBackend } from 'src/lib/wagmi/components/web3-input/Currency/usePriceBackend'
import {
  calculatePortfolioTotals,
  calculateTokenPnL,
  getTokenLogo,
  CHAIN_NAMES,
  generateTokenKey,
} from './portfolioUtils'
import { useParams } from 'next/navigation'
import { useMemo, useEffect } from 'react'
import { IconButton, Tooltip, CircularProgress } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'

// Combined token type for both Katana and other chains
type CombinedToken = (PortfolioToken | KatanaPortfolioToken) & {
  amount: number
  price_to_usd: number
  value_usd: number
  symbol: string
  name: string
  chain_id: number
  contract_address?: string
  address?: string
}

export function TokenBalancesCard() {
  const params = useParams()
  const connectedChainId = Number(params.chainId)
  const { address } = useAccount()
  
  const isKatana = connectedChainId === 747474

  // Multi-chain portfolio data
  const {
    data: multiChainData,
    isLoading: multiChainLoading,
    error: multiChainError,
    refetch: refetchMultiChain
  } = usePortfolioDetailed()

  // Katana portfolio data
  const {
    tokens: katanaTokens,
    totalValue: katanaTotalValue, // not used directly after live repricing
    isLoading: katanaLoading,
    error: katanaError,
    refresh: refetchKatana
  } = useKatanaPortfolio(address || null)

  // Filter multi-chain data by connected chain ID
  const filteredMultiChainData =
    multiChainData?.filter((token) => token.chain_id === connectedChainId) || []

  // Determine which data to use
  const data = isKatana ? katanaTokens : filteredMultiChainData
  const isLoading = isKatana ? katanaLoading : multiChainLoading
  const error = isKatana ? katanaError : multiChainError

  // Addresses and helpers
  const WETH_ADDRESS = '0xC02aaA39b223FE8d0A0e5C4F27eAD9083C756Cc2'
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const ETH_PLACEHOLDER = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

  const isNativeEth = (token: PortfolioToken | KatanaPortfolioToken) => {
    const chainId = (token as any).chain_id
    const addr =
      ((token as any).contract_address as string | undefined) ??
      ((token as any).address as string | undefined) ??
      ''
    const sym = (token as any).symbol?.toUpperCase?.()

    return (
      chainId === 1 &&
      (
        !addr ||
        addr === ZERO_ADDRESS ||
        addr.toLowerCase() === ETH_PLACEHOLDER ||
        sym === 'ETH'
      )
    )
  }

  // Prepare token pairs - map native ETH -> WETH, de-dup addresses
  const tokenPairs = useMemo(() => {
    if (!data) return []
    const uniqueAddresses = new Set<string>()
    const pairs: Array<{ addressOne: `0x${string}`; chainId: 1 | 747474 }> = []

    data.forEach((token) => {
      let address: string | undefined = isKatana
        ? (token as KatanaPortfolioToken).address
        : (token as PortfolioToken).contract_address

      // Map native ETH (and 0xeeee / zero addr / missing addr on mainnet) to WETH
      if (!isKatana && isNativeEth(token)) {
        address = WETH_ADDRESS
      } else if (address?.toLowerCase() === ETH_PLACEHOLDER) {
        address = WETH_ADDRESS
      }

      if (address && address.startsWith('0x')) {
        const key = address.toLowerCase()
        if (!uniqueAddresses.has(key)) {
          uniqueAddresses.add(key)
          // narrow to union you support
          const cid = (connectedChainId === 1 ? 1 : 747474) as 1 | 747474
          pairs.push({ addressOne: address as `0x${string}`, chainId: cid })
        }
      }
    })

    return pairs
  }, [data, isKatana, connectedChainId])

  // Fetch real-time prices
  const {
    data: priceData,
    isLoading: pricesLoading,
    error: pricesError,
    refetch: refetchPrices
  } = useBatchPriceBackend(tokenPairs, {
    enabled: Boolean(data && data.length > 0),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const handleRefresh = () => {
    if (isKatana) {
      refetchKatana()
    } else {
      refetchMultiChain()
    }
    refetchPrices()
  }

  // Create price lookup map
  const priceMap = useMemo(() => {
    if (!priceData) return {}
    const map: Record<string, number> = {}
    tokenPairs.forEach((pair, index) => {
      const result = priceData[index]
      if (result?.success && result.data !== null) {
        map[pair.addressOne.toLowerCase()] = result.data
      }
    })
    return map
  }, [priceData, tokenPairs])

  // Get price for any token (handles native ETH -> WETH mapping)
  const getTokenPrice = (
    tokenAddress: string | undefined,
    token?: CombinedToken
  ): number | null => {
    // If ETH on mainnet, always use WETH price
    if (!isKatana && token && isNativeEth(token as any)) {
      return priceMap[WETH_ADDRESS.toLowerCase()] ?? null
    }
    if (!tokenAddress) return null
    const lower = tokenAddress.toLowerCase()
    if (lower === ETH_PLACEHOLDER || tokenAddress === ZERO_ADDRESS) {
      return priceMap[WETH_ADDRESS.toLowerCase()] ?? null
    }
    return priceMap[lower] ?? null
  }

  // Normalize data format with real-time prices (and force ETH row to use WETH address for LIVE badge)
  const normalizedData: CombinedToken[] = data
    ? data.map((token): CombinedToken => {
        const originalTokenAddress = isKatana
          ? (token as KatanaPortfolioToken).address
          : (token as PortfolioToken).contract_address

        const realtimePrice = getTokenPrice(
          originalTokenAddress,
          token as any
        )
        const fallbackPrice = isKatana
          ? (token as KatanaPortfolioToken).price
          : (token as PortfolioToken).price_to_usd

        const finalPrice = realtimePrice ?? fallbackPrice

        if (isKatana) {
          const t = token as KatanaPortfolioToken
          const value = t.balance * finalPrice
          return {
            ...t,
            amount: t.balance,
            price_to_usd: finalPrice,
            value_usd: value,
            contract_address: t.address,
          }
        } else {
          const t = token as PortfolioToken
          const isEth = isNativeEth(t)
          const value = t.amount * finalPrice
          return {
            ...t,
            // Force native ETH to present with WETH address so downstream checks see it as LIVE
            address: isEth ? WETH_ADDRESS : t.contract_address,
            price_to_usd: finalPrice,
            value_usd: value,
          }
        }
      })
    : []

  // Only initialize entry prices when we have normalized data with valid prices
  const shouldInitializeEntryPrices = normalizedData.length > 0 && 
    normalizedData.every(token => !isNaN(token.price_to_usd) && token.price_to_usd > 0)

  // Initialize entry prices hook with normalized data only when prices are valid
  const { updateEntryPrice, getEntryPrice, hasCustomPrice, isInitialized } = useEntryPrices(
    address, 
    shouldInitializeEntryPrices ? normalizedData : []
  )

  // Recalculate total with updated prices
  const updatedTotalValue = normalizedData.reduce(
    (total, token) => total + (isNaN(token.value_usd) ? 0 : token.value_usd),
    0
  )

  // Calculate custom totals based on user-defined entry prices
  const calculateCustomTotals = () => {
    if (!normalizedData.length || !isInitialized) return { customTotalPnL: 0, customTotalROI: 0 }

    let customTotalPnL = 0
    let totalInvested = 0

    normalizedData.forEach((token) => {
      const tokenKey = generateTokenKey(
        token.chain_id,
        token.contract_address || token.address || ''
      )
      
      // Get the stored entry price (this will be the price when first loaded if not custom)
      const entryPrice = getEntryPrice(tokenKey, token.price_to_usd)

      // Ensure we have valid numbers
      if (isNaN(entryPrice) || isNaN(token.amount) || isNaN(token.value_usd) || entryPrice <= 0) {
        console.warn(`Invalid data for token ${token.symbol}:`, { 
          entryPrice, 
          amount: token.amount, 
          value: token.value_usd 
        })
        return
      }

      const investedValue = entryPrice * token.amount
      const currentValue = token.value_usd
      const tokenPnL = currentValue - investedValue

      customTotalPnL += tokenPnL
      totalInvested += investedValue
    })

    const customTotalROI = totalInvested > 0 ? customTotalPnL / totalInvested : 0
    return { customTotalPnL, customTotalROI }
  }

  const { customTotalPnL, customTotalROI } = calculateCustomTotals()

  if (!address) {
    return (
      <div className="w-full relative z-50">
        <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
          <div className="text-center py-8 relative z-50">
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to view your token balances and P&amp;L
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
          <div className="text-lg sm:text-xl font-semibold mb-4 flex items-center justify-between">
            <span>Portfolio Overview</span>
            <Tooltip title="Refresh data">
              <IconButton
                size="small"
                color="inherit"
                onClick={handleRefresh}
                disabled={isLoading || pricesLoading}
              >
                {isLoading || pricesLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </div>
          <div className="text-center py-8 relative z-50">
            <div className="text-red-400 text-sm">
              Failed to load portfolio data:{' '}
              {typeof error === 'string' ? error : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isDataLoading = isLoading || pricesLoading

  return (
    <div className="w-full relative z-50">
      <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
        {/* Portfolio Summary */}
        <PortfolioSummary
          totalValue={updatedTotalValue}
          customTotalPnL={isNaN(customTotalPnL) ? 0 : customTotalPnL}
          customTotalROI={isNaN(customTotalROI) ? 0 : customTotalROI}
        />

        {/* Chain Indicator */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            {isKatana ? (
              <span>Showing Katana Network tokens</span>
            ) : (
              <span>
                Showing {CHAIN_NAMES[connectedChainId] || `Chain ${connectedChainId}`} tokens
              </span>
            )}
            {pricesLoading && (
              <span className="text-yellow-400 text-xs">• Updating prices...</span>
            )}
            {pricesError && (
              <span className="text-red-400 text-xs">• Price fetch error</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="w-full relative z-50">
          {isDataLoading ? (
            <div className="w-full flex justify-center py-8 relative z-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F5E0]" />
            </div>
          ) : normalizedData && normalizedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block relative z-50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-base font-semibold border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left font-medium pb-4 text-[#00F5E0]">Asset</th>
                      <th className="text-right font-medium pb-4 text-[#00F5E0]">Balance</th>
                      <th className="text-center font-medium pb-4 text-[rgb(0,245,224)]">
                        Entry Price <span className="text-[white] text-[10px] ml-3">Edit</span>
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">
                        Current Price {pricesLoading && <span className="text-yellow-400 ml-1">⟳</span>}
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">Value</th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">P&amp;L</th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedData.map((token: CombinedToken) => {
                      const tokenLogo = getTokenLogo(token.symbol, token.chain_id)
                      const chainName = CHAIN_NAMES[token.chain_id] || `Chain ${token.chain_id}`
                      const tokenKey = generateTokenKey(
                        token.chain_id,
                        token.contract_address || token.address || ''
                      )

                      // Get the entry price (will be stored price from first load or custom price)
                      const entryPrice = getEntryPrice(tokenKey, token.price_to_usd)
                      const isCustom = hasCustomPrice(tokenKey, token.price_to_usd)

                      const { pnl: customPnL, roi: customROI } = calculateTokenPnL(
                        token.amount,
                        token.price_to_usd,
                        entryPrice
                      )

                      const tokenAddress = token.contract_address || token.address
                      const hasRealtimePrice = getTokenPrice(tokenAddress, token) !== null

                      return (
                        <tr
                          key={tokenKey}
                          className="hover:bg-[rgba(0,245,224,0.1)] transition-colors duration-200 border-b border-[rgba(255,255,255,0.05)] last:border-b-0"
                        >
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3 relative z-50">
                              {tokenLogo ? (
                                <img
                                  src={tokenLogo}
                                  alt={token.symbol}
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    const fallback = target.nextElementSibling as HTMLElement
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div
                                className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center"
                                style={{ display: tokenLogo ? 'none' : 'flex' }}
                              >
                                <span className="text-sm font-bold text-white">
                                  {token.symbol.charAt(0)}
                                </span>
                              </div>
                              <div className="relative z-50">
                                <div className="font-medium flex items-center gap-2">
                                  {token.symbol}
                                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                                    {chainName}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">{token.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <FormattedNumber number={token.amount.toString()} />
                          </td>
                          <td className="py-4 text-center">
                            <EditablePrice
                              tokenKey={tokenKey}
                              currentPrice={entryPrice}
                              defaultPrice={token.price_to_usd}
                              onPriceChange={(price) => updateEntryPrice(tokenKey, price)}
                              hasCustomPrice={isCustom}
                            />
                          </td>
                          <td className="py-4 pl-2 pr-4 text-center">
                            <span>
                              ${token.price_to_usd.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-center font-medium">
                            {formatUSD(token.value_usd)}
                          </td>
                          <td
                            className={`py-4 pr-4 text-center font-medium ${
                              customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isNaN(customPnL) ? '$0.00' : `${customPnL >= 0 ? '+' : ''}${formatUSD(customPnL)}`}
                          </td>
                          <td
                            className={`py-4 pr-4 text-right font-medium ${
                              customROI >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isNaN(customROI) ? '0.00%' : `${customROI >= 0 ? '+' : ''}${formatPercent(customROI)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="block lg:hidden space-y-3 relative z-50">
                {normalizedData.map((token: CombinedToken) => {
                  const tokenLogo = getTokenLogo(token.symbol, token.chain_id)
                  const chainName = CHAIN_NAMES[token.chain_id] || `Chain ${token.chain_id}`
                  const tokenKey = generateTokenKey(
                    token.chain_id,
                    token.contract_address || token.address || ''
                  )

                  // Get the entry price (will be stored price from first load or custom price)
                  const entryPrice = getEntryPrice(tokenKey, token.price_to_usd)
                  const isCustom = hasCustomPrice(tokenKey, token.price_to_usd)

                  const { pnl: customPnL, roi: customROI } = calculateTokenPnL(
                    token.amount,
                    token.price_to_usd,
                    entryPrice
                  )

                  const tokenAddress = token.contract_address || token.address
                  const hasRealtimePrice = getTokenPrice(tokenAddress, token) !== null

                  return (
                    <div
                      key={tokenKey}
                      className="bg-[rgba(0,245,224,0.08)] rounded-xl p-4 border border-[rgba(0,245,224,0.2)] relative z-50"
                    >
                      {/* Token Header */}
                      <div className="flex items-center gap-3 mb-4 relative z-50">
                        {tokenLogo ? (
                          <img
                            src={tokenLogo}
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center"
                          style={{ display: tokenLogo ? 'none' : 'flex' }}
                        >
                          <span className="text-sm font-bold text-white">
                            {token.symbol.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 relative z-50">
                          <div className="font-semibold text-lg flex items-center gap-2">
                            {token.symbol}
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                              {chainName}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{token.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatUSD(token.value_usd)}</div>
                          <div
                            className={`text-sm font-medium ${
                              customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isNaN(customPnL) ? '$0.00' : `${customPnL >= 0 ? '+' : ''}${formatUSD(customPnL)}`}
                          </div>
                        </div>
                      </div>

                      {/* Token Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm relative z-50">
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">Balance</div>
                          <div className="font-medium text-white">
                            <FormattedNumber number={token.amount.toString()} />
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">Current Price</div>
                          <div className="font-medium text-white">
                            ${token.price_to_usd.toFixed(2)}
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">Entry Price</div>
                          <div className="font-medium text-white flex justify-start">
                            <EditablePrice
                              tokenKey={tokenKey}
                              currentPrice={entryPrice}
                              defaultPrice={token.price_to_usd}
                              onPriceChange={(price) => updateEntryPrice(tokenKey, price)}
                              hasCustomPrice={isCustom}
                            />
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">ROI</div>
                          <div
                            className={`font-medium ${
                              customROI >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {isNaN(customROI) ? '0.00%' : `${customROI >= 0 ? '+' : ''}${formatPercent(customROI)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 relative z-50">
              <div className="text-gray-400 text-base mb-2">
                No tokens found in your portfolio
              </div>
              <div className="text-gray-500 text-sm">
                Your portfolio will appear here once you have token balances
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}