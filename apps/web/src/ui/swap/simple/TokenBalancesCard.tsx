'use client'

import { useAccount, useBalance, useChainId } from 'wagmi'
import { FormattedNumber } from '@sushiswap/ui'
import { formatPercent, formatUSD } from 'sushi/format'
import { usePortfolioDetailed, type PortfolioToken } from './usePortfolioDetailed'
import { useState, useEffect } from 'react'
import {ethers} from "ethers"
import axios from 'axios'
import { BACKEND_URL } from './ChartSpot'

const CHAIN_NAMES: { [key: number]: string } = {
  1: 'Ethereum',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  56: 'BSC',
  747474: 'Katana'
}

const getTokenLogo = (symbol: string, chainId: number) => {
  const symbolUpper = symbol.toUpperCase()
  switch (symbolUpper) {
    case 'ETH':
      return 'https://cdn.moralis.io/eth/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
    case 'USDC':
      return '/logos/usdc.png'
    case 'USDT':
      return 'https://cdn.moralis.io/eth/0xdac17f958d2ee523a2206206994597c13d831ec7.png'
    case 'WETH':
      return '/logos/weth.png'
    case 'WBTC':
      return '/logos/wbtc.png'
    case 'LINK':
      return 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png'
    default:
      return null
  }
}

// Custom hook for managing entry prices in localStorage
const useEntryPrices = (address: string | undefined, data: PortfolioToken[] | undefined | null) => {
  const [entryPrices, setEntryPrices] = useState<{ [key: string]: number }>({})
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize entry prices when data first loads
  useEffect(() => {
    if (!address || !data || data.length === 0) {
      setIsInitialized(false)
      return
    }

    const storageKey = `entry_prices_${address}`
    const stored = localStorage.getItem(storageKey)
    let storedEntryPrices: { [key: string]: number } = {}

    if (stored) {
      try {
        storedEntryPrices = JSON.parse(stored)
      } catch (error) {
        console.error('Error parsing stored entry prices:', error)
      }
    }

    // Initialize entry prices for tokens that don't have stored prices
    const newEntryPrices = { ...storedEntryPrices }
    let hasNewPrices = false

    data.forEach((token) => {
      const tokenKey = `${token.chain_id}-${token.contract_address}`
      if (!(tokenKey in newEntryPrices) && token.price_to_usd && !isNaN(token.price_to_usd)) {
        // Use current price as initial entry price
        newEntryPrices[tokenKey] = token.price_to_usd
        hasNewPrices = true
      }
    })

    setEntryPrices(newEntryPrices)
    
    // Save to localStorage if we added new prices
    if (hasNewPrices) {
      localStorage.setItem(storageKey, JSON.stringify(newEntryPrices))
    }
    
    setIsInitialized(true)
  }, [address, data])

  const updateEntryPrice = (tokenKey: string, price: number) => {
    if (!address) return

    const newEntryPrices = { ...entryPrices, [tokenKey]: price }
    setEntryPrices(newEntryPrices)
    
    const storageKey = `entry_prices_${address}`
    localStorage.setItem(storageKey, JSON.stringify(newEntryPrices))
  }

  const getEntryPrice = (tokenKey: string, defaultPrice: number) => {
    const storedPrice = entryPrices[tokenKey]
    // Return stored price if it exists and is valid, otherwise return default
    return (storedPrice !== undefined && !isNaN(storedPrice)) ? storedPrice : defaultPrice
  }

  const hasCustomPrice = (tokenKey: string, defaultPrice: number) => {
    const storedPrice = entryPrices[tokenKey]
    return storedPrice !== undefined && !isNaN(storedPrice) && Math.abs(storedPrice - defaultPrice) > 0.01
  }

  return { entryPrices, updateEntryPrice, getEntryPrice, hasCustomPrice, isInitialized }
}

