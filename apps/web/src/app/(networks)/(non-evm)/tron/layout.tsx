import type { Metadata } from 'next'
import type React from 'react'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'AggTrade - Spot',
    template: 'AggTrade - Spot',
  },
  description:
    'A Decentralised Finance (DeFi) app with features such as swap, cross chain swap, streaming, vesting, and permissionless market making for liquidity providers.',
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex flex-col h-full w-full">{children}</div>
    </Providers>
  )
}
