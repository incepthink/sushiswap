'use client'

import { Container } from '@sushiswap/ui'
import CrossChainCommonLayout from 'src/lib/wagmi/components/CrossChainCommonLayout'
// import { CrossChainSwapRouteSelector } from 'src/ui/swap/cross-chain/cross-chain-swap-route-selector'
import { CrossChainSwapWidget } from 'src/ui/swap/cross-chain/cross-chain-swap-widget'
// import { useCrossChainTradeRoutes } from 'src/ui/swap/cross-chain/derivedstate-cross-chain-swap-provider'

export default function CrossChainSwapPage() {
  // const { isLoading, isFetched } = useCrossChainTradeRoutes()
  // const showRouteSelector = isLoading || isFetched

  return (
    <div className="flex justify-center flex-wrap gap-y-4 h-full">
      <CrossChainCommonLayout>
        <CrossChainSwapWidget />
      </CrossChainCommonLayout>
      {/* {showRouteSelector ? (
        <Container maxWidth="lg" className="!mx-[unset] flex items-center">
          <CrossChainSwapRouteSelector />
        </Container>
      ) : null} */}
    </div>
  )
}

// TODO: Error when common layout
