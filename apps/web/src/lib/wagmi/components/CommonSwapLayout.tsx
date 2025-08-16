"use client"

import { TokenBalancesCard } from 'src/components/TokenBalancesCard'
import ChartSpot, { ChartHeader } from 'src/ui/swap/simple/ChartSpot'
import TokenSelect from 'src/lib/wagmi/components/token-selector/token-lists/TokenSelect'
import { ReactNode } from 'react'
import { useDerivedStateCrossChainSwap } from 'src/ui/swap/cross-chain/derivedstate-cross-chain-swap-provider'
import { useDerivedStateSimpleSwap } from 'src/ui/swap/simple/derivedstate-simple-swap-provider'
import KatanaCandlestickChart from 'src/ui/swap/simple/KatanaCandlestickChart'
import { useChainId } from 'wagmi'

interface CommonSwapLayoutProps {
  children: ReactNode
  showTokenSelect?: boolean
}

export default function CommonSwapLayout({ children, }: CommonSwapLayoutProps) {
  const simpleSwapData = useDerivedStateSimpleSwap()

  const token0 = simpleSwapData?.state?.token0
  const connectedChainId = useChainId()
 
  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 w-full max-w-none">
            <TokenSelect />
        </div>

      {/* Main Content Area - Chart and Swap Side by Side */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4 w-full max-w-none">
        {/* Chart Section - Left side, takes more space */}
        <div className="flex-1 lg:flex-[2] order-2 lg:order-1">
          {/* Chart Header - Show on mobile/tablet only */}
          <div className="block lg:hidden mb-4">
            <div className="glow-box text-white">
              <ChartHeader token0={token0} />
            </div>
          </div>

          {/* Chart Container - Fixed Height with exact GlowBox styling */}
          <div className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
            <div className="glow-box h-full w-full !p-1 relative">
              <div className="relative h-full w-full z-10 dot-pattern-cyan">
                {connectedChainId === 747474 ? <KatanaCandlestickChart tokenOne={token0} /> : <ChartSpot />}
                
              </div>
            </div>
          </div>
        </div>

        {/* Swap Section - Right side, fixed width */}
        <div className="w-full lg:w-1/3 lg:flex-shrink-0 order-1 lg:order-2">
          <div className="glow-box relative">
            {children}
          </div>
        </div>
      </div>
      
      {/* Token Balances Card - Full Width with exact GlowBox styling */}
      <div className="w-full">
        <div className="glow-box h-full w-full !p-4 relative">
          <div className="relative h-full w-full z-10">
            <TokenBalancesCard />
          </div>
        </div>
      </div>
    </div>
  )
}