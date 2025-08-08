'use client'

import { useAccount, useChainId } from 'wagmi'
import { FormattedNumber } from '@sushiswap/ui'
import { formatPercent, formatUSD } from 'sushi/format'
import { usePortfolioDetailed, type PortfolioToken } from 'src/ui/swap/simple/usePortfolioDetailed'
import { useKatanaPortfolio, type KatanaPortfolioToken } from './useKatanaPortfolio'
import { useEntryPrices } from './useEntryPrices'
import { EditablePrice } from './EditablePrice'
import { PortfolioSummary } from './PortfolioSummary'
import { 
  calculatePortfolioTotals, 
  calculateTokenPnL, 
  getTokenLogo, 
  CHAIN_NAMES, 
  generateTokenKey 
} from './portfolioUtils'
import { BACKEND_URL} from "src/ui/swap/simple/ChartSpot"
import { useParams } from 'next/navigation'

// Combined token type for both Katana and other chains
type CombinedToken = (PortfolioToken | KatanaPortfolioToken) & {
  amount: number;
  price_to_usd: number;
  value_usd: number;
  symbol: string;
  name: string;
  chain_id: number;
  contract_address?: string;
  address?: string;
};

export function TokenBalancesCard() {
  const params = useParams();
  // params.chainId is a string!
  const chainId = Number(params.chainId);
  const { address } = useAccount()
  const connectedChainId = Number(params.chainId);
  const { updateEntryPrice, getEntryPrice } = useEntryPrices(address)
  
  // Use different hooks based on chain
  const isKatana = connectedChainId === 747474
  
  // Multi-chain portfolio data
  const { 
    data: multiChainData, 
    isLoading: multiChainLoading, 
    error: multiChainError, 
    totalValue: multiChainTotalValue 
  } = usePortfolioDetailed()
  
  // Katana portfolio data
  const { 
    tokens: katanaTokens, 
    totalValue: katanaTotalValue, 
    isLoading: katanaLoading, 
    error: katanaError 
  } = useKatanaPortfolio(address || null)

  console.log(multiChainData, katanaTokens);

  // Filter multi-chain data by connected chain ID
  const filteredMultiChainData = multiChainData?.filter(token => token.chain_id === connectedChainId) || []
  const filteredMultiChainTotalValue = filteredMultiChainData.reduce((total, token) => total + token.value_usd, 0)

  // Determine which data to use
  const data = isKatana ? katanaTokens : filteredMultiChainData
  const isLoading = isKatana ? katanaLoading : multiChainLoading
  const error = isKatana ? katanaError : multiChainError
  const totalValue = isKatana ? katanaTotalValue : filteredMultiChainTotalValue

  // Normalize data format
  const normalizedData: CombinedToken[] = data ? data.map((token): CombinedToken => {
    if (isKatana) {
      const katanaToken = token as KatanaPortfolioToken
      return {
        ...katanaToken,
        amount: katanaToken.balance,
        price_to_usd: katanaToken.price,
        value_usd: katanaToken.value,
        contract_address: katanaToken.address,
      }
    } else {
      const portfolioToken = token as PortfolioToken
      return {
        ...portfolioToken,
        address: portfolioToken.contract_address,
      }
    }
  }) : []

  // Calculate custom totals based on user-defined entry prices
  const calculateCustomTotals = () => {
    if (!normalizedData.length) return { customTotalPnL: 0, customTotalROI: 0 }

    const tokenCalculations = normalizedData.map((token) => {
      const tokenKey = generateTokenKey(token.chain_id, token.contract_address || token.address || '')
      const defaultEntryPrice = isKatana ? token.price_to_usd : token.price_to_usd
      const entryPrice = getEntryPrice(tokenKey, defaultEntryPrice)
      
      return {
        amount: token.amount,
        currentPrice: token.price_to_usd,
        entryPrice,
      }
    })

    return calculatePortfolioTotals(tokenCalculations)
  }

  const { customTotalPnL, customTotalROI } = calculateCustomTotals()

  if (!address) {
    return (
      <div className="w-full relative z-50">
        <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
          <div className="text-center py-8 relative z-50">
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to view your token balances and P&L
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
            Portfolio Overview
          </div>
          <div className="text-center py-8 relative z-50">
            <div className="text-red-400 text-sm">
              Failed to load portfolio data: {typeof error === 'string' ? error : 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative z-50">
      <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
        {/* Portfolio Summary */}
        <PortfolioSummary 
          totalValue={totalValue}
          customTotalPnL={customTotalPnL}
          customTotalROI={customTotalROI}
        />

        {/* Chain Indicator */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            {isKatana ? (
              <>
                <span>Showing Katana Network tokens</span>
              </>
            ) : (
              <>
                <span>Showing {CHAIN_NAMES[connectedChainId] || `Chain ${connectedChainId}`} tokens</span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="w-full relative z-50">
          {isLoading ? (
            <div className="w-full flex justify-center py-8 relative z-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F5E0]"></div>
            </div>
          ) : normalizedData && normalizedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block relative z-50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-base font-semibold border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left font-medium pb-4 text-[#00F5E0]">
                        Asset
                      </th>
                      <th className="text-right font-medium pb-4 text-[#00F5E0]">
                        Balance
                      </th>
                      <th className="text-center font-medium pb-4 text-[rgb(0,245,224)]">
                        Entry Price
                        <span className='text-[white] text-[10px] ml-3'>Edit</span>
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">
                        Current Price
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">
                        Value
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">
                        P&L
                      </th>
                      <th className="text-center font-medium pb-4 text-[#00F5E0]">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedData.map((token: CombinedToken) => {
                      const tokenLogo = getTokenLogo(token.symbol, token.chain_id)
                      const chainName = CHAIN_NAMES[token.chain_id] || `Chain ${token.chain_id}`
                      const tokenKey = generateTokenKey(token.chain_id, token.contract_address || token.address || '')
                      
                      // Calculate default entry price
                      const defaultEntryPrice = token.price_to_usd
                      const entryPrice = getEntryPrice(tokenKey, defaultEntryPrice)
                      
                      // Calculate custom P&L and ROI
                      const { pnl: customPnL, roi: customROI } = calculateTokenPnL(
                        token.amount,
                        token.price_to_usd,
                        entryPrice
                      )
                      
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
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
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
                              defaultPrice={defaultEntryPrice}
                              onPriceChange={(price) => updateEntryPrice(tokenKey, price)}
                            />
                          </td>
                          <td className="py-4 pl-2 pr-4 text-center">
                            ${token.price_to_usd.toFixed(2)}
                          </td>
                          <td className="py-4 pr-4 text-center font-medium">
                            {formatUSD(token.value_usd)}
                          </td>
                          <td className={`py-4 pr-4 text-center font-medium ${
                            customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {customPnL >= 0 ? '+' : ''}{formatUSD(customPnL)}
                          </td>
                          <td className={`py-4 pr-4 text-right font-medium ${
                            customROI >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {customROI >= 0 ? '+' : ''}{formatPercent(customROI)}
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
                  const tokenKey = generateTokenKey(token.chain_id, token.contract_address || token.address || '')
                  
                  // Calculate default entry price
                  const defaultEntryPrice = token.price_to_usd
                  const entryPrice = getEntryPrice(tokenKey, defaultEntryPrice)
                  
                  // Calculate custom P&L and ROI
                  const { pnl: customPnL, roi: customROI } = calculateTokenPnL(
                    token.amount,
                    token.price_to_usd,
                    entryPrice
                  )
                  
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
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
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
                          <div className={`text-sm font-medium ${
                            customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {customPnL >= 0 ? '+' : ''}{formatUSD(customPnL)}
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
                              defaultPrice={defaultEntryPrice}
                              onPriceChange={(price) => updateEntryPrice(tokenKey, price)}
                            />
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">ROI</div>
                          <div className={`font-medium ${
                            customROI >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {customROI >= 0 ? '+' : ''}{formatPercent(customROI)}
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