'use client'

import { Container } from '@sushiswap/ui'
import CommonSwapLayout from 'src/lib/wagmi/components/CommonSwapLayout'
import { LimitWidget } from 'src/ui/swap/twap/limit-widget'

export default function SwapLimitPage() {
  return (
    <CommonSwapLayout>
      <LimitWidget />
    </CommonSwapLayout>
  )
}
