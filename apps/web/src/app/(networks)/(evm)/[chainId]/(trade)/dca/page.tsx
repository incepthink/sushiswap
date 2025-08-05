'use client'

import { Container } from '@sushiswap/ui'
import CommonSwapLayout from 'src/lib/wagmi/components/CommonSwapLayout'
import { DCAWidget } from 'src/ui/swap/twap/dca-widget'

export default function SwapDCAPage() {
  return (
    <CommonSwapLayout>
      <DCAWidget />
    </CommonSwapLayout>
  )
}
