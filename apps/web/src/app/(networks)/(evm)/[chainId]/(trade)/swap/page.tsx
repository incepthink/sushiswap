"use client"

// page.tsx - Full screen layout with exact GlowBox styling
import { SimpleSwapWidget } from 'src/ui/swap/simple/simple-swap-widget'
import { TokenBalancesCard } from 'src/ui/swap/simple/TokenBalancesCard'
import ChartSpot, { ChartHeader } from 'src/ui/swap/simple/ChartSpot'
import TokenSelect from 'src/lib/wagmi/components/token-selector/token-lists/TokenSelect'
import CommonSwapLayout from 'src/lib/wagmi/components/CommonSwapLayout'

export default function SwapSimplePage() {
  return (
    <CommonSwapLayout>
      <SimpleSwapWidget />
    </CommonSwapLayout>
  )
}