// page.tsx - Full screen layout with exact GlowBox styling
import { SimpleSwapWidget } from 'src/ui/swap/simple/simple-swap-widget'
import { TokenBalancesCard } from 'src/ui/swap/simple/TokenBalancesCard'
import ChartSpot, { ChartHeader } from 'src/ui/swap/simple/ChartSpot'

export default function SwapSimplePage() {
  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6 ">
      {/* Main Content Area - Chart and Swap Side by Side */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6 w-full max-w-none">
        {/* Chart Section - Left side, takes more space */}
        <div className="flex-1 lg:flex-[2] order-2 lg:order-1">
          {/* Chart Header - Show on mobile/tablet only */}
          <div className="block lg:hidden mb-4">
            <div className="glow-box text-white">
              <ChartHeader />
            </div>
          </div>

          {/* Chart Container - Fixed Height with exact GlowBox styling */}
          <div className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
            <div className="glow-box h-full w-full !p-4 relative">
              <div className="relative h-full w-full z-10 dot-pattern-cyan">
                <ChartSpot />
              </div>
            </div>
          </div>
        </div>

        {/* Swap Section - Right side, fixed width */}
        <div className="w-full lg:w-1/3 lg:flex-shrink-0 order-1 lg:order-2">
          <div className="glow-box relative">
            <SimpleSwapWidget />
          </div>
        </div>
      </div>
      
      {/* Token Balances Card - Full Width with exact GlowBox styling */}
      <div className="w-full">
          <div className="glow-box h-full w-full !p-4 relative ">
              <div className="relative h-full w-full z-10">
          <TokenBalancesCard />
          </div>
        </div>
      </div>
    </div>
  )
}