// Editable price input component
const EditablePrice = ({ 
  tokenKey, 
  currentPrice, 
  defaultPrice, 
  onPriceChange,
  hasCustomPrice 
}: {
  tokenKey: string
  currentPrice: number
  defaultPrice: number
  onPriceChange: (price: number) => void
  hasCustomPrice: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(currentPrice.toFixed(2))

  const handleSave = () => {
    const newPrice = parseFloat(editValue)
    if (!isNaN(newPrice) && newPrice > 0) {
      onPriceChange(newPrice)
      setIsEditing(false)
    } else {
      setEditValue(currentPrice.toFixed(2))
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(currentPrice.toFixed(2))
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-[#00F5E0]"
          autoFocus
          step="0.01"
        />
      </div>
    )
  }

  return (
    <div 
      className="group flex items-center justify-center"
      onClick={() => setIsEditing(true)}
      title="Click to edit entry price"
    >
      <div className="flex justify-center gap-2 relative cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors">
        <span>${currentPrice.toFixed(2)}</span>
        {hasCustomPrice && (
          <div className="text-xs text-blue-400 mt-1">Custom</div>
        )}
      </div>
    </div>
  )
}

export function TokenBalancesCard() {
  const { address } = useAccount()
  const { 
    data, 
    isLoading, 
    error, 
    totalValue, 
    totalPnL, 
    totalROI 
  } = usePortfolioDetailed()

  const balanceFunc = async (walletAddress: string) => {
    const res = await axios.get(`${BACKEND_URL}/api/balance/katana?address=${walletAddress}`)
    console.log("BALANCE API", res.data);
  }

  useEffect(() => {
    balanceFunc("0x314Ab1044316e62dCDdbC87c2df57F1254b4B4A6")
  }, [])
  
  const { updateEntryPrice, getEntryPrice, hasCustomPrice, isInitialized } = useEntryPrices(address, data)

  const connectedChainId = useChainId()

  // Calculate custom totals based on user-defined entry prices
  const calculateCustomTotals = () => {
    // Don't calculate until we have data and prices are initialized
    if (!data || data.length === 0 || !isInitialized) {
      return { customTotalPnL: 0, customTotalROI: 0 }
    }

    let customTotalPnL = 0
    let totalInvested = 0

    data.forEach((token) => {
      const tokenKey = `${token.chain_id}-${token.contract_address}`
      
      // Validate token data first
      if (!token.price_to_usd || isNaN(token.price_to_usd) || 
          !token.amount || isNaN(token.amount) || 
          !token.value_usd || isNaN(token.value_usd)) {
        console.warn(`Invalid data for token ${token.symbol}:`, { 
          price: token.price_to_usd, 
          amount: token.amount, 
          value: token.value_usd 
        })
        return
      }
      
      const entryPrice = getEntryPrice(tokenKey, token.price_to_usd)
      
      // Validate entry price
      if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
        console.warn(`Invalid entry price for token ${token.symbol}:`, entryPrice)
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
              Failed to load portfolio data: {error.message}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative z-50">
      <div className="w-full p-4 sm:p-6 md:p-8 rounded-2xl text-white font-sans bg-transparent relative z-50">
        {/* Header with Portfolio Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-50">
          <div className="text-lg sm:text-xl font-semibold">
            Portfolio Overview
          </div>
          
          {/* Portfolio Summary Stats */}
          <div className="flex gap-10">
            <div className="relative z-50 flex flex-col items-center">
              <div className="text-xl sm:text-2xl font-bold">
                ${totalValue.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">Total Value</div>
            </div>
            
            <div className="relative z-50 flex flex-col items-center">
              <div className={`text-lg sm:text-xl font-semibold ${
                customTotalPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {!isInitialized || isNaN(customTotalPnL) ? '$0.00' : `${customTotalPnL >= 0 ? '+' : ''}$${customTotalPnL.toFixed(2)}`}
              </div>
              <div className="text-xs text-gray-400">Custom P&L</div>
            </div>
            
            <div className="relative z-50 flex flex-col items-center">
              <div className={`text-lg sm:text-xl font-semibold ${
                customTotalROI >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {!isInitialized || isNaN(customTotalROI) ? '0.00%' : `${customTotalROI >= 0 ? '+' : ''}${formatPercent(customTotalROI)}`}
              </div>
              <div className="text-xs text-gray-400">Custom ROI</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full relative z-50">
          {isLoading ? (
            <div className="w-full flex justify-center py-8 relative z-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00F5E0]"></div>
            </div>
          ) : data && data.length > 0 ? (
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
                    {data.map((token: PortfolioToken) => {
                      const tokenLogo = getTokenLogo(token.symbol, token.chain_id)
                      const chainName = CHAIN_NAMES[token.chain_id] || `Chain ${token.chain_id}`
                      const tokenKey = `${token.chain_id}-${token.contract_address}`
                      
                      // Use current price as default entry price
                      const defaultEntryPrice = token.price_to_usd || 0
                      const entryPrice = getEntryPrice(tokenKey, defaultEntryPrice)
                      const isCustom = hasCustomPrice(tokenKey, defaultEntryPrice)
                      
                      // Calculate custom P&L and ROI based on user entry price
                      const investedValue = entryPrice * (token.amount || 0)
                      const currentValue = token.value_usd || 0
                      const customPnL = currentValue - investedValue
                      const customROI = investedValue > 0 ? customPnL / investedValue : 0
                      
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
                            <FormattedNumber number={token.amount?.toString() || '0'} />
                          </td>
                          <td className="py-4 text-center">
                            <EditablePrice
                              tokenKey={tokenKey}
                              currentPrice={entryPrice}
                              defaultPrice={defaultEntryPrice}
                              onPriceChange={(price) => updateEntryPrice(tokenKey, price)}
                              hasCustomPrice={isCustom}
                            />
                          </td>
                          <td className="py-4 pl-2 pr-4 text-center">
                            ${(token.price_to_usd || 0).toFixed(2)}
                          </td>
                          <td className="py-4 pr-4 text-center font-medium">
                            {formatUSD(token.value_usd || 0)}
                          </td>
                          <td className={`py-4 pr-4 text-center font-medium ${
                            customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {!isInitialized || isNaN(customPnL) ? '$0.00' : `${customPnL >= 0 ? '+' : ''}${formatUSD(customPnL)}`}
                          </td>
                          <td className={`py-4 pr-4 text-right font-medium ${
                            customROI >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {!isInitialized || isNaN(customROI) ? '0.00%' : `${customROI >= 0 ? '+' : ''}${formatPercent(customROI)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="block lg:hidden space-y-3 relative z-50">
                {data.map((token: PortfolioToken) => {
                  const tokenLogo = getTokenLogo(token.symbol, token.chain_id)
                  const chainName = CHAIN_NAMES[token.chain_id] || `Chain ${token.chain_id}`
                  const tokenKey = `${token.chain_id}-${token.contract_address}`
                  
                  // Use current price as default entry price
                  const defaultEntryPrice = token.price_to_usd || 0
                  const entryPrice = getEntryPrice(tokenKey, defaultEntryPrice)
                  const isCustom = hasCustomPrice(tokenKey, defaultEntryPrice)
                  
                  // Calculate custom P&L and ROI based on user entry price
                  const investedValue = entryPrice * (token.amount || 0)
                  const currentValue = token.value_usd || 0
                  const customPnL = currentValue - investedValue
                  const customROI = investedValue > 0 ? customPnL / investedValue : 0
                  
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
                          <div className="text-lg font-bold">{formatUSD(token.value_usd || 0)}</div>
                          <div className={`text-sm font-medium ${
                            customPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {!isInitialized || isNaN(customPnL) ? '$0.00' : `${customPnL >= 0 ? '+' : ''}${formatUSD(customPnL)}`}
                          </div>
                        </div>
                      </div>
                      
                      {/* Token Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm relative z-50">
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">Balance</div>
                          <div className="font-medium text-white">
                            <FormattedNumber number={token.amount?.toString() || '0'} />
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">Current Price</div>
                          <div className="font-medium text-white">
                            ${(token.price_to_usd || 0).toFixed(2)}
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
                              hasCustomPrice={isCustom}
                            />
                          </div>
                        </div>
                        <div className="relative z-50">
                          <div className="text-[#00F5E0] text-xs mb-1">ROI</div>
                          <div className={`font-medium ${
                            customROI >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {!isInitialized || isNaN(customROI) ? '0.00%' : `${customROI >= 0 ? '+' : ''}${formatPercent(customROI)}`}
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